import { useState, useEffect } from "react";
import {
  Settings,
  Calendar,
  Flag,
  Clock,
  Filter,
  Search,
  Eye,
  Target,
  BarChart3,
  TrendingUp,
  Activity,
  Download,
  CheckCircle,
  AlertTriangle,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "../hooks/useLanguage";
import { useSearchDebounce } from "../hooks/useDebounce";
import { useAuth } from "../hooks/useAuth";
import { useProjects } from "../hooks/useProjects";
import { ResponsiveHeader } from "./ResponsiveHeader";
import { UserPurposeModal } from "./UserPurposeModal";

type FilterOption = "all" | "overdue";
type StatusFilter =
  | "all"
  | "unhandled"
  | "in-progress"
  | "resolved"
  | "dismissed";
type PriorityFilter = "all" | "high" | "medium" | "low";

interface ActiveActionItem {
  id: string;
  opinionId: string;
  taskDescription: string;
  relatedTopic: {
    id: string;
    title: string;
    status: string;
  };
  relatedProject: {
    id: string;
    name: string;
  };
  responseContent: string;
  actionStatus: "unhandled" | "in-progress" | "resolved" | "dismissed";
  assignee?: string;
  dueDate?: Date;
  priority: "high" | "medium" | "low";
  lastUpdated: Date;
}


export function ActiveActionsList() {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { user } = useAuth();
  const { projects } = useProjects();

  const [actions, setActions] = useState<ActiveActionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const debouncedSearchTerm = useSearchDebounce(searchTerm, 300);
  const [filterOption, setFilterOption] = useState<FilterOption>("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [priorityFilter, setPriorityFilter] = useState<PriorityFilter>("all");
  const [showFilters, setShowFilters] = useState(false);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [showAllProjects, setShowAllProjects] = useState(false);
  const [showAllTopics, setShowAllTopics] = useState(false);
  const [showPurposeModal, setShowPurposeModal] = useState(false);

  // 全プロジェクトからアクションデータを取得
  useEffect(() => {
    const fetchActions = async () => {
      try {
        setLoading(true);
        setError(null);

        if (!user?.id) {
          throw new Error('User not authenticated');
        }

        const allActions: ActiveActionItem[] = [];

        // 並列処理でプロジェクトデータを取得
        const projectPromises = projects.map(async (project) => {
          try {
            // プロジェクトのトピック一覧を取得
            const topicsResponse = await fetch(`/api/topics/${project.id}`, {
              headers: {
                'Content-Type': 'application/json',
                'X-User-ID': user.id,
              },
            });

            if (!topicsResponse.ok) {
              console.warn(`Failed to fetch topics for project ${project.id}: ${topicsResponse.statusText}`);
              return [];
            }

            const topicsData = await topicsResponse.json();
            
            if (!topicsData.topics || !Array.isArray(topicsData.topics)) {
              return [];
            }

            // 各トピックの意見を並列取得
            const topicPromises = topicsData.topics.map(async (topic: { id: string; name: string; status?: string }) => {
              try {
                const opinionsResponse = await fetch(`/api/topics/${project.id}/${topic.id}/opinions`, {
                  headers: {
                    'Content-Type': 'application/json',
                    'X-User-ID': user.id,
                  },
                });

                if (!opinionsResponse.ok) {
                  console.warn(`Failed to fetch opinions for topic ${topic.id}: ${opinionsResponse.statusText}`);
                  return [];
                }

                const opinionsData = await opinionsResponse.json();
                
                if (!opinionsData.opinions || !Array.isArray(opinionsData.opinions)) {
                  return [];
                }

                // アクション情報がある意見のみを抽出・変換
                return opinionsData.opinions
                  .filter((opinion: { actionStatus?: string }) => opinion.actionStatus && opinion.actionStatus !== 'unhandled')
                  .map((opinion: { 
                    id: string; 
                    content: string; 
                    actionStatus?: string; 
                    dueDate?: string; 
                    priorityLevel?: string; 
                    priorityUpdatedAt?: string;
                  }) => ({
                    id: `${project.id}-${topic.id}-${opinion.id}`,
                    opinionId: opinion.id,
                    taskDescription: opinion.content.substring(0, 100) + (opinion.content.length > 100 ? '...' : ''),
                    relatedTopic: {
                      id: topic.id,
                      title: topic.name,
                      status: topic.status || 'unhandled'
                    },
                    relatedProject: {
                      id: project.id,
                      name: project.name
                    },
                    responseContent: opinion.content,
                    actionStatus: opinion.actionStatus as 'unhandled' | 'in-progress' | 'resolved' | 'dismissed',
                    dueDate: opinion.dueDate ? new Date(opinion.dueDate) : undefined,
                    priority: (opinion.priorityLevel || 'medium') as 'high' | 'medium' | 'low',
                    lastUpdated: opinion.priorityUpdatedAt ? new Date(opinion.priorityUpdatedAt) : new Date()
                  }));
              } catch (error) {
                console.error(`Failed to fetch opinions for topic ${topic.id}:`, error);
                return [];
              }
            });

            // トピック並列処理の結果を統合
            const topicResults = await Promise.allSettled(topicPromises);
            const projectActions: ActiveActionItem[] = [];
            
            topicResults.forEach((result) => {
              if (result.status === 'fulfilled') {
                projectActions.push(...result.value);
              }
            });

            return projectActions;
          } catch (error) {
            console.error(`Failed to fetch data for project ${project.id}:`, error);
            return [];
          }
        });

        // プロジェクト並列処理の結果を統合
        const projectResults = await Promise.allSettled(projectPromises);
        
        projectResults.forEach((result) => {
          if (result.status === 'fulfilled') {
            allActions.push(...result.value);
          }
        });

        // 優先度とプロジェクト名でソート
        allActions.sort((a, b) => {
          const priorityOrder = { 'high': 3, 'medium': 2, 'low': 1 };
          const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];
          if (priorityDiff !== 0) return priorityDiff;
          return a.relatedProject.name.localeCompare(b.relatedProject.name);
        });

        setActions(allActions);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        setError(errorMessage);
        // eslint-disable-next-line no-console
        console.error('[ActiveActionsList] アクション取得エラー:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchActions();
  }, [user?.id, projects]);

  // フィルタリング
  const handleOpenPurposeModal = () => {
    setShowPurposeModal(true);
  };

  const filteredActions = actions.filter((action) => {
    const matchesSearch =
      action.taskDescription
        .toLowerCase()
        .includes(debouncedSearchTerm.toLowerCase()) ||
      action.relatedTopic.title
        .toLowerCase()
        .includes(debouncedSearchTerm.toLowerCase()) ||
      action.relatedProject.name
        .toLowerCase()
        .includes(debouncedSearchTerm.toLowerCase());

    const matchesFilter = (() => {
      switch (filterOption) {
        case "overdue":
          return action.dueDate && action.dueDate < new Date();
        default:
          return true;
      }
    })();

    const matchesStatus =
      statusFilter === "all" || action.actionStatus === statusFilter;
    const matchesPriority =
      priorityFilter === "all" || action.priority === priorityFilter;

    return matchesSearch && matchesFilter && matchesStatus && matchesPriority;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "unhandled":
        return "bg-red-100 text-red-800";
      case "in-progress":
        return "bg-yellow-100 text-yellow-800";
      case "resolved":
        return "bg-green-100 text-green-800";
      case "dismissed":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "unhandled":
        return t("activeActions.status.unhandled");
      case "in-progress":
        return t("activeActions.status.inProgress");
      case "resolved":
        return t("activeActions.status.resolved");
      case "dismissed":
        return t("activeActions.status.dismissed");
      default:
        return t("activeActions.status.unknown", "不明");
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high":
        return "bg-red-100 text-red-800";
      case "medium":
        return "bg-yellow-100 text-yellow-800";
      case "low":
        return "bg-green-100 text-green-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getPriorityText = (priority: string) => {
    switch (priority) {
      case "high":
        return "高";
      case "medium":
        return "中";
      case "low":
        return "低";
      default:
        return "-";
    }
  };

  const handleActionClick = (action: ActiveActionItem) => {
    navigate(
      `/projects/${action.relatedProject.id}/topics/${action.relatedTopic.id}/opinions/${action.opinionId}/action`
    );
  };

  const getFilterCounts = () => {
    return {
      all: actions.length,
      overdue: actions.filter((a) => a.dueDate && a.dueDate < new Date())
        .length,
    };
  };

  const counts = getFilterCounts();

  // Analytics functions
  const getAnalyticsData = () => {
    const totalActions = actions.length;
    const unhandledActions = actions.filter(
      (a) => a.actionStatus === "unhandled"
    ).length;
    const inProgressActions = actions.filter(
      (a) => a.actionStatus === "in-progress"
    ).length;
    const resolvedActions = actions.filter(
      (a) => a.actionStatus === "resolved"
    ).length;
    const dismissedActions = actions.filter(
      (a) => a.actionStatus === "dismissed"
    ).length;

    // Priority distribution
    const highPriority = actions.filter((a) => a.priority === "high").length;
    const mediumPriority = actions.filter(
      (a) => a.priority === "medium"
    ).length;
    const lowPriority = actions.filter((a) => a.priority === "low").length;

    // Overdue analysis
    const overdueActionsFilter = actions.filter(
      (a) => a.dueDate && a.dueDate < new Date()
    );

    // Project distribution
    const projectDistribution = actions.reduce((acc, action) => {
      const projectName = action.relatedProject.name;
      acc[projectName] = (acc[projectName] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Topic distribution with detailed stats
    const topicStats = actions.reduce((acc, action) => {
      const topicKey = `${action.relatedProject.id}-${action.relatedTopic.id}`;
      if (!acc[topicKey]) {
        acc[topicKey] = {
          id: action.relatedTopic.id,
          title: action.relatedTopic.title,
          projectName: action.relatedProject.name,
          status: action.relatedTopic.status,
          count: 0
        };
      }
      acc[topicKey].count += 1;
      return acc;
    }, {} as Record<string, { id: string; title: string; projectName: string; status: string; count: number }>);

    const topicDistribution = actions.reduce((acc, action) => {
      const topicTitle = action.relatedTopic.title;
      acc[topicTitle] = (acc[topicTitle] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Average age of actions
    const now = new Date();
    const totalAge = actions.reduce((sum, action) => {
      const daysDiff = Math.floor(
        (now.getTime() - action.lastUpdated.getTime()) / (1000 * 60 * 60 * 24)
      );
      return sum + daysDiff;
    }, 0);
    const averageAge =
      totalActions > 0 ? Math.round(totalAge / totalActions) : 0;

    return {
      totalActions,
      unhandledActions,
      inProgressActions,
      resolvedActions,
      dismissedActions,
      highPriority,
      mediumPriority,
      lowPriority,
      overdueActions: overdueActionsFilter.length,
      overdueActionsList: overdueActionsFilter,
      projectDistribution,
      topicDistribution,
      topicStats: Object.values(topicStats).sort((a, b) => b.count - a.count),
      averageAge,
      completionRate:
        totalActions > 0
          ? Math.round(
              ((resolvedActions + dismissedActions) / totalActions) * 100
            )
          : 0,
      highPriorityUnhandledRate:
        highPriority > 0
          ? Math.round(
              (actions.filter(a => a.priority === 'high' && a.actionStatus === 'unhandled').length / highPriority) * 100
            )
          : 0,
      statusCounts: {
        unhandled: unhandledActions,
        inProgress: inProgressActions,
        resolved: resolvedActions,
        dismissed: dismissedActions
      },
      priorityCounts: {
        high: highPriority,
        medium: mediumPriority,
        low: lowPriority
      }
    };
  };

  // Export analytics data to CSV
  const handleExportAnalytics = () => {
    const analytics = getAnalyticsData();

    const csvContent = [
      [
        t("activeActions.analytics.csvHeader.item"),
        t("activeActions.analytics.csvHeader.value"),
      ],
      [
        t("activeActions.analytics.csvData.totalActions"),
        analytics.totalActions,
      ],
      [
        t("activeActions.analytics.csvData.unhandled"),
        analytics.unhandledActions,
      ],
      [
        t("activeActions.analytics.csvData.inProgress"),
        analytics.inProgressActions,
      ],
      [
        t("activeActions.analytics.csvData.highPriority"),
        analytics.highPriority,
      ],
      [
        t("activeActions.analytics.csvData.mediumPriority"),
        analytics.mediumPriority,
      ],
      [t("activeActions.analytics.csvData.lowPriority"), analytics.lowPriority],
      [t("activeActions.analytics.csvData.overdue"), analytics.overdueActions],
      [t("activeActions.analytics.csvData.averageAge"), analytics.averageAge],
      [
        t("activeActions.analytics.csvData.completionRate"),
        analytics.completionRate,
      ],
      ["", ""],
      [t("activeActions.analytics.csvData.projectDistribution"), ""],
      ...Object.entries(analytics.projectDistribution).map(
        ([project, count]) => [project, count]
      ),
      ["", ""],
      [t("activeActions.analytics.csvData.topicDistribution"), ""],
      ...Object.entries(analytics.topicDistribution).map(([topic, count]) => [
        topic,
        count,
      ]),
    ]
      .map((row) => row.join(","))
      .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `action_analytics_${
      new Date().toISOString().split("T")[0]
    }.csv`;
    link.click();
  };

  const analytics = getAnalyticsData();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      {/* Header */}
      <ResponsiveHeader
        breadcrumbs={[
          { label: t("breadcrumb.dashboard"), path: "/dashboard" },
          { label: t("breadcrumb.actionManagement") },
        ]}
        onOpenPurposeSettings={handleOpenPurposeModal}
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {/* Overview Info */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6 sm:p-8 mb-6 sm:mb-8">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-6">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <Activity className="h-6 w-6 text-purple-600" />
                </div>
                <div>
                  <h2 className="text-2xl sm:text-3xl font-bold text-gray-900">{t('activeActions.overview.title')}</h2>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-sm font-medium text-purple-600 bg-purple-50 px-2 py-1 rounded">
                      {t('activeActions.overview.titleBadge')}
                    </span>
                    <span className="text-xs text-gray-500">
                      {projects.length} {t('activeActions.overview.projectInfo')}
                    </span>
                  </div>
                </div>
              </div>
              <p className="text-base text-gray-600 leading-relaxed">
                {t('activeActions.overview.description')}
              </p>
              <p className="text-sm text-gray-500 mt-2">
                {t('activeActions.overview.detailedDescription')}
              </p>
            </div>
            <div className="flex gap-2">
              <div className="flex gap-2">
                <button
                  onClick={() => navigate('/dashboard')}
                  className="px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors text-sm font-semibold flex items-center"
                >
                  <Eye className="h-4 w-4 mr-1" />
                  {t('activeActions.overview.toDashboard')}
                </button>
                <div className="px-3 py-2 bg-purple-50 text-purple-700 rounded-lg text-sm font-medium flex items-center border border-purple-200">
                  <Activity className="h-4 w-4 mr-1" />
                  {t('activeActions.overview.globalMode')}
                </div>
              </div>
            </div>
          </div>
          
          {/* Stats Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-gradient-to-r from-green-50 to-green-100 rounded-xl p-4 border border-green-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-green-700 mb-1">{t('activeActions.overview.managedProjects')}</p>
                  <p className="text-2xl font-bold text-green-900">{projects.length}</p>
                  <p className="text-xs text-green-600 mt-1">{t('activeActions.overview.activeProjects')}</p>
                </div>
                <div className="p-3 bg-green-200 rounded-full">
                  <BarChart3 className="h-6 w-6 text-green-700" />
                </div>
              </div>
            </div>
            
            <div className="bg-gradient-to-r from-orange-50 to-orange-100 rounded-xl p-4 border border-orange-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-orange-700 mb-1">{t('activeActions.overview.totalActionCount')}</p>
                  <p className="text-2xl font-bold text-orange-900">{loading ? '...' : actions.length}</p>
                  <p className="text-xs text-orange-600 mt-1">{t('activeActions.overview.aggregatedFrom')}</p>
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
              <TrendingUp className="h-5 w-5 text-purple-600" />
              <h3 className="text-lg font-semibold text-gray-900">{t('activeActions.summary.globalSummary')}</h3>
              <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                {t('activeActions.summary.realtimeUpdate')}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowAnalytics(!showAnalytics)}
                className="flex items-center px-3 py-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors font-medium text-sm"
              >
                <TrendingUp className="h-4 w-4 mr-1" />
                <span className="hidden sm:inline">{t('activeActions.analysis')}</span>
              </button>
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="flex items-center px-3 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors font-medium text-sm"
              >
                <Filter className="h-4 w-4 mr-1" />
                <span className="hidden sm:inline">{t('activeActions.filter')}</span>
              </button>
            </div>
          </div>
          {loading ? (
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 sm:gap-6">
              {Array.from({ length: 5 }).map((_, index) => (
                <div key={index} className="text-center">
                  <div className="text-2xl sm:text-3xl font-bold text-gray-300 animate-pulse">
                    --
                  </div>
                  <div className="text-xs sm:text-sm text-gray-400 animate-pulse">
                    {t("common.loading", "読み込み中...")}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 sm:gap-6">
              <div className="text-center">
                <div className="text-2xl sm:text-3xl font-bold text-blue-600">
                  {counts.all}
                </div>
                <div className="text-xs sm:text-sm text-gray-600">
                  {t('activeActions.stats.totalActions')}
                </div>
                <div className="text-xs text-blue-500 mt-1">
                  {t('activeActions.stats.allProjects', { count: projects.length })}
                </div>
              </div>
              <div className="text-center">
                <div className="text-2xl sm:text-3xl font-bold text-red-600">
                  {actions.filter((a) => a.actionStatus === "unhandled").length}
                </div>
                <div className="text-xs sm:text-sm text-gray-600">
                  {t('activeActions.stats.urgentAction')}
                </div>
                <div className="text-xs text-red-500 mt-1">
                  {t('activeActions.stats.unhandledActions')}
                </div>
              </div>
              <div className="text-center">
                <div className="text-2xl sm:text-3xl font-bold text-yellow-600">
                  {actions.filter((a) => a.actionStatus === "in-progress").length}
                </div>
                <div className="text-xs sm:text-sm text-gray-600">
                  {t('activeActions.stats.activeInProgress')}
                </div>
                <div className="text-xs text-yellow-600 mt-1">
                  {t('activeActions.stats.activeActions')}
                </div>
              </div>
              <div className="text-center">
                <div className="text-2xl sm:text-3xl font-bold text-green-600">
                  {actions.filter((a) => a.actionStatus === "resolved").length}
                </div>
                <div className="text-xs sm:text-sm text-gray-600">
                  {t('activeActions.stats.completed')}
                </div>
                <div className="text-xs text-green-600 mt-1">
                  {t('activeActions.stats.resolvedActions')}
                </div>
              </div>
              <div className="text-center">
                <div className="text-2xl sm:text-3xl font-bold text-red-600">
                  {counts.overdue}
                </div>
                <div className="text-xs sm:text-sm text-gray-600">
                  {t('activeActions.stats.highPriority')}
                </div>
                <div className="text-xs text-red-500 mt-1">
                  {t('activeActions.stats.overdueStatus')}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Analytics Panel */}
        {showAnalytics && !loading && (
          <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6 mb-8">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold text-gray-900 flex items-center">
                <TrendingUp className="h-5 w-5 text-green-600 mr-2" />
                {t("activeActions.analytics.title")}
              </h3>
              <button
                onClick={handleExportAnalytics}
                className="flex items-center px-4 py-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors text-sm font-medium"
              >
                <Download className="h-4 w-4 mr-2" />
                {t("activeActions.analytics.csvExport")}
              </button>
            </div>

            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
              <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                <div className="text-center">
                  <div className="text-3xl font-bold text-blue-600">{analytics.completionRate}%</div>
                  <div className="text-sm text-blue-700 font-medium">{t("activeActions.analytics.completionRate")}</div>
                  <div className="text-xs text-blue-600 mt-1">
                    {actions.filter(a => a.actionStatus === 'resolved' || a.actionStatus === 'dismissed').length}/{actions.length}件
                  </div>
                </div>
              </div>
              <div className="bg-red-50 rounded-lg p-4 border border-red-200">
                <div className="text-center">
                  <div className="text-3xl font-bold text-red-600">{analytics.overdueActions}</div>
                  <div className="text-sm text-red-700 font-medium">{t("activeActions.analytics.overdue")}</div>
                  <div className="text-xs text-red-600 mt-1">{t("activeActions.analytics.needsAction")}</div>
                </div>
              </div>
              <div className="bg-orange-50 rounded-lg p-4 border border-orange-200">
                <div className="text-center">
                  <div className="text-3xl font-bold text-orange-600">{analytics.highPriorityUnhandledRate}%</div>
                  <div className="text-sm text-orange-700 font-medium">緊急対応率</div>
                  <div className="text-xs text-orange-600 mt-1">
                    {t('activeActions.analytics.highPriorityUnhandled')} {actions.filter(a => a.priority === 'high' && a.actionStatus === 'unhandled').length}/{analytics.priorityCounts.high}{t('common.items')}
                  </div>
                </div>
              </div>
              <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
                <div className="text-center">
                  <div className="text-3xl font-bold text-purple-600">{analytics.topicStats.length}</div>
                  <div className="text-sm text-purple-700 font-medium">横断トピック数</div>
                  <div className="text-xs text-purple-600 mt-1">管理対象トピック総数</div>
                </div>
              </div>
            </div>

            {/* Detailed Analysis */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
              {/* Status Analysis */}
              <div>
                <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <CheckCircle className="h-5 w-5 text-blue-600 mr-2" />
                  {t("activeActions.analytics.statusAnalysis")}
                </h4>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                    <div className="flex items-center">
                      <div className="w-4 h-4 bg-red-500 rounded mr-3"></div>
                      <span className="font-medium text-gray-700">{t("activeActions.stats.unhandled")}</span>
                    </div>
                    <span className="text-2xl font-bold text-red-600">{analytics.unhandledActions}</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg">
                    <div className="flex items-center">
                      <div className="w-4 h-4 bg-yellow-500 rounded mr-3"></div>
                      <span className="font-medium text-gray-700">{t("activeActions.stats.inProgress")}</span>
                    </div>
                    <span className="text-2xl font-bold text-yellow-600">{analytics.inProgressActions}</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                    <div className="flex items-center">
                      <div className="w-4 h-4 bg-green-500 rounded mr-3"></div>
                      <span className="font-medium text-gray-700">{t("activeActions.stats.resolved")}</span>
                    </div>
                    <span className="text-2xl font-bold text-green-600">
                      {actions.filter(a => a.actionStatus === 'resolved').length}
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center">
                      <div className="w-4 h-4 bg-gray-500 rounded mr-3"></div>
                      <span className="font-medium text-gray-700">{t("activeActions.analytics.dismissed")}</span>
                    </div>
                    <span className="text-2xl font-bold text-gray-600">
                      {actions.filter(a => a.actionStatus === 'dismissed').length}
                    </span>
                  </div>
                </div>
              </div>

              {/* Priority Analysis */}
              <div>
                <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <Flag className="h-5 w-5 text-red-600 mr-2" />
                  {t("activeActions.analytics.priorityAnalysis")}
                </h4>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                    <div className="flex items-center">
                      <div className="w-4 h-4 bg-red-500 rounded mr-3"></div>
                      <span className="font-medium text-gray-700">{t("activeActions.analytics.highPriority")}</span>
                    </div>
                    <span className="text-2xl font-bold text-red-600">{analytics.highPriority}</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg">
                    <div className="flex items-center">
                      <div className="w-4 h-4 bg-yellow-500 rounded mr-3"></div>
                      <span className="font-medium text-gray-700">{t("activeActions.analytics.mediumPriority")}</span>
                    </div>
                    <span className="text-2xl font-bold text-yellow-600">{analytics.mediumPriority}</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                    <div className="flex items-center">
                      <div className="w-4 h-4 bg-green-500 rounded mr-3"></div>
                      <span className="font-medium text-gray-700">{t("activeActions.analytics.lowPriority")}</span>
                    </div>
                    <span className="text-2xl font-bold text-green-600">{analytics.lowPriority}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Status Distribution */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-3 flex items-center">
                  <TrendingUp className="h-4 w-4 mr-1" />
                  {t("activeActions.analytics.statusDistribution")}
                </h4>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">
                      {t("activeActions.analytics.unhandled")}
                    </span>
                    <div className="flex items-center gap-2">
                      <div className="w-20 bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-red-500 h-2 rounded-full"
                          style={{
                            width: `${
                              analytics.totalActions > 0
                                ? (analytics.unhandledActions /
                                    analytics.totalActions) *
                                  100
                                : 0
                            }%`,
                          }}
                        ></div>
                      </div>
                      <span className="text-sm font-medium">
                        {analytics.unhandledActions}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">
                      {t("activeActions.analytics.inProgress")}
                    </span>
                    <div className="flex items-center gap-2">
                      <div className="w-20 bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-yellow-500 h-2 rounded-full"
                          style={{
                            width: `${
                              analytics.totalActions > 0
                                ? (analytics.inProgressActions /
                                    analytics.totalActions) *
                                  100
                                : 0
                            }%`,
                          }}
                        ></div>
                      </div>
                      <span className="text-sm font-medium">
                        {analytics.inProgressActions}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-3 flex items-center">
                  <Flag className="h-4 w-4 mr-1" />
                  {t("activeActions.analytics.priorityDistribution")}
                </h4>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">{t("activeActions.analytics.highPriority")}</span>
                    <div className="flex items-center gap-2">
                      <div className="w-20 bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-red-500 h-2 rounded-full"
                          style={{
                            width: `${
                              analytics.totalActions > 0
                                ? (analytics.highPriority /
                                    analytics.totalActions) *
                                  100
                                : 0
                            }%`,
                          }}
                        ></div>
                      </div>
                      <span className="text-sm font-medium">
                        {analytics.highPriority}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">{t("activeActions.analytics.mediumPriority")}</span>
                    <div className="flex items-center gap-2">
                      <div className="w-20 bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-yellow-500 h-2 rounded-full"
                          style={{
                            width: `${
                              analytics.totalActions > 0
                                ? (analytics.mediumPriority /
                                    analytics.totalActions) *
                                  100
                                : 0
                            }%`,
                          }}
                        ></div>
                      </div>
                      <span className="text-sm font-medium">
                        {analytics.mediumPriority}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">{t("activeActions.analytics.lowPriority")}</span>
                    <div className="flex items-center gap-2">
                      <div className="w-20 bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-green-500 h-2 rounded-full"
                          style={{
                            width: `${
                              analytics.totalActions > 0
                                ? (analytics.lowPriority /
                                    analytics.totalActions) *
                                  100
                                : 0
                            }%`,
                          }}
                        ></div>
                      </div>
                      <span className="text-sm font-medium">
                        {analytics.lowPriority}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Topic Analysis */}
            {analytics.topicStats.length > 0 && (
              <div className="mt-8">
                <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <Target className="h-5 w-5 text-purple-600 mr-2" />
                  {t("activeActions.analytics.topProjects")}
                </h4>
                <div className="bg-gray-50 rounded-lg p-4 max-h-80 overflow-y-auto">
                  <div className="space-y-2">
                    {analytics.topicStats.slice(0, 10).map((topic, index) => (
                      <div key={`${topic.id}-${topic.projectName}`} className="flex items-center justify-between p-3 bg-white rounded shadow-sm">
                        <div className="flex items-center min-w-0 flex-1">
                          <div className="flex-shrink-0 w-6 h-6 bg-purple-100 rounded-full flex items-center justify-center mr-3">
                            <span className="text-xs font-bold text-purple-700">{index + 1}</span>
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="font-medium text-gray-900 truncate">{topic.title}</p>
                            <p className="text-xs text-gray-500 truncate">
                              {topic.projectName} • 
                              <span className={`ml-1 px-2 py-1 rounded text-xs font-medium ${
                                topic.status === 'resolved' ? 'bg-green-100 text-green-800' :
                                topic.status === 'in-progress' ? 'bg-yellow-100 text-yellow-800' :
                                'bg-red-100 text-red-800'
                              }`}>
                                {topic.status === 'resolved' ? t('activeActions.status.resolved') :
                                 topic.status === 'in-progress' ? t('activeActions.status.inProgress') : t('activeActions.status.unhandled')}
                              </span>
                            </p>
                          </div>
                        </div>
                        <div className="text-right ml-4">
                          <div className="text-xl font-bold text-purple-600">{topic.count}</div>
                          <div className="text-xs text-gray-500">{t("activeActions.analytics.itemsUnit")}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                {analytics.topicStats.length > 10 && (
                  <p className="text-sm text-gray-600 mt-3 text-center">
                    他{analytics.topicStats.length - 10}件のトピック
                  </p>
                )}
              </div>
            )}

            {/* Overdue Actions Analysis */}
            {analytics.overdueActionsList.length > 0 && (
              <div className="mt-8">
                <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <AlertTriangle className="h-5 w-5 text-red-600 mr-2" />
                  期限超過アクション詳細
                </h4>
                <div className="bg-red-50 rounded-lg p-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-red-600">{analytics.overdueActionsList.length}</div>
                      <div className="text-sm text-red-700">期限超過</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-red-600">
                        {analytics.overdueActionsList.filter(a => a.priority === 'high').length}
                      </div>
                      <div className="text-sm text-red-700">高優先度</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-red-600">
                        {Math.round(
                          analytics.overdueActionsList.reduce((sum, action) => {
                            const daysDiff = Math.floor(
                              (new Date().getTime() - (action.dueDate?.getTime() || 0)) / (1000 * 60 * 60 * 24)
                            );
                            return sum + daysDiff;
                          }, 0) / analytics.overdueActionsList.length
                        )}
                      </div>
                      <div className="text-sm text-red-700">平均遅延日数</div>
                    </div>
                  </div>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {analytics.overdueActionsList.slice(0, 5).map((action) => {
                      const daysOverdue = action.dueDate 
                        ? Math.floor((new Date().getTime() - action.dueDate.getTime()) / (1000 * 60 * 60 * 24))
                        : 0;
                      return (
                        <div key={action.id} className="bg-white rounded p-3 shadow-sm">
                          <div className="flex items-start justify-between">
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-gray-900 truncate">{action.taskDescription}</p>
                              <p className="text-sm text-gray-500">
                                {action.relatedProject.name} • {action.relatedTopic.title}
                              </p>
                            </div>
                            <div className="text-right ml-4">
                              <div className={`text-sm font-medium px-2 py-1 rounded ${getPriorityColor(action.priority)}`}>
                                {getPriorityText(action.priority)}
                              </div>
                              <div className="text-xs text-red-600 mt-1">
                                {daysOverdue}日遅延
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  {analytics.overdueActionsList.length > 5 && (
                    <p className="text-sm text-red-700 mt-3 text-center">
                      他{analytics.overdueActionsList.length - 5}件の期限超過アクション
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Top Projects and Topics */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-medium text-gray-700">
                    {t("activeActions.analytics.projectDistribution")}
                  </h4>
                  {Object.entries(analytics.projectDistribution).length > 5 && (
                    <button
                      onClick={() => setShowAllProjects(!showAllProjects)}
                      className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                    >
                      {showAllProjects
                        ? t("activeActions.analytics.collapse")
                        : t("activeActions.analytics.showAllWithCount").replace(
                            "{count}",
                            Object.entries(
                              analytics.projectDistribution
                            ).length.toString()
                          )}
                    </button>
                  )}
                </div>
                <div
                  className={`space-y-2 ${
                    showAllProjects ? "max-h-64 overflow-y-auto" : ""
                  }`}
                >
                  {Object.entries(analytics.projectDistribution)
                    .sort(([, a], [, b]) => b - a)
                    .slice(0, showAllProjects ? undefined : 5)
                    .map(([project, count]) => (
                      <div
                        key={project}
                        className="flex items-center justify-between text-sm"
                      >
                        <span
                          className="text-gray-600 truncate"
                          title={project}
                        >
                          {project}
                        </span>
                        <span className="font-medium">{count}{t("activeActions.analytics.itemsUnit")}</span>
                      </div>
                    ))}
                </div>
                {showAllProjects &&
                  Object.entries(analytics.projectDistribution).length > 10 && (
                    <div className="mt-2 text-xs text-gray-500 text-center">
                      {t("activeActions.analytics.scrollToSeeAll").replace(
                        "{count}",
                        Object.entries(
                          analytics.projectDistribution
                        ).length.toString()
                      )}
                    </div>
                  )}
              </div>

              <div>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-medium text-gray-700">
                    {t("activeActions.analytics.topicDistribution")}
                  </h4>
                  {Object.entries(analytics.topicDistribution).length > 5 && (
                    <button
                      onClick={() => setShowAllTopics(!showAllTopics)}
                      className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                    >
                      {showAllTopics
                        ? t("activeActions.analytics.collapse")
                        : t("activeActions.analytics.showAllWithCount").replace(
                            "{count}",
                            Object.entries(
                              analytics.topicDistribution
                            ).length.toString()
                          )}
                    </button>
                  )}
                </div>
                <div
                  className={`space-y-2 ${
                    showAllTopics ? "max-h-64 overflow-y-auto" : ""
                  }`}
                >
                  {Object.entries(analytics.topicDistribution)
                    .sort(([, a], [, b]) => b - a)
                    .slice(0, showAllTopics ? undefined : 5)
                    .map(([topic, count]) => (
                      <div
                        key={topic}
                        className="flex items-center justify-between text-sm"
                      >
                        <span className="text-gray-600 truncate" title={topic}>
                          {topic}
                        </span>
                        <span className="font-medium">
                          {count}
                          {t("activeActions.analytics.itemsUnit")}
                        </span>
                      </div>
                    ))}
                </div>
                {showAllTopics &&
                  Object.entries(analytics.topicDistribution).length > 10 && (
                    <div className="mt-2 text-xs text-gray-500 text-center">
                      {t("activeActions.analytics.scrollToSeeAll").replace(
                        "{count}",
                        Object.entries(
                          analytics.topicDistribution
                        ).length.toString()
                      )}
                    </div>
                  )}
              </div>
            </div>
          </div>
        )}

        {/* Filters */}
        {showFilters && !loading && (
          <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-4 sm:p-6 mb-6 sm:mb-8">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Search */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Search className="h-4 w-4 inline mr-1" />
                  {t("activeActions.filters.search")}
                </label>
                <input
                  type="text"
                  placeholder={t("activeActions.filters.searchPlaceholder")}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                />
              </div>

              {/* Special Filters */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Clock className="h-4 w-4 inline mr-1" />
                  {t("activeActions.filters.specialConditions")}
                </label>
                <select
                  value={filterOption}
                  onChange={(e) =>
                    setFilterOption(e.target.value as FilterOption)
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                >
                  <option value="all">
                    {t("activeActions.filters.all")} ({counts.all})
                  </option>
                  <option value="overdue">
                    {t("activeActions.filters.overdueShort")} ({counts.overdue})
                  </option>
                </select>
              </div>

              {/* Status Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Settings className="h-4 w-4 inline mr-1" />
                  {t("activeActions.filters.status")}
                </label>
                <select
                  value={statusFilter}
                  onChange={(e) =>
                    setStatusFilter(e.target.value as StatusFilter)
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                >
                  <option value="all">{t("activeActions.status.all")}</option>
                  <option value="unhandled">
                    {t("activeActions.status.unhandled")}
                  </option>
                  <option value="in-progress">
                    {t("activeActions.status.inProgress")}
                  </option>
                  <option value="resolved">
                    {t("activeActions.status.resolved")}
                  </option>
                  <option value="dismissed">
                    {t("activeActions.status.dismissed")}
                  </option>
                </select>
              </div>

              {/* Priority Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Flag className="h-4 w-4 inline mr-1" />
                  {t("activeActions.filters.priority")}
                </label>
                <select
                  value={priorityFilter}
                  onChange={(e) =>
                    setPriorityFilter(e.target.value as PriorityFilter)
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                >
                  <option value="all">{t("activeActions.priority.all")}</option>
                  <option value="high">
                    {t("activeActions.priority.high")}
                  </option>
                  <option value="medium">
                    {t("activeActions.priority.medium")}
                  </option>
                  <option value="low">{t("activeActions.priority.low")}</option>
                </select>
              </div>
            </div>

            <div className="mt-4 text-xs sm:text-sm text-gray-600">
              {filteredActions.length}
              {t("activeActions.filters.actionsFound")}
            </div>
          </div>
        )}

        {/* Actions List */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-100">
          {loading ? (
            <div className="text-center py-12 sm:py-16">
              <div className="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4"></div>
              <p className="text-sm text-gray-600">{t("common.loading", "読み込み中...")}</p>
            </div>
          ) : error ? (
            <div className="text-center py-12 sm:py-16">
              <div className="h-12 w-12 text-red-500 mx-auto mb-4">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.966-.833-2.732 0L4.732 15.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">{t("common.error", "エラー")}</h3>
              <p className="text-sm text-gray-600 mb-4">{error}</p>
              <button
                onClick={() => window.location.reload()}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
              >
                {t("common.retry", "再試行")}
              </button>
            </div>
          ) : filteredActions.length > 0 ? (
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
                          <span className="hidden sm:inline">
                            {action.lastUpdated.toLocaleString("ja-JP")}
                          </span>
                          <span className="sm:hidden">
                            {action.lastUpdated.toLocaleDateString("ja-JP")}
                          </span>
                        </div>
                        <span
                          className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(
                            action.actionStatus
                          )}`}
                        >
                          {getStatusText(action.actionStatus)}
                        </span>
                        <span
                          className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(
                            action.priority
                          )}`}
                        >
                          <Flag className="h-3 w-3 mr-1" />
                          {getPriorityText(action.priority)}
                        </span>
                        {action.dueDate && (
                          <div className="flex items-center text-xs sm:text-sm text-red-600">
                            <Calendar className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                            <span className="hidden sm:inline">
                              {t("activeActions.actions.dueDate")}:{" "}
                              {action.dueDate.toLocaleDateString("ja-JP")}
                            </span>
                            <span className="sm:hidden">
                              {action.dueDate.toLocaleDateString("ja-JP")}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Content */}
                      <div className="text-gray-800 leading-relaxed text-sm sm:text-base mb-3">
                        <div className="overflow-hidden text-ellipsis">
                          {action.taskDescription}
                        </div>
                      </div>

                      {/* Meta Information */}
                      <div className="flex flex-wrap items-center gap-3 sm:gap-4 text-xs sm:text-sm text-gray-500">
                        <div className="flex items-center">
                          <Target className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                          <span className="hidden sm:inline">
                            {t("activeActions.actions.project")}:{" "}
                          </span>
                          <span className="sm:hidden">P: </span>
                          {action.relatedProject.name}
                        </div>
                        <div className="flex items-center">
                          <Settings className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                          <span className="hidden sm:inline">
                            {t("activeActions.actions.topic")}:{" "}
                          </span>
                          <span className="sm:hidden">T: </span>
                          {action.relatedTopic.title}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-end sm:justify-start">
                      <button
                        className="px-3 py-1.5 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors text-xs font-medium flex items-center"
                        title={t("activeActions.actions.openActionManagement")}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleActionClick(action);
                        }}
                      >
                        <Eye className="h-3 w-3 mr-1" />
                        {t("activeActions.actions.details")}
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
                {t("activeActions.emptyState.title")}
              </h3>
              <p className="text-sm sm:text-base text-gray-600 px-4">
                {searchTerm ||
                filterOption !== "all" ||
                statusFilter !== "all" ||
                priorityFilter !== "all"
                  ? t("activeActions.emptyState.noMatchingActions")
                  : t("activeActions.emptyState.allCompleted")}
              </p>
            </div>
          )}
        </div>
      </main>

      {/* User Purpose Modal */}
      <UserPurposeModal
        isOpen={showPurposeModal}
        onClose={() => setShowPurposeModal(false)}
      />

    </div>
  );
}
