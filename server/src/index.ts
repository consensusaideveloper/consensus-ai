// Load environment variables FIRST
import * as dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { createServer } from 'http';
import { errorHandler } from './middleware/errorHandler';
import { prisma } from './lib/database';
// import consensusRouter from './routes/consensus';
// import projectsRouter from './routes/projects';
// import analysisRouter from './routes/analysis';
// import { initializeRealtimeService } from './services/realtimeService';

// Firebase Admin SDK初期化
import './lib/firebase-admin';
console.log('✅ Firebase Admin SDK enabled');

// Limits configuration validation and logging
import { LimitsConfig } from './config/limits';
const validationResult = LimitsConfig.validateLimits();
if (!validationResult.valid) {
  console.error('❌ Invalid limits configuration:', validationResult.errors);
  process.exit(1);
}
LimitsConfig.logCurrentSettings();

const app = express();
const port = parseInt(process.env.PORT || '3001', 10);
const server = createServer(app);

// Middleware
app.use(cors());
app.use(helmet());
app.use(morgan('dev'));

// Raw body parser specifically for Stripe webhooks (must come before JSON parser)
app.use('/api/stripe/webhook', express.raw({ type: 'application/json' }));
app.use('/api/billing/webhook', express.raw({ type: 'application/json' }));
app.use('/api/billing/test-webhook', express.raw({ type: 'application/json' }));

// JSON parser for all other routes
app.use(express.json());

// Routes - 段階的復元
import usersRouter from './routes/users';
app.use('/api/users', usersRouter);
console.log('✅ Users API enabled');

// プロジェクトDBルーターを有効化
import projectsDbRouter from './routes/projects.db';
app.use('/api/db/projects', projectsDbRouter);
console.log('✅ プロジェクトDBルーター enabled');

// AI分析APIを有効化
import analysisRouter from './routes/analysis';
app.use('/api/analysis', analysisRouter);
console.log('✅ AI分析API enabled');

// Topics APIを有効化
import topicsRouter from './routes/topics';
app.use('/api/topics', topicsRouter);
console.log('✅ Topics API enabled');

// Phase 3: Trial Management API
import trialRouter from './routes/trial';
app.use('/api/trial', trialRouter);
console.log('✅ Trial API enabled');

// Phase 3.1: Plan Details API
import plansRouter from './routes/plans';
app.use('/api/plans', plansRouter);
console.log('✅ Plans API enabled');

// ActionLogs APIを有効化
import actionLogsRouter from './routes/actionLogs';
app.use('/api/db', actionLogsRouter);
console.log('✅ ActionLogs API enabled');

// 管理者APIを有効化（開発者権限必須）
import adminRouter from './routes/admin';
app.use('/api/admin', adminRouter);
console.log('✅ Admin API enabled (developer auth required)');

// Phase 2: Stripe Billing API
import billingRouter from './routes/billing';
app.use('/api/billing', billingRouter);
app.use('/api/stripe', billingRouter);
console.log('✅ Billing API enabled');

// Contact Form API
import { contactRouter } from './routes/contact';
app.use('/api/contact', contactRouter);
console.log('✅ Contact API enabled');

// Public API (認証不要)
import publicRouter from './routes/public';
app.use('/api/public', publicRouter);
console.log('✅ Public API enabled');

// Actions API (deprecated) - アクション詳細機能はOpinion APIに統合されました

// 立場分析APIを有効化（新機能） - TEMPORARILY DISABLED
console.log('⚠️ 立場分析API temporarily disabled for debugging');
/*
import stanceRouter from './routes/stance';
app.use('/api/stance', stanceRouter);
*/

// AI Sentiment分析APIを有効化（Phase 1: 独立実装） - TEMPORARILY DISABLED
console.log('⚠️ AI Sentiment分析API temporarily disabled for debugging');
/*
import aiSentimentRouter from './routes/ai-sentiment';
app.use('/api/ai-sentiment', aiSentimentRouter);
*/

// 開発者APIを有効化（開発環境のみ） - TEMPORARILY DISABLED
console.log('⚠️ 開発者API temporarily disabled for debugging');
/*
import developerRouter from './routes/developer';
if (process.env.NODE_ENV === 'development') {
    app.use('/api/developer', developerRouter);
    console.log('[Server] ✅ 開発者API有効化');
}
*/

// Routes (一時的に無効化してデバッグ) - Firebase versions
// app.use('/api/consensus', consensusRouter);
// app.use('/api/projects', require('./routes/projects').default);

// Simple test endpoint
app.get('/test', (req, res) => {
    console.log('Simple test endpoint called');
    res.send('Hello World!');
});

// Health check endpoint - WITH DATABASE CONNECTION
app.get('/health', async (req, res) => {
    try {
        console.log('Health check endpoint called');
        // Test database connection
        await prisma.$queryRaw`SELECT 1`;
        res.json({ 
            status: 'ok',
            database: 'connected',
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('❌ Health check failed:', error);
        res.status(500).json({ 
            status: 'error',
            database: 'disconnected',
            error: error instanceof Error ? error.message : 'Unknown error',
            timestamp: new Date().toISOString()
        });
    }
});

// Error handling - use the imported errorHandler
app.use(errorHandler);

// Initialize Socket.IO service
// Temporarily disable Socket.IO to diagnose server startup issue
console.log('⚠️ Socket.IO temporarily disabled for debugging');
/*
try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { initializeRealtimeService } = require('./services/realtimeService');
    initializeRealtimeService(server);
    console.log('✅ Socket.IO service initialized');
} catch (error) {
    console.error('❌ Socket.IO service initialization failed:', error);
    console.error('⚠️ Continuing without Socket.IO...');
}
*/

// Background Analysis Service will be initialized on-demand
console.log('ℹ️ Background Analysis Service will be initialized on-demand');

// 定期削除サービスを初期化・開始
import { ScheduledDeletionService } from './services/scheduledDeletionService';
const scheduledDeletionService = new ScheduledDeletionService();
scheduledDeletionService.startScheduledDeletion();
console.log('✅ Scheduled deletion service initialized');

// Phase 1-3: タイムアウト対策 - サーバーレベルのタイムアウト設定
server.timeout = 10 * 60 * 1000; // 10分
server.keepAliveTimeout = 10 * 60 * 1000; // 10分
server.headersTimeout = 10 * 60 * 1000; // 10分

console.log('[Server] ⏰ タイムアウト設定: 10分');

// Start server with error handling
console.log(`🚀 Starting server on port ${port}...`);
server.listen(port, () => {
    console.log(`✅ Server is running on port ${port}`);
    console.log(`🔗 Health check: http://localhost:${port}/health`);
    console.log(`🌟 Ready to receive requests`);
}).on('error', (error: Error) => {
    console.error('❌ サーバーエラー:', error);
    if (error.message.includes('EADDRINUSE')) {
        console.error(`💡 ポート ${port} は既に使用されています。別のプロセスを終了するか、別のポートを使用してください。`);
    }
    process.exit(1);
}); 