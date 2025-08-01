# ConsensusAI Stripe決済・トライアル管理 - 正確な実装分析と対応方針

**作成日**: 2025-07-26 (修正版)  
**分析対象**: ConsensusAI 決済・トライアル機能の現在実装  
**問題**: 決済成功時にユーザーステータスが更新されない + Stripeトライアル機能未実装  
**調査方法**: コードベース直接調査（ハルシネーション回避）

---

## 🔍 **正確な実装状況分析**

### ✅ **実装済み機能**

#### **1. 独自トライアル実装（完全実装済み）**

**実装場所**: `server/src/services/trialService.ts`
```typescript
// 主要機能が完全実装済み
export class TrialService {
  // ✅ トライアル開始・管理
  static async startTrial(userId: string)
  
  // ✅ サブスクリプション状態更新
  static async updateSubscriptionStatus(userId, status, stripeCustomerId)
  
  // ✅ トライアル期限チェック
  static getTrialStatus(userId: string)
  
  // ✅ Firebase + SQLite 同期
  private static async syncToFirebase(user: User)
}
```

**特徴**:
- **14日間のトライアル期間**: `LimitsConfig.getTrialDurationDays()`で設定
- **両データベース同期**: SQLite → Firebase の順序で実行
- **期限切れ自動処理**: `checkAndUpdateExpiredTrial()`で自動的にfreeプランに変更
- **履歴管理**: `TrialHistory`テーブルで完全な履歴追跡

#### **2. プラン管理システム（堅牢実装）**

**データベーススキーマ（Prisma）**:
```sql
model User {
  id                  String          @id
  subscriptionStatus  String?         @default("free")
  trialStartDate      DateTime?
  trialEndDate        DateTime?
  stripeCustomerId    String?         -- Stripe連携用（未使用）
  trialHistories      TrialHistory[]
}

model TrialHistory {
  id          String   @id @default(cuid())
  userId      String
  startDate   DateTime @default(now())
  endDate     DateTime
  status      String   @default("active")
  trialType   String   @default("standard")
  source      String?
}
```

**プラン制限システム**:
- **Free**: 1プロジェクト、1回分析、50意見
- **Trial**: 5プロジェクト、7回/日・50回/月分析、150意見
- **Pro**: 無制限プロジェクト、10回/日・100回/月分析、無制限意見

#### **3. Stripe実装（インフラ完備・設定未完了）**

**実装済み機能**:
```typescript
// stripeService.ts - 完全実装済み
export class StripeService {
  // ✅ チェックアウトセッション作成
  async createCheckoutSession(params: CreateSubscriptionParams)
  
  // ✅ Webhook処理メイン
  async handleWebhook(event: Stripe.Event)
  
  // ✅ チェックアウト完了処理
  private async handleCheckoutCompleted(session: Stripe.Checkout.Session)
  
  // ✅ サブスクリプション管理
  async cancelSubscription(userId: string)
  async getSubscriptionInfo(userId: string)
}

// billing.ts - API エンドポイント完備
router.post('/create-checkout-session')  // ✅
router.post('/webhook')                  // ✅ 署名検証込み
router.get('/subscription-status/:userId') // ✅
```

**Webhook処理フロー（実装済み）**:
1. **署名検証**: `verifyStripeWebhook` ミドルウェア
2. **イベント処理**: `handleWebhook()` で `checkout.session.completed` 対応
3. **ユーザー更新**: `TrialService.updateSubscriptionStatus(userId, 'pro', customerId)`
4. **データベース同期**: SQLite → Firebase の順序で実行

#### **4. フロントエンド実装（部分実装）**

**プラン管理UI**:
```typescript
// usePlanStatus.ts - プラン状況管理
export interface PlanStatus {
  subscriptionStatus: PlanType;
  isTrialActive: boolean;
  trialDaysRemaining: number | null;
  usage: { projects, analyses, opinions };
}

// AccountSettings.tsx - アップグレードUI実装済み
```

### ❌ **根本原因の特定**

#### **重大問題: 環境変数の完全未設定**

**調査結果**:
```bash
# サーバーヘルスチェック実行結果
curl http://localhost:3001/api/billing/health
{
  "success": false,
  "error": "Stripe configuration invalid",
  "details": [
    "STRIPE_SECRET_KEY is not set",
    "STRIPE_WEBHOOK_SECRET is not set"
  ]
}
```

**未設定ファイル**:
- `server/.env` - **ファイル自体が存在しない**
- `client/.env` - **ファイル自体が存在しない**

**影響範囲**:
1. **Webhook署名検証失敗** → 全てのWebhookリクエストが400エラーで拒否
2. **チェックアウトセッション作成不可** → 決済画面に遷移できない
3. **決済処理完全停止** → ユーザーステータス更新が実行されない

---

## 🎯 **詳細対応方針**

### **Phase 1: 緊急対応（即座実行必要）**

#### **Step 1-1: 環境変数設定**
```bash
# server/.env 作成
cat > /Users/y-masamura/develop/ConsensusAI/server/.env << 'EOF'
# Stripe設定（テスト環境）
STRIPE_SECRET_KEY=sk_test_...           # Stripeダッシュボードから取得
STRIPE_WEBHOOK_SECRET=whsec_...         # Webhookエンドポイント作成時に生成

# 既存設定
DATABASE_URL="file:./prisma/dev.db"
PORT=3001
NODE_ENV=development
EOF

# client/.env 作成
cat > /Users/y-masamura/develop/ConsensusAI/client/.env << 'EOF'
# Stripe設定（テスト環境）
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_... # Stripeダッシュボードから取得
VITE_STRIPE_PRICE_ID=price_...          # Stripeで作成したPrice ID

# 既存設定
VITE_API_BASE_URL=http://localhost:3001
EOF
```

#### **Step 1-2: Stripe Dashboard設定**
1. **Webhookエンドポイント作成**:
   - **URL**: `http://localhost:3001/api/stripe/webhook` (開発環境)
   - **Events**: 
     - `checkout.session.completed`
     - `customer.subscription.updated`
     - `invoice.payment_succeeded`
     - `customer.subscription.trial_will_end`

2. **Price オブジェクト作成**:
   - **商品**: ConsensusAI Pro Plan
   - **価格**: $20/月 (既存設定と一致)
   - **課金モデル**: recurring/monthly

#### **Step 1-3: 動作確認**
```bash
# 1. サーバー再起動
cd server && npm run dev

# 2. ヘルスチェック
curl http://localhost:3001/api/billing/health
# 期待結果: { "success": true, "message": "Stripe service is healthy" }

# 3. テスト決済実行
./scripts/stripe-test.sh checkout
```

### **Phase 2: 堅牢性向上（1週間以内）**

#### **Step 2-1: Webhook処理の改善**

**現在の問題**:
```typescript
// stripeService.ts:149 - checkout.session.completed のみ対応
case 'checkout.session.completed':
  return await this.handleCheckoutCompleted(session);
```

**推奨改善**:
```typescript
// Stripe公式推奨: invoice.paid イベント追加
case 'invoice.paid':
  return await this.handleInvoicePaymentSucceeded(event.data.object);

// 実装例
private async handleInvoicePaymentSucceeded(invoice: Stripe.Invoice) {
  // サブスクリプション決済確認により確実性向上
  if (invoice.subscription) {
    const subscription = await this.stripe.subscriptions.retrieve(invoice.subscription);
    const customer = await this.stripe.customers.retrieve(subscription.customer);
    const userId = customer.metadata?.userId;
    
    if (userId) {
      await TrialService.updateSubscriptionStatus(userId, 'pro', customer.id);
    }
  }
}
```

#### **Step 2-2: エラーハンドリング強化**

**現在の問題**: エラー時のロールバック機能が不完全
```typescript
// 推奨改善: トランザクション的な処理
static async updateSubscriptionStatus(userId, status, stripeCustomerId) {
  const prisma = new PrismaClient();
  
  try {
    await prisma.$transaction(async (tx) => {
      // SQLite更新
      const updatedUser = await tx.user.update({
        where: { id: userId },
        data: { subscriptionStatus: status, stripeCustomerId }
      });
      
      // Firebase同期失敗時はSQLiteロールバック
      await this.syncToFirebaseWithThrow(updatedUser);
    });
  } catch (error) {
    // 完全なロールバック実行
    console.error('[TrialService] 完全ロールバック実行:', error);
    throw error;
  }
}
```

### **Phase 3: Stripeトライアル統合検討（中長期）**

#### **現在の独自実装 vs Stripe トライアル**

| 項目 | **独自実装（現在）** | **Stripe トライアル** |
|------|:------------------:|:--------------------:|
| **管理場所** | アプリケーションDB | Stripe + アプリDB |
| **自動化** | 手動期限チェック | Stripe自動管理 |
| **通知** | 独自実装 | 自動リマインド（3日前） |
| **信頼性** | 独自ロジック依存 | Stripe堅牢インフラ |

#### **段階的移行戦略**
```typescript
// ハイブリッド実装例
class TrialManager {
  async createTrial(userId: string, useStripe: boolean = false) {
    if (useStripe) {
      // 新規ユーザー: Stripe トライアル
      return await this.createStripeTrialSubscription(userId);
    } else {
      // 既存ユーザー: 従来システム継続
      return await this.createCustomTrial(userId);
    }
  }
}
```

---

## 📋 **実装優先度と作業計画**

### **🚨 Critical（即座実行）**
| 作業 | 所要時間 | 担当者 |
|------|---------|--------|
| Stripe環境変数設定 | 30分 | 開発者 |
| Webhookエンドポイント設定 | 15分 | 開発者 |
| 基本動作確認 | 30分 | 開発者 |

### **🔥 High（1週間以内）**
| 作業 | 所要時間 | 担当者 |
|------|---------|--------|
| `invoice.paid` イベント対応 | 2時間 | 開発者 |
| エラーハンドリング強化 | 3時間 | 開発者 |
| 本格的なテスト実行 | 2時間 | 開発者 |

### **📊 Medium（1ヶ月以内）**
| 作業 | 所要時間 | 担当者 |
|------|---------|--------|
| Stripe トライアル機能調査 | 1日 | 開発者 |
| ハイブリッド実装設計 | 2日 | 開発者 |
| 段階的移行計画策定 | 1日 | 開発者 |

---

## 🧪 **テスト計画**

### **基本動作テスト**
```bash
# 1. 環境設定後の動作確認
./scripts/stripe-test.sh basic

# 2. Webhook処理テスト
curl -X POST http://localhost:3001/api/stripe/webhook \
  -H "Content-Type: application/json" \
  -H "Stripe-Signature: t=..." \
  -d '{"type": "checkout.session.completed", ...}'

# 3. ユーザーステータス確認
curl http://localhost:3001/api/users/{userId}/plan-status
```

### **手動統合テスト**
1. **チェックアウトセッション作成**: アップグレードボタンクリック
2. **Stripe決済ページ**: テストカード `4242 4242 4242 4242` で決済
3. **Webhook処理確認**: サーバーログで処理状況確認
4. **ステータス更新確認**: UI でプラン状況確認
5. **データベース確認**: SQLite と Firebase 両方でデータ確認

---

## 📈 **期待される効果**

### **短期効果（Phase 1完了後）**
- ✅ Stripe決済が正常動作
- ✅ 決済成功後のユーザーステータス自動更新
- ✅ Pro プラン機能の解放

### **中期効果（Phase 2完了後）**
- 🛡️ 決済処理の信頼性向上
- 📊 詳細なエラー監視とログ
- 🔄 より堅牢なデータ同期

### **長期効果（Phase 3完了後）**
- 🤖 Stripe による完全自動管理
- 📧 自動リマインド・通知機能
- 🔧 運用コスト削減

---

## ⚠️ **リスク分析と対策**

### **高リスク**
| リスク | 確率 | 影響 | 対策 |
|--------|:----:|:----:|------|
| 環境変数設定ミス | 中 | 高 | 段階的確認・テスト実行 |
| Webhook設定ミス | 中 | 高 | ngrokでローカルテスト |
| 既存ユーザーデータ影響 | 低 | 高 | 本番前バックアップ |

### **中リスク**
| リスク | 確率 | 影響 | 対策 |
|--------|:----:|:----:|------|
| Stripe API制限 | 低 | 中 | テスト環境で検証 |
| 二重課金 | 低 | 中 | べき等性チェック実装 |

---

## 🎯 **成功指標**

### **技術指標**
- [ ] Stripe ヘルスチェック成功率: 100%
- [ ] Webhook処理成功率: 99%以上
- [ ] 決済→ステータス更新の遅延: 5秒以内

### **ビジネス指標**
- [ ] ユーザーからの決済問題報告: 0件
- [ ] Pro プラン移行率: 測定開始
- [ ] 決済関連サポート問い合わせ: 50%削減

---

## 📝 **次のアクション**

### **即座実行**
1. **Stripe環境変数設定**（30分）
2. **基本動作確認**（30分）
3. **テスト決済実行**（15分）

### **今週中**
1. **Webhook処理改善**（2-3時間）
2. **エラーハンドリング強化**（3時間）
3. **包括的テスト実行**（2時間）

### **来月**
1. **Stripe トライアル機能詳細調査**
2. **移行計画策定**
3. **ユーザー影響分析**

---

**文書作成者**: Claude Code AI  
**最終更新**: 2025-07-26  
**次回レビュー予定**: Phase 1完了後  
**関連文書**: `docs/billing/current-implementation.md`, `docs/billing/stripe-setup-guide.md`