/**
 * A/Bテスト用制限値調整設定
 * 環境変数で制限値を動的に設定可能
 */

// Constants
const DEFAULT_TRIAL_DURATION_DAYS = 14;
const DEFAULT_PRO_PRICE = '$20';
const DEFAULT_PRO_BILLING = '月額（税別）';

// Analysis Limits Defaults (全体制限のみ)
const DEFAULT_ANALYSIS_TOTAL_DAILY = 10;
const DEFAULT_ANALYSIS_TOTAL_MONTHLY = 100;

// Trial Analysis Limits Defaults (全体制限のみ)
const DEFAULT_TRIAL_ANALYSIS_TOTAL_DAILY = 7;
const DEFAULT_TRIAL_ANALYSIS_TOTAL_MONTHLY = 50;

// Plan Limits Defaults
const DEFAULT_FREE_MAX_PROJECTS = 1;
const DEFAULT_FREE_MAX_ANALYSES_TOTAL = 1;
const DEFAULT_FREE_MAX_OPINIONS_PER_PROJECT = 50;

const DEFAULT_TRIAL_MAX_PROJECTS = 5;
const DEFAULT_TRIAL_MAX_ANALYSES_TOTAL = 50;
const DEFAULT_TRIAL_MAX_OPINIONS_PER_PROJECT = 150;

const DEFAULT_PRO_UNLIMITED = -1;

interface AnalysisLimits {
  total: {
    daily: number;
    monthly: number;
  };
}

interface TrialAnalysisLimits {
  total: {
    daily: number;
    monthly: number;
  };
}

interface PlanLimits {
  maxProjects: number;
  maxAnalysesTotal: number;
  maxOpinionsPerProject: number;
}

interface FreemiumLimits {
  free: PlanLimits;
  trial: PlanLimits;
  pro: PlanLimits;
}

export class LimitsConfig {
  /**
   * 価格情報を環境変数から取得
   */
  static getPricingInfo() {
    return {
      pro: {
        price: process.env.PRO_PLAN_PRICE || DEFAULT_PRO_PRICE,
        billing: process.env.PRO_PLAN_BILLING || DEFAULT_PRO_BILLING
      }
    };
  }

  /**
   * AI分析制限値を環境変数から取得（Proプラン用）
   */
  static getAnalysisLimits(): AnalysisLimits {
    return {
      total: {
        daily: parseInt(process.env.ANALYSIS_LIMIT_TOTAL_DAILY || DEFAULT_ANALYSIS_TOTAL_DAILY.toString(), 10),
        monthly: parseInt(process.env.ANALYSIS_LIMIT_TOTAL_MONTHLY || DEFAULT_ANALYSIS_TOTAL_MONTHLY.toString(), 10)
      }
    };
  }

  /**
   * トライアルプラン用AI分析制限値を環境変数から取得（Proより少なく設定）
   */
  static getTrialAnalysisLimits(): TrialAnalysisLimits {
    return {
      total: {
        daily: parseInt(process.env.TRIAL_ANALYSIS_LIMIT_TOTAL_DAILY || DEFAULT_TRIAL_ANALYSIS_TOTAL_DAILY.toString(), 10),
        monthly: parseInt(process.env.TRIAL_ANALYSIS_LIMIT_TOTAL_MONTHLY || DEFAULT_TRIAL_ANALYSIS_TOTAL_MONTHLY.toString(), 10)
      }
    };
  }

  /**
   * プラン別制限値を環境変数から取得
   */
  static getFreemiumLimits(): FreemiumLimits {
    return {
      free: {
        maxProjects: parseInt(process.env.FREE_PLAN_MAX_PROJECTS || DEFAULT_FREE_MAX_PROJECTS.toString(), 10),
        maxAnalysesTotal: parseInt(process.env.FREE_PLAN_MAX_ANALYSES_TOTAL || DEFAULT_FREE_MAX_ANALYSES_TOTAL.toString(), 10),
        maxOpinionsPerProject: parseInt(process.env.FREE_PLAN_MAX_OPINIONS_PER_PROJECT || DEFAULT_FREE_MAX_OPINIONS_PER_PROJECT.toString(), 10)
      },
      trial: {
        maxProjects: parseInt(process.env.TRIAL_PLAN_MAX_PROJECTS || DEFAULT_TRIAL_MAX_PROJECTS.toString(), 10),
        maxAnalysesTotal: parseInt(process.env.TRIAL_PLAN_MAX_ANALYSES_TOTAL || DEFAULT_TRIAL_MAX_ANALYSES_TOTAL.toString(), 10),
        maxOpinionsPerProject: parseInt(process.env.TRIAL_PLAN_MAX_OPINIONS_PER_PROJECT || DEFAULT_TRIAL_MAX_OPINIONS_PER_PROJECT.toString(), 10)
      },
      pro: {
        maxProjects: parseInt(process.env.PRO_PLAN_MAX_PROJECTS || DEFAULT_PRO_UNLIMITED.toString(), 10),
        maxAnalysesTotal: parseInt(process.env.PRO_PLAN_MAX_ANALYSES_TOTAL || DEFAULT_PRO_UNLIMITED.toString(), 10),
        maxOpinionsPerProject: parseInt(process.env.PRO_PLAN_MAX_OPINIONS_PER_PROJECT || DEFAULT_PRO_UNLIMITED.toString(), 10)
      }
    };
  }

  /**
   * トライアル期間を環境変数から取得（日数）
   */
  static getTrialDurationDays(): number {
    return parseInt(process.env.TRIAL_DURATION_DAYS || DEFAULT_TRIAL_DURATION_DAYS.toString(), 10);
  }

  /**
   * フリーミアム開始日を環境変数から取得
   */
  static getFreemiumLaunchDate(): Date {
    const envDate = process.env.FREEMIUM_LAUNCH_DATE;
    return envDate ? new Date(envDate) : new Date('2025-07-22T00:00:00.000Z');
  }

  /**
   * 設定値のバリデーション
   */
  static validateLimits(): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // AI分析制限値の検証
    const analysisLimits = this.getAnalysisLimits();
    if (analysisLimits.total.daily < 0) {
      errors.push('ANALYSIS_LIMIT_TOTAL_DAILY must be non-negative');
    }
    if (analysisLimits.total.monthly < 0) {
      errors.push('ANALYSIS_LIMIT_TOTAL_MONTHLY must be non-negative');
    }

    // フリーミアム制限値の検証
    const freemiumLimits = this.getFreemiumLimits();
    if (freemiumLimits.free.maxProjects < 0) {
      errors.push('FREE_PLAN_MAX_PROJECTS must be non-negative');
    }
    if (freemiumLimits.trial.maxProjects < 0) {
      errors.push('TRIAL_PLAN_MAX_PROJECTS must be non-negative');
    }

    // トライアル期間の検証
    const trialDays = this.getTrialDurationDays();
    if (trialDays < 1 || trialDays > 365) {
      errors.push('TRIAL_DURATION_DAYS must be between 1 and 365');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * 現在の設定値をログ出力
   */
  static logCurrentSettings(): void {
    const analysisLimits = this.getAnalysisLimits();
    const freemiumLimits = this.getFreemiumLimits();
    const trialDays = this.getTrialDurationDays();

    console.log('[LimitsConfig] 📊 Current Limit Settings:', {
      analysis: {
        total: {
          daily: analysisLimits.total.daily,
          monthly: analysisLimits.total.monthly
        }
      },
      freemium: {
        free: freemiumLimits.free,
        trial: freemiumLimits.trial,
        trialDurationDays: trialDays
      },
      freemiumLaunchDate: this.getFreemiumLaunchDate().toISOString()
    });
  }
}

export type { AnalysisLimits, TrialAnalysisLimits, PlanLimits, FreemiumLimits };