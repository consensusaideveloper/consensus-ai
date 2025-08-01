import { Project, CreateProjectRequest, UpdateProjectRequest } from '../types';
import { AppError } from '../middleware/errorHandler';
import { prisma } from '../lib/database';
import { database } from '../lib/firebase-admin';
// SQLite uses string fields instead of enums

export class ProjectService {

    // 動的カウント: 指定されたプロジェクトの意見数を取得
    private async getOpinionsCount(projectId: string): Promise<number> {
        return await prisma.opinion.count({
            where: { projectId }
        });
    }

    // 未分析意見数を正確に計算
    private async getUnanalyzedOpinionsCount(projectId: string, lastAnalysisAt: Date | null): Promise<number> {
        if (!lastAnalysisAt) {
            // 分析未実行の場合は全意見が未分析
            return await this.getOpinionsCount(projectId);
        }

        // topicIdがnullの意見（分析に失敗した意見）+ 最終分析後に作成された意見
        const unanalyzedCount = await prisma.opinion.count({
            where: {
                projectId,
                OR: [
                    { topicId: null }, // 分析されていない意見
                    { submittedAt: { gt: lastAnalysisAt } } // 最終分析後に追加された意見
                ]
            }
        });

        console.log('[ProjectService] 🔍 未分析意見計算:', {
            projectId,
            lastAnalysisAt: lastAnalysisAt.toISOString(),
            unanalyzedCount,
            calculation: 'topicId=null OR submittedAt > lastAnalysisAt'
        });

        return unanalyzedCount;
    }

    async createProject(userId: string, projectData: CreateProjectRequest): Promise<Project> {
        let sqliteProjectId: string | null = null;
        
        try {
            console.log('[ProjectService] 📊 プロジェクト作成開始:', {
                name: projectData.name,
                userId: userId,
                collectionMethod: projectData.collectionMethod,
                hasDescription: !!projectData.description,
                timestamp: new Date().toISOString()
            });

            // バリデーション
            if (!projectData.collectionMethod) {
                throw new AppError(500, 'INVALID_DATA', 'Collection method is required');
            }

            // 0. ユーザーが存在しない場合は自動作成
            await this.ensureUserExists(userId);

            // 1. SQLiteにプロジェクト作成
            const prismaProject = await prisma.project.create({
                data: {
                    name: projectData.name,
                    description: projectData.description || '',
                    collectionMethod: projectData.collectionMethod.toUpperCase(),
                    slackChannel: projectData.config?.slackChannel,
                    webformUrl: projectData.config?.webformUrl,
                    userId,
                },
                include: {
                    opinions: true,
                    tasks: true,
                    topics: {
                        include: {
                            opinions: true
                        }
                    },
                    insights: true,
                },
            });
            sqliteProjectId = prismaProject.id;
            console.log('[ProjectService] ✅ SQLite creation completed:', prismaProject.id);

            // 2. Firebaseに同期 - CLAUDE.md要件: 両方のDBに保存、失敗時は適切にハンドリング
            if (database) {
                console.log('[ProjectService] 🔄 Syncing to Firebase...');
                try {
                    // 動的カウント: 作成時は0件
                    const opinionsCount = 0;
                    
                    const firebaseData = {
                        name: projectData.name,
                        description: projectData.description,
                        status: 'collecting',
                        collectionMethod: projectData.collectionMethod.toLowerCase(),
                        createdAt: new Date().toISOString(),
                        updatedAt: new Date().toISOString(),
                        // opinionsCount フィールドは廃止済み（動的計算で対応）
                        isCompleted: false,
                        completedAt: null,
                        isArchived: false,
                        archivedAt: null,
                        priorityLevel: null,
                        priorityReason: null,
                        priorityUpdatedAt: null,
                        isAnalyzed: false,
                        lastAnalysisAt: null,
                        // config構造をSQLiteと統一（分離形式）
                        slackChannel: projectData.config?.slackChannel || null,
                        webformUrl: projectData.config?.webformUrl || null,
                        sqliteId: prismaProject.id // SQLite IDを保存（相互参照）
                    };

                    await database.ref(`users/${userId}/projects/${prismaProject.id}`).set(firebaseData);
                    
                    // SQLiteにFirebase IDも更新（相互参照）
                    await prisma.project.update({
                        where: { id: prismaProject.id },
                        data: { firebaseId: prismaProject.id }
                    });
                    
                    console.log('[ProjectService] ✅ Firebase sync completed');
                } catch (firebaseError) {
                    console.error('[ProjectService] ❌ Firebase sync failed:', {
                        error: firebaseError instanceof Error ? firebaseError.message : String(firebaseError),
                        stack: firebaseError instanceof Error ? firebaseError.stack : undefined,
                        projectId: prismaProject.id,
                        userId: userId,
                        firebasePath: `users/${userId}/projects/${prismaProject.id}`,
                        timestamp: new Date().toISOString()
                    });
                    console.warn('[ProjectService] ⚠️ Continuing with SQLite-only mode - フォーム画面でプロジェクトが見つからない可能性があります');
                    // CLAUDE.md要件: Firebase失敗時もSQLiteに保存されているので処理継続（ベストエフォート）
                }
            } else {
                console.log('[ProjectService] ⚠️ Firebase database not available - SQLite-only mode');
                // CLAUDE.md要件: Firebase利用不可でもSQLiteで機能提供
            }

            return await this.mapPrismaToProject(prismaProject);
        } catch (error) {
            console.error('[ProjectService] ❌ Project creation failed:', error);
            
            // CLAUDE.md要件: SQLite操作が成功している場合は、Firebase失敗でもロールバックしない
            // ベストエフォート方式で両DBに保存を試みるが、SQLite成功時は処理継続
            if (sqliteProjectId && error instanceof Error && !error.message.includes('Firebase')) {
                // SQLite自体のエラーの場合のみロールバック
                try {
                    await prisma.project.delete({ where: { id: sqliteProjectId } });
                    console.log('[ProjectService] 🔄 SQLite rollback completed');
                } catch (rollbackError) {
                    console.error('[ProjectService] ❌ SQLite rollback failed:', rollbackError);
                }
                
                throw new AppError(
                    500,
                    'PROJECT_CREATION_ERROR',
                    `Project creation failed: ${error.message}`,
                    error
                );
            } else if (sqliteProjectId) {
                // Firebase関連エラーでSQLiteが成功している場合は、プロジェクトを返す
                console.log('[ProjectService] ✅ SQLite creation successful, returning project despite Firebase issues');
                const createdProject = await prisma.project.findUnique({
                    where: { id: sqliteProjectId },
                    include: { opinions: true, tasks: true, topics: true }
                });
                
                if (createdProject) {
                    return await this.mapPrismaToProject(createdProject);
                }
            }
            
            throw new AppError(
                500,
                'PROJECT_CREATION_ERROR',
                `Project creation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
                error
            );
        }
    }


    async getProjects(userId: string, options?: { archived?: boolean }): Promise<Project[]> {
        try {
            console.log('[ProjectService] 📊 プロジェクト一覧取得開始:', {
                userId,
                timestamp: new Date().toISOString()
            });

            // SQLiteからプロジェクト一覧を取得（アーカイブ状態に基づいてフィルタリング）
            const whereCondition: any = { userId };
            if (options?.archived === true) {
                whereCondition.isArchived = true;
            } else if (options?.archived === false) {
                whereCondition.isArchived = false;
            }
            // options?.archived === undefined の場合は、isArchivedの条件を追加しない（全プロジェクトを取得）
            
            const prismaProjects = await prisma.project.findMany({
                where: whereCondition,
                include: {
                    opinions: true,
                    tasks: true,
                    topics: {
                        include: {
                            opinions: true
                        }
                    },
                    insights: true,
                },
                orderBy: { createdAt: 'desc' },
            });

            console.log('[ProjectService] ✅ SQLiteプロジェクト取得完了:', {
                count: prismaProjects.length,
                projectIds: prismaProjects.map(p => p.id)
            });

            // プロジェクトをマッピング
            const mappedProjects = await Promise.all(prismaProjects.map(project => this.mapPrismaToProject(project)));

            // CLAUDE.md要件: 両DBからデータを統合してダッシュボードに最新データを提供
            if (database) {
                try {
                    console.log('[ProjectService] 🔄 Firebase同期確認中...');
                    
                    // Firebaseの同期状況を確認し、必要に応じて最新データで補完
                    const firebaseRef = database.ref(`users/${userId}/projects`);
                    const firebaseSnapshot = await firebaseRef.once('value');
                    
                    if (firebaseSnapshot.exists()) {
                        const firebaseData = firebaseSnapshot.val();
                        console.log('[ProjectService] 📊 Firebase同期データ確認:', {
                            firebaseProjects: Object.keys(firebaseData).length,
                            sqliteProjects: mappedProjects.length
                        });
                        
                        // Firebase-SQLite間のデータ整合性を確認
                        mappedProjects.forEach(project => {
                            const firebaseProject = firebaseData[project.id];
                            if (firebaseProject) {
                                // Firebaseにより新しいステータス情報がある場合は優先
                                if (firebaseProject.status && firebaseProject.status !== project.status) {
                                    console.log('[ProjectService] 🔄 Firebase同期: ステータス更新検出:', {
                                        projectId: project.id,
                                        sqliteStatus: project.status,
                                        firebaseStatus: firebaseProject.status
                                    });
                                }
                            }
                        });
                    }
                } catch (firebaseError) {
                    console.warn('[ProjectService] ⚠️ Firebase同期確認エラー（SQLiteデータで継続）:', firebaseError instanceof Error ? firebaseError.message : String(firebaseError));
                }
            }

            return mappedProjects;
        } catch (error) {
            console.error('[ProjectService] ❌ プロジェクト一覧取得エラー:', error);
            throw new AppError(
                500,
                'PROJECTS_FETCH_ERROR',
                'Failed to fetch projects',
                error
            );
        }
    }

    async getProject(id: string, userId: string): Promise<Project> {
        try {
            // First try to find by exact ID
            let prismaProject = await prisma.project.findFirst({
                where: { id, userId },
                include: {
                    opinions: true,
                    tasks: true,
                    topics: {
                        include: {
                            opinions: true
                        }
                    },
                    insights: true,
                },
            });

            // If not found and ID looks like Firebase ID (starts with '-'), try finding by firebaseId field
            if (!prismaProject && id.startsWith('-')) {
                console.log('[ProjectService] Firebase ID detected, searching by firebaseId field:', id);
                
                // Look for projects with this Firebase ID in the firebaseId field
                prismaProject = await prisma.project.findFirst({
                    where: { 
                        userId,
                        firebaseId: id
                    },
                    include: {
                        opinions: true,
                        tasks: true,
                        topics: {
                            include: {
                                opinions: true
                            }
                        },
                        insights: true,
                    },
                });

                if (prismaProject) {
                    console.log('[ProjectService] ✅ Found project by firebaseId field:', prismaProject.id);
                }
            }

            if (!prismaProject) {
                throw new AppError(
                    404,
                    'PROJECT_NOT_FOUND',
                    'Project not found'
                );
            }

            return await this.mapPrismaToProject(prismaProject);
        } catch (error) {
            if (error instanceof AppError) {
                throw error;
            }
            throw new AppError(
                500,
                'PROJECT_FETCH_ERROR',
                'Failed to fetch project',
                error
            );
        }
    }

    async updateProject(id: string, userId: string, updates: UpdateProjectRequest): Promise<Project> {
        let originalData: any = null;
        let realProjectId: string = '';
        
        try {
            // First get the project to verify existence and get the real SQLite ID
            const existingProject = await this.getProject(id, userId);
            realProjectId = existingProject.id;
            
            console.log('[ProjectService] 🔄 Updating project:', {
                requestedId: id,
                realId: realProjectId,
                updates: Object.keys(updates),
                'updates.priority': updates.priority,
                'updates.priority !== undefined': updates.priority !== undefined
            });

            const updateData: any = {};
            
            if (updates.name !== undefined) updateData.name = updates.name;
            if (updates.description !== undefined) updateData.description = updates.description;
            if (updates.status !== undefined) {
                updateData.status = updates.status.toUpperCase().replace('-', '_');
                if (updates.status === 'completed') {
                    updateData.isCompleted = true;
                    updateData.completedAt = new Date();
                }
            }
            if (updates.priority !== undefined) {
                updateData.priorityLevel = updates.priority.level?.toUpperCase();
                updateData.priorityReason = updates.priority.reason;
                updateData.priorityUpdatedAt = new Date();
            }
            if (updates.config !== undefined) {
                updateData.slackChannel = updates.config.slackChannel;
                updateData.webformUrl = updates.config.webformUrl;
            }
            // 動的カウント: opinionsCountの直接更新は禁止（getOpinionsCountで動的に計算）
            // if (updates.opinionsCount !== undefined) {
            //     updateData.opinionsCount = updates.opinionsCount;
            // }
            if (updates.firebaseId !== undefined) {
                updateData.firebaseId = updates.firebaseId;
            }
            if (updates.isArchived !== undefined) {
                updateData.isArchived = updates.isArchived;
                if (updates.isArchived && !updates.archivedAt) {
                    updateData.archivedAt = new Date();
                } else if (!updates.isArchived) {
                    updateData.archivedAt = null;
                }
            }
            if (updates.archivedAt !== undefined) {
                updateData.archivedAt = updates.archivedAt;
            }

            // 更新前のデータを保存（ロールバック用）
            const originalProject = await prisma.project.findUnique({ where: { id: realProjectId } });
            if (!originalProject) {
                throw new AppError(404, 'PROJECT_NOT_FOUND', 'Project not found for update');
            }
            originalData = {
                name: originalProject.name,
                description: originalProject.description,
                status: originalProject.status,
                priorityLevel: originalProject.priorityLevel,
                priorityReason: originalProject.priorityReason,
                isCompleted: originalProject.isCompleted,
                completedAt: originalProject.completedAt,
                isArchived: originalProject.isArchived,
                archivedAt: originalProject.archivedAt
            };

            // 1. SQLiteを更新
            const prismaProject = await prisma.project.update({
                where: { id: realProjectId }, // Use the real SQLite ID for the update
                data: updateData,
                include: {
                    opinions: true,
                    tasks: true,
                    topics: {
                        include: {
                            opinions: true
                        }
                    },
                    insights: true,
                },
            });
            console.log('[ProjectService] ✅ SQLite update completed:', realProjectId);

            // 2. Firebaseに同期 - CLAUDE.md要件: 両方のDBに保存、失敗時は適切にハンドリング
            if (database) {
                try {
                    // opinionsCountフィールドは廃止済み（動的計算で対応）
                    const firebaseUpdates: any = {
                        updatedAt: new Date().toISOString()
                        // opinionsCount フィールドは廃止済み（動的計算で対応）
                    };
                    console.log('[ProjectService] 🔧 Firebase更新チェック開始:', {
                        'updates object keys': Object.keys(updates),
                        'updates.priority': updates.priority,
                        'typeof updates.priority': typeof updates.priority,
                        'updates.priority !== undefined': updates.priority !== undefined
                    });
                    if (updates.name !== undefined) firebaseUpdates.name = updates.name;
                    if (updates.description !== undefined) firebaseUpdates.description = updates.description;
                    if (updates.status !== undefined) {
                        firebaseUpdates.status = updates.status;
                        if (updates.status === 'completed') {
                            firebaseUpdates.isCompleted = true;
                            firebaseUpdates.completedAt = new Date().toISOString();
                        }
                    }
                    if (updates.priority !== undefined) {
                        console.log('[ProjectService] 🔧 Firebase優先度更新:', {
                            'updates.priority': updates.priority,
                            'updates.priority.level': updates.priority.level,
                            'updates.priority.reason': updates.priority.reason,
                            'reason type': typeof updates.priority.reason
                        });
                        firebaseUpdates.priorityLevel = updates.priority.level;
                        // undefinedのreason をnullに変換してFirebaseに送信（undefinedはFirebaseでフィールドが削除されない）
                        firebaseUpdates.priorityReason = updates.priority.reason !== undefined ? updates.priority.reason : null;
                        firebaseUpdates.priorityUpdatedAt = new Date().toISOString();
                    }
                    if (updates.isArchived !== undefined) {
                        firebaseUpdates.isArchived = updates.isArchived;
                        if (updates.isArchived) {
                            firebaseUpdates.archivedAt = new Date().toISOString();
                        } else {
                            firebaseUpdates.archivedAt = null;
                        }
                    }
                    if (updates.config !== undefined) {
                        // config構造をSQLiteと統一（分離形式）
                        firebaseUpdates.slackChannel = updates.config.slackChannel || null;
                        firebaseUpdates.webformUrl = updates.config.webformUrl || null;
                    }

                    console.log('[ProjectService] 🔧 Firebase更新実行:', {
                        'firebaseUpdates': firebaseUpdates,
                        'path': `users/${userId}/projects/${realProjectId}`
                    });
                    await database.ref(`users/${userId}/projects/${realProjectId}`).update(firebaseUpdates);
                    console.log('[ProjectService] ✅ Firebase update completed');
                } catch (firebaseError) {
                    console.warn('[ProjectService] ⚠️ Firebase update failed, but SQLite update successful:', firebaseError instanceof Error ? firebaseError.message : String(firebaseError));
                    // CLAUDE.md要件: Firebase失敗時もSQLiteは更新済みなので処理継続
                }
            } else {
                console.log('[ProjectService] ⚠️ Firebase database not available - SQLite-only mode');
                // CLAUDE.md要件: Firebase利用不可でもSQLiteで機能提供
            }

            return await this.mapPrismaToProject(prismaProject);
        } catch (error) {
            console.error('[ProjectService] ❌ Update project error:', {
                requestedId: id,
                userId,
                error: error instanceof Error ? error.message : 'Unknown error'
            });
            
            // CLAUDE.md要件: SQLite操作が成功している場合は、Firebase失敗でもロールバックしない
            if (originalData && error instanceof Error && !error.message.includes('Firebase') && !error.message.includes('Project not found')) {
                // SQLite自体のエラーの場合のみロールバック
                try {
                    await prisma.project.update({
                        where: { id: realProjectId },
                        data: originalData
                    });
                    console.log('[ProjectService] 🔄 SQLite rollback completed');
                } catch (rollbackError) {
                    console.error('[ProjectService] ❌ SQLite rollback failed:', rollbackError);
                }
            } else if (error instanceof Error && error.message.includes('Firebase')) {
                // Firebase関連エラーの場合はロールバックせず、SQLite結果を返す
                console.log('[ProjectService] ✅ SQLite update successful, returning despite Firebase issues');
                const updatedProject = await prisma.project.findUnique({
                    where: { id: realProjectId },
                    include: { opinions: true, tasks: true, topics: true }
                });
                
                if (updatedProject) {
                    return await this.mapPrismaToProject(updatedProject);
                }
            }
            
            if (error instanceof AppError) {
                throw error;
            }
            throw new AppError(
                500,
                'PROJECT_UPDATE_ERROR',
                `Project update failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
                error
            );
        }
    }

    async deleteProject(id: string, userId: string): Promise<void> {
        let deletedProject: any = null;
        
        try {
            // Check if project exists and belongs to user - get the actual project object
            const existingProject = await this.getProject(id, userId);
            const realProjectId = existingProject.id; // This is the actual SQLite ID
            
            console.log('[ProjectService] 🗑️ Deleting project:', {
                requestedId: id,
                realSQLiteId: realProjectId,
                userId
            });

            // 削除前のデータを保存（ロールバック用）
            const projectToDelete = await prisma.project.findUnique({ 
                where: { id: realProjectId },
                include: { opinions: true, tasks: true, topics: true }
            });
            if (!projectToDelete) {
                throw new AppError(404, 'PROJECT_NOT_FOUND', 'Project not found for deletion');
            }
            deletedProject = projectToDelete;

            // 1. SQLiteから削除
            await prisma.project.delete({
                where: { id: realProjectId },
            });
            console.log('[ProjectService] ✅ SQLite deletion completed:', realProjectId);

            // 2. Firebaseから削除 - CLAUDE.md要件: 両方のDBから削除、失敗時は適切にハンドリング
            if (database) {
                try {
                    await database.ref(`users/${userId}/projects/${realProjectId}`).remove();
                    console.log('[ProjectService] ✅ Firebase deletion completed');
                } catch (firebaseError) {
                    console.warn('[ProjectService] ⚠️ Firebase deletion failed, but SQLite deletion successful:', firebaseError instanceof Error ? firebaseError.message : String(firebaseError));
                    // CLAUDE.md要件: Firebase失敗時もSQLiteは削除済みなので処理継続
                }
            } else {
                console.log('[ProjectService] ⚠️ Firebase database not available - SQLite-only mode');
                // CLAUDE.md要件: Firebase利用不可でもSQLiteで機能提供
            }

        } catch (error) {
            console.error('[ProjectService] ❌ Delete project error:', {
                requestedId: id,
                userId,
                error: error instanceof Error ? error.message : 'Unknown error'
            });
            
            // CLAUDE.md要件: SQLite削除が成功している場合は、Firebase失敗でもロールバックしない
            if (deletedProject && error instanceof Error && !error.message.includes('Firebase') && !error.message.includes('Project not found')) {
                // SQLite自体のエラーの場合のみロールバック（プロジェクトを復元）
                try {
                    await prisma.project.create({
                        data: {
                            id: deletedProject.id,
                            userId: deletedProject.userId,
                            name: deletedProject.name,
                            description: deletedProject.description,
                            status: deletedProject.status,
                            collectionMethod: deletedProject.collectionMethod,
                            // 動的カウント: opinionsCountフィールドは不要
                            isCompleted: deletedProject.isCompleted,
                            completedAt: deletedProject.completedAt,
                            priorityLevel: deletedProject.priorityLevel,
                            priorityReason: deletedProject.priorityReason,
                            isArchived: deletedProject.isArchived,
                            archivedAt: deletedProject.archivedAt,
                            firebaseId: deletedProject.firebaseId,
                            syncStatus: 'pending',
                            createdAt: deletedProject.createdAt,
                            updatedAt: new Date()
                        }
                    });
                    console.log('[ProjectService] 🔄 SQLite rollback completed - project restored');
                } catch (rollbackError) {
                    console.error('[ProjectService] ❌ SQLite rollback failed:', rollbackError);
                }
            } else if (error instanceof Error && error.message.includes('Firebase')) {
                // Firebase関連エラーの場合は削除完了として扱う
                console.log('[ProjectService] ✅ SQLite deletion successful, completed despite Firebase issues');
                return; // 削除成功として処理終了
            }
            
            if (error instanceof AppError) {
                throw error;
            }
            throw new AppError(
                500,
                'PROJECT_DELETION_ERROR',
                `Project deletion failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
                error
            );
        }
    }

    async completeProject(id: string, userId: string): Promise<Project> {
        return this.updateProject(id, userId, {
            status: 'completed',
        });
    }

    async resetProjectPriority(id: string, userId: string): Promise<Project> {
        try {
            // Check if project exists and belongs to user
            const existingProject = await this.getProject(id, userId);
            const realProjectId = existingProject.id;

            console.log('[ProjectService] 🔄 Resetting project priority:', {
                requestedId: id,
                realId: realProjectId,
                userId
            });

            // 1. SQLiteから優先度をリセット
            const prismaProject = await prisma.project.update({
                where: { id: realProjectId },
                data: {
                    priorityLevel: null,
                    priorityReason: null,
                    priorityUpdatedAt: null,
                },
                include: {
                    opinions: true,
                    tasks: true,
                    topics: {
                        include: {
                            opinions: true
                        }
                    },
                    insights: true,
                },
            });
            console.log('[ProjectService] ✅ SQLite priority reset completed:', realProjectId);

            // 2. Firebaseからも優先度をリセット - CLAUDE.md要件: 両方のDBに反映
            if (database) {
                try {
                    // Firebase側の優先度フィールドを個別に削除（priority サブオブジェクトではなく、ルートレベルのフィールド）
                    const firebaseUpdates = {
                        priorityLevel: null,
                        priorityReason: null,
                        priorityUpdatedAt: null,
                        updatedAt: new Date().toISOString()
                    };
                    await database.ref(`users/${userId}/projects/${realProjectId}`).update(firebaseUpdates);
                    console.log('[ProjectService] ✅ Firebase priority reset completed');
                } catch (firebaseError) {
                    console.warn('[ProjectService] ⚠️ Firebase priority reset failed, but SQLite reset successful:', firebaseError instanceof Error ? firebaseError.message : String(firebaseError));
                    // CLAUDE.md要件: Firebase失敗時もSQLiteは更新済みなので処理継続
                }
            } else {
                console.log('[ProjectService] ⚠️ Firebase database not available - SQLite-only mode');
                // CLAUDE.md要件: Firebase利用不可でもSQLiteで機能提供
            }

            return await this.mapPrismaToProject(prismaProject);
        } catch (error) {
            console.error('[ProjectService] ❌ Reset priority error:', {
                requestedId: id,
                userId,
                error: error instanceof Error ? error.message : 'Unknown error'
            });
            
            if (error instanceof AppError) {
                throw error;
            }
            throw new AppError(
                500,
                'PROJECT_PRIORITY_RESET_ERROR',
                'Failed to reset project priority',
                error
            );
        }
    }

    async incrementOpinionsCount(projectId: string): Promise<void> {
        // 動的カウント: opinionsCountフィールドが削除されたため、この操作は不要
        console.log('[ProjectService] ⚠️ incrementOpinionsCount呼び出しは動的カウントにより不要:', projectId);
        // 何もしない（COUNT()で動的に計算）
    }

    async decrementOpinionsCount(projectId: string): Promise<void> {
        // 動的カウント: opinionsCountフィールドが削除されたため、この操作は不要
        console.log('[ProjectService] ⚠️ decrementOpinionsCount呼び出しは動的カウントにより不要:', projectId);
        // 何もしない（COUNT()で動的に計算）
    }

    private async mapPrismaToProject(prismaProject: any): Promise<Project> {
        // 動的カウント: 実際の意見数を取得
        const opinionsCount = await this.getOpinionsCount(prismaProject.id);
        
        // 未分析意見数を正確に計算
        const unanalyzedOpinionsCount = await this.getUnanalyzedOpinionsCount(
            prismaProject.id, 
            prismaProject.lastAnalysisAt
        );
        
        // 修正: ユーザーの明示的な操作でのみプロジェクトステータスを変更
        // AI分析完了後も元のステータスを維持（collecting, processing等）
        let correctedStatus = prismaProject.status;
        
        console.log('[ProjectService] 📊 プロジェクトステータス維持:', {
            projectId: prismaProject.id,
            currentStatus: prismaProject.status,
            isAnalyzed: prismaProject.isAnalyzed,
            unanalyzedOpinionsCount: unanalyzedOpinionsCount,
            note: 'AI分析後もユーザーの明示的操作まで元ステータスを維持'
        });

        console.log('[ProjectService] 🔍 mapPrismaToProject デバッグ:', {
            projectId: prismaProject.id,
            projectName: prismaProject.name,
            opinionsCount: opinionsCount,
            unanalyzedOpinionsCount: unanalyzedOpinionsCount,
            lastAnalysisAt: prismaProject.lastAnalysisAt,
            topicsCount: prismaProject.topics?.length || 0,
            isAnalyzed: prismaProject.isAnalyzed,
            originalStatus: prismaProject.status,
            correctedStatus: correctedStatus
        });
        
        return {
            id: prismaProject.id,
            name: prismaProject.name,
            description: prismaProject.description,
            status: correctedStatus.toLowerCase().replace(/_/g, '-') as Project['status'],
            collectionMethod: prismaProject.collectionMethod.toLowerCase() as Project['collectionMethod'],
            createdAt: prismaProject.createdAt,
            opinionsCount: opinionsCount,
            unanalyzedOpinionsCount: unanalyzedOpinionsCount,
            isCompleted: prismaProject.isCompleted,
            completedAt: prismaProject.completedAt,
            isArchived: prismaProject.isArchived,
            archivedAt: prismaProject.archivedAt,
            firebaseId: prismaProject.firebaseId,
            isAnalyzed: prismaProject.isAnalyzed,
            lastAnalysisAt: prismaProject.lastAnalysisAt,
            priority: prismaProject.priorityLevel ? {
                level: prismaProject.priorityLevel.toLowerCase() as 'low' | 'medium' | 'high',
                reason: prismaProject.priorityReason,
                updatedAt: prismaProject.priorityUpdatedAt,
            } : undefined,
            // 分析データが実際に存在する場合のみanalysisオブジェクトを作成
            analysis: (prismaProject.isAnalyzed && 
                      (prismaProject.topics?.length > 0 || prismaProject.insights?.length > 0)) ? {
                topInsights: prismaProject.topics?.map((topic: any) => ({
                    id: topic.id,
                    title: topic.name,
                    count: topic.count,
                    description: topic.summary,
                    status: topic.status.toLowerCase().replace('_', '-') as 'unhandled' | 'in-progress' | 'resolved',
                    opinions: topic.opinions?.map((opinion: any) => ({
                        id: opinion.id,
                        content: opinion.content,
                        submittedAt: opinion.submittedAt,
                        isBookmarked: opinion.isBookmarked,
                        sentiment: opinion.sentiment.toLowerCase(),
                        characterCount: opinion.characterCount,
                        topicId: topic.id
                    })) || []
                })) || [],
                insights: prismaProject.insights?.map((insight: any) => ({
                    id: insight.id,
                    title: insight.title,
                    description: insight.description,
                    count: insight.count,
                    priority: insight.priority.toLowerCase(),
                    status: insight.status.toLowerCase().replace('_', '-') as 'unhandled' | 'in-progress' | 'resolved'
                })) || [],
                clusters: prismaProject.topics?.map((topic: any) => ({
                    id: topic.id,
                    name: topic.name,
                    count: topic.count,
                    percentage: Math.round((topic.count / (opinionsCount || 1)) * 100),
                })) || [],
                executedAt: prismaProject.lastAnalysisAt?.toISOString(),
            } : undefined,
            config: {
                slackChannel: prismaProject.slackChannel,
                webformUrl: prismaProject.webformUrl,
            },
        };
    }

    private async ensureUserExists(userId: string): Promise<void> {
        try {
            console.log('[ProjectService] 👤 Checking if user exists in SQLite:', userId);
            
            const existingUser = await prisma.user.findUnique({
                where: { id: userId }
            });

            if (!existingUser) {
                console.log('[ProjectService] 👤 User not found in SQLite, creating user:', userId);
                
                await prisma.user.create({
                    data: {
                        id: userId,
                        email: `user-${userId}@example.com`, // Default email
                        name: 'Auto-created User'
                    }
                });
                
                console.log('[ProjectService] ✅ User created successfully in SQLite:', userId);
            } else {
                console.log('[ProjectService] ✅ User already exists in SQLite:', userId);
            }
        } catch (error) {
            console.error('[ProjectService] ❌ Error ensuring user exists:', error);
            throw new AppError(
                500,
                'USER_CREATION_FAILED',
                `Failed to ensure user exists: ${error instanceof Error ? error.message : 'Unknown error'}`
            );
        }
    }
}