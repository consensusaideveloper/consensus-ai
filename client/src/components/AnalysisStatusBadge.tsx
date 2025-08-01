import { CheckCircle, Clock, AlertCircle } from 'lucide-react';
import { useLanguage } from '../hooks/useLanguage';

export type AnalysisStatus = 'analyzed' | 'unanalyzed' | 'pending';

interface AnalysisStatusBadgeProps {
  status: AnalysisStatus;
  lastAnalyzedAt?: Date | null;
  analysisVersion?: number;
  classificationConfidence?: number;
  manualReviewFlag?: boolean;
  className?: string;
  showIcon?: boolean;
  size?: 'sm' | 'md';
}

export function AnalysisStatusBadge({
  status,
  lastAnalyzedAt,
  analysisVersion,
  classificationConfidence,
  manualReviewFlag,
  className = '',
  showIcon = true,
  size = 'sm'
}: AnalysisStatusBadgeProps) {
  const { t, language } = useLanguage();
  
  const getStatusConfig = (status: AnalysisStatus) => {
    switch (status) {
      case 'analyzed':
        // 手動レビューが必要な場合は警告色
        if (manualReviewFlag) {
          return {
            bgColor: 'bg-yellow-50',
            textColor: 'text-yellow-700',
            borderColor: 'border-yellow-200',
            icon: AlertCircle,
            text: t('analysisStatus.badge.requiresReview')
          };
        }
        
        // 信頼度が低い場合も警告色
        if (classificationConfidence && classificationConfidence < 0.7) {
          return {
            bgColor: 'bg-orange-50',
            textColor: 'text-orange-700',
            borderColor: 'border-orange-200',
            icon: AlertCircle,
            text: t('analysisStatus.badge.lowConfidence')
          };
        }
        
        return {
          bgColor: 'bg-green-50',
          textColor: 'text-green-700',
          borderColor: 'border-green-200',
          icon: CheckCircle,
          text: t('analysisStatus.badge.analyzed')
        };
      
      case 'unanalyzed':
        return {
          bgColor: 'bg-gray-50',
          textColor: 'text-gray-700',
          borderColor: 'border-gray-200',
          icon: Clock,
          text: t('analysisStatus.badge.unanalyzed')
        };
      
      case 'pending':
      default:
        return {
          bgColor: 'bg-blue-50',
          textColor: 'text-blue-700',
          borderColor: 'border-blue-200 border-dashed',
          icon: Clock,
          text: t('analysisStatus.badge.pending')
        };
    }
  };

  const config = getStatusConfig(status);
  const Icon = config.icon;
  
  const sizeClasses = {
    sm: 'px-2 py-1 text-xs',
    md: 'px-3 py-1.5 text-sm'
  };

  // ツールチップ用の詳細情報
  const getTooltipText = () => {
    if (status === 'analyzed' && lastAnalyzedAt) {
      const details = [
        `${t('analysisStatus.tooltip.analysisDateTime')} ${lastAnalyzedAt.toLocaleString(language === 'ja' ? 'ja-JP' : 'en-US')}`,
        analysisVersion ? `${t('analysisStatus.tooltip.version')} ${analysisVersion}` : '',
        classificationConfidence ? `${t('analysisStatus.tooltip.confidence')} ${Math.round(classificationConfidence * 100)}%` : '',
        manualReviewFlag ? t('analysisStatus.tooltip.manualReview') : ''
      ].filter(Boolean);
      
      return details.join('\n');
    }
    return config.text;
  };

  return (
    <span
      className={`inline-flex items-center rounded-full font-medium border ${config.bgColor} ${config.textColor} ${config.borderColor} ${sizeClasses[size]} ${className}`}
      title={getTooltipText()}
    >
      {showIcon && <Icon className="h-3 w-3 mr-1" />}
      <span>{config.text}</span>
      {status === 'analyzed' && analysisVersion && analysisVersion > 1 && (
        <span className="ml-1 text-xs opacity-75">v{analysisVersion}</span>
      )}
    </span>
  );
}

// ヘルパー関数: Response データから分析状態を判定
export function getAnalysisStatus(response: {
  lastAnalyzedAt?: Date | null;
  analysisVersion?: number;
}): AnalysisStatus {
  if (response.lastAnalyzedAt) {
    return 'analyzed';
  }
  return 'unanalyzed';
}

// ヘルパー関数: 分析状態でのフィルタリング
export function filterByAnalysisStatus<T extends { lastAnalyzedAt?: Date | null; analysisVersion?: number }>(
  responses: T[],
  filter: 'all' | 'analyzed' | 'unanalyzed'
): T[] {
  if (filter === 'all') {
    return responses;
  }
  
  return responses.filter(response => {
    const status = getAnalysisStatus(response);
    return status === filter;
  });
}