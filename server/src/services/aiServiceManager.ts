import { AIResponse } from '../types';
import { AppError } from '../middleware/errorHandler';

/**
 * AI Sentiment分析結果インターフェース
 */
export interface SentimentAnalysisResult {
    sentiment: 'positive' | 'negative' | 'neutral';
    confidence: number; // 0.0 - 1.0
    reasoning: string;
    model?: string;
}

/**
 * AI Sentiment分析オプション
 */
export interface SentimentAnalysisOptions {
    language?: 'ja' | 'en';
    model?: string;
    timeout?: number;
}

/**
 * AI分析サービスの統合管理クラス（シングルトンパターン）
 * 
 * 目的:
 * - 複数のAIServiceWrapperインスタンス生成を防止
 * - API呼び出し回数の統一管理
 * - コスト最適化とパフォーマンス向上
 * - AI sentiment分析機能の提供
 */
export class AIServiceManager {
    private static instance: AIServiceManager;
    private aiServiceWrapper: any;
    private initializationPromise: Promise<void> | null = null;
    private isInitialized = false;
    
    // API使用量監視用
    private apiCallCount = 0;
    private lastResetTime = Date.now();
    private readonly MONITORING_INTERVAL = 24 * 60 * 60 * 1000; // 24時間

    private constructor() {
        console.log('[AIServiceManager] 🔧 AIServiceManager シングルトン初期化開始（Lazy Loading）');
        // コンストラクタでは初期化しない（遅延初期化）
    }

    /**
     * シングルトンインスタンス取得
     */
    static getInstance(): AIServiceManager {
        if (!AIServiceManager.instance) {
            AIServiceManager.instance = new AIServiceManager();
        }
        return AIServiceManager.instance;
    }

    /**
     * 遅延初期化（初回使用時のみ実行）
     */
    private async initialize(): Promise<void> {
        if (this.isInitialized) {
            return;
        }

        if (this.initializationPromise) {
            return this.initializationPromise;
        }

        this.initializationPromise = this.performInitialization();
        return this.initializationPromise;
    }

    private async performInitialization(): Promise<void> {
        try {
            console.log('[AIServiceManager] 🚀 AIServiceWrapper初期化開始（Lazy Loading）');
            const startTime = Date.now();
            
            // Lazy loading of AIServiceWrapper
            const { AIServiceWrapper } = await import('./aiServiceWrapper');
            this.aiServiceWrapper = new AIServiceWrapper();
            
            const initTime = Date.now() - startTime;
            console.log('[AIServiceManager] ✅ AIServiceWrapper初期化完了', {
                initializationTime: `${initTime}ms`,
                timestamp: new Date().toISOString()
            });

            this.isInitialized = true;
            this.initializationPromise = null;
        } catch (error) {
            console.error('[AIServiceManager] ❌ AIServiceWrapper初期化失敗:', error);
            this.initializationPromise = null;
            throw error;
        }
    }

    /**
     * 統一されたAI分析エンドポイント
     */
    async generateResponse(prompt: string, model?: string, context?: {
        purpose: 'main_analysis' | 'classification' | 'health_check' | 'incremental';
        projectId?: string;
        userId?: string;
    }): Promise<AIResponse> {
        await this.initialize();

        const startTime = Date.now();
        this.trackApiCall(context);

        console.log('[AIServiceManager] 🤖 AI分析リクエスト開始', {
            purpose: context?.purpose || 'unknown',
            projectId: context?.projectId || 'unknown',
            promptLength: prompt.length,
            model: model || 'auto-select',
            callCount: this.apiCallCount,
            timestamp: new Date().toISOString()
        });

        try {
            const response = await this.aiServiceWrapper.generateResponse(prompt, model);
            
            const duration = Date.now() - startTime;
            console.log('[AIServiceManager] ✅ AI分析レスポンス成功', {
                purpose: context?.purpose || 'unknown',
                duration: `${duration}ms`,
                responseLength: response.content.length,
                apiCallCount: this.apiCallCount
            });

            return response;
        } catch (error) {
            const duration = Date.now() - startTime;
            console.error('[AIServiceManager] ❌ AI分析エラー:', {
                purpose: context?.purpose || 'unknown',
                duration: `${duration}ms`,
                error: error instanceof Error ? error.message : 'Unknown error',
                apiCallCount: this.apiCallCount
            });
            throw error;
        }
    }

    /**
     * 軽量ヘルスチェック（API使用量を最小化）
     */
    async healthCheck(): Promise<{
        status: 'healthy' | 'unhealthy';
        serviceAvailable: boolean;
        responseTime?: number;
        error?: string;
    }> {
        try {
            await this.initialize();

            // 軽量な接続確認（実際のAPI呼び出しを避ける）
            const status = this.aiServiceWrapper.getServiceStatus();
            
            console.log('[AIServiceManager] 🏥 ヘルスチェック完了（軽量版）', {
                status: status.openaiAvailable ? 'healthy' : 'unhealthy',
                serviceAvailable: status.openaiAvailable,
                currentService: status.currentService,
                developmentMode: status.developmentMode
            });

            return {
                status: status.openaiAvailable ? 'healthy' : 'unhealthy',
                serviceAvailable: status.openaiAvailable,
                responseTime: 0 // 実際のAPI呼び出しなしのため
            };
        } catch (error) {
            console.error('[AIServiceManager] ❌ ヘルスチェック失敗:', error);
            return {
                status: 'unhealthy',
                serviceAvailable: false,
                error: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    }

    /**
     * API呼び出し統計情報の取得
     */
    getApiUsageStats(): {
        callCount: number;
        lastResetTime: string;
        hoursElapsed: number;
        callsPerHour: number;
    } {
        const hoursElapsed = (Date.now() - this.lastResetTime) / (1000 * 60 * 60);
        const callsPerHour = hoursElapsed > 0 ? this.apiCallCount / hoursElapsed : 0;

        return {
            callCount: this.apiCallCount,
            lastResetTime: new Date(this.lastResetTime).toISOString(),
            hoursElapsed: Math.round(hoursElapsed * 100) / 100,
            callsPerHour: Math.round(callsPerHour * 100) / 100
        };
    }

    /**
     * API呼び出し統計のリセット
     */
    resetApiUsageStats(): void {
        console.log('[AIServiceManager] 🔄 API使用量統計リセット', {
            previousCallCount: this.apiCallCount,
            resetTime: new Date().toISOString()
        });
        
        this.apiCallCount = 0;
        this.lastResetTime = Date.now();
    }

    /**
     * サービス状態の取得
     */
    getServiceInfo(): {
        initialized: boolean;
        serviceStatus?: any;
        apiUsage: any;
    } {
        return {
            initialized: this.isInitialized,
            serviceStatus: this.isInitialized ? this.aiServiceWrapper.getServiceStatus() : undefined,
            apiUsage: this.getApiUsageStats()
        };
    }

    /**
     * API呼び出し追跡
     */
    private trackApiCall(context?: {
        purpose: 'main_analysis' | 'classification' | 'health_check' | 'incremental';
        projectId?: string;
        userId?: string;
    }): void {
        this.apiCallCount++;
        
        // 24時間経過時に自動リセット
        if (Date.now() - this.lastResetTime > this.MONITORING_INTERVAL) {
            this.resetApiUsageStats();
        }

        console.log('[AIServiceManager] 📊 API呼び出し追跡', {
            callNumber: this.apiCallCount,
            purpose: context?.purpose || 'unknown',
            projectId: context?.projectId,
            timestamp: new Date().toISOString()
        });
    }

    /**
     * 緊急時のサービス再初期化
     */
    async forceReinitialize(): Promise<void> {
        console.warn('[AIServiceManager] ⚠️ 強制再初期化実行');
        
        this.isInitialized = false;
        this.initializationPromise = null;
        
        await this.initialize();
        
        console.log('[AIServiceManager] ✅ 強制再初期化完了');
    }

    /**
     * AI sentiment分析の実行
     * Phase 1: 独立実装、既存システムへの影響なし
     */
    async analyzeSentiment(
        content: string, 
        options: SentimentAnalysisOptions = {}
    ): Promise<SentimentAnalysisResult> {
        const startTime = Date.now();
        
        console.log('[AIServiceManager] 🧠 AI sentiment分析開始:', {
            contentLength: content.length,
            contentPreview: content.substring(0, 100) + (content.length > 100 ? '...' : ''),
            options,
            timestamp: new Date().toISOString()
        });

        try {
            // 入力検証
            if (!content || content.trim().length === 0) {
                throw new AppError(400, 'EMPTY_CONTENT', 'Content cannot be empty');
            }

            if (content.length > 5000) {
                throw new AppError(400, 'CONTENT_TOO_LONG', 'Content exceeds maximum length of 5000 characters');
            }

            // AI分析プロンプト構築
            const analysisPrompt = this.buildSentimentAnalysisPrompt(content, options.language || 'ja');

            // 既存のgenerateResponseメソッドを使用
            const aiResponse = await this.generateResponse(analysisPrompt, options.model, {
                purpose: 'classification',
                projectId: 'sentiment-analysis',
                userId: 'ai-sentiment-api'
            });

            // レスポンス解析
            const result = this.parseAnalysisResponse(aiResponse.content);
            
            const responseTime = Date.now() - startTime;
            
            console.log('[AIServiceManager] ✅ AI sentiment分析完了:', {
                sentiment: result.sentiment,
                confidence: result.confidence,
                responseTime: `${responseTime}ms`,
                model: result.model
            });

            return result;

        } catch (error) {
            const responseTime = Date.now() - startTime;
            console.error('[AIServiceManager] ❌ AI sentiment分析エラー:', {
                error: error instanceof Error ? error.message : 'Unknown error',
                responseTime: `${responseTime}ms`,
                contentLength: content.length
            });
            
            if (error instanceof AppError) {
                throw error;
            }
            
            throw new AppError(
                500, 
                'SENTIMENT_ANALYSIS_ERROR', 
                `Sentiment analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`
            );
        }
    }

    /**
     * AIサービス接続テスト（sentiment分析用）
     */
    async testConnection(): Promise<boolean> {
        try {
            console.log('[AIServiceManager] 🔍 AI接続テスト開始');
            
            const healthResult = await this.healthCheck();
            return healthResult.status === 'healthy';
            
        } catch (error) {
            console.error('[AIServiceManager] ❌ AI接続テストエラー:', error);
            return false;
        }
    }

    /**
     * sentiment分析用プロンプト構築
     */
    private buildSentimentAnalysisPrompt(content: string, language: 'ja' | 'en'): string {
        if (language === 'ja') {
            return `以下の意見について、その意見の賛否スタンス（stance）を分析してください。

【重要】感情ではなく、提案や政策に対する賛成・反対・中立の立場を判定してください。

意見内容:
「${content}」

分析観点:
1. この意見は提案に対して賛成の立場か？
2. この意見は提案に対して反対の立場か？  
3. この意見は中立的な立場か？

判定基準:
- positive: 提案を支持・賛成している
- negative: 提案に反対・批判している  
- neutral: 中立的、条件付き、または判断が困難

以下のJSON形式で回答してください:
{
  "sentiment": "positive|negative|neutral",
  "confidence": 0.0-1.0の数値,
  "reasoning": "判定理由の説明"
}`;
        } else {
            return `Analyze the stance of the following opinion regarding a proposal or policy.

【Important】Determine the agree/disagree/neutral stance, not emotional sentiment.

Opinion content:
"${content}"

Analysis perspective:
1. Does this opinion support/agree with the proposal?
2. Does this opinion oppose/disagree with the proposal?
3. Does this opinion take a neutral stance?

Judgment criteria:
- positive: Supports/agrees with the proposal
- negative: Opposes/criticizes the proposal
- neutral: Neutral, conditional, or difficult to determine

Please respond in the following JSON format:
{
  "sentiment": "positive|negative|neutral",
  "confidence": 0.0-1.0 numeric value,
  "reasoning": "Explanation of the judgment"
}`;
        }
    }

    /**
     * AI分析レスポンス解析
     */
    private parseAnalysisResponse(response: string): SentimentAnalysisResult {
        try {
            console.log('[AIServiceManager] 🔍 AIレスポンス解析中:', {
                responseLength: response.length,
                responsePreview: response.substring(0, 200) + (response.length > 200 ? '...' : '')
            });

            // JSON部分を抽出
            let jsonMatch = response.match(/\{[\s\S]*\}/);
            if (!jsonMatch) {
                // JSONブロックを探す
                jsonMatch = response.match(/```json\s*\n([\s\S]*?)\n\s*```/);
                if (jsonMatch) {
                    jsonMatch[0] = jsonMatch[1];
                }
            }

            if (!jsonMatch) {
                console.warn('[AIServiceManager] ⚠️ JSON形式が見つからない、パターンマッチングで解析');
                return this.parseResponseByPattern(response);
            }

            const jsonResult = JSON.parse(jsonMatch[0]);

            // 結果検証
            const sentiment = this.validateSentiment(jsonResult.sentiment);
            const confidence = this.validateConfidence(jsonResult.confidence);
            const reasoning = jsonResult.reasoning || 'No reasoning provided';

            console.log('[AIServiceManager] ✅ AIレスポンス解析成功:', {
                sentiment,
                confidence,
                reasoning: reasoning.substring(0, 100) + (reasoning.length > 100 ? '...' : '')
            });

            return {
                sentiment,
                confidence,
                reasoning,
                model: 'ai-service-manager'
            };

        } catch (error) {
            console.error('[AIServiceManager] ❌ AIレスポンス解析エラー:', error);
            console.log('[AIServiceManager] 🔄 パターンマッチングにフォールバック');
            return this.parseResponseByPattern(response);
        }
    }

    /**
     * パターンマッチングによるレスポンス解析（フォールバック）
     */
    private parseResponseByPattern(response: string): SentimentAnalysisResult {
        const lowerResponse = response.toLowerCase();
        
        let sentiment: 'positive' | 'negative' | 'neutral' = 'neutral';
        let confidence = 0.5;
        
        // 賛成パターン
        if (lowerResponse.includes('positive') || lowerResponse.includes('賛成') || lowerResponse.includes('支持')) {
            sentiment = 'positive';
            confidence = 0.7;
        }
        // 反対パターン
        else if (lowerResponse.includes('negative') || lowerResponse.includes('反対') || lowerResponse.includes('批判')) {
            sentiment = 'negative';
            confidence = 0.7;
        }
        // 中立パターン
        else if (lowerResponse.includes('neutral') || lowerResponse.includes('中立') || lowerResponse.includes('どちらでもない')) {
            sentiment = 'neutral';
            confidence = 0.6;
        }

        console.log('[AIServiceManager] ⚠️ パターンマッチング解析結果:', { sentiment, confidence });

        return {
            sentiment,
            confidence,
            reasoning: 'Parsed by pattern matching due to JSON parsing failure',
            model: 'pattern-fallback'
        };
    }

    /**
     * sentiment値検証
     */
    private validateSentiment(sentiment: any): 'positive' | 'negative' | 'neutral' {
        if (sentiment === 'positive' || sentiment === 'negative' || sentiment === 'neutral') {
            return sentiment;
        }
        console.warn('[AIServiceManager] ⚠️ 不正なsentiment値、neutralに設定:', sentiment);
        return 'neutral';
    }

    /**
     * confidence値検証
     */
    private validateConfidence(confidence: any): number {
        const num = Number(confidence);
        if (isNaN(num) || num < 0 || num > 1) {
            console.warn('[AIServiceManager] ⚠️ 不正なconfidence値、0.5に設定:', confidence);
            return 0.5;
        }
        return num;
    }
}

/**
 * 便利関数: グローバルインスタンス取得
 */
export const getAIServiceManager = (): AIServiceManager => {
    return AIServiceManager.getInstance();
};