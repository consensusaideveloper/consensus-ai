import { Activity, AlertTriangle, CheckCircle, Download } from "lucide-react";
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
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
import { ResponsiveHeader } from "./ResponsiveHeader";
import { UserPurposeModal } from "./UserPurposeModal";

interface ProjectAnalyticsData {
  projectInfo: {
    name: string;
    description: string;
    opinionsCount: number;
    topicsCount: number;
    createdAt: Date;
  };
  topicStats: {
    total: number;
    byStatus: Record<string, number>;
    byPriority: Record<string, number>;
    resolutionRate: number;
  };
  actionStats: {
    total: number;
    unhandled: number;
    inProgress: number;
    resolved: number;
    dismissed: number;
  };
  progressMetrics: {
    topicCompletionRate: number;
    actionCompletionRate: number;
    averageResponsesPerTopic: number;
  };
  riskIndicators: {
    stalledTopics: Array<{
      id: string;
      title: string;
      daysStagnant: number;
      priority: string;
    }>;
    overdueActions: number;
  };
}

export function ProjectAnalytics() {
  const { id: projectId } = useParams<{ id: string }>();
  const { getProject } = useProjects();
  const { topics } = useTopicStatus(projectId);
  const { t } = useLanguage();
  const [analytics, setAnalytics] = useState<ProjectAnalyticsData | null>(null);
  const [timeFilter] = useState<"7d" | "30d" | "90d">("30d");
  const [showPurposeModal, setShowPurposeModal] = useState(false);

  const project = getProject(projectId || '');

  useEffect(() => {
    if (!project || !topics) return;

    const calculateAnalytics = (): ProjectAnalyticsData => {
      // トピック統計
      const topicStatusCounts = {
        unhandled: 0,
        "in-progress": 0,
        resolved: 0,
        dismissed: 0,
      };

      const topicPriorityCounts = {
        high: 0,
        medium: 0,
        low: 0,
      };

      topics.forEach((topic) => {
        topicStatusCounts[topic.status as keyof typeof topicStatusCounts] =
          (topicStatusCounts[topic.status as keyof typeof topicStatusCounts] ||
            0) + 1;

        if (topic.priority && topic.priority.level) {
          topicPriorityCounts[
            topic.priority.level as keyof typeof topicPriorityCounts
          ] =
            (topicPriorityCounts[
              topic.priority.level as keyof typeof topicPriorityCounts
            ] || 0) + 1;
        }
      });

      // アクション統計を収集
      const actionStats = {
        total: 0,
        unhandled: 0,
        inProgress: 0,
        resolved: 0,
        dismissed: 0,
      };

      if (project.analysis?.topInsights) {
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

      // 停滞トピックの特定（30日以上更新されていない）
      const now = new Date();
      const stalledTopics = topics
        .filter((topic) => {
          const updatedAt = new Date(topic.updatedAt);
          const daysDiff = Math.floor(
            (now.getTime() - updatedAt.getTime()) / (1000 * 60 * 60 * 24)
          );
          return (
            daysDiff > 30 &&
            (topic.status === "unhandled" || topic.status === "in-progress")
          );
        })
        .map((topic) => ({
          id: topic.id,
          title: topic.title,
          daysStagnant: Math.floor(
            (now.getTime() - new Date(topic.updatedAt).getTime()) /
              (1000 * 60 * 60 * 24)
          ),
          priority: topic.priority?.level || "medium",
        }))
        .sort((a, b) => b.daysStagnant - a.daysStagnant);

      // 計算結果
      const resolutionRate =
        topics.length > 0
          ? Math.round(
              ((topicStatusCounts.resolved + topicStatusCounts.dismissed) /
                topics.length) *
                100
            )
          : 0;

      const actionCompletionRate =
        actionStats.total > 0
          ? Math.round(
              ((actionStats.resolved + actionStats.dismissed) /
                actionStats.total) *
                100
            )
          : 0;

      const averageResponsesPerTopic =
        topics.length > 0
          ? Math.round((project.opinionsCount || 0) / topics.length)
          : 0;

      return {
        projectInfo: {
          name: project.name || '',
          description: project.description || '',
          opinionsCount: project.opinionsCount || 0,
          topicsCount: topics.length,
          createdAt: new Date(project.createdAt),
        },
        topicStats: {
          total: topics.length,
          byStatus: topicStatusCounts,
          byPriority: topicPriorityCounts,
          resolutionRate,
        },
        actionStats,
        progressMetrics: {
          topicCompletionRate: resolutionRate,
          actionCompletionRate,
          averageResponsesPerTopic,
        },
        riskIndicators: {
          stalledTopics,
          overdueActions: 0, // TODO: 期限切れアクションの計算
        },
      };
    };

    setAnalytics(calculateAnalytics());
  }, [project, topics, timeFilter]);

  const handleOpenPurposeModal = () => {
    setShowPurposeModal(true);
  };

  const handleExportReport = () => {
    if (!analytics) return;

    const csvContent = [
      [
        t("projectAnalytics.csv.headers.item"),
        t("projectAnalytics.csv.headers.value"),
      ],
      [
        t("projectAnalytics.csv.headers.projectName"),
        analytics.projectInfo.name,
      ],
      [
        t("projectAnalytics.csv.headers.totalOpinions"),
        analytics.projectInfo.opinionsCount,
      ],
      [
        t("projectAnalytics.csv.headers.totalTopics"),
        analytics.projectInfo.topicsCount,
      ],
      [
        t("projectAnalytics.csv.headers.topicResolutionRate"),
        analytics.progressMetrics.topicCompletionRate,
      ],
      [
        t("projectAnalytics.csv.headers.actionCompletionRate"),
        analytics.progressMetrics.actionCompletionRate,
      ],
      [
        t("projectAnalytics.csv.headers.averageOpinionsPerTopic"),
        analytics.progressMetrics.averageResponsesPerTopic,
      ],
      [
        t("projectAnalytics.csv.headers.stalledTopicsCount"),
        analytics.riskIndicators.stalledTopics.length,
      ],
      ["", ""],
      [t("projectAnalytics.csv.headers.topicsByStatus"), ""],
      [
        t("projectAnalytics.status.unhandled"),
        analytics.topicStats.byStatus.unhandled,
      ],
      [
        t("projectAnalytics.status.inProgress"),
        analytics.topicStats.byStatus["in-progress"],
      ],
      [
        t("projectAnalytics.status.resolved"),
        analytics.topicStats.byStatus.resolved,
      ],
      [
        t("projectAnalytics.status.dismissed"),
        analytics.topicStats.byStatus.dismissed,
      ],
      ["", ""],
      [t("projectAnalytics.csv.headers.actionsByStatus"), ""],
      [t("projectAnalytics.status.unhandled"), analytics.actionStats.unhandled],
      [
        t("projectAnalytics.status.inProgress"),
        analytics.actionStats.inProgress,
      ],
      [t("projectAnalytics.status.resolved"), analytics.actionStats.resolved],
      [t("projectAnalytics.status.dismissed"), analytics.actionStats.dismissed],
    ]
      .map((row) => row.join(","))
      .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `project_analytics_${analytics.projectInfo.name}_${
      new Date().toISOString().split("T")[0]
    }.csv`;
    link.click();
  };

  if (!project || !analytics) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">{t("projectAnalytics.loadingData")}</p>
        </div>
      </div>
    );
  }

  // チャート用データの準備
  const topicStatusData = Object.entries(analytics.topicStats.byStatus)
    .filter(([, count]) => count > 0)
    .map(([status, count]) => ({
      name:
        status === "unhandled"
          ? t("projectAnalytics.status.unhandled")
          : status === "in-progress"
          ? t("projectAnalytics.status.inProgress")
          : status === "resolved"
          ? t("projectAnalytics.status.resolved")
          : t("projectAnalytics.status.dismissed"),
      value: count,
      percentage: Math.round((count / analytics.topicStats.total) * 100),
      color:
        status === "unhandled"
          ? "#EF4444"
          : status === "in-progress"
          ? "#F59E0B"
          : status === "resolved"
          ? "#10B981"
          : "#6B7280",
    }));

  // const actionStatusData = [
  //   { name: t('projectAnalytics.status.unhandled'), value: analytics.actionStats.unhandled, color: '#EF4444' },
  //   { name: t('projectAnalytics.status.inProgress'), value: analytics.actionStats.inProgress, color: '#F59E0B' },
  //   { name: t('projectAnalytics.status.resolved'), value: analytics.actionStats.resolved, color: '#10B981' },
  //   { name: t('projectAnalytics.status.dismissed'), value: analytics.actionStats.dismissed, color: '#6B7280' }
  // ].filter(item => item.value > 0)
  // .map(item => ({
  //   ...item,
  //   percentage: Math.round((item.value / analytics.actionStats.total) * 100)
  // }));

  // 優先度別データ
  const priorityData = Object.entries(analytics.topicStats.byPriority)
    .filter(([, count]) => count > 0)
    .map(([priority, count]) => ({
      name:
        priority === "high"
          ? t("projectAnalytics.priority.high")
          : priority === "medium"
          ? t("projectAnalytics.priority.medium")
          : t("projectAnalytics.priority.low"),
      value: count,
      percentage: Math.round((count / analytics.topicStats.total) * 100),
      color:
        priority === "high"
          ? "#EF4444"
          : priority === "medium"
          ? "#F59E0B"
          : "#10B981",
    }));

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      {/* Header */}
      <ResponsiveHeader
        breadcrumbs={[
          { label: t("breadcrumb.dashboard"), path: "/dashboard" },
          { label: analytics.projectInfo.name, path: `/projects/${projectId}` },
          { label: t("projectAnalytics.title") },
        ]}
        onOpenPurposeSettings={handleOpenPurposeModal}
        actions={
          <button
            onClick={handleExportReport}
            className="flex items-center px-3 py-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors font-medium text-sm"
          >
            <Download className="h-4 w-4 sm:h-5 sm:w-5 mr-1 sm:mr-2" />
            <span className="hidden sm:inline">
              {t("projectAnalytics.exportCsv")}
            </span>
            <span className="sm:hidden">
              {t("projectAnalytics.exportCsvShort")}
            </span>
          </button>
        }
        mobileActions={[
          {
            label: t("projectAnalytics.mobileActions.exportCsv"),
            icon: <Download className="h-4 w-4" />,
            onClick: handleExportReport,
            variant: "primary",
          },
        ]}
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {/* プロジェクト概要 */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6 mb-8">
          <h2 className="text-xl font-bold text-gray-900 mb-4">
            {t("projectAnalytics.overview.title")}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-600 mb-2">
                {analytics.projectInfo.opinionsCount.toLocaleString()}
              </div>
              <div className="text-sm text-gray-600">
                {t("projectAnalytics.overview.opinionsCount")}
              </div>
              <div className="text-xs text-gray-500 mt-1">
                {t("projectAnalytics.overview.opinionsDescription")}
              </div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-green-600 mb-2">
                {analytics.projectInfo.topicsCount}
              </div>
              <div className="text-sm text-gray-600">
                {t("projectAnalytics.overview.topicsCount")}
              </div>
              <div className="text-xs text-gray-500 mt-1">
                {t("projectAnalytics.overview.topicsDescription")}
              </div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-purple-600 mb-2">
                {analytics.progressMetrics.averageResponsesPerTopic}
              </div>
              <div className="text-sm text-gray-600">
                {t("projectAnalytics.overview.averageResponses")}
              </div>
              <div className="text-xs text-gray-500 mt-1">
                {t("projectAnalytics.overview.averageResponsesDescription")}
              </div>
            </div>
          </div>
        </div>

        {/* 進捗状況 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
              {t("projectAnalytics.progress.topicResolution")}
            </h3>
            <div className="text-center">
              <div className="text-4xl font-bold text-green-600 mb-2">
                {analytics.progressMetrics.topicCompletionRate}%
              </div>
              <div className="text-sm text-gray-600 mb-2">
                {t("projectAnalytics.progress.topicCompletionRate")}
              </div>
              <div className="text-xs text-gray-500">
                {t("projectAnalytics.progress.resolvedDetails")
                  .replace(
                    "{resolved}",
                    analytics.topicStats.byStatus.resolved.toString()
                  )
                  .replace(
                    "{dismissed}",
                    analytics.topicStats.byStatus.dismissed.toString()
                  )}
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <Activity className="h-5 w-5 text-blue-500 mr-2" />
              {t("projectAnalytics.progress.actionProgress")}
            </h3>
            <div className="text-center">
              <div className="text-4xl font-bold text-blue-600 mb-2">
                {analytics.progressMetrics.actionCompletionRate}%
              </div>
              <div className="text-sm text-gray-600 mb-2">
                {t("projectAnalytics.progress.actionCompletionRate")}
              </div>
              <div className="text-xs text-gray-500">
                {t("projectAnalytics.progress.actionDetails")
                  .replace(
                    "{completed}",
                    (
                      analytics.actionStats.resolved +
                      analytics.actionStats.dismissed
                    ).toString()
                  )
                  .replace("{total}", analytics.actionStats.total.toString())}
              </div>
            </div>
          </div>
        </div>

        {/* 注意が必要な項目 */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6 mb-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <AlertTriangle className="h-5 w-5 text-red-500 mr-2" />
            {t("projectAnalytics.risks.title")}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center p-4 bg-red-50 rounded-lg border border-red-200">
              <div className="text-3xl font-bold text-red-600 mb-2">
                {analytics.riskIndicators.stalledTopics.length}
              </div>
              <div className="text-sm font-medium text-red-800">
                {t("projectAnalytics.risks.stalledTopics")}
              </div>
              <div className="text-xs text-red-600 mt-1">
                {t("projectAnalytics.risks.stalledDescription")}
              </div>
            </div>
            <div className="text-center p-4 bg-yellow-50 rounded-lg border border-yellow-200">
              <div className="text-3xl font-bold text-yellow-600 mb-2">
                {analytics.topicStats.byStatus.unhandled}
              </div>
              <div className="text-sm font-medium text-yellow-800">
                {t("projectAnalytics.risks.unhandledTopics")}
              </div>
              <div className="text-xs text-yellow-600 mt-1">
                {t("projectAnalytics.risks.unhandledTopicsDescription")}
              </div>
            </div>
            <div className="text-center p-4 bg-orange-50 rounded-lg border border-orange-200">
              <div className="text-3xl font-bold text-orange-600 mb-2">
                {analytics.actionStats.unhandled}
              </div>
              <div className="text-sm font-medium text-orange-800">
                {t("projectAnalytics.risks.unhandledActions")}
              </div>
              <div className="text-xs text-orange-600 mt-1">
                {t("projectAnalytics.risks.unhandledActionsDescription")}
              </div>
            </div>
          </div>
        </div>

        {/* 詳細分析グラフ */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* テーマの対応状況 */}
          <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              {t("projectAnalytics.charts.topicStatus.title")}
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              {t("projectAnalytics.charts.topicStatus.description")}
            </p>

            {/* 状況別リスト */}
            <div className="space-y-3 mb-4">
              {topicStatusData.map((item) => (
                <div
                  key={item.name}
                  className="flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-4 h-4 rounded"
                      style={{ backgroundColor: item.color }}
                    ></div>
                    <span className="text-sm font-medium text-gray-700">
                      {item.name}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-bold text-gray-900">
                      {t("projectAnalytics.details.count").replace(
                        "{count}",
                        item.value.toString()
                      )}
                    </span>
                    <span className="text-sm text-gray-500">
                      {t("projectAnalytics.details.percentage").replace(
                        "{percentage}",
                        item.percentage.toString()
                      )}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* 円グラフ */}
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={topicStatusData}
                  cx="50%"
                  cy="50%"
                  innerRadius={40}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {topicStatusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value, name) => [
                    `${t("projectAnalytics.details.count").replace(
                      "{count}",
                      value.toString()
                    )} ${t("projectAnalytics.details.percentage").replace(
                      "{percentage}",
                      topicStatusData
                        .find((d) => d.name === name)
                        ?.percentage?.toString() || "0"
                    )}`,
                    "",
                  ]}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* テーマの優先度分布 */}
          <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              {t("projectAnalytics.charts.priorityDistribution.title")}
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              {t("projectAnalytics.charts.priorityDistribution.description")}
            </p>

            {/* 優先度別リスト */}
            <div className="space-y-3 mb-4">
              {priorityData.map((item) => (
                <div
                  key={item.name}
                  className="flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-4 h-4 rounded"
                      style={{ backgroundColor: item.color }}
                    ></div>
                    <span className="text-sm font-medium text-gray-700">
                      {item.name}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-bold text-gray-900">
                      {t("projectAnalytics.details.count").replace(
                        "{count}",
                        item.value.toString()
                      )}
                    </span>
                    <span className="text-sm text-gray-500">
                      {t("projectAnalytics.details.percentage").replace(
                        "{percentage}",
                        item.percentage.toString()
                      )}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* 棒グラフ */}
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={priorityData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip
                  formatter={(value) => [
                    t("projectAnalytics.details.count").replace(
                      "{count}",
                      value.toString()
                    ),
                    "",
                  ]}
                  labelFormatter={(label) => `${label}`}
                />
                <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                  {priorityData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 長期停滞テーマの詳細 */}
        {analytics.riskIndicators.stalledTopics.length > 0 && (
          <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2 flex items-center">
              <AlertTriangle className="h-5 w-5 text-red-500 mr-2" />
              {t("projectAnalytics.details.stagnantTopicsDetails")}
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              {t("projectAnalytics.details.stagnantDescription")}
            </p>
            <div className="space-y-3">
              {analytics.riskIndicators.stalledTopics
                .slice(0, 5)
                .map((topic, index) => (
                  <div
                    key={topic.id}
                    className="flex items-center justify-between p-4 bg-red-50 rounded-lg border border-red-200"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="flex-shrink-0 w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
                        <span className="text-sm font-medium text-red-600">
                          {index + 1}
                        </span>
                      </div>
                      <div className="flex-1">
                        <h4 className="font-medium text-gray-900 mb-1">
                          {topic.title}
                        </h4>
                        <div className="flex items-center space-x-4 text-sm text-gray-600">
                          <span>
                            {t("projectAnalytics.details.priorityLabel")}
                            <span
                              className={`ml-1 px-2 py-1 rounded text-xs font-medium ${
                                topic.priority === "high"
                                  ? "bg-red-100 text-red-800"
                                  : topic.priority === "medium"
                                  ? "bg-yellow-100 text-yellow-800"
                                  : "bg-green-100 text-green-800"
                              }`}
                            >
                              {topic.priority === "high"
                                ? t("projectAnalytics.priority.highShort")
                                : topic.priority === "medium"
                                ? t("projectAnalytics.priority.mediumShort")
                                : t("projectAnalytics.priority.lowShort")}
                            </span>
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold text-red-600">
                        {t("projectAnalytics.details.daysStagnant").replace(
                          "{days}",
                          topic.daysStagnant.toString()
                        )}
                      </div>
                      <div className="text-xs text-red-500">
                        {t("projectAnalytics.details.stagnantPeriod")}
                      </div>
                    </div>
                  </div>
                ))}
              {analytics.riskIndicators.stalledTopics.length > 5 && (
                <div className="text-center p-3 text-sm text-gray-500">
                  {t("projectAnalytics.details.additionalTopics").replace(
                    "{count}",
                    (
                      analytics.riskIndicators.stalledTopics.length - 5
                    ).toString()
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* User Purpose Modal */}
      <UserPurposeModal
        isOpen={showPurposeModal}
        onClose={() => setShowPurposeModal(false)}
      />
    </div>
  );
}
