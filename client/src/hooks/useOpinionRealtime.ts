import { useState, useEffect } from 'react';
import { ref, onValue, off } from 'firebase/database';
import { database } from '../lib/firebase';

// Time constants
const MILLISECONDS_PER_MINUTE = 60 * 1000;
const MILLISECONDS_PER_HOUR = 60 * 60 * 1000;
const MILLISECONDS_PER_DAY = 24 * 60 * 60 * 1000;
const RECENT_ACTIVITY_THRESHOLD_MINUTES = 5;

export interface OpinionCollectionStats {
  totalCount: number;
  todayCount: number;
  recentCount: number;
  lastOpinionAt: number;
  status: 'active' | 'paused' | 'completed';
  dailyStats: Record<string, {
    count: number;
    firstOpinionAt: number;
    lastOpinionAt: number;
  }>;
  hourlyStats: Record<string, number>;
}

/**
 * 意見収集状況をリアルタイムで監視するカスタムフック（Phase 3）
 * プロジェクトの意見収集統計をFirebaseから取得し、リアルタイムで更新
 */
export function useOpinionRealtime(projectId?: string) {
  const [collectionStats, setCollectionStats] = useState<OpinionCollectionStats | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!projectId || !database) {
      setCollectionStats(null);
      setIsConnected(false);
      return;
    }

    console.log('[useOpinionRealtime] 意見収集統計監視開始:', { projectId });

    const statsRef = ref(database, `projects/${projectId}/collection-stats`);
    
    const unsubscribe = onValue(
      statsRef,
      (snapshot) => {
        try {
          const statsData = snapshot.val();
          console.log('[useOpinionRealtime] 統計データ更新:', { 
            projectId, 
            hasData: !!statsData,
            totalCount: statsData?.totalCount 
          });
          
          setCollectionStats(statsData);
          setIsConnected(true);
          setError(null);
        } catch (err) {
          console.error('[useOpinionRealtime] 統計データ処理エラー:', err);
          // Firebase権限エラーが原因の場合でも意見データは継続表示するため、エラーを表示しない
          // setError('統計データの取得中にエラーが発生しました');
        }
      },
      (err) => {
        console.error('[useOpinionRealtime] Firebase接続エラー:', err);
        // Firebase接続エラーでも意見データは継続表示するため、エラーを表示しない
        // setError('Firebase接続エラーが発生しました');
        setIsConnected(false);
      }
    );

    return () => {
      console.log('[useOpinionRealtime] 意見収集統計監視終了:', { projectId });
      off(statsRef, 'value', unsubscribe);
    };
  }, [projectId]);

  // 新着意見の検知
  const hasNewOpinions = (lastCheck: number): boolean => {
    return collectionStats?.lastOpinionAt ? collectionStats.lastOpinionAt > lastCheck : false;
  };

  // 収集活動状況の判定
  const isActivelyCollecting = (): boolean => {
    if (!collectionStats?.lastOpinionAt) return false;
    const timeSinceLastOpinion = Date.now() - collectionStats.lastOpinionAt;
    return timeSinceLastOpinion < RECENT_ACTIVITY_THRESHOLD_MINUTES * MILLISECONDS_PER_MINUTE;
  };

  // 今日の収集進捗率（仮想的な目標に対する進捗）
  const getTodayProgress = (targetCount: number = 50): number => {
    if (!collectionStats?.todayCount) return 0;
    const PERCENTAGE_MAX = 100;
    return Math.min((collectionStats.todayCount / targetCount) * PERCENTAGE_MAX, PERCENTAGE_MAX);
  };

  // 最新意見のフォーマット時間
  const getFormattedLastOpinionTime = (): string => {
    if (!collectionStats?.lastOpinionAt) return '未投稿';
    
    const diff = Date.now() - collectionStats.lastOpinionAt;
    const minutes = Math.floor(diff / MILLISECONDS_PER_MINUTE);
    const hours = Math.floor(diff / MILLISECONDS_PER_HOUR);
    const days = Math.floor(diff / MILLISECONDS_PER_DAY);
    
    if (minutes < 1) return '今';
    if (minutes < 60) return `${minutes}分前`;
    if (hours < 24) return `${hours}時間前`;
    if (days < 7) return `${days}日前`;
    return new Date(collectionStats.lastOpinionAt).toLocaleDateString('ja-JP');
  };

  return {
    // 基本データ
    collectionStats,
    isConnected,
    error,
    
    // 便利なゲッター
    totalCount: collectionStats?.totalCount || 0,
    todayCount: collectionStats?.todayCount || 0,
    recentCount: collectionStats?.recentCount || 0,
    lastOpinionAt: collectionStats?.lastOpinionAt,
    collectionStatus: collectionStats?.status || 'paused',
    
    // ヘルパー関数
    hasNewOpinions,
    isActivelyCollecting,
    getTodayProgress,
    getFormattedLastOpinionTime,
    
    // 時間系列データ
    dailyStats: collectionStats?.dailyStats || {},
    hourlyStats: collectionStats?.hourlyStats || {},
  };
}