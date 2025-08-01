/**
 * API制限エラーを自動検知してアップグレードバナー表示をトリガーするインターセプター
 * 既存のHTTPクライアント（fetch, axios等）に統合可能
 */


// グローバルなインスタンス管理
let globalLimitDetector: { detectAndReportLimitHit: (error: any, context: string) => any } | null = null;

/**
 * グローバルな制限検知器を設定
 */
export function initializeLimitDetection() {
  // Hook を直接使えないため、グローバル検知器を初期化
  if (typeof window !== 'undefined' && !globalLimitDetector) {
    // 検知ロジックを手動実装
    globalLimitDetector = {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      detectAndReportLimitHit: (error: any, _context: string) => {
        if (!error?.response) return null;
        
        const { status, data } = error.response;
        
        if (status === 403) {
          let limitType: 'project_limit' | 'analysis_limit' | 'opinion_limit' | null = null;
          let message = '';
          
          if (data?.code === 'PROJECT_LIMIT_EXCEEDED') {
            limitType = 'project_limit';
            message = 'プロジェクト作成数の上限に達しました';
          } else if (data?.code === 'ANALYSIS_LIMIT_EXCEEDED') {
            limitType = 'analysis_limit';
            message = 'AI分析回数の上限に達しました';
          } else if (data?.code === 'OPINION_LIMIT_EXCEEDED') {
            limitType = 'opinion_limit';
            message = '意見収集数の上限に達しました';
          }
          
          if (limitType) {
            // カスタムイベントとして発火
            const limitHitEvent = {
              type: limitType,
              timestamp: new Date().toISOString(),
              context: message,
              currentUsage: data?.details?.currentUsage,
              limit: data?.details?.limit,
              message: data?.message || message
            };
            
            console.log('[LimitInterceptor] 🚨 制限到達を検知:', limitHitEvent);
            
            // カスタムイベントで通知
            const customEvent = new CustomEvent('limitHit', { 
              detail: limitHitEvent 
            });
            window.dispatchEvent(customEvent);
            
            return limitHitEvent;
          }
        }
        
        return null;
      }
    };
  }
}

/**
 * Fetch APIラッパー - 制限検知付き
 */
export function fetchWithLimitDetection(
  input: RequestInfo | URL, 
  init?: RequestInit
): Promise<Response> {
  initializeLimitDetection();
  
  const context = typeof input === 'string' ? input : input.toString();
  
  return fetch(input, init)
    .then(response => {
      // レスポンスが403エラーの場合は制限チェック
      if (response.status === 403) {
        response.clone().json().then(data => {
          globalLimitDetector?.detectAndReportLimitHit(
            { response: { status: response.status, data } },
            context
          );
        }).catch(() => {
          // JSON解析エラーは無視
        });
      }
      
      return response;
    })
    .catch(error => {
      // ネットワークエラー等では制限検知しない
      throw error;
    });
}

/**
 * プロジェクト作成API呼び出し - 制限検知付き
 */
export async function createProjectWithLimitDetection(
  projectData: any
): Promise<Response> {
  try {
    const response = await fetchWithLimitDetection('/api/db/projects', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': getUserId() // ユーザーIDを取得する関数
      },
      body: JSON.stringify(projectData)
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`HTTP ${response.status}: ${errorData.message || 'Unknown error'}`);
    }
    
    return response;
  } catch (error) {
    console.error('[CreateProject] エラー:', error);
    throw error;
  }
}

/**
 * AI分析API呼び出し - 制限検知付き
 */
export async function runAnalysisWithLimitDetection(
  projectId: string
): Promise<Response> {
  try {
    const response = await fetchWithLimitDetection(`/api/analysis/projects/${projectId}/topics`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': getUserId()
      }
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`HTTP ${response.status}: ${errorData.message || 'Unknown error'}`);
    }
    
    return response;
  } catch (error) {
    console.error('[RunAnalysis] エラー:', error);
    throw error;
  }
}

/**
 * 意見投稿API呼び出し - 制限検知付き
 */
export async function submitOpinionWithLimitDetection(
  projectId: string,
  opinionData: any
): Promise<Response> {
  try {
    const response = await fetchWithLimitDetection(`/api/db/projects/${projectId}/opinions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': getUserId()
      },
      body: JSON.stringify(opinionData)
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`HTTP ${response.status}: ${errorData.message || 'Unknown error'}`);
    }
    
    return response;
  } catch (error) {
    console.error('[SubmitOpinion] エラー:', error);
    throw error;
  }
}

/**
 * ユーザーIDを取得するヘルパー関数
 */
function getUserId(): string {
  // AuthContextからユーザーIDを取得する実装
  // 実際の実装では、useAuth hookやローカルストレージから取得
  if (typeof window !== 'undefined') {
    const userStr = localStorage.getItem('currentUser');
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        return user.id || '';
      } catch {
        return '';
      }
    }
  }
  return '';
}

/**
 * React Component用の制限イベントリスナー
 */
export function useLimitHitEventListener(
  callback: (event: CustomEvent) => void
) {
  if (typeof window !== 'undefined') {
    window.addEventListener('limitHit', callback as EventListener);
    
    return () => {
      window.removeEventListener('limitHit', callback as EventListener);
    };
  }
  
  return () => {};
}

/**
 * APIエラーハンドリングのベストプラクティス実装
 */
export class ApiErrorHandler {
  static async handleResponse<T>(response: Response): Promise<T> {
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      
      // 制限エラーの場合は特別な処理
      if (response.status === 403) {
        globalLimitDetector?.detectAndReportLimitHit(
          { response: { status: response.status, data: errorData } },
          response.url || 'unknown'
        );
      }
      
      throw new Error(`HTTP ${response.status}: ${errorData.message || 'API Error'}`);
    }
    
    return response.json();
  }
  
  static createErrorMessage(error: any): string {
    if (error.response?.status === 403) {
      return '利用制限に達しました。Proプランで制限を解除できます。';
    }
    
    return error.message || 'エラーが発生しました';
  }
}