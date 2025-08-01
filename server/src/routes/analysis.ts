import { Router } from "express";
import { requireAuth, AuthenticatedRequest } from "../middleware/auth";
import { requireActiveProject } from "../middleware/archiveProtection";
import { AppError } from "../middleware/errorHandler";
import { prisma } from "../lib/database";
import { AnalysisLimitService } from "../services/AnalysisLimitService";

const router = Router();

// Apply authentication to all routes
router.use(requireAuth);

// Lazy loading service containers
let topicAnalysisService: any;
let analysisSyncService: any;
let enhancedConsensusService: any;

// Lazy loading functions
async function getTopicAnalysisService() {
  if (!topicAnalysisService) {
    const { TopicAnalysisService } = await import(
      "../services/topicAnalysisService"
    );
    topicAnalysisService = new TopicAnalysisService();
    console.log("[AnalysisAPI] ✅ 分析サービス初期化完了（Lazy Loading）:", {
      serviceType: "TopicAnalysisService",
      features: "標準分析",
      aiManager: "AIServiceManager使用",
    });
  }
  return topicAnalysisService;
}

async function getAnalysisSyncService() {
  if (!analysisSyncService) {
    const { AnalysisResultsSyncService } = await import(
      "../services/analysisResultsSyncService"
    );
    analysisSyncService = new AnalysisResultsSyncService();
  }
  return analysisSyncService;
}

async function getEnhancedConsensusService() {
  if (!enhancedConsensusService) {
    const { EnhancedConsensusService } = await import(
      "../services/consensusService.enhanced"
    );
    enhancedConsensusService = new EnhancedConsensusService();
  }
  return enhancedConsensusService;
}

console.log("[AnalysisAPI] ✅ 分析サービス初期化完了（Lazy Loading有効）");

// Validation middleware for analysis requests
const validateAnalysisRequest = (
  req: AuthenticatedRequest,
  res: any,
  next: any
) => {
  const { prompt } = req.body;

  if (!prompt || typeof prompt !== "string" || prompt.trim().length === 0) {
    throw new AppError(
      400,
      "INVALID_REQUEST",
      "Analysis prompt is required and must be a non-empty string"
    );
  }

  next();
};

// Project Analysis Routes

/**
 * POST /api/analysis/projects/:id/topics
 * Analyze project opinions and generate topics (synchronous)
 */
router.post(
  "/projects/:id/topics",
  requireActiveProject,
  async (req: AuthenticatedRequest, res, next) => {
    const startTime = Date.now();
    const projectId = req.params.id;
    const userId = req.userId!;

    // Phase 1-3: 拡張タイムアウト設定（10分）
    req.setTimeout(10 * 60 * 1000, () => {
      console.error(
        "[AnalysisAPI] ⏰ Request timeout (10 minutes) - 分析処理が長時間実行されました"
      );
      if (!res.headersSent) {
        res.status(408).json({
          success: false,
          error: "ANALYSIS_TIMEOUT",
          message:
            "AI分析がタイムアウトしました。意見数が多い場合は、一部の意見を削除してから再実行してください。",
          responseTime: Date.now() - startTime,
          timestamp: new Date().toISOString(),
        });
      }
    });

    res.setTimeout(10 * 60 * 1000, () => {
      console.error(
        "[AnalysisAPI] ⏰ Response timeout (10 minutes) - レスポンス送信がタイムアウトしました"
      );
    });

    console.log("[AnalysisAPI] ==> プロジェクト分析API呼び出し", {
      timestamp: new Date().toISOString(),
      projectId,
      userId,
      userAgent: req.headers["user-agent"],
      contentType: req.headers["content-type"],
    });

    try {
      // 新規意見数をチェック（強制実行でない場合）
      const { force = false, analysisLanguage } = req.body || {};
      console.log("⚡⚡⚡ [AnalysisAPI] パラメータ確認 ⚡⚡⚡", {
        force,
        analysisLanguage,
        analysisLanguageType: typeof analysisLanguage,
        analysisLanguageLength: analysisLanguage?.length,
        isAnalysisLanguageEn: analysisLanguage === 'en',
        isAnalysisLanguageJa: analysisLanguage === 'ja',
        requestBody: req.body,
        userId: req.userId?.substring(0, 8)
      });

      if (!force) {
        console.log("[AnalysisAPI] 🔍 回答数比較チェック開始");
        let projectData;
        if (projectId.startsWith("-")) {
          projectData = await prisma.project.findFirst({
            where: {
              firebaseId: projectId,
              userId: userId,
            },
            include: {
              opinions: true,
            },
          });
        } else {
          projectData = await prisma.project.findFirst({
            where: {
              id: projectId,
              userId: userId,
            },
            include: {
              opinions: true,
            },
          });
        }

        if (!projectData) {
          throw new AppError(404, "PROJECT_NOT_FOUND", "Project not found");
        }

        const currentOpinionsCount = projectData.opinions.length;
        const lastAnalyzedOpinionsCount = projectData.lastAnalyzedOpinionsCount;

        console.log("[AnalysisAPI] 📊 回答数比較:", {
          currentOpinionsCount,
          lastAnalyzedOpinionsCount,
          hasBeenAnalyzed: lastAnalyzedOpinionsCount !== null,
          projectId: projectData.id,
        });

        // 重複分析防止: 回答数変化なし かつ 強制実行でない場合はスキップ
        if (
          !force &&
          lastAnalyzedOpinionsCount !== null &&
          currentOpinionsCount === lastAnalyzedOpinionsCount
        ) {
          console.log("[AnalysisAPI] ⚠️ 回答数変化なし - 分析スキップ");
          return res.json({
            success: true,
            skipped: true,
            reason: "NO_NEW_OPINIONS",
            message: `前回の分析以降、新しい回答が追加されていないため、分析をスキップしました。（現在の回答数: ${currentOpinionsCount}件）`,
            data: {
              currentOpinionsCount,
              lastAnalyzedOpinionsCount,
              recommendedAction:
                "新しい回答が追加されてから分析を実行してください。強制再分析が必要な場合は、force: trueフラグを使用してください。",
            },
            timestamp: new Date().toISOString(),
          });
        }

        // 新規回答がある、または初回分析、または強制実行の場合は続行
        console.log("🎯🎯🎯 [AnalysisAPI] 分析続行決定！！！ 🎯🎯🎯");
        console.log(
          "[AnalysisAPI] ✅ 分析続行 - 新規回答あり または 初回分析 または 強制実行"
        );
      } else {
        console.log(
          "🎯🎯🎯 [AnalysisAPI] forceフラグによる強制実行！！！ 🎯🎯🎯"
        );
      }

      // 分析制限チェック
      const limitService = new AnalysisLimitService(prisma);
      const limitCheck = await limitService.checkAnalysisLimit(
        userId,
        projectId
      );

      if (!limitCheck.allowed) {
        throw new AppError(
          429,
          "ANALYSIS_LIMIT_EXCEEDED",
          limitCheck.message || "Analysis limit exceeded"
        );
      }

      // 分析開始
      console.log("🎉🎉🎉 [AnalysisAPI] 分析開始！！！ 🎉🎉🎉");

      const topicService = await getTopicAnalysisService();
      const result = await topicService.analyzeTopics(projectId, userId, {
        force,
        analysisLanguage,
      });

      console.log("[AnalysisAPI] ✅ AI分析完了", {
        projectId,
        userId,
        topicsCount: result?.topics?.length || 0,
        insightsCount: result?.insights?.length || 0,
        responseTime: `${Date.now() - startTime}ms`,
      });

      // 使用量記録処理
      try {
        // プロジェクトの意見数を取得
        const project = await prisma.project.findUnique({
          where: { id: projectId },
          select: { opinionsCount: true }
        });

        await limitService.recordAnalysisUsage(userId, projectId, {
          analysisType: 'topic_analysis',
          opinionsProcessed: project?.opinionsCount || 0,
          executionTime: Date.now() - startTime
        });
      } catch (usageError) {
        console.warn('[AnalysisAPI] 使用量記録エラー（分析は正常完了）:', usageError);
      }

      // 分析結果をFirebaseに同期
      const syncService = await getAnalysisSyncService();
      await syncService.syncAnalysisResults(projectId, userId, result);

      res.json({
        success: true,
        data: result,
        message: "AI分析が完了しました",
        responseTime: Date.now() - startTime,
        timestamp: new Date().toISOString(),
      });

      // 分析完了後のanalysis-sessionsクリーンアップ（非同期実行）
      setImmediate(async () => {
        try {
          const { adminDatabase } = await import('../lib/firebase-admin');
          if (adminDatabase) {
            await adminDatabase.ref(`analysis-sessions/${projectId}`).remove();
            console.log(`[AnalysisAPI] ✅ 分析セッションクリーンアップ完了: ${projectId}`);
          }
        } catch (cleanupError) {
          console.warn(`[AnalysisAPI] ⚠️ 分析セッションクリーンアップ失敗: ${projectId}`, cleanupError);
          // クリーンアップ失敗は分析成功に影響しない
        }
      });
    } catch (error) {
      const responseTime = Date.now() - startTime;
      console.error("[AnalysisAPI] ❌ AI分析エラー詳細", {
        projectId,
        userId: userId.substring(0, 8),
        errorType: error instanceof AppError ? error.code : "UNEXPECTED_ERROR",
        errorMessage: error instanceof Error ? error.message : "Unknown error",
        requestDetails: {
          analysisLanguage: req.body?.analysisLanguage,
          force: req.body?.force,
          userAgent: req.headers["user-agent"],
        },
        responseTime: `${responseTime}ms`,
        timestamp: new Date().toISOString(),
      });

      if (!res.headersSent) {
        res.status(500).json({
          success: false,
          error: error instanceof AppError ? error.code : "ANALYSIS_FAILED",
          message: error instanceof Error ? error.message : "Analysis failed",
          responseTime,
          timestamp: new Date().toISOString(),
        });
      }

      // 分析失敗後のanalysis-sessionsクリーンアップ（非同期実行）
      setImmediate(async () => {
        try {
          const { adminDatabase } = await import('../lib/firebase-admin');
          if (adminDatabase) {
            await adminDatabase.ref(`analysis-sessions/${projectId}`).remove();
            console.log(`[AnalysisAPI] ✅ 分析失敗後のセッションクリーンアップ完了: ${projectId}`);
          }
        } catch (cleanupError) {
          console.warn(`[AnalysisAPI] ⚠️ 分析失敗後のセッションクリーンアップ失敗: ${projectId}`, cleanupError);
        }
      });

      next(error);
    }
  }
);

/**
 * GET /api/analysis/projects/:id/topics
 * Get analyzed topics for a project
 */
router.get(
  "/projects/:id/topics",
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const projectId = req.params.id;
      const topics = await topicAnalysisService.getProjectTopics(
        projectId,
        req.userId!
      );
      res.json(topics);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/analysis/projects/:id/insights
 * Get analyzed insights for a project
 */
router.get(
  "/projects/:id/insights",
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const projectId = req.params.id;
      const insights = await topicAnalysisService.getProjectInsights(
        projectId,
        req.userId!
      );
      res.json(insights);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/analysis/projects/:id/results
 * Get complete analysis results (topics + insights + summary)
 */
router.get(
  "/projects/:id/results",
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const projectId = req.params.id;
      const results = await topicAnalysisService.getProjectAnalysisResults(
        projectId,
        req.userId!
      );
      res.json(results);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/analysis/projects/:id/summary
 * Get analysis summary for a project
 */
router.get(
  "/projects/:id/summary",
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const projectId = req.params.id;
      const userId = req.userId!;

      // Get project data with opinions
      let projectData;
      if (projectId.startsWith("-")) {
        projectData = await prisma.project.findFirst({
          where: {
            firebaseId: projectId,
            userId: userId,
          },
          include: {
            opinions: true,
          },
        });
      } else {
        projectData = await prisma.project.findFirst({
          where: {
            id: projectId,
            userId: userId,
          },
          include: {
            opinions: true,
          },
        });
      }

      if (!projectData) {
        throw new AppError(404, "PROJECT_NOT_FOUND", "Project not found");
      }

      const totalOpinions = projectData.opinions.length;
      const lastAnalyzedOpinionsCount = projectData.lastAnalyzedOpinionsCount || 0;
      const analyzedOpinions = Math.min(lastAnalyzedOpinionsCount, totalOpinions);
      const pendingOpinions = Math.max(0, totalOpinions - analyzedOpinions);
      const analysisProgress = totalOpinions > 0 ? Math.round((analyzedOpinions / totalOpinions) * 100) : 0;

      const summary = {
        totalOpinions,
        analyzedOpinions,
        pendingOpinions,
        analysisProgress,
        lastAnalysisAt: projectData.lastAnalysisAt?.toISOString() || null,
        lastAnalyzedOpinionsCount,
        nextBatchSize: Math.min(pendingOpinions, 50), // Default batch size
        isAnalyzed: projectData.isAnalyzed || false,
        canAnalyze: pendingOpinions > 0,
      };

      res.json({
        success: true,
        data: summary,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/analysis/consensus
 * Generate enhanced consensus analysis
 */
router.post(
  "/consensus",
  validateAnalysisRequest,
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const {
        prompt,
        models,
        maxResponses,
        projectId,
        topicId,
        includeOpinions = false,
        analysisType = "general",
      } = req.body;

      const enhancedRequest = {
        prompt,
        models,
        maxResponses,
        projectId,
        topicId,
        includeOpinions,
        analysisType,
      };

      const consensusService = await getEnhancedConsensusService();
      const result = await consensusService.generateEnhancedConsensus(
        enhancedRequest,
        req.userId
      );

      res.json(result);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/analysis/projects/:id/consensus
 * Generate consensus for specific project
 */
router.post(
  "/projects/:id/consensus",
  requireActiveProject,
  validateAnalysisRequest,
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const projectId = req.params.id;
      const {
        prompt,
        models,
        maxResponses,
        topicId,
        includeOpinions = true,
        analysisType = "general",
      } = req.body;

      const enhancedRequest = {
        prompt,
        models,
        maxResponses,
        projectId,
        topicId,
        includeOpinions,
        analysisType,
      };

      const consensusService = await getEnhancedConsensusService();
      const result = await consensusService.generateEnhancedConsensus(
        enhancedRequest,
        req.userId
      );

      res.json(result);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/analysis/limits/:userId
 * Get analysis limits for a user
 */
router.get("/limits/:userId", async (req: AuthenticatedRequest, res, next) => {
  try {
    const userId = req.params.userId;
    const projectId = req.query.projectId as string;

    // Validate user access
    if (userId !== req.userId) {
      throw new AppError(403, "FORBIDDEN", "Access denied");
    }

    const limitService = new AnalysisLimitService(prisma);
    const limitCheck = await limitService.checkAnalysisLimit(userId, projectId);

    res.json({
      success: true,
      data: {
        allowed: limitCheck.allowed,
        message: limitCheck.message,
        remaining: limitCheck.remaining || null,
        resetDate: limitCheck.resetDate || null,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/analysis/health
 * Health check endpoint for AI analysis services
 */
router.get("/health", async (req: AuthenticatedRequest, res, next) => {
  try {
    console.log("[AnalysisAPI] 🏥 ヘルスチェック実行開始");

    // AIServiceManagerのヘルスチェック
    const { getAIServiceManager } = await import(
      "../services/aiServiceManager"
    );
    const aiManager = getAIServiceManager();
    const healthResult = await aiManager.healthCheck();

    console.log("[AnalysisAPI] 🏥 ヘルスチェック結果:", {
      status: healthResult.status,
      serviceAvailable: healthResult.serviceAvailable,
      timestamp: new Date().toISOString(),
    });

    res.json({
      status: "ok",
      timestamp: new Date().toISOString(),
      aiService: healthResult,
      database: "connected",
    });
  } catch (error) {
    console.error("[AnalysisAPI] ❌ ヘルスチェックエラー:", error);
    next(error);
  }
});

export default router;
