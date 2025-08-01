export const contactTranslations = {
  ja: {
    contact: {
      title: 'お問い合わせ',
      breadcrumbTitle: 'お問い合わせ',
      subtitle: 'ご質問・ご要望・技術的な問題などお気軽にお問い合わせください。',
      
      // フォームフィールド
      form: {
        name: {
          label: 'お名前',
          placeholder: 'お名前を入力してください',
          required: 'お名前は必須です',
          maxLength: '名前は100文字以内で入力してください'
        },
        email: {
          label: 'メールアドレス',
          placeholder: 'メールアドレスを入力してください',
          required: 'メールアドレスは必須です',
          invalid: '有効なメールアドレスを入力してください'
        },
        category: {
          label: 'お問い合わせ種別',
          placeholder: '種別を選択してください',
          required: 'お問い合わせ種別を選択してください',
          options: {
            technical: '技術的な問題・トラブル',
            billing: '課金・支払い関連',
            feature: '機能要望・改善提案',
            other: 'その他'
          }
        },
        subject: {
          label: '件名',
          placeholder: '件名を入力してください',
          required: '件名は必須です',
          maxLength: '件名は200文字以内で入力してください'
        },
        message: {
          label: 'お問い合わせ内容',
          placeholder: 'お問い合わせ内容を詳しくご記入ください...',
          required: 'お問い合わせ内容は必須です',
          minLength: 'お問い合わせ内容は10文字以上で入力してください',
          maxLength: 'お問い合わせ内容は5000文字以内で入力してください'
        },
        submit: '送信する',
        submitting: '送信中...',
        cancel: 'キャンセル'
      },
      
      // カテゴリ説明
      categoryDescriptions: {
        technical: 'ログインできない、画面が表示されない、機能が動作しないなどの技術的な問題',
        billing: '課金・支払い・プラン変更・請求書に関するお問い合わせ',
        feature: '新機能の要望、既存機能の改善提案、UI/UXに関するご意見',
        other: '上記に当てはまらないその他のお問い合わせ'
      },
      
      // 成功・エラーメッセージ
      messages: {
        success: 'お問い合わせを受け付けました',
        successDescription: 'ご連絡いただきありがとうございます。内容を確認の上、担当者よりご回答いたします。',
        error: 'お問い合わせの送信に失敗しました',
        errorDescription: 'エラーが発生しました。しばらく時間をおいて再度お試しください。',
        rateLimit: '送信回数が上限に達しました',
        rateLimitDescription: 'しばらく時間をおいて再度お試しください。',
        networkError: 'ネットワークエラーが発生しました',
        validationError: '入力内容に不備があります'
      },
      
      // 優先度表示
      priority: {
        high: '高優先度（24時間以内に回答）',
        normal: '通常優先度（48時間以内に回答）',
        low: '低優先度（72時間以内に回答）'
      },
      
      // 注意事項
      notes: {
        title: 'ご注意',
        responseTime: '回答までの目安時間：',
        privacy: 'いただいた個人情報は、お問い合わせへの回答以外には使用いたしません。',
        noSpam: 'スパムや不適切な内容のお問い合わせはお控えください。'
      },
      
      // よくある質問への案内
      faq: {
        title: 'よくある質問',
        description: 'お問い合わせの前に、よくある質問もご確認ください。',
        linkText: 'よくある質問を見る',
        commonIssues: {
          title: 'よくあるお問い合わせ',
          login: 'ログインできない',
          billing: '課金について',
          features: '機能の使い方',
          account: 'アカウント設定'
        }
      }
    }
  },
  
  en: {
    contact: {
      title: 'Contact Us',
      breadcrumbTitle: 'Contact Us',
      subtitle: 'Feel free to contact us with any questions, requests, or technical issues.',
      
      // Form fields
      form: {
        name: {
          label: 'Name',
          placeholder: 'Enter your name',
          required: 'Name is required',
          maxLength: 'Name must be 100 characters or less'
        },
        email: {
          label: 'Email Address',
          placeholder: 'Enter your email address',
          required: 'Email address is required',
          invalid: 'Please enter a valid email address'
        },
        category: {
          label: 'Inquiry Type',
          placeholder: 'Select inquiry type',
          required: 'Please select an inquiry type',
          options: {
            technical: 'Technical Issues & Troubleshooting',
            billing: 'Billing & Payment Related',
            feature: 'Feature Requests & Improvements',
            other: 'Other'
          }
        },
        subject: {
          label: 'Subject',
          placeholder: 'Enter subject',
          required: 'Subject is required',
          maxLength: 'Subject must be 200 characters or less'
        },
        message: {
          label: 'Message',
          placeholder: 'Please describe your inquiry in detail...',
          required: 'Message is required',
          minLength: 'Message must be at least 10 characters',
          maxLength: 'Message must be 5000 characters or less'
        },
        submit: 'Submit',
        submitting: 'Submitting...',
        cancel: 'Cancel'
      },
      
      // Category descriptions
      categoryDescriptions: {
        technical: 'Technical issues such as login problems, display issues, or functionality not working',
        billing: 'Inquiries about billing, payments, plan changes, or invoices',
        feature: 'Feature requests, improvement suggestions, or UI/UX feedback',
        other: 'Other inquiries that do not fit the above categories'
      },
      
      // Success/Error messages
      messages: {
        success: 'Contact form submitted successfully',
        successDescription: 'Thank you for contacting us. We will review your inquiry and respond accordingly.',
        error: 'Failed to submit contact form',
        errorDescription: 'An error occurred. Please try again after some time.',
        rateLimit: 'Too many submissions',
        rateLimitDescription: 'Please wait before submitting again.',
        networkError: 'Network error occurred',
        validationError: 'Please check your input'
      },
      
      // Priority display
      priority: {
        high: 'High Priority (Response within 24 hours)',
        normal: 'Normal Priority (Response within 48 hours)',
        low: 'Low Priority (Response within 72 hours)'
      },
      
      // Notes
      notes: {
        title: 'Please Note',
        responseTime: 'Expected response time: ',
        privacy: 'Personal information provided will only be used to respond to your inquiry.',
        noSpam: 'Please refrain from spam or inappropriate content.'
      },
      
      // FAQ guidance
      faq: {
        title: 'Frequently Asked Questions',
        description: 'Please check our FAQ before submitting an inquiry.',
        linkText: 'View FAQ',
        commonIssues: {
          title: 'Common Inquiries',
          login: 'Cannot log in',
          billing: 'About billing',
          features: 'How to use features',
          account: 'Account settings'
        }
      }
    }
  }
};