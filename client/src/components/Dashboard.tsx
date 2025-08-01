import { useState, useEffect, useCallback } from "react";
import {
  Plus,
  Brain,
  ArrowRight,
  Archive,
  MessageSquare,
  CheckCircle,
  Clock,
  AlertTriangle,
  Calendar,
  XCircle,
  Users,
  Globe,
  Pause,
  Zap,
  Search,
  X,
  Filter,
  ChevronDown,
  Target,
  Settings,
  Activity,
  Crown,
} from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useProjects } from "../hooks/useProjects";
import { useAuth } from "../hooks/useAuth";
import { useLanguage } from "../hooks/useLanguage";
import { useSearchDebounce } from "../hooks/useDebounce";
import { usePlanDetails } from "../hooks/usePlanDetails";
import { TrialConfig } from "../config/trialConfig";
import { Project } from "../contexts/ProjectContext";
import { ResponsiveHeader } from "./ResponsiveHeader";
import { UserPurposeModal } from "./UserPurposeModal";
import { PurposeSettingsBanner } from "./PurposeSettingsBanner";
import { dashboardService } from "../services/dashboardService";
import { getUpgradeDisplayContext, UpgradeBannerDismissalManager } from "../utils/upgradeDisplayLogic";
import { useLimitHitDetection } from "../hooks/useLimitHitDetection";
import { useToast } from "./NotificationToast";
import { LimitReachedDialog } from "./LimitReachedDialog";

// Constants - Stripe Checkout now handled via /api/billing/create-checkout-session
const STRIPE_PRICE_ID = import.meta.env.VITE_STRIPE_PRICE_ID || 'price_1RnZ6qEOZJMIcvctX9z0VHZJ';

type TabOption = "active" | "completed";
type StatusFilter =
  | "all"
  | "collecting"
  | "paused"
  | "completed"
  | "ready-for-analysis"
  | "archived";
type PeriodFilter = "all" | "week" | "month" | "quarter" | "older";
type PriorityFilter = "all" | "urgent" | "normal";

interface QuickStats {
  totalProjects: number;
  activeProjects: number;
  pendingActions: number;
  unhandledActions?: number;
  inProgressActions?: number;
}

export function Dashboard() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { projects, restoreProject } = useProjects();
  const { user, refreshUser } = useAuth();
  const { t, language } = useLanguage();
  const { showToast } = useToast();
  const { getAllPlans } = usePlanDetails();

  const [activeTab, setActiveTab] = useState<TabOption>("active");
  const [searchTerm, setSearchTerm] = useState("");
  const debouncedSearchTerm = useSearchDebounce(searchTerm, 300);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>("all");
  const [priorityFilter, setPriorityFilter] = useState<PriorityFilter>("all");
  const [showFilters, setShowFilters] = useState(false);
  const [quickStats, setQuickStats] = useState<QuickStats>({
    totalProjects: 0,
    activeProjects: 0,
    pendingActions: 0,
  });

  // Purpose settings modal and banner states
  const [showPurposeModal, setShowPurposeModal] = useState(false);
  const [bannerDismissed, setBannerDismissed] = useState(false);
  
  
  // Trial confirmation dialog state
  const [showTrialConfirmDialog, setShowTrialConfirmDialog] = useState(false);
  
  // Upgrade promotion dialog state
  const [showUpgradePromotionDialog, setShowUpgradePromotionDialog] = useState(false);
  
  // Upgrade banner state with best practices
  const [recentLimitHits, setRecentLimitHits] = useState<{ type: string; timestamp: string; context: string }[]>([]);
  const [analysisCount] = useState(0);
  
  // Account deletion status
  const [deletionStatus, setDeletionStatus] = useState<{
    isDeleted: boolean;
    deletionRequestedAt?: string;
    scheduledDeletionAt?: string;
    deletionReason?: string;
    deletionCancelledAt?: string;
  } | null>(null);
  
  // Limit hit detection integration
  const { registerLimitHitListener } = useLimitHitDetection();
  
  // Initialize limit hit detection
  useEffect(() => {
    const unregister = registerLimitHitListener((limitHitEvent) => {
      console.log('[Dashboard] 制限到達イベントを受信:', limitHitEvent);
      
      // 制限到達イベントを状態に追加
      setRecentLimitHits(prev => [
        ...prev.filter(hit => {
          // 同じタイプの古いイベントを削除（重複防止）
          const isOldEvent = hit.type === limitHitEvent.type && 
                           (new Date().getTime() - new Date(hit.timestamp).getTime()) > 60000; // 1分以上古い
          return !isOldEvent;
        }),
        {
          type: limitHitEvent.type,
          timestamp: limitHitEvent.timestamp,
          context: limitHitEvent.context
        }
      ]);
    });
    
    return unregister;
  }, [registerLimitHitListener]);


  // 実行中の分析があるかチェック
  const [runningAnalysis, setRunningAnalysis] = useState<{
    projectId: string;
    projectName: string;
  } | null>(null);

  // Fetch deletion status
  const fetchDeletionStatus = useCallback(async () => {
    if (!user?.id) return;
    
    try {
      const response = await fetch(`/api/users/${user.id}/deletion-status`, {
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': user.id
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setDeletionStatus(data.deletionStatus);
      }
    } catch (error) {
      console.error('Failed to fetch deletion status:', error);
    }
  }, [user?.id]);

  useEffect(() => {
    if (user?.id) {
      fetchDeletionStatus();
    }
  }, [user?.id, fetchDeletionStatus]);

  // Handle payment success - refresh user status after Stripe checkout
  useEffect(() => {
    const upgradeStatus = searchParams.get('upgrade');
    if (upgradeStatus === 'success' && user?.id) {
      console.log('[Dashboard] Payment success detected, refreshing user status');
      
      // Refresh user data to get updated subscription status
      refreshUser().then(() => {
        console.log('[Dashboard] User status refreshed after payment');
        showToast(t('dashboard.payment.success') || 'Payment successful! Your subscription has been activated.', 'success');
      }).catch((error) => {
        console.error('[Dashboard] Failed to refresh user after payment:', error);
      });

      // Remove upgrade parameter from URL
      const newSearchParams = new URLSearchParams(searchParams);
      newSearchParams.delete('upgrade');
      setSearchParams(newSearchParams, { replace: true });
    }
  }, [searchParams, user?.id, refreshUser, showToast, setSearchParams, t]);

  // Handle deletion cancellation
  const handleCancelDeletion = async () => {
    if (!user?.id) return;
    
    try {
      const response = await fetch(`/api/users/${user.id}/deletion-request`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': user.id
        }
      });
      
      if (response.ok) {
        showToast(t('accountSettings.accountDeletion.cancelSuccess'), 'success');
        await fetchDeletionStatus();
      } else {
        throw new Error('Failed to cancel deletion');
      }
    } catch (error) {
      console.error('Failed to cancel deletion:', error);
      showToast(t('accountSettings.errors.loadFailed'), 'error');
    }
  };

  // Socket.IOリアルタイム更新の設定
  useEffect(() => {
    if (!user) return;

    // CLAUDE.md要件: リアルタイムダッシュボード更新のためのSocket.IO接続

    // Socket.IOの実装は今後追加予定
    // 現在は従来のチェック機能を維持
    const checkRunningAnalysis = () => {
      const activeSession = localStorage.getItem("activeAnalysisSession");
      if (activeSession) {
        try {
          const sessionParts = activeSession.split("-");
          const projectId = sessionParts[1];
          const project = projects.find((p) => p.id === projectId);
          if (project && project.status === "processing") {
            setRunningAnalysis({ projectId, projectName: project.name });
          } else {
            setRunningAnalysis(null);
          }
        } catch {
          setRunningAnalysis(null);
        }
      } else {
        setRunningAnalysis(null);
      }
    };

    checkRunningAnalysis();
    const interval = setInterval(checkRunningAnalysis, 3000);

    return () => clearInterval(interval);
  }, [projects, user]);

  // Calculate practical statistics using API
  useEffect(() => {
    const loadDashboardStats = async () => {
      try {
        // APIから統計情報を取得
        const stats = await dashboardService.getDashboardStats();
        setQuickStats(stats);
      } catch (error) {
        console.error('Failed to load dashboard stats:', error);
        
        // フォールバック: プロジェクトデータから直接計算
        const activeProjects = projects.filter(
          (p) =>
            p.status === "collecting" ||
            p.status === "processing" ||
            p.status === "paused" ||
            p.status === "ready-for-analysis"
        ).length;

        // LocalStorageからの未対応アクション数計算（フォールバック）
        let pendingActions = 0;
        projects.forEach((project) => {
          if (!project.analysis?.topInsights || project.analysis.topInsights.length === 0) {
            return;
          }

          project.analysis.topInsights.forEach((topic) => {
            if (topic.opinions && Array.isArray(topic.opinions)) {
              topic.opinions.forEach((opinion: { id: string }) => {
                const storedData = localStorage.getItem(
                  `opinionAction_${opinion.id}`
                );
                if (storedData) {
                  try {
                    const actionData = JSON.parse(storedData);
                    if (
                      actionData.actionStatus === "unhandled" ||
                      actionData.actionStatus === "in-progress"
                    ) {
                      pendingActions++;
                    }
                  } catch {
                    // JSON parse エラーは無視
                  }
                }
              });
            }
          });
        });

        setQuickStats({
          totalProjects: projects.length,
          activeProjects,
          pendingActions,
        });
      }
    };

    if (user) {
      loadDashboardStats();
    }
  }, [projects, user]);

  // Manage purpose banner dismissal state with time-based reappearance
  useEffect(() => {
    const dismissalData = localStorage.getItem("purposeBannerDismissal");
    
    if (!dismissalData) {
      setBannerDismissed(false);
      return;
    }
    
    try {
      const { timestamp, count } = JSON.parse(dismissalData);
      const now = Date.now();
      const daysSinceDismissal = (now - timestamp) / (1000 * 60 * 60 * 24);
      
      // Determine reappearance interval based on dismissal count
      let reappearanceDays = 7; // Default: 7 days
      if (count >= 3) {
        reappearanceDays = 30; // After 3 dismissals: 30 days
      } else if (count === 2) {
        reappearanceDays = 14; // After 2 dismissals: 14 days
      }
      
      if (daysSinceDismissal >= reappearanceDays) {
        // Time has passed, reset the banner
        localStorage.removeItem("purposeBannerDismissal");
        setBannerDismissed(false);
      } else {
        setBannerDismissed(true);
      }
    } catch {
      // If parsing fails, show the banner
      localStorage.removeItem("purposeBannerDismissal");
      setBannerDismissed(false);
    }
  }, []);

  const handleDismissBanner = () => {
    setBannerDismissed(true);
    
    // Get current dismissal data
    const dismissalData = localStorage.getItem("purposeBannerDismissal");
    let count = 0;
    
    if (dismissalData) {
      try {
        const parsed = JSON.parse(dismissalData);
        count = parsed.count || 0;
      } catch {
        // Ignore parsing errors
      }
    }
    
    // Save new dismissal data with incremented count
    localStorage.setItem("purposeBannerDismissal", JSON.stringify({
      timestamp: Date.now(),
      count: count + 1
    }));
  };

  const handleOpenPurposeModal = () => {
    setShowPurposeModal(true);
  };

  const handleUpgradeClick = async () => {
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
        // Stripeのチェックアウトページに同一タブでリダイレクト
        window.location.href = data.url;
      } else {
        throw new Error('No checkout URL returned');
      }
    } catch (error) {
      console.error('Upgrade error:', error);
      showToast(t('billing.error') || 'An error occurred. Please try again.', 'error');
    }
  };

  const handleStartTrial = async () => {
    try {
      console.log('[Dashboard] Starting Stripe Checkout for trial...');
      
      // Stripe Checkout セッション作成
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
          cancelUrl: window.location.origin + '/dashboard?trial=cancel'
        })
      });

      const data = await response.json();
      
      if (data.success && data.url) {
        console.log('[Dashboard] Redirecting to Stripe Checkout:', data.url);
        window.location.href = data.url; // Stripeチェックアウトページに遷移
      } else {
        throw new Error(data.error || 'Failed to create Stripe Checkout session');
      }
    } catch (error) {
      console.error('Stripe Checkout failed:', error);
      alert('トライアルの開始に失敗しました。もう一度お試しください。');
    }
  };

  const handleConfirmTrialStart = async () => {
    setShowTrialConfirmDialog(false);
    await handleStartTrial();
  };


  // Clear banner dismissal data when purpose is set
  useEffect(() => {
    if (user?.purpose) {
      localStorage.removeItem("purposeBannerDismissal");
    }
  }, [user?.purpose]);


  // Helper function to get project period
  const getProjectPeriod = (project: Project) => {
    const now = new Date();
    const createdAt = project.createdAt;
    const diffDays = Math.floor(
      (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (diffDays <= 7) return "week";
    if (diffDays <= 30) return "month";
    if (diffDays <= 90) return "quarter";
    return "older";
  };

  // AI分析完了とプロジェクト完了を明確に分離するヘルパー関数
  const isProjectTrulyCompleted = (project: Project) => {
    // ユーザーが明示的にプロジェクトを完了した場合のみtrueを返す
    // AI分析データが存在する場合は、まだアクティブとして扱う
    if (project.status === "completed") {
      // AI分析データが存在しない場合のみ「真の完了」とみなす
      return !project.analysis?.topInsights || project.analysis.topInsights.length === 0;
    }
    return false;
  };

  // Filter projects based on all criteria
  const filteredProjects = projects.filter((project) => {
    // Search filter
    const matchesSearch =
      debouncedSearchTerm === "" ||
      project.name.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
      (project.description &&
        project.description
          .toLowerCase()
          .includes(debouncedSearchTerm.toLowerCase()));

    // Tab filter (when not using specific status filter)
    let matchesTab = true;
    if (statusFilter === "all") {
      if (activeTab === "active") {
        matchesTab =
          !project.isArchived &&
          !isProjectTrulyCompleted(project) &&
          (project.status === "collecting" ||
            project.status === "processing" ||
            project.status === "paused" ||
            project.status === "ready-for-analysis" ||
            project.status === "analyzing" ||
            project.status === "completed" ||
            project.status === "in-progress");
      } else {
        // completed tab
        matchesTab = (isProjectTrulyCompleted(project) || !!project.isArchived);
      }
    } else {
      // When using specific status filter, respect completion state based on active tab
      if (activeTab === "active") {
        // Activeタブでは、アーカイブされておらず、真の完了状態でないプロジェクトを表示
        // AI分析済み（status='completed'）でもActiveタブに表示する
        matchesTab = !project.isArchived && !isProjectTrulyCompleted(project);
      } else {
        // completed tab
        // 真の完了状態またはアーカイブされたプロジェクトを表示
        matchesTab = (isProjectTrulyCompleted(project) || !!project.isArchived);
      }
    }

    // Status filter
    const matchesStatus =
      statusFilter === "all" || 
      (statusFilter === "archived" ? project.isArchived : project.status === statusFilter);

    // Period filter
    const matchesPeriod =
      periodFilter === "all" || getProjectPeriod(project) === periodFilter;

    // Priority filter
    let matchesPriority = true;
    if (priorityFilter !== "all") {
      const projectPriority = project.priority?.level || project.priority;
      if (priorityFilter === "urgent") {
        matchesPriority = projectPriority === "high";
      } else {
        // 'normal'の場合は、high以外（medium, low, 未設定）を表示
        matchesPriority = projectPriority !== "high";
      }
    }

    return (
      matchesSearch &&
      matchesTab &&
      matchesStatus &&
      matchesPeriod &&
      matchesPriority
    );
  });;

  // Sort projects by most recent activity and urgency
  const sortedProjects = [...filteredProjects].sort((a, b) => {
    if (activeTab === "active") {
      // Prioritize by status: processing > ready-for-analysis > collecting > paused
      const statusPriority: Record<Project["status"], number> = {
        processing: 4,
        "ready-for-analysis": 3,
        analyzing: 2,
        "in-progress": 2,
        collecting: 1,
        paused: 1,
        completed: 0,
        error: 0,
      };

      const aPriority = statusPriority[a.status];
      const bPriority = statusPriority[b.status];

      if (aPriority !== bPriority) {
        return bPriority - aPriority;
      }
    }

    // Then by creation date (newest first)
    return b.createdAt.getTime() - a.createdAt.getTime();
  });

  const activeCount = projects.filter(
    (p) =>
      !p.isArchived &&
      p.status !== "completed" &&
      (p.status === "collecting" ||
        p.status === "processing" ||
        p.status === "paused" ||
        p.status === "ready-for-analysis" ||
        p.status === "analyzing" ||
        p.status === "in-progress")
  ).length;
  const completedCount = projects.filter((p) => 
    p.status === "completed" || !!p.isArchived
  ).length;

  const getStatusColor = (status: Project["status"], isArchived?: boolean) => {
    if (isArchived) {
      return "bg-slate-100 text-slate-800 border-slate-200";
    }
    
    switch (status) {
      case "collecting":
        return "bg-green-100 text-green-800 border-green-200";
      case "processing":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "ready-for-analysis":
        return "bg-purple-100 text-purple-800 border-purple-200";
      case "paused":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "completed":
        return "bg-gray-100 text-gray-800 border-gray-200";
      case "error":
        return "bg-red-100 text-red-800 border-red-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const getStatusText = (status: Project["status"], isArchived?: boolean, project?: Project) => {
    if (isArchived) {
      return t("dashboard.status.archived");
    }
    
    switch (status) {
      case "collecting":
        return t("dashboard.status.collecting");
      case "processing":
        return t("dashboard.status.processing");
      case "ready-for-analysis":
        return t("dashboard.status.readyForAnalysis");
      case "paused":
        return t("dashboard.status.paused");
      case "completed":
        return t("dashboard.status.completed");
      case "error":
        return t("dashboard.status.error");
      default:
        return t("dashboard.status.unknown");
    }
  };;

  const getStatusIcon = (status: Project["status"], isArchived?: boolean) => {
    if (isArchived) {
      return Archive;
    }
    
    switch (status) {
      case "collecting":
        return MessageSquare;
      case "processing":
        return Brain;
      case "ready-for-analysis":
        return Zap;
      case "paused":
        return Pause;
      case "completed":
        return CheckCircle;
      case "error":
        return XCircle;
      default:
        return AlertTriangle;
    }
  };

  const getLastAnalysisText = (project: Project) => {
    // 分析データが存在しない、または実行されていない場合
    // analysisオブジェクトがundefined、または実際の分析データが存在しない場合
    if (!project.analysis || 
        !project.analysis.executedAt || 
        !project.analysis.topInsights?.length ||
        project.analysis.topInsights.length === 0) {
      return t("dashboard.analysis.notPerformed");
    }

    // 実際の分析実行日時を使用
    const analysisDate = new Date(project.analysis.executedAt);
    const now = new Date();
    const diffHours = Math.floor(
      (now.getTime() - analysisDate.getTime()) / (1000 * 60 * 60)
    );
    const diffDays = Math.floor(diffHours / 24);

    if (diffHours < 1) {
      return t("dashboard.analysis.withinHour");
    } else if (diffHours < 24) {
      return t("dashboard.analysis.hoursAgo").replace(
        "{hours}",
        diffHours.toString()
      );
    } else if (diffDays === 1) {
      return t("dashboard.analysis.yesterday");
    } else if (diffDays < 7) {
      return t("dashboard.analysis.daysAgo").replace(
        "{days}",
        diffDays.toString()
      );
    } else {
      return analysisDate.toLocaleDateString();
    }
  };

  const isFormActive = (project: Project) => {
    return project.status === "collecting";
  };

  const getProjectActionInfo = useCallback((project: Project) => {
    if (!project.analysis?.topInsights || project.analysis.topInsights.length === 0)
      return { pendingCount: 0, totalActions: 0, hasAnyActions: false };

    let pendingCount = 0;
    let totalActions = 0;

    // 各トピックの意見からアクション管理データを確認
    project.analysis.topInsights.forEach((topic) => {
      if (topic.opinions && Array.isArray(topic.opinions)) {
        topic.opinions.forEach((opinion: { id: string }) => {
          // localStorageからアクション管理データを取得
          const storedData = localStorage.getItem(
            `opinionAction_${opinion.id}`
          );
          if (storedData) {
            try {
              const actionData = JSON.parse(storedData);
              totalActions++;
              // 未対応または対応中のアクションをカウント
              if (
                actionData.actionStatus === "unhandled" ||
                actionData.actionStatus === "in-progress"
              ) {
                pendingCount++;
              }
            } catch {
              // JSON parse エラーは無視
            }
          }
        });
      }
    });

    return {
      pendingCount,
      totalActions,
      hasAnyActions: totalActions > 0,
    };
  }, []);

  const getProjectPendingActions = useCallback((project: Project) => {
    return getProjectActionInfo(project).pendingCount;
  }, [getProjectActionInfo]);

  // フィルター表示用のヘルパー関数
  const getStatusFilterText = (status: StatusFilter) => {
    switch (status) {
      case "collecting":
        return t("dashboard.statusFilter.collecting");
      case "paused":
        return t("dashboard.statusFilter.paused");
      case "completed":
        return t("dashboard.statusFilter.completed");
      case "archived":
        return t("dashboard.statusFilter.archived");
      default:
        return "";
    }
  };

  const getPeriodFilterText = (period: PeriodFilter) => {
    switch (period) {
      case "week":
        return t("dashboard.periodFilter.week");
      case "month":
        return t("dashboard.periodFilter.month");
      case "quarter":
        return t("dashboard.periodFilter.quarter");
      case "older":
        return t("dashboard.periodFilter.older");
      default:
        return "";
    }
  };

  const getPriorityFilterText = (priority: PriorityFilter) => {
    switch (priority) {
      case "urgent":
        return t("dashboard.priorityFilter.urgent");
      case "normal":
        return t("dashboard.priorityFilter.normal");
      default:
        return "";
    }
  };

  const getPriorityLevelText = (level: string) => {
    switch (level) {
      case "high":
        return t("dashboard.projectCard.high");
      case "medium":
        return t("dashboard.projectCard.medium");
      case "low":
        return t("dashboard.projectCard.low");
      default:
        return "";
    }
  };

  const getProjectActionStatus = (project: Project) => {
    // プロジェクトの状態に基づいてアクション状態を判定
    if (!project.analysis?.topInsights || project.analysis.topInsights.length === 0) {
      // 分析が未実施の場合
      if (project.status === "collecting") {
        return {
          type: "collecting",
          message: t("dashboard.actionStatus.collecting"),
          icon: "clock",
          color: "text-blue-600",
        };
      } else if (project.status === "processing") {
        return {
          type: "processing",
          message: t("dashboard.actionStatus.processing"),
          icon: "zap",
          color: "text-purple-600",
        };
      } else {
        return {
          type: "no-analysis",
          message: t("dashboard.actionStatus.noAnalysis"),
          icon: "clock",
          color: "text-gray-600",
        };
      }
    }

    // 分析済みの場合、アクション状況を確認
    const actionInfo = getProjectActionInfo(project);

    if (actionInfo.pendingCount > 0) {
      // 未完了のアクションがある場合
      return {
        type: "pending",
        message: t("dashboard.actionStatus.pendingActions").replace(
          "{count}",
          actionInfo.pendingCount.toString()
        ),
        icon: "alert",
        color: "text-orange-600",
      };
    } else if (actionInfo.hasAnyActions) {
      // アクションがあるがすべて完了している場合
      return {
        type: "completed",
        message: t("dashboard.actionStatus.actionCompleted"),
        icon: "check",
        color: "text-green-600",
      };
    } else {
      // アクションがまだ作成されていない場合（分析完了直後）
      return {
        type: "analysis-completed",
        message: t("dashboard.actionStatus.analysisCompleted"),
        icon: "brain",
        color: "text-purple-600",
      };
    }
  };

  const hasUrgentActions = (project: Project) => {
    return (project.priority?.level || project.priority) === "high";
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      {/* Header */}
      <ResponsiveHeader
        breadcrumbs={[{ label: t("breadcrumb.dashboard") }]}
        className="sticky top-0 z-10"
        onOpenPurposeSettings={handleOpenPurposeModal}
      />

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {/* Account Deletion Warning Banner */}
        {deletionStatus?.isDeleted && deletionStatus?.scheduledDeletionAt && (
          <div className="mb-6 p-4 bg-yellow-50 border-l-4 border-yellow-400 rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <AlertTriangle className="h-5 w-5 text-yellow-600 mr-3 shrink-0" />
                <div>
                  <p className="text-sm font-medium text-yellow-800">
                    {(() => {
                      const scheduledDate = new Date(deletionStatus.scheduledDeletionAt);
                      const now = new Date();
                      const daysRemaining = Math.ceil((scheduledDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
                      
                      if (language === 'ja') {
                        return `アカウント削除予定: あと${daysRemaining}日後に削除されます`;
                      } else {
                        return `Account Deletion Scheduled: ${daysRemaining} days remaining`;
                      }
                    })()}
                  </p>
                  <p className="text-xs text-yellow-700">
                    {language === 'ja' ? '削除予定日: ' : 'Deletion date: '}
                    {new Date(deletionStatus.scheduledDeletionAt).toLocaleDateString(
                      language === 'ja' ? 'ja-JP' : 'en-US',
                      { year: 'numeric', month: 'long', day: 'numeric' }
                    )}
                  </p>
                </div>
              </div>
              <button
                onClick={handleCancelDeletion}
                className="ml-4 text-sm font-medium text-yellow-600 hover:text-yellow-800 transition-colors bg-yellow-100 hover:bg-yellow-200 px-3 py-1 rounded"
              >
                {language === 'ja' ? 'キャンセル' : 'Cancel'}
              </button>
            </div>
          </div>
        )}

        {/* Purpose Settings Banner */}
        {!user?.purpose && !bannerDismissed && (
          <PurposeSettingsBanner
            onOpenPurposeSettings={handleOpenPurposeModal}
            onDismiss={handleDismissBanner}
          />
        )}

        {/* Smart Upgrade Banner - Best Practice Implementation */}
        {(() => {
          const allPlans = getAllPlans();
          const planDetails = allPlans ? {
            trial: {
              name: t('common.plans.trial'),
              maxProjects: allPlans.trial.limits.plan.maxProjects,
              duration: allPlans.trial.meta?.duration || TrialConfig.getTrialDurationDays()
            },
            pro: {
              name: t('common.plans.pro')
            },
            free: {
              maxProjects: allPlans.free.limits.plan.maxProjects
            }
          } : null;

          const upgradeContext = getUpgradeDisplayContext(
            user,
            projects.map(p => ({
              ...p,
              createdAt: p.createdAt instanceof Date ? p.createdAt.toISOString() : p.createdAt
            })),
            recentLimitHits,
            analysisCount,
            planDetails,
            t
          );
          
          // バナー解除チェック
          if (upgradeContext.dismissable && UpgradeBannerDismissalManager.isDismissed(upgradeContext.bannerType)) {
            return null;
          }
          
          if (!upgradeContext.showBanner) return null;
          
          const getBannerIcon = () => {
            switch (upgradeContext.bannerType) {
              case 'limit_reached': return <AlertTriangle className="h-5 w-5 mr-3 flex-shrink-0 text-red-300" />;
              case 'trial_ending': return <Clock className="h-5 w-5 mr-3 flex-shrink-0 text-yellow-300" />;
              case 'trial_start': return <Zap className="h-5 w-5 mr-3 flex-shrink-0" />;
              case 'value_demonstration': return <Crown className="h-5 w-5 mr-3 flex-shrink-0" />;
              case 'trial_active': return <Crown className="h-5 w-5 mr-3 flex-shrink-0" />;
              case 'project_limit_approaching': return <AlertTriangle className="h-5 w-5 mr-3 flex-shrink-0 text-yellow-300" />;
              case 'welcome_free': return <Zap className="h-5 w-5 mr-3 flex-shrink-0" />;
              case 'free_value_proposition': return <Crown className="h-5 w-5 mr-3 flex-shrink-0" />;
              case 'trial_progress': return <Activity className="h-5 w-5 mr-3 flex-shrink-0" />;
              case 'trial_value_demonstration': return <Crown className="h-5 w-5 mr-3 flex-shrink-0" />;
              case 'trial_ending_critical': return <Clock className="h-5 w-5 mr-3 flex-shrink-0 text-red-300" />;
              default: return <Zap className="h-5 w-5 mr-3 flex-shrink-0" />;
            }
          };
          
          const getBannerStyle = () => {
            switch (upgradeContext.bannerType) {
              case 'welcome_free':
                return "bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 text-blue-800";
              
              case 'free_value_proposition':
                return "bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 text-purple-800";
                
              case 'trial_progress':
                return "bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 text-green-800";
                
              case 'trial_value_demonstration':
                return "bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg";
                
              case 'trial_ending_critical':
                return "bg-gradient-to-r from-orange-500 to-red-500 text-white shadow-xl animate-pulse";
                
              case 'limit_reached':
                return "bg-gradient-to-r from-red-600 to-red-700 text-white shadow-xl border-2 border-red-300";
                
              case 'trial_ending':
                return "bg-gradient-to-r from-orange-500 to-red-500 text-white shadow-lg";
                
              case 'project_limit_approaching':
                return "bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-200 text-yellow-800";
                
              case 'value_demonstration':
                return "bg-gradient-to-r from-emerald-500 to-blue-600 text-white shadow-lg";
                
              case 'trial_start':
                return "bg-gradient-to-r from-blue-500 to-indigo-600 text-white";
                
              case 'trial_active':
                return "bg-gradient-to-r from-green-500 to-blue-600 text-white";
                
              default:
                return "bg-gradient-to-r from-blue-500 to-purple-600 text-white";
            }
          };
          
          const handleDismiss = () => {
            if (upgradeContext.dismissable) {
              UpgradeBannerDismissalManager.dismiss(upgradeContext.bannerType);
              // Force re-render by updating state
              setRecentLimitHits([...recentLimitHits]);
            }
          };
          
          const getBannerTitle = () => {
            const titleMap: Record<string, string> = {
              'limit_reached': t('dashboard.upgradeBanner.titles.limitReached'),
              'trial_ending': t('dashboard.upgradeBanner.titles.trialEnding'),
              'value_demonstration': t('dashboard.upgradeBanner.titles.valueDemonstration'),
              'trial_start': t('dashboard.upgradeBanner.titles.trialStart'),
              'project_limit_approaching': t('dashboard.upgradeBanner.titles.projectLimitApproaching'),
              'welcome_free': t('dashboard.upgradeBanner.titles.welcomeFree'),
              'free_value_proposition': t('dashboard.upgradeBanner.titles.freeValueProposition'),
              'trial_progress': t('dashboard.upgradeBanner.titles.trialProgress'),
              'trial_value_demonstration': t('dashboard.upgradeBanner.titles.trialValueDemonstration'),
              'trial_ending_critical': t('dashboard.upgradeBanner.titles.trialEndingCritical'),
              'trial_active': t('dashboard.upgradeBanner.titles.trialActive')
            };
            return titleMap[upgradeContext.bannerType] || t('dashboard.upgradeBanner.defaultTitle');
          };

          const handleUpgradeAction = () => {
            if (upgradeContext.bannerType === 'trial_start' || 
                upgradeContext.bannerType === 'project_limit_approaching' ||
                upgradeContext.bannerType === 'welcome_free' ||
                upgradeContext.bannerType === 'free_value_proposition') {
              setShowTrialConfirmDialog(true);
            } else if (upgradeContext.bannerType === 'trial_progress' ||
                       upgradeContext.bannerType === 'trial_value_demonstration' ||
                       upgradeContext.bannerType === 'trial_ending_critical' ||
                       upgradeContext.bannerType === 'trial_ending') {
              setShowUpgradePromotionDialog(true);
            } else {
              handleUpgradeClick();
            }
          };
          
          return (
            <div className={`${getBannerStyle()} p-4 rounded-lg mb-6 relative`}>
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
                <div className="flex items-center flex-1">
                  {getBannerIcon()}
                  <div className="flex-1">
                    <div className="font-semibold flex items-center gap-2">
                      {upgradeContext.bannerType === 'limit_reached' && '⚠️ '}
                      {upgradeContext.bannerType === 'trial_ending' && '⏰ '}
                      {upgradeContext.bannerType === 'value_demonstration' && '🎉 '}
                      {upgradeContext.bannerType === 'trial_start' && '🚀 '}
                      {upgradeContext.bannerType === 'trial_active' && '🚀 '}
                      {upgradeContext.bannerType === 'project_limit_approaching' && '📊 '}
                      {getBannerTitle()}
                    </div>
                    <div className="text-sm opacity-90 mt-1">
                      {upgradeContext.context}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={handleUpgradeAction}
                    className="bg-white text-blue-600 px-4 py-2 rounded-md font-medium hover:bg-gray-50 transition-colors flex-shrink-0"
                  >
                    {upgradeContext.ctaText}
                  </button>
                  {upgradeContext.dismissable && (
                    <button
                      onClick={handleDismiss}
                      className="text-white/70 hover:text-white transition-colors p-1"
                      title="24時間非表示にする"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })()}

        {/* Hero Section */}
        <div className="text-center mb-6 sm:mb-8">
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-3 sm:mb-4">
            {t("dashboard.heroSection.title")}
          </h2>
          <p className="text-base sm:text-lg text-gray-600 mb-6 sm:mb-8 px-4 sm:px-0">
            {t("dashboard.heroSection.subtitle")}
          </p>

          {/* Main Action Button */}
          <button
            onClick={() => navigate("/new-collection")}
            className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-8 sm:px-12 py-3 sm:py-4 rounded-xl hover:from-blue-700 hover:to-purple-700 transition-all duration-200 flex items-center mx-auto text-lg sm:text-xl font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-1"
          >
            <Plus className="h-5 w-5 sm:h-7 sm:w-7 mr-2 sm:mr-3" />
            {t("dashboard.heroSection.newProject")}
          </button>
        </div>

        {/* Practical Stats - Only show if there are projects */}
        {projects.length > 0 && (
          <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-4 sm:p-6 mb-6 sm:mb-8">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
              <div className="text-center">
                <div className="text-2xl sm:text-3xl font-bold text-blue-600">
                  {quickStats.totalProjects}
                </div>
                <div className="text-sm text-gray-600">
                  {t("dashboard.stats.totalProjects")}
                </div>
              </div>
              <div className="text-center">
                <div className="text-2xl sm:text-3xl font-bold text-green-600">
                  {quickStats.activeProjects}
                </div>
                <div className="text-sm text-gray-600">
                  {t("dashboard.stats.activeProjects")}
                </div>
              </div>
              <div className="text-center">
                <div className="text-2xl sm:text-3xl font-bold text-orange-600">
                  {quickStats.pendingActions}
                </div>
                <div className="text-sm text-gray-600">
                  {t("dashboard.stats.pendingActions")}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Project List */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4 sm:mb-6">
            <h3 className="text-lg sm:text-xl font-semibold text-gray-900">
              {t("dashboard.projectList.title")}
            </h3>

            {/* Search and Filter Controls */}
            {projects.length > 0 && (
              <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                {/* Search Box */}
                <div className="relative flex-1 sm:w-80">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder={t("dashboard.search.placeholder")}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-10 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm bg-white shadow-sm hover:border-gray-400 transition-colors"
                  />
                  {searchTerm && (
                    <button
                      onClick={() => setSearchTerm("")}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition-colors"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  )}
                </div>

                {/* Filter Toggle Button */}
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className={`flex items-center px-4 py-2.5 border rounded-lg transition-all duration-200 text-sm font-medium shadow-sm ${
                    showFilters ||
                    statusFilter !== "all" ||
                    periodFilter !== "all" ||
                    priorityFilter !== "all"
                      ? "bg-blue-50 border-blue-200 text-blue-700 shadow-md"
                      : "bg-white border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-gray-400"
                  }`}
                >
                  <Filter className="h-4 w-4 mr-2" />
                  {t("dashboard.search.filter")}
                  <ChevronDown
                    className={`h-4 w-4 ml-1 transition-transform duration-200 ${
                      showFilters ? "rotate-180" : ""
                    }`}
                  />
                </button>
              </div>
            )}
          </div>

          {projects.length > 0 ? (
            <div className="space-y-6">
              {/* Advanced Filters Panel */}
              {showFilters && (
                <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6 animate-slide-down">
                  <div className="mb-4">
                    <h4 className="text-base font-semibold text-gray-900 mb-1">
                      {t("dashboard.search.filterTitle")}
                    </h4>
                    <p className="text-sm text-gray-600">
                      {t("dashboard.search.filterDescription")}
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                    {/* Status Filter */}
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        <CheckCircle className="h-4 w-4 inline mr-1" />
                        {t("dashboard.statusFilter.label")}
                      </label>
                      <select
                        value={statusFilter}
                        onChange={(e) =>
                          setStatusFilter(e.target.value as StatusFilter)
                        }
                        className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm bg-white shadow-sm hover:border-gray-400 transition-colors"
                      >
                        <option value="all">
                          {t("dashboard.statusFilter.allStatuses")}
                        </option>
                        <option value="collecting">
                          {t("dashboard.statusFilter.collecting")}
                        </option>
                        <option value="paused">
                          {t("dashboard.statusFilter.paused")}
                        </option>
                        <option value="completed">
                          {t("dashboard.statusFilter.completed")}
                        </option>
                        <option value="archived">
                          {t("dashboard.statusFilter.archived")}
                        </option>
                      </select>
                    </div>

                    {/* Period Filter */}
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        <Calendar className="h-4 w-4 inline mr-1" />
                        {t("dashboard.periodFilter.label")}
                      </label>
                      <select
                        value={periodFilter}
                        onChange={(e) =>
                          setPeriodFilter(e.target.value as PeriodFilter)
                        }
                        className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm bg-white shadow-sm hover:border-gray-400 transition-colors"
                      >
                        <option value="all">
                          {t("dashboard.periodFilter.allPeriods")}
                        </option>
                        <option value="week">
                          {t("dashboard.periodFilter.week")}
                        </option>
                        <option value="month">
                          {t("dashboard.periodFilter.month")}
                        </option>
                        <option value="quarter">
                          {t("dashboard.periodFilter.quarter")}
                        </option>
                        <option value="older">
                          {t("dashboard.periodFilter.older")}
                        </option>
                      </select>
                    </div>

                    {/* Priority Filter */}
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        <Target className="h-4 w-4 inline mr-1" />
                        {t("dashboard.priorityFilter.label")}
                      </label>
                      <select
                        value={priorityFilter}
                        onChange={(e) =>
                          setPriorityFilter(e.target.value as PriorityFilter)
                        }
                        className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm bg-white shadow-sm hover:border-gray-400 transition-colors"
                      >
                        <option value="all">
                          {t("dashboard.priorityFilter.allPriorities")}
                        </option>
                        <option value="urgent">
                          {t("dashboard.priorityFilter.urgent")}
                        </option>
                        <option value="normal">
                          {t("dashboard.priorityFilter.normal")}
                        </option>
                      </select>
                    </div>
                  </div>

                  {/* Filter Actions */}
                  <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-200">
                    <div className="flex items-center text-sm text-gray-600">
                      <MessageSquare className="h-4 w-4 mr-1" />
                      {t("dashboard.search.resultsCount").replace(
                        "{count}",
                        sortedProjects.length.toString()
                      )}
                    </div>
                    <div className="flex gap-3">
                      <button
                        onClick={() => {
                          setStatusFilter("all");
                          setPeriodFilter("all");
                          setPriorityFilter("all");
                          setSearchTerm("");
                        }}
                        className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors font-medium"
                      >
                        {t("dashboard.search.clearAll")}
                      </button>
                      <button
                        onClick={() => setShowFilters(false)}
                        className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium shadow-sm"
                      >
                        {t("dashboard.search.applyAndClose")}
                      </button>
                    </div>
                  </div>
                </div>
              )}
              {/* Tab Navigation - Show if there are projects and no specific status filter */}
              {projects.length > 0 && statusFilter === "all" && (
                <div className="flex space-x-1 bg-gray-100 p-1.5 rounded-lg max-w-full sm:max-w-md shadow-sm">
                  <button
                    onClick={() => setActiveTab("active")}
                    className={`flex-1 py-2.5 px-3 sm:px-4 rounded-lg font-medium transition-all duration-200 text-sm sm:text-base ${
                      activeTab === "active"
                        ? "bg-white text-blue-600 shadow-md"
                        : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                    }`}
                  >
                    <MessageSquare className="h-4 w-4 inline mr-1 sm:mr-2" />
                    {t("dashboard.tabs.active")} ({activeCount})
                  </button>
                  <button
                    onClick={() => setActiveTab("completed")}
                    className={`flex-1 py-2.5 px-3 sm:px-4 rounded-lg font-medium transition-all duration-200 text-sm sm:text-base ${
                      activeTab === "completed"
                        ? "bg-white text-blue-600 shadow-md"
                        : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                    }`}
                  >
                    <CheckCircle className="h-4 w-4 inline mr-1 sm:mr-2" />
                    {t("dashboard.tabs.completed")} ({completedCount})
                  </button>
                </div>
              )}

              {/* Active Filters Summary */}
              {(searchTerm ||
                statusFilter !== "all" ||
                periodFilter !== "all" ||
                priorityFilter !== "all") && (
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 shadow-sm">
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="flex items-center">
                      <Filter className="h-4 w-4 text-blue-600 mr-2" />
                      <span className="text-sm text-blue-800 font-semibold">
                        {t("dashboard.search.activeFilters")}
                      </span>
                    </div>

                    {searchTerm && (
                      <span className="inline-flex items-center px-3 py-1.5 rounded-full text-xs bg-white text-blue-800 font-medium shadow-sm border border-blue-200">
                        <Search className="h-3 w-3 mr-1" />
                        {searchTerm}
                        <button
                          onClick={() => setSearchTerm("")}
                          className="ml-2 hover:text-blue-600 transition-colors"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    )}

                    {statusFilter !== "all" && (
                      <span className="inline-flex items-center px-3 py-1.5 rounded-full text-xs bg-white text-blue-800 font-medium shadow-sm border border-blue-200">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        {getStatusFilterText(statusFilter)}
                        <button
                          onClick={() => setStatusFilter("all")}
                          className="ml-2 hover:text-blue-600 transition-colors"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    )}

                    {periodFilter !== "all" && (
                      <span className="inline-flex items-center px-3 py-1.5 rounded-full text-xs bg-white text-blue-800 font-medium shadow-sm border border-blue-200">
                        <Calendar className="h-3 w-3 mr-1" />
                        {getPeriodFilterText(periodFilter)}
                        <button
                          onClick={() => setPeriodFilter("all")}
                          className="ml-2 hover:text-blue-600 transition-colors"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    )}

                    {priorityFilter !== "all" && (
                      <span className="inline-flex items-center px-3 py-1.5 rounded-full text-xs bg-white text-blue-800 font-medium shadow-sm border border-blue-200">
                        <Target className="h-3 w-3 mr-1" />
                        {getPriorityFilterText(priorityFilter)}
                        <button
                          onClick={() => setPriorityFilter("all")}
                          className="ml-2 hover:text-blue-600 transition-colors"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    )}

                    <span className="inline-flex items-center text-sm text-blue-700 font-medium bg-white px-3 py-1.5 rounded-full shadow-sm border border-blue-200">
                      <MessageSquare className="h-3 w-3 mr-1" />
                      {t("dashboard.search.displayCount").replace(
                        "{count}",
                        sortedProjects.length.toString()
                      )}
                    </span>
                  </div>
                </div>
              )}

              {/* Project Cards */}
              {sortedProjects.length > 0 ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6">
                  {sortedProjects.map((project) => {
                    const StatusIcon = getStatusIcon(project.status, project.isArchived);
                    const pendingActionsCount =
                      getProjectPendingActions(project);
                    const isUrgent = hasUrgentActions(project);
                    const priorityLevel =
                      typeof project.priority === 'object' 
                        ? project.priority?.level 
                        : project.priority;

                    // 優先度に応じたカードスタイルを定義
                    const getCardStyles = () => {
                      switch (priorityLevel) {
                        case "high":
                          return {
                            container:
                              "bg-gradient-to-br from-red-50 to-pink-50 border-red-200 shadow-lg hover:shadow-xl ring-1 ring-red-100",
                            header:
                              "bg-white/80 backdrop-blur-sm rounded-lg p-4 mb-4",
                            badge:
                              "absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-2 shadow-lg",
                            button:
                              "bg-gradient-to-r from-red-600 to-pink-600 hover:from-red-700 hover:to-pink-700",
                          };
                        case "medium":
                          return {
                            container:
                              "bg-gradient-to-br from-yellow-50 to-amber-50 border-yellow-200 shadow-lg hover:shadow-xl ring-1 ring-yellow-100",
                            header:
                              "bg-white/80 backdrop-blur-sm rounded-lg p-4 mb-4",
                            badge:
                              "absolute -top-2 -right-2 bg-yellow-500 text-white rounded-full p-2 shadow-lg",
                            button:
                              "bg-gradient-to-r from-yellow-600 to-amber-600 hover:from-yellow-700 hover:to-amber-700",
                          };
                        case "low":
                          return {
                            container:
                              "bg-gradient-to-br from-green-50 to-emerald-50 border-green-200 shadow-lg hover:shadow-xl ring-1 ring-green-100",
                            header:
                              "bg-white/80 backdrop-blur-sm rounded-lg p-4 mb-4",
                            badge:
                              "absolute -top-2 -right-2 bg-green-500 text-white rounded-full p-2 shadow-lg",
                            button:
                              "bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700",
                          };
                        default:
                          return {
                            container:
                              "bg-white border-gray-100 shadow-lg hover:shadow-xl",
                            header: "mb-4",
                            badge:
                              "absolute -top-2 -right-2 bg-gray-500 text-white rounded-full p-2 shadow-lg",
                            button:
                              "bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700",
                          };
                      }
                    };

                    const cardStyles = getCardStyles();

                    return (
                      <div
                        key={project.id}
                        className={`${cardStyles.container} rounded-xl p-5 sm:p-6 border transition-all duration-200 hover:-translate-y-1 relative flex flex-col h-full min-h-[380px]`}
                      >
                        {/* Priority Badge */}
                        {priorityLevel && (
                          <div className={cardStyles.badge}>
                            <Target className="h-3 w-3" />
                          </div>
                        )}

                        {/* Project Header - Fixed Height */}
                        <div className={`${cardStyles.header} flex-none`}>
                          <h4 className="font-bold text-gray-900 mb-2 text-lg leading-tight">
                            <span className="line-clamp-2">{project.name}</span>
                          </h4>

                          {/* プロジェクト説明文を追加（存在する場合） */}
                          {project.description && (
                            <p className="text-sm text-gray-600 mb-3 line-clamp-2 leading-relaxed">
                              {project.description}
                            </p>
                          )}

                          {/* Status and Tags Row - Fixed Height */}
                          <div className="flex flex-wrap items-center gap-2 mb-3 min-h-[28px]">
                            <span
                              className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold border ${getStatusColor(
                                project.status, project.isArchived
                              )} ${
                                project.status === "processing" && !project.isArchived
                                  ? "animate-pulse"
                                  : ""
                              }`}
                            >
                              {project.status === "processing" && !project.isArchived ? (
                                <div className="animate-spin rounded-full h-3 w-3 border-b border-purple-600 mr-2"></div>
                              ) : (
                                <StatusIcon className="h-3 w-3 mr-2" />
                              )}
                              {getStatusText(project.status, project.isArchived, project)}
                            </span>
                            {project.priority && (
                              <span
                                className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${
                                  priorityLevel === "high"
                                    ? "bg-red-100 text-red-800 border-red-200"
                                    : priorityLevel === "medium"
                                    ? "bg-yellow-100 text-yellow-800 border-yellow-200"
                                    : "bg-green-100 text-green-800 border-green-200"
                                }`}
                                title={
                                  project.priority?.reason
                                    ? `${t(
                                        "dashboard.projectCard.priority"
                                      )}: ${project.priority.reason}`
                                    : undefined
                                }
                              >
                                <Target className="h-3 w-3 mr-1" />
                                {priorityLevel && getPriorityLevelText(priorityLevel)}
                              </span>
                            )}
                            {isFormActive(project) && (
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800 border border-emerald-200">
                                <Globe className="h-3 w-3 mr-1" />
                                {t("dashboard.projectCard.public")}
                              </span>
                            )}
                          </div>

                          {/* Date - Fixed Height */}
                          <div className="flex items-center text-xs text-gray-500 h-4">
                            <Calendar className="h-3 w-3 mr-1" />
                            {t("dashboard.projectCard.created")}:{" "}
                            {project.createdAt.toLocaleDateString()}
                          </div>
                        </div>

                        {/* Project Stats Grid - Fixed Height */}
                        <div className="grid grid-cols-2 gap-3 mb-4 flex-none">
                          <div className="bg-white/70 backdrop-blur-sm rounded-lg p-3 text-center shadow-sm">
                            <div className="text-lg font-bold text-purple-600">
                              {project.opinionsCount}
                            </div>
                            <div className="text-xs text-gray-600">
                              {t("dashboard.projectCard.opinionsCount")}
                            </div>
                          </div>

                          <div className="bg-white/70 backdrop-blur-sm rounded-lg p-3 text-center shadow-sm">
                            <div className="text-lg font-bold text-indigo-600">
                              {(project.analysis && project.analysis.topInsights?.length > 0)
                                ? project.analysis.topInsights.length
                                : "—"}
                            </div>
                            <div className="text-xs text-gray-600">
                              {t("dashboard.projectCard.topicsCount")}
                            </div>
                          </div>
                        </div>

                        {/* Analysis and Actions Info - Flexible Height */}
                        <div className="space-y-2 mb-4 flex-grow">
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-gray-600">
                              {t("dashboard.projectCard.latestAnalysis")}
                            </span>
                            <span className="text-sm font-semibold text-blue-600">
                              {getLastAnalysisText(project)}
                            </span>
                          </div>

                          {/* このプロジェクトのアクション状況 */}
                          {(() => {
                            const actionStatus =
                              getProjectActionStatus(project);

                            if (actionStatus.type === "pending") {
                              return (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    navigate(`/projects/${project.id}/actions`);
                                  }}
                                  className={`w-full flex flex-col gap-1 p-2 rounded-lg border transition-colors min-h-[42px] ${
                                    isUrgent
                                      ? "bg-red-50 border-red-200 hover:bg-red-100"
                                      : "bg-orange-50 border-orange-200 hover:bg-orange-100"
                                  }`}
                                >
                                  <div className="flex justify-between items-center w-full">
                                    <div className="flex items-center">
                                      <Settings
                                        className={`h-3 w-3 mr-1 ${
                                          isUrgent
                                            ? "text-red-600"
                                            : "text-orange-600"
                                        }`}
                                      />
                                      <span
                                        className={`text-xs font-medium ${
                                          isUrgent
                                            ? "text-red-700"
                                            : "text-orange-700"
                                        }`}
                                      >
                                        {t(
                                          "dashboard.projectCard.actionManagement"
                                        )}
                                      </span>
                                    </div>
                                    <ArrowRight
                                      className={`h-3 w-3 ${
                                        isUrgent
                                          ? "text-red-600"
                                          : "text-orange-600"
                                      }`}
                                    />
                                  </div>
                                  <div className="flex justify-between items-center w-full text-xs">
                                    <span
                                      className={`${
                                        isUrgent
                                          ? "text-red-600"
                                          : "text-orange-600"
                                      }`}
                                    >
                                      {t(
                                        "dashboard.projectCard.actionProgress"
                                      )}
                                    </span>
                                    <span
                                      className={`font-bold ${
                                        isUrgent
                                          ? "text-red-700"
                                          : "text-orange-700"
                                      }`}
                                    >
                                      {t(
                                        "dashboard.projectCard.actionCount"
                                      ).replace(
                                        "{count}",
                                        pendingActionsCount.toString()
                                      )}
                                    </span>
                                  </div>
                                </button>
                              );
                            } else {
                              // その他の状態表示
                              const IconComponent =
                                actionStatus.icon === "check"
                                  ? CheckCircle
                                  : actionStatus.icon === "clock"
                                  ? Clock
                                  : actionStatus.icon === "zap"
                                  ? Zap
                                  : actionStatus.icon === "brain"
                                  ? Brain
                                  : AlertTriangle;

                              return (
                                <div className="flex justify-between items-center min-h-[36px] p-2 bg-gray-50 rounded-lg border border-gray-200">
                                  <div className="flex items-center">
                                    <IconComponent
                                      className={`h-3 w-3 mr-1 ${actionStatus.color}`}
                                    />
                                    <span className="text-xs text-gray-600">
                                      {actionStatus.message}
                                    </span>
                                  </div>
                                </div>
                              );
                            }
                          })()}
                        </div>

                        {/* Action Button - Fixed Position at Bottom */}
                        {project.status === "processing" ? (
                          <div className="space-y-2">
                            <button
                              onClick={() =>
                                navigate(`/projects/${project.id}/processing`)
                              }
                              className="w-full bg-purple-600 hover:bg-purple-700 text-white py-3 px-4 rounded-lg transition-all duration-200 text-sm font-semibold flex items-center justify-center shadow-md hover:shadow-lg"
                            >
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                              {t("dashboard.projectCard.checkAnalysisStatus")}
                            </button>
                            <button
                              onClick={() =>
                                navigate(`/projects/${project.id}`)
                              }
                              className="w-full bg-gray-600 hover:bg-gray-700 text-white py-2 px-4 rounded-lg transition-all duration-200 text-xs font-medium flex items-center justify-center"
                            >
                              {t("dashboard.projectCard.projectDetail")}
                              <ArrowRight className="h-3 w-3 ml-1" />
                            </button>
                          </div>
                        ) : project.isArchived ? (
                          <div className="space-y-2">
                            <button
                              onClick={async () => {
                                try {
                                  await restoreProject(project.id);
                                } catch {
                                  // Error restoring project
                                }
                              }}
                              className="w-full bg-green-600 hover:bg-green-700 text-white py-3 px-4 rounded-lg transition-all duration-200 text-sm font-semibold flex items-center justify-center shadow-md hover:shadow-lg"
                            >
                              <Archive className="h-4 w-4 mr-2" />
                              {t("dashboard.projectCard.restore")}
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => navigate(`/projects/${project.id}`)}
                            className={`w-full ${cardStyles.button} text-white py-3 px-4 rounded-lg transition-all duration-200 text-sm font-semibold flex items-center justify-center shadow-md hover:shadow-lg flex-none`}
                          >
                            {t("dashboard.projectCard.projectDetail")}
                            <ArrowRight className="h-4 w-4 ml-2" />
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-12 sm:py-16 bg-white rounded-xl shadow-lg border border-gray-100">
                  {searchTerm ||
                  statusFilter !== "all" ||
                  periodFilter !== "all" ||
                  priorityFilter !== "all" ? (
                    <>
                      <Search className="h-16 w-16 sm:h-20 sm:w-20 text-gray-300 mx-auto mb-4 sm:mb-6" />
                      <h3 className="text-lg sm:text-xl font-medium text-gray-900 mb-2 sm:mb-3">
                        {t("dashboard.empty.noMatchingProjects")}
                      </h3>
                      <p className="text-gray-600 text-base sm:text-lg px-4 sm:px-0 mb-4">
                        {t("dashboard.empty.noMatchingDescription")}
                      </p>
                      <button
                        onClick={() => {
                          setSearchTerm("");
                          setStatusFilter("all");
                          setPeriodFilter("all");
                          setPriorityFilter("all");
                        }}
                        className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                      >
                        {t("dashboard.empty.clearFilters")}
                      </button>
                    </>
                  ) : activeTab === "active" ? (
                    <>
                      <Users className="h-16 w-16 sm:h-20 sm:w-20 text-gray-300 mx-auto mb-4 sm:mb-6" />
                      <h3 className="text-lg sm:text-xl font-medium text-gray-900 mb-2 sm:mb-3">
                        {t("dashboard.empty.noActiveProjects")}
                      </h3>
                      <p className="text-gray-600 text-base sm:text-lg px-4 sm:px-0">
                        {t("dashboard.empty.noActiveDescription")}
                      </p>
                    </>
                  ) : (
                    <>
                      <CheckCircle className="h-16 w-16 sm:h-20 sm:w-20 text-gray-300 mx-auto mb-4 sm:mb-6" />
                      <h3 className="text-lg sm:text-xl font-medium text-gray-900 mb-2 sm:mb-3">
                        {t("dashboard.empty.noCompletedProjects")}
                      </h3>
                      <p className="text-gray-600 text-base sm:text-lg px-4 sm:px-0">
                        {t("dashboard.empty.noCompletedDescription")}
                      </p>
                    </>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-12 sm:py-16 bg-white rounded-xl shadow-lg border border-gray-100">
              <Brain className="h-16 w-16 sm:h-20 sm:w-20 text-gray-300 mx-auto mb-4 sm:mb-6" />
              <h3 className="text-lg sm:text-xl font-medium text-gray-900 mb-2 sm:mb-3">
                {t("dashboard.empty.noProjects")}
              </h3>
              <p className="text-gray-600 text-base sm:text-lg px-4 sm:px-0 mb-6">
                {t("dashboard.empty.noProjectsDescription")}
              </p>
              <button
                onClick={() => navigate("/new-collection")}
                className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-2 rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all duration-200 text-sm font-medium inline-flex items-center shadow-md hover:shadow-lg"
              >
                <Plus className="h-4 w-4 mr-2" />
                {t("dashboard.empty.createNewProject")}
              </button>
            </div>
          )}
        </div>

        {/* Action Management Dashboard - Always visible */}
        <div className="bg-gradient-to-r from-purple-50 to-indigo-50 rounded-xl border border-purple-200 p-4 sm:p-6 shadow-sm">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 p-3 bg-white rounded-lg shadow-sm">
                <Target className="h-6 w-6 text-purple-600" />
              </div>
              <div className="flex-1">
                <h4 className="text-base font-bold text-gray-900 mb-1">
                  {t("dashboard.actionManagement.title")}
                </h4>
                <p className="text-sm text-gray-600 mb-2">
                  {t("dashboard.actionManagement.description")}
                </p>
                <div className="flex flex-wrap gap-3 text-sm">
                  {quickStats.pendingActions > 0 ? (
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="flex items-center gap-1 text-purple-700 bg-purple-100 px-3 py-1 rounded-full">
                        <span className="font-semibold">
                          {quickStats.pendingActions}
                        </span>
                        <span>{t("dashboard.actionManagement.activeActions")}</span>
                      </div>
                      {(quickStats.unhandledActions !== undefined && quickStats.inProgressActions !== undefined) && (
                        <div className="text-gray-600 text-xs">
                          {t("dashboard.actionManagement.statusBreakdown")
                            .replace('{unhandled}', quickStats.unhandledActions.toString())
                            .replace('{inProgress}', quickStats.inProgressActions.toString())}
                        </div>
                      )}
                    </div>
                  ) : (
                    <span className="text-gray-500">
                      {t("dashboard.actionManagement.noActions")}
                    </span>
                  )}
                </div>
              </div>
            </div>
            <div className="flex justify-end">
              <button
                onClick={() => navigate("/actions")}
                className="flex items-center justify-center px-4 py-2.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-all duration-200 font-medium text-sm shadow-sm hover:shadow-md"
              >
                <Activity className="h-4 w-4 mr-2" />
                {t("dashboard.actionManagement.openGlobalManagement")}
                <ArrowRight className="h-4 w-4 ml-2" />
              </button>
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
        @keyframes slide-down {
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
          animation: fade-in 0.3s ease-in-out;
        }
        .animate-slide-down {
          animation: slide-down 0.3s ease-out;
        }
      `}</style>

      {/* 分析中インジケーター（Dashboard用） */}
      {runningAnalysis && (
        <div className="fixed bottom-4 right-4 bg-white rounded-lg shadow-lg border border-gray-200 p-4 max-w-sm z-40">
          <div className="flex items-center">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-600 mr-3"></div>
            <div>
              <div className="text-sm font-medium text-gray-900">
                {t("dashboard.analysisIndicator.title")}
              </div>
              <div className="text-xs text-gray-600">
                {runningAnalysis.projectName}
              </div>
            </div>
            <button
              onClick={() => navigate(`/projects/${runningAnalysis.projectId}`)}
              className="ml-3 text-purple-600 hover:text-purple-700 text-xs font-medium"
            >
              {t("dashboard.analysisIndicator.check")}
            </button>
          </div>

          {/* プログレスバー */}
          <div className="mt-3">
            <div className="w-full bg-gray-200 rounded-full h-1">
              <div
                className="bg-purple-600 h-1 rounded-full animate-pulse"
                style={{ width: "60%" }}
              ></div>
            </div>
          </div>
        </div>
      )}

      {/* User Purpose Modal */}
      <UserPurposeModal
        isOpen={showPurposeModal}
        onClose={() => setShowPurposeModal(false)}
      />


      {/* Trial Confirmation Dialog */}
      <LimitReachedDialog
        isOpen={showTrialConfirmDialog}
        onClose={() => setShowTrialConfirmDialog(false)}
        dialogType="trial-confirmation"
        onConfirm={handleConfirmTrialStart}
      />

      {/* Upgrade Promotion Dialog */}
      <LimitReachedDialog
        isOpen={showUpgradePromotionDialog}
        onClose={() => setShowUpgradePromotionDialog(false)}
        dialogType="upgrade-promotion"
        onUpgrade={handleUpgradeClick}
      />
    </div>
  );
}
