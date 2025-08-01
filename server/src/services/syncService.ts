import { prisma } from '../lib/database';
import { database } from '../lib/firebase-admin';
import { AppError } from '../middleware/errorHandler';
import { OpinionService } from './opinionService.db';

export class SyncService {
    private opinionService = new OpinionService();
    /**
     * Firebase ユーザーをSQLiteに同期
     */
    async syncUserToSQLite(userId: string, userData: any): Promise<void> {
        try {
            console.log('[SyncService] 👤 Syncing user to SQLite:', userId);
            
            // SQLiteにユーザーが存在するかチェック
            const existingUser = await prisma.user.findUnique({
                where: { id: userId }
            });

            if (!existingUser) {
                // ユーザーを作成
                await prisma.user.create({
                    data: {
                        id: userId,
                        email: userData.email || '',
                        name: userData.name || 'Unknown User',
                        purpose: userData.purpose || null
                    }
                });
                console.log('[SyncService] ✅ User created in SQLite:', userId);
            } else {
                // ユーザー情報を更新
                await prisma.user.update({
                    where: { id: userId },
                    data: {
                        email: userData.email || existingUser.email,
                        name: userData.name || existingUser.name,
                        purpose: userData.purpose || existingUser.purpose
                    }
                });
                console.log('[SyncService] ✅ User updated in SQLite:', userId);
            }
        } catch (error) {
            console.error('[SyncService] ❌ Failed to sync user to SQLite:', error);
            throw new AppError(500, 'SYNC_ERROR', 'Failed to sync user to SQLite');
        }
    }

    /**
     * プロジェクトをFirebaseとSQLiteの両方に保存
     */
    async syncProjectBidirectional(userId: string, projectData: any, operation: 'create' | 'update' | 'delete', projectId?: string): Promise<any> {
        try {
            console.log('[SyncService] 🔄 Bidirectional project sync:', operation, projectId || 'new');

            // ユーザーが存在することを確認（Firebase認証後にすでに同期済みであることを前提）
            if (operation === 'create' || operation === 'update') {
                const existingUser = await prisma.user.findUnique({
                    where: { id: userId }
                });
                
                if (!existingUser) {
                    throw new Error(`User ${userId} not found. Please ensure user is properly synchronized from Firebase before creating projects.`);
                }
            }

            let result = null;

            switch (operation) {
                case 'create':
                    result = await this.createProjectBidirectional(userId, projectData);
                    break;
                case 'update':
                    if (!projectId) throw new Error('Project ID required for update');
                    result = await this.updateProjectBidirectional(userId, projectId, projectData);
                    break;
                case 'delete':
                    if (!projectId) throw new Error('Project ID required for delete');
                    await this.deleteProjectBidirectional(userId, projectId);
                    break;
            }

            return result;
        } catch (error) {
            console.error('[SyncService] ❌ Bidirectional sync failed:', error);
            throw new AppError(500, 'SYNC_ERROR', `Bidirectional sync failed: ${error instanceof Error ? error instanceof Error ? error.message : 'Unknown error' : 'Unknown error'}`);
        }
    }

    private async createProjectBidirectional(userId: string, projectData: any): Promise<any> {
        let sqliteProjectId: string | null = null;
        
        try {
            // 1. SQLiteに作成
            const sqliteProject = await prisma.project.create({
                data: {
                    name: projectData.name,
                    description: projectData.description,
                    collectionMethod: projectData.collectionMethod?.toUpperCase() || 'WEBFORM',
                    status: projectData.status?.toUpperCase() || 'COLLECTING',
                    // 動的カウント: opinionsCountフィールドは削除済み
                    slackChannel: projectData.config?.slackChannel,
                    webformUrl: projectData.config?.webformUrl,
                    userId,
                },
                include: {
                    opinions: true,
                    tasks: true,
                    topics: true,
                    insights: true,
                },
            });
            sqliteProjectId = sqliteProject.id;
            console.log('[SyncService] ✅ SQLite creation completed');

            // 2. Firebaseに同期 - CLAUDE.md要件に従い原子性を保証
            if (database) {
                console.log('[SyncService] 📡 Syncing to Firebase...');
                const firebaseData = {
                    name: projectData.name,
                    description: projectData.description,
                    status: projectData.status || 'collecting',
                    collectionMethod: projectData.collectionMethod || 'webform',
                    createdAt: new Date().toISOString(),
                    // opinionsCountフィールドの更新は廃止（動的カウントに変更）
                    isCompleted: false,
                    config: projectData.config || {}
                };

                // Firebase同期を実行 - update()で安全に同期（既存データ保護）
                await database.ref(`users/${userId}/projects/${sqliteProject.id}`).update(firebaseData);
                console.log('[SyncService] ✅ Firebase sync completed');
            } else {
                throw new Error('Firebase database not available - cannot ensure atomic transaction');
            }

            return this.mapPrismaToProject(sqliteProject);
        } catch (error) {
            console.error('[SyncService] ❌ Bidirectional creation failed:', error);
            
            // CLAUDE.md要件: Firebase同期失敗時はSQLiteをロールバック
            if (sqliteProjectId) {
                try {
                    await prisma.project.delete({ where: { id: sqliteProjectId } });
                    console.log('[SyncService] 🔄 SQLite rollback completed');
                } catch (rollbackError) {
                    console.error('[SyncService] ❌ SQLite rollback failed:', rollbackError);
                }
            }
            
            throw new AppError(500, 'PROJECT_ERROR', `Project creation failed: ${error instanceof Error ? error instanceof Error ? error.message : 'Unknown error' : 'Unknown error'}`);
        }
    }

    private async updateProjectBidirectional(userId: string, projectId: string, updates: any): Promise<any> {
        let originalData: any = null;
        
        try {
            // 0. 更新前のデータを保存（ロールバック用）
            const originalProject = await prisma.project.findUnique({ where: { id: projectId } });
            if (!originalProject) {
                throw new Error(`Project not found: ${projectId}`);
            }
            originalData = {
                name: originalProject.name,
                description: originalProject.description,
                status: originalProject.status,
                priorityLevel: originalProject.priorityLevel,
                priorityReason: originalProject.priorityReason,
                isCompleted: originalProject.isCompleted,
                completedAt: originalProject.completedAt
            };

            // 1. SQLiteを更新
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

            const sqliteProject = await prisma.project.update({
                where: { id: projectId },
                data: updateData,
                include: {
                    opinions: true,
                    tasks: true,
                    topics: true,
                    insights: true,
                },
            });
            console.log('[SyncService] ✅ SQLite update completed');

            // 2. Firebaseに同期 - CLAUDE.md要件に従い原子性を保証
            if (database) {
                const firebaseUpdates: any = {};
                if (updates.name !== undefined) firebaseUpdates.name = updates.name;
                if (updates.description !== undefined) firebaseUpdates.description = updates.description;
                if (updates.status !== undefined) firebaseUpdates.status = updates.status;
                if (updates.priority !== undefined) firebaseUpdates.priority = updates.priority;

                // Firebase同期を実行 - 失敗時は全体を失敗として扱う
                await database.ref(`users/${userId}/projects/${projectId}`).update(firebaseUpdates);
                console.log('[SyncService] ✅ Firebase update completed');
            } else {
                throw new Error('Firebase database not available - cannot ensure atomic transaction');
            }

            return this.mapPrismaToProject(sqliteProject);
        } catch (error) {
            console.error('[SyncService] ❌ Bidirectional update failed:', error);
            
            // CLAUDE.md要件: Firebase同期失敗時はSQLiteをロールバック
            if (originalData && error instanceof Error && !error.message.includes('Project not found')) {
                try {
                    await prisma.project.update({
                        where: { id: projectId },
                        data: originalData
                    });
                    console.log('[SyncService] 🔄 SQLite rollback completed');
                } catch (rollbackError) {
                    console.error('[SyncService] ❌ SQLite rollback failed:', rollbackError);
                }
            }
            
            throw new AppError(500, 'PROJECT_ERROR', `Project update failed: ${error instanceof Error ? error instanceof Error ? error.message : 'Unknown error' : 'Unknown error'}`);
        }
    }

    private async deleteProjectBidirectional(userId: string, projectId: string): Promise<void> {
        try {
            console.log('[SyncService] 🗑️ Starting bidirectional project deletion:', {
                userId,
                projectId
            });

            // 1. まずプロジェクトを取得してFirebase IDを確認
            let project;
            let sqliteId = projectId;
            let firebaseId = projectId;
            
            try {
                // Firebase IDが渡された場合（-で始まる）、SQLite IDを取得
                if (projectId.startsWith('-')) {
                    console.log('[SyncService] Firebase ID detected, finding SQLite project...');
                    project = await prisma.project.findFirst({
                        where: {
                            userId,
                            firebaseId: projectId
                        }
                    });
                    
                    if (project) {
                        sqliteId = project.id;
                        firebaseId = projectId;
                        console.log('[SyncService] ✅ Found project:', { sqliteId, firebaseId });
                    } else {
                        console.log('[SyncService] ⚠️ Project not found by firebaseId, trying direct SQLite ID');
                        project = await prisma.project.findFirst({
                            where: { id: projectId, userId }
                        });
                        sqliteId = projectId;
                        firebaseId = project?.firebaseId || projectId;
                    }
                } else {
                    // SQLite IDが渡された場合
                    project = await prisma.project.findFirst({
                        where: { id: projectId, userId }
                    });
                    sqliteId = projectId;
                    firebaseId = project?.firebaseId || projectId;
                }
            } catch (error) {
                console.error('[SyncService] ❌ Error finding project for deletion:', error);
                throw error;
            }

            if (!project) {
                console.log('[SyncService] ⚠️ Project not found for deletion:', projectId);
                return; // プロジェクトが見つからない場合は何もしない
            }

            // 2. 削除前に関連データを確認
            console.log('[SyncService] 🔍 Checking related data before deletion:', sqliteId);
            const opinionsCount = await prisma.opinion.count({
                where: { projectId: sqliteId }
            });
            const tasksCount = await prisma.task.count({
                where: { projectId: sqliteId }
            });
            const topicsCount = await prisma.topic.count({
                where: { projectId: sqliteId }
            });
            
            console.log('[SyncService] 📊 Related data counts:', {
                opinions: opinionsCount,
                tasks: tasksCount,
                topics: topicsCount
            });

            // 3. CLAUDE.md要件に従い、Firebase → SQL の順序で削除
            // まずFirebaseから削除
            let firebaseDeleted = false;
            if (database && firebaseId) {
                console.log('[SyncService] 🗑️ Deleting from Firebase FIRST:', firebaseId);
                
                try {
                    // Firebase削除にタイムアウトを設定（5秒）
                    const deletePromise = database.ref(`users/${userId}/projects/${firebaseId}`).remove();
                    const timeoutPromise = new Promise((_, reject) => 
                        setTimeout(() => reject(new Error('Firebase delete timeout')), 5000)
                    );
                    
                    await Promise.race([deletePromise, timeoutPromise]);
                    firebaseDeleted = true;
                    console.log('[SyncService] ✅ Firebase deletion completed');
                } catch (firebaseError) {
                    console.error('[SyncService] ❌ Firebase deletion failed:', firebaseError);
                    throw new AppError(500, 'DELETE_ERROR', `Firebase deletion failed: ${firebaseError instanceof Error ? firebaseError.message : 'Unknown error'}`);
                }
            } else {
                throw new Error('Firebase database not available or no firebaseId - cannot ensure atomic transaction');
            }

            // 4. Firebaseの削除が成功した場合のみ、SQLiteから削除
            if (firebaseDeleted) {
                console.log('[SyncService] 🗑️ Deleting from SQLite:', sqliteId);
                
                try {
                    // 明示的に関連データを削除（CASCADEが効かない場合の保険）
                    if (opinionsCount > 0) {
                        console.log('[SyncService] 🗑️ Explicitly deleting opinions using OpinionService...');
                        const deletedCount = await this.opinionService.deleteOpinionsByProject(sqliteId, userId);
                        console.log('[SyncService] ✅ Opinions deleted explicitly:', deletedCount);
                    }
                    
                    if (tasksCount > 0) {
                        console.log('[SyncService] 🗑️ Explicitly deleting tasks...');
                        await prisma.task.deleteMany({
                            where: { projectId: sqliteId }
                        });
                        console.log('[SyncService] ✅ Tasks deleted explicitly');
                    }
                    
                    if (topicsCount > 0) {
                        console.log('[SyncService] 🗑️ Explicitly deleting topics...');
                        await prisma.topic.deleteMany({
                            where: { projectId: sqliteId }
                        });
                        console.log('[SyncService] ✅ Topics deleted explicitly');
                    }
                    
                    // プロジェクト本体を削除
                    await prisma.project.delete({
                        where: { id: sqliteId }
                    });
                    
                    // 削除後の確認
                    const remainingOpinions = await prisma.opinion.count({
                        where: { projectId: sqliteId }
                    });
                    console.log('[SyncService] ✅ SQLite deletion completed. Remaining opinions:', remainingOpinions);
                } catch (sqliteError) {
                    console.error('[SyncService] ❌ SQLite deletion failed:', sqliteError);
                    
                    // CLAUDE.md要件: SQLite削除失敗時はFirebaseを復元（ロールバック）
                    console.log('[SyncService] 🔄 Attempting to restore Firebase data...');
                    try {
                        const firebaseData = {
                            name: project.name,
                            description: project.description,
                            status: project.status.toLowerCase().replace('_', '-'),
                            collectionMethod: project.collectionMethod.toLowerCase(),
                            createdAt: project.createdAt.toISOString(),
                            // 動的カウント: opinionsCountフィールドは削除済み
                            isCompleted: project.isCompleted,
                            completedAt: project.completedAt?.toISOString() || null,
                            config: {}
                        };
                        
                        if (project.priorityLevel) {
                            (firebaseData as any)['priority'] = {
                                level: project.priorityLevel.toLowerCase(),
                                reason: project.priorityReason,
                                updatedAt: project.priorityUpdatedAt?.toISOString()
                            };
                        }
                        
                        await database.ref(`users/${userId}/projects/${firebaseId}`).set(firebaseData);
                        console.log('[SyncService] ✅ Firebase rollback completed - project restored');
                    } catch (rollbackError) {
                        console.error('[SyncService] ❌ Firebase rollback failed:', rollbackError);
                    }
                    
                    throw new AppError(500, 'DELETE_ERROR', `SQLite deletion failed: ${sqliteError instanceof Error ? sqliteError.message : 'Unknown error'}`);
                }
            }

            console.log('[SyncService] ✅ Bidirectional project deletion completed');
        } catch (error) {
            console.error('[SyncService] ❌ Failed to delete project bidirectionally:', error);
            throw error instanceof AppError ? error : new AppError(500, 'DELETE_ERROR', `Project deletion failed: ${error instanceof Error ? error instanceof Error ? error.message : 'Unknown error' : 'Unknown error'}`);
        }
    }

    private mapPrismaToProject(prismaProject: any): any {
        return {
            id: prismaProject.id,
            name: prismaProject.name,
            description: prismaProject.description,
            status: prismaProject.status.toLowerCase().replace('_', '-'),
            collectionMethod: prismaProject.collectionMethod.toLowerCase(),
            createdAt: prismaProject.createdAt,
            opinionsCount: prismaProject.opinionsCount,
            isCompleted: prismaProject.isCompleted,
            completedAt: prismaProject.completedAt,
            priority: prismaProject.priorityLevel ? {
                level: prismaProject.priorityLevel.toLowerCase(),
                reason: prismaProject.priorityReason,
                updatedAt: prismaProject.priorityUpdatedAt
            } : undefined,
            config: {
                slackChannel: prismaProject.slackChannel,
                webformUrl: prismaProject.webformUrl
            },
            analysis: {
                topInsights: prismaProject.insights?.map((insight: any) => ({
                    id: insight.id,
                    title: insight.title,
                    count: insight.count,
                    description: insight.description,
                    status: insight.status.toLowerCase().replace('_', '-')
                })) || [],
                clusters: prismaProject.clusters?.map((cluster: any) => ({
                    id: cluster.id,
                    name: cluster.name,
                    count: cluster.count,
                    percentage: cluster.percentage
                })) || []
            },
            tasks: prismaProject.tasks?.map((task: any) => ({
                id: task.id,
                title: task.title,
                description: task.description,
                status: task.status.toLowerCase().replace('_', '-'),
                dueDate: task.dueDate,
                createdAt: task.createdAt
            })) || []
        };
    }
}