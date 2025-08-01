export const projectOpinionsTranslations = {
  ja: {
    // ページタイトル
    title: '意見一覧',
    
    // ヘッダーアクション
    actions: {
      exportCsv: 'CSVエクスポート',
      exportCsvShort: 'CSV'
    },

    // モバイルアクション
    mobileActions: {
      exportCsv: 'CSVエクスポート'
    },
    
    // 統計情報
    stats: {
      totalOpinions: '総意見数',
      bookmarked: 'ブックマーク',
      analyzed: '分析済み',
      unanalyzed: '未分析',
      agreeStance: '賛成',
      disagreeStance: '反対',
      neutralStance: '中立',
      conditionalStance: '条件付き'
    },
    
    // フィルター・検索
    filters: {
      search: '検索',
      searchPlaceholder: '意見内容を検索...',
      all: 'すべて',
      bookmarked: 'ブックマーク',
      unbookmarked: 'ブックマークなし',
      sentiment: 'センチメント',
      positive: '賛成',
      negative: '反対',
      neutral: '中立',
      actionStatus: 'アクションステータス',
      unhandled: '未対応',
      inProgress: '対応中',
      resolved: '解決済み',
      dismissed: '見送り',
      clearFilters: 'フィルターをクリア'
    },
    
    // ソート
    sort: {
      title: '並び替え',
      newest: '新しい順',
      oldest: '古い順',
      reactions: 'リアクション順',
      status: 'ステータス順'
    },
    
    // 意見カード
    opinion: {
      characters: '文字',
      submittedAt: '投稿日時',
      bookmark: 'ブックマーク',
      unbookmark: 'ブックマーク解除',
      viewDetails: '詳細表示',
      readMore: '続きを読む',
      actionManagement: 'アクション管理',
      priority: '優先度',
      assignee: '担当者',
      dueDate: '期限',
      lastUpdated: '最終更新'
    },
    
    // センチメント
    sentiment: {
      positive: '賛成',
      negative: '反対',
      neutral: '中立'
    },
    
    // スタンス
    stance: {
      agree: '賛成',
      disagree: '反対',
      neutral: '中立',
      conditional: '条件付き'
    },
    
    // アクションステータス
    actionStatus: {
      unhandled: '未対応',
      inProgress: '対応中',
      resolved: '解決済み',
      dismissed: '見送り',
      unknown: '不明'
    },
    
    // 優先度
    priority: {
      high: '高',
      medium: '中',
      low: '低',
      none: '-'
    },
    
    // モーダル・詳細表示
    modal: {
      opinionDetails: '意見詳細',
      close: '閉じる',
      content: '内容',
      metadata: 'メタデータ',
      actions: 'アクション'
    },
    
    // 状態メッセージ
    messages: {
      loading: '読み込み中...',
      awaitingAnalysis: '未分析',
      loadingData: '意見データを読み込み中...',
      noOpinions: '意見がありません',
      noFilteredOpinions: 'フィルター条件に一致する意見がありません',
      bookmarkAdded: 'ブックマークに追加しました',
      bookmarkRemoved: 'ブックマークを解除しました',
      exportStarted: 'CSVエクスポートを開始しました',
      error: 'エラーが発生しました',
      errorOccurred: 'エラーが発生しました',
      reload: '再読み込み',
      resultsFound: '件の意見が見つかりました',
      bookmarked: 'ブックマーク済み',
      assignee: '担当',
      assigneeShort: '担当',
      projectNotFound: 'プロジェクトが見つかりません',
      backToDashboard: 'ダッシュボードに戻る',
      bookmarkUpdateFailed: 'ブックマークの更新に失敗しました'
    },
    
    // CSV関連
    csv: {
      filename: '意見一覧',
      headers: {
        id: 'ID',
        content: '内容',
        submittedAt: '投稿日時',
        sentiment: 'センチメント',
        isBookmarked: 'ブックマーク',
        characterCount: '文字数',
        topicId: 'トピックID',
        actionStatus: 'アクションステータス',
        priority: '優先度',
        assignee: '担当者',
        dueDate: '期限'
      },
      values: {
        yes: 'はい',
        no: 'いいえ'
      }
    }
  },
  
  en: {
    // Page title
    title: 'Opinion List',
    
    // Header actions
    actions: {
      exportCsv: 'Export CSV',
      exportCsvShort: 'CSV'
    },

    // Mobile Actions
    mobileActions: {
      exportCsv: 'Export CSV'
    },
    
    // Statistics
    stats: {
      totalOpinions: 'Total Opinions',
      bookmarked: 'Bookmarked',
      analyzed: 'Analyzed',
      unanalyzed: 'Unanalyzed',
      agreeStance: 'Agree',
      disagreeStance: 'Disagree',
      neutralStance: 'Neutral',
      conditionalStance: 'Conditional'
    },
    
    // Filters & search
    filters: {
      search: 'Search',
      searchPlaceholder: 'Search opinion content...',
      all: 'All',
      bookmarked: 'Bookmarked',
      unbookmarked: 'Not Bookmarked',
      sentiment: 'Sentiment',
      positive: 'Positive',
      negative: 'Negative',
      neutral: 'Neutral',
      actionStatus: 'Action Status',
      unhandled: 'Unhandled',
      inProgress: 'In Progress',
      resolved: 'Resolved',
      dismissed: 'Dismissed',
      clearFilters: 'Clear Filters'
    },
    
    // Sort
    sort: {
      title: 'Sort',
      newest: 'Newest',
      oldest: 'Oldest',
      reactions: 'By Reactions',
      status: 'By Status'
    },
    
    // Opinion card
    opinion: {
      characters: 'characters',
      submittedAt: 'Submitted',
      bookmark: 'Bookmark',
      unbookmark: 'Remove Bookmark',
      viewDetails: 'View Details',
      readMore: 'Read More',
      actionManagement: 'Manage Action',
      priority: 'Priority',
      assignee: 'Assignee',
      dueDate: 'Due Date',
      lastUpdated: 'Last Updated'
    },
    
    // Sentiment
    sentiment: {
      positive: 'Positive',
      negative: 'Negative',
      neutral: 'Neutral'
    },
    
    // Stance
    stance: {
      agree: 'Agree',
      disagree: 'Disagree',
      neutral: 'Neutral',
      conditional: 'Conditional'
    },
    
    // Action status
    actionStatus: {
      unhandled: 'Unhandled',
      inProgress: 'In Progress',
      resolved: 'Resolved',
      dismissed: 'Dismissed',
      unknown: 'Unknown'
    },
    
    // Priority
    priority: {
      high: 'High',
      medium: 'Medium',
      low: 'Low',
      none: '-'
    },
    
    // Modal & details
    modal: {
      opinionDetails: 'Opinion Details',
      close: 'Close',
      content: 'Content',
      metadata: 'Metadata',
      actions: 'Actions'
    },
    
    // Status messages
    messages: {
      loading: 'Loading...',
      awaitingAnalysis: 'Unanalyzed',
      loadingData: 'Loading opinion data...',
      noOpinions: 'No opinions found',
      noFilteredOpinions: 'No opinions match the filter criteria',
      bookmarkAdded: 'Added to bookmarks',
      bookmarkRemoved: 'Removed from bookmarks',
      exportStarted: 'CSV export started',
      error: 'An error occurred',
      errorOccurred: 'An error occurred',
      reload: 'Reload',
      resultsFound: 'opinions found',
      bookmarked: 'Bookmarked',
      assignee: 'Assignee',
      assigneeShort: 'Assigned',
      projectNotFound: 'Project not found',
      backToDashboard: 'Back to Dashboard',
      bookmarkUpdateFailed: 'Failed to update bookmark'
    },
    
    // CSV related
    csv: {
      filename: 'opinion-list',
      headers: {
        id: 'ID',
        content: 'Content',
        submittedAt: 'Submitted At',
        sentiment: 'Sentiment',
        isBookmarked: 'Bookmarked',
        characterCount: 'Character Count',
        topicId: 'Topic ID',
        actionStatus: 'Action Status',
        priority: 'Priority',
        assignee: 'Assignee',
        dueDate: 'Due Date'
      },
      values: {
        yes: 'Yes',
        no: 'No'
      }
    }
  }
};