/**
 * Frontend Trial Service - Phase 3 Compatible
 * Maintains backward compatibility with Phase 1/2 while adding Phase 3 features
 * Created: 2025-07-22
 */

import { TrialConfig } from '../config/trialConfig';
import { PLAN_TYPES } from '../constants/planTypes';

// Constants
const STRIPE_PAYMENT_URL = import.meta.env.VITE_STRIPE_PAYMENT_URL || 'https://buy.stripe.com/test_9B6eVdc3D4Cp52ccflaIM01';

interface User {
  id: string;
  email: string;
  name?: string;
  purpose?: string;
  createdAt?: string;
  // Phase 3 fields (optional for backward compatibility)
  trialStartDate?: string;
  trialEndDate?: string;
  subscriptionStatus?: 'trial' | 'pro' | 'expired' | 'cancelled';
  stripeCustomerId?: string;
}

interface TrialStatus {
  isTrialActive: boolean;
  daysRemaining: number;
  isExpired: boolean;
  shouldShowUpgrade: boolean;
  shouldShowTrialUI: boolean;
  subscriptionStatus: string;
  // Phase 2 compatibility
  showTrialUI: boolean;
  isTrialUser: boolean;
}

export class ClientTrialService {
  
  /**
   * Calculate remaining trial days (backward compatible)
   */
  static calculateRemainingDays(user: User | null): number {
    try {
      if (!user) {
        return 0;
      }

      // Phase 3: Use trialEndDate if available
      if (user.trialEndDate) {
        const now = new Date();
        const endDate = new Date(user.trialEndDate);
        const diffTime = endDate.getTime() - now.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return Math.max(0, diffDays);
      }

      // Phase 1/2 fallback: Use createdAt + configured days
      if (user.createdAt) {
        const now = new Date();
        const createdAt = new Date(user.createdAt);
        const trialDurationMs = TrialConfig.getTrialDurationMs();
        const trialEndDate = new Date(createdAt.getTime() + trialDurationMs);
        const diffTime = trialEndDate.getTime() - now.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return Math.max(0, diffDays);
      }

      // Ultimate fallback
      console.warn('[ClientTrialService] No valid date found for user');
      return TrialConfig.getTrialDurationDays(); // Assume full trial period

    } catch (error) {
      console.warn('[ClientTrialService] Error calculating remaining days:', error);
      return 0;
    }
  }

  /**
   * Enhanced trial status (Phase 3 + backward compatibility)
   */
  static getTrialStatus(user: User | null): TrialStatus {
    try {
      if (!user) {
        return this.getDefaultTrialStatus();
      }

      // Phase 3: Use subscription status if available
      if (user.subscriptionStatus) {
        const isTrialActive = user.subscriptionStatus === PLAN_TYPES.TRIAL;
        const daysRemaining = isTrialActive ? this.calculateRemainingDays(user) : 0;
        const isExpired = user.subscriptionStatus === PLAN_TYPES.EXPIRED;
        const shouldShowUpgrade = user.subscriptionStatus !== PLAN_TYPES.PRO;
        const shouldShowTrialUI = isTrialActive && !user.purpose;

        return {
          isTrialActive,
          daysRemaining,
          isExpired,
          shouldShowUpgrade,
          shouldShowTrialUI,
          subscriptionStatus: user.subscriptionStatus,
          // Phase 1/2 compatibility
          showTrialUI: shouldShowTrialUI,
          isTrialUser: isTrialActive
        };
      }

      // Phase 1/2 fallback: Simple purpose-based detection
      const shouldShowTrialUI = !user.purpose;
      const daysRemaining = shouldShowTrialUI ? this.calculateRemainingDays(user) : 0;
      const isTrialActive = shouldShowTrialUI && daysRemaining > 0;

      return {
        isTrialActive,
        daysRemaining,
        isExpired: daysRemaining <= 0,
        shouldShowUpgrade: true,
        shouldShowTrialUI,
        subscriptionStatus: 'trial',
        // Phase 1/2 compatibility
        showTrialUI: shouldShowTrialUI,
        isTrialUser: isTrialActive
      };

    } catch (error) {
      console.error('[ClientTrialService] Error getting trial status:', error);
      return this.getDefaultTrialStatus();
    }
  }

  /**
   * Safe default trial status for error conditions
   */
  private static getDefaultTrialStatus(): TrialStatus {
    return {
      isTrialActive: false,
      daysRemaining: 0,
      isExpired: true,
      shouldShowUpgrade: true,
      shouldShowTrialUI: false,
      subscriptionStatus: 'trial',
      showTrialUI: false,
      isTrialUser: false
    };
  }

  /**
   * Enhanced upgrade URL with trial tracking
   */
  static getUpgradeUrl(user: User | null): string {
    const baseUrl = STRIPE_PAYMENT_URL;
    
    try {
      if (!user) return baseUrl;

      // Add user context for better tracking
      const params = new URLSearchParams();
      if (user.email) {
        params.append('prefilled_email', user.email);
      }
      
      const trialStatus = this.getTrialStatus(user);
      params.append('trial_days_remaining', trialStatus.daysRemaining.toString());
      
      return params.toString() ? `${baseUrl}?${params.toString()}` : baseUrl;

    } catch (error) {
      console.warn('[ClientTrialService] Error building upgrade URL:', error);
      return baseUrl;
    }
  }

  /**
   * Format remaining days for display
   */
  static formatRemainingDays(daysRemaining: number, language: 'ja' | 'en' = 'ja'): string {
    try {
      if (daysRemaining <= 0) {
        return language === 'ja' ? 'トライアル終了' : 'Trial Expired';
      }

      if (daysRemaining === 1) {
        return language === 'ja' ? '残り1日' : '1 day left';
      }

      return language === 'ja' ? `残り${daysRemaining}日` : `${daysRemaining} days left`;

    } catch (error) {
      console.warn('[ClientTrialService] Error formatting days:', error);
      return language === 'ja' ? '残り不明' : 'Unknown';
    }
  }

  /**
   * Check if user should see time-saved visualization
   */
  static shouldShowTimeSaved(user: User | null, analysisCount: number): boolean {
    try {
      if (!user) return false;
      
      const trialStatus = this.getTrialStatus(user);
      
      // Show time saved if:
      // 1. User is in trial (active or expired)
      // 2. Has performed at least 1 analysis
      return (trialStatus.isTrialActive || trialStatus.isExpired) && analysisCount > 0;

    } catch (error) {
      console.warn('[ClientTrialService] Error checking time saved visibility:', error);
      return false;
    }
  }
}

export type { User, TrialStatus };