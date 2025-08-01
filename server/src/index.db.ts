import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { errorHandler } from './middleware/errorHandler';
import projectsRouter from './routes/projects.db';
import analysisRouter from './routes/analysis';
import publicRouter from './routes/public';
import topicsRouter from './routes/topics';
import usersRouter from './routes/users';
import actionLogsRouter from './routes/actionLogs';
import { prisma } from './lib/database';
import { initializeRealtimeService } from './services/realtimeService';

// Load environment variables
dotenv.config();

const app = express();
const server = createServer(app);
const port = process.env.PORT || 3000;

// Initialize realtime service
const realtimeService = initializeRealtimeService(server);

// Middleware
app.use(cors());
app.use(helmet());
app.use(morgan('dev'));
app.use(express.json());

// Routes
app.use('/api/projects', projectsRouter);
app.use('/api/analysis', analysisRouter);
app.use('/api/public', publicRouter);
app.use('/api/topics', topicsRouter);
app.use('/api/users', usersRouter);
app.use('/api/db', actionLogsRouter);

// Health check endpoint
app.get('/health', async (req, res) => {
    try {
        // Check database connection
        await prisma.$queryRaw`SELECT 1`;
        res.json({ 
            status: 'ok',
            database: 'connected',
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        res.status(500).json({ 
            status: 'error',
            database: 'disconnected',
            timestamp: new Date().toISOString(),
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

// Database info endpoint
app.get('/api/info', async (req, res) => {
    try {
        const userCount = await prisma.user.count();
        const projectCount = await prisma.project.count();
        const opinionCount = await prisma.opinion.count();
        const taskCount = await prisma.task.count();
        
        res.json({
            database: {
                users: userCount,
                projects: projectCount,
                opinions: opinionCount,
                tasks: taskCount,
            },
            realtime: {
                connectedUsers: realtimeService.getConnectedUsersCount(),
            },
            timestamp: new Date().toISOString(),
        });
    } catch (error) {
        res.status(500).json({
            error: 'Failed to fetch database info',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

// Real-time statistics endpoint
app.get('/api/realtime/stats', async (req, res) => {
    try {
        const { projectId } = req.query;
        
        const stats = {
            server: {
                connectedUsers: realtimeService.getConnectedUsersCount(),
                uptime: process.uptime(),
                memoryUsage: process.memoryUsage(),
            },
            timestamp: new Date().toISOString(),
        };

        if (projectId && typeof projectId === 'string') {
            (stats as any).project = {
                connectedUsers: realtimeService.getProjectConnectedUsers(projectId),
            };
        }

        res.json(stats);
    } catch (error) {
        res.status(500).json({
            error: 'Failed to fetch realtime stats',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

// Error handling
app.use(errorHandler);

// Start server
server.listen(port, async () => {
    console.log(`🚀 Server is running on port ${port}`);
    console.log(`📊 Health check: http://localhost:${port}/health`);
    console.log(`ℹ️  Database info: http://localhost:${port}/api/info`);
    console.log(`🔌 WebSocket enabled for real-time updates`);

    // 開発環境でのAPI接続テスト
    if (process.env.NODE_ENV === 'development') {
        console.log('\n🧪 開発環境でAPI接続テストを実行中...');
        try {
            const { logSystemInfo, testOpenAIConnection } = await import('./utils/apiTest');
            
            logSystemInfo();
            
            // OpenAI API接続テスト（非同期で実行）
            setTimeout(async () => {
                await testOpenAIConnection();
            }, 2000);
            
        } catch (error) {
            console.error('❌ APIテストの読み込みに失敗:', error);
        }
    }
});