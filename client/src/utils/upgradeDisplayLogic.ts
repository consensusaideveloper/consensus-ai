/**
 * ベストプラクティスに基づくアップグレードバナー表示ロジック
 * SaaS業界の標準的なアプローチを実装
 */

import { TrialConfig } from '../config/trialConfig';
import { PLAN_TYPES } from '../constants/planTypes';

interface User {
  id: string;
  subscriptionStatus?: string;
  trialStartDate?: string;
  trialEndDate?: string;
  createdAt?: string;
  purpose?: string;
}

interface Project {
  id: string;
  createdAt: string;
  isCompleted?: boolean;
}

interface UpgradeContext {
  showBanner: boolean;
  bannerType: 'trial_start' | 'trial_active' | 'limit_reached' | 'trial_ending' | 'value_demonstration' | 'project_limit_approaching' | 'welcome_free' | 'free_value_proposition' | 'trial_progress' | 'trial_value_demonstration' | 'trial_ending_critical' | 'none';
  priority: 'high' | 'medium' | 'low';
  context: string;
  ctaText: string;
  dismissable: boolean;
  urgency: boolean;
}

/**
 * プラン詳細情報
 */
interface PlanDetails {
  trial: {
    name: string;
    maxProjects: number;
    duration: number;
  };
  pro: {
    name: string;
  };
  free: {
    maxProjects: number;
  };
}

/**
 * メインのアップグレード表示判定ロジック
 */
export function getUpgradeDisplayContext(
  user: User | null,
  projects: Project[] = [],
  recentLimitHits: { type: string; timestamp: string; context: string }[] = [],
  analysisCount: number = 0,
  planDetails: PlanDetails | null = null,
  t?: (key: string, params?: Record<string, unknown>) => string
): UpgradeContext {
  
  if (!user) {
    return { 
      showBanner: false, 
      bannerType: 'none', 
      priority: 'low', 
      context: '', 
      ctaText: '', 
      dismissable: true, 
      urgency: false 
    };
  }

  // Pro プランユーザーには表示しない
  if (user.subscriptionStatus === PLAN_TYPES.PRO) {
    return { 
      showBanner: false, 
      bannerType: 'none', 
      priority: 'low', 
      context: '', 
      ctaText: '', 
      dismissable: true, 
      urgency: false 
    };
  }

  // 1. 【最優先】制限到達時 - コンテキスト重視の即時表示
  const recentLimitHit = recentLimitHits.find(hit => {
    const hitTime = new Date(hit.timestamp).getTime();
    const now = Date.now();
    return (now - hitTime) < 5 * 60 * 1000; // 5分以内の制限到達
  });

  if (recentLimitHit) {
    return {
      showBanner: true,
      bannerType: 'limit_reached',
      priority: 'high',
      context: getLimitReachedContext(recentLimitHit.type, t),
      ctaText: t ? t('dashboard.upgradeBanner.ctaTexts.continuePro') : 'Continue with Pro',
      dismissable: false, // 制限到達時は非解除可能
      urgency: true
    };
  }

  // 2. 【高優先】トライアル終了間近（3日以内）
  if (user.subscriptionStatus === PLAN_TYPES.TRIAL && user.trialEndDate) {
    const daysRemaining = getDaysRemaining(user.trialEndDate);
    if (daysRemaining <= 3 && daysRemaining > 0) {
      return {
        showBanner: true,
        bannerType: 'trial_ending',
        priority: 'high',
        context: t ? t('dashboard.upgradeBanner.contexts.trialEnding', {
          days: daysRemaining,
          trialPlan: t ? t('common.plans.trial') : 'Trial'
        }) : `Trial ends in ${daysRemaining} days`,
        ctaText: t ? t('dashboard.upgradeBanner.ctaTexts.migrateToPro', {
          proPlan: t ? t('common.plans.pro') : 'Pro'
        }) : 'Migrate to Pro plan',
        dismissable: false, // 緊急時は非解除可能
        urgency: true
      };
    }
  }

  // 3. 【中優先】価値実感時 - アクティブユーザーへの適切なタイミング表示
  const userEngagement = calculateUserEngagement(user, projects, analysisCount, TrialConfig.getHoursPerAnalysis(), t);
  if (userEngagement.isEngaged && userEngagement.valueExperienced) {
    return {
      showBanner: true,
      bannerType: 'value_demonstration',
      priority: 'medium',
      context: getValueDemonstrationContext(userEngagement, t),
      ctaText: t ? t('dashboard.upgradeBanner.ctaTexts.moreEfficient') : 'More efficient',
      dismissable: true,
      urgency: false
    };
  }

  // 4. 【中優先】プロジェクト制限に近づいているフリープランユーザー
  if (user.subscriptionStatus === PLAN_TYPES.FREE && projects.length === 1) {
    
    // 常時表示: フリープランで1プロジェクト作成済みの場合は常に表示
    return {
      showBanner: true,
      bannerType: 'project_limit_approaching',
      priority: 'medium',
      context: t ? t('dashboard.upgradeBanner.contexts.freeProjects', {
        current: projects.length,
        max: planDetails?.free.maxProjects || 1
      }) : `Currently using ${projects.length}/${planDetails?.free.maxProjects || 1} projects`,
      ctaText: t ? t('dashboard.upgradeBanner.ctaTexts.trialUpgrade', {
        trialPlan: t ? t('common.plans.trial') : 'Trial',
        maxProjects: planDetails?.trial.maxProjects || TrialConfig.getTrialMaxProjects()
      }) : `Up to ${planDetails?.trial.maxProjects || TrialConfig.getTrialMaxProjects()} projects with Trial`,
      dismissable: true,
      urgency: false
    };
  }

  // 5. 【低優先】フリープランユーザー - 段階的表示（7日制限を除去）
  if (user.subscriptionStatus === PLAN_TYPES.FREE) {
    const daysSinceRegistration = getDaysSinceRegistration(user.createdAt);
    
    // 新規ユーザー（0-2日）: ウェルカム型控えめ表示
    if (daysSinceRegistration <= 2) {
      return {
        showBanner: true,
        bannerType: 'welcome_free',
        priority: 'low',
        context: t ? t('dashboard.upgradeBanner.contexts.proAllFeatures', {
          proPlan: t('common.plans.pro')
        }) : 'Try Pro plan features',
        ctaText: t ? t('dashboard.upgradeBanner.ctaTexts.freeTrial') : 'Free Trial',
        dismissable: true,
        urgency: false
      };
    }
    
    // 継続ユーザー（3日以上）: 価値提案強化
    return {
      showBanner: true,
      bannerType: 'free_value_proposition',
      priority: 'medium',
      context: projects.length > 0 
        ? (t ? t('dashboard.upgradeBanner.contexts.moreProjects') : 'Achieve efficiency with more projects')
        : (t ? t('dashboard.upgradeBanner.contexts.freeTrialAll') : 'Try Pro features for free'),
      ctaText: t ? t('dashboard.upgradeBanner.ctaTexts.startTrial') : 'Start Trial',
      dismissable: true,
      urgency: false
    };
  }

  // 6. 【中優先】アクティブなトライアルユーザー - 段階的エスカレーション
  if (user.subscriptionStatus === PLAN_TYPES.TRIAL) {
    const daysRemaining = getDaysRemaining(user.trialEndDate);
    
    if (daysRemaining > 7) {
      // 初期段階: 控えめ常時表示
      return {
        showBanner: true,
        bannerType: 'trial_progress',
        priority: 'low',
        context: t ? t('dashboard.upgradeBanner.contexts.trialRemaining', {
          days: daysRemaining,
          trialPlan: t ? t('common.plans.trial') : 'Trial'
        }) : `Trial ${daysRemaining} days left | Experiencing efficiency`,
        ctaText: t ? t('dashboard.upgradeBanner.ctaTexts.continuePro2', {
          proPlan: t ? t('common.plans.pro') : 'Pro'
        }) : 'Continue with Pro',
        dismissable: true,
        urgency: false
      };
    } else if (daysRemaining > 3) {
      // 中期段階: 価値アピール強化
      return {
        showBanner: true,
        bannerType: 'trial_value_demonstration',
        priority: 'medium',
        context: t ? t('dashboard.upgradeBanner.contexts.trialValueDemo', {
          days: daysRemaining
        }) : `${daysRemaining} days left | Significantly reducing work time`,
        ctaText: t ? t('dashboard.upgradeBanner.ctaTexts.proUpgrade', {
          proPlan: t ? t('common.plans.pro') : 'Pro'
        }) : 'Continue with Pro plan',
        dismissable: false, // 重要期間は非解除
        urgency: false
      };
    } else if (daysRemaining > 0) {
      // 終盤: 緊急性表現
      return {
        showBanner: true,
        bannerType: 'trial_ending_critical',
        priority: 'high',
        context: t ? t('dashboard.upgradeBanner.contexts.trialEndingCritical', {
          days: daysRemaining,
          trialPlan: t ? t('common.plans.trial') : 'Trial'
        }) : `⚠️ Trial ends in ${daysRemaining} days`,
        ctaText: t ? t('dashboard.upgradeBanner.ctaTexts.migrateNow', {
          proPlan: t ? t('common.plans.pro') : 'Pro'
        }) : 'Migrate to Pro now',
        dismissable: false,
        urgency: true
      };
    }
  }

  return { 
    showBanner: false, 
    bannerType: 'none', 
    priority: 'low', 
    context: '', 
    ctaText: '', 
    dismissable: true, 
    urgency: false 
  };
}

/**
 * 制限到達時のコンテキストメッセージを生成
 */
function getLimitReachedContext(
  limitType: string, 
  t?: (key: string, params?: Record<string, unknown>) => string
): string {
  if (!t) {
    switch (limitType) {
      case 'project_limit':
        return 'Project creation limit reached';
      case 'analysis_limit':
        return 'AI analysis limit reached';
      case 'opinion_limit':
        return 'Opinion collection limit reached';
      default:
        return 'Usage limit reached';
    }
  }

  switch (limitType) {
    case 'project_limit':
      return t('dashboard.upgradeBanner.limitReached.project');
    case 'analysis_limit':
      return t('dashboard.upgradeBanner.limitReached.analysis');
    case 'opinion_limit':
      return t('dashboard.upgradeBanner.limitReached.opinion');
    default:
      return t('dashboard.upgradeBanner.limitReached.general');
  }
}

/**
 * ユーザーエンゲージメントと価値実感度を計算
 */
function calculateUserEngagement(
  _user: User, 
  projects: Project[], 
  analysisCount: number,
  hoursPerAnalysis: number = TrialConfig.getHoursPerAnalysis(),
  t?: (key: string, params?: Record<string, unknown>) => string
): { isEngaged: boolean; valueExperienced: boolean; context: string } {
  
  const completedProjects = projects.filter(p => p.isCompleted).length;
  const totalProjects = projects.length;
  
  // エンゲージメント判定
  const isEngaged = (
    totalProjects >= 2 || // 複数プロジェクト作成
    analysisCount >= 3 || // AI分析複数回実行
    completedProjects >= 1 // 完了プロジェクトあり
  );
  
  // 価値実感判定
  const valueExperienced = (
    analysisCount >= 2 && completedProjects >= 1
  );
  
  let context = '';
  if (valueExperienced) {
    const timeSaved = analysisCount * hoursPerAnalysis; // 動的な時間節約計算
    context = t ? t('dashboard.upgradeBanner.contexts.timeSaved', {
      hours: timeSaved.toFixed(1)
    }) : `Saved ${timeSaved.toFixed(1)} hours so far`;
  }
  
  return { isEngaged, valueExperienced, context };
}

/**
 * 価値実感コンテキストメッセージを生成
 */
function getValueDemonstrationContext(
  engagement: { context: string }, 
  t?: (key: string, params?: Record<string, unknown>) => string
): string {
  return t ? t('dashboard.upgradeBanner.contexts.engagementValue', {
    context: engagement.context
  }) : `🎉 ${engagement.context} | Manual analysis 5 hours → AI analysis 30 seconds`;
}

/**
 * トライアル終了日までの残日数を計算
 */
function getDaysRemaining(trialEndDate?: string): number {
  if (!trialEndDate) return 0;
  
  const endDate = new Date(trialEndDate);
  const now = new Date();
  const diffTime = endDate.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  return Math.max(0, diffDays);
}

/**
 * 登録からの経過日数を計算
 */
function getDaysSinceRegistration(createdAt?: string): number {
  if (!createdAt) return 0;
  
  const registrationDate = new Date(createdAt);
  const now = new Date();
  const diffTime = now.getTime() - registrationDate.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  
  return Math.max(0, diffDays);
}

/**
 * バナーの解除状態管理
 */
export class UpgradeBannerDismissalManager {
  private static STORAGE_KEY = 'upgrade_banner_dismissals';
  
  /**
   * バナーが解除されているかチェック
   */
  static isDismissed(bannerType: string): boolean {
    if (typeof window === 'undefined') return false;
    
    try {
      const dismissals = JSON.parse(
        localStorage.getItem(this.STORAGE_KEY) || '{}'
      );
      
      const dismissal = dismissals[bannerType];
      if (!dismissal) return false;
      
      // 解除の有効期限をチェック（24時間）
      const dismissedAt = new Date(dismissal.timestamp);
      const now = new Date();
      const hoursSinceDismissal = (now.getTime() - dismissedAt.getTime()) / (1000 * 60 * 60);
      
      return hoursSinceDismissal < 24;
    } catch {
      return false;
    }
  }
  
  /**
   * バナーを解除状態にする
   */
  static dismiss(bannerType: string): void {
    if (typeof window === 'undefined') return;
    
    try {
      const dismissals = JSON.parse(
        localStorage.getItem(this.STORAGE_KEY) || '{}'
      );
      
      dismissals[bannerType] = {
        timestamp: new Date().toISOString()
      };
      
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(dismissals));
    } catch (error) {
      console.warn('Failed to save banner dismissal:', error);
    }
  }
  
  /**
   * 制限到達時は解除状態をリセット（即座に再表示）
   */
  static resetDismissalForLimitHit(): void {
    if (typeof window === 'undefined') return;
    
    try {
      const dismissals = JSON.parse(
        localStorage.getItem(this.STORAGE_KEY) || '{}'
      );
      
      // 制限到達関連の解除状態をクリア
      delete dismissals['limit_reached'];
      delete dismissals['trial_ending'];
      
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(dismissals));
    } catch (error) {
      console.warn('Failed to reset dismissal for limit hit:', error);
    }
  }
}