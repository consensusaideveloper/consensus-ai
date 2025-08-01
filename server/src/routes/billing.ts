/**
 * 課金・決済関連APIルート
 * Stripe統合エンドポイント
 */

import express from 'express';
import Stripe from 'stripe';
import StripeService from '../services/stripeService';
import { PLAN_TYPES } from '../constants/planTypes';

const router = express.Router();

// Stripe Webhook署名検証用のmiddleware
const verifyStripeWebhook = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.log('[Billing] 🔍 Webhook verification started');
  console.log('[Billing] Body type:', typeof req.body);
  console.log('[Billing] Body is Buffer:', Buffer.isBuffer(req.body));
  console.log('[Billing] Body length:', req.body?.length || 0);
  console.log('[Billing] Headers:', Object.keys(req.headers).join(', '));
  
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  
  if (!webhookSecret) {
    console.error('[Billing] STRIPE_WEBHOOK_SECRET not configured');
    return res.status(500).json({ error: 'Webhook secret not configured' });
  }

  const sig = req.headers['stripe-signature'];
  if (!sig) {
    console.error('[Billing] Missing stripe-signature header');
    return res.status(400).json({ error: 'Missing stripe-signature header' });
  }
  
  console.log('[Billing] Stripe signature present:', !!sig);

  try {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
      apiVersion: '2025-06-30.basil'
    });

    console.log('[Billing] About to verify webhook signature...');
    console.log('[Billing] Body type for verification:', typeof req.body);
    console.log('[Billing] Body constructor name:', req.body?.constructor?.name);
    
    const event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
    console.log('[Billing] ✅ Webhook signature verified successfully');
    (req as any).stripeEvent = event;
    next();
  } catch (err) {
    console.error('[Billing] ❌ Webhook signature verification failed:', err);
    console.error('[Billing] Error type:', err instanceof Error ? err.name : typeof err);
    console.error('[Billing] Error message:', err instanceof Error ? err.message : String(err));
    return res.status(400).json({ error: 'Invalid signature' });
  }
};

/**
 * POST /api/billing/create-checkout-session
 * Stripe Checkoutセッション作成
 */
router.post('/create-checkout-session', async (req, res) => {
  try {
    const userId = req.headers['x-user-id'] as string;
    const { priceId, successUrl, cancelUrl, enableTrial = true } = req.body;

    if (!userId) {
      return res.status(401).json({ error: 'User authentication required' });
    }

    if (!priceId || !successUrl || !cancelUrl) {
      return res.status(400).json({ 
        error: 'Missing required fields: priceId, successUrl, cancelUrl' 
      });
    }

    // Stripe設定検証
    const configValidation = StripeService.validateConfig();
    if (!configValidation.valid) {
      console.error('[Billing] Stripe configuration invalid:', configValidation.errors);
      return res.status(500).json({ 
        error: 'Payment service not configured',
        details: configValidation.errors 
      });
    }

    // ユーザー情報取得（emailが必要）
    const { PrismaClient } = await import('@prisma/client');
    const prisma = new PrismaClient();
    
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true }
    });
    
    await prisma.$disconnect();

    if (!user || !user.email) {
      return res.status(404).json({ error: 'User not found or email missing' });
    }

    // Stripeサービス初期化
    const stripeService = new StripeService();
    
    // Checkout セッション作成
    const result = await stripeService.createCheckoutSession({
      userId: userId,
      email: user.email,
      priceId: priceId,
      successUrl: successUrl,
      cancelUrl: cancelUrl,
      enableTrial: enableTrial
    });

    if (!result.success) {
      return res.status(500).json({ 
        error: 'Failed to create checkout session',
        details: result.error 
      });
    }

    res.json({
      success: true,
      sessionId: result.sessionId,
      url: result.url
    });

  } catch (error) {
    console.error('[Billing] Create checkout session failed:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /api/stripe/webhook
 * Stripe Webhook処理
 */
router.post('/webhook', verifyStripeWebhook, async (req, res) => {
  try {
    const event = (req as any).stripeEvent as Stripe.Event;
    
    console.log(`[Billing] 📨 Received webhook: ${event.type}`);
    console.log(`[Billing] Event ID: ${event.id}`);
    console.log(`[Billing] Event data object type:`, event.data.object?.constructor?.name);

    // Stripeサービス初期化
    const stripeService = new StripeService();
    
    // Webhook処理
    console.log(`[Billing] 🔄 Starting webhook processing...`);
    const result = await stripeService.handleWebhook(event);
    console.log(`[Billing] 🔄 Webhook processing result:`, result);

    if (!result.success) {
      console.error('[Billing] ❌ Webhook processing failed:', result.error);
      return res.status(500).json({ 
        error: 'Webhook processing failed',
        details: result.error 
      });
    }

    console.log(`[Billing] ✅ Webhook processed successfully`);
    res.json({ received: true });

  } catch (error) {
    console.error('[Billing] ❌ Webhook error:', error);
    console.error('[Billing] Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    res.status(500).json({ 
      error: 'Webhook processing error',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/billing/subscription-status/:userId
 * サブスクリプション状態取得
 */
router.get('/subscription-status/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const requestUserId = req.headers['x-user-id'] as string;

    // 認証チェック（自分の情報のみ取得可能）
    if (!requestUserId || requestUserId !== userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const { PrismaClient } = await import('@prisma/client');
    const prisma = new PrismaClient();
    
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        subscriptionStatus: true,
        stripeCustomerId: true,
        trialStartDate: true,
        trialEndDate: true,
        createdAt: true
      }
    });
    
    await prisma.$disconnect();

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      success: true,
      subscription: {
        status: user.subscriptionStatus || PLAN_TYPES.FREE,
        stripeCustomerId: user.stripeCustomerId,
        trialStartDate: user.trialStartDate,
        trialEndDate: user.trialEndDate,
        createdAt: user.createdAt
      }
    });

  } catch (error) {
    console.error('[Billing] Get subscription status failed:', error);
    res.status(500).json({ 
      error: 'Failed to get subscription status',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /api/billing/cancel-subscription
 * サブスクリプションキャンセル
 */
router.post('/cancel-subscription', async (req, res) => {
  try {
    const userId = req.headers['x-user-id'] as string;

    if (!userId) {
      return res.status(401).json({ error: 'User authentication required' });
    }

    // Stripe設定検証
    const configValidation = StripeService.validateConfig();
    if (!configValidation.valid) {
      console.error('[Billing] Stripe configuration invalid:', configValidation.errors);
      return res.status(500).json({ 
        error: 'Payment service not configured',
        details: configValidation.errors 
      });
    }

    // Stripeサービス初期化
    const stripeService = new StripeService();
    
    // サブスクリプションキャンセル
    const result = await stripeService.cancelSubscription(userId);

    if (!result.success) {
      return res.status(500).json({ 
        error: 'Failed to cancel subscription',
        details: result.error 
      });
    }

    res.json({
      success: true,
      message: 'Subscription will be cancelled at the end of the current billing period'
    });

  } catch (error) {
    console.error('[Billing] Cancel subscription failed:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * サブスクリプション継続（キャンセル取り消し）
 * POST /api/billing/restore-subscription
 */
router.post('/restore-subscription', async (req, res) => {
  try {
    const userId = req.headers['x-user-id'] as string;

    if (!userId) {
      return res.status(401).json({ error: 'User authentication required' });
    }

    // Stripe設定検証
    const configValidation = StripeService.validateConfig();
    if (!configValidation.valid) {
      console.error('[Billing] Stripe configuration invalid:', configValidation.errors);
      return res.status(500).json({ 
        error: 'Payment service not configured',
        details: configValidation.errors 
      });
    }

    // Stripeサービス初期化
    const stripeService = new StripeService();
    
    // サブスクリプション継続（キャンセル取り消し）
    const result = await stripeService.restoreSubscription(userId);

    if (!result.success) {
      return res.status(500).json({ 
        error: 'Failed to restore subscription',
        details: result.error 
      });
    }

    res.json({
      success: true,
      message: 'Subscription cancellation has been reversed. Auto-renewal will continue.',
      subscription: result.subscription
    });

  } catch (error) {
    console.error('[Billing] Restore subscription failed:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/billing/subscription-info/:userId
 * サブスクリプション詳細情報取得
 */
router.get('/subscription-info/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const requestUserId = req.headers['x-user-id'] as string;

    // 認証チェック（自分の情報のみ取得可能）
    if (!requestUserId || requestUserId !== userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Stripe設定検証
    const configValidation = StripeService.validateConfig();
    if (!configValidation.valid) {
      console.error('[Billing] Stripe configuration invalid:', configValidation.errors);
      return res.status(500).json({ 
        error: 'Payment service not configured',
        details: configValidation.errors 
      });
    }

    // Stripeサービス初期化
    const stripeService = new StripeService();
    
    // サブスクリプション情報取得
    const result = await stripeService.getSubscriptionInfo(userId);

    if (!result.success) {
      return res.status(500).json({ 
        error: 'Failed to get subscription info',
        details: result.error 
      });
    }

    res.json({
      success: true,
      subscription: result.subscription
    });

  } catch (error) {
    console.error('[Billing] Get subscription info failed:', error);
    res.status(500).json({ 
      error: 'Failed to get subscription info',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/billing/history/:userId
 * 請求履歴取得
 */
router.get('/history/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const requestUserId = req.headers['x-user-id'] as string;

    // 認証チェック（自分の情報のみ取得可能）
    if (!requestUserId || requestUserId !== userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Stripe設定検証 - 開発環境では空の履歴を返す
    const configValidation = StripeService.validateConfig();
    if (!configValidation.valid) {
      console.warn('[Billing] Stripe not configured, returning empty history:', configValidation.errors);
      return res.json({
        success: true,
        invoices: [],
        message: 'Payment service not configured (development mode)'
      });
    }

    // Stripeサービス初期化
    const stripeService = new StripeService();
    
    // 請求履歴取得
    const result = await stripeService.getBillingHistory(userId);

    if (!result.success) {
      return res.status(500).json({ 
        error: 'Failed to get billing history',
        details: result.error 
      });
    }

    res.json({
      success: true,
      invoices: result.invoices || []
    });

  } catch (error) {
    console.error('[Billing] Get billing history failed:', error);
    res.status(500).json({ 
      error: 'Failed to get billing history',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /api/billing/test-webhook
 * Webhookテスト用エンドポイント（開発環境のみ）
 */
router.post('/test-webhook', async (req, res) => {
  if (process.env.NODE_ENV === 'production') {
    return res.status(404).json({ error: 'Not found' });
  }
  
  console.log('[Billing] Test webhook received');
  console.log('[Billing] Body is Buffer:', Buffer.isBuffer(req.body));
  console.log('[Billing] Body length:', req.body?.length || 0);
  console.log('[Billing] Headers:', req.headers);
  
  res.json({ 
    received: true,
    bodyType: typeof req.body,
    isBuffer: Buffer.isBuffer(req.body),
    bodyLength: req.body?.length || 0,
    headers: Object.keys(req.headers)
  });
});

/**
 * GET /api/billing/health
 * Stripe接続確認
 */
router.get('/health', async (req, res) => {
  try {
    const configValidation = StripeService.validateConfig();
    
    if (!configValidation.valid) {
      return res.status(500).json({
        success: false,
        error: 'Stripe configuration invalid',
        details: configValidation.errors
      });
    }

    // Stripe API接続テスト
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
      apiVersion: '2025-06-30.basil'
    });

    await stripe.customers.list({ limit: 1 });

    res.json({
      success: true,
      message: 'Stripe service is healthy',
      config: {
        hasSecretKey: !!process.env.STRIPE_SECRET_KEY,
        hasWebhookSecret: !!process.env.STRIPE_WEBHOOK_SECRET
      }
    });

  } catch (error) {
    console.error('[Billing] Health check failed:', error);
    res.status(500).json({
      success: false,
      error: 'Stripe service unavailable',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;