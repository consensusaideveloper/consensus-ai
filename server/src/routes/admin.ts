import { Router } from 'express';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth';
import { requireDeveloperAuth } from '../middleware/developerAuth';
import { AppError } from '../middleware/errorHandler';
import { UserFeedbackService } from '../services/userFeedbackService';
import { ScheduledDeletionService } from '../services/scheduledDeletionService';
import { BillingAnalyticsService } from '../services/billingAnalyticsService';
import { prisma } from '../lib/database';

const router = Router();
const scheduledDeletionService = new ScheduledDeletionService();

// 認証と開発者権限の確認
router.use(requireAuth);
router.use(requireDeveloperAuth);

/**
 * GET /api/admin/feedback-stats
 * 退会フィードバック統計の取得（開発者限定）
 */
router.get('/feedback-stats', async (req: AuthenticatedRequest, res, next) => {
  try {
    console.log('[AdminAPI] 📊 フィードバック統計取得要求:', {
      userId: req.userId,
      timestamp: new Date().toISOString()
    });

    const stats = await UserFeedbackService.getFeedbackStats();

    console.log('[AdminAPI] ✅ フィードバック統計取得完了:', {
      userId: req.userId,
      totalFeedbacks: stats.totalFeedbacks,
      reasonStatsCount: stats.reasonStats.length
    });

    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      data: stats,
      message: 'フィードバック統計を正常に取得しました'
    });

  } catch (error) {
    console.error('[AdminAPI] ❌ フィードバック統計取得エラー:', error);
    next(error);
  }
});

/**
 * GET /api/admin/feedback-recent
 * 最新の退会フィードバック一覧（開発者限定）
 */
router.get('/feedback-recent', async (req: AuthenticatedRequest, res, next) => {
  try {
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = parseInt(req.query.offset as string) || 0;

    if (limit > 100) {
      throw new AppError(400, 'INVALID_LIMIT', 'limitは100以下である必要があります');
    }

    console.log('[AdminAPI] 📋 最新フィードバック取得要求:', {
      userId: req.userId,
      limit,
      offset
    });

    // 最新のフィードバックを取得（匿名化済み）
    const recentFeedbacks = await UserFeedbackService.getRecentFeedbacks(limit, offset);

    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      data: {
        feedbacks: recentFeedbacks.items,
        totalCount: recentFeedbacks.totalCount,
        hasMore: recentFeedbacks.hasMore
      },
      message: '最新フィードバックを取得しました'
    });

  } catch (error) {
    console.error('[AdminAPI] ❌ 最新フィードバック取得エラー:', error);
    next(error);
  }
});

/**
 * GET /api/admin/feedback-trends
 * フィードバックトレンド分析（開発者限定）
 */
router.get('/feedback-trends', async (req: AuthenticatedRequest, res, next) => {
  try {
    const days = parseInt(req.query.days as string) || 30;

    if (days > 365) {
      throw new AppError(400, 'INVALID_DAYS', 'daysは365以下である必要があります');
    }

    console.log('[AdminAPI] 📈 フィードバックトレンド取得要求:', {
      userId: req.userId,
      days
    });

    const trends = await UserFeedbackService.getFeedbackTrends(days);

    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      data: trends,
      message: `過去${days}日間のフィードバックトレンドを取得しました`
    });

  } catch (error) {
    console.error('[AdminAPI] ❌ フィードバックトレンド取得エラー:', error);
    next(error);
  }
});

/**
 * GET /api/admin/scheduled-deletion-status
 * 定期削除ジョブの状態確認（開発者限定）
 */
router.get('/scheduled-deletion-status', async (req: AuthenticatedRequest, res, next) => {
  try {
    console.log('[AdminAPI] 🔍 定期削除ジョブ状態確認:', {
      userId: req.userId,
      timestamp: new Date().toISOString()
    });

    const jobStatus = scheduledDeletionService.getJobStatus();
    
    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      data: {
        isRunning: jobStatus.isRunning,
        nextExecution: jobStatus.nextExecution?.toISOString(),
        schedule: '毎日午前3時実行',
        timezone: 'Asia/Tokyo',
        description: jobStatus.isRunning 
          ? '定期削除ジョブは正常に動作しています' 
          : '定期削除ジョブは停止中です'
      },
      message: '定期削除ジョブ状態を取得しました'
    });

  } catch (error) {
    console.error('[AdminAPI] ❌ 定期削除ジョブ状態確認エラー:', error);
    next(error);
  }
});

/**
 * POST /api/admin/scheduled-deletion-run-manual
 * 手動で定期削除を実行（開発・テスト用）
 */
router.post('/scheduled-deletion-run-manual', async (req: AuthenticatedRequest, res, next) => {
  try {
    console.log('[AdminAPI] 🔧 手動削除実行開始:', {
      userId: req.userId,
      timestamp: new Date().toISOString()
    });
    
    await scheduledDeletionService.runManualDeletion();
    
    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      message: '手動削除が正常に完了しました',
      executedAt: new Date().toISOString()
    });

  } catch (error) {
    console.error('[AdminAPI] ❌ 手動削除実行エラー:', error);
    next(error);
  }
});

/**
 * GET /api/admin/system-stats
 * システム統計情報の取得（開発者限定）
 */
router.get('/system-stats', async (req: AuthenticatedRequest, res, next) => {
  try {
    console.log('[AdminAPI] 📊 システム統計取得:', {
      userId: req.userId,
      timestamp: new Date().toISOString()
    });

    // ユーザー統計
    const totalUsers = await prisma.user.count();
    const activeUsers = await prisma.user.count({
      where: {
        isDeleted: false
      }
    });
    const deletionRequestedUsers = await prisma.user.count({
      where: {
        isDeleted: true,
        scheduledDeletionAt: {
          not: null
        }
      }
    });

    // プロジェクト統計
    const totalProjects = await prisma.project.count();
    const activeProjects = await prisma.project.count({
      where: {
        isArchived: false
      }
    });

    // 意見統計
    const totalOpinions = await prisma.opinion.count();

    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      data: {
        users: {
          total: totalUsers,
          active: activeUsers,
          deletionRequested: deletionRequestedUsers
        },
        projects: {
          total: totalProjects,
          active: activeProjects
        },
        opinions: {
          total: totalOpinions
        }
      },
      message: 'システム統計を取得しました'
    });

  } catch (error) {
    console.error('[AdminAPI] ❌ システム統計取得エラー:', error);
    next(error);
  }
});


/**
 * GET /api/admin/billing-report
 * 課金レポート取得（開発者限定）
 */
router.get('/billing-report', async (req: AuthenticatedRequest, res, next) => {
  try {
    const { startDate, endDate } = req.query;
    
    console.log('[AdminAPI] 📈 課金レポート取得要求:', {
      userId: req.userId,
      startDate,
      endDate,
      timestamp: new Date().toISOString()
    });

    const report = await BillingAnalyticsService.getBillingReport({
      startDate: startDate ? new Date(startDate as string) : undefined,
      endDate: endDate ? new Date(endDate as string) : undefined
    });

    console.log('[AdminAPI] ✅ 課金レポート取得完了:', {
      userId: req.userId,
      totalUsers: report.totalUsers,
      proUsers: report.proUsers,
      estimatedRevenue: report.revenue.estimated
    });

    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      data: report,
      message: '課金レポートを正常に取得しました'
    });

  } catch (error) {
    console.error('[AdminAPI] ❌ 課金レポート取得エラー:', error);
    next(error);
  }
});


export default router;