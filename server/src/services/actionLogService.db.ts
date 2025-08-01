import { prisma } from '../lib/database';
import { database } from '../lib/firebase-admin';
import { AppError } from '../middleware/errorHandler';

export interface ActionLog {
  id: string;
  opinionId: string;
  type: 'comment' | 'status_change' | 'priority_change' | 'dependency_change';
  content: string;
  author: string;
  authorId?: string;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateActionLogRequest {
  opinionId: string;
  type: 'comment' | 'status_change' | 'priority_change' | 'dependency_change';
  content: string;
  author: string;
  authorId?: string;
  metadata?: Record<string, any>;
}

export interface UpdateActionLogRequest {
  content?: string;
  metadata?: Record<string, any>;
}

export class ActionLogService {
  /**
   * 新しいアクションログを作成
   */
  async createActionLog(userId: string, projectId: string, data: CreateActionLogRequest): Promise<ActionLog> {
    try {
      console.log('[ActionLogService] Creating action log:', {
        userId,
        projectId,
        opinionId: data.opinionId,
        type: data.type
      });

      // 意見が存在し、ユーザーのプロジェクトに属することを確認
      const opinion = await prisma.opinion.findFirst({
        where: {
          id: data.opinionId,
          project: {
            id: projectId,
            userId: userId
          }
        },
        include: {
          project: true
        }
      });

      if (!opinion) {
        throw new AppError(
          404,
          'OPINION_NOT_FOUND',
          'Opinion not found or access denied'
        );
      }

      // 1. SQLiteにアクションログを作成
      const actionLog = await prisma.actionLog.create({
        data: {
          opinionId: data.opinionId,
          type: data.type,
          content: data.content,
          author: data.author,
          authorId: data.authorId,
          metadata: data.metadata ? JSON.stringify(data.metadata) : null
        }
      });

      console.log('[ActionLogService] ✅ SQLite action log created:', actionLog.id);

      // 2. Firebase同期を実行
      try {
        await this.syncActionLogToFirebase(userId, opinion.project.firebaseId || projectId, actionLog);
        console.log('[ActionLogService] ✅ Firebase sync completed');
      } catch (firebaseError) {
        console.error('[ActionLogService] ❌ Firebase sync failed:', firebaseError);
        
        // Firebase同期失敗時はSQLiteをロールバック
        await prisma.actionLog.delete({
          where: { id: actionLog.id }
        });
        
        throw new AppError(
          500,
          'FIREBASE_SYNC_ERROR',
          'Action log creation failed due to Firebase sync error',
          firebaseError
        );
      }

      return this.mapPrismaToActionLog(actionLog);
    } catch (error) {
      console.error('[ActionLogService] ❌ Create action log error:', error);
      
      if (error instanceof AppError) {
        throw error;
      }
      
      throw new AppError(
        500,
        'ACTION_LOG_CREATE_ERROR',
        'Failed to create action log',
        error
      );
    }
  }

  /**
   * 意見IDに基づいてアクションログを取得
   */
  async getActionLogs(userId: string, projectId: string, opinionId: string): Promise<ActionLog[]> {
    try {
      console.log('[ActionLogService] Getting action logs:', {
        userId,
        projectId,
        opinionId
      });

      // 意見が存在し、ユーザーのプロジェクトに属することを確認
      const opinion = await prisma.opinion.findFirst({
        where: {
          id: opinionId,
          project: {
            id: projectId,
            userId: userId
          }
        }
      });

      if (!opinion) {
        throw new AppError(
          404,
          'OPINION_NOT_FOUND',
          'Opinion not found or access denied'
        );
      }

      // アクションログを取得（時系列順）
      const actionLogs = await prisma.actionLog.findMany({
        where: {
          opinionId: opinionId
        },
        orderBy: {
          createdAt: 'asc'
        }
      });

      console.log('[ActionLogService] ✅ Retrieved action logs:', actionLogs.length);

      return actionLogs.map(log => this.mapPrismaToActionLog(log));
    } catch (error) {
      console.error('[ActionLogService] ❌ Get action logs error:', error);
      
      if (error instanceof AppError) {
        throw error;
      }
      
      throw new AppError(
        500,
        'ACTION_LOG_GET_ERROR',
        'Failed to get action logs',
        error
      );
    }
  }

  /**
   * アクションログを更新
   */
  async updateActionLog(userId: string, projectId: string, logId: string, updates: UpdateActionLogRequest): Promise<ActionLog> {
    try {
      console.log('[ActionLogService] Updating action log:', {
        userId,
        projectId,
        logId,
        updates
      });

      // アクションログが存在し、ユーザーのプロジェクトに属することを確認
      const existingLog = await prisma.actionLog.findFirst({
        where: {
          id: logId,
          opinion: {
            project: {
              id: projectId,
              userId: userId
            }
          }
        },
        include: {
          opinion: {
            include: {
              project: true
            }
          }
        }
      });

      if (!existingLog) {
        throw new AppError(
          404,
          'ACTION_LOG_NOT_FOUND',
          'Action log not found or access denied'
        );
      }

      // 更新データを準備
      const updateData: any = {};
      
      if (updates.content !== undefined) {
        updateData.content = updates.content;
      }
      
      if (updates.metadata !== undefined) {
        updateData.metadata = updates.metadata ? JSON.stringify(updates.metadata) : null;
      }

      // 1. SQLiteを更新
      const actionLog = await prisma.actionLog.update({
        where: { id: logId },
        data: updateData
      });

      console.log('[ActionLogService] ✅ SQLite update completed');

      // 2. Firebase同期を実行
      await this.syncActionLogToFirebase(userId, existingLog.opinion.project.firebaseId || projectId, actionLog);

      return this.mapPrismaToActionLog(actionLog);
    } catch (error) {
      console.error('[ActionLogService] ❌ Update action log error:', error);
      
      if (error instanceof AppError) {
        throw error;
      }
      
      throw new AppError(
        500,
        'ACTION_LOG_UPDATE_ERROR',
        'Failed to update action log',
        error
      );
    }
  }

  /**
   * アクションログを削除
   */
  async deleteActionLog(userId: string, projectId: string, logId: string): Promise<void> {
    try {
      console.log('[ActionLogService] Deleting action log:', {
        userId,
        projectId,
        logId
      });

      // アクションログが存在し、ユーザーのプロジェクトに属することを確認
      const existingLog = await prisma.actionLog.findFirst({
        where: {
          id: logId,
          opinion: {
            project: {
              id: projectId,
              userId: userId
            }
          }
        },
        include: {
          opinion: {
            include: {
              project: true
            }
          }
        }
      });

      if (!existingLog) {
        throw new AppError(
          404,
          'ACTION_LOG_NOT_FOUND',
          'Action log not found or access denied'
        );
      }

      // 1. SQLiteから削除
      await prisma.actionLog.delete({
        where: { id: logId }
      });

      console.log('[ActionLogService] ✅ SQLite delete completed');

      // 2. Firebaseから削除
      await this.removeActionLogFromFirebase(userId, existingLog.opinion.project.firebaseId || projectId, existingLog.opinionId, logId);

      console.log('[ActionLogService] ✅ Action log deleted successfully');
    } catch (error) {
      console.error('[ActionLogService] ❌ Delete action log error:', error);
      
      if (error instanceof AppError) {
        throw error;
      }
      
      throw new AppError(
        500,
        'ACTION_LOG_DELETE_ERROR',
        'Failed to delete action log',
        error
      );
    }
  }

  /**
   * Firebase同期
   */
  private async syncActionLogToFirebase(userId: string, firebaseProjectId: string, actionLog: any): Promise<void> {
    try {
      // Firebase同期無効化チェック
      if (process.env.FIREBASE_DISABLE_SYNC === 'true') {
        console.log('[ActionLogService] ⚠️ Firebase sync disabled');
        return;
      }
      
      if (!database) {
        console.log('[ActionLogService] ⚠️ Firebase database not available');
        return;
      }

      const actionLogRef = database.ref(`users/${userId}/projects/${firebaseProjectId}/opinions/${actionLog.opinionId}/actionLogs/${actionLog.id}`);
      
      const firebaseData = {
        id: actionLog.id,
        type: actionLog.type,
        content: actionLog.content,
        author: actionLog.author,
        authorId: actionLog.authorId || null,
        metadata: actionLog.metadata || null,
        createdAt: actionLog.createdAt instanceof Date ? actionLog.createdAt.toISOString() : actionLog.createdAt,
        updatedAt: actionLog.updatedAt instanceof Date ? actionLog.updatedAt.toISOString() : actionLog.updatedAt,
        lastSyncAt: new Date().toISOString(),
        syncStatus: 'synced'
      };
      
      await actionLogRef.set(firebaseData);
      console.log('[ActionLogService] ✅ Action log synced to Firebase:', actionLog.id);
    } catch (error) {
      console.error('[ActionLogService] ❌ Firebase sync error:', error);
      throw new Error(`Firebase action log sync failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Firebaseからアクションログを削除
   */
  private async removeActionLogFromFirebase(userId: string, firebaseProjectId: string, opinionId: string, logId: string): Promise<void> {
    try {
      if (process.env.FIREBASE_DISABLE_SYNC === 'true') {
        console.log('[ActionLogService] ⚠️ Firebase sync disabled');
        return;
      }
      
      if (!database) {
        console.log('[ActionLogService] ⚠️ Firebase database not available');
        return;
      }

      const actionLogRef = database.ref(`users/${userId}/projects/${firebaseProjectId}/opinions/${opinionId}/actionLogs/${logId}`);
      await actionLogRef.remove();
      
      console.log('[ActionLogService] ✅ Action log removed from Firebase:', logId);
    } catch (error) {
      console.error('[ActionLogService] ❌ Firebase removal error:', error);
      throw new Error(`Firebase action log removal failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * ダッシュボード統計: 総プロジェクト数を取得
   */
  async getTotalProjectsCount(userId: string): Promise<number> {
    try {
      const count = await prisma.project.count({
        where: {
          userId: userId
        }
      });
      return count;
    } catch (error) {
      console.error('[ActionLogService] Get total projects count error:', error);
      return 0;
    }
  }

  /**
   * ダッシュボード統計: アクティブプロジェクト数を取得
   */
  async getActiveProjectsCount(userId: string): Promise<number> {
    try {
      const count = await prisma.project.count({
        where: {
          userId: userId,
          isArchived: false,
          status: {
            in: ['collecting', 'processing', 'paused', 'ready-for-analysis', 'analyzing', 'in-progress', 'READY_FOR_ANALYSIS']
          }
        }
      });
      
      console.log('[ActionLogService] Active projects count:', { userId, count });
      return count;
    } catch (error) {
      console.error('[ActionLogService] Get active projects count error:', error);
      return 0;
    }
  }

  /**
   * ダッシュボード統計: 未対応アクション数を取得
   */
  async getPendingActionsCount(userId: string): Promise<number> {
    try {
      // 未対応・対応中のアクション数をカウント
      const count = await prisma.opinion.count({
        where: {
          project: { 
            userId: userId 
          },
          actionStatus: {
            in: ['unhandled', 'in-progress']
          }
        }
      });
      
      console.log('[ActionLogService] Pending actions count:', { userId, count });
      return count;
    } catch (error) {
      console.error('[ActionLogService] Get pending actions count error:', error);
      return 0;
    }
  }

  /**
   * ダッシュボード統計: ステータス別アクション数を取得
   */
  async getActionStatusBreakdown(userId: string): Promise<{ unhandled: number; inProgress: number }> {
    try {
      const [unhandledCount, inProgressCount] = await Promise.all([
        prisma.opinion.count({
          where: {
            project: { userId: userId },
            actionStatus: 'unhandled'
          }
        }),
        prisma.opinion.count({
          where: {
            project: { userId: userId },
            actionStatus: 'in-progress'
          }
        })
      ]);
      
      console.log('[ActionLogService] Action status breakdown:', { 
        userId, 
        unhandled: unhandledCount, 
        inProgress: inProgressCount 
      });
      
      return {
        unhandled: unhandledCount,
        inProgress: inProgressCount
      };
    } catch (error) {
      console.error('[ActionLogService] Get action status breakdown error:', error);
      return { unhandled: 0, inProgress: 0 };
    }
  }

  /**
   * Prismaモデルをドメインモデルに変換
   */
  private mapPrismaToActionLog(prismaLog: any): ActionLog {
    return {
      id: prismaLog.id,
      opinionId: prismaLog.opinionId,
      type: prismaLog.type as 'comment' | 'status_change' | 'priority_change' | 'dependency_change',
      content: prismaLog.content,
      author: prismaLog.author,
      authorId: prismaLog.authorId,
      metadata: prismaLog.metadata ? JSON.parse(prismaLog.metadata) : undefined,
      createdAt: prismaLog.createdAt,
      updatedAt: prismaLog.updatedAt
    };
  }
}