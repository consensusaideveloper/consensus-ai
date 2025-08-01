export const topicDetailTranslations = {
  ja: {
    // ナビゲーション
    backToProject: 'プロジェクトに戻る',
    backToDashboard: 'ダッシュボードに戻る',
    
    // メインタイトル
    title: 'トピック詳細',
    subtitle: 'トピック分析と意見管理',
    
    // トピック情報
    topic: {
      notFound: 'トピックが見つかりません',
      status: 'ステータス',
      priority: '優先度',
      assignedTo: '担当者',
      dueDate: '期限',
      created: '作成日',
      lastUpdated: '最終更新',
      opinionsCount: '意見数',
      bookmarkedCount: 'ブックマーク済み',
      description: '説明',
      summary: '要約',
      keywords: 'キーワード',
      relatedOpinions: '関連意見',
      aiSummary: 'AI要約',
      priorityReason: '優先度設定理由',
      importantResponseSummary: '重要意見サマリー',
      continueReading: '続きを読む',
      collapse: '折りたたむ',
      activeActionsWarning: '継続アクションあり',
      responsesFound: '{count} 件の意見が見つかりました',
      readMore: '続きを読む'
    },
    
    // フィルター・検索
    filters: {
      title: 'フィルター',
      search: '検索',
      searchPlaceholder: '意見内容を検索...',
      all: 'すべて',
      bookmarked: 'ブックマーク済み',
      unbookmarked: 'ブックマークなし',
      bookmark: 'ブックマーク',
      sentiment: 'センチメント',
      positive: '賛成',
      negative: '反対',
      neutral: '中立',
      actionStatus: '対応ステータス',
      unhandled: '未対応',
      inProgress: '対応中',
      resolved: '解決済み',
      dismissed: '見送り',
      clear: 'クリア',
      apply: '適用'
    },
    
    // ソート
    sort: {
      title: '並び順',
      newest: '新しい順',
      oldest: '古い順',
      reactions: 'ブックマーク順',
      status: 'ステータス順',
      priority: '優先度順',
      sentiment: '感情順'
    },
    
    // 意見リスト
    opinions: {
      title: '意見一覧',
      noOpinions: '意見が見つかりません',
      noSearchResults: '検索条件に一致する意見がありません',
      noResults: 'このトピックに関連する意見がありません',
      totalOpinions: '総意見数',
      filteredOpinions: 'フィルター結果',
      loadMore: 'さらに読み込む',
      
      // 意見カード
      submittedAt: '投稿日',
      characters: '文字',
      bookmark: 'ブックマーク',
      unbookmark: 'ブックマーク解除',
      viewDetails: '詳細表示',
      viewDetailsLong: '詳細を見る',
      editAction: 'アクションを編集',
      actionManagement: 'アクション管理',
      setStatus: 'ステータスを設定',
      setPriority: '優先度を設定',
      assignTo: '担当者を設定',
      setDueDate: '期限を設定',
      addComment: 'コメントを追加',
      bookmarkAdded: 'ブックマーク済み',
      bookmarkRemove: 'ブックマーク削除',
      bookmarkAdd: 'ブックマーク追加'
    },
    
    // アクション管理
    actions: {
      title: 'アクション管理',
      createAction: 'アクションを作成',
      editAction: 'アクションを編集',
      deleteAction: 'アクションを削除',
      assignAction: 'アクションを割り当て',
      updateStatus: 'ステータスを更新',
      updatePriority: '優先度を更新',
      setDueDate: '期限を設定',
      markComplete: '完了にマーク',
      markInProgress: '進行中にマーク',
      dismiss: '見送りする',
      
      // アクション詳細
      actionDetails: 'アクション詳細',
      description: '説明',
      assignee: '担当者',
      dueDate: '期限',
      priority: '優先度',
      status: 'ステータス',
      createdBy: '作成者',
      createdAt: '作成日',
      updatedAt: '更新日',
      comments: 'コメント',
      history: '履歴'
    },
    
    // ステータス
    status: {
      all: 'すべて',
      unhandled: '未対応',
      inProgress: '対応中',
      resolved: '解決済み',
      dismissed: '見送り',
      completed: '完了',
      pending: '保留',
      reviewing: 'レビュー中',
      approved: '承認済み',
      rejected: '却下済み'
    },
    
    // 優先度
    priority: {
      urgent: '緊急',
      high: '高',
      medium: '中',
      low: '低',
      none: 'なし'
    },
    
    // モーダル・ダイアログ
    modal: {
      responseDetails: '意見詳細',
      editAction: 'アクション編集',
      statusUpdate: 'ステータス更新',
      priorityUpdate: '優先度更新',
      assignmentUpdate: '担当者更新',
      dueDateUpdate: '期限更新',
      close: '閉じる',
      save: '保存',
      cancel: 'キャンセル',
      delete: '削除',
      confirm: '確認'
    },
    
    // 統計・分析
    analytics: {
      title: '分析',
      sentimentDistribution: '感情分布',
      actionStatusDistribution: 'アクションステータス分布',
      timelineAnalysis: '時系列分析',
      keywordAnalysis: 'キーワード分析',
      engagementMetrics: 'エンゲージメント指標',
      averageResponseTime: '平均意見時間',
      completionRate: '完了率',
      satisfactionScore: '満足度スコア',
      showAnalytics: '分析を表示',
      hideAnalytics: '分析を非表示'
    },
    
    // 一括操作
    bulkActions: {
      title: '一括操作',
      selectAll: 'すべて選択',
      deselectAll: '選択解除',
      selectedItems: '{count}件選択中',
      bookmarkSelected: '選択項目をブックマーク',
      unbookmarkSelected: '選択項目のブックマーク解除',
      updateStatus: 'ステータスを更新',
      updatePriority: '優先度を更新',
      assignTo: '担当者を設定',
      setDueDate: '期限を設定',
      export: 'エクスポート',
      delete: '削除'
    },
    
    // エクスポート
    export: {
      title: 'エクスポート',
      csv: 'CSVエクスポート',
      csvShort: 'CSV',
      json: 'JSON形式',
      pdf: 'PDF形式',
      includeSummary: '要約を含める',
      includeAnalytics: '分析を含める',
      includeComments: 'コメントを含める',
      dateRange: '期間',
      allTime: 'すべての期間',
      last30Days: '過去30日',
      last7Days: '過去7日',
      custom: 'カスタム期間'
    },

    // 統計
    stats: {
      totalResponses: '総意見数',
      bookmarked: 'ブックマーク',
      positive: '賛成',
      negative: '反対',
      neutral: '中立',
      unhandled: '未対応',
      inProgress: '対応中',
      resolved: '解決済み',
      dismissed: '見送り'
    },

    // センチメント
    sentiment: {
      positive: '賛成',
      negative: '反対',
      neutral: '中立・条件付き意見'
    },

    // UI要素
    ui: {
      statusChange: 'ステータス変更',
      detailManagement: '詳細管理',
      save: '保存',
      dueDate: '期限',
      assignee: '担当',
      assigneeShort: '担当',
      dateUnknown: '日付不明',
      topic: 'トピック',
      helpText: 'トピック全体の状況を管理。個別意見はアクション管理で追跡。',
      activeActionsTitle: '継続アクションあり',
      activeActionsMessage: 'このトピックは解決済みですが、{count}件のアクション管理が進行中です',
      assignedActionsNote: '(担当者設定済み: {count}件)',
      progressTrackingNote: '個別のアクション管理で詳細な進捗を追跡できます'
    },

    // 優先度管理
    priorityManagement: {
      noPriority: '優先度を「設定しない」に変更しました',
      highPriority: '高優先度',
      mediumPriority: '中優先度',
      lowPriority: '低優先度',
      priorityUpdated: 'トピックの優先度を「{priority}」に変更しました',
      priorityUpdateFailed: '優先度の変更に失敗しました'
    },

    // 解決管理
    resolution: {
      reason: '解決根拠',
      dismissalReason: '見送り理由',
      reasonPlaceholder: '解決方法や根拠を記録...',
      dismissalPlaceholder: '見送り理由を記録...',
      reasonSaved: '解決根拠を保存しました',
      dismissalSaved: '見送り理由を保存しました',
      resolutionManagement: '解決管理',
      dismissalManagement: '見送り管理'
    },

    // デバッグ情報
    debug: {
      topicId: 'トピックID',
      availableFirebaseTopics: '利用可能なFirebaseトピック',
      projectAnalysisData: 'プロジェクト分析データ',
      firebaseTopics: 'Firebaseトピック',
      count: '件'
    },

    // ステータス提案
    statusSuggestions: {
      resolutionReasonHigh: '関連する重要意見がほぼすべて解決済みです。このトピックを「解決済み」にしませんか？',
      resolutionReasonMedium: '関連する重要意見の大部分が解決済みです。このトピックの解決を検討してください。',
      dismissalReason: '長期間対応されていないトピックです。見送りを検討してください。'
    },
    
    // エラーメッセージ
    errors: {
      loadingTopic: 'トピックの読み込み中にエラーが発生しました',
      loadingOpinions: '意見の読み込み中にエラーが発生しました',
      updatingStatus: 'ステータスの更新中にエラーが発生しました',
      updatingPriority: '優先度の更新中にエラーが発生しました',
      bookmarking: 'ブックマークの更新中にエラーが発生しました',
      exportingData: 'データのエクスポート中にエラーが発生しました',
      unauthorized: 'このトピックにアクセスする権限がありません',
      notFound: 'トピックが見つかりません'
    },
    
    // 成功メッセージ
    success: {
      statusUpdated: 'ステータスが更新されました',
      priorityUpdated: '優先度が更新されました',
      bookmarkAdded: 'ブックマークに追加されました',
      bookmarkRemoved: 'ブックマークから削除されました',
      actionCreated: 'アクションが作成されました',
      actionUpdated: 'アクションが更新されました',
      actionDeleted: 'アクションが削除されました',
      dataExported: 'データがエクスポートされました',
      assignmentUpdated: '担当者が更新されました',
      dueDateUpdated: '期限が更新されました'
    },
    
    // 確認ダイアログ
    confirm: {
      deleteAction: 'このアクションを削除しますか？',
      updateStatus: 'ステータスを更新しますか？',
      bulkUpdate: '{count}件の項目を更新しますか？',
      dismissTopic: 'このトピックを見送りしますか？',
      markComplete: 'このトピックを完了としてマークしますか？'
    },
    
    // 読み込み状態
    loading: {
      topic: 'トピックを読み込み中...',
      opinions: '意見を読み込み中...',
      updating: '更新中...',
      exporting: 'エクスポート中...',
      saving: '保存中...'
    }
  },
  
  en: {
    // Navigation
    backToProject: 'Back to Project',
    backToDashboard: 'Back to Dashboard',
    
    // Main title
    title: 'Topic Details',
    subtitle: 'Topic analysis and opinion management',
    
    // Topic information
    topic: {
      notFound: 'Topic not found',
      status: 'Status',
      priority: 'Priority',
      assignedTo: 'Assigned To',
      dueDate: 'Due Date',
      created: 'Created',
      lastUpdated: 'Last Updated',
      opinionsCount: 'Opinion Count',
      bookmarkedCount: 'Bookmarked',
      description: 'Description',
      summary: 'Summary',
      keywords: 'Keywords',
      relatedOpinions: 'Related Opinions',
      aiSummary: 'AI Summary',
      priorityReason: 'Priority Reason',
      importantResponseSummary: 'Important Opinion Summary',
      continueReading: 'Continue Reading',
      collapse: 'Collapse',
      activeActionsWarning: 'Active Actions',
      responsesFound: '{count} opinions found',
      readMore: 'Read more'
    },
    
    // Filters/Search
    filters: {
      title: 'Filters',
      search: 'Search',
      searchPlaceholder: 'Search opinion content...',
      all: 'All',
      bookmarked: 'Bookmarked',
      unbookmarked: 'Unbookmarked',
      bookmark: 'Bookmark',
      sentiment: 'Sentiment',
      positive: 'Positive',
      negative: 'Negative',
      neutral: 'Neutral',
      actionStatus: 'Action Status',
      unhandled: 'Unhandled',
      inProgress: 'In Progress',
      resolved: 'Resolved',
      dismissed: 'Dismissed',
      clear: 'Clear',
      apply: 'Apply'
    },
    
    // Sort
    sort: {
      title: 'Sort',
      newest: 'Newest First',
      oldest: 'Oldest First',
      reactions: 'By Bookmarks',
      status: 'By Status',
      priority: 'By Priority',
      sentiment: 'By Sentiment'
    },
    
    // Opinions list
    opinions: {
      title: 'Opinions List',
      noOpinions: 'No opinions found',
      noSearchResults: 'No opinions found matching your search criteria',
      noResults: 'No opinions related to this topic',
      totalOpinions: 'Total Opinions',
      filteredOpinions: 'Filtered Results',
      loadMore: 'Load More',
      
      // Opinion card
      submittedAt: 'Submitted',
      characters: 'characters',
      bookmark: 'Bookmark',
      unbookmark: 'Remove Bookmark',
      viewDetails: 'View Details',
      viewDetailsLong: 'View Details',
      editAction: 'Edit Action',
      actionManagement: 'Action Management',
      setStatus: 'Set Status',
      setPriority: 'Set Priority',
      assignTo: 'Assign To',
      setDueDate: 'Set Due Date',
      addComment: 'Add Comment',
      bookmarkAdded: 'Bookmarked',
      bookmarkRemove: 'Remove Bookmark',
      bookmarkAdd: 'Add Bookmark'
    },
    
    // Action management
    actions: {
      title: 'Action Management',
      createAction: 'Create Action',
      editAction: 'Edit Action',
      deleteAction: 'Delete Action',
      assignAction: 'Assign Action',
      updateStatus: 'Update Status',
      updatePriority: 'Update Priority',
      setDueDate: 'Set Due Date',
      markComplete: 'Mark Complete',
      markInProgress: 'Mark In Progress',
      dismiss: 'Dismiss',
      
      // Action details
      actionDetails: 'Action Details',
      description: 'Description',
      assignee: 'Assignee',
      dueDate: 'Due Date',
      priority: 'Priority',
      status: 'Status',
      createdBy: 'Created By',
      createdAt: 'Created At',
      updatedAt: 'Updated At',
      comments: 'Comments',
      history: 'History'
    },
    
    // Status
    status: {
      all: 'All',
      unhandled: 'Unhandled',
      inProgress: 'In Progress',
      resolved: 'Resolved',
      dismissed: 'Dismissed',
      completed: 'Completed',
      pending: 'Pending',
      reviewing: 'Reviewing',
      approved: 'Approved',
      rejected: 'Rejected'
    },
    
    // Priority
    priority: {
      urgent: 'Urgent',
      high: 'High',
      medium: 'Medium',
      low: 'Low',
      none: 'None'
    },
    
    // Modal/Dialog
    modal: {
      responseDetails: 'Opinion Details',
      editAction: 'Edit Action',
      statusUpdate: 'Status Update',
      priorityUpdate: 'Priority Update',
      assignmentUpdate: 'Assignment Update',
      dueDateUpdate: 'Due Date Update',
      close: 'Close',
      save: 'Save',
      cancel: 'Cancel',
      delete: 'Delete',
      confirm: 'Confirm'
    },
    
    // Analytics
    analytics: {
      title: 'Analytics',
      sentimentDistribution: 'Sentiment Distribution',
      actionStatusDistribution: 'Action Status Distribution',
      timelineAnalysis: 'Timeline Analysis',
      keywordAnalysis: 'Keyword Analysis',
      engagementMetrics: 'Engagement Metrics',
      averageResponseTime: 'Avg Opinion Time',
      completionRate: 'Completion Rate',
      satisfactionScore: 'Satisfaction Score',
      showAnalytics: 'Show Analytics',
      hideAnalytics: 'Hide Analytics'
    },
    
    // Bulk actions
    bulkActions: {
      title: 'Bulk Actions',
      selectAll: 'Select All',
      deselectAll: 'Deselect All',
      selectedItems: '{count} selected',
      bookmarkSelected: 'Bookmark Selected',
      unbookmarkSelected: 'Remove Bookmarks',
      updateStatus: 'Update Status',
      updatePriority: 'Update Priority',
      assignTo: 'Assign To',
      setDueDate: 'Set Due Date',
      export: 'Export',
      delete: 'Delete'
    },
    
    // Export
    export: {
      title: 'Export',
      csv: 'CSV Export',
      csvShort: 'CSV',
      json: 'JSON Format',
      pdf: 'PDF Format',
      includeSummary: 'Include Summary',
      includeAnalytics: 'Include Analytics',
      includeComments: 'Include Comments',
      dateRange: 'Date Range',
      allTime: 'All Time',
      last30Days: 'Last 30 Days',
      last7Days: 'Last 7 Days',
      custom: 'Custom Range'
    },

    // Statistics
    stats: {
      totalResponses: 'Total Opinions',
      bookmarked: 'Bookmarked',
      positive: 'Positive',
      negative: 'Negative',
      neutral: 'Neutral',
      unhandled: 'Unhandled',
      inProgress: 'In Progress',
      resolved: 'Resolved',
      dismissed: 'Dismissed'
    },

    // Sentiment
    sentiment: {
      positive: 'Positive',
      negative: 'Negative',
      neutral: 'Neutral'
    },

    // UI Elements
    ui: {
      statusChange: 'Status Change',
      detailManagement: 'Detail Management',
      save: 'Save',
      dueDate: 'Due Date',
      assignee: 'Assignee',
      assigneeShort: 'Assigned',
      dateUnknown: 'Date Unknown',
      topic: 'Topic',
      helpText: 'Manage overall topic status. Track individual opinions with action management.',
      activeActionsTitle: 'Active Actions',
      activeActionsMessage: 'This topic is resolved but {count} action managements are in progress',
      assignedActionsNote: '(Assigned: {count} items)',
      progressTrackingNote: 'Detailed progress can be tracked through individual action management'
    },

    // Priority Management
    priorityManagement: {
      noPriority: 'Priority changed to "Not Set"',
      highPriority: 'High Priority',
      mediumPriority: 'Medium Priority',
      lowPriority: 'Low Priority',
      priorityUpdated: 'Topic priority changed to "{priority}"',
      priorityUpdateFailed: 'Failed to update priority'
    },

    // Resolution Management
    resolution: {
      reason: 'Resolution Reason',
      dismissalReason: 'Dismissal Reason',
      reasonPlaceholder: 'Record solution method or rationale...',
      dismissalPlaceholder: 'Record dismissal reason...',
      reasonSaved: 'Resolution reason saved',
      dismissalSaved: 'Dismissal reason saved',
      resolutionManagement: 'Resolution Management',
      dismissalManagement: 'Dismissal Management'
    },

    // Debug Information
    debug: {
      topicId: 'Topic ID',
      availableFirebaseTopics: 'Available Firebase Topics',
      projectAnalysisData: 'Project Analysis Data',
      firebaseTopics: 'Firebase Topics',
      count: 'items'
    },

    // Status Suggestions
    statusSuggestions: {
      resolutionReasonHigh: 'Almost all related important opinions have been resolved. Would you like to mark this topic as "Resolved"?',
      resolutionReasonMedium: 'Most related important opinions have been resolved. Please consider resolving this topic.',
      dismissalReason: 'This topic has been unhandled for a long time. Consider dismissing it.'
    },
    
    // Error messages
    errors: {
      loadingTopic: 'An error occurred while loading the topic',
      loadingOpinions: 'An error occurred while loading opinions',
      updatingStatus: 'An error occurred while updating status',
      updatingPriority: 'An error occurred while updating priority',
      bookmarking: 'An error occurred while updating bookmark',
      exportingData: 'An error occurred while exporting data',
      unauthorized: 'You do not have permission to access this topic',
      notFound: 'Topic not found'
    },
    
    // Success messages
    success: {
      statusUpdated: 'Status updated successfully',
      priorityUpdated: 'Priority updated successfully',
      bookmarkAdded: 'Added to bookmarks',
      bookmarkRemoved: 'Removed from bookmarks',
      actionCreated: 'Action created successfully',
      actionUpdated: 'Action updated successfully',
      actionDeleted: 'Action deleted successfully',
      dataExported: 'Data exported successfully',
      assignmentUpdated: 'Assignment updated successfully',
      dueDateUpdated: 'Due date updated successfully'
    },
    
    // Confirmation dialogs
    confirm: {
      deleteAction: 'Delete this action?',
      updateStatus: 'Update status?',
      bulkUpdate: 'Update {count} items?',
      dismissTopic: 'Dismiss this topic?',
      markComplete: 'Mark this topic as complete?'
    },
    
    // Loading states
    loading: {
      topic: 'Loading topic...',
      opinions: 'Loading opinions...',
      updating: 'Updating...',
      exporting: 'Exporting...',
      saving: 'Saving...'
    }
  }
};