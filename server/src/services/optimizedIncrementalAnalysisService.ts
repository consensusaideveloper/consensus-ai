import { prisma } from '../lib/database';
import { getAIServiceManager } from './aiServiceManager';
import { AppError } from '../middleware/errorHandler';
import { Opinion, Topic } from '../types';
import { LimitsConfig } from '../config/limits';

/**
 * 最適化された増分分析サービス
 * 
 * 主要改善点:
 * - 真の増分分析（新規回答のみ処理）
 * - OpinionAnalysisState完全活用
 * - 1回のAPI呼び出しで完了
 * - スマートバッチ処理
 * - 文字数制限対応
 */

export interface OptimizedAnalysisOptions {
  maxTokensPerBatch?: number;
  maxOpinionsPerBatch?: number;
  similarityThreshold?: number;
  confidenceThreshold?: number;
  previewOnly?: boolean;
  forceReanalysis?: boolean;
}

export interface UnanalyzedOpinion {
  id: string;
  content: string;
  submittedAt: string;
  projectId: string;
  characterCount: number;
  estimatedTokens: number;
}

export interface ExistingTopic {
  id: string;
  name: string;
  summary: string;
  count: number;
  keywords?: string[];
}

export interface BatchAnalysisResult {
  batchId: string;
  totalOpinions: number;
  processedOpinions: number;
  newTopicsCreated: number;
  existingTopicsUpdated: number;
  classifications: OpinionClassification[];
  executionTime: number;
  tokensConsumed: number;
}

export interface OpinionClassification {
  opinionId: string;
  action: 'ASSIGN_TO_EXISTING' | 'CREATE_NEW_TOPIC';
  topicId?: string;
  newTopicName?: string;
  newTopicSummary?: string;
  confidence: number;
  reasoning: string;
}

export interface AnalysisContext {
  projectId: string;
  userId: string;
  lastAnalysisAt?: Date;
  lastAnalyzedOpinionsCount: number;
  currentOpinionsCount: number;
  existingTopics: ExistingTopic[];
  unanalyzedOpinions: UnanalyzedOpinion[];
}

export class OptimizedIncrementalAnalysisService {
  private readonly TOKEN_ESTIMATION_FACTOR = 1.3; // 文字数 × 1.3 = 概算トークン数
  
  // 環境変数対応: AI処理制限を取得
  private getProcessingLimits() {
    return LimitsConfig.getAIProcessingLimits().incremental;
  }

  /**
   * メインエントリーポイント: 最適化された増分分析
   */
  async analyzeNewOpinions(
    projectId: string, 
    userId: string, 
    options: OptimizedAnalysisOptions = {}
  ): Promise<BatchAnalysisResult> {
    const startTime = Date.now();
    
    console.log('='.repeat(80));
    console.log('[OptimizedIncremental] ==> 最適化増分分析開始');
    console.log('='.repeat(80));
    console.log('[OptimizedIncremental] 📊 分析パラメータ:', {
      projectId,
      userId,
      options,
      timestamp: new Date().toISOString()
    });

    try {
      // Step 1: 分析コンテキスト準備
      const context = await this.prepareAnalysisContext(projectId, userId, options);
      
      if (context.unanalyzedOpinions.length === 0) {
        console.log('[OptimizedIncremental] ℹ️ 新規回答なし - 分析完了');
        return this.createEmptyResult(projectId);
      }

      console.log('[OptimizedIncremental] 📊 分析コンテキスト:', {
        totalOpinions: context.currentOpinionsCount,
        lastAnalyzedCount: context.lastAnalyzedOpinionsCount,
        unanalyzedCount: context.unanalyzedOpinions.length,
        existingTopicsCount: context.existingTopics.length
      });

      // Step 2: スマートバッチ処理
      const batches = this.createOptimalBatches(context.unanalyzedOpinions, options);
      console.log('[OptimizedIncremental] 📦 バッチ分割:', {
        totalBatches: batches.length,
        batchSizes: batches.map(batch => batch.length)
      });

      // Step 3: バッチ分析実行
      let totalProcessed = 0;
      let totalNewTopics = 0;
      let totalUpdatedTopics = 0;
      let allClassifications: OpinionClassification[] = [];

      for (let i = 0; i < batches.length; i++) {
        const batch = batches[i];
        console.log(`[OptimizedIncremental] 🔄 バッチ ${i + 1}/${batches.length} 処理開始 (${batch.length}件)`);
        
        const batchResult = await this.processBatch(batch, context, i + 1);
        
        totalProcessed += batchResult.processedOpinions;
        totalNewTopics += batchResult.newTopicsCreated;
        totalUpdatedTopics += batchResult.existingTopicsUpdated;
        allClassifications.push(...batchResult.classifications);

        console.log(`[OptimizedIncremental] ✅ バッチ ${i + 1}/${batches.length} 完了:`, {
          processed: batchResult.processedOpinions,
          newTopics: batchResult.newTopicsCreated,
          updatedTopics: batchResult.existingTopicsUpdated
        });
      }

      // Step 4: 分析状態更新
      await this.updateAnalysisState(projectId, context.unanalyzedOpinions, allClassifications);

      const executionTime = Date.now() - startTime;
      const result: BatchAnalysisResult = {
        batchId: `optimized_analysis_${Date.now()}`,
        totalOpinions: context.unanalyzedOpinions.length,
        processedOpinions: totalProcessed,
        newTopicsCreated: totalNewTopics,
        existingTopicsUpdated: totalUpdatedTopics,
        classifications: allClassifications,
        executionTime,
        tokensConsumed: this.estimateTokensConsumed(context.unanalyzedOpinions)
      };

      console.log('[OptimizedIncremental] 🎉 最適化増分分析完了:', {
        totalProcessed,
        newTopics: totalNewTopics,
        updatedTopics: totalUpdatedTopics,
        executionTime: `${executionTime}ms`,
        avgTimePerOpinion: `${Math.round(executionTime / totalProcessed)}ms`
      });

      return result;

    } catch (error) {
      console.error('[OptimizedIncremental] ❌ 分析エラー:', error);
      throw new AppError(
        500,
        'OPTIMIZED_ANALYSIS_ERROR',
        '最適化増分分析に失敗しました',
        error
      );
    }
  }

  /**
   * 分析コンテキストの準備
   */
  private async prepareAnalysisContext(
    projectId: string, 
    userId: string, 
    options: OptimizedAnalysisOptions
  ): Promise<AnalysisContext> {
    console.log('[OptimizedIncremental] 🔍 分析コンテキスト準備中...');

    // プロジェクト情報取得
    const project = await prisma.project.findUnique({
      where: { id: projectId, userId },
      select: {
        id: true,
        lastAnalysisAt: true,
        lastAnalyzedOpinionsCount: true,
        // 動的カウント: opinionsCountフィールドは削除済み
        isAnalyzed: true,
        _count: {
          select: {
            opinions: true
          }
        }
      }
    });

    if (!project) {
      throw new AppError(404, 'PROJECT_NOT_FOUND', 'プロジェクトが見つかりません');
    }

    // 既存トピック取得
    const existingTopics = await this.getExistingTopics(projectId);

    // 未分析回答特定
    const unanalyzedOpinions = await this.getUnanalyzedOpinions(
      projectId, 
      project.lastAnalyzedOpinionsCount || 0,
      options.forceReanalysis
    );

    return {
      projectId,
      userId,
      lastAnalysisAt: project.lastAnalysisAt || undefined,
      lastAnalyzedOpinionsCount: project.lastAnalyzedOpinionsCount || 0,
      // 動的カウント: 実際の意見数を使用
      currentOpinionsCount: project._count.opinions,
      existingTopics,
      unanalyzedOpinions
    };
  }

  /**
   * 既存トピック取得
   */
  private async getExistingTopics(projectId: string): Promise<ExistingTopic[]> {
    const topics = await prisma.topic.findMany({
      where: { projectId },
      select: {
        id: true,
        name: true,
        summary: true,
        count: true
      },
      orderBy: { count: 'desc' }
    });

    return topics.map(topic => ({
      id: topic.id,
      name: topic.name,
      summary: topic.summary,
      count: topic.count,
      keywords: this.extractKeywords(topic.name, topic.summary)
    }));
  }

  /**
   * 未分析回答の特定
   */
  private async getUnanalyzedOpinions(
    projectId: string, 
    lastAnalyzedCount: number,
    forceReanalysis?: boolean
  ): Promise<UnanalyzedOpinion[]> {
    
    let whereClause: any = { projectId };

    if (!forceReanalysis) {
      // OpinionAnalysisStateを活用した精密な未分析回答特定
      whereClause = {
        projectId,
        OR: [
          // 分析状態レコードが存在しない
          { analysisState: null },
          // 分析状態が古い（回答が更新された後に分析されていない）
          {
            analysisState: {
              lastAnalyzedAt: {
                lt: prisma.opinion.fields.submittedAt
              }
            }
          }
        ]
      };
    }

    const opinions = await prisma.opinion.findMany({
      where: whereClause,
      select: {
        id: true,
        content: true,
        submittedAt: true,
        projectId: true,
        characterCount: true,
        analysisState: {
          select: {
            lastAnalyzedAt: true,
            analysisVersion: true
          }
        }
      },
      orderBy: { submittedAt: 'asc' }
    });

    return opinions.map(opinion => ({
      id: opinion.id,
      content: opinion.content,
      submittedAt: opinion.submittedAt.toISOString(),
      projectId: opinion.projectId,
      characterCount: opinion.characterCount,
      estimatedTokens: Math.ceil(opinion.characterCount * this.TOKEN_ESTIMATION_FACTOR)
    }));
  }

  /**
   * 最適バッチ作成
   */
  private createOptimalBatches(
    opinions: UnanalyzedOpinion[], 
    options: OptimizedAnalysisOptions
  ): UnanalyzedOpinion[][] {
    const processingLimits = this.getProcessingLimits();
    const maxTokens = options.maxTokensPerBatch || processingLimits.maxTokens;
    const maxOpinions = options.maxOpinionsPerBatch || processingLimits.maxOpinions;

    const batches: UnanalyzedOpinion[][] = [];
    let currentBatch: UnanalyzedOpinion[] = [];
    let currentTokens = 0;

    for (const opinion of opinions) {
      const wouldExceedTokens = currentTokens + opinion.estimatedTokens > maxTokens;
      const wouldExceedCount = currentBatch.length >= maxOpinions;

      if ((wouldExceedTokens || wouldExceedCount) && currentBatch.length > 0) {
        // 現在のバッチを確定し、新しいバッチ開始
        batches.push(currentBatch);
        currentBatch = [];
        currentTokens = 0;
      }

      currentBatch.push(opinion);
      currentTokens += opinion.estimatedTokens;
    }

    // 最後のバッチを追加
    if (currentBatch.length > 0) {
      batches.push(currentBatch);
    }

    return batches;
  }

  /**
   * バッチ処理実行
   */
  private async processBatch(
    batch: UnanalyzedOpinion[], 
    context: AnalysisContext,
    batchNumber: number
  ): Promise<BatchAnalysisResult> {
    console.log(`[OptimizedIncremental] 🤖 バッチ${batchNumber} AI分析開始...`);

    const prompt = this.buildBatchAnalysisPrompt(batch, context.existingTopics);
    
    const aiServiceManager = getAIServiceManager();
    const aiStartTime = Date.now();
    
    const response = await aiServiceManager.generateResponse(
      prompt,
      'gpt-4.1-nano',
      {
        purpose: 'incremental',
        projectId: context.projectId,
        userId: context.userId
      }
    );

    const aiDuration = Date.now() - aiStartTime;
    console.log(`[OptimizedIncremental] ✅ バッチ${batchNumber} AI分析完了: ${aiDuration}ms`);

    // AI応答解析
    const classifications = this.parseAIResponse(response.content, batch);
    
    // データベース反映
    await this.applyBatchClassifications(classifications, context);

    return {
      batchId: `batch_${batchNumber}_${Date.now()}`,
      totalOpinions: batch.length,
      processedOpinions: classifications.length,
      newTopicsCreated: classifications.filter(c => c.action === 'CREATE_NEW_TOPIC').length,
      existingTopicsUpdated: classifications.filter(c => c.action === 'ASSIGN_TO_EXISTING').length,
      classifications,
      executionTime: Date.now() - aiStartTime,
      tokensConsumed: this.estimateTokensConsumed(batch)
    };
  }

  /**
   * バッチ分析プロンプト生成
   */
  private buildBatchAnalysisPrompt(
    opinions: UnanalyzedOpinion[], 
    existingTopics: ExistingTopic[]
  ): string {
    const opinionsList = opinions.map((op, index) => 
      `${index + 1}. ID: ${op.id}\n   内容: "${op.content}"`
    ).join('\n\n');

    const topicsList = existingTopics.length > 0 
      ? existingTopics.map((topic, index) => 
          `${index + 1}. ID: ${topic.id}\n   名前: "${topic.name}"\n   概要: "${topic.summary}"\n   件数: ${topic.count}`
        ).join('\n\n')
      : 'なし';

    return `以下の新しい意見を既存のトピックに分類するか、新しいトピックを作成してください。

【新しい意見一覧】
${opinionsList}

【既存トピック一覧】
${topicsList}

【分類ルール】
1. 既存トピックとの類似度が70%以上: 既存トピックに分類
2. 類似度が70%未満: 新しいトピックを作成
3. 複数の意見で同様のテーマ: 同じ新トピックにまとめて分類

【出力形式】
以下のJSON配列で回答してください：
[
  {
    "opinionId": "意見ID",
    "action": "ASSIGN_TO_EXISTING" または "CREATE_NEW_TOPIC",
    "topicId": "既存トピックID（ASSIGN_TO_EXISTINGの場合）",
    "newTopicName": "新トピック名（CREATE_NEW_TOPICの場合）",
    "newTopicSummary": "新トピック概要（CREATE_NEW_TOPICの場合）",
    "confidence": 0.0-1.0の信頼度,
    "reasoning": "判定理由"
  }
]`;
  }

  /**
   * AI応答解析
   */
  private parseAIResponse(aiResponse: string, batch: UnanalyzedOpinion[]): OpinionClassification[] {
    try {
      // JSON部分を抽出
      const jsonMatch = aiResponse.match(/\[[\s\S]*\]/);
      if (!jsonMatch) {
        throw new Error('AI応答にJSON配列が見つかりません');
      }

      const classifications = JSON.parse(jsonMatch[0]) as OpinionClassification[];
      
      // バリデーション
      const validatedClassifications = classifications.filter(classification => {
        const opinion = batch.find(op => op.id === classification.opinionId);
        return opinion && (classification.action === 'ASSIGN_TO_EXISTING' || classification.action === 'CREATE_NEW_TOPIC');
      });

      console.log('[OptimizedIncremental] 📊 AI応答解析結果:', {
        total: classifications.length,
        validated: validatedClassifications.length,
        assignToExisting: validatedClassifications.filter(c => c.action === 'ASSIGN_TO_EXISTING').length,
        createNewTopic: validatedClassifications.filter(c => c.action === 'CREATE_NEW_TOPIC').length
      });

      return validatedClassifications;
    } catch (error) {
      console.error('[OptimizedIncremental] ❌ AI応答解析エラー:', error);
      
      // フォールバック: 全て新トピック作成
      return batch.map(opinion => ({
        opinionId: opinion.id,
        action: 'CREATE_NEW_TOPIC' as const,
        newTopicName: `【新トピック】${opinion.content.substring(0, 20)}...`,
        newTopicSummary: `${opinion.content.substring(0, 100)}...に関する意見`,
        confidence: 0.5,
        reasoning: 'AI応答解析失敗のため新トピック作成'
      }));
    }
  }

  /**
   * バッチ分類結果の適用
   */
  private async applyBatchClassifications(
    classifications: OpinionClassification[], 
    context: AnalysisContext
  ): Promise<void> {
    console.log('[OptimizedIncremental] 💾 分類結果をデータベースに適用中...');

    // トランザクションで原子性を保証
    await prisma.$transaction(async (tx) => {
      for (const classification of classifications) {
        if (classification.action === 'ASSIGN_TO_EXISTING' && classification.topicId) {
          // 既存トピックに振り分け
          await tx.opinion.update({
            where: { id: classification.opinionId },
            data: { topicId: classification.topicId }
          });

          // トピックの件数更新
          await tx.topic.update({
            where: { id: classification.topicId },
            data: { 
              count: { increment: 1 },
              updatedAt: new Date()
            }
          });

        } else if (classification.action === 'CREATE_NEW_TOPIC') {
          // 新トピック作成
          const newTopic = await tx.topic.create({
            data: {
              name: classification.newTopicName || `新トピック${Date.now()}`,
              summary: classification.newTopicSummary || '新しく作成されたトピック',
              count: 1,
              projectId: context.projectId,
              status: 'UNHANDLED'
            }
          });

          // 意見を新トピックに振り分け
          await tx.opinion.update({
            where: { id: classification.opinionId },
            data: { topicId: newTopic.id }
          });
        }
      }
    });

    console.log('[OptimizedIncremental] ✅ 分類結果適用完了');
  }

  /**
   * 分析状態更新
   */
  private async updateAnalysisState(
    projectId: string,
    processedOpinions: UnanalyzedOpinion[],
    classifications: OpinionClassification[]
  ): Promise<void> {
    console.log('[OptimizedIncremental] 📝 OpinionAnalysisState更新中...');

    const now = new Date();
    
    await prisma.$transaction(async (tx) => {
      for (const opinion of processedOpinions) {
        const classification = classifications.find(c => c.opinionId === opinion.id);
        
        await tx.opinionAnalysisState.upsert({
          where: { opinionId: opinion.id },
          update: {
            lastAnalyzedAt: now,
            analysisVersion: { increment: 1 },
            topicId: classification?.topicId,
            classificationConfidence: classification?.confidence,
            manualReviewFlag: false,
            updatedAt: now
          },
          create: {
            opinionId: opinion.id,
            projectId: projectId,
            lastAnalyzedAt: now,
            analysisVersion: 1,
            topicId: classification?.topicId,
            classificationConfidence: classification?.confidence,
            manualReviewFlag: false
          }
        });
      }

      // プロジェクトの分析状況更新
      const currentOpinionsCount = await tx.opinion.count({
        where: { projectId }
      });

      await tx.project.update({
        where: { id: projectId },
        data: {
          lastAnalysisAt: now,
          lastAnalyzedOpinionsCount: currentOpinionsCount,
          isAnalyzed: true,
          updatedAt: now
        }
      });
    });

    console.log('[OptimizedIncremental] ✅ OpinionAnalysisState更新完了');
  }

  /**
   * ユーティリティメソッド
   */
  private createEmptyResult(projectId: string): BatchAnalysisResult {
    return {
      batchId: `empty_analysis_${Date.now()}`,
      totalOpinions: 0,
      processedOpinions: 0,
      newTopicsCreated: 0,
      existingTopicsUpdated: 0,
      classifications: [],
      executionTime: 0,
      tokensConsumed: 0
    };
  }

  private extractKeywords(name: string, summary: string): string[] {
    // 簡単なキーワード抽出（実際にはより高度な処理が可能）
    const text = `${name} ${summary}`;
    return text.split(/[、。\s]+/).filter(word => word.length > 1).slice(0, 5);
  }

  private estimateTokensConsumed(opinions: UnanalyzedOpinion[]): number {
    return opinions.reduce((total, opinion) => total + opinion.estimatedTokens, 0);
  }
}