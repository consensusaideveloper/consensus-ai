/**
 * プランタイプ関連の共通定数
 * プロジェクト全体で統一したプラン管理のために使用
 */

export const PLAN_TYPES = {
  FREE: 'free' as const,
  TRIAL: 'trial' as const,
  PRO: 'pro' as const,
  EXPIRED: 'expired' as const,
  CANCELLED: 'cancelled' as const
} as const;

export type PlanType = typeof PLAN_TYPES[keyof typeof PLAN_TYPES];
export type SubscriptionPlanType = typeof PLAN_TYPES.FREE | typeof PLAN_TYPES.TRIAL | typeof PLAN_TYPES.PRO;

// プラン配列（API呼び出しやバリデーションで使用）
export const VALID_PLAN_TYPES = [PLAN_TYPES.FREE, PLAN_TYPES.TRIAL, PLAN_TYPES.PRO] as const;

// プラン表示名のマッピング（デフォルト値）
export const PLAN_DISPLAY_NAMES = {
  [PLAN_TYPES.FREE]: 'フリープラン',
  [PLAN_TYPES.TRIAL]: 'トライアルプラン',
  [PLAN_TYPES.PRO]: 'Proプラン',
  [PLAN_TYPES.EXPIRED]: '期限切れ',
  [PLAN_TYPES.CANCELLED]: 'キャンセル済み'
} as const;