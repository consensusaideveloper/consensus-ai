import { AIResponse } from '../types';
import { AppError } from '../middleware/errorHandler';
// 開発段階でのみClaude Code SDKを使用
import { ClaudeService } from './claudeService';
import { LimitsConfig } from '../config/limits';

export class AIService {
    // OpenAI API実装（本番用・一時的にコメントアウト）
    /*
    private readonly apiKey: string;
    private readonly defaultModels = ['gpt-4.1-nano', 'gpt-4o-mini'];
    */

    // Claude Code SDK実装（開発段階のみ）
    private readonly claudeService: ClaudeService;

    constructor() {
        // OpenAI API初期化（本番用・一時的にコメントアウト）
        /*
        const apiKey = process.env.OPENAI_API_KEY;
        
        console.log('[AIService] 🔧 AIService初期化', {
            timestamp: new Date().toISOString(),
            hasApiKey: !!apiKey,
            apiKeyLength: apiKey?.length || 0,
            apiKeyPrefix: apiKey ? apiKey.substring(0, 10) + '...' : 'なし',
            defaultModels: this.defaultModels,
            nodeEnv: process.env.NODE_ENV
        });

        if (!apiKey) {
            console.error('[AIService] ❌ OpenAI APIキーが設定されていません');
            console.error('[AIService] 💡 環境変数OPENAI_API_KEYを設定してください');
            throw new Error('OPENAI_API_KEY is not set in environment variables');
        }

        if (!apiKey.startsWith('sk-')) {
            console.warn('[AIService] ⚠️ APIキーの形式が正しくない可能性があります');
            console.warn('[AIService] 💡 OpenAI APIキーは通常"sk-"で始まります');
        }

        this.apiKey = apiKey;
        console.log('[AIService] ✅ AIService初期化完了');
        */

        // Claude Code SDK初期化（開発段階のみ）
        console.log('[AIService] 🔧 AIService初期化 (Claude Code SDK使用)');
        this.claudeService = new ClaudeService();
        console.log('[AIService] ✅ AIService初期化完了（Claude Code SDK使用）');
    }

    async generateResponse(prompt: string, model?: string): Promise<AIResponse> {
        // 統一実装: OpenAI APIが有効な場合とClaude Code SDKで同じロジック
        /*
        // OpenAI API実装（本番用）
        // modelが指定されていない場合、フォールバック機能を使用
        if (!model) {
            return this.generateResponseWithFallback(prompt);
        }
        
        return this.generateSingleResponse(prompt, model);
        */

        // Claude Code SDK実装（現在有効）
        // OpenAI APIに切り替えても同じインターフェース・同じ単一API呼び出し
        return this.claudeService.generateResponse(prompt, model);
    }

    // OpenAI API実装（本番用・一時的にコメントアウト）
    /*
    private async generateSingleResponse(prompt: string, model: string): Promise<AIResponse> {
        const startTime = Date.now();
        console.log('[AIService] ==> AI分析リクエスト開始', {
            timestamp: new Date().toISOString(),
            model,
            promptLength: prompt.length,
            promptPreview: prompt.slice(0, 100) + (prompt.length > 100 ? '...' : '')
        });

        try {
            // モデルに応じてパラメータを調整
            const requestBody: any = {
                model,
                messages: [
                    {
                        role: 'user' as const,
                        content: prompt
                    }
                ]
            };

            // AI設定を環境変数から取得
            const aiConfig = LimitsConfig.getAIServiceConfig();
            
            // o3/o4系モデルの場合
            if (model.includes('o3') || model.includes('o4')) {
                requestBody.max_completion_tokens = aiConfig.maxCompletionTokens;
                requestBody.reasoning_effort = 'medium';
            } else {
                // GPT系モデルの場合
                requestBody.max_tokens = aiConfig.maxTokens;
                requestBody.temperature = 0.7;
            }

            console.log('[AIService] 📤 OpenAI APIリクエスト送信中...', {
                url: 'https://api.openai.com/v1/chat/completions',
                model: requestBody.model,
                hasApiKey: !!this.apiKey,
                apiKeyPrefix: this.apiKey ? this.apiKey.substring(0, 10) + '...' : 'なし',
                promptLength: prompt.length,
                requestBodySize: JSON.stringify(requestBody).length,
                maxTokens: requestBody.max_tokens || requestBody.max_completion_tokens,
                temperature: requestBody.temperature || 'N/A',
                reasoningEffort: requestBody.reasoning_effort || 'N/A'
            });

            console.log('[AIService] 🌐 fetch APIリクエスト開始...');
            
            // タイムアウト設定付きでAPIリクエストを実行（環境変数対応）
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), aiConfig.requestTimeout);
            
            let response;
            try {
                response = await fetch('https://api.openai.com/v1/chat/completions', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${this.apiKey}`,
                    },
                    body: JSON.stringify(requestBody),
                    signal: controller.signal
                });
                clearTimeout(timeoutId);
                console.log('[AIService] 📡 fetch APIレスポンス受信完了');
            } catch (fetchError) {
                clearTimeout(timeoutId);
                if (fetchError instanceof Error && fetchError.name === 'AbortError') {
                    console.error('[AIService] ⏰ APIリクエストタイムアウト');
                    throw new Error('AI分析リクエストがタイムアウトしました。時間をおいて再試行してください。');
                }
                throw fetchError;
            }

            const responseTime = Date.now() - startTime;
            console.log('[AIService] 📥 OpenAI APIレスポンス受信', {
                status: response.status,
                statusText: response.statusText,
                responseTime: `${responseTime}ms`,
                contentType: response.headers.get('content-type')
            });

            if (!response.ok) {
                const errorText = await response.text();
                let errorData;
                try {
                    errorData = JSON.parse(errorText);
                } catch {
                    errorData = { message: errorText };
                }

                console.error('[AIService] ❌ OpenAI APIエラー:', {
                    status: response.status,
                    statusText: response.statusText,
                    error: errorData,
                    responseTime: `${responseTime}ms`,
                    model: model
                });

                // モデルが利用できない場合のエラー処理
                if (response.status === 404 && errorData?.error?.code === 'model_not_found') {
                    console.warn(`[AIService] ⚠️ ${model}モデルが利用できません。`);
                    
                    throw new AppError(
                        404,
                        'MODEL_NOT_FOUND',
                        `${model}モデルは利用できません`,
                        {
                            ...errorData,
                            modelRequested: model
                        }
                    );
                }

                throw new AppError(
                    response.status,
                    'AI_API_ERROR',
                    'Failed to generate AI response',
                    errorData
                );
            }

            const data = await response.json() as any;
            
            console.log('[AIService] ✅ AI分析レスポンス成功', {
                responseId: data.id,
                model: data.model,
                outputLength: data.choices?.[0]?.message?.content?.length || 0,
                created: data.created,
                responseTime: `${responseTime}ms`,
                outputPreview: data.choices?.[0]?.message?.content?.slice(0, 200) + 
                             (data.choices?.[0]?.message?.content?.length > 200 ? '...' : '')
            });
            
            // AI APIレスポンスの詳細内容をログ出力
            console.log('[AIService] 📄 AI APIレスポンス詳細内容:');
            console.log('[AIService] 🔍 フルレスポンス:', JSON.stringify(data.choices?.[0]?.message?.content, null, 2));
            console.log('[AIService] 📊 レスポンス構造:', {
                hasChoices: !!data.choices,
                choicesLength: data.choices?.length || 0,
                hasMessage: !!data.choices?.[0]?.message,
                messageRole: data.choices?.[0]?.message?.role,
                contentType: typeof data.choices?.[0]?.message?.content
            });
            
            return {
                id: data.id,
                content: data.choices?.[0]?.message?.content || '',
                model: data.model,
                created: data.created,
            };
        } catch (error) {
            const responseTime = Date.now() - startTime;
            console.error('[AIService] ❌ AI分析エラー:', {
                error: error instanceof Error ? error.message : 'Unknown error',
                responseTime: `${responseTime}ms`,
                model,
                stack: error instanceof Error ? error.stack : undefined
            });

            if (error instanceof AppError) {
                throw error;
            }
            throw new AppError(
                500,
                'AI_SERVICE_ERROR',
                'Failed to communicate with AI service',
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
                
                // 最後のモデルでも失敗した場合はエラーを投げる
                if (i === this.defaultModels.length - 1) {
                    console.error('[AIService] ❌ 全てのモデルで失敗しました');
                    throw new AppError(
                        503,
                        'ALL_MODELS_FAILED',
                        'すべてのAIモデルが利用できません。時間をおいて再試行してください。',
                        error
                    );
                }
            }
        }
        
        throw new AppError(503, 'NO_MODELS_AVAILABLE', 'AIモデルが利用できません');
    }

    // 初期化時のテストは無効化（503エラー防止のため）
    */
} 