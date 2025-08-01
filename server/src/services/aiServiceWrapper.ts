import { AIService } from './aiService';
import { AIResponse } from '../types';
import { AppError } from '../middleware/errorHandler';

/**
 * AI分析サービスのラッパークラス
 * AI APIサービスを統一的に使用（シングルトンパターン対応）
 * Claude Code SDK / OpenAI API 両対応
 */
export class AIServiceWrapper {
    private static aiServiceInstance?: AIService;
    private isDevelopmentMode: boolean;

    constructor() {
        this.isDevelopmentMode = process.env.NODE_ENV === 'development';
        
        console.log('[AIServiceWrapper] 🔧 AIServiceWrapper初期化', {
            timestamp: new Date().toISOString(),
            isDevelopmentMode: this.isDevelopmentMode,
            nodeEnv: process.env.NODE_ENV,
            useAiService: process.env.USE_AI_SERVICE
        });

        this.initializeServices();
        console.log('[AIServiceWrapper] ✅ AIServiceWrapper初期化完了');
    }

    private initializeServices(): void {
        try {
            // AI APIサービスをシングルトンパターンで初期化（統一実装）
            if (!AIServiceWrapper.aiServiceInstance) {
                try {
                    AIServiceWrapper.aiServiceInstance = new AIService();
                    console.log('[AIServiceWrapper] ✅ AI API初期化完了（シングルトン）');
                } catch (apiError) {
                    console.error('[AIServiceWrapper] ❌ AI API初期化失敗:', apiError);
                    throw new Error('AI APIサービスが利用できません');
                }
            } else {
                console.log('[AIServiceWrapper] ♻️ AI API既存インスタンス使用（シングルトン）');
            }
        } catch (error) {
            console.error('[AIServiceWrapper] ❌ サービス初期化エラー:', error);
            throw error;
        }
    }

    async generateResponse(prompt: string, model?: string): Promise<AIResponse> {
        console.log('[AIServiceWrapper] 🔄 AI分析リクエスト開始', {
            promptLength: prompt.length,
            model: model || 'auto-select'
        });

        try {
            if (AIServiceWrapper.aiServiceInstance) {
                console.log('[AIServiceWrapper] 📞 OpenAI APIを使用（シングルトン）');
                return await AIServiceWrapper.aiServiceInstance.generateResponse(prompt, model);
            } else {
                throw new AppError(503, 'NO_SERVICE_AVAILABLE', 'OpenAI APIサービスが利用できません');
            }
        } catch (error) {
            console.error('[AIServiceWrapper] ❌ AI分析エラー:', {
                error: error instanceof Error ? error.message : 'Unknown error'
            });
            throw error;
        }
    }

    /**
     * 現在使用中のサービス名を取得
     */
    getCurrentServiceName(): string {
        return 'OpenAI API';
    }

    /**
     * 開発モードの状態を取得
     */
    isDevelopmentModeActive(): boolean {
        return this.isDevelopmentMode;
    }

    /**
     * 利用可能なサービスの状態を取得
     */
    getServiceStatus(): {
        openaiAvailable: boolean;
        currentService: string;
        developmentMode: boolean;
    } {
        return {
            openaiAvailable: !!AIServiceWrapper.aiServiceInstance,
            currentService: this.getCurrentServiceName(),
            developmentMode: this.isDevelopmentMode
        };
    }
}