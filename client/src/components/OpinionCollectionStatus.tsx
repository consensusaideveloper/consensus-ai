import { TrendingUp, Clock, Users, Activity, Zap } from 'lucide-react';
import { useOpinionRealtime } from '../hooks/useOpinionRealtime';
import { useProjects } from '../hooks/useProjects';
import { StaticOpinionCollectionStatus } from './StaticOpinionCollectionStatus';

interface OpinionCollectionStatusProps {
  projectId: string;
  className?: string;
}

/**
 * 意見収集状況をリアルタイム表示するコンポーネント（Phase 3）
 * プロジェクトの意見収集統計をFirebaseから取得し、リアルタイムで表示
 */
export function OpinionCollectionStatus({ projectId, className = '' }: OpinionCollectionStatusProps) {
  const {
    collectionStats,
    isConnected,
    error,
    totalCount,
    todayCount,
    recentCount,
    collectionStatus,
    isActivelyCollecting,
    getTodayProgress,
    getFormattedLastOpinionTime
  } = useOpinionRealtime(projectId);

  const { getProject } = useProjects();

  // 🔥 Firebase接続失敗時のフォールバック
  if (error || !isConnected) {
    // SQLから基本統計を取得
    const project = getProject(projectId);
    const fallbackOpinionsCount = project?.opinionsCount || 0;
    
    return (
      <StaticOpinionCollectionStatus
        projectId={projectId}
        opinionsCount={fallbackOpinionsCount}
        className={className}
      />
    );
  }

  // ローディング状態の表示
  if (!collectionStats) {
    return (
      <div className={`bg-gray-50 border border-gray-200 rounded-lg p-4 ${className}`}>
        <div className="flex items-center space-x-2">
          <Activity className="h-5 w-5 text-gray-400 animate-pulse" />
          <div className="text-gray-600">
            収集状況を読み込み中...
          </div>
        </div>
      </div>
    );
  }

  // ステータス表示用のスタイル取得
  const getStatusStyle = (status: string, isActive: boolean) => {
    if (isActive) return {
      bgColor: 'bg-green-50',
      textColor: 'text-green-800',
      iconColor: 'text-green-600',
      label: '活発な収集中'
    };
    if (status === 'active') return {
      bgColor: 'bg-blue-50',
      textColor: 'text-blue-800',
      iconColor: 'text-blue-600',
      label: '収集中'
    };
    if (status === 'paused') return {
      bgColor: 'bg-yellow-50',
      textColor: 'text-yellow-800',
      iconColor: 'text-yellow-600',
      label: '一時停止中'
    };
    return {
      bgColor: 'bg-gray-50',
      textColor: 'text-gray-800',
      iconColor: 'text-gray-600',
      label: '収集停止'
    };
  };

  const statusStyle = getStatusStyle(collectionStatus, isActivelyCollecting());
  const todayProgressPercentage = getTodayProgress(50); // 目標50件で進捗計算

  return (
    <div className={`bg-white border border-gray-200 rounded-lg shadow-sm ${className}`}>
      {/* ヘッダー */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Activity className="h-5 w-5 text-blue-600" />
            <h3 className="text-lg font-semibold text-gray-900">
              意見収集状況
            </h3>
          </div>
          <div className={`px-3 py-1 rounded-full text-sm font-medium ${statusStyle.bgColor} ${statusStyle.textColor}`}>
            <div className="flex items-center space-x-1">
              {isActivelyCollecting() && <Zap className="h-3 w-3" />}
              <span>{statusStyle.label}</span>
            </div>
          </div>
        </div>
      </div>

      {/* 統計情報 */}
      <div className="p-4">
        {/* メイン統計 */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="bg-blue-50 rounded-lg p-4">
            <div className="flex items-center space-x-3">
              <Users className="h-6 w-6 text-blue-600" />
              <div>
                <div className="text-sm text-gray-600 mb-1">総意見数</div>
                <div className="text-2xl font-bold text-blue-600">
                  {totalCount}
                </div>
              </div>
            </div>
          </div>
          <div className="bg-green-50 rounded-lg p-4">
            <div className="flex items-center space-x-3">
              <TrendingUp className="h-6 w-6 text-green-600" />
              <div>
                <div className="text-sm text-gray-600 mb-1">今日の収集</div>
                <div className="text-2xl font-bold text-green-600">
                  {todayCount}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 詳細統計 */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="bg-purple-50 rounded-lg p-3">
            <div className="flex items-center space-x-2">
              <Clock className="h-4 w-4 text-purple-600" />
              <div>
                <div className="text-sm text-gray-600">最近1時間</div>
                <div className="text-lg font-semibold text-purple-600">
                  {recentCount}件
                </div>
              </div>
            </div>
          </div>
          <div className="bg-orange-50 rounded-lg p-3">
            <div className="flex items-center space-x-2">
              <Activity className="h-4 w-4 text-orange-600" />
              <div>
                <div className="text-sm text-gray-600">最新意見</div>
                <div className="text-sm font-semibold text-orange-600">
                  {getFormattedLastOpinionTime()}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 今日の進捗バー */}
        <div className="mb-4">
          <div className="flex justify-between text-sm text-gray-600 mb-2">
            <span>今日の進捗</span>
            <span>{todayCount}/50件 ({Math.round(todayProgressPercentage)}%)</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-gradient-to-r from-blue-500 to-green-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${Math.min(todayProgressPercentage, 100)}%` }}
            />
          </div>
        </div>

        {/* 接続状況とリアルタイム表示 */}
        <div className="flex items-center justify-between pt-3 border-t border-gray-200">
          <div className="flex items-center space-x-2">
            {isConnected ? (
              <>
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                <span className="text-sm text-green-600">リアルタイム更新中</span>
              </>
            ) : (
              <>
                <div className="w-2 h-2 bg-yellow-500 rounded-full" />
                <span className="text-sm text-yellow-600">接続中...</span>
              </>
            )}
          </div>
          
          {isActivelyCollecting() && (
            <div className="flex items-center space-x-1 text-sm text-green-600">
              <Zap className="h-3 w-3" />
              <span>活発な収集中</span>
            </div>
          )}
        </div>
      </div>

      {/* 注意事項 */}
      <div className="px-4 pb-4">
        <div className="bg-gray-50 rounded-lg p-3">
          <div className="text-xs text-gray-600">
            <strong>注意:</strong> 統計データはリアルタイムで更新されます。新着意見は数秒以内に反映されます。
          </div>
        </div>
      </div>
    </div>
  );
}