export const dashboardTranslations = {
  ja: {
    title: 'ConsensusAI',
    breadcrumbTitle: 'ダッシュボード',
    projects: 'プロジェクト',
    tasks: 'タスク',
    newCollection: '新規意見収集',
    totalProjects: '総プロジェクト数',
    opinionsAnalyzed: '分析済み意見数',
    activeTasks: 'アクティブタスク',
    costSavings: 'コスト削減効果',
    viewAnalysis: '分析結果を表示',
    noProjects: 'プロジェクトがありません',
    noProjectsDesc: '最初のプロジェクトを作成して意見の収集と分析を開始しましょう',
    createFirst: '最初のプロジェクトを作成',
    opinionsCount: '件の意見を収集',
    created: '作成日',
    status: {
      completed: '完了',
      processing: 'AI処理中...',
      collecting: '意見収集中',
      readyForAnalysis: '分析待ち',
      paused: '一時停止',
      error: 'エラー',
      unknown: '不明',
      archived: 'アーカイブ済み'
    },
    noTasks: 'タスクがありません',
    noTasksDesc: 'プロジェクトの分析結果からタスクを作成しましょう',
    taskStatus: {
      pending: '未着手',
      inProgress: '進行中',
      completed: '完了'
    },
    dueDate: '期限',
    markComplete: '完了にする',
    hero: {
      title: '散在する声を、即アクションへ',
      subtitle: 'AI要約 → コスト試算 → タスク化まで{processingTime}秒で完了'
    },
    analysis: {
      notPerformed: '未実施',
      withinHour: '1時間以内',
      hoursAgo: '{hours}時間前',
      yesterday: '昨日',
      daysAgo: '{days}日前'
    },
    userMenu: {
      openMenu: 'アカウントメニューを開く',
      account: 'アカウント',
      language: '言語設定',
      termsOfService: '利用規約',
      privacyPolicy: 'プライバシーポリシー',
      signOut: 'サインアウト'
    },
    heroSection: {
      title: '意見収集から改善実行まで',
      subtitle: 'Webフォームで意見を収集 → AIが自動分析 → トピック管理で改善アクション',
      newProject: '新規プロジェクト'
    },
    stats: {
      totalProjects: '総プロジェクト数',
      activeProjects: 'アクティブプロジェクト',
      pendingActions: '未対応アクション'
    },
    projectList: {
      title: 'プロジェクト一覧'
    },
    
    // フィルター・検索関連
    search: {
      placeholder: 'プロジェクト名・説明で検索...',
      filter: 'フィルター',
      filterTitle: '詳細フィルター',
      filterDescription: '複数の条件を組み合わせてプロジェクトを絞り込み',
      clearAll: 'すべてクリア',
      applyAndClose: '適用して閉じる',
      activeFilters: '適用中のフィルター:',
      resultsCount: '{count}件のプロジェクトが表示されています',
      displayCount: '{count}件表示'
    },
    
    // ステータスフィルター
    statusFilter: {
      label: 'ステータス',
      allStatuses: 'すべてのステータス',
      collecting: '意見収集中',
      paused: '一時停止',
      completed: '完了済み',
      archived: 'アーカイブ済み'
    },
    
    // 期間フィルター
    periodFilter: {
      label: '作成期間',
      allPeriods: 'すべての期間',
      week: '1週間以内',
      month: '1ヶ月以内',
      quarter: '3ヶ月以内',
      older: '3ヶ月以前'
    },
    
    // 優先度フィルター
    priorityFilter: {
      label: '優先度',
      allPriorities: 'すべての優先度',
      urgent: '高優先度',
      normal: '中・低・未設定'
    },
    
    // タブ関連
    tabs: {
      active: 'アクティブ',
      completed: '完了・アーカイブ'
    },
    
    // プロジェクトアクション状況
    actionStatus: {
      collecting: '意見収集中（未分析）',
      processing: 'AI分析処理中',
      noAnalysis: '分析未実施',
      analysisCompleted: 'AI分析完了',
      pendingActions: '{count}件のアクション',
      actionCompleted: 'アクション管理完了'
    },
    
    // プロジェクトカード関連
    projectCard: {
      priority: '優先度',
      high: '高',
      medium: '中',
      low: '低',
      public: '公開中',
      created: '作成',
      opinionsCount: '意見数',
      topicsCount: 'トピック',
      latestAnalysis: '最新分析',
      actionManagement: 'トピックのアクション管理',
      actionProgress: 'このプロジェクトで進行中',
      actionCount: '{count}件',
      checkAnalysisStatus: '分析状況を確認',
      projectDetail: 'プロジェクト詳細',
      restore: '復元する',
      viewDetail: '詳細を見る'
    },
    
    // 空状態メッセージ
    empty: {
      noMatchingProjects: 'フィルター条件に一致するプロジェクトがありません',
      noMatchingDescription: '検索条件やフィルターを変更してみてください',
      clearFilters: 'すべてのフィルターをクリア',
      noActiveProjects: 'アクティブなプロジェクトがありません',
      noActiveDescription: '新しいプロジェクトを作成して意見の収集を開始しましょう',
      noCompletedProjects: '完了済みプロジェクトがありません',
      noCompletedDescription: '分析が完了したプロジェクトがここに表示されます',
      noProjects: 'プロジェクトがありません',
      noProjectsDescription: '最初のプロジェクトを作成して意見の収集と分析を開始しましょう',
      createNewProject: '新規プロジェクト作成'
    },
    
    // フローティング統計
    floatingStats: {
      pendingActions: '進行中のアクション',
      actionsCount: '{count}件',
      unhandled: '{count}件未対応',
      inProgress: '{count}件対応中',
      manage: '詳細管理'
    },
    
    // アクション管理ダッシュボード
    actionManagement: {
      title: '全体アクション管理センター',
      description: 'すべてのプロジェクトのアクションを一元管理し、優先順位付けや進捗追跡を行います',
      openGlobalManagement: '全体管理を開く',
      pendingCount: '件対応待ち',
      activeActions: '件のアクション管理中',
      statusBreakdown: '未対応{unhandled}件・対応中{inProgress}件',
      noActions: '現在アクションはありません'
    },
    
    // 分析中インジケーター
    analysisIndicator: {
      title: 'AI分析実行中',
      check: '確認'
    },
    
    // 決済関連
    payment: {
      success: 'Proプランをご利用いただけるようになりました🎉 拡張機能をお試しください！',
      error: 'エラーが発生しました。もう一度お試しください。'
    },

    // アップグレードバナー
    upgradeBanner: {
      titles: {
        limitReached: '利用制限に達しました',
        trialEnding: 'トライアル終了間近',
        valueDemonstration: '作業時間を大幅短縮中',
        trialStart: '無料トライアルを開始',
        projectLimitApproaching: '複数プロジェクトで効率アップ',
        welcomeFree: 'ConsensusAIへようこそ',
        freeValueProposition: 'より効率的なプロジェクト管理を',
        trialProgress: 'トライアル期間中',
        trialValueDemonstration: '効果を実感中',
        trialEndingCritical: 'トライアル終了間近',
        trialActive: 'トライアル期間中'
      },
      defaultTitle: 'アップグレードをお試しください',
      contexts: {
        trialEnding: '{trialPlan}終了まであと{days}日',
        freeProjects: '現在{current}/{max}プロジェクト使用中',
        proAllFeatures: '{proPlan}で拡張機能をお試しいただけます',
        moreProjects: 'より多くのプロジェクトで効率化を実現',
        freeTrialAll: '拡張機能を無料でお試し（一部制限あり）',
        trialRemaining: '{trialPlan}残り{days}日 | 効率化を体験中',
        trialValueDemo: 'あと{days}日 | 作業時間を大幅短縮中',
        trialEndingCritical: '⚠️ {trialPlan}終了まであと{days}日',
        timeSaved: 'これまで{hours}時間を節約',
        engagementValue: '🎉 {context} | 手動分析{manualHours}時間 → AI分析{aiProcessingTime}秒'
      },
      ctaTexts: {
        continuePro: 'Proでさらに作業を続ける',
        migrateToPro: '{proPlan}プランに移行する',
        moreEfficient: 'さらに効率化する',
        trialUpgrade: '{trialPlan}で{maxProjects}プロジェクトまで',
        freeTrial: '無料トライアル',
        startTrial: 'トライアル開始',
        continuePro2: '{proPlan}で継続する',
        proUpgrade: '{proPlan}プランで継続',
        migrateNow: '今すぐ{proPlan}に移行'
      },
      limitReached: {
        project: 'プロジェクト作成数の上限に達しました',
        analysis: 'AI分析回数の上限に達しました',
        opinion: '意見収集数の上限に達しました',
        general: '利用上限に達しました'
      }
    }
  },
  en: {
    title: 'ConsensusAI',
    breadcrumbTitle: 'Dashboard',
    projects: 'Projects',
    tasks: 'Tasks',
    newCollection: 'New Opinion Collection',
    totalProjects: 'Total Projects',
    opinionsAnalyzed: 'Opinions Analyzed',
    activeTasks: 'Active Tasks',
    costSavings: 'Cost Savings',
    viewAnalysis: 'View Analysis',
    noProjects: 'No projects yet',
    noProjectsDesc: 'Create your first project to start collecting and analyzing opinions',
    createFirst: 'Create Your First Project',
    opinionsCount: 'opinions collected',
    created: 'Created',
    status: {
      completed: 'Analysis Complete',
      processing: 'AI Processing...',
      collecting: 'Collecting Opinions',
      readyForAnalysis: 'Ready for Analysis',
      paused: 'Paused',
      error: 'Error',
      unknown: 'Unknown',
      archived: 'Archived'
    },
    noTasks: 'No tasks yet',
    noTasksDesc: 'Create tasks from your project analysis results',
    taskStatus: {
      pending: 'Pending',
      inProgress: 'In Progress',
      completed: 'Completed'
    },
    dueDate: 'Due',
    markComplete: 'Mark Complete',
    hero: {
      title: 'Transform Scattered Voices into',
      subtitle: 'AI Summary → Cost Estimation → Task Creation in {processingTime} seconds'
    },
    analysis: {
      notPerformed: 'Not performed',
      withinHour: 'Within 1 hour',
      hoursAgo: '{hours} hours ago',
      yesterday: 'Yesterday',
      daysAgo: '{days} days ago'
    },
    userMenu: {
      openMenu: 'Open account menu',
      account: 'Account',
      language: 'Language Settings',
      termsOfService: 'Terms of Service',
      privacyPolicy: 'Privacy Policy',
      signOut: 'Sign Out'
    },
    heroSection: {
      title: 'From Opinion Collection to Implementation',
      subtitle: 'Collect opinions via web forms → AI auto-analysis → Topic management for improvement actions',
      newProject: 'New Project'
    },
    stats: {
      totalProjects: 'Total Projects',
      activeProjects: 'Active Projects',
      pendingActions: 'Pending Actions'
    },
    projectList: {
      title: 'Project List'
    },
    
    // Filter & search related
    search: {
      placeholder: 'Search by project name or description...',
      filter: 'Filter',
      filterTitle: 'Advanced Filters',
      filterDescription: 'Combine multiple criteria to narrow down projects',
      clearAll: 'Clear All',
      applyAndClose: 'Apply & Close',
      activeFilters: 'Active filters:',
      resultsCount: '{count} projects are being displayed',
      displayCount: '{count} displayed'
    },
    
    // Status filter
    statusFilter: {
      label: 'Status',
      allStatuses: 'All Statuses',
      collecting: 'Collecting Opinions',
      paused: 'Paused',
      completed: 'Completed',
      archived: 'Archived'
    },
    
    // Period filter
    periodFilter: {
      label: 'Created Period',
      allPeriods: 'All Periods',
      week: 'Within 1 week',
      month: 'Within 1 month',
      quarter: 'Within 3 months',
      older: 'Over 3 months ago'
    },
    
    // Priority filter
    priorityFilter: {
      label: 'Priority',
      allPriorities: 'All Priorities',
      urgent: 'High Priority',
      normal: 'Medium・Low・Unset'
    },
    
    // Tab related
    tabs: {
      active: 'Active',
      completed: 'Completed & Archived'
    },
    
    // Project action status
    actionStatus: {
      collecting: 'Collecting opinions (unanalyzed)',
      processing: 'AI analysis in progress',
      noAnalysis: 'Analysis not performed',
      analysisCompleted: 'AI Analysis Complete',
      pendingActions: '{count} actions',
      actionCompleted: 'Action management completed'
    },
    
    // Project card related
    projectCard: {
      priority: 'Priority',
      high: 'High',
      medium: 'Medium',
      low: 'Low',
      public: 'Public',
      created: 'Created',
      opinionsCount: 'Opinions',
      topicsCount: 'Topics',
      latestAnalysis: 'Latest Analysis',
      actionManagement: 'Topic Action Management',
      actionProgress: 'In progress for this project',
      actionCount: '{count} items',
      checkAnalysisStatus: 'Check analysis status',
      projectDetail: 'Project Details',
      restore: 'Restore',
      viewDetail: 'View Details'
    },
    
    // Empty state messages
    empty: {
      noMatchingProjects: 'No projects match the filter criteria',
      noMatchingDescription: 'Try changing your search terms or filters',
      clearFilters: 'Clear all filters',
      noActiveProjects: 'No active projects',
      noActiveDescription: 'Create a new project to start collecting opinions',
      noCompletedProjects: 'No completed projects',
      noCompletedDescription: 'Completed projects will appear here',
      noProjects: 'No projects yet',
      noProjectsDescription: 'Create your first project to start collecting and analyzing opinions',
      createNewProject: 'Create New Project'
    },
    
    // Floating stats
    floatingStats: {
      pendingActions: 'Actions in Progress',
      actionsCount: '{count} items',
      unhandled: '{count} unhandled',
      inProgress: '{count} in progress',
      manage: 'Detailed Management'
    },
    
    // Action Management Dashboard
    actionManagement: {
      title: 'Global Action Management Center',
      description: 'Centrally manage actions from all projects, prioritize, and track progress',
      openGlobalManagement: 'Open Global Management',
      pendingCount: 'pending',
      activeActions: 'actions in management',
      statusBreakdown: '{unhandled} unhandled・{inProgress} in progress',
      noActions: 'No actions at this time'
    },
    
    // Analysis indicator
    analysisIndicator: {
      title: 'AI Analysis in Progress',
      check: 'Check'
    },
    
    // Payment related
    payment: {
      success: 'Welcome to Pro! 🎉 You now have access to extended features. Start exploring!',
      error: 'An error occurred. Please try again.'
    },
    
    // Upgrade banner
    upgradeBanner: {
      titles: {
        limitReached: 'Usage Limit Reached',
        trialEnding: 'Trial Ending Soon',
        valueDemonstration: 'Significantly Reducing Work Time',
        trialStart: 'Start Free Trial',
        projectLimitApproaching: 'Boost Efficiency with Multiple Projects',
        welcomeFree: 'Welcome to ConsensusAI',
        freeValueProposition: 'More Efficient Project Management',
        trialProgress: 'Trial Period Active',
        trialValueDemonstration: 'Experiencing the Benefits',
        trialEndingCritical: 'Trial Ending Soon',
        trialActive: 'Trial Period Active'
      },
      defaultTitle: 'Try Upgrading',
      contexts: {
        trialEnding: '{days} days left until {trialPlan} ends',
        freeProjects: 'Currently using {current}/{max} projects',
        proAllFeatures: 'Try extended features with {proPlan}',
        moreProjects: 'Achieve efficiency with more projects',
        freeTrialAll: 'Try extended features for free (some limits apply)',
        trialRemaining: '{days} days left in {trialPlan} | Experiencing efficiency',
        trialValueDemo: '{days} days left | Significantly reducing work time',
        trialEndingCritical: '⚠️ {days} days left until {trialPlan} ends',
        timeSaved: '{hours} hours saved so far',
        engagementValue: '🎉 {context} | Manual analysis {manualHours}hrs → AI analysis {aiProcessingTime}sec'
      },
      ctaTexts: {
        continuePro: 'Continue with Pro',
        migrateToPro: 'Migrate to {proPlan}',
        moreEfficient: 'Be more efficient',
        trialUpgrade: 'Up to {maxProjects} projects with {trialPlan}',
        freeTrial: 'Free Trial',
        startTrial: 'Start Trial',
        continuePro2: 'Continue with {proPlan}',
        proUpgrade: 'Continue with {proPlan}',
        migrateNow: 'Migrate to {proPlan} now'
      },
      limitReached: {
        project: 'Project creation limit reached',
        analysis: 'AI analysis limit reached',
        opinion: 'Opinion collection limit reached',
        general: 'Usage limit reached'
      }
    }
  }
};