import { Request, Response, NextFunction } from 'express';
import { ConsensusRequest, CreateProjectRequest, UpdateProjectRequest, CreateOpinionRequest, UpdateOpinionRequest, CreateTaskRequest, UpdateTaskRequest } from '../types';
import { AppError } from './errorHandler';

export const validateConsensusRequest = (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    const { prompt, models, maxResponses } = req.body as ConsensusRequest;

    if (!prompt || typeof prompt !== 'string') {
        throw new AppError(
            400,
            'INVALID_REQUEST',
            'Prompt is required and must be a string'
        );
    }

    if (models && (!Array.isArray(models) || !models.every(m => typeof m === 'string'))) {
        throw new AppError(
            400,
            'INVALID_REQUEST',
            'Models must be an array of strings'
        );
    }

    if (maxResponses && (typeof maxResponses !== 'number' || maxResponses < 1)) {
        throw new AppError(
            400,
            'INVALID_REQUEST',
            'maxResponses must be a positive number'
        );
    }

    next();
};

export const validateCreateProject = (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    const { name, collectionMethod, description, config } = req.body as CreateProjectRequest;

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
        throw new AppError(
            400,
            'INVALID_REQUEST',
            'Project name is required and must be a non-empty string'
        );
    }

    if (!collectionMethod || !['slack', 'webform'].includes(collectionMethod)) {
        throw new AppError(
            400,
            'INVALID_REQUEST',
            'Collection method must be either "slack" or "webform"'
        );
    }

    if (description !== undefined && typeof description !== 'string') {
        throw new AppError(
            400,
            'INVALID_REQUEST',
            'Description must be a string if provided'
        );
    }

    if (config !== undefined && typeof config !== 'object') {
        throw new AppError(
            400,
            'INVALID_REQUEST',
            'Config must be an object if provided'
        );
    }

    next();
};

export const validateUpdateProject = (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    const { name, description, status, priority, config } = req.body as UpdateProjectRequest;

    if (name !== undefined && (typeof name !== 'string' || name.trim().length === 0)) {
        throw new AppError(
            400,
            'INVALID_REQUEST',
            'Project name must be a non-empty string if provided'
        );
    }

    if (description !== undefined && typeof description !== 'string') {
        throw new AppError(
            400,
            'INVALID_REQUEST',
            'Description must be a string if provided'
        );
    }

    if (status !== undefined && !['collecting', 'paused', 'ready-for-analysis', 'processing', 'completed', 'error'].includes(status)) {
        throw new AppError(
            400,
            'INVALID_REQUEST',
            'Invalid status value'
        );
    }

    if (priority !== undefined && typeof priority !== 'object') {
        throw new AppError(
            400,
            'INVALID_REQUEST',
            'Priority must be an object if provided'
        );
    }

    if (config !== undefined && typeof config !== 'object') {
        throw new AppError(
            400,
            'INVALID_REQUEST',
            'Config must be an object if provided'
        );
    }

    next();
};

export const validateCreateOpinion = (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    const { content, topicId } = req.body as CreateOpinionRequest;

    if (!content || typeof content !== 'string' || content.trim().length === 0) {
        throw new AppError(
            400,
            'INVALID_REQUEST',
            'Opinion content is required and must be a non-empty string'
        );
    }

    if (content.length > 5000) {
        throw new AppError(
            400,
            'INVALID_REQUEST',
            'Opinion content must be 5000 characters or less'
        );
    }

    if (topicId !== undefined && typeof topicId !== 'string') {
        throw new AppError(
            400,
            'INVALID_REQUEST',
            'Topic ID must be a string if provided'
        );
    }

    next();
};

export const validateUpdateOpinion = (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    const { 
        isBookmarked, 
        topicId, 
        actionStatus, 
        priorityLevel, 
        priorityReason, 
        priorityUpdatedAt, 
        dueDate, 
        actionLogs 
    } = req.body as UpdateOpinionRequest;

    if (isBookmarked !== undefined && typeof isBookmarked !== 'boolean') {
        throw new AppError(
            400,
            'INVALID_REQUEST',
            'isBookmarked must be a boolean if provided'
        );
    }

    if (topicId !== undefined && typeof topicId !== 'string') {
        throw new AppError(
            400,
            'INVALID_REQUEST',
            'Topic ID must be a string if provided'
        );
    }

    // Action-related field validations
    if (actionStatus !== undefined && 
        !['unhandled', 'in-progress', 'resolved', 'dismissed'].includes(actionStatus)) {
        throw new AppError(
            400,
            'INVALID_REQUEST',
            'Action status must be one of: unhandled, in-progress, resolved, dismissed'
        );
    }

    if (priorityLevel !== undefined && 
        !['high', 'medium', 'low'].includes(priorityLevel)) {
        throw new AppError(
            400,
            'INVALID_REQUEST',
            'Priority level must be one of: high, medium, low'
        );
    }

    if (priorityReason !== undefined && typeof priorityReason !== 'string') {
        throw new AppError(
            400,
            'INVALID_REQUEST',
            'Priority reason must be a string if provided'
        );
    }

    if (priorityUpdatedAt !== undefined && typeof priorityUpdatedAt !== 'string') {
        throw new AppError(
            400,
            'INVALID_REQUEST',
            'Priority updated at must be a date string if provided'
        );
    }

    if (dueDate !== undefined && typeof dueDate !== 'string') {
        throw new AppError(
            400,
            'INVALID_REQUEST',
            'Due date must be a date string if provided'
        );
    }

    if (actionLogs !== undefined && typeof actionLogs !== 'string') {
        throw new AppError(
            400,
            'INVALID_REQUEST',
            'Action logs must be a string if provided'
        );
    }

    next();
};

export const validateCreateTask = (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    const { title, description, dueDate } = req.body as CreateTaskRequest;

    if (!title || typeof title !== 'string' || title.trim().length === 0) {
        throw new AppError(
            400,
            'INVALID_REQUEST',
            'Task title is required and must be a non-empty string'
        );
    }

    if (!description || typeof description !== 'string' || description.trim().length === 0) {
        throw new AppError(
            400,
            'INVALID_REQUEST',
            'Task description is required and must be a non-empty string'
        );
    }

    if (!dueDate) {
        throw new AppError(
            400,
            'INVALID_REQUEST',
            'Due date is required'
        );
    }

    // Convert string to Date if needed
    const dueDateObj = new Date(dueDate);
    if (isNaN(dueDateObj.getTime())) {
        throw new AppError(
            400,
            'INVALID_REQUEST',
            'Due date must be a valid date'
        );
    }

    // Store the converted date back to req.body
    req.body.dueDate = dueDateObj;

    next();
};

export const validateUpdateTask = (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    const { title, description, status, dueDate } = req.body as UpdateTaskRequest;

    if (title !== undefined && (typeof title !== 'string' || title.trim().length === 0)) {
        throw new AppError(
            400,
            'INVALID_REQUEST',
            'Task title must be a non-empty string if provided'
        );
    }

    if (description !== undefined && (typeof description !== 'string' || description.trim().length === 0)) {
        throw new AppError(
            400,
            'INVALID_REQUEST',
            'Task description must be a non-empty string if provided'
        );
    }

    if (status !== undefined && !['pending', 'in-progress', 'completed'].includes(status)) {
        throw new AppError(
            400,
            'INVALID_REQUEST',
            'Invalid status value'
        );
    }

    if (dueDate !== undefined) {
        const dueDateObj = new Date(dueDate);
        if (isNaN(dueDateObj.getTime())) {
            throw new AppError(
                400,
                'INVALID_REQUEST',
                'Due date must be a valid date if provided'
            );
        }
        req.body.dueDate = dueDateObj;
    }

    next();
}; 