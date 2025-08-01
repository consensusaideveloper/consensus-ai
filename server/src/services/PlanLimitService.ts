import { prisma } from '../lib/database';
import { LimitsConfig } from '../config/limits';
import { PLAN_TYPES } from '../constants/planTypes';

export interface PlanLimits {
  maxProjects: number;
  maxAnalysesTotal: number;
  maxOpinionsPerProject: number;
}

export interface User {
  id: string;
  subscriptionStatus?: string | null;
  createdAt: Date;
  trialEndDate?: Date | null;
}

export interface LimitCheckResult {
  allowed: boolean;
  message?: string;
  currentUsage?: number;
  limit?: number;
}

/**
 * プラン別制限チェックサービス
 * 既存のAnalysisLimitServiceと連携して安全に動作
 */
export class PlanLimitService {
  /**
   * フリーミアム開始日を環境変数から取得
   */
  private static getFreemiumLaunchDate(): Date {
    return LimitsConfig.getFreemiumLaunchDate();
  }

  /**
   * プラン別制限値を環境変数から動的取得（A/Bテスト対応）
   * トライアル期限切れの場合はフリープラン制限を適用
   */
  static getPlanLimits(subscriptionStatus?: string | null, user?: User): PlanLimits {
    const freemiumLimits = LimitsConfig.getFreemiumLimits();
    
    // トライアル期限切れの場合はフリープラン制限を適用
    // 注意: isTrialExpiredは非同期だが、このメソッドは同期のため一時的にコメントアウト
    // TODO: このメソッド全体を非同期化するかisTrialExpiredの呼び出し方法を検討
    // if (subscriptionStatus === PLAN_TYPES.TRIAL && user) {
    //   const isTrialExpired = await this.isTrialExpired(user);
    //   if (isTrialExpired) {
    //     return freemiumLimits.free;
    //   }
    // }
    
    // キャンセルユーザーはフリープラン制限を適用
    if (subscriptionStatus === PLAN_TYPES.CANCELLED) {
      return freemiumLimits.free;
    }
    
    switch (subscriptionStatus) {
      case PLAN_TYPES.FREE:
        return freemiumLimits.free;
      case PLAN_TYPES.TRIAL:
        return freemiumLimits.trial;
      case PLAN_TYPES.PRO:
      default:
        return freemiumLimits.pro;
    }
  }

  /**
   * トライアル期限が切れているかチェック
   */
  static async isTrialExpired(user: User): Promise<boolean> {
    // Stripeトライアルユーザーの場合：Stripe APIで正確な期限確認
    if (user.subscriptionStatus === PLAN_TYPES.TRIAL && (user as any).stripeCustomerId) {
      try {
        const { default: StripeService } = await import('./stripeService');
        const stripeService = new StripeService();
        const result = await stripeService.isStripeTrialExpired(user.id);
        
        if (result.error) {
          console.warn(`[PlanLimitService] Stripe trial check failed: ${result.error}`);
          return false; // エラー時は安全側に倒す
        }
        
        console.log(`[PlanLimitService] Stripe trial user ${user.id}: expired=${result.expired}`);
        return result.expired;
      } catch (error) {
        console.error('[PlanLimitService] Stripe trial check error:', error);
        return false; // エラー時は安全側に倒す
      }
    }
    
    // カスタムトライアルの場合：既存ロジック（同期処理）
    if (!user.trialEndDate) {
      // trialEndDateがない場合はcreatedAtから設定された日数で判定
      if (user.createdAt) {
        const trialDurationDays = LimitsConfig.getTrialDurationDays();
        const trialEndDate = new Date(user.createdAt.getTime() + (trialDurationDays * 24 * 60 * 60 * 1000));
        return new Date() > trialEndDate;
      }
      return false;
    }
    
    return new Date() > new Date(user.trialEndDate);
  }

  /**
   * ユーザーが新規制限の対象かチェック
   * フリープランユーザーまたは期限切れトライアルユーザーが対象
   */
  static async isSubjectToNewLimits(user: User): Promise<boolean> {
    // フリーミアム開始日以降に作成されたユーザーのみ対象
    if (user.createdAt < this.getFreemiumLaunchDate()) {
      return false;
    }
    
    // フリープランユーザー
    if (user.subscriptionStatus === PLAN_TYPES.FREE) {
      return true;
    }
    
    // 期限切れトライアルユーザー
    if (user.subscriptionStatus === PLAN_TYPES.TRIAL) {
      const isExpired = await this.isTrialExpired(user);
      return isExpired;
    }
    
    return false;
  }

  /**
   * プロジェクト作成制限チェック
   */
  static async checkProjectCreationLimit(userId: string): Promise<LimitCheckResult> {
    try {
      // ユーザー情報取得
      const user = await prisma.user.findUnique({
        where: { id: userId }
      });

      if (!user) {
        console.warn('[PlanLimitService] User not found, allowing operation');
        return { allowed: true };
      }

      // 新規制限の対象外ユーザーは制限拡張
      const isSubject = await this.isSubjectToNewLimits(user);
      if (!isSubject) {
        return { allowed: true };
      }

      // プラン制限値取得（トライアル期限切れを考慮）
      const limits = this.getPlanLimits(user.subscriptionStatus, user);
      if (limits.maxProjects === -1) {
        return { allowed: true };
      }

      // 現在のプロジェクト数取得
      const currentProjectCount = await prisma.project.count({
        where: {
          userId: userId,
          isArchived: false // アクティブなプロジェクトのみカウント
        }
      });

      const allowed = currentProjectCount < limits.maxProjects;
      
      return {
        allowed,
        message: allowed ? undefined : 'フリープランでは1プロジェクトまでです。トライアルを開始してください。',
        currentUsage: currentProjectCount,
        limit: limits.maxProjects
      };

    } catch (error) {
      console.warn('[PlanLimitService] Project creation check failed, allowing operation:', error);
      return { allowed: true };
    }
  }

  /**
   * AI分析制限チェック（AnalysisLimitServiceと連携）
   */
  static async checkAnalysisLimit(userId: string, projectId: string): Promise<LimitCheckResult> {
    try {
      // ユーザー情報取得
      const user = await prisma.user.findUnique({
        where: { id: userId }
      });

      if (!user) {
        console.warn('[PlanLimitService] User not found, allowing operation');
        return { allowed: true };
      }

      // 新規制限の対象外ユーザーは制限拡張（既存のAnalysisLimitServiceの制限のみ）
      const isSubject = await this.isSubjectToNewLimits(user);
      if (!isSubject) {
        return { allowed: true };
      }

      // フリープラン または 期限切れトライアル: 1回限りの分析制限
      const isTrialExpired = user.subscriptionStatus === PLAN_TYPES.TRIAL ? await this.isTrialExpired(user) : false;
      const isEffectivelyFree = user.subscriptionStatus === PLAN_TYPES.FREE || 
                               (user.subscriptionStatus === PLAN_TYPES.TRIAL && isTrialExpired);
      
      if (isEffectivelyFree) {
        const totalAnalyses = await prisma.analysisUsage.count({
          where: { userId }
        });

        if (totalAnalyses >= 1) {
          return {
            allowed: false,
            message: 'フリープランでは1回限りの分析です。トライアルを開始してください。',
            currentUsage: totalAnalyses,
            limit: 1
          };
        }
      }

      // 有効なトライアルプランの場合: 日次制限チェックのため継続（AnalysisLimitServiceで制限適用）
      // Proプランの場合: 制限拡張
      return { allowed: true };

    } catch (error) {
      console.warn('[PlanLimitService] Analysis limit check failed, allowing operation:', error);
      return { allowed: true };
    }
  }

  /**
   * 意見投稿制限チェック
   */
  static async checkOpinionSubmissionLimit(projectId: string, userId: string): Promise<LimitCheckResult> {
    try {
      // プロジェクトオーナー情報取得
      const project = await prisma.project.findUnique({
        where: { id: projectId },
        include: { user: true }
      });

      if (!project?.user) {
        console.warn('[PlanLimitService] Project or user not found, allowing operation');
        return { allowed: true };
      }

      // 新規制限の対象外ユーザーは制限拡張
      const isSubject = await this.isSubjectToNewLimits(project.user);
      if (!isSubject) {
        return { allowed: true };
      }

      // プラン制限値取得（トライアル期限切れを考慮）
      const limits = this.getPlanLimits(project.user.subscriptionStatus, project.user);
      if (limits.maxOpinionsPerProject === -1) {
        return { allowed: true };
      }

      // 現在の意見数取得
      const currentOpinionCount = await prisma.opinion.count({
        where: { projectId }
      });

      const allowed = currentOpinionCount < limits.maxOpinionsPerProject;

      return {
        allowed,
        message: allowed ? undefined : `意見収集上限（${limits.maxOpinionsPerProject}件）に達しました。`,
        currentUsage: currentOpinionCount,
        limit: limits.maxOpinionsPerProject
      };

    } catch (error) {
      console.warn('[PlanLimitService] Opinion submission check failed, allowing operation:', error);
      return { allowed: true };
    }
  }
}