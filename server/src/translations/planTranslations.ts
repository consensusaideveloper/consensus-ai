/**
 * プラン情報の多言語対応翻訳定義
 */

export interface PlanTranslations {
  display: {
    name: string;
    tagline: string;
    highlights: string[];
  };
  features: {
    projects: {
      title: string;
      description: string;
    };
    analysis: {
      title: string;
      description: string;
    };
    opinions: {
      title: string;
      description: string;
    };
    export?: {
      title: string;
      description: string;
    };
  };
  messages: {
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
  };
}

export interface AllPlanTranslations {
  free: PlanTranslations;
  trial: PlanTranslations;
  pro: PlanTranslations;
}

export const planTranslations: Record<'ja' | 'en', AllPlanTranslations> = {
  ja: {
    free: {
      display: {
        name: 'フリープラン',
        tagline: '基本機能を無料で利用',
        highlights: ['基本機能', '無期限利用', 'データ永続保存']
      },
      features: {
        projects: {
          title: 'プロジェクト作成',
          description: '{maxProjects}プロジェクトまで'
        },
        analysis: {
          title: 'AI分析',
          description: '{maxAnalysesTotal}回限り'
        },
        opinions: {
          title: '意見収集',
          description: 'プロジェクトあたり{maxOpinionsPerProject}件まで'
        }
      },
      messages: {
        limitReached: {
          project: 'フリープランでは{maxProjects}プロジェクトまでです。',
          analysis: 'フリープランでは{maxAnalysesTotal}回限りの分析です。',
          opinion: 'フリープランでは{maxOpinionsPerProject}件までの意見収集です。'
        },
        upgrade: {
          banner: '複数プロジェクトで効率化を実現',
          cta: 'トライアル開始',
          urgentCta: '無料トライアルで拡張'
        },
        trial: {
          confirmation: '拡張機能を無料でお試し（一部制限あり）',
          remaining: '',
          ending: ''
        }
      }
    },
    trial: {
      display: {
        name: 'トライアル',
        tagline: '{duration}日間の拡張機能お試し',
        highlights: ['拡張機能利用可能（一部制限あり）', 'クレジットカード不要', 'いつでもキャンセル可能']
      },
      features: {
        projects: {
          title: 'プロジェクト作成',
          description: '最大{maxProjects}プロジェクト'
        },
        analysis: {
          title: 'AI分析',
          description: '日次{dailyTotal}回/月次{monthlyTotal}回'
        },
        opinions: {
          title: '大容量意見収集',
          description: 'プロジェクトごとに{maxOpinionsPerProject}件まで'
        }
      },
      messages: {
        limitReached: {
          project: 'トライアルプランでは{maxProjects}プロジェクトまでです。',
          analysis: 'トライアルプランのAI分析制限に達しました。日次{dailyTotal}回/月次{monthlyTotal}回まで利用可能です。',
          opinion: 'トライアルプランでは{maxOpinionsPerProject}件までの意見収集です。'
        },
        upgrade: {
          banner: 'トライアルで体験中の機能を継続利用',
          cta: 'Proプランで継続',
          urgentCta: '今すぐProに移行'
        },
        trial: {
          confirmation: 'ConsensusAI Proプランの拡張機能を{duration}日間無料でお試しいただけます（一部制限あり）。',
          remaining: 'トライアル残り',
          ending: 'トライアル終了間近'
        }
      }
    },
    pro: {
      display: {
        name: 'プロプラン',
        tagline: '本格的なビジネス利用',
        highlights: ['ビジネス利用最適', 'データエクスポート', '制限拡張利用']
      },
      features: {
        projects: {
          title: '大規模プロジェクト',
          description: '高限度でのプロジェクト作成'
        },
        analysis: {
          title: '拡張AI分析',
          description: '日次{dailyTotal}回/月次{monthlyTotal}回'
        },
        opinions: {
          title: '大容量意見収集',
          description: 'プロジェクトあたりの意見数大幅拡張'
        },
        export: {
          title: 'データエクスポート',
          description: 'CSV/JSON形式でのデータ出力'
        }
      },
      messages: {
        limitReached: {
          project: '',
          analysis: 'AI分析の日次制限（{dailyTotal}回）に達しました。',
          opinion: ''
        },
        upgrade: {
          banner: '全プロジェクトの継続アクセス',
          cta: 'Proで継続する',
          urgentCta: 'Proで継続する'
        },
        trial: {
          confirmation: '',
          remaining: '',
          ending: ''
        }
      }
    }
  },
  en: {
    free: {
      display: {
        name: 'Free Plan',
        tagline: 'Use basic features for free',
        highlights: ['Basic features', 'Unlimited duration', 'Persistent data storage']
      },
      features: {
        projects: {
          title: 'Project Creation',
          description: 'Up to {maxProjects} projects'
        },
        analysis: {
          title: 'AI Analysis',
          description: '{maxAnalysesTotal} times only'
        },
        opinions: {
          title: 'Opinion Collection',
          description: 'Up to {maxOpinionsPerProject} opinions per project'
        }
      },
      messages: {
        limitReached: {
          project: 'Free plan allows up to {maxProjects} projects.',
          analysis: 'Free plan allows {maxAnalysesTotal} analyses only.',
          opinion: 'Free plan allows up to {maxOpinionsPerProject} opinions per project.'
        },
        upgrade: {
          banner: 'Achieve efficiency with multiple projects',
          cta: 'Start Trial',
          urgentCta: 'Expand with Free Trial'
        },
        trial: {
          confirmation: 'Try extended features for free (some limits apply)',
          remaining: '',
          ending: ''
        }
      }
    },
    trial: {
      display: {
        name: 'Trial',
        tagline: '{duration}-day extended features trial',
        highlights: ['Extended features available (some limits apply)', 'No credit card required', 'Cancel anytime']
      },
      features: {
        projects: {
          title: 'Project Creation',
          description: 'Up to {maxProjects} projects'
        },
        analysis: {
          title: 'AI Analysis',
          description: '{dailyTotal} daily / {monthlyTotal} monthly'
        },
        opinions: {
          title: 'High-capacity Opinion Collection',
          description: 'Up to {maxOpinionsPerProject} opinions per project'
        }
      },
      messages: {
        limitReached: {
          project: 'Trial plan allows up to {maxProjects} projects.',
          analysis: 'AI analysis limit reached for trial plan. Available up to {dailyTotal} daily / {monthlyTotal} monthly.',
          opinion: 'Trial plan allows up to {maxOpinionsPerProject} opinions per project.'
        },
        upgrade: {
          banner: 'Continue using features experienced during trial',
          cta: 'Continue with Pro Plan',
          urgentCta: 'Upgrade to Pro Now'
        },
        trial: {
          confirmation: 'Try all ConsensusAI Pro features free for {duration} days.',
          remaining: 'Trial remaining',
          ending: 'Trial ending soon'
        }
      }
    },
    pro: {
      display: {
        name: 'Pro Plan',
        tagline: 'Serious business use',
        highlights: ['Business optimized', 'Data export', 'Extended usage']
      },
      features: {
        projects: {
          title: 'Large-scale Projects',
          description: 'High-volume project creation'
        },
        analysis: {
          title: 'Extended AI Analysis',
          description: '{dailyTotal} daily / {monthlyTotal} monthly'
        },
        opinions: {
          title: 'High-capacity Opinion Collection',
          description: 'Greatly expanded opinion limits per project'
        },
        export: {
          title: 'Data Export',
          description: 'CSV/JSON format data output'
        }
      },
      messages: {
        limitReached: {
          project: '',
          analysis: 'Daily AI analysis limit ({dailyTotal} times) reached.',
          opinion: ''
        },
        upgrade: {
          banner: 'Continuous access to all projects',
          cta: 'Continue with Pro',
          urgentCta: 'Continue with Pro'
        },
        trial: {
          confirmation: '',
          remaining: '',
          ending: ''
        }
      }
    }
  }
};