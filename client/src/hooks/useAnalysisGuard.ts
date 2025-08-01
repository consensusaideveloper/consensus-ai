import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from './useAuth';

/**
 * AI分析の堅牢性を確保するためのカスタムフック
 * - 進行中の分析がある場合の重複実行防止
 * - ページリロード時の分析状態復元
 * - 放置された分析セッションの検出と回復
 */
export function useAnalysisGuard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const location = useLocation();


  // アプリケーション開始時の分析状態チェック
  useEffect(() => {
    const checkAbandonedSessions = async () => {
      // ユーザーがログインしていない場合は何もしない
      if (!user?.id) {
        return;
      }
      
      // ProcessingScreen表示中はダイアログを表示しない
      // 🚧 REFACTORING: ProcessingScreen削除により不要になった判定をコメントアウト
      // if (location.pathname.includes('/processing')) {
      //   return;
      // }
      
      const activeSession = localStorage.getItem('activeAnalysisSession');
      
      
      if (activeSession) {
        
        try {
          // セッションIDから分析開始時刻を抽出
          const sessionParts = activeSession.split('-');
          const startTime = parseInt(sessionParts[sessionParts.length - 1]);
          const projectId = sessionParts[1];
          
          
          // セッション形式の検証
          if (sessionParts.length !== 3 || !projectId || isNaN(startTime)) {
            localStorage.removeItem('activeAnalysisSession');
            return;
          }
          
          const timeSinceStart = Date.now() - startTime;
          const MAX_ANALYSIS_TIME = 10 * 60 * 1000; // 10分
          const MIN_SESSION_AGE = 30 * 1000; // 30秒（新規セッションの猶予時間）
          
          // 新規セッションの猶予時間チェック
          if (timeSinceStart < MIN_SESSION_AGE) {
            return;
          }
          
          // 時間制限チェック
          if (timeSinceStart > MAX_ANALYSIS_TIME) {
            localStorage.removeItem('activeAnalysisSession');
            return;
          }
          
          // プロジェクト状態の検証
          try {
            const response = await fetch(`/api/db/projects/${projectId}`, {
              headers: {
                'X-User-ID': user.id
              }
            });
            
            if (response.ok) {
              const project = await response.json();
              
              // プロジェクトが分析完了状態または分析が必要ない状態の場合、セッションをクリア
              const isAnalysisComplete = project.status === 'ready-for-analysis' || 
                                        project.status === 'completed' || 
                                        project.isAnalyzed === true ||
                                        (project.analysis?.topInsights?.length > 0);
              
              if (isAnalysisComplete) {
                localStorage.removeItem('activeAnalysisSession');
                return;
              }
              
              // 分析中状態の場合はセッションをクリア（ダイアログは表示しない）
              if (project.status === 'processing') {
                localStorage.removeItem('activeAnalysisSession');
                return;
              }
            }
            
            // プロジェクトが見つからない、またはアクセスできない場合
            localStorage.removeItem('activeAnalysisSession');
            
          } catch {
            localStorage.removeItem('activeAnalysisSession');
          }
          
        } catch {
          localStorage.removeItem('activeAnalysisSession');
        }
      }
    };

    // 初回チェック（少し遅延させてUI描画を優先）
    const timer = setTimeout(checkAbandonedSessions, 1000);
    
    return () => clearTimeout(timer);
  }, [navigate, user?.id, location.pathname]);


  // ユーティリティ関数群
  const utils = {
    /**
     * 現在進行中の分析セッションがあるかチェック
     */
    hasActiveSession(): boolean {
      return !!localStorage.getItem('activeAnalysisSession');
    },

    /**
     * アクティブなセッションの情報を取得
     */
    getActiveSessionInfo(): { projectId: string; startTime: number } | null {
      const activeSession = localStorage.getItem('activeAnalysisSession');
      if (!activeSession) return null;

      try {
        const parts = activeSession.split('-');
        return {
          projectId: parts[1],
          startTime: parseInt(parts[parts.length - 1])
        };
      } catch {
        return null;
      }
    },

    /**
     * 分析セッションを強制終了
     */
    forceEndSession(): void {
      localStorage.removeItem('activeAnalysisSession');
    },

    /**
     * 全ての不正なセッションをクリア（開発・デバッグ用）
     */
    clearAllSessions(): void {
      localStorage.removeItem('activeAnalysisSession');
    },

    /**
     * セッションのヘルスチェック
     */
    isSessionHealthy(): boolean {
      const sessionInfo = this.getActiveSessionInfo();
      if (!sessionInfo) return true; // セッションがない場合は健全

      const timeSinceStart = Date.now() - sessionInfo.startTime;
      const MAX_HEALTHY_TIME = 5 * 60 * 1000; // 5分以内なら健全

      return timeSinceStart <= MAX_HEALTHY_TIME;
    },

  };

  return utils;
}

/**
 * 分析状態を管理するためのコンテキスト用の型定義
 */
export interface AnalysisState {
  isAnalyzing: boolean;
  sessionId: string | null;
  startTime: number | null;
  projectId: string | null;
}

/**
 * 分析の進行状況を監視するためのヘルパー
 */
export class AnalysisProgressMonitor {
  private static instance: AnalysisProgressMonitor;
  private progressCallbacks: Set<(progress: number) => void> = new Set();
  private statusCallbacks: Set<(status: string) => void> = new Set();

  static getInstance(): AnalysisProgressMonitor {
    if (!AnalysisProgressMonitor.instance) {
      AnalysisProgressMonitor.instance = new AnalysisProgressMonitor();
    }
    return AnalysisProgressMonitor.instance;
  }

  /**
   * 進捗コールバックを登録
   */
  onProgress(callback: (progress: number) => void): () => void {
    this.progressCallbacks.add(callback);
    return () => this.progressCallbacks.delete(callback);
  }

  /**
   * ステータスコールバックを登録
   */
  onStatusChange(callback: (status: string) => void): () => void {
    this.statusCallbacks.add(callback);
    return () => this.statusCallbacks.delete(callback);
  }

  /**
   * 進捗を更新
   */
  updateProgress(progress: number): void {
    this.progressCallbacks.forEach(callback => {
      try {
        callback(progress);
      } catch {
        // 進捗コールバックエラー
      }
    });
  }

  /**
   * ステータスを更新
   */
  updateStatus(status: string): void {
    this.statusCallbacks.forEach(callback => {
      try {
        callback(status);
      } catch {
        // ステータスコールバックエラー
      }
    });
  }

  /**
   * すべてのコールバックをクリア
   */
  cleanup(): void {
    this.progressCallbacks.clear();
    this.statusCallbacks.clear();
  }
}

/**
 * 開発・デバッグ用のグローバルヘルパー関数
 */
if (typeof window !== 'undefined') {
  (window as any).clearAnalysisSession = () => {
    localStorage.removeItem('activeAnalysisSession');
    window.location.reload();
  };
  
  (window as any).debugAnalysisGuard = () => {
    const activeSession = localStorage.getItem('activeAnalysisSession');
    return {
      activeAnalysisSession: activeSession,
      allLocalStorageKeys: Object.keys(localStorage),
      allValues: Object.fromEntries(Object.entries(localStorage))
    };
  };
}