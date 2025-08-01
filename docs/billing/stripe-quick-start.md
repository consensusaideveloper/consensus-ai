# Stripe決済 クイックスタートガイド

**作成日**: 2025-07-27  
**目的**: Stripe決済を最速で立ち上げるための簡潔なガイド

## ⚡ 5分でStripe決済を動かす

### 📋 **前提条件**
- ConsensusAIプロジェクトをクローン済み
- Node.js, npm インストール済み
- Stripe CLIインストール済み

### 🚀 **Step 1: プロジェクト起動（3コマンド）**

```bash
# 1. プロジェクトルートに移動
cd /path/to/ConsensusAI

# 2. 全体起動（サーバー + フロントエンド + DB）
npm run dev

# 3. 新しいターミナルでStripe CLI起動
stripe listen --forward-to localhost:3001/api/stripe/webhook
```

### 🔑 **Step 2: Webhook Secret設定（コピペ1回）**

Stripe CLIの出力をコピー：
```
> Ready! Your webhook signing secret is whsec_xxxxxxxxxxxxx (^C to quit)
```

`server/.env`ファイルを確認し、STRIPE_WEBHOOK_SECRETが一致していることを確認：
```bash
# 確認コマンド
grep STRIPE_WEBHOOK_SECRET server/.env
```

### ✅ **Step 3: 動作確認（1分）**

```bash
# テスト実行
stripe trigger checkout.session.completed
```

**成功の確認:**
- Stripe CLI: `<-- [200] POST localhost:3001/api/stripe/webhook`
- サーバーログ: `[Billing] ✅ Webhook processed successfully`

## 🎯 **実際の決済テスト**

### **1. アプリにアクセス**
ブラウザで http://localhost:5173

### **2. プラン選択**
「Upgrade to Pro」ボタンをクリック

### **3. テスト決済**
```
カード: 4242 4242 4242 4242
期限: 12/34
CVC: 123
名前: Test User
```

### **4. 結果確認**
決済完了後、ユーザーのプランが「Pro」に更新されることを確認

## 🔧 **トラブル時の即効対処法**

### **Webhook 500エラー**
```bash
# サーバー再起動
# Ctrl+C でサーバー停止 → npm run dev で再起動
```

### **ステータス更新されない**  
```bash
# データベース確認
cd server && npx prisma studio
# Usersテーブルのsubs criptionStatusを確認
```

### **Stripe CLI接続エラー**
```bash
# 認証確認
stripe auth

# 再ログイン
stripe login
```

## 📚 **詳細情報**

- 詳細な設定: [stripe-local-development.md](./stripe-local-development.md)
- トラブルシューティング: [stripe-troubleshooting.md](./stripe-troubleshooting.md)
- 手動テスト: [stripe-manual-testing-guide.md](./stripe-manual-testing-guide.md)

---

**🎉 これで決済機能が使用可能です！**

最短5分でStripe決済が動作し、テスト用カードで実際の決済フローを確認できます。