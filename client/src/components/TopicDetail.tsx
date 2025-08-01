import { useState, useEffect, useCallback } from "react";
import {
  Search,
  Calendar,
  MessageSquare,
  Download,
  Eye,
  Bookmark,
  BookmarkCheck,
  SortAsc,
  TrendingUp,
  CheckCircle,
  Clock,
  AlertTriangle,
  Flag,
  Settings,
  X,
  XCircle,
  User,
  Target,
  HelpCircle,
} from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { useProjects } from "../hooks/useProjects";
import { useAuth } from "../hooks/useAuth";
import { useTopicStatus } from "../hooks/useTopicStatus";
import { useLanguage } from "../hooks/useLanguage";
import { useSearchDebounce } from "../hooks/useDebounce";
import {
  TopicStatus,
  getStatusColor,
  getLocalizedStatusText,
  getStatusIcon,
} from "../utils/topicStatus";
import { PrioritySelector } from "./PrioritySelector";
import { ResponsiveHeader } from "./ResponsiveHeader";
import { UserPurposeModal } from "./UserPurposeModal";
import TopicStatusDialog from "./TopicStatusDialog";

type FilterOption = "all" | "bookmarked" | "unbookmarked";
type SortOrder = "newest" | "oldest" | "reactions" | "status";
type SentimentFilter = "all" | "positive" | "negative" | "neutral";
type ActionStatusFilter =
  | "all"
  | "unhandled"
  | "in-progress"
  | "resolved"
  | "dismissed";

interface Response {
  id: string;
  content: string;
  submittedAt: Date;
  isBookmarked: boolean;
  sentiment: "positive" | "negative" | "neutral";
  characterCount: number;
  topicId?: string;
  actionStatus: string;
  priority: string;
  assignee?: string;
  dueDate?: string;
  lastUpdated?: Date;
}

export function TopicDetail() {
  const navigate = useNavigate();
  const { id, topicId } = useParams<{ id: string; topicId: string }>();
  const { getProject, updateProject } = useProjects();
  const { user } = useAuth();
  const { t } = useLanguage();
  const {
    topics,
    updateTopicStatus,
    updateTopicPriority,
  } = useTopicStatus(id);
  const [searchTerm, setSearchTerm] = useState("");
  const debouncedSearchTerm = useSearchDebounce(searchTerm, 300);
  const [filterOption, setFilterOption] = useState<FilterOption>("all");
  const [sentimentFilter, setSentimentFilter] =
    useState<SentimentFilter>("all");
  const [actionStatusFilter, setActionStatusFilter] =
    useState<ActionStatusFilter>("all");
  const [sortOrder, setSortOrder] = useState<SortOrder>("newest");
  const [detailModalResponse, setDetailModalResponse] =
    useState<Response | null>(null);
  const [notification, setNotification] = useState<string | null>(null);
  const [showFullPriorityReason, setShowFullPriorityReason] = useState(false);
  const [statusReason, setStatusReason] = useState<string>("");
  const [showPurposeModal, setShowPurposeModal] = useState(false);
  const [showStatusDialog, setShowStatusDialog] = useState(false);
  const [pendingStatus, setPendingStatus] = useState<TopicStatus>("unhandled");
  const [dialogStatusReason, setDialogStatusReason] = useState<string>("");

  // 🔧 Hooks の順序を保つため、早期リターンより前にすべてのstateを定義
  const [responses, setResponses] = useState<Response[]>([]);
  const [topicStatus, setTopicStatus] = useState<TopicStatus>("unhandled");
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  const project = id ? getProject(id) : null;

  // ヘルパー関数: finalTopicのプロパティに安全にアクセス
  const getTopicName = useCallback((topic: typeof finalTopic) => {
    if (!topic) return '';
    return topic.title || ''; // All topics now use title field consistently
  }, []);

  const getTopicDescription = (topic: typeof finalTopic) => {
    if (!topic) return '';
    return topic.description || ''; // All topics now use description field consistently
  };

  const getTopicUpdatedAt = (topic: typeof finalTopic) => {
    if (!topic) return null;
    return 'updatedAt' in topic ? topic.updatedAt : null;
  };

  // トピックデータの取得: SQL APIから取得
  const sqlTopic = topics.find((t) => t.id === topicId);

  const topic = sqlTopic && (sqlTopic.title || sqlTopic.description)
    ? {
        id: sqlTopic.id,
        title: sqlTopic.title,
        description: sqlTopic.description,
        count: sqlTopic.count,
        status: sqlTopic.status as TopicStatus,
        statusReason: (sqlTopic as any).statusReason,
        statusUpdatedAt: (sqlTopic as any).statusUpdatedAt ? new Date((sqlTopic as any).statusUpdatedAt) : null,
        updatedAt: sqlTopic.updatedAt ? new Date(sqlTopic.updatedAt) : null,
        priority: sqlTopic.priority,
      }
    : null;

  // プロジェクトデータからトピックを取得する最終フォールバック
  let fallbackTopic = null;
  if (project?.analysis?.topInsights) {
    const insightTopic = project.analysis.topInsights.find(
      (insight: { id?: string }) =>
        insight.id === topicId || `topic-${topicId}` === insight.id
    );
    
    if (insightTopic) {
      // Map insight topic to expected format, preserving description field for AI summary
      fallbackTopic = {
        id: insightTopic.id,
        title: insightTopic.title,
        description: insightTopic.description, // AI summary content from analysis
        count: insightTopic.count || insightTopic.opinions?.length || 0, // Use count field first, then opinions length
        status: 'unhandled', // Default status for analysis topics
        priority: null,
        updatedAt: null
      };
    }
  }

  const finalTopic = topic || fallbackTopic;


  // 🔧 すべてのuseEffectも早期リターンより前に定義
  // Fetch opinions from database API for this topic
  useEffect(() => {
    const fetchTopicOpinions = async () => {
      if (!id || !topicId || !user) {
        setResponses([]);
        return;
      }

      try {

        const response = await fetch(`/api/topics/${id}/${topicId}/opinions`, {
          headers: {
            "x-user-id": user.id,
            "Content-Type": "application/json",
          },
        });

        if (!response.ok) {
          throw new Error(
            `API request failed: ${response.status} ${response.statusText}`
          );
        }

        const data = await response.json();

        if (data.success && data.opinions) {
          // API response を Response 型に変換
          const formattedResponses: Response[] = data.opinions.map(
            (opinion: { 
              id: string; 
              content: string; 
              sentiment?: string; 
              isBookmarked?: boolean; 
              submittedAt?: string; 
              createdAt?: string;
              actionStatus?: string;
              priorityLevel?: string;
              dueDate?: string;
            }) => ({
              id: opinion.id,
              content: opinion.content,
              submittedAt: new Date(opinion.submittedAt || opinion.createdAt || Date.now()),
              isBookmarked: opinion.isBookmarked,
              sentiment: opinion.sentiment as
                | "positive"
                | "negative"
                | "neutral",
              characterCount: opinion.content?.length || 0,
              topicId: topicId,
              actionStatus: opinion.actionStatus || "unhandled",
              priority: opinion.priorityLevel || "medium",
              assignee: undefined,
              dueDate: opinion.dueDate,
              lastUpdated: undefined,
            })
          );


          setResponses(formattedResponses);
        } else {
          setResponses([]);
        }
      } catch {
        setResponses([]);
      }
    };

    fetchTopicOpinions();
  }, [id, topicId, user]);

  // Auto-save notification timeout
  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => setNotification(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  // Background sync every 30 seconds (環境変数対応)
  useEffect(() => {
    const syncInterval = parseInt(import.meta.env.VITE_MIN_SESSION_AGE_MS || '30000', 10);
    const interval = setInterval(async () => {
    }, syncInterval);

    const handleVisibilityChange = () => {
      if (!document.hidden) {
        // Handle visibility change when tab becomes visible
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  // Update topic status when topic data is available (but not during manual updates)
  useEffect(() => {
    if (isUpdatingStatus) return; // ユーザーがステータス更新中は自動更新しない
    
    const finalTopic =
      topics.find((t) => t.id === topicId) ||
      project?.analysis?.topInsights?.find(
        (insight: { id?: string }) =>
          insight.id === topicId || `topic-${topicId}` === insight.id
      );

    if (finalTopic?.status) {
      setTopicStatus(finalTopic.status as TopicStatus);
      
      // statusReasonもデータベースから取得して初期化
      if ((finalTopic as any).statusReason) {
        setStatusReason((finalTopic as any).statusReason);
      }
    }
  }, [topicId, topics, project?.id, project?.analysis?.topInsights, isUpdatingStatus]);


  // Track analytics for insights views
  useEffect(() => {
  }, [topicId]);

  // 重要度判定：優先度「高」または明示的にアクション必要な意見のみアクション管理対象
  const isActionRequired = (response: Response): boolean => {
    // 1. 優先度が「高」の意見
    if (response.priority === "high") return true;

    // 2. ブックマークされた意見（重要とマークされた意見）
    if (response.isBookmarked) return true;

    // 3. 既にアクション管理されている意見（ステータスが未対応以外）
    if (response.actionStatus && response.actionStatus !== "unhandled")
      return true;

    // 4. 否定的意見（反対意見は対応が必要）
    if (response.sentiment === "negative") return true;

    return false;
  };

  // Enhanced filter and sort responses
  const filteredAndSortedResponses = responses
    .filter((response) => {
      const matchesSearch = response.content
        .toLowerCase()
        .includes(debouncedSearchTerm.toLowerCase());
      const matchesFilter =
        filterOption === "all" ||
        (filterOption === "bookmarked" && response.isBookmarked) ||
        (filterOption === "unbookmarked" && !response.isBookmarked);
      const matchesSentiment =
        sentimentFilter === "all" || response.sentiment === sentimentFilter;
      const matchesActionStatus =
        actionStatusFilter === "all" ||
        response.actionStatus === actionStatusFilter;
      return (
        matchesSearch &&
        matchesFilter &&
        matchesSentiment &&
        matchesActionStatus
      );
    })
    .sort((a, b) => {
      switch (sortOrder) {
        case "newest":
          return new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime();
        case "oldest":
          return new Date(a.submittedAt).getTime() - new Date(b.submittedAt).getTime();
        case "reactions":
          return (b.isBookmarked ? 1 : 0) - (a.isBookmarked ? 1 : 0);
        case "status": {
          const statusOrder = ["unhandled", "in-progress", "resolved"];
          return statusOrder.indexOf(a.actionStatus) - statusOrder.indexOf(b.actionStatus);
        }
        default:
          return 0;
      }
    });

  // ステータス提案を生成する関数

  // If no topic found anywhere, show error
  if (!finalTopic) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center">
          <h2 className="text-xl font-bold text-gray-900 mb-4">
            {t("topicDetail.topic.notFound")}
          </h2>
          <p className="text-gray-600 mb-4">
            {t("topicDetail.debug.topicId")}: {topicId}
            <br />
            {t("topicDetail.debug.availableTopics")}:{" "}
            {`${topics.length}${t("topicDetail.debug.count")}`}
            <br />
            {t("topicDetail.debug.projectAnalysisData")}:{" "}
            {`${project?.analysis?.topInsights?.length || 0}${t(
              "topicDetail.debug.count"
            )}`}
          </p>
          <button
            onClick={() => navigate(`/projects/${id}`)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            {t("topicDetail.backToProject")}
          </button>
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="text-center">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-4">
            {t("projectDetail.project.notFound")}
          </h2>
          <p className="text-gray-600 mb-4">Project ID: {id}</p>
          <button
            onClick={() => navigate("/dashboard")}
            className="bg-blue-600 text-white px-4 sm:px-6 py-2 sm:py-3 rounded-lg hover:bg-blue-700 transition-colors text-sm sm:text-base"
          >
            {t("topicDetail.backToDashboard")}
          </button>
        </div>
      </div>
    );
  }


  const handleTopicStatusChange = async (newStatus: TopicStatus) => {
    if (isUpdatingStatus) return; // 既に更新中の場合は無視
    
    // 「解決済み」「却下」の場合はダイアログを表示
    if (newStatus === "resolved" || newStatus === "dismissed") {
      setPendingStatus(newStatus);
      setDialogStatusReason("");
      setShowStatusDialog(true);
      return;
    }
    
    // その他のステータス変更は直接実行
    await executeStatusChange(newStatus, "");
  };

  const executeStatusChange = async (newStatus: TopicStatus, reason: string) => {
    if (isUpdatingStatus) return; // 既に更新中の場合は無視
    
    try {
      setIsUpdatingStatus(true);
      
      // SQL APIでのステータス更新
      if (topicId) {
        console.log('[TopicDetail] ステータス更新開始:', { topicId, newStatus, reason });
        await updateTopicStatus(topicId, newStatus, undefined, reason);
        console.log('[TopicDetail] ステータス更新完了');
        
        // ローカル状態を即座に更新
        setTopicStatus(newStatus);
        setStatusReason(reason);
        showNotification(t("topicDetail.success.statusUpdated"));
      }

      // プロジェクトのコンテキストも更新（既存の機能を維持）
      // dismissed状態は topInsights では対応していないため除外
      if (project?.analysis?.topInsights && newStatus !== 'dismissed') {
        try {
          // SQLデータから正しいトピック情報を取得
          const currentTopic = topics.find((t) => t.id === topicId);
          const topicName = currentTopic?.title || '';
          
          console.log('[TopicDetail] プロジェクトコンテキスト更新:', { topicName, newStatus });
          
          const updatedInsights = project.analysis.topInsights.map((insight) => {
            return insight.title === topicName
              ? { ...insight, status: newStatus as "unhandled" | "in-progress" | "resolved" }
              : insight;
          });

          if (id) {
            await updateProject(id, {
              analysis: {
                ...project.analysis,
                topInsights: updatedInsights,
              },
            });
            console.log('[TopicDetail] プロジェクトコンテキスト更新完了');
          }
        } catch (projectUpdateError) {
          console.error('[TopicDetail] プロジェクトコンテキスト更新エラー:', projectUpdateError);
          // プロジェクト更新失敗は警告として扱い、SQL更新は成功しているので全体は成功とする
        }
      }
    } catch (error) {
      console.error('[TopicDetail] トピックステータス更新エラー:', error);
      showNotification(t("topicDetail.errors.updatingStatus"));
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleOpenPurposeModal = () => {
    setShowPurposeModal(true);
  };

  const toggleBookmark = async (opinionId: string) => {
    try {
      const response = responses.find((r) => r.id === opinionId);
      if (!response || !user?.id || !id) return;

      const newBookmarkState = !response.isBookmarked;

      // 統一API経由でブックマーク状態を更新（ProjectOpinions.tsxと同じ処理）
      const apiResponse = await fetch(
        `/api/db/projects/${id}/opinions/${opinionId}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            "X-User-ID": user.id,
          },
          body: JSON.stringify({
            isBookmarked: newBookmarkState,
          }),
        }
      );

      if (!apiResponse.ok) {
        throw new Error(
          `ブックマーク更新に失敗しました: ${apiResponse.statusText}`
        );
      }

      // ローカル状態を更新
      setResponses((prev) =>
        prev.map((response) => {
          if (response.id === opinionId) {
            return { ...response, isBookmarked: newBookmarkState };
          }
          return response;
        })
      );

      // ユーザーに成功通知を表示
      showNotification(
        newBookmarkState
          ? t("topicDetail.success.bookmarkAdded")
          : t("topicDetail.success.bookmarkRemoved")
      );
    } catch (error) {
      console.error('ブックマーク更新エラー:', error);
      showNotification("ブックマークの更新に失敗しました");
    }
  };

  const showNotification = (message: string) => {
    setNotification(message);
    setTimeout(() => setNotification(null), 3000);
  };


  const handleTopicPriorityChange = async (
    newPriority: "low" | "medium" | "high" | undefined
  ) => {
    try {
      if (newPriority === undefined) {
        if (topicId) {
          await updateTopicPriority(topicId, null);
          showNotification(t("topicDetail.priorityManagement.noPriority"));
        }
      } else {
        // トピックの優先度を更新（ステータスは変更しない）
        const priorityData: {
          level: 'high' | 'medium' | 'low';
          updatedAt: number;
          reason?: string;
        } = {
          level: newPriority as 'high' | 'medium' | 'low',
          updatedAt: Date.now(),
        };

        // reasonがあるときのみ追加（undefinedを避ける）
        if (finalTopic?.priority?.reason) {
          priorityData.reason = finalTopic.priority.reason;
        }

        if (topicId) {
          await updateTopicPriority(topicId, priorityData);
        }

        const priorityText =
          newPriority === "high"
            ? t("topicDetail.priorityManagement.highPriority")
            : newPriority === "medium"
            ? t("topicDetail.priorityManagement.mediumPriority")
            : t("topicDetail.priorityManagement.lowPriority");
        showNotification(
          t("topicDetail.priorityManagement.priorityUpdated").replace(
            "{priority}",
            priorityText
          )
        );
      }
    } catch {
      // Error handling
      showNotification(
        t("topicDetail.priorityManagement.priorityUpdateFailed")
      );
    }
  };

  const handleDetailedTopicPriorityChange = async (
    level: "low" | "medium" | "high" | undefined,
    reason?: string
  ) => {
    try {
      if (level === undefined) {
        if (topicId) {
          await updateTopicPriority(topicId, null);
        }
        showNotification(t("topicDetail.priorityManagement.noPriority"));
      } else {
        const priorityData = {
          level: level as 'high' | 'medium' | 'low',
          reason,
          updatedAt: Date.now(),
        };

        if (topicId) {
          await updateTopicPriority(topicId, priorityData);
        }

        const priorityText =
          level === "high"
            ? t("topicDetail.priorityManagement.highPriority")
            : level === "medium"
            ? t("topicDetail.priorityManagement.mediumPriority")
            : t("topicDetail.priorityManagement.lowPriority");
        showNotification(
          t("topicDetail.priorityManagement.priorityUpdated").replace(
            "{priority}",
            priorityText
          )
        );
      }
    } catch {
      // Error handling
      showNotification(
        t("topicDetail.priorityManagement.priorityUpdateFailed")
      );
    }
  };

  const getIconComponent = (iconName: string) => {
    switch (iconName) {
      case "AlertTriangle":
        return AlertTriangle;
      case "Clock":
        return Clock;
      case "CheckCircle":
        return CheckCircle;
      case "XCircle":
        return XCircle;
      default:
        return Clock;
    }
  };

  const getActionStatusColor = (status: string) => {
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

  const getActionStatusText = (status: string) => {
    switch (status) {
      case "unhandled":
        return t("topicDetail.status.unhandled");
      case "in-progress":
        return t("topicDetail.status.inProgress");
      case "resolved":
        return t("topicDetail.status.resolved");
      case "dismissed":
        return t("topicDetail.status.dismissed");
      default:
        return t("topicDetail.status.unhandled");
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
        return t("topicDetail.priority.high");
      case "medium":
        return t("topicDetail.priority.medium");
      case "low":
        return t("topicDetail.priority.low");
      default:
        return t("topicDetail.priority.none");
    }
  };

  const getSentimentText = (sentiment: "positive" | "negative" | "neutral") => {
    switch (sentiment) {
      case "positive":
        return t("topicDetail.sentiment.positive");
      case "negative":
        return t("topicDetail.sentiment.negative");
      case "neutral":
        return t("topicDetail.sentiment.neutral");
    }
  };

  const getSentimentBadgeColor = (
    sentiment: "positive" | "negative" | "neutral"
  ) => {
    switch (sentiment) {
      case "positive":
        return "bg-green-100 text-green-800";
      case "negative":
        return "bg-red-100 text-red-800";
      case "neutral":
        return "bg-gray-100 text-gray-800";
    }
  };

  const getBookmarkCounts = () => {
    return {
      total: responses.length,
      bookmarked: responses.filter((r) => r.isBookmarked).length,
      unbookmarked: responses.filter((r) => !r.isBookmarked).length,
    };
  };

  const getSentimentCounts = () => {
    return {
      positive: responses.filter((r) => r.sentiment === "positive").length,
      negative: responses.filter((r) => r.sentiment === "negative").length,
      neutral: responses.filter((r) => r.sentiment === "neutral").length,
    };
  };

  const getActionStatusCounts = () => {
    return {
      unhandled: responses.filter((r) => r.actionStatus === "unhandled").length,
      inProgress: responses.filter((r) => r.actionStatus === "in-progress")
        .length,
      resolved: responses.filter((r) => r.actionStatus === "resolved").length,
      dismissed: responses.filter((r) => r.actionStatus === "dismissed").length,
    };
  };

  const bookmarkCounts = getBookmarkCounts();
  const sentimentCounts = getSentimentCounts();
  const actionStatusCounts = getActionStatusCounts();

  const TopicStatusIcon = getIconComponent(getStatusIcon(topicStatus));

  const handleCardClick = (response: Response) => {
    setDetailModalResponse(response);
  };

  const handleActionManagement = (response: Response) => {
    navigate(
      `/projects/${id}/topics/${topicId}/opinions/${response.id}/action`
    );
  };



  // Function to truncate text and show appropriate lines
  const truncateText = (text: string, maxLines: number = 3) => {
    const words = text.split(" ");
    const wordsPerLine = 12; // Approximate words per line
    const maxWords = maxLines * wordsPerLine;

    if (words.length <= maxWords) {
      return text;
    }

    return words.slice(0, maxWords).join(" ") + "...";
  };

  const handleExportCSV = () => {
    const csvContent = [
      [
        "ID",
        t("topicDetail.opinions.submittedAt"),
        t("common.general.content"),
        t("topicDetail.filters.bookmark"),
        t("topicDetail.filters.sentiment"),
        t("topicDetail.filters.actionStatus"),
        t("topicDetail.topic.priority"),
      ],
      ...filteredAndSortedResponses.map((response) => [
        response.id,
        response.submittedAt.toLocaleString("ja-JP"),
        `"${response.content.replace(/"/g, '""')}"`,
        response.isBookmarked
          ? t("common.general.yes")
          : t("common.general.no"),
        getSentimentText(response.sentiment),
        getActionStatusText(response.actionStatus),
        getPriorityText(response.priority),
      ]),
    ]
      .map((row) => row.join(","))
      .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `${project.name}_${
      getTopicName(finalTopic)
    }_responses_filtered.csv`;
    link.click();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      {/* Notification */}
      {notification && (
        <div className="fixed top-4 right-4 bg-blue-100 border border-blue-400 text-blue-700 px-3 sm:px-4 py-2 sm:py-3 rounded-lg shadow-lg z-50 animate-fade-in">
          <div className="flex items-center">
            <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
            <span className="text-sm sm:text-base">{notification}</span>
          </div>
        </div>
      )}

      {/* Header */}
      <ResponsiveHeader
        breadcrumbs={[
          { label: t("breadcrumb.dashboard"), path: "/dashboard" },
          { label: project.name, path: `/projects/${id}` },
          { label: getTopicName(finalTopic) },
        ]}
        onOpenPurposeSettings={handleOpenPurposeModal}
        actions={
          <button
            onClick={handleExportCSV}
            className="flex items-center px-3 sm:px-4 py-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors font-medium text-sm"
          >
            <Download className="h-4 w-4 mr-1 sm:mr-2" />
            <span className="hidden sm:inline">
              {t("topicDetail.export.csv")}
            </span>
            <span className="sm:hidden">
              {t("topicDetail.export.csvShort")}
            </span>
          </button>
        }
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {/* Topic Header */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-4 sm:p-6 mb-6 sm:mb-8">
          <div className="flex flex-col lg:flex-row lg:items-start gap-6">
            <div className="flex-1 min-w-0">
              {/* Title Section - Better structure */}
              <div className="mb-4">
                {/* Category Badge */}
                {(finalTopic as any).category && (
                  <div className="mb-2">
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-800">
                      {(finalTopic as any).category}
                    </span>
                  </div>
                )}
                <h2 className="text-xl sm:text-2xl font-bold text-gray-900 break-words mb-3">
                  {getTopicName(finalTopic)}
                </h2>
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(
                      topicStatus
                    )}`}
                  >
                    <TopicStatusIcon className="h-3 w-3 mr-1" />
                    {getLocalizedStatusText(topicStatus, t)}
                  </span>
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    <MessageSquare className="h-3 w-3 mr-1" />
                    {`${finalTopic.count}${t("general.count")}`}
                  </span>

                  {/* Topic Priority */}
                  <PrioritySelector
                    priority={finalTopic.priority ? {
                      level: finalTopic.priority.level,
                      reason: finalTopic.priority.reason,
                      updatedAt: finalTopic.priority.updatedAt ? new Date(finalTopic.priority.updatedAt) : undefined,
                    } : undefined}
                    onPriorityChange={handleTopicPriorityChange}
                    onDetailedPriorityChange={handleDetailedTopicPriorityChange}
                    title={t("topicDetail.topic.priority")}
                    subtitle={`${t("topicDetail.topic.status")}: ${
                      getTopicName(finalTopic)
                    }`}
                    allowNone={true}
                    size="sm"
                    showReasonIcon={false}
                  />
                </div>
              </div>

              {/* Priority Reason Section */}
              {finalTopic.priority?.reason && (
                <div className="bg-blue-50 rounded-lg p-4 border border-blue-200 mb-4 sm:mb-6">
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0">
                      <Target className="h-5 w-5 text-blue-600 mt-0.5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-medium text-blue-900 mb-2">
                        {t("topicDetail.topic.priorityReason")}
                      </h4>
                      <div className="text-sm text-blue-800 leading-relaxed break-words">
                        {finalTopic.priority.reason.length > 150 ? (
                          <>
                            <div
                              className={`${
                                !showFullPriorityReason ? "line-clamp-3" : ""
                              }`}
                            >
                              {finalTopic.priority.reason}
                            </div>
                            <button
                              onClick={() =>
                                setShowFullPriorityReason(
                                  !showFullPriorityReason
                                )
                              }
                              className="mt-2 text-xs text-blue-600 hover:text-blue-800 underline"
                            >
                              {showFullPriorityReason
                                ? t("topicDetail.topic.collapse")
                                : t("topicDetail.topic.continueReading")}
                            </button>
                          </>
                        ) : (
                          finalTopic.priority.reason
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Important Response Summary */}
              {responses.length > 0 && (
                <div className="bg-orange-50 rounded-lg p-4 border border-orange-200 mb-4 sm:mb-6">
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0">
                      <Flag className="h-5 w-5 text-orange-600 mt-0.5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-medium text-orange-900 mb-2">
                        {t("topicDetail.topic.importantResponseSummary")}
                      </h4>
                      <div className="text-sm text-orange-800">
                        {t("topicDetail.opinions.totalOpinions")}:{" "}
                        {`${
                          responses.filter((response) =>
                            isActionRequired(response)
                          ).length
                        }${t("general.count")}`}{" "}
                        {t("topicDetail.status.inProgress")}
                        {responses.filter(
                          (response) =>
                            isActionRequired(response) &&
                            response.actionStatus === "resolved"
                        ).length > 0 && (
                          <span className="ml-2 text-green-700">
                            (
                            {`${
                              responses.filter(
                                (response) =>
                                  isActionRequired(response) &&
                                  response.actionStatus === "resolved"
                              ).length
                            }${t("general.count")}`}{" "}
                            {t("topicDetail.status.resolved")})
                          </span>
                        )}
                      </div>
                      <div className="mt-2 text-xs text-orange-700">
                        {t("topicDetail.topic.importantResponseSummary")}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Active Actions Warning for Resolved Topics */}
              {topicStatus === "resolved" &&
                responses.length > 0 &&
                (() => {
                  const activeActions = responses.filter(
                    (response) =>
                      response.actionStatus === "unhandled" ||
                      response.actionStatus === "in-progress"
                  );
                  return activeActions.length > 0 ? (
                    <div className="bg-amber-50 rounded-lg p-4 border border-amber-200 mb-4 sm:mb-6">
                      <div className="flex items-start gap-3">
                        <div className="flex-shrink-0">
                          <Settings className="h-5 w-5 text-amber-600 mt-0.5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="text-sm font-medium text-amber-900 mb-2">
                            {t("topicDetail.ui.activeActionsTitle")}
                          </h4>
                          <div className="text-sm text-amber-800">
                            {t("topicDetail.ui.activeActionsMessage").replace(
                              "{count}",
                              activeActions.length.toString()
                            )}
                            {activeActions.filter((a) => a.assignee).length >
                              0 && (
                              <span className="ml-2">
                                {t(
                                  "topicDetail.ui.assignedActionsNote"
                                ).replace(
                                  "{count}",
                                  activeActions
                                    .filter((a) => a.assignee)
                                    .length.toString()
                                )}
                              </span>
                            )}
                          </div>
                          <div className="mt-2 text-xs text-amber-700">
                            {t("topicDetail.ui.progressTrackingNote")}
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : null;
                })()}

              {/* Summary Section - No edit functionality */}
              <div className="mb-4 sm:mb-6">
                <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-2 sm:mb-3">
                  {t("topicDetail.topic.aiSummary")}
                </h3>
                <div className="text-gray-700 leading-relaxed text-sm sm:text-base">
                  {getTopicDescription(finalTopic) ? (
                    <p>{getTopicDescription(finalTopic)}</p>
                  ) : (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                      <div className="flex items-center gap-2">
                        <span className="text-yellow-600">⚠️</span>
                        <span className="text-yellow-800 text-sm">
                          AI要約データが見つかりません。デバッグ情報をコンソールでご確認ください。
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Meta Information */}
              <div className="flex flex-wrap items-center gap-3 sm:gap-4 text-xs sm:text-sm text-gray-500">
                <div className="flex items-center">
                  <Calendar className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                  <span className="hidden sm:inline">
                    {t("topicDetail.topic.lastUpdated")}:{" "}
                  </span>
                  <span className="sm:hidden">
                    {t("topicDetail.topic.lastUpdated")}:{" "}
                  </span>
                  {(() => {
                    const updatedAt = getTopicUpdatedAt(finalTopic);
                    return updatedAt ? new Date(updatedAt).toLocaleDateString("ja-JP") : t("topicDetail.ui.dateUnknown");
                  })()}
                </div>
                <div className="flex items-center">
                  <TrendingUp className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                  <span className="hidden sm:inline">
                    {t("topicDetail.topic.relatedOpinions")}:{" "}
                  </span>
                  <span className="sm:hidden">
                    {t("topicDetail.topic.opinionsCount")}:{" "}
                  </span>
                  {`${finalTopic.count}${t("general.count")}`}
                </div>
              </div>
            </div>

            {/* Topic Status Actions - Compact */}
            <div className="w-full lg:w-80 xl:w-72">
              <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 block">
                    {t("topicDetail.ui.statusChange")}
                  </label>
                  <select
                    value={topicStatus}
                    onChange={(e) =>
                      handleTopicStatusChange(e.target.value as TopicStatus)
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  >
                    <option value="unhandled">
                      {t("topicDetail.status.unhandled")}
                    </option>
                    <option value="in-progress">
                      {t("topicDetail.status.inProgress")}
                    </option>
                    <option value="resolved">
                      {t("topicDetail.status.resolved")}
                    </option>
                    <option value="dismissed">
                      {t("topicDetail.status.dismissed")}
                    </option>
                  </select>
                </div>

                {/* Compact help text */}
                <div className="p-2 bg-blue-50 rounded border border-blue-200">
                  <div className="flex items-start gap-2">
                    <HelpCircle className="h-3 w-3 text-blue-600 mt-0.5 flex-shrink-0" />
                    <p className="text-xs text-blue-700 leading-tight">
                      {t("topicDetail.ui.helpText")}
                    </p>
                  </div>
                </div>

                {/* Status Reason Display */}
                {(topicStatus === "resolved" || topicStatus === "dismissed") && (
                  <div className="mt-3">
                    <div className="flex items-center justify-between mb-2">
                      <label className="block text-sm font-medium text-gray-700">
                        理由
                      </label>
                      <button
                        onClick={() => {
                          setPendingStatus(topicStatus);
                          setDialogStatusReason(statusReason);
                          setShowStatusDialog(true);
                        }}
                        className="text-xs text-blue-600 hover:text-blue-800 underline"
                      >
                        編集
                      </button>
                    </div>
                    <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                      {statusReason ? (
                        <p className="text-sm text-gray-800 whitespace-pre-wrap">
                          {statusReason}
                        </p>
                      ) : (
                        <p className="text-sm text-gray-500 italic">
                          理由が設定されていません
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Enhanced Stats */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-4 sm:p-6 mb-6 sm:mb-8">
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4 sm:gap-6">
            <div className="text-center">
              <div className="text-2xl sm:text-3xl font-bold text-blue-600">
                {bookmarkCounts.total}
              </div>
              <div className="text-xs sm:text-sm text-gray-600">
                {t("topicDetail.stats.totalResponses")}
              </div>
            </div>
            <div className="text-center">
              <div className="text-2xl sm:text-3xl font-bold text-amber-600">
                {bookmarkCounts.bookmarked}
              </div>
              <div className="text-xs sm:text-sm text-gray-600">
                {t("topicDetail.stats.bookmarked")}
              </div>
            </div>
            <div className="text-center">
              <div className="text-2xl sm:text-3xl font-bold text-green-600">
                {sentimentCounts.positive}
              </div>
              <div className="text-xs sm:text-sm text-gray-600">
                {t("topicDetail.stats.positive")}
              </div>
            </div>
            <div className="text-center">
              <div className="text-2xl sm:text-3xl font-bold text-red-600">
                {sentimentCounts.negative}
              </div>
              <div className="text-xs sm:text-sm text-gray-600">
                {t("topicDetail.stats.negative")}
              </div>
            </div>
            <div className="text-center">
              <div className="text-2xl sm:text-3xl font-bold text-red-600">
                {actionStatusCounts.unhandled}
              </div>
              <div className="text-xs sm:text-sm text-gray-600">
                {t("topicDetail.stats.unhandled")}
              </div>
            </div>
            <div className="text-center">
              <div className="text-2xl sm:text-3xl font-bold text-yellow-600">
                {actionStatusCounts.inProgress}
              </div>
              <div className="text-xs sm:text-sm text-gray-600">
                {t("topicDetail.stats.inProgress")}
              </div>
            </div>
            <div className="text-center">
              <div className="text-2xl sm:text-3xl font-bold text-green-600">
                {actionStatusCounts.resolved}
              </div>
              <div className="text-xs sm:text-sm text-gray-600">
                {t("topicDetail.stats.resolved")}
              </div>
            </div>
            <div className="text-center">
              <div className="text-2xl sm:text-3xl font-bold text-gray-600">
                {actionStatusCounts.dismissed}
              </div>
              <div className="text-xs sm:text-sm text-gray-600">
                {t("topicDetail.stats.dismissed")}
              </div>
            </div>
          </div>
        </div>


        {/* Enhanced Filters */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-4 sm:p-6 mb-6 sm:mb-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {/* Search */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Search className="h-4 w-4 inline mr-1" />
                {t("topicDetail.filters.search")}
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder={t("topicDetail.filters.searchPlaceholder")}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm sm:text-base"
                />
              </div>
            </div>

            {/* Bookmark Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Bookmark className="h-4 w-4 inline mr-1" />
                {t("topicDetail.filters.bookmark")}
              </label>
              <select
                value={filterOption}
                onChange={(e) =>
                  setFilterOption(e.target.value as FilterOption)
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm sm:text-base"
              >
                <option value="all">
                  {t("topicDetail.filters.all")} ({bookmarkCounts.total})
                </option>
                <option value="bookmarked">
                  {t("topicDetail.filters.bookmarked")} (
                  {bookmarkCounts.bookmarked})
                </option>
                <option value="unbookmarked">
                  {t("topicDetail.filters.unbookmarked")} (
                  {bookmarkCounts.unbookmarked})
                </option>
              </select>
            </div>

            {/* Sentiment Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <TrendingUp className="h-4 w-4 inline mr-1" />
                {t("topicDetail.filters.sentiment")}
              </label>
              <select
                value={sentimentFilter}
                onChange={(e) =>
                  setSentimentFilter(e.target.value as SentimentFilter)
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm sm:text-base"
              >
                <option value="all">
                  {t("topicDetail.filters.all")} (
                  {sentimentCounts.positive +
                    sentimentCounts.negative +
                    sentimentCounts.neutral}
                  )
                </option>
                <option value="positive">
                  {t("topicDetail.filters.positive")} (
                  {sentimentCounts.positive})
                </option>
                <option value="negative">
                  {t("topicDetail.filters.negative")} (
                  {sentimentCounts.negative})
                </option>
                <option value="neutral">
                  {t("topicDetail.filters.neutral")} ({sentimentCounts.neutral})
                </option>
              </select>
            </div>

            {/* Action Status Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Settings className="h-4 w-4 inline mr-1" />
                {t("topicDetail.filters.actionStatus")}
              </label>
              <select
                value={actionStatusFilter}
                onChange={(e) =>
                  setActionStatusFilter(e.target.value as ActionStatusFilter)
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm sm:text-base"
              >
                <option value="all">
                  {t("topicDetail.filters.all")} ({responses.length})
                </option>
                <option value="unhandled">
                  {t("topicDetail.filters.unhandled")} (
                  {actionStatusCounts.unhandled})
                </option>
                <option value="in-progress">
                  {t("topicDetail.filters.inProgress")} (
                  {actionStatusCounts.inProgress})
                </option>
                <option value="resolved">
                  {t("topicDetail.filters.resolved")} (
                  {actionStatusCounts.resolved})
                </option>
                <option value="dismissed">
                  {t("topicDetail.filters.dismissed")} (
                  {actionStatusCounts.dismissed})
                </option>
              </select>
            </div>

            {/* Sort Order */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <SortAsc className="h-4 w-4 inline mr-1" />
                {t("topicDetail.sort.title")}
              </label>
              <select
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value as SortOrder)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm sm:text-base"
              >
                <option value="newest">{t("topicDetail.sort.newest")}</option>
                <option value="oldest">{t("topicDetail.sort.oldest")}</option>
                <option value="reactions">
                  {t("topicDetail.sort.reactions")}
                </option>
                <option value="status">{t("topicDetail.sort.status")}</option>
              </select>
            </div>
          </div>

          {/* Results count */}
          <div className="mt-4 text-xs sm:text-sm text-gray-600">
            {t("topicDetail.topic.responsesFound").replace(
              "{count}",
              filteredAndSortedResponses.length.toString()
            )}
          </div>
        </div>

        {/* Responses List */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-100">
          {filteredAndSortedResponses.length > 0 ? (
            <div className="divide-y divide-gray-200">
              {filteredAndSortedResponses.map((response) => (
                <div
                  key={response.id}
                  className="p-4 sm:p-6 hover:bg-gray-50 transition-colors relative group"
                >
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between">
                    <div className="flex-1 pr-0 sm:pr-4 mb-4 sm:mb-0">
                      <div className="flex flex-wrap items-center gap-2 mb-2 sm:mb-3">
                        <div className="flex items-center text-xs sm:text-sm text-gray-500">
                          <Calendar className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                          <span className="hidden sm:inline">
                            {response.submittedAt.toLocaleString("ja-JP")}
                          </span>
                          <span className="sm:hidden">
                            {response.submittedAt.toLocaleDateString("ja-JP")}
                          </span>
                        </div>
                        <span
                          className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getSentimentBadgeColor(
                            response.sentiment
                          )}`}
                        >
                          {getSentimentText(response.sentiment)}
                        </span>
                        <span
                          className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getActionStatusColor(
                            response.actionStatus
                          )}`}
                        >
                          {getActionStatusText(response.actionStatus)}
                        </span>
                        {response.priority && (
                          <span
                            className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(
                              response.priority
                            )}`}
                          >
                            <Flag className="h-3 w-3 mr-1" />
                            {getPriorityText(response.priority)}
                          </span>
                        )}
                        {response.assignee && (
                          <div className="flex items-center text-xs sm:text-sm text-blue-600">
                            <User className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                            <span className="hidden sm:inline">
                              {response.assignee}
                            </span>
                            <span className="sm:hidden">
                              {t("topicDetail.ui.assigneeShort")}
                            </span>
                          </div>
                        )}
                        {response.dueDate && (
                          <div className="flex items-center text-xs sm:text-sm text-red-600">
                            <Calendar className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                            <span className="hidden sm:inline">
                              {t("topicDetail.ui.dueDate")}:{" "}
                              {new Date(response.dueDate).toLocaleDateString(
                                "ja-JP"
                              )}
                            </span>
                            <span className="sm:hidden">
                              {new Date(response.dueDate).toLocaleDateString(
                                "ja-JP"
                              )}
                            </span>
                          </div>
                        )}
                        {response.isBookmarked && (
                          <div className="flex items-center text-xs sm:text-sm text-amber-600">
                            <BookmarkCheck className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                            <span className="hidden sm:inline">
                              {t("topicDetail.opinions.bookmarkAdded")}
                            </span>
                            <span className="sm:hidden">★</span>
                          </div>
                        )}
                      </div>

                      <div className="text-gray-800 leading-relaxed text-sm sm:text-base mb-3">
                        <div className="line-clamp-3">
                          {truncateText(response.content, 3)}
                        </div>
                        {response.content.split(" ").length > 36 && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCardClick(response);
                            }}
                            className="text-blue-600 hover:text-blue-700 text-xs sm:text-sm font-medium mt-2 inline-flex items-center"
                          >
                            <Eye className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                            {t("topicDetail.topic.readMore")}
                          </button>
                        )}
                      </div>

                      {/* Action Buttons */}
                      <div className="flex flex-wrap gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleActionManagement(response);
                          }}
                          className={`px-3 py-1.5 rounded-lg hover:bg-blue-200 transition-colors text-xs font-medium flex items-center ${
                            isActionRequired(response)
                              ? "bg-blue-100 text-blue-700"
                              : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                          }`}
                          title={
                            isActionRequired(response)
                              ? t("topicDetail.opinions.actionManagement")
                              : t("topicDetail.opinions.actionManagement")
                          }
                        >
                          <Settings className="h-3 w-3 inline mr-1" />
                          {t("topicDetail.opinions.actionManagement")}
                          {isActionRequired(response) && (
                            <Flag className="h-3 w-3 ml-1 text-orange-500" />
                          )}
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCardClick(response);
                          }}
                          className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-xs font-medium"
                        >
                          <Eye className="h-3 w-3 inline mr-1" />
                          {t("topicDetail.opinions.viewDetails")}
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center justify-end sm:justify-start sm:ml-4">
                      {/* Bookmark Button */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleBookmark(response.id);
                        }}
                        className={`p-2 rounded-lg transition-colors ${
                          response.isBookmarked
                            ? "text-amber-600 bg-amber-50 hover:bg-amber-100"
                            : "text-gray-400 hover:text-amber-600 hover:bg-amber-50"
                        }`}
                        title={
                          response.isBookmarked
                            ? t("topicDetail.opinions.unbookmark")
                            : t("topicDetail.opinions.bookmark")
                        }
                      >
                        {response.isBookmarked ? (
                          <BookmarkCheck className="h-4 w-4 sm:h-5 sm:w-5" />
                        ) : (
                          <Bookmark className="h-4 w-4 sm:h-5 sm:w-5" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 sm:py-16">
              <MessageSquare className="h-12 w-12 sm:h-16 sm:w-16 text-gray-300 mx-auto mb-3 sm:mb-4" />
              <h3 className="text-base sm:text-lg font-medium text-gray-900 mb-2">
                {t("topicDetail.opinions.noOpinions")}
              </h3>
              <p className="text-sm sm:text-base text-gray-600 px-4">
                {searchTerm ||
                filterOption !== "all" ||
                sentimentFilter !== "all" ||
                actionStatusFilter !== "all"
                  ? t("topicDetail.opinions.noSearchResults")
                  : t("topicDetail.opinions.noResults")}
              </p>
            </div>
          )}
        </div>
      </main>

      {/* Detail Modal */}
      {detailModalResponse && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <div className="p-4 sm:p-6">
              <div className="space-y-3 sm:space-y-4">
                <div className="flex flex-wrap items-center justify-between space-x-2 sm:space-x-3 gap-y-2">
                  <div className="flex flex-wrap items-center space-x-2 sm:space-x-3 gap-y-2">
                  <span
                    className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getSentimentBadgeColor(
                      detailModalResponse.sentiment
                    )}`}
                  >
                    {getSentimentText(detailModalResponse.sentiment)}
                  </span>
                  {detailModalResponse.isBookmarked && (
                    <div className="flex items-center text-xs sm:text-sm text-amber-600">
                      <BookmarkCheck className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                      {t("topicDetail.opinions.bookmarkAdded")}
                    </div>
                  )}
                  <div className="flex items-center text-xs sm:text-sm text-gray-500">
                    <Calendar className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                    {detailModalResponse.submittedAt.toLocaleString("ja-JP")}
                  </div>
                  </div>
                  <button
                    onClick={() => setDetailModalResponse(null)}
                    className="p-1 text-gray-400 hover:text-gray-600 rounded-lg"
                  >
                    <X className="h-4 w-4 sm:h-5 sm:w-5" />
                  </button>
                </div>

                <div className="bg-gray-50 rounded-lg p-3 sm:p-4">
                  <p className="text-gray-800 leading-relaxed whitespace-pre-wrap text-sm sm:text-base">
                    {detailModalResponse.content}
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3 pt-3 sm:pt-4">
                  <button
                    onClick={() => {
                      toggleBookmark(detailModalResponse.id);
                      setDetailModalResponse((prev) =>
                        prev
                          ? { ...prev, isBookmarked: !prev.isBookmarked }
                          : null
                      );
                    }}
                    className={`px-3 sm:px-4 py-2 rounded-lg transition-colors text-sm sm:text-base ${
                      detailModalResponse.isBookmarked
                        ? "bg-amber-100 text-amber-700 hover:bg-amber-200"
                        : "bg-blue-100 text-blue-700 hover:bg-blue-200"
                    }`}
                  >
                    {detailModalResponse.isBookmarked ? (
                      <>
                        <Bookmark className="h-3 w-3 sm:h-4 sm:w-4 inline mr-1" />
                        {t("topicDetail.opinions.bookmarkRemove")}
                      </>
                    ) : (
                      <>
                        <BookmarkCheck className="h-3 w-3 sm:h-4 sm:w-4 inline mr-1" />
                        {t("topicDetail.opinions.bookmarkAdd")}
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}


      <style>{`
        @keyframes fade-in {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        .animate-fade-in {
          animation: fade-in 0.3s ease-out forwards;
        }

        .line-clamp-3 {
          display: -webkit-box;
          -webkit-line-clamp: 3;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
      `}</style>

      {/* Topic Status Dialog */}
      <TopicStatusDialog
        isOpen={showStatusDialog}
        onClose={() => setShowStatusDialog(false)}
        onConfirm={(reason) => {
          executeStatusChange(pendingStatus, reason);
          setShowStatusDialog(false);
        }}
        status={pendingStatus as "resolved" | "dismissed"}
        topicName={getTopicName(finalTopic)}
        initialReason={dialogStatusReason}
      />

      {/* User Purpose Modal */}
      <UserPurposeModal
        isOpen={showPurposeModal}
        onClose={() => setShowPurposeModal(false)}
      />
    </div>
  );
}
