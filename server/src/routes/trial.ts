/**
 * Phase 3: Trial Management API Routes
 * Provides endpoints for subscription and trial status management
 * Created: 2025-07-22
 */

import { Router } from 'express';
import { TrialService } from '../services/trialService';
import { z } from 'zod';
import { requireAuth } from '../middleware/auth';
import { PLAN_TYPES } from '../constants/planTypes';

const router = Router();

// Apply authentication middleware to all trial routes
router.use(requireAuth);

/**
 * GET /api/trial/status
 * Get current user's trial status
 */
router.get('/status', async (req, res) => {
  try {
    const userId = req.headers['x-user-id'] as string;
    
    if (!userId) {
      return res.status(400).json({ 
        error: 'Missing user ID',
        code: 'MISSING_USER_ID'
      });
    }

    const trialStatus = await TrialService.getTrialStatus(userId);
    
    res.json({
      success: true,
      data: trialStatus,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('[Trial API] Error getting trial status:', error);
    res.status(500).json({ 
      error: 'Failed to get trial status',
      code: 'TRIAL_STATUS_ERROR'
    });
  }
});

/**
 * GET /api/trial/remaining-days
 * Get remaining trial days for current user
 */
router.get('/remaining-days', async (req, res) => {
  try {
    const userId = req.headers['x-user-id'] as string;
    
    if (!userId) {
      return res.status(400).json({ 
        error: 'Missing user ID',
        code: 'MISSING_USER_ID'
      });
    }

    const remainingDays = await TrialService.calculateRemainingDays(userId);
    
    res.json({
      success: true,
      data: {
        daysRemaining: remainingDays,
        isExpired: remainingDays <= 0
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('[Trial API] Error calculating remaining days:', error);
    res.status(500).json({ 
      error: 'Failed to calculate remaining days',
      code: 'REMAINING_DAYS_ERROR'
    });
  }
});

/**
 * POST /api/trial/extend
 * Extend trial period (admin only)
 */
const extendTrialSchema = z.object({
  userId: z.string().min(1),
  additionalDays: z.number().min(1).max(365)
});

router.post('/extend', async (req, res) => {
  try {
    const validation = extendTrialSchema.safeParse(req.body);
    
    if (!validation.success) {
      return res.status(400).json({ 
        error: 'Invalid request data',
        code: 'VALIDATION_ERROR',
        details: validation.error.issues
      });
    }

    const { userId, additionalDays } = validation.data;
    
    const result = await TrialService.extendTrial(userId, additionalDays);
    
    if (!result.success) {
      return res.status(400).json({ 
        error: result.error,
        code: 'EXTEND_TRIAL_ERROR'
      });
    }
    
    res.json({
      success: true,
      data: {
        newTrialEndDate: result.newTrialEndDate,
        daysExtended: additionalDays
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('[Trial API] Error extending trial:', error);
    res.status(500).json({ 
      error: 'Failed to extend trial',
      code: 'EXTEND_TRIAL_ERROR'
    });
  }
});

/**
 * POST /api/trial/start
 * ⚠️ DEPRECATED: Custom trial start disabled in favor of Stripe Checkout
 * Redirects clients to use Stripe billing for trial management
 */
router.post('/start', async (req, res) => {
  try {
    const userId = req.headers['x-user-id'] as string;
    
    console.log('[Trial API] 🔄 Custom trial start request redirected to Stripe:', { userId });
    
    if (!userId) {
      return res.status(400).json({ 
        error: 'Missing user ID',
        code: 'MISSING_USER_ID'
      });
    }

    // ⚠️ Custom trial start disabled - direct to Stripe Checkout
    return res.status(200).json({
      success: false,
      redirectRequired: true,
      message: 'Please use Stripe Checkout for trial start',
      data: {
        stripeCheckoutEndpoint: '/api/billing/create-checkout-session',
        trialEnabled: true,
        recommendedAction: 'redirect_to_stripe'
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('[Trial API] Error handling deprecated trial start:', error);
    res.status(500).json({ 
      error: 'Trial start service unavailable',
      code: 'SERVICE_UNAVAILABLE',
      message: 'Please use Stripe Checkout for trial management'
    });
  }
});

/**
 * POST /api/trial/upgrade
 * Handle subscription upgrade
 */
const upgradeSchema = z.object({
  subscriptionStatus: z.enum([PLAN_TYPES.PRO, PLAN_TYPES.CANCELLED]),
  stripeCustomerId: z.string().optional()
});

router.post('/upgrade', async (_req, res) => {
  try {
    const userId = _req.headers['x-user-id'] as string;
    
    if (!userId) {
      return res.status(400).json({ 
        error: 'Missing user ID',
        code: 'MISSING_USER_ID'
      });
    }

    const validation = upgradeSchema.safeParse(_req.body);
    
    if (!validation.success) {
      return res.status(400).json({ 
        error: 'Invalid request data',
        code: 'VALIDATION_ERROR',
        details: validation.error.issues
      });
    }

    const { subscriptionStatus, stripeCustomerId } = validation.data;
    
    const result = await TrialService.updateSubscriptionStatus(
      userId, 
      subscriptionStatus,
      stripeCustomerId,
      'manual_upgrade',
      undefined,
      null,
      null
    );
    
    if (!result.success) {
      return res.status(400).json({ 
        error: result.error,
        code: 'UPGRADE_ERROR'
      });
    }
    
    res.json({
      success: true,
      data: result.user,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('[Trial API] Error processing upgrade:', error);
    res.status(500).json({ 
      error: 'Failed to process upgrade',
      code: 'UPGRADE_ERROR'
    });
  }
});

/**
 * GET /api/trial/health
 * Health check for trial service
 */
router.get('/health', async (_req, res) => {
  try {
    const health = await TrialService.healthCheck();
    
    res.json({
      success: true,
      service: 'trial-service',
      status: 'healthy',
      data: health,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('[Trial API] Health check failed:', error);
    res.status(503).json({ 
      service: 'trial-service',
      status: 'unhealthy',
      error: 'Service unavailable',
      code: 'HEALTH_CHECK_FAILED'
    });
  }
});

export default router;