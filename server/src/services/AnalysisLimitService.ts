import { PrismaClient } from '@prisma/client';
import { PlanLimitService } from './PlanLimitService';
import { LimitsConfig } from '../config/limits';
import { PLAN_TYPES } from '../constants/planTypes';

/**
 * AI分析制限チェック・管理サービス
 * 
 * 既存のAI分析機能に影響を与えずに、使用量制限機能を提供します。
 */

interface AnalysisLimits {
  // アカウント全体制限のみ
  total: {
    daily: number;
    monthly: number;
  };
}

interface LimitCheckResult {
  allowed: boolean;
  message?: string;
  remaining: {
    totalDaily: number;
    totalMonthly: number;
  };
  resetDate: {
    daily: Date;
    monthly: Date;
  };
}

interface UsageDetails {
  analysisType: string;
  opinionsProcessed: number;
  executionTime?: number;
}

export class AnalysisLimitService {
  private prisma: PrismaClient;
  
  // 制限値を環境変数から動的取得（A/Bテスト対応）
  private static getLimits(): AnalysisLimits {
    return LimitsConfig.getAnalysisLimits();
  }

  /**
   * ユーザーのプラン状況に応じて適切な制限値を取得
   */
  private async getLimitsForUser(userId: string): Promise<AnalysisLimits> {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId }
      });

      // ユーザーが見つからない場合はデフォルト制限
      if (!user) {
        return LimitsConfig.getAnalysisLimits();
      }

      // トライアルプランかつ期限内の場合はトライアル制限を適用
      const isActiveTrial = user.subscriptionStatus === PLAN_TYPES.TRIAL && !PlanLimitService.isTrialExpired(user);
      if (isActiveTrial) {
        return LimitsConfig.getTrialAnalysisLimits();
      }

      // それ以外（Pro、フリー、期限切れトライアル）はデフォルト制限
      return LimitsConfig.getAnalysisLimits();

    } catch (error) {
      console.warn('[AnalysisLimitService] Failed to get user-specific limits, using default:', error);
      return LimitsConfig.getAnalysisLimits();
    }
  }

  constructor(prismaClient: PrismaClient) {
    this.prisma = prismaClient;
  }

  /**
   * 分析実行前の制限チェック
   * 新規プラン制限 + 既存制限の両方をチェック
   */
  async checkAnalysisLimit(userId: string, projectId: string): Promise<LimitCheckResult> {
    try {
      // 新規プラン制限チェック（基本プランユーザーのみ）
      const planLimitResult = await PlanLimitService.checkAnalysisLimit(userId, projectId);
      if (!planLimitResult.allowed) {
        return {
          allowed: false,
          message: planLimitResult.message,
          remaining: {
            totalDaily: 0,
            totalMonthly: 0
          },
          resetDate: {
            daily: new Date(),
            monthly: new Date()
          }
        };
      }

      // 既存の制限チェック処理
      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      
      // ユーザー情報を取得してプラン別制限値を決定
      const limits = await this.getLimitsForUser(userId);
      
      // 本日・今月の使用量を取得
      const [totalDailyUsage, totalMonthlyUsage] = await Promise.all([
        this.getTotalUsageCount(userId, todayStart),
        this.getTotalUsageCount(userId, monthStart)
      ]);
      
      // 残り回数計算
      const remaining = {
        totalDaily: Math.max(0, limits.total.daily - totalDailyUsage),
        totalMonthly: Math.max(0, limits.total.monthly - totalMonthlyUsage)
      };

      // リセット日計算
      const resetDate = {
        daily: new Date(todayStart.getTime() + 24 * 60 * 60 * 1000), // 明日の0時
        monthly: new Date(now.getFullYear(), now.getMonth() + 1, 1)   // 来月の1日
      };

      // 制限チェック
      const limitExceeded = 
        remaining.totalDaily <= 0 ||
        remaining.totalMonthly <= 0;

      let message: string | undefined;
      if (limitExceeded) {
        if (remaining.totalDaily <= 0) {
          message = `本日の分析回数上限（${limits.total.daily}回）に達しました`;
        } else if (remaining.totalMonthly <= 0) {
          message = `今月の分析回数上限（${limits.total.monthly}回）に達しました`;
        }
      }

      return {
        allowed: !limitExceeded,
        message,
        remaining,
        resetDate
      };

    } catch (error) {
      console.error('[AnalysisLimitService] 制限チェックエラー:', error);
      // エラー時は制限をかけずに通す（既存機能への影響回避）
      const fallbackLimits = AnalysisLimitService.getLimits();
      return {
        allowed: true,
        remaining: {
          totalDaily: fallbackLimits.total.daily,
          totalMonthly: fallbackLimits.total.monthly
        },
        resetDate: {
          daily: new Date(),
          monthly: new Date()
        }
      };
    }
  }

  /**
   * 分析実行後の使用量記録
   */
  async recordAnalysisUsage(userId: string, projectId: string, details: UsageDetails): Promise<void> {
    try {
      await this.prisma.analysisUsage.create({
        data: {
          userId,
          projectId,
          analysisType: details.analysisType,
          opinionsProcessed: details.opinionsProcessed,
          executionTime: details.executionTime
        }
      });

      console.log('[AnalysisLimitService] 使用量記録完了:', {
        userId,
        projectId,
        analysisType: details.analysisType,
        opinionsProcessed: details.opinionsProcessed
      });

    } catch (error) {
      console.error('[AnalysisLimitService] 使用量記録エラー:', error);
      // エラーでも既存機能に影響させない（記録失敗しても分析は完了扱い）
    }
  }

  /**
   * 残り分析回数の取得（UI表示用）
   */
  async getRemainingAnalyses(userId: string): Promise<{
    totalDaily: number;
    totalMonthly: number;
  }> {
    try {
      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

      const totalDailyUsage = await this.getTotalUsageCount(userId, todayStart);
      const totalMonthlyUsage = await this.getTotalUsageCount(userId, monthStart);
      
      const limits = AnalysisLimitService.getLimits();

      return {
        totalDaily: Math.max(0, limits.total.daily - totalDailyUsage),
        totalMonthly: Math.max(0, limits.total.monthly - totalMonthlyUsage)
      };

    } catch (error) {
      console.error('[AnalysisLimitService] 残り回数取得エラー:', error);
      // エラー時はデフォルト値を返す
      const fallbackLimits = AnalysisLimitService.getLimits();
      return {
        totalDaily: fallbackLimits.total.daily,
        totalMonthly: fallbackLimits.total.monthly
      };
    }
  }


  /**
   * ユーザーの総使用量取得
   */
  private async getTotalUsageCount(userId: string, since: Date): Promise<number> {
    return await this.prisma.analysisUsage.count({
      where: {
        userId,
        executedAt: {
          gte: since
        }
      }
    });
  }

  /**
   * 制限値の取得（UI表示用）
   */
  static getLimitsForUI(): AnalysisLimits {
    return AnalysisLimitService.getLimits();
  }
}

export default AnalysisLimitService;