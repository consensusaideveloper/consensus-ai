# Stripe CLI ローカル開発ガイド

**対象**: ConsensusAI プロジェクトでのローカルwebhook開発  
**作成日**: 2025-07-26  
**参考**: [Stripe CLI公式ドキュメント](https://docs.stripe.com/stripe-cli/overview)

## 📋 **概要**

Stripe CLIはコマンドラインから直接、Stripeの組み込みを構築、テスト、管理できる開発者向けツールです。ローカル開発でwebhookをテストするために必要です。

## 🚀 **セットアップ手順**

### **1. Stripe CLIインストール**

#### **macOS (Homebrew)**
```bash
brew install stripe/stripe-cli/stripe
```

#### **macOS (curl)**
```bash
curl -LO https://github.com/stripe/stripe-cli/releases/latest/download/stripe_darwin_amd64.tar.gz
tar -xzf stripe_darwin_amd64.tar.gz
sudo mv stripe /usr/local/bin/
```

#### **Windows**
[GitHubリリースページ](https://github.com/stripe/stripe-cli/releases)からダウンロード

#### **Linux**
```bash
wget https://github.com/stripe/stripe-cli/releases/latest/download/stripe_linux_amd64.tar.gz
tar -xzf stripe_linux_amd64.tar.gz
sudo mv stripe /usr/local/bin/
```

### **2. Stripe アカウント認証**

```bash
stripe login
```

**実行結果例**:
```
Your pairing code is: abc-def-ghi
This pairing code verifies your authentication with Stripe.
Press Enter to open the browser (^C to quit)
```

ブラウザで認証を完了すると、制限されたAPIキーセットが生成されます。

### **3. ローカルWebhookリスナー起動**

#### **基本コマンド**
```bash
stripe listen --forward-to localhost:3001/api/stripe/webhook
```

#### **特定イベントのみ転送**
```bash
stripe listen \
  --events checkout.session.completed,customer.subscription.created,customer.subscription.updated,customer.subscription.deleted,invoice.payment_succeeded,invoice.payment_failed,customer.subscription.trial_will_end \
  --forward-to localhost:3001/api/stripe/webhook
```

**実行結果例**:
```
> Ready! Your webhook signing secret is whsec_1234567890abcdef (^C to quit)
```

### **4. Webhook Signing Secret設定**

#### **取得されたSecretを環境変数に設定**
上記コマンド実行時に表示される `whsec_...` を `.env` ファイルに設定：

```bash
# server/.env
STRIPE_WEBHOOK_SECRET=whsec_実際に表示されたシークレット
```

**例**:
```bash
STRIPE_WEBHOOK_SECRET=whsec_1234567890abcdefghijklmnopqrstuvwxyz
```

## 🧪 **テスト方法**

### **⚠️ 重要: Stripe CLI テストデータ作成について**
**`stripe trigger`コマンドは毎回新しいテストオブジェクト（商品、顧客等）を作成します。**
- **商品名**: "myproduct ($15.00 USD)" が自動作成される
- **これはStripe CLIの既知の仕様です** ([GitHub Issue #707](https://github.com/stripe/stripe-cli/issues/707))
- **テスト後はStripeダッシュボードから手動削除が必要です**

### **1. Webhookイベントのトリガー**

#### **チェックアウト完了をシミュレート**
```bash
# ⚠️ 注意: 新しいテスト商品が作成されます
stripe trigger checkout.session.completed
```

#### **サブスクリプション作成をシミュレート**
```bash
# ⚠️ 注意: 新しいテスト商品が作成されます
stripe trigger customer.subscription.created
```

#### **サブスクリプション更新をシミュレート**
```bash
# ⚠️ 注意: 既存のサブスクリプションが必要です
stripe trigger customer.subscription.updated
```

### **2. ログ確認**

#### **Stripe API リクエストログ**
```bash
stripe logs tail
```

#### **ローカルサーバーログ**
サーバーコンソールで以下のようなログを確認：
```
[StripeService] Received webhook: checkout.session.completed
[StripeService] ✅ Subscription activated for user 12345
```

## 🎯 **ConsensusAI プロジェクト固有設定**

### **必要なWebhookイベント**
現在の実装 (`server/src/services/stripeService.ts`) で処理されるイベント：

```bash
stripe listen \
  --events checkout.session.completed,customer.subscription.created,customer.subscription.updated,customer.subscription.deleted,invoice.payment_succeeded,invoice.payment_failed,customer.subscription.trial_will_end \
  --forward-to localhost:3001/api/stripe/webhook
```

### **環境変数確認**
```bash
# server/.env
STRIPE_SECRET_KEY=sk_test_... (設定済み)
STRIPE_WEBHOOK_SECRET=whsec_... (Stripe CLI起動時に取得)

# client/.env  
VITE_STRIPE_PRICE_ID=prod_... (設定済み)
```

### **エンドポイント URL**
```
Local: http://localhost:3001/api/stripe/webhook
Route: server/src/routes/billing.ts (line 122)
```

## 🔧 **高度な設定**

### **特定のAPIバージョン指定**
```bash
stripe listen --stripe-version 2025-06-30.basil --forward-to localhost:3001/api/stripe/webhook
```

### **HTTPS証明書検証スキップ** (開発時のみ)
```bash
stripe listen --skip-verify --forward-to localhost:3001/api/stripe/webhook
```

### **既存のWebhookエンドポイント使用**
```bash
stripe listen --load-from-webhooks-api --forward-to localhost:3001/api/stripe/webhook
```

## ⚠️ **重要な注意事項**

### **セキュリティ**
- **webhook signing secret**: 機密情報として扱う
- **本番環境**: 必ずHTTPSを使用
- **開発環境のみ**: HTTPでの動作を許可

### **制限事項**
- Stripe CLIは同時に本番webhookとローカルwebhookに送信
- 多数の送信失敗でStripeが自動的にwebhookを無効化する場合あり
- テスト環境では制限が緩和される

### **トラブルシューティング**
```bash
# CLIのバージョン確認
stripe version

# ヘルプ表示
stripe --help
stripe listen --help

# 認証状態確認
stripe config --list
```

## 🚀 **開発フロー例**

### **1. 開発環境起動（推奨手順）**

#### **Step 1: プロジェクト全体の起動**
```bash
# プロジェクトルートから全体を起動
cd /path/to/ConsensusAI
npm run dev
```

これにより以下が同時起動されます：
- サーバー (localhost:3001)
- フロントエンド (localhost:5173)  
- Prisma Studio (localhost:5555)

#### **Step 2: Stripe CLI webhook リスナー起動（別ターミナル）**
```bash
# 新しいターミナルを開く
cd /path/to/ConsensusAI

# Stripe CLIでwebhook転送開始
stripe listen --forward-to localhost:3001/api/stripe/webhook
```

**重要**: この出力を確認してください：
```
> Ready! Your webhook signing secret is whsec_xxxxxxxxxxxxx (^C to quit)
```

#### **Step 3: Webhook Secret確認・設定**
1. **表示されたsecretをコピー**: `whsec_xxxxxxxxxxxxx`
2. **環境変数ファイル確認**: `server/.env`
3. **STRIPE_WEBHOOK_SECRET値が一致するか確認**

**一致しない場合の対処:**
```bash
# server/.envを編集
vim server/.env

# または
nano server/.env

# STRIPE_WEBHOOK_SECRET=の値を新しいsecretに更新
STRIPE_WEBHOOK_SECRET=whsec_新しいsecret
```

#### **Step 4: サーバー再起動（secret更新時のみ）**
webhook secretを更新した場合は、サーバーを再起動：
```bash
# サーバーを停止 (Ctrl+C で npm run dev を停止)
# そして再起動
npm run dev
```

### **2. 個別起動手順（トラブルシューティング時）**

#### **Terminal 1: サーバー起動**
```bash
cd server
npm run dev

# 起動完了の確認
# ログで "✅ Server is running on port 3001" を確認
```

#### **Terminal 2: フロントエンド起動**  
```bash
cd client
npm run dev

# 起動完了の確認  
# ログで "Local: http://localhost:5173/" を確認
```

#### **Terminal 3: Stripe CLI起動**
```bash
# プロジェクトルートまたは任意の場所から
stripe listen --forward-to localhost:3001/api/stripe/webhook

# 成功確認
# "Ready! Your webhook signing secret is..." が表示されることを確認
```

#### **Terminal 4: Prisma Studio起動（オプション）**
```bash
cd server
npx prisma studio

# ブラウザで http://localhost:5555 が開く
```

## 🧪 **テスト実行手順**

### **1. 動作確認チェックリスト**

#### **✅ 事前確認**
```bash
# 1. サーバー起動確認
curl http://localhost:3001/health
# 期待値: {"status":"ok","database":"connected",...}

# 2. Stripe CLI接続確認  
# Terminal 3で以下が表示されているか確認
# > Ready! Your webhook signing secret is whsec_xxxxx (^C to quit)

# 3. webhook環境変数確認
grep STRIPE_WEBHOOK_SECRET server/.env
# 期待値: Stripe CLIと同じsecret
```

#### **✅ テスト用webhook確認（開発時）**
```bash
# raw body parsingが正常か確認
curl -X POST http://localhost:3001/api/billing/test-webhook \
  -H "Content-Type: application/json" \
  -d '{"test": "data"}'

# 期待値: {"received":true,"bodyType":"object","isBuffer":true,...}
```

### **2. Stripe Trigger テスト**

#### **手動webhook テスト**
```bash
# checkout完了イベントをシミュレート
stripe trigger checkout.session.completed
```

**期待される出力:**

**Stripe CLI側:**
```
2025-07-27 XX:XX:XX   --> checkout.session.completed [evt_xxxxx]
2025-07-27 XX:XX:XX  <--  [200] POST http://localhost:3001/api/stripe/webhook [evt_xxxxx]
```

**サーバー側:**
```
[Billing] 📨 Received webhook: checkout.session.completed
[Billing] ✅ Webhook signature verified successfully  
[StripeService] 🔍 Processing checkout completion
[StripeService] 💾 Updating subscription status for user xxx to 'pro'
[Billing] ✅ Webhook processed successfully
```

### **3. 実際の決済フローテスト**

#### **Step 1: アプリケーションアクセス**
1. ブラウザで `http://localhost:5173` にアクセス
2. ログイン（Google OAuth）

#### **Step 2: プラン選択**
1. ダッシュボードまたはプラン選択画面へ
2. **Upgrade to Pro** ボタンをクリック

#### **Step 3: 決済情報入力**
Stripeテストカード情報を入力：
```
カード番号: 4242 4242 4242 4242
有効期限: 12/34 (任意の未来の日付)
CVC: 123 (任意の3桁)
名前: Test User (任意)
郵便番号: 12345 (任意)
```

#### **Step 4: 決済完了確認**
1. **Stripe決済ページで「支払う」クリック**
2. **アプリケーションにリダイレクト**
3. **ステータス更新確認**

### **4. トラブルシューティング**

#### **よくある問題と解決法**

**❌ Stripe CLI: Connection refused**
```bash
# 解決策: サーバーが起動していることを確認
curl http://localhost:3001/health
```

**❌ Webhook: 500 Error**
```bash
# 解決策: サーバーログでエラー詳細を確認
# [Billing] ❌ で始まるエラーログをチェック
```

**❌ ステータスが更新されない**
```bash
# 解決策: データベース確認
cd server && npx prisma studio
# UsersテーブルでsubscriptionStatus確認
```

**❌ Webhook secret不一致**
```bash
# 解決策: secret再設定
# 1. Stripe CLIの出力からsecretをコピー
# 2. server/.envを更新  
# 3. サーバー再起動
```

### **3. 手動webhook テスト**
```bash
stripe trigger checkout.session.completed
```

### **4. テストデータ管理**

#### **作成されたテストデータの削除**
1. **Stripeダッシュボード** → **商品** → **テストデータ** に移動
2. **"myproduct"** で検索してテスト商品を特定
3. 不要なテスト商品を**手動削除**

#### **テストデータ削除の注意点**
- **本番環境のデータは削除しない** (テストモードのみ)
- **アクティブなサブスクリプションがある商品は削除不可**
- **削除前にサブスクリプションをキャンセル**

#### **テストベストプラクティス**
```bash
# 1. テスト前に現在の商品数を確認
echo "テスト前: Stripeダッシュボードの商品数を記録"

# 2. 最小限のテストを実行
stripe trigger checkout.session.completed

# 3. テスト後にクリーンアップ
echo "テスト後: 新しく作成された商品を削除"
```

## 📚 **参考リンク**

- [Stripe CLI公式ドキュメント](https://docs.stripe.com/stripe-cli/overview)
- [Webhookガイド](https://docs.stripe.com/webhooks)
- [CLIリファレンス](https://docs.stripe.com/cli/listen)
- [Stripe CLI GitHub](https://github.com/stripe/stripe-cli)
- [GitHub Issue #707: CLI テストデータクリーンアップ](https://github.com/stripe/stripe-cli/issues/707)
- [GitHub Issue #1092: CLI テストデータ再利用・削除](https://github.com/stripe/stripe-cli/issues/1092)

---

**最終更新**: 2025-07-26  
**ステータス**: ローカル開発環境用設定完了  
**次のステップ**: Stripe CLI起動 → Webhook Secret取得 → 環境変数設定