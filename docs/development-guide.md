# ConsensusAI 開発ガイド

## 🛠️ 開発環境セットアップ

### 前提条件
- Node.js 18.x以上
- npm または yarn
- Git

### セットアップ手順
```bash
# リポジトリクローン
git clone <repository-url>
cd ConsensusAI

# 依存関係インストール
cd client && npm install
cd ../server && npm install

# 環境設定
cp server/.env.example server/.env
# .envファイルを適切に設定

# データベース初期化
cd server
npx prisma migrate dev
npx prisma generate

# 開発サーバー起動
# Terminal 1: Backend
cd server && npm run dev

# Terminal 2: Frontend  
cd client && npm run dev
```

## 📋 重要な開発ルール

### 1. CRUD操作の実装必須ルール
**全てのCRUD操作はFirebase + SQL Database両方に対して実行する**

```typescript
// ✅ 正しい実装例
async function createProject(data) {
    // 1. SQLite操作（第一優先）
    const sqlResult = await prisma.project.create({ data });
    
    // 2. Firebase操作（第二優先）
    await firebase.ref(`users/${userId}/projects/${sqlResult.id}`).set({
        ...sqlResult,
        firebaseId: sqlResult.id
    });
    
    // 3. エラー時は全体ロールバック
    return sqlResult;
}

// ❌ 不正な実装例
async function createProject(data) {
    // SQLiteのみ - Firebase同期なし（NG）
    return await prisma.project.create({ data });
}
```

### 2. データ整合性保証
- 片方が成功・片方が失敗の場合は完全ロールバック
- トランザクション的な原子性保証
- データ不整合状態の回避

### 3. AI分析統一実装ルール
**Claude Code SDKとOpenAI APIで完全に同じロジックを使用**

```typescript
// 統一実装パターン
class AIService {
    async generateResponse(prompt: string, model?: string) {
        if (!model) {
            return this.generateResponseWithFallback(prompt);
        }
        return this.generateSingleResponse(prompt, model);
    }
}
```

#### 重要な制約
- **単一API呼び出し原則**: 1度のAI分析 = 1回のAPI呼び出し
- **バッチ処理禁止**: 複雑な分割処理は使用しない
- **進捗管理システム禁止**: WebSocket進捗更新等の複雑な仕組みは使用しない

### 4. 国際化対応
```typescript
// 翻訳キーの命名規則
t('componentName.sectionName.itemName')

// 日英混在の禁止
❌ "Bookmarked済み"
✅ t('common.bookmarked') // "ブックマーク済み" | "Bookmarked"
```

### 5. テストデータ管理
**動作確認時は必ず指定のテストアカウントを使用**

- **指定アカウント**: emailフィールドが `yuto.masamura@gmail.com` のユーザー
- **重要**: ユーザーIDではなく、emailフィールドを確認
- **テストプロジェクト**: 名前に `[TEST]` プレフィックスを付与
- **クリーンアップ**: 動作確認後は必ずテストデータを削除

## 🔧 コード品質管理

### Lintとビルドチェック
```bash
# フロントエンド
cd client
npm run lint      # ESLint チェック
npm run build     # プロダクションビルド

# バックエンド
cd server
npm run build     # TypeScript コンパイル
npx tsc --noEmit  # 型チェック
```

### コミット前チェックリスト
- [ ] **両DB操作**: Firebase + SQL両方への操作を実装
- [ ] **データ整合性**: エラー時の全体ロールバック処理
- [ ] **国際化**: 日英混在を避けた翻訳実装
- [ ] **コードエラーチェック**: lint/buildコマンドでエラー確認
- [ ] **テストデータクリーンアップ**: 動作確認後の完全削除

## 🚨 緊急時対応

### 500エラーの解決手順
```bash
# 1. 全プロセス停止
pkill -f "ts-node-dev"

# 2. データベース初期化
cd server
rm -f prisma/dev.db && rm -f prisma/dev.db-journal
npx prisma migrate reset --force

# 3. サーバー再起動
npm run dev
```

### よくあるトラブル
- **データベーススキーマの不整合**: マイグレーション後の不完全な再起動
- **プロセスの競合**: 複数のサーバープロセスが同時起動
- **ポートの競合**: 他のプロセスがポートを使用中

## 📁 プロジェクト構造

### Frontend (/client)
```
src/
├── components/          # Reactコンポーネント
├── contexts/            # React Context (AuthContext等)
├── translations/        # 国際化ファイル (ja/en)
├── lib/                # ライブラリ設定 (Firebase等)
└── types/              # TypeScript型定義
```

### Backend (/server)
```
src/
├── routes/             # API エンドポイント
├── lib/               # ライブラリ設定
├── utils/             # ユーティリティ関数
└── prisma/            # データベーススキーマ
```

## 📝 コーディング規約

### TypeScript
- **型定義**: 厳密な型指定を必須とする
- **null/undefined**: 適切なnull チェックを実装
- **any型**: 原則禁止（やむを得ない場合のみ）

### React
- **Hooks**: 関数コンポーネント + Hooksパターンを使用
- **状態管理**: Context API + useState/useReducer
- **副作用**: useEffect の依存配列を適切に設定

### Node.js/Express
- **非同期処理**: async/await パターンを使用
- **エラーハンドリング**: 適切なtry-catch実装
- **ミドルウェア**: 認証・バリデーション処理の分離

## ⚙️ 設定ファイル

### 重要な設定ファイル
- **Firebase設定**: `client/src/lib/firebase.ts`
- **Prisma設定**: `server/prisma/schema.prisma`
- **環境変数**: `server/.env` (gitignore済み)
- **Firebase ルール**: `client/firebase-database-rules.json`

### 環境変数
```bash
# server/.env
DATABASE_URL="file:./dev.db"
FIREBASE_SERVICE_ACCOUNT_KEY="path/to/service-account.json"
# OPENAI_API_KEY="sk-..." # 将来的にOpenAI API使用時
```

## 📈 システム状況

**最終更新**: 2025-07-24  
**技術スタック**: Claude Code SDK による AI分析機能が安定稼働中  
**データベース**: Firebase + SQLite デュアル構成で運用中  

### 主要機能ステータス
- ✅ AI分析 (トピック抽出・立場分析)
- ✅ 意見収集システム (パブリック/管理者)
- ✅ リアルタイム更新 (Socket.IO)
- ✅ トライアル・課金システム
- ✅ アカウント削除機能
- ✅ 多言語対応 (日英)

**開発体制**: Claude Code による継続的開発・保守

---

## 🔗 関連ドキュメント

- **[CLAUDE.md](../CLAUDE.md)**: Claude Code開発ガイド（メインの開発規約）
- **[技術仕様書](./technical-specifications.md)**: 詳細な技術仕様
- **[AI分析システム仕様書](./ai-analysis/AI分析システム仕様書.md)**: AI分析実装詳細