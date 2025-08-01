# ConsensusAI 技術ドキュメント

**開発者向けの技術ドキュメント集**

## 🚀 クイックスタート

- **[開発ガイド](./development-guide.md)**: 開発環境セットアップ・開発ルール
- **[技術仕様書](./technical-specifications.md)**: アーキテクチャ・技術スタック詳細

## 📚 ドキュメント構成

### 🗃️ データベース・CRUD (`/database`)
**[詳細 →](./database/README.md)**
- **schemas/**: データベーススキーマ・構造設計
- **crud/**: CRUD操作・実装詳細
- **firebase-sql-sync-analysis.md**: Firebase-SQLite同期問題分析

### 🔐 認証・ユーザー管理 (`/auth`)
- **[signin-signup-requirements.md](./auth/signin-signup-requirements.md)**: サインイン・サインアップ要件

### 📊 プロジェクト管理 (`/project`) 
- **[project-features-analysis.md](./project/project-features-analysis.md)**: プロジェクト機能・特徴分析
- **[status-management-design-discussion.md](./project/status-management-design-discussion.md)**: ステータス管理設計

### 🤖 AI分析機能 (`/ai-analysis`)
- **[AI分析システム仕様書.md](./ai-analysis/AI分析システム仕様書.md)**: AI分析システム詳細仕様
- **[ai-technical-specification.md](./ai-analysis/ai-technical-specification.md)**: AI分析機能技術仕様書
- **[ai-implementation-analysis.md](./ai-analysis/ai-implementation-analysis.md)**: AI分析機能実装分析レポート
- **[ai-analysis-detailed-problem-analysis.md](./ai-analysis/ai-analysis-detailed-problem-analysis.md)**: AI分析詳細問題分析
- **[ai-analysis-improvement-proposal.md](./ai-analysis/ai-analysis-improvement-proposal.md)**: AI分析改善提案書
- **[claude-code-sdk-integration.md](./ai-analysis/claude-code-sdk-integration.md)**: Claude Code SDK統合ガイド
- **[o3-model-migration.md](./ai-analysis/o3-model-migration.md)**: o3モデル移行ガイド

### 🛠️ 開発・運用 (`/development`)
- **[MCP_Integration_Analysis.md](./development/MCP_Integration_Analysis.md)**: MCP統合分析
- **[implementation-deployment-guide.md](./development/implementation-deployment-guide.md)**: 実装・デプロイガイド
- **[phase2-implementation-summary.md](./development/phase2-implementation-summary.md)**: Phase2実装完了報告
- **development-diary/**: 開発日記・プロジェクト分析記録

### ⚡ パフォーマンス最適化 (`/performance`)
- **[bulk-opinion-optimization-plan.md](./performance/bulk-opinion-optimization-plan.md)**: 大量意見登録最適化計画
- **[bulk-opinion-performance-analysis.md](./performance/bulk-opinion-performance-analysis.md)**: 大量意見処理パフォーマンス分析

### 🌐 API仕様 (`/apis`)
- **[api-documentation.md](./apis/api-documentation.md)**: API仕様書

### 🎬 アクション管理 (`/action-management`)
- **[action-management-analysis.md](./action-management-analysis.md)**: アクション管理画面詳細分析
- **[dashboard-action-trigger-analysis.md](./dashboard-action-trigger-analysis.md)**: ダッシュボードアクション管理フロー分析
- **[response-action-detail-structure.md](./action-management/response-action-detail-structure.md)**: 回答アクション詳細構造

### 💳 課金・決済システム (`/billing`)
**[詳細 →](./billing/README.md)**
- **[stripe-integration-guide.md](./billing/stripe-integration-guide.md)**: Stripe決済実装ガイド
- **[stripe-webhook-setup.md](./billing/stripe-webhook-setup.md)**: Webhook設定・処理実装
- **[payment-architecture.md](./billing/payment-architecture.md)**: 課金システム全体アーキテクチャ

## 🔗 重要なリソース

- **[CLAUDE.md](../CLAUDE.md)**: Claude Code開発ガイド（メインの開発規約）
- **[Firebase セキュリティルール](../client/firebase-database-rules.json)**: 現在使用中のFirebaseルール
- **[Prismaスキーマ](../server/prisma/schema.prisma)**: SQLiteデータベーススキーマ

---

**サービス概要については [ルートREADME](../README.md) をご参照ください。**