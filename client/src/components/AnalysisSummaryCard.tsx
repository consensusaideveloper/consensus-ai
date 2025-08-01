import { useState, useEffect, useCallback } from 'react';
import { BarChart3, TrendingUp, Clock, AlertCircle, Loader2 } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useLanguage } from '../hooks/useLanguage';

interface AnalysisSummary {
  totalOpinions: number;
  analyzedOpinions: number;
  pendingOpinions: number;
  analysisProgress: number;
  lastAnalysisAt: string | null;
  lastAnalyzedOpinionsCount: number;
  nextBatchSize: number;
  isAnalyzed: boolean;
  canAnalyze: boolean;
}

interface AnalysisSummaryCardProps {
  projectId: string;
  className?: string;
}

export function AnalysisSummaryCard({ projectId, className = '' }: AnalysisSummaryCardProps) {
  const { user } = useAuth();
  const { t, language } = useLanguage();
  const [summary, setSummary] = useState<AnalysisSummary | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchAnalysisSummary = useCallback(async () => {
    if (!projectId || !user?.id) return;

    try {
      setLoading(true);

      const response = await fetch(`/api/analysis/projects/${projectId}/summary`, {
        headers: {
          'X-User-ID': user.id,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setSummary(data.data);
      } else {
        // フォールバック: エラー時はデフォルト値を表示
        setSummary({
          totalOpinions: 0,
          analyzedOpinions: 0,
          pendingOpinions: 0,
          analysisProgress: 0,
          lastAnalysisAt: null,
          lastAnalyzedOpinionsCount: 0,
          nextBatchSize: 0,
          isAnalyzed: false,
          canAnalyze: false,
        });
        console.warn('Analysis summary API failed, using fallback values');
      }
    } catch (err) {
      // ネットワークエラー等の場合もフォールバック
      setSummary({
        totalOpinions: 0,
        analyzedOpinions: 0,
        pendingOpinions: 0,
        analysisProgress: 0,
        lastAnalysisAt: null,
        lastAnalyzedOpinionsCount: 0,
        nextBatchSize: 0,
        isAnalyzed: false,
        canAnalyze: false,
      });
      console.error('Analysis summary fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [projectId, user?.id]);

  useEffect(() => {
    fetchAnalysisSummary();
  }, [fetchAnalysisSummary]);

  // ローディング状態
  if (loading) {
    return (
      <div className={`bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg p-4 ${className}`}>
        <div className="flex items-center justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-purple-600 mr-2" />
          <span className="text-sm text-gray-600">{t('analysisStatus.summary.states.loading')}</span>
        </div>
      </div>
    );
  }

  // エラー状態またはデータなし（フォールバック表示）
  if (!summary) {
    return (
      <div className={`bg-gray-50 rounded-lg p-4 ${className}`}>
        <div className="flex items-center text-gray-500">
          <AlertCircle className="h-5 w-5 mr-2" />
          <span className="text-sm">{t('analysisStatus.summary.states.error')}</span>
        </div>
      </div>
    );
  }

  const formatLastAnalysis = (lastAnalysisAt: string | null) => {
    if (!lastAnalysisAt) return t('analysisStatus.summary.timeFormats.notExecuted');
    
    const date = new Date(lastAnalysisAt);
    const now = new Date();
    const diffHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffHours < 1) return t('analysisStatus.summary.timeFormats.withinHour');
    if (diffHours < 24) return `${diffHours}${t('analysisStatus.summary.timeFormats.hoursAgo')}`;
    if (diffHours < 48) return t('analysisStatus.summary.timeFormats.yesterday');
    return date.toLocaleDateString(language === 'ja' ? 'ja-JP' : 'en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <div className={`bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg p-4 border border-purple-200 ${className}`}>
      {/* ヘッダー */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center">
          <div className="h-10 w-10 bg-purple-100 rounded-full flex items-center justify-center mr-3">
            <BarChart3 className="h-5 w-5 text-purple-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">{t('analysisStatus.summary.title')}</h3>
            <p className="text-sm text-gray-600">{t('analysisStatus.summary.description')}</p>
          </div>
        </div>
        {summary.lastAnalysisAt && (
          <div className="text-right">
            <div className="text-xs text-gray-500">{t('analysisStatus.summary.lastAnalysisLabel')}</div>
            <div className="text-sm font-medium text-gray-700">
              {formatLastAnalysis(summary.lastAnalysisAt)}
            </div>
          </div>
        )}
      </div>

      {/* 分析状況メトリクス */}
      <div className="grid grid-cols-3 gap-4 mb-4">
        <div className="text-center">
          <div className="text-2xl font-bold text-gray-900">
            {summary.totalOpinions}
          </div>
          <div className="text-xs text-gray-600">{t('analysisStatus.summary.totalOpinions')}</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-green-600">
            {summary.analyzedOpinions}
          </div>
          <div className="text-xs text-gray-600">{t('analysisStatus.summary.analyzedOpinions')}</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-orange-600">
            {summary.pendingOpinions}
          </div>
          <div className="text-xs text-gray-600">{t('analysisStatus.summary.pendingOpinions')}</div>
        </div>
      </div>

      {/* プログレスバー */}
      {summary.totalOpinions > 0 && (
        <div className="mb-4">
          <div className="flex justify-between items-center mb-1">
            <span className="text-sm font-medium text-gray-700">{t('analysisStatus.summary.analysisProgress')}</span>
            <span className="text-sm text-gray-600">{summary.analysisProgress}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-gradient-to-r from-purple-500 to-blue-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${summary.analysisProgress}%` }}
            />
          </div>
        </div>
      )}

      {/* アクション領域 */}
      {summary.pendingOpinions > 0 && (
        <div className="bg-white rounded-lg p-3 border border-purple-100">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium text-gray-900">
                {t('analysisStatus.summary.states.pendingOpinions')}
              </div>
              <div className="text-xs text-gray-600">
                {t('analysisStatus.summary.states.nextBatch').replace('{count}', summary.nextBatchSize.toString())}
              </div>
            </div>
            <div className="flex items-center text-orange-600">
              <TrendingUp className="h-4 w-4 mr-1" />
              <span className="text-sm font-medium">{summary.pendingOpinions}件</span>
            </div>
          </div>
        </div>
      )}

      {/* 分析完了状態 */}
      {summary.pendingOpinions === 0 && summary.totalOpinions > 0 && (
        <div className="bg-green-50 rounded-lg p-3 border border-green-200">
          <div className="flex items-center">
            <div className="h-8 w-8 bg-green-100 rounded-full flex items-center justify-center mr-3">
              <TrendingUp className="h-4 w-4 text-green-600" />
            </div>
            <div>
              <div className="text-sm font-medium text-green-900">
                {t('analysisStatus.summary.states.allAnalyzed')}
              </div>
              <div className="text-xs text-green-700">
                {t('analysisStatus.summary.states.autoAnalysis')}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 意見なし状態 */}
      {summary.totalOpinions === 0 && (
        <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
          <div className="flex items-center">
            <Clock className="h-4 w-4 text-gray-400 mr-2" />
            <div className="text-sm text-gray-600">
              {t('analysisStatus.summary.states.noOpinions')}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}