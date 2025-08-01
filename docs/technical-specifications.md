# ConsensusAI 技術仕様書

## 🎯 アーキテクチャ概要

### 技術スタック
- **フロントエンド**: React 18.3 + TypeScript 5.5 + Vite 5.4 + Tailwind CSS
- **バックエンド**: Node.js + Express 4.18 + TypeScript 5.3 + Prisma ORM 5.8
- **データベース**: Firebase Realtime Database + SQLite (デュアル構成)
- **認証**: Firebase Auth (Google OAuth)
- **AI**: Claude Code SDK (claude-3-5-sonnet, claude-3-5-haiku)
- **リアルタイム**: Socket.IO 4.7-4.8
- **UI**: Lucide React (アイコン) + Recharts (グラフ)

## 🗄️ データベース設計

### デュアルデータベース構成
ConsensusAIは**Firebase**と**SQLite**の両方を使用するデュアルデータベース設計：

```typescript
// 全CRUD操作の必須パターン
async function performCRUD(data) {
    // 1. SQLite操作 (メインデータ)
    const sqlResult = await prisma.table.create({ data });
    
    // 2. Firebase同期 (リアルタイム表示)
    await firebase.ref('path').set(transformData(sqlResult));
    
    // 3. 失敗時は全体ロールバック
}
```

### データ同期戦略
- **SQLite**: メインデータストレージ（整合性重視）
- **Firebase**: リアルタイム表示用（即座反映）
- **同期フィールド**: `firebaseId`, `syncStatus`, `lastSyncAt`

## 🤖 AI分析システム

### Claude Code SDK統合
```typescript
// AI分析の基本フロー
const aiService = new AIService();
const result = await aiService.generateResponse(prompt);

// フォールバック機能
const models = ['claude-3-5-sonnet-20241022', 'claude-3-5-haiku-20241022'];
```

### 分析パフォーマンス
- **分析対象**: 未分析意見のみ（`OpinionAnalysisState`モデルで管理）
- **処理時間**: 平均数秒（意見数による）
- **並行処理**: 単一API呼び出し原則

## 🌐 国際化対応

### 多言語サポート
```typescript
// 翻訳ファイル構成
translations/
├── common/           # 共通翻訳
├── components/       # コンポーネント別翻訳
└── pages/           # ページ別翻訳
```

### サポート言語
- **日本語 (ja)**: 完全対応
- **英語 (en)**: 完全対応

## 🔄 リアルタイム機能

### Socket.IO実装
```typescript
// リアルタイム更新の実装
socket.on('opinionAdded', (data) => {
    updateOpinionList(data);
});

socket.on('analysisCompleted', (result) => {
    updateAnalysisResults(result);
});
```

## 📊 利用制限管理

### プラン別制限
```typescript
// 制限管理モデル
- AnalysisUsage: 分析使用履歴
- TrialHistory: トライアル利用履歴
- PlanLimits: プラン別制限設定
```

### 制限チェック
- **プロジェクト数**: プラン別上限
- **分析回数**: 日次・月次制限
- **意見収集数**: プロジェクト別上限

## 🔐 セキュリティ

### 認証・認可
- **Firebase Auth**: Google OAuth認証
- **JWT**: セッション管理
- **ミドルウェア**: リクエスト認証チェック

### データ保護
- **Firebase Rules**: データアクセス制御
- **Prisma**: SQLインジェクション防止
- **入力検証**: 全APIエンドポイントでバリデーション

## 📈 パフォーマンス最適化

### フロントエンド最適化
- **遅延読み込み**: React.lazy()
- **メモ化**: React.memo(), useMemo()
- **バンドル最適化**: Vite設定

### バックエンド最適化
- **データベース**: インデックス最適化
- **API**: レスポンス時間監視
- **キャッシュ**: Firebase リアルタイムキャッシュ

## 🚀 デプロイメント

### 開発環境
```bash
# フロントエンド
cd client && npm run dev

# バックエンド
cd server && npm run dev
```

### 本番環境
- **フロントエンド**: Vercel（予定）
- **バックエンド**: Railway（予定）
- **データベース**: Firebase + ローカルSQLite

## 📊 監視・ログ

### ログ管理
```typescript
// 構造化ログ
console.log('[ServiceName] 🎯 ログメッセージ', {
    timestamp: new Date().toISOString(),
    data: relevantData
});
```

### パフォーマンス監視
- **API応答時間**: 全エンドポイント監視
- **AI分析時間**: 処理時間追跡
- **エラー率**: 失敗パターン分析

## 🔧 開発ツール

### 開発効率化
- **TypeScript**: 型安全性
- **ESLint**: コード品質
- **Prettier**: コードフォーマット
- **Prisma Studio**: データベース管理

### テスト戦略
- **Jest**: ユニットテスト
- **統合テスト**: API エンドポイント
- **E2Eテスト**: 主要フロー確認

---

## 🔗 関連ドキュメント

- **[開発ガイド](./development-guide.md)**: 開発ルール・設定情報
- **[CLAUDE.md](../CLAUDE.md)**: Claude Code開発ガイド
- **[API仕様書](./apis/api-documentation.md)**: API詳細仕様