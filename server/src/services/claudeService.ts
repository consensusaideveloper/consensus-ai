import { AIResponse } from '../types';
import { AppError } from '../middleware/errorHandler';

/**
 * Claude Code SDK用のAIサービス（GitHubのREADMEに基づく正しい実装）
 * Maxプラン内で定額利用、CLI認証を使用
 */
export class ClaudeService {
    private readonly defaultModels = [
        'claude-3-5-sonnet-20241022', 
        'claude-3-5-haiku-20241022'
    ];
    
    // 動的インポート用のSDK関数
    private claudeSdk: any = null;
    private isEnhancedError: any = null;
    private hasResolution: any = null;
    private initialized = false;

    constructor() {
        console.log('[ClaudeService] 🔧 ClaudeService初期化', {
            timestamp: new Date().toISOString(),
            defaultModels: this.defaultModels,
            nodeEnv: process.env.NODE_ENV,
            provider: 'Claude Code SDK (CLI認証)',
            sdkVersion: '@instantlyeasy/claude-code-sdk-ts'
        });

        console.log('[ClaudeService] 🔑 Claude Code SDK認証方式: CLI認証（claude login）');
        console.log('[ClaudeService] 💰 Claude Code Max プラン内で定額利用');
        console.log('[ClaudeService] ✅ ClaudeService初期化完了（正しいClaude Code SDK実装）');
    }

    /**
     * Claude Code SDKを動的インポートで初期化
     * 安全な動的インポートを使用（eval使用を廃止）
     */
    private async initializeSdk(): Promise<void> {
        if (this.initialized) return;

        try {
            console.log('[ClaudeService] 📦 Claude Code SDK動的インポート開始...');
            
            // 安全な動的インポート（eval使用を廃止）
            const sdkModule = await import('@instantlyeasy/claude-code-sdk-ts');
            const { claude, isEnhancedError, hasResolution } = sdkModule;
            
            this.claudeSdk = claude;
            this.isEnhancedError = isEnhancedError;
            this.hasResolution = hasResolution;
            this.initialized = true;

            console.log('[ClaudeService] ✅ Claude Code SDK動的インポート成功');
            console.log('[ClaudeService] 🔧 SDK関数確認:', {
                claude: typeof this.claudeSdk,
                isEnhancedError: typeof this.isEnhancedError,
                hasResolution: typeof this.hasResolution
            });

        } catch (error) {
            console.error('[ClaudeService] ❌ Claude Code SDK動的インポートエラー:', error);
            throw new AppError(
                500,
                'SDK_IMPORT_ERROR',
                'Claude Code SDKの読み込みに失敗しました。Claude CLIで認証済みか確認してください。',
                error
            );
        }
    }

    async generateResponse(prompt: string, model?: string): Promise<AIResponse> {
        // SDK初期化を確認
        await this.initializeSdk();
        
        // modelが指定されていない場合、フォールバック機能を使用
        if (!model) {
            return this.generateResponseWithFallback(prompt);
        }
        
        return this.generateSingleResponse(prompt, model);
    }

    private async generateSingleResponse(prompt: string, model: string): Promise<AIResponse> {
        const startTime = Date.now();
        console.log('[ClaudeService] ==> Claude Code SDK分析リクエスト開始', {
            timestamp: new Date().toISOString(),
            model,
            promptLength: prompt.length,
            promptPreview: prompt.slice(0, 100) + (prompt.length > 100 ? '...' : ''),
            authMethod: 'Claude Code CLI'
        });

        try {
            console.log('[ClaudeService] 📤 Claude Code SDKリクエスト送信中...');
            
            // GitHubのREADMEに記載されている正しい使用方法（動的インポート版）
            const responseText = await this.claudeSdk()
                .query(prompt)
                .asText();

            const responseTime = Date.now() - startTime;
            
            console.log('[ClaudeService] ✅ Claude Code SDK分析レスポンス成功', {
                model: model,
                outputLength: responseText.length,
                responseTime: `${responseTime}ms`,
                outputPreview: responseText.slice(0, 200) + 
                             (responseText.length > 200 ? '...' : ''),
                maxPlan: 'Covered by Claude Code Max plan'
            });
            
            // Claude Code SDKレスポンスの詳細ログ
            console.log('[ClaudeService] 📄 Claude Code SDKレスポンス詳細:');
            console.log('[ClaudeService] 🔍 レスポンス内容:', JSON.stringify(responseText.slice(0, 500), null, 2));
            console.log('[ClaudeService] 📊 レスポンス情報:', {
                hasContent: !!responseText,
                contentLength: responseText.length,
                contentType: typeof responseText,
                isValidResponse: responseText.length > 0
            });
            
            return {
                id: `claude-code-sdk-${Date.now()}`,
                content: responseText,
                model: model,
                created: Math.floor(Date.now() / 1000),
            };
        } catch (error) {
            const responseTime = Date.now() - startTime;
            
            // READMEに記載されているエラーハンドリング（動的インポート版）
            if (this.isEnhancedError && this.isEnhancedError(error)) {
                console.error('[ClaudeService] ❌ Claude Code SDK Enhanced Error:', {
                    category: (error as any).category,
                    message: (error as any).message,
                    responseTime: `${responseTime}ms`,
                    model,
                });
                
                if (this.hasResolution && this.hasResolution(error)) {
                    console.error('[ClaudeService] 💡 解決方法:', (error as any).resolution);
                }
                
                // エラーカテゴリに基づく適切なAppError
                if ((error as any).category === 'authentication') {
                    throw new AppError(
                        401,
                        'CLAUDE_AUTH_ERROR',
                        'Claude Code SDK認証エラー。claude loginで再認証してください。',
                        error
                    );
                } else if ((error as any).category === 'quota') {
                    throw new AppError(
                        429,
                        'CLAUDE_QUOTA_ERROR',
                        'Claude Code SDKクォータ制限。時間をおいて再試行してください。',
                        error
                    );
                }
            }
            
            console.error('[ClaudeService] ❌ Claude Code SDK分析エラー:', {
                error: error instanceof Error ? error.message : 'Unknown error',
                responseTime: `${responseTime}ms`,
                model,
                stack: error instanceof Error ? error.stack : undefined,
                errorType: error instanceof Error ? error.constructor.name : typeof error
            });

            // Claude Code SDK特有のエラーハンドリング
            if (error instanceof Error) {
                if (error.message.includes('not authenticated') || error.message.includes('login')) {
                    throw new AppError(
                        401,
                        'CLAUDE_AUTH_ERROR',
                        'Claude Code SDK認証エラー。claude loginで再認証してください。',
                        error
                    );
                }
                
                if (error.message.includes('quota') || error.message.includes('limit')) {
                    throw new AppError(
                        429,
                        'CLAUDE_QUOTA_ERROR',
                        'Claude Code SDKクォータ制限。時間をおいて再試行してください。',
                        error
                    );
                }
            }

            throw new AppError(
                500,
                'AI_SERVICE_ERROR',
                'Claude Code SDKとの通信に失敗しました。',
                error
            );
        }
    }

    private async generateResponseWithFallback(prompt: string): Promise<AIResponse> {
        // SDK初期化を確認
        await this.initializeSdk();
        
        console.log('[ClaudeService] 🔄 フォールバック機能でモデル選択中...');
        
        for (let i = 0; i < this.defaultModels.length; i++) {
            const model = this.defaultModels[i];
            console.log(`[ClaudeService] 🧪 ${model}モデルを試行中... (${i + 1}/${this.defaultModels.length})`);
            
            try {
                const result = await this.generateSingleResponse(prompt, model);
                console.log(`[ClaudeService] ✅ ${model}モデルで成功！`);
                return result;
            } catch (error) {
                console.log(`[ClaudeService] ❌ ${model}モデル失敗:`, error instanceof Error ? error.message : String(error));
                
                // 最後のモデルでも失敗した場合はエラーを投げる
                if (i === this.defaultModels.length - 1) {
                    console.error('[ClaudeService] ❌ 全てのモデルで失敗しました');
                    console.error('[ClaudeService] 💡 Claude Code SDK認証状態を確認してください: claude login');
                    
                    // Claude Code SDK特有のトラブルシューティング情報
                    const troubleshooting = [
                        '1. Claude Code CLI認証確認: claude login',
                        '2. Claude Code Max プランの利用状況確認',
                        '3. ネットワーク接続確認',
                        '4. Claude Code CLIバージョン確認: claude --version'
                    ];
                    
                    console.error('[ClaudeService] 🔧 トラブルシューティング:', troubleshooting);
                    
                    throw new AppError(
                        503,
                        'ALL_MODELS_FAILED',
                        'すべてのClaudeモデルが利用できません。Claude Code SDK認証を確認してください。',
                        error
                    );
                }
            }
        }
        
        throw new AppError(503, 'NO_MODELS_AVAILABLE', 'Claudeモデルが利用できません');
    }
}