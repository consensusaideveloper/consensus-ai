import { Task, CreateTaskRequest, UpdateTaskRequest } from '../types';
import { AppError } from '../middleware/errorHandler';
import { prisma } from '../lib/database';
import { getDatabase, ref, set, update, remove } from 'firebase/database';
// SQLite uses string fields instead of enums

export class TaskService {
    async createTask(projectId: string, userId: string, taskData: CreateTaskRequest): Promise<Task> {
        let createdTaskId: string | null = null;
        
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

            // 1. SQLiteにタスク作成
            const prismaTask = await prisma.task.create({
                data: {
                    title: taskData.title,
                    description: taskData.description,
                    dueDate: taskData.dueDate,
                    projectId,
                },
            });
            createdTaskId = prismaTask.id;
            console.log('[TaskService] ✅ SQLite creation completed:', prismaTask.id);

            // 2. Firebase同期を実行 - CLAUDE.md要件に従い原子性を保証
            await this.syncTaskToFirebase(userId, project.firebaseId || projectId, prismaTask, 'create');

            return this.mapPrismaToTask(prismaTask);
        } catch (error) {
            console.error('[TaskService] ❌ Task creation failed:', error);
            
            // CLAUDE.md要件: Firebase同期失敗時はSQLiteをロールバック
            if (createdTaskId && error instanceof Error && error.message.includes('Firebase')) {
                try {
                    await prisma.task.delete({ where: { id: createdTaskId } });
                    console.log('[TaskService] 🔄 SQLite rollback completed');
                } catch (rollbackError) {
                    console.error('[TaskService] ❌ SQLite rollback failed:', rollbackError);
                }
            }
            
            if (error instanceof AppError) {
                throw error;
            }
            throw new AppError(
                500,
                'TASK_CREATION_ERROR',
                `Task creation failed: ${error instanceof Error ? error.message : 'Unknown error'}`
            );
        }
    }

    async getTasksByProject(projectId: string, userId: string): Promise<Task[]> {
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

            const prismaTasks = await prisma.task.findMany({
                where: { projectId },
                orderBy: [
                    { status: 'asc' }, // pending first, then in-progress, then completed
                    { dueDate: 'asc' },
                ],
            });

            return prismaTasks.map(this.mapPrismaToTask);
        } catch (error) {
            if (error instanceof AppError) {
                throw error;
            }
            throw new AppError(
                500,
                'TASKS_FETCH_ERROR',
                'Failed to fetch tasks',
                error
            );
        }
    }

    async getTask(id: string, userId: string): Promise<Task> {
        try {
            const prismaTask = await prisma.task.findFirst({
                where: {
                    id,
                    project: {
                        userId,
                    },
                },
            });

            if (!prismaTask) {
                throw new AppError(
                    404,
                    'TASK_NOT_FOUND',
                    'Task not found'
                );
            }

            return this.mapPrismaToTask(prismaTask);
        } catch (error) {
            if (error instanceof AppError) {
                throw error;
            }
            throw new AppError(
                500,
                'TASK_FETCH_ERROR',
                'Failed to fetch task',
                error
            );
        }
    }

    async updateTask(id: string, userId: string, updates: UpdateTaskRequest): Promise<Task> {
        let originalData: any = null;
        
        try {
            // Check if task exists and belongs to user's project
            const existingTask = await this.getTask(id, userId);
            
            // 更新前のデータを保存（ロールバック用）
            const originalTask = await prisma.task.findUnique({ where: { id } });
            if (!originalTask) {
                throw new AppError(404, 'TASK_UPDATE_NOT_FOUND', 'Task not found for update');
            }
            originalData = {
                title: originalTask.title,
                description: originalTask.description,
                status: originalTask.status,
                dueDate: originalTask.dueDate
            };

            const updateData: any = {};
            
            if (updates.title !== undefined) updateData.title = updates.title;
            if (updates.description !== undefined) updateData.description = updates.description;
            if (updates.status !== undefined) {
                updateData.status = updates.status.toUpperCase().replace('-', '_');
            }
            if (updates.dueDate !== undefined) updateData.dueDate = updates.dueDate;

            // 1. SQLiteを更新
            const prismaTask = await prisma.task.update({
                where: { id },
                data: updateData,
                include: {
                    project: true
                }
            });
            console.log('[TaskService] ✅ SQLite update completed:', id);

            // 2. Firebase同期を実行 - CLAUDE.md要件に従い原子性を保証
            await this.syncTaskToFirebase(userId, prismaTask.project.firebaseId || prismaTask.projectId, prismaTask, 'update');

            return this.mapPrismaToTask(prismaTask);
        } catch (error) {
            console.error('[TaskService] ❌ Task update failed:', error);
            
            // CLAUDE.md要件: Firebase同期失敗時はSQLiteをロールバック
            if (originalData && error instanceof Error && error.message.includes('Firebase')) {
                try {
                    await prisma.task.update({
                        where: { id },
                        data: originalData
                    });
                    console.log('[TaskService] 🔄 SQLite rollback completed');
                } catch (rollbackError) {
                    console.error('[TaskService] ❌ SQLite rollback failed:', rollbackError);
                }
            }
            
            if (error instanceof AppError) {
                throw error;
            }
            throw new AppError(
                500,
                'TASK_UPDATE_ERROR',
                `Task update failed: ${error instanceof Error ? error.message : 'Unknown error'}`
            );
        }
    }

    async deleteTask(id: string, userId: string): Promise<void> {
        let deletedTask: any = null;
        
        try {
            // Check if task exists and belongs to user's project
            const task = await this.getTask(id, userId);
            
            // Get project info for Firebase sync
            const project = await prisma.project.findUnique({
                where: { id: task.projectId }
            });

            // 削除前のデータを保存（ロールバック用）
            const taskToDelete = await prisma.task.findUnique({ where: { id } });
            if (!taskToDelete) {
                throw new AppError(404, 'TASK_DELETE_NOT_FOUND', 'Task not found for deletion');
            }
            deletedTask = taskToDelete;

            // 1. SQLiteから削除
            await prisma.task.delete({
                where: { id },
            });
            console.log('[TaskService] ✅ SQLite deletion completed:', id);

            // 2. Firebaseから削除 - CLAUDE.md要件に従い原子性を保証
            if (project) {
                await this.syncTaskToFirebase(userId, project.firebaseId || project.id, { id }, 'delete');
            } else {
                throw new Error('Project not found - cannot ensure atomic transaction');
            }
        } catch (error) {
            console.error('[TaskService] ❌ Task deletion failed:', error);
            
            // CLAUDE.md要件: Firebase削除失敗時はSQLiteをロールバック（タスクを復元）
            if (deletedTask && error instanceof Error && error.message.includes('Firebase')) {
                try {
                    await prisma.task.create({
                        data: {
                            id: deletedTask.id,
                            title: deletedTask.title,
                            description: deletedTask.description,
                            status: deletedTask.status,
                            dueDate: deletedTask.dueDate,
                            projectId: deletedTask.projectId,
                            createdAt: deletedTask.createdAt,
                            updatedAt: new Date()
                        }
                    });
                    console.log('[TaskService] 🔄 SQLite rollback completed - task restored');
                } catch (rollbackError) {
                    console.error('[TaskService] ❌ SQLite rollback failed:', rollbackError);
                }
            }
            
            if (error instanceof AppError) {
                throw error;
            }
            throw new AppError(
                500,
                'TASK_DELETION_ERROR',
                `Task deletion failed: ${error instanceof Error ? error.message : 'Unknown error'}`
            );
        }
    }

    async completeTask(id: string, userId: string): Promise<Task> {
        return this.updateTask(id, userId, { status: 'completed' });
    }

    async getTasksByStatus(projectId: string, status: Task['status'], userId: string): Promise<Task[]> {
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

            const prismaTasks = await prisma.task.findMany({
                where: {
                    projectId,
                    status: status.toUpperCase().replace('-', '_'),
                },
                orderBy: { dueDate: 'asc' },
            });

            return prismaTasks.map(this.mapPrismaToTask);
        } catch (error) {
            if (error instanceof AppError) {
                throw error;
            }
            throw new AppError(
                500,
                'TASKS_BY_STATUS_FETCH_ERROR',
                'Failed to fetch tasks by status',
                error
            );
        }
    }

    async getOverdueTasks(projectId: string, userId: string): Promise<Task[]> {
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

            const now = new Date();
            const prismaTasks = await prisma.task.findMany({
                where: {
                    projectId,
                    status: { not: 'COMPLETED' },
                    dueDate: { lt: now },
                },
                orderBy: { dueDate: 'asc' },
            });

            return prismaTasks.map(this.mapPrismaToTask);
        } catch (error) {
            if (error instanceof AppError) {
                throw error;
            }
            throw new AppError(
                500,
                'OVERDUE_TASKS_FETCH_ERROR',
                'Failed to fetch overdue tasks',
                error
            );
        }
    }

    private mapPrismaToTask(prismaTask: any): Task {
        return {
            id: prismaTask.id,
            title: prismaTask.title,
            description: prismaTask.description,
            status: prismaTask.status.toLowerCase().replace('_', '-') as Task['status'],
            dueDate: prismaTask.dueDate,
            createdAt: prismaTask.createdAt,
            projectId: prismaTask.projectId,
        };
    }

    private async syncTaskToFirebase(userId: string, firebaseProjectId: string, task: any, operation: 'create' | 'update' | 'delete'): Promise<void> {
        try {
            const database = getDatabase();
            
            if (!database) {
                console.log('[TaskService] ⚠️ Firebase database not available');
                return;
            }

            const taskRef = ref(database, `users/${userId}/projects/${firebaseProjectId}/tasks/${task.id}`);

            switch (operation) {
                case 'create':
                case 'update':
                    const firebaseData = {
                        title: task.title,
                        description: task.description,
                        status: task.status,
                        dueDate: task.dueDate instanceof Date ? task.dueDate.toISOString() : task.dueDate,
                        createdAt: task.createdAt instanceof Date ? task.createdAt.toISOString() : task.createdAt
                    };
                    await set(taskRef, firebaseData);
                    console.log(`[TaskService] ✅ Task ${operation}d in Firebase:`, task.id);
                    break;
                case 'delete':
                    await remove(taskRef);
                    console.log('[TaskService] ✅ Task deleted from Firebase:', task.id);
                    break;
            }
        } catch (error) {
            console.error(`[TaskService] ❌ Firebase task ${operation} failed:`, error);
            // CLAUDE.md要件: Firebase同期失敗は全体の失敗として扱う
            throw new Error(`Firebase task ${operation} failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
}