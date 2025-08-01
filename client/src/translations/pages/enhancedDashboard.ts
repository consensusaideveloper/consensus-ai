export const enhancedDashboardTranslations = {
  ja: {
    // ナビゲーション
    backToProjects: 'プロジェクト一覧に戻る',
    
    // メインタイトル
    title: '拡張ダッシュボード',
    subtitle: '包括的な分析とパフォーマンス指標',
    description: 'プロジェクト全体の詳細な分析と進捗管理',
    
    // プロジェクト統計
    projectStats: {
      title: 'プロジェクト統計',
      total: '総プロジェクト数',
      byStatus: 'ステータス別',
      completionRate: '完了率',
      averageTopics: '平均トピック数/プロジェクト',
      activeProjects: 'アクティブプロジェクト',
      completedProjects: '完了プロジェクト',
      onHoldProjects: '保留中プロジェクト'
    },
    
    // トピック統計
    topicStats: {
      title: 'トピック統計',
      total: '総トピック数',
      byStatus: 'ステータス別分布',
      byPriority: '優先度別分布',
      resolutionRate: '解決率',
      bottlenecks: 'ボトルネック',
      stalledTopics: '停滞中トピック',
      highPriorityTopics: '高優先度トピック',
      averageResolutionTime: '平均解決時間',
      daysStagnant: '{days}日停滞',
      viewBottlenecks: 'ボトルネックを表示'
    },
    
    // 作業負荷統計
    workloadStats: {
      title: '作業負荷統計',
      byUser: 'ユーザー別作業負荷',
      totalActions: '総アクション数',
      completedActions: '完了アクション',
      assigned: '割り当て済み',
      completed: '完了',
      overdue: '期限超過',
      workloadDistribution: '作業負荷分布',
      teamEfficiency: 'チーム効率',
      topPerformers: 'トップパフォーマー'
    },

    // アクション統計
    actionStats: {
      unhandled: '未対応',
      inProgress: '対応中',
      resolved: '解決済み',
      dismissed: '見送り'
    },
    
    // パフォーマンス指標
    performanceMetrics: {
      title: 'パフォーマンス指標',
      averageResolutionTime: '平均解決時間',
      productivityTrend: '生産性トレンド',
      qualityScore: '品質スコア',
      efficiencyRating: '効率性評価',
      completed: '完了',
      started: '開始',
      days: '日',
      hours: '時間',
      score: 'スコア',
      trend: 'トレンド',
      improving: '改善中',
      declining: '低下中',
      stable: '安定',
      totalOpinions: '総意見数',
      totalOpinionsDescription: '参加者からの意見総数'
    },
    
    // リスク指標
    riskIndicators: {
      title: 'リスク指標',
      stalledTopics: '停滞トピック',
      overdueActions: '期限超過アクション',
      burnoutRisk: '燃え尽き症候群リスク',
      resourceBottlenecks: 'リソースボトルネック',
      highRisk: '高リスク',
      mediumRisk: '中リスク',
      lowRisk: '低リスク',
      noRisk: 'リスクなし',
      riskLevel: 'リスクレベル',
      mitigationRequired: '対策が必要',
      items: '件'
    },
    
    // アラート
    alerts: {
      title: 'アラート',
      critical: '重要',
      warning: '警告',
      info: '情報',
      noAlerts: 'アラートはありません',
      viewAll: 'すべて表示',
      acknowledge: '確認済み',
      actionRequired: 'アクションが必要',
      resolved: '解決済み'
    },
    
    // フィルター
    filters: {
      title: 'フィルター',
      timeRange: '期間',
      last7Days: '過去7日',
      last30Days: '過去30日',
      last90Days: '過去90日',
      lastYear: '過去1年',
      allTime: 'すべての期間',
      status: 'ステータス',
      priority: '優先度',
      assignee: '担当者',
      project: 'プロジェクト',
      clear: 'クリア',
      apply: '適用'
    },
    
    // チャート
    charts: {
      statusDistribution: 'ステータス分布',
      priorityDistribution: '優先度分布',
      workloadByUser: 'ユーザー別作業負荷',
      completionTrend: '完了トレンド',
      performanceOverTime: '時系列パフォーマンス',
      riskAssessment: 'リスク評価',
      projectStatusDistribution: 'プロジェクト状況分布',
      showChart: 'チャートを表示',
      hideChart: 'チャートを非表示',
      noData: 'データがありません',
      loading: 'チャートを読み込み中...'
    },
    
    // エクスポート・アクション
    actions: {
      export: 'エクスポート',
      refresh: '更新',
      generateReport: 'レポート生成',
      downloadPDF: 'PDF ダウンロード',
      downloadCSV: 'CSV ダウンロード',
      shareReport: 'レポート共有',
      schedule: 'スケジュール設定',
      settings: '設定'
    },
    
    // データ表示
    dataDisplay: {
      noData: 'データがありません',
      loadingData: 'データを読み込み中...',
      errorLoading: 'データの読み込み中にエラーが発生しました',
      lastUpdated: '最終更新',
      autoRefresh: '自動更新',
      refreshRate: '更新間隔',
      minutes: '分',
      seconds: '秒'
    },
    
    // エラーメッセージ
    errors: {
      loadingDashboard: 'ダッシュボードの読み込み中にエラーが発生しました',
      loadingProjects: 'プロジェクトの読み込み中にエラーが発生しました',
      loadingTopics: 'トピックの読み込み中にエラーが発生しました',
      updatingData: 'データの更新中にエラーが発生しました',
      exportingData: 'データのエクスポート中にエラーが発生しました',
      unauthorized: 'このダッシュボードにアクセスする権限がありません'
    },
    
    // 成功メッセージ
    success: {
      dataRefreshed: 'データが更新されました',
      reportGenerated: 'レポートが生成されました',
      dataExported: 'データがエクスポートされました',
      settingsSaved: '設定が保存されました'
    }
  },
  
  en: {
    // Navigation
    backToProjects: 'Back to Projects',
    
    // Main title
    title: 'Enhanced Dashboard',
    subtitle: 'Comprehensive analytics and performance metrics',
    description: 'Detailed analysis and progress management across all projects',
    
    // Project statistics
    projectStats: {
      title: 'Project Statistics',
      total: 'Total Projects',
      byStatus: 'By Status',
      completionRate: 'Completion Rate',
      averageTopics: 'Average Topics/Project',
      activeProjects: 'Active Projects',
      completedProjects: 'Completed Projects',
      onHoldProjects: 'On Hold Projects'
    },
    
    // Topic statistics
    topicStats: {
      title: 'Topic Statistics',
      total: 'Total Topics',
      byStatus: 'Status Distribution',
      byPriority: 'Priority Distribution',
      resolutionRate: 'Resolution Rate',
      bottlenecks: 'Bottlenecks',
      stalledTopics: 'Stalled Topics',
      highPriorityTopics: 'High Priority Topics',
      averageResolutionTime: 'Avg Resolution Time',
      daysStagnant: '{days} days stagnant',
      viewBottlenecks: 'View Bottlenecks'
    },
    
    // Workload statistics
    workloadStats: {
      title: 'Workload Statistics',
      byUser: 'Workload by User',
      totalActions: 'Total Actions',
      completedActions: 'Completed Actions',
      assigned: 'Assigned',
      completed: 'Completed',
      overdue: 'Overdue',
      workloadDistribution: 'Workload Distribution',
      teamEfficiency: 'Team Efficiency',
      topPerformers: 'Top Performers'
    },

    // Action statistics
    actionStats: {
      unhandled: 'Unhandled',
      inProgress: 'In Progress',
      resolved: 'Resolved',
      dismissed: 'Dismissed'
    },
    
    // Performance metrics
    performanceMetrics: {
      title: 'Performance Metrics',
      averageResolutionTime: 'Avg Resolution Time',
      productivityTrend: 'Productivity Trend',
      qualityScore: 'Quality Score',
      efficiencyRating: 'Efficiency Rating',
      completed: 'Completed',
      started: 'Started',
      days: 'days',
      hours: 'hours',
      score: 'score',
      trend: 'trend',
      improving: 'Improving',
      declining: 'Declining',
      stable: 'Stable',
      totalOpinions: 'Total Opinions',
      totalOpinionsDescription: 'Total opinions from participants'
    },
    
    // Risk indicators
    riskIndicators: {
      title: 'Risk Indicators',
      stalledTopics: 'Stalled Topics',
      overdueActions: 'Overdue Actions',
      burnoutRisk: 'Burnout Risk',
      resourceBottlenecks: 'Resource Bottlenecks',
      highRisk: 'High Risk',
      mediumRisk: 'Medium Risk',
      lowRisk: 'Low Risk',
      noRisk: 'No Risk',
      riskLevel: 'Risk Level',
      mitigationRequired: 'Mitigation Required',
      items: 'items'
    },
    
    // Alerts
    alerts: {
      title: 'Alerts',
      critical: 'Critical',
      warning: 'Warning',
      info: 'Info',
      noAlerts: 'No alerts',
      viewAll: 'View All',
      acknowledge: 'Acknowledge',
      actionRequired: 'Action Required',
      resolved: 'Resolved'
    },
    
    // Filters
    filters: {
      title: 'Filters',
      timeRange: 'Time Range',
      last7Days: 'Last 7 Days',
      last30Days: 'Last 30 Days',
      last90Days: 'Last 90 Days',
      lastYear: 'Last Year',
      allTime: 'All Time',
      status: 'Status',
      priority: 'Priority',
      assignee: 'Assignee',
      project: 'Project',
      clear: 'Clear',
      apply: 'Apply'
    },
    
    // Charts
    charts: {
      statusDistribution: 'Status Distribution',
      priorityDistribution: 'Priority Distribution',
      workloadByUser: 'Workload by User',
      completionTrend: 'Completion Trend',
      performanceOverTime: 'Performance Over Time',
      riskAssessment: 'Risk Assessment',
      projectStatusDistribution: 'Project Status Distribution',
      showChart: 'Show Chart',
      hideChart: 'Hide Chart',
      noData: 'No data available',
      loading: 'Loading chart...'
    },
    
    // Export/Actions
    actions: {
      export: 'Export',
      refresh: 'Refresh',
      generateReport: 'Generate Report',
      downloadPDF: 'Download PDF',
      downloadCSV: 'Download CSV',
      shareReport: 'Share Report',
      schedule: 'Schedule',
      settings: 'Settings'
    },
    
    // Data display
    dataDisplay: {
      noData: 'No data available',
      loadingData: 'Loading data...',
      errorLoading: 'Error loading data',
      lastUpdated: 'Last Updated',
      autoRefresh: 'Auto Refresh',
      refreshRate: 'Refresh Rate',
      minutes: 'minutes',
      seconds: 'seconds'
    },
    
    // Error messages
    errors: {
      loadingDashboard: 'An error occurred while loading the dashboard',
      loadingProjects: 'An error occurred while loading projects',
      loadingTopics: 'An error occurred while loading topics',
      updatingData: 'An error occurred while updating data',
      exportingData: 'An error occurred while exporting data',
      unauthorized: 'You do not have permission to access this dashboard'
    },
    
    // Success messages
    success: {
      dataRefreshed: 'Data refreshed successfully',
      reportGenerated: 'Report generated successfully',
      dataExported: 'Data exported successfully',
      settingsSaved: 'Settings saved successfully'
    }
  }
};