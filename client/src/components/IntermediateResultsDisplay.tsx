import { Clock, Sparkles, Target } from 'lucide-react';
import { useLanguage } from '../hooks/useLanguage';

interface IntermediateResults {
  topics?: Record<string, IntermediateTopic>;
  metadata?: {
    completedBatches?: number;
    totalBatches?: number;
    generatedTopics?: number;
    lastUpdated?: number;
  };
}

interface IntermediateResultsDisplayProps {
  intermediateResults: IntermediateResults | null;
  isVisible: boolean;
  className?: string;
}

interface IntermediateTopic {
  id: string;
  name: string;
  summary: string;
  count: number;
  isTemporary: boolean;
  createdAt: number;
  batchIndex?: number;
}

/**
 * 中間結果表示コンポーネント（Phase 2）
 * AI分析中にリアルタイムで生成されるトピックを表示
 */
export function IntermediateResultsDisplay({ 
  intermediateResults, 
  isVisible, 
  className = '' 
}: IntermediateResultsDisplayProps) {
  const { t } = useLanguage();
  
  if (!isVisible || !intermediateResults) {
    return null;
  }

  // 中間トピックを配列に変換してソート
  const intermediateTopics: IntermediateTopic[] = intermediateResults.topics 
    ? Object.values(intermediateResults.topics).sort((a: IntermediateTopic, b: IntermediateTopic) => a.createdAt - b.createdAt)
    : [];

  const metadata = intermediateResults.metadata || {};

  return (
    <div className={`bg-orange-50 border border-orange-200 rounded-lg p-4 ${className}`}>
      {/* ヘッダー */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <Sparkles className="h-5 w-5 text-orange-600" />
          <h3 className="text-lg font-semibold text-orange-800">
            {t('analysisProgress.aiAnalysisInProgress')} - {t('analysisProgress.intermediateResults')}
          </h3>
        </div>
        <div className="flex items-center space-x-1 text-sm text-orange-600">
          <Clock className="h-4 w-4" />
          <span>{t('analysisProgress.realtimeUpdating')}</span>
        </div>
      </div>

      {/* 統計情報 */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="bg-white rounded-lg p-3 border border-orange-200">
          <div className="flex items-center space-x-2">
            <Target className="h-4 w-4 text-orange-600" />
            <div>
              <div className="text-sm text-gray-600">{t('analysisProgress.generatedTopics').replace(':', '')}</div>
              <div className="text-lg font-semibold text-gray-900">
                {intermediateTopics.length}{t('analysisProgress.topicsUnit')}
              </div>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg p-3 border border-orange-200">
          <div className="flex items-center space-x-2">
            <Clock className="h-4 w-4 text-orange-600" />
            <div>
              <div className="text-sm text-gray-600">{t('analysisProgress.processedBatches')}</div>
              <div className="text-lg font-semibold text-gray-900">
                {metadata.completedBatches || 0}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 中間トピック一覧 */}
      <div className="space-y-3">
        <div className="text-sm font-medium text-orange-800 mb-2">
          {t('analysisProgress.intermediateTopicsList')}
        </div>
        
        {intermediateTopics.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Sparkles className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>{t('analysisProgress.generatingTopics')}</p>
          </div>
        ) : (
          <div className="max-h-96 overflow-y-auto space-y-2">
            {intermediateTopics.map((topic, index) => (
              <IntermediateTopicCard
                key={topic.id}
                topic={topic}
                index={index}
              />
            ))}
          </div>
        )}
      </div>

      {/* 注意事項 */}
      <div className="mt-4 p-3 bg-orange-100 rounded-lg border border-orange-200">
        <div className="text-xs text-orange-700">
          <strong>{t('analysisProgress.note')}</strong> {t('analysisProgress.intermediateResultsNote')}
        </div>
      </div>
    </div>
  );
}

/**
 * 個別の中間トピック表示カード
 */
function IntermediateTopicCard({ topic, index }: { topic: IntermediateTopic; index: number }) {
  const { t } = useLanguage();
  
  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString('ja-JP', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  return (
    <div className="bg-white rounded-lg p-3 border border-orange-200 shadow-sm">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center space-x-2 mb-2">
            <span className="inline-flex items-center justify-center w-5 h-5 bg-orange-100 text-orange-600 text-xs font-medium rounded-full">
              {index + 1}
            </span>
            <h4 className="font-semibold text-gray-900 text-sm">
              {topic.name}
            </h4>
          </div>
          
          <p className="text-sm text-gray-600 mb-2 line-clamp-2">
            {topic.summary}
          </p>
          
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-500">
              {topic.count}{t('analysisProgress.opinionsCount')}
            </span>
            <div className="flex items-center space-x-2 text-xs text-gray-400">
              {topic.batchIndex !== undefined && (
                <>
                  <span>{t('analysisProgress.batch')} {topic.batchIndex + 1}</span>
                  <span>•</span>
                </>
              )}
              <span>{formatTime(topic.createdAt)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}