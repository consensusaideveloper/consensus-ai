import { ConsensusRequest, ConsensusResponse, AIResponse } from '../types';
import { AIService } from './aiService';
import { AppError } from '../middleware/errorHandler';
import { prisma } from '../lib/database';

export interface EnhancedConsensusRequest extends ConsensusRequest {
    projectId?: string;
    topicId?: string;
    includeOpinions?: boolean;
    analysisType?: 'general' | 'sentiment' | 'solution' | 'priority';
}

export interface EnhancedConsensusResponse extends ConsensusResponse {
    analysisType: string;
    insights: Array<{
        type: 'agreement' | 'disagreement' | 'suggestion' | 'concern';
        description: string;
        confidence: number;
        supportingEvidence: string[];
    }>;
    recommendations: Array<{
        action: string;
        rationale: string;
        priority: 'high' | 'medium' | 'low';
        stakeholders: string[];
    }>;
    sentimentBreakdown?: {
        positive: number;
        negative: number;
        neutral: number;
        trend: 'improving' | 'declining' | 'stable';
    };
}

export class EnhancedConsensusService {
    private readonly aiService: AIService;
    private readonly defaultModels = ['gpt-4.1-nano', 'gpt-4o-mini', 'gpt-4.1-mini'];

    constructor() {
        this.aiService = new AIService();
    }

    async generateEnhancedConsensus(request: EnhancedConsensusRequest, userId?: string): Promise<EnhancedConsensusResponse> {
        const startTime = Date.now();
        
        try {
            let contextualPrompt = request.prompt;
            let opinions: any[] = [];

            // プロジェクトまたはトピックから意見を取得
            if (request.includeOpinions && (request.projectId || request.topicId)) {
                opinions = await this.fetchOpinions(request.projectId, request.topicId, userId);
                
                if (opinions.length > 0) {
                    const opinionsContext = this.buildOpinionsContext(opinions);
                    contextualPrompt = `${request.prompt}\n\n以下の意見・フィードバックも考慮してください：\n${opinionsContext}`;
                }
            }

            // 🚀 統合版：単一API呼び出しでコンセンサス + 詳細分析を同時実行
            const unifiedAnalysisResult = await this.performUnifiedConsensusAnalysis(
                contextualPrompt,
                opinions,
                request.analysisType || 'general'
            );

            const responses = [{
                id: `unified-consensus-${Date.now()}`,
                content: unifiedAnalysisResult.consensus,
                model: 'unified-analysis',
                created: Math.floor(Date.now() / 1000)
            }];

            return {
                responses,
                consensus: unifiedAnalysisResult.consensus,
                metadata: {
                    totalResponses: 1, // 統合分析により1回のAPI呼び出し
                    modelsUsed: ['unified-analysis'],
                    processingTime: Date.now() - startTime
                },
                analysisType: request.analysisType || 'general',
                insights: unifiedAnalysisResult.insights,
                recommendations: unifiedAnalysisResult.recommendations,
                sentimentBreakdown: unifiedAnalysisResult.sentimentBreakdown,
            };
        } catch (error) {
            if (error instanceof AppError) {
                throw error;
            }
            throw new AppError(
                500,
                'ENHANCED_CONSENSUS_ERROR',
                'Failed to generate enhanced consensus',
                error
            );
        }
    }

    private async fetchOpinions(projectId?: string, topicId?: string, userId?: string): Promise<any[]> {
        if (!projectId && !topicId) return [];

        try {
            if (topicId) {
                // トピック別の意見を取得
                return await prisma.opinion.findMany({
                    where: { 
                        topicId,
                        ...(userId && {
                            project: { userId }
                        })
                    },
                    orderBy: { submittedAt: 'desc' },
                    take: 50 // 最新50件に制限
                });
            } else if (projectId) {
                // プロジェクト全体の意見を取得
                return await prisma.opinion.findMany({
                    where: { 
                        projectId,
                        ...(userId && {
                            project: { userId }
                        })
                    },
                    orderBy: { submittedAt: 'desc' },
                    take: 50 // 最新50件に制限
                });
            }
        } catch (error) {
            console.warn('Failed to fetch opinions for consensus:', error);
        }

        return [];
    }

    private buildOpinionsContext(opinions: any[]): string {
        return opinions.map((opinion, index) => 
            `意見${index + 1}: ${opinion.content}`
        ).join('\n\n');
    }

    private enhancePromptByType(prompt: string, analysisType: string): string {
        const typeInstructions = {
            general: '総合的な観点から分析し、バランスの取れたコンセンサスを形成してください。',
            sentiment: '感情や満足度の観点に重点を置いて分析し、関係者の気持ちを考慮したコンセンサスを形成してください。',
            solution: '実用的な解決策の提案に重点を置いて分析し、具体的で実行可能なアクションを含むコンセンサスを形成してください。',
            priority: '優先度と緊急性の観点から分析し、重要度の高い課題を特定するコンセンサスを形成してください。'
        };

        const instruction = typeInstructions[analysisType as keyof typeof typeInstructions] || typeInstructions.general;
        
        return `${prompt}\n\n分析方針: ${instruction}`;
    }

    /**
     * 🚀 統合コンセンサス分析：単一API呼び出しでコンセンサス + 詳細分析を同時実行
     */
    private async performUnifiedConsensusAnalysis(
        prompt: string,
        opinions: any[],
        analysisType: string
    ): Promise<{
        consensus: string;
        insights: any[];
        recommendations: any[];
        sentimentBreakdown?: any;
    }> {
        console.log('[ConsensusService] 🚀 統合コンセンサス分析開始 - 単一API呼び出し');
        
        try {
            const opinionsText = opinions.length > 0 ? 
                opinions.map((op, i) => `意見${i + 1} (${op.sentiment || 'neutral'}): ${op.content}`).join('\n\n') : 
                '意見データなし';

            const unifiedPrompt = `
以下の意見データを分析し、コンセンサスと詳細分析をJSON形式で提供してください。

分析タイプ: ${analysisType}

元のプロンプト: ${prompt}

意見データ:
${opinionsText}

以下の形式で回答してください：
{
  "consensus": "コンセンサスの要約・結論（200-500文字）",
  "insights": [
    {
      "type": "agreement/disagreement/suggestion/concern",
      "description": "インサイトの説明",
      "confidence": 0.8,
      "supportingEvidence": ["根拠1", "根拠2"]
    }
  ],
  "recommendations": [
    {
      "action": "推奨アクション",
      "rationale": "根拠",
      "priority": "high/medium/low",
      "stakeholders": ["関係者1", "関係者2"]
    }
  ],
  "sentimentBreakdown": {
    "positive": 0.4,
    "negative": 0.3,
    "neutral": 0.3,
    "overallTone": "balanced/positive/negative"
  }
}

注意事項：
- コンセンサスは異なる意見を統合した中間的結論を提供
- インサイトは具体的で実用的なものを提供
- 推奨事項は実行可能で具体的なものを提供

JSONのみを回答してください。`;

            const response = await this.aiService.generateResponse(unifiedPrompt);
            const result = JSON.parse(response.content);

            console.log('[ConsensusService] ✅ 統合コンセンサス分析完了', {
                apiCalls: 1,
                consensusLength: result.consensus?.length || 0,
                insightsCount: result.insights?.length || 0,
                recommendationsCount: result.recommendations?.length || 0
            });

            return {
                consensus: result.consensus || 'コンセンサスを生成できませんでした。',
                insights: result.insights || [],
                recommendations: result.recommendations || [],
                sentimentBreakdown: result.sentimentBreakdown || {
                    positive: 0.33,
                    negative: 0.33,
                    neutral: 0.34,
                    overallTone: 'balanced'
                }
            };

        } catch (error) {
            console.error('[ConsensusService] ❌ 統合コンセンサス分析エラー - フォールバック実行:', error);
            return this.generateUnifiedFallbackAnalysis(opinions);
        }
    }

    /**
     * 統合版フォールバック分析
     */
    private generateUnifiedFallbackAnalysis(opinions: any[]): {
        consensus: string;
        insights: any[];
        recommendations: any[];
        sentimentBreakdown: any;
    } {
        const positiveCount = opinions.filter(op => op.sentiment === 'positive').length;
        const negativeCount = opinions.filter(op => op.sentiment === 'negative').length;
        const neutralCount = opinions.length - positiveCount - negativeCount;
        
        const total = opinions.length || 1;
        
        return {
            consensus: `${opinions.length}件の意見を分析しました。意見は多様であり、異なる視点やアプローチが示されています。`,
            insights: [
                {
                    type: 'general',
                    description: '意見の多様性が確認されました',
                    confidence: 0.7,
                    supportingEvidence: ['複数の異なる意見', '様々な視点']
                }
            ],
            recommendations: [
                {
                    action: 'さらなる意見収集と分析',
                    rationale: 'より精度の高いコンセンサスのため',
                    priority: 'medium',
                    stakeholders: ['プロジェクトチーム']
                }
            ],
            sentimentBreakdown: {
                positive: positiveCount / total,
                negative: negativeCount / total,
                neutral: neutralCount / total,
                overallTone: positiveCount > negativeCount ? 'positive' : 
                           negativeCount > positiveCount ? 'negative' : 'balanced'
            }
        };
    }

    private async performEnhancedAnalysis(
        responses: AIResponse[],
        opinions: any[],
        analysisType: string
    ): Promise<{
        insights: any[];
        recommendations: any[];
        sentimentBreakdown?: any;
    }> {
        // ⚠️ 非推奨: 統合版を使用してください
        console.warn('[ConsensusService] ⚠️ performEnhancedAnalysisは非推奨です。performUnifiedConsensusAnalysisを使用してください。');
        
        // AI応答と意見を統合して詳細分析を実行
        const analysisPrompt = this.buildAnalysisPrompt(responses, opinions, analysisType);
        
        try {
            const analysisResponse = await this.aiService.generateResponse(analysisPrompt);
            return JSON.parse(analysisResponse.content);
        } catch (error) {
            // フォールバック：基本的な分析を返す
            return this.generateFallbackAnalysis(responses, opinions);
        }
    }

    private buildAnalysisPrompt(responses: AIResponse[], opinions: any[], analysisType: string): string {
        const responsesText = responses.map((r, i) => `AI応答${i + 1}: ${r.content}`).join('\n\n');
        const opinionsText = opinions.length > 0 ? 
            opinions.map((op, i) => `意見${i + 1} (${op.sentiment}): ${op.content}`).join('\n\n') : 
            '意見データなし';

        return `
以下のAI応答と意見データを分析し、詳細なインサイトと推奨事項を JSON形式で提供してください。

分析タイプ: ${analysisType}

AI応答:
${responsesText}

意見データ:
${opinionsText}

以下の形式で回答してください：
{
  "insights": [
    {
      "type": "agreement/disagreement/suggestion/concern",
      "description": "インサイトの説明",
      "confidence": 0.8,
      "supportingEvidence": ["根拠1", "根拠2"]
    }
  ],
  "recommendations": [
    {
      "action": "推奨アクション",
      "rationale": "根拠",
      "priority": "high/medium/low",
      "stakeholders": ["関係者1", "関係者2"]
    }
  ],
  "sentimentBreakdown": {
    "positive": 40,
    "negative": 35,
    "neutral": 25,
    "trend": "improving/declining/stable"
  }
}

分析要件:
1. 共通点と相違点を特定
2. 実用的で具体的な推奨事項を提供
3. 意見の感情傾向を分析
4. 信頼度スコアを付与
5. 関係者の視点を考慮
`;
    }

    private generateFallbackAnalysis(responses: AIResponse[], opinions: any[]): any {
        // AIが失敗した場合のフォールバック分析
        const sentimentCounts = { positive: 0, negative: 0, neutral: 0 };
        opinions.forEach(op => sentimentCounts[op.sentiment as keyof typeof sentimentCounts]++);
        
        const total = opinions.length || 1;
        const sentimentBreakdown = {
            positive: Math.round((sentimentCounts.positive / total) * 100),
            negative: Math.round((sentimentCounts.negative / total) * 100),
            neutral: Math.round((sentimentCounts.neutral / total) * 100),
            trend: sentimentCounts.positive > sentimentCounts.negative ? 'improving' : 
                   sentimentCounts.negative > sentimentCounts.positive ? 'declining' : 'stable'
        };

        return {
            insights: [
                {
                    type: 'agreement',
                    description: `${responses.length}つのAI応答が分析されました`,
                    confidence: 0.7,
                    supportingEvidence: ['複数のAIモデルからの一貫した分析']
                }
            ],
            recommendations: [
                {
                    action: '詳細な要件整理を実施する',
                    rationale: '収集された意見とAI分析に基づく次のステップ',
                    priority: 'medium',
                    stakeholders: ['プロジェクト管理者', '関係者']
                }
            ],
            sentimentBreakdown
        };
    }

    private async generateConsensusFromResponses(
        responses: AIResponse[],
        originalPrompt: string
    ): Promise<string> {
        const consensusPrompt = `
以下のプロンプトに対する複数のAI応答を基に、包括的で建設的なコンセンサスを日本語で作成してください：

元のプロンプト: "${originalPrompt}"

AI応答:
${responses.map((r, i) => `${i + 1}. ${r.content}`).join('\n\n')}

コンセンサス作成の指針:
1. 共通する主要なテーマと観点を特定する
2. 異なる視点があれば、それらを統合する方法を提案する
3. 実用的で実現可能な解決策を含める
4. 関係者全体の利益を考慮する
5. 明確で分かりやすい表現を使用する
6. 次のステップや具体的なアクションを含める

600文字以内で簡潔にまとめてください。
`;

        const consensusResponse = await this.aiService.generateResponse(consensusPrompt);
        return consensusResponse.content;
    }
}