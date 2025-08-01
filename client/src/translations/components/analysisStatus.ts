export const analysisStatusTranslations = {
  ja: {
    // 分析状況バッジ
    badge: {
      analyzed: '分析済み',
      unanalyzed: '未分析',
      pending: '分析待ち',
      requiresReview: '要確認',
      lowConfidence: '低信頼度'
    },
    
    // 分析状況サマリー
    summary: {
      title: '分析状況',
      description: 'AI分析の進捗状況',
      lastAnalysisLabel: '最終分析',
      totalOpinions: '総意見数',
      analyzedOpinions: '分析済み',
      pendingOpinions: '未分析',
      analysisProgress: '分析進捗',
      
      // 時間表示
      timeFormats: {
        withinHour: '1時間以内',
        hoursAgo: '時間前',
        yesterday: '昨日',
        notExecuted: '未実行'
      },
      
      // 状態メッセージ
      states: {
        loading: '分析状況を読み込み中...',
        error: '分析状況を取得できませんでした',
        pendingOpinions: '未分析の意見があります',
        nextBatch: '次回分析予定: 最大{count}件',
        allAnalyzed: 'すべての意見が分析済みです',
        autoAnalysis: '新しい意見が追加されると、自動的に分析対象になります',
        noOpinions: '意見が集まり次第、AI分析を実行できます'
      }
    },
    
    // フィルター
    filter: {
      title: '分析状況',
      all: 'すべて',
      analyzed: '分析済み',
      unanalyzed: '未分析'
    },
    
    // ツールチップ
    tooltip: {
      analysisDateTime: '分析日時:',
      version: 'バージョン:',
      confidence: '信頼度:',
      manualReview: '手動レビュー推奨'
    }
  },
  
  en: {
    // Analysis Status Badge
    badge: {
      analyzed: 'Analyzed',
      unanalyzed: 'Unanalyzed',
      pending: 'Pending',
      requiresReview: 'Requires Review',
      lowConfidence: 'Low Confidence'
    },
    
    // Analysis Status Summary
    summary: {
      title: 'Analysis Status',
      description: 'AI Analysis Progress',
      lastAnalysisLabel: 'Last Analysis',
      totalOpinions: 'Total Opinions',
      analyzedOpinions: 'Analyzed',
      pendingOpinions: 'Pending',
      analysisProgress: 'Analysis Progress',
      
      // Time formats
      timeFormats: {
        withinHour: 'Within 1 hour',
        hoursAgo: 'hours ago',
        yesterday: 'Yesterday',
        notExecuted: 'Not executed'
      },
      
      // State messages
      states: {
        loading: 'Loading analysis status...',
        error: 'Could not retrieve analysis status',
        pendingOpinions: 'Unanalyzed opinions available',
        nextBatch: 'Next analysis scheduled: Up to {count} items',
        allAnalyzed: 'All opinions have been analyzed',
        autoAnalysis: 'New opinions will automatically be added to the analysis queue',
        noOpinions: 'AI analysis can be performed once opinions are collected'
      }
    },
    
    // Filter
    filter: {
      title: 'Analysis Status',
      all: 'All',
      analyzed: 'Analyzed',
      unanalyzed: 'Unanalyzed'
    },
    
    // Tooltip
    tooltip: {
      analysisDateTime: 'Analysis Date/Time:',
      version: 'Version:',
      confidence: 'Confidence:',
      manualReview: 'Manual review recommended'
    }
  }
};