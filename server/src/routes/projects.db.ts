import { Router } from 'express';
import { ProjectService } from '../services/projectService.db';
import { OpinionService } from '../services/opinionService.db';
import { TaskService } from '../services/taskService.db';
import { SyncService } from '../services/syncService';
import { PlanLimitService } from '../services/PlanLimitService';
import { database } from '../lib/firebase-admin';
import { validateCreateProject, validateUpdateProject, validateCreateOpinion, validateUpdateOpinion, validateCreateTask, validateUpdateTask } from '../middleware/validator';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth';
import { requireActiveProject } from '../middleware/archiveProtection';
import { AppError } from '../middleware/errorHandler';

const router = Router();

// Initialize services
const projectService = new ProjectService();
const opinionService = new OpinionService();
const taskService = new TaskService();
const syncService = new SyncService();

// Apply authentication to all routes
router.use(requireAuth);

// Project Routes
router.post('/', validateCreateProject, async (req: AuthenticatedRequest, res, next) => {
    try {
        console.log('[ProjectsAPI] 📝 プロジェクト作成要求:', {
            userId: req.userId,
            userFromHeaders: req.headers['x-user-id'],
            body: req.body,
            timestamp: new Date().toISOString()
        });

        // プラン別制限チェック（新規ユーザーのみ対象）
        const limitCheck = await PlanLimitService.checkProjectCreationLimit(req.userId!);
        if (!limitCheck.allowed) {
            console.log('[ProjectsAPI] ⚠️ Project creation limit reached for user:', {
                userId: req.userId,
                currentUsage: limitCheck.currentUsage,
                limit: limitCheck.limit,
                message: limitCheck.message
            });
            
            throw new AppError(403, 'PROJECT_LIMIT_EXCEEDED', limitCheck.message || 'Project creation limit exceeded');
        }
        
        const project = await projectService.createProject(req.userId!, req.body);
        
        console.log('[ProjectsAPI] ✅ プロジェクト作成成功:', {
            projectId: project.id,
            projectName: project.name,
            userId: req.userId
        });
        
        res.status(201).json(project);
    } catch (error) {
        // プラン制限エラーは通常のフローなので詳細ログは出力しない
        if (error instanceof AppError && error.code === 'PROJECT_LIMIT_EXCEEDED') {
            next(error);
        } else {
            console.error('[ProjectsAPI] ❌ プロジェクト作成エラー:', {
                error: error instanceof Error ? error.message : error,
                stack: error instanceof Error ? error.stack : undefined,
                userId: req.userId,
                body: req.body,
                timestamp: new Date().toISOString()
            });
            next(error);
        }
    }
});

router.get('/', async (req: AuthenticatedRequest, res, next) => {
    try {
        console.log('[ProjectsAPI] 📊 プロジェクト一覧API要求:', {
            userId: req.userId,
            timestamp: new Date().toISOString()
        });
        
        const projects = await projectService.getProjects(req.userId!);
        
        console.log('[ProjectsAPI] ✅ プロジェクト一覧API応答:', {
            count: projects.length,
            projectIds: projects.map(p => p.id),
            hasAnalysisData: projects.filter(p => p.analysis?.topInsights && p.analysis.topInsights.length > 0).length
        });
        
        res.json(projects);
    } catch (error) {
        console.error('[ProjectsAPI] ❌ プロジェクト一覧API エラー:', error);
        next(error);
    }
});

router.get('/:id', async (req: AuthenticatedRequest, res, next) => {
    try {
        const project = await projectService.getProject(req.params.id, req.userId!);
        res.json(project);
    } catch (error) {
        next(error);
    }
});

// 動的カウント: 意見数を取得するエンドポイント
router.get('/:id/opinions-count', async (req: AuthenticatedRequest, res, next) => {
    try {
        console.log('[ProjectsAPI] 📊 意見数API要求:', {
            projectId: req.params.id,
            userId: req.userId
        });
        
        // プロジェクトの存在確認
        const project = await projectService.getProject(req.params.id, req.userId!);
        
        // 実際の意見数を取得 (projectService.getProject内で既に動的カウントが実行される)
        const opinionsCount = project.opinionsCount;
        
        console.log('[ProjectsAPI] ✅ 意見数API応答:', {
            projectId: req.params.id,
            count: opinionsCount
        });
        
        res.json({ count: opinionsCount });
    } catch (error) {
        console.error('[ProjectsAPI] ❌ 意見数API エラー:', error);
        next(error);
    }
});

// 意見収集制限情報を取得するエンドポイント
router.get('/:id/opinion-limits', async (req: AuthenticatedRequest, res, next) => {
    try {
        console.log('[ProjectsAPI] 📊 意見制限情報API要求:', {
            projectId: req.params.id,
            userId: req.userId
        });
        
        // プロジェクトの存在確認
        const project = await projectService.getProject(req.params.id, req.userId!);
        
        // 常に制限情報を返すため、PlanLimitServiceを直接使用
        const { prisma } = require('../lib/database');
        
        // ユーザー情報取得
        const user = await prisma.user.findUnique({
            where: { id: req.userId }
        });
        
        // プラン制限値取得
        const limits = PlanLimitService.getPlanLimits(user?.subscriptionStatus, user);
        
        // 現在の意見数取得
        const currentOpinionCount = await prisma.opinion.count({
            where: { projectId: req.params.id }
        });
        
        const allowed = limits.maxOpinionsPerProject === -1 || currentOpinionCount < limits.maxOpinionsPerProject;
        const remaining = limits.maxOpinionsPerProject === -1 ? 
            0 : Math.max(0, limits.maxOpinionsPerProject - currentOpinionCount);
        
        console.log('[ProjectsAPI] ✅ 意見制限情報API応答:', {
            projectId: req.params.id,
            userPlan: user?.subscriptionStatus,
            allowed: allowed,
            currentUsage: currentOpinionCount,
            limit: limits.maxOpinionsPerProject,
            remaining: remaining
        });
        
        res.json({
            success: true,
            data: {
                allowed: allowed,
                currentUsage: currentOpinionCount,
                limit: limits.maxOpinionsPerProject === -1 ? 0 : limits.maxOpinionsPerProject,
                remaining: remaining,
                message: allowed ? undefined : `意見収集上限（${limits.maxOpinionsPerProject}件）に達しました。`
            }
        });
    } catch (error) {
        console.error('[ProjectsAPI] ❌ 意見制限情報API エラー:', error);
        next(error);
    }
});

router.put('/:id', requireActiveProject, validateUpdateProject, async (req: AuthenticatedRequest, res, next) => {
    try {
        const project = await projectService.updateProject(req.params.id, req.userId!, req.body);
        res.json(project);
    } catch (error) {
        next(error);
    }
});

router.patch('/:id', validateUpdateProject, async (req: AuthenticatedRequest, res, next) => {
    try {
        const project = await projectService.updateProject(req.params.id, req.userId!, req.body);
        res.json(project);
    } catch (error) {
        next(error);
    }
});

router.delete('/:id', requireActiveProject, async (req: AuthenticatedRequest, res, next) => {
    try {
        console.log('[ProjectsAPI] 🗑️ プロジェクト削除要求:', {
            projectId: req.params.id,
            userId: req.userId
        });

        // 1. まず関連するopinionの数を確認
        const opinionsCount = await opinionService.getOpinionsByProject(req.params.id, req.userId!);
        console.log('[ProjectsAPI] 📊 削除対象のOpinions数:', opinionsCount.length);

        // 2. SQLiteから削除（Firebase同期を一時的に無効化）
        console.log('[ProjectsAPI] ⚠️ Firebase同期を一時的にスキップ - SQLiteのみ削除');
        await projectService.deleteProject(req.params.id, req.userId!);
        
        // Firebase同期版（将来有効化）
        // await syncService.syncProjectBidirectional(req.userId!, null, 'delete', req.params.id);
        
        console.log('[ProjectsAPI] ✅ プロジェクト削除完了');
        res.status(204).send();
    } catch (error) {
        console.error('[ProjectsAPI] ❌ プロジェクト削除エラー:', error);
        next(error);
    }
});

router.post('/:id/complete', requireActiveProject, async (req: AuthenticatedRequest, res, next) => {
    try {
        const project = await projectService.completeProject(req.params.id, req.userId!);
        res.json(project);
    } catch (error) {
        next(error);
    }
});

router.delete('/:id/priority', requireActiveProject, async (req: AuthenticatedRequest, res, next) => {
    try {
        const project = await projectService.resetProjectPriority(req.params.id, req.userId!);
        res.json(project);
    } catch (error) {
        next(error);
    }
});

// アーカイブ関連のエンドポイント
router.post('/:id/archive', async (req: AuthenticatedRequest, res, next) => {
    try {
        console.log('[ProjectsAPI] 📦 プロジェクトアーカイブ要求:', {
            projectId: req.params.id,
            userId: req.userId
        });

        const project = await projectService.updateProject(req.params.id, req.userId!, {
            isArchived: true,
            archivedAt: new Date()
        });

        console.log('[ProjectsAPI] ✅ プロジェクトアーカイブ完了:', {
            projectId: req.params.id,
            projectName: project.name
        });

        res.json(project);
    } catch (error) {
        console.error('[ProjectsAPI] ❌ プロジェクトアーカイブエラー:', error);
        next(error);
    }
});

router.post('/:id/unarchive', async (req: AuthenticatedRequest, res, next) => {
    try {
        console.log('[ProjectsAPI] 📤 プロジェクトアーカイブ解除要求:', {
            projectId: req.params.id,
            userId: req.userId
        });

        // 復元時に適切なstatusを決定するため、まず現在のプロジェクト情報を取得
        const currentProject = await projectService.getProject(req.params.id, req.userId!);
        
        // 意見数を確認して適切なstatusを決定
        const opinionsCount = currentProject.opinionsCount || 0;
        const newStatus = opinionsCount > 0 ? 'ready-for-analysis' : 'collecting';
        
        console.log('[ProjectsAPI] 🔄 復元時ステータス決定:', {
            projectId: req.params.id,
            opinionsCount,
            newStatus
        });

        const project = await projectService.updateProject(req.params.id, req.userId!, {
            isArchived: false,
            archivedAt: undefined,
            status: newStatus
        });

        console.log('[ProjectsAPI] ✅ プロジェクトアーカイブ解除完了:', {
            projectId: req.params.id,
            projectName: project.name,
            newStatus: project.status
        });

        res.json(project);
    } catch (error) {
        console.error('[ProjectsAPI] ❌ プロジェクトアーカイブ解除エラー:', error);
        next(error);
    }
});

// アーカイブ済みプロジェクト一覧取得
router.get('/archived', async (req: AuthenticatedRequest, res, next) => {
    try {
        console.log('[ProjectsAPI] 📦 アーカイブ済みプロジェクト一覧取得:', {
            userId: req.userId
        });

        const archivedProjects = await projectService.getProjects(req.userId!, { archived: true });

        console.log('[ProjectsAPI] ✅ アーカイブ済みプロジェクト一覧取得完了:', {
            count: archivedProjects.length
        });

        res.json(archivedProjects);
    } catch (error) {
        console.error('[ProjectsAPI] ❌ アーカイブ済みプロジェクト一覧取得エラー:', error);
        next(error);
    }
});

// Opinion Routes
router.post('/:id/opinions', requireActiveProject, validateCreateOpinion, async (req: AuthenticatedRequest, res, next) => {
    try {
        console.log('[ProjectsDB] ✅ Individual opinion creation route called:', {
            projectId: req.params.id,
            userId: req.userId,
            opinionData: req.body
        });

        // プラン別意見投稿制限チェック
        const limitCheck = await PlanLimitService.checkOpinionSubmissionLimit(req.params.id, req.userId!);
        if (!limitCheck.allowed) {
            console.log('[ProjectsDB] ⚠️ Opinion submission limit reached:', {
                projectId: req.params.id,
                userId: req.userId,
                currentUsage: limitCheck.currentUsage,
                limit: limitCheck.limit,
                message: limitCheck.message
            });
            
            throw new AppError(403, 'OPINION_LIMIT_EXCEEDED', limitCheck.message || 'Opinion submission limit exceeded');
        }

        const opinion = await opinionService.createOpinion(req.params.id, req.userId!, req.body);
        console.log('[ProjectsDB] ✅ Individual opinion creation completed:', opinion.id);
        res.status(201).json(opinion);
    } catch (error) {
        // 意見制限エラーは通常のフローなので詳細ログは出力しない
        if (error instanceof AppError && error.code === 'OPINION_LIMIT_EXCEEDED') {
            next(error);
        } else {
            console.error('[ProjectsDB] ❌ Individual opinion creation failed:', error);
            next(error);
        }
    }
});

// Bulk opinions creation (for testing/debugging)
router.post('/:id/opinions/bulk', requireActiveProject, async (req: AuthenticatedRequest, res, next) => {
    try {
        console.log('[BulkOpinions] ✅ Request received:', {
            projectId: req.params.id,
            userId: req.userId,
            bodyKeys: Object.keys(req.body),
            opinionsCount: req.body.opinions?.length,
            fullBody: req.body,
            firstOpinion: req.body.opinions?.[0]
        });

        const { opinions } = req.body;
        
        if (!Array.isArray(opinions)) {
            console.error('[BulkOpinions] ❌ Invalid input - opinions is not an array:', typeof opinions);
            return res.status(400).json({
                error: 'INVALID_INPUT',
                message: 'opinions field must be an array'
            });
        }

        // プラン別意見投稿制限チェック（一括投稿前に確認）
        const limitCheck = await PlanLimitService.checkOpinionSubmissionLimit(req.params.id, req.userId!);
        if (!limitCheck.allowed) {
            console.log('[BulkOpinions] ⚠️ Bulk opinion submission limit reached:', {
                projectId: req.params.id,
                userId: req.userId,
                currentUsage: limitCheck.currentUsage,
                limit: limitCheck.limit,
                requestedCount: opinions.length
            });
            
            return res.status(403).json({
                error: 'OPINION_LIMIT_EXCEEDED',
                message: limitCheck.message || 'Opinion submission limit exceeded',
                code: 'OPINION_LIMIT_EXCEEDED'
            });
        }

        const results = {
            success: 0,
            total: opinions.length,
            errors: [] as string[]
        };

        // プロジェクトの存在確認（存在しない場合はFirebaseから同期）
        console.log(`[BulkOpinions] Processing bulk opinions for project ${req.params.id}`, {
            userId: req.userId,
            projectId: req.params.id,
            projectIdType: req.params.id.startsWith('-') ? 'Firebase' : 'SQLite'
        });
        
        // まず全てのプロジェクトを確認（デバッグ用）
        const { prisma } = await import('../lib/database');
        const allProjects = await prisma.project.findMany({
            where: { userId: req.userId! },
            select: { id: true, name: true, firebaseId: true }
        });
        console.log(`[BulkOpinions] 📊 ユーザーの全プロジェクト:`, allProjects);
        
        let targetProject;
        try {
            // まずSQLiteのIDで検索
            targetProject = await projectService.getProject(req.params.id, req.userId!);
            console.log(`[BulkOpinions] ✅ Project ${req.params.id} found in SQLite`);
        } catch (error) {
            console.log(`[BulkOpinions] ⚠️ Project ${req.params.id} not found in SQLite`);
            
            // SQLiteで見つからない場合、firebaseIdフィールドでも検索
            try {
                const projectByFirebaseId = await prisma.project.findFirst({
                    where: { 
                        userId: req.userId!,
                        firebaseId: req.params.id
                    },
                });
                
                if (projectByFirebaseId) {
                    targetProject = projectByFirebaseId;
                    console.log(`[BulkOpinions] ✅ Project found by firebaseId in SQLite:`, {
                        sqliteId: projectByFirebaseId.id,
                        firebaseId: req.params.id,
                        projectName: projectByFirebaseId.name
                    });
                } else {
                    console.log(`[BulkOpinions] ⚠️ Project not found by firebaseId either, attempting Firebase sync...`);
                    
                    // Firebaseから同期を試行
                    if (!database) {
                        throw new Error('Firebase database is not initialized');
                    }
                    const firebaseRef = database.ref(`users/${req.userId}/projects/${req.params.id}`);
                    const snapshot = await firebaseRef.once('value');
                    
                    if (snapshot.exists()) {
                        const firebaseProject = snapshot.val();
                        console.log(`[BulkOpinions] ✅ Project found in Firebase, syncing to SQLite...`, {
                            projectId: req.params.id,
                            projectName: firebaseProject.name
                        });
                    
                    // ユーザーが存在することを確認
                    await syncService.syncUserToSQLite(req.userId!, { 
                        email: 'bulk-upload-user@example.com', 
                        name: 'Bulk Upload User' 
                    });
                    
                    // プロジェクトをSQLiteに同期
                    const syncedProject = await syncService.syncProjectBidirectional(
                        req.userId!, 
                        {
                            ...firebaseProject,
                            firebaseId: req.params.id
                        }, 
                        'create'
                    );
                    
                        targetProject = syncedProject;
                        console.log(`[BulkOpinions] ✅ Project synced to SQLite successfully`);
                    } else {
                        console.error(`[BulkOpinions] ❌ Project ${req.params.id} not found in Firebase either`);
                        return res.status(404).json({
                            error: 'PROJECT_NOT_FOUND',
                            message: `Project with ID ${req.params.id} not found in Firebase or SQLite. Please ensure the project exists.`,
                            projectId: req.params.id
                        });
                    }
                }
            } catch (syncError) {
                console.error(`[BulkOpinions] ❌ Failed to find or sync project:`, syncError);
                return res.status(404).json({
                    error: 'PROJECT_SYNC_FAILED',
                    message: `Failed to find or sync project ${req.params.id}. Please ensure the project exists.`,
                    projectId: req.params.id,
                    details: syncError instanceof Error ? syncError.message : String(syncError)
                });
            }
        }

        // 並行処理による性能最適化 (同時実行数制限: 10件)
        const concurrencyLimit = 10;
        let processedCount = 0;
        
        for (let i = 0; i < opinions.length; i += concurrencyLimit) {
            const batch = opinions.slice(i, i + concurrencyLimit);
            
            // バッチ単位で並行処理
            const batchResults = await Promise.allSettled(
                batch.map(async (opinionData, batchIndex) => {
                    const globalIndex = i + batchIndex;
                    let processedOpinion: any = null;
                    
                    try {
                        // Validate opinion data
                        if (!opinionData.content || typeof opinionData.content !== 'string') {
                            throw new Error('content is required and must be a string');
                        }

                        // Create opinion with default values
                        processedOpinion = {
                            content: opinionData.content,
                            sentiment: opinionData.sentiment || 'neutral',
                            isBookmarked: opinionData.isBookmarked || false,
                            characterCount: opinionData.characterCount || opinionData.content.length,
                            submittedAt: opinionData.submittedAt || new Date().toISOString(),
                            metadata: opinionData.metadata
                        };

                        await opinionService.createOpinionBulk(req.params.id, req.userId!, processedOpinion);
                        console.log(`[BulkOpinions] ✅ Opinion ${globalIndex + 1} created successfully`);
                        
                        return { success: true, index: globalIndex };
                        
                    } catch (error) {
                        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
                        const errorStack = error instanceof Error ? error.stack : undefined;
                        
                        console.error(`[BulkOpinions] ❌ Error creating opinion ${globalIndex + 1}:`, {
                            error: errorMessage,
                            stack: errorStack,
                            opinionData: opinionData,
                            processedOpinion: processedOpinion,
                            projectId: req.params.id,
                            userId: req.userId,
                            fullError: error
                        });
                        
                        return { 
                            success: false, 
                            index: globalIndex, 
                            error: errorMessage 
                        };
                    }
                })
            );
            
            // バッチ結果の集計
            batchResults.forEach((result, batchIndex) => {
                const globalIndex = i + batchIndex;
                if (result.status === 'fulfilled') {
                    if (result.value.success) {
                        results.success++;
                    } else {
                        results.errors.push(`Opinion ${globalIndex + 1}: ${result.value.error}`);
                    }
                } else {
                    results.errors.push(`Opinion ${globalIndex + 1}: ${result.reason.message || 'Unknown error'}`);
                }
            });
            
            processedCount += batch.length;
            console.log(`[BulkOpinions] 📊 Processed ${processedCount}/${opinions.length} opinions`);
        }

        // Firebase プロジェクト更新時刻のみ更新（opinionsCountフィールドは廃止済み）
        if (results.success > 0) {
            try {
                if (database) {
                    console.log(`[BulkOpinions] 📊 Firebase project updatedAt 更新開始 - プロジェクトパス: users/${req.userId}/projects/${req.params.id}`);
                    
                    // プロジェクト情報の存在確認・更新
                    const projectSnapshot = await database.ref(`users/${req.userId}/projects/${req.params.id}`).once('value');
                    if (projectSnapshot.exists()) {
                        await database.ref(`users/${req.userId}/projects/${req.params.id}`).update({ 
                            updatedAt: new Date().toISOString()
                        });
                        console.log(`[BulkOpinions] ✅ Firebase project updatedAt updated`);
                    } else {
                        console.warn(`[BulkOpinions] ⚠️ Firebase project not found: users/${req.userId}/projects/${req.params.id}`);
                    }
                } else {
                    console.warn('[BulkOpinions] ⚠️ Firebase database not available - skipping project update');
                }
            } catch (error) {
                console.error('[BulkOpinions] ❌ Firebase project update failed:', error);
            }
        }

        console.log(`[BulkOpinions] Bulk creation completed: ${results.success}/${results.total} successful`);
        
        res.status(201).json({
            message: `Successfully created ${results.success} out of ${results.total} opinions`,
            results
        });
    } catch (error) {
        console.error('[BulkOpinions] ❌ Bulk creation failed:', {
            error: error instanceof Error ? error.message : error,
            stack: error instanceof Error ? error.stack : undefined,
            projectId: req.params.id,
            userId: req.userId,
            requestBody: req.body
        });
        next(error);
    }
});

router.get('/:id/opinions', async (req: AuthenticatedRequest, res, next) => {
    try {
        const { topicId, analysisStatus, sortBy, sortOrder } = req.query;
        let opinions;
        
        console.log('[ProjectsAPI] 📊 回答一覧API要求:', {
            projectId: req.params.id,
            userId: req.userId,
            filters: { topicId, analysisStatus, sortBy, sortOrder }
        });
        
        if (topicId && typeof topicId === 'string') {
            opinions = await opinionService.getOpinionsByTopic(req.params.id, topicId, req.userId!);
        } else {
            // 分析状態フィルタとソートオプションを構築
            const filters: any = {};
            
            if (analysisStatus && typeof analysisStatus === 'string') {
                filters.analysisStatus = analysisStatus as 'all' | 'analyzed' | 'unanalyzed' | 'excluded';
            }
            
            if (sortBy && typeof sortBy === 'string') {
                filters.sortBy = sortBy as 'submittedAt' | 'analyzedAt' | 'analysisStatus';
            }
            
            if (sortOrder && typeof sortOrder === 'string') {
                filters.sortOrder = sortOrder as 'asc' | 'desc';
            }
            
            opinions = await opinionService.getOpinionsByProject(req.params.id, req.userId!, filters);
        }
        
        console.log('[ProjectsAPI] ✅ 回答一覧API応答:', {
            count: opinions.length,
            analysisStatusDistribution: opinions.reduce((acc: any, op: any) => {
                const status = op.analysisStatus || 'unanalyzed';
                acc[status] = (acc[status] || 0) + 1;
                return acc;
            }, {})
        });
        
        res.json(opinions);
    } catch (error) {
        next(error);
    }
});

// 個別の意見を取得
router.get('/:projectId/opinions/:opinionId', async (req: AuthenticatedRequest, res, next) => {
    try {
        console.log('[ProjectsAPI] 🔍 個別意見取得要求:', {
            projectId: req.params.projectId,
            opinionId: req.params.opinionId,
            userId: req.userId,
            timestamp: new Date().toISOString()
        });

        const opinion = await opinionService.getOpinion(req.params.opinionId, req.userId!);
        
        console.log('[ProjectsAPI] ✅ 個別意見取得成功:', {
            opinionId: opinion.id,
            projectId: opinion.projectId,
            isBookmarked: opinion.isBookmarked,
            sentiment: opinion.sentiment
        });

        res.json(opinion);
    } catch (error) {
        console.error('[ProjectsAPI] ❌ 個別意見取得エラー:', error);
        next(error);
    }
});

router.put('/:projectId/opinions/:opinionId', requireActiveProject, validateUpdateOpinion, async (req: AuthenticatedRequest, res, next) => {
    try {
        const opinion = await opinionService.updateOpinion(req.params.opinionId, req.userId!, req.body);
        res.json(opinion);
    } catch (error) {
        next(error);
    }
});

router.delete('/:projectId/opinions/:opinionId', requireActiveProject, async (req: AuthenticatedRequest, res, next) => {
    try {
        await opinionService.deleteOpinion(req.params.opinionId, req.userId!);
        res.status(204).send();
    } catch (error) {
        next(error);
    }
});

// Task Routes
router.post('/:id/tasks', requireActiveProject, validateCreateTask, async (req: AuthenticatedRequest, res, next) => {
    try {
        const task = await taskService.createTask(req.params.id, req.userId!, req.body);
        res.status(201).json(task);
    } catch (error) {
        next(error);
    }
});

router.get('/:id/tasks', async (req: AuthenticatedRequest, res, next) => {
    try {
        const { status, overdue } = req.query;
        let tasks;
        
        if (overdue === 'true') {
            tasks = await taskService.getOverdueTasks(req.params.id, req.userId!);
        } else if (status && typeof status === 'string') {
            tasks = await taskService.getTasksByStatus(req.params.id, status as any, req.userId!);
        } else {
            tasks = await taskService.getTasksByProject(req.params.id, req.userId!);
        }
        
        res.json(tasks);
    } catch (error) {
        next(error);
    }
});

router.put('/:projectId/tasks/:taskId', requireActiveProject, validateUpdateTask, async (req: AuthenticatedRequest, res, next) => {
    try {
        const task = await taskService.updateTask(req.params.taskId, req.userId!, req.body);
        res.json(task);
    } catch (error) {
        next(error);
    }
});

router.delete('/:projectId/tasks/:taskId', requireActiveProject, async (req: AuthenticatedRequest, res, next) => {
    try {
        await taskService.deleteTask(req.params.taskId, req.userId!);
        res.status(204).send();
    } catch (error) {
        next(error);
    }
});

router.post('/:projectId/tasks/:taskId/complete', requireActiveProject, async (req: AuthenticatedRequest, res, next) => {
    try {
        const task = await taskService.completeTask(req.params.taskId, req.userId!);
        res.json(task);
    } catch (error) {
        next(error);
    }
});

// Force sync project status from SQLite to Firebase (for development/debug)
router.post('/:id/sync-status', async (req: AuthenticatedRequest, res, next) => {
    try {
        console.log('[ProjectsAPI] 🔄 Force sync status request:', {
            projectId: req.params.id,
            userId: req.userId
        });
        
        // Get current SQLite project status
        const project = await projectService.getProject(req.params.id, req.userId!);
        
        if (!project) {
            return res.status(404).json({
                error: 'PROJECT_NOT_FOUND',
                message: 'Project not found'
            });
        }
        
        // Force sync to Firebase if available
        if (database && project.firebaseId) {
            try {
                await database.ref(`users/${req.userId}/projects/${project.firebaseId}`).update({
                    status: project.status,
                    updatedAt: new Date().toISOString(),
                    analysis: project.analysis,
                    lastForceSyncAt: new Date().toISOString()
                });
                
                console.log('[ProjectsAPI] ✅ Force sync completed:', {
                    projectId: req.params.id,
                    status: project.status,
                    hasAnalysis: !!project.analysis
                });
                
                res.json({
                    success: true,
                    message: 'Project status synchronized to Firebase',
                    project: {
                        id: project.id,
                        status: project.status,
                        hasAnalysis: !!project.analysis
                    }
                });
            } catch (firebaseError) {
                console.error('[ProjectsAPI] ❌ Force sync failed:', firebaseError);
                res.status(500).json({
                    error: 'FIREBASE_SYNC_FAILED',
                    message: 'Failed to sync to Firebase',
                    sqliteStatus: project.status
                });
            }
        } else {
            res.status(400).json({
                error: 'FIREBASE_UNAVAILABLE',
                message: 'Firebase not available or project missing firebaseId',
                sqliteStatus: project.status
            });
        }
    } catch (error) {
        next(error);
    }
});

export default router;