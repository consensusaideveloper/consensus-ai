import { OpinionPriority, ExistingTopic } from './opinionPriorityCalculator';
import { getAIServiceManager } from './aiServiceManager';
import { AppError } from '../middleware/errorHandler';
import { LimitsConfig } from '../config/limits';

/**
 * 統合分析結果インターフェース
 */
export interface UnifiedAnalysisResult {
  analysisMetadata: AnalysisMetadata;
  classifications: OpinionClassification[];
  newTopicClusters: NewTopicCluster[];
  insights: AnalysisInsight[];
  executionInfo: ExecutionInfo;
}

export interface AnalysisMetadata {
  totalProcessed: number;
  timestamp: string;
  analysisType: 'unified_single_pass';
  model: string;
  tokenUsage: {
    estimated: number;
    actual?: number;
  };
}

export interface OpinionClassification {
  opinionId: string;
  action: 'ASSIGN_TO_EXISTING' | 'CREATE_NEW_TOPIC';
  targetTopicId?: string;
  newTopicCluster?: string;
  confidence: number;
  reasoning: string;
  alternativeOptions?: Array<{
    action: 'ASSIGN_TO_EXISTING' | 'CREATE_NEW_TOPIC';
    targetId: string;
    confidence: number;
  }>;
}

export interface NewTopicCluster {
  clusterId: string;
  suggestedName: string;
  suggestedSummary: string;
  opinionIds: string[];
  priority: 'high' | 'medium' | 'low';
  confidence: number;
  keywords: string[];
  theme: string;
}

export interface AnalysisInsight {
  type: 'trend' | 'concern' | 'opportunity' | 'contradiction' | 'consensus';
  title: string;
  description: string;
  affectedOpinions: string[];
  priority: 'high' | 'medium' | 'low';
  confidence: number;
  suggestedActions?: string[];
}

export interface ExecutionInfo {
  executionTime: number;
  apiCallTime: number;
  parsingTime: number;
  validationTime: number;
  retryCount: number;
  errorDetails?: string;
}

/**
 * 統合分析エンジン
 * 
 * 核心機能:
 * - 厳選された意見を1回のAPI呼び出しで包括分析
 * - 既存トピックとの照合と新トピック生成
 * - 構造化された分析結果の生成
 * - 高度な洞察の自動抽出
 */
export class UnifiedAnalysisEngine {
  // 環境変数対応: AIサービス設定を取得
  private getDefaultModel(): string {
    return LimitsConfig.getAIServiceConfig().defaultModel;
  }
  
  // 環境変数対応: AI信頼性設定を取得
  private getMaxRetryCount(): number {
    return LimitsConfig.getAIReliabilityConfig().maxRetryCount;
  }
  
  // 環境変数対応: 信頼度閾値を取得
  private getConfidenceThreshold(): number {
    return LimitsConfig.getAIReliabilityConfig().confidenceThreshold;
  }
  
  /**
   * 統合分析の実行
   */
  async performUnifiedAnalysis(
    selectedOpinions: OpinionPriority[],
    existingTopics: ExistingTopic[],
    projectId: string,
    options: {
      model?: string;
      includeInsights?: boolean;
      strictValidation?: boolean;
    } = {}
  ): Promise<UnifiedAnalysisResult> {
    const startTime = Date.now();
    
    console.log('[UnifiedAnalysis] 🚀 統合分析開始:', {
      selectedOpinions: selectedOpinions.length,
      existingTopics: existingTopics.length,
      projectId,
      model: options.model || this.getDefaultModel(),
      timestamp: new Date().toISOString()
    });
    
    try {
      // Step 1: プロンプト構築
      const prompt = this.buildUnifiedAnalysisPrompt(
        selectedOpinions, 
        existingTopics, 
        options.includeInsights ?? true
      );
      
      const estimatedTokens = this.estimatePromptTokens(prompt);
      console.log('[UnifiedAnalysis] 📝 プロンプト構築完了:', {
        estimatedTokens,
        promptLength: prompt.length
      });
      
      // Step 2: AI分析実行
      const aiResult = await this.executeAIAnalysis(
        prompt, 
        options.model || this.getDefaultModel(),
        projectId
      );
      
      // Step 3: 結果解析と検証
      const parsedResult = await this.parseAndValidateResponse(
        aiResult.content,
        selectedOpinions,
        existingTopics,
        options.strictValidation ?? true
      );
      
      const executionTime = Date.now() - startTime;
      
      const result: UnifiedAnalysisResult = {
        analysisMetadata: {
          totalProcessed: selectedOpinions.length,
          timestamp: new Date().toISOString(),
          analysisType: 'unified_single_pass',
          model: options.model || this.getDefaultModel(),
          tokenUsage: {
            estimated: estimatedTokens,
            actual: aiResult.tokensUsed
          }
        },
        classifications: parsedResult.classifications,
        newTopicClusters: parsedResult.newTopicClusters,
        insights: parsedResult.insights,
        executionInfo: {
          executionTime,
          apiCallTime: aiResult.executionTime,
          parsingTime: parsedResult.parsingTime,
          validationTime: parsedResult.validationTime,
          retryCount: aiResult.retryCount,
          errorDetails: aiResult.errorDetails
        }
      };
      
      console.log('[UnifiedAnalysis] ✅ 統合分析完了:', {
        totalProcessed: result.analysisMetadata.totalProcessed,
        classificationsCount: result.classifications.length,
        newTopicsCount: result.newTopicClusters.length,
        insightsCount: result.insights.length,
        executionTime: `${executionTime}ms`,
        tokenUsage: result.analysisMetadata.tokenUsage
      });
      
      return result;
      
    } catch (error) {
      console.error('[UnifiedAnalysis] ❌ 統合分析エラー:', error);
      throw new AppError(
        500,
        'UNIFIED_ANALYSIS_ERROR',
        '統合分析に失敗しました',
        error
      );
    }
  }
  
  /**
   * 統合分析プロンプトの構築
   */
  private buildUnifiedAnalysisPrompt(
    opinions: OpinionPriority[],
    existingTopics: ExistingTopic[],
    includeInsights: boolean
  ): string {
    // 意見セクションの構築
    const opinionsSection = opinions.map((op, index) => {
      const reasonsText = op.reasons.length > 0 ? ` (${op.reasons.join(', ')})` : '';
      return `${index + 1}. [ID: ${op.opinionId}] [優先度: ${op.priority}] [トークン: ${op.tokenCount}]${reasonsText}\n` +
             `   内容: "${op.content}"\n` +
             `   投稿日時: ${op.submittedAt.toISOString()}`;
    }).join('\n\n');
    
    // 既存トピックセクションの構築
    const topicsSection = existingTopics.length > 0 
      ? existingTopics.map((topic, index) => {
          const keywordsText = topic.keywords && topic.keywords.length > 0 
            ? ` [キーワード: ${topic.keywords.join(', ')}]` : '';
          return `${index + 1}. [ID: ${topic.id}] [件数: ${topic.count}件]${keywordsText}\n` +
                 `   名前: "${topic.name}"\n` +
                 `   概要: "${topic.summary}"`;
        }).join('\n\n')
      : 'なし（初回分析）';
    
    // 洞察分析指示の構築
    const insightsInstruction = includeInsights ? `
4. 横断的洞察の抽出:
   - 意見間の傾向、対立、合意点を特定
   - 重要な課題や機会を抽出
   - 各洞察に影響される意見IDを明記` : '';
    
    return `あなたは優秀な意見分析AIです。以下の厳選された新しい意見を効率的に分析し、既存トピックへの分類または新トピック作成を行ってください。

【厳選された新しい意見】（優先度順）
${opinionsSection}

【既存トピック一覧】
${topicsSection}

【分析タスク】
1. 各意見を既存トピックに分類するか、新しいトピックを作成するかを判定
2. 新トピックが必要な場合は、類似する意見をグループ化して統合トピックを作成
3. 各判定に対する信頼度と理由を提供${insightsInstruction}

【分類ルール】
- 既存トピックとの類似度が75%以上: 既存トピックに分類
- 類似度が75%未満: 新しいトピックを作成
- 複数の意見で同様のテーマ: 同じ新トピッククラスターにまとめて分類
- 判定が曖昧な場合は信頼度を低めに設定
- 各意見の優先度スコアを判定の重要な参考とする

【出力形式】
以下のJSON形式で応答してください：

{
  "analysisMetadata": {
    "totalProcessed": ${opinions.length},
    "timestamp": "${new Date().toISOString()}",
    "analysisType": "unified_single_pass",
    "processingNotes": "全体的な分析方針や注意点"
  },
  "classifications": [
    {
      "opinionId": "意見ID",
      "action": "ASSIGN_TO_EXISTING" または "CREATE_NEW_TOPIC",
      "targetTopicId": "既存トピックID（ASSIGN_TO_EXISTINGの場合）",
      "newTopicCluster": "新トピッククラスターID（CREATE_NEW_TOPICの場合）",
      "confidence": 0.0-1.0,
      "reasoning": "判定理由（詳細）",
      "alternativeOptions": [
        {
          "action": "ASSIGN_TO_EXISTING",
          "targetId": "代替案のID",
          "confidence": 0.0-1.0
        }
      ]
    }
  ],
  "newTopicClusters": [
    {
      "clusterId": "クラスターID",
      "suggestedName": "提案トピック名",
      "suggestedSummary": "提案概要",
      "opinionIds": ["含まれる意見IDのリスト"],
      "priority": "high/medium/low",
      "confidence": 0.0-1.0,
      "keywords": ["キーワードのリスト"],
      "theme": "テーマの要約"
    }
  ],
  "insights": [
    {
      "type": "trend/concern/opportunity/contradiction/consensus",
      "title": "洞察タイトル",
      "description": "詳細説明",
      "affectedOpinions": ["関連意見IDのリスト"],
      "priority": "high/medium/low",
      "confidence": 0.0-1.0,
      "suggestedActions": ["推奨アクション"]
    }
  ]
}

【重要事項】
- 類似する意見は必ず同じ新トピッククラスターにまとめる
- 判定に迷う場合は alternative_options を活用
- 各意見の優先度スコアを重要度判定の参考にする
- JSON形式を厳密に守り、余計なテキストは含めない
- すべての意見に対して必ず分類判定を行う`;
  }
  
  /**
   * AI分析の実行
   */
  private async executeAIAnalysis(
    prompt: string,
    model: string,
    projectId: string
  ): Promise<{
    content: string;
    executionTime: number;
    tokensUsed?: number;
    retryCount: number;
    errorDetails?: string;
  }> {
    const startTime = Date.now();
    let retryCount = 0;
    let lastError: Error | null = null;
    
    while (retryCount < this.getMaxRetryCount()) {
      try {
        console.log(`[UnifiedAnalysis] 🤖 AI分析実行 (試行 ${retryCount + 1}/${this.getMaxRetryCount()})`);
        
        const aiServiceManager = getAIServiceManager();
        const response = await aiServiceManager.generateResponse(
          prompt,
          model,
          {
            purpose: 'main_analysis',
            projectId
          }
        );
        
        const executionTime = Date.now() - startTime;
        
        console.log('[UnifiedAnalysis] ✅ AI分析完了:', {
          executionTime: `${executionTime}ms`,
          retryCount,
          responseLength: response.content.length
        });
        
        return {
          content: response.content,
          executionTime,
          tokensUsed: undefined,
          retryCount,
          errorDetails: lastError?.message
        };
        
      } catch (error) {
        retryCount++;
        lastError = error as Error;
        
        console.warn(`[UnifiedAnalysis] ⚠️ AI分析失敗 (試行 ${retryCount}/${this.getMaxRetryCount()}):`, error);
        
        if (retryCount >= this.getMaxRetryCount()) {
          throw new AppError(
            500,
            'AI_ANALYSIS_FAILED',
            `AI分析が${this.getMaxRetryCount()}回失敗しました`,
            error
          );
        }
        
        // 段階的リトライ間隔
        await this.sleep(retryCount * 1000);
      }
    }
    
    throw new AppError(500, 'UNEXPECTED_ERROR', '予期しないエラーが発生しました');
  }
  
  /**
   * AI応答の解析と検証
   */
  private async parseAndValidateResponse(
    aiResponse: string,
    originalOpinions: OpinionPriority[],
    existingTopics: ExistingTopic[],
    strictValidation: boolean
  ): Promise<{
    classifications: OpinionClassification[];
    newTopicClusters: NewTopicCluster[];
    insights: AnalysisInsight[];
    parsingTime: number;
    validationTime: number;
  }> {
    const parseStart = Date.now();
    
    try {
      // JSON部分を抽出
      const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('AI応答にJSON形式が見つかりません');
      }
      
      const parsedData = JSON.parse(jsonMatch[0]);
      const parsingTime = Date.now() - parseStart;
      
      // バリデーション開始
      const validationStart = Date.now();
      
      const validatedResult = await this.validateParsedData(
        parsedData,
        originalOpinions,
        existingTopics,
        strictValidation
      );
      
      const validationTime = Date.now() - validationStart;
      
      console.log('[UnifiedAnalysis] 📊 応答解析完了:', {
        parsingTime: `${parsingTime}ms`,
        validationTime: `${validationTime}ms`,
        classificationsCount: validatedResult.classifications.length,
        newTopicsCount: validatedResult.newTopicClusters.length,
        insightsCount: validatedResult.insights.length
      });
      
      return {
        ...validatedResult,
        parsingTime,
        validationTime
      };
      
    } catch (error) {
      console.error('[UnifiedAnalysis] ❌ 応答解析エラー:', error);
      
      // フォールバック: 基本的な分類結果を生成
      return this.createFallbackResult(originalOpinions, parseStart);
    }
  }
  
  /**
   * 解析データの検証
   */
  private async validateParsedData(
    data: any,
    originalOpinions: OpinionPriority[],
    existingTopics: ExistingTopic[],
    strictValidation: boolean
  ): Promise<{
    classifications: OpinionClassification[];
    newTopicClusters: NewTopicCluster[];
    insights: AnalysisInsight[];
  }> {
    const result = {
      classifications: [] as OpinionClassification[],
      newTopicClusters: [] as NewTopicCluster[],
      insights: [] as AnalysisInsight[]
    };
    
    // 分類結果の検証
    if (data.classifications && Array.isArray(data.classifications)) {
      for (const classification of data.classifications) {
        const originalOpinion = originalOpinions.find(op => op.opinionId === classification.opinionId);
        
        if (originalOpinion && this.isValidClassification(classification, existingTopics)) {
          result.classifications.push({
            opinionId: classification.opinionId,
            action: classification.action,
            targetTopicId: classification.targetTopicId,
            newTopicCluster: classification.newTopicCluster,
            confidence: Math.max(0, Math.min(1, classification.confidence || 0.5)),
            reasoning: classification.reasoning || '自動生成された判定',
            alternativeOptions: classification.alternativeOptions || []
          });
        } else if (strictValidation) {
          console.warn('[UnifiedAnalysis] ⚠️ 無効な分類:', classification);
        }
      }
    }
    
    // 新トピッククラスターの検証
    if (data.newTopicClusters && Array.isArray(data.newTopicClusters)) {
      for (const cluster of data.newTopicClusters) {
        if (this.isValidNewTopicCluster(cluster)) {
          result.newTopicClusters.push({
            clusterId: cluster.clusterId,
            suggestedName: cluster.suggestedName || `新トピック${Date.now()}`,
            suggestedSummary: cluster.suggestedSummary || '新しく作成されたトピック',
            opinionIds: cluster.opinionIds || [],
            priority: ['high', 'medium', 'low'].includes(cluster.priority) ? cluster.priority : 'medium',
            confidence: Math.max(0, Math.min(1, cluster.confidence || 0.5)),
            keywords: cluster.keywords || [],
            theme: cluster.theme || '未分類'
          });
        }
      }
    }
    
    // 洞察の検証
    if (data.insights && Array.isArray(data.insights)) {
      for (const insight of data.insights) {
        if (this.isValidInsight(insight)) {
          result.insights.push({
            type: insight.type,
            title: insight.title || '洞察',
            description: insight.description || '',
            affectedOpinions: insight.affectedOpinions || [],
            priority: ['high', 'medium', 'low'].includes(insight.priority) ? insight.priority : 'medium',
            confidence: Math.max(0, Math.min(1, insight.confidence || 0.5)),
            suggestedActions: insight.suggestedActions || []
          });
        }
      }
    }
    
    return result;
  }
  
  /**
   * 分類結果の妥当性チェック
   */
  private isValidClassification(classification: any, existingTopics: ExistingTopic[]): boolean {
    if (!classification.opinionId || !classification.action) {
      return false;
    }
    
    if (classification.action === 'ASSIGN_TO_EXISTING') {
      return classification.targetTopicId && 
             existingTopics.some(topic => topic.id === classification.targetTopicId);
    }
    
    if (classification.action === 'CREATE_NEW_TOPIC') {
      return classification.newTopicCluster && typeof classification.newTopicCluster === 'string';
    }
    
    return false;
  }
  
  /**
   * 新トピッククラスターの妥当性チェック
   */
  private isValidNewTopicCluster(cluster: any): boolean {
    return cluster.clusterId && 
           cluster.suggestedName && 
           Array.isArray(cluster.opinionIds);
  }
  
  /**
   * 洞察の妥当性チェック
   */
  private isValidInsight(insight: any): boolean {
    const validTypes = ['trend', 'concern', 'opportunity', 'contradiction', 'consensus'];
    return insight.type && 
           validTypes.includes(insight.type) &&
           insight.title &&
           insight.description;
  }
  
  /**
   * フォールバック結果の生成
   */
  private createFallbackResult(
    originalOpinions: OpinionPriority[],
    parseStart: number
  ): {
    classifications: OpinionClassification[];
    newTopicClusters: NewTopicCluster[];
    insights: AnalysisInsight[];
    parsingTime: number;
    validationTime: number;
  } {
    console.log('[UnifiedAnalysis] 🔄 フォールバック結果生成中...');
    
    const fallbackClassifications: OpinionClassification[] = originalOpinions.map(opinion => ({
      opinionId: opinion.opinionId,
      action: 'CREATE_NEW_TOPIC' as const,
      newTopicCluster: `fallback_cluster_${opinion.opinionId}`,
      confidence: 0.3,
      reasoning: 'AI応答解析失敗のためフォールバック処理で新トピック作成'
    }));
    
    const fallbackClusters: NewTopicCluster[] = originalOpinions.map(opinion => ({
      clusterId: `fallback_cluster_${opinion.opinionId}`,
      suggestedName: `【新トピック】${opinion.content.substring(0, 20)}...`,
      suggestedSummary: `${opinion.content.substring(0, 100)}...に関する意見`,
      opinionIds: [opinion.opinionId],
      priority: 'medium' as const,
      confidence: 0.3,
      keywords: [],
      theme: '自動生成'
    }));
    
    const processingTime = Date.now() - parseStart;
    
    return {
      classifications: fallbackClassifications,
      newTopicClusters: fallbackClusters,
      insights: [],
      parsingTime: processingTime,
      validationTime: 0
    };
  }
  
  /**
   * プロンプトのトークン数推定
   */
  private estimatePromptTokens(prompt: string): number {
    return Math.ceil(prompt.length * 1.3);
  }
  
  /**
   * 待機処理
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}