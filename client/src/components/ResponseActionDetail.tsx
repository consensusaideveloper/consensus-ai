import { useState, useEffect } from "react";
import {
  Calendar,
  Clock,
  AlertTriangle,
  CheckCircle,
  XCircle,
  MessageSquare,
  Send,
  Bookmark,
  BookmarkCheck,
  Flag,
  FileText,
  Plus,
  Settings,
  Target,
  X,
} from "lucide-react";
import { Priority, PriorityData } from "./PriorityModal";
import { PrioritySelector } from "./PrioritySelector";

// ActionDependency type definition
interface ActionDependency {
  id: string;
  actionId: string;
  dependsOnActionId: string;
  dependsOnDescription?: string;
  type: "prerequisite" | "blocking";
  status: "pending" | "satisfied" | "blocked";
}
import { getLocalizedPriorityText } from "../utils/priorityUtils";
import { useNavigate, useParams } from "react-router-dom";
import { useProjects } from "../hooks/useProjects";
import { useAuth } from "../hooks/useAuth";
import { useLanguage } from "../hooks/useLanguage";
import { InternationalDatePicker } from "./InternationalDatePicker";
import { useTopicStatus } from "../hooks/useTopicStatus";
import { ResponsiveHeader } from "./ResponsiveHeader";
import { UserPurposeModal } from "./UserPurposeModal";
import ActionStatusDialog from "./ActionStatusDialog";

type ActionStatus = "unhandled" | "in-progress" | "resolved" | "dismissed";

interface ActionLog {
  id: string;
  content: string;
  author: string;
  type: 'comment' | 'status_change' | 'priority_change' | 'dependency_change';
  metadata?: {
    oldValue?: string;
    newValue?: string;
    statusReason?: string;
  };
  createdAt: Date;
}

interface ActionLogWithTimestamp extends ActionLog {
  timestamp?: Date;
}

export function ResponseActionDetail() {
  const navigate = useNavigate();
  const { id, topicId, opinionId } = useParams<{
    id: string;
    topicId: string;
    opinionId: string;
  }>();
  const { getProject } = useProjects();
  const { user } = useAuth();
  const { t } = useLanguage();
  const { topics, updateTopicStatus } = useTopicStatus(id);

  // All state hooks must be declared before any conditional logic
  const [actionStatus, setActionStatus] = useState<ActionStatus>("unhandled");
  const [actionStatusReason, setActionStatusReason] = useState<string>("");
  const [actionStatusUpdatedAt, setActionStatusUpdatedAt] = useState<Date | undefined>(undefined);
  const [showFullStatusReason, setShowFullStatusReason] = useState(false);
  const [priorityData, setPriorityData] = useState<PriorityData>({ level: undefined });
  const [dueDate, setDueDate] = useState<string>("");
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [showFullPriorityReason, setShowFullPriorityReason] = useState(false);
  const [actionLogs, setActionLogs] = useState<ActionLogWithTimestamp[]>([]);
  const [newComment, setNewComment] = useState("");
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [notification, setNotification] = useState<string | null>(null);
  const [dependencies] = useState<ActionDependency[]>([]);
  const [showAddDependency, setShowAddDependency] = useState(false);
  const [selectedDependencyAction, setSelectedDependencyAction] = useState<string>("");
  const [dependencyStatus, setDependencyStatus] = useState<{
    canStart: boolean;
    blockedBy: ActionDependency[];
  }>({ canStart: true, blockedBy: [] });
  const [dependencyStatuses, setDependencyStatuses] = useState<Record<string, "pending" | "satisfied" | "blocked">>({});
  const [availableActions, setAvailableActions] = useState<Array<{
    id: string;
    projectId: string;
    opinionId: string;
    content: string;
    status: ActionStatus;
  }>>([]);
  const [showPurposeModal, setShowPurposeModal] = useState(false);
  // Opinionモデルのデータとアクション関連フィールドを取得するためのstate
  const [opinionData, setOpinionData] = useState<{ 
    id?: string; 
    content?: string; 
    submittedAt?: unknown; 
    isBookmarked?: boolean; 
    actionStatus?: ActionStatus;
    actionStatusReason?: string;
    actionStatusUpdatedAt?: string;
    priorityLevel?: 'high' | 'medium' | 'low';
    priorityReason?: string;
    priorityUpdatedAt?: string;
    dueDate?: string;
    actionLogs?: string; // JSON format
    [key: string]: unknown 
  } | null>(null);
  // ステータス変更ダイアログ関連
  const [showStatusDialog, setShowStatusDialog] = useState(false);
  const [pendingStatus, setPendingStatus] = useState<ActionStatus>("unhandled");
  const [dialogStatusReason, setDialogStatusReason] = useState<string>("");

  const project = id ? getProject(id) : null;

  // プロジェクトデータから対応する意見とトピックを取得
  const topic = project?.analysis?.topInsights?.find(
    (insight) => insight.id === topicId
  );

  // トピック内の意見から対応するレスポンスを検索
  let response: { id?: string; content?: string; submittedAt?: unknown; isBookmarked?: boolean; [key: string]: unknown } | null = null;
  if (topic?.opinions && Array.isArray(topic.opinions)) {
    response = topic.opinions.find((opinion) => opinion.id === opinionId) || null;
  }

  // 見つからない場合は全トピックから検索
  if (!response && project?.analysis?.topInsights) {
    for (const insight of project.analysis.topInsights) {
      if (insight.opinions && Array.isArray(insight.opinions)) {
        const found = insight.opinions.find(
          (opinion) => opinion.id === opinionId
        );
        if (found) {
          response = found as { id?: string; content?: string; submittedAt?: unknown; isBookmarked?: boolean; [key: string]: unknown };
          break;
        }
      }
    }
  }

  // responseオブジェクトのsubmittedAtを安全にDateオブジェクトに正規化
  if (
    response &&
    response.submittedAt &&
    !(response.submittedAt instanceof Date)
  ) {
    response = {
      ...response,
      submittedAt: new Date(response.submittedAt as string | number),
    };
  }

  // OpinionモデルのisBookmarkedフィールドを取得
  const [opinionFetchKey, setOpinionFetchKey] = useState('');
  
  useEffect(() => {
    // パラメータが変更されたときにAPIを呼び出す
    if (!user?.id || !id || !opinionId) return;
    
    const currentKey = `${user.id}-${id}-${opinionId}`;
    if (opinionFetchKey === currentKey) return; // 既に取得済み

    let isCancelled = false;

    const fetchOpinionData = async () => {
      try {
        const apiResponse = await fetch(`/api/db/projects/${id}/opinions/${opinionId}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'X-User-ID': user.id,
          },
        });

        if (!apiResponse.ok) {
          throw new Error(`意見データの取得に失敗しました: ${apiResponse.statusText}`);
        }

        const data = await apiResponse.json();
        
        if (isCancelled) return;

        setOpinionData(data);
        setOpinionFetchKey(currentKey);
      } catch (error) {
        if (isCancelled) return;
        
        console.error('[ResponseActionDetail] ❌ 意見データ取得エラー:', error);
        // フォールバック: 分析データから取得
        if (response) {
          setOpinionData({
            id: response.id,
            content: response.content,
            submittedAt: response.submittedAt,
            isBookmarked: response.isBookmarked || false,
          });
        }
        setOpinionFetchKey(currentKey);
      }
    };

    fetchOpinionData();

    return () => {
      isCancelled = true;
    };
    // opinionFetchKeyを依存配列に含めると無限ループが発生するため除外
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, id, opinionId, response]);

  // 初期化時にブックマーク状態とアクション関連データを設定
  useEffect(() => {
    if (opinionData?.isBookmarked !== undefined) {
      setIsBookmarked(opinionData.isBookmarked);
    } else if (response?.isBookmarked !== undefined) {
      // フォールバック: 分析データから取得
      setIsBookmarked(response.isBookmarked);
    }
    
    // アクション関連データの初期化
    if (opinionData?.actionStatus) {
      setActionStatus(opinionData.actionStatus);
    }
    if (opinionData?.actionStatusReason) {
      setActionStatusReason(opinionData.actionStatusReason);
    }
    if (opinionData?.actionStatusUpdatedAt) {
      setActionStatusUpdatedAt(new Date(opinionData.actionStatusUpdatedAt));
    }
    if (opinionData?.priorityLevel) {
      setPriorityData({
        level: opinionData.priorityLevel,
        reason: opinionData.priorityReason,
        updatedAt: opinionData.priorityUpdatedAt ? new Date(opinionData.priorityUpdatedAt) : undefined,
      });
    }
    if (opinionData?.dueDate) {
      setDueDate(opinionData.dueDate.split('T')[0]); // Date string to YYYY-MM-DD format
    }
    if (opinionData?.actionLogs) {
      try {
        const logs = JSON.parse(opinionData.actionLogs);
        if (Array.isArray(logs)) {
          setActionLogs(logs.map(log => ({
            ...log,
            timestamp: log.createdAt ? new Date(log.createdAt) : new Date()
          })));
        }
      } catch (error) {
        console.error('Failed to parse action logs:', error);
      }
    }
  }, [opinionData, response?.isBookmarked]);


  // Update dependency status when dependencies change
  useEffect(() => {
    const updateDependencyStatus = async () => {
      if (dependencies.length > 0) {
        const statuses: Record<string, "pending" | "satisfied" | "blocked"> = {};
        const blockedBy: ActionDependency[] = [];

        for (const dep of dependencies) {
          // Simplified dependency check - always return pending for now
          const status: "pending" | "satisfied" | "blocked" = "pending";
          statuses[dep.id] = status;
          if (status === "pending" || status === "blocked") {
            blockedBy.push(dep);
          }
        }

        setDependencyStatuses(statuses);
        setDependencyStatus({
          canStart: blockedBy.length === 0,
          blockedBy,
        });
      } else {
        setDependencyStatuses({});
        setDependencyStatus({ canStart: true, blockedBy: [] });
      }
    };

    updateDependencyStatus();
  }, [dependencies]);

  // Load available actions when dependency modal opens
  useEffect(() => {
    const getAvailableActions = async (): Promise<Array<{
      id: string;
      projectId: string;
      opinionId: string;
      content: string;
      status: ActionStatus;
    }>> => {
      return []; // Simplified for now
    };

    if (showAddDependency) {
      getAvailableActions().then(setAvailableActions);
    }
  }, [showAddDependency]);

  // プロジェクトまたは必要なデータが見つからない場合のエラーハンドリング
  if (!project || !response || !topicId) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center">
          <h2 className="text-xl font-bold text-gray-900 mb-4">
            {t("responseActionDetail.response.notFound")}
          </h2>
          <button
            onClick={() => navigate(-1)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            {t("responseActionDetail.backToTopic")}
          </button>
        </div>
      </div>
    );
  }

  // Action data - using Firebase+SQL integration


  // Get all available actions for dependency selection - currently disabled
  // const getAvailableActions = async (): Promise<
  //   Array<{
  //     id: string;
  //     projectId: string;
  //     projectName: string;
  //     topicId: string;
  //     topicTitle: string;
  //     opinionId: string;
  //     description: string;
  //     status: ActionStatus;
  //   }>
  // > => {
  //   // 依存関係機能は現在無効化されています
  //   return [];
  // };

  // Check if dependencies are satisfied - currently unused
  // const checkDependencyStatus = async (
  //   dep: ActionDependency
  // ): Promise<"pending" | "satisfied" | "blocked"> => {
  //   if (!actionService || !id) return "pending";

  //   try {
  //     // Firebase+SQLiteから依存アクションの情報を取得
  //     const dependentAction = await actionService.getActionByResponseId(
  //       id,
  //       dep.dependsOnResponseId
  //     );

  //     if (dependentAction) {
  //       const status = dependentAction.actionStatus;

  //       if (status === "resolved") return "satisfied";
  //       if (status === "dismissed") return "blocked";
  //       return "pending";
  //     }

  //     return "pending";
  //   } catch {
  //     // Failed to check dependency status
  //     return "pending";
  //   }
  // };

  // Add dependency - 依存関係機能は現在無効化されています
  const handleAddDependency = async () => {
    // 依存関係機能は現在のOpinionモデルでは対応していません
    showNotification("依存関係機能は現在利用できません");
    setShowAddDependency(false);
  };

  // Remove dependency - 依存関係機能は現在無効化されています
  const handleRemoveDependency = async () => {
    // 依存関係機能は現在のOpinionモデルでは対応していません
    showNotification("依存関係機能は現在利用できません");
  };


  if (!project || !topic || !response) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="text-center">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-4">
            {t("responseActionDetail.response.notFound")}
          </h2>
          <button
            onClick={() => navigate("/dashboard")}
            className="bg-blue-600 text-white px-4 sm:px-6 py-2 sm:py-3 rounded-lg hover:bg-blue-700 transition-colors text-sm sm:text-base"
          >
            {t("responseActionDetail.backToProject")}
          </button>
        </div>
      </div>
    );
  }

  const handleStatusChange = async (newStatus: ActionStatus) => {
    // 同じステータスへの変更の場合は何もしない
    if (actionStatus === newStatus || !user?.id || !id || !opinionId) {
      return;
    }

    // 「解決済み」「見送り」の場合はダイアログを表示
    if (newStatus === "resolved" || newStatus === "dismissed") {
      setPendingStatus(newStatus);
      setDialogStatusReason("");
      setShowStatusDialog(true);
      return;
    }

    // その他のステータス変更は直接実行
    await executeStatusChange(newStatus, "");
  };

  const executeStatusChange = async (newStatus: ActionStatus, reason: string) => {
    if (!user?.id || !id || !opinionId) {
      return;
    }

    const oldStatusText = getStatusText(actionStatus);
    const newStatusText = getStatusText(newStatus);
    const currentTime = new Date();

    try {
      setActionStatus(newStatus);
      
      // 理由がある場合はステータス理由と更新日時を設定
      if (reason && reason.trim()) {
        setActionStatusReason(reason);
        setActionStatusUpdatedAt(currentTime);
      } else if (newStatus !== "resolved" && newStatus !== "dismissed") {
        // 未対応や対応中に変更する場合は理由をクリア
        setActionStatusReason("");
        setActionStatusUpdatedAt(undefined);
      }

      // 新しいアクションログを作成
      const newLogs = [...actionLogs];
      
      // ステータス変更ログを追加（理由がある場合は改行して含める）
      const logContent = reason && reason.trim()
        ? t("responseActionDetail.logs.statusChanged")
            .replace("{oldStatus}", oldStatusText)
            .replace("{newStatus}", newStatusText) +
          `\n${t("responseActionDetail.logs.reasonPrefix")}${reason}`
        : t("responseActionDetail.logs.statusChanged")
            .replace("{oldStatus}", oldStatusText)
            .replace("{newStatus}", newStatusText);

      const statusLog: ActionLogWithTimestamp = {
        id: Date.now().toString(),
        content: logContent,
        author: user?.name || "Unknown User",
        createdAt: currentTime,
        timestamp: currentTime,
        type: "status_change",
        metadata: { 
          oldValue: oldStatusText, 
          newValue: newStatusText,
          statusReason: reason && reason.trim() ? reason : undefined
        },
      };
      newLogs.push(statusLog);

      // Opinion API を使用してアクションデータを更新
      const apiResponse = await fetch(`/api/db/projects/${id}/opinions/${opinionId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-User-ID': user.id,
        },
        body: JSON.stringify({
          actionStatus: newStatus,
          actionStatusReason: reason && reason.trim() ? reason : null,
          actionStatusUpdatedAt: reason && reason.trim() ? currentTime : null,
          actionLogs: JSON.stringify(newLogs),
        }),
      });

      if (!apiResponse.ok) {
        throw new Error(`ステータス更新に失敗しました: ${apiResponse.statusText}`);
      }

      // ローカル状態を更新
      setActionLogs(newLogs);

      // トピックステータスの自動更新（個別意見が「対応中」になった場合）
      if (newStatus === "in-progress") {
        await handleTopicAutoUpdate(newStatus);
      }

      showNotification(
        t("responseActionDetail.success.statusChangedTo").replace(
          "{status}",
          newStatusText
        )
      );
    } catch (error) {
      console.error('ステータス更新エラー:', error);
      // エラー時は元に戻す
      setActionStatus(actionStatus);
      setActionStatusReason(actionStatusReason);
      setActionStatusUpdatedAt(actionStatusUpdatedAt);
      showNotification(t("responseActionDetail.errors.statusUpdateFailed"));
    }
  };

  const handleStatusDialogConfirm = async (reason: string) => {
    await executeStatusChange(pendingStatus, reason);
    setShowStatusDialog(false);
    setPendingStatus("unhandled");
    setDialogStatusReason("");
  };

  const handlePriorityChange = async (newPriority: Priority | undefined) => {
    // 同じ優先度への変更の場合は何もしない
    if (priorityData.level === newPriority) {
      return;
    }

    if (!user?.id || !id || !opinionId) return;

    const oldPriorityText = getLocalizedPriorityText(priorityData.level, t);
    const newPriorityText = getLocalizedPriorityText(newPriority, t);

    try {
      const newPriorityData = {
        level: newPriority,
        updatedAt: newPriority ? new Date() : undefined,
        reason: newPriority ? priorityData.reason : undefined,
      };
      
      setPriorityData(newPriorityData);

      // 新しいアクションログを作成
      const newLogs = [...actionLogs];
      
      // 優先度が設定された場合（未対応→対応中への自動変更）
      let shouldUpdateStatus = false;
      if (newPriority && shouldAutoChangeToInProgress(actionStatus)) {
        const autoStatusLog: ActionLogWithTimestamp = {
          id: `auto-${Date.now()}`,
          content: t("responseActionDetail.logs.autoStatusChanged"),
          author: user?.name || "Unknown User",
          createdAt: new Date(),
          timestamp: new Date(),
          type: "status_change",
          metadata: { oldValue: t("responseActionDetail.status.unhandled"), newValue: t("responseActionDetail.status.inProgress") },
        };
        newLogs.push(autoStatusLog);
        setActionStatus("in-progress");
        shouldUpdateStatus = true;
      }
      
      // 優先度変更ログを追加
      const priorityLog: ActionLogWithTimestamp = {
        id: Date.now().toString(),
        content: t("responseActionDetail.logs.priorityChanged")
          .replace("{oldPriority}", oldPriorityText)
          .replace("{newPriority}", newPriorityText),
        author: user?.name || "Unknown User",
        createdAt: new Date(),
        timestamp: new Date(),
        type: "priority_change",
        metadata: { oldValue: oldPriorityText, newValue: newPriorityText },
      };
      newLogs.push(priorityLog);

      // Opinion API を使用して優先度データ（およびステータス）を更新
      const updateData: Record<string, unknown> = {
        priorityLevel: newPriority,
        priorityReason: newPriority && priorityData.reason ? priorityData.reason : undefined,
        priorityUpdatedAt: newPriority ? new Date() : undefined,
        actionLogs: JSON.stringify(newLogs),
      };
      
      // ステータスが自動変更された場合は含める
      if (shouldUpdateStatus) {
        updateData.actionStatus = "in-progress";
      }
      
      const apiResponse = await fetch(`/api/db/projects/${id}/opinions/${opinionId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-User-ID': user.id,
        },
        body: JSON.stringify(updateData),
      });

      if (!apiResponse.ok) {
        throw new Error(`優先度更新に失敗しました: ${apiResponse.statusText}`);
      }

      // ローカル状態を更新
      setActionLogs(newLogs);

      // 自動ステータス変更が発生した場合、トピックステータスも自動更新
      if (shouldUpdateStatus) {
        await handleTopicAutoUpdate("in-progress");
      }

      showNotification(
        t("responseActionDetail.success.priorityChangedTo").replace(
          "{priority}",
          newPriorityText
        )
      );
    } catch (error) {
      console.error('優先度更新エラー:', error);
      // エラー時は元の状態に戻す
      setPriorityData(priorityData);
      setActionStatus(actionStatus);
      setActionLogs(actionLogs);
      showNotification(t("responseActionDetail.errors.priorityUpdateFailed"));
    }
  };

  const handlePriorityDetailChange = async (
    level: Priority | undefined,
    reason?: string
  ) => {
    // 同じ優先度・理由への変更の場合は何もしない
    if (priorityData.level === level && priorityData.reason === reason) {
      return;
    }

    if (!user?.id || !id || !opinionId) return;

    const oldPriorityText = getLocalizedPriorityText(priorityData.level, t);
    const newPriorityText = getLocalizedPriorityText(level, t);
    const levelChanged = priorityData.level !== level;
    const reasonChanged = priorityData.reason !== reason;

    try {
      const newPriorityData = { level, reason, updatedAt: new Date() };
      setPriorityData(newPriorityData);

      // 新しいアクションログを作成
      const newLogs = [...actionLogs];
      
      // 優先度が設定された場合（未対応→対応中への自動変更）
      let shouldUpdateStatus = false;
      if (level && shouldAutoChangeToInProgress(actionStatus)) {
        const autoStatusLog: ActionLogWithTimestamp = {
          id: `auto-${Date.now()}`,
          content: t("responseActionDetail.logs.autoStatusChanged"),
          author: user?.name || "Unknown User",
          createdAt: new Date(),
          timestamp: new Date(),
          type: "status_change",
          metadata: { oldValue: t("responseActionDetail.status.unhandled"), newValue: t("responseActionDetail.status.inProgress") },
        };
        newLogs.push(autoStatusLog);
        setActionStatus("in-progress");
        shouldUpdateStatus = true;
      }

      // 優先度レベルが変更された場合のログを追加
      if (levelChanged) {
        const logContent = reason
          ? t("responseActionDetail.logs.priorityChanged")
              .replace("{oldPriority}", oldPriorityText)
              .replace("{newPriority}", newPriorityText) +
            `\n${t("responseActionDetail.ui.priorityReasonLogPrefix")}${reason}`
          : t("responseActionDetail.logs.priorityChanged")
              .replace("{oldPriority}", oldPriorityText)
              .replace("{newPriority}", newPriorityText);

        const priorityLog: ActionLogWithTimestamp = {
          id: Date.now().toString(),
          content: logContent,
          author: user?.name || "System",
          createdAt: new Date(),
          timestamp: new Date(),
          type: "priority_change",
          metadata: {
            oldValue: priorityData.level,
            newValue: level,
          },
        };
        newLogs.push(priorityLog);
      } else if (reasonChanged) {
        // 理由のみ変更された場合は対話履歴に記録
        const logContent = reason
          ? `${t("responseActionDetail.logs.priorityReasonUpdated")}\n${t(
              "responseActionDetail.ui.priorityReasonLogPrefix"
            )}${reason}`
          : t("responseActionDetail.logs.priorityReasonDeleted");

        const reasonLog: ActionLogWithTimestamp = {
          id: Date.now().toString(),
          content: logContent,
          author: user?.name || "System",
          createdAt: new Date(),
          timestamp: new Date(),
          type: "priority_change",
          metadata: {
            oldValue: priorityData.reason || "",
            newValue: reason || "",
          },
        };
        newLogs.push(reasonLog);
      }

      // Opinion API を使用して優先度データ（およびステータス）を更新
      const updateData: Record<string, unknown> = {
        priorityLevel: level,
        priorityReason: reason || undefined,
        priorityUpdatedAt: new Date(),
        actionLogs: JSON.stringify(newLogs),
      };
      
      // ステータスが自動変更された場合は含める
      if (shouldUpdateStatus) {
        updateData.actionStatus = "in-progress";
      }
      
      const apiResponse = await fetch(`/api/db/projects/${id}/opinions/${opinionId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-User-ID': user.id,
        },
        body: JSON.stringify(updateData),
      });

      if (!apiResponse.ok) {
        throw new Error(`優先度更新に失敗しました: ${apiResponse.statusText}`);
      }

      // ローカル状態を更新
      setActionLogs(newLogs);

      // 自動ステータス変更が発生した場合、トピックステータスも自動更新
      if (shouldUpdateStatus) {
        await handleTopicAutoUpdate("in-progress");
      }

      if (levelChanged) {
        showNotification(
          t("responseActionDetail.success.priorityChangedTo").replace(
            "{priority}",
            newPriorityText
          )
        );
      } else if (reasonChanged) {
        showNotification(
          t("responseActionDetail.success.priorityReasonUpdated")
        );
      }
    } catch (error) {
      console.error('優先度詳細更新エラー:', error);
      // エラー時は元の状態に戻す  
      setPriorityData(priorityData);
      setActionStatus(actionStatus);
      setActionLogs(actionLogs);
      showNotification(t("responseActionDetail.errors.priorityUpdateFailed"));
    }
  };

  const handleSubmitComment = async () => {
    if (
      !newComment.trim() ||
      isSubmittingComment ||
      !user?.id ||
      !id ||
      !opinionId
    )
      return;

    setIsSubmittingComment(true);

    try {
      // 新しいログエントリを作成
      const newLog: ActionLog = {
        id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        content: newComment,
        author: user?.name || "Unknown User",
        createdAt: new Date(),
        type: "comment",
      };

      // 既存のログを取得し、新しいログを追加
      const existingLogs = actionLogs || [];
      const updatedLogs = [...existingLogs, newLog];

      // Opinion APIを使用してactionLogsフィールドを更新
      const apiResponse = await fetch(`/api/db/projects/${id}/opinions/${opinionId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-User-ID': user.id,
        },
        body: JSON.stringify({
          actionLogs: JSON.stringify(updatedLogs),
        }),
      });

      if (!apiResponse.ok) {
        throw new Error(`コメント保存に失敗しました: ${apiResponse.statusText}`);
      }

      // ローカル状態を更新
      setActionLogs(updatedLogs);
      setNewComment("");
      showNotification(t("responseActionDetail.success.commentAdded"));
    } catch (error) {
      console.error('[ResponseActionDetail] ❌ コメント保存エラー:', error);
      showNotification(t("responseActionDetail.errors.savingComment"));
    } finally {
      setIsSubmittingComment(false);
    }
  };

  const toggleBookmark = async () => {
    if (!user?.id || !id || !opinionId) return;

    const newBookmarkState = !isBookmarked;

    try {
      // 統一API経由でOpinionのブックマーク状態を更新（ProjectOpinions.tsxと同じ処理）
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
      setIsBookmarked(newBookmarkState);

      showNotification(
        newBookmarkState
          ? t("responseActionDetail.success.bookmarkAdded")
          : t("responseActionDetail.success.bookmarkRemoved")
      );
    } catch (error) {
      console.error('ブックマーク更新エラー:', error);
      showNotification(t("responseActionDetail.errors.updatingAction") || "ブックマークの更新に失敗しました");
    }
  };

  // Due date change handler
  const handleDueDateChange = async (newDueDate: string) => {
    if (dueDate === newDueDate) return;

    if (!user?.id || !id || !opinionId) return;

    const oldDueDateText = dueDate
      ? new Date(dueDate).toLocaleDateString(t("responseActionDetail.ui.locale"))
      : t("responseActionDetail.form.none");
    const newDueDateText = newDueDate
      ? new Date(newDueDate).toLocaleDateString(
          t("responseActionDetail.ui.locale")
        )
      : t("responseActionDetail.form.none");

    try {
      setDueDate(newDueDate);

      // 新しいアクションログを作成
      const newLogs = [...actionLogs];
      
      // 期限が設定された場合（未対応→対応中への自動変更）
      let shouldUpdateStatus = false;
      if (newDueDate && shouldAutoChangeToInProgress(actionStatus)) {
        const autoStatusLog: ActionLogWithTimestamp = {
          id: `auto-${Date.now()}`,
          content: t("responseActionDetail.logs.autoStatusChanged"),
          author: user?.name || "Unknown User",
          createdAt: new Date(),
          timestamp: new Date(),
          type: "status_change",
          metadata: { oldValue: t("responseActionDetail.status.unhandled"), newValue: t("responseActionDetail.status.inProgress") },
        };
        newLogs.push(autoStatusLog);
        setActionStatus("in-progress");
        shouldUpdateStatus = true;
      }
      
      // 期限変更ログを追加
      const dueDateLog: ActionLogWithTimestamp = {
        id: Date.now().toString(),
        content: t("responseActionDetail.logs.dueDateChanged")
          .replace("{oldDate}", oldDueDateText)
          .replace("{newDate}", newDueDateText),
        author: user?.name || "Unknown User",
        createdAt: new Date(),
        timestamp: new Date(),
        type: "status_change",
        metadata: { oldValue: oldDueDateText, newValue: newDueDateText },
      };
      newLogs.push(dueDateLog);

      // Opinion APIを使用してdueDateフィールド（およびステータス）とactionLogsを更新
      const updateData: Record<string, unknown> = {
        dueDate: newDueDate ? new Date(newDueDate).toISOString() : null,
        actionLogs: JSON.stringify(newLogs),
      };
      
      // ステータスが自動変更された場合は含める
      if (shouldUpdateStatus) {
        updateData.actionStatus = "in-progress";
      }
      
      const apiResponse = await fetch(`/api/db/projects/${id}/opinions/${opinionId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-User-ID': user.id,
        },
        body: JSON.stringify(updateData),
      });

      if (!apiResponse.ok) {
        throw new Error(`期限日の更新に失敗しました: ${apiResponse.statusText}`);
      }

      // ローカル状態を更新
      setActionLogs(newLogs);

      // 自動ステータス変更が発生した場合、トピックステータスも自動更新
      if (shouldUpdateStatus) {
        await handleTopicAutoUpdate("in-progress");
      }

      showNotification(
        `${t("responseActionDetail.action.dueDate")}${t(
          "responseActionDetail.success.dueDateChanged"
        ).replace("{date}", newDueDateText)}`
      );
    } catch (error) {
      console.error('[ResponseActionDetail] ❌ 期限日更新エラー:', error);
      // エラー時は元に戻す
      setDueDate(dueDate);
      setActionStatus(actionStatus);
      setActionLogs(actionLogs);
      showNotification(t("responseActionDetail.errors.updatingAction"));
    }
  };

  // 自動ステータス変更の判定
  const shouldAutoChangeToInProgress = (currentStatus: ActionStatus): boolean => {
    return currentStatus === "unhandled";
  };

  // トピックステータスの自動更新
  const handleTopicAutoUpdate = async (newOpinionStatus: ActionStatus) => {
    if (!topicId || !topics || newOpinionStatus !== "in-progress") {
      return;
    }

    try {
      // 現在のトピック情報を取得
      const currentTopic = topics.find(t => t.id === topicId);
      if (!currentTopic || currentTopic.status !== "unhandled") {
        return; // トピックが見つからない、または既に未対応以外の場合は何もしない
      }

      // トピックステータスを「対応中」に自動更新
      await updateTopicStatus(
        topicId, 
        "in-progress", 
        undefined, 
        "個別意見への対応開始により自動更新"
      );

      console.log('[TopicAutoUpdate] ✅ トピックステータスを自動更新: unhandled → in-progress');
    } catch (error) {
      console.error('[TopicAutoUpdate] ❌ トピック自動更新エラー:', error);
      // エラーが発生してもメインの処理は継続（個別意見の更新は成功しているため）
    }
  };


  const showNotification = (message: string) => {
    setNotification(message);
    setTimeout(() => setNotification(null), 3000);
  };

  const handleOpenPurposeModal = () => {
    setShowPurposeModal(true);
  };

  // Get dependency status color and text
  const getDependencyStatusInfo = (depId: string) => {
    const status = dependencyStatuses[depId] || "pending";
    switch (status) {
      case "satisfied":
        return {
          color: "bg-green-100 text-green-800",
          text: t("responseActionDetail.status.completed"),
          icon: CheckCircle,
        };
      case "blocked":
        return {
          color: "bg-red-100 text-red-800",
          text: t("responseActionDetail.status.blocked"),
          icon: XCircle,
        };
      default:
        return {
          color: "bg-yellow-100 text-yellow-800",
          text: t("responseActionDetail.status.pending"),
          icon: Clock,
        };
    }
  };

  const getStatusColor = (status: ActionStatus) => {
    switch (status) {
      case "unhandled":
        return "bg-red-100 text-red-800";
      case "in-progress":
        return "bg-yellow-100 text-yellow-800";
      case "resolved":
        return "bg-green-100 text-green-800";
      case "dismissed":
        return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusIcon = (status: ActionStatus) => {
    switch (status) {
      case "unhandled":
        return AlertTriangle;
      case "in-progress":
        return Clock;
      case "resolved":
        return CheckCircle;
      case "dismissed":
        return XCircle;
    }
  };

  const getStatusText = (status: ActionStatus) => {
    switch (status) {
      case "unhandled":
        return t("responseActionDetail.status.unhandled");
      case "in-progress":
        return t("responseActionDetail.status.inProgress");
      case "resolved":
        return t("responseActionDetail.status.resolved");
      case "dismissed":
        return t("responseActionDetail.status.dismissed");
    }
  };


  const getSentimentText = (sentiment: "positive" | "negative" | "neutral") => {
    switch (sentiment) {
      case "positive":
        return t("responseActionDetail.sentiment.positive");
      case "negative":
        return t("responseActionDetail.sentiment.negative");
      case "neutral":
        return t("responseActionDetail.sentiment.neutral");
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

  const getLogIcon = (type: ActionLog["type"]) => {
    switch (type) {
      case "comment":
        return MessageSquare;
      case "status_change":
        return CheckCircle;
      case "priority_change":
        return Flag;
      case "dependency_change":
        return Target;
      default:
        return MessageSquare;
    }
  };

  const getLogColor = (type: ActionLog["type"]) => {
    switch (type) {
      case "comment":
        return "text-blue-600";
      case "status_change":
        return "text-green-600";
      case "priority_change":
        return "text-orange-600";
      case "dependency_change":
        return "text-purple-600";
      default:
        return "text-gray-600";
    }
  };

  const StatusIcon = getStatusIcon(actionStatus);

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
          { label: project?.name || "", path: `/projects/${id}` },
          {
            label: topic?.title || "",
            path: `/projects/${id}/topics/${topicId}`,
          },
          { label: t("responseActionDetail.title") },
        ]}
        onOpenPurposeSettings={handleOpenPurposeModal}
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {/* Mobile Layout - Action Management First */}
        <div className="lg:hidden space-y-6">
          {/* Mobile Action Management */}
          <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-4 sm:p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <Settings className="h-5 w-5 mr-2 text-blue-600" />
              {t("responseActionDetail.action.title")}
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t("responseActionDetail.action.status")}
                </label>
                <select
                  value={actionStatus}
                  onChange={(e) =>
                    handleStatusChange(e.target.value as ActionStatus)
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                >
                  <option value="unhandled">
                    {t("responseActionDetail.status.unhandled")}
                  </option>
                  <option value="in-progress">
                    {t("responseActionDetail.status.inProgress")}
                  </option>
                  <option value="resolved">
                    {t("responseActionDetail.status.resolved")}
                  </option>
                  <option value="dismissed">
                    {t("responseActionDetail.status.dismissed")}
                  </option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t("responseActionDetail.action.priority")}
                </label>
                <PrioritySelector
                  priority={priorityData}
                  onPriorityChange={handlePriorityChange}
                  onDetailedPriorityChange={handlePriorityDetailChange}
                  title={t(
                    "responseActionDetail.ui.prioritySettingTitle"
                  ).replace(
                    "{priority}",
                    t("responseActionDetail.action.priority")
                  )}
                  subtitle={t(
                    "responseActionDetail.ui.prioritySettingSubtitle"
                  ).replace(
                    "{priority}",
                    t("responseActionDetail.action.priority")
                  )}
                  allowNone={true}
                  size="md"
                  showReasonIcon={false}
                  fullWidth={true}
                />
              </div>

              {/* Topic Resolution Contribution */}
              <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                <h4 className="text-sm font-medium text-blue-900 mb-2 flex items-center">
                  <Target className="h-4 w-4 mr-2" />
                  {t("responseActionDetail.ui.topicResolutionContribution")}
                </h4>
                <p className="text-sm text-blue-800 mb-3">
                  {t("responseActionDetail.ui.topicResolutionQuestion")}
                </p>
                <div className="text-xs text-blue-700 leading-relaxed">
                  {t(
                    "responseActionDetail.ui.topicResolutionDescription"
                  ).replace(
                    "{priority}",
                    t("responseActionDetail.action.priority")
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t("responseActionDetail.action.dueDate")}
                </label>
                <InternationalDatePicker
                  selected={dueDate ? new Date(dueDate) : null}
                  onChange={(date) => {
                    const newValue = date ? date.toISOString().split('T')[0] : '';
                    setDueDate(newValue);
                    handleDueDateChange(newValue);
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                />
              </div>
            </div>

            {/* Status Reason Display - Mobile */}
            {actionStatusReason && (actionStatus === "resolved" || actionStatus === "dismissed") && (
              <div className={`mt-4 bg-gradient-to-r rounded-lg p-4 border shadow-sm ${
                actionStatus === "resolved"
                  ? "from-green-50 to-emerald-50 border-green-200"
                  : "from-red-50 to-rose-50 border-red-200"
              }`}>
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center border ${
                      actionStatus === "resolved"
                        ? "bg-green-100 border-green-200"
                        : "bg-red-100 border-red-200"
                    }`}>
                      {actionStatus === "resolved" ? (
                        <CheckCircle className="h-4 w-4 text-green-600" />
                      ) : (
                        <XCircle className="h-4 w-4 text-red-600" />
                      )}
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-3">
                      <h5 className={`text-sm font-semibold ${
                        actionStatus === "resolved" ? "text-green-900" : "text-red-900"
                      }`}>
                        {actionStatus === "resolved" 
                          ? t("responseActionDetail.ui.resolvedReasonTitle") 
                          : t("responseActionDetail.ui.dismissedReasonTitle")}
                      </h5>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        actionStatus === "resolved"
                          ? "bg-green-100 text-green-700"
                          : "bg-red-100 text-red-700"
                      }`}>
                        {getStatusText(actionStatus)}
                      </span>
                    </div>
                    <div className={`text-sm leading-relaxed break-words bg-white bg-opacity-70 rounded-md p-3 border ${
                      actionStatus === "resolved"
                        ? "text-green-800 border-green-100"
                        : "text-red-800 border-red-100"
                    }`}>
                      {actionStatusReason.length > 120 ? (
                        <>
                          <div
                            className={`${
                              !showFullStatusReason ? "line-clamp-3" : ""
                            }`}
                          >
                            {actionStatusReason}
                          </div>
                          <button
                            onClick={() =>
                              setShowFullStatusReason(!showFullStatusReason)
                            }
                            className={`mt-2 text-xs hover:underline font-medium ${
                              actionStatus === "resolved"
                                ? "text-green-600 hover:text-green-800"
                                : "text-red-600 hover:text-red-800"
                            }`}
                          >
                            {showFullStatusReason
                              ? t("responseActionDetail.ui.collapseText")
                              : t("responseActionDetail.ui.expandText")}
                          </button>
                        </>
                      ) : (
                        <div className="whitespace-pre-line">
                          {actionStatusReason}
                        </div>
                      )}
                    </div>
                    {actionStatusUpdatedAt && (
                      <div className={`mt-3 flex items-center gap-1 text-xs ${
                        actionStatus === "resolved" ? "text-green-600" : "text-red-600"
                      }`}>
                        <Clock className="h-3 w-3" />
                        {t("responseActionDetail.ui.updated")}
                        {actionStatusUpdatedAt.toLocaleString(
                          t("responseActionDetail.ui.locale")
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Priority Reason Display - Mobile */}
            {priorityData.reason && (
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-4 border border-blue-200 shadow-sm">
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0">
                    <div className="w-7 h-7 bg-blue-100 rounded-full flex items-center justify-center border border-blue-200">
                      <Target className="h-4 w-4 text-blue-600" />
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-3">
                      <h5 className="text-sm font-semibold text-blue-900">
                        {t("responseActionDetail.ui.priorityReasonTitle").replace(
                          "{priority}",
                          t("responseActionDetail.action.priority")
                        )}
                      </h5>
                      <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">
                        {t("responseActionDetail.ui.prioritySet")}
                      </span>
                    </div>
                    <div className="text-sm text-blue-800 leading-relaxed break-words bg-white bg-opacity-70 rounded-md p-3 border border-blue-100">
                      {priorityData.reason.length > 120 ? (
                        <>
                          <div
                            className={`${
                              !showFullPriorityReason ? "line-clamp-3" : ""
                            }`}
                          >
                            {priorityData.reason}
                          </div>
                          <button
                            onClick={() =>
                              setShowFullPriorityReason(!showFullPriorityReason)
                            }
                            className="mt-2 text-xs text-blue-600 hover:text-blue-800 underline font-medium"
                          >
                            {showFullPriorityReason
                              ? t("responseActionDetail.ui.collapseText")
                              : t("responseActionDetail.ui.expandText")}
                          </button>
                        </>
                      ) : (
                        <div className="whitespace-pre-line">
                          {priorityData.reason}
                        </div>
                      )}
                    </div>
                    {priorityData.updatedAt && (
                      <div className="mt-3 flex items-center gap-1 text-xs text-blue-600">
                        <Clock className="h-3 w-3" />
                        {t("responseActionDetail.ui.updated")}
                        {priorityData.updatedAt.toLocaleString(
                          t("responseActionDetail.ui.locale")
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Mobile Response Content */}
          <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-4 sm:p-6">
            <div className="flex items-center justify-between mb-4 sm:mb-6">
              <h3 className="text-lg sm:text-xl font-semibold text-gray-900 flex items-center">
                <MessageSquare className="h-5 w-5 sm:h-6 sm:w-6 mr-2 sm:mr-3 text-blue-600" />
                {t("responseActionDetail.response.content")}
              </h3>
              <div className="flex items-center gap-2 sm:gap-3">
                <span
                  className={`inline-flex items-center px-2 sm:px-3 py-1 rounded-full text-xs sm:text-sm font-medium ${getStatusColor(
                    actionStatus
                  )}`}
                >
                  <StatusIcon className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                  {getStatusText(actionStatus)}
                </span>
                <button
                  onClick={toggleBookmark}
                  className={`p-2 rounded-lg transition-colors ${
                    isBookmarked
                      ? "text-amber-600 bg-amber-50 hover:bg-amber-100"
                      : "text-gray-400 hover:text-amber-600 hover:bg-amber-50"
                  }`}
                  title={
                    isBookmarked
                      ? t("responseActionDetail.ui.removeBookmark")
                      : t("responseActionDetail.ui.addBookmark")
                  }
                >
                  {isBookmarked ? (
                    <BookmarkCheck className="h-4 w-4 sm:h-5 sm:w-5" />
                  ) : (
                    <Bookmark className="h-4 w-4 sm:h-5 sm:w-5" />
                  )}
                </button>
              </div>
            </div>

            <div className="flex flex-wrap items-center space-x-2 sm:space-x-3 mb-4 gap-y-2">
              <span
                className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getSentimentBadgeColor(
                  (response.sentiment as "positive" | "negative" | "neutral") || "neutral"
                )}`}
              >
                {getSentimentText((response.sentiment as "positive" | "negative" | "neutral") || "neutral")}
              </span>
              <div className="flex items-center text-xs sm:text-sm text-gray-500">
                <Calendar className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                {(response.submittedAt as Date).toLocaleString(
                  t("responseActionDetail.ui.locale")
                )}
              </div>
            </div>

            {/* Additional Info */}
            {dueDate && (
              <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600 mb-4">
                {dueDate && (
                  <div className="flex items-center">
                    <Calendar className="h-4 w-4 mr-1" />
                    {t("responseActionDetail.ui.dueDate")}
                    {new Date(dueDate).toLocaleDateString(
                      t("responseActionDetail.ui.locale")
                    )}
                  </div>
                )}
              </div>
            )}

            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-gray-800 leading-relaxed whitespace-pre-wrap text-sm sm:text-base">
                {response.content}
              </p>
            </div>
          </div>

          {/* Dependencies Management */}
          <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-4 sm:p-6">
            <div className="flex items-center justify-between mb-4 sm:mb-6">
              <h3 className="text-lg sm:text-xl font-semibold text-gray-900 flex items-center">
                <Target className="h-5 w-5 sm:h-6 sm:w-6 mr-2 sm:mr-3 text-purple-600" />
                {t("responseActionDetail.related.dependencies")}
              </h3>
              <button
                onClick={() => setShowAddDependency(true)}
                className="flex items-center px-3 py-1.5 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 transition-colors text-sm font-medium"
              >
                <Plus className="h-4 w-4 mr-1" />
                {t("responseActionDetail.ui.addDependency").replace(
                  "{dependencies}",
                  t("responseActionDetail.related.dependencies")
                )}
              </button>
            </div>

            {/* Dependency Status Warning */}
            {!dependencyStatus.canStart && actionStatus === "unhandled" && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
                  <div>
                    <h4 className="text-sm font-medium text-yellow-900 mb-1">
                      {t("responseActionDetail.status.blocked")}
                    </h4>
                    <p className="text-sm text-yellow-800">
                      {t("responseActionDetail.ui.dependencyBlocked")
                        .replace(
                          "{count}",
                          dependencyStatus.blockedBy.length.toString()
                        )
                        .replace(
                          "{dependencies}",
                          t("responseActionDetail.related.dependencies")
                        )}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Dependencies List */}
            {dependencies.length > 0 ? (
              <div className="space-y-3">
                {dependencies.map((dep) => {
                  const statusInfo = getDependencyStatusInfo(dep.id);
                  const StatusIcon = statusInfo.icon;

                  return (
                    <div
                      key={dep.id}
                      className="border border-gray-200 rounded-lg p-4"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <span
                              className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${statusInfo.color}`}
                            >
                              <StatusIcon className="h-3 w-3 mr-1" />
                              {statusInfo.text}
                            </span>
                          </div>
                          <p className="text-sm text-gray-800 mb-2">
                            {dep.dependsOnDescription}
                          </p>
                          <div className="text-xs text-gray-500">
                            {t("activeActions.actions.project")}: {project.name}{" "}
                            / {t("activeActions.actions.topic")}: {topic.title}
                          </div>
                        </div>
                        <button
                          onClick={() => handleRemoveDependency()}
                          className="p-1 text-gray-400 hover:text-red-600 rounded-lg transition-colors"
                          title={t(
                            "responseActionDetail.ui.removeDependency"
                          ).replace(
                            "{dependencies}",
                            t("responseActionDetail.related.dependencies")
                          )}
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-6 text-gray-500">
                <Target className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                <p className="text-sm">
                  {t("responseActionDetail.ui.noDependencies").replace(
                    "{dependencies}",
                    t("responseActionDetail.related.dependencies")
                  )}
                </p>
                <p className="text-xs mt-1">
                  {t("responseActionDetail.ui.noDependenciesDescription")}
                </p>
              </div>
            )}

            {/* Add Dependency Modal */}
            {showAddDependency && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                <div className="bg-white rounded-xl shadow-xl max-w-md w-full max-h-[80vh] overflow-y-auto">
                  <div className="p-6">
                    <div className="flex justify-between items-center mb-4">
                      <h4 className="text-lg font-semibold text-gray-900">
                        {t("responseActionDetail.ui.addDependencyModal")}
                      </h4>
                      <button
                        onClick={() => setShowAddDependency(false)}
                        className="p-1 text-gray-400 hover:text-gray-600 rounded-lg"
                      >
                        <X className="h-5 w-5" />
                      </button>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          {t("responseActionDetail.ui.selectDependentAction")}
                        </label>
                        <select
                          value={selectedDependencyAction}
                          onChange={(e) =>
                            setSelectedDependencyAction(e.target.value)
                          }
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm"
                        >
                          <option value="">
                            {t("responseActionDetail.ui.selectAction")}
                          </option>
                          {availableActions.map((action) => (
                            <option key={action.id} value={action.id}>
                              {action.content}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="text-xs text-gray-600 bg-gray-50 p-3 rounded-lg">
                        <p className="font-medium mb-1">
                          {t("responseActionDetail.ui.dependencyDescription")}
                        </p>
                        <p>
                          {t("responseActionDetail.ui.dependencyExplanation")}
                        </p>
                      </div>
                    </div>

                    <div className="flex gap-2 mt-6">
                      <button
                        onClick={handleAddDependency}
                        disabled={!selectedDependencyAction}
                        className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                          selectedDependencyAction
                            ? "bg-purple-600 text-white hover:bg-purple-700"
                            : "bg-gray-200 text-gray-500 cursor-not-allowed"
                        }`}
                      >
                        {t("responseActionDetail.ui.add")}
                      </button>
                      <button
                        onClick={() => setShowAddDependency(false)}
                        className="px-4 py-2 text-gray-600 hover:text-gray-800 text-sm font-medium"
                      >
                        {t("responseActionDetail.ui.cancel")}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Mobile Action Logs */}
          <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-4 sm:p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <FileText className="h-5 w-5 mr-2 text-blue-600" />
              {t("responseActionDetail.logs.title")}
            </h3>

            <div className="space-y-4 mb-6">
              {actionLogs.map((log) => {
                const LogIcon = getLogIcon(log.type);
                return (
                  <div key={log.id} className="flex items-start space-x-3">
                    <div
                      className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center bg-gray-100 ${getLogColor(
                        log.type
                      )}`}
                    >
                      <LogIcon className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2 mb-1">
                        <span className="text-sm font-medium text-gray-900">
                          {log.author}
                        </span>
                        <span className="text-xs text-gray-500">
                          {(log.timestamp || log.createdAt)?.toLocaleString(
                            t("responseActionDetail.ui.locale")
                          )}
                        </span>
                      </div>
                      <p className="text-sm text-gray-700 whitespace-pre-line">
                        {log.content}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* New Comment Form */}
            <div className="border-t pt-4">
              <h4 className="text-sm font-medium text-gray-700 mb-3">
                {t("responseActionDetail.ui.addNewComment")}
              </h4>
              <div className="space-y-3">
                <textarea
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder={
                    t("responseActionDetail.comments.addComment") + "..."
                  }
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                />
                <div className="flex justify-end">
                  <button
                    onClick={handleSubmitComment}
                    disabled={!newComment.trim() || isSubmittingComment}
                    className={`px-4 py-2 rounded-lg font-medium transition-colors text-sm flex items-center ${
                      newComment.trim() && !isSubmittingComment
                        ? "bg-blue-600 text-white hover:bg-blue-700"
                        : "bg-gray-200 text-gray-500 cursor-not-allowed"
                    }`}
                  >
                    {isSubmittingComment ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        {t("responseActionDetail.ui.submitting")}
                      </>
                    ) : (
                      <>
                        <Send className="h-4 w-4 mr-2" />
                        {t("responseActionDetail.ui.submitComment")}
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Desktop Layout */}
        <div className="hidden lg:grid lg:grid-cols-3 gap-6 sm:gap-8">
          {/* Left Column - Response Content & Action Log */}
          <div className="lg:col-span-2 space-y-6">
            {/* Response Content */}
            <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-4 sm:p-6">
              <div className="flex items-center justify-between mb-4 sm:mb-6">
                <h3 className="text-lg sm:text-xl font-semibold text-gray-900 flex items-center">
                  <MessageSquare className="h-5 w-5 sm:h-6 sm:w-6 mr-2 sm:mr-3 text-blue-600" />
                  {t("responseActionDetail.response.content")}
                </h3>
                <div className="flex items-center gap-2 sm:gap-3">
                  <span
                    className={`inline-flex items-center px-2 sm:px-3 py-1 rounded-full text-xs sm:text-sm font-medium ${getStatusColor(
                      actionStatus
                    )}`}
                  >
                    <StatusIcon className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                    {getStatusText(actionStatus)}
                  </span>
                  <button
                    onClick={toggleBookmark}
                    className={`p-2 rounded-lg transition-colors ${
                      isBookmarked
                        ? "text-amber-600 bg-amber-50 hover:bg-amber-100"
                        : "text-gray-400 hover:text-amber-600 hover:bg-amber-50"
                    }`}
                    title={
                      isBookmarked
                        ? t("responseActionDetail.ui.removeBookmark")
                        : t("responseActionDetail.ui.addBookmark")
                    }
                  >
                    {isBookmarked ? (
                      <BookmarkCheck className="h-4 w-4 sm:h-5 sm:w-5" />
                    ) : (
                      <Bookmark className="h-4 w-4 sm:h-5 sm:w-5" />
                    )}
                  </button>
                </div>
              </div>

              <div className="flex flex-wrap items-center space-x-2 sm:space-x-3 mb-4 gap-y-2">
                <span
                  className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getSentimentBadgeColor(
                    (response.sentiment as "positive" | "negative" | "neutral") || "neutral"
                  )}`}
                >
                  {getSentimentText((response.sentiment as "positive" | "negative" | "neutral") || "neutral")}
                </span>
                <div className="flex items-center text-xs sm:text-sm text-gray-500">
                  <Calendar className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                  {(response.submittedAt as Date).toLocaleString(
                    t("responseActionDetail.ui.locale")
                  )}
                </div>
              </div>

              {/* Additional Info */}
              {dueDate && (
                <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600 mb-4">
                  {dueDate && (
                    <div className="flex items-center">
                      <Calendar className="h-4 w-4 mr-1" />
                      {t("responseActionDetail.ui.dueDate")}
                      {new Date(dueDate).toLocaleDateString(
                        t("responseActionDetail.ui.locale")
                      )}
                    </div>
                  )}
                </div>
              )}

              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-gray-800 leading-relaxed whitespace-pre-wrap text-sm sm:text-base">
                  {response.content}
                </p>
              </div>
            </div>

            {/* Action Logs */}
            <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-4 sm:p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <FileText className="h-5 w-5 mr-2 text-blue-600" />
                {t("responseActionDetail.ui.actionHistory")}
              </h3>

              <div className="space-y-4 mb-6">
                {actionLogs.map((log) => {
                  const LogIcon = getLogIcon(log.type);
                  return (
                    <div key={log.id} className="flex items-start space-x-3">
                      <div
                        className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center bg-gray-100 ${getLogColor(
                          log.type
                        )}`}
                      >
                        <LogIcon className="h-4 w-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2 mb-1">
                          <span className="text-sm font-medium text-gray-900">
                            {log.author}
                          </span>
                          <span className="text-xs text-gray-500">
                            {(log.timestamp || log.createdAt)?.toLocaleString(
                              t("responseActionDetail.ui.locale")
                            )}
                          </span>
                        </div>
                        <p className="text-sm text-gray-700 whitespace-pre-line">
                          {log.content}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* New Comment Form */}
              <div className="border-t pt-4">
                <h4 className="text-sm font-medium text-gray-700 mb-3">
                  {t("responseActionDetail.ui.addNewComment")}
                </h4>
                <div className="space-y-3">
                  <textarea
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder={t(
                      "responseActionDetail.ui.commentPlaceholder"
                    )}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  />
                  <div className="flex justify-end">
                    <button
                      onClick={handleSubmitComment}
                      disabled={!newComment.trim() || isSubmittingComment}
                      className={`px-4 py-2 rounded-lg font-medium transition-colors text-sm flex items-center ${
                        newComment.trim() && !isSubmittingComment
                          ? "bg-blue-600 text-white hover:bg-blue-700"
                          : "bg-gray-200 text-gray-500 cursor-not-allowed"
                      }`}
                    >
                      {isSubmittingComment ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          {t("responseActionDetail.ui.submitting")}
                        </>
                      ) : (
                        <>
                          <Send className="h-4 w-4 mr-2" />
                          {t("responseActionDetail.ui.submitComment")}
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column - Action Management */}
          <div className="space-y-6">
            {/* Action Management */}
            <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-4 sm:p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <Settings className="h-5 w-5 mr-2 text-blue-600" />
                {t("responseActionDetail.ui.actionManagement")}
              </h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t("responseActionDetail.action.status")}
                  </label>
                  <select
                    value={actionStatus}
                    onChange={(e) =>
                      handleStatusChange(e.target.value as ActionStatus)
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  >
                    <option value="unhandled">
                      {t("responseActionDetail.status.unhandled")}
                    </option>
                    <option value="in-progress">
                      {t("responseActionDetail.status.inProgress")}
                    </option>
                    <option value="resolved">
                      {t("responseActionDetail.status.resolved")}
                    </option>
                    <option value="dismissed">
                      {t("responseActionDetail.status.dismissed")}
                    </option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t("responseActionDetail.action.priority")}
                  </label>
                  <PrioritySelector
                    priority={priorityData}
                    onPriorityChange={handlePriorityChange}
                    onDetailedPriorityChange={handlePriorityDetailChange}
                    title={t(
                      "responseActionDetail.ui.prioritySettingTitle"
                    ).replace(
                      "{priority}",
                      t("responseActionDetail.action.priority")
                    )}
                    subtitle={t(
                      "responseActionDetail.ui.prioritySettingSubtitle"
                    ).replace(
                      "{priority}",
                      t("responseActionDetail.action.priority")
                    )}
                    allowNone={true}
                    size="md"
                    showReasonIcon={false}
                    fullWidth={true}
                  />
                </div>

                {/* Topic Resolution Contribution - Edit Mode */}
                <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                  <h4 className="text-sm font-medium text-blue-900 mb-2 flex items-center">
                    <Target className="h-4 w-4 mr-2" />
                    {t("responseActionDetail.ui.topicResolutionContribution")}
                  </h4>
                  <p className="text-sm text-blue-800 mb-3">
                    {t("responseActionDetail.ui.topicResolutionQuestion")}
                  </p>
                  <div className="text-xs text-blue-700 leading-relaxed">
                    {t(
                      "responseActionDetail.ui.topicResolutionDescription"
                    ).replace(
                      "{priority}",
                      t("responseActionDetail.action.priority")
                    )}
                  </div>
                </div>

                {/* Status Reason Display - Desktop */}
                {actionStatusReason && (actionStatus === "resolved" || actionStatus === "dismissed") && (
                  <div className={`bg-gradient-to-r rounded-lg p-4 border shadow-sm ${
                    actionStatus === "resolved"
                      ? "from-green-50 to-emerald-50 border-green-200"
                      : "from-red-50 to-rose-50 border-red-200"
                  }`}>
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0">
                        <div className={`w-7 h-7 rounded-full flex items-center justify-center border ${
                          actionStatus === "resolved"
                            ? "bg-green-100 border-green-200"
                            : "bg-red-100 border-red-200"
                        }`}>
                          {actionStatus === "resolved" ? (
                            <CheckCircle className="h-4 w-4 text-green-600" />
                          ) : (
                            <XCircle className="h-4 w-4 text-red-600" />
                          )}
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-3">
                          <h5 className={`text-sm font-semibold ${
                            actionStatus === "resolved" ? "text-green-900" : "text-red-900"
                          }`}>
                            {actionStatus === "resolved" 
                              ? t("responseActionDetail.ui.resolvedReasonTitle") 
                              : t("responseActionDetail.ui.dismissedReasonTitle")}
                          </h5>
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                            actionStatus === "resolved"
                              ? "bg-green-100 text-green-700"
                              : "bg-red-100 text-red-700"
                          }`}>
                            {getStatusText(actionStatus)}
                          </span>
                        </div>
                        <div className={`text-sm leading-relaxed break-words bg-white bg-opacity-70 rounded-md p-3 border ${
                          actionStatus === "resolved"
                            ? "text-green-800 border-green-100"
                            : "text-red-800 border-red-100"
                        }`}>
                          {actionStatusReason.length > 120 ? (
                            <>
                              <div
                                className={`${
                                  !showFullStatusReason ? "line-clamp-3" : ""
                                }`}
                              >
                                {actionStatusReason}
                              </div>
                              <button
                                onClick={() =>
                                  setShowFullStatusReason(!showFullStatusReason)
                                }
                                className={`mt-2 text-xs hover:underline font-medium ${
                                  actionStatus === "resolved"
                                    ? "text-green-600 hover:text-green-800"
                                    : "text-red-600 hover:text-red-800"
                                }`}
                              >
                                {showFullStatusReason
                                  ? t("responseActionDetail.ui.collapseText")
                                  : t("responseActionDetail.ui.expandText")}
                              </button>
                            </>
                          ) : (
                            <div className="whitespace-pre-line">
                              {actionStatusReason}
                            </div>
                          )}
                        </div>
                        {actionStatusUpdatedAt && (
                          <div className={`mt-3 flex items-center gap-1 text-xs ${
                            actionStatus === "resolved" ? "text-green-600" : "text-red-600"
                          }`}>
                            <Clock className="h-3 w-3" />
                            {t("responseActionDetail.ui.updated")}
                            {actionStatusUpdatedAt.toLocaleString(
                              t("responseActionDetail.ui.locale")
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Priority Reason Display - チャット外の専用表示エリア */}
                {priorityData.reason && (
                  <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-4 border border-blue-200 shadow-sm">
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0">
                        <div className="w-7 h-7 bg-blue-100 rounded-full flex items-center justify-center border border-blue-200">
                          <Target className="h-4 w-4 text-blue-600" />
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-3">
                          <h5 className="text-sm font-semibold text-blue-900">
                            {t(
                              "responseActionDetail.ui.priorityReasonTitle"
                            ).replace(
                              "{priority}",
                              t("responseActionDetail.action.priority")
                            )}
                          </h5>
                          <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">
                            {t("responseActionDetail.ui.prioritySet")}
                          </span>
                        </div>
                        <div className="text-sm text-blue-800 leading-relaxed break-words bg-white bg-opacity-70 rounded-md p-3 border border-blue-100">
                          {priorityData.reason.length > 120 ? (
                            <>
                              <div
                                className={`${
                                  !showFullPriorityReason ? "line-clamp-3" : ""
                                }`}
                              >
                                {priorityData.reason}
                              </div>
                              <button
                                onClick={() =>
                                  setShowFullPriorityReason(
                                    !showFullPriorityReason
                                  )
                                }
                                className="mt-2 text-xs text-blue-600 hover:text-blue-800 underline font-medium"
                              >
                                {showFullPriorityReason
                                  ? t("responseActionDetail.ui.collapseText")
                                  : t("responseActionDetail.ui.expandText")}
                              </button>
                            </>
                          ) : (
                            <div className="whitespace-pre-line">
                              {priorityData.reason}
                            </div>
                          )}
                        </div>
                        {priorityData.updatedAt && (
                          <div className="mt-3 flex items-center gap-1 text-xs text-blue-600">
                            <Clock className="h-3 w-3" />
                            {t("responseActionDetail.ui.updated")}
                            {priorityData.updatedAt.toLocaleString(
                              t("responseActionDetail.ui.locale")
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t("responseActionDetail.action.dueDate")}
                  </label>
                  <InternationalDatePicker
                    selected={dueDate ? new Date(dueDate) : null}
                    onChange={(date) => {
                      const newValue = date ? date.toISOString().split('T')[0] : '';
                      setDueDate(newValue);
                      handleDueDateChange(newValue);
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  />
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
        .line-clamp-2 {
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
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

      {/* Status Dialog */}
      {(pendingStatus === "resolved" || pendingStatus === "dismissed") && (
        <ActionStatusDialog
          isOpen={showStatusDialog}
          onClose={() => setShowStatusDialog(false)}
          onConfirm={handleStatusDialogConfirm}
          status={pendingStatus}
          actionContent={response?.content || ""}
          initialReason={dialogStatusReason}
        />
      )}
    </div>
  );
}
