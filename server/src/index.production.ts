import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { createServer } from 'http';

// Middleware imports
import { errorHandler } from './middleware/errorHandler';
import { performanceMiddleware, createRateLimiter, getPerformanceMetrics, getMemoryUsage, getCPUUsage } from './middleware/performance';
import { sanitizeInput, requestSizeLimit, sqlInjectionProtection, suspiciousActivityDetection, securityHeaders, configureCORS, getSecurityStats } from './middleware/security';
import { requestLoggingMiddleware, logger } from './utils/logger';

// Route imports
import projectsRouter from './routes/projects.db';
import analysisRouter from './routes/analysis';
import publicRouter from './routes/public';

// Service imports
import { prisma } from './lib/database';
import { initializeRealtimeService } from './services/realtimeService';

// Load environment variables
dotenv.config();

const app = express();
const server = createServer(app);
const port = process.env.PORT || 3000;
const isDevelopment = process.env.NODE_ENV === 'development';

// Initialize realtime service
const realtimeService = initializeRealtimeService(server);

// Global middleware - applied to all routes
app.use(performanceMiddleware);
app.use(requestLoggingMiddleware);
app.use(securityHeaders);

// CORS configuration
if (isDevelopment) {
    app.use(cors());
} else {
    app.use(cors(configureCORS()));
}

// Security middleware
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            scriptSrc: ["'self'"],
            imgSrc: ["'self'", "data:", "https:"],
        },
    },
}));

// Request processing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(requestSizeLimit(1024)); // 1MB limit
app.use(sanitizeInput);
app.use(sqlInjectionProtection);
app.use(suspiciousActivityDetection);

// Rate limiting
const generalRateLimit = createRateLimiter(100, 60 * 1000); // 100 requests per minute
const analysisRateLimit = createRateLimiter(10, 60 * 1000); // 10 analysis requests per minute
const publicRateLimit = createRateLimiter(50, 60 * 1000); // 50 public requests per minute

app.use('/api', generalRateLimit);
app.use('/api/analysis', analysisRateLimit);
app.use('/api/public', publicRateLimit);

// API Routes
app.use('/api/projects', projectsRouter);
app.use('/api/analysis', analysisRouter);
app.use('/api/public', publicRouter);

// 管理者APIを有効化（開発者権限必須）
import adminRouter from './routes/admin';
app.use('/api/admin', adminRouter);
console.log('✅ Admin API enabled (developer auth required)');

// Health check endpoint
app.get('/health', async (req, res) => {
    try {
        const startTime = Date.now();
        
        // Check database connection
        await prisma.$queryRaw`SELECT 1`;
        const dbResponseTime = Date.now() - startTime;
        
        const health = {
            status: 'ok',
            timestamp: new Date().toISOString(),
            uptime: process.uptime(),
            database: {
                status: 'connected',
                responseTime: dbResponseTime
            },
            memory: getMemoryUsage(),
            cpu: getCPUUsage(),
            performance: getPerformanceMetrics(),
            security: getSecurityStats(),
            realtime: {
                connectedUsers: realtimeService.getConnectedUsersCount()
            }
        };
        
        res.json(health);
    } catch (error) {
        logger.error('Health check failed', error);
        res.status(500).json({
            status: 'error',
            timestamp: new Date().toISOString(),
            database: {
                status: 'disconnected',
                error: error instanceof Error ? error.message : 'Unknown error'
            }
        });
    }
});

// Comprehensive system info endpoint
app.get('/api/system/info', async (req, res) => {
    try {
        const [userCount, projectCount, opinionCount, taskCount, topicCount] = await Promise.all([
            prisma.user.count(),
            prisma.project.count(),
            prisma.opinion.count(),
            prisma.task.count(),
            prisma.topic.count()
        ]);

        const systemInfo = {
            server: {
                version: process.env.npm_package_version || '1.0.0',
                nodeVersion: process.version,
                platform: process.platform,
                uptime: process.uptime(),
                pid: process.pid
            },
            database: {
                users: userCount,
                projects: projectCount,
                opinions: opinionCount,
                tasks: taskCount,
                topics: topicCount
            },
            performance: getPerformanceMetrics(),
            memory: getMemoryUsage(),
            cpu: getCPUUsage(),
            security: getSecurityStats(),
            realtime: {
                connectedUsers: realtimeService.getConnectedUsersCount()
            },
            timestamp: new Date().toISOString()
        };

        res.json(systemInfo);
    } catch (error) {
        logger.error('System info fetch failed', error);
        res.status(500).json({
            error: 'Failed to fetch system information',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

// Logs endpoint (admin only in production)
app.get('/api/system/logs', async (req, res) => {
    try {
        const { level, limit = 100 } = req.query;
        
        // In production, this should be protected with admin authentication
        if (!isDevelopment) {
            const adminToken = req.headers['x-admin-token'];
            if (!adminToken || adminToken !== process.env.ADMIN_TOKEN) {
                return res.status(403).json({ error: 'Admin access required' });
            }
        }

        const logs = await logger.getLogs(level as any, parseInt(limit as string));
        res.json({
            logs,
            total: logs.length,
            level: level || 'all',
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        logger.error('Logs fetch failed', error);
        res.status(500).json({
            error: 'Failed to fetch logs',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

// Metrics endpoint for monitoring
app.get('/api/metrics', (req, res) => {
    const metrics = {
        performance: getPerformanceMetrics(),
        memory: getMemoryUsage(),
        cpu: getCPUUsage(),
        security: getSecurityStats(),
        realtime: {
            connectedUsers: realtimeService.getConnectedUsersCount()
        },
        timestamp: new Date().toISOString()
    };

    // Prometheus-style format if requested
    const format = req.query.format;
    if (format === 'prometheus') {
        const prometheus = [
            `# HELP requests_total Total number of requests`,
            `# TYPE requests_total counter`,
            `requests_total ${metrics.performance.requestCount}`,
            ``,
            `# HELP response_time_ms Average response time in milliseconds`,
            `# TYPE response_time_ms gauge`,
            `response_time_ms ${metrics.performance.averageResponseTime}`,
            ``,
            `# HELP memory_usage_mb Memory usage in megabytes`,
            `# TYPE memory_usage_mb gauge`,
            `memory_usage_mb ${metrics.memory.heapUsed}`,
            ``,
            `# HELP connected_users Currently connected users`,
            `# TYPE connected_users gauge`,
            `connected_users ${metrics.realtime.connectedUsers}`,
        ].join('\n');

        res.setHeader('Content-Type', 'text/plain');
        res.send(prometheus);
    } else {
        res.json(metrics);
    }
});

// Graceful shutdown handling
const gracefulShutdown = async (signal: string) => {
    logger.info(`Received ${signal}, starting graceful shutdown...`);
    
    server.close(async () => {
        logger.info('HTTP server closed');
        
        try {
            await prisma.$disconnect();
            logger.info('Database connection closed');
        } catch (error) {
            logger.error('Error closing database connection', error);
        }
        
        logger.info('Graceful shutdown completed');
        process.exit(0);
    });

    // Force close after 30 seconds
    setTimeout(() => {
        logger.error('Force closing server after 30 seconds');
        process.exit(1);
    }, 30000);
};

// Handle shutdown signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
    logger.error('Uncaught Exception', error);
    gracefulShutdown('uncaughtException');
});

process.on('unhandledRejection', (reason, promise) => {
    logger.error('Unhandled Rejection', { reason, promise });
    gracefulShutdown('unhandledRejection');
});

// Error handling middleware (must be last)
app.use(errorHandler);

// Start server
server.listen(port, () => {
    logger.info(`🚀 ConsensusAI Backend started successfully`, {
        port,
        environment: process.env.NODE_ENV,
        nodeVersion: process.version,
        pid: process.pid
    });
    
    console.log(`
🌟 ConsensusAI Backend Server Started
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🚀 Server URL:        http://localhost:${port}
📊 Health Check:      http://localhost:${port}/health
📈 System Info:       http://localhost:${port}/api/system/info
📋 Metrics:           http://localhost:${port}/api/metrics
🔌 WebSocket:         Enabled for real-time updates
🛡️  Security:         Enhanced protection enabled
📝 Logging:           Advanced logging enabled
⚡ Performance:       Monitoring enabled
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`);
});