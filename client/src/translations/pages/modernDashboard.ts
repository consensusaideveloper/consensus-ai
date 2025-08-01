export const modernDashboardTranslations = {
  ja: {
    // ナビゲーション
    backToProject: 'プロジェクトに戻る',
    
    // メインタイトル
    title: 'プロジェクト分析ダッシュボード',
    subtitle: '包括的なプロジェクト進捗と分析',
    
    // プロジェクト情報
    project: {
      notFound: 'プロジェクトが見つかりません',
      backToDashboard: 'ダッシュボードに戻る',
      createdOn: '作成日',
      opinions: '件の意見',
      description: '説明'
    },
    
    // 進捗サマリー
    progress: {
      title: '進捗サマリー',
      totalTopics: '総トピック数',
      resolvedTopics: '解決済み',
      inProgressTopics: '対応中',
      unhandledTopics: '未対応',
      progressRate: '進捗率',
      completion: '完了',
      topicProgressTitle: 'トピック進捗状況',
      actionManagementTitle: 'アクション管理状況',
      resolved: '解決済み',
      inProgress: '対応中',
      unhandled: '未対応',
      completed: '完了',
      active: '実行中',
      pending: '未着手',
      completionRate: '完了率',
      viewActionsList: 'アクション一覧を見る'
    },
    
    // アクション統計
    actions: {
      title: 'アクション統計',
      totalActions: '総アクション数',
      completedActions: '完了済み',
      activeActions: 'アクティブ',
      unhandledActions: '未対応',
      viewAllActions: 'すべてのアクションを表示'
    },
    
    // アラート・警告
    alerts: {
      title: '対応が必要な項目',
      noAlerts: '現在アラートはありません',
      allGood: 'すべて順調に進行中です',
      stalledTopics: 'トピック進行停滞',
      unhandledItems: '未対応項目',
      overdueActions: '期限超過アクション',
      viewDetails: '詳細を表示',
      items: '件',
      stalledTopicsTitle: '長期停滞中のトピック',
      stalledTopicsDescription: '30日以上更新されていないトピックがあります',
      unhandledTopicsTitle: '未対応のトピック',
      unhandledTopicsDescription: 'まだ対応が開始されていないトピックがあります',
      unhandledResponsesDescription: '対応が開始されていません',
      count: '{count} 件',
      viewDetail: '詳細を見る',
      daysStagnant: '{days}日間更新なし'
    },
    
    // 最近のアクティビティ
    activity: {
      title: '最近のアクティビティ',
      lastUpdate: '最終更新',
      daysSinceUpdate: '最終更新から{days}日',
      hoursAgo: '{hours}時間前',
      daysAgo: '{days}日前',
      justNow: 'たった今',
      isActive: 'アクティブ',
      isStalled: '停滞中',
      noActivity: '最近のアクティビティなし'
    },
    
    // チャート・分析
    charts: {
      topicStatusDistribution: 'トピックステータス分布',
      actionProgressTrend: 'アクション進捗トレンド',
      responseTimeAnalysis: '意見時間分析',
      priorityDistribution: '優先度分布',
      weeklyActivity: '週間アクティビティ',
      monthlyTrends: '月次トレンド',
      showChart: 'チャートを表示',
      hideChart: 'チャートを非表示'
    },
    
    // クイックアクション
    quickActions: {
      title: 'クイックアクション',
      viewFullProject: '完全なプロジェクト表示',
      exportData: 'データエクスポート',
      generateReport: 'レポート生成',
      manageActions: 'アクション管理',
      updateProgress: '進捗更新',
      viewAnalysis: '詳細分析',
      settings: '設定'
    },
    
    // インサイト
    insights: {
      title: 'インサイト',
      noInsights: 'インサイトは現在ありません',
      keyFindings: '主要な発見',
      recommendations: '推奨事項',
      nextSteps: '次のステップ',
      viewFullAnalysis: '完全な分析を表示'
    },
    
    // パフォーマンス指標
    metrics: {
      title: 'パフォーマンス指標',
      avgResponseTime: '平均意見時間',
      completionRate: '完了率',
      activityLevel: 'アクティビティレベル',
      engagementScore: 'エンゲージメントスコア',
      efficiencyRating: '効率性評価',
      days: '日',
      hours: '時間',
      minutes: '分',
      percent: '%',
      score: 'スコア'
    },
    
    // フィルター・表示オプション
    filters: {
      timeRange: '期間',
      last7Days: '過去7日',
      last30Days: '過去30日',
      last90Days: '過去90日',
      allTime: 'すべての期間',
      status: 'ステータス',
      priority: '優先度',
      assignee: '担当者',
      refresh: '更新',
      export: 'エクスポート'
    },
    
    // エラーメッセージ
    errors: {
      loadingProject: 'プロジェクトの読み込み中にエラーが発生しました',
      loadingData: 'データの読み込み中にエラーが発生しました',
      updatingData: 'データの更新中にエラーが発生しました',
      exportingData: 'データのエクスポート中にエラーが発生しました',
      unauthorized: 'このプロジェクトにアクセスする権限がありません'
    },
    
    // 読み込み状態
    loading: {
      project: 'プロジェクトを読み込み中...',
      data: 'データを読み込み中...',
      analysis: '分析を実行中...',
      exporting: 'エクスポート中...'
    },

    // ナビゲーション
    breadcrumb: 'ダッシュボード',
    analysis: '分析',
    logo: 'ConsensusAI',
    
    // ヘッダー
    exportReport: 'レポート出力',
    
    // プロジェクトサマリー
    projectSummary: {
      opinionsCount: '{count} 件の意見',
      daysSince: '{days} 日間',
      active: 'アクティブ',
      stalled: '停滞中',
      overallProgress: '全体進捗率'
    },
    
    // CSVエクスポート
    csv: {
      title: 'プロジェクト分析レポート',
      generatedAt: '生成日時',
      basicInfo: '基本情報',
      projectName: 'プロジェクト名',
      totalOpinions: '総意見数',
      progressStatus: '進捗状況',
      totalTopics: '総トピック数',
      resolved: '解決済み',
      inProgress: '対応中',
      unhandled: '未対応',
      progressRate: '進捗率',
      actionManagement: 'アクション管理',
      totalActions: '総アクション数',
      completed: '完了',
      active: '実行中',
      pending: '未着手'
    }
  },
  
  en: {
    // Navigation
    backToProject: 'Back to Project',
    
    // Main title
    title: 'Project Analysis Dashboard',
    subtitle: 'Comprehensive project progress and analysis',
    
    // Project information
    project: {
      notFound: 'Project not found',
      backToDashboard: 'Back to Dashboard',
      createdOn: 'Created on',
      opinions: 'opinions',
      description: 'Description'
    },
    
    // Progress summary
    progress: {
      title: 'Progress Summary',
      totalTopics: 'Total Topics',
      resolvedTopics: 'Resolved',
      inProgressTopics: 'In Progress',
      unhandledTopics: 'Unhandled',
      progressRate: 'Progress Rate',
      completion: 'Complete',
      topicProgressTitle: 'Topic Progress Status',
      actionManagementTitle: 'Action Management Status',
      resolved: 'Resolved',
      inProgress: 'In Progress',
      unhandled: 'Unhandled',
      completed: 'Completed',
      active: 'Active',
      pending: 'Pending',
      completionRate: 'Completion Rate',
      viewActionsList: 'View Actions List'
    },
    
    // Action statistics
    actions: {
      title: 'Action Statistics',
      totalActions: 'Total Actions',
      completedActions: 'Completed',
      activeActions: 'Active',
      unhandledActions: 'Unhandled',
      viewAllActions: 'View All Actions'
    },
    
    // Alerts/Warnings
    alerts: {
      title: 'Items Requiring Attention',
      noAlerts: 'No alerts currently',
      allGood: 'Everything is progressing smoothly',
      stalledTopics: 'Stalled Topic Progress',
      unhandledItems: 'Unhandled Items',
      overdueActions: 'Overdue Actions',
      viewDetails: 'View Details',
      items: 'items',
      stalledTopicsTitle: 'Long-term Stalled Topics',
      stalledTopicsDescription: 'Topics not updated for 30+ days',
      unhandledTopicsTitle: 'Unhandled Topics',
      unhandledTopicsDescription: 'Topics not yet started',
      unhandledResponsesDescription: 'Response not yet started',
      count: '{count} items',
      viewDetail: 'View Details',
      daysStagnant: 'No update for {days} days'
    },
    
    // Recent activity
    activity: {
      title: 'Recent Activity',
      lastUpdate: 'Last Update',
      daysSinceUpdate: '{days} days since last update',
      hoursAgo: '{hours} hours ago',
      daysAgo: '{days} days ago',
      justNow: 'Just now',
      isActive: 'Active',
      isStalled: 'Stalled',
      noActivity: 'No recent activity'
    },
    
    // Charts/Analysis
    charts: {
      topicStatusDistribution: 'Topic Status Distribution',
      actionProgressTrend: 'Action Progress Trend',
      responseTimeAnalysis: 'Response Time Analysis',
      priorityDistribution: 'Priority Distribution',
      weeklyActivity: 'Weekly Activity',
      monthlyTrends: 'Monthly Trends',
      showChart: 'Show Chart',
      hideChart: 'Hide Chart'
    },
    
    // Quick actions
    quickActions: {
      title: 'Quick Actions',
      viewFullProject: 'View Full Project',
      exportData: 'Export Data',
      generateReport: 'Generate Report',
      manageActions: 'Manage Actions',
      updateProgress: 'Update Progress',
      viewAnalysis: 'View Analysis',
      settings: 'Settings'
    },
    
    // Insights
    insights: {
      title: 'Insights',
      noInsights: 'No insights available currently',
      keyFindings: 'Key Findings',
      recommendations: 'Recommendations',
      nextSteps: 'Next Steps',
      viewFullAnalysis: 'View Full Analysis'
    },
    
    // Performance metrics
    metrics: {
      title: 'Performance Metrics',
      avgResponseTime: 'Avg Response Time',
      completionRate: 'Completion Rate',
      activityLevel: 'Activity Level',
      engagementScore: 'Engagement Score',
      efficiencyRating: 'Efficiency Rating',
      days: 'days',
      hours: 'hours',
      minutes: 'minutes',
      percent: '%',
      score: 'score'
    },
    
    // Filters/Display options
    filters: {
      timeRange: 'Time Range',
      last7Days: 'Last 7 Days',
      last30Days: 'Last 30 Days',
      last90Days: 'Last 90 Days',
      allTime: 'All Time',
      status: 'Status',
      priority: 'Priority',
      assignee: 'Assignee',
      refresh: 'Refresh',
      export: 'Export'
    },
    
    // Error messages
    errors: {
      loadingProject: 'An error occurred while loading the project',
      loadingData: 'An error occurred while loading data',
      updatingData: 'An error occurred while updating data',
      exportingData: 'An error occurred while exporting data',
      unauthorized: 'You do not have permission to access this project'
    },
    
    // Loading states
    loading: {
      project: 'Loading project...',
      data: 'Loading data...',
      analysis: 'Running analysis...',
      exporting: 'Exporting...'
    },

    // Navigation
    breadcrumb: 'Dashboard',
    analysis: 'Analysis',
    logo: 'ConsensusAI',
    
    // Header
    exportReport: 'Export Report',
    
    // Project summary
    projectSummary: {
      opinionsCount: '{count} opinions',
      daysSince: '{days} days',
      active: 'Active',
      stalled: 'Stalled',
      overallProgress: 'Overall Progress'
    },
    
    // CSV export
    csv: {
      title: 'Project Analysis Report',
      generatedAt: 'Generated At',
      basicInfo: 'Basic Information',
      projectName: 'Project Name',
      totalOpinions: 'Total Opinions',
      progressStatus: 'Progress Status',
      totalTopics: 'Total Topics',
      resolved: 'Resolved',
      inProgress: 'In Progress',
      unhandled: 'Unhandled',
      progressRate: 'Progress Rate',
      actionManagement: 'Action Management',
      totalActions: 'Total Actions',
      completed: 'Completed',
      active: 'Active',
      pending: 'Pending'
    }
  }
};