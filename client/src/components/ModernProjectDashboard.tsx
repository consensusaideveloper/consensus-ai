import {
  Activity,
  AlertTriangle,
  ArrowRight,
  Brain,
  Calendar,
  CheckCircle,
  ChevronRight,
  Download,
  MessageSquare,
  Target,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useLanguage } from "../hooks/useLanguage";
import { useProjects } from "../hooks/useProjects";
import { useTopicStatus } from "../hooks/useTopicStatus";
import { AccountMenu } from "./AccountMenu";

interface DashboardData {
  project: {
    id: string;
    name: string;
    description: string;
    opinionsCount: number;
    createdAt: Date;
  };
  progress: {
    total: number;
    resolved: number;
    inProgress: number;
    unhandled: number;
    progressRate: number;
  };
  actions: {
    total: number;
    completed: number;
    active: number;
    unhandled: number;
  };
  alerts: Array<{
    type: "stalled" | "unhandled" | "overdue";
    title: string;
    description: string;
    count?: number;
    items?: Array<{ id: string; title: string; detail: string }>;
  }>;
  recentActivity: {
    lastUpdate: Date;
    daysSinceLastUpdate: number;
    isActive: boolean;
  };
}

export function ModernProjectDashboard() {
  const navigate = useNavigate();
  const { id: projectId } = useParams<{ id: string }>();
  const { getProject, loading: projectsLoading } = useProjects();
  const { topics } = useTopicStatus(projectId);
  const { t } = useLanguage();
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(
    null
  );

  const project = projectId ? getProject(projectId) : null;

  const calculateDashboard = useCallback((): DashboardData | null => {
    if (!project || !topics) return null;
    // 進捗計算
    const progress = {
      total: topics.length,
      resolved: topics.filter((topic) => topic.status === "resolved").length,
      inProgress: topics.filter((topic) => topic.status === "in-progress")
        .length,
      unhandled: topics.filter((topic) => topic.status === "unhandled").length,
      progressRate: 0,
    };

    progress.progressRate =
      progress.total > 0
        ? Math.round(
            ((progress.resolved + progress.inProgress) / progress.total) * 100
          )
        : 0;

    // アクション統計
    const actions = { total: 0, completed: 0, active: 0, unhandled: 0 };

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
                  actions.total++;
                  switch (actionData.actionStatus) {
                    case "resolved":
                    case "dismissed":
                      actions.completed++;
                      break;
                    case "in-progress":
                      actions.active++;
                      break;
                    case "unhandled":
                      actions.unhandled++;
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

    // アラート生成
    const alerts: DashboardData["alerts"] = [];

    // 停滞トピック
    const now = new Date();
    const stalledTopics = topics
      .filter((topic) => {
        const daysSince = Math.floor(
          (now.getTime() - new Date(topic.updatedAt).getTime()) /
            (1000 * 60 * 60 * 24)
        );
        return (
          daysSince > 30 &&
          (topic.status === "unhandled" || topic.status === "in-progress")
        );
      })
      .map((topic) => ({
        id: topic.id,
        title: topic.title,
        detail: t("modernDashboard.alerts.daysStagnant").replace(
          "{days}",
          Math.floor(
            (now.getTime() - new Date(topic.updatedAt).getTime()) /
              (1000 * 60 * 60 * 24)
          ).toString()
        ),
      }));

    if (stalledTopics.length > 0) {
      alerts.push({
        type: "stalled",
        title: t("modernDashboard.alerts.stalledTopicsTitle"),
        description: t("modernDashboard.alerts.stalledTopicsDescription"),
        count: stalledTopics.length,
        items: stalledTopics.slice(0, 3),
      });
    }

    // 未対応トピック
    if (progress.unhandled > 0) {
      const unhandledTopics = topics
        .filter((topic) => topic.status === "unhandled")
        .slice(0, 3)
        .map((topic) => ({
          id: topic.id,
          title: topic.title,
          detail: t("modernDashboard.alerts.unhandledResponsesDescription"),
        }));

      alerts.push({
        type: "unhandled",
        title: t("modernDashboard.alerts.unhandledTopicsTitle"),
        description: t("modernDashboard.alerts.unhandledTopicsDescription"),
        count: progress.unhandled,
        items: unhandledTopics,
      });
    }

    // 最終活動
    const latestUpdate = topics.reduce((latest, topic) => {
      const topicDate = new Date(topic.updatedAt);
      return topicDate > latest ? topicDate : latest;
    }, new Date(0));

    const daysSinceLastUpdate = Math.floor(
      (now.getTime() - latestUpdate.getTime()) / (1000 * 60 * 60 * 24)
    );

    return {
      project: {
        id: project.id,
        name: project.name,
        description: project.description || "",
        opinionsCount: project.opinionsCount || 0,
        createdAt: new Date(project.createdAt),
      },
      progress,
      actions,
      alerts,
      recentActivity: {
        lastUpdate: latestUpdate,
        daysSinceLastUpdate,
        isActive: daysSinceLastUpdate <= 7,
      },
    };
  }, [project, topics, t]);

  useEffect(() => {
    const result = calculateDashboard();
    setDashboardData(result);
  }, [calculateDashboard]);

  const handleExportReport = () => {
    if (!dashboardData) return;

    const csvContent = [
      [t("modernDashboard.csv.title")],
      [t("modernDashboard.csv.generatedAt"), new Date().toLocaleString()],
      ["", ""],
      [t("modernDashboard.csv.basicInfo")],
      [t("modernDashboard.csv.projectName"), dashboardData.project.name],
      [
        t("modernDashboard.csv.totalOpinions"),
        dashboardData.project.opinionsCount,
      ],
      ["", ""],
      [t("modernDashboard.csv.progressStatus")],
      [t("modernDashboard.csv.totalTopics"), dashboardData.progress.total],
      [t("modernDashboard.csv.resolved"), dashboardData.progress.resolved],
      [t("modernDashboard.csv.inProgress"), dashboardData.progress.inProgress],
      [t("modernDashboard.csv.unhandled"), dashboardData.progress.unhandled],
      [
        t("modernDashboard.csv.progressRate"),
        `${dashboardData.progress.progressRate}%`,
      ],
      ["", ""],
      [t("modernDashboard.csv.actionManagement")],
      [t("modernDashboard.csv.totalActions"), dashboardData.actions.total],
      [t("modernDashboard.csv.completed"), dashboardData.actions.completed],
      [t("modernDashboard.csv.active"), dashboardData.actions.active],
      [t("modernDashboard.csv.pending"), dashboardData.actions.unhandled],
    ]
      .map((row) => row.join(","))
      .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `project_dashboard_${dashboardData.project.name}_${
      new Date().toISOString().split("T")[0]
    }.csv`;
    link.click();
  };

  // プロジェクトコンテキストのローディング状態を最初にチェック
  if (projectsLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">
            {t("modernDashboard.loading.project")}
          </p>
        </div>
      </div>
    );
  }

  if (!project || !dashboardData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">
            {t("modernDashboard.loading.project")}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      {/* ヘッダー */}
      <header className="bg-white/80 backdrop-blur-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center min-w-0 flex-1">
              {/* Logo */}
              <button
                onClick={() => navigate("/dashboard")}
                className="flex items-center mr-4 hover:opacity-80 transition-opacity"
              >
                <Brain className="h-5 w-5 text-blue-600 mr-2" />
                <span className="text-lg font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent hidden sm:inline">
                  {t("modernDashboard.logo")}
                </span>
              </button>

              {/* Breadcrumb Navigation */}
              <nav
                className="flex items-center min-w-0 flex-1"
                aria-label="Breadcrumb"
              >
                <button
                  onClick={() => navigate("/dashboard")}
                  className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
                >
                  {t("modernDashboard.breadcrumb")}
                </button>
                <ChevronRight className="h-4 w-4 text-gray-400 mx-2" />
                <button
                  onClick={() => navigate(`/projects/${projectId}`)}
                  className="text-sm text-gray-500 hover:text-gray-700 transition-colors truncate"
                >
                  {dashboardData.project.name}
                </button>
                <ChevronRight className="h-4 w-4 text-gray-400 mx-2" />
                <span className="text-sm font-medium text-gray-900">
                  {t("modernDashboard.analysis")}
                </span>
              </nav>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={handleExportReport}
                className="flex items-center px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium"
              >
                <Download className="h-4 w-4 mr-2" />
                {t("modernDashboard.exportReport")}
              </button>
              <AccountMenu />
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* プロジェクトサマリー */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl shadow-xl p-8 mb-8 text-white">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex-1">
              <h2 className="text-3xl font-bold mb-3">
                {dashboardData.project.name}
              </h2>
              <p className="text-blue-100 mb-4">
                {dashboardData.project.description}
              </p>
              <div className="flex flex-wrap items-center gap-6">
                <div className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5 text-blue-200" />
                  <span className="text-lg">
                    {t("modernDashboard.projectSummary.opinionsCount").replace(
                      "{count}",
                      dashboardData.project.opinionsCount.toLocaleString()
                    )}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-blue-200" />
                  <span className="text-lg">
                    {t("modernDashboard.projectSummary.daysSince").replace(
                      "{days}",
                      Math.floor(
                        (Date.now() -
                          dashboardData.project.createdAt.getTime()) /
                          (1000 * 60 * 60 * 24)
                      ).toString()
                    )}
                  </span>
                </div>
                <div
                  className={`flex items-center gap-2 px-3 py-1 rounded-full ${
                    dashboardData.recentActivity.isActive
                      ? "bg-green-500/20"
                      : "bg-red-500/20"
                  }`}
                >
                  <Activity className="h-4 w-4" />
                  <span className="text-sm font-medium">
                    {dashboardData.recentActivity.isActive
                      ? t("modernDashboard.projectSummary.active")
                      : t("modernDashboard.projectSummary.stalled")}
                  </span>
                </div>
              </div>
            </div>
            <div className="text-center">
              <div className="text-5xl font-bold mb-2">
                {dashboardData.progress.progressRate}%
              </div>
              <div className="text-blue-200">
                {t("modernDashboard.projectSummary.overallProgress")}
              </div>
            </div>
          </div>
        </div>

        {/* 進捗ダッシュボード */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* トピック進捗 */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-6 flex items-center">
              <Target className="h-5 w-5 text-blue-600 mr-2" />
              {t("modernDashboard.progress.topicProgressTitle")}
            </h3>
            <div className="space-y-6">
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium text-gray-700">
                    {t("modernDashboard.progress.resolved")}
                  </span>
                  <span className="text-sm font-bold text-green-600">
                    {dashboardData.progress.resolved} 件
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div
                    className="bg-green-500 h-3 rounded-full transition-all duration-500"
                    style={{
                      width: `${
                        (dashboardData.progress.resolved /
                          dashboardData.progress.total) *
                        100
                      }%`,
                    }}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium text-gray-700">
                    {t("modernDashboard.progress.inProgress")}
                  </span>
                  <span className="text-sm font-bold text-yellow-600">
                    {dashboardData.progress.inProgress} 件
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div
                    className="bg-yellow-500 h-3 rounded-full transition-all duration-500"
                    style={{
                      width: `${
                        (dashboardData.progress.inProgress /
                          dashboardData.progress.total) *
                        100
                      }%`,
                    }}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium text-gray-700">
                    {t("modernDashboard.progress.unhandled")}
                  </span>
                  <span className="text-sm font-bold text-red-600">
                    {dashboardData.progress.unhandled} 件
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div
                    className="bg-red-500 h-3 rounded-full transition-all duration-500"
                    style={{
                      width: `${
                        (dashboardData.progress.unhandled /
                          dashboardData.progress.total) *
                        100
                      }%`,
                    }}
                  />
                </div>
              </div>

              <div className="pt-4 border-t">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">
                    {t("modernDashboard.progress.totalTopics")}
                  </span>
                  <span className="text-xl font-bold text-gray-900">
                    {dashboardData.progress.total}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* アクション進捗 */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-6 flex items-center">
              <CheckCircle className="h-5 w-5 text-green-600 mr-2" />
              {t("modernDashboard.progress.actionManagementTitle")}
            </h3>
            <div className="space-y-6">
              <div className="grid grid-cols-3 gap-4 text-center">
                <div className="bg-green-50 rounded-lg p-4">
                  <div className="text-2xl font-bold text-green-600">
                    {dashboardData.actions.completed}
                  </div>
                  <div className="text-sm text-green-700 mt-1">
                    {t("modernDashboard.progress.completed")}
                  </div>
                </div>
                <div className="bg-yellow-50 rounded-lg p-4">
                  <div className="text-2xl font-bold text-yellow-600">
                    {dashboardData.actions.active}
                  </div>
                  <div className="text-sm text-yellow-700 mt-1">
                    {t("modernDashboard.progress.active")}
                  </div>
                </div>
                <div className="bg-red-50 rounded-lg p-4">
                  <div className="text-2xl font-bold text-red-600">
                    {dashboardData.actions.unhandled}
                  </div>
                  <div className="text-sm text-red-700 mt-1">
                    {t("modernDashboard.progress.pending")}
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t">
                <div className="flex justify-between items-center mb-3">
                  <span className="text-gray-600">
                    {t("modernDashboard.progress.completionRate")}
                  </span>
                  <span className="text-xl font-bold text-gray-900">
                    {dashboardData.actions.total > 0
                      ? Math.round(
                          (dashboardData.actions.completed /
                            dashboardData.actions.total) *
                            100
                        )
                      : 0}
                    %
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-4">
                  <div
                    className="bg-gradient-to-r from-green-500 to-green-600 h-4 rounded-full transition-all duration-500"
                    style={{
                      width:
                        dashboardData.actions.total > 0
                          ? `${
                              (dashboardData.actions.completed /
                                dashboardData.actions.total) *
                              100
                            }%`
                          : "0%",
                    }}
                  />
                </div>
              </div>

              <div className="flex justify-center pt-2">
                <button
                  onClick={() => navigate(`/projects/${projectId}/actions`)}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors text-sm font-medium"
                >
                  {t("modernDashboard.progress.viewActionsList")}
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* アラート */}
        {dashboardData.alerts.length > 0 && (
          <div className="space-y-4 mb-8">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center">
              <AlertTriangle className="h-5 w-5 text-orange-600 mr-2" />
              {t("modernDashboard.alerts.title")}
            </h3>
            {dashboardData.alerts.map((alert, index) => (
              <div
                key={index}
                className={`rounded-xl shadow-lg p-6 border-l-4 ${
                  alert.type === "stalled"
                    ? "bg-red-50 border-red-500"
                    : alert.type === "unhandled"
                    ? "bg-orange-50 border-orange-500"
                    : "bg-yellow-50 border-yellow-500"
                }`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h4 className="font-semibold text-gray-900">
                      {alert.title}
                    </h4>
                    <p className="text-sm text-gray-600 mt-1">
                      {alert.description}
                    </p>
                  </div>
                  {alert.count && (
                    <span
                      className={`px-3 py-1 rounded-full text-sm font-medium ${
                        alert.type === "stalled"
                          ? "bg-red-100 text-red-700"
                          : alert.type === "unhandled"
                          ? "bg-orange-100 text-orange-700"
                          : "bg-yellow-100 text-yellow-700"
                      }`}
                    >
                      {alert.count} 件
                    </span>
                  )}
                </div>
                {alert.items && alert.items.length > 0 && (
                  <div className="space-y-2">
                    {alert.items.map((item, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between p-3 bg-white rounded-lg"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-gray-900 truncate">
                            {item.title}
                          </p>
                          <p className="text-sm text-gray-500">{item.detail}</p>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(
                              `/projects/${projectId}/topics/${item.id}`
                            );
                          }}
                          className="ml-4 text-blue-600 hover:text-blue-800 text-sm font-medium"
                        >
                          詳細を見る
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
