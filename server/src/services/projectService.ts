import { Project, CreateProjectRequest, UpdateProjectRequest } from '../types';
import { AppError } from '../middleware/errorHandler';
import { v4 as uuidv4 } from 'uuid';

export class ProjectService {
    private projects: Map<string, Project> = new Map();

    async createProject(projectData: CreateProjectRequest): Promise<Project> {
        try {
            const id = uuidv4();
            const now = new Date();

            const newProject: Project = {
                id,
                name: projectData.name,
                description: projectData.description,
                status: 'collecting',
                collectionMethod: projectData.collectionMethod,
                createdAt: now,
                opinionsCount: 0,
                isCompleted: false,
                config: projectData.config,
            };

            this.projects.set(id, newProject);
            return newProject;
        } catch (error) {
            throw new AppError(
                500,
                'PROJECT_CREATION_ERROR',
                'Failed to create project',
                error
            );
        }
    }

    async getProjects(): Promise<Project[]> {
        try {
            return Array.from(this.projects.values()).sort(
                (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
            );
        } catch (error) {
            throw new AppError(
                500,
                'PROJECTS_FETCH_ERROR',
                'Failed to fetch projects',
                error
            );
        }
    }

    async getProject(id: string): Promise<Project> {
        const project = this.projects.get(id);
        if (!project) {
            throw new AppError(
                404,
                'PROJECT_NOT_FOUND',
                'Project not found'
            );
        }
        return project;
    }

    async updateProject(id: string, updates: UpdateProjectRequest): Promise<Project> {
        try {
            const project = await this.getProject(id);

            const updatedProject: Project = {
                ...project,
                ...updates,
                // Preserve certain fields that shouldn't be directly updated
                id: project.id,
                createdAt: project.createdAt,
                opinionsCount: project.opinionsCount,
                // Update completion status if needed
                ...(updates.status === 'completed' && {
                    isCompleted: true,
                    completedAt: new Date(),
                }),
            };

            this.projects.set(id, updatedProject);
            return updatedProject;
        } catch (error) {
            if (error instanceof AppError) {
                throw error;
            }
            throw new AppError(
                500,
                'PROJECT_UPDATE_ERROR',
                'Failed to update project',
                error
            );
        }
    }

    async deleteProject(id: string): Promise<void> {
        try {
            const project = await this.getProject(id);
            this.projects.delete(id);
        } catch (error) {
            if (error instanceof AppError) {
                throw error;
            }
            throw new AppError(
                500,
                'PROJECT_DELETE_ERROR',
                'Failed to delete project',
                error
            );
        }
    }

    async completeProject(id: string): Promise<Project> {
        return this.updateProject(id, {
            status: 'completed',
        });
    }

    async resetProjectPriority(id: string): Promise<Project> {
        const project = await this.getProject(id);
        const updatedProject = { ...project };
        delete updatedProject.priority;
        this.projects.set(id, updatedProject);
        return updatedProject;
    }

    async incrementOpinionsCount(projectId: string): Promise<void> {
        const project = await this.getProject(projectId);
        project.opinionsCount += 1;
        this.projects.set(projectId, project);
    }

    async decrementOpinionsCount(projectId: string): Promise<void> {
        const project = await this.getProject(projectId);
        if (project.opinionsCount > 0) {
            project.opinionsCount -= 1;
            this.projects.set(projectId, project);
        }
    }
}