export const projectDetailTranslations = {
  ja: {
    // ナビゲーション
    backToDashboard: 'ダッシュボードに戻る',
    projectNotFound: 'プロジェクトが見つかりませんでした。削除されたか、アクセス権限がない可能性があります。',
    
    // プロジェクト情報
    project: {
      status: 'ステータス',
      opinions: '件の意見',
      topics: 'トピック',
      actions: 'アクション',
      created: '作成日',
      lastAnalysis: '最終分析',
      never: 'なし',
      priority: '優先度',
      description: '説明'
    },
    
    // ステータス管理
    status: {
      collecting: '意見収集中',
      paused: '一時停止中',
      readyForAnalysis: '分析準備完了',
      processing: 'AI分析中',
      completed: '分析完了',
      archived: 'アーカイブ済み',
      error: 'エラー',
      changeStatus: 'ステータス変更',
      confirmChange: 'ステータスを変更しますか？',
      cancel: 'キャンセル',
      change: '変更'
    },

    // セクション
    sections: {
      aiAnalysisAndTopics: 'AI分析 & トピック管理',
      opinionCollection: '意見収集管理'
    },

    // 統計
    stats: {
      opinionsCollected: '収集意見数',
      totalOpinions: '総意見数',
      analysisTopics: '分析トピック数',
      totalTopics: '総トピック',
      resolved: '解決済み'
    },

    // 未分析状態
    noAnalysis: {
      title: 'AI分析がまだ実行されていません',
      description: 'プロジェクトに意見が集まったら、AI分析を開始してトピックを自動生成できます。'
    },

    // ボタン
    buttons: {
      showAllOpinions: '全意見を表示',
      manageActions: 'アクション管理',
      completeProject: 'プロジェクトを完了にする',
      reactivate: 'アクティブに戻す',
      archive: 'アーカイブする',
      delete: '削除する',
      startAnalysis: 'AI分析開始',
      analysisRunning: 'AI分析実行中...', 
      openForm: 'フォームを開く',
      startCollection: '収集開始',
      pause: '一時停止',
      showQrCode: '二次元コード表示',
      editProject: 'プロジェクト編集'
    },

    // ラベル
    labels: {
      createdDate: '作成日',
      status: 'ステータス',
      priority: '優先度',
      opinionsUnit: '件の意見'
    },

    // メッセージ
    messages: {
      opinionsCollectedInfo: 'このプロジェクトには',
      opinionsUnit: '件の意見が収集されています。',
      projectNotFound: 'プロジェクトが見つかりませんでした。削除されたか、アクセス権限がない可能性があります。'
    },

    // 進捗
    progress: {
      resolvedTopics: '解決済みトピック'
    },

    // 通知メッセージ
    notifications: {
      urlCopied: 'URLをコピーしました',
      qrUrlCopied: '二次元コードURLをコピーしました',
      statusChangedPrefix: 'ステータスを「',
      statusChangedSuffix: '」に変更しました',
      statusChangeFailed: 'ステータスの変更に失敗しました',
      analysisAlreadyRunning: 'すでに分析が進行中です。処理画面で状況を確認してください。',
      analysisStarted: 'AI分析を開始しました。バックグラウンドで処理中です。',
      analysisStartFailed: '分析の開始に失敗しました',
      analysisCompleted: 'AI分析が完了しました！結果を確認できます。',
      analysisCanceled: '分析をキャンセルしました',
      priorityChangedPrefix: 'プロジェクト優先度を「',
      priorityChangedSuffix: '」に変更しました',
      priorityUnset: '優先度を「設定しない」に変更しました',
      priorityChangeFailed: '優先度の変更に失敗しました',
      projectCompleted: 'プロジェクトを完了しました',
      projectCompletionFailed: 'プロジェクトの完了に失敗しました',
      projectReactivated: 'プロジェクトをアクティブに戻しました',
      projectReactivationFailed: 'プロジェクトの再アクティブ化に失敗しました',
      projectArchived: '意見が収集されているプロジェクトをアーカイブしました',
      projectDeleted: 'プロジェクトを削除しました',
      projectDeletionFailed: 'プロジェクトの削除/アーカイブに失敗しました',
      bulkUploadSuccess: '件の意見を正常に投稿しました（SQLite + Firebase）',
      bulkUploadPartialSuccess: '件の意見を投稿しました（一部失敗）',
      bulkUploadFailed: '意見の投稿に失敗しました',
      noQuotedOpinions: '「」で囲まれた意見が見つかりません',
      bulkUploadError: '一括投稿中にエラーが発生しました',
      reanalysisStartFailed: '再分析の開始に失敗しました',
      aiAnalysisFailed: 'AI分析に失敗しました',
      networkError: 'インターネット接続を確認し、しばらく時間をおいて再試行してください',
      projectCompleted2: 'プロジェクトが完了しました',
      projectCompletionProcessFailed: 'プロジェクト完了処理に失敗しました',
      serverError: 'サーバーエラーが発生しました',
      retryLater: '時間をおいて再試行してください',
      networkConnectionError: 'ネットワークエラーまたはサーバーに接続できません',
      retryAfterSomeTime: 'しばらく時間をおいて再試行してください',
      unknownError: '不明なエラー',
      projectInfoUpdated: 'プロジェクト情報を更新しました',
      projectInfoUpdateFailed: 'プロジェクト情報の更新に失敗しました',
      backgroundAnalysisComplete: 'バックグラウンドで実行していたAI分析が完了しました！',
      analysisStartedInBackground: 'AI分析をバックグラウンドで開始しました。完了時に通知します。',
      analysisSkippedNoNewOpinions: '前回の分析以降、新しい意見が追加されていないため、分析をスキップしました。（現在の意見数: {count}件）',
      bulkUploadSummarySuccess: '{count}件の意見を追加しました',
      bulkUploadSummaryPartial: '{successCount}/{totalCount}件の意見を追加しました',
      bulkUploadSummaryFailed: '意見の追加に失敗しました',
      analysisLanguageUpdated: '分析言語設定を更新しました'
    },

    // モーダル
    modals: {
      analysisError: {
        title: 'AI分析エラー',
        solutionLabel: '対処法',
        timestampLabel: '発生時刻',
        retrying: '再試行中...', 
        retryButton: '再試行'
      },
      qrCode: {
        title: '二次元コード',
        instruction: 'この二次元コードをスキャンして意見フォームにアクセス',
        altText: '二次元コード'
      }
    },

    // 分析モーダル
    analysisModal: {
      title: 'AI分析を開始しますか？',
      description: '収集した意見を分析・分類します。処理にはしばらく時間がかかりますが、バックグラウンドで実行されるため他の操作を続けることができます。',
      start: '開始する',
      processingInBackground: 'バックグラウンドで処理中...', 
      details: '詳細'
    },

    // 分析言語設定
    analysisLanguage: {
      title: '分析結果の言語設定',
      currentSetting: '現在の設定',
      japanese: '日本語',
      english: '英語',
      usingUserLanguage: 'ユーザー言語設定より',
      changeConfirm: {
        title: '分析言語を変更しますか？',
        message: '今後のAI分析結果が{language}で出力されます。',
        change: '変更',
        cancel: 'キャンセル'
      }
    },

    // トピックステータス
    topicStatus: {
      unhandled: '未対応',
      inProgress: '対応中',
      resolved: '解決済み',
      dismissed: '見送り'
    },
    
    // アクションボタン
    actions: {
      startAnalysis: '分析開始',
      retryAnalysis: '分析再実行',
      downloadResults: '結果ダウンロード',
      viewAnalysis: '分析結果を見る',
      showAnalysisHistory: '分析履歴を表示',
      topicManagement: 'トピック管理',
      pause: '一時停止',
      resume: '再開',
      restart: '再開始',
      complete: '完了',
      archive: 'アーカイブ',
      delete: '削除',
      edit: '編集',
      settings: '設定',
      viewResults: '結果を見る'
    },
    
    // フォーム共有
    sharing: {
      title: 'フォーム共有',
      url: 'フォームURL',
      qrCode: '二次元コード',
      copy: 'コピー',
      copied: 'コピー完了！',
      openForm: 'フォームを開く',
      embedCode: '埋め込みコード',
      instructions: '以下のURLを共有して意見を収集してください：'
    },
    
    // 分析結果
    analysis: {
      title: '分析結果',
      noAnalysis: 'まだ分析が実行されていません',
      startAnalysisPrompt: '分析を開始して、収集した意見からトピックを抽出しましょう。',
      processing: '分析処理中...', 
      error: '分析中にエラーが発生しました',
      retry: '再試行',
      topics: 'トピック',
      insights: 'インサイト',
      summary: '要約'
    },

    // ヘッダーのツールチップ
    header: {
      analyticsDashboard: '分析ダッシュボード',
      archiveProject: 'プロジェクトをアーカイブ',
      deleteProject: 'プロジェクトを削除',
      bulkUpload: 'テスト用一括投稿（開発者機能）'
    },

    // モバイルアクション
    mobileActions: {
      bulkUpload: 'テスト用一括投稿',
      analyticsDashboard: '分析ダッシュボード',
      archiveProject: 'アーカイブ',
      deleteProject: '削除'
    },

    // UI要素
    ui: {
      copied: 'コピー済み',
      copyQrUrl: '二次元コードURLをコピー',
      archiving: 'アーカイブ中...', 
      deleting: '削除中...', 
      close: '閉じる',
      prioritySettingsTitle: 'プロジェクト優先度設定',
      prioritySettingsSubtitle: 'プロジェクト:',
      priorityReason: '優先度設定理由',
      lastAnalysisExecution: '最終分析実行:',
      projectCompletionConfirm: 'プロジェクト完了確認',
      archiveCount: 'アーカイブ',
      analysisSummary: '分析サマリー',
      statusChangeNote: '※ ステータスはトピック詳細画面で変更できます',
      analysisRunningIndicator: '分析中インジケーター',
      active: 'アクティブ',
      collectedOpinionsCount: '収集済み意見数',
      copyUrl: 'URLをコピー',
      prioritySet: '優先度設定済み',
      uploading: '投稿中...', 
      opinions: '件',
      activeCount: 'アクティブ',
      archiveCountFull: 'アーカイブ',
      syncing: '(同期中)',
      developerFeature: '開発者向け機能',
      useCarefullyInProduction: '本番環境では慎重に使用してください。',
      error: 'エラー:',
      moreErrors: '...他',
      moreErrorsUnit: '件のエラー'
    },

    // インサイト
    insights: {
      title: '重要なインサイト',
      highImportance: '高重要度',
      mediumImportance: '中重要度',
      lowImportance: '低重要度'
    },
    
    // AI分析結果セクション
    aiAnalysisTopics: {
      title: 'AI分析トピック'
    },
    
    // トピック一覧
    topics: {
      title: 'トピック一覧',
      noTopics: 'トピックはまだありません',
      opinions: '件の意見',
      viewDetails: '詳細を見る',
      status: 'ステータス',
      priority: '優先度',
      assignedTo: '担当者',
      dueDate: '期限',
      progress: '進捗',
      lastUpdated: '最終更新'
    },
    
    // 意見一覧
    opinions: {
      title: '意見一覧',
      noOpinions: '意見はまだありません',
      totalOpinions: '総意見数',
      latestOpinion: '最新意見',
      viewAll: 'すべて表示',
      export: 'エクスポート',
      filter: 'フィルター',
      search: '検索'
    },
    
    // プロジェクト完了
    completion: {
      title: 'プロジェクト完了',
      confirmMessage: 'このプロジェクトを完了としてマークしますか？',
      successMessage: 'プロジェクトが正常に完了しました',
      summaryPrompt: '完了サマリーを入力してください（任意）',
      outcomes: '成果',
      lessons: '学んだこと',
      nextSteps: '次のステップ'
    },
    
    // エラーメッセージ
    errors: {
      loadingProject: 'プロジェクトの読み込み中にエラーが発生しました',
      updatingStatus: 'ステータスの更新中にエラーが発生しました',
      startingAnalysis: '分析の開始中にエラーが発生しました',
      deletingProject: 'プロジェクトの削除中にエラーが発生しました',
      copyingUrl: 'URLのコピー中にエラーが発生しました',
      unauthorized: 'このプロジェクトにアクセスする権限がありません',
      opinionCountFetch: '意見数取得エラー:',
      analysisFailed: '分析に失敗しました',
      analysisError: '分析エラー:',
      previewFailed: 'プレビューに失敗しました',
      previewError: 'プレビューエラー:',
      analysisExecutionError: '分析実行エラー:',
      analysisLanguageUpdateFailed: '分析言語設定の更新に失敗しました'
    },

    // 通知メッセージ（追加）
    notifications2: {
      manualReviewRequired: '一部の意見は手動確認が必要です',
      analysisInProgress: '分析が実行中です',
      noNewOpinionsSkipped: '新しい意見がないため、分析をスキップしました'
    },

    // 空状態メッセージ
    emptyStates: {
      noActiveTopics: 'アクティブなトピックがありません',
      allTopicsResolvedOrDismissed: 'すべてのトピックが解決済みまたは見送りになっています。',
      noArchivedTopics: 'アーカイブされたトピックがありません',
      noResolvedOrDismissedTopics: '解決済みまたは見送りのトピックがありません。'
    },

    // AI分析関連
    aiAnalysis: {
      executeAnalysis: 'AI分析を実行',
      minimumOpinionsRequired: 'AI分析には最低5件の意見が必要です',
      current: '未分析意見',
      opinionsUnit: '件',
      minimumRequired: '最低5件必要',
      running: 'AI分析実行中',
      processingInBackground: 'バックグラウンドで処理中です'
    },

    // 削除モーダル
    deleteModal: {
      archiveTitle: 'プロジェクトのアーカイブ',
      deleteTitle: 'プロジェクトの削除',
      archiveDescription: '意見を保護するため、アーカイブします。アーカイブされたプロジェクトは後で復元できます。',
      deleteConfirmation: 'このプロジェクトを削除してもよろしいですか？この操作は取り消せません。'
    },

    // 完了モーダル
    completeModal: {
      title: 'プロジェクトを完了しますか？',
      description: 'プロジェクトを完了すると、ダッシュボードのアーカイブに移動します。',
      canReactivate: '必要に応じて後からアクティブに戻すことができます。',
      complete: '完了する'
    },
    
    // 一括投稿関連
    bulkUpload: {
      title: 'テスト用一括投稿（開発者機能）',
      description: 'この機能はテスト用です。「」で囲まれた意見を優先抽出、なければ改行区切りで抽出し一括投稿します。',
      description2: 'データはSQLite（バックエンドAPI）とFirebaseの両方に保存されます。',
      testDataLabel: 'テストデータ（「」囲み意見優先、改行区切りでも可）',
      extractionNote: '「」で囲まれた意見を優先抽出、なければ改行区切りで抽出します。',
      extractedCount: '抽出される意見数:',
      extractedCountUnit: '件',
      previewTitle: '抽出される意見プレビュー',
      moreItems: '...他',
      moreItemsUnit: '件',
      resultsTitle: '投稿結果',
      successCount: '成功:',
      successCountSeparator: '/',
      successCountUnit: '件',
      bulkUploadButton: '一括投稿',
      bulkUploadButtonWithCount: '一括投稿 (',
      bulkUploadButtonUnit: '件)',
      placeholder: '例（「」で囲まれた意見を優先抽出、なければ改行区切りで抽出）：\n\n【「」で囲む場合】\n1. 田中太郎（30歳、会社員）「この町のごみ分別が複雑すぎて困っています。もっとシンプルにしてほしい。」\n2. 佐藤花子（25歳、学生）「公共交通が不便で移動が大変です。」\n\n【改行区切りの場合】\n1. 役所の手続きが複雑で時間がかかりすぎる\n2. 子育て支援がもっと充実してほしい\n3. 公園の遊具が古くて危険\n'
    },
    
    // ナビゲーション
    navigation: {
      breadcrumbLabel: 'パンくず'
    },
    
    // 確認ダイアログ
    confirm: {
      deleteProject: 'このプロジェクトを削除しますか？この操作は取り消せません。',
      archiveProject: 'このプロジェクトをアーカイブしますか？',
      pauseProject: 'このプロジェクトを一時停止しますか？',
      restartAnalysis: '分析を再開始しますか？既存の結果は削除されます。'
    },
    
    // 読み込み状態
    loading: {
      project: 'プロジェクトを読み込み中...', 
      retrying: 'リトライ中... ({count}/3)',
      analysis: '分析を実行中...', 
      updating: '更新中...', 
      deleting: '削除中...'
    },

    // 追加のUI要素
    expandCollapse: {
      readMore: '続きを読む',
      collapse: '折りたたむ'
    },

    // 優先度レベル
    priorityLevels: {
      high: '高',
      medium: '中',
      low: '低'
    },

    // ラベル
    fieldLabels: {
      status: 'ステータス'
    },

    // プロジェクト編集
    edit: {
      projectName: 'プロジェクト名',
      projectDescription: 'プロジェクト説明',
      projectNamePlaceholder: 'プロジェクト名を入力してください',
      projectDescriptionPlaceholder: 'プロジェクトの説明を入力してください（任意）',
      editProjectInfo: 'プロジェクト情報を編集',
      noDescription: '説明文が設定されていません'
    },
    
    // 読み取り専用モード
    readOnly: {
      banner: 'このプロジェクトはアーカイブされています（読み取り専用）',
      description: '閲覧・分析結果の確認・エクスポートが可能です。編集するには復元してください。',
      restoreProject: 'プロジェクトを復元',
      restoreConfirm: 'このプロジェクトをアクティブに復元しますか？',
      restoreSuccess: 'プロジェクトを復元しました',
      restoreFailed: 'プロジェクトの復元に失敗しました'
    }
  },
  
  en: {
    // Navigation
    backToDashboard: 'Back to Dashboard',
    projectNotFound: 'Project not found. It may have been deleted or you do not have permission to access it.',
    
    // Project information
    project: {
      status: 'Status',
      opinions: 'opinions',
      topics: 'Topics',
      actions: 'Actions',
      created: 'Created',
      lastAnalysis: 'Last Analysis',
      never: 'Never',
      priority: 'Priority',
      description: 'Description'
    },
    
    // Status management
    status: {
      collecting: 'Collecting Opinions',
      paused: 'Paused',
      readyForAnalysis: 'Ready for Analysis',
      processing: 'AI Analysis in Progress',
      completed: 'Analysis Completed',
      archived: 'Archived',
      error: 'Error',
      changeStatus: 'Change Status',
      confirmChange: 'Do you want to change the status?',
      cancel: 'Cancel',
      change: 'Change'
    },

    // Sections
    sections: {
      aiAnalysisAndTopics: 'AI Analysis & Topic Management',
      opinionCollection: 'Opinion Collection Management'
    },

    // Statistics
    stats: {
      opinionsCollected: 'Opinions Collected',
      totalOpinions: 'Total Opinions',
      analysisTopics: 'Analysis Topics',
      totalTopics: 'Total Topics',
      resolved: 'Resolved'
    },

    // No Analysis State
    noAnalysis: {
      title: 'AI Analysis has not been performed yet',
      description: 'Once opinions are collected in the project, you can start AI analysis to automatically generate topics.'
    },

    // Buttons
    buttons: {
      showAllOpinions: 'Show All Opinions',
      manageActions: 'Manage Actions',
      completeProject: 'Complete Project',
      reactivate: 'Reactivate',
      archive: 'Archive',
      delete: 'Delete',
      startAnalysis: 'Start AI Analysis',
      analysisRunning: 'AI Analysis Running...', 
      openForm: 'Open Form',
      startCollection: 'Start Collection',
      pause: 'Pause',
      showQrCode: 'Show QR Code',
      editProject: 'Edit Project'
    },

    // Labels
    labels: {
      createdDate: 'Created Date',
      status: 'Status',
      priority: 'Priority',
      opinionsUnit: ' opinions'
    },

    // Messages
    messages: {
      opinionsCollectedInfo: 'This project has collected ',
      opinionsUnit: ' opinions.',
      projectNotFound: 'Project not found. It may have been deleted or you do not have permission to access it.'
    },

    // Progress
    progress: {
      resolvedTopics: 'Resolved Topics'
    },

    // Notification Messages
    notifications: {
      urlCopied: 'URL copied',
      qrUrlCopied: 'QR code URL copied',
      statusChangedPrefix: 'Status changed to "',
      statusChangedSuffix: '"',
      statusChangeFailed: 'Failed to change status',
      analysisAlreadyRunning: 'Analysis is already in progress. Please check the processing screen.',
      analysisStarted: 'AI analysis started. Processing in background.',
      analysisStartFailed: 'Failed to start analysis',
      analysisCompleted: 'AI analysis completed! You can review the results.',
      analysisCanceled: 'Analysis canceled',
      priorityChangedPrefix: 'Project priority changed to "',
      priorityChangedSuffix: '"',
      priorityUnset: 'Priority changed to "Not Set"',
      priorityChangeFailed: 'Failed to change priority',
      projectCompleted: 'Project completed',
      projectCompletionFailed: 'Failed to complete project',
      projectReactivated: 'Project reactivated',
      projectReactivationFailed: 'Failed to reactivate project',
      projectArchived: 'Project with collected opinions has been archived',
      projectDeleted: 'Project deleted',
      projectDeletionFailed: 'Failed to delete/archive project',
      bulkUploadSuccess: ' opinions posted successfully (SQLite + Firebase)',
      bulkUploadPartialSuccess: ' opinions posted (some failed)',
      bulkUploadFailed: 'Failed to post opinions',
      noQuotedOpinions: 'No opinions found in quotes',
      bulkUploadError: 'Error occurred during bulk upload',
      reanalysisStartFailed: 'Failed to start re-analysis',
      aiAnalysisFailed: 'AI analysis failed',
      networkError: 'Please check internet connection and try again later',
      projectCompleted2: 'Project has been completed',
      projectCompletionProcessFailed: 'Failed to complete project process',
      serverError: 'Server error occurred',
      retryLater: 'Please try again later',
      networkConnectionError: 'Network error or cannot connect to server',
      retryAfterSomeTime: 'Please wait a moment and try again',
      unknownError: 'Unknown error',
      projectInfoUpdated: 'Project information updated',
      projectInfoUpdateFailed: 'Failed to update project information',
      backgroundAnalysisComplete: 'AI analysis running in the background is complete!',
      analysisStartedInBackground: 'AI analysis has started in the background. You will be notified upon completion.',
      analysisSkippedNoNewOpinions: 'Analysis was skipped because no new opinions have been added since the last analysis. (Current opinion count: {count})',
      bulkUploadSummarySuccess: 'Added {count} opinions.',
      bulkUploadSummaryPartial: 'Added {successCount}/{totalCount} opinions.',
      bulkUploadSummaryFailed: 'Failed to add opinions.',
      analysisLanguageUpdated: 'Analysis language setting updated'
    },

    // Modals
    modals: {
      analysisError: {
        title: 'AI Analysis Error',
        solutionLabel: 'Solution',
        timestampLabel: 'Occurred at',
        retrying: 'Retrying...', 
        retryButton: 'Retry'
      },
      qrCode: {
        title: 'QR Code',
        instruction: 'Scan this QR code to access the opinion form',
        altText: 'QR Code'
      }
    },

    // Analysis Modal
    analysisModal: {
      title: 'Start AI Analysis?',
      description: 'Analyze and categorize collected opinions. Processing may take some time, but runs in the background so you can continue other operations.',
      start: 'Start',
      processingInBackground: 'Processing in background...', 
      details: 'Details'
    },

    // Analysis Language Settings
    analysisLanguage: {
      title: 'Analysis Output Language',
      currentSetting: 'Current Setting',
      japanese: 'Japanese',
      english: 'English',
      usingUserLanguage: 'Using user language setting',
      changeConfirm: {
        title: 'Change Analysis Language?',
        message: 'Future AI analysis results will be output in {language}.',
        change: 'Change',
        cancel: 'Cancel'
      }
    },

    // Topic Status
    topicStatus: {
      unhandled: 'Unhandled',
      inProgress: 'In Progress',
      resolved: 'Resolved',
      dismissed: 'Dismissed'
    },
    
    // Action buttons
    actions: {
      startAnalysis: 'Start Analysis',
      retryAnalysis: 'Retry Analysis',
      downloadResults: 'Download Results',
      viewAnalysis: 'View Analysis',
      showAnalysisHistory: 'Show Analysis History',
      topicManagement: 'Topic Management',
      pause: 'Pause',
      resume: 'Resume',
      restart: 'Restart',
      complete: 'Complete',
      archive: 'Archive',
      delete: 'Delete',
      edit: 'Edit',
      settings: 'Settings',
      viewResults: 'View Results'
    },
    
    // Form sharing
    sharing: {
      title: 'Form Sharing',
      url: 'Form URL',
      qrCode: 'QR Code',
      copy: 'Copy',
      copied: 'Copied!',
      openForm: 'Open Form',
      embedCode: 'Embed Code',
      instructions: 'Share the following URL to collect opinions:'
    },
    
    // Analysis results
    analysis: {
      title: 'Analysis Results',
      noAnalysis: 'No analysis has been performed yet',
      startAnalysisPrompt: 'Start analysis to extract topics from collected opinions.',
      processing: 'Analysis in progress...', 
      error: 'An error occurred during analysis',
      retry: 'Retry',
      topics: 'Topics',
      insights: 'Insights',
      summary: 'Summary'
    },

    // Header tooltips
    header: {
      analyticsDashboard: 'Analytics Dashboard',
      archiveProject: 'Archive Project',
      deleteProject: 'Delete Project',
      bulkUpload: 'Bulk Upload for Testing (Developer Feature)'
    },

    // Mobile Actions
    mobileActions: {
      bulkUpload: 'Bulk Upload (Test)',
      analyticsDashboard: 'Analytics Dashboard',
      archiveProject: 'Archive',
      deleteProject: 'Delete'
    },

    // UI elements
    ui: {
      copied: 'Copied',
      copyQrUrl: 'Copy QR Code URL',
      archiving: 'Archiving...', 
      deleting: 'Deleting...', 
      close: 'Close',
      prioritySettingsTitle: 'Project Priority Settings',
      prioritySettingsSubtitle: 'Project:',
      priorityReason: 'Priority Setting Reason',
      lastAnalysisExecution: 'Last Analysis Execution:',
      projectCompletionConfirm: 'Project Completion Confirmation',
      archiveCount: 'Archive',
      analysisSummary: 'Analysis Summary',
      statusChangeNote: '※ Status can be changed in topic detail screen',
      analysisRunningIndicator: 'Analysis Running Indicator',
      active: 'Active',
      collectedOpinionsCount: 'Collected Opinions Count',
      copyUrl: 'Copy URL',
      prioritySet: 'Priority Set',
      uploading: 'Uploading...', 
      opinions: ' items',
      activeCount: 'Active',
      archiveCountFull: 'Archive',
      syncing: '(Syncing)',
      developerFeature: 'Developer Feature',
      useCarefullyInProduction: 'Use carefully in production environment.',
      error: 'Error:',
      moreErrors: '...and',
      moreErrorsUnit: ' more errors'
    },

    // Insights
    insights: {
      title: 'Important Insights',
      highImportance: 'High Importance',
      mediumImportance: 'Medium Importance',
      lowImportance: 'Low Importance'
    },
    
    // AI Analysis Results Section
    aiAnalysisTopics: {
      title: 'AI Analysis Topics'
    },
    
    // Topics list
    topics: {
      title: 'Topics List',
      noTopics: 'No topics yet',
      opinions: 'opinions',
      viewDetails: 'View Details',
      status: 'Status',
      priority: 'Priority',
      assignedTo: 'Assigned To',
      dueDate: 'Due Date',
      progress: 'Progress',
      lastUpdated: 'Last Updated'
    },
    
    // Opinions list
    opinions: {
      title: 'Opinions List',
      noOpinions: 'No opinions yet',
      totalOpinions: 'Total Opinions',
      latestOpinion: 'Latest Opinion',
      viewAll: 'View All',
      export: 'Export',
      filter: 'Filter',
      search: 'Search'
    },
    
    // Project completion
    completion: {
      title: 'Project Completion',
      confirmMessage: 'Mark this project as completed?',
      successMessage: 'Project completed successfully',
      summaryPrompt: 'Enter completion summary (optional)',
      outcomes: 'Outcomes',
      lessons: 'Lessons Learned',
      nextSteps: 'Next Steps'
    },
    
    // Error messages
    errors: {
      loadingProject: 'An error occurred while loading the project',
      updatingStatus: 'An error occurred while updating status',
      startingAnalysis: 'An error occurred while starting analysis',
      deletingProject: 'An error occurred while deleting the project',
      copyingUrl: 'An error occurred while copying URL',
      unauthorized: 'You do not have permission to access this project',
      opinionCountFetch: 'Opinion count fetch error:',
      analysisFailed: 'Analysis failed',
      analysisError: 'Analysis error:',
      previewFailed: 'Preview failed',
      previewError: 'Preview error:',
      analysisExecutionError: 'Analysis execution error:',
      analysisLanguageUpdateFailed: 'Failed to update analysis language setting'
    },

    // Additional Notification Messages
    notifications2: {
      manualReviewRequired: 'Some opinions require manual review',
      analysisInProgress: 'Analysis is in progress',
      noNewOpinionsSkipped: 'Analysis skipped as there are no new opinions'
    },

    // Empty state messages
    emptyStates: {
      noActiveTopics: 'No active topics',
      allTopicsResolvedOrDismissed: 'All topics have been resolved or dismissed.',
      noArchivedTopics: 'No archived topics',
      noResolvedOrDismissedTopics: 'No resolved or dismissed topics.'
    },

    // AI Analysis related
    aiAnalysis: {
      executeAnalysis: 'Execute AI Analysis',
      minimumOpinionsRequired: 'At least 5 opinions are required for AI analysis',
      current: 'Unanalyzed opinions',
      opinionsUnit: ' opinions',
      minimumRequired: 'At least 5 required',
      running: 'AI Analysis Running',
      processingInBackground: 'Processing in background'
    },

    // Delete Modal
    deleteModal: {
      archiveTitle: 'Archive Project',
      deleteTitle: 'Delete Project',
      archiveDescription: 'To protect opinions, the project will be archived. Archived projects can be restored later.',
      deleteConfirmation: 'Are you sure you want to delete this project? This action cannot be undone.'
    },

    // Complete Modal
    completeModal: {
      title: 'Complete this project?',
      description: 'Completing the project will move it to the dashboard archive.',
      canReactivate: 'You can reactivate it later if needed.',
      complete: 'Complete'
    },
    
    // Bulk Upload related
    bulkUpload: {
      title: 'Bulk Upload for Testing (Developer Feature)',
      description: 'This feature is for testing purposes. It prioritizes quoted opinions, otherwise extracts by line breaks and uploads in bulk.',
      description2: 'Data is saved to both SQLite (backend API) and Firebase.',
      testDataLabel: 'Test Data (Quotes prioritized, line breaks also OK)',
      extractionNote: 'Prioritizes quoted opinions, otherwise extracts by line breaks.',
      extractedCount: 'Extracted opinion count:',
      extractedCountUnit: ' items',
      previewTitle: 'Preview of Extracted Opinions',
      moreItems: '...and',
      moreItemsUnit: ' more',
      resultsTitle: 'Upload Results',
      successCount: 'Success:',
      successCountSeparator: '/',
      successCountUnit: ' items',
      bulkUploadButton: 'Bulk Upload',
      bulkUploadButtonWithCount: 'Bulk Upload (',
      bulkUploadButtonUnit: ' items)',
      placeholder: 'Example (prioritizes quoted opinions, otherwise extracts by line breaks):\n\n【With quotes】\n1. Taro Tanaka (30, office worker) "The garbage sorting in this town is too complicated. I want it to be simpler."\n2. Hanako Sato (25, student) "Public transportation is inconvenient and travel is difficult."\n\n【Line-separated】\n1. Government procedures are too complex and time-consuming\n2. Need more comprehensive childcare support\n3. Playground equipment is old and dangerous\n'
    },
    
    // Navigation
    navigation: {
      breadcrumbLabel: 'Breadcrumb'
    },
    
    // Confirmation dialogs
    confirm: {
      deleteProject: 'Delete this project? This action cannot be undone.',
      archiveProject: 'Archive this project?',
      pauseProject: 'Pause this project?',
      restartAnalysis: 'Restart analysis? Existing results will be deleted.'
    },
    
    // Loading states
    loading: {
      project: 'Loading project...', 
      retrying: 'Retrying... ({count}/3)',
      analysis: 'Running analysis...', 
      updating: 'Updating...', 
      deleting: 'Deleting...'
    },

    // Additional UI elements
    expandCollapse: {
      readMore: 'Read more',
      collapse: 'Collapse'
    },

    // Priority levels
    priorityLevels: {
      high: 'High',
      medium: 'Medium',
      low: 'Low'
    },

    // Labels
    fieldLabels: {
      status: 'Status'
    },

    // Project editing
    edit: {
      projectName: 'Project Name',
      projectDescription: 'Project Description',
      projectNamePlaceholder: 'Enter project name',
      projectDescriptionPlaceholder: 'Enter project description (optional)',
      editProjectInfo: 'Edit project information',
      noDescription: 'No description set'
    },
    
    // Read-only mode
    readOnly: {
      banner: 'This project is archived (Read-only)',
      description: 'You can view, check analysis results, and export data. Restore to edit.',
      restoreProject: 'Restore Project',
      restoreConfirm: 'Do you want to restore this project to active?',
      restoreSuccess: 'Project restored successfully',
      restoreFailed: 'Failed to restore project'
    }
  }
};