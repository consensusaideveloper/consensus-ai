import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  BarChart3,
  Calendar,
  CheckCircle,
  Clock,
  Download,
  Shield,
  Target,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useLanguage } from "../hooks/useLanguage";
import { useProjects } from "../hooks/useProjects";
import { useTopicStatus } from "../hooks/useTopicStatus";
import { auditService } from "../services/auditService";
import { AccountMenu } from "./AccountMenu";

interface DashboardData {
  projectStats: {
    total: number;
    byStatus: Record<string, number>;
    completionRate: number;
    averageTopicsPerProject: number;
  };
  topicStats: {
    total: number;
    byStatus: Record<string, number>;
    byPriority: Record<string, number>;
    resolutionRate: number;
    bottlenecks: Array<{
      id: string;
      title: string;
      daysStagnant: number;
      priority: string;
    }>;
  };
  workloadStats: {
    byUser: Record<
      string,
      {
        assigned: number;
        completed: number;
        overdue: number;
      }
    >;
    totalActions: number;
    completedActions: number;
  };
  performanceMetrics: {
    averageResolutionTime: number;
    productivityTrend: Array<{
      date: string;
      completed: number;
      started: number;
    }>;
    qualityScore: number;
  };
  riskIndicators: {
    stalledTopics: number;
    overdueActions: number;
    suspiciousActivity: number;
    resourceBottlenecks: string[];
  };
}

interface EnhancedDashboardProps {
  projectId?: string; // 特定プロジェクトのダッシュボードの場合
}

export function EnhancedDashboard({ projectId }: EnhancedDashboardProps) {
  const navigate = useNavigate();
  const { id: routeProjectId } = useParams<{ id: string }>();
  const actualProjectId = projectId || routeProjectId;
  const { t } = useLanguage();

  const [dashboardData, setDashboardData] = useState<DashboardData | null>(
    null
  );
  const [timeRange, setTimeRange] = useState<"7d" | "30d" | "90d">("30d");
  const [isLoading, setIsLoading] = useState(true);

  const { projects } = useProjects();
  const { topics } = useTopicStatus(actualProjectId);

  const loadDashboardData = useCallback(async () => {
    setIsLoading(true);

    try {
      // プロジェクト統計
      const projectStats = calculateProjectStats();

      // トピック統計
      const topicStats = await calculateTopicStats();

      // 作業負荷統計
      const workloadStats = calculateWorkloadStats();

      // パフォーマンス指標
      const performanceMetrics = calculatePerformanceMetrics();

      // リスク指標
      const riskIndicators = calculateRiskIndicators();

      setDashboardData({
        projectStats,
        topicStats,
        workloadStats,
        performanceMetrics,
        riskIndicators,
      });
    } catch {
      // Failed to load dashboard data
    } finally {
      setIsLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeRange, actualProjectId, projects, topics]);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  const calculateProjectStats = () => {
    const filteredProjects = actualProjectId
      ? projects.filter((p) => p.id === actualProjectId)
      : projects;

    const byStatus: Record<string, number> = {};
    let totalTopics = 0;

    filteredProjects.forEach((project) => {
      byStatus[project.status] = (byStatus[project.status] || 0) + 1;
      if (project.analysis?.topInsights) {
        totalTopics += project.analysis.topInsights.length;
      }
    });

    const completedProjects = byStatus["completed"] || 0;
    const completionRate =
      filteredProjects.length > 0
        ? (completedProjects / filteredProjects.length) * 100
        : 0;

    const averageTopicsPerProject =
      filteredProjects.length > 0 ? totalTopics / filteredProjects.length : 0;

    return {
      total: filteredProjects.length,
      byStatus,
      completionRate,
      averageTopicsPerProject,
    };
  };

  const calculateTopicStats = async () => {
    const byStatus: Record<string, number> = {};
    const byPriority: Record<string, number> = {};
    const bottlenecks: Array<{
      id: string;
      title: string;
      daysStagnant: number;
      priority: string;
    }> = [];

    topics.forEach((topic) => {
      byStatus[topic.status] = (byStatus[topic.status] || 0) + 1;

      const priority = topic.priority?.level || "low";
      byPriority[priority] = (byPriority[priority] || 0) + 1;

      // ボトルネック検出（30日以上更新されていないトピック）
      const daysSinceUpdate = Math.floor(
        (Date.now() - topic.updatedAt) / (1000 * 60 * 60 * 24)
      );
      if (
        daysSinceUpdate > 30 &&
        (topic.status === "unhandled" || topic.status === "in-progress")
      ) {
        bottlenecks.push({
          id: topic.id,
          title: topic.title,
          daysStagnant: daysSinceUpdate,
          priority: priority,
        });
      }
    });

    const resolvedCount = byStatus["resolved"] || 0;
    const resolutionRate =
      topics.length > 0 ? (resolvedCount / topics.length) * 100 : 0;

    return {
      total: topics.length,
      byStatus,
      byPriority,
      resolutionRate,
      bottlenecks,
    };
  };

  const calculateWorkloadStats = () => {
    // 実際の実装では、プロジェクトから担当者データを取得
    const byUser: Record<
      string,
      { assigned: number; completed: number; overdue: number }
    > = {};

    // プロジェクトとトピックから作業負荷を計算
    const relevantProjects = actualProjectId
      ? projects.filter((p) => p.id === actualProjectId)
      : projects;

    relevantProjects.forEach((project) => {
      // タスクがある場合は集計
      if (project.tasks) {
        project.tasks.forEach((task) => {
          const assignee = "システム"; // 実際の実装では task.assignee を使用
          if (!byUser[assignee]) {
            byUser[assignee] = { assigned: 0, completed: 0, overdue: 0 };
          }

          byUser[assignee].assigned++;
          if (task.status === "completed") {
            byUser[assignee].completed++;
          }
          if (task.status === "pending" && task.dueDate < new Date()) {
            byUser[assignee].overdue++;
          }
        });
      }
    });

    // トピックも集計
    topics.forEach((topic) => {
      const assignee = topic.priority?.assignee || "システム";
      if (!byUser[assignee]) {
        byUser[assignee] = { assigned: 0, completed: 0, overdue: 0 };
      }

      byUser[assignee].assigned++;
      if (topic.status === "resolved" || topic.status === "dismissed") {
        byUser[assignee].completed++;
      }
    });

    // デフォルトデータがない場合はサンプルデータを表示
    if (Object.keys(byUser).length === 0) {
      byUser["システム"] = {
        assigned: topics.length,
        completed: topics.filter((t) => t.status === "resolved").length,
        overdue: 0,
      };
    }

    const totalActions = Object.values(byUser).reduce(
      (sum, user) => sum + user.assigned,
      0
    );
    const completedActions = Object.values(byUser).reduce(
      (sum, user) => sum + user.completed,
      0
    );

    return {
      byUser,
      totalActions,
      completedActions,
    };
  };

  const calculatePerformanceMetrics = () => {
    // 解決済みトピックの平均解決時間を計算
    const resolvedTopics = topics.filter(
      (t) => t.status === "resolved" || t.status === "dismissed"
    );
    let averageResolutionTime = 0;

    if (resolvedTopics.length > 0) {
      const totalResolutionTime = resolvedTopics.reduce((sum, topic) => {
        const resolutionTime =
          (topic.updatedAt - topic.createdAt) / (1000 * 60 * 60 * 24); // 日数
        return sum + resolutionTime;
      }, 0);
      averageResolutionTime = totalResolutionTime / resolvedTopics.length;
    }

    // 過去7日間の生産性トレンド（簡略化）
    const productivityTrend = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split("T")[0];

      // その日に更新されたトピック数（完了・開始）
      const dayUpdated = topics.filter((t) => {
        const updateDate = new Date(t.updatedAt).toISOString().split("T")[0];
        return updateDate === dateStr;
      });

      const completed = dayUpdated.filter(
        (t) => t.status === "resolved" || t.status === "dismissed"
      ).length;
      const started = dayUpdated.filter(
        (t) => t.status === "in-progress"
      ).length;

      productivityTrend.push({
        date: dateStr,
        completed,
        started,
      });
    }

    // 品質スコア（解決率に基づく）
    const qualityScore =
      topics.length > 0
        ? Math.round((resolvedTopics.length / topics.length) * 100)
        : 85;

    return {
      averageResolutionTime: Math.round(averageResolutionTime * 10) / 10,
      productivityTrend,
      qualityScore,
    };
  };

  const calculateRiskIndicators = () => {
    const auditSummary = auditService.generateAuditSummary(
      actualProjectId,
      "project"
    );

    // 停滞トピック（30日以上更新されていない未解決トピック）
    const stalledTopics = topics.filter((topic) => {
      const daysSinceUpdate =
        (Date.now() - topic.updatedAt) / (1000 * 60 * 60 * 24);
      return (
        daysSinceUpdate > 30 &&
        (topic.status === "unhandled" || topic.status === "in-progress")
      );
    }).length;

    // 期限切れアクション（プロジェクトタスクから計算）
    const relevantProjects = actualProjectId
      ? projects.filter((p) => p.id === actualProjectId)
      : projects;

    const overdueActions = relevantProjects.reduce((count, project) => {
      if (project.tasks) {
        return (
          count +
          project.tasks.filter(
            (task) => task.status !== "completed" && task.dueDate < new Date()
          ).length
        );
      }
      return count;
    }, 0);

    // リソースボトルネック
    const resourceBottlenecks: string[] = [];
    if (topics.filter((t) => !t.priority).length > topics.length * 0.3) {
      resourceBottlenecks.push("優先度設定遅延");
    }
    if (stalledTopics > 0) {
      resourceBottlenecks.push("停滞解決遅延");
    }
    if (
      topics.filter((t) => t.status === "unhandled").length >
      topics.length * 0.5
    ) {
      resourceBottlenecks.push("未対応トピック蓄積");
    }

    return {
      stalledTopics,
      overdueActions,
      suspiciousActivity: auditSummary.suspiciousActivity.length,
      resourceBottlenecks,
    };
  };

  const getTimeRangeText = (range: string) => {
    switch (range) {
      case "7d":
        return t("enhancedDashboard.filters.last7Days");
      case "30d":
        return t("enhancedDashboard.filters.last30Days");
      case "90d":
        return t("enhancedDashboard.filters.last90Days");
      default:
        return t("enhancedDashboard.filters.last30Days");
    }
  };

  const COLORS = ["#3B82F6", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6"];

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">ダッシュボードデータを読み込み中...</p>
        </div>
      </div>
    );
  }

  if (!dashboardData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <p className="text-gray-600">
            ダッシュボードデータの読み込みに失敗しました
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <button
                onClick={() =>
                  navigate(
                    actualProjectId
                      ? `/projects/${actualProjectId}`
                      : "/dashboard"
                  )
                }
                className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                title="戻る"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
              <div className="flex items-center gap-3">
                <BarChart3 className="h-6 w-6 text-blue-600" />
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
                  {actualProjectId ? "プロジェクト" : "システム全体"}
                  ダッシュボード
                </h1>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <select
                value={timeRange}
                onChange={(e) =>
                  setTimeRange(e.target.value as "7d" | "30d" | "90d")
                }
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              >
                <option value="7d">
                  {t("enhancedDashboard.filters.last7Days")}
                </option>
                <option value="30d">
                  {t("enhancedDashboard.filters.last30Days")}
                </option>
                <option value="90d">
                  {t("enhancedDashboard.filters.last90Days")}
                </option>
              </select>
              <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium flex items-center gap-2">
                <Download className="h-4 w-4" />
                レポート出力
              </button>
              <AccountMenu />
            </div>
          </div>
          <p className="text-gray-600">
            {getTimeRangeText(timeRange)}のデータを表示しています
            {actualProjectId && (
              <span className="ml-2 px-2 py-1 bg-blue-100 text-blue-700 rounded-lg text-sm">
                プロジェクト:{" "}
                {projects.find((p) => p.id === actualProjectId)?.name ||
                  "Unknown"}
              </span>
            )}
          </p>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* システム全体表示時のみプロジェクト完了率を表示 */}
          {!actualProjectId && (
            <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">
                    {t("enhancedDashboard.projectStats.completionRate")}
                  </p>
                  <p className="text-2xl font-bold text-blue-600">
                    {dashboardData.projectStats.completionRate.toFixed(1)}%
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {dashboardData.projectStats.byStatus["completed"] || 0} /{" "}
                    {dashboardData.projectStats.total} プロジェクト
                  </p>
                </div>
                <Target className="h-8 w-8 text-blue-600" />
              </div>
            </div>
          )}

          {/* プロジェクト単体表示時のみ総意見数を表示 */}
          {actualProjectId && (
            <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">
                    {t("enhancedDashboard.performanceMetrics.totalOpinions")}
                  </p>
                  <p className="text-2xl font-bold text-blue-600">
                    {projects.find((p) => p.id === actualProjectId)
                      ?.opinionsCount || 0}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {t(
                      "enhancedDashboard.performanceMetrics.totalOpinionsDescription"
                    )}
                  </p>
                </div>
                <Target className="h-8 w-8 text-blue-600" />
              </div>
            </div>
          )}

          <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  {t("enhancedDashboard.topicStats.resolutionRate")}
                </p>
                <p className="text-2xl font-bold text-green-600">
                  {dashboardData.topicStats.resolutionRate.toFixed(1)}%
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {dashboardData.topicStats.byStatus["resolved"] || 0} +{" "}
                  {dashboardData.topicStats.byStatus["dismissed"] || 0} /{" "}
                  {dashboardData.topicStats.total} トピック
                </p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  対応中トピック
                </p>
                <p className="text-2xl font-bold text-yellow-600">
                  {dashboardData.topicStats.byStatus["in-progress"] || 0}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  現在対応中のトピック数
                </p>
              </div>
              <Activity className="h-8 w-8 text-yellow-600" />
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  未対応トピック
                </p>
                <p className="text-2xl font-bold text-red-600">
                  {dashboardData.topicStats.byStatus["unhandled"] || 0}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  対応が必要なトピック数
                </p>
              </div>
              <AlertTriangle className="h-8 w-8 text-red-600" />
            </div>
          </div>
        </div>

        {/* Risk Indicators */}
        {(dashboardData.riskIndicators.stalledTopics > 0 ||
          dashboardData.riskIndicators.overdueActions > 0 ||
          dashboardData.riskIndicators.suspiciousActivity > 0) && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-8">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5" />
              <div className="flex-1">
                <h3 className="font-semibold text-red-900 mb-2">
                  注意が必要な項目
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  {dashboardData.riskIndicators.stalledTopics > 0 && (
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-red-600" />
                      <span className="text-red-800">
                        停滞トピック:{" "}
                        {dashboardData.riskIndicators.stalledTopics}件
                      </span>
                    </div>
                  )}
                  {dashboardData.riskIndicators.overdueActions > 0 && (
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-red-600" />
                      <span className="text-red-800">
                        期限切れアクション:{" "}
                        {dashboardData.riskIndicators.overdueActions}件
                      </span>
                    </div>
                  )}
                  {dashboardData.riskIndicators.suspiciousActivity > 0 &&
                    !actualProjectId && (
                      <div className="flex items-center gap-2">
                        <Shield className="h-4 w-4 text-red-600" />
                        <span className="text-red-800">
                          要注意活動:{" "}
                          {dashboardData.riskIndicators.suspiciousActivity}件
                        </span>
                      </div>
                    )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* システム全体表示時のみプロジェクト状況分布を表示 */}
          {!actualProjectId && (
            <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                {t("enhancedDashboard.charts.projectStatusDistribution")}
              </h3>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={Object.entries(
                      dashboardData.projectStats.byStatus
                    ).map(([status, count]) => ({
                      name:
                        status === "collecting"
                          ? t("dashboard.status.collecting")
                          : status === "analyzing"
                          ? t("dashboard.status.processing")
                          : status === "processing"
                          ? t("dashboard.status.processing")
                          : status === "completed"
                          ? t("dashboard.status.completed")
                          : status === "active"
                          ? t("dashboard.tabs.active")
                          : status === "archived"
                          ? t("dashboard.tabs.archive")
                          : status,
                      value: count,
                    }))}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, value }) => `${name}: ${value}`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {Object.entries(dashboardData.projectStats.byStatus).map(
                      (_, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={COLORS[index % COLORS.length]}
                        />
                      )
                    )}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* プロジェクト単体表示時のみプロジェクト進捗サマリを表示 */}
          {actualProjectId &&
            (() => {
              const project = projects.find((p) => p.id === actualProjectId);
              if (!project) return null;

              // 意見収集からの経過日数
              const createdDate = new Date(project.createdAt);
              const daysSinceCreated = Math.floor(
                (Date.now() - createdDate.getTime()) / (1000 * 60 * 60 * 24)
              );

              // 最新のトピック更新日
              const latestTopicUpdate = topics.reduce((latest, topic) => {
                const topicDate = new Date(topic.updatedAt);
                return topicDate > latest ? topicDate : latest;
              }, new Date(0));

              const daysSinceLastUpdate = Math.floor(
                (Date.now() - latestTopicUpdate.getTime()) /
                  (1000 * 60 * 60 * 24)
              );

              return (
                <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    プロジェクト進捗サマリ
                  </h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-5 w-5 text-blue-600" />
                        <span className="text-sm font-medium text-blue-900">
                          プロジェクト開始から
                        </span>
                      </div>
                      <span className="text-lg font-bold text-blue-600">
                        {daysSinceCreated}日経過
                      </span>
                    </div>

                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-2">
                        <Clock className="h-5 w-5 text-gray-600" />
                        <span className="text-sm font-medium text-gray-900">
                          最終更新から
                        </span>
                      </div>
                      <span
                        className={`text-lg font-bold ${
                          daysSinceLastUpdate > 7
                            ? "text-red-600"
                            : "text-gray-600"
                        }`}
                      >
                        {daysSinceLastUpdate}日経過
                      </span>
                    </div>

                    <div className="border-t pt-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">
                          全体進捗率
                        </span>
                        <span className="text-lg font-bold text-green-600">
                          {Math.round(
                            (((dashboardData.topicStats.byStatus["resolved"] ||
                              0) +
                              (dashboardData.topicStats.byStatus[
                                "in-progress"
                              ] || 0)) /
                              dashboardData.topicStats.total) *
                              100
                          )}
                          %
                        </span>
                      </div>
                      <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-gradient-to-r from-green-500 to-blue-500 h-2 rounded-full transition-all duration-300"
                          style={{
                            width: `${Math.round(
                              (((dashboardData.topicStats.byStatus[
                                "resolved"
                              ] || 0) +
                                (dashboardData.topicStats.byStatus[
                                  "in-progress"
                                ] || 0)) /
                                dashboardData.topicStats.total) *
                                100
                            )}%`,
                          }}
                        ></div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()}

          {/* Topic Status Distribution */}
          <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              トピック状況分布
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart
                data={Object.entries(dashboardData.topicStats.byStatus).map(
                  ([status, count]) => ({
                    status:
                      status === "unhandled"
                        ? t('enhancedDashboard.actionStats.unhandled')
                        : status === "in-progress"
                        ? t('enhancedDashboard.actionStats.inProgress')
                        : status === "resolved"
                        ? t('enhancedDashboard.actionStats.resolved')
                        : status === "dismissed"
                        ? t('enhancedDashboard.actionStats.dismissed')
                        : status,
                    count,
                  })
                )}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="status" />
                <YAxis />
                <Tooltip formatter={(value) => [`${value}件`, "トピック数"]} />
                <Bar dataKey="count" fill="#3B82F6" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Topic Priority Distribution */}
          <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              トピック優先度分布
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={Object.entries(dashboardData.topicStats.byPriority).map(
                    ([priority, count]) => ({
                      name:
                        priority === "high"
                          ? "高優先度"
                          : priority === "medium"
                          ? "中優先度"
                          : priority === "low"
                          ? "低優先度"
                          : priority,
                      value: count,
                      color:
                        priority === "high"
                          ? "#EF4444"
                          : priority === "medium"
                          ? "#F59E0B"
                          : "#10B981",
                    })
                  )}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {Object.entries(dashboardData.topicStats.byPriority).map(
                    ([priority], index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={
                          priority === "high"
                            ? "#EF4444"
                            : priority === "medium"
                            ? "#F59E0B"
                            : "#10B981"
                        }
                      />
                    )
                  )}
                </Pie>
                <Tooltip formatter={(value, name) => [`${value}件`, name]} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* プロジェクト単体表示時のみアクション管理状況を表示 */}
        {actualProjectId &&
          (() => {
            const project = projects.find((p) => p.id === actualProjectId);
            const actionStats = {
              total: 0,
              unhandled: 0,
              inProgress: 0,
              resolved: 0,
              dismissed: 0,
            };

            if (project?.analysis?.topInsights) {
              project.analysis.topInsights.forEach((topic) => {
                if (topic.opinions && Array.isArray(topic.opinions)) {
                  topic.opinions.forEach((opinion: { id: string }) => {
                    const storedData = localStorage.getItem(
                      `responseAction_${opinion.id}`
                    );
                    if (storedData) {
                      try {
                        const actionData = JSON.parse(storedData);
                        if (actionData.actionStatus) {
                          actionStats.total++;
                          switch (actionData.actionStatus) {
                            case "unhandled":
                              actionStats.unhandled++;
                              break;
                            case "in-progress":
                              actionStats.inProgress++;
                              break;
                            case "resolved":
                              actionStats.resolved++;
                              break;
                            case "dismissed":
                              actionStats.dismissed++;
                              break;
                          }
                        }
                      } catch {
                        // JSON parse エラーは無視
                      }
                    }
                  });
                }
              });
            }

            return actionStats.total > 0 ? (
              <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6 mb-8">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  アクション管理状況
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                  <div className="text-center p-3 bg-gray-50 rounded-lg">
                    <div className="text-2xl font-bold text-gray-700">
                      {actionStats.total}
                    </div>
                    <div className="text-sm text-gray-600">総アクション数</div>
                  </div>
                  <div className="text-center p-3 bg-red-50 rounded-lg">
                    <div className="text-2xl font-bold text-red-600">
                      {actionStats.unhandled}
                    </div>
                    <div className="text-sm text-red-700">{t('enhancedDashboard.actionStats.unhandled')}</div>
                  </div>
                  <div className="text-center p-3 bg-yellow-50 rounded-lg">
                    <div className="text-2xl font-bold text-yellow-600">
                      {actionStats.inProgress}
                    </div>
                    <div className="text-sm text-yellow-700">{t('enhancedDashboard.actionStats.inProgress')}</div>
                  </div>
                  <div className="text-center p-3 bg-green-50 rounded-lg">
                    <div className="text-2xl font-bold text-green-600">
                      {actionStats.resolved}
                    </div>
                    <div className="text-sm text-green-700">{t('enhancedDashboard.actionStats.resolved')}</div>
                  </div>
                  <div className="text-center p-3 bg-gray-50 rounded-lg">
                    <div className="text-2xl font-bold text-gray-600">
                      {actionStats.dismissed}
                    </div>
                    <div className="text-sm text-gray-600">{t('enhancedDashboard.actionStats.dismissed')}</div>
                  </div>
                </div>
              </div>
            ) : null;
          })()}

        {/* Bottlenecks Analysis */}
        {dashboardData.topicStats.bottlenecks.length > 0 && (
          <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              長期停滞トピック
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              30日以上更新されていないトピック
            </p>
            <div className="space-y-3">
              {dashboardData.topicStats.bottlenecks
                .slice(0, 5)
                .map((bottleneck) => (
                  <div
                    key={bottleneck.id}
                    className="flex items-center justify-between p-4 bg-red-50 border border-red-200 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-3 h-3 rounded-full ${
                          bottleneck.priority === "high"
                            ? "bg-red-500"
                            : bottleneck.priority === "medium"
                            ? "bg-yellow-500"
                            : "bg-green-500"
                        }`}
                      ></div>
                      <div>
                        <p className="font-medium text-gray-900">
                          {bottleneck.title}
                        </p>
                        <p className="text-sm text-gray-600">
                          {bottleneck.daysStagnant}日間停滞
                        </p>
                      </div>
                    </div>
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium ${
                        bottleneck.priority === "high"
                          ? "bg-red-100 text-red-700"
                          : bottleneck.priority === "medium"
                          ? "bg-yellow-100 text-yellow-700"
                          : "bg-green-100 text-green-700"
                      }`}
                    >
                      {bottleneck.priority === "high"
                        ? "高優先度"
                        : bottleneck.priority === "medium"
                        ? "中優先度"
                        : "低優先度"}
                    </span>
                  </div>
                ))}
              {dashboardData.topicStats.bottlenecks.length > 5 && (
                <p className="text-center text-sm text-gray-500 pt-2">
                  他 {dashboardData.topicStats.bottlenecks.length - 5}{" "}
                  件の停滞トピックがあります
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
