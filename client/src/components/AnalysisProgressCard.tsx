import {
  RotateCw,
  X,
  Minimize2,
  CheckCircle,
  AlertCircle,
  Clock
} from "lucide-react";
import { useEffect, useState } from "react";
import { useAnalysisRealtime } from "../hooks/useAnalysisRealtime";
import { useProjects } from "../hooks/useProjects";
import { useLanguage } from "../hooks/useLanguage";
import { IntermediateResultsDisplay } from "./IntermediateResultsDisplay";
import { analysisProgress } from "../translations/components/analysisProgress";

interface AnalysisProgressCardProps {
  projectId: string;
  projectName: string;
  isOpen: boolean;
  onCancel?: () => void;
  canCancel?: boolean;
  onMinimize?: () => void;
  canMinimize?: boolean;
  onAnalysisComplete?: () => void;
}

export function AnalysisProgressCard({
  projectId,
  projectName,
  isOpen,
  onCancel,
  canCancel = true,
  onMinimize,
  canMinimize = true,
  onAnalysisComplete,
}: AnalysisProgressCardProps) {
  const {
    analysisSession,
    intermediateResults,
    isConnected,
    error,
    isAnalyzing,
    isCompleted,
    isFailed,
    getProgressPercentage,
    getCurrentPhase,
    getIntermediateTopicsCount
  } = useAnalysisRealtime(projectId);

  const { reloadProjects } = useProjects();
  const { language } = useLanguage();
  const [localElapsedTime, setLocalElapsedTime] = useState(0);

  // 分析完了時のコールバック実行とSQL再読み込み（強化版）
  useEffect(() => {
    if (isCompleted && analysisSession?.startedAt) {
      // 完了した分析セッションが最近開始されたもののみ処理
      // （古い完了状態による誤った完了通知を防ぐ）
      const sessionStartTime = analysisSession.startedAt;
      const currentTime = Date.now();
      const timeDiff = currentTime - sessionStartTime;
      
      // 5分以内に開始された分析のみ完了として扱う
      if (timeDiff < 5 * 60 * 1000) {
        // Firebase完了検知→SQL再読み込み機能（リトライ付き）
        const reloadWithRetry = async () => {
          let attempts = 0;
          const maxAttempts = 3;
          
          while (attempts < maxAttempts) {
            try {
              await reloadProjects();
              break;
            } catch {
              attempts++;
              
              if (attempts < maxAttempts) {
                // 次の試行まで少し待つ
                await new Promise(resolve => setTimeout(resolve, 1000));
              }
            }
          }
        };
        
        reloadWithRetry();
        
        // 既存のコールバック実行
        if (onAnalysisComplete) {
          onAnalysisComplete();
        }
      } else {
        console.log("[AnalysisProgressCard] 古い分析完了状態を無視:", {
          startedAt: new Date(sessionStartTime),
          timeDiff: `${Math.round(timeDiff / 1000)}秒前`
        });
      }
    }
  }, [isCompleted, analysisSession?.startedAt, onAnalysisComplete, reloadProjects]);

  // リアルタイム経過時間更新
  useEffect(() => {
    if (!isAnalyzing) {
      setLocalElapsedTime(0);
      return;
    }

    const startTime = analysisSession?.startedAt || Date.now();
    const interval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTime) / 1000);
      setLocalElapsedTime(elapsed);
    }, 1000);

    return () => clearInterval(interval);
  }, [isAnalyzing, analysisSession?.startedAt]);

  if (!isOpen) return null;

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    const secsFormatted = secs.toString().padStart(2, '0');
    return analysisProgress[language].timeFormat
      .replace('{mins}', mins.toString())
      .replace('{secs}', secsFormatted);
  };

  const progressPercentage = getProgressPercentage();
  const currentPhase = getCurrentPhase();
  const intermediateTopicsCount = getIntermediateTopicsCount();


  // 接続エラー時の表示
  if (error && !isConnected) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-xl shadow-xl max-w-lg w-full">
          <div className="p-6 text-center">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">{analysisProgress[language].connectionError}</h3>
            <p className="text-gray-600 mb-4">{error}</p>
            <button
              onClick={onMinimize}
              className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
            >
              {analysisProgress[language].close}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 分析完了時の表示（最近開始された分析のみ）
  if (isCompleted && analysisSession?.startedAt) {
    // 5分以内に開始された分析のみ完了ダイアログを表示
    const sessionStartTime = analysisSession.startedAt;
    const currentTime = Date.now();
    const timeDiff = currentTime - sessionStartTime;
    
    if (timeDiff >= 5 * 60 * 1000) {
      // 古い完了状態の場合はダイアログを表示せず進行中として扱う
      console.log("[AnalysisProgressCard] 古い分析完了状態のため、ダイアログ表示をスキップ");
      // isCompletedがtrueでも、古い場合は進行中として表示
    } else {
      // 最近の完了状態の場合のみダイアログ表示
      return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full">
            <div className="p-6 text-center">
              <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">{analysisProgress[language].analysisComplete}</h3>
              <p className="text-gray-600 mb-4">
                {analysisProgress[language].projectAnalysisComplete.replace('{projectName}', projectName)}
              </p>
              {intermediateTopicsCount > 0 && (
                <p className="text-sm text-gray-500 mb-4">
                  {analysisProgress[language].topicsGenerated.replace('{count}', intermediateTopicsCount.toString())}
                </p>
              )}
              <button
                onClick={onMinimize}
                className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                {analysisProgress[language].checkResults}
              </button>
            </div>
          </div>
        </div>
      );
    }
  }

  // 分析失敗時の表示
  if (isFailed) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-xl shadow-xl max-w-lg w-full">
          <div className="p-6 text-center">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">{analysisProgress[language].analysisErrorTitle}</h3>
            <p className="text-gray-600 mb-4">
              {analysisProgress[language].analysisErrorMessage}
            </p>
            {analysisSession?.error && (
              <p className="text-sm text-red-500 mb-4">{analysisSession.error}</p>
            )}
            <button
              onClick={onMinimize}
              className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
            >
              {analysisProgress[language].close}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 分析中の表示
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-lg w-full">
        <div className="p-6">
          {/* ヘッダー */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center">
              <div className="h-12 w-12 bg-blue-100 rounded-full flex items-center justify-center mr-4">
                <RotateCw className={`h-6 w-6 text-blue-600 ${isAnalyzing ? 'animate-spin' : ''}`} />
              </div>
              <div>
                <h3 className="text-xl font-semibold text-gray-900">
                  {analysisProgress[language].aiAnalysisInProgress}
                </h3>
                <div className="text-sm text-gray-600 mt-1">
                  {projectName}
                </div>
              </div>
            </div>
          </div>

          {/* メインステータス */}
          <div className="mb-6">
            <div className="text-center mb-4">
              <span className="text-lg font-medium text-gray-900">
                {currentPhase}
              </span>
            </div>
            
            {/* プログレスバー */}
            <div className="mb-3">
              <div className="flex justify-between text-sm text-gray-600 mb-2">
                <span>{analysisProgress[language].progress}</span>
                <span>{Math.round(progressPercentage)}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${progressPercentage}%` }}
                >
                </div>
              </div>
            </div>
            
            {/* 詳細情報 */}
            <div className="space-y-2 text-sm text-gray-600">
              <div className="flex justify-between">
                <span>{analysisProgress[language].elapsedTime}</span>
                <span>{formatTime(localElapsedTime)}</span>
              </div>
              {intermediateTopicsCount > 0 && (
                <div className="flex justify-between">
                  <span>{analysisProgress[language].generatedTopics}</span>
                  <span>{intermediateTopicsCount}{analysisProgress[language].topicsUnit}</span>
                </div>
              )}
              {!isConnected && (
                <div className="flex items-center justify-center text-orange-600">
                  <Clock className="h-4 w-4 mr-1" />
                  <span>{analysisProgress[language].firebaseConnecting}</span>
                </div>
              )}
            </div>
          </div>

          {/* 🔥 Phase 2: 中間結果表示 */}
          <IntermediateResultsDisplay
            intermediateResults={intermediateResults}
            isVisible={isAnalyzing && !!intermediateResults}
            className="mb-4"
          />

          {/* アクションボタン */}
          <div className="pt-4 border-t border-gray-200 space-y-3">
            {/* 主要アクション: バックグラウンド実行 */}
            {canMinimize && onMinimize && (
              <button
                onClick={onMinimize}
                className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center font-medium"
              >
                <Minimize2 className="h-4 w-4 mr-2" />
                {analysisProgress[language].runInBackground}
              </button>
            )}

            {/* セカンダリアクション: キャンセル */}
            {canCancel && onCancel && (
              <button
                onClick={onCancel}
                className="w-full px-6 py-2 text-red-700 bg-transparent border border-red-200 rounded-lg hover:bg-red-50 transition-colors flex items-center justify-center"
              >
                <X className="h-4 w-4 mr-2" />
                {analysisProgress[language].stopAnalysis}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}