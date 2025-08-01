import { Router } from 'express';
import { OpinionStanceAnalysisService } from '../services/opinionStanceAnalysisService';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import { prisma } from '../lib/database';

const router = Router();

// Apply authentication to all routes
router.use(requireAuth);

// Initialize service
const stanceAnalysisService = new OpinionStanceAnalysisService();

console.log('[StanceAPI] ✅ 立場分析API初期化完了');

/**
 * POST /api/stance/topics/:topicId/analyze
 * 特定トピックに対する立場分析を実行
 */
router.post('/topics/:topicId/analyze', async (req: AuthenticatedRequest, res, next) => {
  const startTime = Date.now();
  const topicId = req.params.topicId;
  const userId = req.userId!;

  console.log('[StanceAPI] 🎯 トピック立場分析開始:', {
    topicId,
    userId,
    timestamp: new Date().toISOString()
  });

  try {
    // トピックの存在確認とアクセス権限チェック
    const topic = await prisma.topic.findFirst({
      where: {
        id: topicId,
        project: { userId }
      },
      include: {
        opinions: true
      }
    });

    if (!topic) {
      throw new AppError(404, 'TOPIC_NOT_FOUND', 'トピックが見つかりません');
    }

    if (!topic.opinions || topic.opinions.length === 0) {
      throw new AppError(400, 'NO_OPINIONS', 'このトピックには分析対象の意見がありません');
    }

    // 立場分析実行
    const request = {
      opinions: topic.opinions.map(op => ({
        id: op.id,
        content: op.content
      })),
      topic: {
        id: topic.id,
        name: topic.name,
        summary: topic.summary
      }
    };

    const result = await stanceAnalysisService.analyzeOpinionStances(request);

    const responseTime = Date.now() - startTime;
    console.log('[StanceAPI] ✅ トピック立場分析完了:', {
      topicId,
      analyzedCount: result.analyses.length,
      summary: result.summary,
      responseTime: `${responseTime}ms`
    });

    res.json({
      success: true,
      data: result,
      meta: {
        topicId,
        responseTime,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    const responseTime = Date.now() - startTime;
    console.error('[StanceAPI] ❌ トピック立場分析エラー:', {
      topicId,
      userId,
      responseTime: `${responseTime}ms`,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    next(error);
  }
});

/**
 * POST /api/stance/projects/:projectId/analyze
 * プロジェクト全体の立場分析を実行
 */
router.post('/projects/:projectId/analyze', async (req: AuthenticatedRequest, res, next) => {
  const startTime = Date.now();
  const projectId = req.params.projectId;
  const userId = req.userId!;

  console.log('[StanceAPI] 🏗️ プロジェクト立場分析開始:', {
    projectId,
    userId,
    timestamp: new Date().toISOString()
  });

  try {
    const results = await stanceAnalysisService.analyzeProjectStances(projectId, userId);

    const responseTime = Date.now() - startTime;
    console.log('[StanceAPI] ✅ プロジェクト立場分析完了:', {
      projectId,
      topicsAnalyzed: results.length,
      responseTime: `${responseTime}ms`
    });

    res.json({
      success: true,
      data: results,
      meta: {
        projectId,
        topicsAnalyzed: results.length,
        responseTime,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    const responseTime = Date.now() - startTime;
    console.error('[StanceAPI] ❌ プロジェクト立場分析エラー:', {
      projectId,
      userId,
      responseTime: `${responseTime}ms`,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    next(error);
  }
});

/**
 * POST /api/stance/opinions/:opinionId/analyze
 * 単一意見の立場分析を実行
 */
router.post('/opinions/:opinionId/analyze', async (req: AuthenticatedRequest, res, next) => {
  const startTime = Date.now();
  const opinionId = req.params.opinionId;
  const userId = req.userId!;
  const { topicId } = req.body;

  console.log('[StanceAPI] 🔍 単一意見立場分析開始:', {
    opinionId,
    topicId,
    userId,
    timestamp: new Date().toISOString()
  });

  try {
    if (!topicId) {
      throw new AppError(400, 'MISSING_TOPIC_ID', 'topicIdが必要です');
    }

    // 意見とトピックの存在確認
    const opinion = await prisma.opinion.findFirst({
      where: {
        id: opinionId,
        project: { userId }
      }
    });

    if (!opinion) {
      throw new AppError(404, 'OPINION_NOT_FOUND', '意見が見つかりません');
    }

    const topic = await prisma.topic.findFirst({
      where: {
        id: topicId,
        project: { userId }
      }
    });

    if (!topic) {
      throw new AppError(404, 'TOPIC_NOT_FOUND', 'トピックが見つかりません');
    }

    // 単一意見立場分析実行
    const result = await stanceAnalysisService.analyzeSingleOpinionStance(
      opinionId,
      topicId,
      {
        id: opinion.id,
        content: opinion.content
      },
      {
        id: topic.id,
        name: topic.name,
        summary: topic.summary
      }
    );

    const responseTime = Date.now() - startTime;
    console.log('[StanceAPI] ✅ 単一意見立場分析完了:', {
      opinionId,
      topicId,
      stance: result.stance,
      confidence: result.confidence,
      responseTime: `${responseTime}ms`
    });

    res.json({
      success: true,
      data: result,
      meta: {
        opinionId,
        topicId,
        responseTime,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    const responseTime = Date.now() - startTime;
    console.error('[StanceAPI] ❌ 単一意見立場分析エラー:', {
      opinionId,
      topicId,
      userId,
      responseTime: `${responseTime}ms`,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    next(error);
  }
});

/**
 * GET /api/stance/topics/:topicId/results
 * トピックの立場分析結果を取得
 */
router.get('/topics/:topicId/results', async (req: AuthenticatedRequest, res, next) => {
  const topicId = req.params.topicId;
  const userId = req.userId!;

  console.log('[StanceAPI] 📊 トピック立場分析結果取得:', {
    topicId,
    userId
  });

  try {
    // アクセス権限チェック
    const topic = await prisma.topic.findFirst({
      where: {
        id: topicId,
        project: { userId }
      }
    });

    if (!topic) {
      throw new AppError(404, 'TOPIC_NOT_FOUND', 'トピックが見つかりません');
    }

    // 立場分析結果を取得
    const analyses = await stanceAnalysisService.getTopicStanceAnalyses(topicId);

    // サマリーを生成
    const summary = analyses.length > 0 ? {
      totalOpinions: analyses.length,
      agreeCount: analyses.filter(a => a.stance === 'agree').length,
      disagreeCount: analyses.filter(a => a.stance === 'disagree').length,
      neutralCount: analyses.filter(a => a.stance === 'neutral').length,
      conditionalCount: analyses.filter(a => a.stance === 'conditional').length,
      averageConfidence: Math.round(
        (analyses.reduce((sum, a) => sum + a.confidence, 0) / analyses.length) * 100
      ) / 100
    } : null;

    console.log('[StanceAPI] ✅ トピック立場分析結果取得完了:', {
      topicId,
      analysesCount: analyses.length,
      summary
    });

    res.json({
      success: true,
      data: {
        analyses,
        summary
      },
      meta: {
        topicId,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('[StanceAPI] ❌ トピック立場分析結果取得エラー:', {
      topicId,
      userId,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    next(error);
  }
});

/**
 * GET /api/stance/opinions/:opinionId/results
 * 意見の立場分析結果を取得
 */
router.get('/opinions/:opinionId/results', async (req: AuthenticatedRequest, res, next) => {
  const opinionId = req.params.opinionId;
  const userId = req.userId!;

  console.log('[StanceAPI] 📋 意見立場分析結果取得:', {
    opinionId,
    userId
  });

  try {
    // アクセス権限チェック
    const opinion = await prisma.opinion.findFirst({
      where: {
        id: opinionId,
        project: { userId }
      }
    });

    if (!opinion) {
      throw new AppError(404, 'OPINION_NOT_FOUND', '意見が見つかりません');
    }

    // 立場分析結果を取得
    const analyses = await stanceAnalysisService.getOpinionStanceAnalyses(opinionId);

    console.log('[StanceAPI] ✅ 意見立場分析結果取得完了:', {
      opinionId,
      analysesCount: analyses.length
    });

    res.json({
      success: true,
      data: analyses,
      meta: {
        opinionId,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('[StanceAPI] ❌ 意見立場分析結果取得エラー:', {
      opinionId,
      userId,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    next(error);
  }
});

/**
 * GET /api/stance/projects/:projectId/summary
 * プロジェクトの立場分析サマリーを取得
 */
router.get('/projects/:projectId/summary', async (req: AuthenticatedRequest, res, next) => {
  const projectId = req.params.projectId;
  const userId = req.userId!;

  console.log('[StanceAPI] 📈 プロジェクト立場分析サマリー取得:', {
    projectId,
    userId
  });

  try {
    // プロジェクトの存在確認とアクセス権限チェック
    const project = await prisma.project.findFirst({
      where: {
        OR: [
          { id: projectId },
          { firebaseId: projectId }
        ],
        userId
      },
      include: {
        topics: {
          include: {
            stanceAnalyses: true
          }
        }
      }
    });

    if (!project) {
      throw new AppError(404, 'PROJECT_NOT_FOUND', 'プロジェクトが見つかりません');
    }

    // 全トピックの立場分析データを集計
    const allAnalyses = project.topics.flatMap(topic => topic.stanceAnalyses);

    const summary = allAnalyses.length > 0 ? {
      totalOpinions: allAnalyses.length,
      agreeCount: allAnalyses.filter(a => a.stance === 'agree').length,
      disagreeCount: allAnalyses.filter(a => a.stance === 'disagree').length,
      neutralCount: allAnalyses.filter(a => a.stance === 'neutral').length,
      conditionalCount: allAnalyses.filter(a => a.stance === 'conditional').length,
      averageConfidence: Math.round(
        (allAnalyses.reduce((sum, a) => sum + Number(a.confidence), 0) / allAnalyses.length) * 100
      ) / 100,
      topicsWithStanceAnalysis: project.topics.filter(t => t.stanceAnalyses.length > 0).length,
      totalTopics: project.topics.length
    } : {
      totalOpinions: 0,
      agreeCount: 0,
      disagreeCount: 0,
      neutralCount: 0,
      conditionalCount: 0,
      averageConfidence: 0,
      topicsWithStanceAnalysis: 0,
      totalTopics: project.topics.length
    };

    console.log('[StanceAPI] ✅ プロジェクト立場分析サマリー取得完了:', {
      projectId,
      summary
    });

    res.json({
      success: true,
      data: summary,
      meta: {
        projectId,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('[StanceAPI] ❌ プロジェクト立場分析サマリー取得エラー:', {
      projectId,
      userId,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    next(error);
  }
});

/**
 * GET /api/stance/health
 * 立場分析サービスのヘルスチェック
 */
router.get('/health', async (req: AuthenticatedRequest, res, _next) => {
  const startTime = Date.now();

  try {
    // サービスの基本的な動作確認
    const healthData = {
      service: 'OpinionStanceAnalysisService',
      status: 'healthy',
      timestamp: new Date().toISOString(),
      checks: {
        database: 'unknown',
        service: 'healthy'
      }
    };

    // データベース接続確認
    try {
      await prisma.opinionStanceAnalysis.count();
      healthData.checks.database = 'healthy';
    } catch (dbError) {
      healthData.checks.database = 'unhealthy';
      healthData.status = 'degraded';
    }

    const responseTime = Date.now() - startTime;
    console.log('[StanceAPI] ✅ ヘルスチェック完了:', {
      status: healthData.status,
      responseTime: `${responseTime}ms`
    });

    res.json({
      ...healthData,
      responseTime
    });

  } catch (error) {
    const responseTime = Date.now() - startTime;
    console.error('[StanceAPI] ❌ ヘルスチェックエラー:', error);
    res.status(503).json({
      service: 'OpinionStanceAnalysisService',
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      responseTime,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;