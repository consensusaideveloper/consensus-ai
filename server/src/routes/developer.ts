import { Router } from 'express';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import { getAIServiceManager } from '../services/aiServiceManager';

const router = Router();

// 開発環境でのみ利用可能なミドルウェア
const requireDevelopmentMode = (req: AuthenticatedRequest, res: any, next: any) => {
    if (process.env.NODE_ENV !== 'development') {
        throw new AppError(
            403,
            'DEVELOPMENT_ONLY',
            'この機能は開発環境でのみ利用可能です'
        );
    }
    next();
};

// Apply authentication and development mode check to all routes
router.use(requireAuth);
router.use(requireDevelopmentMode);

// AI service manager (シングルトン使用)
const aiServiceManager = getAIServiceManager();
console.log('[DeveloperAPI] ✅ AIServiceManager取得完了（シングルトン使用）');

/**
 * GET /api/developer/ai-service/status
 * AIサービスの現在の状態を取得（最適化版）
 */
router.get('/ai-service/status', async (req: AuthenticatedRequest, res, next) => {
    try {
        const serviceInfo = aiServiceManager.getServiceInfo();
        const apiUsage = aiServiceManager.getApiUsageStats();
        
        console.log('[DeveloperAPI] 📊 AIサービス状態確認:', {
            userId: req.userId,
            timestamp: new Date().toISOString(),
            initialized: serviceInfo.initialized,
            apiUsage
        });

        res.json({
            success: true,
            timestamp: new Date().toISOString(),
            serviceInfo: {
                initialized: serviceInfo.initialized,
                serviceStatus: serviceInfo.serviceStatus,
                apiUsage: serviceInfo.apiUsage
            },
            message: 'AIサービス状態を正常に取得しました（最適化版）'
        });
    } catch (error) {
        next(error);
    }
});

/**
 * GET /api/developer/ai-service/health-check
 * AIサービスの軽量ヘルスチェック
 */
router.get('/ai-service/health-check', async (req: AuthenticatedRequest, res, next) => {
    try {
        console.log('[DeveloperAPI] 🏥 AIサービスヘルスチェック開始:', {
            userId: req.userId,
            timestamp: new Date().toISOString()
        });

        const healthResult = await aiServiceManager.healthCheck();
        
        console.log('[DeveloperAPI] ✅ AIサービスヘルスチェック完了:', {
            userId: req.userId,
            status: healthResult.status,
            serviceAvailable: healthResult.serviceAvailable
        });

        res.json({
            success: true,
            timestamp: new Date().toISOString(),
            health: healthResult,
            message: '軽量ヘルスチェックが完了しました'
        });
    } catch (error) {
        console.error('[DeveloperAPI] ❌ ヘルスチェックエラー:', error);
        next(error);
    }
});

/**
 * GET /api/developer/ai-service/usage-stats
 * API使用量統計の取得
 */
router.get('/ai-service/usage-stats', async (req: AuthenticatedRequest, res, next) => {
    try {
        const stats = aiServiceManager.getApiUsageStats();
        
        console.log('[DeveloperAPI] 📊 API使用量統計取得:', {
            userId: req.userId,
            callCount: stats.callCount,
            hoursElapsed: stats.hoursElapsed
        });

        res.json({
            success: true,
            timestamp: new Date().toISOString(),
            stats,
            message: 'API使用量統計を取得しました'
        });
    } catch (error) {
        next(error);
    }
});

/**
 * POST /api/developer/ai-service/reset-stats
 * API使用量統計のリセット
 */
router.post('/ai-service/reset-stats', async (req: AuthenticatedRequest, res, next) => {
    try {
        console.log('[DeveloperAPI] 🔄 API統計リセット要求:', {
            userId: req.userId,
            timestamp: new Date().toISOString()
        });

        aiServiceManager.resetApiUsageStats();

        res.json({
            success: true,
            timestamp: new Date().toISOString(),
            message: 'API使用量統計をリセットしました'
        });
    } catch (error) {
        next(error);
    }
});

/**
 * POST /api/developer/ai-service/reinitialize
 * AIサービスの強制再初期化
 */
router.post('/ai-service/reinitialize', async (req: AuthenticatedRequest, res, next) => {
    try {
        console.log('[DeveloperAPI] 🔄 AIサービス強制再初期化開始:', {
            userId: req.userId,
            timestamp: new Date().toISOString()
        });

        await aiServiceManager.forceReinitialize();
        const serviceInfo = aiServiceManager.getServiceInfo();
        
        console.log('[DeveloperAPI] ✅ AIサービス強制再初期化完了:', {
            userId: req.userId,
            initialized: serviceInfo.initialized
        });

        res.json({
            success: true,
            timestamp: new Date().toISOString(),
            serviceInfo,
            message: 'AIサービスの強制再初期化が完了しました'
        });
    } catch (error) {
        console.error('[DeveloperAPI] ❌ 強制再初期化失敗:', error);
        next(error);
    }
});

export default router;