export const processingTranslations = {
  ja: {
    title: 'AI分析中',
    analyzing: '収集した意見を分析中...',
    description: 'AIが意見を要約し、コスト試算を行っています。{processingTime}秒ほどお待ちください。',
    
    // ページ離脱防止
    beforeUnloadMessage: 'AI分析が進行中です。ページを離れると分析が中断される可能性があります。',
    
    // プロジェクト未発見
    projectNotFound: 'プロジェクトが見つかりません',
    backToDashboard: 'ダッシュボードに戻る',
    
    // ステップ（既存を活用・拡張）
    steps: {
      collectData: '意見データを収集',
      collectDescription: '収集された意見を整理しています',
      aiAnalysis: 'AI分析を実行中', 
      aiDescription: 'AIが意見を分析・分類しています（数十秒お待ちください）',
      // 既存のsteps
      collecting: '意見データを収集',
      analyzing: 'AI要約を実行',
      estimating: 'コスト・期間を試算',
      generating: '実行プランを生成'
    },
    
    // メインタイトル
    mainTitle: 'AI分析中',
    collectingOpinions: '収集した意見を分析中...',
    analysisDescription: 'AIが意見を要約し、トピックに分類しています。処理には{processingTime}秒ほどかかります。',
    
    // 進捗
    progress: '進捗状況',
    
    // 接続エラー
    connectionError: {
      title: '接続の問題が発生しています',
      description: 'AI分析は継続中ですが、進捗の確認に問題があります。\n分析は通常{processingTime}秒で完了します。しばらくお待ちください。',
      retry: '再試行'
    },
    
    // 完了
    complete: '分析完了！結果画面に移動します...'
  },
  
  en: {
    title: 'AI Analysis in Progress',
    analyzing: 'Analyzing collected opinions...',
    description: 'AI is summarizing opinions and calculating cost estimates. Please wait about {processingTime} seconds.',
    
    // Before unload
    beforeUnloadMessage: 'AI analysis is in progress. Leaving this page may interrupt the analysis.',
    
    // Project not found
    projectNotFound: 'Project not found',
    backToDashboard: 'Back to Dashboard',
    
    // Steps (existing maintained/expanded)
    steps: {
      collectData: 'Collecting Opinion Data',
      collectDescription: 'Organizing collected opinions',
      aiAnalysis: 'Running AI Analysis',
      aiDescription: 'AI is analyzing and categorizing opinions (please wait a few moments)',
      // Existing steps
      collecting: 'Collecting opinion data',
      analyzing: 'Running AI summary',
      estimating: 'Calculating cost & timeline',
      generating: 'Generating execution plans'
    },
    
    // Main title
    mainTitle: 'AI Analysis in Progress',
    collectingOpinions: 'Analyzing collected opinions...',
    analysisDescription: 'AI is summarizing opinions and categorizing them into topics. Processing takes {processingTime} seconds.',
    
    // Progress
    progress: 'Progress',
    
    // Connection error
    connectionError: {
      title: 'Connection Issues Detected',
      description: 'AI analysis continues but there are issues checking progress.\nAnalysis typically completes in {processingTime} seconds. Please wait.',
      retry: 'Retry'
    },
    
    // Complete
    complete: 'Analysis Complete! Redirecting to results...'
  }
};