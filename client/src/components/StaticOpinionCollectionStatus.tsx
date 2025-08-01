import { Activity, Users } from 'lucide-react';

interface StaticOpinionCollectionStatusProps {
  projectId: string;
  opinionsCount: number;
  className?: string;
}

/**
 * Firebase未接続時の静的意見収集状況表示コンポーネント
 * SQLデータベースから取得した基本統計を表示
 */
export function StaticOpinionCollectionStatus({ 
  projectId: _projectId, 
  opinionsCount, 
  className = '' 
}: StaticOpinionCollectionStatusProps) {
  // projectId は将来の拡張で使用される可能性があるため保持
  void _projectId;
  return (
    <div className={`bg-gray-50 border border-gray-200 rounded-lg ${className}`}>
      <div className="p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <Activity className="h-5 w-5 text-gray-600" />
            <h3 className="text-lg font-semibold text-gray-900">
              意見収集状況
            </h3>
          </div>
          <div className="px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-800">
            基本表示モード
          </div>
        </div>
        
        <div className="bg-white rounded-lg p-4 border border-gray-200">
          <div className="flex items-center space-x-3">
            <Users className="h-6 w-6 text-blue-600" />
            <div>
              <div className="text-sm text-gray-600 mb-1">総意見数</div>
              <div className="text-2xl font-bold text-blue-600">
                {opinionsCount}
              </div>
            </div>
          </div>
        </div>
        
        <div className="mt-4 text-sm text-gray-600">
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-gray-400 rounded-full" />
            <span>リアルタイム機能は一時的に利用できません</span>
          </div>
        </div>
      </div>
    </div>
  );
}