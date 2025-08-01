# サブスクリプション契約時のアカウント削除申請：詳細対応方針

## 📊 現状分析（コードベース確認済み）

### 🔍 実装済み機能
#### **AccountDeletionModal** (`/client/src/components/AccountDeletionModal.tsx`)
- ✅ 2段階削除フロー：理由選択 → 確認入力
- ✅ 30日間の猶予期間設定
- ✅ 国際化対応済み
- ✅ エラーハンドリング実装
- ✅ API連携：`POST /api/users/${userId}/deletion-request`

#### **AccountDeletionService** (`/server/src/services/accountDeletionService.ts`)
- ✅ ソフトデリート実装（`isDeleted: true`）
- ✅ 30日間の猶予期間（`DELETION_GRACE_PERIOD_DAYS = 30`）
- ✅ 両DB同期：SQLite + Firebase Realtime Database
- ✅ ロールバック機能：Firebase失敗時はSQLite復元
- ✅ 物理削除機能：`executeAccountDeletion()`

#### **SubscriptionCancellationModal** (`/client/src/components/SubscriptionCancellationModal.tsx`)
- ✅ サブスクリプションキャンセル専用モーダル
- ✅ 請求期間表示
- ✅ API連携：`POST /api/billing/cancel-subscription`
- ✅ 国際化対応済み

#### **StripeService** (`/server/src/services/stripeService.ts`)
- ✅ `cancelSubscription(userId)` メソッド実装
- ✅ 期間終了時キャンセル（`cancel_at_period_end: true`）
- ✅ Webhook処理でDB自動更新
- ✅ エラーハンドリング完備

#### **データベーススキーマ** (`/server/prisma/schema.prisma`)
```prisma
model User {
  id                  String    @id
  subscriptionStatus  String?   @default("free")
  stripeCustomerId    String?   // Stripe連携キー
  isDeleted           Boolean   @default(false)
  deletionRequestedAt DateTime?
  scheduledDeletionAt DateTime?
  deletionReason      String?
  deletionCancelledAt DateTime?
}
```

### 🚨 **重大な実装ギャップ**

**アカウント削除処理にサブスクリプション処理が一切統合されていない**

#### **現在の問題シナリオ**
1. ユーザーがProプラン契約中
2. アカウント削除申請実行
3. **❌ サブスクリプション状態チェックなし**
4. **❌ Stripe課金停止処理なし**
5. アカウントは削除予約されるが、Stripeサブスクリプションは継続
6. **💰 課金継続** - アカウント削除後も請求発生

#### **具体的な実装不備**

**AccountDeletionService.requestAccountDeletion()** - 行25-111：
```typescript
// ❌ 現在の実装にはサブスクリプションチェックが皆無
async requestAccountDeletion(userId: string, reason?: string): Promise<DeletionRequest> {
  // user.subscriptionStatus チェックなし
  // user.stripeCustomerId チェックなし  
  // StripeService.cancelSubscription() 呼び出しなし
  
  // 削除予約のみ実行
  const updatedUser = await prisma.user.update({
    where: { id: userId },
    data: {
      isDeleted: true,
      scheduledDeletionAt: scheduledDeletionDate,
    }
  });
}
```

**AccountDeletionModal.tsx** - 行71-78：
```typescript
// ❌ サブスクリプション状態の事前チェックなし
const response = await fetch(`/api/users/${user.id}/deletion-request`, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "x-user-id": user.id,
  },
  body: JSON.stringify({ reason }),
});
```

## 🎯 詳細対応方針

### **レベル1：最小限対応（必須）**

#### **1.1 AccountDeletionService改修**
**ファイル**: `/server/src/services/accountDeletionService.ts`

**修正箇所**: `requestAccountDeletion()` メソッド（行25-111）

```typescript
// 修正前（行25-45周辺）
async requestAccountDeletion(userId: string, reason?: string): Promise<DeletionRequest> {
  const user = await prisma.user.findUnique({
    where: { id: userId }
  });

  if (!user) {
    throw new AppError(404, 'USER_NOT_FOUND', 'ユーザーが見つかりません');
  }

// 修正後
async requestAccountDeletion(userId: string, reason?: string): Promise<DeletionRequest> {
  const user = await prisma.user.findUnique({
    where: { id: userId }
  });

  if (!user) {
    throw new AppError(404, 'USER_NOT_FOUND', 'ユーザーが見つかりません');
  }

  // 🔍 サブスクリプション状態確認
  const hasActiveSubscription = user.subscriptionStatus === 'pro' || 
                                user.subscriptionStatus === 'trial';
  
  if (hasActiveSubscription && user.stripeCustomerId) {
    console.log('[AccountDeletionService] 💳 アクティブなサブスクリプション検出 - 自動キャンセル実行');
    
    // 🔄 Stripeサブスクリプション自動キャンセル
    const StripeService = (await import('./stripeService')).default;
    const stripeService = new StripeService();
    
    const cancelResult = await stripeService.cancelSubscription(userId);
    if (!cancelResult.success) {
      console.error('[AccountDeletionService] ❌ サブスクリプションキャンセル失敗:', cancelResult.error);
      throw new AppError(500, 'SUBSCRIPTION_CANCEL_ERROR', 'サブスクリプションのキャンセルに失敗しました');
    }
    
    console.log('[AccountDeletionService] ✅ サブスクリプションキャンセル完了');
  }
```

#### **1.2 API応答メッセージ追加**
**ファイル**: `/client/src/translations/pages/accountSettings.ts`

**追加箇所**: `billing` セクション（行167-190）

```typescript
billing: {
  loading: '読み込み中...',
  // 既存項目...
  
  // 🆕 削除時サブスクリプション対応
  subscriptionCancelledForDeletion: 'アカウント削除のためサブスクリプションをキャンセルしました',
  subscriptionWillEndWith: '現在の請求期間終了と共にアカウントが削除されます',
}
```

#### **1.3 削除成功モーダル改修**
**ファイル**: `/client/src/components/DeletionSuccessModal.tsx`

**修正内容**: サブスクリプションキャンセル通知の追加表示

### **レベル2：完全対応（推奨）**

#### **2.1 事前チェック機能追加**
**新規ファイル**: `/client/src/components/SubscriptionDeletionWarning.tsx`

**機能**: 
- サブスクリプション状態表示
- キャンセル影響説明
- 次回請求日表示
- 段階的確認フロー

#### **2.2 AccountDeletionModal拡張**
**ファイル**: `/client/src/components/AccountDeletionModal.tsx`

**修正箇所**: `useState` 初期化部分（行31-40）

```typescript
// 修正前
const [step, setStep] = useState<DeletionStep>("reason");

// 修正後  
type DeletionStep = "subscription_check" | "subscription_warning" | "reason" | "confirm";
const [step, setStep] = useState<DeletionStep>("subscription_check");
const [subscriptionStatus, setSubscriptionStatus] = useState<any>(null);

// 🔍 サブスクリプション状態取得
useEffect(() => {
  const checkSubscription = async () => {
    try {
      const response = await fetch(`/api/billing/subscription-status/${user.id}`, {
        headers: { 'x-user-id': user.id }
      });
      if (response.ok) {
        const data = await response.json();
        setSubscriptionStatus(data.subscription);
        
        // サブスクリプションがある場合は警告ステップ
        if (data.subscription.status === 'pro' || data.subscription.status === 'trial') {
          setStep("subscription_warning");
        } else {
          setStep("reason");
        }
      }
    } catch (error) {
      console.error('Failed to check subscription status:', error);
      setStep("reason"); // エラー時は通常フローに
    }
  };
  
  checkSubscription();
}, [user.id]);
```

#### **2.3 統合削除フロー**
**フロー**: subscription_check → subscription_warning → reason → confirm

### **レベル3：高度対応（理想）**

#### **3.1 削除タイミング調整**
- サブスクリプション期間終了まで削除を延期
- 期間終了時の自動削除実行

#### **3.2 復旧オプション**
- 削除予約中のサブスクリプション復活機能
- 段階的取り消しオプション

## 🛠️ 実装手順

### **Phase 1: 緊急対応（必須）**
1. ✅ `AccountDeletionService.requestAccountDeletion()` にサブスクリプションキャンセル統合
2. ✅ エラーハンドリング追加
3. ✅ ログ記録強化
4. ✅ 翻訳文言追加

### **Phase 2: UI改善**
1. ✅ サブスクリプション状態事前チェック
2. ✅ 警告モーダル実装
3. ✅ 段階的確認フロー
4. ✅ ユーザビリティ向上

### **Phase 3: 運用最適化**
1. ✅ 删除タイミング調整
2. ✅ 復旧オプション
3. ✅ 監視・アラート追加

## 🚫 **実装時の制約事項**

### **変更禁止事項**
- ✅ **既存の削除API (`POST /api/users/:id/deletion-request`) の変更禁止**
- ✅ **既存のStripeService.cancelSubscription()の変更禁止**
- ✅ **データベースマイグレーション不要**
- ✅ **既存の30日猶予期間設定の変更禁止**

### **最小変更原則**
- ✅ **関係のない機能への影響ゼロ**
- ✅ **既存の削除フローへの後方互換性維持**
- ✅ **テスト・モックデータの追加禁止**
- ✅ **新規依存関係の追加最小限**

### **コードの整合性**
- ✅ **CLAUDE.mdの両DB同期ルール遵守**
- ✅ **Firebase + SQLite 両方への操作実行**
- ✅ **エラー時の全体ロールバック**
- ✅ **国際化対応（日英）完全対応**

## 📈 期待効果

### **ビジネスリスク軽減**
- ✅ 課金継続問題の完全解消
- ✅ カスタマーサポート問い合わせ減少
- ✅ 法的・規制面でのコンプライアンス確保

### **ユーザー体験向上**
- ✅ 透明性のある削除プロセス
- ✅ 予期しない課金の防止
- ✅ 明確な情報提供

### **システム信頼性向上**
- ✅ データ整合性の確保
- ✅ 運用負荷の軽減
- ✅ 障害発生率の低下

## 🔧 活用可能な既存リソース

### **実装済みコンポーネント**
- ✅ `StripeService.cancelSubscription()` - 動作確認済み
- ✅ `SubscriptionCancellationModal` - UI/UXパターン参考
- ✅ 国際化文言 `accountSettings.planStatus.cancelModal.*`
- ✅ Webhook処理システム - DB同期自動化

### **既存インフラ活用**
- ✅ 両DB同期メカニズム
- ✅ エラーハンドリングパターン
- ✅ トランザクションロールバック
- ✅ 認証・セキュリティ機能

## ⚡ 実装優先度

### **緊急度: 高（即座対応必要）**
**理由**: 
- 課金継続による顧客信頼失失リスク
- 法的問題発生の可能性
- システム整合性の重大な欠陥

### **推奨実装順序**
1. **Phase 1 (必須)**: サブスクリプション自動キャンセル統合
2. **Phase 2 (推奨)**: UI改善とユーザー体験向上
3. **Phase 3 (理想)**: 運用最適化と高度機能

## 📋 検証・テスト要件

### **必須テストケース**
1. ✅ **Proプラン契約中のアカウント削除**
2. ✅ **トライアル期間中のアカウント削除**
3. ✅ **フリープランのアカウント削除（既存フロー）**
4. ✅ **Stripe API障害時のエラーハンドリング**
5. ✅ **Firebase同期失敗時のロールバック**

### **確認事項**
- ✅ サブスクリプションキャンセル成功後のDB状態
- ✅ 両DB（SQLite + Firebase）の整合性
- ✅ エラーログの適切な記録
- ✅ 国際化表示の正確性

---

## 🔄 **実装状況検証結果（2025-07-28 追記）**

### ✅ **完了済み実装**
1. **AccountDeletionService改修** - サブスクリプション自動キャンセル機能実装済み
2. **国際化文言追加** - 必要な翻訳文言追加済み
3. **基本動作確認** - サブスクリプションキャンセル処理は正常動作

### ❌ **重大な未実装部分の発見**

#### **問題1: レスポンス情報不足**
**ファイル**: `/server/src/services/accountDeletionService.ts` - 行139-145

**現在の実装**:
```typescript
return {
  userId: updatedUser.id,
  deletionRequestedAt: updatedUser.deletionRequestedAt!,
  scheduledDeletionAt: updatedUser.scheduledDeletionAt!,
  deletionReason: updatedUser.deletionReason || undefined,
  isDeleted: updatedUser.isDeleted
  // ❌ サブスクリプション情報が含まれていない
};
```

**必要な追加情報**:
```typescript
return {
  // 既存フィールド...
  subscriptionCancelled: boolean,      // サブスクリプションがキャンセルされたか
  originalSubscriptionStatus: string,  // 元のサブスクリプション状態
  subscriptionEndDate?: string        // サブスクリプション終了予定日
};
```

#### **問題2: フロントエンド表示未実装**
**ファイル**: `/client/src/components/AccountDeletionModal.tsx` - 行84-86

**現在の実装**:
```typescript
const data = await response.json();
setScheduledDeletionDate(data.deletionRequest.scheduledDeletionAt);
setShowSuccessModal(true);
// ❌ サブスクリプション情報を受け取らない
```

**必要な実装**:
```typescript
const data = await response.json();
setScheduledDeletionDate(data.deletionRequest.scheduledDeletionAt);
setSubscriptionInfo(data.deletionRequest.subscriptionInfo); // 追加
setShowSuccessModal(true);
```

#### **問題3: 成功モーダル情報不足**
**ファイル**: `/client/src/components/DeletionSuccessModal.tsx` - 行4-7

**現在の実装**:
```typescript
interface DeletionSuccessModalProps {
  scheduledDeletionDate: string;
  onClose: () => void;
  // ❌ サブスクリプション情報を受け取らない
}
```

**必要な追加**:
```typescript
interface DeletionSuccessModalProps {
  scheduledDeletionDate: string;
  subscriptionInfo?: {
    cancelled: boolean;
    originalStatus: string;
    endDate?: string;
  };
  onClose: () => void;
}
```

#### **問題4: 翻訳文言未使用**
**検証結果**: 以下の翻訳文言が一切使用されていない
- `successWithSubscription`
- `subscriptionCancelledNotice` 
- `subscriptionCancelError`

### 🎯 **追加実装必要事項**

#### **Phase 1.5: UI統合実装（緊急）**

**1.5.1 バックエンドレスポンス拡張**
```typescript
// AccountDeletionService.requestAccountDeletion() 修正
// 行42-45でサブスクリプション状態を保存
const originalSubscriptionStatus = user.subscriptionStatus;
const subscriptionWasCancelled = hasActiveSubscription && user.stripeCustomerId;

// 行139-145のreturn文に追加
return {
  userId: updatedUser.id,
  deletionRequestedAt: updatedUser.deletionRequestedAt!,
  scheduledDeletionAt: updatedUser.scheduledDeletionAt!,
  deletionReason: updatedUser.deletionReason || undefined,
  isDeleted: updatedUser.isDeleted,
  // 🆕 サブスクリプション情報追加
  subscriptionInfo: {
    cancelled: subscriptionWasCancelled,
    originalStatus: originalSubscriptionStatus,
    endDate: subscriptionWasCancelled ? await getSubscriptionEndDate(userId) : undefined
  }
};
```

**1.5.2 フロントエンド受け取り実装**
```typescript
// AccountDeletionModal.tsx 修正
const [subscriptionInfo, setSubscriptionInfo] = useState<any>(null);

// handleConfirmSubmit内（行84-86）
const data = await response.json();
setScheduledDeletionDate(data.deletionRequest.scheduledDeletionAt);
setSubscriptionInfo(data.deletionRequest.subscriptionInfo);
setShowSuccessModal(true);

// DeletionSuccessModal呼び出し修正（行105-108）
<DeletionSuccessModal
  scheduledDeletionDate={scheduledDeletionDate}
  subscriptionInfo={subscriptionInfo}
  onClose={handleSuccessModalClose}
/>
```

**1.5.3 成功モーダル表示実装**
```typescript
// DeletionSuccessModal.tsx 修正
// サブスクリプション情報表示セクション追加（行67後）
{subscriptionInfo?.cancelled && (
  <div className="mb-6">
    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
      <div className="flex items-start">
        <CheckCircle className="h-5 w-5 text-green-600 mr-3 mt-0.5" />
        <div className="flex-1">
          <h4 className="text-sm font-semibold text-green-900 mb-1">
            {t('accountSettings.accountDeletion.successWithSubscription')}
          </h4>
          <p className="text-sm text-green-800">
            {t('accountSettings.accountDeletion.subscriptionCancelledNotice')}
          </p>
        </div>
      </div>
    </div>
  </div>
)}
```

### 📊 **現在の実際の動作フロー**
```
ユーザー（Proプラン契約中）
    ↓
「アカウント削除」申請
    ↓
🔄 バックエンド: サブスクリプション自動キャンセル ← 実行される
    ↓
📱 フロントエンド: 通常の成功メッセージ表示 ← 問題
    ↓
😕 ユーザー: サブスクリプションキャンセルを知らない ← 問題
```

### 🎯 **修正後の期待動作フロー**
```
ユーザー（Proプラン契約中）
    ↓
「アカウント削除」申請
    ↓
🔄 バックエンド: サブスクリプション自動キャンセル + 情報返却
    ↓
📱 フロントエンド: サブスクリプションキャンセル通知表示
    ↓
😊 ユーザー: 透明性のある削除完了体験
```

### ⚡ **緊急実装優先度**
1. **Phase 1.5 (緊急)**: UI統合実装 - サブスクリプション情報表示
2. **Phase 2 (推奨)**: 事前チェック機能実装  
3. **Phase 3 (理想)**: 高度機能実装

### 🚨 **重要な結論**
**現在の実装では、サブスクリプションは正しくキャンセルされるが、ユーザーがそれを知ることができない。透明性とユーザー体験の観点から、Phase 1.5の実装が緊急で必要。**

---

**このドキュメントに基づき、段階的かつ確実な実装を行い、サブスクリプション契約時のアカウント削除問題を完全に解決する。**