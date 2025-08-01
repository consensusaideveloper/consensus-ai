# Stripe統合セットアップガイド

## 📋 概要
本ガイドでは、ConsensusAIにStripe決済機能を統合するための設定手順を説明します。

## 🚀 Phase 2実装完了済み機能
- ✅ Stripe SDK統合（サーバー・クライアント両方）
- ✅ Checkout セッション作成機能
- ✅ Webhook処理基盤
- ✅ フロントエンド決済ボタン統合
- ✅ フォールバック機能（従来のStripe決済URL）

## 🔧 必要な環境変数設定

### サーバーサイド (.env)
```bash
# Stripe設定（必須）
STRIPE_SECRET_KEY="sk_test_..."          # StripeのSecret Key（テスト環境）
# STRIPE_SECRET_KEY="sk_live_..."        # StripeのSecret Key（本番環境）
STRIPE_WEBHOOK_SECRET="whsec_..."        # Webhook用署名検証Secret

# その他の設定（既存）
DATABASE_URL="file:./prisma/dev.db"
PORT=3001
NODE_ENV=development
```

### クライアントサイド (client/.env)
```bash
# Stripe設定（必須）
VITE_STRIPE_PRICE_ID="price_..."              # 商品価格ID（サブスクリプション用）

# フォールバック設定
VITE_STRIPE_PAYMENT_URL="https://buy.stripe.com/test_..."  # 既存の決済URL

# プラン価格表示設定
VITE_PRO_PRICE="20"                          # 表示用価格
VITE_PRO_PRICE_CENTS="2000"                  # 計算用価格（セント）
```

### ⚠️ 重要な注意事項
- **VITE_STRIPE_PUBLISHABLE_KEY**: 現在の実装では不要（Stripe Checkout使用のため）
- **VITE_STRIPE_PRICE_ID**: 最重要設定（Stripeダッシュボードで作成した価格IDを設定）
- **テスト環境**: `sk_test_`と`pk_test_`を使用
- **本番環境**: `sk_live_`と`pk_live_`に変更

## 📦 Stripe Dashboard設定

### 1. 商品・価格の作成
1. Stripeダッシュボードにログイン
2. **商品** → **商品を追加**
3. 商品名: "ConsensusAI Pro Plan"
4. 価格: $20/月（または希望価格）
5. **価格ID**をコピーして`VITE_STRIPE_PRICE_ID`に設定

### 2. Webhookエンドポイントの設定
1. **開発者** → **Webhook**
2. **エンドポイントを追加**
3. URL: `https://yourdomain.com/api/stripe/webhook`
4. イベント選択:
   - `checkout.session.completed`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
5. **署名シークレット**をコピーして`STRIPE_WEBHOOK_SECRET`に設定

## 🔄 API エンドポイント

### 実装済みエンドポイント
```bash
# Checkout セッション作成
POST /api/billing/create-checkout-session
Headers: x-user-id: [userId]
Body: {
  "priceId": "price_...",
  "successUrl": "https://yourapp.com/success",
  "cancelUrl": "https://yourapp.com/cancel"
}

# Webhook処理
POST /api/stripe/webhook
Content-Type: application/json
Stripe-Signature: [自動設定]

# サブスクリプション状態取得
GET /api/billing/subscription-status/:userId
Headers: x-user-id: [userId]

# ヘルスチェック
GET /api/billing/health
```

## 🧪 テスト手順

### 1. 設定確認テスト
```bash
curl http://localhost:3001/api/billing/health
```

期待されるレスポンス:
```json
{
  "success": true,
  "message": "Stripe service is healthy",
  "config": {
    "hasSecretKey": true,
    "hasWebhookSecret": true
  }
}
```

### 2. Checkout セッション作成テスト
```bash
curl -X POST http://localhost:3001/api/billing/create-checkout-session \
  -H "Content-Type: application/json" \
  -H "x-user-id: [実際のユーザーID]" \
  -d '{
    "priceId": "price_...",
    "successUrl": "http://localhost:5173/dashboard?upgrade=success",
    "cancelUrl": "http://localhost:5173/account?upgrade=cancelled"
  }'
```

### 3. Stripeテストカード情報

#### 💳 基本テストカード（成功パターン）

| カードブランド | カード番号 | 説明 |
|---|---|---|
| **Visa** | `4242 4242 4242 4242` | 最も基本的なテストカード |
| **Visa (debit)** | `4000 0566 5566 5556` | デビットカード |
| **Mastercard** | `5555 5555 5555 4444` | Mastercard テスト |
| **Mastercard (debit)** | `5200 8282 8282 8210` | Mastercard デビット |
| **American Express** | `3782 822463 10005` | AMEX テスト |
| **Discover** | `6011 1111 1111 1117` | Discover テスト |
| **JCB** | `3566 0020 2036 0505` | JCB テスト |

**共通設定:**
- **有効期限**: 任意の未来の日付（例：`12/34`）
- **CVC**: 任意の3桁（AMEX: 4桁）（例：`123`）
- **郵便番号**: 任意（例：`12345`）

#### ❌ エラーシナリオテストカード

| エラータイプ | カード番号 | 説明 |
|---|---|---|
| **一般的な拒否** | `4000 0000 0000 0002` | カードが拒否される |
| **残高不足** | `4000 0000 0000 9995` | 残高不足 |
| **期限切れカード** | `4000 0000 0000 0069` | 期限切れエラー |
| **CVCエラー** | `4000 0000 0000 0127` | CVC検証失敗 |
| **処理エラー** | `4000 0000 0000 0119` | 処理エラー |
| **不正疑い** | `4100 0000 0000 0019` | 不正な取引として拒否 |

#### 🔐 3D Secure (SCA) テストカード

| シナリオ | カード番号 | 説明 |
|---|---|---|
| **3DS 認証必須** | `4000 0025 0000 3155` | 認証を求められる |
| **3DS 認証失敗** | `4000 0000 0000 9987` | 認証に失敗 |
| **3DS 認証無効** | `4000 0000 0000 3220` | 認証がサポートされていない |

#### 🌍 国際カードテスト

| 国/地域 | カード番号 | 説明 |
|---|---|---|
| **カナダ** | `4000 0012 4000 0000` | カナダ発行カード |
| **英国** | `4000 0082 6000 0000` | 英国発行カード |
| **フランス** | `4000 0025 0000 0003` | フランス発行カード |
| **ドイツ** | `4000 0027 6000 0016` | ドイツ発行カード |
| **日本** | `4000 0039 2000 0003` | 日本発行カード |

### 4. フロントエンド決済テスト手順

#### ステップ1: アプリケーション起動
```bash
# クライアント起動（ターミナル1）
cd client
npm run dev

# サーバー起動（ターミナル2）
cd server
npm run dev
```

#### ステップ2: 基本決済テスト
1. ブラウザで `http://localhost:5173` にアクセス
2. ログイン後、アカウント設定へ移動
3. プランタブで「アップグレード」ボタンをクリック
4. Stripe Checkoutページが開くことを確認
5. 以下のテストカード情報を入力:
   ```
   カード番号: 4242 4242 4242 4242
   有効期限: 12/34
   CVC: 123
   名前: Test User
   郵便番号: 12345
   ```
6. 「Pay」ボタンをクリック
7. 決済完了後、ユーザーのプラン状態がProに更新されることを確認

#### ステップ3: エラーパターンテスト
失敗パターンのテストを実行:
```
# カード拒否テスト
カード番号: 4000 0000 0000 0002

# 残高不足テスト
カード番号: 4000 0000 0000 9995

# 期限切れテスト
カード番号: 4000 0000 0000 0069
```

#### ステップ4: 3D Secureテスト
```
カード番号: 4000 0025 0000 3155
```
1. 上記カード番号を使用
2. 3D Secure認証画面が表示される
3. 「Complete authentication」をクリック
4. 認証完了後、決済が処理される

### 5. 自動テストスクリプト

#### APIテスト用curlコマンド集
```bash
#!/bin/bash
# Stripe Integration Test Script

USER_ID="your-test-user-id"
PRICE_ID="your-price-id"
BASE_URL="http://localhost:3001"

echo "=== Stripe Integration Test ==="

# 1. ヘルスチェック
echo "1. Health Check..."
curl -s "$BASE_URL/api/billing/health" | jq .

# 2. Checkout セッション作成
echo -e "\n2. Creating Checkout Session..."
CHECKOUT_RESPONSE=$(curl -s -X POST "$BASE_URL/api/billing/create-checkout-session" \
  -H "Content-Type: application/json" \
  -H "x-user-id: $USER_ID" \
  -d "{
    \"priceId\": \"$PRICE_ID\",
    \"successUrl\": \"http://localhost:5173/dashboard?upgrade=success\",
    \"cancelUrl\": \"http://localhost:5173/account?upgrade=cancelled\"
  }")

echo $CHECKOUT_RESPONSE | jq .

# 3. セッションURL取得
SESSION_URL=$(echo $CHECKOUT_RESPONSE | jq -r '.sessionUrl // .url')
echo -e "\n3. Checkout URL: $SESSION_URL"

# 4. サブスクリプション状態確認
echo -e "\n4. Checking Subscription Status..."
curl -s "$BASE_URL/api/billing/subscription-status/$USER_ID" \
  -H "x-user-id: $USER_ID" | jq .

echo -e "\n=== Test Completed ==="
```

### 6. Webhook テスト

#### ngrokを使用したローカルWebhookテスト
```bash
# 1. ngrokインストール（未インストールの場合）
# https://ngrok.com/download

# 2. ローカルサーバーを公開
ngrok http 3001

# 3. ngrok URLをStripe Dashboardに登録
# 例: https://abc123.ngrok.io/api/stripe/webhook

# 4. テスト決済を実行してWebhookが正常に処理されることを確認
```

### 7. テスト結果の確認方法

#### Stripe Dashboard確認ポイント
1. **支払い**セクション: 決済履歴の確認
2. **顧客**セクション: テストユーザーの作成確認
3. **サブスクリプション**セクション: 継続課金設定の確認
4. **Webhook**セクション: イベント配信ログの確認

#### アプリケーション内確認ポイント
1. ユーザーのプランステータス更新
2. データベース（SQLite + Firebase）への正確な反映
3. UI上でのプラン変更の表示
4. 制限解除の動作確認

## 🔒 セキュリティ考慮事項

### 1. Webhook署名検証
- 全てのWebhookリクエストで署名を検証
- 無効な署名は自動的に拒否

### 2. ユーザー認証
- チェックアウト作成時にユーザーIDを必須化
- 他のユーザーの情報にアクセス不可

### 3. エラーハンドリング
- Stripe API失敗時は従来のURLにフォールバック
- 詳細なエラーログを記録

## 📊 データフロー

### 1. 購入フロー
```
Frontend → POST /api/billing/create-checkout-session → Stripe Checkout → Webhook → Database更新
```

### 2. サブスクリプション状態管理
```
Stripe Webhook → TrialService.updateSubscriptionStatus() → SQLite + Firebase同期
```

## 🚧 次のフェーズ（Phase 3）
- [ ] 請求履歴の実装
- [ ] サブスクリプション管理機能
- [ ] 返金・キャンセル処理
- [ ] プロレーション計算

## 🆘 トラブルシューティング

### Webhook が動作しない場合
1. Stripeダッシュボードでイベント履歴を確認
2. サーバーログでエラーメッセージを確認
3. ngrokなどを使用してローカル開発環境を公開

### 決済が失敗する場合
1. Stripe価格IDが正しく設定されているか確認
2. テストカード番号を使用しているか確認（4242424242424242）
3. ブラウザの開発者ツールでネットワークエラーを確認

---

**実装完了日: 2025-07-25**  
**対応フェーズ: Phase 2 - Stripe SDK統合**