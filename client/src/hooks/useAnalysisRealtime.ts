import { useState, useEffect, useCallback, useRef } from 'react';
import { ref, onValue, off } from 'firebase/database';
import { database } from '../lib/firebase';

export interface AnalysisProgress {
  percentage: number;
  currentPhase: string;
  processedBatches?: number;
  totalBatches?: number;
  estimatedTimeRemaining?: number;
}

export interface AnalysisSession {
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress?: AnalysisProgress;
  startedAt?: number;
  completedAt?: number;
  error?: string;
  jobId?: string;
}

export interface IntermediateResults {
  topics?: Record<string, {
    id: string;
    name: string;
    summary: string;
    count: number;
    isTemporary: boolean;
    createdAt: number;
  }>;
  insights?: Record<string, {
    id: string;
    title: string;
    description: string;
    isTemporary: boolean;
    createdAt: number;
  }>;
}

/**
 * AI分析のリアルタイム状況を監視するカスタムフック
 * 既存の分析機能に影響を与えることなく、追加のリアルタイム情報を提供
 */
export function useAnalysisRealtime(projectId?: string, onAnalysisComplete?: () => void) {
  const [analysisSession, setAnalysisSession] = useState<AnalysisSession | null>(null);
  const [intermediateResults, setIntermediateResults] = useState<IntermediateResults | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // 分析完了状態の追跡（重複コールバック防止）
  const previousCompletionRef = useRef<boolean>(false);

  // プロジェクトIDが変更された時に完了状態をリセット
  useEffect(() => {
    previousCompletionRef.current = false;
  }, [projectId]);

  // 分析セッションの監視
  useEffect(() => {
    if (!projectId || !database) {
      setAnalysisSession(null);
      setIsConnected(false);
      return;
    }


    const sessionRef = ref(database, `analysis-sessions/${projectId}`);
    
    const unsubscribe = onValue(
      sessionRef,
      (snapshot) => {
        try {
          const sessionData = snapshot.val();
          
          setAnalysisSession(sessionData);
          setIsConnected(true);
          setError(null);
        } catch (err) {
          console.error('[useAnalysisRealtime] 分析セッション処理エラー:', err);
          // Firebase権限エラーが原因の場合でも分析は継続するため、エラーを表示しない
          // setError('分析状況の取得中にエラーが発生しました');
        }
      },
      (err) => {
        console.error('[useAnalysisRealtime] Firebase接続エラー:', err);
        // Firebase接続エラーでも分析は継続するため、エラーを表示しない
        // setError('Firebase接続エラーが発生しました');
        setIsConnected(false);
      }
    );

    return () => {
      off(sessionRef, 'value', unsubscribe);
    };
  }, [projectId]);

  // 中間結果の監視（強化版）
  useEffect(() => {
    if (!projectId || !database) {
      setIntermediateResults(null);
      return;
    }


    const intermediateRef = ref(database, `analysis-sessions/${projectId}/intermediate-results`);
    
    const unsubscribe = onValue(
      intermediateRef,
      (snapshot) => {
        try {
          const resultsData = snapshot.val();
          
          setIntermediateResults(resultsData);
          setError(null); // 中間結果取得成功時はエラーをクリア
        } catch (err) {
          console.error('[useAnalysisRealtime] 中間結果処理エラー:', err);
          // Firebase権限エラーが原因の場合でも分析は継続するため、エラーを表示しない
          // setError('中間結果の処理中にエラーが発生しました');
        }
      },
      (err) => {
        console.error('[useAnalysisRealtime] 中間結果Firebase接続エラー:', err);
        // 中間結果の取得に失敗しても致命的エラーではない
        // Firebase権限エラーでも分析は継続するため、エラーを表示しない
      }
    );

    return () => {
      off(intermediateRef, 'value', unsubscribe);
    };
  }, [projectId]);

  // 分析完了時のコールバック実行（強化版）
  useEffect(() => {
    if (!onAnalysisComplete || !analysisSession) {
      return;
    }

    const isCurrentlyCompleted = analysisSession?.status === 'completed' && analysisSession?.completedAt;
    const wasNotCompletedBefore = !previousCompletionRef.current;

    // 分析が新たに完了した場合のみコールバックを実行
    if (isCurrentlyCompleted && wasNotCompletedBefore) {
      previousCompletionRef.current = true;
      console.log('[useAnalysisRealtime] 🎉 分析完了検知 - コールバック実行');
      onAnalysisComplete();
    }

    // プロジェクトが変更された場合はリセット
    if (!isCurrentlyCompleted) {
      previousCompletionRef.current = false;
    }
  }, [analysisSession, onAnalysisComplete, projectId]);

  // 分析開始の検知
  const detectAnalysisStart = useCallback(() => {
    return analysisSession?.status === 'processing' && analysisSession?.startedAt;
  }, [analysisSession]);

  // 分析完了の検知
  const detectAnalysisCompletion = useCallback(() => {
    return analysisSession?.status === 'completed' && analysisSession?.completedAt;
  }, [analysisSession]);

  // 進捗率の取得
  const getProgressPercentage = useCallback(() => {
    return analysisSession?.progress?.percentage || 0;
  }, [analysisSession]);

  // 現在のフェーズの取得
  const getCurrentPhase = useCallback(() => {
    return analysisSession?.progress?.currentPhase || '待機中';
  }, [analysisSession]);

  // 中間トピック数の取得
  const getIntermediateTopicsCount = useCallback(() => {
    return intermediateResults?.topics ? Object.keys(intermediateResults.topics).length : 0;
  }, [intermediateResults]);

  // 中間洞察数の取得
  const getIntermediateInsightsCount = useCallback(() => {
    return intermediateResults?.insights ? Object.keys(intermediateResults.insights).length : 0;
  }, [intermediateResults]);

  // 分析完了率の計算（より詳細な進捗表示用）
  const getDetailedProgress = useCallback(() => {
    const percentage = getProgressPercentage();
    const phase = getCurrentPhase();
    const topicsCount = getIntermediateTopicsCount();
    const insightsCount = getIntermediateInsightsCount();
    
    return {
      percentage,
      phase,
      topicsCount,
      insightsCount,
      hasIntermediateResults: topicsCount > 0 || insightsCount > 0
    };
  }, [getProgressPercentage, getCurrentPhase, getIntermediateTopicsCount, getIntermediateInsightsCount]);

  return {
    // 分析セッション情報
    analysisSession,
    intermediateResults,
    
    // 接続状態
    isConnected,
    error,
    
    // 便利なフラグ
    isAnalyzing: analysisSession?.status === 'processing',
    isCompleted: analysisSession?.status === 'completed',
    isFailed: analysisSession?.status === 'failed',
    
    // ヘルパー関数
    detectAnalysisStart,
    detectAnalysisCompletion,
    getProgressPercentage,
    getCurrentPhase,
    getIntermediateTopicsCount,
    getIntermediateInsightsCount,
    getDetailedProgress,
  };
}