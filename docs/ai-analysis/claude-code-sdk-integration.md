# Claude Code SDK 統合ガイド

## 概要

OpenAI API から Claude Code SDK への移行ガイドです。Claude Code SDK は CLI認証を使用するため、APIキーが不要で、Maxプランでは追加料金なしで利用できます。

## 前提条件

- Claude Code CLI がインストール済み
- Claude Code Max プランに加入済み
- CLI認証が完了済み (`claude auth login` で認証済み)

## 導入手順

### 1. パッケージインストール

```bash
cd server
npm install @anthropic-ai/sdk
```

### 2. 環境変数の変更

`.env` ファイルから OpenAI 関連の設定を削除または無効化：

```env
# OpenAI API (使用停止)
# OPENAI_API_KEY=sk-...

# Claude Code SDK (CLI認証使用 - APIキー不要)
# ANTHROPIC_API_KEY は設定不要
```

### 3. AIService の置き換え

現在の `src/services/aiService.ts` を以下のように変更：

```typescript
import { AIResponse } from '../types';
import { AppError } from '../middleware/errorHandler';
import Anthropic from '@anthropic-ai/sdk';

export class AIService {
    private readonly anthropic: Anthropic;
    private readonly defaultModels = [
        'claude-3-5-sonnet-20241022', 
        'claude-3-5-haiku-20241022'
    ];

    constructor() {
        console.log('[AIService] 🔧 AIService初期化', {
            timestamp: new Date().toISOString(),
            defaultModels: this.defaultModels,
            nodeEnv: process.env.NODE_ENV,
            provider: 'Anthropic Claude (CLI認証)'
        });

        // Claude Code SDK はCLI認証を使用するため、APIキーは不要
        this.anthropic = new Anthropic({
            // CLI認証を使用するため、APIキーは設定しない
        });

        console.log('[AIService] ✅ AIService初期化完了（Claude Code SDK使用）');
    }

    async generateResponse(prompt: string, model?: string): Promise<AIResponse> {
        if (!model) {
            return this.generateResponseWithFallback(prompt);
        }
        
        return this.generateSingleResponse(prompt, model);
    }

    private async generateSingleResponse(prompt: string, model: string): Promise<AIResponse> {
        const startTime = Date.now();
        console.log('[AIService] ==> Claude AI分析リクエスト開始', {
            timestamp: new Date().toISOString(),
            model,
            promptLength: prompt.length,
            promptPreview: prompt.slice(0, 100) + (prompt.length > 100 ? '...' : '')
        });

        try {
            console.log('[AIService] 📤 Claude APIリクエスト送信中...');
            
            const response = await this.anthropic.messages.create({
                model: model,
                max_tokens: 4000,
                temperature: 0.7,
                messages: [
                    {
                        role: 'user',
                        content: prompt
                    }
                ]
            });

            const responseTime = Date.now() - startTime;
            console.log('[AIService] ✅ Claude AI分析レスポンス成功', {
                responseId: response.id,
                model: response.model,
                outputLength: response.content[0]?.text?.length || 0,
                responseTime: `${responseTime}ms`,
                outputPreview: response.content[0]?.text?.slice(0, 200) + 
                             (response.content[0]?.text?.length > 200 ? '...' : '')
            });
            
            return {
                id: response.id,
                content: response.content[0]?.text || '',
                model: response.model,
                created: Math.floor(Date.now() / 1000),
            };
        } catch (error) {
            const responseTime = Date.now() - startTime;
            console.error('[AIService] ❌ Claude AI分析エラー:', {
                error: error instanceof Error ? error.message : 'Unknown error',
                responseTime: `${responseTime}ms`,
                model,
                stack: error instanceof Error ? error.stack : undefined
            });

            throw new AppError(
                500,
                'AI_SERVICE_ERROR',
                'Failed to communicate with Claude AI service',
                error
            );
        }
    }

    private async generateResponseWithFallback(prompt: string): Promise<AIResponse> {
        console.log('[AIService] 🔄 フォールバック機能でモデル選択中...');
        
        for (let i = 0; i < this.defaultModels.length; i++) {
            const model = this.defaultModels[i];
            console.log(`[AIService] 🧪 ${model}モデルを試行中... (${i + 1}/${this.defaultModels.length})`);
            
            try {
                const result = await this.generateSingleResponse(prompt, model);
                console.log(`[AIService] ✅ ${model}モデルで成功！`);
                return result;
            } catch (error) {
                console.log(`[AIService] ❌ ${model}モデル失敗:`, error instanceof Error ? error.message : String(error));
                
                if (i === this.defaultModels.length - 1) {
                    console.error('[AIService] ❌ 全てのモデルで失敗しました');
                    throw new AppError(
                        503,
                        'ALL_MODELS_FAILED',
                        'すべてのClaudeモデルが利用できません。時間をおいて再試行してください。',
                        error
                    );
                }
            }
        }
        
        throw new AppError(503, 'NO_MODELS_AVAILABLE', 'Claudeモデルが利用できません');
    }
}
```

### 4. 利用可能なモデル

Claude Code SDK で利用可能な主要モデル：

- `claude-3-5-sonnet-20241022` - 最新のClaude 3.5 Sonnet（推奨）
- `claude-3-5-haiku-20241022` - 高速レスポンス用
- `claude-3-opus-20240229` - 最高品質（重い処理用）

### 5. 主な利点

- **APIキー不要**: CLI認証のみで利用可能
- **コスト削減**: Maxプランでは追加料金なし
- **レート制限緩和**: より多くのリクエストが可能
- **最新モデル**: Claude 3.5 Sonnet の最新版が利用可能

### 6. 移行時の注意点

1. **認証確認**: サーバー起動前に `claude auth status` で認証状態を確認
2. **モデル名変更**: OpenAI から Claude のモデル名に変更
3. **レスポンス形式**: OpenAI と Claude でレスポンス構造が異なる
4. **エラーハンドリング**: Claude 特有のエラーレスポンスに対応

### 7. テスト方法

```bash
# 認証状態確認
claude auth status

# サーバー起動
npm run dev

# ヘルスチェック
curl -X GET http://localhost:3001/api/analysis/health -H "x-user-id: test-user"
```

### 8. トラブルシューティング

**認証エラーが発生した場合:**
```bash
# 再認証
claude auth logout
claude auth login
```

**モデルアクセスエラーが発生した場合:**
- Max プランの有効性を確認
- 別のモデルでテスト実行

## 実装完了確認

- [ ] パッケージインストール完了
- [ ] aiService.ts の書き換え完了
- [ ] 認証状態の確認完了
- [ ] ヘルスチェック動作確認
- [ ] 実際のAI分析テスト実行
- [ ] エラーハンドリング動作確認

## 備考

この移行により、OpenAI API の利用料金を削減しつつ、Claude Code SDK の恩恵を受けることができます。開発段階では特に有効な選択肢です。