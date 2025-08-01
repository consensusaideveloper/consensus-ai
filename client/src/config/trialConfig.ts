/**
 * トライアル期間設定
 * サーバーサイドの設定と一致させるため、同じデフォルト値を使用
 */

// Constants (サーバーサイドのlimits.tsと一致)
const DEFAULT_TRIAL_DURATION_DAYS = 14;
const DEFAULT_HOURS_PER_ANALYSIS = 4.5;
const DEFAULT_ANALYSIS_PROCESSING_SECONDS = 30;
const MILLISECONDS_PER_DAY = 24 * 60 * 60 * 1000;

export class TrialConfig {
  /**
   * トライアル期間（日数）を取得
   * 将来的にはAPIから取得することを想定
   */
  static getTrialDurationDays(): number {
    // 環境変数が利用可能な場合は使用（Viteビルド時に展開される）
    if (typeof process !== 'undefined' && process.env.VITE_TRIAL_DURATION_DAYS) {
      return parseInt(process.env.VITE_TRIAL_DURATION_DAYS, 10);
    }
    
    // デフォルト値（サーバーサイドのlimits.tsと一致）
    // この値は PlanDetailsService で管理されている値と同期する必要があります
    return DEFAULT_TRIAL_DURATION_DAYS;
  }

  /**
   * トライアル期間をミリ秒で取得
   */
  static getTrialDurationMs(): number {
    return this.getTrialDurationDays() * MILLISECONDS_PER_DAY;
  }

  /**
   * トライアルプラン最大プロジェクト数を取得
   * 将来的にはAPIから取得することを想定
   */
  static getTrialMaxProjects(): number {
    // 環境変数が利用可能な場合は使用（Viteビルド時に展開される）
    if (typeof process !== 'undefined' && process.env.VITE_TRIAL_PLAN_MAX_PROJECTS) {
      return parseInt(process.env.VITE_TRIAL_PLAN_MAX_PROJECTS, 10);
    }
    
    // デフォルト値（サーバーサイドのlimits.tsと一致）
    return 5;
  }

  /**
   * AI分析1回あたりの手動作業時間（時間単位）を取得
   * 価値提案計算で使用
   */
  static getHoursPerAnalysis(): number {
    // 環境変数が利用可能な場合は使用（Viteビルド時に展開される）
    if (typeof process !== 'undefined' && process.env.VITE_HOURS_PER_ANALYSIS) {
      return parseFloat(process.env.VITE_HOURS_PER_ANALYSIS);
    }
    
    // デフォルト値: 手動分析に4.5時間かかると想定
    return DEFAULT_HOURS_PER_ANALYSIS;
  }

  /**
   * AI分析の処理時間（秒単位）を取得
   */
  static getAnalysisProcessingTimeSeconds(): number {
    // 環境変数が利用可能な場合は使用（Viteビルド時に展開される）
    if (typeof process !== 'undefined' && process.env.VITE_ANALYSIS_PROCESSING_SECONDS) {
      return parseInt(process.env.VITE_ANALYSIS_PROCESSING_SECONDS, 10);
    }
    
    // デフォルト値: AI分析は30秒で完了
    return DEFAULT_ANALYSIS_PROCESSING_SECONDS;
  }

  /**
   * 設定値のログ出力（デバッグ用）
   */
  static logCurrentSettings(): void {
    console.log('[TrialConfig] 📊 Current Trial Settings:', {
      trialDurationDays: this.getTrialDurationDays(),
      trialDurationMs: this.getTrialDurationMs(),
      trialMaxProjects: this.getTrialMaxProjects(),
      hoursPerAnalysis: this.getHoursPerAnalysis(),
      analysisProcessingTimeSeconds: this.getAnalysisProcessingTimeSeconds()
    });
  }
}