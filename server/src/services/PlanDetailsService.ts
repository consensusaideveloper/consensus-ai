/**
 * プラン詳細一元管理サービス
 * UI表示用のプラン情報、制限値、メッセージを統一的に管理
 */

import { LimitsConfig, PlanLimits, AnalysisLimits } from '../config/limits';
import { planTranslations, PlanTranslations } from '../translations/planTranslations';
import { PLAN_TYPES } from '../constants/planTypes';

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

interface CompletePlanDetails {
  // 基本制限情報
  limits: {
    plan: PlanLimits;
    analysis: AnalysisLimits;
  };
  
  // 表示用情報
  display: PlanDisplayInfo;
  
  // 機能リスト
  features: PlanFeature[];
  
  // メッセージ
  messages: PlanMessages;
  
  // メタ情報
  meta: {
    duration?: number; // トライアル期間（日数）
    autoUpgrade?: boolean;
    popular?: boolean;
  };
}

interface AllPlanDetails {
  free: CompletePlanDetails;
  trial: CompletePlanDetails;
  pro: CompletePlanDetails;
}

export class PlanDetailsService {
  /**
   * 翻訳文字列に変数を挿入するヘルパー関数
   */
  private static interpolate(template: string, variables: Record<string, string | number>): string {
    return template.replace(/\{(\w+)\}/g, (match, key) => {
      return String(variables[key] || match);
    });
  }

  /**
   * 全プランの詳細情報を取得
   */
  static getAllPlanDetails(language: 'ja' | 'en' = 'ja'): AllPlanDetails {
    const planLimits = LimitsConfig.getFreemiumLimits();
    const analysisLimits = LimitsConfig.getAnalysisLimits();
    const trialAnalysisLimits = LimitsConfig.getTrialAnalysisLimits();
    const trialDuration = LimitsConfig.getTrialDurationDays();
    const pricingInfo = LimitsConfig.getPricingInfo();

    return {
      free: this.getFreePlanDetails(planLimits.free, analysisLimits, language),
      trial: this.getTrialPlanDetails(planLimits.trial, trialAnalysisLimits, trialDuration, language),
      pro: this.getProPlanDetails(planLimits.pro, analysisLimits, pricingInfo.pro, language)
    };
  }

  /**
   * 特定プランの詳細情報を取得
   */
  static getPlanDetails(planType: typeof PLAN_TYPES.FREE | typeof PLAN_TYPES.TRIAL | typeof PLAN_TYPES.PRO, language: 'ja' | 'en' = 'ja'): CompletePlanDetails {
    const allPlans = this.getAllPlanDetails(language);
    return allPlans[planType];
  }

  /**
   * フリープラン詳細
   */
  private static getFreePlanDetails(limits: PlanLimits, analysisLimits: AnalysisLimits, language: 'ja' | 'en'): CompletePlanDetails {
    const translations = planTranslations[language].free;
    
    return {
      limits: {
        plan: limits,
        analysis: analysisLimits
      },
      display: {
        name: translations.display.name,
        icon: '📋',
        tagline: translations.display.tagline,
        highlights: translations.display.highlights
      },
      features: [
        {
          key: 'projects',
          title: translations.features.projects.title,
          description: this.interpolate(translations.features.projects.description, {
            maxProjects: limits.maxProjects
          }),
          highlight: false
        },
        {
          key: 'analysis',
          title: translations.features.analysis.title,
          description: this.interpolate(translations.features.analysis.description, {
            maxAnalysesTotal: limits.maxAnalysesTotal
          }),
          highlight: false
        },
        {
          key: 'opinions',
          title: translations.features.opinions.title,
          description: this.interpolate(translations.features.opinions.description, {
            maxOpinionsPerProject: limits.maxOpinionsPerProject
          }),
          highlight: false
        }
      ],
      messages: {
        limitReached: {
          project: this.interpolate(translations.messages.limitReached.project, {
            maxProjects: limits.maxProjects
          }),
          analysis: this.interpolate(translations.messages.limitReached.analysis, {
            maxAnalysesTotal: limits.maxAnalysesTotal
          }),
          opinion: this.interpolate(translations.messages.limitReached.opinion, {
            maxOpinionsPerProject: limits.maxOpinionsPerProject
          })
        },
        upgrade: {
          banner: translations.messages.upgrade.banner,
          cta: translations.messages.upgrade.cta,
          urgentCta: translations.messages.upgrade.urgentCta
        },
        trial: {
          confirmation: translations.messages.trial.confirmation,
          remaining: translations.messages.trial.remaining,
          ending: translations.messages.trial.ending
        }
      },
      meta: {
        popular: false,
        autoUpgrade: false
      }
    };
  }

  /**
   * トライアルプラン詳細
   */
  private static getTrialPlanDetails(limits: PlanLimits, analysisLimits: AnalysisLimits, duration: number, language: 'ja' | 'en'): CompletePlanDetails {
    const translations = planTranslations[language].trial;
    
    return {
      limits: {
        plan: limits,
        analysis: analysisLimits
      },
      display: {
        name: translations.display.name,
        icon: '🚀',
        tagline: this.interpolate(translations.display.tagline, { duration }),
        price: language === 'ja' ? '無料' : 'Free',
        billing: language === 'ja' ? `${duration}日間限定` : `${duration} days limited`,
        highlights: translations.display.highlights
      },
      features: [
        {
          key: 'projects',
          title: translations.features.projects.title,
          description: this.interpolate(translations.features.projects.description, {
            maxProjects: limits.maxProjects
          }),
          highlight: true
        },
        {
          key: 'analysis',
          title: translations.features.analysis.title,
          description: this.interpolate(translations.features.analysis.description, {
            dailyTotal: analysisLimits.total.daily,
            monthlyTotal: analysisLimits.total.monthly
          }),
          highlight: true
        },
        {
          key: 'opinions',
          title: translations.features.opinions.title,
          description: this.interpolate(translations.features.opinions.description, {
            maxOpinionsPerProject: limits.maxOpinionsPerProject
          }),
          highlight: true
        }
      ],
      messages: {
        limitReached: {
          project: this.interpolate(translations.messages.limitReached.project, {
            maxProjects: limits.maxProjects
          }),
          analysis: this.interpolate(translations.messages.limitReached.analysis, {
            dailyTotal: analysisLimits.total.daily,
            monthlyTotal: analysisLimits.total.monthly
          }),
          opinion: this.interpolate(translations.messages.limitReached.opinion, {
            maxOpinionsPerProject: limits.maxOpinionsPerProject
          })
        },
        upgrade: {
          banner: translations.messages.upgrade.banner,
          cta: translations.messages.upgrade.cta,
          urgentCta: translations.messages.upgrade.urgentCta
        },
        trial: {
          confirmation: this.interpolate(translations.messages.trial.confirmation, { duration }),
          remaining: translations.messages.trial.remaining,
          ending: translations.messages.trial.ending
        }
      },
      meta: {
        duration,
        popular: true,
        autoUpgrade: false
      }
    };
  }

  /**
   * プロプラン詳細
   */
  private static getProPlanDetails(limits: PlanLimits, analysisLimits: AnalysisLimits, pricing: { price: string; billing: string }, language: 'ja' | 'en'): CompletePlanDetails {
    const translations = planTranslations[language].pro;
    
    return {
      limits: {
        plan: limits,
        analysis: analysisLimits
      },
      display: {
        name: translations.display.name,
        icon: '👑',
        tagline: translations.display.tagline,
        price: pricing.price,
        billing: pricing.billing,
        highlights: translations.display.highlights
      },
      features: [
        {
          key: 'projects',
          title: translations.features.projects.title,
          description: translations.features.projects.description,
          highlight: true
        },
        {
          key: 'analysis',
          title: translations.features.analysis.title,
          description: this.interpolate(translations.features.analysis.description, {
            dailyTotal: analysisLimits.total.daily,
            monthlyTotal: analysisLimits.total.monthly
          }),
          highlight: true
        },
        {
          key: 'opinions',
          title: translations.features.opinions.title,
          description: translations.features.opinions.description,
          highlight: true
        },
        {
          key: 'export',
          title: translations.features.export!.title,
          description: translations.features.export!.description,
          highlight: false
        }
      ],
      messages: {
        limitReached: {
          project: translations.messages.limitReached.project, // プロプランは制限拡張なので空文字
          analysis: this.interpolate(translations.messages.limitReached.analysis, {
            dailyTotal: analysisLimits.total.daily
          }),
          opinion: translations.messages.limitReached.opinion // プロプランは制限拡張なので空文字
        },
        upgrade: {
          banner: translations.messages.upgrade.banner,
          cta: translations.messages.upgrade.cta,
          urgentCta: translations.messages.upgrade.urgentCta
        },
        trial: {
          confirmation: translations.messages.trial.confirmation,
          remaining: translations.messages.trial.remaining,
          ending: translations.messages.trial.ending
        }
      },
      meta: {
        popular: false,
        autoUpgrade: false
      }
    };
  }

  /**
   * プラン比較用の簡潔な制限値表示文字列を生成
   */
  static formatLimitDisplay(planType: typeof PLAN_TYPES.FREE | typeof PLAN_TYPES.TRIAL | typeof PLAN_TYPES.PRO, limitType: 'projects' | 'analysis' | 'opinions', language: 'ja' | 'en' = 'ja'): string {
    const planDetails = this.getPlanDetails(planType, language);
    const planLimits = planDetails.limits.plan;
    const analysisLimits = planDetails.limits.analysis;

    const unlimitedText = language === 'ja' ? '制限拡張' : 'Extended Limits';
    const limitedText = language === 'ja' ? '制限あり' : 'Limited';
    
    switch (limitType) {
      case 'projects':
        if (planLimits.maxProjects === -1) {
          return unlimitedText;
        }
        const projectUnit = language === 'ja' ? '個' : '';
        return `${planLimits.maxProjects}${projectUnit}`;
        
      case 'analysis':
        if (planType === PLAN_TYPES.PRO || planType === PLAN_TYPES.TRIAL) {
          const dailyLabel = language === 'ja' ? '日次' : ' daily';
          const monthlyLabel = language === 'ja' ? '回/月次' : ' monthly/';
          const timesLabel = language === 'ja' ? '回' : ' times';
          return `${dailyLabel}${analysisLimits.total.daily}${monthlyLabel}${analysisLimits.total.monthly}${timesLabel}`;
        }
        if (planLimits.maxAnalysesTotal === -1) {
          return unlimitedText;
        }
        const analysisUnit = language === 'ja' ? '回' : ' times';
        return `${planLimits.maxAnalysesTotal}${analysisUnit}`;
        
      case 'opinions':
        if (planLimits.maxOpinionsPerProject === -1) {
          return unlimitedText;
        }
        const opinionUnit = language === 'ja' ? '件' : '';
        return `${planLimits.maxOpinionsPerProject}${opinionUnit}`;
        
      default:
        return limitedText;
    }
  }

  /**
   * バリデーション（設定値の妥当性チェック）
   */
  static validatePlanDetails(): { valid: boolean; errors: string[] } {
    const limitsValidation = LimitsConfig.validateLimits();
    const errors: string[] = [...limitsValidation.errors];

    // 追加のビジネスロジック検証
    const allPlans = this.getAllPlanDetails();
    
    // フリープラン ≤ トライアルプラン の制限値チェック
    if (allPlans.free.limits.plan.maxProjects > allPlans.trial.limits.plan.maxProjects) {
      errors.push('Free plan projects limit should not exceed trial plan limit');
    }
    
    if (allPlans.free.limits.plan.maxAnalysesTotal > allPlans.trial.limits.plan.maxAnalysesTotal) {
      errors.push('Free plan analysis limit should not exceed trial plan limit');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }
}

export type { 
  PlanFeature, 
  PlanDisplayInfo, 
  PlanMessages, 
  CompletePlanDetails, 
  AllPlanDetails 
};