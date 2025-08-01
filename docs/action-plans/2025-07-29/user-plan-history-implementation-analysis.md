# ユーザープラン履歴実装分析・対応方針

**作成日**: 2025-07-29  
**担当**: Claude Code  
**目的**: ユーザープラン変更履歴の保存実装に関する現状分析と対応方針の策定

## 📊 現状分析結果

### 1. 現在の利用履歴表示データソース

#### 📍 **データソース構成**
```
SQLite Database (メインデータ) 
↓
- User.subscriptionStatus: プラン状態（free/trial/pro）
- User.trialStartDate: トライアル開始日
- User.trialEndDate: トライアル終了日  
- User.stripeCustomerId: Stripe顧客ID

Stripe API (外部請求データ)
↓  
- /api/billing/history/:userId
- 実際の請求履歴・インボイス情報

ローカル履歴構築 (補完データ)
↓
- BillingHistoryCard コンポーネント内で動的生成
- トライアル開始記録、現在プラン状況、アカウント作成履歴
```

#### 📝 **表示データの生成フロー**
1. **SQLiteから基本データ取得** → プラン状況・トライアル日程
2. **Stripe APIから請求履歴取得** → 実際の課金データ  
3. **フロントエンドで統合・整形** → 表示用履歴オブジェクト作成

### 2. プラン変更API・トリガーポイント特定

#### 🔧 **プラン変更の主要エンドポイント**

**トライアル関連** (`/server/src/routes/trial.ts`):
- `POST /api/trial/start` → フリーからトライアルへ `:358-437`
- `POST /api/trial/upgrade` → プラン状態更新 `:186-235`
- トライアル期限切れ自動変更 → `TrialService.checkAndUpdateExpiredTrial()` `:468-534`

**Stripe決済関連** (`/server/src/routes/billing.ts`):
- `POST /api/billing/create-checkout-session` → Pro決済セッション作成 `:60-133`
- `POST /api/stripe/webhook` → Stripe Webhook処理 `:139-174`
  - プラン変更通知を受信してプラン状態更新

**サブスクリプション管理** (`/server/src/routes/billing.ts`):
- `POST /api/billing/cancel-subscription` → プロプランキャンセル `:235-278`
- `POST /api/billing/restore-subscription` → キャンセル取り消し `:284-328`

#### ⚙️ **プラン変更処理の実装詳細**

**TrialService** (`/server/src/services/trialService.ts`):
- `updateSubscriptionStatus()` `:268-305` → プラン状態をSQLite更新
- `startTrial()` `:358-437` → フリー→トライアル変更
- Firebase同期処理 `:37-57` → SQLite変更後にFirebaseに同期

**StripeService** (`/server/src/services/stripeService.ts`):
- Webhookイベント処理 `:132-168`
  - `checkout.session.completed` → Pro決済完了時プラン更新 `:173-223`
  - `customer.subscription.updated` → プラン状態変更 `:228-278`
  - `customer.subscription.deleted` → キャンセル処理 `:318-348`

### 3. 履歴保存の有無・データベーススキーマ確認

#### ❌ **重要な発見: プラン履歴は保存されていない**

**現在のDBスキーマ調査結果**:
```sql
-- Userテーブル内のプラン関連フィールド（最新状態のみ）
model User {
  subscriptionStatus  String?   @default("free")  // 現在のプラン状態のみ
  stripeCustomerId    String?                     // Stripe顧客ID
  trialStartDate      DateTime?                   // トライアル開始日
  trialEndDate        DateTime?                   // トライアル終了日
  // プラン変更履歴を保存するフィールドは存在しない
}

-- 既存の履歴テーブル（プラン履歴ではない）
model AnalysisHistory {    // AI分析履歴
model ActionLog {          // オピニオンアクションログ  
model UserFeedbackLog {    // ユーザーフィードバックログ

-- プラン変更専用の履歴テーブルは存在しない ❌
```

#### 🔍 **現在のプラン変更時の処理**

1. **プラン変更実行**
   ```typescript
   // TrialService.updateSubscriptionStatus() - Line 268-305
   const updatedUser = await prisma.user.update({
     where: { id: userId },
     data: {
       subscriptionStatus: status,    // 現在値を上書き（履歴は保存されない）
       stripeCustomerId: stripeCustomerId,
       updatedAt: new Date()
     }
   });
   ```

2. **Firebase同期**
   ```typescript
   // TrialService.syncToFirebase() - Line 37-57  
   const firebaseUserData = {
     subscriptionStatus: user.subscriptionStatus,  // 現在値のみ同期
     trialStartDate: user.trialStartDate?.toISOString(),
     trialEndDate: user.trialEndDate?.toISOString()
   };
   ```

3. **履歴構築** (表示時に動的生成)
   ```typescript
   // AccountSettings.tsx buildLocalHistory() - Line 776
   // トライアル開始履歴を動的に生成（DBには保存しない）
   if (user.trialStartDate) {
     history.push({
       id: 'trial-start',
       type: 'trial_started', 
       date: user.trialStartDate  // SQLiteの現在値から推測
     });
   }
   ```

## 🚨 問題点の整理

### 1. **データ完全性の問題**
- プラン変更履歴が保存されないため、ユーザーの完全な利用履歴を追跡できない
- 過去のプラン変更タイミングや理由が分からない
- 課金トラブル発生時の調査が困難

### 2. **ビジネス分析の制約**
- ユーザーのプラン変更パターン分析ができない
- 収益予測・チャーン分析に必要なデータが不足
- トライアルからProへの変換率が正確に測定できない

### 3. **サポート対応の困難**
- ユーザーからの問い合わせ時に過去のプラン履歴を確認できない
- 請求関連の問題調査が困難
- 返金・調整処理時の根拠データが不足

### 4. **監査・コンプライアンス**
- 財務監査時にサブスクリプション変更履歴を提供できない
- GDPR等のデータ管理要件に対応困難

## 🎯 対応方針

### Phase 1: プラン履歴テーブルの設計・実装

#### 1.1 **新規テーブル設計**

```sql
-- プラン変更履歴テーブル
model UserPlanHistory {
  id                String   @id @default(cuid())
  userId            String
  fromPlan          String?  // 変更前プラン (null = 初回設定)
  toPlan            String   // 変更後プラン
  changeType        String   // 変更種別 (upgrade/downgrade/cancel/trial_start/trial_end)
  changeReason      String?  // 変更理由 (user_request/payment_failed/trial_expired/etc)
  stripeEventId     String?  // StripeイベントID (Webhook起因の場合)
  metadata          Json?    // 追加情報 (金額、プロモーション等)
  effectiveDate     DateTime // 変更有効日
  createdAt         DateTime @default(now())
  firebaseId        String?
  syncStatus        String?  @default("pending")
  lastSyncAt        DateTime?
  
  user              User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  @@index([userId, effectiveDate])
  @@index([changeType, createdAt])
  @@map("user_plan_history")
}

-- Userテーブルへのリレーション追加
model User {
  // 既存フィールド...
  planHistory       UserPlanHistory[]
}
```

#### 1.2 **履歴記録サービスの実装**

```typescript
// /server/src/services/UserPlanHistoryService.ts
export class UserPlanHistoryService {
  
  /**
   * プラン変更履歴を記録
   */
  static async recordPlanChange(params: {
    userId: string;
    fromPlan: string | null;
    toPlan: string;
    changeType: 'upgrade' | 'downgrade' | 'cancel' | 'trial_start' | 'trial_end' | 'restore';
    changeReason: string;
    stripeEventId?: string;
    metadata?: Record<string, any>;
    effectiveDate?: Date;
  }): Promise<{ success: boolean; error?: string }> {
    // SQLite保存 → Firebase同期の順序で実行
  }
  
  /**
   * ユーザーのプラン履歴取得
   */
  static async getUserPlanHistory(userId: string): Promise<UserPlanHistory[]> {
    // 時系列順でプラン変更履歴を返す
  }
  
  /**
   * プラン変更統計取得
   */
  static async getPlanChangeAnalytics(options: {
    fromDate?: Date;
    toDate?: Date;
    planType?: string;
  }): Promise<PlanAnalytics> {
    // ビジネス分析用のプラン変更データを返す
  }
}
```

### Phase 2: 既存API群への履歴記録機能追加

#### 2.1 **TrialServiceの修正**

```typescript
// /server/src/services/trialService.ts - 修正版

static async updateSubscriptionStatus(
  userId: string, 
  status: 'trial' | 'pro' | 'expired' | 'cancelled' | 'free',
  stripeCustomerId?: string,
  changeReason?: string,
  stripeEventId?: string
): Promise<{ success: boolean; error?: string; user?: any }> {
  try {
    // 1. 現在のプラン状態を取得
    const currentUser = await this.getUserById(userId);
    const fromPlan = currentUser?.subscriptionStatus || 'free';
    
    // 2. プラン状態を更新（既存処理）
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        subscriptionStatus: status,
        stripeCustomerId: stripeCustomerId,
        updatedAt: new Date()
      }
    });
    
    // 3. 📝 プラン変更履歴を記録（新規追加）
    await UserPlanHistoryService.recordPlanChange({
      userId,
      fromPlan: fromPlan !== status ? fromPlan : null,
      toPlan: status,
      changeType: this.determineChangeType(fromPlan, status),
      changeReason: changeReason || 'system_update',
      stripeEventId,
      effectiveDate: new Date()
    });
    
    // 4. Firebase同期（既存処理）
    await this.syncToFirebase(updatedUser);
    
    return { success: true, user: updatedUser };
  } catch (error) {
    // エラーハンドリング...
  }
}
```

#### 2.2 **StripeService Webhook処理の修正**

```typescript
// /server/src/services/stripeService.ts - 修正版

private async handleSubscriptionUpdated(subscription: Stripe.Subscription): Promise<{ success: boolean; error?: string }> {
  try {
    // 既存処理...
    
    // 📝 履歴記録を追加
    await TrialService.updateSubscriptionStatus(
      userId, 
      status, 
      customer.id,
      `stripe_subscription_${subscription.status}`, // 変更理由
      event.id // StripeイベントID
    );
    
    return { success: true };
  } catch (error) {
    // エラーハンドリング...
  }
}
```

### Phase 3: 利用履歴UI改善

#### 3.1 **BillingHistoryCard修正**

```typescript
// /client/src/components/AccountSettings.tsx - 修正版

// 現在のローカル履歴構築を廃止
// const buildLocalHistory = () => { ... }  // 削除

// 新しいAPI呼び出しに変更
React.useEffect(() => {
  const fetchBillingHistory = async () => {
    try {
      // 1. プラン履歴を取得（新規API）
      const planHistoryResponse = await fetch(`/api/users/${user.id}/plan-history`);
      const planHistoryData = await planHistoryResponse.json();
      
      // 2. Stripe請求履歴を取得（既存）
      const stripeResponse = await fetch(`/api/billing/history/${user.id}`);
      const stripeData = await stripeResponse.json();
      
      // 3. 統合・整形
      const combinedHistory = [
        ...formatPlanHistory(planHistoryData.history),
        ...formatStripeHistory(stripeData.invoices)
      ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      
      setBillingHistory(combinedHistory);
    } catch (error) {
      console.error('Failed to fetch history:', error);
    }
  };
}, [user]);
```

#### 3.2 **新規APIエンドポイント追加**

```typescript
// /server/src/routes/users.ts - 追加

/**
 * GET /api/users/:userId/plan-history
 * ユーザーのプラン変更履歴取得
 */
router.get('/:userId/plan-history', async (req, res) => {
  try {
    const { userId } = req.params;
    const requestUserId = req.headers['x-user-id'] as string;

    // 認証チェック
    if (!requestUserId || requestUserId !== userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const history = await UserPlanHistoryService.getUserPlanHistory(userId);
    
    res.json({
      success: true,
      history: history,
      total: history.length
    });

  } catch (error) {
    console.error('Failed to get plan history:', error);
    res.status(500).json({ 
      error: 'Failed to get plan history',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});
```

### Phase 4: 既存ユーザーの初期履歴データ作成

#### 4.1 **マイグレーションスクリプト**

```typescript
// /server/scripts/migrate-existing-users-plan-history.ts

async function migrateExistingUsers() {
  const users = await prisma.user.findMany({
    select: {
      id: true,
      email: true,
      subscriptionStatus: true,
      trialStartDate: true,
      createdAt: true
    }
  });

  for (const user of users) {
    // 1. アカウント作成時のフリープラン開始を記録
    await UserPlanHistoryService.recordPlanChange({
      userId: user.id,
      fromPlan: null,
      toPlan: 'free',
      changeType: 'initial',
      changeReason: 'account_creation',
      effectiveDate: user.createdAt
    });

    // 2. トライアル開始履歴があれば記録
    if (user.trialStartDate) {
      await UserPlanHistoryService.recordPlanChange({
        userId: user.id,
        fromPlan: 'free',
        toPlan: 'trial',
        changeType: 'trial_start',
        changeReason: 'user_request',
        effectiveDate: user.trialStartDate
      });
    }

    // 3. 現在のプラン状態を記録
    if (user.subscriptionStatus && user.subscriptionStatus !== 'free') {
      await UserPlanHistoryService.recordPlanChange({
        userId: user.id,
        fromPlan: user.trialStartDate ? 'trial' : 'free',
        toPlan: user.subscriptionStatus,
        changeType: 'upgrade',
        changeReason: 'migration_inference',
        effectiveDate: new Date() // 現在時刻で推定
      });
    }
  }
}
```

## 🗓️ 実装スケジュール

### Week 1: 基盤実装
- [ ] UserPlanHistoryテーブル作成・マイグレーション
- [ ] UserPlanHistoryServiceの実装
- [ ] 基本的なCRUD操作のテスト

### Week 2: 既存API修正
- [ ] TrialServiceへの履歴記録機能追加
- [ ] StripeServiceへの履歴記録機能追加
- [ ] 新規APIエンドポイント追加

### Week 3: UI実装
- [ ] BillingHistoryCardの修正
- [ ] 履歴表示UIの改善
- [ ] エラーハンドリング強化

### Week 4: データ移行・テスト
- [ ] 既存ユーザーの初期履歴作成
- [ ] 統合テスト実行
- [ ] パフォーマンス確認

## 🔍 技術考慮事項

### 1. **パフォーマンス**
- プラン履歴テーブルのインデックス最適化
- 大量履歴データの効率的な取得
- ページネーション実装

### 2. **データ整合性**
- SQLite → Firebase同期エラー時の処理
- 重複履歴レコード防止
- トランザクション処理の強化

### 3. **セキュリティ**
- プラン履歴データの適切なアクセス制御
- 機微情報（金額等）のマスキング
- 監査ログとしての改ざん防止

### 4. **監視・アラート**
- プラン変更失敗時のアラート
- 異常なプラン変更パターンの検知
- 履歴データの品質監視

## 📊 成功指標

### 1. **機能面**
- プラン変更の100%履歴記録
- 利用履歴画面での完全な履歴表示
- Stripe決済データとの整合性確保

### 2. **運用面**  
- サポート問い合わせ対応時間の短縮
- プラン変更トラブルの早期発見
- ビジネス分析レポートの精度向上

### 3. **技術面**
- API応答時間: 500ms以内維持
- データベース同期成功率: 99.9%以上
- 履歴データの欠損率: 0.1%以下

---

**本分析により、ユーザープラン履歴が現在保存されておらず、完全な利用履歴追跡ができない状況が判明しました。上記の対応方針により、包括的なプラン履歴管理システムの構築を推奨します。**