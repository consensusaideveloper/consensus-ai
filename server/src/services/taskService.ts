import { Task, CreateTaskRequest, UpdateTaskRequest } from '../types';
import { AppError } from '../middleware/errorHandler';
import { ProjectService } from './projectService';
import { v4 as uuidv4 } from 'uuid';

export class TaskService {
    private tasks: Map<string, Task> = new Map();
    private projectService: ProjectService;

    constructor(projectService: ProjectService) {
        this.projectService = projectService;
    }

    async createTask(projectId: string, taskData: CreateTaskRequest): Promise<Task> {
        try {
            // Verify project exists
            await this.projectService.getProject(projectId);

            const id = uuidv4();
            const now = new Date();

            const newTask: Task = {
                id,
                title: taskData.title,
                description: taskData.description,
                status: 'pending',
                dueDate: taskData.dueDate,
                createdAt: now,
                projectId,
            };

            this.tasks.set(id, newTask);
            return newTask;
        } catch (error) {
            if (error instanceof AppError) {
                throw error;
            }
            throw new AppError(
                500,
                'TASK_CREATION_ERROR',
                'Failed to create task',
                error
            );
        }
    }

    async getTasksByProject(projectId: string): Promise<Task[]> {
        try {
            // Verify project exists
            await this.projectService.getProject(projectId);

            return Array.from(this.tasks.values())
                .filter(task => task.projectId === projectId)
                .sort((a, b) => {
                    // Sort by status (pending first), then by due date
                    if (a.status !== b.status) {
                        const statusOrder = { 'pending': 0, 'in-progress': 1, 'completed': 2 };
                        return statusOrder[a.status] - statusOrder[b.status];
                    }
                    return a.dueDate.getTime() - b.dueDate.getTime();
                });
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

    async getTask(id: string): Promise<Task> {
        const task = this.tasks.get(id);
        if (!task) {
            throw new AppError(
                404,
                'TASK_NOT_FOUND',
                'Task not found'
            );
        }
        return task;
    }

    async updateTask(id: string, updates: UpdateTaskRequest): Promise<Task> {
        try {
            const task = await this.getTask(id);

            const updatedTask: Task = {
                ...task,
                ...updates,
                // Preserve certain fields
                id: task.id,
                createdAt: task.createdAt,
                projectId: task.projectId,
            };

            this.tasks.set(id, updatedTask);
            return updatedTask;
        } catch (error) {
            if (error instanceof AppError) {
                throw error;
            }
            throw new AppError(
                500,
                'TASK_UPDATE_ERROR',
                'Failed to update task',
                error
            );
        }
    }

    async deleteTask(id: string): Promise<void> {
        try {
            await this.getTask(id);
            this.tasks.delete(id);
        } catch (error) {
            if (error instanceof AppError) {
                throw error;
            }
            throw new AppError(
                500,
                'TASK_DELETE_ERROR',
                'Failed to delete task',
                error
            );
        }
    }

    async completeTask(id: string): Promise<Task> {
        return this.updateTask(id, { status: 'completed' });
    }

    async getTasksByStatus(projectId: string, status: Task['status']): Promise<Task[]> {
        try {
            const tasks = await this.getTasksByProject(projectId);
            return tasks.filter(task => task.status === status);
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

    async getOverdueTasks(projectId: string): Promise<Task[]> {
        try {
            const tasks = await this.getTasksByProject(projectId);
            const now = new Date();
            return tasks.filter(task => 
                task.status !== 'completed' && 
                task.dueDate < now
            );
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
}