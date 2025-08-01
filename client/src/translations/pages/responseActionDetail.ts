export const responseActionDetailTranslations = {
  ja: {
    // ナビゲーション
    backToTopic: 'トピックに戻る',
    backToProject: 'プロジェクトに戻る',
    
    // メインタイトル
    title: 'アクション詳細',
    subtitle: '意見に対するアクション管理',
    
    // 意見情報
    response: {
      notFound: '意見が見つかりません',
      content: '意見内容',
      submittedAt: '投稿日',
      submittedBy: '投稿者',
      characterCount: '文字数',
      sentiment: '感情',
      isBookmarked: 'ブックマーク済み',
      bookmark: 'ブックマーク',
      unbookmark: 'ブックマーク解除',
      relatedTopic: '関連トピック',
      actionRequired: 'アクション必要'
    },
    
    // アクション管理
    action: {
      title: 'アクション管理',
      status: 'ステータス',
      priority: '優先度',
      assignee: '担当者',
      dueDate: '期限',
      description: '説明',
      notes: '備考',
      createdAt: '作成日',
      lastUpdated: '最終更新',
      updateAction: 'アクションを更新',
      createAction: 'アクションを作成',
      deleteAction: 'アクションを削除',
      
      // アクション詳細
      details: 'アクション詳細',
      summary: '要約',
      requirements: '要件',
      timeline: 'タイムライン',
      resources: '必要リソース',
      dependencies: '依存関係',
      riskAssessment: 'リスク評価',
      successCriteria: '成功基準',
      milestones: 'マイルストーン'
    },
    
    // ステータス
    status: {
      unhandled: '未対応',
      inProgress: '対応中',
      resolved: '解決済み',
      dismissed: '見送り',
      pending: '待機中',
      reviewing: 'レビュー中',
      approved: '承認済み',
      completed: '完了済み',
      blocked: 'ブロック',
      
      // ステータス更新
      updateStatus: 'ステータス更新',
      statusHistory: 'ステータス履歴',
      reasonForChange: '変更理由',
      statusNotes: 'ステータス備考'
    },
    
    // 優先度
    priority: {
      urgent: '緊急',
      high: '高',
      medium: '中',
      low: '低',
      none: 'なし',
      
      // 優先度更新
      updatePriority: '優先度更新',
      priorityReason: '優先度設定理由',
      impactAssessment: '影響度評価',
      urgencyLevel: '緊急度'
    },
    
    // 担当者管理
    assignment: {
      assignTo: '担当者を設定',
      unassigned: '未割り当て',
      currentAssignee: '現在の担当者',
      assignmentHistory: '担当履歴',
      assignmentNotes: '担当備考',
      workload: '作業負荷',
      availability: '対応可能性'
    },
    
    // コメント・ログ
    comments: {
      title: 'コメント',
      addComment: 'コメントを追加',
      noComments: 'コメントはありません',
      commentHistory: 'コメント履歴',
      internalNotes: '内部メモ',
      publicComments: '公開コメント',
      
      // コメント詳細
      postedBy: '投稿者',
      postedAt: '投稿日',
      editComment: 'コメントを編集',
      deleteComment: 'コメントを削除',
      replyToComment: 'コメントに返信'
    },
    
    // ログ・履歴
    logs: {
      title: 'アクティビティログ',
      actionHistory: 'アクション履歴',
      statusChanges: 'ステータス変更',
      priorityChanges: '優先度変更',
      assignments: '担当者変更',
      comments: 'コメント履歴',
      noLogs: 'ログはありません',
      
      // ログエントリ
      logEntry: 'ログエントリ',
      timestamp: 'タイムスタンプ',
      user: 'ユーザー',
      action: 'アクション',
      details: '詳細',
      oldValue: '変更前',
      newValue: '変更後',
      dependencyAdded: '依存関係を追加: {dependency}',
      dependencyRemoved: '依存関係を削除: {dependency}',
      statusChanged: 'ステータスを「{oldStatus}」から「{newStatus}」に変更',
      priorityChanged: '優先度を「{oldPriority}」から「{newPriority}」に変更',
      priorityReasonUpdated: '優先度理由を更新',
      priorityReasonDeleted: '優先度理由を削除',
      autoStatusChanged: 'ステータスを「未対応」から「対応中」に自動変更',
      dueDateChanged: '期限を変更しました: {oldDate} → {newDate}',
      reasonPrefix: '理由: '
    },
    
    // フォーム・編集
    form: {
      save: '保存',
      cancel: 'キャンセル',
      edit: '編集',
      delete: '削除',
      update: '更新',
      create: '作成',
      required: '必須',
      optional: '任意',
      none: 'なし',
      
      // フィールド
      title: 'タイトル',
      description: '説明',
      notes: '備考',
      dueDate: '期限',
      estimatedHours: '予想工数',
      actualHours: '実工数',
      tags: 'タグ',
      category: 'カテゴリ'
    },
    
    // 添付ファイル
    attachments: {
      title: '添付ファイル',
      addAttachment: '添付ファイルを追加',
      noAttachments: '添付ファイルはありません',
      fileName: 'ファイル名',
      fileSize: 'ファイルサイズ',
      uploadedBy: 'アップロード者',
      uploadedAt: 'アップロード日',
      download: 'ダウンロード',
      preview: 'プレビュー',
      delete: '削除'
    },
    
    // 関連項目
    related: {
      title: '関連項目',
      relatedActions: '関連アクション',
      relatedResponses: '関連意見',
      relatedTopics: '関連トピック',
      dependencies: '依存関係',
      blockers: 'ブロッカー',
      noRelatedItems: '関連項目はありません'
    },
    
    // 感情分析
    sentiment: {
      positive: '賛成',
      negative: '反対',
      neutral: '中立',
      mixed: '混合',
      unknown: '不明',
      
      // 感情詳細
      confidence: '信頼度',
      sentimentScore: '感情スコア',
      emotionalTone: '感情的トーン',
      keyPhrases: 'キーフレーズ'
    },
    
    // 通知・アラート
    notifications: {
      title: '通知',
      enableNotifications: '通知を有効にする',
      statusUpdates: 'ステータス更新',
      dueDateReminders: '期限リマインダー',
      assignmentChanges: '担当者変更',
      newComments: '新しいコメント',
      emailNotifications: 'メール通知',
      pushNotifications: 'プッシュ通知'
    },
    
    // エラーメッセージ
    errors: {
      loadingResponse: '意見の読み込み中にエラーが発生しました',
      loadingAction: 'アクションの読み込み中にエラーが発生しました',
      updatingAction: 'アクションの更新中にエラーが発生しました',
      savingComment: 'コメントの保存中にエラーが発生しました',
      uploadingFile: 'ファイルのアップロード中にエラーが発生しました',
      unauthorized: 'このアクションにアクセスする権限がありません',
      notFound: 'アクションが見つかりません',
      addingDependency: '依存関係の追加に失敗しました',
      removingDependency: '依存関係の削除に失敗しました',
      statusUpdateFailed: 'ステータスの更新に失敗しました',
      priorityUpdateFailed: '優先度の更新に失敗しました'
    },
    
    // 成功メッセージ
    success: {
      actionUpdated: 'アクションが更新されました',
      statusUpdated: 'ステータスが更新されました',
      priorityUpdated: '優先度が更新されました',
      assigneeUpdated: '担当者が更新されました',
      commentAdded: 'コメントが追加されました',
      commentUpdated: 'コメントが更新されました',
      fileUploaded: 'ファイルがアップロードされました',
      actionDeleted: 'アクションが削除されました',
      dependencyAdded: '依存関係を追加しました',
      dependencyRemoved: '依存関係を削除しました',
      statusChangedTo: 'ステータスを「{status}」に変更しました',
      priorityChangedTo: '優先度を「{priority}」に変更しました',
      bookmarkAdded: 'ブックマークを追加しました',
      bookmarkRemoved: 'ブックマークを削除しました',
      dueDateChanged: 'を「{date}」に変更しました',
      priorityReasonUpdated: '優先度理由を更新しました'
    },
    
    // 確認ダイアログ
    confirm: {
      deleteAction: 'このアクションを削除しますか？',
      deleteComment: 'このコメントを削除しますか？',
      deleteFile: 'このファイルを削除しますか？',
      updateStatus: 'ステータスを更新しますか？',
      reassignAction: 'アクションを再割り当てしますか？'
    },
    
    // 読み込み状態
    loading: {
      response: '意見を読み込み中...',
      action: 'アクションを読み込み中...',
      comments: 'コメントを読み込み中...',
      logs: 'ログを読み込み中...',
      saving: '保存中...',
      updating: '更新中...',
      uploading: 'アップロード中...'
    },

    // UI要素
    ui: {
      topicResolutionContribution: 'トピック解決への寄与',
      topicResolutionQuestion: 'この意見の解決はトピック解決に寄与しますか？',
      topicResolutionDescription: '高優先度や重要とマークされた意見は、トピック全体の解決状況に大きく影響します。この意見を解決することでトピック解決に近づく場合は、適切な優先度を設定してください。',
      priorityReasonTitle: '{priority}設定理由',
      prioritySet: '設定済み',
      expandText: '続きを読む',
      collapseText: '折りたたむ',
      addBookmark: 'ブックマークに追加',
      removeBookmark: 'ブックマークを削除',
      addDependency: '{dependencies}を追加',
      addDependencyModal: '依存関係を追加',
      selectAction: 'アクションを選択してください',
      dependencyDescription: '依存関係について:',
      dependencyExplanation: '選択したアクションが「解決済み」になるまで、このアクションは開始できません。',
      noDependencies: '{dependencies}が設定されていません',
      noDependenciesDescription: 'このアクションは他のアクションの完了を待たずに開始できます',
      dependencyBlocked: '{count}件の{dependencies}が完了していません。これらのアクションが完了するまで開始できません。',
      removeDependency: '{dependencies}を削除',
      addNewComment: '新しいコメントを追加',
      commentPlaceholder: '対応状況や進捗をコメントしてください...',
      submitComment: 'コメント投稿',
      prioritySettingTitle: 'トピック解決のための{priority}設定',
      prioritySettingSubtitle: 'このトピック解決に向けた対応{priority}を設定してください',
      priorityReasonLogPrefix: '理由: ',
      dueDate: '期限: ',
      actionHistory: '対応履歴',
      actionManagement: 'アクション管理',
      updated: '更新: ',
      selectDependentAction: '依存するアクションを選択',
      add: '追加',
      cancel: 'キャンセル',
      locale: 'ja-JP',
      submitting: '投稿中...',
      resolvedReasonTitle: '解決理由',
      dismissedReasonTitle: '見送り理由'
    },

    // ステータス変更ダイアログ
    statusDialog: {
      resolvedTitle: 'アクションを解決済みにする',
      dismissedTitle: 'アクションを見送りにする',
      resolvedMessage: 'このアクションを解決済みとして記録します',
      dismissedMessage: 'このアクションを見送りとして記録します',
      resolvedDescription: 'どのように解決したかを記録することで、今後の参考にできます。',
      dismissedDescription: 'なぜ見送りにしたかを記録することで、今後の判断材料にできます。',
      reasonLabel: '理由（任意）',
      resolvedPlaceholder: 'どのように解決したか、今後の参考になる情報を記録してください...',
      dismissedPlaceholder: 'なぜ見送りにしたか、今後の判断材料となる情報を記録してください...',
      charactersUnit: '文字',
      reasonOptional: '理由を入力しなくても設定できます',
      setResolved: '解決済みに設定',
      setDismissed: '見送りに設定'
    }
  },
  
  en: {
    // Navigation
    backToTopic: 'Back to Topic',
    backToProject: 'Back to Project',
    
    // Main title
    title: 'Action Details',
    subtitle: 'Action management for response',
    
    // Response information
    response: {
      notFound: 'Response not found',
      content: 'Response Content',
      submittedAt: 'Submitted At',
      submittedBy: 'Submitted By',
      characterCount: 'Character Count',
      sentiment: 'Sentiment',
      isBookmarked: 'Bookmarked',
      bookmark: 'Bookmark',
      unbookmark: 'Remove Bookmark',
      relatedTopic: 'Related Topic',
      actionRequired: 'Action Required'
    },
    
    // Action management
    action: {
      title: 'Action Management',
      status: 'Status',
      priority: 'Priority',
      assignee: 'Assignee',
      dueDate: 'Due Date',
      description: 'Description',
      notes: 'Notes',
      createdAt: 'Created At',
      lastUpdated: 'Last Updated',
      updateAction: 'Update Action',
      createAction: 'Create Action',
      deleteAction: 'Delete Action',
      
      // Action details
      details: 'Action Details',
      summary: 'Summary',
      requirements: 'Requirements',
      timeline: 'Timeline',
      resources: 'Required Resources',
      dependencies: 'Dependencies',
      riskAssessment: 'Risk Assessment',
      successCriteria: 'Success Criteria',
      milestones: 'Milestones'
    },
    
    // Status
    status: {
      unhandled: 'Unhandled',
      inProgress: 'In Progress',
      resolved: 'Resolved',
      dismissed: 'Dismissed',
      pending: 'Pending',
      reviewing: 'Reviewing',
      approved: 'Approved',
      completed: 'Completed',
      blocked: 'Blocked',
      
      // Status update
      updateStatus: 'Update Status',
      statusHistory: 'Status History',
      reasonForChange: 'Reason for Change',
      statusNotes: 'Status Notes'
    },
    
    // Priority
    priority: {
      urgent: 'Urgent',
      high: 'High',
      medium: 'Medium',
      low: 'Low',
      none: 'None',
      
      // Priority update
      updatePriority: 'Update Priority',
      priorityReason: 'Priority Reason',
      impactAssessment: 'Impact Assessment',
      urgencyLevel: 'Urgency Level'
    },
    
    // Assignment management
    assignment: {
      assignTo: 'Assign To',
      unassigned: 'Unassigned',
      currentAssignee: 'Current Assignee',
      assignmentHistory: 'Assignment History',
      assignmentNotes: 'Assignment Notes',
      workload: 'Workload',
      availability: 'Availability'
    },
    
    // Comments/Logs
    comments: {
      title: 'Comments',
      addComment: 'Add Comment',
      noComments: 'No comments',
      commentHistory: 'Comment History',
      internalNotes: 'Internal Notes',
      publicComments: 'Public Comments',
      
      // Comment details
      postedBy: 'Posted By',
      postedAt: 'Posted At',
      editComment: 'Edit Comment',
      deleteComment: 'Delete Comment',
      replyToComment: 'Reply to Comment'
    },
    
    // Logs/History
    logs: {
      title: 'Activity Log',
      actionHistory: 'Action History',
      statusChanges: 'Status Changes',
      priorityChanges: 'Priority Changes',
      assignments: 'Assignment Changes',
      comments: 'Comment History',
      noLogs: 'No logs available',
      
      // Log entries
      logEntry: 'Log Entry',
      timestamp: 'Timestamp',
      user: 'User',
      action: 'Action',
      details: 'Details',
      oldValue: 'Old Value',
      newValue: 'New Value',
      dependencyAdded: 'Dependency added: {dependency}',
      dependencyRemoved: 'Dependency removed: {dependency}',
      statusChanged: 'Status changed from "{oldStatus}" to "{newStatus}"',
      priorityChanged: 'Priority changed from "{oldPriority}" to "{newPriority}"',
      priorityReasonUpdated: 'Priority reason updated',
      priorityReasonDeleted: 'Priority reason deleted',
      autoStatusChanged: 'Status automatically changed from "Unhandled" to "In Progress"',
      dueDateChanged: 'Due date changed: {oldDate} → {newDate}',
      reasonPrefix: 'Reason: '
    },
    
    // Form/Edit
    form: {
      save: 'Save',
      cancel: 'Cancel',
      edit: 'Edit',
      delete: 'Delete',
      update: 'Update',
      create: 'Create',
      required: 'Required',
      optional: 'Optional',
      none: 'None',
      
      // Fields
      title: 'Title',
      description: 'Description',
      notes: 'Notes',
      dueDate: 'Due Date',
      estimatedHours: 'Estimated Hours',
      actualHours: 'Actual Hours',
      tags: 'Tags',
      category: 'Category'
    },
    
    // Attachments
    attachments: {
      title: 'Attachments',
      addAttachment: 'Add Attachment',
      noAttachments: 'No attachments',
      fileName: 'File Name',
      fileSize: 'File Size',
      uploadedBy: 'Uploaded By',
      uploadedAt: 'Uploaded At',
      download: 'Download',
      preview: 'Preview',
      delete: 'Delete'
    },
    
    // Related items
    related: {
      title: 'Related Items',
      relatedActions: 'Related Actions',
      relatedResponses: 'Related Responses',
      relatedTopics: 'Related Topics',
      dependencies: 'Dependencies',
      blockers: 'Blockers',
      noRelatedItems: 'No related items'
    },
    
    // Sentiment analysis
    sentiment: {
      positive: 'Positive',
      negative: 'Negative',
      neutral: 'Neutral',
      mixed: 'Mixed',
      unknown: 'Unknown',
      
      // Sentiment details
      confidence: 'Confidence',
      sentimentScore: 'Sentiment Score',
      emotionalTone: 'Emotional Tone',
      keyPhrases: 'Key Phrases'
    },
    
    // Notifications/Alerts
    notifications: {
      title: 'Notifications',
      enableNotifications: 'Enable Notifications',
      statusUpdates: 'Status Updates',
      dueDateReminders: 'Due Date Reminders',
      assignmentChanges: 'Assignment Changes',
      newComments: 'New Comments',
      emailNotifications: 'Email Notifications',
      pushNotifications: 'Push Notifications'
    },
    
    // Error messages
    errors: {
      loadingResponse: 'An error occurred while loading the response',
      loadingAction: 'An error occurred while loading the action',
      updatingAction: 'An error occurred while updating the action',
      savingComment: 'An error occurred while saving the comment',
      uploadingFile: 'An error occurred while uploading the file',
      unauthorized: 'You do not have permission to access this action',
      notFound: 'Action not found',
      addingDependency: 'Failed to add dependency',
      removingDependency: 'Failed to remove dependency',
      statusUpdateFailed: 'Failed to update status',
      priorityUpdateFailed: 'Failed to update priority'
    },
    
    // Success messages
    success: {
      actionUpdated: 'Action updated successfully',
      statusUpdated: 'Status updated successfully',
      priorityUpdated: 'Priority updated successfully',
      assigneeUpdated: 'Assignee updated successfully',
      commentAdded: 'Comment added successfully',
      commentUpdated: 'Comment updated successfully',
      fileUploaded: 'File uploaded successfully',
      actionDeleted: 'Action deleted successfully',
      dependencyAdded: 'Dependency added successfully',
      dependencyRemoved: 'Dependency removed successfully',
      statusChangedTo: 'Status changed to "{status}"',
      priorityChangedTo: 'Priority changed to "{priority}"',
      bookmarkAdded: 'Bookmark added successfully',
      bookmarkRemoved: 'Bookmark removed successfully',
      dueDateChanged: ' changed to "{date}"',
      priorityReasonUpdated: 'Priority reason updated successfully'
    },
    
    // Confirmation dialogs
    confirm: {
      deleteAction: 'Delete this action?',
      deleteComment: 'Delete this comment?',
      deleteFile: 'Delete this file?',
      updateStatus: 'Update status?',
      reassignAction: 'Reassign this action?'
    },
    
    // Loading states
    loading: {
      response: 'Loading response...',
      action: 'Loading action...',
      comments: 'Loading comments...',
      logs: 'Loading logs...',
      saving: 'Saving...',
      updating: 'Updating...',
      uploading: 'Uploading...'
    },

    // UI elements
    ui: {
      topicResolutionContribution: 'Topic Resolution Contribution',
      topicResolutionQuestion: 'Does resolving this response contribute to topic resolution?',
      topicResolutionDescription: 'High {priority} and important responses significantly impact the overall topic resolution status. If resolving this response brings the topic closer to resolution, please set appropriate {priority}.',
      priorityReasonTitle: '{priority} Setting Reason',
      prioritySet: 'Set',
      expandText: 'Read more',
      collapseText: 'Collapse',
      addBookmark: 'Add to Bookmark',
      removeBookmark: 'Remove Bookmark',
      addDependency: 'Add {dependencies}',
      addDependencyModal: 'Add Dependency',
      selectAction: 'Please select an action',
      dependencyDescription: 'About dependencies:',
      dependencyExplanation: 'This action cannot be started until the selected action is "resolved".',
      noDependencies: 'No {dependencies} set',
      noDependenciesDescription: 'This action can be started without waiting for other actions to complete',
      dependencyBlocked: '{count} {dependencies} are not completed. Cannot start until these actions are completed.',
      removeDependency: 'Remove {dependencies}',
      addNewComment: 'Add New Comment',
      commentPlaceholder: 'Please comment on the response status or progress...',
      submitComment: 'Submit Comment',
      prioritySettingTitle: '{priority} Setting for Topic Resolution',
      prioritySettingSubtitle: 'Please set response {priority} for this topic resolution',
      priorityReasonLogPrefix: 'Reason: ',
      dueDate: 'Due: ',
      actionHistory: 'Action History',
      actionManagement: 'Action Management',
      updated: 'Updated: ',
      selectDependentAction: 'Select dependent action',
      add: 'Add',
      cancel: 'Cancel',
      locale: 'en-US',
      submitting: 'Submitting...',
      resolvedReasonTitle: 'Resolution Reason',
      dismissedReasonTitle: 'Dismissal Reason'
    },

    // Status change dialog
    statusDialog: {
      resolvedTitle: 'Mark Action as Resolved',
      dismissedTitle: 'Mark Action as Dismissed',
      resolvedMessage: 'This action will be recorded as resolved',
      dismissedMessage: 'This action will be recorded as dismissed',
      resolvedDescription: 'Recording how it was resolved can be used as a reference for the future.',
      dismissedDescription: 'Recording why it was dismissed can be used as reference material for future decisions.',
      reasonLabel: 'Reason (Optional)',
      resolvedPlaceholder: 'Please record how it was resolved and information that will be useful for future reference...',
      dismissedPlaceholder: 'Please record why it was dismissed and information that will be useful for future decisions...',
      charactersUnit: ' characters',
      reasonOptional: 'You can set without entering a reason',
      setResolved: 'Set as Resolved',
      setDismissed: 'Set as Dismissed'
    }
  }
};