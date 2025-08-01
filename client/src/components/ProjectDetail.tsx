import {
  AlertTriangle,
  Archive,
  Brain,
  Check,
  CheckCircle,
  ChevronDown,
  Clock,
  Copy,
  Database,
  ExternalLink,
  Eye,
  Globe,
  MessageSquare,
  Pause,
  Play,
  QrCode,
  RotateCcw,
  Settings,
  Target,
  Trash2,
  Users,
  X,
  XCircle,
} from "lucide-react";
import React, { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Project, TopicData } from "../contexts/ProjectContext";
import { useAnalysisRealtime } from "../hooks/useAnalysisRealtime";
import { useAuth } from "../hooks/useAuth";
import { useLanguage } from "../hooks/useLanguage";
import { useOpinionsRealtime } from "../hooks/useOpinionsRealtime";
import { usePlanStatus } from "../hooks/usePlanStatus";
import { useProjects } from "../hooks/useProjects";
import { useTopicStatus } from "../hooks/useTopicStatus";
import {
  TopicStatus,
  getActiveStatuses,
  getArchivedStatuses,
  getStatusColor as getTopicStatusColor,
  getStatusIcon as getTopicStatusIcon,
  getLocalizedStatusText,
  isActive,
  isArchived,
  normalizeTopicStatus,
} from "../utils/topicStatus";
import { AnalysisLanguageModal } from "./AnalysisLanguageModal";
import { AnalysisProgressCard } from "./AnalysisProgressCard";
import { AnalysisSummaryCard } from "./AnalysisSummaryCard";
import { BulkUploadModal } from "./BulkUploadModal";
import { LimitReachedDialog } from "./LimitReachedDialog";
import { PrioritySelector } from "./PrioritySelector";
// ProjectCompletionModal removed - using simple confirmation dialog
import { ResponsiveHeader } from "./ResponsiveHeader";
import { UserPurposeModal } from "./UserPurposeModal";

// Constants - Stripe Checkout now handled via /api/billing/create-checkout-session
const STRIPE_PRICE_ID = import.meta.env.VITE_STRIPE_PRICE_ID || 'price_1RnZ6qEOZJMIcvctX9z0VHZJ';

type ProjectStatus =
  | "collecting"
  | "paused"
  | "ready-for-analysis"
  | "processing"
  | "completed"
  | "error"
  | "in-progress"
  | "analyzing";

interface AnalysisOptions {
  includeNewResponses?: boolean;
  quickAnalysis?: boolean;
  force?: boolean;
  runInBackground?: boolean;
}

// Use TopicData directly for display topics
type DisplayTopic = TopicData;
export function ProjectDetail() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { t, language } = useLanguage();
  const planStatus = usePlanStatus();
  const {
    getProject,
    updateProject,
    resetProjectPriority,
    deleteProject,
    archiveProject,
    completeProject,
    loading: projectsLoading,
  } = useProjects();
  const { topics: firebaseTopics, syncTopicsFromAnalysis } = useTopicStatus(id);

  // 分析完了時のプロジェクトデータ再取得
  const handleAnalysisCompleteForReload = useCallback(() => {
    if (id) {
      getProject(id);
    }
  }, [id, getProject]);

  // AI分析のリアルタイム監視（分析完了時の自動更新）
  const { isAnalyzing: firebaseIsAnalyzing } = useAnalysisRealtime(id, handleAnalysisCompleteForReload);

  // プロジェクト詳細画面専用: 意見数のリアルタイム取得（CLAUDE.mdルール対応）
  const { opinionsCount: firebaseOpinionsCount, isFirebaseAvailable } = useOpinionsRealtime(id);

  const [copiedUrl, setCopiedUrl] = useState(false);
  const [copiedQr, setCopiedQr] = useState(false);
  // 拡張された通知システム
  interface ExtendedNotification {
    message: string;
    type: "success" | "error" | "info" | "warning";
    persistent?: boolean;
    action?: {
      label: string;
      onClick: () => void;
    };
  }

  const [notification, setNotification] = useState<string | null>(null);
  const [extendedNotification, setExtendedNotification] =
    useState<ExtendedNotification | null>(null);

  // AI分析制限情報
  interface AnalysisLimits {
    allowed: boolean;
    message?: string;
    remaining?: {
      totalDaily: number;
      totalMonthly: number;
    } | null;
    resetDate?: {
      daily: string;
      monthly: string;
    } | null;
  }
  const [analysisLimits, setAnalysisLimits] = useState<AnalysisLimits | null>(
    null
  );

  // 意見収集制限情報
  interface OpinionLimits {
    allowed: boolean;
    currentUsage: number;
    limit: number;
    remaining: number;
    message?: string;
  }
  const [opinionLimits, setOpinionLimits] = useState<OpinionLimits | null>(
    null
  );
  const [showQrModal, setShowQrModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [showAnalysisLimitDialog, setShowAnalysisLimitDialog] = useState(false);
  const [showAnalysisLanguageModal, setShowAnalysisLanguageModal] = useState(false);
  const [topicViewMode, setTopicViewMode] = useState<"active" | "archived">(
    "active"
  );
  const [topicStatusFilter, setTopicStatusFilter] = useState<
    TopicStatus | "all"
  >("all");
  const [topicPriorityFilter, setTopicPriorityFilter] = useState<
    "all" | "high" | "medium" | "low" | "none"
  >("all");
  const [showFullPriorityReason, setShowFullPriorityReason] = useState(false);
  const [analysisError, setAnalysisError] = useState<{
    message: string;
    userAction: string;
    timestamp: Date;
  } | null>(null);
  const [isRetrying, setIsRetrying] = useState(false);
  const [showAnalysisModal, setShowAnalysisModal] = useState(false);
  const [isAnalysisRunning, setIsAnalysisRunning] = useState(false);
  const [showAnalysisProgress, setShowAnalysisProgress] = useState(false);

  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [showPurposeModal, setShowPurposeModal] = useState(false);

  // 拡張通知を表示する関数
  const showExtendedNotification = useCallback(
    (notification: ExtendedNotification) => {
      setExtendedNotification(notification);

      // persistent フラグがない場合は5秒後に自動で非表示
      if (!notification.persistent) {
        setTimeout(() => setExtendedNotification(null), 5000);
      }
    },
    []
  );

  // バックグラウンド分析完了時の特別な通知
  const showBackgroundAnalysisComplete = useCallback(() => {
    showExtendedNotification({
      message: t("projectDetail.notifications.backgroundAnalysisComplete"),
      type: "success",
      persistent: false,
      action: {
        label: t("projectDetail.actions.viewResults"),
        onClick: () => {
          setExtendedNotification(null);
          // 現在のページが同じプロジェクトの場合はリロード、違う場合はナビゲート
          if (window.location.pathname === `/projects/${id}`) {
            window.location.reload();
          } else {
            navigate(`/projects/${id}`);
          }
        },
      },
    });
  }, [id, navigate, showExtendedNotification, t]);

  // AI分析制限情報取得
  const fetchAnalysisLimits = useCallback(async () => {
    if (!user?.id || !id) return;

    try {
      const response = await fetch(
        `/api/analysis/limits/${user.id}?projectId=${id}`,
        {
          headers: {
            "X-User-ID": user.id,
          },
        }
      );

      if (response.ok) {
        const responseData = await response.json();
        setAnalysisLimits(responseData.data);
      }
    } catch (error) {
      console.error("[ProjectDetail] 制限情報取得エラー:", error);
      // エラー時は制限表示しない（既存機能への影響回避）
    }
  }, [user?.id, id]);

  // 意見収集制限情報取得
  const fetchOpinionLimits = useCallback(async () => {
    if (!user?.id || !id) return;

    try {
      const response = await fetch(
        `/api/projects/${id}/opinion-limits`,
        {
          headers: {
            "X-User-ID": user.id,
          },
        }
      );

      if (response.ok) {
        const responseData = await response.json();
        setOpinionLimits(responseData.data);
      }
    } catch (error) {
      console.error("[ProjectDetail] 意見制限情報取得エラー:", error);
      // エラー時は制限表示しない（既存機能への影響回避）
    }
  }, [user?.id, id]);

  // 分析完了時のコールバック（強化版）
  const handleAnalysisComplete = useCallback(() => {
    
    setAnalysisLoading(false);
    setIsAnalysisRunning(false);
    setShowAnalysisProgress(false);
    showBackgroundAnalysisComplete();
  }, [showBackgroundAnalysisComplete]);

  // 分析進捗カードの最小化
  const handleMinimizeAnalysisProgress = useCallback(() => {
    setShowAnalysisProgress(false);
  }, []);

  // 分析キャンセル
  const handleCancelAnalysis = useCallback(() => {
    setAnalysisLoading(false);
    setIsAnalysisRunning(false);
    setShowAnalysisProgress(false);
    showNotification(t("projectDetail.notifications.analysisCanceled"));
  }, [t]);

  const handleOpenPurposeModal = () => {
    setShowPurposeModal(true);
  };

  // 開発者向け機能
  const [showBulkUpload, setShowBulkUpload] = useState(false);

  // プロジェクト取得のリトライ機能を追加
  const [projectRetryCount, setProjectRetryCount] = useState(0);
  const [isProjectLoading, setIsProjectLoading] = useState(false);

  // プロジェクト名・説明文編集用の状態
  const [isEditingProject, setIsEditingProject] = useState(false);
  const [editProjectName, setEditProjectName] = useState("");
  const [editProjectDescription, setEditProjectDescription] = useState("");
  const [isSavingProject, setIsSavingProject] = useState(false);
  const project = getProject(id || "");

  // 現在の意見数を取得するヘルパー関数（Firebase優先、SQLフォールバック）
  const getCurrentOpinionsCount = useCallback(() => {
    return isFirebaseAvailable ? firebaseOpinionsCount : (project?.opinionsCount || 0);
  }, [isFirebaseAvailable, firebaseOpinionsCount, project?.opinionsCount]);

  // analysisLoading状態の初期化
  useEffect(() => {
    if (!project) return;

    // プロジェクトが完了状態の場合はanalysisLoadingをfalseにする
    const hasAnalysisData =
      project.analysis?.topInsights?.length &&
      project.analysis.topInsights.length > 0;
    const isAnalyzedFlag =
      (project as { isAnalyzed?: boolean }).isAnalyzed === true; // DB保存された分析完了フラグ
    const isCompletedStatus =
      project.status === "ready-for-analysis" ||
      project.status === "completed" ||
      project.status === "error";

    // 優先順位: DBフラグ > 分析データ存在 > ステータス
    if (isAnalyzedFlag || hasAnalysisData || isCompletedStatus) {
      // analysisLoading状態を初期化

      setAnalysisLoading(false);
    }
  }, [project?.status, project?.analysis?.topInsights, id, project]);

  // プロジェクト編集フォームの初期値設定
  useEffect(() => {
    if (project) {
      setEditProjectName(project.name);
      setEditProjectDescription(project.description || "");
    }
  }, [project]);

  // AI分析制限情報の取得（プロジェクト確定後）
  useEffect(() => {
    if (project && user?.id) {
      fetchAnalysisLimits();
      fetchOpinionLimits();
    }
  }, [project, user?.id, fetchAnalysisLimits, fetchOpinionLimits]);

  // プロジェクトが見つからない場合のリトライ処理（プロジェクトリスト読み込み完了後のみ）
  useEffect(() => {
    if (!project && id && !projectsLoading && projectRetryCount < 3) {
      setIsProjectLoading(true);
      const timer = setTimeout(() => {
        // プロジェクト取得リトライ
        setProjectRetryCount((prev) => prev + 1);
        setIsProjectLoading(false);
      }, 500 * (projectRetryCount + 1)); // 段階的に遅延時間を増加

      return () => clearTimeout(timer);
    }
  }, [project, id, projectsLoading, projectRetryCount]);

  // プロジェクトが見つかった場合はリトライカウントをリセット
  useEffect(() => {
    if (project && projectRetryCount > 0) {
      // プロジェクト取得成功 - リトライカウントリセット
      setProjectRetryCount(0);
    }
  }, [project, projectRetryCount, updateProject]);
  // 意見数を定期的に更新
  // CLAUDE.md要件: SQLiteのopinionsCountが真実のソースとして扱われるため、
  // Firebaseから古いデータを取得する処理を無効化
  /*
  useEffect(() => {
    if (project) {
      fetchActualResponseCount();

      // 30秒ごとに意見数を更新
      const interval = setInterval(fetchActualResponseCount, 30000);
      return () => clearInterval(interval);
    }
  }, [project, user?.id, fetchActualResponseCount]);
  */
  // 分析状態の監視と初期化
  useEffect(() => {
    if (!project) return;

    const checkAnalysisStatus = () => {
      const activeSession = localStorage.getItem("activeAnalysisSession");

      // 分析状態チェック

      // 分析が完了している場合は必ずfalseにする（より厳密な判定）
      const hasAnalysisData =
        project.analysis?.topInsights?.length &&
        project.analysis.topInsights.length > 0;
      const isAnalyzedFlag =
        (project as { isAnalyzed?: boolean }).isAnalyzed === true; // DB保存された分析完了フラグ
      const isCompletedStatus =
        project.status === "ready-for-analysis" ||
        project.status === "completed" ||
        project.status === "error";

      // 優先順位: DBフラグ > 分析データ存在 > ステータス
      if (isAnalyzedFlag || hasAnalysisData || isCompletedStatus) {
        // 完了状態の場合はセッションもクリア
        if (activeSession) {
          // 分析完了を検出、セッションクリア
          localStorage.removeItem("activeAnalysisSession");

          // バックグラウンド分析完了通知を表示
          try {
            const session = JSON.parse(activeSession);
            if (session.projectId === id) {
              showBackgroundAnalysisComplete();
            }
          } catch (error) {
            console.warn("[ProjectDetail] セッション解析エラー:", error);
            // セッション解析に失敗してもバックグラウンド完了通知は表示
            showBackgroundAnalysisComplete();
          }
        }
        setIsAnalysisRunning(false);

        // 分析データが存在するがステータスがprocessingの場合、Firebaseステータスを更新
        if (hasAnalysisData && project.status === "processing") {
          // 分析データ存在、Firebaseステータスを更新

          // 非同期でFirebaseステータスを更新（UIをブロックしないように）
          updateProject(id || "", { status: "ready-for-analysis" }).catch(
            () => {
              // Firebaseステータス更新エラー
            }
          );
        }
      } else if (activeSession && project.status === "processing") {
        // セッションが有効で実際に処理中の場合のみ
        setIsAnalysisRunning(true);
      } else {
        // その他の場合は実行中ではない
        setIsAnalysisRunning(false);

        // 不整合なセッションをクリア
        if (activeSession) {
          // 不整合なセッションを検出、クリア
          localStorage.removeItem("activeAnalysisSession");
        }
      }
    };

    // 初期化時に即座にチェック
    checkAnalysisStatus();

    // 分析関連の状態の場合のみ定期的にチェック
    let interval: NodeJS.Timeout | null = null;

    // 分析完了フラグが設定されている場合は定期チェック不要
    const isAnalyzedFlag =
      (project as Project & { isAnalyzed?: boolean }).isAnalyzed === true;
    const hasAnalysisData =
      project.analysis?.topInsights?.length &&
      project.analysis.topInsights.length > 0;

    const needsPeriodicCheck =
      !isAnalyzedFlag && // 分析完了フラグがある場合はチェック不要
      !hasAnalysisData && // 分析データがある場合もチェック不要
      (project.status === "processing" ||
        isAnalysisRunning ||
        localStorage.getItem("activeAnalysisSession"));

    if (needsPeriodicCheck) {
      // 分析状態の定期チェックを開始

      interval = setInterval(checkAnalysisStatus, 2000);
    } else {
      // 分析状態チェック不要
    }

    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [
    project?.status,
    project?.analysis?.topInsights,
    id,
    isAnalysisRunning,
    project,
    updateProject,
    showBackgroundAnalysisComplete,
  ]);

  // タブ変更時にステータスフィルターをリセット
  useEffect(() => {
    if (topicViewMode === "active") {
      // アクティブタブでは unhandled, in-progress のみ有効
      const activeStatuses = getActiveStatuses();
      if (
        topicStatusFilter !== "all" &&
        !activeStatuses.includes(topicStatusFilter as TopicStatus)
      ) {
        setTopicStatusFilter("all");
      }
    } else if (topicViewMode === "archived") {
      // アーカイブタブでは resolved, dismissed のみ有効
      const archivedStatuses = getArchivedStatuses();
      if (
        topicStatusFilter !== "all" &&
        !archivedStatuses.includes(topicStatusFilter as TopicStatus)
      ) {
        setTopicStatusFilter("all");
      }
    }
  }, [topicViewMode, topicStatusFilter]);

  if (!project) {
    // ローディング中またはリトライ中の場合（プロジェクトリスト読み込み中も含む）
    if (projectsLoading || isProjectLoading || projectRetryCount < 3) {
      return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 flex items-center justify-center p-4">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">
              {t("projectDetail.loading.project")}
            </h2>
            {projectRetryCount > 0 && (
              <p className="text-sm text-gray-600">
                {t("projectDetail.loading.retrying", {
                  count: projectRetryCount,
                })}
              </p>
            )}
          </div>
        </div>
      );
    }

    // 最終的にプロジェクトが見つからない場合
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="text-center">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-4">
            {t("projectDetail.projectNotFound")}
          </h2>
          <p className="text-gray-600 mb-4">
            {t("projectDetail.messages.projectNotFound")}
          </p>
          <button
            onClick={() => navigate("/dashboard")}
            className="bg-blue-600 text-white px-4 sm:px-6 py-2 sm:py-3 rounded-lg hover:bg-blue-700 transition-colors text-sm sm:text-base"
          >
            {t("projectDetail.backToDashboard")}
          </button>
        </div>
      </div>
    );
  }
  const formUrl =
    project.config?.webformUrl || `${window.location.origin}/forms/${id}`;
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(
    formUrl
  )}`;
  const handleCopyUrl = async () => {
    try {
      await navigator.clipboard.writeText(formUrl);
      setCopiedUrl(true);
      showNotification(t("projectDetail.notifications.urlCopied"));
      setTimeout(() => setCopiedUrl(false), 2000);
    } catch {
      // Failed to copy URL
    }
  };

  // 現在の分析言語取得
  const getCurrentAnalysisLanguage = () => {
    const userId = user?.id;
    if (!userId) return 'ja';

    const userAnalysisLanguage = user?.analysisLanguage;
    const userLanguage = user?.language;
    const finalResult = userAnalysisLanguage || userLanguage || 'ja';

    return finalResult;
  };
  
  // 分析言語表示テキスト取得
  const getCurrentAnalysisLanguageDisplay = () => {
    const analysisLang = getCurrentAnalysisLanguage();
    const isUsingFallback = !user?.analysisLanguage;
    const displayText = analysisLang === 'ja' 
      ? t('projectDetail.analysisLanguage.japanese')
      : t('projectDetail.analysisLanguage.english');
    
    if (isUsingFallback) {
      return `${displayText} (${t('projectDetail.analysisLanguage.usingUserLanguage')})`;
    }
    return displayText;
  };
  

  const handleCopyQrUrl = async () => {
    try {
      await navigator.clipboard.writeText(qrCodeUrl);
      setCopiedQr(true);
      showNotification(t("projectDetail.notifications.qrUrlCopied"));
      setTimeout(() => setCopiedQr(false), 2000);
    } catch {
      // Failed to copy 2D code URL
    }
  };

  const handleAnalysisLanguageClick = () => {
    setShowAnalysisLanguageModal(true);
  };

  const handleAnalysisLanguageModalClose = () => {
    setShowAnalysisLanguageModal(false);
  };

  const handleStatusChange = async (newStatus: ProjectStatus) => {
    try {
      if (id) {
        await updateProject(id, { status: newStatus });
      }
      showNotification(
        t("projectDetail.notifications.statusChangedPrefix") +
          getStatusText(newStatus) +
          t("projectDetail.notifications.statusChangedSuffix")
      );
    } catch {
      // Failed to update status
      showNotification(t("projectDetail.notifications.statusChangeFailed"));
    }
  };
  // 新しいインクリメンタル分析開始ハンドラー
  const handleStartAnalysis = async () => {
    // 新AI分析開始ボタンクリック

    // 進行中の分析があるかチェック（Firebaseリアルタイム状態を優先）
    const isCurrentlyAnalyzing = firebaseIsAnalyzing || isAnalysisRunning || analysisLoading;
    if (isCurrentlyAnalyzing) {
      showNotification(t("projectDetail.notifications2.analysisInProgress"));
      return;
    }

    // 確認ダイアログを表示（誤タップ防止）
    setShowAnalysisModal(true);
  };

  // インクリメンタル分析実行（同期）
  const handleIncrementalAnalysis = async (options: AnalysisOptions) => {
    if (!id) return;

    setAnalysisLoading(true);
    setIsAnalysisRunning(true);

    try {
      const response = await fetch(`/api/analysis/projects/${id}/topics`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': user?.id || '',
        },
        body: JSON.stringify({
          forceRerun: options.forceRerun || false,
          analysisLanguage: getCurrentAnalysisLanguage(),
        }),
      });

      const responseText = await response.text();
      let result;
      try {
        result = JSON.parse(responseText);
      } catch {
        result = { error: 'Invalid response format', details: responseText };
      }

      if (!response.ok) {
        const errorInfo = result;
        
        // 制限エラーの特別処理（既存実装維持）
        if (errorInfo.error === "ANALYSIS_LIMIT_EXCEEDED") {
          setShowAnalysisLimitDialog(true);
        } else {
          // 詳細エラーメッセージの表示（既存実装の安全な拡張）
          const errorMessage = errorInfo.error 
            ? `${t("projectDetail.errors.analysisError")} ${errorInfo.error}`
            : t("projectDetail.errors.analysisError");
          showNotification(errorMessage);
        }

        // エラーの場合はステータスを元に戻す
        if (id) {
          updateProject(id, { status: "collecting" });
        }

        // 進捗カードを閉じる
        setAnalysisLoading(false);
        setIsAnalysisRunning(false);
        setShowAnalysisProgress(false);
        return;
      }

      // API呼び出し成功時のみ分析開始通知を表示
      showNotification(
        t("projectDetail.notifications.analysisStartedInBackground")
      );

      // API呼び出し成功時のみリアルタイム進捗カードを表示
      setShowAnalysisProgress(true);

      if (result.success) {
        showNotification(
          t("projectDetail.notifications.analysisComplete")
        );
      }
    } catch (error) {
      console.error("Analysis error:", error);
      showNotification(
        t("projectDetail.errors.analysisError")
      );
      setAnalysisLoading(false);
      setIsAnalysisRunning(false);
      setShowAnalysisProgress(false);
    }
  };

  const confirmAnalysis = async () => {
    setShowAnalysisModal(false);

    // 新しいインクリメンタル分析を実行
    const options: AnalysisOptions = {
      includeNewResponses: true,
      quickAnalysis: false,
      force: false,
      runInBackground: true,
    };

    await handleIncrementalAnalysis(options);
  };
  const performAnalysisInBackground = async (
    projectId: string,
    sessionId?: string
  ) => {

    try {
      // エラー状態をクリア
      setAnalysisError(null);

      // バックグラウンドAI分析開始
      // APIエンドポイント
      // プロキシ先バックエンド
      // 送信するユーザーID
      // ユーザー認証状態

      const response = await fetch(
        `/api/analysis/projects/${projectId}/topics`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-User-ID": user?.id || "anonymous",
          },
          body: JSON.stringify({
            force: false,
          }),
        }
      );
      // AI分析APIレスポンス受信
      if (!response.ok) {
        const errorData = await response.text();
        // AI分析APIエラー

        // エラーレスポンスから詳細情報を取得
        let errorInfo;
        try {
          errorInfo = JSON.parse(errorData);
        } catch {
          errorInfo = { message: t("projectDetail.notifications.serverError") };
        }

        // 制限エラーの特別処理
        if (errorInfo.error === "ANALYSIS_LIMIT_EXCEEDED") {
          // 制限情報の再取得
          fetchAnalysisLimits();

          // アップグレードダイアログを表示
          setShowAnalysisLimitDialog(true);

          // エラー状態をクリア（ダイアログが表示されるため）
          setAnalysisError(null);
        } else {
          // 通常のエラー処理
          setAnalysisError({
            message:
              errorInfo.message ||
              t("projectDetail.notifications.aiAnalysisFailed"),
            userAction:
              errorInfo.details || t("projectDetail.notifications.retryLater"),
            timestamp: new Date(),
          });
        }

        // エラーの場合はプロジェクトステータスをエラーに変更
        await updateProject(projectId, { status: "error" });
        return;
      }
      const result = await response.json();
      // AI分析完了
      // 受信したAI分析結果
      // AI分析結果をプロジェクトに保存
      const analysisData = {
        topInsights:
          result.insights?.map(
            (insight: {
              id?: string;
              title: string;
              count: number;
              description: string;
              priority: string;
            }) => ({
              id: insight.id || `insight-${Date.now()}-${Math.random()}`,
              title: insight.title,
              count: insight.count,
              description: insight.description,
              status: "unhandled",
              priority: insight.priority,
            })
          ) || [],
        insights: result.insights || [],
        topics: result.topics || [], // トピックデータを別途保存
        summary: result.summary || "",
        generatedAt: new Date().toISOString(),
        executedAt: new Date().toISOString(),
      };

      // プロジェクトに保存する分析データ

      // AI分析完了後、プロジェクトに結果を保存してステータスを更新
      await updateProject(projectId, {
        status: "ready-for-analysis",
        analysis: analysisData,
      });
      // プロジェクトデータ更新完了
      // Firebaseトピックストレージに同期
      try {
        await syncTopicsFromAnalysis(result.topics || []);
        // Firebaseトピック同期完了
      } catch {
        // Firebaseトピック同期エラー
        // 同期エラーでも処理は続行（メインのプロジェクトデータは保存済み）
      }

      // Firebase分析セッションを完了状態に更新（即時反映のため）
      try {
        const { database } = await import('../lib/firebase');
        const { ref, update } = await import('firebase/database');
        if (database && projectId) {
          const sessionRef = ref(database, `analysis-sessions/${projectId}`);
          await update(sessionRef, {
            status: 'completed',
            completedAt: Date.now()
          });
        }
      } catch (error) {
        console.error("Firebase session update error:", error);
      }
      setIsAnalysisRunning(false);
      setExtendedNotification({
        message: t("projectDetail.notifications.analysisCompleted"),
        type: "success",
        action: {
          label: t("projectDetail.actions.viewAnalysis"),
          onClick: () => {
            // 分析結果を表示するための処理
            // 必要に応じて実装
            setExtendedNotification(null);
          },
        },
      });
    } catch (error) {
      // バックグラウンドAI分析エラー
      console.error("Analysis background error:", error);

      // エラー時もセッションをクリア
      if (sessionId) {
        localStorage.removeItem("activeAnalysisSession");
      }
      setIsAnalysisRunning(false);

      // ネットワークエラーなどの詳細なエラー情報を設定
      setAnalysisError({
        message: t("projectDetail.notifications.networkConnectionError"),
        userAction: t("projectDetail.notifications.networkError"),
        timestamp: new Date(),
      });

      // エラーの場合はプロジェクトステータスをエラーに変更
      if (projectId) {
        await updateProject(projectId, { status: "error" });
      }
    }
  };
  const handleRetryAnalysis = async () => {
    try {
      setIsRetrying(true);
      setAnalysisError(null);

      // プロジェクトステータスを処理中に変更
      if (id) {
        await updateProject(id, { status: "processing" });
      }

      // 処理画面に遷移
      navigate(`/projects/${id}/processing`);

      // バックグラウンドで再分析実行
      if (id) {
        await performAnalysisInBackground(id);
      }
    } catch {
      // 再分析開始エラー
      setAnalysisError({
        message: t("projectDetail.notifications.reanalysisStartFailed"),
        userAction: t("projectDetail.notifications.retryAfterSomeTime"),
        timestamp: new Date(),
      });
    } finally {
      setIsRetrying(false);
    }
  };
  const dismissError = () => {
    setAnalysisError(null);
  };

  const handleCompleteProject = async () => {
    try {
      if (id) {
        await updateProject(id, {
          status: "completed",
          completedAt: new Date(),
        });
      }
      showNotification(t("projectDetail.notifications.projectCompleted"));
      navigate("/dashboard");
    } catch {
      // Failed to complete project
      showNotification(
        t("projectDetail.notifications.projectCompletionFailed")
      );
    }
  };
  const handleReactivateProject = async () => {
    try {
      if (id) {
        await updateProject(id, {
          status: "ready-for-analysis",
          completedAt: undefined,
        });
      }
      showNotification(t("projectDetail.notifications.projectReactivated"));
    } catch {
      // Failed to reactivate project
      showNotification(
        t("projectDetail.notifications.projectReactivationFailed")
      );
    }
  };
  const handlePriorityChange = async (
    newPriority: "low" | "medium" | "high" | undefined
  ) => {
    try {
      if (newPriority === undefined) {
        if (id) {
          await resetProjectPriority(id);
        }
        showNotification(t("projectDetail.notifications.priorityUnset"));
      } else {
        // 既存の優先度情報を保持しつつレベルのみ更新
        const currentPriority = project?.priority;
        const updatedPriority: {
          level: "low" | "medium" | "high";
          updatedAt: Date;
          reason?: string;
        } = {
          level: newPriority,
          updatedAt: new Date(),
          // Firebase同期のため、reasonフィールドを明示的に設定（既存の理由を保持、なければundefined）
          reason: currentPriority?.reason,
        };

        if (id) {
          await updateProject(id, { priority: updatedPriority });
        }

        const priorityText =
          newPriority === "high"
            ? t("projectDetail.priorityLevels.high")
            : newPriority === "medium"
            ? t("projectDetail.priorityLevels.medium")
            : t("projectDetail.priorityLevels.low");
        showNotification(
          `${t(
            "projectDetail.notifications.priorityChangedPrefix"
          )}${priorityText}${t(
            "projectDetail.notifications.priorityChangedSuffix"
          )}`
        );
      }
    } catch {
      // Failed to update priority
      showNotification(t("projectDetail.notifications.priorityChangeFailed"));
    }
  };
  const handleDetailedPriorityChange = async (
    level: "low" | "medium" | "high" | undefined,
    reason?: string
  ) => {
    try {
      if (level === undefined) {
        if (id) {
          await resetProjectPriority(id);
        }
        showNotification(t("projectDetail.notifications.priorityUnset"));
      } else {
        const priorityData = {
          level,
          reason,
          updatedAt: new Date(),
        };

        if (id) {
          await updateProject(id, { priority: priorityData });
        }

        const priorityText =
          level === "high"
            ? t("projectDetail.priorityLevels.high")
            : level === "medium"
            ? t("projectDetail.priorityLevels.medium")
            : t("projectDetail.priorityLevels.low");
        showNotification(
          `${t(
            "projectDetail.notifications.priorityChangedPrefix"
          )}${priorityText}${t(
            "projectDetail.notifications.priorityChangedSuffix"
          )}`
        );
      }
    } catch {
      // Failed to update priority
      showNotification(t("projectDetail.notifications.priorityChangeFailed"));
    }
  };

  // プロジェクト名・説明文編集関連のハンドラー
  const handleStartEditProject = () => {
    setIsEditingProject(true);
  };

  const handleCancelEditProject = () => {
    setIsEditingProject(false);
    // 元の値に戻す
    if (project) {
      setEditProjectName(project.name);
      setEditProjectDescription(project.description || "");
    }
  };

  const handleSaveProjectInfo = async () => {
    if (!project || !id) return;

    try {
      setIsSavingProject(true);

      await updateProject(id, {
        name: editProjectName.trim(),
        description: editProjectDescription.trim(),
      });

      setIsEditingProject(false);
      showNotification(t("projectDetail.notifications.projectInfoUpdated"));
    } catch {
      // Failed to update project info
      showNotification(
        t("projectDetail.notifications.projectInfoUpdateFailed")
      );
    } finally {
      setIsSavingProject(false);
    }
  };

  const showNotification = (message: string) => {
    setNotification(message);
    setTimeout(() => setNotification(null), 3000);
  };

  const handleProjectCompletion = async () => {
    try {
      if (!id) return;
      await completeProject(id);
      showNotification(t("projectDetail.notifications.projectCompleted2"));
      setShowCompleteModal(false);
    } catch {
      showNotification(
        t("projectDetail.notifications.projectCompletionProcessFailed")
      );
    }
  };
  const getStatusColor = (status: ProjectStatus, isArchived?: boolean) => {
    if (isArchived) {
      return "bg-slate-100 text-slate-800";
    }

    switch (status) {
      case "collecting":
        return "bg-blue-100 text-blue-800";
      case "paused":
        return "bg-yellow-100 text-yellow-800";
      case "ready-for-analysis":
        return "bg-purple-100 text-purple-800";
      case "processing":
      case "analyzing":
        return "bg-orange-100 text-orange-800";
      case "in-progress":
        return "bg-yellow-100 text-yellow-800";
      case "completed":
        return "bg-green-100 text-green-800";
      case "error":
        return "bg-red-100 text-red-800";
    }
  };
  const getStatusIcon = (status: ProjectStatus, isArchived?: boolean) => {
    if (isArchived) {
      return Archive;
    }

    switch (status) {
      case "collecting":
        return Play;
      case "paused":
        return Pause;
      case "ready-for-analysis":
        return Brain;
      case "processing":
      case "analyzing":
        return RotateCcw;
      case "in-progress":
        return Clock;
      case "completed":
        return CheckCircle;
      case "error":
        return AlertTriangle;
    }
  };
  const getStatusText = (status: ProjectStatus, isArchived?: boolean) => {
    if (isArchived) {
      return t("projectDetail.status.archived");
    }

    switch (status) {
      case "collecting":
        return t("projectDetail.status.collecting");
      case "paused":
        return t("projectDetail.status.paused");
      case "ready-for-analysis":
        return t("projectDetail.status.readyForAnalysis");
      case "processing":
        return t("projectDetail.status.processing");
      case "analyzing":
        return t("projectDetail.status.analyzing");
      case "in-progress":
        return t("projectDetail.status.inProgress");
      case "completed":
        return t("projectDetail.status.completed");
      case "error":
        return t("projectDetail.status.error");
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
  const StatusIcon = getStatusIcon(project.status, project.isArchived);
  const handleDeleteProject = async () => {
    if (!id) return;
    try {
      setIsDeleting(true);

      // プロジェクト詳細画面専用: Firebaseからリアルタイム意見数を優先使用
      const opinionsCount = getCurrentOpinionsCount();

      // 意見が1件以上ある場合はアーカイブ、ない場合は削除
      if (opinionsCount > 0) {
        await archiveProject(id);
        showNotification(t("projectDetail.notifications.projectArchived"));
      } else {
        await deleteProject(id);
        showNotification(t("projectDetail.notifications.projectDeleted"));
      }

      navigate("/dashboard");
    } catch {
      // Error deleting/archiving project
      showNotification(t("projectDetail.notifications.projectDeletionFailed"));
    } finally {
      setIsDeleting(false);
      setShowDeleteModal(false);
    }
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

      {/* 拡張通知システム */}
      {extendedNotification && (
        <div
          className={`fixed top-4 right-4 max-w-lg rounded-lg shadow-lg z-50 animate-fade-in border ${
            extendedNotification.type === "success"
              ? "bg-green-100 border-green-400 text-green-700"
              : extendedNotification.type === "error"
              ? "bg-red-100 border-red-400 text-red-700"
              : extendedNotification.type === "warning"
              ? "bg-yellow-100 border-yellow-400 text-yellow-700"
              : "bg-blue-100 border-blue-400 text-blue-700"
          }`}
        >
          <div className="px-4 py-3">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                {extendedNotification.type === "success" && (
                  <CheckCircle className="h-5 w-5" />
                )}
                {extendedNotification.type === "error" && (
                  <X className="h-5 w-5" />
                )}
                {extendedNotification.type === "warning" && (
                  <AlertTriangle className="h-5 w-5" />
                )}
                {extendedNotification.type === "info" && (
                  <MessageSquare className="h-5 w-5" />
                )}
              </div>
              <div className="ml-3 flex-1">
                <span className="text-sm font-medium whitespace-nowrap">
                  {extendedNotification.message}
                </span>
              </div>
              {extendedNotification.action && (
                <div className="ml-4 flex-shrink-0">
                  <button
                    onClick={extendedNotification.action.onClick}
                    className={`inline-flex items-center px-2 py-1 border border-transparent text-xs font-medium rounded text-white transition-colors ${
                      extendedNotification.type === "success"
                        ? "bg-green-600 hover:bg-green-700"
                        : extendedNotification.type === "error"
                        ? "bg-red-600 hover:bg-red-700"
                        : extendedNotification.type === "warning"
                        ? "bg-yellow-600 hover:bg-yellow-700"
                        : "bg-blue-600 hover:bg-blue-700"
                    }`}
                  >
                    {extendedNotification.action.label}
                  </button>
                </div>
              )}
              {extendedNotification.persistent && (
                <button
                  onClick={() => setExtendedNotification(null)}
                  className="flex-shrink-0 ml-2 inline-flex text-gray-400 hover:text-gray-600"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>
        </div>
      )}
      {/* Analysis Error Display */}
      {analysisError && (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 max-w-md bg-red-50 border border-red-200 rounded-lg shadow-lg z-50 animate-fade-in">
          <div className="p-4">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <XCircle className="h-5 w-5 text-red-400" />
              </div>
              <div className="ml-3 flex-1">
                <h3 className="text-sm font-medium text-red-800">
                  {t("projectDetail.modals.analysisError.title")}
                </h3>
                <div className="mt-2 text-sm text-red-700">
                  <p className="font-medium">{analysisError.message}</p>
                  <div className="mt-2 p-2 bg-red-100 rounded text-xs">
                    <p className="font-medium">
                      {t("projectDetail.modals.analysisError.solutionLabel")}:
                    </p>
                    <p className="mt-1 whitespace-pre-line">
                      {analysisError.userAction}
                    </p>
                  </div>
                  <p className="mt-2 text-xs text-red-600">
                    {t("projectDetail.modals.analysisError.timestampLabel")}:{" "}
                    {analysisError.timestamp.toLocaleTimeString(language)}
                  </p>
                </div>
                <div className="mt-4 flex flex-col sm:flex-row gap-3">
                  <button
                    onClick={handleRetryAnalysis}
                    disabled={isRetrying}
                    className="bg-red-600 text-white px-4 py-3 rounded-lg text-sm hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {isRetrying ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border border-white border-t-transparent"></div>
                        {t("projectDetail.modals.analysisError.retrying")}
                      </>
                    ) : (
                      <>
                        <RotateCcw className="h-4 w-4 sm:h-5 sm:w-5" />
                        {t("projectDetail.modals.analysisError.retryButton")}
                      </>
                    )}
                  </button>
                  <button
                    onClick={dismissError}
                    className="bg-gray-200 text-gray-800 px-4 py-3 rounded-lg text-sm hover:bg-gray-300"
                  >
                    {t("buttons.close")}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Archive Status Banner */}

      {/* Header */}
      <ResponsiveHeader
        breadcrumbs={[
          { label: t("breadcrumb.dashboard"), path: "/dashboard" },
          { label: project.name },
        ]}
        onOpenPurposeSettings={handleOpenPurposeModal}
        actions={
          <div className="flex items-center gap-2">
            {/* Delete/Archive Button - モバイルでも表示 */}
            <button
              onClick={() => setShowDeleteModal(true)}
              className="p-2 rounded-lg transition-colors text-red-600 hover:text-red-700 hover:bg-red-50"
              title={
                getCurrentOpinionsCount() > 0
                  ? t("projectDetail.header.archiveProject")
                  : t("projectDetail.header.deleteProject")
              }
            >
              {getCurrentOpinionsCount() > 0 ? (
                <Archive className="h-4 w-4 sm:h-5 sm:w-5" />
              ) : (
                <Trash2 className="h-4 w-4 sm:h-5 sm:w-5" />
              )}
            </button>
            {/* Bulk Upload - モバイルでは隠す */}
            <button
              onClick={() => setShowBulkUpload(!showBulkUpload)}
              className="hidden sm:block p-2 rounded-lg transition-colors text-gray-600 hover:text-gray-900 hover:bg-gray-100"
              title={t("projectDetail.header.bulkUpload")}
            >
              <Database className="h-4 w-4 sm:h-5 sm:w-5" />
            </button>
          </div>
        }
        mobileActions={[
          // Bulk Upload action for mobile
          {
            label: t("projectDetail.mobileActions.bulkUpload"),
            icon: <Database className="h-4 w-4" />,
            onClick: () => setShowBulkUpload(!showBulkUpload),
            variant: "secondary" as const,
          },
          // Archive/Delete action for mobile
          {
            label:
              getCurrentOpinionsCount() > 0
                ? t("projectDetail.mobileActions.archiveProject")
                : t("projectDetail.mobileActions.deleteProject"),
            icon:
              getCurrentOpinionsCount() > 0 ? (
                <Archive className="h-4 w-4" />
              ) : (
                <Trash2 className="h-4 w-4" />
              ),
            onClick: () => setShowDeleteModal(true),
            variant: "danger",
          },
        ]}
      />
      {/* Delete/Archive Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl p-6 max-w-md w-full">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                {getCurrentOpinionsCount() > 0
                  ? t("projectDetail.deleteModal.archiveTitle")
                  : t("projectDetail.deleteModal.deleteTitle")}
              </h3>
              <button
                onClick={() => setShowDeleteModal(false)}
                className="p-1 text-gray-400 hover:text-gray-500 rounded-lg transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            {getCurrentOpinionsCount() > 0 ? (
              <div>
                <p className="text-gray-600 mb-4">
                  {t("projectDetail.messages.opinionsCollectedInfo")}
                  {getCurrentOpinionsCount()}
                  {t("projectDetail.messages.opinionsUnit")}
                </p>
                <p className="text-gray-600 mb-6">
                  {t("projectDetail.deleteModal.archiveDescription")}
                </p>
              </div>
            ) : (
              <p className="text-gray-600 mb-6">
                {t("projectDetail.deleteModal.deleteConfirmation")}
              </p>
            )}
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors font-medium"
                disabled={isDeleting}
              >
                {t("buttons.cancel")}
              </button>
              <button
                onClick={handleDeleteProject}
                className={`px-4 py-2 text-white rounded-lg transition-colors font-medium flex items-center ${
                  getCurrentOpinionsCount() > 0
                    ? "bg-blue-600 hover:bg-blue-700"
                    : "bg-red-600 hover:bg-red-700"
                }`}
                disabled={isDeleting}
              >
                {isDeleting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    {getCurrentOpinionsCount() > 0
                      ? t("projectDetail.ui.archiving")
                      : t("projectDetail.ui.deleting")}
                  </>
                ) : getCurrentOpinionsCount() > 0 ? (
                  <>
                    <Archive className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
                    {t("projectDetail.buttons.archive")}
                  </>
                ) : (
                  <>
                    <Trash2 className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
                    {t("projectDetail.buttons.delete")}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
      
      
      {/* 2D Code Modal */}
      {showQrModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-sm w-full p-4 sm:p-6 text-center">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base sm:text-lg font-semibold text-gray-900">
                {t("projectDetail.modals.qrCode.title")}
              </h3>
              <button
                onClick={() => setShowQrModal(false)}
                className="p-1 text-gray-400 hover:text-gray-600 rounded-lg"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="mb-4">
              <img
                src={qrCodeUrl}
                alt={t("projectDetail.modals.qrCode.altText")}
                className="mx-auto border border-gray-200 rounded-lg"
              />
            </div>
            <p className="text-xs sm:text-sm text-gray-600 mb-4">
              {t("projectDetail.modals.qrCode.instruction")}
            </p>
            <button
              onClick={handleCopyQrUrl}
              className="w-full px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors text-sm font-medium"
            >
              {copiedQr ? (
                <>
                  <Check className="h-4 w-4 sm:h-5 sm:w-5 inline mr-2" />
                  {t("projectDetail.ui.copied")}
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4 sm:h-5 sm:w-5 inline mr-2" />
                  {t("projectDetail.ui.copyQrUrl")}
                </>
              )}
            </button>
          </div>
        </div>
      )}
      {/* Complete Project Modal */}
      {showCompleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              {t("projectDetail.completeModal.title")}
            </h3>
            <p className="text-gray-600 mb-6">
              {t("projectDetail.completeModal.description")}
              {t("projectDetail.completeModal.canReactivate")}
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowCompleteModal(false)}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                {t("buttons.cancel")}
              </button>
              <button
                onClick={() => {
                  setShowCompleteModal(false);
                  handleCompleteProject();
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                {t("projectDetail.completeModal.complete")}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Bulk Upload Modal */}
      <BulkUploadModal
        isOpen={showBulkUpload}
        projectId={id || ""}
        onClose={() => setShowBulkUpload(false)}
        onUploadComplete={(results) => {
          if (results.success === results.total) {
            showNotification(
              t("projectDetail.notifications.bulkUploadSummarySuccess", {
                count: results.success,
              })
            );
          } else if (results.success > 0) {
            showNotification(
              t("projectDetail.notifications.bulkUploadSummaryPartial", {
                successCount: results.success,
                totalCount: results.total,
              })
            );
          } else {
            showNotification(
              t("projectDetail.notifications.bulkUploadSummaryFailed")
            );
          }
          // 意見制限情報を再取得
          fetchOpinionLimits();
        }}
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
          {/* Left Column - Project Info */}
          <div className="lg:col-span-2 space-y-6">
            {/* Project Header */}
            <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-4 sm:p-6">
              <div className="space-y-4 mb-4 sm:mb-6">
                {/* Project Header with Edit Button */}
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    {isEditingProject ? (
                      // 編集モード
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            {t("projectDetail.edit.projectName")}
                          </label>
                          <input
                            type="text"
                            value={editProjectName}
                            onChange={(e) => setEditProjectName(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            placeholder={t(
                              "projectDetail.edit.projectNamePlaceholder"
                            )}
                            maxLength={100}
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            {t("projectDetail.edit.projectDescription")}
                          </label>
                          <textarea
                            value={editProjectDescription}
                            onChange={(e) =>
                              setEditProjectDescription(e.target.value)
                            }
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            placeholder={t(
                              "projectDetail.edit.projectDescriptionPlaceholder"
                            )}
                            rows={3}
                            maxLength={500}
                          />
                          <div className="text-xs text-gray-500 text-right mt-1">
                            {editProjectDescription.length}/500
                          </div>
                        </div>
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={handleCancelEditProject}
                            disabled={isSavingProject}
                            className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
                          >
                            {t("buttons.cancel")}
                          </button>
                          <button
                            onClick={handleSaveProjectInfo}
                            disabled={
                              isSavingProject || !editProjectName.trim()
                            }
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
                          >
                            {isSavingProject
                              ? t("buttons.saving")
                              : t("buttons.save")}
                          </button>
                        </div>
                      </div>
                    ) : (
                      // 表示モード
                      <div>
                        <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2 sm:mb-3 break-words">
                          {project.name}
                        </h2>
                        {project.description ? (
                          <p className="text-gray-600 text-sm sm:text-base leading-relaxed">
                            {project.description}
                          </p>
                        ) : (
                          <p className="text-gray-400 text-sm sm:text-base italic">
                            {t("projectDetail.edit.noDescription")}
                          </p>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Edit Button - 右上の歯車アイコン */}
                  {!isEditingProject && (
                    <button
                      onClick={handleStartEditProject}
                      className="ml-4 p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors duration-200"
                      title={t("projectDetail.buttons.editProject")}
                    >
                      <Settings className="h-5 w-5" />
                    </button>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="space-y-3">
                  {/* メインアクション - 全意見を表示 & 優先度設定 */}
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                    <button
                      onClick={() => navigate(`/projects/${id}/opinions`)}
                      className="px-4 py-3 bg-blue-100 text-blue-800 rounded-lg hover:bg-blue-200 transition-colors text-sm font-medium flex items-center justify-center"
                    >
                      <Eye className="h-4 w-4 inline mr-2" />
                      {t("projectDetail.buttons.showAllOpinions")}
                    </button>

                    <button
                      onClick={() => navigate(`/projects/${id}/actions`)}
                      className="px-4 py-3 bg-green-100 text-green-800 rounded-lg hover:bg-green-200 transition-colors text-sm font-medium flex items-center justify-center"
                    >
                      <Target className="h-4 w-4 inline mr-2" />
                      {t("projectDetail.buttons.manageActions")}
                    </button>

                    <div className="w-full sm:w-auto">
                      <PrioritySelector
                        priority={project.priority}
                        onPriorityChange={handlePriorityChange}
                        onDetailedPriorityChange={handleDetailedPriorityChange}
                        title={t("projectDetail.ui.prioritySettingsTitle")}
                        subtitle={`${t(
                          "projectDetail.ui.prioritySettingsSubtitle"
                        )} ${project.name}`}
                        allowNone={true}
                        size="md"
                        showReasonIcon={false}
                      />
                    </div>
                  </div>
                </div>
              </div>
              {/* Project Stats */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                <div className="bg-gray-50 rounded-lg p-3 sm:p-4">
                  <div className="flex items-center gap-2 sm:gap-3 mb-1 sm:mb-2">
                    <MessageSquare className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400" />
                    <span className="text-xs sm:text-sm text-gray-600">
                      {t("projectDetail.stats.opinionsCollected")}
                    </span>
                  </div>
                  <div className="text-lg sm:text-xl font-semibold text-gray-900">
                    {getCurrentOpinionsCount()}
                    {t("projectDetail.ui.opinions")}
                  </div>
                </div>
                {project.analysis && (
                  <div className="bg-gray-50 rounded-lg p-3 sm:p-4">
                    <div className="flex items-center gap-2 sm:gap-3 mb-1 sm:mb-2">
                      <Brain className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400" />
                      <span className="text-xs sm:text-sm text-gray-600">
                        {t("projectDetail.stats.analysisTopics")}
                      </span>
                    </div>
                    <div className="text-lg sm:text-xl font-semibold text-gray-900">
                      {firebaseTopics.length}
                      {t("projectDetail.ui.opinions")}
                    </div>
                  </div>
                )}
                <div className="bg-gray-50 rounded-lg p-3 sm:p-4">
                  <div className="flex items-center gap-2 sm:gap-3 mb-1 sm:mb-2">
                    <Clock className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400" />
                    <span className="text-xs sm:text-sm text-gray-600">
                      {t("projectDetail.labels.createdDate")}
                    </span>
                  </div>
                  <div className="text-sm sm:text-base text-gray-900">
                    {project.createdAt.toLocaleDateString()}
                  </div>
                </div>
              </div>

              {/* プロジェクト完了ボタン */}
              {(project.status === "ready-for-analysis" ||
                project.status === "completed") && (
                <div className="mt-4">
                  <div className="flex justify-center sm:justify-start">
                    {project.status === "ready-for-analysis" && (
                      <button
                        onClick={() => setShowCompleteModal(true)}
                        className="flex items-center justify-center px-4 py-2.5 bg-white border border-green-300 text-green-700 rounded-lg hover:bg-green-50 hover:border-green-400 transition-all duration-200 font-medium text-sm shadow-sm hover:shadow-md w-full sm:w-auto"
                      >
                        <CheckCircle className="h-4 w-4 mr-2 flex-shrink-0" />
                        <span className="whitespace-nowrap">
                          {t("projectDetail.buttons.completeProject")}
                        </span>
                      </button>
                    )}
                    {project.status === "completed" && (
                      <button
                        onClick={handleReactivateProject}
                        className="flex items-center justify-center px-4 py-2.5 bg-white border border-yellow-300 text-yellow-700 rounded-lg hover:bg-yellow-50 hover:border-yellow-400 transition-all duration-200 font-medium text-sm shadow-sm hover:shadow-md w-full sm:w-auto"
                      >
                        <RotateCcw className="h-4 w-4 mr-2 flex-shrink-0" />
                        <span className="whitespace-nowrap">
                          {t("projectDetail.buttons.reactivate")}
                        </span>
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Priority Reason Section */}
              {project.priority?.reason && (
                <div className="bg-blue-50 rounded-lg p-4 border border-blue-200 mt-4">
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0">
                      <Target className="h-5 w-5 text-blue-600 mt-0.5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-medium text-blue-900 mb-2">
                        {t("projectDetail.ui.priorityReason")}
                      </h4>
                      <div className="text-sm text-blue-800 leading-relaxed break-words">
                        {project.priority.reason.length > 150 ? (
                          <>
                            <div
                              className={`${
                                !showFullPriorityReason ? "line-clamp-3" : ""
                              }`}
                            >
                              {project.priority.reason}
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
                                ? t("projectDetail.expandCollapse.collapse")
                                : t("projectDetail.expandCollapse.readMore")}
                            </button>
                          </>
                        ) : (
                          project.priority.reason
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
            {/* AI Analysis Results */}
            <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-4 sm:p-6">
              <div className="mb-4 sm:mb-6">
                <h3 className="text-lg sm:text-xl font-semibold text-gray-900 flex items-center">
                  <Brain className="h-5 w-5 sm:h-6 sm:w-6 mr-2 sm:mr-3 text-purple-600" />
                  {t("projectDetail.sections.aiAnalysisAndTopics")}
                </h3>
              </div>
              {/* Analysis Summary */}
              {project.analysis ? (
                <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg p-4 sm:p-6 mb-4 sm:mb-6 border border-purple-200">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-4">
                    <div className="text-center">
                      <div className="text-2xl sm:text-3xl font-bold text-purple-600">
                        {(() => {
                          // AI分析結果がある場合はtopInsightsを使用
                          if (
                            project.analysis?.topInsights &&
                            project.analysis.topInsights.length > 0
                          ) {
                            return project.analysis.topInsights.length;
                          }
                          // AI分析前はFirebaseトピックを使用
                          return firebaseTopics.length;
                        })()}
                      </div>
                      <div className="text-xs sm:text-sm text-purple-700">
                        {t("projectDetail.stats.totalTopics")}
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl sm:text-3xl font-bold text-blue-600">
                        {(() => {
                          // AI分析結果がある場合はtopInsightsを使用
                          if (
                            project.analysis?.topInsights &&
                            project.analysis.topInsights.length > 0
                          ) {
                            return project.analysis.topInsights.filter(
                              (topic) => {
                                const firebaseTopic = firebaseTopics.find(
                                  (ft) => ft.id === topic.id
                                );
                                return isActive(
                                  firebaseTopic?.status || "unhandled"
                                );
                              }
                            ).length;
                          }
                          // AI分析前はFirebaseトピックを使用
                          return firebaseTopics.filter((topic) =>
                            isActive(topic.status)
                          ).length;
                        })()}
                      </div>
                      <div className="text-xs sm:text-sm text-blue-700">
                        {t("projectDetail.ui.active")}
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl sm:text-3xl font-bold text-green-600">
                        {(() => {
                          // AI分析結果がある場合はtopInsightsを使用
                          if (
                            project.analysis?.topInsights &&
                            project.analysis.topInsights.length > 0
                          ) {
                            return project.analysis.topInsights.filter(
                              (topic) => {
                                const firebaseTopic = firebaseTopics.find(
                                  (ft) => ft.id === topic.id
                                );
                                return firebaseTopic?.status === "resolved";
                              }
                            ).length;
                          }
                          // AI分析前はFirebaseトピックを使用
                          return firebaseTopics.filter(
                            (topic) => topic.status === "resolved"
                          ).length;
                        })()}
                      </div>
                      <div className="text-xs sm:text-sm text-green-700">
                        {t("projectDetail.stats.resolved")}
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl sm:text-3xl font-bold text-gray-600">
                        {(() => {
                          // AI分析結果がある場合はtopInsightsを使用
                          if (
                            project.analysis?.topInsights &&
                            project.analysis.topInsights.length > 0
                          ) {
                            return project.analysis.topInsights.filter(
                              (topic) => {
                                const firebaseTopic = firebaseTopics.find(
                                  (ft) => ft.id === topic.id
                                );
                                return firebaseTopic?.status === "dismissed";
                              }
                            ).length;
                          }
                          // AI分析前はFirebaseトピックを使用
                          return firebaseTopics.filter(
                            (topic) => topic.status === "dismissed"
                          ).length;
                        })()}
                      </div>
                      <div className="text-xs sm:text-sm text-gray-700">
                        {t("projectDetail.topicStatus.dismissed")}
                      </div>
                    </div>
                  </div>
                  {project.analysis?.executedAt && (
                    <div className="text-center border-t border-purple-300 pt-3">
                      <div className="text-xs sm:text-sm text-purple-700">
                        {t("projectDetail.ui.lastAnalysisExecution")}{" "}
                        {new Date(project.analysis.executedAt).toLocaleString(
                          language
                        )}
                      </div>
                    </div>
                  )}

                  {/* Topic Progress Display */}
                  {firebaseTopics.length > 0 && (
                    <div className="text-center border-t border-blue-300 pt-3 mt-3">
                      <div className="text-sm text-blue-700">
                        {t("projectDetail.progress.resolvedTopics")}:{" "}
                        {
                          firebaseTopics.filter(
                            (topic) =>
                              topic.status === "resolved" ||
                              topic.status === "dismissed"
                          ).length
                        }
                        /{firebaseTopics.length}
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                          style={{
                            width: `${
                              (firebaseTopics.filter(
                                (topic) =>
                                  topic.status === "resolved" ||
                                  topic.status === "dismissed"
                              ).length /
                                firebaseTopics.length) *
                              100
                            }%`,
                          }}
                        ></div>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="bg-gray-50 rounded-lg p-4 sm:p-6 mb-4 sm:mb-6 border border-gray-200 text-center">
                  <Brain className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                  <h4 className="text-lg font-medium text-gray-700 mb-2">
                    {t("projectDetail.noAnalysis.title")}
                  </h4>
                  <p className="text-sm text-gray-600 mb-4">
                    {t("projectDetail.noAnalysis.description")}
                  </p>
                  <div className="text-center">
                    <div>
                      <div className="text-2xl font-bold text-gray-600">0</div>
                      <div className="text-xs text-gray-500">
                        {t("projectDetail.stats.totalTopics")}
                      </div>
                    </div>
                  </div>
                </div>
              )}
              {/* Filter Controls */}
              <div className="space-y-4 mb-4 sm:mb-6">
                {/* Active/Archive Toggle */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setTopicViewMode("active")}
                    className={`flex items-center px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
                      topicViewMode === "active"
                        ? "bg-blue-100 text-blue-700 border border-blue-200"
                        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    }`}
                  >
                    <Target className="h-4 w-4 mr-2" />
                    {t("projectDetail.ui.activeCount")} (
                    {
                      firebaseTopics.filter((topic) => isActive(topic.status))
                        .length
                    }
                    )
                  </button>
                  <button
                    onClick={() => setTopicViewMode("archived")}
                    className={`flex items-center px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
                      topicViewMode === "archived"
                        ? "bg-gray-100 text-gray-700 border border-gray-200"
                        : "bg-gray-50 text-gray-500 hover:bg-gray-100"
                    }`}
                  >
                    <Archive className="h-4 w-4 mr-2" />
                    {t("projectDetail.ui.archiveCount")} (
                    {
                      firebaseTopics.filter((topic) => isArchived(topic.status))
                        .length
                    }
                    )
                  </button>
                </div>
                {/* Status and Priority Filters */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Status Filter */}
                  <div className="flex flex-col gap-1">
                    <label className="text-sm font-medium text-gray-700">
                      {t("projectDetail.labels.status")}
                    </label>
                    <select
                      value={topicStatusFilter}
                      onChange={(e) =>
                        setTopicStatusFilter(
                          e.target.value as TopicStatus | "all"
                        )
                      }
                      className="w-full px-3 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                    >
                      <option value="all">{t("general.all")}</option>
                      {topicViewMode === "active"
                        ? getActiveStatuses().map((status) => (
                            <option key={status} value={status}>
                              {getLocalizedStatusText(status, t)}
                            </option>
                          ))
                        : getArchivedStatuses().map((status) => (
                            <option key={status} value={status}>
                              {getLocalizedStatusText(status, t)}
                            </option>
                          ))}
                    </select>
                  </div>
                  {/* Priority Filter */}
                  <div className="flex flex-col gap-1">
                    <label className="text-sm font-medium text-gray-700">
                      {t("projectDetail.labels.priority")}
                    </label>
                    <select
                      value={topicPriorityFilter}
                      onChange={(e) =>
                        setTopicPriorityFilter(
                          e.target.value as
                            | "all"
                            | "high"
                            | "medium"
                            | "low"
                            | "none"
                        )
                      }
                      className="w-full px-3 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                    >
                      <option value="all">{t("general.all")}</option>
                      <option value="high">
                        {t("projectDetail.priorityLevels.high")}
                      </option>
                      <option value="medium">
                        {t("projectDetail.priorityLevels.medium")}
                      </option>
                      <option value="low">
                        {t("projectDetail.priorityLevels.low")}
                      </option>
                      <option value="none">{t("general.unset")}</option>
                    </select>
                  </div>
                </div>
              </div>
              {/* Analysis Summary */}
              {project.analysis?.summary && (
                <div className="bg-blue-50 rounded-lg p-4 mb-6 border border-blue-200">
                  <h4 className="text-sm font-medium text-blue-900 mb-2">
                    {t("projectDetail.ui.analysisSummary")}
                  </h4>
                  <p className="text-sm text-blue-800">
                    {project.analysis.summary}
                  </p>
                </div>
              )}

              {/* AI Analysis Insights */}
              {project.analysis?.insights &&
                project.analysis.insights.length > 0 && (
                  <div className="mb-6">
                    <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                      <div className="h-5 w-5 bg-green-100 rounded-full flex items-center justify-center mr-3">
                        <span className="text-xs text-green-600">🤖</span>
                      </div>
                      {t("projectDetail.aiAnalysisTopics.title")}
                    </h4>
                    <div className="space-y-3">
                      {project.analysis.insights.map((insight, index) => (
                        <div
                          key={insight.id || index}
                          className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg p-4 border border-green-200 hover:shadow-md transition-shadow"
                        >
                          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                            <div className="flex-1 min-w-0">
                              <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-2">
                                <h5 className="text-base font-semibold text-green-900 break-words">
                                  {insight.title}
                                </h5>
                                {insight.priority && (
                                  <span
                                    className={`self-start sm:self-center px-2 py-1 rounded-full text-xs font-medium ${
                                      insight.priority === "high"
                                        ? "bg-red-100 text-red-800"
                                        : insight.priority === "medium"
                                        ? "bg-yellow-100 text-yellow-800"
                                        : "bg-green-100 text-green-800"
                                    }`}
                                  >
                                    {insight.priority === "high"
                                      ? t(
                                          "projectDetail.insights.highImportance"
                                        )
                                      : insight.priority === "medium"
                                      ? t(
                                          "projectDetail.insights.mediumImportance"
                                        )
                                      : t(
                                          "projectDetail.insights.lowImportance"
                                        )}
                                  </span>
                                )}
                              </div>
                              <p className="text-sm text-green-800 leading-relaxed">
                                {insight.description}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

              {/* Topics List */}
              <div className="space-y-4 sm:space-y-6">
                <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <div className="h-5 w-5 bg-purple-100 rounded-full flex items-center justify-center mr-3">
                    <span className="text-xs text-purple-600">📋</span>
                  </div>
                  {t("projectDetail.topics.title")}
                </h4>
                {(() => {
                  // AI分析が完了している場合はtopInsightsを使用
                  const allTopics: DisplayTopic[] = [];

                  // トピック表示デバッグ

                  // AI分析結果がある場合はtopInsightsを使用
                  if (
                    project.analysis?.topInsights &&
                    project.analysis.topInsights.length > 0
                  ) {
                    // AI分析トピックデータを使用
                    project.analysis.topInsights.forEach((topic) => {
                      // Firebaseトピックからステータスや優先度を取得
                      const firebaseTopic = firebaseTopics.find(
                        (ft) => ft.id === topic.id
                      );
                      allTopics.push({
                        id: topic.id,
                        title: topic.title,
                        description: topic.description,
                        count: topic.opinions?.length || 0,
                        status: firebaseTopic?.status
                          ? normalizeTopicStatus(firebaseTopic.status)
                          : "unhandled",
                        keywords: topic.keywords || [],
                        sentiment: topic.sentiment,
                        opinions: topic.opinions || [],
                        priority: firebaseTopic?.priority || null,
                      });
                    });
                  } else if (firebaseTopics.length > 0) {
                    // AI分析前はFirebaseトピックを使用
                    firebaseTopics.forEach((ft) => {
                      allTopics.push({
                        id: ft.id,
                        title: ft.title,
                        description: ft.description,
                        count: ft.count,
                        status: ft.status,
                        keywords:
                          (
                            ft as TopicData & {
                              keywords?: string[];
                              sentiment?: string;
                              opinions?: unknown[];
                            }
                          ).keywords || [],
                        sentiment: (
                          ft as TopicData & {
                            keywords?: string[];
                            sentiment?: string;
                            opinions?: unknown[];
                          }
                        ).sentiment,
                        opinions:
                          (
                            ft as TopicData & {
                              keywords?: string[];
                              sentiment?: string;
                              opinions?: unknown[];
                            }
                          ).opinions || [],
                        priority: ft.priority || null,
                      });
                    });
                  }
                  return allTopics;
                })()
                  .filter((topic) => {
                    const statusMatch =
                      topicViewMode === "active"
                        ? isActive(topic.status as TopicStatus)
                        : isArchived(topic.status as TopicStatus);
                    const filterMatch =
                      topicStatusFilter === "all" ||
                      topic.status === topicStatusFilter;

                    // 優先度フィルター
                    let priorityMatch = true;
                    if (topicPriorityFilter !== "all") {
                      const topicPriority = topic.priority?.level;
                      if (topicPriorityFilter === "none") {
                        priorityMatch = !topicPriority;
                      } else {
                        priorityMatch = topicPriority === topicPriorityFilter;
                      }
                    }

                    return statusMatch && filterMatch && priorityMatch;
                  })
                  .map((topic) => {
                    const TopicStatusIcon = getIconComponent(
                      getTopicStatusIcon(topic.status as TopicStatus)
                    );
                    return (
                      <div
                        key={topic.id}
                        className="bg-white rounded-xl shadow-lg border border-gray-100 p-6 hover:shadow-xl transition-shadow"
                      >
                        <div className="flex flex-col xl:flex-row xl:items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-3 mb-3">
                              <h3 className="text-lg sm:text-xl font-semibold text-gray-900 break-words">
                                {topic.title}
                              </h3>
                              <div className="flex items-center gap-3">
                                <span
                                  className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getTopicStatusColor(
                                    topic.status as TopicStatus
                                  )}`}
                                >
                                  <TopicStatusIcon className="h-3 w-3 mr-1" />
                                  {getLocalizedStatusText(
                                    topic.status as TopicStatus,
                                    t
                                  )}
                                </span>
                                {/* Topic Priority Display */}
                                {topic.priority && (
                                  <span
                                    className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${
                                      topic.priority.level === "high"
                                        ? "bg-red-100 text-red-800 border-red-200"
                                        : topic.priority.level === "medium"
                                        ? "bg-yellow-100 text-yellow-800 border-yellow-200"
                                        : "bg-green-100 text-green-800 border-green-200"
                                    }`}
                                    title={
                                      topic.priority.reason ||
                                      t("projectDetail.ui.prioritySet")
                                    }
                                  >
                                    <Target className="h-3 w-3 mr-1" />
                                    {topic.priority.level === "high"
                                      ? t("projectDetail.priorityLevels.high")
                                      : topic.priority.level === "medium"
                                      ? t("projectDetail.priorityLevels.medium")
                                      : t("projectDetail.priorityLevels.low")}
                                  </span>
                                )}
                              </div>
                            </div>
                            <p className="text-gray-600 text-sm sm:text-base mb-3">
                              {topic.description}
                            </p>

                            {/* Keywords */}
                            {topic.keywords && topic.keywords.length > 0 && (
                              <div className="mb-3">
                                <div className="flex flex-wrap gap-2">
                                  {topic.keywords.map(
                                    (keyword: string, index: number) => (
                                      <span
                                        key={index}
                                        className="inline-flex items-center px-3 py-1 rounded-md text-sm bg-gray-100 text-gray-700"
                                      >
                                        {keyword}
                                      </span>
                                    )
                                  )}
                                </div>
                              </div>
                            )}
                            <div className="flex flex-wrap items-center gap-3 text-xs sm:text-sm text-gray-500">
                              <div className="flex items-center">
                                <MessageSquare className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                                {topic.count}
                                {t("projectDetail.labels.opinionsUnit")}
                              </div>
                              {/* Sentiment Display */}
                              {topic.sentiment && (
                                <div className="flex items-center gap-2">
                                  {topic.sentiment.positive > 0 && (
                                    <span className="text-green-600">
                                      👍 {topic.sentiment.positive}
                                    </span>
                                  )}
                                  {topic.sentiment.negative > 0 && (
                                    <span className="text-red-600">
                                      👎 {topic.sentiment.negative}
                                    </span>
                                  )}
                                  {topic.sentiment.neutral > 0 && (
                                    <span className="text-gray-600">
                                      😐 {topic.sentiment.neutral}
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="flex flex-col gap-3 min-w-0 xl:min-w-48">
                            {/* Status Display (Read-only) */}
                            <div>
                              <label className="block text-xs font-medium text-gray-700 mb-1">
                                {t("projectDetail.fieldLabels.status")}
                              </label>
                              <div className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 text-sm">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center">
                                    {React.createElement(
                                      getIconComponent(
                                        getTopicStatusIcon(
                                          topic.status as TopicStatus
                                        )
                                      ),
                                      {
                                        className: `h-4 w-4 mr-2 text-gray-600`,
                                      }
                                    )}
                                    <span className="text-gray-700">
                                      {getLocalizedStatusText(
                                        topic.status as TopicStatus, t
                                      )}
                                    </span>
                                  </div>
                                </div>
                                <p className="text-xs text-gray-500 mt-1">
                                  {t("projectDetail.ui.statusChangeNote")}
                                </p>
                              </div>
                            </div>
                            {/* Action Buttons */}
                            <div className="flex flex-col gap-2">
                              <button
                                onClick={() =>
                                  navigate(`/projects/${id}/topics/${topic.id}`)
                                }
                                className="px-3 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors text-sm font-medium"
                              >
                                <Eye className="h-4 w-4 inline mr-1" />
                                {t("projectDetail.topics.viewDetails")}
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}

                {/* Empty State */}
                {firebaseTopics.filter((topic) => {
                  const statusMatch =
                    topicViewMode === "active"
                      ? isActive(topic.status as TopicStatus)
                      : isArchived(topic.status as TopicStatus);
                  const filterMatch =
                    topicStatusFilter === "all" ||
                    topic.status === topicStatusFilter;

                  // 優先度フィルター
                  let priorityMatch = true;
                  if (topicPriorityFilter !== "all") {
                    const topicPriority = topic.priority?.level;
                    if (topicPriorityFilter === "none") {
                      priorityMatch = !topicPriority;
                    } else {
                      priorityMatch = topicPriority === topicPriorityFilter;
                    }
                  }

                  return statusMatch && filterMatch && priorityMatch;
                }).length === 0 && (
                  <div className="text-center py-12">
                    {topicViewMode === "active" ? (
                      <>
                        <Target className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-gray-900 mb-2">
                          {t("projectDetail.emptyStates.noActiveTopics")}
                        </h3>
                        <p className="text-gray-600">
                          {t(
                            "projectDetail.emptyStates.allTopicsResolvedOrDismissed"
                          )}
                        </p>
                      </>
                    ) : (
                      <>
                        <Archive className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-gray-900 mb-2">
                          {t("projectDetail.emptyStates.noArchivedTopics")}
                        </h3>
                        <p className="text-gray-600">
                          {t(
                            "projectDetail.emptyStates.noResolvedOrDismissedTopics"
                          )}
                        </p>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Analysis Summary Card */}
            <AnalysisSummaryCard projectId={id || ""} className="mt-6" />
          </div>
          {/* Right Column - Collection & Controls */}
          <div className="space-y-6">
            {/* Collection & Status Control */}
            <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-4 sm:p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <Users className="h-5 w-5 mr-2 text-blue-600" />
                {t("projectDetail.sections.opinionCollection")}
              </h3>
              <div className="space-y-6">
                {/* Current Status Display */}
                <div className="text-center">
                  <span
                    className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(
                      project.status,
                      project.isArchived
                    )}`}
                  >
                    <StatusIcon className="h-4 w-4 mr-2" />
                    {getStatusText(project.status, project.isArchived)}
                  </span>
                </div>

                {/* Collection Control Buttons */}
                <div className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <button
                      onClick={() => handleStatusChange("collecting")}
                      disabled={project.status !== "paused"}
                      className="px-4 py-3 bg-blue-100 text-blue-800 rounded-lg hover:bg-blue-200 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Play className="h-4 w-4 inline mr-2" />
                      {t("projectDetail.buttons.startCollection")}
                    </button>
                    <button
                      onClick={() => handleStatusChange("paused")}
                      disabled={project.status !== "collecting"}
                      className="px-4 py-3 bg-yellow-100 text-yellow-800 rounded-lg hover:bg-yellow-200 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Pause className="h-4 w-4 inline mr-1" />
                      {t("projectDetail.buttons.pause")}
                    </button>
                  </div>

                  {/* AI Analysis Button - separated for clarity */}
                  <div className="border-t pt-4">
                    <div className="text-xs text-gray-500 mb-2 text-center">
                      {t("projectDetail.aiAnalysis.executeAnalysis")}
                    </div>
                    
                    {/* 分析言語設定ボタン */}
                    <div className="mb-3">
                      <button
                        onClick={handleAnalysisLanguageClick}
                        className="w-full flex items-center justify-between px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors"
                      >
                        <div className="flex items-center space-x-2">
                          <Globe className="h-4 w-4 text-gray-500" />
                          <span className="text-sm font-medium text-gray-700">
                            {t("projectDetail.analysisLanguage.currentSetting")}:
                          </span>
                          <span className="text-sm text-gray-900">
                            {getCurrentAnalysisLanguageDisplay()}
                          </span>
                        </div>
                        <ChevronDown className="h-4 w-4 text-gray-400" />
                      </button>
                    </div>
                    {(() => {
                      // バックエンドから正確な未分析意見数を取得
                      const unanalyzedOpinionsCount =
                        project.unanalyzedOpinionsCount ?? 0;

                      return unanalyzedOpinionsCount < 5;
                    })() ? (
                      <div className="space-y-2">
                        <div className="w-full px-4 py-3 bg-gray-100 text-gray-500 rounded-lg text-sm text-center">
                          <Brain className="h-4 w-4 inline mr-2" />
                          {t("projectDetail.aiAnalysis.minimumOpinionsRequired")}
                          <div className="text-xs mt-1">
                            {t("projectDetail.aiAnalysis.current")}: {project.unanalyzedOpinionsCount ?? 0}
                            {t("projectDetail.aiAnalysis.opinionsUnit")}
                          </div>
                        </div>
                      </div>
                    ) : project.status === "processing" || isAnalysisRunning ? (
                      <div className="space-y-3">
                        <div className="w-full px-4 py-3 bg-purple-50 border border-purple-200 rounded-lg">
                          <div className="flex items-center justify-center mb-2">
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-purple-600 mr-2"></div>
                            <span className="text-sm font-medium text-purple-800">
                              {t("projectDetail.aiAnalysis.running")}
                            </span>
                          </div>
                          <p className="text-xs text-purple-600 text-center">
                            {t(
                              "projectDetail.aiAnalysis.processingInBackground"
                            )}
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <button
                          onClick={handleStartAnalysis}
                          disabled={
                            (project?.status as Project["status"]) ===
                              "processing" || firebaseIsAnalyzing || isAnalysisRunning
                          }
                          className="w-full px-4 py-3 bg-purple-100 text-purple-800 rounded-lg hover:bg-purple-200 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <Brain className="h-4 w-4 inline mr-2" />
                          {(firebaseIsAnalyzing || isAnalysisRunning)
                            ? t("projectDetail.buttons.analysisRunning")
                            : t("projectDetail.buttons.startAnalysis")}
                        </button>

                        {/* 意見収集制限表示 */}
                        {opinionLimits && (
                          <div className="text-xs text-gray-500 text-center">
                            意見収集: {opinionLimits.currentUsage}/{opinionLimits.limit > 0 ? opinionLimits.limit : "無制限"}件
                            {opinionLimits.limit > 0 && opinionLimits.remaining >= 0 && (
                              <span> (残り{opinionLimits.remaining}件)</span>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
                {/* Form URL */}
                <div className="border-t pt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t("projectDetail.sharing.url")}
                  </label>
                  <div className="flex flex-col sm:flex-row gap-3">
                    <input
                      type="text"
                      value={formUrl}
                      readOnly
                      className="flex-1 px-4 py-3 border border-gray-300 rounded-lg bg-gray-50 text-sm"
                    />
                    <button
                      onClick={handleCopyUrl}
                      className="px-4 py-3 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors sm:w-auto w-full"
                      title={t("projectDetail.ui.copyUrl")}
                    >
                      {copiedUrl ? (
                        <Check className="h-4 w-4 sm:h-5 sm:w-5" />
                      ) : (
                        <Copy className="h-4 w-4 sm:h-5 sm:w-5" />
                      )}
                    </button>
                  </div>
                </div>
                {/* Form Access Buttons */}
                <div className="space-y-2">
                  <button
                    onClick={() => window.open(formUrl, "_blank")}
                    className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium text-sm flex items-center justify-center"
                  >
                    <ExternalLink className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
                    {t("projectDetail.buttons.openForm")}
                  </button>
                  <button
                    onClick={() => setShowQrModal(true)}
                    className="w-full px-4 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium text-sm flex items-center justify-center"
                  >
                    <QrCode className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
                    {t("projectDetail.buttons.showQrCode")}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
      {/* アニメーション用のスタイル */}
      <style>{`
        @keyframes fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        .animate-fade-in {
          animation: fade-in 0.3s ease-in-out;
        }
      `}</style>
      {/* AI分析確認モーダル */}
      {showAnalysisModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full">
            <div className="p-6">
              <div className="flex items-start mb-6">
                <div className="h-10 w-10 bg-purple-100 rounded-full flex items-center justify-center mr-4 flex-shrink-0">
                  <Brain className="h-5 w-5 text-purple-600" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    {t("projectDetail.analysisModal.title")}
                  </h3>
                  <p className="text-sm text-gray-600 leading-relaxed">
                    {t("projectDetail.analysisModal.description")}
                  </p>
                </div>
              </div>

              <div className="flex space-x-3">
                <button
                  onClick={() => setShowAnalysisModal(false)}
                  className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  {t("buttons.cancel")}
                </button>
                <button
                  onClick={confirmAnalysis}
                  className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                >
                  {t("projectDetail.analysisModal.start")}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* リアルタイム分析進捗カード */}
      {showAnalysisProgress && id && (
        <AnalysisProgressCard
          projectId={id}
          projectName={project?.name || ""}
          isOpen={showAnalysisProgress}
          onAnalysisComplete={handleAnalysisComplete}
          onMinimize={handleMinimizeAnalysisProgress}
          onCancel={handleCancelAnalysis}
          canCancel={true}
          canMinimize={true}
        />
      )}

      {/* Simple Project Completion Confirmation */}
      {showCompleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <div className="flex items-center gap-3 mb-4">
              <CheckCircle className="h-6 w-6 text-purple-600" />
              <h2 className="text-xl font-bold text-gray-900">
                {t("projectDetail.completeModal.title")}
              </h2>
            </div>
            <p className="text-gray-600 mb-2">
              {t("projectDetail.completeModal.description")}
            </p>
            <p className="text-sm text-gray-500 mb-6">
              {t("projectDetail.completeModal.canReactivate")}
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowCompleteModal(false)}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors font-medium"
              >
                {t("projectDetail.status.cancel")}
              </button>
              <button
                onClick={handleProjectCompletion}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium flex items-center gap-2"
              >
                <CheckCircle className="h-4 w-4" />
                {t("projectDetail.completeModal.complete")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* User Purpose Modal */}
      <UserPurposeModal
        isOpen={showPurposeModal}
        onClose={() => setShowPurposeModal(false)}
      />

      {/* Analysis Limit Reached Dialog */}
      <LimitReachedDialog
        isOpen={showAnalysisLimitDialog}
        onClose={() => setShowAnalysisLimitDialog(false)}
        dialogType={planStatus?.hasUsedTrial ? "upgrade-promotion" : "limit"}
        limitType="analysis"
        message={t("analysis.limitReached")}
        onConfirm={async () => {
          // トライアル確認時の処理 - Stripe Checkout経由
          try {
            console.log('[ProjectDetail] Starting Stripe Checkout for trial (onConfirm)...');
            
            const response = await fetch('/api/billing/create-checkout-session', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'x-user-id': user?.id || ''
              },
              body: JSON.stringify({
                priceId: import.meta.env.VITE_STRIPE_PRICE_ID,
                enableTrial: true,
                successUrl: window.location.origin + '/dashboard?trial=success',
                cancelUrl: window.location.origin + '/dashboard'
              })
            });

            const data = await response.json();
            
            if (data.success && data.url) {
              console.log('[ProjectDetail] Redirecting to Stripe Checkout:', data.url);
              setShowAnalysisLimitDialog(false);
              window.location.href = data.url; // Stripeチェックアウトページに遷移
            } else {
              throw new Error(data.error || 'Failed to create Stripe Checkout session');
            }
          } catch (error) {
            console.error('Stripe Checkout failed:', error);
            alert('トライアルの開始に失敗しました。もう一度お試しください。');
          }
        }}
        onStartTrial={async () => {
          // 制限ダイアログでのトライアル開始 - Stripe Checkout経由
          try {
            console.log('[ProjectDetail] Starting Stripe Checkout for trial (onStartTrial)...');
            
            const response = await fetch('/api/billing/create-checkout-session', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'x-user-id': user?.id || ''
              },
              body: JSON.stringify({
                priceId: import.meta.env.VITE_STRIPE_PRICE_ID,
                enableTrial: true,
                successUrl: window.location.origin + '/dashboard?trial=success',
                cancelUrl: window.location.origin + '/dashboard'
              })
            });

            const data = await response.json();
            
            if (data.success && data.url) {
              console.log('[ProjectDetail] Redirecting to Stripe Checkout:', data.url);
              setShowAnalysisLimitDialog(false);
              window.location.href = data.url; // Stripeチェックアウトページに遷移
            } else {
              throw new Error(data.error || 'Failed to create Stripe Checkout session');
            }
          } catch (error) {
            console.error('Stripe Checkout failed:', error);
            alert('トライアルの開始に失敗しました。もう一度お試しください。');
          }
        }}
        onUpgrade={async () => {
          setShowAnalysisLimitDialog(false);
          
          try {
            // Checkout Session APIを使用してuserIdを渡す
            const response = await fetch('/api/billing/create-checkout-session', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'x-user-id': user?.id || ''
              },
              body: JSON.stringify({
                priceId: STRIPE_PRICE_ID,
                successUrl: `${window.location.origin}/dashboard?upgrade=success`,
                cancelUrl: `${window.location.origin}/dashboard?upgrade=cancelled`,
                enableTrial: false
              })
            });

            if (!response.ok) {
              const error = await response.json();
              throw new Error(error.details || 'Failed to create checkout session');
            }

            const data = await response.json();
            
            if (data.url) {
              // Stripeのチェックアウトページにリダイレクト
              window.location.href = data.url;
            } else {
              throw new Error('No checkout URL returned');
            }
          } catch (error) {
            console.error('Upgrade error:', error);
            alert(t('billing.error') || 'An error occurred. Please try again.');
          }
        }}
      />

      {/* Analysis Language Modal */}
      <AnalysisLanguageModal 
        isOpen={showAnalysisLanguageModal}
        onClose={handleAnalysisLanguageModalClose}
      />
    </div>
  );
}
