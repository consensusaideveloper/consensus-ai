/**
 * プラン状況を取得するためのReact Hook
 * 既存のuseAuthコンテキストからユーザー情報を取得し、プラン状況を構築する
 */

import { useMemo, useState, useEffect } from 'react';
import { useAuth } from './useAuth';
import { useProjects } from './useProjects';
import { useLanguage } from './useLanguage';
import { PLAN_TYPES, type PlanType } from '../constants/planTypes';

// Plan Limits Defaults - 環境変数から取得（サーバー側と同期）
// NOTE: 理想的にはサーバーAPIから動的取得すべきですが、現在の実装との互換性のためクライアント側環境変数を使用
const DEFAULT_FREE_MAX_PROJECTS = import.meta.env.VITE_FREE_PLAN_MAX_PROJECTS || '1';
const DEFAULT_FREE_MAX_ANALYSES_TOTAL = import.meta.env.VITE_FREE_PLAN_MAX_ANALYSES_TOTAL || '1';
const DEFAULT_FREE_MAX_OPINIONS_PER_PROJECT = import.meta.env.VITE_FREE_PLAN_MAX_OPINIONS_PER_PROJECT || '50';

const DEFAULT_TRIAL_MAX_PROJECTS = import.meta.env.VITE_TRIAL_PLAN_MAX_PROJECTS || '5';
const DEFAULT_TRIAL_MAX_ANALYSES_TOTAL_DAILY = import.meta.env.VITE_TRIAL_PLAN_MAX_ANALYSES_TOTAL_DAILY || '7';
const DEFAULT_TRIAL_MAX_OPINIONS_PER_PROJECT = import.meta.env.VITE_TRIAL_PLAN_MAX_OPINIONS_PER_PROJECT || '150';

export interface PlanUsage {
  used: number;
  limit: number;
  percentage: number;
}

export interface PlanStatus {
  // プラン基本情報
  subscriptionStatus: PlanType;
  
  // トライアル情報
  isTrialActive: boolean;
  trialDaysRemaining: number | null;
  hasUsedTrial: boolean;
  canStartTrial: boolean;
  trialEndDate: string | null;
  
  // 課金情報
  nextBillingDate: string | null;
  
  // 使用状況
  usage: {
    projects: PlanUsage;
    analyses: PlanUsage;
    opinions: PlanUsage;
  };
  
  // プラン制限
  limits: {
    projects: number;
    analysesTotal: number;
    opinionsPerProject: number;
  };
  
  // 表示用情報
  displayInfo: {
    planName: string;
    planIcon: string;
    statusText: string;
    isUpgradeRecommended: boolean;
    urgencyLevel: 'none' | 'low' | 'medium' | 'high';
  };
  
  // サブスクリプションキャンセル状態（新規追加）
  isCancelScheduled?: boolean;
  contractEndDate?: Date | null;
  isLoadingStripe?: boolean;
}

/**
 * プラン制限値を取得（環境変数またはデフォルト値）
 */
function getPlanLimits(subscriptionStatus: string) {
  // Vite環境では import.meta.env を使用（フォールバックとしてハードコード値）
  const getEnvValue = (key: string, defaultValue: string): string => {
    // import.meta.env が利用可能な場合は使用
    if (typeof window !== 'undefined' && import.meta && import.meta.env) {
      return import.meta.env[key] || defaultValue;
    }
    return defaultValue;
  };
  
  switch (subscriptionStatus) {
    case PLAN_TYPES.FREE:
      return {
        projects: parseInt(getEnvValue('VITE_FREE_PLAN_MAX_PROJECTS', DEFAULT_FREE_MAX_PROJECTS), 10),
        analysesTotal: parseInt(getEnvValue('VITE_FREE_PLAN_MAX_ANALYSES_TOTAL', DEFAULT_FREE_MAX_ANALYSES_TOTAL), 10),
        opinionsPerProject: parseInt(getEnvValue('VITE_FREE_PLAN_MAX_OPINIONS_PER_PROJECT', DEFAULT_FREE_MAX_OPINIONS_PER_PROJECT), 10),
      };
    case PLAN_TYPES.TRIAL:
      return {
        projects: parseInt(getEnvValue('VITE_TRIAL_PLAN_MAX_PROJECTS', DEFAULT_TRIAL_MAX_PROJECTS), 10),
        analysesTotal: parseInt(getEnvValue('VITE_TRIAL_PLAN_MAX_ANALYSES_TOTAL_DAILY', DEFAULT_TRIAL_MAX_ANALYSES_TOTAL_DAILY), 10), // 日次制限を使用
        opinionsPerProject: parseInt(getEnvValue('VITE_TRIAL_PLAN_MAX_OPINIONS_PER_PROJECT', DEFAULT_TRIAL_MAX_OPINIONS_PER_PROJECT), 10),
      };
    case PLAN_TYPES.PRO:
    default:
      return {
        projects: -1, // 制限拡張
        analysesTotal: -1,
        opinionsPerProject: -1,
      };
  }
}

/**
 * 使用状況を計算
 */
function calculateUsage(used: number, limit: number): PlanUsage {
  if (limit === -1) {
    return { used, limit: -1, percentage: 0 }; // 制限拡張の場合
  }
  
  return {
    used,
    limit,
    percentage: limit > 0 ? Math.min((used / limit) * 100, 100) : 0
  };
}

/**
 * トライアル残日数を計算
 */
function calculateTrialDaysRemaining(trialEndDate?: string): number | null {
  if (!trialEndDate) return null;
  
  const endDate = new Date(trialEndDate);
  const now = new Date();
  const diffTime = endDate.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  return Math.max(0, diffDays);
}

/**
 * 次回課金日を計算（トライアル終了日またはProプラン更新日）
 */
function calculateNextBillingDate(user: any): string | null {
  if (user?.subscriptionStatus === PLAN_TYPES.TRIAL && user?.trialEndDate) {
    return user.trialEndDate;
  }
  
  if (user?.subscriptionStatus === PLAN_TYPES.PRO) {
    // Proプランの場合、作成日から月単位で計算（簡易実装）
    if (user.createdAt) {
      const createdDate = new Date(user.createdAt);
      const nextBilling = new Date(createdDate);
      
      // 現在の月に合わせて次回課金日を計算
      const now = new Date();
      nextBilling.setMonth(now.getMonth() + 1);
      nextBilling.setDate(createdDate.getDate());
      
      return nextBilling.toISOString();
    }
  }
  
  return null;
}

/**
 * 表示用情報を生成
 */
function generateDisplayInfo(
  subscriptionStatus: string,
  trialDaysRemaining: number | null,
  usage: PlanStatus['usage'],
  t: any
): PlanStatus['displayInfo'] {
  
  let planName = '';
  let planIcon = '';
  let statusText = '';
  let isUpgradeRecommended = false;
  let urgencyLevel: PlanStatus['displayInfo']['urgencyLevel'] = 'none';
  
  switch (subscriptionStatus) {
    case PLAN_TYPES.FREE:
      planName = t('accountSettings.planStatus.freePlan');
      planIcon = '';
      statusText = t('accountSettings.planStatus.freeStatus');
      isUpgradeRecommended = true;
      urgencyLevel = 'low';
      break;
      
    case PLAN_TYPES.TRIAL:
      planName = t('accountSettings.planStatus.trialPlan');
      planIcon = '';
      
      if (trialDaysRemaining !== null) {
        if (trialDaysRemaining <= 3) {
          statusText = t('accountSettings.planStatus.trialRemaining', { days: trialDaysRemaining }) + '（' + t('accountSettings.planStatus.trialEnding') + '）';
          urgencyLevel = 'high';
          isUpgradeRecommended = true;
        } else if (trialDaysRemaining <= 7) {
          statusText = t('accountSettings.planStatus.trialRemaining', { days: trialDaysRemaining });
          urgencyLevel = 'medium';
          isUpgradeRecommended = true;
        } else {
          statusText = t('accountSettings.planStatus.trialRemaining', { days: trialDaysRemaining });
          urgencyLevel = 'low';
          isUpgradeRecommended = true; // トライアル中は常にアップグレード推奨
        }
      } else {
        statusText = t('accountSettings.planStatus.trialActive');
        urgencyLevel = 'low';
        isUpgradeRecommended = true; // トライアル中は常にアップグレード推奨
      }
      break;
      
    case PLAN_TYPES.PRO:
      planName = t('accountSettings.planStatus.proPlan');
      planIcon = '';
      statusText = t('accountSettings.planStatus.active');
      urgencyLevel = 'none';
      break;
      
    case PLAN_TYPES.EXPIRED:
      planName = t('accountSettings.planStatus.expired');
      planIcon = '';
      statusText = t('accountSettings.planStatus.expired');
      isUpgradeRecommended = true;
      urgencyLevel = 'high';
      break;
      
    default:
      planName = 'Unknown';
      planIcon = '';
      statusText = 'Unknown';
      urgencyLevel = 'low';
  }
  
  // 使用状況による緊急度調整
  const hasHighUsage = Object.values(usage).some(u => u.percentage >= 80);
  const hasMaxedUsage = Object.values(usage).some(u => u.percentage >= 100);
  
  if (hasMaxedUsage) {
    urgencyLevel = 'high';
    isUpgradeRecommended = true;
  } else if (hasHighUsage && urgencyLevel === 'none') {
    urgencyLevel = 'medium';
    isUpgradeRecommended = true;
  }
  
  return {
    planName,
    planIcon,
    statusText,
    isUpgradeRecommended,
    urgencyLevel
  };
}

/**
 * メインのプラン状況取得Hook
 */
export function usePlanStatus(): PlanStatus | null {
  const { user } = useAuth();
  const { projects } = useProjects();
  const { t } = useLanguage();
  const [stripeInfo, setStripeInfo] = useState<{
    cancel_at_period_end?: boolean;
    current_period_end?: number;
  } | null>(null);
  const [isLoadingStripe, setIsLoadingStripe] = useState(false);
  
  // Proユーザーの場合のみStripe情報取得
  useEffect(() => {
    if (user?.id && user.subscriptionStatus === PLAN_TYPES.PRO) {
      setIsLoadingStripe(true);
      fetch(`/api/billing/subscription-info/${user.id}`, {
        headers: { 'x-user-id': user.id }
      })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setStripeInfo(data.subscription);
        }
      })
      .catch(err => console.error('Stripe info fetch failed:', err))
      .finally(() => setIsLoadingStripe(false));
    } else {
      setStripeInfo(null);
    }
  }, [user?.id, user?.subscriptionStatus]);
  
  return useMemo(() => {
    if (!user) return null;
    
    // 基本プラン情報
    const subscriptionStatus = (user as any).subscriptionStatus || PLAN_TYPES.FREE;
    
    // トライアル情報
    const trialDaysRemaining = calculateTrialDaysRemaining((user as any).trialEndDate);
    const isTrialActive = subscriptionStatus === PLAN_TYPES.TRIAL && (trialDaysRemaining === null || trialDaysRemaining > 0);
    
    // プラン制限取得
    const limits = getPlanLimits(subscriptionStatus);
    
    // 使用状況計算（既存プロジェクトデータから計算）
    const projectsUsed = projects?.length || 0;
    
    // AI分析回数: isAnalyzedフラグがtrueのプロジェクト数
    const analysesUsed = projects?.filter(project => project.isAnalyzed).length || 0;
    
    // 意見数: 全プロジェクトのopinionsCountの合計
    const opinionsUsed = projects?.reduce((total, project) => total + (project.opinionsCount || 0), 0) || 0;
    
    const usage = {
      projects: calculateUsage(projectsUsed, limits.projects),
      analyses: calculateUsage(analysesUsed, limits.analysesTotal),
      opinions: calculateUsage(opinionsUsed, limits.opinionsPerProject)
    };
    
    // トライアル利用履歴チェック
    const hasUsedTrial = (user as any)?.trialStartDate != null; // null または undefined でない場合は利用済み
    
    // Stripeトライアル優先のため、カスタムトライアルボタンを無効化
    // 新規ユーザーはUpgradeボタン経由でStripeトライアルを利用
    const canStartTrial = false;
    
    // キャンセル状態判定（新規追加）
    const isCancelScheduled = stripeInfo?.cancel_at_period_end === true;
    const contractEndDate = stripeInfo?.current_period_end 
      ? new Date(stripeInfo.current_period_end * 1000) 
      : null;
    
    // 表示用情報生成
    const displayInfo = generateDisplayInfo(subscriptionStatus, trialDaysRemaining, usage, t);
    
    return {
      subscriptionStatus: subscriptionStatus as PlanStatus['subscriptionStatus'],
      isTrialActive,
      trialDaysRemaining,
      hasUsedTrial,
      canStartTrial,
      trialEndDate: (user as any).trialEndDate || null,
      nextBillingDate: calculateNextBillingDate(user),
      usage,
      limits,
      displayInfo,
      
      // 新規フィールド
      isCancelScheduled,
      contractEndDate,
      isLoadingStripe
    };
    
  }, [user, projects, stripeInfo, isLoadingStripe, t]);
}

/**
 * プラン状況の簡易バージョン（パフォーマンス重視）
 */
export function usePlanStatusLite() {
  const { user } = useAuth();
  
  return useMemo(() => {
    if (!user) return null;
    
    const subscriptionStatus = (user as any).subscriptionStatus || PLAN_TYPES.FREE;
    const trialDaysRemaining = calculateTrialDaysRemaining((user as any).trialEndDate);
    const isTrialActive = subscriptionStatus === PLAN_TYPES.TRIAL && (trialDaysRemaining === null || trialDaysRemaining > 0);
    
    // 期限切れトライアルは実質フリープランとして扱う
    const effectiveStatus = (subscriptionStatus === PLAN_TYPES.TRIAL && !isTrialActive) ? PLAN_TYPES.FREE : subscriptionStatus;
    
    return {
      subscriptionStatus,
      effectiveStatus, // 実際の制限で使用するステータス
      trialDaysRemaining,
      isTrialActive,
    };
  }, [user]);
}