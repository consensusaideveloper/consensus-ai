import { prisma } from '../lib/database';
import { OpinionPriority } from './opinionPriorityCalculator';
import { OpinionClassification } from './unifiedAnalysisEngine';
import { AppError } from '../middleware/errorHandler';

/**
 * 継続分析状況インターフェース
 */
export interface ContinuousAnalysisStatus {
  projectId: string;
  totalOpinions: number;
  analyzedOpinions: number;
  unanalyzedOpinions: number;
  analysisCompletionRate: number;
  lastAnalysisAt?: Date;
  nextAnalysisRecommended: boolean;
  unanalyzedPriorityDistribution: PriorityDistribution;
  estimatedNextAnalysisSize: number;
}

export interface PriorityDistribution {
  high: number;    // 70以上
  medium: number;  // 40-70
  low: number;     // 40未満
}

export interface AnalysisStateUpdate {
  opinionId: string;
  projectId: string;
  lastAnalyzedAt: Date;
  analysisVersion: number;
  topicId?: string;
  classificationConfidence?: number;
  manualReviewFlag: boolean;
}

export interface NextAnalysisRecommendation {
  recommended: boolean;
  urgency: 'immediate' | 'soon' | 'when_convenient' | 'not_needed';
  reason: string;
  estimatedProcessingTime: number; // 秒
  suggestedParameters: any;
  unprocessedHighPriority: number;
  unprocessedTotal: number;
  nextAnalysisOptimalTiming: Date;
}

export interface StateUpdateResults {
  successCount: number;
  errorCount: number;
  totalUpdates: number;
  updates: AnalysisStateUpdate[];
}

/**
 * 継続分析管理システム
 * 
 * 核心機能:
 * - 分析済み意見の状態管理
 * - 未処理意見の次回分析予約
 * - 分析進捗の可視化
 * - 次回分析の最適タイミング提案
 */
export class ContinuousAnalysisManager {
  /**
   * 分析継続の管理
   */
  async manageAnalysisContinuation(
    projectId: string,
    processedOpinions: OpinionPriority[],
    unprocessedOpinions: OpinionPriority[],
    classifications: OpinionClassification[]
  ): Promise<{
    analysisStatus: ContinuousAnalysisStatus;
    nextAnalysisRecommendation: NextAnalysisRecommendation;
    updateResults: StateUpdateResults;
  }> {
    console.log('[ContinuousAnalysis] 🔄 分析継続管理開始:', {
      projectId,
      processedCount: processedOpinions.length,
      unprocessedCount: unprocessedOpinions.length,
      classificationsCount: classifications.length
    });
    
    try {
      // Step 1: 処理済み意見の状態更新
      const updateResults = await this.markOpinionsAsAnalyzed(
        processedOpinions, 
        classifications, 
        projectId
      );
      
      // Step 2: 未処理意見の次回分析予約
      if (unprocessedOpinions.length > 0) {
        await this.scheduleForNextAnalysis(unprocessedOpinions, projectId);
      }
      
      // Step 3: 分析状況の取得
      const analysisStatus = await this.getAnalysisStatus(projectId);
      
      // Step 4: 次回分析の推奨事項生成
      const nextRecommendation = await this.generateNextAnalysisRecommendation(
        projectId,
        unprocessedOpinions,
        analysisStatus
      );
      
      console.log('[ContinuousAnalysis] ✅ 分析継続管理完了:', {
        processedCount: processedOpinions.length,
        unprocessedCount: unprocessedOpinions.length,
        analysisCompletionRate: `${Math.round(analysisStatus.analysisCompletionRate)}%`,
        nextAnalysisRecommended: nextRecommendation.recommended
      });
      
      return {
        analysisStatus,
        nextAnalysisRecommendation: nextRecommendation,
        updateResults
      };
      
    } catch (error) {
      console.error('[ContinuousAnalysis] ❌ 分析継続管理エラー:', error);
      throw new AppError(
        500,
        'CONTINUOUS_ANALYSIS_ERROR',
        '継続分析管理に失敗しました',
        error
      );
    }
  }
  
  /**
   * 処理済み意見の分析状態更新
   */
  private async markOpinionsAsAnalyzed(
    processedOpinions: OpinionPriority[],
    classifications: OpinionClassification[],
    projectId: string
  ): Promise<StateUpdateResults> {
    console.log('[ContinuousAnalysis] 📝 分析状態更新開始:', {
      opinionsCount: processedOpinions.length,
      classificationsCount: classifications.length
    });
    
    const now = new Date();
    const updates: AnalysisStateUpdate[] = [];
    let successCount = 0;
    let errorCount = 0;
    
    await prisma.$transaction(async (tx) => {
      for (const opinion of processedOpinions) {
        try {
          const classification = classifications.find(c => c.opinionId === opinion.opinionId);
          
          const updateData: AnalysisStateUpdate = {
            opinionId: opinion.opinionId,
            projectId,
            lastAnalyzedAt: now,
            analysisVersion: 1, // インクリメントは後で処理
            topicId: classification?.targetTopicId,
            classificationConfidence: classification?.confidence,
            manualReviewFlag: this.shouldRequireManualReview(opinion, classification)
          };
          
          await tx.opinionAnalysisState.upsert({
            where: { opinionId: opinion.opinionId },
            update: {
              lastAnalyzedAt: updateData.lastAnalyzedAt,
              analysisVersion: { increment: 1 },
              topicId: updateData.topicId,
              classificationConfidence: updateData.classificationConfidence,
              manualReviewFlag: updateData.manualReviewFlag,
              updatedAt: now
            },
            create: {
              opinionId: opinion.opinionId,
              projectId: projectId,
              lastAnalyzedAt: updateData.lastAnalyzedAt,
              analysisVersion: 1,
              topicId: updateData.topicId,
              classificationConfidence: updateData.classificationConfidence,
              manualReviewFlag: updateData.manualReviewFlag
            }
          });
          
          updates.push(updateData);
          successCount++;
          
        } catch (error) {
          console.error(`[ContinuousAnalysis] ❌ 意見状態更新エラー: ${opinion.opinionId}`, error);
          errorCount++;
        }
      }
      
      // プロジェクトの分析状況更新
      const totalOpinionsCount = await tx.opinion.count({
        where: { projectId }
      });
      
      await tx.project.update({
        where: { id: projectId },
        data: {
          lastAnalysisAt: now,
          lastAnalyzedOpinionsCount: totalOpinionsCount,
          isAnalyzed: true,
          updatedAt: now
        }
      });
    });
    
    console.log('[ContinuousAnalysis] ✅ 分析状態更新完了:', {
      successCount,
      errorCount,
      totalUpdates: updates.length
    });
    
    return {
      successCount,
      errorCount,
      totalUpdates: updates.length,
      updates
    };
  }
  
  /**
   * 未処理意見の次回分析予約
   */
  private async scheduleForNextAnalysis(
    unprocessedOpinions: OpinionPriority[],
    projectId: string
  ): Promise<void> {
    console.log('[ContinuousAnalysis] 📅 次回分析予約開始:', {
      unprocessedCount: unprocessedOpinions.length,
      projectId
    });
    
    const now = new Date();
    const highPriorityCount = unprocessedOpinions.filter(op => op.priority > 70).length;
    const mediumPriorityCount = unprocessedOpinions.filter(op => op.priority >= 40 && op.priority <= 70).length;
    const lowPriorityCount = unprocessedOpinions.filter(op => op.priority < 40).length;
    
    await prisma.$transaction(async (tx) => {
      for (const opinion of unprocessedOpinions) {
        await tx.opinionAnalysisState.upsert({
          where: { opinionId: opinion.opinionId },
          update: {
            analysisVersion: { increment: 1 },
            manualReviewFlag: opinion.priority > 80, // 高優先度は手動レビューフラグ
            updatedAt: now
          },
          create: {
            opinionId: opinion.opinionId,
            projectId,
            analysisVersion: 1,
            manualReviewFlag: opinion.priority > 80
          }
        });
      }
    });
    
    console.log('[ContinuousAnalysis] 📋 次回分析予約完了:', {
      totalScheduled: unprocessedOpinions.length,
      highPriorityCount,
      mediumPriorityCount,
      lowPriorityCount,
      manualReviewRequired: unprocessedOpinions.filter(op => op.priority > 80).length
    });
    
    // 重要度の高い未処理意見がある場合の警告
    if (highPriorityCount > 0) {
      console.warn('[ContinuousAnalysis] ⚠️ 高優先度未処理意見あり:', {
        highPriorityCount,
        recommendation: '早期の追加分析を推奨',
        estimatedProcessingTime: this.estimateProcessingTime(unprocessedOpinions)
      });
    }
  }
  
  /**
   * 分析状況の取得
   */
  async getAnalysisStatus(projectId: string): Promise<ContinuousAnalysisStatus> {
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: {
        // 動的カウント: opinionsCountフィールドは削除済み
        lastAnalysisAt: true,
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
    
    // 分析済み意見の数を取得
    const analyzedCount = await prisma.opinionAnalysisState.count({
      where: {
        projectId,
        lastAnalyzedAt: { not: null }
      }
    });
    
    // 動的カウント: 実際の意見数を使用
    const totalOpinions = project._count.opinions;
    const unanalyzedOpinions = totalOpinions - analyzedCount;
    const completionRate = totalOpinions > 0 ? (analyzedCount / totalOpinions) * 100 : 100;
    
    // 未分析意見の優先度分布を取得
    const unanalyzedPriorityDistribution = await this.getUnanalyzedPriorityDistribution(projectId);
    
    // 次回分析推奨の判定
    const nextAnalysisRecommended = unanalyzedOpinions > 0 && (
      unanalyzedPriorityDistribution.high > 0 || 
      unanalyzedOpinions > 10
    );
    
    return {
      projectId,
      totalOpinions,
      analyzedOpinions: analyzedCount,
      unanalyzedOpinions,
      analysisCompletionRate: Math.round(completionRate * 100) / 100,
      lastAnalysisAt: project.lastAnalysisAt || undefined,
      nextAnalysisRecommended,
      unanalyzedPriorityDistribution,
      estimatedNextAnalysisSize: Math.min(unanalyzedOpinions, 15) // デフォルト最大数
    };
  }
  
  /**
   * 未分析意見の優先度分布取得
   */
  private async getUnanalyzedPriorityDistribution(projectId: string): Promise<PriorityDistribution> {
    // 簡易的な実装 - 実際にはOpinionAnalysisStateのメタデータから取得
    const unanalyzedOpinions = await prisma.opinion.findMany({
      where: {
        projectId,
        analysisState: null
      },
      select: { id: true, content: true }
    });
    
    // 優先度計算は省略し、文字数ベースで簡易判定
    let high = 0, medium = 0, low = 0;
    
    for (const opinion of unanalyzedOpinions) {
      const length = opinion.content.length;
      if (length > 100) {
        high++;
      } else if (length > 50) {
        medium++;
      } else {
        low++;
      }
    }
    
    return { high, medium, low };
  }
  
  /**
   * 次回分析推奨事項の生成
   */
  private async generateNextAnalysisRecommendation(
    projectId: string,
    unprocessedOpinions: OpinionPriority[],
    status: ContinuousAnalysisStatus
  ): Promise<NextAnalysisRecommendation> {
    const highPriorityCount = unprocessedOpinions.filter(op => op.priority > 70).length;
    const totalUnprocessed = unprocessedOpinions.length;
    
    let recommended = false;
    let urgency: 'immediate' | 'soon' | 'when_convenient' | 'not_needed' = 'not_needed';
    let reason = '全ての意見が分析済みです';
    let estimatedProcessingTime = 0;
    let suggestedParameters = {};
    
    if (totalUnprocessed > 0) {
      recommended = true;
      estimatedProcessingTime = this.estimateProcessingTime(unprocessedOpinions);
      
      if (highPriorityCount > 5) {
        urgency = 'immediate';
        reason = `高優先度の未処理意見が${highPriorityCount}件あります`;
        suggestedParameters = {
          maxOpinions: Math.min(highPriorityCount + 5, 15),
          strategy: 'greedy_priority'
        };
      } else if (highPriorityCount > 0) {
        urgency = 'soon';
        reason = `高優先度の未処理意見が${highPriorityCount}件あります`;
        suggestedParameters = {
          maxOpinions: 10,
          strategy: 'balanced'
        };
      } else if (totalUnprocessed > 10) {
        urgency = 'when_convenient';
        reason = `${totalUnprocessed}件の未処理意見があります`;
        suggestedParameters = {
          maxOpinions: 15,
          strategy: 'token_efficiency'
        };
      } else {
        urgency = 'when_convenient';
        reason = `${totalUnprocessed}件の未処理意見があります`;
        suggestedParameters = {
          maxOpinions: totalUnprocessed,
          strategy: 'balanced'
        };
      }
    }
    
    return {
      recommended,
      urgency,
      reason,
      estimatedProcessingTime,
      suggestedParameters,
      unprocessedHighPriority: highPriorityCount,
      unprocessedTotal: totalUnprocessed,
      nextAnalysisOptimalTiming: this.calculateOptimalTiming(urgency)
    };
  }
  
  /**
   * ヘルパーメソッド
   */
  private shouldRequireManualReview(
    opinion: OpinionPriority, 
    classification?: OpinionClassification
  ): boolean {
    return opinion.priority > 80 || 
           (classification?.confidence || 0) < 0.6;
  }
  
  private calculateProcessingOrder(priority: number): number {
    if (priority > 70) return 1; // 高優先度
    if (priority >= 40) return 2; // 中優先度
    return 3; // 低優先度
  }
  
  private estimateProcessingTime(opinions: OpinionPriority[]): number {
    // 基本処理時間: 1件あたり2秒 + AI分析時間15秒
    const baseTimePerOpinion = 2;
    const aiAnalysisTime = 15;
    const maxOpinionsPerBatch = 15;
    
    const batches = Math.ceil(opinions.length / maxOpinionsPerBatch);
    return (opinions.length * baseTimePerOpinion) + (batches * aiAnalysisTime);
  }
  
  private calculateOptimalTiming(urgency: 'immediate' | 'soon' | 'when_convenient' | 'not_needed'): Date {
    const now = new Date();
    switch (urgency) {
      case 'immediate': return now; // 即座
      case 'soon': return new Date(now.getTime() + 2 * 60 * 60 * 1000); // 2時間後
      case 'when_convenient': return new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24時間後
      default: return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 1週間後
    }
  }
}