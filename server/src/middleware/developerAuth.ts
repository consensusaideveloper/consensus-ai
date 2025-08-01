import { Response, NextFunction } from 'express';
import { AppError } from './errorHandler';
import { AuthenticatedRequest } from './auth';
import { adminDatabase, isFirebaseInitialized } from '../lib/firebase-admin';
import { prisma } from '../lib/database';

const MASTER_EMAIL = 'yuto.masamura@gmail.com';

/**
 * 開発者権限を確認するミドルウェア
 */
export const requireDeveloperAuth = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.userId;
    
    if (!userId) {
      throw new AppError(401, 'UNAUTHORIZED', '認証が必要です');
    }

    // ユーザー情報を取得
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      throw new AppError(404, 'USER_NOT_FOUND', 'ユーザーが見つかりません');
    }

    // マスター管理者の場合は即座に許可
    if (user.email === MASTER_EMAIL) {
      next();
      return;
    }

    // Firebase開発者権限を確認
    if (isFirebaseInitialized && adminDatabase) {
      try {
        const developerKey = user.email.replace('.', '_');
        const developerRef = adminDatabase.ref(`developers/${developerKey}`);
        const snapshot = await developerRef.get();
        const developerData = snapshot.val();

        if (developerData && developerData.isActive) {
          next();
          return;
        }
      } catch (error) {
        console.error('[DeveloperAuth] Firebase権限確認エラー:', error);
        // Firebase確認に失敗した場合はデフォルトで拒否
      }
    }

    // 権限がない場合
    throw new AppError(403, 'FORBIDDEN', '開発者権限が必要です');

  } catch (error) {
    next(error);
  }
};