# Vercel + Railway デプロイ構成 詳細設計書

**作成日**: 2025年8月1日  
**最終更新**: 2025年8月1日  
**対象**: ConsensusAI本番デプロイ推奨構成  
**構成**: Vercel (フロントエンド) + Railway (バックエンド)

## 🏗️ アーキテクチャ概要

```
┌─────────────────┐    HTTPS     ┌─────────────────┐
│   エンドユーザー   │ ──────────→ │      Vercel     │
└─────────────────┘              │  (フロントエンド)   │
                                 │   React SPA     │
                                 └─────────┬───────┘
                                           │ API Call
                                           │ HTTPS
                                           ▼
                                 ┌─────────────────┐
                                 │     Railway     │
                                 │  (バックエンド)    │
                                 │  Express API    │
                                 │  PostgreSQL     │
                                 │   Socket.IO     │
                                 └─────────┬───────┘
                                           │
                    ┌──────────────────────┼──────────────────────┐
                    │                      │                      │
                    ▼                      ▼                      ▼
          ┌─────────────────┐   ┌─────────────────┐   ┌─────────────────┐
          │ Firebase Auth   │   │   Stripe API    │   │  Claude API     │
          │ (認証・ユーザー管理) │   │     (決済)      │   │   (AI分析)      │
          └─────────────────┘   └─────────────────┘   └─────────────────┘
```

## 📦 Vercel (フロントエンド) 詳細設計

### **基本構成**
- **サービス**: Vercel Static Site Hosting
- **プラン**: Hobby (無料プラン)
- **ドメイン**: `https://consensus-ai.vercel.app` (カスタムドメイン設定可能)
- **デプロイ方法**: GitHub連携による自動デプロイ

### **技術仕様**
```yaml
# vercel.json
{
  "version": 2,
  "builds": [
    {
      "src": "client/package.json",
      "use": "@vercel/static-build",
      "config": { "distDir": "dist" }
    }
  ],
  "routes": [
    {
      "src": "/(.*)",
      "dest": "client/dist/$1"
    }
  ]
}
```

### **ビルド設定**
- **Build Command**: `cd client && npm run build`
- **Output Directory**: `client/dist`
- **Node.js Version**: 18.x
- **Framework Preset**: Vite

### **環境変数設定**
```bash
# Vercel Environment Variables
VITE_FIREBASE_API_KEY=AIzaSyD...
VITE_FIREBASE_AUTH_DOMAIN=consensusai-325a7.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=consensusai-325a7
VITE_FIREBASE_STORAGE_BUCKET=consensusai-325a7.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123456789:web:abc123

# API Endpoint
VITE_API_BASE_URL=https://consensus-ai-backend.railway.app

# Stripe
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_...
```

### **パフォーマンス最適化**
- **CDN**: 世界200+拠点での配信
- **Build Cache**: ビルドキャッシュによる高速デプロイ
- **Image Optimization**: 自動画像最適化
- **Bundle Analysis**: バンドルサイズ分析・最適化

## 🚂 Railway (バックエンド) 詳細設計

### **基本構成**
- **サービス**: Railway App Platform
- **プラン**: Starter ($5/month - 最初の1ヶ月無料)
- **ドメイン**: `https://consensus-ai-backend.railway.app`
- **デプロイ方法**: GitHub連携による自動デプロイ

### **技術仕様**
```yaml
# railway.json
{
  "version": 2,
  "build": {
    "builder": "nodejs",
    "buildCommand": "cd server && npm run build"
  },
  "deploy": {
    "startCommand": "cd server && npm start",
    "healthcheckPath": "/health"
  }
}
```

### **リソース仕様**
- **CPU**: 1 vCPU (共有)
- **Memory**: 512MB RAM
- **Storage**: 1GB SSD
- **Network**: 無制限帯域幅
- **Database**: PostgreSQL 内蔵

### **データベース設計**

#### **SQLite → PostgreSQL 移行**
```typescript
// prisma/schema.prisma の変更点
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"  // "sqlite" から変更
  url      = env("DATABASE_URL")
}

// 主な変更点:
// - @db.Text → TEXT型自動適用
// - DateTime → TIMESTAMP型自動適用
// - Boolean → BOOLEAN型自動適用
```

#### **環境変数設定**
```bash
# Railway Environment Variables

# Database (Railway自動設定)
DATABASE_URL=postgresql://postgres:password@railway.app:5432/railway

# Firebase Admin
FIREBASE_ADMIN_SDK_PATH=./consensusai-325a7-firebase-adminsdk.json
FIREBASE_PROJECT_ID=consensusai-325a7

# Claude API
CLAUDE_API_KEY=sk-ant-api03-...

# Stripe
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Gmail SMTP
GMAIL_USER=your-email@gmail.com 
GMAIL_APP_PASSWORD=xxxx-xxxx-xxxx-xxxx

# Application Settings
NODE_ENV=production
PORT=3001
CORS_ORIGIN=https://consensus-ai.vercel.app
```

### **Socket.IO設定**
```typescript
// Socket.IO CORS設定
const io = new Server(httpServer, {
  cors: {
    origin: "https://consensus-ai.vercel.app",
    methods: ["GET", "POST"],
    credentials: true
  }
});
```

## 🔄 データ同期・整合性設計

### **Firebase + PostgreSQL ハイブリッド戦略**

#### **データ分離方針**
```typescript
// PostgreSQL (メインデータ)
- users (基本ユーザー情報)
- projects (プロジェクト情報)
- opinions (意見データ)
- actions (アクション管理)

// Firebase Realtime Database (リアルタイムデータ)
- analysisProgress (AI分析進捗)
- analysisResults (AI分析結果)
- realtimeStats (リアルタイム統計)
```

#### **同期メカニズム**
```typescript
// 両DB同期のトランザクション処理
async function syncDatabases(operation: 'create' | 'update' | 'delete', data: any) {
  const transaction = await prisma.$transaction(async (tx) => {
    // 1. PostgreSQL操作実行
    const result = await tx[model][operation](data);
    
    // 2. Firebase同期実行
    await firebase.database().ref(path).set(transformedData);
    
    return result;
  });
  
  // 3. 同期失敗時のロールバック処理
  try {
    return transaction;
  } catch (error) {
    await rollbackFirebase(data);
    throw error;
  }
}
```

## 🔒 セキュリティ設計

### **API セキュリティ**
```typescript
// セキュリティミドルウェア
app.use(helmet()); // セキュリティヘッダー
app.use(cors({
  origin: process.env.CORS_ORIGIN,
  credentials: true
}));
app.use(rateLimit({
  windowMs: 15 * 60 * 1000, // 15分
  max: 100 // リクエスト制限
}));
```

### **環境変数保護**
- **Vercel**: Environment Variables (暗号化保存)
- **Railway**: Environment Variables (暗号化保存)  
- **Firebase Admin SDK**: Railway Volume Mount (ファイル保存)

### **通信暗号化**
- **HTTPS強制**: すべての通信をHTTPS化
- **CORS設定**: 特定ドメインからのみアクセス許可
- **API認証**: Firebase Auth トークン検証

## 📊 監視・ログ設計

### **Vercel監視**
- **Analytics**: ページビュー、パフォーマンス監視
- **Functions**: API応答時間監視
- **Speed Insights**: Core Web Vitals追跡

### **Railway監視**
- **Metrics**: CPU、メモリ、ネットワーク使用量
- **Logs**: アプリケーションログの中央集約
- **Alerts**: リソース使用量アラート設定

### **ヘルスチェック**
```typescript
// /health エンドポイント
app.get('/health', async (req, res) => {
  const health = {
    uptime: process.uptime(),
    message: 'OK',
    timestamp: Date.now(),
    database: await checkDatabaseConnection(),
    firebase: await checkFirebaseConnection(),
    claude: await checkClaudeAPIConnection()
  };
  
  res.status(200).json(health);
});
```

## 💰 コスト見積もり

### **月額料金内訳**
```
Vercel (フロントエンド)
├── Hobby Plan: $0/月
├── Bandwidth: 100GB無料 → $0
├── Build時間: 6,000分無料 → $0
└── 小計: $0/月

Railway (バックエンド)
├── Starter Plan: $5/月 (初月無料)
├── PostgreSQL: 含まれる
├── Storage: 1GB含まれる
├── CPU/Memory: 含まれる
└── 小計: $5/月

合計: $5/月 (初月$0)
```

### **スケーリング想定**
```
トラフィック増加時:
├── Vercel: 自動スケール (無料範囲内)
├── Railway: Pro Plan $20/月 (必要時)
└── Database: 自動拡張対応
```

## 🚀 パフォーマンス期待値

### **フロントエンド (Vercel)**
- **初回読み込み**: < 2秒
- **TTI (Time to Interactive)**: < 3秒  
- **CDN配信**: 世界各地から最適化配信
- **SEO Score**: 95+ (Lighthouse)

### **バックエンド (Railway)**
- **API応答時間**: < 200ms (平均)
- **データベース応答**: < 50ms (平均)
- **WebSocket接続**: リアルタイム通信
- **Uptime**: 99.9%保証

## ⚡ 本番運用設計

### **デプロイフロー**
```
1. GitHub Push (main branch)
   ↓
2. Vercel自動ビルド・デプロイ (フロントエンド)
   ↓
3. Railway自動ビルド・デプロイ (バックエンド)  
   ↓
4. 本番環境反映完了
```

### **ロールバック戦略**
- **Vercel**: ワンクリックロールバック対応
- **Railway**: デプロイ履歴からロールバック
- **Database**: マイグレーション取り消し対応

### **バックアップ戦略**
- **PostgreSQL**: Railway自動バックアップ (日次)
- **Firebase**: 標準バックアップ機能
- **コード**: GitHub保管 (自動)

## 🔧 次のステップ

この設計書を基に実装ガイドを作成し、段階的にデプロイを実行する準備が整いました。