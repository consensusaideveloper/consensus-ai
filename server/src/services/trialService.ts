/**
 * Phase 3: Trial Management Service
 * Safe implementation with extensive error handling and fallbacks
 * Created: 2025-07-22
 */

import { LimitsConfig } from '../config/limits';
import { database, isFirebaseInitialized } from '../lib/firebase-admin';
import { PLAN_TYPES, type PlanType } from '../constants/planTypes';
import { PlanLimitService } from './PlanLimitService';
import { UserPlanHistoryService } from './UserPlanHistoryService';

interface User {
  id: string;
  email: string;
  name?: string | null;
  purpose?: string | null;
  createdAt: Date;
  trialStartDate?: Date | null;
  trialEndDate?: Date | null;
  subscriptionStatus?: string | null;
  stripeCustomerId?: string | null;
}

interface TrialStatus {
  isTrialActive: boolean;
  daysRemaining: number;
  isExpired: boolean;
  shouldShowUpgrade: boolean;
  subscriptionStatus: string;
}

export class TrialService {
  // 🔧 FIX: In-memory lock to prevent concurrent trial expiration processing
  private static processingUsers = new Set<string>();

  /**
   * Sync user plan data to Firebase (既存パターンを踏襲)
   */
  private static async syncToFirebase(user: User): Promise<void> {
    if (isFirebaseInitialized && database) {
      try {
        const firebaseUserData = {
          // プラン関連フィールドのみ更新（既存パターンに従った最小限同期）
          ...(user.subscriptionStatus && { subscriptionStatus: user.subscriptionStatus }),
          ...(user.trialStartDate && { trialStartDate: user.trialStartDate.toISOString() }),
          ...(user.trialEndDate && { trialEndDate: user.trialEndDate.toISOString() })
        };
        
        const userRef = database.ref(`users/${user.id}`);
        await userRef.update(firebaseUserData);
        
        console.log('[TrialService] ✅ Firebase同期完了:', { userId: user.id, data: firebaseUserData });
        
      } catch (firebaseError) {
        console.error('[TrialService] ⚠️ Firebase同期エラー:', firebaseError);
        // TrialServiceではFirebase同期失敗でもSQLロールバックしない（ベストエフォート方式）
      }
    }
  }
  
  /**
   * Get user from database by ID
   */
  private static async getUserById(userId: string): Promise<User | null> {
    try {
      const { PrismaClient } = await import('@prisma/client');
      const prisma = new PrismaClient();
      
      const user = await prisma.user.findUnique({
        where: { id: userId }
      });
      
      await prisma.$disconnect();
      return user;
      
    } catch (error) {
      console.error('[TrialService] Error fetching user:', error);
      return null;
    }
  }
  
  /**
   * Calculate remaining trial days with safe fallbacks (from user object)
   */
  private static calculateRemainingDaysFromUser(user: User): number {
    try {
      if (!user) {
        console.warn('[TrialService] User is null/undefined');
        return 0;
      }

      // Use trialEndDate if available (Phase 3)
      if (user.trialEndDate) {
        const now = new Date();
        const endDate = new Date(user.trialEndDate);
        const diffTime = endDate.getTime() - now.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return Math.max(0, diffDays);
      }

      // Fallback to createdAt + configured days (Phase 1/2 compatibility)
      if (user.createdAt) {
        const now = new Date();
        const createdAt = new Date(user.createdAt);
        const trialDurationDays = LimitsConfig.getTrialDurationDays();
        const trialEndDate = new Date(createdAt.getTime() + (trialDurationDays * 24 * 60 * 60 * 1000));
        const diffTime = trialEndDate.getTime() - now.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return Math.max(0, diffDays);
      }

      console.warn('[TrialService] No valid date found for user:', user.id);
      return 0;

    } catch (error) {
      console.error('[TrialService] Error calculating remaining days:', error);
      return 0;
    }
  }

  /**
   * Check if trial is currently active
   */
  private static isTrialActive(user: User): boolean {
    try {
      if (!user) return false;

      // Check subscription status if available (Phase 3)
      if (user.subscriptionStatus) {
        return user.subscriptionStatus === PLAN_TYPES.TRIAL;
      }

      // Fallback: check if trial period hasn't expired
      const remainingDays = this.calculateRemainingDaysFromUser(user);
      return remainingDays > 0;

    } catch (error) {
      console.error('[TrialService] Error checking trial status:', error);
      return false;
    }
  }

  /**
   * Determine if upgrade prompt should be shown
   */
  private static shouldShowUpgrade(user: User): boolean {
    try {
      if (!user) return false;

      // Don't show for paid users
      if (user.subscriptionStatus === PLAN_TYPES.PRO) {
        return false;
      }

      // Show for trial users (active or expired)
      return true;

    } catch (error) {
      console.error('[TrialService] Error checking upgrade status:', error);
      return true; // Default to showing upgrade on error
    }
  }

  /**
   * Get comprehensive trial status with database lookup by user ID
   */
  static async getTrialStatus(userId: string): Promise<TrialStatus> {
    try {
      const user = await this.getUserById(userId);
      return this.getTrialStatusFromUser(user);
    } catch (error) {
      console.error('[TrialService] Error getting trial status for user ID:', error);
      return this.getDefaultTrialStatus();
    }
  }

  /**
   * Get comprehensive trial status from user object
   */
  static getTrialStatusFromUser(user: User | null): TrialStatus {
    try {
      if (!user) {
        return {
          isTrialActive: false,
          daysRemaining: 0,
          isExpired: true,
          shouldShowUpgrade: true,
          subscriptionStatus: 'unknown'
        };
      }

      const daysRemaining = this.calculateRemainingDaysFromUser(user);
      const isTrialActive = this.isTrialActive(user);
      const isExpired = daysRemaining <= 0 && isTrialActive;
      const shouldShowUpgrade = this.shouldShowUpgrade(user);

      return {
        isTrialActive,
        daysRemaining,
        isExpired,
        shouldShowUpgrade,
        subscriptionStatus: user.subscriptionStatus || 'trial'
      };

    } catch (error) {
      console.error('[TrialService] Error getting trial status from user:', error);
      return this.getDefaultTrialStatus();
    }
  }

  /**
   * Get default safe trial status
   */
  private static getDefaultTrialStatus(): TrialStatus {
    return {
      isTrialActive: false,
      daysRemaining: 0,
      isExpired: true,
      shouldShowUpgrade: true,
      subscriptionStatus: 'error'
    };
  }

  /**
   * Calculate remaining days for user ID
   */
  static async calculateRemainingDays(userId: string): Promise<number> {
    try {
      const user = await this.getUserById(userId);
      if (!user) return 0;
      return this.calculateRemainingDaysFromUser(user);
    } catch (error) {
      console.error('[TrialService] Error calculating remaining days for user ID:', error);
      return 0;
    }
  }

  /**
   * Initialize trial for new user (called during registration)
   */
  static initializeTrial(userId: string): { trialStartDate: Date; trialEndDate: Date } {
    try {
      const now = new Date();
      const trialDurationDays = LimitsConfig.getTrialDurationDays();
      const trialEndDate = new Date(now.getTime() + (trialDurationDays * 24 * 60 * 60 * 1000));

      console.log(`[TrialService] Initializing trial for user ${userId}: ${now} -> ${trialEndDate} (${trialDurationDays} days)`);

      return {
        trialStartDate: now,
        trialEndDate: trialEndDate
      };

    } catch (error) {
      console.error('[TrialService] Error initializing trial:', error);
      
      // Safe fallback
      const now = new Date();
      const trialDurationDays = LimitsConfig.getTrialDurationDays();
      return {
        trialStartDate: now,
        trialEndDate: new Date(now.getTime() + (trialDurationDays * 24 * 60 * 60 * 1000))
      };
    }
  }

  /**
   * Update subscription status (called from Stripe webhook)
   */
  static async updateSubscriptionStatus(
    userId: string, 
    status: PlanType,
    stripeCustomerId?: string,
    changeReason?: string,
    stripeEventId?: string,
    trialStartDate?: Date | null,
    trialEndDate?: Date | null
  ): Promise<{ success: boolean; error?: string; user?: any }> {
    try {
      const { PrismaClient } = await import('@prisma/client');
      const prisma = new PrismaClient();
      
      console.log(`[TrialService] Updating subscription for user ${userId}: ${status}`);
      
      // 1. 現在のユーザー情報を取得（履歴記録用）
      const currentUser = await prisma.user.findUnique({
        where: { id: userId },
        select: { subscriptionStatus: true }
      });
      
      const fromPlan = currentUser?.subscriptionStatus || 'free';
      
      // 2. ユーザー情報を更新
      const updateData: any = {
        subscriptionStatus: status,
        stripeCustomerId: stripeCustomerId,
        updatedAt: new Date()
      };

      // トライアル日付が提供された場合のみ更新
      if (trialStartDate !== undefined) {
        updateData.trialStartDate = trialStartDate;
      }
      if (trialEndDate !== undefined) {
        updateData.trialEndDate = trialEndDate;
      }

      const updatedUser = await prisma.user.update({
        where: { id: userId },
        data: updateData
      });
      
      await prisma.$disconnect();
      
      // 3. プラン履歴を記録（プラン変更があった場合のみ）
      if (fromPlan !== status) {
        const changeType = this.determineChangeType(fromPlan, status);
        await UserPlanHistoryService.recordPlanChange({
          userId,
          fromPlan: fromPlan === status ? null : fromPlan,
          toPlan: status,
          changeType,
          changeReason: changeReason || 'system_update',
          stripeEventId,
          effectiveDate: new Date()
        });
        
        console.log(`[TrialService] プラン履歴記録完了: ${fromPlan} → ${status} (${changeType})`);
      }
      
      // 4. Firebase同期（既存パターンを踏襲）
      await this.syncToFirebase(updatedUser);
      
      return {
        success: true,
        user: updatedUser
      };

    } catch (error) {
      console.error('[TrialService] Error updating subscription status:', error);
      return {
        success: false,
        error: 'Failed to update subscription status'
      };
    }
  }

  /**
   * Extend trial period
   */
  static async extendTrial(userId: string, additionalDays: number): Promise<{ success: boolean; error?: string; newTrialEndDate?: Date }> {
    try {
      const { PrismaClient } = await import('@prisma/client');
      const prisma = new PrismaClient();
      
      const user = await prisma.user.findUnique({
        where: { id: userId }
      });
      
      if (!user) {
        await prisma.$disconnect();
        return { success: false, error: 'User not found' };
      }
      
      const trialDurationDays = LimitsConfig.getTrialDurationDays();
      const currentEndDate = user.trialEndDate || new Date(user.createdAt.getTime() + (trialDurationDays * 24 * 60 * 60 * 1000));
      const newTrialEndDate = new Date(currentEndDate.getTime() + (additionalDays * 24 * 60 * 60 * 1000));
      
      const updatedUser = await prisma.user.update({
        where: { id: userId },
        data: {
          trialEndDate: newTrialEndDate,
          updatedAt: new Date()
        }
      });
      
      await prisma.$disconnect();
      
      // Firebase同期（既存パターンを踏襲）
      await this.syncToFirebase(updatedUser);
      
      return {
        success: true,
        newTrialEndDate
      };

    } catch (error) {
      console.error('[TrialService] Error extending trial:', error);
      return {
        success: false,
        error: 'Failed to extend trial'
      };
    }
  }

  /**
   * Start trial for free plan user (user consent required)
   */
  static async startTrial(userId: string): Promise<{
    success: boolean;
    trialStartDate?: Date;
    trialEndDate?: Date;
    error?: string;
  }> {
    try {
      const { PrismaClient } = await import('@prisma/client');
      const prisma = new PrismaClient();
      
      // Get user
      const user = await prisma.user.findUnique({
        where: { id: userId }
      });

      if (!user) {
        await prisma.$disconnect();
        return {
          success: false,
          error: 'User not found'
        };
      }

      // Check if user is eligible for trial (free plan only)
      if (user.subscriptionStatus !== PLAN_TYPES.FREE) {
        await prisma.$disconnect();
        return {
          success: false,
          error: 'Trial only available for free plan users'
        };
      }

      // Check if trial already started
      if (user.trialStartDate) {
        await prisma.$disconnect();
        return {
          success: false,
          error: 'Trial already started for this user'
        };
      }

      // Start trial with configurable duration
      const trialDurationDays = LimitsConfig.getTrialDurationDays();
      const trialStartDate = new Date();
      const trialEndDate = new Date(trialStartDate.getTime() + (trialDurationDays * 24 * 60 * 60 * 1000));

      const updatedUser = await prisma.user.update({
        where: { id: userId },
        data: {
          subscriptionStatus: PLAN_TYPES.TRIAL,
          trialStartDate,
          trialEndDate,
          updatedAt: new Date()
        }
      });

      await prisma.$disconnect();

      // プラン履歴を記録
      await UserPlanHistoryService.recordPlanChange({
        userId,
        fromPlan: user.subscriptionStatus || PLAN_TYPES.FREE,
        toPlan: PLAN_TYPES.TRIAL,
        changeType: 'trial_start',
        changeReason: 'user_request',
        effectiveDate: trialStartDate
      });

      console.log(`[TrialService] プラン履歴記録完了: ${user.subscriptionStatus || 'free'} → trial (trial_start)`);

      // Firebase同期（既存パターンを踏襲）
      await this.syncToFirebase(updatedUser);

      console.log(`[TrialService] ✅ Trial started for user ${userId}:`, {
        trialStartDate,
        trialEndDate,
        durationDays: trialDurationDays
      });

      return {
        success: true,
        trialStartDate,
        trialEndDate
      };

    } catch (error) {
      console.error('[TrialService] Error starting trial:', error);
      return {
        success: false,
        error: 'Failed to start trial'
      };
    }
  }

  /**
   * Health check for trial service
   */
  static async healthCheck(): Promise<any> {
    try {
      const { PrismaClient } = await import('@prisma/client');
      const prisma = new PrismaClient();
      
      // Test database connection
      await prisma.user.count();
      await prisma.$disconnect();
      
      return {
        status: 'healthy',
        database: 'connected',
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      console.error('[TrialService] Health check failed:', error);
      throw new Error('Trial service unhealthy');
    }
  }

  /**
   * Check and update expired trial users to free plan
   * Called from authentication middleware to ensure proper status
   * Fixed: Prevents duplicate planHistory records from concurrent execution
   */
  static async checkAndUpdateExpiredTrial(userId: string): Promise<{ 
    wasExpired: boolean; 
    updated: boolean; 
    user?: any;
    error?: string;
  }> {
    // 🔧 FIX: Check if this user is already being processed
    if (this.processingUsers.has(userId)) {
      console.log(`[TrialService] ⚠️ 並行実行検出 - 処理をスキップ: ${userId}`);
      try {
        // Return current user status without processing
        const { PrismaClient } = await import('@prisma/client');
        const prisma = new PrismaClient();
        const user = await prisma.user.findUnique({ where: { id: userId } });
        await prisma.$disconnect();
        return { 
          wasExpired: false, 
          updated: false, 
          user 
        };
      } catch (error) {
        return { wasExpired: false, updated: false, error: 'Concurrent processing' };
      }
    }

    // Add user to processing set
    this.processingUsers.add(userId);

    try {
      const { PrismaClient } = await import('@prisma/client');
      const prisma = new PrismaClient();
      
      // Get user data
      const user = await prisma.user.findUnique({
        where: { id: userId }
      });
      
      if (!user) {
        await prisma.$disconnect();
        return { wasExpired: false, updated: false, error: 'User not found' };
      }
      
      // Check if user is on trial status
      if (user.subscriptionStatus !== PLAN_TYPES.TRIAL) {
        await prisma.$disconnect();
        return { wasExpired: false, updated: false, user };
      }
      
      // Check if trial is expired
      const isExpired = await PlanLimitService.isTrialExpired(user);
      
      if (!isExpired) {
        await prisma.$disconnect();
        return { wasExpired: false, updated: false, user };
      }
      
      // 🔧 FIX: Check if trial_end already processed (prevent duplicates)
      const existingTrialEndRecord = await prisma.userPlanHistory.findFirst({
        where: {
          userId,
          changeType: 'trial_end',
          changeReason: 'trial_expired',
          // 過去5分以内の重複チェック（並行実行対策）
          createdAt: {
            gte: new Date(Date.now() - 5 * 60 * 1000)
          }
        },
        orderBy: { createdAt: 'desc' }
      });

      if (existingTrialEndRecord) {
        console.log(`[TrialService] ⚠️ 既に期限切れ処理済み - 重複実行をスキップ: ${userId}`);
        await prisma.$disconnect();
        
        // 既に処理済みの場合、ユーザーステータスを確認して返す
        const currentUser = await prisma.user.findUnique({
          where: { id: userId }
        });
        await prisma.$disconnect();
        
        return { 
          wasExpired: true, 
          updated: false, // 今回は更新していない
          user: currentUser 
        };
      }
      
      // Trial is expired - update to free plan with transaction
      console.log(`[TrialService] 🔄 トライアル期限切れを検出 - フリープランに変更: ${userId}`);
      
      // 🔧 FIX: Update user status first
      const updatedUser = await prisma.user.update({
        where: { id: userId },
        data: {
          subscriptionStatus: PLAN_TYPES.FREE,
          updatedAt: new Date()
        }
      });
      
      await prisma.$disconnect();
      
      // Record plan history using the service (includes Firebase sync)
      await UserPlanHistoryService.recordPlanChange({
        userId,
        fromPlan: PLAN_TYPES.TRIAL,
        toPlan: PLAN_TYPES.FREE,
        changeType: 'trial_end',
        changeReason: 'trial_expired',
        effectiveDate: new Date()
      });

      console.log(`[TrialService] プラン履歴記録完了: trial → ${PLAN_TYPES.FREE} (trial_end)`);
      
      // Firebase同期（既存パターンを踏襲）
      await this.syncToFirebase(updatedUser);
      
      console.log(`[TrialService] ✅ トライアル期限切れユーザーをフリープランに変更完了: ${userId}`);
      
      return { 
        wasExpired: true, 
        updated: true, 
        user: updatedUser 
      };

    } catch (error) {
      console.error('[TrialService] Error checking/updating expired trial:', error);
      return { 
        wasExpired: false, 
        updated: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    } finally {
      // 🔧 FIX: Always remove user from processing set
      this.processingUsers.delete(userId);
    }
  }

  /**
   * プラン変更種別を判定
   */
  private static determineChangeType(
    fromPlan: string, 
    toPlan: string
  ): 'upgrade' | 'downgrade' | 'cancel' | 'trial_start' | 'trial_end' | 'restore' | 'initial' {
    
    // 初回設定の場合
    if (!fromPlan || fromPlan === toPlan) {
      return 'initial';
    }

    // プラン階層の定義
    const planRank = {
      [PLAN_TYPES.FREE]: 1,
      [PLAN_TYPES.TRIAL]: 2, 
      [PLAN_TYPES.PRO]: 3,
      [PLAN_TYPES.CANCELLED]: 0,
      [PLAN_TYPES.EXPIRED]: 0
    };

    const fromRank = planRank[fromPlan as keyof typeof planRank] || 1;
    const toRank = planRank[toPlan as keyof typeof planRank] || 1;

    // 特定の変更パターンを判定
    if (fromPlan === PLAN_TYPES.FREE && toPlan === PLAN_TYPES.TRIAL) {
      return 'trial_start';
    }
    
    if (fromPlan === PLAN_TYPES.TRIAL && toPlan === PLAN_TYPES.FREE) {
      return 'trial_end';
    }
    
    if ((fromPlan === PLAN_TYPES.PRO || fromPlan === PLAN_TYPES.TRIAL) && (toPlan === PLAN_TYPES.CANCELLED || toPlan === PLAN_TYPES.EXPIRED)) {
      return 'cancel';
    }
    
    if ((fromPlan === PLAN_TYPES.CANCELLED || fromPlan === PLAN_TYPES.EXPIRED) && (toPlan === PLAN_TYPES.PRO || toPlan === PLAN_TYPES.TRIAL)) {
      return 'restore';
    }

    // 一般的なアップグレード・ダウングレード
    if (toRank > fromRank) {
      return 'upgrade';
    } else if (toRank < fromRank) {
      return 'downgrade';
    }

    // その他の場合はinitialとして扱う
    return 'initial';
  }
}

export type { User, TrialStatus };