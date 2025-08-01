export const activeActionsTranslations = {
  ja: {
    // ナビゲーション
    backToDashboard: 'ダッシュボードに戻る',
    
    // パンくずナビゲーション
    breadcrumb: {
      label: 'パンくず',
      dashboard: 'ダッシュボード',
      actionManagement: 'アクション管理'
    },
    
    // ヘッダー
    header: {
      analytics: '分析',
      filter: 'フィルター'
    },
    
    // メインタイトル
    title: 'アクティブアクション',
    subtitle: '対応が必要なアクション一覧',
    description: 'プロジェクト全体で発生した対応が必要なアクションを管理します',
    
    // 概要セクション
    overview: {
      title: '全体アクション管理',
      titleBadge: '全プロジェクト横断管理',
      projectInfo: 'プロジェクトからのアクション',
      description: 'すべてのプロジェクトのアクションを一元管理し、優先順位を決定します',
      detailedDescription: '緊急度が高いアクションや期限超過アクションを特定し、効率的なリソース配分を支援します',
      projectCount: 'プロジェクト数',
      managedProjects: '管理対象プロジェクト数',
      activeProjects: 'アクティブプロジェクト',
      actionCount: 'アクション数',
      totalActionCount: '全体アクション数',
      aggregatedFrom: '全プロジェクトから集約',
      backToDashboard: 'ダッシュボードに戻る',
      toDashboard: 'ダッシュボードへ',
      globalMode: '全体管理モード'
    },
    
    // サマリーセクション
    summary: {
      title: '統計サマリー',
      globalSummary: '全体アクションサマリー',
      realtimeUpdate: 'リアルタイム更新',
      totalActions: '総アクション数',
      unhandledActions: '未対応',
      inProgressActions: '対応中',
      overdueActions: '期限超過',
      completedToday: '今日完了',
      avgResponseTime: '平均対応時間',
      days: '日',
      hours: '時間',
      unhandled: '未対応',
      inProgress: '対応中',
      resolved: '解決済み',
      overdue: '期限超過',
      completionRate: '完了率',
      highPriorityUnhandledRate: '高優先度未対応率',
      topicsWithActions: 'アクション対象トピック数',
      topicsWithActionsDescription: 'アクション含有トピック'
    },
    
    // 分析・フィルター
    analysis: '分析',
    filter: 'フィルター',
    
    // 統計
    stats: {
      totalActions: '総アクション数',
      allProjects: '全{count}プロジェクト',
      unhandled: '未対応',
      urgentAction: '緊急対応要',
      unhandledActions: '未対応アクション',
      inProgress: '対応中',
      activeInProgress: '対応進行中',
      activeActions: 'アクティブアクション',
      resolved: '解決済み',
      completed: '完了済み',
      resolvedActions: '解決アクション',
      overdue: '期限超過',
      highPriority: '緊急度高',
      overdueStatus: '期限超過'
    },
    
    // フィルター
    filters: {
      title: 'フィルター',
      search: '検索',
      searchPlaceholder: '内容・トピック・プロジェクト検索...',
      all: 'すべて',
      overdue: '期限超過のみ',
      overdueShort: '期限切れ',
      status: 'ステータス',
      priority: '優先度',
      project: 'プロジェクト',
      assignee: '担当者',
      dueDate: '期限',
      clear: 'クリア',
      apply: '適用',
      specialConditions: '特別条件',
      actionsFound: '件のアクションが見つかりました'
    },
    
    // ステータス
    status: {
      all: 'すべて',
      unhandled: '未対応',
      inProgress: '対応中',
      resolved: '解決済み',
      dismissed: '見送り',
      unknown: '不明'
    },
    
    // 優先度
    priority: {
      all: 'すべて',
      high: '高',
      medium: '中',
      low: '低'
    },
    
    // アクションリスト
    actionsList: {
      noActions: 'アクションはありません',
      noActionsDescription: '現在対応が必要なアクションはありません。',
      noSearchResults: '検索条件に一致するアクションが見つかりません',
      
      // アクションカード
      relatedProject: '関連プロジェクト',
      relatedTopic: '関連トピック',
      assignedTo: '担当者',
      dueDate: '期限',
      created: '作成日',
      lastUpdated: '最終更新',
      overdue: '期限超過',
      dueToday: '今日期限',
      dueTomorrow: '明日期限',
      noDueDate: '期限なし',
      unassigned: '未割り当て',
      
      // アクション
      viewDetails: '詳細を見る',
      markAsHandled: '対応済みにする',
      markAsInProgress: '対応中にする',
      markAsResolved: '解決済みにする',
      dismiss: '見送りする',
      assignTo: '担当者を設定',
      setDueDate: '期限を設定',
      updatePriority: '優先度を変更',
      addComment: 'コメントを追加'
    },
    
    // 分析・統計
    analytics: {
      title: 'アクション分析',
      showAnalytics: '分析を表示',
      hideAnalytics: '分析を非表示',
      
      // チャート
      actionsByStatus: 'ステータス別アクション数',
      actionsByPriority: '優先度別アクション数',
      actionsByProject: 'プロジェクト別アクション数',
      responseTimesTrend: '対応時間トレンド',
      weeklyProgress: '週間進捗',
      
      // プロジェクト・トピック分析
      topProjects: '最多アクションプロジェクト',
      topTopics: '最多アクショントピック',
      showAllProjects: 'すべてのプロジェクトを表示',
      showAllTopics: 'すべてのトピックを表示',
      hideProjects: 'プロジェクトを非表示',
      hideTopics: 'トピックを非表示',
      viewProject: 'プロジェクトを見る',
      viewTopic: 'トピックを見る',
      topicAnalysis: 'トピック別アクション数',
      projectDistribution: 'プロジェクト別分布',
      topicDistribution: 'トピック別分布',
      
      // CSV エクスポート
      csvExport: 'CSV エクスポート',
      csvHeader: {
        item: '項目',
        value: '値'
      },
      csvData: {
        totalActions: '総アクション数',
        unhandled: '未対応',
        inProgress: '対応中',
        highPriority: '高優先度',
        mediumPriority: '中優先度',
        lowPriority: '低優先度',
        overdue: '期限超過',
        averageAge: '平均経過日数',
        completionRate: '完了率',
        projectDistribution: 'プロジェクト別分布',
        topicDistribution: 'トピック別分布'
      },
      
      // 分析指標
      statusDistribution: 'ステータス分布',
      priorityDistribution: '優先度分布',
      averageAge: '平均経過日数',
      completionRate: '完了率',
      unhandled: '未対応',
      inProgress: '対応中',
      highPriority: '高優先度',
      mediumPriority: '中優先度',
      lowPriority: '低優先度',
      overdue: '期限超過',
      dismissed: '見送り',
      needsAction: '対応が必要',
      highPriorityActions: '高優先度アクション',
      activeProjects: 'アクティブプロジェクト',
      projectsWithActions: 'アクション含有プロジェクト',
      statusAnalysis: 'ステータス別分析',
      priorityAnalysis: '優先度別分析',
      itemsUnit: '件',
      
      // 表示制御
      showAll: 'すべて表示',
      showAllWithCount: 'すべて表示 ({count}件)',
      collapse: '折りたたむ',
      scrollToSeeAll: 'スクロールして全{count}件を確認'
    },
    
    // 一括操作
    bulkActions: {
      title: '一括操作',
      selectAll: 'すべて選択',
      deselectAll: '選択解除',
      selectedItems: '{count}件選択中',
      markAsHandled: '一括で対応済みにする',
      markAsInProgress: '一括で対応中にする',
      markAsResolved: '一括で解決済みにする',
      assignTo: '一括で担当者を設定',
      setDueDate: '一括で期限を設定',
      setPriority: '一括で優先度を設定',
      export: 'エクスポート',
      delete: '一括削除'
    },
    
    // ソート
    sort: {
      title: '並び替え',
      newest: '新しい順',
      oldest: '古い順',
      priority: '優先度順',
      dueDate: '期限順',
      project: 'プロジェクト順',
      status: 'ステータス順',
      lastUpdated: '更新順'
    },
    
    // エラーメッセージ
    errors: {
      loadingActions: 'アクションの読み込み中にエラーが発生しました',
      updatingAction: 'アクションの更新中にエラーが発生しました',
      deletingAction: 'アクションの削除中にエラーが発生しました',
      exportingActions: 'エクスポート中にエラーが発生しました'
    },
    
    // 成功メッセージ
    success: {
      actionUpdated: 'アクションが更新されました',
      actionsUpdated: '{count}件のアクションが更新されました',
      actionDeleted: 'アクションが削除されました',
      actionsExported: 'アクションがエクスポートされました'
    },
    
    // 確認ダイアログ
    confirm: {
      deleteAction: 'このアクションを削除しますか？',
      deleteActions: '{count}件のアクションを削除しますか？',
      markAsResolved: 'このアクションを解決済みとしてマークしますか？',
      dismiss: 'このアクションを見送りしますか？'
    },
    
    // 空の状態
    emptyState: {
      title: 'アクションがありません',
      noMatchingActions: '条件に一致するアクションが見つかりません',
      allCompleted: 'すべてのアクションが完了しています'
    },
    
    // アクション
    actions: {
      details: '詳細',
      openActionManagement: 'アクション管理を開く',
      project: 'プロジェクト',
      topic: 'トピック',
      dueDate: '期限'
    }
  },
  
  en: {
    // Navigation
    backToDashboard: 'Back to Dashboard',
    
    // Breadcrumb navigation
    breadcrumb: {
      label: 'Breadcrumb',
      dashboard: 'Dashboard',
      actionManagement: 'Action Management'
    },
    
    // Header
    header: {
      analytics: 'Analytics',
      filter: 'Filter'
    },
    
    // Main title
    title: 'Active Actions',
    subtitle: 'List of actions requiring attention',
    description: 'Manage actions that require attention across all projects',
    
    // Overview section
    overview: {
      title: 'Global Action Management',
      titleBadge: 'Cross-Project Management',
      projectInfo: 'actions from projects',
      description: 'Centrally manage actions from all projects and prioritize',
      detailedDescription: 'Identify urgent actions and overdue items to support efficient resource allocation',
      projectCount: 'Projects',
      managedProjects: 'Managed Projects',
      activeProjects: 'Active Projects',
      actionCount: 'Actions',
      totalActionCount: 'Total Actions',
      aggregatedFrom: 'Aggregated from all projects',
      backToDashboard: 'Back to Dashboard',
      toDashboard: 'To Dashboard',
      globalMode: 'Global Management Mode'
    },
    
    // Summary section
    summary: {
      title: 'Statistics Summary',
      globalSummary: 'Global Action Summary',
      realtimeUpdate: 'Real-time Update',
      totalActions: 'Total Actions',
      unhandledActions: 'Unhandled',
      inProgressActions: 'In Progress',
      overdueActions: 'Overdue',
      completedToday: 'Completed Today',
      avgResponseTime: 'Avg Response Time',
      days: 'days',
      hours: 'hours',
      unhandled: 'Unhandled',
      inProgress: 'In Progress',
      resolved: 'Resolved',
      overdue: 'Overdue',
      completionRate: 'Completion Rate',
      highPriorityUnhandledRate: 'High Priority Unhandled Rate',
      topicsWithActions: 'Topics with Actions',
      topicsWithActionsDescription: 'Topics containing actions'
    },
    
    // Analysis & Filter
    analysis: 'Analysis',
    filter: 'Filter',
    
    // Statistics
    stats: {
      totalActions: 'Total Actions',
      allProjects: 'All {count} Projects',
      unhandled: 'Unhandled',
      urgentAction: 'Urgent Action Required',
      unhandledActions: 'Unhandled Actions',
      inProgress: 'In Progress',
      activeInProgress: 'Active In Progress',
      activeActions: 'Active Actions',
      resolved: 'Resolved',
      completed: 'Completed',
      resolvedActions: 'Resolved Actions',
      overdue: 'Overdue',
      highPriority: 'High Priority',
      overdueStatus: 'Overdue'
    },
    
    // Filters
    filters: {
      title: 'Filters',
      search: 'Search',
      searchPlaceholder: 'Search content, topics, projects...',
      all: 'All',
      overdue: 'Overdue Only',
      overdueShort: 'Overdue',
      status: 'Status',
      priority: 'Priority',
      project: 'Project',
      assignee: 'Assignee',
      dueDate: 'Due Date',
      clear: 'Clear',
      apply: 'Apply',
      specialConditions: 'Special Conditions',
      actionsFound: ' actions found'
    },
    
    // Status
    status: {
      all: 'All',
      unhandled: 'Unhandled',
      inProgress: 'In Progress',
      resolved: 'Resolved',
      dismissed: 'Dismissed',
      unknown: 'Unknown'
    },
    
    // Priority
    priority: {
      all: 'All',
      high: 'High',
      medium: 'Medium',
      low: 'Low'
    },
    
    // Actions list
    actionsList: {
      noActions: 'No actions available',
      noActionsDescription: 'There are currently no actions requiring attention.',
      noSearchResults: 'No actions found matching your search criteria',
      
      // Action card
      relatedProject: 'Related Project',
      relatedTopic: 'Related Topic',
      assignedTo: 'Assigned To',
      dueDate: 'Due Date',
      created: 'Created',
      lastUpdated: 'Last Updated',
      overdue: 'Overdue',
      dueToday: 'Due Today',
      dueTomorrow: 'Due Tomorrow',
      noDueDate: 'No Due Date',
      unassigned: 'Unassigned',
      
      // Actions
      viewDetails: 'View Details',
      markAsHandled: 'Mark as Handled',
      markAsInProgress: 'Mark as In Progress',
      markAsResolved: 'Mark as Resolved',
      dismiss: 'Dismiss',
      assignTo: 'Assign To',
      setDueDate: 'Set Due Date',
      updatePriority: 'Update Priority',
      addComment: 'Add Comment'
    },
    
    // Analytics
    analytics: {
      title: 'Action Analytics',
      showAnalytics: 'Show Analytics',
      hideAnalytics: 'Hide Analytics',
      
      // Charts
      actionsByStatus: 'Actions by Status',
      actionsByPriority: 'Actions by Priority',
      actionsByProject: 'Actions by Project',
      responseTimesTrend: 'Response Times Trend',
      weeklyProgress: 'Weekly Progress',
      
      // Project/Topic analysis
      topProjects: 'Top Projects by Actions',
      topTopics: 'Top Topics by Actions',
      showAllProjects: 'Show All Projects',
      showAllTopics: 'Show All Topics',
      hideProjects: 'Hide Projects',
      hideTopics: 'Hide Topics',
      viewProject: 'View Project',
      viewTopic: 'View Topic',
      topicAnalysis: 'Actions by Topic',
      projectDistribution: 'Project Distribution',
      topicDistribution: 'Topic Distribution',
      
      // CSV Export
      csvExport: 'CSV Export',
      csvHeader: {
        item: 'Item',
        value: 'Value'
      },
      csvData: {
        totalActions: 'Total Actions',
        unhandled: 'Unhandled',
        inProgress: 'In Progress',
        highPriority: 'High Priority',
        mediumPriority: 'Medium Priority',
        lowPriority: 'Low Priority',
        overdue: 'Overdue',
        averageAge: 'Average Age (Days)',
        completionRate: 'Completion Rate',
        projectDistribution: 'Project Distribution',
        topicDistribution: 'Topic Distribution'
      },
      
      // Analytics metrics
      statusDistribution: 'Status Distribution',
      priorityDistribution: 'Priority Distribution',
      averageAge: 'Average Age (Days)',
      completionRate: 'Completion Rate',
      unhandled: 'Unhandled',
      inProgress: 'In Progress',
      highPriority: 'High Priority',
      mediumPriority: 'Medium Priority',
      lowPriority: 'Low Priority',
      overdue: 'Overdue',
      dismissed: 'Dismissed',
      needsAction: 'Needs Action',
      highPriorityActions: 'High Priority Actions',
      activeProjects: 'Active Projects',
      projectsWithActions: 'Projects with Actions',
      statusAnalysis: 'Status Analysis',
      priorityAnalysis: 'Priority Analysis',
      itemsUnit: ' items',
      
      // Display controls
      showAll: 'Show All',
      showAllWithCount: 'Show All ({count} items)',
      collapse: 'Collapse',
      scrollToSeeAll: 'Scroll to see all {count} items'
    },
    
    // Bulk actions
    bulkActions: {
      title: 'Bulk Actions',
      selectAll: 'Select All',
      deselectAll: 'Deselect All',
      selectedItems: '{count} selected',
      markAsHandled: 'Mark as Handled',
      markAsInProgress: 'Mark as In Progress',
      markAsResolved: 'Mark as Resolved',
      assignTo: 'Assign To',
      setDueDate: 'Set Due Date',
      setPriority: 'Set Priority',
      export: 'Export',
      delete: 'Delete'
    },
    
    // Sort
    sort: {
      title: 'Sort',
      newest: 'Newest First',
      oldest: 'Oldest First',
      priority: 'By Priority',
      dueDate: 'By Due Date',
      project: 'By Project',
      status: 'By Status',
      lastUpdated: 'By Last Updated'
    },
    
    // Error messages
    errors: {
      loadingActions: 'An error occurred while loading actions',
      updatingAction: 'An error occurred while updating action',
      deletingAction: 'An error occurred while deleting action',
      exportingActions: 'An error occurred while exporting actions'
    },
    
    // Success messages
    success: {
      actionUpdated: 'Action updated successfully',
      actionsUpdated: '{count} actions updated successfully',
      actionDeleted: 'Action deleted successfully',
      actionsExported: 'Actions exported successfully'
    },
    
    // Confirmation dialogs
    confirm: {
      deleteAction: 'Delete this action?',
      deleteActions: 'Delete {count} actions?',
      markAsResolved: 'Mark this action as resolved?',
      dismiss: 'Dismiss this action?'
    },
    
    // Empty state
    emptyState: {
      title: 'No Actions Available',
      noMatchingActions: 'No actions found matching the criteria',
      allCompleted: 'All actions have been completed'
    },
    
    // Actions
    actions: {
      details: 'Details',
      openActionManagement: 'Open Action Management',
      project: 'Project',
      topic: 'Topic',
      dueDate: 'Due Date'
    }
  }
};