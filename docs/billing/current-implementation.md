# ConsensusAI プラン管理システム

**現在実装されているプラン管理機能の概要**

## 📊 現在の実装状況

### ✅ 実装済み機能

#### プラン管理システム
- **3段階プラン**: Free / Trial / Pro プランの管理
- **利用制限管理**: プロジェクト数・分析回数・意見数の制御
- **トライアル機能**: 14日間の無料トライアル
- **使用量監視**: リアルタイムでの使用量追跡と表示
- **制限到達時のUI**: アップグレードダイアログの表示

#### データベース設計
```sql
-- 現在のユーザーテーブル（プラン関連フィールド）
model User {
  subscriptionStatus  String?   @default("free")
  trialStartDate      DateTime?
  trialEndDate        DateTime?
  stripeCustomerId    String?   // 将来のStripe統合用（未使用）
}
```

#### プラン制限設定
```typescript
// server/src/config/limits.ts で管理
const PLAN_LIMITS = {
  free: {
    maxProjects: 1,
    maxAnalysesTotal: 1,
    maxOpinionsPerProject: 50
  },
  trial: {
    maxProjects: 5,
    maxAnalysesTotal: 50,
    maxOpinionsPerProject: 150
  },
  pro: {
    maxProjects: -1,      // 無制限
    maxAnalysesTotal: -1, // 基本制限は無制限（日次・月次制限は別途適用）
    maxOpinionsPerProject: -1 // 無制限
  }
};

// AI分析の日次・月次制限（シンプル化後の実装）
const ANALYSIS_LIMITS = {
  // Freeプラン: 1回限りで早期停止
  free: {
    basicLimit: 1,  // 1回限りで停止
    dailyMonthly: "N/A"  // 適用されない
  },
  
  // Trialプラン: 全体制限のみ（シンプル化）
  trial: {
    total: { daily: 7, monthly: 50 },      // 全体制限のみ
    maxProjects: 5                         // プロジェクト数上限
  },
  
  // Proプラン: 全体制限のみ（シンプル化）
  pro: {
    total: { daily: 10, monthly: 100 },    // 全体制限のみ
    maxProjects: -1                        // 無制限
  }
};
```

#### 主要実装ファイル
- `server/src/config/limits.ts` - プラン制限設定
- `server/src/services/PlanLimitService.ts` - 制限チェック機能
- `server/src/services/trialService.ts` - トライアル管理
- `client/src/hooks/usePlanStatus.ts` - プラン状況取得
- `client/src/components/AccountSettings.tsx` - プラン管理UI

### ❌ 未実装機能

#### 決済・課金機能
- Stripe決済統合
- 実際のクレジットカード決済
- サブスクリプション管理
- Webhook処理
- 請求書・履歴機能

## 🎯 プラン仕様・制限一覧表

### 📊 プラン別制限比較

| 項目 | **Free プラン** | **Trial プラン** | **Pro プラン** |
|------|:---------------:|:----------------:|:--------------:|
| **💰 料金** | 無料 | 無料 | $20/月 |
| **⏰ 利用期間** | 無制限 | 14日間限定 | 無制限 |
| **📁 プロジェクト数** | **1個** | **5個** | **無制限** |
| **🤖 AI分析（基本制限）** | **1回** | **50回** | **基本無制限*** |
| **🤖 AI分析（日次制限）** | **適用なし*** | **7回/日** | **10回/日** |
| **🤖 AI分析（月次制限）** | **適用なし*** | **50回/月** | **100回/月** |
| **💬 意見収集数** | **50件/プロジェクト** | **150件/プロジェクト** | **無制限** |
| **🔄 データ同期** | ✅ | ✅ | ✅ |
| **📱 モバイル対応** | ✅ | ✅ | ✅ |

### ⚠️ 重要な注意事項

**AI分析の品質・機能について:**
- **全プラン共通**: Claude 3.5 Sonnetモデル使用
- **分析品質**: プランによる差異なし（同じAI・同じ分析ロジック）
- **差別化要素**: 使用回数制限のみ

**AI分析にはプラン別の制限システムがあります:**

### **制限適用ロジックの詳細（シンプル化後）**

**Freeプラン:**
1. `PlanLimitService.checkAnalysisLimit()` で **1回限りチェック**
2. 1回目の分析後は制限エラーで停止
3. `AnalysisLimitService` の日次・月次制限には**到達しない**

**Trial/Proプラン:**
1. `PlanLimitService.checkAnalysisLimit()` を通過
2. `AnalysisLimitService.checkAnalysisLimit()` で**全体制限のみチェック**:
   - アカウント全体日次/月次制限のみ
   - プロジェクト別制限は撤廃済み
3. **シンプル化**: 複雑な二重制限を解消

### **シンプル化のメリット**
- **理解しやすい**: 「1日7回まで」が直感的
- **予測可能**: プロジェクト数に関係なく一定の制限
- **実装シンプル**: 制限チェックが1つのクエリで完結
- **パフォーマンス向上**: データベースクエリが半減

***全プラン共通でClaude 3.5 Sonnetモデルを使用し、同じAI分析品質を提供します。**

**AI分析制限の実装詳細（シンプル化後）:**

### **各プランの実際制限値（実装コード確認済み）**

**Freeプラン:**
- 実装: `1回限り制限で早期停止`
- 日次・月次制限: 適用されない（〃1回で停止するため）

**Trialプラン:**
- 全体日次: `7回/日`, 全体月次: `50回/月`
- プロジェクト数上限: `5個`
- **シンプル化**: プロジェクト別制限を撤廃し、全体制限のみ適用

**Proプラン:**
- 全体日次: `10回/日`, 全体月次: `100回/月`
- プロジェクト数: 無制限
- **シンプル化**: プロジェクト別制限を撤廃し、全体制限のみ適用

### 🚀 機能別比較

| 機能カテゴリ | Free | Trial | Pro |
|-------------|:----:|:-----:|:---:|
| **基本機能** |
| プロジェクト作成・管理 | ✅ | ✅ | ✅ |
| 意見収集フォーム | ✅ | ✅ | ✅ |
| リアルタイム収集状況表示 | ✅ | ✅ | ✅ |
| **AI分析機能** |
| AI自動分析 | ✅ (1回) | ✅ (50回) | ✅ (日次・月次制限) |
| トピック抽出 | ✅ | ✅ | ✅ |
| 洞察・改善提案 | ✅ | ✅ | ✅ |
| **データ管理** |
| CSV形式エクスポート | ❌ | ✅ | ✅ |
| プロジェクトアーカイブ | ❌ | ✅ | ✅ |
| 分析結果表示 | ✅ | ✅ | ✅ |
| **拡張機能** |
| 複数プロジェクト管理 | ❌ | ✅ | ✅ |
| 大容量意見収集 | ❌ | ✅ | ✅ |
| 無制限AI分析 | ❌ | ❌ | ✅ (10回/日上限) |

### 📈 利用想定シーン

#### Free プラン - スタート向け
```
👥 対象: 個人・小規模チーム
📝 用途: 基本的な意見収集・分析を体験
🎯 シーン: 
  - 初回の意見収集を試したい
  - 機能を理解したい
  - 小規模な1回限りの調査
```

#### Trial プラン - 本格検討向け
```
👥 対象: 中規模チーム・継続利用検討者
📝 用途: 本格的な意見収集・分析の実施
🎯 シーン:
  - 複数のプロジェクトで活用したい
  - 継続的な意見収集を検討中
  - Pro プランの機能を事前体験
```

#### Pro プラン - 本格運用向け
```
👥 対象: 企業・団体・継続利用者
📝 用途: 大規模・継続的な意見収集・分析
🎯 シーン:
  - 企業の顧客フィードバック収集
  - 自治体の住民意見聴取
  - 定期的な満足度調査
  - 大規模イベントの参加者アンケート
⚠️ 注意: AI分析は高頻度利用可能（10回/日、100回/月）だが無制限ではない
```

## 🔧 技術実装詳細

### プラン状況取得
```typescript
// クライアントサイドでのプラン状況取得
const planStatus = usePlanStatus();
console.log(planStatus.subscriptionStatus); // 'free' | 'trial' | 'pro'
```

### 制限チェック
```typescript
// サーバーサイドでの制限チェック
const limitService = new PlanLimitService();
const canCreateProject = await limitService.checkProjectLimit(userId);
```

### トライアル管理
```typescript
// トライアル開始処理
await trialService.startTrial(userId);
```

## 🚀 将来的な拡張計画

### Phase 1: Stripe統合（未実装）
- Stripe SDK導入
- 基本決済フロー実装
- サブスクリプション作成

### Phase 2: 高度な課金機能（未実装）
- Webhook処理
- 請求履歴管理
- プラン変更機能

### Phase 3: 運用・管理機能（未実装）
- 管理画面
- 分析・レポート機能

## 📁 ファイル構成

```
docs/billing/
└── current-implementation.md  # このファイル（プラン管理システム概要）

server/src/
├── config/limits.ts           # プラン制限設定
├── services/PlanLimitService.ts    # 制限チェック
├── services/trialService.ts        # トライアル管理
└── routes/trial.ts                 # トライアル関連API

client/src/
├── hooks/usePlanStatus.ts          # プラン状況取得
├── hooks/usePlanDetails.ts         # プラン詳細情報
├── components/AccountSettings.tsx   # プラン管理UI
└── utils/upgradeDisplayLogic.ts    # アップグレード表示制御
```

## 📝 開発時の注意事項

### CRUD操作時の重要ルール
**全ての制限チェックはサーバーサイドで実行し、クライアントサイドの制限表示は参考程度に留める**

### プラン制限の確認方法
```bash
# 現在の制限設定を確認
node -e "
const { LimitsConfig } = require('./server/src/config/limits.ts');
console.log(LimitsConfig.getFreemiumLimits());
"
```

### テスト用コマンド
```bash
# トライアル期限切れユーザーのチェック
curl -X GET http://localhost:3001/api/trial/expired

# ユーザーのプラン状況確認
curl -X GET http://localhost:3001/api/users/{userId}/plan-status
```

## 🎯 Stripe トライアル機能調査結果

### 📊 **Stripe vs 独自実装の比較**

| 項目 | **独自実装（現在）** | **Stripe トライアル** |
|------|:------------------:|:--------------------:|
| **管理場所** | アプリケーションDB | Stripe Dashboard + アプリDB |
| **トライアル期間** | 14日間（設定可能） | 最大730日（2年）まで設定可能 |
| **支払い方法** | トライアル中は不要 | 設定により必須・任意選択可能 |
| **自動移行** | 独自ロジックで管理 | Stripe が自動でサブスクリプション開始 |
| **Webhook通知** | 独自実装 | `customer.subscription.trial_will_end`等 |
| **期限切れ処理** | 独自ロジック | 自動キャンセル or 一時停止 |

### ✅ **Stripe トライアルの主要機能**

#### **1. 基本設定オプション**
```javascript
// Checkout セッション作成時
stripe.checkout.sessions.create({
  mode: 'subscription',
  subscription_data: {
    trial_period_days: 14,  // または trial_end: 1640995200
    trial_settings: {
      end_behavior: {
        missing_payment_method: 'cancel' // または 'pause'
      }
    }
  },
  payment_method_collection: 'if_required', // トライアル中は任意
  // ... 他の設定
});
```

#### **2. サブスクリプション API 経由**
```javascript
// 直接サブスクリプション作成
stripe.subscriptions.create({
  customer: 'cus_...',
  items: [{ price: 'price_...' }],
  trial_period_days: 14,
  // 初期請求額は $0 with "free trial" 表記
});
```

#### **3. トライアル終了時の動作**
- **自動キャンセル**: 支払い方法未登録の場合、サブスクリプション即座にキャンセル
- **自動一時停止**: 支払い方法未登録の場合、サブスクリプション一時停止
- **自動課金開始**: 支払い方法登録済みの場合、自動で有料サブスクリプション開始

### 🔔 **重要な Webhook イベント**

#### **トライアル関連 Webhook**
```javascript
// 1. トライアル終了3日前の通知
'customer.subscription.trial_will_end': {
  // ユーザーに課金開始を事前通知
  // 支払い方法の確認・追加をリマインド
}

// 2. トライアル→有料への移行完了
'customer.subscription.updated': {
  previous_attributes: { status: 'trialing' },
  object: { status: 'active' }
  // ユーザーステータスを 'pro' に更新
}

// 3. トライアル後の初回支払い成功
'invoice.payment_succeeded': {
  // 有料プラン開始の確定処理
}

// 4. トライアル後の支払い失敗
'invoice.payment_failed': {
  // 支払い失敗時の処理
}

// 5. サブスクリプション一時停止（支払い方法未登録）
'customer.subscription.paused': {
  // ユーザー機能を制限状態に変更
}

// 6. サブスクリプション再開
'customer.subscription.resumed': {
  // ユーザー機能を有料プラン状態に復旧
}
```

### 💡 **Stripe トライアルの利点**

#### **管理面**
- **自動化**: トライアル終了処理が Stripe 側で自動実行
- **精度**: タイムゾーンや時刻処理が Stripe で統一管理
- **監査**: Stripe Dashboard で全トライアル状況を可視化
- **コンプライアンス**: カードネットワーク要件への自動対応

#### **開発面**
- **実装簡素化**: トライアル期限チェックロジックが不要
- **バグ削減**: 独自の日付計算ロジックによるバグリスクを排除
- **Webhook統合**: 既存のStripe Webhook処理に統合可能

#### **UX面**
- **リマインド機能**: 自動で期限切れ3日前に通知メール送信
- **柔軟な設定**: 支払い方法収集タイミングを柔軟に制御
- **透明性**: ユーザーは Stripe でトライアル状況を確認可能

### ⚠️ **注意点・制約**

#### **技術的制約**
- **Stripe依存**: Stripe サービス停止時はトライアル管理も停止
- **複雑性**: Webhook処理の複雑化（新しいイベント対応）
- **移行コスト**: 既存の独自実装からの移行作業

#### **料金・運用**
- **Stripe手数料**: トライアル終了後の課金に対してStripe手数料が発生
- **設定制約**: トライアル期間は作成後変更不可（新サブスクリプション作成必要）

### 🔧 **推奨実装方針**

#### **Phase 1: ハイブリッド実装**
```typescript
// 既存の独自トライアル + Stripe トライアルの併用
class TrialManager {
  async createTrial(userId: string, useStripe: boolean = false) {
    if (useStripe) {
      // Stripe トライアル作成
      return await this.createStripeTrialSubscription(userId);
    } else {
      // 既存のシステム（後方互換性）
      return await this.createCustomTrial(userId);
    }
  }
}
```

#### **Phase 2: Stripe完全移行**
- 既存ユーザーの段階的移行
- 新規ユーザーは Stripe トライアル
- 独自実装は段階的廃止

### 📈 **実装優先度**

| 優先度 | 実装内容 | 理由 |
|:-----:|---------|------|
| **High** | Stripe 環境変数設定 | 決済機能全体の前提条件 |
| **High** | Webhook 処理基盤 | トライアル・決済両方で必要 |
| **Medium** | Stripe トライアル実装 | 管理効率化・自動化 |
| **Low** | 既存実装からの移行 | 段階的実施で十分 |

### 🎯 **結論・推奨事項**

**短期的推奨**: 
- まず **Stripe 基本決済機能** を完成させる
- 既存の独自トライアルシステムを継続使用

**中長期的推奨**:
- **Stripe トライアル機能への移行** を検討
- 管理効率化・自動化のメリットが大きい
- 新機能として段階的に導入

**実装方針**:
1. **Phase 1**: Stripe 決済基盤完成（環境変数設定・Webhook処理）
2. **Phase 2**: Stripe トライアル機能の並行実装
3. **Phase 3**: 既存ユーザーの段階的移行

---

**最終更新**: 2025-07-26  
**現在のステータス**: プラン管理システム実装完了、Stripe統合調査完了  
**次の実装予定**: Stripe環境変数設定 → 基本決済機能 → トライアル機能検討