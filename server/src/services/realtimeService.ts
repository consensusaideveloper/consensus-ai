import { Server as SocketIOServer } from 'socket.io';
import { Server as HTTPServer } from 'http';
import { prisma } from '../lib/database';

export interface AnalysisProgress {
    projectId: string;
    stage: 'starting' | 'analyzing' | 'generating_topics' | 'creating_consensus' | 'completed' | 'error';
    progress: number; // 0-100
    message: string;
    data?: any;
    userAction?: string;
}

export interface OpinionUpdate {
    projectId: string;
    newOpinion: {
        id: string;
        content: string;
        sentiment: string;
        submittedAt: Date;
    };
    totalCount: number;
}

export class RealtimeService {
    private io: SocketIOServer;
    private connectedUsers: Map<string, Set<string>> = new Map(); // userId -> Set of socketIds

    constructor(server: HTTPServer) {
        this.io = new SocketIOServer(server, {
            cors: {
                origin: "*", // In production, specify allowed origins
                methods: ["GET", "POST"]
            }
        });

        this.setupSocketHandlers();
    }

    private setupSocketHandlers(): void {
        this.io.on('connection', (socket) => {
            console.log(`Socket connected: ${socket.id}`);

            // Handle user authentication
            socket.on('authenticate', async (data: { userId: string, token?: string }) => {
                try {
                    // In production, validate the token
                    const { userId } = data;
                    
                    // Verify user exists
                    const user = await prisma.user.findUnique({
                        where: { id: userId }
                    });

                    if (user) {
                        // Track connected user
                        if (!this.connectedUsers.has(userId)) {
                            this.connectedUsers.set(userId, new Set());
                        }
                        this.connectedUsers.get(userId)!.add(socket.id);

                        // Join user-specific room
                        socket.join(`user:${userId}`);
                        
                        // Join project rooms for user's projects
                        const projects = await prisma.project.findMany({
                            where: { userId },
                            select: { id: true }
                        });

                        projects.forEach(project => {
                            socket.join(`project:${project.id}`);
                        });

                        socket.emit('authenticated', { 
                            success: true, 
                            userId,
                            projectCount: projects.length 
                        });

                        console.log(`User ${userId} authenticated on socket ${socket.id}`);
                    } else {
                        socket.emit('authentication_error', { error: 'Invalid user' });
                    }
                } catch (error) {
                    console.error('Authentication error:', error);
                    socket.emit('authentication_error', { error: 'Authentication failed' });
                }
            });

            // Handle joining specific project rooms
            socket.on('join_project', async (data: { projectId: string, userId: string }) => {
                try {
                    const { projectId, userId } = data;
                    
                    // Verify user owns the project
                    const project = await prisma.project.findFirst({
                        where: { id: projectId, userId }
                    });

                    if (project) {
                        socket.join(`project:${projectId}`);
                        socket.emit('joined_project', { projectId, success: true });
                        console.log(`Socket ${socket.id} joined project ${projectId}`);
                    } else {
                        socket.emit('join_project_error', { error: 'Project not found or access denied' });
                    }
                } catch (error) {
                    console.error('Join project error:', error);
                    socket.emit('join_project_error', { error: 'Failed to join project' });
                }
            });

            // Handle leaving project rooms
            socket.on('leave_project', (data: { projectId: string }) => {
                const { projectId } = data;
                socket.leave(`project:${projectId}`);
                socket.emit('left_project', { projectId, success: true });
            });

            // Handle disconnection
            socket.on('disconnect', () => {
                console.log(`Socket disconnected: ${socket.id}`);
                
                // Remove from connected users tracking
                for (const [userId, socketIds] of this.connectedUsers.entries()) {
                    if (socketIds.has(socket.id)) {
                        socketIds.delete(socket.id);
                        if (socketIds.size === 0) {
                            this.connectedUsers.delete(userId);
                        }
                        break;
                    }
                }
            });
        });
    }

    // Notify about analysis progress
    notifyAnalysisProgress(progress: AnalysisProgress): void {
        this.io.to(`project:${progress.projectId}`).emit('analysis_progress', progress);
        console.log(`Analysis progress for project ${progress.projectId}: ${progress.stage} (${progress.progress}%)`);
    }

    // Notify about new opinions
    notifyNewOpinion(update: OpinionUpdate): void {
        this.io.to(`project:${update.projectId}`).emit('new_opinion', update);
        
        // CLAUDE.md要件: ダッシュボードのリアルタイム更新のため通知
        // 意見数更新をダッシュボードに反映
        this.io.emit('dashboard_opinion_count_updated', {
            projectId: update.projectId,
            totalCount: update.totalCount,
            newOpinion: update.newOpinion,
            timestamp: new Date().toISOString(),
            updateType: 'opinion_added'
        });
        
        console.log(`New opinion for project ${update.projectId}: total count ${update.totalCount} - notified dashboard`);
    }

    // Notify about project status changes
    notifyProjectStatusChange(projectId: string, newStatus: string, userId: string): void {
        this.io.to(`project:${projectId}`).emit('project_status_changed', {
            projectId,
            newStatus,
            timestamp: new Date().toISOString()
        });
        
        // CLAUDE.md要件: ダッシュボードのリアルタイム更新のためユーザールームにも通知
        this.io.to(`user:${userId}`).emit('dashboard_project_updated', {
            projectId,
            newStatus,
            timestamp: new Date().toISOString(),
            updateType: 'status_change'
        });
        
        console.log(`Project ${projectId} status changed to ${newStatus} - notified dashboard`);
    }

    // Notify about completed analysis
    notifyAnalysisCompleted(projectId: string, results: any, userId: string): void {
        this.io.to(`project:${projectId}`).emit('analysis_completed', {
            projectId,
            results,
            timestamp: new Date().toISOString()
        });
        
        // CLAUDE.md要件: ダッシュボードのリアルタイム更新のためユーザールームにも通知
        this.io.to(`user:${userId}`).emit('dashboard_project_updated', {
            projectId,
            results,
            timestamp: new Date().toISOString(),
            updateType: 'analysis_completed'
        });
        
        console.log(`Analysis completed for project ${projectId} - notified dashboard`);
    }

    // Notify specific user
    notifyUser(userId: string, event: string, data: any): void {
        this.io.to(`user:${userId}`).emit(event, {
            ...data,
            timestamp: new Date().toISOString()
        });
    }

    // Broadcast to all connected clients
    broadcast(event: string, data: any): void {
        this.io.emit(event, {
            ...data,
            timestamp: new Date().toISOString()
        });
    }

    // Get connected users count
    getConnectedUsersCount(): number {
        return this.connectedUsers.size;
    }

    // Get connected users for a specific project
    getProjectConnectedUsers(projectId: string): number {
        return this.io.sockets.adapter.rooms.get(`project:${projectId}`)?.size || 0;
    }

    // Check if user is connected
    isUserConnected(userId: string): boolean {
        return this.connectedUsers.has(userId) && this.connectedUsers.get(userId)!.size > 0;
    }
}

// Singleton instance
let realtimeService: RealtimeService | null = null;

export const initializeRealtimeService = (server: HTTPServer): RealtimeService => {
    if (!realtimeService) {
        realtimeService = new RealtimeService(server);
    }
    return realtimeService;
};

export const getRealtimeService = (): RealtimeService | null => {
    return realtimeService;
};