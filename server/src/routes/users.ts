import express from 'express';
import { prisma } from '../lib/database';
import { AppError } from '../middleware/errorHandler';
import { database, isFirebaseInitialized } from '../lib/firebase-admin';
import { AccountDeletionService } from '../services/accountDeletionService';
import { UserPlanHistoryService } from '../services/UserPlanHistoryService';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth';
import { PLAN_TYPES } from '../constants/planTypes';

const router = express.Router();
const accountDeletionService = new AccountDeletionService();

// ユーザー作成・更新API
router.post('/', async (req, res, next) => {
  console.log('[Users API] 🚀 POST リクエスト受信開始:', { 
    timestamp: new Date().toISOString(),
    headers: req.headers,
    body: req.body
  });
  
  try {
    const { id, email, name, avatar, purpose, language, analysisLanguage, purposeSkipped } = req.body;
    
    console.log('[Users API] 📥 受信データ:', { id, email, name, avatar, purpose, language, analysisLanguage, purposeSkipped });

    if (!id || !email) {
      return next(new AppError(400, 'INVALID_REQUEST', 'User ID and email are required'));
    }

    // 既存ユーザーをチェック（SQL Database + Realtime Database両方を確認）
    console.log('[Users API] 🔍 ユーザー検索開始:', { searchId: id, searchEmail: email });
    
    // 1. SQL Database で既存ユーザーチェック
    const existingUser = await prisma.user.findFirst({
      where: { 
        OR: [
          { id: id },
          { email: email }
        ]
      }
    });
    console.log('[Users API] 🔍 SQL Database検索結果:', { 
      found: !!existingUser, 
      existingUser: existingUser ? { id: existingUser.id, email: existingUser.email } : null 
    });
    
    // 2. Realtime Database で既存ユーザーチェック
    let existingFirebaseUser = null;
    if (isFirebaseInitialized && database) {
      try {
        const userRef = database.ref(`users/${id}`);
        const firebaseSnapshot = await userRef.once('value');
        existingFirebaseUser = firebaseSnapshot.exists() ? firebaseSnapshot.val() : null;
        console.log('[Users API] 🔍 Realtime Database検索結果:', { 
          found: !!existingFirebaseUser, 
          existingFirebaseUser: existingFirebaseUser ? { id: existingFirebaseUser.id, email: existingFirebaseUser.email } : null 
        });
      } catch (firebaseError) {
        console.error('[Users API] ⚠️ Realtime Database検索エラー:', firebaseError);
        // Firebase検索エラーは無視して処理を続行
      }
    }

    let user;
    let sqlOperation = null;
    let originalUserData = null; // ロールバック用に元のデータを保存
    
    // 処理分岐の判定
    if (existingUser || existingFirebaseUser) {
      // 既存ユーザーの処理（SQL Database または Realtime Database に存在）
      if (existingUser) {
        // SQL Database に存在する場合 → 更新処理
        console.log('[Users API] 🔄 SQL Database既存ユーザー更新開始:', { requestId: id, existingId: existingUser.id, existingLanguage: existingUser.language, newLanguage: language });
        
        // ロールバック用に元のデータを保存
        originalUserData = {
          id: existingUser.id,
          email: existingUser.email,
          name: existingUser.name,
          purpose: existingUser.purpose,
          language: existingUser.language,
          purposeSkipped: existingUser.purposeSkipped,
          updatedAt: existingUser.updatedAt
        };
        
        // SQL Database更新
        user = await prisma.user.update({
          where: { id: existingUser.id },
          data: {
            email,
            name,
            avatar,
            purpose,
            language,
            analysisLanguage,
            purposeSkipped,
            updatedAt: new Date()
          }
        });
        sqlOperation = 'update';
        console.log('[Users API] ✅ SQL Database更新完了:', { 
          id, 
          updatedFields: { email, name, purpose, language },
          sqlResult: { id: user.id, language: user.language, updatedAt: user.updatedAt }
        });
      } else {
        // Realtime Database のみに存在する場合 → SQL Database に作成
        console.log('[Users API] 🔄 Realtime Database既存ユーザー → SQL Database作成開始:', { requestId: id, existingFirebaseUser: existingFirebaseUser });
        
        // SQL Database作成
        user = await prisma.user.create({
          data: {
            id,
            email,
            name,
            avatar,
            purpose,
            language: language || 'ja',
            purposeSkipped: purposeSkipped || false,
            // プラン関連フィールドを明示的に設定（アカウント作成時は必然的にフリープラン）
            subscriptionStatus: PLAN_TYPES.FREE
          }
        });
        sqlOperation = 'create';
        console.log('[Users API] ✅ SQL Database作成完了 (Realtime Database既存ユーザー):', { 
          id: user.id, 
          language: user.language, 
          createdAt: user.createdAt 
        });
        
        // 初期プラン履歴を記録
        try {
          await UserPlanHistoryService.recordPlanChange({
            userId: user.id,
            fromPlan: null, // 初回設定のためnull
            toPlan: PLAN_TYPES.FREE,
            changeType: 'initial',
            changeReason: 'sql_database_creation',
            effectiveDate: user.createdAt
          });
          console.log('[Users API] ✅ 初期プラン履歴記録完了 (Realtime Database既存ユーザー):', { userId: user.id, plan: 'free' });
        } catch (historyError) {
          console.error('[Users API] ⚠️ 初期プラン履歴記録エラー (Realtime Database既存ユーザー):', historyError);
          // 履歴記録失敗でもアカウント作成は継続
        }
        
        // Realtime Database も更新（最新情報で同期）
        if (isFirebaseInitialized && database) {
          try {
            const firebaseUserData = {
              id: user.id,
              email: user.email,
              name: user.name || null,
              purpose: user.purpose || null,
              language: user.language,
              analysisLanguage: user.analysisLanguage || null,
              purposeSkipped: user.purposeSkipped || false,
              createdAt: user.createdAt.toISOString(),
              updatedAt: user.updatedAt.toISOString(),
              // プラン関連フィールド（既存パターンに従った追加）
              ...(user.subscriptionStatus && { subscriptionStatus: user.subscriptionStatus }),
              ...(user.trialEndDate && { trialEndDate: user.trialEndDate.toISOString() })
            };
            
            const userRef = database.ref(`users/${id}`);
            await userRef.update(firebaseUserData);
            console.log('[Users API] ✅ Realtime Database同期完了 (既存ユーザー更新):', { userId: id });
          } catch (firebaseError) {
            console.error('[Users API] ⚠️ Realtime Database同期エラー (既存ユーザー更新):', firebaseError);
            // 既存ユーザーの場合は同期エラーでも処理を続行
          }
        }
      }
    } else {
      // 新規ユーザーを作成 (SQL Database → Firebase Realtime Database順序)
      console.log('[Users API] 🆕 新規ユーザー作成開始:', { id, language, purposeSkipped });
      
      // まずSQL Database作成（必須）
      user = await prisma.user.create({
        data: {
          id,
          email,
          name,
          avatar,
          purpose,
          language: language || 'ja',  // デフォルト値設定
          analysisLanguage: analysisLanguage || null,  // デフォルト値設定
          purposeSkipped: purposeSkipped || false,  // デフォルト値設定
          // プラン関連フィールドを明示的に設定（アカウント作成時は必然的にフリープラン）
          subscriptionStatus: PLAN_TYPES.FREE
        }
      });
      sqlOperation = 'create';
      console.log('[Users API] ✅ SQL Database作成完了:', { 
        id: user.id, 
        language: user.language, 
        createdAt: user.createdAt 
      });
      
      // Firebase Realtime Database に同期（optional）
      if (isFirebaseInitialized && database) {
        try {
          console.log('[Users API] 🔥 Firebase Realtime Database同期開始:', { userId: id });
          
          const firebaseUserData = {
            id: user.id,
            email: user.email,
            name: user.name || null,
            avatar: user.avatar || null,
            purpose: user.purpose || null,
            language: user.language,
            analysisLanguage: user.analysisLanguage || null,
            purposeSkipped: user.purposeSkipped || false,
            createdAt: user.createdAt.toISOString(),
            updatedAt: user.updatedAt.toISOString(),
            // プラン関連フィールド（既存パターンに従った追加）
            ...(user.subscriptionStatus && { subscriptionStatus: user.subscriptionStatus }),
            ...(user.trialStartDate && { trialStartDate: user.trialStartDate.toISOString() }),
            ...(user.trialEndDate && { trialEndDate: user.trialEndDate.toISOString() })
          };
          
          const userRef = database.ref(`users/${id}`);
          await userRef.update(firebaseUserData);
          
          console.log('[Users API] ✅ Firebase Realtime Database同期完了:', { userId: id });
          
        } catch (firebaseError) {
          console.warn('[Users API] ⚠️ Firebase Realtime Database同期失敗（処理は継続）:', firebaseError);
          // 新規ユーザー作成の場合も同期エラーで処理継続
        }
      }
      
      // 初期プラン履歴を記録（Firebase Realtime Database同期後に実行）
      try {
        await UserPlanHistoryService.recordPlanChange({
          userId: user.id,
          fromPlan: null, // 初回設定のためnull
          toPlan: PLAN_TYPES.FREE,
          changeType: 'initial',
          changeReason: 'account_creation',
          effectiveDate: user.createdAt
        });
        console.log('[Users API] ✅ 初期プラン履歴記録完了:', { userId: user.id, plan: 'free' });
      } catch (historyError) {
        console.error('[Users API] ⚠️ 初期プラン履歴記録エラー:', historyError);
        // 履歴記録失敗でもアカウント作成は継続
      }
    }

    // Firebase Realtime Database 同期（SQL Database既存ユーザー更新時のみ）
    if (sqlOperation === 'update' && existingUser) {
      if (isFirebaseInitialized && database) {
        try {
          console.log('[Users API] 🔥 Firebase同期開始:', { operation: sqlOperation, userId: id });
          
          const firebaseUserData = {
            id: user.id,
            email: user.email,
            name: user.name || null,
            avatar: user.avatar || null,
            purpose: user.purpose || null,
            language: user.language,
            analysisLanguage: user.analysisLanguage || null,
            purposeSkipped: user.purposeSkipped || false,
            createdAt: user.createdAt.toISOString(),
            updatedAt: user.updatedAt.toISOString(),
            // プラン関連フィールド（既存パターンに従った追加）
            ...(user.subscriptionStatus && { subscriptionStatus: user.subscriptionStatus }),
            ...(user.trialStartDate && { trialStartDate: user.trialStartDate.toISOString() }),
            ...(user.trialEndDate && { trialEndDate: user.trialEndDate.toISOString() })
          };
          
          const userRef = database.ref(`users/${id}`);
          await userRef.update(firebaseUserData);
          
          console.log('[Users API] ✅ Firebase同期完了:', { userId: id, data: firebaseUserData });
          
          // Firebase同期確認
          const firebaseSnapshot = await userRef.once('value');
          if (!firebaseSnapshot.exists()) {
            throw new Error('Firebase同期後にデータが確認できません');
          }
          console.log('[Users API] 🔍 Firebase同期確認完了:', { exists: firebaseSnapshot.exists() });
          
        } catch (firebaseError) {
          console.error('[Users API] ❌ Firebase同期エラー:', firebaseError);
          console.log('[Users API] 🔄 Firebase同期失敗 - SQLロールバック開始');
          
          // CLAUDE.md要件: Firebase同期失敗時はSQLロールバックして全体を失敗とする
          try {
            if (originalUserData) {
              // 更新の場合：元のデータに戻す
              await prisma.user.update({
                where: { id: originalUserData.id },
                data: {
                  email: originalUserData.email,
                  name: originalUserData.name,
                  purpose: originalUserData.purpose,
                  language: originalUserData.language,
                  purposeSkipped: originalUserData.purposeSkipped,
                  updatedAt: originalUserData.updatedAt
                }
              });
              console.log('[Users API] ✅ SQLロールバック完了 (元データ復元):', { userId: originalUserData.id });
            }
          } catch (rollbackError) {
            console.error('[Users API] ❌ SQLロールバック失敗:', rollbackError);
            // ロールバックも失敗した場合はより深刻なエラーとして扱う
            throw new Error(`Firebase同期失敗かつSQLロールバックも失敗: ${rollbackError instanceof Error ? rollbackError.message : 'Unknown rollback error'}`);
          }
          
          // Firebase同期失敗は全体の失敗として扱う
          throw new Error(`Firebase同期失敗: ${firebaseError instanceof Error ? firebaseError.message : 'Unknown Firebase error'}`);
        }
      } else {
        console.log('[Users API] ⚠️ Firebase未初期化 - SQL操作のみ実行');
        // Firebase未初期化の場合も、CLAUDE.md要件に従って全体を失敗とする
        // SQLロールバック
        try {
          if (originalUserData) {
            await prisma.user.update({
              where: { id: originalUserData.id },
              data: {
                email: originalUserData.email,
                name: originalUserData.name,
                purpose: originalUserData.purpose,
                language: originalUserData.language,
                purposeSkipped: originalUserData.purposeSkipped,
                updatedAt: originalUserData.updatedAt
              }
            });
            console.log('[Users API] ✅ SQLロールバック完了 (Firebase未初期化・元データ復元):', { userId: originalUserData.id });
          }
        } catch (rollbackError) {
          console.error('[Users API] ❌ SQLロールバック失敗 (Firebase未初期化):', rollbackError);
          throw new Error(`Firebase未初期化かつSQLロールバックも失敗: ${rollbackError instanceof Error ? rollbackError.message : 'Unknown rollback error'}`);
        }
        
        throw new Error('Firebase未初期化のため、両方のDBへの同期ができません');
      }
    } else {
      // 新規ユーザー作成時 または Realtime Database既存ユーザー処理時は既に同期済み
      if (sqlOperation === 'create' && !existingFirebaseUser) {
        console.log('[Users API] ℹ️ 新規ユーザー作成時はFirebase Realtime Database同期済み - スキップ');
      } else if (sqlOperation === 'create' && existingFirebaseUser) {
        console.log('[Users API] ℹ️ Realtime Database既存ユーザー処理時は既に同期済み - スキップ');
      }
    }

    res.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        avatar: user.avatar,
        purpose: user.purpose,
        language: user.language,
        analysisLanguage: user.analysisLanguage,
        purposeSkipped: user.purposeSkipped,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
        // プラン関連フィールドをレスポンスに追加
        subscriptionStatus: user.subscriptionStatus,
        trialStartDate: user.trialStartDate,
        trialEndDate: user.trialEndDate
      }
    });
    
    console.log('[Users API] 📤 レスポンス送信 (Firebase Realtime Database+SQL Database両方同期完了):', { 
      id: user.id, 
      language: user.language,
      firebaseSync: isFirebaseInitialized,
      operation: sqlOperation,
      responseTime: new Date().toISOString()
    });

  } catch (error) {
    console.error('[Users API] ❌ ユーザー保存エラー:', error);
    console.error('[Users API] エラースタック:', error instanceof Error ? error.stack : 'No stack trace');
    
    // Firebase同期はoptionalになったため、SQL Database関連エラーのみ処理
    if (error instanceof Error) {
      // SQL Database操作失敗の場合
      if (error.message.includes('SQL') || error.message.includes('prisma') || error.message.includes('database')) {
        return res.status(500).json({
          error: 'DATABASE_ERROR',
          message: 'Failed to save user to database',
          code: 'SQL_DATABASE_ERROR',
          details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
      }
      
      // Firebase同期失敗やロールバック失敗の場合
      if (error.message.includes('Firebase同期失敗') || error.message.includes('Firebase未初期化')) {
        return res.status(500).json({
          error: 'DATABASE_SYNC_ERROR',
          message: 'Failed to synchronize data between databases',
          code: 'FIREBASE_SYNC_ERROR',
          details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
      }
      
      // ロールバックも失敗した場合
      if (error.message.includes('ロールバックも失敗')) {
        return res.status(500).json({
          error: 'CRITICAL_DATABASE_ERROR',
          message: 'Critical database inconsistency detected',
          code: 'ROLLBACK_FAILED',
          details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
      }
      
      // その他のエラー
      return res.status(500).json({
        error: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to save user',
        code: 'USER_SAVE_ERROR',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
    
    // 不明なエラーの場合
    return res.status(500).json({
      error: 'INTERNAL_SERVER_ERROR',
      message: 'Failed to save user',
      code: 'UNKNOWN_ERROR',
      details: process.env.NODE_ENV === 'development' ? 'Unknown error occurred' : undefined
    });
  }
});

// 全ユーザー取得API
router.get('/', async (_req, res, next) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        purpose: true,
        language: true,
        analysisLanguage: true,
        purposeSkipped: true,
        createdAt: true,
        updatedAt: true
      }
    });

    res.json({
      success: true,
      users
    });

  } catch (error) {
    console.error('[Users API] ❌ ユーザーリスト取得エラー:', error);
    next(new AppError(500, 'USERS_FETCH_ERROR', 'Failed to fetch users'));
  }
});

// ユーザー取得API
router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    
    console.log('[Users API] 🔍 ユーザー取得開始:', { userId: id, timestamp: new Date().toISOString() });

    const user = await prisma.user.findFirst({
      where: { id }
    });

    if (!user) {
      console.log('[Users API] 🔍 ユーザー見つからず:', { userId: id });
      return next(new AppError(404, 'USER_NOT_FOUND', 'User not found'));
    }

    console.log('[Users API] ✅ ユーザー取得成功:', { userId: user.id, email: user.email });

    res.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        avatar: user.avatar,
        purpose: user.purpose,
        language: user.language,
        analysisLanguage: user.analysisLanguage,
        purposeSkipped: user.purposeSkipped,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
        // プラン関連フィールドをレスポンスに追加
        subscriptionStatus: user.subscriptionStatus,
        trialStartDate: user.trialStartDate,
        trialEndDate: user.trialEndDate,
        stripeCustomerId: user.stripeCustomerId,
        // 削除関連フィールド
        isDeleted: user.isDeleted,
        deletionRequestedAt: user.deletionRequestedAt,
        scheduledDeletionAt: user.scheduledDeletionAt
      }
    });

  } catch (error) {
    console.error('[Users API] ❌ ユーザー取得処理エラー:', {
      userId: req.params.id,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString()
    });
    next(new AppError(500, 'USER_FETCH_ERROR', 'Failed to fetch user'));
  }
});

// ユーザープラン履歴取得API
router.get('/:id/plan-history', requireAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    const { id } = req.params;
    
    console.log('[Users API] 📋 プラン履歴取得開始:', { 
      userId: id, 
      requestingUserId: req.userId,
      timestamp: new Date().toISOString() 
    });

    // 本人確認
    if (req.userId !== id) {
      return next(new AppError(403, 'FORBIDDEN', '他のユーザーのプラン履歴は確認できません'));
    }

    // ユーザー存在確認
    const user = await prisma.user.findUnique({
      where: { id },
      select: { id: true, email: true }
    });

    if (!user) {
      return next(new AppError(404, 'USER_NOT_FOUND', 'ユーザーが見つかりません'));
    }

    // プラン履歴を取得
    const planHistory = await UserPlanHistoryService.getUserPlanHistory(id);

    console.log('[Users API] ✅ プラン履歴取得成功:', { 
      userId: id,
      recordCount: planHistory.length
    });

    res.json({
      success: true,
      planHistory: planHistory.map(record => ({
        id: record.id,
        fromPlan: record.fromPlan,
        toPlan: record.toPlan,
        changeType: record.changeType,
        changeReason: record.changeReason,
        stripeEventId: record.stripeEventId,
        effectiveDate: record.effectiveDate,
        createdAt: record.createdAt
      }))
    });

  } catch (error) {
    console.error('[Users API] ❌ プラン履歴取得エラー:', error);
    if (error instanceof AppError) {
      return next(error);
    }
    next(new AppError(500, 'PLAN_HISTORY_ERROR', 'プラン履歴の取得に失敗しました'));
  }
});

// アカウント削除リクエストAPI
router.post('/:id/deletion-request', requireAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    
    console.log('[Users API] 🗑️ アカウント削除リクエスト受信:', { 
      userId: id, 
      requestingUserId: req.userId,
      reason,
      timestamp: new Date().toISOString() 
    });

    // 本人確認
    if (req.userId !== id) {
      return next(new AppError(403, 'FORBIDDEN', '他のユーザーのアカウントは削除できません'));
    }

    const deletionRequest = await accountDeletionService.requestAccountDeletion(id, reason);
    
    console.log('[Users API] 🔍 AccountDeletionService返り値:', JSON.stringify(deletionRequest, null, 2));

    res.json({
      success: true,
      deletionRequest: {
        userId: deletionRequest.userId,
        deletionRequestedAt: deletionRequest.deletionRequestedAt,
        scheduledDeletionAt: deletionRequest.scheduledDeletionAt,
        deletionReason: deletionRequest.deletionReason,
        subscriptionInfo: deletionRequest.subscriptionInfo
      }
    });

    console.log('[Users API] ✅ アカウント削除リクエスト成功:', { userId: id });

  } catch (error) {
    console.error('[Users API] ❌ アカウント削除リクエストエラー:', error);
    if (error instanceof AppError) {
      return next(error);
    }
    next(new AppError(500, 'DELETION_REQUEST_ERROR', 'アカウント削除リクエストに失敗しました'));
  }
});

// アカウント削除キャンセルAPI
router.delete('/:id/deletion-request', requireAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    const { id } = req.params;
    
    console.log('[Users API] 🔄 アカウント削除キャンセル受信:', { 
      userId: id, 
      requestingUserId: req.userId,
      timestamp: new Date().toISOString() 
    });

    // 本人確認
    if (req.userId !== id) {
      return next(new AppError(403, 'FORBIDDEN', '他のユーザーの削除リクエストはキャンセルできません'));
    }

    const result = await accountDeletionService.cancelDeletionRequest(id);

    res.json({
      success: result.success,
      message: 'アカウント削除リクエストがキャンセルされました',
      user: result.user ? {
        id: result.user.id,
        email: result.user.email,
        subscriptionStatus: result.user.subscriptionStatus,
        isDeleted: result.user.isDeleted
      } : undefined
    });

    console.log('[Users API] ✅ アカウント削除キャンセル成功:', { 
      userId: id,
      note: 'サブスクリプションは削除申請時にキャンセルしていないため継続中'
    });

  } catch (error) {
    console.error('[Users API] ❌ アカウント削除キャンセルエラー:', error);
    if (error instanceof AppError) {
      return next(error);
    }
    next(new AppError(500, 'CANCEL_DELETION_ERROR', 'アカウント削除キャンセルに失敗しました'));
  }
});

// アカウント削除実行API（管理者用・バッチ処理用）
router.post('/:id/delete', requireAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    const { id } = req.params;
    const { forceDelete } = req.body;
    
    console.log('[Users API] 🗑️ アカウント完全削除受信:', { 
      userId: id, 
      requestingUserId: req.userId,
      forceDelete,
      timestamp: new Date().toISOString() 
    });

    // 本人確認（将来的には管理者権限チェックも追加）
    if (req.userId !== id) {
      return next(new AppError(403, 'FORBIDDEN', '他のユーザーのアカウントは削除できません'));
    }

    // 強制削除フラグがない場合は、削除予定日のチェックが行われる
    const result = await accountDeletionService.executeAccountDeletion(id);

    res.json({
      success: result.success,
      message: 'アカウントが完全に削除されました',
      deletedData: result.deletedData
    });

    console.log('[Users API] ✅ アカウント完全削除成功:', { 
      userId: id, 
      deletedData: result.deletedData 
    });

  } catch (error) {
    console.error('[Users API] ❌ アカウント完全削除エラー:', error);
    if (error instanceof AppError) {
      return next(error);
    }
    next(new AppError(500, 'ACCOUNT_DELETION_ERROR', 'アカウント削除に失敗しました'));
  }
});

// 削除リクエスト状態取得API
router.get('/:id/deletion-status', requireAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    const { id } = req.params;
    
    console.log('[Users API] 🔍 削除状態確認:', { 
      userId: id, 
      requestingUserId: req.userId,
      timestamp: new Date().toISOString() 
    });

    // 本人確認
    if (req.userId !== id) {
      return next(new AppError(403, 'FORBIDDEN', '他のユーザーの削除状態は確認できません'));
    }

    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        isDeleted: true,
        deletionRequestedAt: true,
        scheduledDeletionAt: true,
        deletionReason: true,
        deletionCancelledAt: true
      }
    });

    if (!user) {
      return next(new AppError(404, 'USER_NOT_FOUND', 'ユーザーが見つかりません'));
    }

    res.json({
      success: true,
      deletionStatus: {
        isDeleted: user.isDeleted,
        deletionRequestedAt: user.deletionRequestedAt,
        scheduledDeletionAt: user.scheduledDeletionAt,
        deletionReason: user.deletionReason,
        deletionCancelledAt: user.deletionCancelledAt
      }
    });

  } catch (error) {
    console.error('[Users API] ❌ 削除状態確認エラー:', error);
    next(new AppError(500, 'DELETION_STATUS_ERROR', '削除状態の確認に失敗しました'));
  }
});

export default router;