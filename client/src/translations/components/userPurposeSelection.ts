export const userPurposeSelectionTranslations = {
  ja: {
    userPurposeSelection: {
      header: {
        title: 'ConsensusAI',
        subtitle: '初期設定'
      },
      welcome: {
        greeting: 'ようこそ、{name}さん！',
        question: 'どのような目的でConsensusAIをご利用になりますか？',
        description: '用途に応じて最適な機能とレポートを提供いたします'
      },
      purposes: {
        government: {
          title: '自治体・行政',
          description: '住民の意見をAIで分析し、データ駆動型政策立案を実現',
          examples: [
            '公共施設の改善要望調査',
            '地域イベントに関する住民意見',
            '都市計画・まちづくりへの提案',
            '行政サービスの満足度調査'
          ]
        },
        business: {
          title: '店舗・サービス業',
          description: '顧客フィードバックをAIで分析し、サービス品質の向上を加速',
          examples: [
            '顧客満足度調査',
            'メニュー・商品改善提案',
            '店舗環境の改善要望',
            'イベント・キャンペーン企画への意見'
          ]
        },
        corporate: {
          title: '企業・組織',
          description: '組織内の声をAIで分析し、エンゲージメント向上と意思決定を支援',
          examples: [
            '従業員満足度調査',
            '職場環境の改善要望',
            '新規事業アイデア募集',
            '組織運営の改善提案'
          ]
        },
        community: {
          title: 'コミュニティ・団体',
          description: 'メンバーの意見をAIで集約し、透明性の高い意思決定を実現',
          examples: [
            'イベント企画への意見募集',
            'コミュニティルールの見直し',
            '活動内容の改善提案',
            'メンバー間の課題解決'
          ]
        },
        research: {
          title: '研究・調査',
          description: '研究データのAIアシスト分析で、客観的な洞察を取得',
          examples: [
            '学術研究のアンケート調査',
            '市場ニーズの調査',
            'ユーザビリティテスト',
            '社会課題の実態調査'
          ]
        }
      },
      examplesLabel: '利用例：',
      selectedSuffix: 'を選択されました',
      featuresTitle: 'この用途に最適化された機能：',
      features: [
        '専用プロジェクトテンプレート',
        '業界に特化したAI分析',
        'カスタマイズされたレポート',
        '最適化されたワークフロー'
      ],
      actions: {
        start: 'ConsensusAIを開始',
        processing: '設定中...',
        skip: '後で設定する（スキップ）',
        next: '次へ',
        back: '戻る'
      },
      progress: {
        step1: '利用目的',
        step2: '分析言語',
        stepIndicator: 'ステップ {current} / {total}'
      },
      analysisLanguage: {
        title: 'AI分析言語の設定',
        question: 'AI分析結果をどの言語で出力しますか？',
        description: 'プロジェクトの分析結果で出力される言語を設定します。後から設定で変更することも可能です。',
        options: {
          japanese: { 
            name: '日本語', 
            description: '分析結果を日本語で出力します' 
          },
          english: { 
            name: 'English', 
            description: 'Output analysis results in English' 
          }
        },
        complete: 'セットアップ完了'
      }
    }
  },
  en: {
    userPurposeSelection: {
      header: {
        title: 'ConsensusAI',
        subtitle: 'Initial Setup'
      },
      welcome: {
        greeting: 'Welcome, {name}!',
        question: 'How would you like to use ConsensusAI?',
        description: 'We\'ll provide optimal features and reports based on your use case'
      },
      purposes: {
        government: {
          title: 'Government/Administration',
          description: 'Analyze citizen opinions with AI and realize data-driven policy making',
          examples: [
            'Public facility improvement surveys',
            'Resident opinions on local events',
            'Urban planning and development proposals',
            'Administrative service satisfaction surveys'
          ]
        },
        business: {
          title: 'Store/Service Business',
          description: 'Analyze customer feedback with AI and accelerate service quality improvement',
          examples: [
            'Customer satisfaction surveys',
            'Menu and product improvement suggestions',
            'Store environment improvement requests',
            'Event and campaign planning feedback'
          ]
        },
        corporate: {
          title: 'Corporate/Organization',
          description: 'Analyze internal voices with AI to improve engagement and support decision-making',
          examples: [
            'Employee satisfaction surveys',
            'Workplace environment improvement requests',
            'New business idea collections',
            'Organizational management improvement proposals'
          ]
        },
        community: {
          title: 'Community/Groups',
          description: 'Aggregate member opinions with AI for transparent decision-making',
          examples: [
            'Event planning opinion collection',
            'Community rule reviews',
            'Activity improvement proposals',
            'Inter-member issue resolution'
          ]
        },
        research: {
          title: 'Research/Survey',
          description: 'AI-assisted analysis of research data for objective insights',
          examples: [
            'Academic research questionnaire surveys',
            'Market needs research',
            'Usability testing',
            'Social issue reality surveys'
          ]
        }
      },
      examplesLabel: 'Use cases:',
      selectedSuffix: ' selected',
      featuresTitle: 'Features optimized for this use case:',
      features: [
        'Dedicated project templates',
        'Industry-specific AI analysis',
        'Customized reports',
        'Optimized workflows'
      ],
      actions: {
        start: 'Start ConsensusAI',
        processing: 'Setting up...',
        skip: 'Set up later (Skip)',
        next: 'Next',
        back: 'Back'
      },
      progress: {
        step1: 'Purpose',
        step2: 'Analysis Language',
        stepIndicator: 'Step {current} / {total}'
      },
      analysisLanguage: {
        title: 'AI Analysis Language Setting',
        question: 'Which language would you like AI analysis results to be output in?',
        description: 'This sets the language for project analysis results output. You can change this later in settings.',
        options: {
          japanese: { 
            name: '日本語', 
            description: 'Output analysis results in Japanese' 
          },
          english: { 
            name: 'English', 
            description: 'Output analysis results in English' 
          }
        },
        complete: 'Complete Setup'
      }
    }
  }
};