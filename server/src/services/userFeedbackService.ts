import crypto from 'crypto';
import { prisma } from '../lib/database';
import { DeveloperNotificationService } from './developerNotificationService';
import { adminDatabase, isFirebaseInitialized } from '../lib/firebase-admin';

export interface AnonymizedUserContext {
  accountAge: string;
  projectRange: string;
  purpose?: string;
  language?: string;
  lastActivity: string;
}

export interface User {
  id: string;
  createdAt: Date;
  updatedAt: Date;
  purpose?: string | null;
  language?: string | null;
  projects?: { id: string; [key: string]: unknown }[];
}

export class UserFeedbackService {
  /**
   * ユーザーIDをSHA256でハッシュ化
   */
  private static generateUserHash(userId: string): string {
    const salt = process.env.FEEDBACK_HASH_SALT || 'consensus_ai_feedback_salt_2024';
    return crypto
      .createHash('sha256')
      .update(userId + salt)
      .digest('hex');
  }

  /**
   * アカウント期間をカテゴリー化
   */
  private static categorizeAccountAge(daysOld: number): string {
    if (daysOld < 7) return 'less_than_week';
    if (daysOld < 30) return '1-4_weeks';
    if (daysOld < 90) return '1-3_months';
    if (daysOld < 365) return '3-12_months';
    return 'over_1_year';
  }

  /**
   * プロジェクト数をカテゴリー化
   */
  private static categorizeProjectCount(projectCount: number): string {
    if (projectCount === 0) return 'none';
    if (projectCount === 1) return 'single';
    if (projectCount <= 5) return '2-5';
    if (projectCount <= 10) return '6-10';
    return 'over_10';
  }

  /**
   * 最終活動時期をカテゴリー化
   */
  private static categorizeLastActivity(lastActivity: Date): string {
    const daysSinceActivity = Math.floor(
      (Date.now() - new Date(lastActivity).getTime()) / (1000 * 60 * 60 * 24)
    );
    
    if (daysSinceActivity < 1) return 'today';
    if (daysSinceActivity < 7) return 'within_week';
    if (daysSinceActivity < 30) return 'within_month';
    if (daysSinceActivity < 90) return 'within_3_months';
    return 'over_3_months';
  }

  /**
   * ユーザー情報を匿名化してコンテキスト作成
   */
  private static anonymizeUserContext(user: User): AnonymizedUserContext {
    const accountAge = Math.floor(
      (Date.now() - new Date(user.createdAt).getTime()) / (1000 * 60 * 60 * 24)
    );

    return {
      accountAge: this.categorizeAccountAge(accountAge),
      projectRange: this.categorizeProjectCount(user.projects?.length || 0),
      purpose: user.purpose || undefined,
      language: user.language || undefined,
      lastActivity: this.categorizeLastActivity(user.updatedAt)
    };
  }

  /**
   * 退会フィードバックをログに記録
   * 完全匿名化されたデータのみ保存
   */
  static async logDeletionFeedback(
    user: User, 
    deletionReason?: string, 
    customReason?: string
  ): Promise<void> {
    try {
      const userHashId = this.generateUserHash(user.id);
      const userContext = this.anonymizeUserContext(user);

      const feedbackLog = await prisma.userFeedbackLog.create({
        data: {
          userHashId,
          feedbackType: 'account_deletion',
          deletionReason,
          customReason,
          userContext: JSON.stringify(userContext)
        }
      });

      console.log('[UserFeedbackService] ✅ SQLite退会フィードバック記録完了:', {
        userHashId: userHashId.substring(0, 8) + '...',
        reason: deletionReason,
        hasCustomReason: !!customReason,
        contextSummary: {
          accountAge: userContext.accountAge,
          projectRange: userContext.projectRange,
          purpose: userContext.purpose
        }
      });

      // Firebase Realtime Database同期
      if (isFirebaseInitialized && adminDatabase) {
        try {
          const feedbackRef = adminDatabase!.ref(`user_feedback_log/${feedbackLog.id}`);
          // Firebase用データ準備（undefined/null値を除去）
          const firebaseData: Record<string, any> = {
            id: feedbackLog.id,
            userHashId,
            feedbackType: 'account_deletion',
            deletionReason,
            userContext: JSON.stringify(userContext),
            createdAt: feedbackLog.createdAt.toISOString()
          };

          // customReasonがundefined/nullでない場合のみ追加
          if (customReason !== null && customReason !== undefined) {
            firebaseData.customReason = customReason;
          }
          
          await feedbackRef.set(firebaseData);
          console.log('[UserFeedbackService] ✅ Firebase退会フィードバック同期完了:', { 
            feedbackId: feedbackLog.id,
            userHashId: userHashId.substring(0, 8) + '...'
          });
        } catch (firebaseError) {
          console.error('[UserFeedbackService] ❌ Firebase同期エラー:', firebaseError);
          // Firebase同期エラーは非クリティカル（SQLiteに保存済みのため処理は継続）
        }
      }

      // 開発者通知の送信（同期実行で詳細エラー確認）
      try {
        await DeveloperNotificationService.notifyDeletionFeedback({
          id: feedbackLog.id,
          userHashId,
          deletionReason,
          customReason,
          userContext,
          createdAt: feedbackLog.createdAt
        });
        console.log('[UserFeedbackService] ✅ 開発者通知送信完了');
      } catch (notificationError) {
        console.error('[UserFeedbackService] ❌ 開発者通知送信エラー詳細:', {
          error: notificationError,
          errorMessage: notificationError instanceof Error ? notificationError.message : String(notificationError),
          feedbackId: feedbackLog.id,
          isFirebaseInitialized,
          hasAdminDatabase: !!adminDatabase
        });
        // 通知エラーは非クリティカル（処理は継続）
      }

    } catch (error) {
      console.error('[UserFeedbackService] ❌ フィードバック記録エラー:', error);
      console.error('[UserFeedbackService] ❌ エラー詳細:', {
        errorType: error instanceof Error ? error.constructor.name : typeof error,
        errorMessage: error instanceof Error ? error.message : String(error),
        errorStack: error instanceof Error ? error.stack : undefined,
        userHashId: this.generateUserHash(user.id).substring(0, 8) + '...',
        deletionReason
      });
      // フィードバック記録失敗は削除処理に影響しない（非クリティカル）
      // エラーを再スローせず、ログのみ出力
    }
  }

  /**
   * 削除キャンセル時：フィードバックログを削除
   */
  static async deleteDeletionFeedback(userId: string): Promise<void> {
    try {
      const userHashId = this.generateUserHash(userId);
      
      // まずSQLiteから削除対象のフィードバックログIDを取得
      const feedbackLogs = await prisma.userFeedbackLog.findMany({
        where: {
          userHashId,
          feedbackType: 'account_deletion'
        },
        select: { id: true }
      });

      // SQLiteから削除
      const deletedLogs = await prisma.userFeedbackLog.deleteMany({
        where: {
          userHashId,
          feedbackType: 'account_deletion'
        }
      });

      console.log('[UserFeedbackService] ✅ SQLiteフィードバックログ削除完了:', {
        userHashId: userHashId.substring(0, 8) + '...',
        deletedCount: deletedLogs.count
      });

      // Firebase Realtime Databaseからも削除
      if (isFirebaseInitialized && adminDatabase && feedbackLogs.length > 0) {
        try {
          const deletePromises = feedbackLogs.map(log => 
            adminDatabase!.ref(`user_feedback_log/${log.id}`).remove()
          );
          
          await Promise.all(deletePromises);
          console.log('[UserFeedbackService] ✅ Firebaseフィードバックログ削除完了:', {
            userHashId: userHashId.substring(0, 8) + '...',
            deletedCount: feedbackLogs.length
          });
        } catch (firebaseError) {
          console.error('[UserFeedbackService] ❌ Firebase削除エラー:', firebaseError);
          // Firebase削除エラーは非クリティカル（SQLiteから削除済みのため処理は継続）
        }
      }

    } catch (error) {
      console.error('[UserFeedbackService] ❌ フィードバックログ削除エラー:', error);
      // フィードバック削除失敗は削除キャンセル処理に影響しない（非クリティカル）
      // エラーを再スローせず、ログのみ出力
    }
  }

  /**
   * 30日後の物理削除時：既存フィードバックログを更新
   */
  static async updateDeletionFeedback(userId: string, status: 'executed'): Promise<void> {
    try {
      const userHashId = this.generateUserHash(userId);
      
      const existingLog = await prisma.userFeedbackLog.findFirst({
        where: {
          userHashId,
          feedbackType: 'account_deletion'
        }
      });
      
      if (existingLog) {
        // 既存ログが見つかった場合は更新（実行日時を記録）
        await prisma.userFeedbackLog.update({
          where: { id: existingLog.id },
          data: {
            // userContextに実行情報を追加
            userContext: existingLog.userContext // 既存コンテキストを保持
            // 注意: 現在のスキーマではstatusフィールドがないため、
            // コンテキスト内に実行情報を含める必要がある
          }
        });

        console.log('[UserFeedbackService] ✅ フィードバックログ更新完了:', {
          userHashId: userHashId.substring(0, 8) + '...',
          status,
          logId: existingLog.id
        });
      } else {
        // 既存ログが見つからない場合（削除申請時にログが作成されていない）
        console.log('[UserFeedbackService] ⚠️ 更新対象のフィードバックログが見つかりません:', {
          userHashId: userHashId.substring(0, 8) + '...'
        });
      }

    } catch (error) {
      console.error('[UserFeedbackService] ❌ フィードバックログ更新エラー:', error);
      // フィードバック更新失敗は物理削除処理に影響しない（非クリティカル）
      // エラーを再スローせず、ログのみ出力
    }
  }

  /**
   * 管理者向け：フィードバック統計取得
   */
  static async getFeedbackStats() {
    try {
      // 削除理由別の統計
      const reasonStats = await prisma.userFeedbackLog.groupBy({
        by: ['deletionReason'],
        _count: { deletionReason: true },
        where: { 
          feedbackType: 'account_deletion',
          deletionReason: { not: null }
        },
        orderBy: { _count: { deletionReason: 'desc' } }
      });

      // 時系列トレンド（過去30日）
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const trends = await prisma.userFeedbackLog.findMany({
        select: {
          deletionReason: true,
          userContext: true,
          createdAt: true
        },
        where: { 
          feedbackType: 'account_deletion',
          createdAt: { gte: thirtyDaysAgo }
        },
        orderBy: { createdAt: 'desc' },
        take: 100
      });

      // コンテキスト集計
      const contextStats = trends.reduce((acc: Record<string, Record<string, number>>, entry) => {
        if (entry.userContext) {
          try {
            const context = JSON.parse(entry.userContext) as AnonymizedUserContext;
            
            // Account age distribution
            acc.accountAge = acc.accountAge || {};
            acc.accountAge[context.accountAge] = (acc.accountAge[context.accountAge] || 0) + 1;
            
            // Project range distribution  
            acc.projectRange = acc.projectRange || {};
            acc.projectRange[context.projectRange] = (acc.projectRange[context.projectRange] || 0) + 1;
            
            // Purpose distribution
            if (context.purpose) {
              acc.purpose = acc.purpose || {};
              acc.purpose[context.purpose] = (acc.purpose[context.purpose] || 0) + 1;
            }
          } catch {
            // Invalid JSON context - skip
          }
        }
        return acc;
      }, {});

      return {
        reasonStats: reasonStats.map(stat => ({
          reason: stat.deletionReason,
          count: stat._count.deletionReason
        })),
        totalFeedbacks: trends.length,
        contextStats,
        trends: trends.slice(0, 20) // 最新20件のみ返す
      };

    } catch (error) {
      console.error('[UserFeedbackService] ❌ 統計取得エラー:', error);
      throw new Error('フィードバック統計の取得に失敗しました');
    }
  }

  /**
   * 最新のフィードバック一覧を取得
   */
  static async getRecentFeedbacks(limit: number = 20, offset: number = 0) {
    try {
      const [items, totalCount] = await Promise.all([
        // フィードバック一覧
        prisma.userFeedbackLog.findMany({
          select: {
            id: true,
            feedbackType: true,
            deletionReason: true,
            customReason: true,
            userContext: true,
            createdAt: true
          },
          where: { feedbackType: 'account_deletion' },
          orderBy: { createdAt: 'desc' },
          take: limit,
          skip: offset
        }),
        // 総数
        prisma.userFeedbackLog.count({
          where: { feedbackType: 'account_deletion' }
        })
      ]);

      // userContextをパース
      const processedItems = items.map(item => ({
        id: item.id,
        feedbackType: item.feedbackType,
        deletionReason: item.deletionReason,
        customReason: item.customReason,
        userContext: item.userContext ? JSON.parse(item.userContext) : null,
        createdAt: item.createdAt
      }));

      return {
        items: processedItems,
        totalCount,
        hasMore: offset + limit < totalCount
      };

    } catch (error) {
      console.error('[UserFeedbackService] ❌ 最新フィードバック取得エラー:', error);
      throw new Error('最新フィードバックの取得に失敗しました');
    }
  }

  /**
   * フィードバックトレンド分析を取得
   */
  static async getFeedbackTrends(days: number = 30) {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      // 期間内のフィードバック
      const feedbacks = await prisma.userFeedbackLog.findMany({
        select: {
          deletionReason: true,
          userContext: true,
          createdAt: true
        },
        where: {
          feedbackType: 'account_deletion',
          createdAt: { gte: startDate }
        },
        orderBy: { createdAt: 'desc' }
      });

      // 日別集計
      const dailyStats: Record<string, number> = {};
      
      // 理由別集計
      const reasonTrends: Record<string, { count: number; percentage: number }> = {};
      
      // コンテキスト別集計
      const contextTrends = {
        accountAge: {} as Record<string, number>,
        projectRange: {} as Record<string, number>,
        purpose: {} as Record<string, number>
      };

      feedbacks.forEach(feedback => {
        // 日別集計
        const dateKey = feedback.createdAt.toISOString().split('T')[0];
        dailyStats[dateKey] = (dailyStats[dateKey] || 0) + 1;

        // 理由別集計
        const reason = feedback.deletionReason || 'unspecified';
        reasonTrends[reason] = reasonTrends[reason] || { count: 0, percentage: 0 };
        reasonTrends[reason].count += 1;

        // コンテキスト集計
        if (feedback.userContext) {
          try {
            const context = JSON.parse(feedback.userContext) as AnonymizedUserContext;
            
            contextTrends.accountAge[context.accountAge] = (contextTrends.accountAge[context.accountAge] || 0) + 1;
            contextTrends.projectRange[context.projectRange] = (contextTrends.projectRange[context.projectRange] || 0) + 1;
            
            if (context.purpose) {
              contextTrends.purpose[context.purpose] = (contextTrends.purpose[context.purpose] || 0) + 1;
            }
          } catch {
            // Invalid JSON context - skip
          }
        }
      });

      // パーセンテージ計算
      const totalCount = feedbacks.length;
      Object.keys(reasonTrends).forEach(reason => {
        reasonTrends[reason].percentage = totalCount > 0 
          ? Math.round((reasonTrends[reason].count / totalCount) * 100)
          : 0;
      });

      return {
        period: {
          startDate: startDate.toISOString(),
          endDate: new Date().toISOString(),
          days
        },
        totalFeedbacks: totalCount,
        dailyStats,
        reasonTrends,
        contextTrends,
        insights: this.generateTrendInsights(reasonTrends, contextTrends, totalCount)
      };

    } catch (error) {
      console.error('[UserFeedbackService] ❌ トレンド分析取得エラー:', error);
      throw new Error('フィードバックトレンド分析の取得に失敗しました');
    }
  }

  /**
   * トレンド分析からインサイトを生成
   */
  private static generateTrendInsights(
    reasonTrends: Record<string, { count: number; percentage: number }>,
    contextTrends: any,
    totalCount: number
  ) {
    const insights = [];

    if (totalCount === 0) {
      insights.push('該当期間中に退会フィードバックはありませんでした。');
      return insights;
    }

    // 最多退会理由の特定
    const topReason = Object.entries(reasonTrends)
      .sort(([,a], [,b]) => b.count - a.count)[0];
    
    if (topReason && topReason[1].count > 0) {
      insights.push(`最多退会理由は「${topReason[0]}」で、全体の${topReason[1].percentage}%を占めています。`);
    }

    // 新規ユーザーの退会率チェック
    const newUserDeletions = contextTrends.accountAge?.['less_than_week'] || 0;
    if (newUserDeletions > 0) {
      const newUserPercentage = Math.round((newUserDeletions / totalCount) * 100);
      insights.push(`新規ユーザー（1週間未満）の退会が${newUserDeletions}件（${newUserPercentage}%）発生しています。`);
    }

    // 高活用ユーザーの退会チェック
    const activeUserDeletions = (contextTrends.projectRange?.['2-5'] || 0) + 
                              (contextTrends.projectRange?.['6-10'] || 0) + 
                              (contextTrends.projectRange?.['over_10'] || 0);
    
    if (activeUserDeletions > 0) {
      const activeUserPercentage = Math.round((activeUserDeletions / totalCount) * 100);
      insights.push(`複数プロジェクトを利用していたユーザーの退会が${activeUserDeletions}件（${activeUserPercentage}%）発生しています。`);
    }

    return insights;
  }
}