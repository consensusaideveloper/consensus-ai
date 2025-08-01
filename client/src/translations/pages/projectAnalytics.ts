export const projectAnalyticsTranslations = {
  ja: {
    // ナビゲーション
    backToProject: 'プロジェクトに戻る',
    
    // メインタイトル
    title: 'プロジェクト分析',
    loadingData: '分析データを読み込んでいます...',
    
    // エクスポート
    exportCsv: '分析結果をCSVでダウンロード',
    exportCsvShort: 'CSV出力',

    // モバイルアクション
    mobileActions: {
      exportCsv: '分析結果をCSVダウンロード'
    },
    
    // プロジェクト概要
    overview: {
      title: 'プロジェクト概要',
      opinionsCount: '集まった意見の数',
      opinionsDescription: '参加者から寄せられた意見の総数',
      topicsCount: '議論テーマの数',
      topicsDescription: '意見から抽出された主要テーマ',
      averageResponses: 'テーマあたりの意見数',
      averageResponsesDescription: '各テーマに対する平均的な意見数'
    },
    
    // 進捗状況
    progress: {
      topicResolution: 'テーマの解決状況',
      topicCompletionRate: '解決済み・見送りのテーマ率',
      resolvedDetails: '解決済み：{resolved}件、見送り：{dismissed}件',
      actionProgress: '対応アクションの進捗',
      actionCompletionRate: '完了した対応アクションの率',
      actionDetails: '完了：{completed}件 / 全体：{total}件'
    },
    
    // リスク指標
    risks: {
      title: '注意が必要な項目',
      stalledTopics: '長期停滞テーマ',
      stalledDescription: '30日以上更新されていない',
      unhandledTopics: '未対応テーマ',
      unhandledTopicsDescription: 'まだ対応が始まっていない',
      unhandledActions: '未対応アクション',
      unhandledActionsDescription: '対応が必要なアクション'
    },
    
    // チャート・分析
    charts: {
      topicStatus: {
        title: '議論テーマの対応状況',
        description: '現在どれだけのテーマが対応されているか'
      },
      priorityDistribution: {
        title: '議論テーマの優先度分布',
        description: 'どの優先度のテーマが多いか'
      }
    },
    
    // ステータス
    status: {
      unhandled: '未対応',
      inProgress: '対応中',
      resolved: '解決済み',
      dismissed: '見送り'
    },
    
    // 優先度
    priority: {
      high: '高優先度',
      medium: '中優先度',
      low: '低優先度',
      highShort: '高',
      mediumShort: '中',
      lowShort: '低'
    },
    
    // 詳細表示
    details: {
      count: '{count}件',
      percentage: '({percentage}%)',
      stagnantTopicsDetails: '長期停滞テーマの詳細',
      stagnantDescription: '30日以上更新されていないテーマ一覧（停滞期間順）',
      priorityLabel: '優先度：',
      daysStagnant: '{days}日',
      stagnantPeriod: '停滞期間',
      additionalTopics: '他 {count} 件の停滞テーマがあります'
    },
    
    // CSVエクスポート用
    csv: {
      headers: {
        item: '項目',
        value: '値',
        projectName: 'プロジェクト名',
        totalOpinions: '総意見数',
        totalTopics: '総トピック数',
        topicResolutionRate: 'トピック解決率(%)',
        actionCompletionRate: 'アクション完了率(%)',
        averageOpinionsPerTopic: 'トピック別平均意見数',
        stalledTopicsCount: '停滞トピック数',
        topicsByStatus: 'トピック状況別',
        actionsByStatus: 'アクション状況別'
      }
    }
  },
  
  en: {
    // Navigation
    backToProject: 'Back to Project',
    
    // Main title
    title: 'Project Analytics',
    loadingData: 'Loading analytics data...',
    
    // Export
    exportCsv: 'Download Analytics Report as CSV',
    exportCsvShort: 'Export CSV',

    // Mobile Actions
    mobileActions: {
      exportCsv: 'Download Analytics Report'
    },
    
    // Project overview
    overview: {
      title: 'Project Overview',
      opinionsCount: 'Total Opinions',
      opinionsDescription: 'Total number of opinions from participants',
      topicsCount: 'Discussion Topics',
      topicsDescription: 'Key themes extracted from opinions',
      averageResponses: 'Avg. Opinions per Topic',
      averageResponsesDescription: 'Average number of opinions per topic'
    },
    
    // Progress
    progress: {
      topicResolution: 'Topic Resolution Status',
      topicCompletionRate: 'Resolved/Dismissed Topics Rate',
      resolvedDetails: 'Resolved: {resolved}, Dismissed: {dismissed}',
      actionProgress: 'Action Item Progress',
      actionCompletionRate: 'Completed Action Items Rate',
      actionDetails: 'Completed: {completed} / Total: {total}'
    },
    
    // Risk indicators
    risks: {
      title: 'Items Requiring Attention',
      stalledTopics: 'Long-term Stalled Topics',
      stalledDescription: 'Not updated for 30+ days',
      unhandledTopics: 'Unhandled Topics',
      unhandledTopicsDescription: 'Not yet started',
      unhandledActions: 'Unhandled Actions',
      unhandledActionsDescription: 'Actions requiring response'
    },
    
    // Charts & analysis
    charts: {
      topicStatus: {
        title: 'Topic Response Status',
        description: 'Current status of topic responses'
      },
      priorityDistribution: {
        title: 'Topic Priority Distribution',
        description: 'Distribution of topics by priority level'
      }
    },
    
    // Status
    status: {
      unhandled: 'Unhandled',
      inProgress: 'In Progress',
      resolved: 'Resolved',
      dismissed: 'Dismissed'
    },
    
    // Priority
    priority: {
      high: 'High Priority',
      medium: 'Medium Priority',
      low: 'Low Priority',
      highShort: 'High',
      mediumShort: 'Medium',
      lowShort: 'Low'
    },
    
    // Details
    details: {
      count: '{count} items',
      percentage: '({percentage}%)',
      stagnantTopicsDetails: 'Stalled Topics Details',
      stagnantDescription: 'Topics not updated for 30+ days (sorted by stagnation period)',
      priorityLabel: 'Priority: ',
      daysStagnant: '{days} days',
      stagnantPeriod: 'Stagnant Period',
      additionalTopics: '{count} more stalled topics'
    },
    
    // CSV export
    csv: {
      headers: {
        item: 'Item',
        value: 'Value',
        projectName: 'Project Name',
        totalOpinions: 'Total Opinions',
        totalTopics: 'Total Topics',
        topicResolutionRate: 'Topic Resolution Rate (%)',
        actionCompletionRate: 'Action Completion Rate (%)',
        averageOpinionsPerTopic: 'Average Opinions per Topic',
        stalledTopicsCount: 'Stalled Topics Count',
        topicsByStatus: 'Topics by Status',
        actionsByStatus: 'Actions by Status'
      }
    }
  }
};