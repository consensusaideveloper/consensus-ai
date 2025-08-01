export const projectActionsTranslations = {
  ja: {
    // ナビゲーション
    backToProject: 'プロジェクトに戻る',
    
    // メインタイトル
    title: 'プロジェクトアクション',
    subtitle: 'プロジェクト内のアクション管理',
    description: 'このプロジェクトで発生したアクションを一元管理します',
    
    // プロジェクト情報
    project: {
      notFound: 'プロジェクトが見つかりません',
      notFoundDescription: '指定されたプロジェクトは存在しないか、アクセス権限がありません。',
      backToDashboard: 'ダッシュボードに戻る',
      projectDetail: 'プロジェクト詳細',
      projectDetailButton: 'プロジェクト詳細へ',
      toGlobalManagement: '全体管理へ',
      projectMode: 'プロジェクトモード',
      projectManagement: 'プロジェクト内アクション管理',
      projectDescription: 'このプロジェクト内のすべてのアクションを効率的に管理・追跡します',
      loading: 'プロジェクトを読み込み中...',
      topicCount: 'トピック数',
      projectTopicCount: 'プロジェクト内トピック数',
      actionCount: 'アクション数',
      projectActionCount: 'プロジェクト内アクション数',
      project: 'プロジェクト',
      analyzedTopics: '分析対象トピック',
      actionsToHandle: '対応要アクション',
      projectStatistics: 'プロジェクト統計'
    },
    
    // 統計・サマリー
    summary: {
      title: '統計サマリー',
      totalActions: '総アクション数',
      unhandledActions: '未対応アクション',
      inProgressActions: '対応中アクション',
      completedActions: '完了アクション',
      overdueActions: '期限超過',
      avgCompletionTime: '平均完了時間',
      days: '日',
      hours: '時間',
      unhandled: '未対応',
      inProgress: '対応中',
      resolved: '解決済み',
      overdue: '期限切れ',
      completionRate: '完了率',
      highPriorityUnhandledRate: '高優先度未対応率',
      topicsWithActions: '関連トピック数',
      topicsWithActionsDescription: 'アクションが存在'
    },
    
    // フィルター
    filters: {
      title: 'フィルター',
      search: 'アクションを検索...',
      all: 'すべて',
      status: 'ステータス',
      priority: '優先度',
      topic: 'トピック',
      assignee: '担当者',
      dueDate: '期限',
      clear: 'クリア',
      apply: '適用',
      showFilters: 'フィルターを表示',
      hideFilters: 'フィルターを非表示'
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
      noActionsDescription: 'このプロジェクトには現在アクションがありません。',
      noSearchResults: '検索条件に一致するアクションが見つかりません',
      
      // アクションカード
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
      dismiss: '見送る',
      assignTo: '担当者を設定',
      setDueDate: '期限を設定',
      updatePriority: '優先度を変更',
      addComment: 'コメントを追加',
      edit: '編集',
      delete: '削除'
    },
    
    // ヘッダーアクション
    analysis: '分析',
    filter: 'フィルター',

    // 分析・統計
    analytics: {
      title: 'プロジェクト分析',
      showAnalytics: '分析を表示',
      hideAnalytics: '分析を非表示',
      
      // チャート
      actionsByStatus: 'ステータス別アクション数',
      actionsByPriority: '優先度別アクション数',
      actionsByTopic: 'トピック別アクション数',
      completionTimeTrend: '完了時間トレンド',
      weeklyProgress: '週間進捗',
      
      // トピック分析
      topTopics: '最多アクショントピック',
      viewTopic: 'トピックを見る',
      actionsCount: '{count}件のアクション'
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
    
    // 詳細分析
    detailedAnalysis: {
      title: 'アクション分析レポート',
      csvExport: 'CSV出力',
      statusAnalysis: 'ステータス別アクション数',
      priorityAnalysis: '優先度別アクション数',
      topicAnalysis: 'トピック別アクション数（上位10件）',
      overdueAnalysis: '期限切れアクション（最新5件）',
      highPriority: '高優先度',
      mediumPriority: '中優先度',
      lowPriority: '低優先度',
      topicRank: '位',
      actionItems: '件',
      dueDate: '期限',
      daysOverdue: '日超過',
      topicStatus: 'ステータス',
      moreTopics: '他 {count} 件のトピックにアクションがあります',
      moreOverdue: '他 {count} 件の期限切れアクションがあります',
      needsAction: '対応が必要'
    },
    
    // ソート
    sort: {
      title: '並び替え',
      newest: '新しい順',
      oldest: '古い順',
      priority: '優先度順',
      dueDate: '期限順',
      topic: 'トピック順',
      status: 'ステータス順',
      lastUpdated: '更新順'
    },
    
    // エラーメッセージ
    errors: {
      loadingProject: 'プロジェクトの読み込み中にエラーが発生しました',
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
      dismiss: 'このアクションを見送りますか？'
    }
  },
  
  en: {
    // Navigation
    backToProject: 'Back to Project',
    
    // Main title
    title: 'Project Actions',
    subtitle: 'Action management within project',
    description: 'Centrally manage actions generated within this project',
    
    // Project information
    project: {
      notFound: 'Project not found',
      notFoundDescription: 'The specified project does not exist or you do not have access permission.',
      backToDashboard: 'Back to Dashboard',
      projectDetail: 'Project Details',
      projectDetailButton: 'To Project Details',
      toGlobalManagement: 'To Global Management',
      projectMode: 'Project Mode',
      projectManagement: 'Project Action Management',
      projectDescription: 'Efficiently manage and track all actions within this project',
      loading: 'Loading project...',
      topicCount: 'Topics',
      projectTopicCount: 'Topics in Project',
      actionCount: 'Actions',
      projectActionCount: 'Actions in Project',
      project: 'Project',
      analyzedTopics: 'Analyzed Topics',
      actionsToHandle: 'Actions to Handle',
      projectStatistics: 'Project Statistics'
    },
    
    // Statistics/Summary
    summary: {
      title: 'Statistics Summary',
      totalActions: 'Total Actions',
      unhandledActions: 'Unhandled Actions',
      inProgressActions: 'In Progress Actions',
      completedActions: 'Completed Actions',
      overdueActions: 'Overdue Actions',
      avgCompletionTime: 'Avg Completion Time',
      days: 'days',
      hours: 'hours',
      unhandled: 'Unhandled',
      inProgress: 'In Progress',
      resolved: 'Resolved',
      overdue: 'Overdue',
      completionRate: 'Completion Rate',
      highPriorityUnhandledRate: 'High Priority Unhandled Rate',
      topicsWithActions: 'Related Topics',
      topicsWithActionsDescription: 'With Actions'
    },
    
    // Filters
    filters: {
      title: 'Filters',
      search: 'Search actions...',
      all: 'All',
      status: 'Status',
      priority: 'Priority',
      topic: 'Topic',
      assignee: 'Assignee',
      dueDate: 'Due Date',
      clear: 'Clear',
      apply: 'Apply',
      showFilters: 'Show Filters',
      hideFilters: 'Hide Filters'
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
      noActionsDescription: 'This project currently has no actions.',
      noSearchResults: 'No actions found matching your search criteria',
      
      // Action card
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
      addComment: 'Add Comment',
      edit: 'Edit',
      delete: 'Delete'
    },
    
    // Header actions
    analysis: 'Analysis',
    filter: 'Filter',

    // Analytics
    analytics: {
      title: 'Project Analysis',
      showAnalytics: 'Show Analytics',
      hideAnalytics: 'Hide Analytics',
      
      // Charts
      actionsByStatus: 'Actions by Status',
      actionsByPriority: 'Actions by Priority',
      actionsByTopic: 'Actions by Topic',
      completionTimeTrend: 'Completion Time Trend',
      weeklyProgress: 'Weekly Progress',
      
      // Topic analysis
      topTopics: 'Top Topics by Actions',
      viewTopic: 'View Topic',
      actionsCount: '{count} actions'
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
    
    // Detailed analysis
    detailedAnalysis: {
      title: 'Action Analysis Report',
      csvExport: 'CSV Export',
      statusAnalysis: 'Actions by Status',
      priorityAnalysis: 'Actions by Priority',
      topicAnalysis: 'Actions by Topic (Top 10)',
      overdueAnalysis: 'Overdue Actions (Latest 5)',
      highPriority: 'High Priority',
      mediumPriority: 'Medium Priority',
      lowPriority: 'Low Priority',
      topicRank: 'Rank',
      actionItems: 'items',
      dueDate: 'Due Date',
      daysOverdue: 'days overdue',
      topicStatus: 'Status',
      moreTopics: '{count} more topics have actions',
      moreOverdue: '{count} more overdue actions exist',
      needsAction: 'needs action'
    },
    
    // Sort
    sort: {
      title: 'Sort',
      newest: 'Newest First',
      oldest: 'Oldest First',
      priority: 'By Priority',
      dueDate: 'By Due Date',
      topic: 'By Topic',
      status: 'By Status',
      lastUpdated: 'By Last Updated'
    },
    
    // Error messages
    errors: {
      loadingProject: 'An error occurred while loading the project',
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
    }
  }
};