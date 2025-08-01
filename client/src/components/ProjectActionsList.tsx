import React, { useState, useEffect } from 'react';
import { Settings, Calendar, Flag, Clock, CheckCircle, AlertTriangle, Filter, Search, Eye, Target, BarChart3, TrendingUp, Download, Activity } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { useProjects } from '../hooks/useProjects';
import { useAuth } from '../hooks/useAuth';
import { useLanguage } from '../hooks/useLanguage';
import { useSearchDebounce } from '../hooks/useDebounce';
import { ResponsiveHeader } from './ResponsiveHeader';
import { UserPurposeModal } from './UserPurposeModal';

type StatusFilter = 'all' | 'unhandled' | 'in-progress' | 'resolved' | 'dismissed';
type PriorityFilter = 'all' | 'high' | 'medium' | 'low';

interface ProjectActionItem {
  id: string;
  opinionId: string;
  taskDescription: string;
  relatedTopic: {
    id: string;
    title: string;
    status: string;
  };
  opinionContent: string;
  actionStatus: 'unhandled' | 'in-progress' | 'resolved' | 'dismissed';
  dueDate?: Date;
  priority: 'high' | 'medium' | 'low';
  lastUpdated: Date;
}

interface ApiOpinion {
  id: string;
  content: string;
  submittedAt: string;
  isBookmarked: boolean;
  sentiment: string;
  characterCount: number;
  topicId: string;
  projectId: string;
  actionStatus?: string;
  priorityLevel?: string;
  priorityUpdatedAt?: string;
  dueDate?: string;
}

interface ApiTopic {
  id: string;
  name: string;  // APIが返すフィールド名は'name'
  status?: string;
}

// データ変換関数（コンポーネント外に移動）
const convertToProjectActionItem = (opinion: ApiOpinion, topic: ApiTopic, projectId: string): ProjectActionItem => {
  // actionStatusのタイプガード
  const validActionStatuses = ['unhandled', 'in-progress', 'resolved', 'dismissed'] as const;
  const actionStatus = validActionStatuses.includes(opinion.actionStatus as typeof validActionStatuses[number]) 
    ? opinion.actionStatus as 'unhandled' | 'in-progress' | 'resolved' | 'dismissed'
    : 'unhandled';

  // priorityのタイプガード
  const validPriorities = ['high', 'medium', 'low'] as const;
  const priority = validPriorities.includes(opinion.priorityLevel as typeof validPriorities[number])
    ? opinion.priorityLevel as 'high' | 'medium' | 'low'
    : 'medium';

  return {
    id: `${projectId}-${topic.id}-${opinion.id}`,
    opinionId: opinion.id,
    taskDescription: opinion.content.substring(0, 100) + (opinion.content.length > 100 ? '...' : ''),
    relatedTopic: {
      id: topic.id,
      title: topic.name,  // APIの'name'フィールドを'title'にマッピング
      status: topic.status || 'unhandled'
    },
    opinionContent: opinion.content,
    actionStatus,
    dueDate: opinion.dueDate ? new Date(opinion.dueDate) : undefined,
    priority,
    lastUpdated: opinion.priorityUpdatedAt ? new Date(opinion.priorityUpdatedAt) : new Date()
  };
};

export function ProjectActionsList() {
  const navigate = useNavigate();
  const { projectId } = useParams<{ projectId: string }>();
  const { projects, loading: projectsLoading } = useProjects();
  const { user } = useAuth(); // Authentication required
  const { t } = useLanguage();
  
  const [actions, setActions] = useState<ProjectActionItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearchTerm = useSearchDebounce(searchTerm, 300);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [priorityFilter, setPriorityFilter] = useState<PriorityFilter>('all');
  const [showFilters, setShowFilters] = useState(false);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [showPurposeModal, setShowPurposeModal] = useState(false);

  // 現在のプロジェクトを取得
  const currentProject = projects.find(p => p.id === projectId);

  // このプロジェクトのアクションデータを収集（API使用）
  useEffect(() => {
    if (!projectId || !currentProject || !user?.id) return;

    const fetchProjectActions = async () => {
      try {
        // 1. トピック一覧を取得
        const topicsResponse = await fetch(`/api/topics/${projectId}`, {
          headers: {
            'Content-Type': 'application/json',
            'X-User-ID': user.id,
          },
        });
        if (!topicsResponse.ok) {
          throw new Error('Failed to fetch topics');
        }
        const topicsData = await topicsResponse.json();
        
        // 2. 各トピックの意見とアクション情報を取得
        const allActions: ProjectActionItem[] = [];
        
        if (topicsData.topics && Array.isArray(topicsData.topics)) {
          for (const topic of topicsData.topics) {
            try {
              const opinionsResponse = await fetch(`/api/topics/${projectId}/${topic.id}/opinions`, {
                headers: {
                  'Content-Type': 'application/json',
                  'X-User-ID': user.id,
                },
              });
              if (opinionsResponse.ok) {
                const opinionsData = await opinionsResponse.json();
                
                // 3. アクション情報がある意見のみを抽出・変換
                if (opinionsData.opinions && Array.isArray(opinionsData.opinions)) {
                  const topicActions = (opinionsData.opinions as ApiOpinion[])
                    .filter((opinion: ApiOpinion) => opinion.actionStatus && opinion.actionStatus !== 'unhandled')
                    .map((opinion: ApiOpinion) => convertToProjectActionItem(opinion, topic, projectId || ''));
                  
                  allActions.push(...topicActions);
                }
              }
            } catch (error) {
              console.error(`Failed to fetch opinions for topic ${topic.id}:`, error);
            }
          }
        }
        
        // 優先度とトピック順で並び替え
        allActions.sort((a, b) => {
          // 優先度でソート（高→中→低）
          const priorityOrder = { 'high': 3, 'medium': 2, 'low': 1 };
          const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];
          if (priorityDiff !== 0) return priorityDiff;
          
          // 同じ優先度ならトピック名でソート
          return a.relatedTopic.title.localeCompare(b.relatedTopic.title);
        });
        
        setActions(allActions);
      } catch (error) {
        console.error('Failed to fetch project actions:', error);
        // エラー時は空配列を設定
        setActions([]);
      }
    };

    fetchProjectActions();
  }, [projectId, currentProject, user?.id]);

  // フィルタリング
  const filteredActions = actions.filter(action => {
    const matchesSearch = action.taskDescription.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
                         action.relatedTopic.title.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
                         (action.opinionContent && action.opinionContent.toLowerCase().includes(debouncedSearchTerm.toLowerCase()));
    
    const matchesStatus = statusFilter === 'all' || action.actionStatus === statusFilter;
    const matchesPriority = priorityFilter === 'all' || action.priority === priorityFilter;

    return matchesSearch && matchesStatus && matchesPriority;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'unhandled': return 'bg-red-100 text-red-800';
      case 'in-progress': return 'bg-yellow-100 text-yellow-800';
      case 'resolved': return 'bg-green-100 text-green-800';
      case 'dismissed': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'unhandled': return t('projectActions.status.unhandled');
      case 'in-progress': return t('projectActions.status.inProgress');
      case 'resolved': return t('projectActions.status.resolved');
      case 'dismissed': return t('projectActions.status.dismissed');
      default: return t('common.unknown');
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityText = (priority: string) => {
    switch (priority) {
      case 'high': return '高';
      case 'medium': return '中';
      case 'low': return '低';
      default: return '-';
    }
  };

  const handleActionClick = (action: ProjectActionItem) => {
    navigate(`/projects/${projectId}/topics/${action.relatedTopic.id}/opinions/${action.opinionId}/action`);
  };

  const handleOpenPurposeModal = () => {
    setShowPurposeModal(true);
  };

  // 分析データの計算
  const analyticsData = React.useMemo(() => {
    const statusCounts = {
      unhandled: actions.filter(a => a.actionStatus === 'unhandled').length,
      inProgress: actions.filter(a => a.actionStatus === 'in-progress').length,
      resolved: actions.filter(a => a.actionStatus === 'resolved').length,
      dismissed: actions.filter(a => a.actionStatus === 'dismissed').length
    };

    const priorityCounts = {
      high: actions.filter(a => a.priority === 'high').length,
      medium: actions.filter(a => a.priority === 'medium').length,
      low: actions.filter(a => a.priority === 'low').length
    };

    // トピック別アクション数
    const topicActionCounts: Record<string, number> = {};
    actions.forEach(action => {
      const topicId = action.relatedTopic.id;
      topicActionCounts[topicId] = (topicActionCounts[topicId] || 0) + 1;
    });

    const topicStats = Object.entries(topicActionCounts)
      .map(([topicId, count]) => {
        const topic = actions.find(a => a.relatedTopic.id === topicId)?.relatedTopic;
        return {
          id: topicId,
          title: topic?.title || 'Unknown Topic',
          count,
          status: topic?.status || 'unhandled'
        };
      })
      .sort((a, b) => b.count - a.count);

    // 期限切れアクション
    const now = new Date();
    const overdueActions = actions.filter(action => 
      action.dueDate && action.dueDate < now && 
      (action.actionStatus === 'unhandled' || action.actionStatus === 'in-progress')
    );

    // 進捗率計算
    const completionRate = actions.length > 0 
      ? Math.round(((statusCounts.resolved + statusCounts.dismissed) / actions.length) * 100)
      : 0;

    // 高優先度の未対応率
    const highPriorityUnhandled = actions.filter(a => a.priority === 'high' && a.actionStatus === 'unhandled').length;
    const highPriorityTotal = actions.filter(a => a.priority === 'high').length;
    const highPriorityUnhandledRate = highPriorityTotal > 0 
      ? Math.round((highPriorityUnhandled / highPriorityTotal) * 100)
      : 0;

    return {
      statusCounts,
      priorityCounts,
      topicStats,
      overdueActions,
      completionRate,
      highPriorityUnhandledRate,
      totalActions: actions.length
    };
  }, [actions]);

  // CSV エクスポート機能
  const handleExportCSV = () => {
    const csvContent = [
      ['プロジェクトアクション分析レポート - ' + (currentProject?.name || '')],
      ['出力日時', new Date().toLocaleString('ja-JP')],
      ['', ''],
      ['基本統計'],
      ['総アクション数', analyticsData.totalActions],
      ['完了率', analyticsData.completionRate + '%'],
      ['期限切れアクション数', analyticsData.overdueActions.length],
      [t('projectActions.analytics.highPriorityUnhandledRate'), analyticsData.highPriorityUnhandledRate + '%'],
      ['', ''],
      [t('projectActions.analytics.statusBreakdown')],
      [t('projectActions.status.unhandled'), analyticsData.statusCounts.unhandled],
      [t('projectActions.status.inProgress'), analyticsData.statusCounts.inProgress],
      [t('projectActions.status.resolved'), analyticsData.statusCounts.resolved],
      [t('projectActions.status.dismissed'), analyticsData.statusCounts.dismissed],
      ['', ''],
      ['優先度別'],
      ['高優先度', analyticsData.priorityCounts.high],
      ['中優先度', analyticsData.priorityCounts.medium],
      ['低優先度', analyticsData.priorityCounts.low],
      ['', ''],
      ['トピック別アクション数'],
      ...analyticsData.topicStats.map(topic => [topic.title, topic.count])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `project_actions_${currentProject?.name || 'unknown'}_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  // プロジェクトコンテキストのローディング状態を最初にチェック
  if (projectsLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">{t('projectActions.project.loading')}</p>
        </div>
      </div>
    );
  }

  // プロジェクトが見つからない場合
  if (!currentProject) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h1 className="text-xl font-semibold text-gray-900 mb-2">{t('projectActions.project.notFound')}</h1>
          <p className="text-gray-600 mb-4">{t('projectActions.project.notFoundDescription')}</p>
          <button
            onClick={() => navigate('/dashboard')}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            {t('projectActions.project.backToDashboard')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      {/* Header */}
      <ResponsiveHeader 
        breadcrumbs={[
          { label: t('breadcrumb.dashboard'), path: '/dashboard' },
          { label: currentProject.name, path: `/projects/${projectId}` },
          { label: t('breadcrumb.actionManagement') }
        ]}
        onOpenPurposeSettings={handleOpenPurposeModal}
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {/* Project Info */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6 sm:p-8 mb-6 sm:mb-8">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-6">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Target className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <h2 className="text-2xl sm:text-3xl font-bold text-gray-900">{currentProject.name}</h2>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-sm font-medium text-blue-600 bg-blue-50 px-2 py-1 rounded">
                      {t('projectActions.project.projectManagement')}
                    </span>
                  </div>
                </div>
              </div>
              <p className="text-base text-gray-600 leading-relaxed">{currentProject.description}</p>
              <p className="text-sm text-gray-500 mt-2">
                {t('projectActions.project.projectDescription')}
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => navigate(`/projects/${projectId}`)}
                className="px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors text-sm font-semibold flex items-center"
              >
                <Eye className="h-4 w-4 mr-1" />
                {t('projectActions.project.projectDetailButton')}
              </button>
              <button
                onClick={() => navigate('/actions')}
                className="px-4 py-2 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 transition-colors text-sm font-medium flex items-center"
              >
                <Activity className="h-4 w-4 mr-1" />
                {t('projectActions.project.toGlobalManagement')}
              </button>
              <div className="px-3 py-2 bg-blue-50 text-blue-700 rounded-lg text-sm font-medium flex items-center border border-blue-200">
                <Target className="h-4 w-4 mr-1" />
                {t('projectActions.project.projectMode')}
              </div>
            </div>
          </div>
          
          {/* Stats Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-gradient-to-r from-green-50 to-green-100 rounded-xl p-4 border border-green-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-green-700 mb-1">{t('projectActions.project.projectTopicCount')}</p>
                  <p className="text-2xl font-bold text-green-900">{currentProject.analysis?.topInsights?.length || 0}</p>
                  <p className="text-xs text-green-600 mt-1">{t('projectActions.project.analyzedTopics')}</p>
                </div>
                <div className="p-3 bg-green-200 rounded-full">
                  <BarChart3 className="h-6 w-6 text-green-700" />
                </div>
              </div>
            </div>
            
            <div className="bg-gradient-to-r from-orange-50 to-orange-100 rounded-xl p-4 border border-orange-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-orange-700 mb-1">{t('projectActions.project.projectActionCount')}</p>
                  <p className="text-2xl font-bold text-orange-900">{actions.length}</p>
                  <p className="text-xs text-orange-600 mt-1">{t('projectActions.project.actionsToHandle')}</p>
                </div>
                <div className="p-3 bg-orange-200 rounded-full">
                  <Target className="h-6 w-6 text-orange-700" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-4 sm:p-6 mb-6 sm:mb-8">
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-blue-600" />
              <h3 className="text-lg font-semibold text-gray-900">{currentProject.name} {t('projectActions.project.projectStatistics')}</h3>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowAnalytics(!showAnalytics)}
                className="flex items-center px-3 py-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors font-medium text-sm"
              >
                <TrendingUp className="h-4 w-4 mr-1" />
                <span className="hidden sm:inline">{t('projectActions.analysis')}</span>
              </button>
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="flex items-center px-3 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors font-medium text-sm"
              >
                <Filter className="h-4 w-4 mr-1" />
                <span className="hidden sm:inline">{t('projectActions.filter')}</span>
              </button>
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 sm:gap-6">
            <div className="text-center">
              <div className="text-2xl sm:text-3xl font-bold text-blue-600">{actions.length}</div>
              <div className="text-xs sm:text-sm text-gray-600">{t('projectActions.summary.totalActions')}</div>
            </div>
            <div className="text-center">
              <div className="text-2xl sm:text-3xl font-bold text-red-600">
                {actions.filter(a => a.actionStatus === 'unhandled').length}
              </div>
              <div className="text-xs sm:text-sm text-gray-600">{t('projectActions.summary.unhandled')}</div>
            </div>
            <div className="text-center">
              <div className="text-2xl sm:text-3xl font-bold text-yellow-600">
                {actions.filter(a => a.actionStatus === 'in-progress').length}
              </div>
              <div className="text-xs sm:text-sm text-gray-600">{t('projectActions.summary.inProgress')}</div>
            </div>
            <div className="text-center">
              <div className="text-2xl sm:text-3xl font-bold text-green-600">
                {actions.filter(a => a.actionStatus === 'resolved').length}
              </div>
              <div className="text-xs sm:text-sm text-gray-600">{t('projectActions.summary.resolved')}</div>
            </div>
            <div className="text-center">
              <div className="text-2xl sm:text-3xl font-bold text-red-600">
                {actions.filter(a => a.dueDate && new Date(a.dueDate) < new Date()).length}
              </div>
              <div className="text-xs sm:text-sm text-gray-600">{t('projectActions.summary.overdue')}</div>
            </div>
          </div>
        </div>

        {/* Analytics */}
        {showAnalytics && (
          <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6 mb-8">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold text-gray-900 flex items-center">
                <TrendingUp className="h-5 w-5 text-green-600 mr-2" />
                {t('projectActions.detailedAnalysis.title')}
              </h3>
              <button
                onClick={handleExportCSV}
                className="flex items-center px-4 py-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors text-sm font-medium"
              >
                <Download className="h-4 w-4 mr-2" />
                {t('projectActions.detailedAnalysis.csvExport')}
              </button>
            </div>

            {/* 重要指標 */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
              <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                <div className="text-center">
                  <div className="text-3xl font-bold text-blue-600">{analyticsData.completionRate}%</div>
                  <div className="text-sm text-blue-700 font-medium">{t('projectActions.summary.completionRate')}</div>
                  <div className="text-xs text-blue-600 mt-1">
                    {analyticsData.statusCounts.resolved + analyticsData.statusCounts.dismissed}/{analyticsData.totalActions}件
                  </div>
                </div>
              </div>
              <div className="bg-red-50 rounded-lg p-4 border border-red-200">
                <div className="text-center">
                  <div className="text-3xl font-bold text-red-600">{analyticsData.overdueActions.length}</div>
                  <div className="text-sm text-red-700 font-medium">{t('projectActions.summary.overdue')}</div>
                  <div className="text-xs text-red-600 mt-1">{t('projectActions.detailedAnalysis.needsAction')}</div>
                </div>
              </div>
              <div className="bg-orange-50 rounded-lg p-4 border border-orange-200">
                <div className="text-center">
                  <div className="text-3xl font-bold text-orange-600">{analyticsData.highPriorityUnhandledRate}%</div>
                  <div className="text-sm text-orange-700 font-medium">{t('projectActions.summary.highPriorityUnhandledRate')}</div>
                  <div className="text-xs text-orange-600 mt-1">
                    {actions.filter(a => a.priority === 'high' && a.actionStatus === 'unhandled').length}/{analyticsData.priorityCounts.high}件
                  </div>
                </div>
              </div>
              <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
                <div className="text-center">
                  <div className="text-3xl font-bold text-purple-600">{analyticsData.topicStats.length}</div>
                  <div className="text-sm text-purple-700 font-medium">{t('projectActions.summary.topicsWithActions')}</div>
                  <div className="text-xs text-purple-600 mt-1">{t('projectActions.summary.topicsWithActionsDescription')}</div>
                </div>
              </div>
            </div>

            {/* 詳細分析 */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* ステータス別分析 */}
              <div>
                <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <CheckCircle className="h-5 w-5 text-blue-600 mr-2" />
                  {t('projectActions.detailedAnalysis.statusAnalysis')}
                </h4>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                    <div className="flex items-center">
                      <div className="w-4 h-4 bg-red-500 rounded mr-3"></div>
                      <span className="font-medium text-gray-700">{t('projectActions.summary.unhandled')}</span>
                    </div>
                    <span className="text-2xl font-bold text-red-600">{analyticsData.statusCounts.unhandled}</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg">
                    <div className="flex items-center">
                      <div className="w-4 h-4 bg-yellow-500 rounded mr-3"></div>
                      <span className="font-medium text-gray-700">{t('projectActions.summary.inProgress')}</span>
                    </div>
                    <span className="text-2xl font-bold text-yellow-600">{analyticsData.statusCounts.inProgress}</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                    <div className="flex items-center">
                      <div className="w-4 h-4 bg-green-500 rounded mr-3"></div>
                      <span className="font-medium text-gray-700">{t('projectActions.summary.resolved')}</span>
                    </div>
                    <span className="text-2xl font-bold text-green-600">{analyticsData.statusCounts.resolved}</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center">
                      <div className="w-4 h-4 bg-gray-500 rounded mr-3"></div>
                      <span className="font-medium text-gray-700">{t('projectActions.status.dismissed')}</span>
                    </div>
                    <span className="text-2xl font-bold text-gray-600">{analyticsData.statusCounts.dismissed}</span>
                  </div>
                </div>
              </div>

              {/* 優先度別分析 */}
              <div>
                <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <Flag className="h-5 w-5 text-red-600 mr-2" />
                  {t('projectActions.detailedAnalysis.priorityAnalysis')}
                </h4>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                    <div className="flex items-center">
                      <div className="w-4 h-4 bg-red-500 rounded mr-3"></div>
                      <span className="font-medium text-gray-700">{t('projectActions.detailedAnalysis.highPriority')}</span>
                    </div>
                    <span className="text-2xl font-bold text-red-600">{analyticsData.priorityCounts.high}</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg">
                    <div className="flex items-center">
                      <div className="w-4 h-4 bg-yellow-500 rounded mr-3"></div>
                      <span className="font-medium text-gray-700">{t('projectActions.detailedAnalysis.mediumPriority')}</span>
                    </div>
                    <span className="text-2xl font-bold text-yellow-600">{analyticsData.priorityCounts.medium}</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                    <div className="flex items-center">
                      <div className="w-4 h-4 bg-green-500 rounded mr-3"></div>
                      <span className="font-medium text-gray-700">{t('projectActions.detailedAnalysis.lowPriority')}</span>
                    </div>
                    <span className="text-2xl font-bold text-green-600">{analyticsData.priorityCounts.low}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* トピック別アクション数 */}
            {analyticsData.topicStats.length > 0 && (
              <div className="mt-8">
                <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <Target className="h-5 w-5 text-purple-600 mr-2" />
                  {t('projectActions.detailedAnalysis.topicAnalysis')}
                </h4>
                <div className="bg-gray-50 rounded-lg p-4 max-h-80 overflow-y-auto">
                  <div className="space-y-2">
                    {analyticsData.topicStats.slice(0, 10).map((topic, index) => (
                      <div key={topic.id} className="flex items-center justify-between p-3 bg-white rounded shadow-sm">
                        <div className="flex items-center min-w-0 flex-1">
                          <div className="flex-shrink-0 w-6 h-6 bg-purple-100 rounded-full flex items-center justify-center mr-3">
                            <span className="text-xs font-bold text-purple-700">{index + 1}</span>
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="font-medium text-gray-900 truncate">{topic.title}</p>
                            <p className="text-sm text-gray-500">
                              {t('projectActions.detailedAnalysis.topicStatus')}: 
                              <span className={`ml-1 px-2 py-1 rounded text-xs font-medium ${
                                topic.status === 'resolved' ? 'bg-green-100 text-green-800' :
                                topic.status === 'in-progress' ? 'bg-yellow-100 text-yellow-800' :
                                'bg-red-100 text-red-800'
                              }`}>
                                {topic.status === 'resolved' ? t('projectActions.summary.resolved') :
                                 topic.status === 'in-progress' ? t('projectActions.summary.inProgress') : t('projectActions.summary.unhandled')}
                              </span>
                            </p>
                          </div>
                        </div>
                        <div className="text-right ml-4">
                          <div className="text-xl font-bold text-purple-600">{topic.count}</div>
                          <div className="text-xs text-gray-500">{t('projectActions.detailedAnalysis.actionItems')}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                {analyticsData.topicStats.length > 10 && (
                  <p className="text-sm text-gray-600 mt-3 text-center">
                    {t('projectActions.detailedAnalysis.moreTopics', { count: analyticsData.topicStats.length - 10 })}
                  </p>
                )}
              </div>
            )}

            {/* 期限切れアクション詳細 */}
            {analyticsData.overdueActions.length > 0 && (
              <div className="mt-8">
                <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <AlertTriangle className="h-5 w-5 text-red-600 mr-2" />
                  {t('projectActions.detailedAnalysis.overdueAnalysis')}
                </h4>
                <div className="bg-red-50 rounded-lg p-4">
                  <div className="space-y-3">
                    {analyticsData.overdueActions.slice(0, 5).map((action) => (
                      <div key={action.id} className="flex items-center justify-between p-3 bg-white rounded border border-red-200">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-gray-900 truncate">{action.taskDescription}</p>
                          <p className="text-sm text-gray-600">{t('projectActions.filters.topic')}: {action.relatedTopic.title}</p>
                        </div>
                        <div className="text-right ml-4">
                          <div className="text-sm font-medium text-red-600">
                            {t('projectActions.detailedAnalysis.dueDate')}: {action.dueDate?.toLocaleDateString('ja-JP')}
                          </div>
                          <div className="text-xs text-red-500">
                            {Math.floor((new Date().getTime() - (action.dueDate?.getTime() || 0)) / (1000 * 60 * 60 * 24))}{t('projectActions.detailedAnalysis.daysOverdue')}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  {analyticsData.overdueActions.length > 5 && (
                    <p className="text-sm text-red-700 mt-3 text-center">
                      {t('projectActions.detailedAnalysis.moreOverdue', { count: analyticsData.overdueActions.length - 5 })}
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Filters */}
        {showFilters && (
          <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-4 sm:p-6 mb-6 sm:mb-8">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Search */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Search className="h-4 w-4 inline mr-1" />
                  {t('projectActions.filters.search')}
                </label>
                <input
                  type="text"
                  placeholder={t('projectActions.filters.search')}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                />
              </div>

              {/* Status Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Settings className="h-4 w-4 inline mr-1" />
                  {t('projectActions.filters.status')}
                </label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                >
                  <option value="all">{t('projectActions.filters.all')}</option>
                  <option value="unhandled">{t('projectActions.status.unhandled')}</option>
                  <option value="in-progress">{t('projectActions.status.inProgress')}</option>
                  <option value="resolved">{t('projectActions.status.resolved')}</option>
                  <option value="dismissed">{t('projectActions.status.dismissed')}</option>
                </select>
              </div>

              {/* Priority Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Flag className="h-4 w-4 inline mr-1" />
                  {t('projectActions.filters.priority')}
                </label>
                <select
                  value={priorityFilter}
                  onChange={(e) => setPriorityFilter(e.target.value as PriorityFilter)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                >
                  <option value="all">{t('projectActions.filters.all')}</option>
                  <option value="high">{t('projectActions.priority.high')}</option>
                  <option value="medium">{t('projectActions.priority.medium')}</option>
                  <option value="low">{t('projectActions.priority.low')}</option>
                </select>
              </div>
            </div>

            <div className="mt-4 text-xs sm:text-sm text-gray-600">
              {filteredActions.length} {t('projectActions.detailedAnalysis.actionItems')}
            </div>
          </div>
        )}

        {/* Actions List */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-100">
          {filteredActions.length > 0 ? (
            <div className="divide-y divide-gray-200">
              {filteredActions.map((action) => (
                <div
                  key={action.id}
                  className="p-4 sm:p-6 hover:bg-gray-50 transition-colors cursor-pointer relative group"
                  onClick={() => handleActionClick(action)}
                >
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between">
                    <div className="flex-1 pr-0 sm:pr-4 mb-4 sm:mb-0">
                      {/* Header with badges */}
                      <div className="flex flex-wrap items-center gap-2 mb-2 sm:mb-3">
                        <div className="flex items-center text-xs sm:text-sm text-gray-500">
                          <Clock className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                          <span className="hidden sm:inline">{action.lastUpdated.toLocaleString('ja-JP')}</span>
                          <span className="sm:hidden">{action.lastUpdated.toLocaleDateString('ja-JP')}</span>
                        </div>
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(action.actionStatus)}`}>
                          {getStatusText(action.actionStatus)}
                        </span>
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(action.priority)}`}>
                          <Flag className="h-3 w-3 mr-1" />
                          {getPriorityText(action.priority)}
                        </span>
                        {action.dueDate && (
                          <div className="flex items-center text-xs sm:text-sm text-red-600">
                            <Calendar className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                            <span className="hidden sm:inline">期限: {action.dueDate.toLocaleDateString('ja-JP')}</span>
                            <span className="sm:hidden">{action.dueDate.toLocaleDateString('ja-JP')}</span>
                          </div>
                        )}
                      </div>

                      {/* Content */}
                      <div className="text-gray-800 leading-relaxed text-sm sm:text-base mb-3">
                        <div className="line-clamp-3">
                          {action.taskDescription}
                        </div>
                      </div>

                      {/* Meta Information */}
                      <div className="flex flex-wrap items-center gap-3 sm:gap-4 text-xs sm:text-sm text-gray-500">
                        <div className="flex items-center">
                          <Target className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                          <span className="hidden sm:inline">{t('projectActions.project.project')}: </span>
                          <span className="sm:hidden">P: </span>
                          {currentProject.name}
                        </div>
                        <div className="flex items-center">
                          <Settings className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                          <span className="hidden sm:inline">{t('projectActions.filters.topic')}: </span>
                          <span className="sm:hidden">T: </span>
                          {action.relatedTopic.title}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-end sm:justify-start">
                      <button
                        className="px-3 py-1.5 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors text-xs font-medium flex items-center"
                        title={t('projectActions.actionsList.viewDetails')}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleActionClick(action);
                        }}
                      >
                        <Eye className="h-3 w-3 mr-1" />
                        {t('projectActions.actionsList.viewDetails')}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 sm:py-16">
              <Settings className="h-12 w-12 sm:h-16 sm:w-16 text-gray-300 mx-auto mb-3 sm:mb-4" />
              <h3 className="text-base sm:text-lg font-medium text-gray-900 mb-2">
                {searchTerm || statusFilter !== 'all' || priorityFilter !== 'all'
                  ? t('projectActions.actionsList.noSearchResults')
                  : t('projectActions.actionsList.noActions')
                }
              </h3>
              <p className="text-sm sm:text-base text-gray-600 px-4">
                {searchTerm || statusFilter !== 'all' || priorityFilter !== 'all'
                  ? t('projectActions.filters.clear')
                  : t('projectActions.actionsList.noActionsDescription')
                }
              </p>
            </div>
          )}
        </div>
      </main>

      <style>{`
        .line-clamp-3 {
          display: -webkit-box;
          -webkit-line-clamp: 3;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
      `}</style>

      {/* User Purpose Modal */}
      <UserPurposeModal
        isOpen={showPurposeModal}
        onClose={() => setShowPurposeModal(false)}
      />
    </div>
  );
}