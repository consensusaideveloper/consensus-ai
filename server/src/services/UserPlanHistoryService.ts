/**
 * ユーザープラン履歴管理サービス
 * プラン変更履歴の記録・取得・Firebase同期を提供
 */

import { PrismaClient } from '@prisma/client';
import { database, isFirebaseInitialized } from '../lib/firebase-admin';
import { PLAN_TYPES } from '../constants/planTypes';

// 型定義
export interface UserPlanHistory {
  id: string;
  userId: string;
  fromPlan: string | null;
  toPlan: string;
  changeType: string;
  changeReason: string | null;
  stripeEventId: string | null;
  metadata: string | null;
  effectiveDate: Date;
  createdAt: Date;
  firebaseId: string | null;
  syncStatus: string | null;
  lastSyncAt: Date | null;
}

export interface RecordPlanChangeParams {
  userId: string;
  fromPlan: string | null;
  toPlan: string;
  changeType: string;
  changeReason: string;
  stripeEventId?: string;
  metadata?: Record<string, any>;
  effectiveDate?: Date;
}

export interface PlanAnalytics {
  totalChanges: number;
  changesByType: Record<string, number>;
  changesByPlan: Record<string, number>;
  conversionRates: {
    freeToTrial: number;
    trialToPro: number;
    freeToProDirectly: number;
  };
}

export class UserPlanHistoryService {
  
  /**
   * プラン変更履歴を記録
   */
  static async recordPlanChange(params: RecordPlanChangeParams): Promise<{ 
    success: boolean; 
    historyId?: string;
    error?: string; 
  }> {
    try {
      const {
        userId,
        fromPlan,
        toPlan,
        changeType,
        changeReason,
        stripeEventId,
        metadata,
        effectiveDate = new Date()
      } = params;

      console.log('[UserPlanHistoryService] 📝 プラン変更履歴記録開始:', {
        userId,
        fromPlan,
        toPlan,
        changeType,
        changeReason,
        stripeEventId
      });

      const prisma = new PrismaClient();
      
      try {
        // 🔧 FIX: Check for duplicate records (especially for trial_end)
        if (changeType === 'trial_end' && changeReason === 'trial_expired') {
          // より厳密な重複チェック：changeType + changeReason + 過去5分以内
          const existingDuplicate = await prisma.userPlanHistory.findFirst({
            where: {
              userId,
              changeType: 'trial_end',
              changeReason: 'trial_expired',
              createdAt: {
                gte: new Date(Date.now() - 5 * 60 * 1000) // 過去5分以内
              }
            },
            orderBy: { createdAt: 'desc' }
          });
          
          if (existingDuplicate) {
            await prisma.$disconnect();
            console.log('[UserPlanHistoryService] ⚠️ 重複レコード検出 - 作成をスキップ:', {
              userId,
              changeType,
              changeReason,
              existingRecordId: existingDuplicate.id,
              existingCreatedAt: existingDuplicate.createdAt
            });
            return {
              success: true,
              historyId: 'duplicate_skipped'
            };
          }
        }
        
        // SQLiteに履歴レコードを作成
        const historyRecord = await prisma.userPlanHistory.create({
          data: {
            userId,
            fromPlan,
            toPlan,
            changeType,
            changeReason,
            stripeEventId,
            metadata: metadata ? JSON.stringify(metadata) : null,
            effectiveDate,
            syncStatus: 'pending'
          }
        });

        await prisma.$disconnect();

        console.log('[UserPlanHistoryService] ✅ SQLite履歴記録完了:', {
          historyId: historyRecord.id,
          userId,
          changeType
        });

        // Firebase同期（ベストエフォート）
        await this.syncToFirebase(historyRecord);

        return {
          success: true,
          historyId: historyRecord.id
        };

      } catch (dbError) {
        await prisma.$disconnect();
        throw dbError;
      }

    } catch (error) {
      console.error('[UserPlanHistoryService] ❌ プラン履歴記録エラー:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * ユーザーのプラン履歴取得
   */
  static async getUserPlanHistory(userId: string): Promise<UserPlanHistory[]> {
    try {
      console.log('[UserPlanHistoryService] 📋 プラン履歴取得開始:', { userId });

      const prisma = new PrismaClient();
      
      try {
        const history = await prisma.userPlanHistory.findMany({
          where: { userId },
          orderBy: { effectiveDate: 'desc' }
        });

        await prisma.$disconnect();

        console.log('[UserPlanHistoryService] ✅ プラン履歴取得完了:', {
          userId,
          recordCount: history.length
        });

        return history;

      } catch (dbError) {
        await prisma.$disconnect();
        throw dbError;
      }

    } catch (error) {
      console.error('[UserPlanHistoryService] ❌ プラン履歴取得エラー:', error);
      return [];
    }
  }

  /**
   * プラン変更統計取得
   */
  static async getPlanChangeAnalytics(options: {
    fromDate?: Date;
    toDate?: Date;
    planType?: string;
  } = {}): Promise<PlanAnalytics> {
    try {
      const { fromDate, toDate, planType } = options;
      
      console.log('[UserPlanHistoryService] 📊 プラン統計取得開始:', {
        fromDate,
        toDate,
        planType
      });

      const prisma = new PrismaClient();
      
      try {
        // 基本的な検索条件
        const whereCondition: any = {};
        
        if (fromDate || toDate) {
          whereCondition.effectiveDate = {};
          if (fromDate) whereCondition.effectiveDate.gte = fromDate;
          if (toDate) whereCondition.effectiveDate.lte = toDate;
        }
        
        if (planType) {
          whereCondition.OR = [
            { fromPlan: planType },
            { toPlan: planType }
          ];
        }

        // 全変更履歴を取得
        const allChanges = await prisma.userPlanHistory.findMany({
          where: whereCondition,
          select: {
            changeType: true,
            fromPlan: true,
            toPlan: true
          }
        });

        await prisma.$disconnect();

        // 統計を計算
        const totalChanges = allChanges.length;
        
        const changesByType = allChanges.reduce((acc, change) => {
          acc[change.changeType] = (acc[change.changeType] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);

        const changesByPlan = allChanges.reduce((acc, change) => {
          if (change.fromPlan) {
            acc[change.fromPlan] = (acc[change.fromPlan] || 0) + 1;
          }
          acc[change.toPlan] = (acc[change.toPlan] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);

        // 変換率の計算
        const freeToTrialCount = allChanges.filter(c => c.fromPlan === PLAN_TYPES.FREE && c.toPlan === PLAN_TYPES.TRIAL).length;
        const trialToProCount = allChanges.filter(c => c.fromPlan === PLAN_TYPES.TRIAL && c.toPlan === PLAN_TYPES.PRO).length;
        const freeToProCount = allChanges.filter(c => c.fromPlan === PLAN_TYPES.FREE && c.toPlan === PLAN_TYPES.PRO).length;
        
        const freeUsersCount = allChanges.filter(c => c.fromPlan === PLAN_TYPES.FREE).length;
        const trialUsersCount = allChanges.filter(c => c.fromPlan === PLAN_TYPES.TRIAL).length;

        const conversionRates = {
          freeToTrial: freeUsersCount > 0 ? freeToTrialCount / freeUsersCount : 0,
          trialToPro: trialUsersCount > 0 ? trialToProCount / trialUsersCount : 0,
          freeToProDirectly: freeUsersCount > 0 ? freeToProCount / freeUsersCount : 0
        };

        console.log('[UserPlanHistoryService] ✅ プラン統計取得完了:', {
          totalChanges,
          uniqueChangeTypes: Object.keys(changesByType).length
        });

        return {
          totalChanges,
          changesByType,
          changesByPlan,
          conversionRates
        };

      } catch (dbError) {
        await prisma.$disconnect();
        throw dbError;
      }

    } catch (error) {
      console.error('[UserPlanHistoryService] ❌ プラン統計取得エラー:', error);
      return {
        totalChanges: 0,
        changesByType: {},
        changesByPlan: {},
        conversionRates: {
          freeToTrial: 0,
          trialToPro: 0,
          freeToProDirectly: 0
        }
      };
    }
  }

  /**
   * Firebase同期（ベストエフォート）
   */
  private static async syncToFirebase(historyRecord: UserPlanHistory): Promise<void> {
    console.log('[UserPlanHistoryService] 🔍 Firebase同期開始 - 詳細チェック:', {
      userId: historyRecord.userId,
      historyId: historyRecord.id,
      changeReason: historyRecord.changeReason,
      isFirebaseInitialized,
      databaseAvailable: !!database
    });

    if (!isFirebaseInitialized || !database) {
      console.warn('[UserPlanHistoryService] ❌ Firebase未初期化のため同期をスキップ');
      
      // Firebase未初期化の場合は同期失敗として記録
      try {
        const prisma = new PrismaClient();
        await prisma.userPlanHistory.update({
          where: { id: historyRecord.id },
          data: {
            syncStatus: 'failed',
            lastSyncAt: new Date()
          }
        });
        await prisma.$disconnect();
        console.log('[UserPlanHistoryService] ⚠️ Firebase未初期化をsyncStatus: failed として記録');
      } catch (updateError) {
        console.error('[UserPlanHistoryService] SQLite更新エラー（Firebase未初期化）:', updateError);
      }
      return;
    }

    try {
      const firebaseData = {
        id: historyRecord.id,
        fromPlan: historyRecord.fromPlan,
        toPlan: historyRecord.toPlan,
        changeType: historyRecord.changeType,
        changeReason: historyRecord.changeReason,
        stripeEventId: historyRecord.stripeEventId,
        metadata: historyRecord.metadata,
        effectiveDate: historyRecord.effectiveDate.toISOString(),
        createdAt: historyRecord.createdAt.toISOString()
      };

      console.log('[UserPlanHistoryService] 📊 Firebase書き込み予定データ:', firebaseData);

      // Firebaseパス: users/{userId}/userPlanHistory/{historyId}
      const firebasePath = `users/${historyRecord.userId}/userPlanHistory/${historyRecord.id}`;
      console.log('[UserPlanHistoryService] 📍 Firebase書き込み先パス:', firebasePath);
      
      const planHistoryRef = database.ref(firebasePath);
      
      console.log('[UserPlanHistoryService] 🚀 Firebase書き込み実行中...');
      await planHistoryRef.set(firebaseData);
      console.log('[UserPlanHistoryService] 📝 Firebase書き込み完了');

      // 書き込み確認 - より詳細な検証
      console.log('[UserPlanHistoryService] 🔍 Firebase書き込み確認開始...');
      const verifySnapshot = await planHistoryRef.once('value');
      const writeSuccessful = verifySnapshot.exists();
      const retrievedData = verifySnapshot.val();
      
      console.log('[UserPlanHistoryService] 📊 Firebase確認結果詳細:', {
        exists: writeSuccessful,
        retrievedData: retrievedData,
        originalId: firebaseData.id,
        pathUsed: firebasePath
      });

      if (!writeSuccessful) {
        console.error('[UserPlanHistoryService] ❌ Firebase書き込み確認失败 - データが存在しない');
        throw new Error('Firebase書き込み後の確認でデータが存在しませんでした');
      }

      // データ内容の検証
      if (!retrievedData || retrievedData.id !== firebaseData.id) {
        console.error('[UserPlanHistoryService] ❌ Firebase書き込みデータ不整合:', {
          expected: firebaseData.id,
          retrieved: retrievedData?.id
        });
        throw new Error('Firebase書き込みデータの内容が不正です');
      }

      // 追加の検証: 少し待ってから再確認
      console.log('[UserPlanHistoryService] 🔄 追加検証: 1秒後に再確認...');
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const reVerifySnapshot = await planHistoryRef.once('value');
      const reVerifySuccessful = reVerifySnapshot.exists();
      const reVerifyData = reVerifySnapshot.val();
      
      console.log('[UserPlanHistoryService] 🔍 再検証結果:', {
        exists: reVerifySuccessful,
        data: reVerifyData
      });

      if (!reVerifySuccessful) {
        console.error('[UserPlanHistoryService] ❌ 再検証で失敗 - データが消失');
        throw new Error('Firebase書き込み後の再検証でデータが存在しません');
      }

      console.log('[UserPlanHistoryService] ✅ Firebase同期完了:', {
        userId: historyRecord.userId,
        historyId: historyRecord.id,
        verified: writeSuccessful,
        reVerified: reVerifySuccessful
      });

      // 同期成功をSQLiteに記録
      try {
        const prisma = new PrismaClient();
        await prisma.userPlanHistory.update({
          where: { id: historyRecord.id },
          data: {
            syncStatus: 'synced',
            lastSyncAt: new Date()
          }
        });
        await prisma.$disconnect();
        console.log('[UserPlanHistoryService] 📈 SQLite syncStatus更新完了: synced');
      } catch (updateError) {
        console.warn('[UserPlanHistoryService] 同期状況更新エラー:', updateError);
        // 同期状況更新失敗は無視
      }

    } catch (firebaseError) {
      console.error('[UserPlanHistoryService] ❌ Firebase同期エラー:', firebaseError);
      
      // 同期失敗をSQLiteに記録
      try {
        const prisma = new PrismaClient();
        await prisma.userPlanHistory.update({
          where: { id: historyRecord.id },
          data: {
            syncStatus: 'failed',
            lastSyncAt: new Date()
          }
        });
        await prisma.$disconnect();
      } catch (updateError) {
        console.warn('[UserPlanHistoryService] 同期状況更新エラー:', updateError);
      }
      
      // Firebase同期エラーでも全体処理は成功とする（ベストエフォート）
    }
  }

  /**
   * 重複履歴チェック（同一ユーザー・同一時刻の重複防止）
   */
  static async checkDuplicateHistory(
    userId: string, 
    changeType: string, 
    effectiveDate: Date,
    toleranceMinutes: number = 1
  ): Promise<boolean> {
    try {
      const prisma = new PrismaClient();
      
      const startTime = new Date(effectiveDate.getTime() - toleranceMinutes * 60 * 1000);
      const endTime = new Date(effectiveDate.getTime() + toleranceMinutes * 60 * 1000);

      try {
        const existingRecord = await prisma.userPlanHistory.findFirst({
          where: {
            userId,
            changeType,
            effectiveDate: {
              gte: startTime,
              lte: endTime
            }
          }
        });

        await prisma.$disconnect();
        return !!existingRecord;

      } catch (dbError) {
        await prisma.$disconnect();
        throw dbError;
      }

    } catch (error) {
      console.error('[UserPlanHistoryService] 重複チェックエラー:', error);
      return false; // エラー時は重複なしとして扱う
    }
  }
}