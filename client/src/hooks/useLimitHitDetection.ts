/**
 * 制限到達イベントを検知するためのReact Hook
 * ベストプラクティス: API エラーから制限到達を自動検知し、アップグレードバナー表示をトリガー
 */

import { useEffect, useCallback } from 'react';
import { UpgradeBannerDismissalManager } from '../utils/upgradeDisplayLogic';

interface LimitHitEvent {
  type: 'project_limit' | 'analysis_limit' | 'opinion_limit';
  timestamp: string;
  context: string;
  currentUsage?: number;
  limit?: number;
  message?: string;
}

interface LimitHitDetectionHooks {
  detectAndReportLimitHit: (error: any, context: string) => LimitHitEvent | null;
  registerLimitHitListener: (callback: (event: LimitHitEvent) => void) => () => void;
}

// グローバルなリスナー管理
const limitHitListeners = new Set<(event: LimitHitEvent) => void>();

/**
 * 制限到達検知Hook
 */
export function useLimitHitDetection(): LimitHitDetectionHooks {
  
  /**
   * APIエラーから制限到達を自動検知
   */
  const detectAndReportLimitHit = useCallback((error: any, context: string): LimitHitEvent | null => {
    if (!error || !error.response) return null;
    
    const { status, data } = error.response;
    
    // 403エラーかつ制限関連のエラーコードを検知
    if (status === 403) {
      let limitType: LimitHitEvent['type'] | null = null;
      let message = '';
      
      // エラーコード判定
      if (data?.code === 'PROJECT_LIMIT_EXCEEDED') {
        limitType = 'project_limit';
        message = 'プロジェクト作成数の上限に達しました';
      } else if (data?.code === 'ANALYSIS_LIMIT_EXCEEDED') {
        limitType = 'analysis_limit';
        message = 'AI分析回数の上限に達しました';
      } else if (data?.code === 'OPINION_LIMIT_EXCEEDED') {
        limitType = 'opinion_limit';
        message = '意見収集数の上限に達しました';
      } else if (data?.message?.includes('limit') || data?.message?.includes('制限')) {
        // メッセージベースでの検知（フォールバック）
        if (context.includes('project') || context.includes('プロジェクト')) {
          limitType = 'project_limit';
          message = 'プロジェクト制限に達しました';
        } else if (context.includes('analysis') || context.includes('分析')) {
          limitType = 'analysis_limit';
          message = 'AI分析制限に達しました';
        } else if (context.includes('opinion') || context.includes('意見')) {
          limitType = 'opinion_limit';
          message = '意見収集制限に達しました';
        }
      }
      
      if (limitType) {
        const limitHitEvent: LimitHitEvent = {
          type: limitType,
          timestamp: new Date().toISOString(),
          context: message,
          currentUsage: data?.details?.currentUsage,
          limit: data?.details?.limit,
          message: data?.message || message
        };
        
        console.log('[LimitHitDetection] 🚨 制限到達を検知:', limitHitEvent);
        
        // 制限到達時は解除状態をリセット（即座に表示）
        UpgradeBannerDismissalManager.resetDismissalForLimitHit();
        
        // すべてのリスナーに通知
        limitHitListeners.forEach(listener => {
          try {
            listener(limitHitEvent);
          } catch (listenerError) {
            console.warn('[LimitHitDetection] リスナーエラー:', listenerError);
          }
        });
        
        return limitHitEvent;
      }
    }
    
    return null;
  }, []);
  
  /**
   * 制限到達イベントリスナーを登録
   */
  const registerLimitHitListener = useCallback((callback: (event: LimitHitEvent) => void) => {
    limitHitListeners.add(callback);
    
    // クリーンアップ関数を返す
    return () => {
      limitHitListeners.delete(callback);
    };
  }, []);
  
  return {
    detectAndReportLimitHit,
    registerLimitHitListener
  };
}

/**
 * APIクライアント用のインターセプター関数
 * axios等のHTTPクライアントのエラーハンドリングで使用
 */
export function createLimitHitInterceptor() {
  const { detectAndReportLimitHit } = useLimitHitDetection();
  
  return (error: any, context = 'api_request') => {
    const limitHit = detectAndReportLimitHit(error, context);
    
    if (limitHit) {
      // 制限到達時の追加処理があればここに実装
      console.log('[LimitHitInterceptor] 制限到達イベントを処理:', limitHit);
    }
    
    // エラーを再スローして通常のエラーハンドリングも実行
    throw error;
  };
}

/**
 * 制限到達状況を管理するContext用のhook
 */
export function useLimitHitManager() {
  const { registerLimitHitListener } = useLimitHitDetection();
  
  useEffect(() => {
    const unregister = registerLimitHitListener((event) => {
      console.log('[LimitHitManager] 制限到達イベントを受信:', event);
      
      // ここで状態更新やアナリティクス送信などを実行可能
      // 例: analytics.track('limit_hit', { type: event.type, context: event.context });
    });
    
    return unregister;
  }, [registerLimitHitListener]);
}

/**
 * 特定のアクションで制限到達を検知するWrapper関数
 */
export function withLimitHitDetection<T extends (...args: any[]) => Promise<any>>(
  asyncFunction: T,
  context: string
): T {
  const { detectAndReportLimitHit } = useLimitHitDetection();
  
  return (async (...args: any[]) => {
    try {
      return await asyncFunction(...args);
    } catch (error) {
      detectAndReportLimitHit(error, context);
      throw error; // 原則として元のエラーを再スロー
    }
  }) as T;
}