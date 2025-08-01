import { prisma } from '../lib/database';
import { adminAuth, adminDatabase, isFirebaseInitialized } from '../lib/firebase-admin';
import { AppError } from '../middleware/errorHandler';
import { UserFeedbackService } from './userFeedbackService';
import { PLAN_TYPES } from '../constants/planTypes';

export interface DeletionRequestData {
  userId: string;
  reason?: string;
}

export interface DeletionRequest {
  userId: string;
  deletionRequestedAt: Date;
  scheduledDeletionAt: Date;
  deletionReason?: string;
  isDeleted: boolean;
  subscriptionInfo: {
    cancelled: boolean;
    originalStatus: string;
  };
}

export class AccountDeletionService {
  private readonly DELETION_GRACE_PERIOD_DAYS = 30;

  /**
   * アカウント削除リクエストを作成（ソフトデリート）
   */
  async requestAccountDeletion(userId: string, reason?: string): Promise<DeletionRequest> {
    console.log('[AccountDeletionService] 📝 削除リクエスト開始:', { userId, reason });

    try {
      // ユーザーの存在確認
      const user = await prisma.user.findUnique({
        where: { id: userId }
      });

      if (!user) {
        throw new AppError(404, 'USER_NOT_FOUND', 'ユーザーが見つかりません');
      }

      if (user.isDeleted) {
        throw new AppError(400, 'ALREADY_DELETED', 'このアカウントは既に削除リクエスト済みです');
      }

      // サブスクリプション状態確認とキャンセル処理
      const hasActiveSubscription = user.subscriptionStatus === PLAN_TYPES.PRO || 
                                    user.subscriptionStatus === PLAN_TYPES.TRIAL;
      
      // サブスクリプション情報を記録（レスポンス用）
      const originalSubscriptionStatus = user.subscriptionStatus || PLAN_TYPES.FREE;
      let subscriptionCancelled = false;
      
      if (hasActiveSubscription && user.stripeCustomerId) {
        console.log('[AccountDeletionService] 💳 アクティブなサブスクリプション検出 - キャンセル処理開始:', {
          userId,
          subscriptionStatus: user.subscriptionStatus,
          stripeCustomerId: user.stripeCustomerId
        });
        
        try {
          // Stripeサブスクリプションキャンセル実行（期間終了時にキャンセル）
          const { default: StripeService } = await import('./stripeService');
          const stripeService = new StripeService();
          
          const cancelResult = await stripeService.cancelSubscription(userId);
          if (cancelResult.success) {
            subscriptionCancelled = true;
            console.log('[AccountDeletionService] ✅ サブスクリプションキャンセル成功 - 契約期間終了時に自動キャンセル:', { userId });
          } else {
            console.error('[AccountDeletionService] ❌ サブスクリプションキャンセル失敗:', cancelResult.error);
            throw new AppError(500, 'SUBSCRIPTION_CANCEL_ERROR', 'サブスクリプションのキャンセルに失敗しました');
          }
        } catch (cancelError) {
          console.error('[AccountDeletionService] ❌ サブスクリプションキャンセル処理エラー:', cancelError);
          if (cancelError instanceof AppError) throw cancelError;
          throw new AppError(500, 'SUBSCRIPTION_CANCEL_ERROR', 'サブスクリプションのキャンセルに失敗しました');
        }
      } else if (hasActiveSubscription && !user.stripeCustomerId) {
        console.warn('[AccountDeletionService] ⚠️ アクティブなサブスクリプション状態だがStripeカスタマーIDなし - DBステータス修正:', {
          userId,
          subscriptionStatus: user.subscriptionStatus,
          action: 'サブスクリプションステータスをfreeに修正'
        });
        
        // データ不整合状態のため、サブスクリプションステータスをfreeに修正
        try {
          const { TrialService } = await import('./trialService');
          await TrialService.updateSubscriptionStatus(userId, 'free', undefined, 'account_cleanup', undefined, null, null);
          console.log('[AccountDeletionService] ✅ 不整合状態修正完了 - ステータスをfreeに更新:', { userId });
        } catch (statusUpdateError) {
          console.error('[AccountDeletionService] ❌ ステータス修正失敗:', statusUpdateError);
          // ステータス修正失敗でも削除処理は継続
        }
      } else {
        console.log('[AccountDeletionService] ℹ️ サブスクリプションなし - 通常の削除処理を実行:', {
          userId,
          subscriptionStatus: user.subscriptionStatus
        });
      }

      const now = new Date();
      let scheduledDeletionDate = new Date(now);
      
      // 削除予定日計算: 契約期間終了後または30日後の遅い方を採用
      if (hasActiveSubscription && user.stripeCustomerId) {
        try {
          console.log('[AccountDeletionService] 📅 Stripe契約終了日確認開始:', { userId, stripeCustomerId: user.stripeCustomerId });
          
          // Stripeサブスクリプション情報を取得
          const { default: StripeService } = await import('./stripeService');
          const stripeService = new StripeService();
          
          const subscriptionInfo = await stripeService.getSubscriptionInfo(userId);
          if (subscriptionInfo.success && subscriptionInfo.subscription?.current_period_end) {
            const contractEndDate = new Date(subscriptionInfo.subscription.current_period_end * 1000);
            const minDeletionDate = new Date(now);
            minDeletionDate.setDate(minDeletionDate.getDate() + this.DELETION_GRACE_PERIOD_DAYS);
            
            // 契約終了日と30日後の遅い方を採用
            scheduledDeletionDate = contractEndDate > minDeletionDate ? contractEndDate : minDeletionDate;
            
            console.log('[AccountDeletionService] 📅 契約期間考慮した削除予定日設定:', {
              userId,
              contractEndDate: contractEndDate.toISOString(),
              minDeletionDate: minDeletionDate.toISOString(),
              scheduledDeletionDate: scheduledDeletionDate.toISOString(),
              selectedReason: contractEndDate > minDeletionDate ? '契約終了日採用' : '30日猶予期間採用'
            });
          } else {
            console.warn('[AccountDeletionService] ⚠️ Stripe契約情報取得失敗 - デフォルト30日使用:', subscriptionInfo.error);
            scheduledDeletionDate.setDate(scheduledDeletionDate.getDate() + this.DELETION_GRACE_PERIOD_DAYS);
          }
        } catch (stripeError) {
          console.error('[AccountDeletionService] ❌ Stripe契約確認エラー - デフォルト30日使用:', stripeError);
          scheduledDeletionDate.setDate(scheduledDeletionDate.getDate() + this.DELETION_GRACE_PERIOD_DAYS);
        }
      } else {
        // 無料プランユーザーはデフォルト30日
        scheduledDeletionDate.setDate(scheduledDeletionDate.getDate() + this.DELETION_GRACE_PERIOD_DAYS);
        console.log('[AccountDeletionService] 📅 フリープランユーザー - デフォルト30日使用:', { userId });
      }
      
      console.log('[AccountDeletionService] 📅 最終削除予定日設定:', {
        userId,
        deletionRequestedAt: now.toISOString(),
        scheduledDeletionDate: scheduledDeletionDate.toISOString(),
        subscriptionStatus: user.subscriptionStatus,
        hasActiveSubscription,
        note: '既存契約の請求処理は継続、契約終了後または30日後の遅い方で削除実行'
      });

      // SQLite更新
      const updatedUser = await prisma.user.update({
        where: { id: userId },
        data: {
          isDeleted: true,
          deletionRequestedAt: now,
          scheduledDeletionAt: scheduledDeletionDate,
          deletionReason: reason,
          updatedAt: now
        }
      });

      console.log('[AccountDeletionService] ✅ SQLite削除リクエスト保存完了:', { userId });

      // Firebase Realtime Database同期
      if (isFirebaseInitialized && adminDatabase) {
        try {
          const userRef = adminDatabase.ref(`users/${userId}`);
          await userRef.update({
            isDeleted: true,
            deletionRequestedAt: now.toISOString(),
            scheduledDeletionAt: scheduledDeletionDate.toISOString(),
            deletionReason: reason || null,
            updatedAt: now.toISOString()
          });
          console.log('[AccountDeletionService] ✅ Firebase削除リクエスト同期完了:', { userId });
        } catch (firebaseError) {
          console.error('[AccountDeletionService] ❌ Firebase同期エラー:', firebaseError);
          // Firebase同期失敗時はSQLiteロールバック
          await prisma.user.update({
            where: { id: userId },
            data: {
              isDeleted: false,
              deletionRequestedAt: null,
              scheduledDeletionAt: null,
              deletionReason: null,
              updatedAt: user.updatedAt
            }
          });
          throw new AppError(500, 'FIREBASE_SYNC_ERROR', 'データベース同期に失敗しました');
        }
      }

      // 削除申請時にフィードバックログを記録（匿名化）
      if (reason) {
        console.log('[AccountDeletionService] 📊 削除申請時フィードバック記録開始');
        await UserFeedbackService.logDeletionFeedback(
          updatedUser,
          reason
        );
        console.log('[AccountDeletionService] ✅ 削除申請時フィードバック記録完了');
      }

      const result = {
        userId: updatedUser.id,
        deletionRequestedAt: updatedUser.deletionRequestedAt!,
        scheduledDeletionAt: updatedUser.scheduledDeletionAt!,
        deletionReason: updatedUser.deletionReason || undefined,
        isDeleted: updatedUser.isDeleted,
        // サブスクリプション情報追加
        subscriptionInfo: {
          cancelled: subscriptionCancelled, // 削除申請時にキャンセル処理を実行
          originalStatus: originalSubscriptionStatus
        }
      };
      
      console.log('[AccountDeletionService] 🔍 返り値:', JSON.stringify(result, null, 2));
      return result;
    } catch (error) {
      console.error('[AccountDeletionService] ❌ 削除リクエストエラー:', error);
      if (error instanceof AppError) throw error;
      throw new AppError(500, 'DELETION_REQUEST_ERROR', 'アカウント削除リクエストに失敗しました');
    }
  }

  /**
   * アカウント削除リクエストをキャンセル
   */
  async cancelDeletionRequest(userId: string): Promise<{
    success: boolean;
    user?: any;
    error?: string;
  }> {
    console.log('[AccountDeletionService] 🔄 削除キャンセル開始:', { userId });

    try {
      // ユーザーの存在確認
      const user = await prisma.user.findUnique({
        where: { id: userId }
      });

      if (!user) {
        throw new AppError(404, 'USER_NOT_FOUND', 'ユーザーが見つかりません');
      }

      if (!user.isDeleted || !user.deletionRequestedAt) {
        throw new AppError(400, 'NO_DELETION_REQUEST', '削除リクエストが存在しません');
      }

      // 削除申請時にサブスクリプションキャンセルしている場合は復旧処理が必要
      console.log('[AccountDeletionService] ℹ️ 削除キャンセル処理:', {
        userId,
        subscriptionStatus: user.subscriptionStatus,
        note: '削除申請時にサブスクリプションキャンセルしている場合は復旧処理実行'
      });

      // Stripeサブスクリプション復旧処理（削除申請時にキャンセルしていた場合）
      let subscriptionRestored = false;
      if (user.subscriptionStatus === PLAN_TYPES.PRO || user.subscriptionStatus === PLAN_TYPES.TRIAL) {
        try {
          console.log('[AccountDeletionService] 🔄 Stripe サブスクリプション復旧処理開始:', { userId });
          
          const { default: StripeService } = await import('./stripeService');
          const stripeService = new StripeService();
          
          const restoreResult = await stripeService.restoreSubscription(userId);
          if (restoreResult.success) {
            subscriptionRestored = true;
            console.log('[AccountDeletionService] ✅ サブスクリプション復旧成功:', { userId });
          } else {
            console.error('[AccountDeletionService] ❌ サブスクリプション復旧失敗:', restoreResult.error);
            // 復旧失敗は警告として記録するが、削除キャンセル自体は継続
          }
        } catch (restoreError) {
          console.error('[AccountDeletionService] ❌ サブスクリプション復旧処理エラー:', restoreError);
          // 復旧失敗は警告として記録するが、削除キャンセル自体は継続
        }
      }

      const now = new Date();

      // SQLite更新
      const updatedUser = await prisma.user.update({
        where: { id: userId },
        data: {
          isDeleted: false,
          deletionCancelledAt: now,
          updatedAt: now
        }
      });

      console.log('[AccountDeletionService] ✅ SQLite削除キャンセル完了:', { userId });

      // Firebase Realtime Database同期
      if (isFirebaseInitialized && adminDatabase) {
        try {
          const userRef = adminDatabase.ref(`users/${userId}`);
          await userRef.update({
            isDeleted: false,
            deletionRequestedAt: null,
            scheduledDeletionAt: null,
            deletionReason: null,
            deletionCancelledAt: now.toISOString(),
            updatedAt: now.toISOString()
          });
          console.log('[AccountDeletionService] ✅ Firebase削除キャンセル同期完了:', { userId });
        } catch (firebaseError) {
          console.error('[AccountDeletionService] ❌ Firebase同期エラー:', firebaseError);
          
          // Firebase同期失敗時は全てロールバック
          try {
            // 1. SQLiteロールバック
            await prisma.user.update({
              where: { id: userId },
              data: {
                isDeleted: true,
                deletionCancelledAt: null,
                updatedAt: user.updatedAt
              }
            });
            console.log('[AccountDeletionService] ✅ SQLiteロールバック完了');
            
            // 2. Stripe復旧をロールバック（復旧していた場合のみ）
            if (subscriptionRestored) {
              console.log('[AccountDeletionService] 🔄 Stripe復旧ロールバック開始');
              try {
                const { default: StripeService } = await import('./stripeService');
                const stripeService = new StripeService();
                
                // cancel_at_period_end を true に戻す（削除申請時の状態に復元）
                const rollbackResult = await stripeService.cancelSubscription(userId);
                if (rollbackResult.success) {
                  console.log('[AccountDeletionService] ✅ Stripe復旧ロールバック完了');
                } else {
                  console.error('[AccountDeletionService] ❌ Stripe復旧ロールバック失敗:', rollbackResult.error);
                  console.error('[AccountDeletionService] ⚠️ 重要: Stripeサブスクリプションが復旧状態のまま - 手動確認が必要:', { userId });
                }
              } catch (stripeRollbackError) {
                console.error('[AccountDeletionService] ❌ Stripe復旧ロールバック処理エラー:', stripeRollbackError);
                console.error('[AccountDeletionService] ⚠️ 重要: Stripeサブスクリプション状態不明 - 手動確認が必要:', { userId });
              }
            }
            
          } catch (rollbackError) {
            console.error('[AccountDeletionService] ❌ ロールバック処理エラー:', rollbackError);
            console.error('[AccountDeletionService] ⚠️ 重要: データ不整合状態 - 緊急手動対応が必要:', { userId });
          }
          
          throw new AppError(500, 'FIREBASE_SYNC_ERROR', 'データベース同期に失敗しました');
        }
      }

      // 削除キャンセル時にフィードバックログを削除
      console.log('[AccountDeletionService] 🗑️ フィードバックログ削除開始');
      await UserFeedbackService.deleteDeletionFeedback(userId);
      console.log('[AccountDeletionService] ✅ フィードバックログ削除完了');

      const result = {
        success: true,
        user: updatedUser
      };

      console.log('[AccountDeletionService] ✅ アカウント削除キャンセル成功:', { 
        userId, 
        subscriptionRestored,
        note: '削除申請時にキャンセルしたサブスクリプションの復旧処理完了' 
      });
      return result;
    } catch (error) {
      console.error('[AccountDeletionService] ❌ 削除キャンセルエラー:', error);
      if (error instanceof AppError) throw error;
      throw new AppError(500, 'CANCEL_DELETION_ERROR', 'アカウント削除キャンセルに失敗しました');
    }
  }

  /**
   * アカウントの完全削除を実行（物理削除）
   * 注意: この操作は取り消しできません
   */
  async executeAccountDeletion(userId: string): Promise<{
    success: boolean;
    deletedData: {
      database: boolean;
      firebase: boolean;
      stripe: boolean;
    };
    error?: string;
  }> {
    console.log('[AccountDeletionService] 🗑️ アカウント完全削除開始:', { userId });

    const deletedData = {
      database: false,
      firebase: false,
      stripe: false
    };

    try {
      // ユーザーの存在確認
      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: {
          projects: true
        }
      });

      if (!user) {
        throw new AppError(404, 'USER_NOT_FOUND', 'ユーザーが見つかりません');
      }

      // 削除可能な状態かチェック
      if (!user.isDeleted || !user.scheduledDeletionAt) {
        throw new AppError(400, 'NOT_SCHEDULED_FOR_DELETION', 'このアカウントは削除予定ではありません');
      }

      // 削除予定日に達しているかチェック（強制削除フラグがない限り）
      const now = new Date();
      if (user.scheduledDeletionAt > now) {
        throw new AppError(400, 'DELETION_NOT_DUE', `削除予定日（${user.scheduledDeletionAt.toISOString()}）に達していません`);
      }

      // 既存フィードバックログを更新（新規作成ではない）
      console.log('[AccountDeletionService] 📊 フィードバックログ更新開始');
      await UserFeedbackService.updateDeletionFeedback(userId, 'executed');
      console.log('[AccountDeletionService] ✅ フィードバックログ更新完了');

      // トランザクション開始
      await prisma.$transaction(async (tx) => {
        try {
          // Step 1: Firebase Contacts匿名化（お問い合わせデータを匿名化して保持）
          if (isFirebaseInitialized && adminDatabase) {
            console.log('[AccountDeletionService] 📧 Firebase Contacts匿名化処理開始');
            const contactsRef = adminDatabase.ref('contacts');
            const contactsSnapshot = await contactsRef.orderByChild('userId').equalTo(userId).once('value');
            
            if (contactsSnapshot.exists()) {
              const updates: Record<string, any> = {};
              contactsSnapshot.forEach(child => {
                updates[`${child.key}/userId`] = null;
              });
              await contactsRef.update(updates);
              console.log('[AccountDeletionService] ✅ Firebase Contacts匿名化完了:', { count: Object.keys(updates).length });
            } else {
              console.log('[AccountDeletionService] ℹ️ Firebase Contacts匿名化対象なし');
            }
          }

          // Step 2: Firebase Realtime Database削除
          if (isFirebaseInitialized && adminDatabase) {
            console.log('[AccountDeletionService] 🔥 Firebase Realtime Database削除開始');
            const userRef = adminDatabase.ref(`users/${userId}`);
            await userRef.remove();
            console.log('[AccountDeletionService] ✅ Firebase Realtime Database削除完了');
            deletedData.firebase = true;
          }

          // Step 3: SQLite Contact匿名化（お問い合わせデータを匿名化して保持）
          console.log('[AccountDeletionService] 📧 SQLite Contact匿名化処理開始');
          const anonymizedContacts = await tx.contact.updateMany({
            where: { userId },
            data: { userId: null }
          });
          console.log('[AccountDeletionService] ✅ SQLite Contact匿名化完了:', { count: anonymizedContacts.count });

          // Step 4: SQLite Database削除（カスケード削除により関連データも自動削除）
          console.log('[AccountDeletionService] 💾 SQLite Database削除開始');
          await tx.user.delete({
            where: { id: userId }
          });
          console.log('[AccountDeletionService] ✅ SQLite Database削除完了（カスケード削除含む）');
          deletedData.database = true;

          // Step 5: Firebase Authentication削除
          if (isFirebaseInitialized && adminAuth) {
            console.log('[AccountDeletionService] 🔐 Firebase Authentication削除開始');
            try {
              await adminAuth.deleteUser(userId);
              console.log('[AccountDeletionService] ✅ Firebase Authentication削除完了');
            } catch (authError: any) {
              if (authError.code === 'auth/user-not-found') {
                console.log('[AccountDeletionService] ⚠️ Firebase Auth: ユーザー既に存在しない（スキップ）');
              } else {
                throw authError;
              }
            }
          }

        } catch (error) {
          console.error('[AccountDeletionService] ❌ 削除処理中にエラー:', error);
          throw error; // トランザクションロールバック
        }
      });

      // Step 6: Stripe完全削除処理（データベース削除後に実行）
      if (user.stripeCustomerId) {
        console.log('[AccountDeletionService] 💳 Stripe完全削除処理開始:', {
          userId,
          stripeCustomerId: user.stripeCustomerId
        });
        
        try {
          // Stripe完全削除実行（動的インポートでサーキュラー依存回避）
          const { default: StripeService } = await import('./stripeService');
          const stripeService = new StripeService();
          
          const stripeResult = await stripeService.deleteCustomerCompletely(user.stripeCustomerId);
          if (stripeResult.success) {
            console.log('[AccountDeletionService] ✅ Stripe完全削除成功:', {
              deletedSubscriptions: stripeResult.deletedSubscriptions,
              deletedCustomer: stripeResult.deletedCustomer
            });
            deletedData.stripe = true;
          } else {
            console.error('[AccountDeletionService] ❌ Stripe完全削除失敗:', stripeResult.error);
            // Stripe削除失敗はログ記録のみ（データベース削除は成功のため継続）
            console.error('[AccountDeletionService] ⚠️ 重要: データベース削除は成功だがStripe削除失敗 - 手動確認が必要:', { 
              userId, 
              stripeCustomerId: user.stripeCustomerId,
              error: stripeResult.error 
            });
          }
        } catch (stripeError) {
          console.error('[AccountDeletionService] ❌ Stripe削除処理中にエラー:', stripeError);
          // Stripe処理エラーはログ記録のみ（データベース削除は成功のため継続）
          console.error('[AccountDeletionService] ⚠️ 重要: データベース削除は成功だがStripe処理エラー - 手動確認が必要:', { 
            userId, 
            stripeCustomerId: user.stripeCustomerId 
          });
        }
      } else {
        console.log('[AccountDeletionService] ℹ️ Stripe削除スキップ - 顧客IDなし:', { userId });
        deletedData.stripe = true; // Stripe顧客が存在しない場合は削除完了とみなす
      }

      const result = {
        success: true,
        deletedData
      };

      console.log('[AccountDeletionService] ✅ アカウント完全削除成功:', { userId, deletedData });
      return result;
    } catch (error) {
      console.error('[AccountDeletionService] ❌ アカウント削除エラー:', error);
      if (error instanceof AppError) throw error;
      throw new AppError(500, 'ACCOUNT_DELETION_ERROR', 'アカウント削除に失敗しました');
    }
  }

  /**
   * 削除予定のアカウント一覧を取得（バッチ処理用）
   */
  async getScheduledDeletions(): Promise<DeletionRequest[]> {
    const now = new Date();
    
    const users = await prisma.user.findMany({
      where: {
        isDeleted: true,
        scheduledDeletionAt: {
          lte: now
        }
      }
    });

    return users.map(user => ({
      userId: user.id,
      deletionRequestedAt: user.deletionRequestedAt!,
      scheduledDeletionAt: user.scheduledDeletionAt!,
      deletionReason: user.deletionReason || undefined,
      isDeleted: user.isDeleted,
      // バッチ処理用のデフォルト値（削除申請時に既に処理済み）
      subscriptionInfo: {
        cancelled: true, // 削除申請時にキャンセル処理実行済み
        originalStatus: user.subscriptionStatus || PLAN_TYPES.FREE
      }
    }));
  }
}