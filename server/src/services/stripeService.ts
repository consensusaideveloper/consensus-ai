/**
 * Stripe決済サービス
 * サブスクリプション作成・管理機能を提供
 */

import Stripe from 'stripe';
import { TrialService } from './trialService';
import { LimitsConfig } from '../config/limits';
import { PLAN_TYPES, type PlanType } from '../constants/planTypes';

interface CreateSubscriptionParams {
  userId: string;
  email: string;
  priceId: string;
  successUrl: string;
  cancelUrl: string;
  enableTrial?: boolean;
}

interface SubscriptionResult {
  success: boolean;
  sessionId?: string;
  url?: string;
  error?: string;
}

export class StripeService {
  private stripe: Stripe;

  constructor() {
    const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
    
    if (!stripeSecretKey) {
      throw new Error('STRIPE_SECRET_KEY is not set');
    }

    this.stripe = new Stripe(stripeSecretKey, {
      apiVersion: '2025-06-30.basil'
    });
  }

  /**
   * Stripeサブスクリプションの正しいステータス判定
   * トライアル期間（trial_end）を考慮した判定ロジック
   */
  private determineSubscriptionStatus(subscription: Stripe.Subscription): PlanType {
    // トライアル期間中かどうかを確認
    const now = new Date();
    const isTrialActive = subscription.trial_end && new Date(subscription.trial_end * 1000) > now;
    
    console.log(`[StripeService] 🔍 Status determination:`, {
      subscriptionId: subscription.id,
      stripeStatus: subscription.status,
      trialStart: subscription.trial_start ? new Date(subscription.trial_start * 1000) : null,
      trialEnd: subscription.trial_end ? new Date(subscription.trial_end * 1000) : null,
      isTrialActive,
      now: now.toISOString()
    });

    // 明示的にトライアル状態
    if (subscription.status === 'trialing') {
      return PLAN_TYPES.TRIAL;
    }

    // アクティブだがトライアル期間中
    if (subscription.status === 'active' && isTrialActive) {
      return PLAN_TYPES.TRIAL;
    }

    // アクティブでトライアル期間外（有料プラン）
    if (subscription.status === 'active') {
      return PLAN_TYPES.PRO;
    }

    // キャンセル・期限切れ状態
    if (subscription.status === 'canceled' || subscription.status === 'incomplete_expired') {
      return PLAN_TYPES.FREE;
    }

    // その他の状態（past_due, unpaid など）
    return PLAN_TYPES.CANCELLED;
  }

  /**
   * Checkout セッション作成
   */
  async createCheckoutSession(params: CreateSubscriptionParams): Promise<SubscriptionResult> {
    try {
      const { userId, email, priceId, successUrl, cancelUrl, enableTrial = true } = params;

      // 既存のユーザー情報取得
      const user = await this.getUserById(userId);
      if (!user) {
        return {
          success: false,
          error: 'User not found'
        };
      }

      // Stripe顧客作成または取得
      let stripeCustomer: Stripe.Customer;
      
      if (user.stripeCustomerId) {
        stripeCustomer = await this.stripe.customers.retrieve(user.stripeCustomerId) as Stripe.Customer;
      } else {
        stripeCustomer = await this.stripe.customers.create({
          email: email,
          metadata: {
            userId: userId
          }
        });

        // StripeカスタマーIDをDBに保存
        await TrialService.updateSubscriptionStatus(userId, user.subscriptionStatus || 'free', stripeCustomer.id, 'customer_creation', undefined, null, null);
      }

      // Checkout セッション作成
      console.log(`[StripeService] 🛒 Creating checkout session for user ${userId} with price ${priceId}`);
      
      const sessionConfig: any = {
        customer: stripeCustomer.id,
        payment_method_types: ['card'],
        line_items: [
          {
            price: priceId,
            quantity: 1,
          },
        ],
        mode: 'subscription',
        success_url: successUrl,
        cancel_url: cancelUrl,
        metadata: {
          userId: userId
        }
      };
      
      // Stripeトライアル設定追加
      if (enableTrial) {
        sessionConfig.subscription_data = {
          trial_period_days: LimitsConfig.getTrialDurationDays(),
          trial_settings: {
            end_behavior: {
              missing_payment_method: 'cancel'
            }
          }
        };
        sessionConfig.payment_method_collection = 'if_required';
      }
      
      const session = await this.stripe.checkout.sessions.create(sessionConfig);
      
      console.log(`[StripeService] ✅ Checkout session created:`, {
        sessionId: session.id,
        url: session.url,
        metadata: session.metadata
      });

      return {
        success: true,
        sessionId: session.id,
        url: session.url || undefined
      };

    } catch (error) {
      console.error('[StripeService] Checkout session creation failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Webhook処理 - サブスクリプション更新
   */
  async handleWebhook(event: Stripe.Event): Promise<{ success: boolean; error?: string }> {
    try {
      switch (event.type) {
        case 'checkout.session.completed':
          return await this.handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session, event.id);
          
        case 'customer.subscription.created':
          return await this.handleSubscriptionCreated(event.data.object as Stripe.Subscription, event.id);
          
        case 'customer.subscription.updated':
          return await this.handleSubscriptionUpdated(event.data.object as Stripe.Subscription, event.id);
          
        case 'customer.subscription.deleted':
          return await this.handleSubscriptionDeleted(event.data.object as Stripe.Subscription, event.id);
          
        case 'invoice.payment_succeeded':
          return await this.handleInvoicePaymentSucceeded(event.data.object as Stripe.Invoice, event.id);
          
        case 'invoice.payment_failed':
          return await this.handleInvoicePaymentFailed(event.data.object as Stripe.Invoice, event.id);
          
        case 'customer.subscription.trial_will_end':
          return await this.handleTrialWillEnd(event.data.object as Stripe.Subscription, event.id);
          
        default:
          console.log(`[StripeService] Unhandled event type: ${event.type}`);
          return { success: true };
      }

    } catch (error) {
      console.error('[StripeService] Webhook processing failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Checkout完了処理
   */
  private async handleCheckoutCompleted(session: Stripe.Checkout.Session, eventId: string): Promise<{ success: boolean; error?: string }> {
    try {
      console.log(`[StripeService] 🔍 Processing checkout completion:`, {
        sessionId: session.id,
        metadata: session.metadata,
        customer: session.customer,
        subscription: session.subscription
      });

      const userId = session.metadata?.userId;
      if (!userId) {
        console.error('[StripeService] ❌ User ID not found in session metadata:', session.metadata);
        throw new Error('User ID not found in session metadata');
      }

      console.log(`[StripeService] 👤 Found user ID: ${userId}`);

      // サブスクリプション取得
      if (session.subscription) {
        console.log(`[StripeService] 📋 Retrieving subscription: ${session.subscription}`);
        const subscription = await this.stripe.subscriptions.retrieve(session.subscription as string);
        console.log(`[StripeService] 📋 Subscription details:`, {
          id: subscription.id,
          status: subscription.status,
          customer: subscription.customer,
          trial_start: subscription.trial_start,
          trial_end: subscription.trial_end
        });
        
        // 🔧 FIX: 正しいステータス判定ロジックを使用
        const status = this.determineSubscriptionStatus(subscription);
        
        // トライアル日付を抽出
        const trialStartDate = subscription.trial_start ? new Date(subscription.trial_start * 1000) : null;
        const trialEndDate = subscription.trial_end ? new Date(subscription.trial_end * 1000) : null;
        
        console.log(`[StripeService] 💾 Updating subscription status for user ${userId} to '${status}' (Stripe status: ${subscription.status})`);
        console.log(`[StripeService] 📅 Trial dates:`, { trialStartDate, trialEndDate });
        
        const updateResult = await TrialService.updateSubscriptionStatus(
          userId, 
          status, 
          session.customer as string,
          'stripe_checkout_completed',
          eventId,
          trialStartDate,
          trialEndDate
        );

        console.log(`[StripeService] 💾 Update result:`, updateResult);
        console.log(`[StripeService] ✅ Subscription activated for user ${userId}`);
      } else {
        console.warn(`[StripeService] ⚠️ No subscription found in session ${session.id}`);
      }

      return { success: true };

    } catch (error) {
      console.error('[StripeService] Checkout completion failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * サブスクリプション更新処理
   */
  private async handleSubscriptionUpdated(subscription: Stripe.Subscription, eventId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const customer = await this.stripe.customers.retrieve(subscription.customer as string) as Stripe.Customer;
      const userId = customer.metadata?.userId;

      if (!userId) {
        throw new Error('User ID not found in customer metadata');
      }

      // 削除申請中のユーザーでも既存サブスクリプションの状態更新は継続
      // （請求回避を防ぐため、削除申請中でもStripe状態はDB同期を維持）
      const userToCheck = await this.getUserById(userId);
      if (userToCheck?.isDeleted && userToCheck?.deletionRequestedAt) {
        console.log(`[StripeService] ℹ️ 削除申請中のユーザー - プラン更新を継続（請求回避防止）: ${userId}`);
        console.log(`[StripeService] 📋 削除申請情報:`, {
          userId,
          deletionRequestedAt: userToCheck.deletionRequestedAt,
          scheduledDeletionAt: userToCheck.scheduledDeletionAt,
          subscriptionStatus: userToCheck.subscriptionStatus,
          note: '既存契約の状態更新は継続実行'
        });
        // 削除申請中でも既存サブスクリプションの状態更新は継続
      }

      // 🔧 FIX: 正しいステータス判定ロジックを使用
      const status = this.determineSubscriptionStatus(subscription);
      
      // トライアル日付を抽出
      const trialStartDate = subscription.trial_start ? new Date(subscription.trial_start * 1000) : null;
      const trialEndDate = subscription.trial_end ? new Date(subscription.trial_end * 1000) : null;
      
      console.log(`[StripeService] 📅 Trial dates for updated subscription ${subscription.id}:`, { trialStartDate, trialEndDate });

      await TrialService.updateSubscriptionStatus(
        userId, 
        status, 
        customer.id,
        'stripe_subscription_updated',
        eventId,
        trialStartDate,
        trialEndDate
      );

      console.log(`[StripeService] ✅ Subscription updated for user ${userId}: ${subscription.status} → ${status}`);
      return { success: true };

    } catch (error) {
      console.error('[StripeService] Subscription update failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * サブスクリプション作成処理
   */
  private async handleSubscriptionCreated(subscription: Stripe.Subscription, eventId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const customer = await this.stripe.customers.retrieve(subscription.customer as string) as Stripe.Customer;
      const userId = customer.metadata?.userId;

      if (!userId) {
        throw new Error('User ID not found in customer metadata');
      }

      // 削除申請中のユーザーかチェック
      const userToCheck = await this.getUserById(userId);
      if (userToCheck?.isDeleted && userToCheck?.deletionRequestedAt) {
        console.log(`[StripeService] ℹ️ 削除申請中のユーザー - サブスクリプション作成処理をスキップ: ${userId}`);
        return { success: true };
      }

      // 🔧 FIX: 正しいステータス判定ロジックを使用
      const status = this.determineSubscriptionStatus(subscription);
      
      // トライアル日付を抽出
      const trialStartDate = subscription.trial_start ? new Date(subscription.trial_start * 1000) : null;
      const trialEndDate = subscription.trial_end ? new Date(subscription.trial_end * 1000) : null;
      
      console.log(`[StripeService] 📅 Trial dates for subscription ${subscription.id}:`, { trialStartDate, trialEndDate });
      
      await TrialService.updateSubscriptionStatus(
        userId, 
        status, 
        customer.id,
        'stripe_subscription_created',
        eventId,
        trialStartDate,
        trialEndDate
      );

      console.log(`[StripeService] ✅ Subscription created for user ${userId}: ${status}`);
      return { success: true };

    } catch (error) {
      console.error('[StripeService] Subscription creation failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * サブスクリプション削除処理
   */
  private async handleSubscriptionDeleted(subscription: Stripe.Subscription, eventId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const customer = await this.stripe.customers.retrieve(subscription.customer as string) as Stripe.Customer;
      const userId = customer.metadata?.userId;

      if (!userId) {
        throw new Error('User ID not found in customer metadata');
      }

      // 削除申請中のユーザーでもサブスクリプション削除処理は継続
      // （削除申請後に期間終了したサブスクリプションを適切に処理するため）
      const userToCheck = await this.getUserById(userId);
      if (userToCheck?.isDeleted && userToCheck?.deletionRequestedAt) {
        console.log(`[StripeService] ℹ️ 削除申請中のユーザー - サブスクリプション削除処理を継続: ${userId}`);
        // 削除申請中でもサブスクリプション終了処理は継続実行
      }

      // サブスクリプション状態を削除済みに更新
      await TrialService.updateSubscriptionStatus(
        userId, 
        PLAN_TYPES.CANCELLED, 
        customer.id,
        'stripe_subscription_deleted',
        eventId,
        null,
        null
      );

      console.log(`[StripeService] ✅ Subscription cancelled for user ${userId}`);
      return { success: true };

    } catch (error) {
      console.error('[StripeService] Subscription deletion failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * 請求書支払い成功処理
   */
  private async handleInvoicePaymentSucceeded(invoice: Stripe.Invoice, eventId: string): Promise<{ success: boolean; error?: string }> {
    try {
      if (!invoice.lines?.data?.[0]?.subscription) {
        return { success: true }; // サブスクリプション以外の支払いは無視
      }

      const subscriptionId = invoice.lines.data[0].subscription as string;
      const subscription = await this.stripe.subscriptions.retrieve(subscriptionId);
      const customer = await this.stripe.customers.retrieve(subscription.customer as string) as Stripe.Customer;
      const userId = customer.metadata?.userId;

      if (!userId) {
        throw new Error('User ID not found in customer metadata');
      }

      // 削除申請中のユーザーでも請求処理は継続（重要：請求回避防止）
      const userToCheck = await this.getUserById(userId);
      if (userToCheck?.isDeleted && userToCheck?.deletionRequestedAt) {
        console.log(`[StripeService] ℹ️ 削除申請中のユーザー - 請求書支払い処理を継続（請求回避防止）: ${userId}`);
        console.log(`[StripeService] 💰 重要: 削除申請中でも既存契約の請求処理は継続実行`);
        // 削除申請中でも請求処理は継続（請求回避を防ぐため）
      }

      // 🔧 FIX: 正しいステータス判定ロジックを使用
      const status = this.determineSubscriptionStatus(subscription);
      
      // トライアル日付を抽出（支払い成功時もトライアル状態の可能性がある）
      const trialStartDate = subscription.trial_start ? new Date(subscription.trial_start * 1000) : null;
      const trialEndDate = subscription.trial_end ? new Date(subscription.trial_end * 1000) : null;
      
      await TrialService.updateSubscriptionStatus(
        userId, 
        status, 
        customer.id,
        'stripe_invoice_payment_succeeded',
        eventId,
        trialStartDate,
        trialEndDate
      );

      console.log(`[StripeService] ✅ Invoice payment succeeded for user ${userId}: ${(invoice.amount_paid || 0) / 100} ${invoice.currency}`);
      return { success: true };

    } catch (error) {
      console.error('[StripeService] Invoice payment processing failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * 請求書支払い失敗処理
   */
  private async handleInvoicePaymentFailed(invoice: Stripe.Invoice, eventId: string): Promise<{ success: boolean; error?: string }> {
    try {
      if (!invoice.lines?.data?.[0]?.subscription) {
        return { success: true }; // サブスクリプション以外の支払いは無視
      }

      const subscriptionId = invoice.lines.data[0].subscription as string;
      const subscription = await this.stripe.subscriptions.retrieve(subscriptionId);
      const customer = await this.stripe.customers.retrieve(subscription.customer as string) as Stripe.Customer;
      const userId = customer.metadata?.userId;

      if (!userId) {
        throw new Error('User ID not found in customer metadata');
      }

      // 削除申請中のユーザーでも支払い失敗処理は継続
      const userToCheck = await this.getUserById(userId);
      if (userToCheck?.isDeleted && userToCheck?.deletionRequestedAt) {
        console.log(`[StripeService] ℹ️ 削除申請中のユーザー - 支払い失敗処理を継続: ${userId}`);
        // 削除申請中でも支払い失敗の記録は継続
      }

      // 支払い失敗の場合、ステータスは変更せずログのみ記録
      console.log(`[StripeService] ⚠️ Invoice payment failed for user ${userId}: ${(invoice.amount_due || 0) / 100} ${invoice.currency}`);
      
      // TODO: 支払い失敗通知をユーザーに送信する実装を追加
      return { success: true };

    } catch (error) {
      console.error('[StripeService] Invoice payment failure processing failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * トライアル終了予告処理
   */
  private async handleTrialWillEnd(subscription: Stripe.Subscription, eventId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const customer = await this.stripe.customers.retrieve(subscription.customer as string) as Stripe.Customer;
      const userId = customer.metadata?.userId;

      if (!userId) {
        throw new Error('User ID not found in customer metadata');
      }

      console.log(`[StripeService] 📅 Trial will end soon for user ${userId}`);
      
      // 将来的な通知機能のためのログ記録とDB更新
      try {
        const { PrismaClient } = await import('@prisma/client');
        const prisma = new PrismaClient();
        
        // ユーザー情報更新（期限切れ予告の記録）
        await prisma.user.update({
          where: { id: userId },
          data: {
            // 将来的な期限切れ予告フラグ実装用
            updatedAt: new Date()
          }
        });
        
        await prisma.$disconnect();
        console.log(`[StripeService] ✅ Trial will end notification recorded for user ${userId}`);
      } catch (dbError) {
        console.warn('[StripeService] Trial will end DB update failed (non-critical):', dbError);
      }
      
      return { success: true };

    } catch (error) {
      console.error('[StripeService] Trial will end processing failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * ユーザー情報取得（TrialServiceから移行）
   */
  private async getUserById(userId: string): Promise<any> {
    try {
      const { PrismaClient } = await import('@prisma/client');
      const prisma = new PrismaClient();
      
      const user = await prisma.user.findUnique({
        where: { id: userId }
      });
      
      await prisma.$disconnect();
      return user;
      
    } catch (error) {
      console.error('[StripeService] Error fetching user:', error);
      return null;
    }
  }

  /**
   * サブスクリプションキャンセル
   */
  async cancelSubscription(userId: string): Promise<{ success: boolean; error?: string }> {
    try {
      // ユーザー情報取得
      const user = await this.getUserById(userId);
      if (!user || !user.stripeCustomerId) {
        return {
          success: false,
          error: 'User not found or no Stripe customer ID'
        };
      }

      // 顧客のアクティブなサブスクリプションを取得
      const subscriptions = await this.stripe.subscriptions.list({
        customer: user.stripeCustomerId,
        status: 'active'
      });

      if (subscriptions.data.length === 0) {
        return {
          success: false,
          error: 'No active subscription found'
        };
      }

      // 最初のアクティブなサブスクリプションをキャンセル
      const subscription = subscriptions.data[0];
      await this.stripe.subscriptions.update(subscription.id, {
        cancel_at_period_end: true
      });

      console.log(`[StripeService] ✅ Subscription marked for cancellation for user ${userId}: ${subscription.id}`);
      return { success: true };

    } catch (error) {
      console.error('[StripeService] Subscription cancellation failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * サブスクリプション情報取得
   */
  async getSubscriptionInfo(userId: string): Promise<{ 
    success: boolean; 
    subscription?: {
      id: string;
      status: string;
      current_period_start: number | null;
      current_period_end: number | null;
      cancel_at_period_end: boolean;
      trial_start: number | null;
      trial_end: number | null;
    }; 
    error?: string;
  }> {
    try {
      // ユーザー情報取得
      const user = await this.getUserById(userId);
      if (!user || !user.stripeCustomerId) {
        return {
          success: false,
          error: 'User not found or no Stripe customer ID'
        };
      }

      // 顧客のサブスクリプションを取得
      const subscriptions = await this.stripe.subscriptions.list({
        customer: user.stripeCustomerId,
        limit: 1
      });

      if (subscriptions.data.length === 0) {
        return {
          success: true,
          subscription: undefined
        };
      }

      const subscription = subscriptions.data[0];
      return {
        success: true,
        subscription: {
          id: subscription.id,
          status: subscription.status,
          current_period_start: (subscription as any).current_period_start || null,
          current_period_end: (subscription as any).current_period_end || null,
          cancel_at_period_end: (subscription as any).cancel_at_period_end || false,
          trial_start: (subscription as any).trial_start || null,
          trial_end: (subscription as any).trial_end || null
        }
      };

    } catch (error) {
      console.error('[StripeService] Get subscription info failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * 請求履歴取得
   */
  async getBillingHistory(userId: string): Promise<{ 
    success: boolean; 
    invoices?: Array<{
      id: string;
      amount_paid: number;
      amount_due: number;
      currency: string;
      status: string;
      created: number;
      period_start: number | null;
      period_end: number | null;
      hosted_invoice_url: string | null;
      invoice_pdf: string | null;
    }>; 
    error?: string;
  }> {
    try {
      // ユーザー情報取得
      const user = await this.getUserById(userId);
      if (!user || !user.stripeCustomerId) {
        return {
          success: false,
          error: 'User not found or no Stripe customer ID'
        };
      }

      // 顧客の請求書を取得
      const invoices = await this.stripe.invoices.list({
        customer: user.stripeCustomerId,
        limit: 20
      });

      const formattedInvoices = invoices.data.map(invoice => ({
        id: invoice.id || '',
        amount_paid: invoice.amount_paid || 0,
        amount_due: invoice.amount_due || 0,
        currency: invoice.currency || 'usd',
        status: invoice.status || 'draft',
        created: invoice.created || 0,
        period_start: invoice.period_start || null,
        period_end: invoice.period_end || null,
        hosted_invoice_url: invoice.hosted_invoice_url || null,
        invoice_pdf: invoice.invoice_pdf || null
      }));

      return {
        success: true,
        invoices: formattedInvoices
      };

    } catch (error) {
      console.error('[StripeService] Get billing history failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Stripeサブスクリプションの期限確認
   */
  async isStripeTrialExpired(userId: string): Promise<{ expired: boolean; endDate?: Date; error?: string }> {
    try {
      const user = await this.getUserById(userId);
      if (!user?.stripeCustomerId) {
        return { expired: false, error: 'No Stripe customer ID' };
      }

      const subscriptions = await this.stripe.subscriptions.list({
        customer: user.stripeCustomerId,
        status: 'all',
        limit: 1
      });

      if (subscriptions.data.length === 0) {
        return { expired: true, error: 'No subscription found' };
      }

      const subscription = subscriptions.data[0];
      
      if (subscription.status === 'trialing' && subscription.trial_end) {
        const trialEndDate = new Date(subscription.trial_end * 1000);
        const isExpired = new Date() > trialEndDate;
        return { expired: isExpired, endDate: trialEndDate };
      }
      
      // トライアル状態でない場合は期限切れとして扱う
      return { expired: subscription.status !== 'active' };

    } catch (error) {
      console.error('[StripeService] Trial expiry check failed:', error);
      return { expired: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  /**
   * サブスクリプション復旧（削除キャンセル時）
   */
  async restoreSubscription(userId: string): Promise<{
    success: boolean;
    subscription?: {
      id: string;
      status: string;
      cancel_at_period_end: boolean;
    };
    error?: string;
  }> {
    try {
      console.log(`[StripeService] 🔄 サブスクリプション復旧開始 - ユーザー: ${userId}`);

      // ユーザー情報取得
      const user = await this.getUserById(userId);
      if (!user || !user.stripeCustomerId) {
        console.error(`[StripeService] ❌ ユーザーまたはStripe顧客ID未設定: ${userId}`);
        return {
          success: false,
          error: 'User not found or no Stripe customer ID'
        };
      }

      // Stripe顧客のサブスクリプション一覧取得
      const subscriptions = await this.stripe.subscriptions.list({
        customer: user.stripeCustomerId,
        status: 'all',
        limit: 10
      });

      if (subscriptions.data.length === 0) {
        console.error(`[StripeService] ❌ サブスクリプションが見つかりません: ${userId}`);
        return {
          success: false,
          error: 'No subscription found for customer'
        };
      }

      // 最新のサブスクリプションを取得（削除申請時にキャンセル設定されたもの）
      const subscription = subscriptions.data[0];
      
      console.log(`[StripeService] 🔍 サブスクリプション状態確認:`, {
        id: subscription.id,
        status: subscription.status,
        cancel_at_period_end: subscription.cancel_at_period_end
      });

      // cancel_at_period_end がtrue（削除申請でキャンセル設定）の場合のみ復旧
      if (!subscription.cancel_at_period_end) {
        console.log(`[StripeService] ℹ️ サブスクリプション復旧不要 - cancel_at_period_end: ${subscription.cancel_at_period_end}`);
        return {
          success: true,
          subscription: {
            id: subscription.id,
            status: subscription.status,
            cancel_at_period_end: subscription.cancel_at_period_end
          }
        };
      }

      // サブスクリプション復旧実行
      console.log(`[StripeService] 🔧 サブスクリプション復旧実行: ${subscription.id}`);
      const restoredSubscription = await this.stripe.subscriptions.update(subscription.id, {
        cancel_at_period_end: false
      });

      console.log(`[StripeService] ✅ サブスクリプション復旧成功:`, {
        id: restoredSubscription.id,
        status: restoredSubscription.status,
        cancel_at_period_end: restoredSubscription.cancel_at_period_end
      });

      return {
        success: true,
        subscription: {
          id: restoredSubscription.id,
          status: restoredSubscription.status,
          cancel_at_period_end: restoredSubscription.cancel_at_period_end
        }
      };

    } catch (error) {
      console.error('[StripeService] ❌ サブスクリプション復旧失敗:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Stripeカスタマー完全削除（物理削除時）
   */
  async deleteCustomerCompletely(customerId: string): Promise<{
    success: boolean;
    deletedSubscriptions: string[];
    deletedCustomer: boolean;
    error?: string;
  }> {
    try {
      console.log(`[StripeService] 🗑️ Stripe顧客完全削除開始 - カスタマー: ${customerId}`);

      const deletedSubscriptions: string[] = [];
      let deletedCustomer = false;

      // Step 1: 顧客のすべてのサブスクリプションを取得
      console.log(`[StripeService] 📋 サブスクリプション一覧取得開始`);
      const subscriptions = await this.stripe.subscriptions.list({
        customer: customerId,
        status: 'all',
        limit: 20
      });

      console.log(`[StripeService] 📋 サブスクリプション取得完了: ${subscriptions.data.length}件`);

      // Step 2: アクティブなサブスクリプションを完全削除
      for (const subscription of subscriptions.data) {
        console.log(`[StripeService] 🔧 サブスクリプション削除: ${subscription.id} (status: ${subscription.status})`);
        
        try {
          if (subscription.status === 'active' || subscription.status === 'trialing') {
            // アクティブなサブスクリプションは即座に削除
            await this.stripe.subscriptions.cancel(subscription.id, {
              prorate: false
            });
            console.log(`[StripeService] ✅ アクティブサブスクリプション削除完了: ${subscription.id}`);
          } else if (subscription.status === 'past_due' || subscription.status === 'unpaid') {
            // 未払いのサブスクリプションも削除
            await this.stripe.subscriptions.cancel(subscription.id);
            console.log(`[StripeService] ✅ 未払いサブスクリプション削除完了: ${subscription.id}`);
          } else {
            console.log(`[StripeService] ℹ️ サブスクリプションスキップ: ${subscription.id} (status: ${subscription.status})`);
          }
          
          deletedSubscriptions.push(subscription.id);
        } catch (subscriptionError) {
          console.error(`[StripeService] ⚠️ サブスクリプション削除失敗: ${subscription.id}`, subscriptionError);
          // 個別のサブスクリプション削除失敗は継続（全体の処理は続行）
        }
      }

      // Step 3: 支払い方法の確認と削除
      console.log(`[StripeService] 💳 支払い方法確認開始`);
      try {
        const paymentMethods = await this.stripe.paymentMethods.list({
          customer: customerId,
          limit: 10
        });
        
        console.log(`[StripeService] 💳 支払い方法: ${paymentMethods.data.length}件`);
        
        for (const paymentMethod of paymentMethods.data) {
          try {
            await this.stripe.paymentMethods.detach(paymentMethod.id);
            console.log(`[StripeService] ✅ 支払い方法削除完了: ${paymentMethod.id}`);
          } catch (pmError) {
            console.error(`[StripeService] ⚠️ 支払い方法削除失敗: ${paymentMethod.id}`, pmError);
          }
        }
      } catch (pmListError) {
        console.error(`[StripeService] ⚠️ 支払い方法一覧取得失敗`, pmListError);
      }

      // Step 4: Stripeカスタマー削除
      console.log(`[StripeService] 👤 Stripe顧客削除実行: ${customerId}`);
      try {
        await this.stripe.customers.del(customerId);
        deletedCustomer = true;
        console.log(`[StripeService] ✅ Stripe顧客削除完了: ${customerId}`);
      } catch (customerError) {
        console.error(`[StripeService] ❌ Stripe顧客削除失敗: ${customerId}`, customerError);
        // customer削除失敗は重要なエラーとして扱う
        return {
          success: false,
          deletedSubscriptions,
          deletedCustomer: false,
          error: `Customer deletion failed: ${customerError instanceof Error ? customerError.message : 'Unknown error'}`
        };
      }

      const result = {
        success: true,
        deletedSubscriptions,
        deletedCustomer
      };

      console.log(`[StripeService] ✅ Stripe完全削除成功:`, result);
      return result;

    } catch (error) {
      console.error('[StripeService] ❌ Stripe完全削除失敗:', error);
      return {
        success: false,
        deletedSubscriptions: [],
        deletedCustomer: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * 設定検証
   */
  static validateConfig(): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!process.env.STRIPE_SECRET_KEY) {
      errors.push('STRIPE_SECRET_KEY is not set');
    }

    if (!process.env.STRIPE_WEBHOOK_SECRET) {
      errors.push('STRIPE_WEBHOOK_SECRET is not set');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }
}

export default StripeService;