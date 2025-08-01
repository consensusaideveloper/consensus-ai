import { PrismaClient } from '@prisma/client';
import { FirebaseDataService, FirebaseProject, FirebaseOpinion } from './firebaseDataService';
import { AppError } from '../middleware/errorHandler';

export class DataSyncService {
  private prisma: PrismaClient;
  private firebaseDataService: FirebaseDataService;

  constructor() {
    this.prisma = new PrismaClient();
    this.firebaseDataService = new FirebaseDataService();
  }

  /**
   * Firebase → SQLite プロジェクト同期
   * 既存のProjectレコードを破壊せず、同期フィールドのみ更新
   */
  async syncProjectFromFirebase(projectId: string, userId: string): Promise<void> {
    console.log('[DataSync] 🔄 プロジェクト同期開始', {
      projectId,
      userId,
      timestamp: new Date().toISOString()
    });

    try {
      // 1. Firebaseからプロジェクトデータを取得
      const firebaseProject = await this.firebaseDataService.getProject(projectId, userId);
      if (!firebaseProject) {
        console.log('[DataSync] ⚠️ Firebaseにプロジェクトが存在しません:', projectId);
        return;
      }

      // 2. SQLiteの既存レコードをチェック
      const existingProject = await this.prisma.project.findFirst({
        where: { id: projectId }
      });

      if (existingProject) {
        // 既存レコードを更新（慎重に必要なフィールドのみ）
        await this.prisma.project.update({
          where: { id: projectId },
          data: {
            // 基本情報を同期（既存の重要なフィールドは保持）
            name: firebaseProject.name,
            description: firebaseProject.description,
            status: firebaseProject.status,
            // 動的カウント: opinionsCountフィールドは削除済み
            updatedAt: new Date(),
            // 同期関連フィールドを更新
            firebaseId: firebaseProject.id,
            syncStatus: 'synced',
            lastSyncAt: new Date()
          }
        });

        console.log('[DataSync] ✅ 既存プロジェクトを更新:', {
          projectId,
          name: firebaseProject.name
        });
      } else {
        // 新規レコード作成
        await this.prisma.project.create({
          data: {
            id: projectId,
            userId: userId,
            name: firebaseProject.name,
            description: firebaseProject.description || '',
            status: firebaseProject.status,
            collectionMethod: firebaseProject.collectionMethod,
            // 動的カウント: opinionsCountフィールドは削除済み
            isCompleted: firebaseProject.isCompleted,
            // 同期関連フィールド
            firebaseId: firebaseProject.id,
            syncStatus: 'synced',
            lastSyncAt: new Date()
          }
        });

        console.log('[DataSync] ✅ 新規プロジェクトを作成:', {
          projectId,
          name: firebaseProject.name
        });
      }

      // 同期成功をログ
      
    } catch (error) {
      console.error('[DataSync] ❌ プロジェクト同期エラー:', {
        projectId,
        userId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      
      throw new AppError(500, 'SYNC_ERROR', 'Failed to sync project from Firebase');
    }
  }

  /**
   * Firebase → SQLite 意見同期
   * 既存のOpinionレコードを破壊せず、必要なフィールドのみ同期
   */
  async syncOpinionsFromFirebase(projectId: string, userId: string): Promise<void> {
    console.log('[DataSync] 🔄 意見同期開始', {
      projectId,
      userId,
      timestamp: new Date().toISOString()
    });

    try {
      // 1. 正しいプロジェクトを取得
      let targetProject = await this.prisma.project.findFirst({
        where: { id: projectId, userId }
      });

      // Firebase IDの場合はfirebaseIdフィールドで検索
      if (!targetProject && projectId.startsWith('-')) {
        console.log('[DataSync] Firebase ID検出、firebaseIdフィールドで検索:', projectId);
        targetProject = await this.prisma.project.findFirst({
          where: { firebaseId: projectId, userId }
        });
      }

      if (!targetProject) {
        console.error('[DataSync] 対象プロジェクトが見つかりません:', projectId);
        throw new Error(`Project not found: ${projectId}`);
      }

      console.log('[DataSync] 🎯 対象プロジェクト特定:', {
        sqliteId: targetProject.id,
        firebaseId: targetProject.firebaseId,
        name: targetProject.name
      });

      // 2. Firebaseから意見データを取得
      const firebaseOpinions = await this.firebaseDataService.getOpinions(projectId, userId);
      console.log('[DataSync] 📝 Firebase意見データ取得:', firebaseOpinions.length + '件');

      let syncedCount = 0;
      let updatedCount = 0;
      let createdCount = 0;

      // 3. 各意見を同期
      for (const firebaseOpinion of firebaseOpinions) {
        try {
          // 既存レコードをチェック
          const existingOpinion = await this.prisma.opinion.findFirst({
            where: { 
              OR: [
                { id: firebaseOpinion.id },
                { firebaseId: firebaseOpinion.id }
              ]
            }
          });

          if (existingOpinion) {
            // 既存レコードを更新
            await this.prisma.opinion.update({
              where: { id: existingOpinion.id },
              data: {
                content: firebaseOpinion.content,
                sentiment: firebaseOpinion.sentiment,
                characterCount: firebaseOpinion.characterCount,
                isBookmarked: firebaseOpinion.isBookmarked,
                // 同期関連フィールド
                firebaseId: firebaseOpinion.id,
                syncStatus: 'synced',
                lastSyncAt: new Date()
              }
            });
            updatedCount++;
          } else {
            // 新規レコード作成
            await this.prisma.opinion.create({
              data: {
                id: firebaseOpinion.id, // FirebaseのIDを使用
                projectId: targetProject.id, // 正しいSQLite project IDを使用
                content: firebaseOpinion.content,
                sentiment: firebaseOpinion.sentiment,
                characterCount: firebaseOpinion.characterCount,
                isBookmarked: firebaseOpinion.isBookmarked,
                submittedAt: new Date(firebaseOpinion.submittedAt),
                // 同期関連フィールド
                firebaseId: firebaseOpinion.id,
                syncStatus: 'synced',
                lastSyncAt: new Date()
              }
            });
            createdCount++;
          }
          syncedCount++;
        } catch (opinionError) {
          console.error('[DataSync] ❌ 個別意見同期エラー:', {
            opinionId: firebaseOpinion.id,
            error: opinionError instanceof Error ? opinionError.message : 'Unknown error'
          });
        }
      }

      console.log('[DataSync] ✅ 意見同期完了:', {
        projectId,
        total: firebaseOpinions.length,
        synced: syncedCount,
        created: createdCount,
        updated: updatedCount
      });

      
    } catch (error) {
      console.error('[DataSync] ❌ 意見同期エラー:', {
        projectId,
        userId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      
      throw new AppError(500, 'SYNC_ERROR', 'Failed to sync opinions from Firebase');
    }
  }

  /**
   * プロジェクトの同期状態をチェック（簡略化版）
   * 古いデータの場合はfalseを返す
   */
  async isProjectSynced(projectId: string, maxAgeMinutes: number = 5): Promise<boolean> {
    try {
      // 簡略化：プロジェクトが存在すれば同期済みとして扱う
      const project = await this.prisma.project.findFirst({
        where: { id: projectId },
        select: { id: true, updatedAt: true }
      });

      if (!project) {
        console.log('[DataSync] プロジェクトが見つからない:', projectId);
        return false;
      }

      // 最近更新されていれば同期済みとして扱う
      const ageMinutes = (Date.now() - project.updatedAt.getTime()) / (1000 * 60);
      const isSynced = ageMinutes <= maxAgeMinutes;
      console.log('[DataSync] プロジェクト同期チェック:', { projectId, ageMinutes, isSynced });
      return isSynced;
    } catch (error) {
      console.error('[DataSync] 同期状態チェックエラー:', error);
      return false;
    }
  }

  /**
   * 意見の同期状態をチェック（簡略化版）
   */
  async areOpinionsSynced(projectId: string, maxAgeMinutes: number = 5): Promise<boolean> {
    try {
      // 簡略化：プロジェクトに意見が存在すれば同期済みとして扱う
      const opinionsCount = await this.prisma.opinion.count({
        where: { projectId: projectId }
      });

      console.log('[DataSync] 意見同期チェック:', { projectId, opinionsCount });
      
      // 意見が存在すれば同期済みとして扱う
      return opinionsCount > 0;
    } catch (error) {
      console.error('[DataSync] 意見同期状態チェックエラー:', error);
      return false;
    }
  }


  /**
   * SQLiteから同期されたデータを高速取得
   * AI分析で使用するための最適化されたクエリ
   */
  async getProjectWithOpinions(projectId: string, userId: string) {
    console.log('[DataSync] 🚀 高速データ取得開始:', { projectId, userId });

    try {
      // First try exact ID match
      let project = await this.prisma.project.findFirst({
        where: { 
          id: projectId, 
          userId: userId 
        },
        include: {
          opinions: {
            orderBy: { submittedAt: 'desc' }
          },
          topics: {
            orderBy: { count: 'desc' },
            take: 10  // 上位10トピックのみ
          }
        }
      });

      // If not found and looks like Firebase ID, try finding by Firebase ID reference
      if (!project && projectId.startsWith('-')) {
        console.log('[DataSync] Firebase ID detected, searching for project with Firebase reference:', projectId);
        
        project = await this.prisma.project.findFirst({
          where: { 
            userId,
            OR: [
              { firebaseId: projectId },
              { description: { contains: projectId } },
              { name: { contains: projectId } }
            ]
          },
          include: {
            opinions: {
              orderBy: { submittedAt: 'desc' }
            },
            topics: {
              orderBy: { count: 'desc' },
              take: 10
            }
          }
        });

        if (project) {
          console.log('[DataSync] ✅ Found project by Firebase ID reference:', {
            requestedId: projectId,
            foundId: project.id,
            firebaseId: project.firebaseId
          });
        }
      }

      if (!project) {
        throw new AppError(404, 'PROJECT_NOT_FOUND', 'Project not found in synchronized data');
      }

      console.log('[DataSync] ✅ 高速データ取得完了:', {
        projectId,
        realId: project.id,
        opinions: project.opinions.length,
        topics: project.topics.length,
        syncStatus: project.syncStatus,
        lastSync: project.lastSyncAt
      });

      return project;
    } catch (error) {
      console.error('[DataSync] ❌ 高速データ取得エラー:', error);
      throw error;
    }
  }

  /**
   * 同期状況の統計情報を取得
   */
  async getSyncStats(userId: string) {
    try {
      const [
        totalProjects,
        syncedProjects, 
        pendingProjects
      ] = await Promise.all([
        this.prisma.project.count({ where: { userId } }),
        this.prisma.project.count({ where: { userId, syncStatus: 'synced' } }),
        this.prisma.project.count({ where: { userId, syncStatus: 'pending' } })
      ]);

      return {
        projects: {
          total: totalProjects,
          synced: syncedProjects,
          pending: pendingProjects,
          syncRate: totalProjects > 0 ? Math.round((syncedProjects / totalProjects) * 100) : 0
        }
      };
    } catch (error) {
      console.error('[DataSync] 統計取得エラー:', error);
      return null;
    }
  }

  /**
   * リソースのクリーンアップ
   */
  async cleanup(): Promise<void> {
    await this.prisma.$disconnect();
  }
}