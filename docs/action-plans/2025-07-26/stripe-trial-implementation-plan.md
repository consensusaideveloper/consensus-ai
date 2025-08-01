# Stripe トライアル実装移行計画

**作成日**: 2025-07-26  
**目的**: 現在のカスタムトライアル実装をStripeトライアル実装に修正する

## 📊 現在の実装状況（コードベース確認済み）

### ✅ 確認済み事実

#### A. カスタムトライアル実装（完全実装済み）
- **場所**: `server/src/services/trialService.ts`
- **機能**: 独自のトライアル管理システム（SQLite + Firebase）
- **期間**: 14日間のトライアル期間設定
- **処理**: トライアル開始・終了・期限切れ処理

#### B. Stripe実装の現状
- **場所**: `server/src/services/stripeService.ts`
- **現状**: `line 73-88` チェックアウトセッション作成に **`trial_period_days` パラメータなし**
- **準備済み**: `line 222` Stripeの `trialing` ステータス受信処理（webhook用）
- **準備済み**: `line 129` `trial_will_end` イベント処理（webhook用）

```typescript
// 現在のチェックアウトセッション作成（トライアルなし）
const session = await this.stripe.checkout.sessions.create({
  customer: stripeCustomer.id,
  payment_method_types: ['card'],
  line_items: [{ price: priceId, quantity: 1 }],
  mode: 'subscription',
  // ❌ trial_period_days がない
  success_url: successUrl,
  cancel_url: cancelUrl,
  metadata: { userId: userId }
});
```

## 🎯 実装変更が必要な箇所（詳細特定）

### 1. **stripeService.ts の修正**

#### **A. createCheckoutSession メソッド（line 42-103）**
**変更内容**: `subscription_data` にトライアル設定を追加

```typescript
// 修正前（line 73-88）
const session = await this.stripe.checkout.sessions.create({
  customer: stripeCustomer.id,
  payment_method_types: ['card'],
  line_items: [{ price: priceId, quantity: 1 }],
  mode: 'subscription',
  success_url: successUrl,
  cancel_url: cancelUrl,
  metadata: { userId: userId }
});

// 修正後
const session = await this.stripe.checkout.sessions.create({
  customer: stripeCustomer.id,
  payment_method_types: ['card'],
  line_items: [{ price: priceId, quantity: 1 }],
  mode: 'subscription',
  subscription_data: {
    trial_period_days: 14,
    trial_settings: {
      end_behavior: {
        missing_payment_method: 'cancel'
      }
    }
  },
  payment_method_collection: 'if_required', // トライアル中は支払い方法任意
  success_url: successUrl,
  cancel_url: cancelUrl,
  metadata: { userId: userId }
});
```

#### **B. handleSubscriptionCreated メソッド（line 212-235）**
**現状**: `line 222` で既に `trialing` ステータス処理済み
**変更**: 不要（既に対応済み）

### 2. **billing.ts の修正**

#### **A. create-checkout-session エンドポイント（line 44-116）**
**変更内容**: リクエストパラメータに `enableTrial` オプション追加

```typescript
// 修正前（line 47）
const { priceId, successUrl, cancelUrl } = req.body;

// 修正後
const { priceId, successUrl, cancelUrl, enableTrial = true } = req.body;

// 修正前（line 88-94）
const result = await stripeService.createCheckoutSession({
  userId: userId,
  email: user.email,
  priceId: priceId,
  successUrl: successUrl,
  cancelUrl: cancelUrl
});

// 修正後
const result = await stripeService.createCheckoutSession({
  userId: userId,
  email: user.email,
  priceId: priceId,
  successUrl: successUrl,
  cancelUrl: cancelUrl,
  enableTrial: enableTrial
});
```

### 3. **stripeService.ts の CreateSubscriptionParams インターフェース修正**

```typescript
// 修正前（line 9-15）
interface CreateSubscriptionParams {
  userId: string;
  email: string;
  priceId: string;
  successUrl: string;
  cancelUrl: string;
}

// 修正後
interface CreateSubscriptionParams {
  userId: string;
  email: string;
  priceId: string;
  successUrl: string;
  cancelUrl: string;
  enableTrial?: boolean; // 新規追加
}
```

## 🔄 移行時の考慮点とリスク

### ⚠️ **リスク要因**

#### **1. 既存ユーザーへの影響**
- **現在トライアル中のユーザー**: カスタムトライアルで管理されている
- **影響範囲**: 新規ユーザーのみStripeトライアル、既存ユーザーは継続

#### **2. データ整合性**
- **SQLiteデータ**: `trialStartDate`, `trialEndDate` フィールドが継続使用される
- **Firebase同期**: 既存の同期ロジックは継続使用

#### **3. UI/UX への影響**
- **フロントエンド**: `usePlanStatus.ts` の表示ロジックは変更不要
- **理由**: Stripeのtrialingステータスはサーバーサイドでtrialステータスに変換される

### ✅ **軽減策**

#### **1. 段階的実装**
```typescript
// FeatureFlag 的アプローチ
const ENABLE_STRIPE_TRIAL = process.env.ENABLE_STRIPE_TRIAL === 'true';

if (ENABLE_STRIPE_TRIAL && enableTrial) {
  // Stripe トライアル
} else {
  // 従来のチェックアウト（トライアルなし）
}
```

#### **2. 後方互換性の維持**
- 既存のtrialServiceは残存
- webhookでStripeのtrialingステータスを受信時、既存DBフィールドも更新

## 📋 段階的実装計画

### **Phase 1: Stripe トライアル基盤実装**
1. **stripeService.ts修正** - チェックアウトセッションにトライアル追加
2. **billing.ts修正** - APIエンドポイントにenableTrialパラメータ追加  
3. **環境変数確認** - STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET設定済み

### **Phase 2: Webhook処理強化**
1. **handleSubscriptionCreated強化** - trialing → trial ステータス変換確認
2. **handleTrialWillEnd実装確認** - トライアル終了予告処理

### **Phase 3: テスト・検証**
1. **ローカルテスト** - Stripe CLI でwebhookテスト
2. **統合テスト** - 実際のStripeテストモードでの動作確認

### **Phase 4: 本番展開**
1. **環境変数設定** - 本番Stripe API キー設定
2. **段階的ロールアウト** - FeatureFlagでの段階的有効化

## 🛠️ 具体的な実装手順

### **Step 1: stripeService.ts 修正**

```typescript
// CreateSubscriptionParams インターフェース修正
interface CreateSubscriptionParams {
  userId: string;
  email: string;
  priceId: string;
  successUrl: string;
  cancelUrl: string;
  enableTrial?: boolean; // 追加
}

// createCheckoutSession メソッド修正
async createCheckoutSession(params: CreateSubscriptionParams): Promise<SubscriptionResult> {
  try {
    const { userId, email, priceId, successUrl, cancelUrl, enableTrial = true } = params;
    
    // ... 既存の顧客作成処理 ...
    
    // Checkout セッション作成
    const sessionConfig: any = {
      customer: stripeCustomer.id,
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      mode: 'subscription',
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: { userId: userId }
    };
    
    // トライアル設定追加
    if (enableTrial) {
      sessionConfig.subscription_data = {
        trial_period_days: 14,
        trial_settings: {
          end_behavior: {
            missing_payment_method: 'cancel'
          }
        }
      };
      sessionConfig.payment_method_collection = 'if_required';
    }
    
    const session = await this.stripe.checkout.sessions.create(sessionConfig);
    
    // ... 既存のレスポンス処理 ...
  }
}
```

### **Step 2: billing.ts 修正**

```typescript
// create-checkout-session エンドポイント修正
router.post('/create-checkout-session', async (req, res) => {
  try {
    const userId = req.headers['x-user-id'] as string;
    const { priceId, successUrl, cancelUrl, enableTrial = true } = req.body; // enableTrial追加
    
    // ... 既存のバリデーション処理 ...
    
    // Checkout セッション作成
    const result = await stripeService.createCheckoutSession({
      userId: userId,
      email: user.email,
      priceId: priceId,
      successUrl: successUrl,
      cancelUrl: cancelUrl,
      enableTrial: enableTrial // 追加
    });
    
    // ... 既存のレスポンス処理 ...
  }
});
```

### **Step 3: Webhook処理確認**

```typescript
// handleSubscriptionCreated メソッド（既存コード確認）
private async handleSubscriptionCreated(subscription: Stripe.Subscription): Promise<{ success: boolean; error?: string }> {
  try {
    // ... 既存の顧客情報取得処理 ...
    
    // サブスクリプション状態を更新（既に対応済み）
    const status = subscription.status === 'active' ? 'pro' : subscription.status === 'trialing' ? 'trial' : 'cancelled';
    await TrialService.updateSubscriptionStatus(userId, status, customer.id);
    
    // ... 既存のログ・レスポンス処理 ...
  }
}
```

## 🔍 影響を受けないコンポーネント

### **フロントエンド**
- **usePlanStatus.ts**: 変更不要（サーバーサイドでステータス変換済み）
- **AccountSettings.tsx**: 変更不要（表示ロジックは同じ）
- **PlanLimitService.ts**: 変更不要（制限チェックロジックは同じ）

### **バックエンド**
- **trialService.ts**: 継続使用（既存ユーザー用）
- **PlanLimitService.ts**: 変更不要（制限チェックロジックは同じ）

## ⚡ 実装後の動作フロー

### **新規ユーザーのStripeトライアル フロー**

1. **サインアップ** → ユーザー作成（subscriptionStatus: 'free'）
2. **アップグレード選択** → create-checkout-session API呼び出し（enableTrial: true）
3. **Stripeチェックアウト** → trial_period_days: 14 のセッション作成
4. **チェックアウト完了** → webhook: `customer.subscription.created` (status: 'trialing')
5. **ステータス更新** → handleSubscriptionCreated で 'trial' ステータスに更新
6. **トライアル期間** → 14日間の無料利用
7. **トライアル終了** → webhook: `customer.subscription.updated` (status: 'active' or 'canceled')

### **既存ユーザーの継続フロー**

1. **既存ユーザー** → カスタムトライアルまたは既存ステータス継続
2. **制限チェック** → 既存のPlanLimitService.ts で同様に制限適用
3. **表示** → usePlanStatus.ts で同様に表示

## 📝 実装完了の定義

### **必須要件**
- [ ] stripeService.ts のcreateCheckoutSessionメソッド修正完了
- [ ] billing.ts のAPIエンドポイント修正完了
- [ ] Webhook処理でのtrialingステータス→trialステータス変換確認
- [ ] 新規ユーザーでのStripeトライアル動作確認

### **推奨要件**
- [ ] 既存ユーザーへの影響がないことを確認
- [ ] フロントエンドでの表示に問題がないことを確認
- [ ] エラーハンドリングが適切に動作することを確認

## 🚀 実装順序

1. **即座実装**: stripeService.ts修正（チェックアウトセッションにトライアル追加）
2. **即座実装**: billing.ts修正（enableTrialパラメータ追加）
3. **テスト**: ローカル環境での動作確認
4. **検証**: webhook処理の動作確認
5. **展開**: 本番環境での段階的有効化

---

**最終更新**: 2025-07-26  
**ステータス**: 実装計画作成完了  
**次のアクション**: stripeService.ts の修正実装開始