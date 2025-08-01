import { Opinion, CreateOpinionRequest, UpdateOpinionRequest } from '../types';
import { AppError } from '../middleware/errorHandler';
import { prisma } from '../lib/database';
import { database } from '../lib/firebase-admin';
import { AIServiceManager } from './aiServiceManager';
// SQLite uses string fields instead of enums

export class OpinionService {
    // Bulk creation method that validates project exists (for Firebase compatibility)
    async createOpinionBulk(projectId: string, userId: string, opinionData: CreateOpinionRequest): Promise<Opinion> {
        let createdOpinionId: string | null = null;
        let project: any = null;
        
        try {
            console.log('[OpinionService] createOpinionBulk called with:', {
                projectId,
                userId,
                opinionData
            });

            // Verify project exists - handle both SQLite ID and Firebase ID
            project = await prisma.project.findFirst({
                where: { id: projectId, userId },
            });

            // If not found and ID looks like Firebase ID, try finding by firebaseId field
            if (!project && projectId.startsWith('-')) {
                console.log('[OpinionService] Firebase ID detected, searching by firebaseId field:', projectId);
                project = await prisma.project.findFirst({
                    where: { 
                        userId,
                        firebaseId: projectId
                    },
                });
            }

            if (!project) {
                throw new AppError(
                    404,
                    'PROJECT_NOT_FOUND',
                    `Project not found for bulk creation: ${projectId}`
                );
            }

            console.log('[OpinionService] Using project ID:', project.id);

            // AI sentiment analysis (一括登録最適化: タイムアウト短縮)
            const sentiment = await this.analyzeSentimentBulk(opinionData.content);

            // Prepare data for Prisma create - use actual project ID from SQLite
            const createData: any = {
                content: opinionData.content,
                sentiment: sentiment.toUpperCase(),
                characterCount: opinionData.characterCount || opinionData.content.length,
                projectId: project.id, // Use the actual SQLite project ID
                isBookmarked: opinionData.isBookmarked || false,
            };

            // Handle submittedAt field
            if (opinionData.submittedAt) {
                createData.submittedAt = new Date(opinionData.submittedAt);
            }

            // Only add topicId if it's provided and not null/undefined
            if (opinionData.topicId) {
                createData.topicId = opinionData.topicId;
            }

            // Handle metadata field
            if (opinionData.metadata) {
                createData.metadata = typeof opinionData.metadata === 'string' 
                    ? opinionData.metadata 
                    : JSON.stringify(opinionData.metadata);
            }

            console.log('[OpinionService] Creating opinion with data:', createData);

            // 1. SQLiteに意見作成
            const prismaOpinion = await prisma.opinion.create({
                data: createData,
            });
            createdOpinionId = prismaOpinion.id;

            console.log('[OpinionService] ✅ SQLite opinion created:', {
                opinionId: prismaOpinion.id,
                projectId: project.id
            });
            
            // 2. Firebase同期を実行 - CLAUDE.md要件に従い原子性を保証
            // 一括登録時はopinionsCountの個別更新をスキップ（最後に一括更新）
            try {
                await this.syncOpinionToFirebase(userId, project.firebaseId || projectId, prismaOpinion, 'create', { skipCountUpdate: true });
                console.log('[OpinionService] ✅ Firebase同期完了');
            } catch (firebaseError) {
                console.error('[OpinionService] ❌ Firebase同期失敗 - SQLite記録をロールバック中:', firebaseError);
                
                // 原子性保証：Firebase同期失敗時はSQLite記録をロールバック
                if (createdOpinionId) {
                    try {
                        await prisma.opinion.delete({
                            where: { id: createdOpinionId }
                        });
                        // 動的カウント: opinionsCountフィールドの更新は不要（getOpinionsCountで動的に計算）
                        console.log('[OpinionService] 🔄 SQLiteロールバック（意見削除）完了');
                    } catch (rollbackError) {
                        console.error('[OpinionService] ❌ SQLiteロールバック失敗:', rollbackError);
                    }
                }
                
                throw new AppError(
                    500,
                    'FIREBASE_SYNC_FAILED',
                    `Firebase同期に失敗しました: ${firebaseError instanceof Error ? firebaseError.message : firebaseError}`
                );
            }
            
            return this.mapPrismaToOpinion(prismaOpinion);
        } catch (error) {
            console.error('[OpinionService] ❌ createOpinionBulk failed:', {
                error: error instanceof Error ? error instanceof Error ? error.message : 'Unknown error' : error,
                stack: error instanceof Error ? error.stack : undefined,
                projectId,
                userId,
                opinionData
            });

            // CLAUDE.md要件: Firebase同期失敗時はSQLiteをロールバック
            if (createdOpinionId && error instanceof Error && error.message.includes('Firebase')) {
                try {
                    await prisma.opinion.delete({ where: { id: createdOpinionId } });
                    // 動的カウント: opinionsCountフィールドの更新は不要（getOpinionsCountで動的に計算）
                    console.log('[OpinionService] 🔄 SQLite rollback completed');
                } catch (rollbackError) {
                    console.error('[OpinionService] ❌ SQLite rollback failed:', rollbackError);
                }
            }

            throw new AppError(
                500,
                'OPINION_CREATION_ERROR',
                `Opinion creation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
                { originalError: error }
            );
        }
    }

    async createOpinion(projectId: string, userId: string, opinionData: CreateOpinionRequest): Promise<Opinion> {
        let createdOpinionId: string | null = null;
        let projectUpdated = false;
        
        try {
            // Verify project exists and belongs to user - handle both SQLite ID and Firebase ID
            let project = await prisma.project.findFirst({
                where: { id: projectId, userId },
            });

            // If not found and ID looks like Firebase ID, try finding by firebaseId field
            if (!project && projectId.startsWith('-')) {
                console.log('[OpinionService] Firebase ID detected, searching by firebaseId field:', projectId);
                project = await prisma.project.findFirst({
                    where: { 
                        userId,
                        firebaseId: projectId
                    },
                });
            }

            if (!project) {
                throw new AppError(
                    404,
                    'PROJECT_NOT_FOUND',
                    'Project not found'
                );
            }

            // AI sentiment analysis
            const sentiment = await this.analyzeSentiment(opinionData.content);

            // Prepare data for Prisma create
            const createData: any = {
                content: opinionData.content,
                sentiment: sentiment.toUpperCase(),
                characterCount: opinionData.content.length,
                projectId: project.id, // Use the actual SQLite project ID
                topicId: opinionData.topicId,
            };

            // Handle metadata field
            if (opinionData.metadata) {
                createData.metadata = typeof opinionData.metadata === 'string' 
                    ? opinionData.metadata 
                    : JSON.stringify(opinionData.metadata);
            }

            // 1. SQLiteに意見作成
            const prismaOpinion = await prisma.opinion.create({
                data: createData,
            });
            createdOpinionId = prismaOpinion.id;

            // 動的カウント: opinionsCountフィールドの更新は不要（getOpinionsCountで動的に計算）
            // projectUpdated = true; // 動的カウント使用により不要
            console.log('[OpinionService] ✅ SQLite opinion created and opinionsCount incremented:', {
                opinionId: prismaOpinion.id,
                projectId: project.id
            });

            // 2. Firebase同期を実行 - CLAUDE.md要件に従い原子性を保証
            try {
                await this.syncOpinionToFirebase(userId, project.firebaseId || projectId, prismaOpinion, 'create');
                console.log('[OpinionService] ✅ Firebase同期成功');
            } catch (firebaseError) {
                console.error('[OpinionService] ❌ Firebase同期失敗 - SQLite記録をロールバック中:', firebaseError);
                
                // 原子性保証：Firebase同期失敗時はSQLite記録をロールバック
                if (createdOpinionId) {
                    try {
                        await prisma.opinion.delete({
                            where: { id: createdOpinionId }
                        });
                        // 動的カウント: opinionsCountフィールドの更新は不要（getOpinionsCountで動的に計算）
                        console.log('[OpinionService] 🔄 SQLiteロールバック（意見削除）完了');
                    } catch (rollbackError) {
                        console.error('[OpinionService] ❌ SQLiteロールバック失敗:', rollbackError);
                    }
                }
                
                throw new AppError(
                    500,
                    'FIREBASE_SYNC_FAILED',
                    `Firebase同期に失敗しました: ${firebaseError instanceof Error ? firebaseError.message : firebaseError}`
                );
            }

            // 🔥 Phase 3: 収集統計をリアルタイム更新
            try {
                await this.updateCollectionStats(project.firebaseId || projectId, userId);
                console.log('[OpinionService] ✅ 収集統計更新成功');
            } catch (statsError) {
                console.error('[OpinionService] ⚠️ 収集統計更新失敗:', statsError);
                // 統計更新失敗でもメイン処理は継続
            }

            return this.mapPrismaToOpinion(prismaOpinion);
        } catch (error) {
            console.error('[OpinionService] ❌ Opinion creation failed:', error);
            
            // SQLite操作の実際のエラーのみを処理
            if (error instanceof AppError) {
                throw error;
            }
            
            // SQLite操作失敗時のみロールバック
            if (createdOpinionId && !(error instanceof Error && error.message.includes('Firebase'))) {
                try {
                    // 意見を削除
                    await prisma.opinion.delete({ where: { id: createdOpinionId } });
                    
                    // プロジェクトのカウントを元に戻す
                    if (projectUpdated) {
                        const project = await prisma.project.findFirst({
                            where: { OR: [{ id: projectId }, { firebaseId: projectId }] }
                        });
                        // 動的カウント: opinionsCountフィールドの更新は不要（getOpinionsCountで動的に計算）
                    }
                    
                    console.log('[OpinionService] 🔄 SQLite rollback completed');
                } catch (rollbackError) {
                    console.error('[OpinionService] ❌ SQLite rollback failed:', rollbackError);
                }
            }
            
            throw new AppError(
                500,
                'OPINION_CREATION_ERROR',
                `Opinion creation failed: ${error instanceof Error ? error.message : 'Unknown error'}`
            );
        }
    }

    async getOpinionsByProject(
        projectId: string, 
        userId: string, 
        filters?: {
            analysisStatus?: 'all' | 'analyzed' | 'unanalyzed' | 'excluded';
            sortBy?: 'submittedAt' | 'analyzedAt' | 'analysisStatus';
            sortOrder?: 'asc' | 'desc';
        }
    ): Promise<Opinion[]> {
        try {
            // Verify project exists and belongs to user - handle both SQLite ID and Firebase ID
            let project = await prisma.project.findFirst({
                where: { id: projectId, userId },
            });

            // If not found and ID looks like Firebase ID, try finding by firebaseId field
            if (!project && projectId.startsWith('-')) {
                console.log('[OpinionService] Firebase ID detected, searching by firebaseId field:', projectId);
                project = await prisma.project.findFirst({
                    where: { 
                        userId,
                        firebaseId: projectId
                    },
                });
            }

            if (!project) {
                throw new AppError(
                    404,
                    'PROJECT_NOT_FOUND',
                    'Project not found'
                );
            }

            // Build where clause with analysis status filter
            const whereClause: any = { projectId: project.id };
            
            if (filters?.analysisStatus && filters.analysisStatus !== 'all') {
                // 修正: OpinionAnalysisStateテーブルの存在有無で分析状態を判定
                if (filters.analysisStatus === 'analyzed') {
                    // 分析済み: OpinionAnalysisStateレコードが存在し、lastAnalyzedAtがnullでない
                    whereClause.analysisState = {
                        lastAnalyzedAt: { not: null }
                    };
                } else if (filters.analysisStatus === 'unanalyzed') {
                    // 未分析: OpinionAnalysisStateレコードが存在しないか、lastAnalyzedAtがnull
                    whereClause.OR = [
                        { analysisState: null },
                        { analysisState: { lastAnalyzedAt: null } }
                    ];
                }
            }

            // Build order by clause
            const orderBy: any = {};
            const sortBy = filters?.sortBy || 'submittedAt';
            const sortOrder = filters?.sortOrder || 'desc';
            
            switch (sortBy) {
                case 'analyzedAt':
                    orderBy.analyzedAt = sortOrder;
                    break;
                case 'analysisStatus':
                    orderBy.analysisStatus = sortOrder;
                    break;
                case 'submittedAt':
                default:
                    orderBy.submittedAt = sortOrder;
                    break;
            }

            console.log('[OpinionService] Query filters:', {
                projectId: project.id,
                analysisStatus: filters?.analysisStatus,
                sortBy,
                sortOrder,
                whereClause: JSON.stringify(whereClause, null, 2)
            });

            // 修正: LEFT JOINでOpinionAnalysisStateを取得し、レコードが存在しない意見も含める
            const prismaOpinions = await prisma.opinion.findMany({
                where: whereClause,
                orderBy,
                include: {
                    analysisState: true, // LEFT JOINでOpinionAnalysisStateを含める（存在しない場合はnull）
                    stanceAnalyses: true // 立場分析データも含める
                }
            });

            console.log('[OpinionService] Query result:', {
                totalOpinions: prismaOpinions.length,
                analyzedCount: prismaOpinions.filter(op => op.analysisState?.lastAnalyzedAt).length,
                unanalyzedCount: prismaOpinions.filter(op => !op.analysisState?.lastAnalyzedAt).length
            });

            return prismaOpinions.map(this.mapPrismaToOpinion);
        } catch (error) {
            if (error instanceof AppError) {
                throw error;
            }
            throw new AppError(
                500,
                'OPINIONS_FETCH_ERROR',
                'Failed to fetch opinions',
                error
            );
        }
    }

    async getOpinion(id: string, userId: string): Promise<Opinion> {
        try {
            console.log('[OpinionService] 🔍 個別意見取得開始:', {
                opinionId: id,
                userId,
                timestamp: new Date().toISOString()
            });

            const prismaOpinion = await prisma.opinion.findFirst({
                where: {
                    id,
                    project: {
                        userId,
                    },
                },
                include: {
                    analysisState: true,
                    project: true
                }
            });

            if (!prismaOpinion) {
                throw new AppError(
                    404,
                    'OPINION_NOT_FOUND',
                    'Opinion not found'
                );
            }

            console.log('[OpinionService] ✅ 個別意見取得成功:', {
                opinionId: prismaOpinion.id,
                projectId: prismaOpinion.projectId,
                isBookmarked: prismaOpinion.isBookmarked,
                sentiment: prismaOpinion.sentiment
            });

            return this.mapPrismaToOpinion(prismaOpinion);
        } catch (error) {
            console.error('[OpinionService] ❌ 個別意見取得エラー:', error);
            
            if (error instanceof AppError) {
                throw error;
            }
            throw new AppError(
                500,
                'OPINION_FETCH_ERROR',
                'Failed to fetch opinion',
                error
            );
        }
    }

    async updateOpinion(id: string, userId: string, updates: UpdateOpinionRequest): Promise<Opinion> {
        let originalData: any = null;
        
        try {
            // Check if opinion exists and belongs to user's project
            const existingOpinion = await this.getOpinion(id, userId);
            
            // 更新前のデータを保存（ロールバック用）
            const originalOpinion = await prisma.opinion.findUnique({ where: { id } });
            if (!originalOpinion) {
                throw new AppError(404, 'UPDATE_NOT_FOUND', 'Opinion not found for update');
            }
            originalData = {
                isBookmarked: originalOpinion.isBookmarked,
                topicId: originalOpinion.topicId,
                actionStatus: originalOpinion.actionStatus,
                actionStatusReason: originalOpinion.actionStatusReason,
                actionStatusUpdatedAt: originalOpinion.actionStatusUpdatedAt,
                priorityLevel: originalOpinion.priorityLevel,
                priorityReason: originalOpinion.priorityReason,
                priorityUpdatedAt: originalOpinion.priorityUpdatedAt,
                dueDate: originalOpinion.dueDate,
                actionLogs: originalOpinion.actionLogs
            };

            const updateData: any = {};
            
            if (updates.isBookmarked !== undefined) {
                updateData.isBookmarked = updates.isBookmarked;
            }
            if (updates.topicId !== undefined) {
                updateData.topicId = updates.topicId;
            }
            // Action-related field updates
            if (updates.actionStatus !== undefined) {
                updateData.actionStatus = updates.actionStatus;
            }
            if (updates.actionStatusReason !== undefined) {
                updateData.actionStatusReason = updates.actionStatusReason;
            }
            if (updates.actionStatusUpdatedAt !== undefined) {
                updateData.actionStatusUpdatedAt = typeof updates.actionStatusUpdatedAt === 'string' 
                    ? new Date(updates.actionStatusUpdatedAt) 
                    : updates.actionStatusUpdatedAt;
            }
            if (updates.priorityLevel !== undefined) {
                updateData.priorityLevel = updates.priorityLevel;
            }
            if (updates.priorityReason !== undefined) {
                updateData.priorityReason = updates.priorityReason;
            }
            if (updates.priorityUpdatedAt !== undefined) {
                updateData.priorityUpdatedAt = typeof updates.priorityUpdatedAt === 'string' 
                    ? new Date(updates.priorityUpdatedAt) 
                    : updates.priorityUpdatedAt;
            }
            if (updates.dueDate !== undefined) {
                updateData.dueDate = typeof updates.dueDate === 'string' 
                    ? new Date(updates.dueDate) 
                    : updates.dueDate;
            }
            if (updates.actionLogs !== undefined) {
                updateData.actionLogs = updates.actionLogs;
            }

            // 1. SQLiteを更新
            const prismaOpinion = await prisma.opinion.update({
                where: { id },
                data: updateData,
                include: {
                    project: true
                }
            });
            console.log('[OpinionService] ✅ SQLite update completed:', id);

            // 2. Firebase同期を実行 - CLAUDE.md要件に従い原子性を保証
            await this.syncOpinionToFirebase(userId, prismaOpinion.project.firebaseId || prismaOpinion.projectId, prismaOpinion, 'update');

            return this.mapPrismaToOpinion(prismaOpinion);
        } catch (error) {
            console.error('[OpinionService] ❌ Opinion update failed:', error);
            
            // CLAUDE.md要件: Firebase同期失敗時はSQLiteをロールバック
            if (originalData && error instanceof Error && error.message.includes('Firebase')) {
                try {
                    await prisma.opinion.update({
                        where: { id },
                        data: originalData
                    });
                    console.log('[OpinionService] 🔄 SQLite rollback completed');
                } catch (rollbackError) {
                    console.error('[OpinionService] ❌ SQLite rollback failed:', rollbackError);
                }
            }
            
            if (error instanceof AppError) {
                throw error;
            }
            throw new AppError(
                500,
                'OPINION_UPDATE_ERROR',
                `Opinion update failed: ${error instanceof Error ? error.message : 'Unknown error'}`
            );
        }
    }

    async deleteOpinion(id: string, userId: string): Promise<void> {
        let deletedOpinion: any = null;
        let projectUpdated = false;
        
        try {
            // Check if opinion exists and belongs to user's project
            const opinion = await this.getOpinion(id, userId);
            
            // Get project info for Firebase sync
            const project = await prisma.project.findUnique({
                where: { id: opinion.projectId }
            });

            // 削除前のデータを保存（ロールバック用）
            const opinionToDelete = await prisma.opinion.findUnique({ where: { id } });
            if (!opinionToDelete) {
                throw new AppError(404, 'DELETE_NOT_FOUND', 'Opinion not found for deletion');
            }
            deletedOpinion = opinionToDelete;

            // 1. SQLiteから削除
            await prisma.opinion.delete({
                where: { id },
            });

            // 動的カウント: opinionsCountフィールドの更新は不要（getOpinionsCountで動的に計算）
            projectUpdated = true;
            console.log('[OpinionService] ✅ SQLite deletion completed:', id);

            // 2. Firebaseから削除 - CLAUDE.md要件に従い原子性を保証
            if (project) {
                await this.syncOpinionToFirebase(userId, project.firebaseId || project.id, { id }, 'delete');
            } else {
                throw new Error('Project not found - cannot ensure atomic transaction');
            }
        } catch (error) {
            console.error('[OpinionService] ❌ Opinion deletion failed:', error);
            
            // CLAUDE.md要件: Firebase削除失敗時はSQLiteをロールバック（意見を復元）
            if (deletedOpinion && error instanceof Error && error.message.includes('Firebase')) {
                try {
                    // 意見を復元
                    await prisma.opinion.create({
                        data: {
                            id: deletedOpinion.id,
                            content: deletedOpinion.content,
                            sentiment: deletedOpinion.sentiment,
                            characterCount: deletedOpinion.characterCount,
                            projectId: deletedOpinion.projectId,
                            topicId: deletedOpinion.topicId,
                            isBookmarked: deletedOpinion.isBookmarked,
                            submittedAt: deletedOpinion.submittedAt,
                            firebaseId: deletedOpinion.firebaseId,
                            syncStatus: 'pending'
                        }
                    });
                    
                    // 動的カウント: opinionsCountフィールドの更新は不要（getOpinionsCountで動的に計算）
                    
                    console.log('[OpinionService] 🔄 SQLite rollback completed - opinion restored');
                } catch (rollbackError) {
                    console.error('[OpinionService] ❌ SQLite rollback failed:', rollbackError);
                }
            }
            
            if (error instanceof AppError) {
                throw error;
            }
            throw new AppError(
                500,
                'OPINION_DELETE_ERROR',
                `Opinion deletion failed: ${error instanceof Error ? error.message : 'Unknown error'}`
            );
        }
    }

    async deleteOpinionsByProject(projectId: string, userId: string): Promise<number> {
        try {
            console.log('[OpinionService] 🗑️ Deleting all opinions for project:', projectId);
            
            // Verify project exists and belongs to user
            const project = await prisma.project.findFirst({
                where: { id: projectId, userId },
            });

            if (!project) {
                throw new AppError(
                    404,
                    'PROJECT_NOT_FOUND',
                    'Project not found'
                );
            }

            // Count opinions before deletion
            const count = await prisma.opinion.count({
                where: { projectId }
            });

            if (count > 0) {
                // Delete all opinions for the project
                await prisma.opinion.deleteMany({
                    where: { projectId }
                });
                
                console.log('[OpinionService] ✅ Deleted', count, 'opinions for project:', projectId);
            }

            return count;
        } catch (error) {
            if (error instanceof AppError) {
                throw error;
            }
            throw new AppError(
                500,
                'OPINIONS_DELETE_ERROR',
                'Failed to delete opinions for project',
                error
            );
        }
    }

    async getOpinionsByTopic(projectId: string, topicId: string, userId: string): Promise<Opinion[]> {
        try {
            // Verify project exists and belongs to user
            const project = await prisma.project.findFirst({
                where: { id: projectId, userId },
            });

            if (!project) {
                throw new AppError(
                    404,
                    'PROJECT_NOT_FOUND',
                    'Project not found'
                );
            }

            const prismaOpinions = await prisma.opinion.findMany({
                where: {
                    projectId,
                    topicId,
                },
                orderBy: { submittedAt: 'desc' },
                include: {
                    analysisState: true // OpinionAnalysisStateを含める
                }
            });

            return prismaOpinions.map(this.mapPrismaToOpinion);
        } catch (error) {
            if (error instanceof AppError) {
                throw error;
            }
            throw new AppError(
                500,
                'TOPIC_OPINIONS_FETCH_ERROR',
                'Failed to fetch opinions by topic',
                error
            );
        }
    }

    private async analyzeSentiment(text: string): Promise<'positive' | 'negative' | 'neutral'> {
        try {
            console.log('[OpinionService] 🧠 AI sentiment分析開始:', {
                contentLength: text.length,
                contentPreview: text.substring(0, 100) + (text.length > 100 ? '...' : ''),
                timestamp: new Date().toISOString()
            });

            // AI分析実行
            const aiManager = AIServiceManager.getInstance();
            const result = await aiManager.analyzeSentiment(text, {
                language: 'ja',
                model: 'claude-3-5-sonnet-20241022'
            });

            console.log('[OpinionService] ✅ AI sentiment分析完了:', {
                sentiment: result.sentiment,
                confidence: result.confidence,
                reasoning: result.reasoning
            });

            return result.sentiment;
        } catch (error) {
            console.error('[OpinionService] ❌ AI sentiment分析エラー:', error);
            
            // フォールバック: キーワードベース分析
            console.log('[OpinionService] 🔄 フォールバック分析実行');
            return this.analyzeSentimentFallback(text);
        }
    }

    private async analyzeSentimentBulk(text: string): Promise<'positive' | 'negative' | 'neutral'> {
        try {
            console.log('[OpinionService] 🧠 AI sentiment分析開始 (一括登録最適化):', {
                contentLength: text.length,
                contentPreview: text.substring(0, 100) + (text.length > 100 ? '...' : ''),
                timestamp: new Date().toISOString()
            });

            // AI分析実行 (一括登録用: タイムアウト短縮)
            const aiManager = AIServiceManager.getInstance();
            
            // 15秒でタイムアウト
            const aiPromise = aiManager.analyzeSentiment(text, {
                language: 'ja',
                model: 'claude-3-5-sonnet-20241022'
            });
            
            const timeoutPromise = new Promise<'neutral'>((resolve) => {
                setTimeout(() => {
                    console.log('[OpinionService] ⏰ AI分析タイムアウト (15秒) - デフォルト値使用');
                    resolve('neutral');
                }, 15000);
            });

            const result = await Promise.race([aiPromise, timeoutPromise]);
            
            if (typeof result === 'string') {
                // タイムアウト時のデフォルト値
                return result;
            }

            console.log('[OpinionService] ✅ AI sentiment分析完了 (一括登録最適化):', {
                sentiment: result.sentiment,
                confidence: result.confidence
            });

            return result.sentiment;
        } catch (error) {
            console.error('[OpinionService] ❌ AI sentiment分析エラー (一括登録最適化):', error);
            
            // フォールバック: デフォルト値を即座に返す
            console.log('[OpinionService] 🔄 フォールバック: デフォルト値 (neutral) 使用');
            return 'neutral';
        }
    }

    private analyzeSentimentFallback(text: string): 'positive' | 'negative' | 'neutral' {
        // キーワードベース分析（フォールバック用）
        const positiveWords = ['良い', '素晴らしい', '嬉しい', '満足', '最高', 'good', 'great', 'excellent', 'amazing'];
        const negativeWords = ['悪い', '困る', '問題', '不満', 'ダメ', 'bad', 'terrible', 'awful', 'problem'];

        const lowerText = text.toLowerCase();
        
        const positiveCount = positiveWords.filter(word => lowerText.includes(word)).length;
        const negativeCount = negativeWords.filter(word => lowerText.includes(word)).length;

        if (positiveCount > negativeCount) {
            return 'positive';
        } else if (negativeCount > positiveCount) {
            return 'negative';
        }
        return 'neutral';
    }

    private mapPrismaToOpinion(prismaOpinion: any): Opinion {
        const result: any = {
            id: prismaOpinion.id,
            content: prismaOpinion.content,
            submittedAt: prismaOpinion.submittedAt,
            isBookmarked: prismaOpinion.isBookmarked,
            sentiment: prismaOpinion.sentiment.toLowerCase() as Opinion['sentiment'],
            characterCount: prismaOpinion.characterCount,
            topicId: prismaOpinion.topicId,
            projectId: prismaOpinion.projectId,
            // OpinionAnalysisStateの情報をマッピング
            lastAnalyzedAt: prismaOpinion.analysisState?.lastAnalyzedAt || undefined,
            analysisVersion: prismaOpinion.analysisState?.analysisVersion || undefined,
            classificationConfidence: prismaOpinion.analysisState?.classificationConfidence ? Number(prismaOpinion.analysisState.classificationConfidence) : undefined,
            manualReviewFlag: prismaOpinion.analysisState?.manualReviewFlag || false,
            // Opinion本体の分析状態情報をマッピング
            analysisStatus: prismaOpinion.analysisStatus,
            analyzedAt: prismaOpinion.analyzedAt,
            // Action-related fields
            actionStatus: prismaOpinion.actionStatus,
            actionStatusReason: prismaOpinion.actionStatusReason,
            actionStatusUpdatedAt: prismaOpinion.actionStatusUpdatedAt,
            priorityLevel: prismaOpinion.priorityLevel,
            priorityReason: prismaOpinion.priorityReason,
            priorityUpdatedAt: prismaOpinion.priorityUpdatedAt,
            dueDate: prismaOpinion.dueDate,
            actionLogs: prismaOpinion.actionLogs,
        };

        // Handle metadata field
        if (prismaOpinion.metadata) {
            try {
                result.metadata = JSON.parse(prismaOpinion.metadata);
            } catch (error) {
                console.warn('[OpinionService] Failed to parse metadata JSON, returning as string:', prismaOpinion.metadata);
                result.metadata = prismaOpinion.metadata;
            }
        }

        return result;
    }

    private async syncOpinionToFirebase(userId: string, firebaseProjectId: string, opinion: any, operation: 'create' | 'update' | 'delete', options?: { skipCountUpdate?: boolean }): Promise<void> {
        try {
            // Phase 1 テスト: Firebase同期無効化チェック
            if (process.env.FIREBASE_DISABLE_SYNC === 'true') {
                console.log(`[OpinionService] ⚠️ Firebase同期が無効化されています (検証用) - SQLiteのみ: ${operation}`);
                return;
            }
            
            if (!database) {
                console.log('[OpinionService] ⚠️ Firebase database not available');
                return;
            }

            const opinionRef = database.ref(`users/${userId}/projects/${firebaseProjectId}/opinions/${opinion.id}`);
            // Firebase projectRefは不要（opinionsCountフィールド更新廃止により）

            switch (operation) {
                case 'create':
                case 'update':
                    const firebaseData = {
                        // 基本フィールド
                        content: opinion.content,
                        sentiment: opinion.sentiment.toLowerCase ? opinion.sentiment.toLowerCase() : opinion.sentiment,
                        submittedAt: opinion.submittedAt instanceof Date ? opinion.submittedAt.toISOString() : opinion.submittedAt,
                        isBookmarked: opinion.isBookmarked || false,
                        characterCount: opinion.characterCount,
                        
                        // リレーション
                        topicId: opinion.topicId || null,
                        projectId: opinion.projectId || null,
                        
                        // メタデータ
                        metadata: opinion.metadata || null,
                        
                        // 分析関連
                        analysisStatus: opinion.analysisStatus || 'unanalyzed',
                        analyzedAt: opinion.analyzedAt ? (opinion.analyzedAt instanceof Date ? opinion.analyzedAt.toISOString() : opinion.analyzedAt) : null,
                        analysisVersion: opinion.analysisVersion || null,
                        
                        // アクション関連フィールド
                        actionStatus: opinion.actionStatus || null,
                        priorityLevel: opinion.priorityLevel || null,
                        priorityReason: opinion.priorityReason || null,
                        priorityUpdatedAt: opinion.priorityUpdatedAt ? (opinion.priorityUpdatedAt instanceof Date ? opinion.priorityUpdatedAt.toISOString() : opinion.priorityUpdatedAt) : null,
                        dueDate: opinion.dueDate ? (opinion.dueDate instanceof Date ? opinion.dueDate.toISOString() : opinion.dueDate) : null,
                        actionLogs: opinion.actionLogs || null,
                        
                        // 同期関連
                        firebaseId: opinion.id,
                        lastSyncAt: new Date().toISOString(),
                        syncStatus: 'synced'
                    };
                    
                    await opinionRef.set(firebaseData);
                    console.log(`[OpinionService] ✅ Opinion ${operation}d in Firebase:`, opinion.id);
                    
                    // opinionsCountフィールドの更新は廃止（動的カウントに変更）
                    break;
                case 'delete':
                    await opinionRef.remove();
                    console.log('[OpinionService] ✅ Opinion deleted from Firebase:', opinion.id);
                    
                    // opinionsCountフィールドの更新は廃止（動的カウントに変更）
                    break;
            }
            
        } catch (error) {
            console.error(`[OpinionService] ❌ Firebase opinion ${operation} failed:`, error);
            // Firebase同期失敗は警告として扱い、SQLiteモードで継続
            console.log(`[OpinionService] ⚠️ Firebase同期失敗 - SQLiteモードで継続: ${operation}`);
            throw new Error(`Firebase opinion ${operation} failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    // 🔥 Phase 3: 収集統計をリアルタイム更新
    private async updateCollectionStats(firebaseProjectId: string, userId: string): Promise<void> {
        try {
            if (!database) {
                console.warn('[OpinionService] ⚠️ Firebase not initialized - skipping collection stats update');
                return;
            }

            const now = Date.now();
            const today = new Date().toISOString().split('T')[0];
            const currentHour = new Date().getHours();

            console.log('[OpinionService] 📊 収集統計を更新:', {
                firebaseProjectId,
                userId,
                today,
                currentHour,
                timestamp: new Date().toISOString()
            });

            const statsRef = database.ref(`projects/${firebaseProjectId}/collection-stats`);
            const currentStats = (await statsRef.once('value')).val() || {};

            // 最近1時間以内の意見数を取得
            const recentCount = await this.getRecentOpinionsCount(firebaseProjectId, userId, 1);

            // 統計データの更新
            const updatedStats = {
                totalCount: (currentStats.totalCount || 0) + 1,
                todayCount: (currentStats.dailyStats?.[today]?.count || 0) + 1,
                recentCount: recentCount,
                lastOpinionAt: now,
                status: 'active',
                dailyStats: {
                    ...(currentStats.dailyStats || {}),
                    [today]: {
                        count: (currentStats.dailyStats?.[today]?.count || 0) + 1,
                        firstOpinionAt: currentStats.dailyStats?.[today]?.firstOpinionAt || now,
                        lastOpinionAt: now
                    }
                },
                hourlyStats: {
                    ...(currentStats.hourlyStats || {}),
                    [currentHour]: (currentStats.hourlyStats?.[currentHour] || 0) + 1
                }
            };

            await statsRef.set(updatedStats);
            console.log('[OpinionService] ✅ 収集統計更新完了:', {
                totalCount: updatedStats.totalCount,
                todayCount: updatedStats.todayCount,
                recentCount: updatedStats.recentCount
            });
        } catch (error) {
            console.error('[OpinionService] ❌ 収集統計更新エラー:', error);
            throw error;
        }
    }

    // 最近の意見数を取得するヘルパーメソッド
    private async getRecentOpinionsCount(firebaseProjectId: string, userId: string, hours: number): Promise<number> {
        try {
            if (!database) return 0;

            const cutoffTime = Date.now() - (hours * 60 * 60 * 1000);
            const opinionsRef = database.ref(`users/${userId}/projects/${firebaseProjectId}/opinions`);
            const snapshot = await opinionsRef.orderByChild('submittedAt').startAt(cutoffTime).once('value');
            
            if (!snapshot.exists()) return 0;
            
            const opinions = snapshot.val();
            return Object.keys(opinions).length;
        } catch (error) {
            console.error('[OpinionService] ❌ 最近の意見数取得エラー:', error);
            return 0;
        }
    }

}