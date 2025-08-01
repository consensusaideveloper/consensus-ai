/**
 * プラン詳細情報取得フック
 * バックエンドからプラン詳細を動的取得し、キャッシュして提供
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from './useAuth';
import { useLanguage } from './useLanguage';
import { PLAN_TYPES, type SubscriptionPlanType } from '../constants/planTypes';

// バックエンドのPlanDetailsServiceと同じ型定義
interface PlanFeature {
  key: string;
  title: string;
  description: string;
  highlight?: boolean;
}

interface PlanDisplayInfo {
  name: string;
  icon: string;
  tagline: string;
  price?: string;
  billing?: string;
  highlights: string[];
}

interface PlanMessages {
  limitReached: {
    project: string;
    analysis: string;
    opinion: string;
  };
  upgrade: {
    banner: string;
    cta: string;
    urgentCta?: string;
  };
  trial: {
    confirmation: string;
    remaining: string;
    ending: string;
  };
}

interface PlanLimits {
  maxProjects: number;
  maxAnalysesTotal: number;
  maxOpinionsPerProject: number;
}

interface AnalysisLimits {
  total: {
    daily: number;
    monthly: number;
  };
}

interface CompletePlanDetails {
  limits: {
    plan: PlanLimits;
    analysis: AnalysisLimits;
  };
  display: PlanDisplayInfo;
  features: PlanFeature[];
  messages: PlanMessages;
  meta: {
    duration?: number;
    autoUpgrade?: boolean;
    popular?: boolean;
  };
}

interface AllPlanDetails {
  free: CompletePlanDetails;
  trial: CompletePlanDetails;
  pro: CompletePlanDetails;
}

interface PlanDetailsState {
  plans: AllPlanDetails | null;
  comparison: any | null;
  loading: boolean;
  error: string | null;
  lastFetched: number | null;
}

interface PlanDetailsAPI {
  // プラン詳細取得
  getAllPlans: () => AllPlanDetails | null;
  getPlan: (planType: SubscriptionPlanType) => CompletePlanDetails | null;
  
  // 比較データ取得
  getComparison: () => any | null;
  
  // フォーマット済み制限値取得
  formatLimit: (planType: SubscriptionPlanType, limitType: 'projects' | 'analysis' | 'opinions') => string;
  
  // メッセージ取得
  getMessage: (planType: SubscriptionPlanType, messageType: 'limitReached' | 'upgrade' | 'trial', subType?: string) => string;
  
  // 状態管理
  refresh: () => Promise<void>;
  isLoading: boolean;
  error: string | null;
}

// キャッシュ設定 (環境変数対応)
const CACHE_DURATION = parseInt(import.meta.env.VITE_PLAN_CACHE_DURATION_MS || '300000', 10); // デフォルト5分間キャッシュ
let planDetailsCache: { data: AllPlanDetails; timestamp: number } | null = null;
let comparisonCache: { data: any; timestamp: number } | null = null;

/**
 * プラン詳細APIクライアント
 */
class PlanDetailsClient {
  /**
   * 全プラン詳細取得
   */
  static async fetchAllPlanDetails(userId: string, language: string = 'ja'): Promise<AllPlanDetails> {
    // キャッシュチェック
    if (planDetailsCache && (Date.now() - planDetailsCache.timestamp) < CACHE_DURATION) {
      return planDetailsCache.data;
    }
    
    const response = await fetch(`/api/plans/details?language=${language}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': userId
      }
    });

    if (!response.ok) {
      throw new Error(`プラン詳細取得に失敗: ${response.status} ${response.statusText}`);
    }

    const result = await response.json();
    
    if (!result.success) {
      throw new Error(result.message || 'プラン詳細取得に失敗しました');
    }

    // キャッシュ更新
    planDetailsCache = {
      data: result.data,
      timestamp: Date.now()
    };

    return result.data;
  }

  /**
   * プラン比較データ取得
   */
  static async fetchPlanComparison(userId: string, language: string = 'ja'): Promise<any> {
    // キャッシュチェック
    if (comparisonCache && (Date.now() - comparisonCache.timestamp) < CACHE_DURATION) {
      return comparisonCache.data;
    }
    
    const response = await fetch(`/api/plans/comparison?language=${language}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': userId
      }
    });

    if (!response.ok) {
      throw new Error(`プラン比較データ取得に失敗: ${response.status} ${response.statusText}`);
    }

    const result = await response.json();
    
    if (!result.success) {
      throw new Error(result.message || 'プラン比較データ取得に失敗しました');
    }

    // キャッシュ更新
    comparisonCache = {
      data: result.data,
      timestamp: Date.now()
    };

    return result.data;
  }
}

/**
 * プラン詳細取得フック
 */
export function usePlanDetails(): PlanDetailsAPI {
  const { user } = useAuth();
  const { t, language } = useLanguage();
  const [state, setState] = useState<PlanDetailsState>({
    plans: null,
    comparison: null,
    loading: true,
    error: null,
    lastFetched: null
  });

  /**
   * プラン詳細データ取得
   */
  const fetchPlanDetails = useCallback(async () => {
    if (!user?.id) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: 'ユーザー認証が必要です'
      }));
      return;
    }

    try {
      setState(prev => ({ ...prev, loading: true, error: null }));

      const [plans, comparison] = await Promise.all([
        PlanDetailsClient.fetchAllPlanDetails(user.id, language),
        PlanDetailsClient.fetchPlanComparison(user.id, language)
      ]);

      setState({
        plans,
        comparison,
        loading: false,
        error: null,
        lastFetched: Date.now()
      });

    } catch (error) {
      console.error('[usePlanDetails] ❌ プラン詳細取得エラー:', error);
      setState(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'プラン詳細の取得に失敗しました'
      }));
    }
  }, [user?.id, language]);

  /**
   * 初回データ取得
   */
  useEffect(() => {
    if (user) {
      fetchPlanDetails();
    }
  }, [user, fetchPlanDetails]);

  /**
   * API関数群をメモ化
   */
  const api = useMemo((): PlanDetailsAPI => ({
    // プラン詳細取得
    getAllPlans: () => state.plans,
    
    getPlan: (planType: SubscriptionPlanType) => {
      return state.plans?.[planType] || null;
    },
    
    // 比較データ取得
    getComparison: () => state.comparison,
    
    // フォーマット済み制限値
    formatLimit: (planType: SubscriptionPlanType, limitType: 'projects' | 'analysis' | 'opinions') => {
      const plan = state.plans?.[planType];
      if (!plan) return t('accountSettings.planStatus.comparison.limits.loading');
      
      const planLimits = plan.limits.plan;
      const analysisLimits = plan.limits.analysis;
      
      switch (limitType) {
        case 'projects':
          return planLimits.maxProjects === -1 
            ? t('accountSettings.planStatus.comparison.limits.unlimited')
            : `${planLimits.maxProjects}${t('accountSettings.planStatus.comparison.units.projects')}`;
          
        case 'analysis':
          if (planType === PLAN_TYPES.PRO || planType === PLAN_TYPES.TRIAL) {
            return t('accountSettings.planStatus.comparison.limits.dailyMonthly', {
              daily: analysisLimits.total.daily,
              monthly: analysisLimits.total.monthly
            });
          }
          return planLimits.maxAnalysesTotal === -1 
            ? t('accountSettings.planStatus.comparison.limits.unlimited')
            : `${planLimits.maxAnalysesTotal}${t('accountSettings.planStatus.comparison.units.analyses')}`;
          
        case 'opinions':
          return planLimits.maxOpinionsPerProject === -1 
            ? t('accountSettings.planStatus.comparison.limits.unlimited')
            : `${planLimits.maxOpinionsPerProject}${t('accountSettings.planStatus.comparison.units.opinions')}`;
          
        default:
          return t('accountSettings.planStatus.comparison.limits.restricted');
      }
    },
    
    // メッセージ取得
    getMessage: (planType: SubscriptionPlanType, messageType: 'limitReached' | 'upgrade' | 'trial', subType?: string) => {
      const plan = state.plans?.[planType];
      if (!plan) return '';
      
      const messages = plan.messages[messageType];
      
      if (subType && typeof messages === 'object') {
        return (messages as any)[subType] || '';
      }
      
      if (typeof messages === 'string') {
        return messages;
      }
      
      return '';
    },
    
    // 状態管理
    refresh: fetchPlanDetails,
    isLoading: state.loading,
    error: state.error
    
  }), [state, fetchPlanDetails, t]);

  return api;
}

/**
 * プラン詳細軽量版フック（パフォーマンス重視）
 */
export function usePlanDetailsLite() {
  const { user } = useAuth();
  const { t, language } = useLanguage();
  const [comparison, setComparison] = useState<any>(null);

  useEffect(() => {
    if (user?.id && !comparison) {
      // 比較データのみ取得（軽量）
      PlanDetailsClient.fetchPlanComparison(user.id, language)
        .then(setComparison)
        .catch(console.error);
    }
  }, [user, comparison, language]);

  return {
    comparison,
    formatLimit: (planType: SubscriptionPlanType, limitType: 'projects' | 'analysis' | 'opinions') => {
      return comparison?.[planType]?.[limitType] || t('accountSettings.planStatus.comparison.limits.loading');
    }
  };
}

// 型をエクスポート
export type {
  PlanFeature,
  PlanDisplayInfo,
  PlanMessages,
  PlanLimits,
  AnalysisLimits,
  CompletePlanDetails,
  AllPlanDetails,
  PlanDetailsAPI
};