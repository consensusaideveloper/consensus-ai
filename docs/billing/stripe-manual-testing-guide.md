# Stripe手動テストガイド（stripe triggerを使わない方法）

**作成日**: 2025-07-27  
**目的**: Stripeダッシュボードで作成した実際の商品を使用したテスト方法

## 🎯 概要

`stripe trigger`コマンドは自動的にテストデータを作成しますが、本ガイドではStripeダッシュボードで事前に作成した商品を使用してテストする方法を説明します。

## ✅ メリット

- **テストデータの管理が容易**: 一度作成した商品を繰り返し使用
- **余分なテストデータの作成を防げる**: myproductなどの自動生成を回避
- **本番環境に近い設定でテスト**: 実際の商品設定を使用

## 📋 事前準備

### 1. Stripeダッシュボードで商品作成

1. [Stripeダッシュボード](https://dashboard.stripe.com/test/products) にログイン
2. **商品** → **新規作成** をクリック
3. 商品情報を入力：
   - 商品名: ConsensusAI Pro Plan
   - 価格: $15.00/月（または任意の金額）
   - 課金タイプ: 定期購入（サブスクリプション）
4. 商品IDと価格IDを控える

### 2. Payment Linkの作成（オプション）

1. **Payment Links** → **新規リンク** をクリック
2. 作成した商品を選択
3. リンクURLを控える

## 🔧 現在の設定値

ConsensusAIプロジェクトの現在の設定：

```bash
# 商品情報
商品ID: prod_Sj19WUcq9FHRDl
価格ID: price_1RnZ6qEOZJMIcvctX9z0VHZJ
支払いリンク: https://buy.stripe.com/test_fZucN56Jj6Kx8eocflaIM02

# 環境変数設定済み
client/.env および client/.env.local:
- VITE_STRIPE_PRICE_ID=price_1RnZ6qEOZJMIcvctX9z0VHZJ
- VITE_STRIPE_PAYMENT_URL=https://buy.stripe.com/test_fZucN56Jj6Kx8eocflaIM02
```

## 🧪 テスト手順

### 方法1: Payment Linkを使用したテスト

1. **開発サーバー起動**
   ```bash
   # Terminal 1: バックエンド
   cd server && npm run dev

   # Terminal 2: フロントエンド
   cd client && npm run dev

   # Terminal 3: Stripe webhook（必須）
   stripe listen --forward-to localhost:3001/api/stripe/webhook
   ```

2. **アプリケーションでテスト**
   - ブラウザで `http://localhost:5173` にアクセス
   - ログイン後、プラン選択画面へ
   - **Upgrade to Pro** ボタンをクリック
   - Stripeの決済ページへリダイレクトされる

3. **テスト決済情報を入力**
   ```
   カード番号: 4242 4242 4242 4242
   有効期限: 任意の未来の日付（例: 12/34）
   CVC: 任意の3桁（例: 123）
   名前: Test User
   ```

4. **決済完了後の確認**
   - アプリケーションにリダイレクト
   - ユーザーのプランステータスが「Pro」に更新されることを確認
   - データベース（SQLite + Firebase）の同期を確認

### 方法2: Checkout Session APIを使用したテスト

```bash
# Checkout Sessionの作成
curl -X POST http://localhost:3001/api/billing/create-checkout-session \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer [USER_TOKEN]" \
  -d '{
    "priceId": "price_1RnZ6qEOZJMIcvctX9z0VHZJ",
    "successUrl": "http://localhost:5173/dashboard?upgrade=success",
    "cancelUrl": "http://localhost:5173/dashboard?upgrade=cancelled",
    "enableTrial": false
  }'
```

### 方法3: Stripeダッシュボードでの手動サブスクリプション作成

1. **Stripeダッシュボード** → **顧客** → 対象顧客を選択
2. **サブスクリプション** → **新規作成**
3. 商品を選択: prod_Sj19WUcq9FHRDl
4. **作成** をクリック

この方法では、webhookイベントが自動的に送信され、アプリケーションのステータスが更新されます。

## 🔍 デバッグとトラブルシューティング

### Webhook受信確認

```bash
# サーバーログで確認
[StripeService] Received webhook: checkout.session.completed
[StripeService] ✅ Subscription activated for user [USER_ID]
```

### データベース確認

```bash
# SQLite確認
cd server
npx prisma studio
# Users テーブルで subscriptionStatus を確認

# Firebase確認
# Firebase Console > Realtime Database で users/[USER_ID] を確認
```

### よくある問題

1. **ステータスが更新されない**
   - Webhook secretが正しく設定されているか確認
   - Stripe CLIが起動しているか確認
   - サーバーログでエラーを確認

2. **価格IDエラー**
   - 環境変数の価格IDが正しいか確認
   - 価格IDがサブスクリプション用（recurring）か確認

3. **リダイレクトエラー**
   - successUrl/cancelUrlが正しく設定されているか確認

## 📝 テストチェックリスト

- [ ] Stripe CLI起動確認
- [ ] 環境変数設定確認（価格ID、Payment URL）
- [ ] Webhook secret設定確認
- [ ] テスト決済実行
- [ ] ステータス更新確認（SQLite + Firebase）
- [ ] エラーケーステスト（カード拒否など）

## 🔗 関連ドキュメント

- [Stripe Local Development Guide](./stripe-local-development.md)
- [Stripe Testing Guide](./stripe-testing-guide.md)
- [Current Implementation](./current-implementation.md)

---

**最終更新**: 2025-07-27  
**ステータス**: 手動テスト環境構築完了