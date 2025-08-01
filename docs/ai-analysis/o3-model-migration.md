# O3モデル移行ガイド

このドキュメントでは、GPTモデルからOpenAI O3モデルへの移行について説明します。

## 変更された箇所

### 1. AIService (server/src/services/aiService.ts)
- デフォルトモデルを `['gpt-3.5-turbo', 'gpt-4']` から `['o3-mini-2025-01-31', 'o4-mini-2025-04-16', 'gpt-4o']` に変更
- O3モデル専用パラメータのサポートを追加：
  - `max_completion_tokens` (O3モデル用)
  - `reasoning.effort` (o3-proモデル用)
- 従来のGPTモデルとの互換性を維持

### 2. EnhancedConsensusService (server/src/services/consensusService.enhanced.ts)
- デフォルトモデルを `['gpt-4', 'gpt-3.5-turbo']` から `['o3-mini-2025-01-31', 'o4-mini-2025-04-16', 'gpt-4o']` に変更

### 3. Analysis Routes (server/src/routes/analysis.ts)
- センチメント分析: `gpt-3.5-turbo` → `o3-mini-2025-01-31`
- サマリー生成: `gpt-3.5-turbo` → `o3-mini-2025-01-31`

## O3モデルの特徴

### 利用可能なモデル
- `o3-mini`: 高速で低コスト、技術的ドメインに特化
- `o3`: 標準モデル
- `o3-pro`: 最高性能、高コスト

### 主な違い
1. **Reasoning Tokens**: O3モデルは内部推論にreasoning tokensを使用
2. **max_completion_tokens**: 従来の `max_tokens` の代わりに使用
3. **Context Window**: 
   - o3-mini: 128K tokens
   - o3/o3-pro: 200K tokens
4. **Reasoning Effort**: o3-proでは推論の詳細度を制御可能

### パフォーマンス
- O3モデルは複雑な推論タスクで従来のGPTモデルを上回る性能
- 特にコーディング、数学、科学分野で優れた結果
- o3-miniはo1と比較して93%コスト削減、低レイテンシを実現

## API料金
- o3-mini: 詳細は公式ドキュメントを参照
- o3-pro: $20/M input tokens, $80/M output tokens

## 注意事項
1. O3モデルはプロンプトエンジニアリングのベストプラクティスが異なる
2. "step by step"などの指示は不要（内部で推論を行うため）
3. シンプルで直接的なプロンプトが推奨される

## 環境設定
OPENAI_API_KEYは引き続き必要です。O3モデルにアクセスするには：
1. OpenAI組織の認証が必要
2. 有料使用プランが必要
3. API利用制限に注意

## フォールバック
AIServiceは従来のGPTモデルとの互換性を維持しているため、必要に応じて以前のモデルも使用可能です。