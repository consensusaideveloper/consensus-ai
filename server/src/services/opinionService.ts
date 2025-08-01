import { Opinion, CreateOpinionRequest, UpdateOpinionRequest } from '../types';
import { AppError } from '../middleware/errorHandler';
import { ProjectService } from './projectService';
import { v4 as uuidv4 } from 'uuid';

export class OpinionService {
    private opinions: Map<string, Opinion> = new Map();
    private projectService: ProjectService;

    constructor(projectService: ProjectService) {
        this.projectService = projectService;
    }

    async createOpinion(projectId: string, opinionData: CreateOpinionRequest): Promise<Opinion> {
        try {
            // Verify project exists
            await this.projectService.getProject(projectId);

            const id = uuidv4();
            const now = new Date();

            // Simple sentiment analysis (placeholder)
            const sentiment = this.analyzeSentiment(opinionData.content);

            const newOpinion: Opinion = {
                id,
                content: opinionData.content,
                submittedAt: now,
                isBookmarked: false,
                sentiment,
                characterCount: opinionData.content.length,
                topicId: opinionData.topicId,
                projectId,
            };

            this.opinions.set(id, newOpinion);

            // Increment project opinion count
            await this.projectService.incrementOpinionsCount(projectId);

            return newOpinion;
        } catch (error) {
            if (error instanceof AppError) {
                throw error;
            }
            throw new AppError(
                500,
                'OPINION_CREATION_ERROR',
                'Failed to create opinion',
                error
            );
        }
    }

    async getOpinionsByProject(projectId: string): Promise<Opinion[]> {
        try {
            // Verify project exists
            await this.projectService.getProject(projectId);

            return Array.from(this.opinions.values())
                .filter(opinion => opinion.projectId === projectId)
                .sort((a, b) => b.submittedAt.getTime() - a.submittedAt.getTime());
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

    async getOpinion(id: string): Promise<Opinion> {
        const opinion = this.opinions.get(id);
        if (!opinion) {
            throw new AppError(
                404,
                'OPINION_NOT_FOUND',
                'Opinion not found'
            );
        }
        return opinion;
    }

    async updateOpinion(id: string, updates: UpdateOpinionRequest): Promise<Opinion> {
        try {
            const opinion = await this.getOpinion(id);

            const updatedOpinion: Opinion = {
                ...opinion,
                ...updates,
                // Preserve certain fields
                id: opinion.id,
                content: opinion.content,
                submittedAt: opinion.submittedAt,
                sentiment: opinion.sentiment,
                characterCount: opinion.characterCount,
                projectId: opinion.projectId,
                // Convert date fields properly
                actionStatusUpdatedAt: updates.actionStatusUpdatedAt ? 
                    (typeof updates.actionStatusUpdatedAt === 'string' ? 
                        new Date(updates.actionStatusUpdatedAt) : 
                        updates.actionStatusUpdatedAt) : 
                    opinion.actionStatusUpdatedAt,
                priorityUpdatedAt: updates.priorityUpdatedAt ? 
                    (typeof updates.priorityUpdatedAt === 'string' ? 
                        new Date(updates.priorityUpdatedAt) : 
                        updates.priorityUpdatedAt) : 
                    opinion.priorityUpdatedAt,
                dueDate: updates.dueDate ? 
                    (typeof updates.dueDate === 'string' ? 
                        new Date(updates.dueDate) : 
                        updates.dueDate) : 
                    opinion.dueDate,
            };

            this.opinions.set(id, updatedOpinion);
            return updatedOpinion;
        } catch (error) {
            if (error instanceof AppError) {
                throw error;
            }
            throw new AppError(
                500,
                'OPINION_UPDATE_ERROR',
                'Failed to update opinion',
                error
            );
        }
    }

    async deleteOpinion(id: string): Promise<void> {
        try {
            const opinion = await this.getOpinion(id);
            this.opinions.delete(id);

            // Decrement project opinion count
            await this.projectService.decrementOpinionsCount(opinion.projectId);
        } catch (error) {
            if (error instanceof AppError) {
                throw error;
            }
            throw new AppError(
                500,
                'OPINION_DELETE_ERROR',
                'Failed to delete opinion',
                error
            );
        }
    }

    async getOpinionsByTopic(projectId: string, topicId: string): Promise<Opinion[]> {
        try {
            const projectOpinions = await this.getOpinionsByProject(projectId);
            return projectOpinions.filter(opinion => opinion.topicId === topicId);
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

    private analyzeSentiment(text: string): 'positive' | 'negative' | 'neutral' {
        // Simple keyword-based sentiment analysis (placeholder)
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
}