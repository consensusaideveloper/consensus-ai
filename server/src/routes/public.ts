import { Router } from 'express';
import { AppError } from '../middleware/errorHandler';
import { prisma } from '../lib/database';
import rateLimit from 'express-rate-limit';

const router = Router();

// レート制限: 15分間で同一IPから最大100リクエスト
const publicApiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15分
  max: 100, // 同一IPから最大100リクエスト
  message: {
    error: 'Too many requests from this IP',
    code: 'RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// 全ての公開APIにレート制限を適用
router.use(publicApiLimiter);

/**
 * GET /api/public/projects/:id/language-settings
 * プロジェクトの言語設定を取得（認証不要の公開API）
 * 
 * @param id - プロジェクトID
 * @returns {object} プロジェクト名、アクティブ状態、オーナーの分析言語設定
 */
router.get('/projects/:id/language-settings', async (req, res, next) => {
  try {
    const projectId = req.params.id;
    
    console.log('[PublicAPI] 🌐 言語設定取得要求:', {
      projectId,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      timestamp: new Date().toISOString()
    });
    
    // プロジェクト存在確認 + オーナー情報取得
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: {
        id: true,
        name: true,
        status: true,
        isArchived: true,
        user: {
          select: {
            analysisLanguage: true,
            language: true
          }
        }
      }
    });
    
    if (!project) {
      console.log('[PublicAPI] ❌ プロジェクトが見つかりません:', projectId);
      return res.status(404).json({ 
        error: 'Project not found or unavailable',
        code: 'PROJECT_NOT_FOUND'
      });
    }
    
    // アーカイブ済みプロジェクトは利用不可
    if (project.isArchived) {
      console.log('[PublicAPI] ⚠️ アーカイブ済みプロジェクト:', projectId);
      return res.status(404).json({ 
        error: 'Project not found or unavailable',
        code: 'PROJECT_NOT_FOUND'
      });
    }
    
    // プロジェクトがアクティブかどうか
    const isActive = project.status !== 'paused';
    
    // オーナーの分析言語設定を取得（フォールバック付き）
    const ownerAnalysisLanguage = project.user.analysisLanguage || project.user.language || 'ja';
    
    const responseData = {
      projectId: project.id,
      projectName: project.name,
      isActive,
      ownerAnalysisLanguage,
      availableLanguages: ['ja', 'en'] as const
    };
    
    console.log('[PublicAPI] ✅ 言語設定取得成功:', {
      projectId: project.id,
      projectName: project.name,
      ownerAnalysisLanguage,
      isActive
    });
    
    res.json(responseData);
  } catch (error) {
    console.error('[PublicAPI] ❌ 言語設定取得エラー:', {
      projectId: req.params.id,
      error: error instanceof Error ? error.message : error,
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString()
    });
    next(error);
  }
});

export default router;