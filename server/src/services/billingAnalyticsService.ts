/**
 * 課金分析サービス
 * トライアル統計、課金レポート、リテンション分析機能を提供
 * Phase 2: 課金分析機能実装
 */

import { prisma } from '../lib/database';
import { PLAN_TYPES } from '../constants/planTypes';

interface BillingReport {
  totalUsers: number;
  freeUsers: number;
  trialUsers: number;
  proUsers: number;
  cancelledUsers: number;
  revenue: {
    estimated: number;
    currency: 'JPY';
  };
  userDistribution: {
    freePercentage: number;
    trialPercentage: number;
    proPercentage: number;
  };
  periodData: {
    startDate: string;
    endDate: string;
    newSignups: number;
    trialStarts: number;
    conversions: number;
    cancellations: number;
  };
}

export class BillingAnalyticsService {

  /**
   * 課金レポート取得
   */
  static async getBillingReport(options: {
    startDate?: Date;
    endDate?: Date;
  } = {}): Promise<BillingReport> {
    try {
      const { startDate, endDate } = options;
      const now = new Date();
      const reportStartDate = startDate || new Date(now.getFullYear(), now.getMonth(), 1);
      const reportEndDate = endDate || now;

      // ユーザー統計
      const [totalUsers, freeUsers, trialUsers, proUsers, cancelledUsers] = await Promise.all([
        prisma.user.count({ where: { isDeleted: false } }),
        prisma.user.count({ where: { subscriptionStatus: PLAN_TYPES.FREE, isDeleted: false } }),
        prisma.user.count({ where: { subscriptionStatus: PLAN_TYPES.TRIAL, isDeleted: false } }),
        prisma.user.count({ where: { subscriptionStatus: PLAN_TYPES.PRO, isDeleted: false } }),
        prisma.user.count({ where: { subscriptionStatus: PLAN_TYPES.CANCELLED, isDeleted: false } })
      ]);

      // 期間内の活動統計
      const [newSignups, trialStarts] = await Promise.all([
        prisma.user.count({
          where: {
            createdAt: { gte: reportStartDate, lte: reportEndDate },
            isDeleted: false
          }
        }),
        prisma.user.count({
          where: {
            trialStartDate: { gte: reportStartDate, lte: reportEndDate },
            isDeleted: false
          }
        })
      ]);
      
      // TrialHistory削除により、これらの値は0に設定
      const conversions = 0;
      const cancellations = 0;

      // 収益推定（仮想的な計算）
      const estimatedMonthlyRevenue = proUsers * 2980; // 仮想単価

      // パーセンテージ計算
      const freePercentage = totalUsers > 0 ? (freeUsers / totalUsers) * 100 : 0;
      const trialPercentage = totalUsers > 0 ? (trialUsers / totalUsers) * 100 : 0;
      const proPercentage = totalUsers > 0 ? (proUsers / totalUsers) * 100 : 0;

      return {
        totalUsers,
        freeUsers,
        trialUsers,
        proUsers,
        cancelledUsers,
        revenue: {
          estimated: estimatedMonthlyRevenue,
          currency: 'JPY'
        },
        userDistribution: {
          freePercentage: Math.round(freePercentage * 100) / 100,
          trialPercentage: Math.round(trialPercentage * 100) / 100,
          proPercentage: Math.round(proPercentage * 100) / 100
        },
        periodData: {
          startDate: reportStartDate.toISOString(),
          endDate: reportEndDate.toISOString(),
          newSignups,
          trialStarts,
          conversions,
          cancellations
        }
      };

    } catch (error) {
      console.error('[BillingAnalytics] 課金レポート取得エラー:', error);
      throw new Error('Failed to get billing report');
    }
  }




  /**
   * サービス健康状態チェック
   */
  static async healthCheck(): Promise<{ status: string; timestamp: string }> {
    try {
      // 基本的なデータベース接続テスト
      await prisma.user.count();
      
      return {
        status: 'healthy',
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('[BillingAnalytics] ヘルスチェック失敗:', error);
      throw new Error('Billing analytics service unhealthy');
    }
  }
}