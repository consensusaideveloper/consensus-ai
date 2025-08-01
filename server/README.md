# ConsensusAI Backend

AI統合コンセンサス形成プラットフォームのバックエンドAPI

## 🌟 概要

ConsensusAI Backendは、意見収集とAI分析を活用してコンセンサス形成を支援するWebAPIです。複数のAIモデルを使用して意見を自動分析し、トピック分類やセンチメント分析、インサイト生成を行います。

### 主な機能

- 🤖 **AI統合分析**: OpenAI APIを活用した自動トピック分類
- 📊 **リアルタイム分析**: WebSocketによるリアルタイム進捗通知
- 🔒 **セキュリティ**: 包括的なセキュリティ機能と入力検証
- 📈 **モニタリング**: パフォーマンス監視とメトリクス収集
- 🌐 **パブリックAPI**: 認証不要の意見投稿機能
- 📝 **詳細ログ**: 構造化されたログシステム

## 🚀 クイックスタート

### 前提条件

- Node.js 18+
- npm 8+
- OpenAI API Key

### インストール

```bash
# リポジトリをクローン
git clone <repository-url>
cd ConsensusAI/server

# 自動セットアップスクリプトを実行
chmod +x scripts/setup.sh
./scripts/setup.sh
```

### 環境設定

`.env`ファイルを編集して必要な設定を行ってください：

```env
# Database
DATABASE_URL="file:./dev.db"

# OpenAI API
OPENAI_API_KEY="your_openai_api_key_here"

# Server
PORT=3000
NODE_ENV=development

# Security (本番環境のみ)
ALLOWED_ORIGINS="http://localhost:3000,https://yourdomain.com"
ADMIN_TOKEN="your_admin_token_here"
VALID_API_KEYS="key1,key2,key3"
```

### サーバー起動

```bash
# 開発モード
npm run dev

# 本番モード
npm run build
npm start
```

### APIテスト

```bash
# APIテストスクリプトを実行
chmod +x scripts/test-api.sh
./scripts/test-api.sh
```

## 📋 API仕様

詳細なAPI仕様は [API Documentation](../docs/api-documentation.md) を参照してください。

### 主要エンドポイント

| エンドポイント | 説明 |
|----------------|------|
| `GET /health` | ヘルスチェック |
| `POST /api/projects` | プロジェクト作成 |
| `POST /api/analysis/projects/{id}/topics` | AI分析実行 |
| `POST /api/public/projects/{userId}/{projectId}/opinions` | パブリック意見投稿 |
| `POST /api/analysis/consensus` | コンセンサス生成 |

### WebSocket イベント

- `analysis_progress`: 分析進捗通知
- `new_opinion`: 新規意見投稿通知  
- `project_status_changed`: プロジェクト状況変更

## 🏗️ アーキテクチャ

### 技術スタック

- **Runtime**: Node.js + TypeScript
- **Framework**: Express.js
- **Database**: SQLite + Prisma ORM
- **AI Integration**: OpenAI API
- **Real-time**: Socket.IO
- **Security**: Helmet, CORS, カスタムセキュリティミドルウェア
- **Monitoring**: カスタムパフォーマンス監視
- **Logging**: 構造化ログシステム

### ディレクトリ構造

```
server/
├── src/
│   ├── controllers/          # (未使用 - サービス層で代替)
│   ├── middleware/           # ミドルウェア
│   │   ├── auth.ts          # 認証
│   │   ├── errorHandler.ts  # エラーハンドリング
│   │   ├── performance.ts   # パフォーマンス監視
│   │   ├── security.ts      # セキュリティ
│   │   └── validator.ts     # バリデーション
│   ├── routes/              # APIルート
│   │   ├── analysis.ts      # 分析API
│   │   ├── consensus.ts     # コンセンサスAPI
│   │   ├── projects.db.ts   # プロジェクト管理
│   │   └── public.ts        # パブリックAPI
│   ├── services/            # ビジネスロジック
│   │   ├── aiService.ts                # AI統合
│   │   ├── consensusService.enhanced.ts # 強化コンセンサス
│   │   ├── opinionService.db.ts        # 意見管理
│   │   ├── projectService.db.ts        # プロジェクト管理
│   │   ├── realtimeService.ts          # リアルタイム通信
│   │   ├── taskService.db.ts           # タスク管理
│   │   └── topicAnalysisService.ts     # トピック分析
│   ├── types/               # 型定義
│   ├── utils/               # ユーティリティ
│   │   └── logger.ts        # ログシステム
│   ├── lib/                 # ライブラリ
│   │   └── database.ts      # データベース接続
│   ├── index.db.ts          # 開発用サーバー
│   └── index.production.ts  # 本番用サーバー
├── prisma/                  # データベース設定
│   ├── schema.prisma        # スキーマ定義
│   └── seed.ts             # シードデータ
├── scripts/                 # ユーティリティスクリプト
├── logs/                    # ログファイル
└── docs/                    # ドキュメント
```

## 🔧 開発

### npm scripts

```bash
# 開発
npm run dev              # 開発サーバー起動
npm run build           # ビルド
npm run start           # 本番サーバー起動

# データベース
npm run db:generate     # Prismaクライアント生成
npm run db:push         # スキーマをDBにプッシュ
npm run db:migrate      # マイグレーション実行
npm run db:seed         # シードデータ投入
npm run db:studio       # Prisma Studio起動

# 品質管理
npm run lint            # ESLint実行
npm run test            # テスト実行 (設定必要)
```

### データベース管理

```bash
# データベースリセット
npm run db:push

# シードデータの再投入
npm run db:seed

# データベーススキーマ確認
npm run db:studio
```

## 🐳 Docker

### Docker Compose使用

```bash
# 本番環境
docker-compose up -d

# 開発環境
docker-compose --profile dev up -d
```

### 単体Docker使用

```bash
# イメージビルド
docker build -t consensus-ai-backend .

# コンテナ実行
docker run -p 3000:3000 -e OPENAI_API_KEY=your_key consensus-ai-backend
```

## 📊 監視とメトリクス

### エンドポイント

- `GET /health` - ヘルスチェック
- `GET /api/system/info` - システム情報
- `GET /api/metrics` - パフォーマンスメトリクス
- `GET /api/realtime/stats` - リアルタイム統計

### ログ

ログは `logs/` ディレクトリに以下の形式で保存されます：

- `combined.log` - 全レベルのログ
- `error-YYYY-MM-DD.log` - エラーログ
- `warn-YYYY-MM-DD.log` - 警告ログ
- `info-YYYY-MM-DD.log` - 情報ログ

### Prometheus統合

```bash
# Prometheus形式でメトリクス取得
curl http://localhost:3000/api/metrics?format=prometheus
```

## 🛡️ セキュリティ

### 実装済み機能

- **入力サニタイゼーション**: XSS攻撃防止
- **SQLインジェクション対策**: パラメータ化クエリ
- **レート制限**: API別の制限設定
- **CORS設定**: オリジン制限
- **セキュリティヘッダー**: Helmet.js使用
- **不審なアクティビティ検出**: 自動監視

### 本番環境での設定

```env
# 許可するオリジンを指定
ALLOWED_ORIGINS="https://yourdomain.com"

# 管理者トークン
ADMIN_TOKEN="secure_random_token"

# APIキー
VALID_API_KEYS="key1,key2,key3"
```

## 🔄 フェーズ別実装状況

| フェーズ | 状況 | 内容 |
|----------|------|------|
| フェーズ1 | ✅ 完了 | 基本的なAPIエンドポイント |
| フェーズ2 | ✅ 完了 | データベース連携とバリデーション強化 |
| フェーズ3 | ✅ 完了 | AI統合とコンセンサス分析機能 |
| フェーズ4 | ✅ 完了 | 統合テストと最適化 |

詳細な進捗は [backend-progress.md](../docs/backend-progress.md) を参照してください。

## 🧪 テスト

### 自動テスト

```bash
# APIテストスクリプト
./scripts/test-api.sh

# 個別エンドポイントテスト
curl http://localhost:3000/health
```

### 手動テスト手順

1. ヘルスチェック確認
2. プロジェクト作成
3. 意見投稿
4. 分析実行
5. コンセンサス生成

## 📚 ドキュメント

- [API Documentation](../docs/api-documentation.md) - 詳細なAPI仕様
- [Backend Progress](../docs/backend-progress.md) - 実装進捗
- [Backend Implementation Plan](../docs/backend-implementation-plan.md) - 実装計画

## 🤝 貢献

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## 📄 ライセンス

[ライセンス情報をここに記載]

## 🆘 サポート

問題が発生した場合：

1. [API Documentation](../docs/api-documentation.md) を確認
2. `logs/` ディレクトリのログを確認
3. `GET /health` でシステム状態を確認
4. Issue作成

---

**ConsensusAI Backend** - AI統合コンセンサス形成プラットフォーム