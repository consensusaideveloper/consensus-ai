import { useState, useEffect, useCallback } from "react";
import {
  Search,
  Calendar,
  MessageSquare,
  Download,
  Eye,
  Bookmark,
  BookmarkCheck,
  Filter,
  SortAsc,
  TrendingUp,
  X,
  Settings,
  Flag,
  User,
  BarChart3,
} from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { useProjects } from "../hooks/useProjects";
import { useAuth } from "../hooks/useAuth";
import { useLanguage } from "../hooks/useLanguage";
import { useSearchDebounce } from "../hooks/useDebounce";
import { ResponsiveHeader } from "./ResponsiveHeader";
import { AnalysisStatusBadge, getAnalysisStatus } from "./AnalysisStatusBadge";
import { UserPurposeModal } from "./UserPurposeModal";

type FilterOption = "all" | "bookmarked" | "unbookmarked";
type SortOrder = "newest" | "oldest" | "reactions" | "status";
type SentimentFilter = "all" | "positive" | "negative" | "neutral";
type ActionStatusFilter =
  | "all"
  | "unhandled"
  | "in-progress"
  | "resolved"
  | "dismissed";
type AnalysisStatusFilter = "all" | "analyzed" | "unanalyzed";

interface Opinion {
  id: string;
  content: string;
  submittedAt: Date;
  isBookmarked?: boolean;
  sentiment?: "positive" | "negative" | "neutral";
  stance?: "agree" | "disagree" | "neutral" | "conditional";
  characterCount?: number;
  topicId?: string;
  actionStatus?: string;
  priority?: string;
  assignee?: string;
  dueDate?: string;
  lastUpdated?: Date;
  // AI分析状態情報（OpinionAnalysisState）
  lastAnalyzedAt?: Date;
  analysisVersion?: number;
  classificationConfidence?: number;
  manualReviewFlag?: boolean;
}

export function ProjectOpinions() {
  const navigate = useNavigate();
  const { id: projectId } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { getProject } = useProjects();
  const { t } = useLanguage();
  const [searchTerm, setSearchTerm] = useState("");
  const debouncedSearchTerm = useSearchDebounce(searchTerm, 300);
  const [filterOption, setFilterOption] = useState<FilterOption>("all");
  const [sentimentFilter, setSentimentFilter] =
    useState<SentimentFilter>("all");
  const [actionStatusFilter, setActionStatusFilter] =
    useState<ActionStatusFilter>("all");
  const [analysisStatusFilter, setAnalysisStatusFilter] =
    useState<AnalysisStatusFilter>("all");
  const [sortOrder, setSortOrder] = useState<SortOrder>("newest");
  const [detailModalOpinion, setDetailModalOpinion] =
    useState<Opinion | null>(null);
  const [notification, setNotification] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showPurposeModal, setShowPurposeModal] = useState(false);

  // 意見一覧を統一API経由で取得
  const [opinions, setOpinions] = useState<Opinion[]>([]);

  const project = projectId ? getProject(projectId) : null;

  // AI分析結果から意見にsentiment情報をマージする関数
  // 注意: ブックマーク状態は分析とは無関係のユーザーアクションなので、常にSQLiteデータを使用
  const mergeAnalysisData = useCallback((rawOpinions: Opinion[]): Opinion[] => {
    if (
      !project?.analysis?.topInsights ||
      !Array.isArray(project.analysis.topInsights)
    ) {
      // AI分析データなし - 元データをそのまま返却
      return rawOpinions.map((opinion) => ({
        ...opinion,
        sentiment: opinion.sentiment || "neutral",
        isBookmarked: opinion.isBookmarked || false,
      }));
    }

    // AI分析データ処理開始

    // AI分析結果のopinionsをマップ化（トピックIDも含めて）
    // Note: isBookmarkedは分析データではなくユーザーアクションなので含めない
    const analysisOpinionsMap = new Map<string, {
      sentiment?: string;
      stance?: string;
      topicId?: string;
      lastAnalyzedAt?: Date;
      analysisVersion?: number;
    }>();
    project.analysis.topInsights.forEach((topic: { title?: string; name?: string; id?: string; opinions?: Array<{ id: string; content: string; sentiment?: string; isBookmarked?: boolean; topicId?: string; opinionId?: string; }> }, topicIndex: number) => {
      // トピック処理
      if (topic.opinions && Array.isArray(topic.opinions)) {
        // opinions処理
        (topic.opinions as Array<{ id?: string; sentiment?: string; stance?: string; topicId?: string; lastAnalyzedAt?: string | Date; analysisVersion?: number }>).forEach((opinion) => {
          if (opinion.id) {
            // Opinion情報をマップに設定（isBookmarkedは除外 - ユーザーアクションデータのため）
            analysisOpinionsMap.set(opinion.id, {
              sentiment: opinion.sentiment,
              stance: opinion.stance,
              topicId: topic.id || `topic-${topicIndex}`, // トピックIDを明示的に設定
              lastAnalyzedAt: opinion.lastAnalyzedAt ? new Date(opinion.lastAnalyzedAt) : new Date(), // AI分析済みなので現在時刻を設定
              analysisVersion: opinion.analysisVersion || 1, // AI分析済みなのでバージョン1以上
            });
          }
        });
      } else {
        // opinions配列なし
      }
    });

    // AI分析データ統合

    // sentiment、stance、topicId、分析状態をマージ（ブックマークは常にSQLiteデータを使用）
    const mergedOpinions = rawOpinions.map((opinion) => {
      const analysisData = analysisOpinionsMap.get(opinion.id) as {
        sentiment?: string;
        stance?: string;
        topicId?: string;
        lastAnalyzedAt?: Date;
        analysisVersion?: number;
      } | undefined;
      if (analysisData) {
        const finalSentiment =
          analysisData.sentiment || opinion.sentiment || "neutral";
        const finalStance =
          analysisData.stance || opinion.stance || "neutral";
        // ブックマーク状態: ユーザーアクションなので常にSQLiteデータを使用
        const finalBookmarked = opinion.isBookmarked || false;

        // Opinionマージ成功

        return {
          ...opinion,
          sentiment: finalSentiment as "positive" | "negative" | "neutral",
          stance: finalStance as "agree" | "disagree" | "neutral" | "conditional",
          topicId: analysisData.topicId || opinion.topicId,
          isBookmarked: finalBookmarked,
          // 分析状態フィールドの統合
          lastAnalyzedAt: analysisData.lastAnalyzedAt || opinion.lastAnalyzedAt,
          analysisVersion: analysisData.analysisVersion || opinion.analysisVersion,
        };
      }
      // 分析データマッチなし - SQLiteデータを保持
      return {
        ...opinion,
        sentiment: (opinion.sentiment || "neutral") as
          | "positive"
          | "negative"
          | "neutral",
        stance: (opinion.stance || "neutral") as
          | "agree"
          | "disagree"
          | "neutral"
          | "conditional",
        isBookmarked: opinion.isBookmarked || false,
        // SQLiteの分析状態フィールドを保持
        lastAnalyzedAt: opinion.lastAnalyzedAt,
        analysisVersion: opinion.analysisVersion,
        classificationConfidence: opinion.classificationConfidence,
        manualReviewFlag: opinion.manualReviewFlag,
      };
    });

    // 分析データ統合完了

    return mergedOpinions;
  }, [project?.analysis?.topInsights]);

  useEffect(() => {
    let isCancelled = false;

    if (!projectId) {
      if (!isCancelled) {
        setError("プロジェクトIDが取得できません");
        setIsLoading(false);
      }
      return;
    }

    if (!user?.id) {
      if (!isCancelled) {
        setError("ユーザーIDが取得できません");
        setIsLoading(false);
      }
      return;
    }

    if (!isCancelled) {
      setIsLoading(true);
      setError(null);
    }

    // 統一SQLite API経由で意見データ取得中

    // 統一API経由での意見データ取得（重複除去のためFirebase直接アクセスを削除）
    const fetchOpinionsFromAPI = async () => {
      if (isCancelled) return;

      try {
        // 統一API呼び出し（分析状態フィルタ・ソート対応）
        const queryParams = new URLSearchParams();
        if (analysisStatusFilter !== 'all') {
          queryParams.append('analysisStatus', analysisStatusFilter);
        }
        if (sortOrder === 'newest') {
          queryParams.append('sortBy', 'submittedAt');
          queryParams.append('sortOrder', 'desc');
        } else if (sortOrder === 'oldest') {
          queryParams.append('sortBy', 'submittedAt');
          queryParams.append('sortOrder', 'asc');
        }
        
        const apiUrl = `/api/db/projects/${projectId}/opinions${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;

        const apiResponse = await fetch(apiUrl, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            "X-User-ID": user.id,
          },
        });

        if (!apiResponse.ok) {
          if (apiResponse.status === 404) {
            // プロジェクトに意見データがない場合
            // プロジェクトに意見データがありません
            if (!isCancelled) {
              setOpinions([]);
              setIsLoading(false);
            }
            return;
          }
          throw new Error(
            `API エラー: ${apiResponse.status} ${apiResponse.statusText}`
          );
        }

        const apiData = await apiResponse.json();
        // SQLite API データ取得成功

        if (!Array.isArray(apiData)) {
          throw new Error(
            "APIから期待された配列形式のデータが返されませんでした"
          );
        }

        // SQLiteデータをOpinion形式に変換
        const opinionList: Opinion[] = apiData.map((opinion: { 
          id?: string; 
          content?: string; 
          sentiment?: string; 
          stance?: string; 
          isBookmarked?: boolean; 
          topicId?: string; 
          createdAt?: string; 
          stanceAnalyses?: Array<{stance: string}>;
          lastAnalyzedAt?: string | Date | null;
          analysisVersion?: number;
          classificationConfidence?: number;
          manualReviewFlag?: boolean;
        }) => ({
          id: opinion.id || String(Math.random()),
          content: opinion.content || "",
          submittedAt: new Date(opinion.createdAt || Date.now()),
          isBookmarked: opinion.isBookmarked || false,
          sentiment: (() => {
            const normalizedSentiment = opinion.sentiment?.toLowerCase?.();
            return normalizedSentiment === "positive" ||
                   normalizedSentiment === "negative" ||
                   normalizedSentiment === "neutral"
              ? normalizedSentiment as "positive" | "negative" | "neutral"
              : "neutral";
          })(),
          stance: (() => {
            let stanceValue: string | undefined;
            if (opinion.stanceAnalyses && opinion.stanceAnalyses.length > 0) {
              stanceValue = opinion.stanceAnalyses[0].stance;
            } else {
              stanceValue = opinion.stance;
            }
            const normalizedStance = stanceValue?.toLowerCase?.();
            return normalizedStance === "agree" ||
                   normalizedStance === "disagree" ||
                   normalizedStance === "neutral" ||
                   normalizedStance === "conditional"
              ? normalizedStance as "agree" | "disagree" | "neutral" | "conditional"
              : "neutral";
          })(),
          characterCount: opinion.content?.length || 0,
          topicId: opinion.topicId,
          actionStatus: "unhandled",
          priority: "medium",
          // 分析状態フィールドを追加
          lastAnalyzedAt: opinion.lastAnalyzedAt ? new Date(opinion.lastAnalyzedAt) : undefined,
          analysisVersion: opinion.analysisVersion || undefined,
          classificationConfidence: opinion.classificationConfidence || undefined,
          manualReviewFlag: opinion.manualReviewFlag || false,
        }));

        // AI分析データとマージ
        const finalOpinions = mergeAnalysisData(opinionList);
        // AI分析データ統合完了

        if (!isCancelled) {
          setOpinions(finalOpinions);
          setIsLoading(false);
        }
      } catch (apiError) {
        // 統一API取得エラー
        if (!isCancelled) {
          setError(
            apiError instanceof Error
              ? apiError.message
              : "意見データの取得に失敗しました"
          );
          setIsLoading(false);
        }
      }
    };

    fetchOpinionsFromAPI();

    // クリーンアップ関数
    return () => {
      isCancelled = true;
    };
  }, [user?.id, projectId, analysisStatusFilter, sortOrder, mergeAnalysisData]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">
            {t("projectOpinions.messages.loadingData")}
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg mb-4">
            <p className="font-medium">
              {t("projectOpinions.messages.errorOccurred")}
            </p>
            <p className="text-sm">{error}</p>
          </div>
          <button
            onClick={() => window.location.reload()}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            {t("projectOpinions.messages.reload")}
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
            {t("projectOpinions.messages.projectNotFound")}
          </h2>
          <button
            onClick={() => navigate("/dashboard")}
            className="bg-blue-600 text-white px-4 sm:px-6 py-2 sm:py-3 rounded-lg hover:bg-blue-700 transition-colors text-sm sm:text-base"
          >
            {t("projectOpinions.messages.backToDashboard")}
          </button>
        </div>
      </div>
    );
  }

  // Enhanced filter and sort opinions with sentiment and analysis status
  const filteredAndSortedOpinions = opinions
    .filter((opinion) => {
      const matchesSearch = opinion.content
        .toLowerCase()
        .includes(debouncedSearchTerm.toLowerCase());
      const matchesFilter =
        filterOption === "all" ||
        (filterOption === "bookmarked" && opinion.isBookmarked) ||
        (filterOption === "unbookmarked" && !opinion.isBookmarked);
      const matchesSentiment =
        sentimentFilter === "all" || opinion.sentiment === sentimentFilter;
      const matchesActionStatus =
        actionStatusFilter === "all" ||
        opinion.actionStatus === actionStatusFilter;
      const matchesAnalysisStatus =
        analysisStatusFilter === "all" ||
        getAnalysisStatus(opinion) === analysisStatusFilter;
      return (
        matchesSearch &&
        matchesFilter &&
        matchesSentiment &&
        matchesActionStatus &&
        matchesAnalysisStatus
      );
    })
    .sort((a, b) => {
      switch (sortOrder) {
        case "newest":
          return b.submittedAt.getTime() - a.submittedAt.getTime();
        case "oldest":
          return a.submittedAt.getTime() - b.submittedAt.getTime();
        case "reactions":
          return (b.isBookmarked ? 1 : 0) - (a.isBookmarked ? 1 : 0);
        case "status": {
          const statusPriority: Record<string, number> = {
            unhandled: 4,
            "in-progress": 3,
            resolved: 2,
            dismissed: 1,
          };
          return (
            statusPriority[b.actionStatus || "unhandled"] -
            statusPriority[a.actionStatus || "unhandled"]
          );
        }
        default:
          return 0;
      }
    });

  const handleExportCSV = () => {
    const csvContent = [
      [
        t("projectOpinions.csv.headers.id"),
        t("projectOpinions.csv.headers.submittedAt"),
        t("projectOpinions.csv.headers.content"),
        t("projectOpinions.csv.headers.isBookmarked"),
        t("projectOpinions.csv.headers.sentiment"),
      ],
      ...filteredAndSortedOpinions.map((opinion) => [
        opinion.id,
        opinion.submittedAt.toLocaleString(),
        `"${opinion.content.replace(/"/g, '""')}"`,
        opinion.isBookmarked
          ? t("projectOpinions.csv.values.yes")
          : t("projectOpinions.csv.values.no"),
        getSentimentText(opinion.sentiment || "neutral"),
      ]),
    ]
      .map((row) => row.join(","))
      .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `${project.name}_opinions_filtered.csv`;
    link.click();
  };

  const toggleBookmark = async (opinionId: string) => {
    try {
      const opinion = opinions.find((r) => r.id === opinionId);
      if (!opinion) return;

      const newBookmarkState = !opinion.isBookmarked;

      // 統一API経由でブックマーク状態を更新

      // 統一API経由でブックマーク状態を更新
      const apiResponse = await fetch(
        `/api/db/projects/${projectId}/opinions/${opinionId}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            "X-User-ID": user?.id || "",
          },
          body: JSON.stringify({
            isBookmarked: newBookmarkState,
          }),
        }
      );

      if (!apiResponse.ok) {
        // APIブックマーク更新エラー
        throw new Error(
          `ブックマーク更新に失敗しました: ${apiResponse.statusText}`
        );
      }

      // APIブックマーク更新成功

      // AI分析データ内のブックマーク状態も更新（ローカル状態同期）
      if (project?.analysis?.topInsights) {
        project.analysis.topInsights.forEach((topic: { opinions?: { id?: string; isBookmarked?: boolean; [key: string]: unknown; }[]; [key: string]: unknown }) => {
          if (topic.opinions && Array.isArray(topic.opinions)) {
            const opinionIndex = topic.opinions.findIndex(
              (op) => op.id === opinionId
            );
            if (opinionIndex !== -1) {
              topic.opinions[opinionIndex].isBookmarked = newBookmarkState;
              // AI分析データのローカルブックマーク状態を更新
            }
          }
        });
      }

      // ローカル状態を更新
      setOpinions((prev) =>
        prev.map((opinion) => {
          if (opinion.id === opinionId) {
            return { ...opinion, isBookmarked: newBookmarkState };
          }
          return opinion;
        })
      );

      // ユーザーに成功通知を表示
      showNotification(
        newBookmarkState
          ? t("projectOpinions.messages.bookmarkAdded")
          : t("projectOpinions.messages.bookmarkRemoved")
      );
    } catch {
      // ブックマーク更新エラー
      showNotification(t("projectOpinions.messages.bookmarkUpdateFailed"));
    }
  };

  const showNotification = (message: string) => {
    setNotification(message);
    setTimeout(() => setNotification(null), 3000);
  };

  const getBookmarkCounts = () => {
    return {
      total: opinions.length,
      bookmarked: opinions.filter((o) => o.isBookmarked === true).length,
      unbookmarked: opinions.filter((o) => o.isBookmarked !== true).length,
    };
  };



  const getAnalysisStatusCounts = () => {
    return {
      analyzed: opinions.filter((o) => getAnalysisStatus(o) === "analyzed").length,
      unanalyzed: opinions.filter((o) => getAnalysisStatus(o) === "unanalyzed").length,
    };
  };

  const getSentimentText = (sentiment: "positive" | "negative" | "neutral") => {
    switch (sentiment) {
      case "positive":
        return t("projectOpinions.sentiment.positive");
      case "negative":
        return t("projectOpinions.sentiment.negative");
      case "neutral":
        return t("projectOpinions.sentiment.neutral");
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

  // sentimentを賛成・反対・中立として表示する関数
  const getSentimentAsStanceText = (sentiment: "positive" | "negative" | "neutral") => {
    switch (sentiment?.toLowerCase()) {
      case "positive":
        return t("projectOpinions.stance.agree"); // 賛成
      case "negative":
        return t("projectOpinions.stance.disagree"); // 反対
      case "neutral":
      default:
        return t("projectOpinions.stance.neutral"); // 中立
    }
  };

  const getSentimentAsStanceBadgeColor = (
    sentiment: "positive" | "negative" | "neutral"
  ) => {
    switch (sentiment?.toLowerCase()) {
      case "positive":
        return "bg-blue-100 text-blue-800"; // 賛成
      case "negative":
        return "bg-red-100 text-red-800"; // 反対
      case "neutral":
      default:
        return "bg-gray-100 text-gray-800"; // 中立
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
        return t("projectOpinions.actionStatus.unhandled");
      case "in-progress":
        return t("projectOpinions.actionStatus.inProgress");
      case "resolved":
        return t("projectOpinions.actionStatus.resolved");
      case "dismissed":
        return t("projectOpinions.actionStatus.dismissed");
      default:
        return t("projectOpinions.actionStatus.unknown");
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
        return t("projectOpinions.priority.high");
      case "medium":
        return t("projectOpinions.priority.medium");
      case "low":
        return t("projectOpinions.priority.low");
      default:
        return t("projectOpinions.priority.none");
    }
  };

  const getStanceCounts = () => {
    return {
      agree: opinions.filter((o) => o.lastAnalyzedAt && o.sentiment?.toLowerCase?.() === "positive").length,
      disagree: opinions.filter((o) => o.lastAnalyzedAt && o.sentiment?.toLowerCase?.() === "negative").length,
      neutral: opinions.filter((o) => o.lastAnalyzedAt && o.sentiment?.toLowerCase?.() === "neutral").length,
      conditional: 0, // sentimentには条件付きがないため0
    };
  };

  const getSentimentCounts = () => {
    return {
      positive: opinions.filter((o) => o.sentiment?.toLowerCase?.() === "positive").length,
      negative: opinions.filter((o) => o.sentiment?.toLowerCase?.() === "negative").length,
      neutral: opinions.filter((o) => o.sentiment?.toLowerCase?.() === "neutral").length,
    };
  };

  const bookmarkCounts = getBookmarkCounts();
  const stanceCounts = getStanceCounts();
  const analysisStatusCounts = getAnalysisStatusCounts();
  const sentimentCounts = getSentimentCounts();

  const handleCardClick = (opinion: Opinion) => {
    setDetailModalOpinion(opinion);
  };

  const handleActionManagement = (opinion: Opinion) => {
    navigate(
      `/projects/${projectId}/topics/${opinion.topicId}/opinions/${opinion.id}/action`
    );
  };

  const handleOpenPurposeModal = () => {
    setShowPurposeModal(true);
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      {/* Notification */}
      {notification && (
        <div className="fixed top-4 right-4 bg-blue-100 border border-blue-400 text-blue-700 px-3 sm:px-4 py-2 sm:py-3 rounded-lg shadow-lg z-50 animate-fade-in">
          <div className="flex items-center">
            <Bookmark className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
            <span className="text-sm sm:text-base">{notification}</span>
          </div>
        </div>
      )}

      {/* Header */}
      <ResponsiveHeader
        breadcrumbs={[
          { label: t("breadcrumb.dashboard"), path: "/dashboard" },
          { label: project.name, path: `/projects/${projectId}` },
          { label: t("projectOpinions.title") },
        ]}
        onOpenPurposeSettings={handleOpenPurposeModal}
        actions={
          <button
            onClick={handleExportCSV}
            className="flex items-center px-3 sm:px-4 py-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors font-medium text-sm"
          >
            <Download className="h-4 w-4 mr-1 sm:mr-2" />
            <span className="hidden sm:inline">
              {t("projectOpinions.actions.exportCsv")}
            </span>
            <span className="sm:hidden">
              {t("projectOpinions.actions.exportCsvShort")}
            </span>
          </button>
        }
        mobileActions={[
          {
            label: t("projectOpinions.mobileActions.exportCsv"),
            icon: <Download className="h-4 w-4" />,
            onClick: handleExportCSV,
            variant: "primary",
          },
        ]}
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {/* Enhanced KPI Stats */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-4 sm:p-6 mb-6 sm:mb-8">
          {project?.analysis &&
          project.analysis.topInsights &&
          project.analysis.topInsights.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4 sm:gap-6">
              {/* 基本統計 (4項目) */}
              <div className="text-center">
                <div className="text-2xl sm:text-3xl font-bold text-blue-600">
                  {bookmarkCounts.total}
                </div>
                <div className="text-xs sm:text-sm text-gray-600">
                  {t("projectOpinions.stats.totalOpinions")}
                </div>
              </div>
              <div className="text-center">
                <div className="text-2xl sm:text-3xl font-bold text-amber-600">
                  {bookmarkCounts.bookmarked}
                </div>
                <div className="text-xs sm:text-sm text-gray-600">
                  {t("projectOpinions.stats.bookmarked")}
                </div>
              </div>
              <div className="text-center">
                <div className="text-2xl sm:text-3xl font-bold text-purple-600">
                  {analysisStatusCounts.analyzed}
                </div>
                <div className="text-xs sm:text-sm text-gray-600">
                  {t("projectOpinions.stats.analyzed")}
                </div>
              </div>
              <div className="text-center">
                <div className="text-2xl sm:text-3xl font-bold text-orange-600">
                  {analysisStatusCounts.unanalyzed}
                </div>
                <div className="text-xs sm:text-sm text-gray-600">
                  {t("projectOpinions.stats.unanalyzed")}
                </div>
              </div>
              
              {/* 立場分析統計 (3項目) */}
              <div className="text-center">
                <div className="text-2xl sm:text-3xl font-bold text-green-600">
                  {stanceCounts.agree}
                </div>
                <div className="text-xs sm:text-sm text-gray-600">
                  {t("projectOpinions.stats.agreeStance")}
                </div>
              </div>
              <div className="text-center">
                <div className="text-2xl sm:text-3xl font-bold text-red-600">
                  {stanceCounts.disagree}
                </div>
                <div className="text-xs sm:text-sm text-gray-600">
                  {t("projectOpinions.stats.disagreeStance")}
                </div>
              </div>
              <div className="text-center">
                <div className="text-2xl sm:text-3xl font-bold text-gray-600">
                  {stanceCounts.neutral}
                </div>
                <div className="text-xs sm:text-sm text-gray-600">
                  {t("projectOpinions.stats.neutralStance")}
                </div>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
              {/* 分析前の簡易表示 */}
              <div className="text-center">
                <div className="text-2xl sm:text-3xl font-bold text-blue-600">
                  {bookmarkCounts.total}
                </div>
                <div className="text-xs sm:text-sm text-gray-600">
                  {t("projectOpinions.stats.totalOpinions")}
                </div>
              </div>
              <div className="text-center">
                <div className="text-2xl sm:text-3xl font-bold text-amber-600">
                  {bookmarkCounts.bookmarked}
                </div>
                <div className="text-xs sm:text-sm text-gray-600">
                  {t("projectOpinions.stats.bookmarked")}
                </div>
              </div>
              <div className="text-center">
                <div className="text-2xl sm:text-3xl font-bold text-purple-600">
                  {analysisStatusCounts.analyzed}
                </div>
                <div className="text-xs sm:text-sm text-gray-600">
                  {t("projectOpinions.stats.analyzed")}
                </div>
              </div>
              <div className="text-center">
                <div className="text-2xl sm:text-3xl font-bold text-orange-600">
                  {analysisStatusCounts.unanalyzed}
                </div>
                <div className="text-xs sm:text-sm text-gray-600">
                  {t("projectOpinions.stats.unanalyzed")}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Enhanced Filters */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-4 sm:p-6 mb-6 sm:mb-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4">
            {/* Search */}
            <div className="sm:col-span-2 lg:col-span-1">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Search className="h-4 w-4 inline mr-1" />
                {t("projectOpinions.filters.search")}
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder={t("projectOpinions.filters.searchPlaceholder")}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm sm:text-base"
                />
              </div>
            </div>

            {/* Bookmark Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Filter className="h-4 w-4 inline mr-1" />
                {t("projectOpinions.filters.bookmarked")}
              </label>
              <select
                value={filterOption}
                onChange={(e) =>
                  setFilterOption(e.target.value as FilterOption)
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm sm:text-base"
              >
                <option value="all">
                  {t("projectOpinions.filters.all")} ({bookmarkCounts.total})
                </option>
                <option value="bookmarked">
                  {t("projectOpinions.filters.bookmarked")} (
                  {bookmarkCounts.bookmarked})
                </option>
                <option value="unbookmarked">
                  {t("projectOpinions.filters.unbookmarked")} (
                  {bookmarkCounts.unbookmarked})
                </option>
              </select>
            </div>

            {/* Sentiment Filter - AI分析後のみ表示 */}
            {project?.analysis &&
              project.analysis.topInsights &&
              project.analysis.topInsights.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <TrendingUp className="h-4 w-4 inline mr-1" />
                    {t("projectOpinions.filters.sentiment")}
                  </label>
                  <select
                    value={sentimentFilter}
                    onChange={(e) =>
                      setSentimentFilter(e.target.value as SentimentFilter)
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm sm:text-base"
                  >
                    <option value="all">
                      {t("projectOpinions.filters.all")} (
                      {sentimentCounts.positive +
                        sentimentCounts.negative +
                        sentimentCounts.neutral}
                      )
                    </option>
                    <option value="positive">
                      {t("projectOpinions.filters.positive")} (
                      {sentimentCounts.positive})
                    </option>
                    <option value="negative">
                      {t("projectOpinions.filters.negative")} (
                      {sentimentCounts.negative})
                    </option>
                    <option value="neutral">
                      {t("projectOpinions.filters.neutral")} (
                      {sentimentCounts.neutral})
                    </option>
                  </select>
                </div>
              )}

            {/* Action Status Filter - AI分析後のみ表示 */}
            {project?.analysis &&
              project.analysis.topInsights &&
              project.analysis.topInsights.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <Settings className="h-4 w-4 inline mr-1" />
                    {t("projectOpinions.filters.actionStatus")}
                  </label>
                  <select
                    value={actionStatusFilter}
                    onChange={(e) =>
                      setActionStatusFilter(
                        e.target.value as ActionStatusFilter
                      )
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm sm:text-base"
                  >
                    <option value="all">
                      {t("projectOpinions.filters.all")} ({opinions.length})
                    </option>
                    <option value="unhandled">
                      {t("projectOpinions.filters.unhandled")} (
                      {
                        opinions.filter((o) => o.actionStatus === "unhandled")
                          .length
                      }
                      )
                    </option>
                    <option value="in-progress">
                      {t("projectOpinions.filters.inProgress")} (
                      {
                        opinions.filter(
                          (o) => o.actionStatus === "in-progress"
                        ).length
                      }
                      )
                    </option>
                    <option value="resolved">
                      {t("projectOpinions.filters.resolved")} (
                      {
                        opinions.filter((o) => o.actionStatus === "resolved")
                          .length
                      }
                      )
                    </option>
                    <option value="dismissed">
                      {t("projectOpinions.filters.dismissed")} (
                      {
                        opinions.filter((o) => o.actionStatus === "dismissed")
                          .length
                      }
                      )
                    </option>
                  </select>
                </div>
              )}

            {/* Analysis Status Filter - AI分析機能が有効な場合のみ表示 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <BarChart3 className="h-4 w-4 inline mr-1" />
{t('analysisStatus.filter.title')}
              </label>
              <select
                value={analysisStatusFilter}
                onChange={(e) =>
                  setAnalysisStatusFilter(
                    e.target.value as AnalysisStatusFilter
                  )
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm sm:text-base"
              >
                <option value="all">
                  {t('analysisStatus.filter.all')} ({analysisStatusCounts.analyzed + analysisStatusCounts.unanalyzed})
                </option>
                <option value="analyzed">
                  {t('analysisStatus.filter.analyzed')} ({analysisStatusCounts.analyzed})
                </option>
                <option value="unanalyzed">
                  {t('analysisStatus.filter.unanalyzed')} ({analysisStatusCounts.unanalyzed})
                </option>
              </select>
            </div>

            {/* Sort Order */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <SortAsc className="h-4 w-4 inline mr-1" />
                {t("projectOpinions.sort.title")}
              </label>
              <select
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value as SortOrder)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm sm:text-base"
              >
                <option value="newest">
                  {t("projectOpinions.sort.newest")}
                </option>
                <option value="oldest">
                  {t("projectOpinions.sort.oldest")}
                </option>
                <option value="reactions">
                  {t("projectOpinions.sort.reactions")}
                </option>
                <option value="status">
                  {t("projectOpinions.sort.status")}
                </option>
              </select>
            </div>
          </div>

          {/* Results count */}
          <div className="mt-4 text-xs sm:text-sm text-gray-600">
            {filteredAndSortedOpinions.length}{" "}
            {t("projectOpinions.messages.resultsFound")}
          </div>
        </div>

        {/* Opinions List */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-100">
          {filteredAndSortedOpinions.length > 0 ? (
            <div className="divide-y divide-gray-200">
              {filteredAndSortedOpinions.map((opinion) => (
                <div
                  key={opinion.id}
                  className="p-4 sm:p-6 hover:bg-gray-50 transition-colors cursor-pointer relative group"
                  onClick={() => handleCardClick(opinion)}
                >
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between">
                    <div className="flex-1 pr-0 sm:pr-4 mb-4 sm:mb-0">
                      <div className="flex flex-wrap items-center space-x-2 sm:space-x-3 mb-2 sm:mb-3 gap-y-2">
                        <div className="flex items-center text-xs sm:text-sm text-gray-500">
                          <Calendar className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                          <span className="hidden sm:inline">
                            {opinion.submittedAt.toLocaleString("ja-JP")}
                          </span>
                          <span className="sm:hidden">
                            {opinion.submittedAt.toLocaleDateString("ja-JP")}
                          </span>
                        </div>
                        {/* 分析状態バッジ */}
                        <AnalysisStatusBadge
                          status={getAnalysisStatus(opinion)}
                          lastAnalyzedAt={opinion.lastAnalyzedAt}
                          analysisVersion={opinion.analysisVersion}
                          classificationConfidence={opinion.classificationConfidence}
                          manualReviewFlag={opinion.manualReviewFlag}
                          size="sm"
                        />

                        {/* センチメントタグ - AI分析済みの場合のみ表示 */}
                        {opinion.lastAnalyzedAt && opinion.sentiment && (
                          <span
                            className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getSentimentAsStanceBadgeColor(
                              opinion.sentiment
                            )}`}
                          >
                            {getSentimentAsStanceText(opinion.sentiment)}
                          </span>
                        )}

                        {/* アクションステータスタグ - AI分析後のみ表示 */}
                        {project?.analysis &&
                          project.analysis.topInsights &&
                          project.analysis.topInsights.length > 0 && (
                            <span
                              className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getActionStatusColor(
                                opinion.actionStatus || "unhandled"
                              )}`}
                            >
                              {getActionStatusText(
                                opinion.actionStatus || "unhandled"
                              )}
                            </span>
                          )}

                        {/* 優先度タグ - AI分析後かつ優先度が設定されている場合のみ表示 */}
                        {project?.analysis &&
                          project.analysis.topInsights &&
                          project.analysis.topInsights.length > 0 &&
                          opinion.priority &&
                          opinion.priority !== "medium" && (
                            <span
                              className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(
                                opinion.priority
                              )}`}
                            >
                              <Flag className="h-3 w-3 mr-1" />
                              {getPriorityText(opinion.priority)}
                            </span>
                          )}

                        {/* 担当者タグ - AI分析後かつ担当者が設定されている場合のみ表示 */}
                        {project?.analysis &&
                          project.analysis.topInsights &&
                          project.analysis.topInsights.length > 0 &&
                          opinion.assignee && (
                            <div className="flex items-center text-xs sm:text-sm text-blue-600">
                              <User className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                              <span className="hidden sm:inline">
                                {opinion.assignee}
                              </span>
                              <span className="sm:hidden">
                                {t("projectOpinions.messages.assigneeShort")}
                              </span>
                            </div>
                          )}

                        {/* 期限タグ - AI分析後かつ期限が設定されている場合のみ表示 */}
                        {project?.analysis &&
                          project.analysis.topInsights &&
                          project.analysis.topInsights.length > 0 &&
                          opinion.dueDate && (
                            <div className="flex items-center text-xs sm:text-sm text-red-600">
                              <Calendar className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                              <span className="hidden sm:inline">
                                {t("projectOpinions.opinion.dueDate")}:{" "}
                                {new Date(opinion.dueDate).toLocaleDateString(
                                  "ja-JP"
                                )}
                              </span>
                              <span className="sm:hidden">
                                {new Date(opinion.dueDate).toLocaleDateString(
                                  "ja-JP"
                                )}
                              </span>
                            </div>
                          )}
                        {opinion.isBookmarked && (
                          <div className="flex items-center text-xs sm:text-sm text-amber-600">
                            <BookmarkCheck className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                            <span className="hidden sm:inline">
                              {t("projectOpinions.messages.bookmarked")}
                            </span>
                            <span className="sm:hidden">★</span>
                          </div>
                        )}
                      </div>

                      <div className="text-gray-800 leading-relaxed text-sm sm:text-base mb-3">
                        <div className="line-clamp-3">
                          {truncateText(opinion.content, 3)}
                        </div>
                        {opinion.content.split(" ").length > 36 && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCardClick(opinion);
                            }}
                            className="text-blue-600 hover:text-blue-700 text-xs sm:text-sm font-medium mt-2 inline-flex items-center"
                          >
                            <Eye className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                            {t("projectOpinions.opinion.readMore")}
                          </button>
                        )}
                      </div>

                      {/* アクションボタン - AI分析後のみ表示 */}
                      {project?.analysis &&
                        project.analysis.topInsights &&
                        project.analysis.topInsights.length > 0 && (
                          <div className="flex flex-wrap gap-2">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleActionManagement(opinion);
                              }}
                              className="px-3 py-1.5 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors text-xs font-medium"
                            >
                              <Settings className="h-3 w-3 inline mr-1" />
                              {t("projectOpinions.opinion.actionManagement")}
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleCardClick(opinion);
                              }}
                              className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-xs font-medium"
                            >
                              <Eye className="h-3 w-3 inline mr-1" />
                              {t("projectOpinions.opinion.viewDetails")}
                            </button>
                          </div>
                        )}
                    </div>

                    <div className="flex items-center justify-end sm:justify-start sm:ml-4">
                      {/* Bookmark Button */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleBookmark(opinion.id);
                        }}
                        className={`p-2 rounded-lg transition-colors ${
                          opinion.isBookmarked
                            ? "text-amber-600 bg-amber-50 hover:bg-amber-100"
                            : "text-gray-400 hover:text-amber-600 hover:bg-amber-50"
                        }`}
                        title={
                          opinion.isBookmarked
                            ? t("projectOpinions.opinion.unbookmark")
                            : t("projectOpinions.opinion.bookmark")
                        }
                      >
                        {opinion.isBookmarked ? (
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
                {t("projectOpinions.messages.noOpinions")}
              </h3>
              <p className="text-sm sm:text-base text-gray-600 px-4 mb-4">
                {debouncedSearchTerm ||
                filterOption !== "all" ||
                sentimentFilter !== "all"
                  ? t("projectOpinions.messages.noFilteredOpinions")
                  : t("projectOpinions.messages.noOpinions")}
              </p>
            </div>
          )}
        </div>
      </main>

      {/* Detail Modal */}
      {detailModalOpinion && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <div className="p-4 sm:p-6">
              <div className="space-y-3 sm:space-y-4">
                <div className="flex flex-wrap items-center justify-between space-x-2 sm:space-x-3 gap-y-2">
                  <div className="flex flex-wrap items-center space-x-2 sm:space-x-3 gap-y-2">
                  {/* モーダルでも同様にAI分析状態に応じて表示 */}
                  {detailModalOpinion.lastAnalyzedAt ? (
                    <span
                      className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getSentimentBadgeColor(
                        detailModalOpinion.sentiment || "neutral"
                      )}`}
                    >
                      {getSentimentText(
                        detailModalOpinion.sentiment || "neutral"
                      )}
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-600 border border-dashed border-blue-200">
                      {t("projectOpinions.messages.awaitingAnalysis")}
                    </span>
                  )}
                  {detailModalOpinion.isBookmarked && (
                    <div className="flex items-center text-xs sm:text-sm text-amber-600">
                      <BookmarkCheck className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                      {t("projectOpinions.messages.bookmarked")}
                    </div>
                  )}
                  <div className="flex items-center text-xs sm:text-sm text-gray-500">
                    <Calendar className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                    {detailModalOpinion.submittedAt.toLocaleString("ja-JP")}
                  </div>
                  </div>
                  <button
                    onClick={() => setDetailModalOpinion(null)}
                    className="p-1 text-gray-400 hover:text-gray-600 rounded-lg"
                  >
                    <X className="h-4 w-4 sm:h-5 sm:w-5" />
                  </button>
                </div>

                <div className="bg-gray-50 rounded-lg p-3 sm:p-4">
                  <p className="text-gray-800 leading-relaxed whitespace-pre-wrap text-sm sm:text-base">
                    {detailModalOpinion.content}
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3 pt-3 sm:pt-4">
                  <button
                    onClick={() => {
                      toggleBookmark(detailModalOpinion.id);
                      setDetailModalOpinion((prev) =>
                        prev
                          ? { ...prev, isBookmarked: !prev.isBookmarked }
                          : null
                      );
                    }}
                    className={`px-3 sm:px-4 py-2 rounded-lg transition-colors text-sm sm:text-base ${
                      detailModalOpinion.isBookmarked
                        ? "bg-amber-100 text-amber-700 hover:bg-amber-200"
                        : "bg-blue-100 text-blue-700 hover:bg-blue-200"
                    }`}
                  >
                    {detailModalOpinion.isBookmarked ? (
                      <>
                        <Bookmark className="h-3 w-3 sm:h-4 sm:w-4 inline mr-1" />
                        {t("projectOpinions.opinion.unbookmark")}
                      </>
                    ) : (
                      <>
                        <BookmarkCheck className="h-3 w-3 sm:h-4 sm:w-4 inline mr-1" />
                        {t("projectOpinions.opinion.bookmark")}
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

      {/* User Purpose Modal */}
      <UserPurposeModal
        isOpen={showPurposeModal}
        onClose={() => setShowPurposeModal(false)}
      />
    </div>
  );
}
