# Stripe決済ステータス更新トラブルシューティング

**作成日**: 2025-07-27  
**問題**: 決済完了後もデータベースのステータスが更新されない

## 🔍 問題の診断手順

### 1. **Stripe CLIの起動確認**

```bash
# Stripe CLIが起動しているか確認
ps aux | grep "stripe listen" | grep -v grep

# 起動していない場合は、新しいターミナルで起動
stripe listen --forward-to localhost:3001/api/stripe/webhook
```

**重要**: Stripe CLIを起動しないと、ローカル環境でwebhookが受信できません。

### 2. **webhook受信テスト**

```bash
# テスト用webhookエンドポイントで受信確認
curl -X POST http://localhost:3001/api/billing/test-webhook \
  -H "Content-Type: application/json" \
  -d '{"test": "data"}'
```

期待される応答:
```json
{
  "received": true,
  "bodyType": "object",
  "isBuffer": true,
  "bodyLength": 15,
  "headers": [...]
}
```

### 3. **Stripe Webhook Secretの確認**

```bash
# サーバー環境変数の確認
grep STRIPE_WEBHOOK_SECRET server/.env

# Stripe CLIの出力確認
# "Your webhook signing secret is whsec_..." という行を探す
```

### 4. **決済フローの検証**

1. **Checkout Session作成確認**
   - サーバーログで `[StripeService] 🛒 Creating checkout session` を確認
   - `metadata: { userId: '...' }` が含まれているか確認

2. **決済ページでの支払い**
   - Stripeの決済ページで正常に支払いが完了するか
   - 成功URLにリダイレクトされるか

3. **Webhook受信確認**
   - サーバーログで `[Billing] 🔍 Webhook verification started` を確認
   - `[StripeService] 🔍 Processing checkout completion` を確認

## 🛠️ よくある原因と解決方法

### 原因1: Stripe CLIが起動していない

**症状**: Webhookログが一切表示されない

**解決方法**:
```bash
# 新しいターミナルで実行
stripe listen --forward-to localhost:3001/api/stripe/webhook
```

### 原因2: Webhook Secretの不一致

**症状**: `[Billing] Webhook signature verification failed`

**解決方法**:
1. Stripe CLIの出力から新しいsecretをコピー
2. `server/.env` の `STRIPE_WEBHOOK_SECRET` を更新
3. サーバーを再起動

### 原因3: Payment Linkの設定ミス

**症状**: 決済は成功するがwebhookが来ない

**解決方法**:
1. Stripeダッシュボードで Payment Link の設定確認
2. メタデータが正しく設定されているか確認
3. Checkout Session APIを使用することを推奨

### 原因4: Express.jsミドルウェアの問題

**症状**: `Body is Buffer: false` のログ

**解決方法**: 
- 既に修正済み（条件付きJSON解析実装済み）
- サーバー再起動が必要

## 📝 完全な動作確認手順

### ステップ1: 環境準備
```bash
# Terminal 1: サーバー起動
cd server
npm run dev

# Terminal 2: クライアント起動  
cd client
npm run dev

# Terminal 3: Stripe CLI起動（必須）
stripe listen --forward-to localhost:3001/api/stripe/webhook
```

### ステップ2: Stripe CLIの出力確認
```
> Ready! Your webhook signing secret is whsec_xxxxx (^C to quit)
```

このsecretが `server/.env` の `STRIPE_WEBHOOK_SECRET` と一致することを確認。

### ステップ3: テストwebhook送信
```bash
# Terminal 4: テストコマンド
curl -X POST http://localhost:3001/api/billing/test-webhook \
  -H "Content-Type: application/json" \
  -d '{"test": "data"}'
```

### ステップ4: 実際の決済テスト
1. アプリケーションにログイン
2. プラン選択画面で「Upgrade to Pro」クリック
3. テストカード情報入力:
   - カード番号: 4242 4242 4242 4242
   - 有効期限: 12/34
   - CVC: 123
4. 決済完了

### ステップ5: ログ確認
サーバーログで以下を確認:
```
[Server] Skipping JSON parsing for webhook route: /api/stripe/webhook
[Billing] 🔍 Webhook verification started
[Billing] Body is Buffer: true
[StripeService] 🔍 Processing checkout completion
[StripeService] 💾 Updating subscription status for user xxx to 'pro'
```

## 🚨 緊急対処法

もし上記の手順でも解決しない場合:

### 手動でwebhookイベントをトリガー
```bash
# Stripe CLIでcheckout完了イベントを手動送信
stripe trigger checkout.session.completed
```

### デバッグモードでの詳細ログ
```bash
# 環境変数を追加してデバッグモード有効化
DEBUG=stripe:* npm run dev
```

### データベース直接確認
```bash
# SQLiteで確認
cd server
npx prisma studio

# Usersテーブルで以下を確認:
# - stripeCustomerId が設定されているか
# - subscriptionStatus が 'pro' になっているか
```

## 📞 サポート情報

- [Stripe Webhookドキュメント](https://docs.stripe.com/webhooks)
- [Stripe CLIガイド](https://docs.stripe.com/stripe-cli)
- [ConsensusAI Billingドキュメント](./README.md)

---
**最終更新**: 2025-07-27