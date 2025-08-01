export interface AIResponse {
    id: string;
    content: string;
    model: string;
    created: number;
}

export interface ConsensusRequest {
    prompt: string;
    models?: string[];
    maxResponses?: number;
}

export interface ConsensusResponse {
    responses: AIResponse[];
    consensus: string;
    metadata: {
        totalResponses: number;
        modelsUsed: string[];
        processingTime: number;
    };
}

export interface ErrorResponse {
    error: string;
    code: string;
    details?: unknown;
}

// Project Management Types
export interface Project {
    id: string;
    name: string;
    description?: string;
    status: 'collecting' | 'paused' | 'ready-for-analysis' | 'processing' | 'completed' | 'error';
    collectionMethod: 'slack' | 'webform';
    createdAt: Date;
    opinionsCount: number; // 動的計算値 - Firebase/SQLite同期済み
    unanalyzedOpinionsCount?: number; // 未分析意見数（topicId=null OR submittedAt > lastAnalysisAt）
    isCompleted?: boolean;
    completedAt?: Date;
    isArchived?: boolean;
    archivedAt?: Date;
    firebaseId?: string;
    isAnalyzed?: boolean;
    lastAnalysisAt?: Date;
    lastAnalyzedOpinionsCount?: number; // インクリメンタル分析用
    sqliteId?: string; // SQLiteのID参照
    priority?: {
        level: 'low' | 'medium' | 'high';
        reason?: string;
        updatedAt?: Date;
        assignee?: string;
    };
    analysis?: {
        topInsights: Array<{
            id: string;
            title: string;
            count: number;
            description: string;
            status?: 'unhandled' | 'in-progress' | 'resolved';
            keywords?: string[];
            sentiment?: {
                positive: number;
                negative: number;
                neutral: number;
            };
            priority?: {
                level: 'low' | 'medium' | 'high';
                assignee?: string;
                reason?: string;
                updatedAt?: number;
            };
            opinions?: Array<{
                id: string;
                content: string;
                sentiment?: 'positive' | 'negative' | 'neutral';
                isBookmarked?: boolean;
                topicId?: string;
                opinionId?: string;
            }>;
        }>;
        insights?: Array<{
            id: string;
            title: string;
            description: string;
            count: number;
            priority: string;
            status?: 'unhandled' | 'in-progress' | 'resolved';
        }>;
        clusters?: Array<{
            id: number;
            name: string;
            count: number;
            percentage: number;
        }>;
        executedAt?: string;
        topics?: Array<{
            id: string;
            title?: string;
            name?: string;
            description?: string;
            count?: number;
            status?: 'unhandled' | 'in-progress' | 'resolved' | 'dismissed';
            keywords?: string[];
            sentiment?: {
                positive: number;
                negative: number;
                neutral: number;
            };
            priority?: {
                level: 'low' | 'medium' | 'high';
                assignee?: string;
                reason?: string;
                updatedAt?: number;
            };
            opinions?: Array<{
                id: string;
                content: string;
                sentiment?: 'positive' | 'negative' | 'neutral';
                isBookmarked?: boolean;
                topicId?: string;
                opinionId?: string;
            }>;
        }>;
        summary?: string;
        generatedAt?: string;
    };
    config?: {
        slackChannel?: string;
        webformUrl?: string;
    };
    completionData?: {
        insights: string;
        improvements: string;
        nextSteps: string;
        summary: string;
    };
    tasks?: Array<{
        id: string;
        title: string;
        description: string;
        status: 'pending' | 'in-progress' | 'completed';
        dueDate: Date;
        createdAt: Date;
    }>;
}

export interface Opinion {
    id: string;
    content: string;
    submittedAt: Date;
    isBookmarked: boolean;
    sentiment: 'positive' | 'negative' | 'neutral';
    characterCount: number;
    metadata?: any; // JSON metadata for additional opinion information
    topicId?: string;
    projectId: string;
    // AI分析状態情報（OpinionAnalysisState）
    lastAnalyzedAt?: Date;
    analysisVersion?: number;
    classificationConfidence?: number;
    manualReviewFlag?: boolean;
    // Action-related fields
    actionStatus?: 'unhandled' | 'in-progress' | 'resolved' | 'dismissed';
    actionStatusReason?: string;
    actionStatusUpdatedAt?: Date;
    priorityLevel?: 'high' | 'medium' | 'low';
    priorityReason?: string;
    priorityUpdatedAt?: Date;
    dueDate?: Date;
    actionLogs?: string; // JSON format for action logs
}

export interface Task {
    id: string;
    title: string;
    description: string;
    status: 'pending' | 'in-progress' | 'completed';
    dueDate: Date;
    createdAt: Date;
    projectId: string;
}

export interface Topic {
    id: string;
    name: string;
    count: number;
    summary: string;
    status: 'unhandled' | 'in-progress' | 'resolved';
    updatedAt: Date;
    projectId: string;
    // Phase 3-1: 高度分析のための追加フィールド
    keywords?: string[];
    opinions?: Opinion[];
    sentiment?: {
        positive: number;
        negative: number;
        neutral: number;
    };
}

// API Request/Response Types
export interface CreateProjectRequest {
    name: string;
    description?: string;
    collectionMethod: 'slack' | 'webform';
    config?: {
        slackChannel?: string;
        webformUrl?: string;
    };
}

export interface UpdateProjectRequest {
    name?: string;
    description?: string;
    status?: Project['status'];
    priority?: Project['priority'];
    config?: Project['config'];
    opinionsCount?: number;
    isArchived?: boolean;
    archivedAt?: Date;
    firebaseId?: string;
}

export interface CreateOpinionRequest {
    content: string;
    topicId?: string;
    submittedAt?: string | Date;
    isBookmarked?: boolean;
    sentiment?: 'positive' | 'negative' | 'neutral';
    characterCount?: number;
    metadata?: any; // JSON metadata for additional opinion information
}

export interface UpdateOpinionRequest {
    isBookmarked?: boolean;
    topicId?: string;
    // Action-related fields
    actionStatus?: 'unhandled' | 'in-progress' | 'resolved' | 'dismissed';
    actionStatusReason?: string;
    actionStatusUpdatedAt?: string | Date;
    priorityLevel?: 'high' | 'medium' | 'low';
    priorityReason?: string;
    priorityUpdatedAt?: string | Date;
    dueDate?: string | Date;
    actionLogs?: string; // JSON format for action logs
}

export interface CreateTaskRequest {
    title: string;
    description: string;
    dueDate: Date;
}

export interface UpdateTaskRequest {
    title?: string;
    description?: string;
    status?: Task['status'];
    dueDate?: Date;
} 