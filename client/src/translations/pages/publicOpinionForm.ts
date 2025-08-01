export const publicOpinionFormTranslations = {
  ja: {
    // タイトル・見出し
    title: '意見募集フォーム',
    subtitle: 'ご意見をお聞かせください',
    
    // ステータス
    status: {
      collecting: '意見募集中',
      paused: '一時停止中'
    },
    
    // プロジェクト情報
    project: {
      notFound: 'プロジェクトが見つかりません',
      accessDenied: '指定されたプロジェクトが存在しないか、アクセス権限がありません。',
      urlCheck: '正しいURLをご確認ください。',
      suspended: '現在、意見の受付を停止しています',
      suspendedDescription: 'このプロジェクトは現在一時停止中です。',
      waitMessage: '意見の受付は再開されるまでお待ちください。',
      nameNotSet: '意見募集プロジェクト'
    },
    
    // フォーム
    form: {
      description: '皆様からのご意見・ご要望をお待ちしております。',
      usage: 'いただいたご意見は今後の改善に活用させていただきます。',
      label: 'ご意見・ご要望',
      required: '*',
      placeholder: 'ご要望・ご意見をお書きください（200文字以内）',
      charCount: '{count}/200文字',
      submit: '意見を送信',
      submitting: '送信中...'
    },
    
    // AI分析について
    aiInfo: {
      title: 'AIによる自動分析について',
      description: 'いただいたご意見は、AIによって自動的に分析・分類され、類似する意見とグループ化されます。個人を特定する情報は収集されません。'
    },
    
    // バリデーション
    validation: {
      required: 'ご意見を入力してください',
      maxLength: '200文字以内で入力してください'
    },
    
    // エラーメッセージ
    errors: {
      projectLoad: 'プロジェクトデータの取得に失敗しました。',
      userProject: 'ユーザーIDまたはプロジェクトIDが取得できません',
      submitFailed: '送信に失敗しました。時間をおいて再度お試しください。'
    },
    
    // 成功メッセージ
    success: {
      title: 'ご協力ありがとうございました！',
      message: 'あなたのご意見は正常に送信されました。',
      usage: 'いただいたご意見は今後の改善に活用させていただきます。',
      submitAnother: '別の意見を送信'
    },
    
    // フッター
    footer: {
      provider: 'このフォームは ConsensusAI によって提供されています。',
      dataUsage: 'ご意見は適切に管理され、改善目的にのみ使用されます。',
      learnMore: 'ConsensusAIについて詳しく見る'
    },
    
    // ローディング
    loading: '読み込み中...'
  },
  
  en: {
    // Title & headings
    title: 'Opinion Collection Form',
    subtitle: 'Share Your Opinion',
    
    // Status
    status: {
      collecting: 'Collecting Opinions',
      paused: 'Paused'
    },
    
    // Project info
    project: {
      notFound: 'Project Not Found',
      accessDenied: 'The specified project does not exist or you do not have access permission.',
      urlCheck: 'Please check the correct URL.',
      suspended: 'Opinion collection is currently suspended',
      suspendedDescription: 'This project is currently paused.',
      waitMessage: 'Please wait until opinion collection resumes.',
      nameNotSet: 'Opinion Collection Project'
    },
    
    // Form
    form: {
      description: 'We are waiting for your opinions and requests.',
      usage: 'Your opinions will be used for future improvements.',
      label: 'Your Opinion/Request',
      required: '*',
      placeholder: 'Please write your requests or opinions (within 200 characters)',
      charCount: '{count}/200 characters',
      submit: 'Submit Opinion',
      submitting: 'Submitting...'
    },
    
    // AI analysis info
    aiInfo: {
      title: 'About Automatic AI Analysis',
      description: 'Your opinions will be automatically analyzed and classified by AI, and grouped with similar opinions. No personally identifiable information is collected.'
    },
    
    // Validation
    validation: {
      required: 'Please enter your opinion',
      maxLength: 'Please enter within 200 characters'
    },
    
    // Error messages
    errors: {
      projectLoad: 'Failed to retrieve project data.',
      userProject: 'Unable to retrieve user ID or project ID',
      submitFailed: 'Submission failed. Please try again later.'
    },
    
    // Success messages
    success: {
      title: 'Thank you for your cooperation!',
      message: 'Your opinion has been successfully submitted.',
      usage: 'Your opinion will be used for future improvements.',
      submitAnother: 'Submit Another Opinion'
    },
    
    // Footer
    footer: {
      provider: 'This form is provided by ConsensusAI.',
      dataUsage: 'Your opinions are properly managed and used only for improvement purposes.',
      learnMore: 'Learn more about ConsensusAI'
    },
    
    // Loading
    loading: 'Loading...'
  }
};