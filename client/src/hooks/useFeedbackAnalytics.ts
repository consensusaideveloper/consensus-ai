import { useState, useCallback } from 'react';
import { useAuth } from './useAuth';

export interface FeedbackStats {
  reasonStats: Array<{
    reason: string;
    count: number;
  }>;
  totalFeedbacks: number;
  contextStats: {
    accountAge: Record<string, number>;
    projectRange: Record<string, number>;
    purpose: Record<string, number>;
  };
  trends: Array<{
    id: string;
    deletionReason?: string;
    customReason?: string;
    userContext: {
      accountAge: string;
      projectRange: string;
      purpose?: string;
      language?: string;
      lastActivity: string;
    };
    createdAt: string;
  }>;
}

export interface FeedbackTrends {
  period: {
    startDate: string;
    endDate: string;
    days: number;
  };
  totalFeedbacks: number;
  dailyStats: Record<string, number>;
  reasonTrends: Record<string, { count: number; percentage: number }>;
  contextTrends: {
    accountAge: Record<string, number>;
    projectRange: Record<string, number>;
    purpose: Record<string, number>;
  };
  insights: string[];
}

export interface RecentFeedback {
  id: string;
  feedbackType: string;
  deletionReason?: string;
  customReason?: string;
  userContext: {
    accountAge: string;
    projectRange: string;
    purpose?: string;
    language?: string;
    lastActivity: string;
  } | null;
  createdAt: string;
}

export interface RecentFeedbacksResponse {
  feedbacks: RecentFeedback[];
  totalCount: number;
  hasMore: boolean;
}

export function useFeedbackAnalytics() {
  const { user } = useAuth();
  const [feedbackStats, setFeedbackStats] = useState<FeedbackStats | null>(null);
  const [feedbackTrends, setFeedbackTrends] = useState<FeedbackTrends | null>(null);
  const [recentFeedbacks, setRecentFeedbacks] = useState<RecentFeedbacksResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // マスター管理者または開発者の確認
  const MASTER_EMAIL = 'yuto.masamura@gmail.com';
  const canAccessFeedback = user?.email === MASTER_EMAIL; // 簡単化のためマスターのみに限定

  /**
   * フィードバック統計の取得
   */
  const fetchFeedbackStats = useCallback(async (): Promise<boolean> => {
    if (!canAccessFeedback || !user?.id) {
      setError('アクセス権限がありません');
      return false;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/admin/feedback-stats', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': user.id
        }
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      setFeedbackStats(data.data);
      return true;

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '統計データの取得に失敗しました';
      console.error('[useFeedbackAnalytics] 統計取得エラー:', err);
      setError(errorMessage);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [canAccessFeedback, user?.id]);

  /**
   * フィードバックトレンドの取得
   */
  const fetchFeedbackTrends = useCallback(async (days: number = 30): Promise<boolean> => {
    if (!canAccessFeedback || !user?.id) {
      setError('アクセス権限がありません');
      return false;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/admin/feedback-trends?days=${days}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': user.id
        }
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      setFeedbackTrends(data.data);
      return true;

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'トレンドデータの取得に失敗しました';
      console.error('[useFeedbackAnalytics] トレンド取得エラー:', err);
      setError(errorMessage);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [canAccessFeedback, user?.id]);

  /**
   * 最新フィードバックの取得
   */
  const fetchRecentFeedbacks = useCallback(async (limit: number = 20, offset: number = 0): Promise<boolean> => {
    if (!canAccessFeedback || !user?.id) {
      setError('アクセス権限がありません');
      return false;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/admin/feedback-recent?limit=${limit}&offset=${offset}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': user.id
        }
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      setRecentFeedbacks(data.data);
      return true;

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '最新フィードバックの取得に失敗しました';
      console.error('[useFeedbackAnalytics] 最新フィードバック取得エラー:', err);
      setError(errorMessage);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [canAccessFeedback, user?.id]);

  /**
   * エラーのクリア
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    // データ
    feedbackStats,
    feedbackTrends,
    recentFeedbacks,
    
    // 状態
    isLoading,
    error,
    canAccessFeedback,
    
    // メソッド
    fetchFeedbackStats,
    fetchFeedbackTrends,
    fetchRecentFeedbacks,
    clearError
  };
}