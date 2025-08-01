# Vercel + Railway デプロイ実装ガイド

**作成日**: 2025年8月1日  
**最終更新**: 2025年8月1日  
**目的**: ConsensusAIの本番デプロイを段階的に実行するための詳細手順書  
**対象構成**: Vercel (フロントエンド) + Railway (バックエンド)

## 🎯 実装概要

### **デプロイフロー**
```
Phase 1: バックエンド準備 (Railway)
   ├── PostgreSQL移行
   ├── 環境変数設定
   └── デプロイ・テスト

Phase 2: フロントエンド準備 (Vercel)
   ├── ビルド設定調整
   ├── API接続先変更
   └── デプロイ・テスト

Phase 3: 統合テスト・本番化
   ├── E2Eテスト実行
   ├── パフォーマンス確認
   └── 本番公開
```

### **所要時間見積もり**
- **Phase 1**: 2-3時間
- **Phase 2**: 1-2時間  
- **Phase 3**: 1時間
- **合計**: 4-6時間

## 📋 事前準備チェックリスト

### **必要なアカウント**
- [ ] **GitHub**: ソースコード管理 (既存)
- [ ] **Vercel**: フロントエンドデプロイ ([vercel.com](https://vercel.com))
- [ ] **Railway**: バックエンドデプロイ ([railway.app](https://railway.app))

### **環境変数の整理**
- [ ] Firebase設定値の確認
- [ ] Stripe APIキーの確認  
- [ ] Claude API キーの確認
- [ ] Gmail SMTP設定の確認

### **現在の動作確認**
- [ ] ローカル環境でフロントエンド・バックエンド正常動作
- [ ] AI分析機能の動作確認
- [ ] Stripe決済機能の動作確認

## 🚂 Phase 1: Railway (バックエンド) セットアップ

### **Step 1.1: Railway プロジェクト作成**

1. **Railway アカウント作成・ログイン**
   ```bash
   # Railway CLI インストール (オプション)
   npm install -g @railway/cli
   railway login
   ```

2. **新規プロジェクト作成**
   - Railway ダッシュボードで "New Project" をクリック
   - "Deploy from GitHub repo" を選択
   - `consensusaideveloper/consensus-ai` リポジトリを選択
   - Root directory: `/server` を指定

### **Step 1.2: PostgreSQL データベース作成**

1. **データベースサービス追加**
   - Railway プロジェクト内で "Add Service" → "Database" → "PostgreSQL"
   - データベースが自動生成され、接続情報が環境変数に設定される

2. **接続情報確認**
   ```bash
   # Railway が自動設定する環境変数
   DATABASE_URL=postgresql://postgres:password@containers-us-west-xxx.railway.app:xxxx/railway
   ```

### **Step 1.3: Prisma スキーマ更新**

1. **データベースプロバイダー変更**
   ```typescript
   // server/prisma/schema.prisma
   datasource db {
     provider = "postgresql"  // "sqlite" から変更
     url      = env("DATABASE_URL")
   }
   ```

2. **マイグレーション実行準備**
   ```bash
   # ローカルでスキーマ確認
   cd server
   npx prisma generate
   npx prisma db push --preview-feature
   ```

### **Step 1.4: 環境変数設定**

Railway ダッシュボードの Variables タブで以下を設定:

```bash
# Node.js設定
NODE_ENV=production
PORT=3001

# データベース (Railway自動設定)
DATABASE_URL=${DATABASE_URL}

# Firebase Admin
FIREBASE_PROJECT_ID=consensusai-325a7
FIREBASE_ADMIN_SDK_PATH=./consensusai-325a7-firebase-adminsdk.json

# Claude API  
CLAUDE_API_KEY=sk-ant-api03-...

# Stripe
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Gmail SMTP
GMAIL_USER=your-email@gmail.com
GMAIL_APP_PASSWORD=xxxx-xxxx-xxxx-xxxx

# CORS設定 (後でVercel URLに更新)
CORS_ORIGIN=https://consensus-ai.vercel.app
```

### **Step 1.5: Firebase Admin SDK アップロード**

1. **Firebase Admin SDK ファイル準備**
   ```bash
   # server/consensusai-325a7-firebase-adminsdk-fbsvc-f25bcbea47.json
   # このファイルをRailway環境に配置する必要あり
   ```

2. **Volume マウント設定**
   - Railway ダッシュボードで Volume 作成
   - Firebase Admin SDK ファイルをアップロード
   - `/app/consensusai-325a7-firebase-adminsdk.json` にマウント

### **Step 1.6: ビルド・デプロイ設定**

1. **package.json の確認**
   ```json
   {
     "scripts": {
       "start": "node dist/index.js",
       "build": "tsc"
     }
   }
   ```

2. **Railway ビルド設定**
   - Build Command: `npm run build`
   - Start Command: `npm start`
   - Watch Paths: `server/**`

### **Step 1.7: デプロイ実行・確認**

1. **初回デプロイ**
   - Railway が自動的にビルド・デプロイを実行
   - ログでエラーがないことを確認

2. **ヘルスチェック確認**
   ```bash
   # Railway提供のURLでヘルスチェック
   curl https://your-app.railway.app/health
   ```

3. **データベース接続確認**
   ```bash
   # Prisma Studio でデータベース確認
   npx prisma studio
   ```

## 🌐 Phase 2: Vercel (フロントエンド) セットアップ

### **Step 2.1: Vercel プロジェクト作成**

1. **Vercel アカウント作成・ログイン**
   - [vercel.com](https://vercel.com) でGitHubアカウントでサインアップ

2. **新規プロジェクト作成**
   - "New Project" → GitHub リポジトリ選択
   - `consensusaideveloper/consensus-ai` を選択
   - Root Directory: `client` を指定
   - Framework Preset: `Vite` を選択

### **Step 2.2: ビルド設定調整**

1. **Build & Output Settings**
   ```bash
   Build Command: npm run build
   Output Directory: dist
   Install Command: npm install
   ```

2. **vercel.json ファイル作成**
   ```json
   // プロジェクトルートに作成
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
         "dest": "client/dist/index.html"
       }
     ]
   }
   ```

### **Step 2.3: 環境変数設定**

Vercel ダッシュボードの Settings → Environment Variables で設定:

```bash
# Firebase設定
VITE_FIREBASE_API_KEY=AIzaSyD...
VITE_FIREBASE_AUTH_DOMAIN=consensusai-325a7.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=consensusai-325a7
VITE_FIREBASE_STORAGE_BUCKET=consensusai-325a7.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123456789:web:abc123

# API接続先 (RailwayのURL)
VITE_API_BASE_URL=https://your-app.railway.app

# Stripe
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_...
```

### **Step 2.4: API接続設定の更新**

1. **API Base URL 設定確認**
   ```typescript
   // client/src/lib/api.ts
   const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';
   ```

2. **Socket.IO 接続設定更新**
   ```typescript
   // client/src/lib/socket.ts
   const socket = io(import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001');
   ```

### **Step 2.5: デプロイ実行・確認**

1. **初回デプロイ**
   - Vercel が自動的にビルド・デプロイを実行
   - Build Log でエラーがないことを確認

2. **フロントエンド動作確認**
   ```bash
   # Vercel提供のURLでアクセス確認
   https://consensus-ai.vercel.app
   ```

## 🔗 Phase 3: 統合テスト・本番化

### **Step 3.1: CORS設定の最終調整**

1. **Railway の CORS 設定更新**
   ```bash
   # Railway環境変数を更新
   CORS_ORIGIN=https://consensus-ai.vercel.app
   ```

2. **再デプロイ実行**
   - Railway の再デプロイを実行
   - CORS エラーが解消されることを確認

### **Step 3.2: E2E統合テスト**

以下の機能を順次テスト:

1. **認証機能テスト**
   - [ ] Google OAuth ログイン
   - [ ] ユーザープロファイル表示
   - [ ] ログアウト

2. **プロジェクト機能テスト**
   - [ ] プロジェクト作成
   - [ ] 意見収集フォーム生成
   - [ ] 意見投稿 (パブリックフォーム)

3. **AI分析機能テスト**
   - [ ] AI分析実行
   - [ ] リアルタイム進捗更新 (Socket.IO)
   - [ ] 分析結果表示

4. **決済機能テスト**
   - [ ] Stripe決済フロー
   - [ ] サブスクリプション管理
   - [ ] Webhook処理

### **Step 3.3: パフォーマンステスト**

1. **フロントエンド パフォーマンス**
   ```bash
   # Lighthouse スコア確認
   - Performance: 90+
   - Accessibility: 95+
   - Best Practices: 90+
   - SEO: 90+
   ```

2. **バックエンド パフォーマンス**
   ```bash
   # API応答時間確認
   curl -w "@curl-format.txt" -o /dev/null -s https://your-app.railway.app/api/health
   ```

### **Step 3.4: 本番公開準備**

1. **カスタムドメイン設定 (オプション)**
   - Vercel: Settings → Domains
   - Railway: Settings → Domains

2. **SSL証明書確認**
   - 両サービスで自動SSL証明書が有効化されていることを確認

3. **監視・アラート設定**
   - Vercel Analytics 有効化
   - Railway Metrics 確認

## ⚠️ トラブルシューティング

### **よくある問題と解決方法**

#### **1. PostgreSQL接続エラー**
```bash
# 症状: "Can't reach database server"
# 解決: DATABASE_URL環境変数の確認
echo $DATABASE_URL
```

#### **2. Firebase Admin SDK エラー**
```bash
# 症状: "Firebase Admin SDK not found"
# 解決: Volume マウント設定の確認
ls -la /app/consensusai-325a7-firebase-adminsdk.json
```

#### **3. CORS エラー**
```bash
# 症状: "Access to XMLHttpRequest has been blocked by CORS policy"
# 解決: CORS_ORIGIN 環境変数の確認
curl -H "Origin: https://consensus-ai.vercel.app" https://your-app.railway.app/api/health
```

#### **4. Environment Variables not loaded**
```bash
# Vite環境変数は VITE_ プレフィックスが必要
# ❌ API_BASE_URL=...
# ✅ VITE_API_BASE_URL=...
```

## 📊 デプロイ完了チェックリスト

### **機能テスト完了確認**
- [ ] ユーザー認証 (Google OAuth)
- [ ] プロジェクト CRUD 操作
- [ ] 意見収集・投稿
- [ ] AI分析実行・結果表示  
- [ ] リアルタイム通信 (Socket.IO)
- [ ] Stripe決済処理
- [ ] 多言語切り替え (日本語/英語)

### **パフォーマンス確認**
- [ ] フロントエンド読み込み速度 < 3秒
- [ ] API応答時間 < 500ms
- [ ] データベース応答 < 100ms
- [ ] WebSocket接続の安定性

### **セキュリティ確認**
- [ ] HTTPS 通信確認
- [ ] API キー適切な管理  
- [ ] CORS 設定確認
- [ ] レート制限動作確認

### **監視設定確認**
- [ ] Vercel Analytics 有効化
- [ ] Railway Metrics 確認
- [ ] エラー監視設定
- [ ] ヘルスチェック設定

## 🎉 デプロイ完了

すべてのチェックリストが完了したら、ConsensusAI の本番環境デプロイが完了です！

### **デプロイ後の管理**
- **監視**: 日次でメトリクス確認
- **バックアップ**: PostgreSQL の定期バックアップ確認  
- **アップデート**: GitHub プッシュによる自動デプロイ
- **スケーリング**: トラフィック増加時のプラン変更検討