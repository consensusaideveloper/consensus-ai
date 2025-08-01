/**
 * プラン詳細情報API
 * プラン制限値、表示情報、メッセージを一元管理して提供
 */

import { Router } from 'express';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import { PlanDetailsService } from '../services/PlanDetailsService';
import { VALID_PLAN_TYPES, type SubscriptionPlanType } from '../constants/planTypes';

const router = Router();

// Type alias for the valid plan types
type PlanType = SubscriptionPlanType;

// Apply authentication to all routes
router.use(requireAuth);

/**
 * GET /api/plans/details
 * 全プランの詳細情報を取得
 */
router.get('/details', async (req: AuthenticatedRequest, res, next) => {
  try {
    console.log('[PlansAPI] 📋 プラン詳細情報取得:', {
      userId: req.userId,
      timestamp: new Date().toISOString()
    });

    // バリデーション実行
    const validation = PlanDetailsService.validatePlanDetails();
    if (!validation.valid) {
      console.warn('[PlansAPI] ⚠️ プラン設定値に問題:', validation.errors);
      throw new AppError(500, 'PLAN_CONFIG_ERROR', 'プラン設定に問題があります。');
    }

    // 全プラン詳細取得
    const allPlanDetails = PlanDetailsService.getAllPlanDetails();

    res.json({
      success: true,
      data: allPlanDetails,
      timestamp: new Date().toISOString()
    });

    console.log('[PlansAPI] ✅ プラン詳細情報送信完了');

  } catch (error) {
    console.error('[PlansAPI] ❌ プラン詳細取得エラー:', error);
    next(error);
  }
});

/**
 * GET /api/plans/details/:planType
 * 特定プランの詳細情報を取得
 */
router.get('/details/:planType', async (req: AuthenticatedRequest, res, next) => {
  try {
    const { planType } = req.params;

    // プランタイプ検証
    if (!VALID_PLAN_TYPES.includes(planType as PlanType)) {
      throw new AppError(400, 'INVALID_PLAN_TYPE', '無効なプランタイプです。');
    }

    console.log('[PlansAPI] 📋 特定プラン詳細取得:', {
      userId: req.userId,
      planType,
      timestamp: new Date().toISOString()
    });

    const planDetails = PlanDetailsService.getPlanDetails(planType as PlanType);

    res.json({
      success: true,
      data: planDetails,
      planType,
      timestamp: new Date().toISOString()
    });

    console.log('[PlansAPI] ✅ 特定プラン詳細送信完了:', planType);

  } catch (error) {
    console.error('[PlansAPI] ❌ 特定プラン詳細取得エラー:', error);
    next(error);
  }
});

/**
 * GET /api/plans/comparison
 * プラン比較用の簡潔な情報を取得
 */
router.get('/comparison', async (req: AuthenticatedRequest, res, next) => {
  try {
    console.log('[PlansAPI] 📊 プラン比較情報取得:', {
      userId: req.userId,
      timestamp: new Date().toISOString()
    });

    const comparison = {
      free: {
        name: PlanDetailsService.getPlanDetails('free').display.name,
        icon: PlanDetailsService.getPlanDetails('free').display.icon,
        projects: PlanDetailsService.formatLimitDisplay('free', 'projects'),
        analysis: PlanDetailsService.formatLimitDisplay('free', 'analysis'),
        opinions: PlanDetailsService.formatLimitDisplay('free', 'opinions')
      },
      trial: {
        name: PlanDetailsService.getPlanDetails('trial').display.name,
        icon: PlanDetailsService.getPlanDetails('trial').display.icon,
        projects: PlanDetailsService.formatLimitDisplay('trial', 'projects'),
        analysis: PlanDetailsService.formatLimitDisplay('trial', 'analysis'),
        opinions: PlanDetailsService.formatLimitDisplay('trial', 'opinions')
      },
      pro: {
        name: PlanDetailsService.getPlanDetails('pro').display.name,
        icon: PlanDetailsService.getPlanDetails('pro').display.icon,
        projects: PlanDetailsService.formatLimitDisplay('pro', 'projects'),
        analysis: PlanDetailsService.formatLimitDisplay('pro', 'analysis'),
        opinions: PlanDetailsService.formatLimitDisplay('pro', 'opinions')
      }
    };

    res.json({
      success: true,
      data: comparison,
      timestamp: new Date().toISOString()
    });

    console.log('[PlansAPI] ✅ プラン比較情報送信完了');

  } catch (error) {
    console.error('[PlansAPI] ❌ プラン比較情報取得エラー:', error);
    next(error);
  }
});

/**
 * GET /api/plans/messages/:planType/:messageType
 * 特定プラン・特定用途のメッセージを取得
 */
router.get('/messages/:planType/:messageType', async (req: AuthenticatedRequest, res, next) => {
  try {
    const { planType, messageType } = req.params;

    // パラメータ検証
    if (!VALID_PLAN_TYPES.includes(planType as PlanType)) {
      throw new AppError(400, 'INVALID_PLAN_TYPE', '無効なプランタイプです。');
    }

    if (!['limitReached', 'upgrade', 'trial'].includes(messageType)) {
      throw new AppError(400, 'INVALID_MESSAGE_TYPE', '無効なメッセージタイプです。');
    }

    console.log('[PlansAPI] 💬 プラン専用メッセージ取得:', {
      userId: req.userId,
      planType,
      messageType,
      timestamp: new Date().toISOString()
    });

    const planDetails = PlanDetailsService.getPlanDetails(planType as PlanType);
    const messages = planDetails.messages[messageType as keyof typeof planDetails.messages];

    res.json({
      success: true,
      data: messages,
      planType,
      messageType,
      timestamp: new Date().toISOString()
    });

    console.log('[PlansAPI] ✅ プラン専用メッセージ送信完了');

  } catch (error) {
    console.error('[PlansAPI] ❌ プラン専用メッセージ取得エラー:', error);
    next(error);
  }
});

/**
 * GET /api/plans/health
 * プラン設定の健全性チェック
 */
router.get('/health', async (req: AuthenticatedRequest, res, next) => {
  try {
    console.log('[PlansAPI] 🏥 プラン設定ヘルスチェック実行');

    const validation = PlanDetailsService.validatePlanDetails();

    res.json({
      status: validation.valid ? 'healthy' : 'warning',
      valid: validation.valid,
      errors: validation.errors,
      timestamp: new Date().toISOString()
    });

    console.log('[PlansAPI] 🏥 ヘルスチェック完了:', {
      status: validation.valid ? 'healthy' : 'warning',
      errorCount: validation.errors.length
    });

  } catch (error) {
    console.error('[PlansAPI] ❌ ヘルスチェックエラー:', error);
    next(error);
  }
});

export default router;