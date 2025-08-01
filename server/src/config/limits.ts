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

// AI Analysis Timeout Defaults (in milliseconds)
const DEFAULT_ANALYSIS_REQUEST_TIMEOUT_MS = 600000; // 10 minutes
const DEFAULT_ANALYSIS_RESPONSE_TIMEOUT_MS = 600000; // 10 minutes
const DEFAULT_SERVER_TIMEOUT_MS = 600000; // 10 minutes
const DEFAULT_SERVER_KEEP_ALIVE_TIMEOUT_MS = 600000; // 10 minutes
const DEFAULT_SERVER_HEADERS_TIMEOUT_MS = 600000; // 10 minutes

// AI Service Configuration Defaults
const DEFAULT_AI_MODEL = 'gpt-4o-mini';
const DEFAULT_AI_MAX_COMPLETION_TOKENS = 4000;
const DEFAULT_AI_MAX_TOKENS = 4000;
const DEFAULT_AI_REQUEST_TIMEOUT_MS = 120000; // 2 minutes

// AI Analysis Processing Limits Defaults
const DEFAULT_AI_OPTIMAL_TOKEN_LIMIT = 4000;
const DEFAULT_AI_OPTIMAL_MAX_OPINIONS = 15;
const DEFAULT_AI_INCREMENTAL_MAX_TOKENS = 3000;
const DEFAULT_AI_INCREMENTAL_MAX_OPINIONS = 10;

// AI Reliability and Retry Defaults
const DEFAULT_AI_MAX_RETRY_COUNT = 3;
const DEFAULT_AI_CONFIDENCE_THRESHOLD = 0.7;
const DEFAULT_AI_AMBIGUITY_THRESHOLD = 0.4;
const DEFAULT_AI_BORDERLINE_THRESHOLD = 0.6;
const DEFAULT_AI_LOW_CONFIDENCE_THRESHOLD = 0.5;

// Firebase Operation Timeout Defaults (in milliseconds)
const DEFAULT_FIREBASE_OPERATION_TIMEOUT_MS = 5000;
const DEFAULT_FIREBASE_UPDATE_TIMEOUT_MS = 5000;
const DEFAULT_FIREBASE_DEVELOPMENT_TIMEOUT_MS = 3000;
const DEFAULT_FIREBASE_PRODUCTION_TIMEOUT_MS = 10000;

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

interface AITimeoutConfig {
  analysisRequest: number;
  analysisResponse: number;
  server: number;
  serverKeepAlive: number;
  serverHeaders: number;
}

interface AIServiceConfig {
  defaultModel: string;
  maxCompletionTokens: number;
  maxTokens: number;
  requestTimeout: number;
}

interface AIProcessingLimits {
  optimal: {
    tokenLimit: number;
    maxOpinions: number;
  };
  incremental: {
    maxTokens: number;
    maxOpinions: number;
  };
}

interface AIReliabilityConfig {
  maxRetryCount: number;
  confidenceThreshold: number;
  ambiguityThreshold: number;
  borderlineThreshold: number;
  lowConfidenceThreshold: number;
}

interface FirebaseTimeoutConfig {
  operation: number;
  update: number;
  development: number;
  production: number;
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
   * AI分析タイムアウト設定を環境変数から取得
   */
  static getAITimeoutConfig(): AITimeoutConfig {
    return {
      analysisRequest: parseInt(process.env.ANALYSIS_REQUEST_TIMEOUT_MS || DEFAULT_ANALYSIS_REQUEST_TIMEOUT_MS.toString(), 10),
      analysisResponse: parseInt(process.env.ANALYSIS_RESPONSE_TIMEOUT_MS || DEFAULT_ANALYSIS_RESPONSE_TIMEOUT_MS.toString(), 10),
      server: parseInt(process.env.SERVER_TIMEOUT_MS || DEFAULT_SERVER_TIMEOUT_MS.toString(), 10),
      serverKeepAlive: parseInt(process.env.SERVER_KEEP_ALIVE_TIMEOUT_MS || DEFAULT_SERVER_KEEP_ALIVE_TIMEOUT_MS.toString(), 10),
      serverHeaders: parseInt(process.env.SERVER_HEADERS_TIMEOUT_MS || DEFAULT_SERVER_HEADERS_TIMEOUT_MS.toString(), 10)
    };
  }

  /**
   * AIサービス設定を環境変数から取得
   */
  static getAIServiceConfig(): AIServiceConfig {
    return {
      defaultModel: process.env.AI_DEFAULT_MODEL || DEFAULT_AI_MODEL,
      maxCompletionTokens: parseInt(process.env.AI_MAX_COMPLETION_TOKENS || DEFAULT_AI_MAX_COMPLETION_TOKENS.toString(), 10),
      maxTokens: parseInt(process.env.AI_MAX_TOKENS || DEFAULT_AI_MAX_TOKENS.toString(), 10),
      requestTimeout: parseInt(process.env.AI_REQUEST_TIMEOUT_MS || DEFAULT_AI_REQUEST_TIMEOUT_MS.toString(), 10)
    };
  }

  /**
   * AI分析処理制限を環境変数から取得
   */
  static getAIProcessingLimits(): AIProcessingLimits {
    return {
      optimal: {
        tokenLimit: parseInt(process.env.AI_OPTIMAL_TOKEN_LIMIT || DEFAULT_AI_OPTIMAL_TOKEN_LIMIT.toString(), 10),
        maxOpinions: parseInt(process.env.AI_OPTIMAL_MAX_OPINIONS || DEFAULT_AI_OPTIMAL_MAX_OPINIONS.toString(), 10)
      },
      incremental: {
        maxTokens: parseInt(process.env.AI_INCREMENTAL_MAX_TOKENS || DEFAULT_AI_INCREMENTAL_MAX_TOKENS.toString(), 10),
        maxOpinions: parseInt(process.env.AI_INCREMENTAL_MAX_OPINIONS || DEFAULT_AI_INCREMENTAL_MAX_OPINIONS.toString(), 10)
      }
    };
  }

  /**
   * AI信頼性・リトライ設定を環境変数から取得
   */
  static getAIReliabilityConfig(): AIReliabilityConfig {
    return {
      maxRetryCount: parseInt(process.env.AI_MAX_RETRY_COUNT || DEFAULT_AI_MAX_RETRY_COUNT.toString(), 10),
      confidenceThreshold: parseFloat(process.env.AI_CONFIDENCE_THRESHOLD || DEFAULT_AI_CONFIDENCE_THRESHOLD.toString()),
      ambiguityThreshold: parseFloat(process.env.AI_AMBIGUITY_THRESHOLD || DEFAULT_AI_AMBIGUITY_THRESHOLD.toString()),
      borderlineThreshold: parseFloat(process.env.AI_BORDERLINE_THRESHOLD || DEFAULT_AI_BORDERLINE_THRESHOLD.toString()),
      lowConfidenceThreshold: parseFloat(process.env.AI_LOW_CONFIDENCE_THRESHOLD || DEFAULT_AI_LOW_CONFIDENCE_THRESHOLD.toString())
    };
  }

  /**
   * Firebase操作タイムアウト設定を環境変数から取得
   */
  static getFirebaseTimeoutConfig(): FirebaseTimeoutConfig {
    return {
      operation: parseInt(process.env.FIREBASE_OPERATION_TIMEOUT_MS || DEFAULT_FIREBASE_OPERATION_TIMEOUT_MS.toString(), 10),
      update: parseInt(process.env.FIREBASE_UPDATE_TIMEOUT_MS || DEFAULT_FIREBASE_UPDATE_TIMEOUT_MS.toString(), 10),
      development: parseInt(process.env.FIREBASE_DEVELOPMENT_TIMEOUT_MS || DEFAULT_FIREBASE_DEVELOPMENT_TIMEOUT_MS.toString(), 10),
      production: parseInt(process.env.FIREBASE_PRODUCTION_TIMEOUT_MS || DEFAULT_FIREBASE_PRODUCTION_TIMEOUT_MS.toString(), 10)
    };
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

    // AI タイムアウト設定の検証
    const aiTimeouts = this.getAITimeoutConfig();
    if (aiTimeouts.analysisRequest < 1000 || aiTimeouts.analysisRequest > 3600000) {
      errors.push('ANALYSIS_REQUEST_TIMEOUT_MS must be between 1000 and 3600000 (1s to 1h)');
    }
    if (aiTimeouts.server < 1000 || aiTimeouts.server > 3600000) {
      errors.push('SERVER_TIMEOUT_MS must be between 1000 and 3600000 (1s to 1h)');
    }

    // AIサービス設定の検証
    const aiService = this.getAIServiceConfig();
    if (aiService.maxTokens < 100 || aiService.maxTokens > 20000) {
      errors.push('AI_MAX_TOKENS must be between 100 and 20000');
    }
    if (aiService.requestTimeout < 1000 || aiService.requestTimeout > 600000) {
      errors.push('AI_REQUEST_TIMEOUT_MS must be between 1000 and 600000 (1s to 10m)');
    }

    // AI処理制限の検証
    const aiLimits = this.getAIProcessingLimits();
    if (aiLimits.optimal.maxOpinions < 1 || aiLimits.optimal.maxOpinions > 50) {
      errors.push('AI_OPTIMAL_MAX_OPINIONS must be between 1 and 50');
    }
    if (aiLimits.incremental.maxOpinions < 1 || aiLimits.incremental.maxOpinions > 30) {
      errors.push('AI_INCREMENTAL_MAX_OPINIONS must be between 1 and 30');
    }

    // AI信頼性設定の検証
    const aiReliability = this.getAIReliabilityConfig();
    if (aiReliability.maxRetryCount < 0 || aiReliability.maxRetryCount > 10) {
      errors.push('AI_MAX_RETRY_COUNT must be between 0 and 10');
    }
    if (aiReliability.confidenceThreshold < 0 || aiReliability.confidenceThreshold > 1) {
      errors.push('AI_CONFIDENCE_THRESHOLD must be between 0 and 1');
    }
    if (aiReliability.ambiguityThreshold < 0 || aiReliability.ambiguityThreshold > 1) {
      errors.push('AI_AMBIGUITY_THRESHOLD must be between 0 and 1');
    }

    // Firebaseタイムアウト設定の検証
    const firebaseTimeouts = this.getFirebaseTimeoutConfig();
    if (firebaseTimeouts.operation < 1000 || firebaseTimeouts.operation > 60000) {
      errors.push('FIREBASE_OPERATION_TIMEOUT_MS must be between 1000 and 60000 (1s to 1m)');
    }
    if (firebaseTimeouts.update < 1000 || firebaseTimeouts.update > 60000) {
      errors.push('FIREBASE_UPDATE_TIMEOUT_MS must be between 1000 and 60000 (1s to 1m)');
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
    const aiTimeouts = this.getAITimeoutConfig();
    const aiService = this.getAIServiceConfig();
    const aiProcessing = this.getAIProcessingLimits();
    const aiReliability = this.getAIReliabilityConfig();
    const firebaseTimeouts = this.getFirebaseTimeoutConfig();

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
      freemiumLaunchDate: this.getFreemiumLaunchDate().toISOString(),
      aiTimeouts: {
        analysisRequest: `${aiTimeouts.analysisRequest}ms`,
        analysisResponse: `${aiTimeouts.analysisResponse}ms`,
        server: `${aiTimeouts.server}ms`
      },
      aiService: {
        defaultModel: aiService.defaultModel,
        maxTokens: aiService.maxTokens,
        requestTimeout: `${aiService.requestTimeout}ms`
      },
      aiProcessing: {
        optimal: aiProcessing.optimal,
        incremental: aiProcessing.incremental
      },
      aiReliability: {
        maxRetryCount: aiReliability.maxRetryCount,
        confidenceThreshold: aiReliability.confidenceThreshold,
        ambiguityThreshold: aiReliability.ambiguityThreshold,
        borderlineThreshold: aiReliability.borderlineThreshold,
        lowConfidenceThreshold: aiReliability.lowConfidenceThreshold
      },
      firebaseTimeouts: {
        operation: `${firebaseTimeouts.operation}ms`,
        update: `${firebaseTimeouts.update}ms`,
        development: `${firebaseTimeouts.development}ms`,
        production: `${firebaseTimeouts.production}ms`
      }
    });
  }
}

export type { 
  AnalysisLimits, 
  TrialAnalysisLimits, 
  PlanLimits, 
  FreemiumLimits,
  AITimeoutConfig,
  AIServiceConfig,
  AIProcessingLimits,
  AIReliabilityConfig,
  FirebaseTimeoutConfig
};