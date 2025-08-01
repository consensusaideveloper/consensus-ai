export const accountSettings = {
  ja: {
    accountSettings: {
      title: 'マイアカウント',
      breadcrumbTitle: 'マイアカウント',
      
      // タブナビゲーション
      tabs: {
        account: 'アカウント情報',
        plan: 'プラン・使用状況',
        billing: '購入履歴',
        // モバイル用短縮ラベル
        accountShort: '情報',
        planShort: 'プラン',
        billingShort: '履歴'
      },
      
      // プラン状況セクション
      planStatus: {
        title: 'プラン状況',
        trialRemaining: '残り{days}日',
        nextBilling: 'トライアル終了',
        usage: '使用状況',
        upgrade: 'Proにアップグレード',
        startTrial: 'トライアル開始',
        trialAvailable: '14日間の無料トライアルが利用可能です',
        trialAvailableDescription: 'Proプランの拡張機能を14日間無料でお試しいただけます（一部制限あり）',
        startFreeTrial: '無料トライアルを開始',
        trialDisclaimer: 'クレジットカード必要・いつでもキャンセル可',
        cancelSubscription: 'サブスクリプションをキャンセル',
        cancelConfirmation: 'サブスクリプションをキャンセルしますか？現在の請求期間終了まで有効です。',
        
        // サブスクリプションキャンセルモーダル
        cancelModal: {
          title: 'サブスクリプションのキャンセル',
          warning: 'この操作により、サブスクリプションがキャンセルされます',
          description: 'キャンセル後も現在の請求期間終了まではProプランの機能をご利用いただけます。次の請求日からフリープランに切り替わります。',
          confirmText: 'キャンセルする',
          cancelText: '戻る',
          processing: 'キャンセル処理中...',
          effectiveUntil: '有効期限',
          nextBilling: '次回請求予定日'
        },
        
        // キャンセル状態表示（新規追加）
        cancelStatus: {
          loadingStatus: 'サブスクリプション情報を確認中...',
          cancelScheduledTitle: 'サブスクリプション停止予定',
          autoRenewalStopDate: 'に自動更新停止',
          continueSubscription: 'サブスクリプションを継続する',
          restoreConfirmation: 'サブスクリプションの自動更新を再開しますか？',
          restoreSuccess: 'サブスクリプションの継続を再開しました',
          restoreError: 'サブスクリプション継続の処理に失敗しました'
        },

        // サブスクリプション継続モーダル
        restoreModal: {
          title: 'サブスクリプション継続',
          confirmTitle: 'サブスクリプションを継続しますか？',
          description: 'キャンセル申請を取り消し、自動更新を再開します。次回請求日から通常通り課金が行われます。',
          currentEndDate: '現在の期限日',
          confirmText: '継続する',
          cancelText: 'キャンセル',
          processing: '処理中...'
        },
        
        // プラン名
        freePlan: 'フリープラン',
        trialPlan: 'トライアルプラン', 
        proPlan: 'Proプラン',
        freeStatus: 'フリープラン',
        
        // ステータス
        active: 'アクティブ',
        expired: '期限切れ',
        trialActive: 'トライアル中',
        trialEnding: '終了間近',
        
        // 使用項目
        projects: 'プロジェクト',
        analyses: 'AI分析',
        analysesDaily: 'AI分析（日次）',
        opinions: '意見収集',
        unlimited: '制限拡張',
        
        // トライアル利用済みメッセージ
        trialAlreadyUsed: '{trialPlan}は既に利用済みです',
        trialUsedDescription: '{proPlan}で拡張機能をご利用いただけます',
        
        // プロプランで解放される機能
        upgradeFeatures: {
          title: 'プロプランで解放される機能',
          unlimitedProjects: '大規模プロジェクト作成',
          unlimitedAnalyses: '拡張AI分析機能',
          unlimitedOpinions: '大容量意見収集'
        },
        
        // プラン比較
        comparison: {
          loading: 'プラン比較を読み込み中...',
          loadingDetails: 'プラン詳細を読み込み中...',
          title: '{currentPlan} vs {targetPlan} プラン比較',
          currentLabel: '現在',
          proLabel: 'Pro',
          
          // 比較項目
          projectsLabel: 'プロジェクト数',
          analysesLabel: 'AI分析回数',
          opinionsLabel: '意見収集数',
          
          // Pro限定機能
          exclusiveFeatures: 'Pro限定機能',
          unlimitedProjects: '大規模プロジェクト作成',
          unlimitedOpinions: '大容量意見収集',
          extendedAnalyses: '拡張AI分析（日次{dailyLimit}回/月次{monthlyLimit}回）',
          
          // 価値提案
          valueProposition: '{billing} {price}で{benefit}',
          monthlyBilling: '月額',
          proPrice: '{proPrice}',
          benefitFree: '大規模プロジェクトや継続的な意見収集が可能',
          benefitTrial: 'トライアル終了後も制限拡張で利用継続',
          
          // 単位
          units: {
            projects: '個',
            analyses: '回',
            opinions: '件'
          },
          
          // 制限値表示
          limits: {
            unlimited: '制限拡張',
            loading: '取得中...',
            restricted: '制限あり',
            dailyMonthly: '日次{daily}回/月次{monthly}回'
          }
        }
      },
      
      // アカウント情報セクション
      accountInfo: {
        title: 'アカウント情報',
        name: '名前',
        email: 'メールアドレス',
        purpose: '利用目的',
        language: '言語',
        joinDate: '登録日',
        
        // 利用目的
        purposes: {
          government: '自治体・行政',
          business: '店舗・サービス業',
          corporate: '企業・組織',
          community: 'コミュニティ・団体',
          research: '研究・調査',
          notSet: '未設定'
        },
        
        // 言語
        languages: {
          ja: '日本語',
          en: 'English'
        }
      },
      
      // 利用統計セクション
      stats: {
        title: '利用統計',
        timeSaved: '節約時間',
        analysisCount: '分析実行',
        opinionsCount: '収集意見',
        projectsCount: 'プロジェクト',
        
        // 単位
        hours: '時間',
        times: '回',
        items: '件',
        projects: '個',
        
        // 説明
        timeSavedDescription: '手動分析と比較した節約時間',
        analysisDescription: 'AI分析を実行した回数',
        opinionsDescription: 'これまでに収集した意見数',
        projectsDescription: '作成したプロジェクト数'
      },
      
      // エラーメッセージ
      errors: {
        loadFailed: 'アカウント情報の読み込みに失敗しました',
        upgradeFailed: 'アップグレード処理に失敗しました',
        trialStartFailed: 'トライアル開始に失敗しました'
      },
      
      // 成功メッセージ
      success: {
        trialStarted: 'トライアルを開始しました',
        upgraded: 'Proプランにアップグレードしました'
      },
      
      // 追加の翻訳
      subtitle: 'アカウント情報とご利用状況を確認・管理できます',
      
      // 購入履歴関連
      billing: {
        loading: '読み込み中...',
        noBillingHistory: '購入履歴はありません',
        completed: '完了',
        processing: '処理中',
        failed: '失敗',
        active: '利用中',
        free: '無料',
        purchasePro: 'Proプランを購入',
        invoiceId: '請求書ID',
        subscriptionPeriod: '利用期間',
        downloadInvoice: '請求書をダウンロード',
        expiresOn: '期限',
        trialStarted: 'トライアル開始',
        currentlyUsing: '現在利用中',
        planName: {
          free: 'フリープラン',
          trial: 'トライアルプラン',
          pro: 'Proプラン',
          proMonthly: 'Proプラン（月額）',
          proYearly: 'Proプラン（年額）',
          cancelled: 'キャンセル済み',
          expired: '期限切れ'
        },
        changeType: {
          upgrade: 'プランアップグレード',
          downgrade: 'プランダウングレード',
          trialStart: 'トライアル開始',
          trialEnd: 'トライアル終了',
          cancel: 'プランキャンセル',
          restore: 'プラン復元',
          initial: 'プラン設定',
          planChange: 'プラン変更'
        },
        monthlyPayment: '月額料金',
        periodFormat: '{start} - {end}'
      },
      
      // アカウント削除関連
      accountDeletion: {
        button: 'アカウントを削除',
        title: 'アカウント削除',
        warning: 'この操作は取り消すことができません',
        description: 'アカウントを削除すると、すべてのプロジェクト、データ、分析結果が削除されます。削除後30日間は復元可能です。',
        
        // 削除理由
        reasonTitle: '削除理由をお聞かせください（任意）',
        reasons: {
          notUsing: 'サービスを使用していない',
          switchingService: '他のサービスに切り替える',
          privacy: 'プライバシーの懸念',
          cost: '費用面の理由',
          other: 'その他'
        },
        reasonPlaceholder: 'その他の理由をお聞かせください...',
        
        // 確認ステップ
        confirmTitle: '本当に削除しますか？',
        confirmDescription: 'アカウント削除後、30日間の猶予期間があります。この期間中はアカウントを復元できます。',
        typeToConfirm: '削除を確認するには「{confirmText}」と入力してください',
        confirmText: '削除',
        confirmButton: 'アカウントを削除する',
        cancelButton: 'キャンセル',
        
        // 成功・エラーメッセージ
        success: 'アカウント削除リクエストが送信されました',
        successTitle: '削除リクエストが送信されました',
        successDescription: '{date}に完全に削除されます。それまでの間、いつでもキャンセルできます。',
        // プラン別の削除情報
        planInfo: {
          pro: {
            title: 'プロプランの継続利用について',
            description: '現在の契約期間終了まで、通常通りプロプランの拡張機能をご利用いただけます。次回以降の請求は停止され、契約期間終了後にアカウントが削除されます。'
          },
          trial: {
            title: 'トライアルプランの継続利用について',
            description: 'トライアル期間中は通常通りトライアル機能をご利用いただけます。'
          },
          free: {
            title: 'フリープランの継続利用について',
            description: '削除予定日まで、通常通りフリープラン機能をご利用いただけます。'
          }
        },
        error: 'アカウント削除に失敗しました',
        subscriptionCancelError: 'サブスクリプションのキャンセルに失敗しました。しばらく後に再試行してください。',
        selectReasonError: '削除理由を選択してください',
        enterOtherReasonError: 'その他の理由を入力してください',
        
        // 削除スケジュール情報
        scheduledFor: '削除予定日',
        daysRemaining: '残り{days}日',
        importantNotice: '重要なお知らせ',
        canCancelAnytime: 'いつでも削除をキャンセルできます',
        finalWarning: '削除予定日を過ぎると、データの復旧は不可能になります',
        
        // 次のステップ情報
        whatHappensNext: '次に何が起こりますか？',
        step1: 'アカウントは現在「削除予定」状態になっています',
        step2: '削除予定日まで、通常通りサービスをご利用いただけます',
        step3: '削除予定日になると、すべてのデータが完全に削除されます',
        
        // 削除保留中の状態
        pendingTitle: '削除予定',
        pendingDescription: 'このアカウントは{date}に削除される予定です。',
        cancelDeletion: '削除をキャンセル',
        cancelSuccess: 'アカウント削除がキャンセルされました'
      }
    }
  },
  
  en: {
    accountSettings: {
      title: 'My Account',
      breadcrumbTitle: 'My Account',
      
      // Tab Navigation
      tabs: {
        account: 'Account Info',
        plan: 'Plan & Usage',
        billing: 'Purchase History',
        // Mobile short labels
        accountShort: 'Info',
        planShort: 'Plan',
        billingShort: 'History'
      },
      
      // Plan Status Section
      planStatus: {
        title: 'Plan Status',
        trialRemaining: '{days} days left',
        nextBilling: 'Trial Ends',
        usage: 'Usage',
        upgrade: 'Upgrade to Pro',
        startTrial: 'Start Trial',
        trialAvailable: '14-day free trial available',
        trialAvailableDescription: 'Try all Pro plan features free for 14 days',
        startFreeTrial: 'Start Free Trial',
        trialDisclaimer: 'Credit card required • Cancel anytime',
        cancelSubscription: 'Cancel Subscription',
        cancelConfirmation: 'Are you sure you want to cancel your subscription? It will remain active until the end of your current billing period.',
        
        // Subscription cancellation modal
        cancelModal: {
          title: 'Cancel Subscription',
          warning: 'This will cancel your subscription',
          description: 'After cancellation, you can continue using Pro plan features until the end of your current billing period. Your plan will switch to the Free plan from the next billing date.',
          confirmText: 'Cancel Subscription',
          cancelText: 'Go Back',
          processing: 'Cancelling...',
          effectiveUntil: 'Effective Until',
          nextBilling: 'Next Billing Date'
        },
        
        // Cancel status display (new addition)
        cancelStatus: {
          loadingStatus: 'Checking subscription information...',
          cancelScheduledTitle: 'Subscription Cancellation Scheduled',
          autoRenewalStopDate: 'Auto-renewal stops on',
          continueSubscription: 'Continue Subscription',
          restoreConfirmation: 'Do you want to resume automatic renewal of your subscription?',
          restoreSuccess: 'Subscription continuation has been restored',
          restoreError: 'Failed to process subscription continuation'
        },

        // Subscription restore modal
        restoreModal: {
          title: 'Continue Subscription',
          confirmTitle: 'Do you want to continue your subscription?',
          description: 'This will cancel your cancellation request and resume automatic renewal. You will be charged normally from the next billing date.',
          currentEndDate: 'Current End Date',
          confirmText: 'Continue',
          cancelText: 'Cancel',
          processing: 'Processing...'
        },
        
        // Plan Names
        freePlan: 'Free Plan',
        trialPlan: 'Trial Plan',
        proPlan: 'Pro Plan',
        freeStatus: 'Free Plan',
        
        // Status
        active: 'Active',
        expired: 'Expired',
        trialActive: 'Trial Active',
        trialEnding: 'Ending Soon',
        
        // Usage Items
        projects: 'Projects',
        analyses: 'AI Analyses',
        analysesDaily: 'AI Analyses (Daily)',
        opinions: 'Opinion Collection',
        unlimited: 'Extended Limits',
        
        // Trial already used messages
        trialAlreadyUsed: '{trialPlan} has already been used',
        trialUsedDescription: 'Access extended features with {proPlan}',
        
        // Pro plan upgrade features
        upgradeFeatures: {
          title: 'Unlocked with Pro Plan',
          unlimitedProjects: 'Large-scale project creation',
          unlimitedAnalyses: 'Extended AI analysis features',
          unlimitedOpinions: 'High-capacity opinion collection'
        },
        
        // Plan comparison
        comparison: {
          loading: 'Loading plan comparison...',
          loadingDetails: 'Loading plan details...',
          title: '{currentPlan} vs {targetPlan} Plan Comparison',
          currentLabel: 'Current',
          proLabel: 'Pro',
          
          // Comparison items
          projectsLabel: 'Projects',
          analysesLabel: 'AI Analyses',
          opinionsLabel: 'Opinion Collection',
          
          // Pro exclusive features
          exclusiveFeatures: 'Pro Exclusive Features',
          unlimitedProjects: 'Large-scale project creation',
          unlimitedOpinions: 'High-capacity opinion collection',
          extendedAnalyses: 'Extended AI analyses ({dailyLimit} daily / {monthlyLimit} monthly)',
          
          // Value proposition
          valueProposition: '{benefit} for {billing} {price}',
          monthlyBilling: 'Monthly',
          proPrice: '{proPrice}',
          benefitFree: 'Large-scale projects and continuous opinion collection available',
          benefitTrial: 'Continue using without limitations after trial ends',
          
          // Units
          units: {
            projects: '',
            analyses: '',
            opinions: ''
          },
          
          // Limit values display
          limits: {
            unlimited: 'Extended Limits',
            loading: 'Loading...',
            restricted: 'Limited',
            dailyMonthly: '{daily} daily / {monthly} monthly'
          }
        }
      },
      
      // Account Info Section
      accountInfo: {
        title: 'Account Information',
        name: 'Name',
        email: 'Email Address',
        purpose: 'Purpose of Use',
        language: 'Language',
        joinDate: 'Join Date',
        
        // Purposes
        purposes: {
          government: 'Government/Administration',
          business: 'Store/Service Business',
          corporate: 'Corporate/Organization',
          community: 'Community/Groups',
          research: 'Research/Survey',
          notSet: 'Not Set'
        },
        
        // Languages
        languages: {
          ja: '日本語 (Japanese)',
          en: 'English'
        }
      },
      
      // Usage Stats Section
      stats: {
        title: 'Usage Statistics',
        timeSaved: 'Time Saved',
        analysisCount: 'Analyses Run',
        opinionsCount: 'Opinions Collected',
        projectsCount: 'Projects',
        
        // Units
        hours: 'hours',
        times: 'times',
        items: 'items',
        projects: 'projects',
        
        // Descriptions
        timeSavedDescription: 'Time saved compared to manual analysis',
        analysisDescription: 'Number of AI analyses executed',
        opinionsDescription: 'Total opinions collected',
        projectsDescription: 'Number of projects created'
      },
      
      // Error Messages
      errors: {
        loadFailed: 'Failed to load account information',
        upgradeFailed: 'Failed to upgrade plan',
        trialStartFailed: 'Failed to start trial'
      },
      
      // Success Messages
      success: {
        trialStarted: 'Pro trial started successfully',
        upgraded: 'Successfully upgraded to Pro plan'
      },
      
      // Additional translations
      subtitle: 'Manage your account information and usage details',
      
      // Billing history related
      billing: {
        loading: 'Loading...',
        noBillingHistory: 'No purchase history',
        completed: 'Completed',
        processing: 'Processing',
        failed: 'Failed',
        active: 'Active',
        free: 'Free',
        purchasePro: 'Purchase Pro Plan',
        invoiceId: 'Invoice ID',
        subscriptionPeriod: 'Subscription Period',
        downloadInvoice: 'Download Invoice',
        expiresOn: 'Expires on',
        trialStarted: 'Trial started',
        currentlyUsing: 'Currently using',
        planName: {
          free: 'Free Plan',
          trial: 'Trial Plan',
          pro: 'Pro Plan',
          proMonthly: 'Pro Plan (Monthly)',
          proYearly: 'Pro Plan (Yearly)',
          cancelled: 'Cancelled',
          expired: 'Expired'
        },
        changeType: {
          upgrade: 'Plan Upgrade',
          downgrade: 'Plan Downgrade',
          trialStart: 'Trial Started',
          trialEnd: 'Trial Ended',
          cancel: 'Plan Cancelled',
          restore: 'Plan Restored',
          initial: 'Plan Setup',
          planChange: 'Plan Change'
        },
        monthlyPayment: 'Monthly Payment',
        periodFormat: '{start} - {end}'
      },
      
      // Account deletion related
      accountDeletion: {
        button: 'Delete Account',
        title: 'Delete Account',
        warning: 'This action cannot be undone',
        description: 'Deleting your account will remove all your projects, data, and analysis results. You can restore your account within 30 days.',
        
        // Deletion reasons
        reasonTitle: 'Please tell us why you\'re leaving (optional)',
        reasons: {
          notUsing: 'Not using the service',
          switchingService: 'Switching to another service',
          privacy: 'Privacy concerns',
          cost: 'Cost reasons',
          other: 'Other'
        },
        reasonPlaceholder: 'Please tell us other reasons...',
        
        // Confirmation step
        confirmTitle: 'Are you sure you want to delete?',
        confirmDescription: 'After account deletion, there is a 30-day grace period. You can restore your account during this period.',
        typeToConfirm: 'Type "{confirmText}" to confirm deletion',
        confirmText: 'delete',
        confirmButton: 'Delete My Account',
        cancelButton: 'Cancel',
        
        // Success/Error messages
        success: 'Account deletion request submitted',
        successTitle: 'Deletion Request Submitted',
        successDescription: 'Your account will be permanently deleted on {date}. You can cancel anytime before then.',
        // プラン別の削除情報
        planInfo: {
          pro: {
            title: 'About Pro Plan Continuation',
            description: 'You can continue using all Pro plan features until your current contract period ends. Future billing will be stopped, and your account will be deleted after the contract period ends.'
          },
          trial: {
            title: 'About Trial Plan Continuation',
            description: 'You can continue using trial features as usual during the trial period.'
          },
          free: {
            title: 'About Free Plan Continuation',
            description: 'You can continue using free plan features as usual until the scheduled deletion date.'
          }
        },
        error: 'Failed to delete account',
        subscriptionCancelError: 'Failed to cancel subscription. Please try again later.',
        selectReasonError: 'Please select a reason',
        enterOtherReasonError: 'Please enter other reason',
        
        // Deletion schedule information
        scheduledFor: 'Scheduled Deletion Date',
        daysRemaining: '{days} days remaining',
        importantNotice: 'Important Notice',
        canCancelAnytime: 'You can cancel the deletion anytime',
        finalWarning: 'After the scheduled deletion date, data recovery will be impossible',
        
        // Next steps information
        whatHappensNext: 'What happens next?',
        step1: 'Your account is now in "scheduled for deletion" status',
        step2: 'You can continue using the service normally until the deletion date',
        step3: 'On the deletion date, all your data will be permanently removed',
        
        // Pending deletion state
        pendingTitle: 'Scheduled for Deletion',
        pendingDescription: 'This account is scheduled to be deleted on {date}.',
        cancelDeletion: 'Cancel Deletion',
        cancelSuccess: 'Account deletion has been cancelled'
      }
    }
  }
};