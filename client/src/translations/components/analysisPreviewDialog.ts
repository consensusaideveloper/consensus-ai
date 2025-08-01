export const analysisPreviewDialogTranslations = {
  ja: {
    title: '分析プレビュー',
    subtitle: '実行前の変更内容を確認',
    loading: 'プレビューを生成中...',
    noChanges: '新しい意見がないため、分析による変更はありません。',
    noTopicChanges: '全ての新規意見は既存のトピックに適切に分類されており、新しいトピックの作成は不要です。',
    noChangesTitle: '変更はありません',
    importantWarning: '完全再分析に関する重要な注意',
    fullAnalysisWarning: '完全再分析では、現在の全てのトピック構造が変更される可能性があります。解決済みや対応中などの管理状況がリセットされる場合があります。',
    executionPlan: '実行計画',
    analysisType: {
      incremental: 'インクリメンタル分析',
      full: '完全再分析',
      auto: '自動判定'
    },
    settings: {
      title: '分析設定',
      similarityThreshold: '類似度閾値',
      confidenceThreshold: '信頼度閾値'
    },
    changes: {
      title: '予想される変更',
      newOpinions: '新規意見',
      existingOpinions: '既存意見',
      newTopics: '作成されるトピック',
      updatedTopics: '更新されるトピック',
      unchangedTopics: '変更なしトピック',
      estimatedDuration: '予想実行時間'
    },
    topics: {
      title: 'トピック詳細',
      opinionsCount: '件の意見',
      newTopic: '新規',
      updated: '更新'
    },
    buttons: {
      cancel: 'キャンセル',
      execute: '分析実行',
      back: '戻る'
    },
    warnings: {
      destructive: 'この操作により既存のトピック構造が変更されます',
      irreversible: 'この操作は元に戻すことができません'
    },
    errors: {
      previewFailed: 'プレビューの生成に失敗しました',
      analysisError: '分析エラーが発生しました'
    },
    changeSummary: '変更サマリー',
    newOpinions: '新規意見',
    updatedTopics: '更新トピック',
    newTopics: '新規トピック',
    manualReview: '手動確認',
    existingTopicUpdates: '既存トピックの更新 ({{count}}件)',
    addOpinions: '+{{count}}件の意見を追加',
    andOthers: '...他 {{count}}件',
    newTopicCreation: '新規トピック作成 ({{count}}件)',
    newTopicLabel: '新規',
    opinionsCount: '{{count}}件の意見',
    confidence: '信頼度: {{percent}}%',
    manualReviewRequired: '手動確認が必要 ({{count}}件)',
    reason: '理由',
    cancel: 'キャンセル',
    executing: '分析実行中...',
    executeAnalysis: 'この内容で分析を実行'
  },
  en: {
    title: 'Analysis Preview',
    subtitle: 'Review changes before execution',
    loading: 'Generating preview...',
    noChanges: 'No changes will be made as there are no new opinions to analyze.',
    noTopicChanges: 'All new opinions are properly classified into existing topics, no new topic creation is needed.',
    noChangesTitle: 'No Changes',
    importantWarning: 'Important Notice About Full Re-analysis',
    fullAnalysisWarning: 'Full re-analysis may modify the entire current topic structure. Management status such as resolved or in-progress may be reset.',
    executionPlan: 'Execution Plan',
    analysisType: {
      incremental: 'Incremental Analysis',
      full: 'Full Re-analysis',
      auto: 'Auto Detection'
    },
    settings: {
      title: 'Analysis Settings',
      similarityThreshold: 'Similarity Threshold',
      confidenceThreshold: 'Confidence Threshold'
    },
    changes: {
      title: 'Expected Changes',
      newOpinions: 'New Opinions',
      existingOpinions: 'Existing Opinions',
      newTopics: 'Topics to Create',
      updatedTopics: 'Topics to Update',
      unchangedTopics: 'Unchanged Topics',
      estimatedDuration: 'Estimated Duration'
    },
    topics: {
      title: 'Topic Details',
      opinionsCount: 'opinions',
      newTopic: 'New',
      updated: 'Updated'
    },
    buttons: {
      cancel: 'Cancel',
      execute: 'Execute Analysis',
      back: 'Back'
    },
    warnings: {
      destructive: 'This operation will modify the existing topic structure',
      irreversible: 'This operation cannot be undone'
    },
    errors: {
      previewFailed: 'Failed to generate preview',
      analysisError: 'Analysis error occurred'
    },
    changeSummary: 'Change Summary',
    newOpinions: 'New Opinions',
    updatedTopics: 'Updated Topics',
    newTopics: 'New Topics',
    manualReview: 'Manual Review',
    existingTopicUpdates: 'Existing Topic Updates ({{count}} items)',
    addOpinions: '+{{count}} opinions to add',
    andOthers: '...{{count}} others',
    newTopicCreation: 'New Topic Creation ({{count}} items)',
    newTopicLabel: 'New',
    opinionsCount: '{{count}} opinions',
    confidence: 'Confidence: {{percent}}%',
    manualReviewRequired: 'Manual Review Required ({{count}} items)',
    reason: 'Reason',
    cancel: 'Cancel',
    executing: 'Executing analysis...',
    executeAnalysis: 'Execute analysis with this content'
  }
};