# 🚀 ConsensusAI起動コマンド

**現在の場所**: `/Users/y-masamura/develop/ConsensusAI`

## ⚡ 即座に実行すべきコマンド

### **Terminal 1: 全体起動**
```bash
cd /Users/y-masamura/develop/ConsensusAI
npm run dev
```

### **Terminal 2: Stripe CLI起動**
```bash
cd /Users/y-masamura/develop/ConsensusAI
stripe listen --forward-to localhost:3001/api/stripe/webhook
```

## 📊 期待される結果

### **Terminal 1 の出力:**
```
✅ Server is running on port 3001
Local: http://localhost:5173/
Prisma Studio is up on http://localhost:5555
```

### **Terminal 2 の出力:**
```
> Ready! Your webhook signing secret is whsec_xxxxx (^C to quit)
```

## 🔍 現在の状況
- ❌ サーバー未起動（ポート3001接続エラー）
- ✅ フロントエンド起動済み（ポート5173）
- ❌ Stripe CLI未起動

## 📋 次のステップ
1. **サーバー起動**: 上記のTerminal 1コマンド実行
2. **Stripe CLI起動**: 上記のTerminal 2コマンド実行  
3. **動作確認**: `stripe trigger checkout.session.completed`

---
**実行順序を守って、まずはサーバーを起動してください！**