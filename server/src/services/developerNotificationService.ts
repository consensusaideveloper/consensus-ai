import { adminDatabase, isFirebaseInitialized } from '../lib/firebase-admin';
import { AnonymizedUserContext } from './userFeedbackService';

export interface FeedbackNotificationData {
  id: string;
  userHashId: string;
  deletionReason?: string;
  customReason?: string;
  userContext: AnonymizedUserContext;
  createdAt: Date;
}

export class DeveloperNotificationService {
  /**
   * 退会フィードバックの開発者通知を送信
   */
  static async notifyDeletionFeedback(feedbackData: FeedbackNotificationData): Promise<void> {
    try {
      // Firebase開発者通知
      await this.sendFirebaseNotification(feedbackData);
      
      // Slack通知（環境変数で設定されている場合）
      if (process.env.SLACK_WEBHOOK_URL) {
        await this.sendSlackNotification(feedbackData);
      }
      
      console.log('[DeveloperNotificationService] ✅ 開発者通知送信完了:', {
        feedbackId: feedbackData.id,
        reason: feedbackData.deletionReason,
        hasCustomReason: !!feedbackData.customReason
      });
      
    } catch (error) {
      console.error('[DeveloperNotificationService] ❌ 開発者通知エラー:', error);
      // 通知失敗は非クリティカル - ログのみ出力してエラーを再スローしない
    }
  }

  /**
   * Firebase開発者通知の送信
   */
  private static async sendFirebaseNotification(feedbackData: FeedbackNotificationData): Promise<void> {
    console.log('[DeveloperNotificationService] 🔧 Firebase通知開始:', {
      feedbackId: feedbackData.id,
      isFirebaseInitialized,
      hasAdminDatabase: !!adminDatabase
    });

    if (!isFirebaseInitialized || !adminDatabase) {
      console.log('[DeveloperNotificationService] ⚠️ Firebase未初期化 - 通知スキップ');
      return;
    }

    try {
      // Firebase用データ準備（undefined/null値を除去）
      const notificationData: Record<string, any> = {
        id: feedbackData.id,
        type: 'user_feedback',
        timestamp: feedbackData.createdAt.toISOString(),
        priority: this.determineNotificationPriority(feedbackData),
        read: false
      };

      // undefined/null値を除去してFirebaseエラーを防ぐ
      if (feedbackData.deletionReason !== null && feedbackData.deletionReason !== undefined) {
        notificationData.deletionReason = feedbackData.deletionReason;
      }
      if (feedbackData.customReason !== null && feedbackData.customReason !== undefined) {
        notificationData.customReason = feedbackData.customReason;
      }
      if (feedbackData.userContext && Object.keys(feedbackData.userContext).length > 0) {
        // userContextの中のundefined値も除去
        const cleanUserContext: Record<string, any> = {};
        Object.entries(feedbackData.userContext).forEach(([key, value]) => {
          if (value !== null && value !== undefined) {
            cleanUserContext[key] = value;
          }
        });
        if (Object.keys(cleanUserContext).length > 0) {
          notificationData.userContext = cleanUserContext;
        }
      }

      const firebasePath = `user_feedback_log/${feedbackData.id}/developer_notification`;
      console.log('[DeveloperNotificationService] 🔧 Firebase書き込み実行:', { 
        path: firebasePath,
        dataKeys: Object.keys(notificationData)
      });

      // UserFeedbackLogに統一保存（SQL/Firebase両方で同じ構成）
      await adminDatabase.ref(firebasePath).set(notificationData);
      
      console.log('[DeveloperNotificationService] ✅ Firebase通知送信完了');
      
    } catch (error) {
      console.error('[DeveloperNotificationService] ❌ Firebase通知エラー詳細:', {
        error,
        errorMessage: error instanceof Error ? error.message : String(error),
        errorStack: error instanceof Error ? error.stack : undefined,
        feedbackId: feedbackData.id
      });
      throw error;
    }
  }

  /**
   * Slack通知の送信
   */
  private static async sendSlackNotification(feedbackData: FeedbackNotificationData): Promise<void> {
    if (!process.env.SLACK_WEBHOOK_URL) {
      return;
    }

    try {
      const contextSummary = feedbackData.userContext;
      const reasonText = feedbackData.deletionReason || '未指定';
      const hasCustomReason = !!feedbackData.customReason;
      
      const message = {
        text: "📊 ユーザー退会フィードバック",
        blocks: [
          {
            type: "header",
            text: {
              type: "plain_text",
              text: "🚨 新しい退会フィードバック"
            }
          },
          {
            type: "section",
            fields: [
              {
                type: "mrkdwn",
                text: `*退会理由:*\n${reasonText}`
              },
              {
                type: "mrkdwn",
                text: `*アカウント期間:*\n${this.translateAccountAge(contextSummary.accountAge)}`
              },
              {
                type: "mrkdwn",
                text: `*プロジェクト数:*\n${this.translateProjectRange(contextSummary.projectRange)}`
              },
              {
                type: "mrkdwn",
                text: `*利用目的:*\n${this.translatePurpose(contextSummary.purpose)}`
              }
            ]
          }
        ]
      };

      // カスタム理由がある場合は追加
      if (hasCustomReason && feedbackData.customReason) {
        message.blocks.push({
          type: "section",
          text: {
            type: "mrkdwn",
            text: `*詳細理由:*\n${feedbackData.customReason}`
          }
        });
      }

      // 優先度に応じてメッセージを追加
      const priority = this.determineNotificationPriority(feedbackData);
      if (priority === 'high') {
        message.blocks.push({
          type: "section",
          text: {
            type: "mrkdwn",
            text: "⚠️ *高優先度フィードバック* - 早急な対応が必要な可能性があります"
          }
        });
      }

      const response = await fetch(process.env.SLACK_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(message)
      });

      if (!response.ok) {
        throw new Error(`Slack API error: ${response.status}`);
      }

      console.log('[DeveloperNotificationService] ✅ Slack通知送信完了');
      
    } catch (error) {
      console.error('[DeveloperNotificationService] ❌ Slack通知エラー:', error);
      throw error;
    }
  }

  /**
   * 通知優先度の決定
   */
  private static determineNotificationPriority(feedbackData: FeedbackNotificationData): 'high' | 'medium' | 'low' {
    // 新規ユーザー（1週間未満）の退会は高優先度
    if (feedbackData.userContext.accountAge === 'less_than_week') {
      return 'high';
    }
    
    // カスタム理由がある場合は中優先度
    if (feedbackData.customReason && feedbackData.customReason.trim().length > 0) {
      return 'medium';
    }
    
    // デフォルトは低優先度
    return 'low';
  }

  /**
   * アカウント期間の翻訳
   */
  private static translateAccountAge(accountAge: string): string {
    const translations: Record<string, string> = {
      'less_than_week': '1週間未満',
      '1-4_weeks': '1-4週間',
      '1-3_months': '1-3ヶ月',
      '3-12_months': '3-12ヶ月',
      'over_1_year': '1年以上'
    };
    return translations[accountAge] || accountAge;
  }

  /**
   * プロジェクト数範囲の翻訳
   */
  private static translateProjectRange(projectRange: string): string {
    const translations: Record<string, string> = {
      'none': 'なし',
      'single': '1個',
      '2-5': '2-5個',
      '6-10': '6-10個',
      'over_10': '10個以上'
    };
    return translations[projectRange] || projectRange;
  }

  /**
   * 利用目的の翻訳
   */
  private static translatePurpose(purpose?: string): string {
    if (!purpose) return '未設定';
    
    const translations: Record<string, string> = {
      'government': '自治体・行政',
      'business': 'ビジネス',
      'corporate': '企業・法人',
      'community': 'コミュニティ',
      'research': '研究・学術'
    };
    return translations[purpose] || purpose;
  }
}