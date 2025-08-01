import { useState, useEffect, useCallback } from "react";
import {
  Clock,
  User,
  AlertTriangle,
  CheckCircle,
  Flag,
  FileText,
  Search,
  Filter,
  Calendar,
  Eye,
  X,
  Shield,
  TrendingUp,
} from "lucide-react";
import { AuditLog, AuditSummary, auditService } from "../services/auditService";
import { useSearchDebounce } from "../hooks/useDebounce";

interface AuditHistoryPanelProps {
  entityType?: "project" | "topic" | "response";
  entityId?: string;
  entityTitle?: string;
  isOpen: boolean;
  onClose: () => void;
}

export function AuditHistoryPanel({
  entityType,
  entityId,
  entityTitle,
  isOpen,
  onClose,
}: AuditHistoryPanelProps) {
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [auditSummary, setAuditSummary] = useState<AuditSummary | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const debouncedSearchTerm = useSearchDebounce(searchTerm, 300);
  const [actionFilter, setActionFilter] = useState<string>("all");
  const [userFilter, setUserFilter] = useState<string>("all");
  const [dateRange, setDateRange] = useState<{ start?: string; end?: string }>(
    {}
  );
  const [showSuspicious, setShowSuspicious] = useState(false);
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);

  const loadAuditData = useCallback(() => {
    const filters: Record<string, unknown> = {};

    if (entityType) filters.entityType = entityType;
    if (entityId) filters.entityId = entityId;
    if (actionFilter !== "all") filters.action = actionFilter;
    if (userFilter !== "all") filters.userId = userFilter;
    if (dateRange.start) filters.startDate = new Date(dateRange.start);
    if (dateRange.end) filters.endDate = new Date(dateRange.end);

    const logs = auditService.getAuditLogs(filters);
    const summary = auditService.generateAuditSummary(entityId, entityType);

    setAuditLogs(logs);
    setAuditSummary(summary);
  }, [entityType, entityId, actionFilter, userFilter, dateRange]);

  useEffect(() => {
    if (isOpen) {
      loadAuditData();
    }
  }, [isOpen, loadAuditData]);

  const getActionIcon = (action: string) => {
    switch (action) {
      case "status_change":
        return <CheckCircle className="h-4 w-4" />;
      case "priority_change":
        return <Flag className="h-4 w-4" />;
      case "assignment_change":
        return <User className="h-4 w-4" />;
      case "resolution_update":
        return <FileText className="h-4 w-4" />;
      case "project_completion":
        return <CheckCircle className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  const getActionText = (action: string) => {
    switch (action) {
      case "status_change":
        return "ステータス変更";
      case "priority_change":
        return "優先度変更";
      case "assignment_change":
        return "担当者変更";
      case "resolution_update":
        return "解決情報更新";
      case "project_completion":
        return "プロジェクト完了";
      default:
        return action;
    }
  };

  const getActionColor = (action: string) => {
    switch (action) {
      case "status_change":
        return "text-green-600 bg-green-50";
      case "priority_change":
        return "text-orange-600 bg-orange-50";
      case "assignment_change":
        return "text-blue-600 bg-blue-50";
      case "resolution_update":
        return "text-purple-600 bg-purple-50";
      case "project_completion":
        return "text-green-600 bg-green-50";
      default:
        return "text-gray-600 bg-gray-50";
    }
  };

  const formatChangeDescription = (log: AuditLog) => {
    switch (log.action) {
      case "status_change":
        return `${log.before?.status || "不明"} → ${
          log.after?.status || "不明"
        }`;
      case "priority_change":
        return `${(log.before?.priority as { level?: string })?.level || "未設定"} → ${
          (log.after?.priority as { level?: string })?.level || "未設定"
        }`;
      case "assignment_change":
        return `${log.before?.assignee || "未割当"} → ${
          log.after?.assignee || "未割当"
        }`;
      case "resolution_update":
        return "解決情報を更新";
      case "project_completion":
        return "プロジェクトを完了";
      default:
        return "変更を実行";
    }
  };

  const filteredLogs = auditLogs.filter((log) => {
    if (debouncedSearchTerm) {
      const searchLower = debouncedSearchTerm.toLowerCase();
      return (
        log.entityTitle.toLowerCase().includes(searchLower) ||
        log.userName.toLowerCase().includes(searchLower) ||
        log.reason?.toLowerCase().includes(searchLower)
      );
    }
    return true;
  });

  const displayLogs = showSuspicious
    ? auditSummary?.suspiciousActivity || []
    : filteredLogs;

  const uniqueUsers = [...new Set(auditLogs.map((log) => log.userName))];
  const uniqueActions = [...new Set(auditLogs.map((log) => log.action))];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-6xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <Shield className="h-6 w-6 text-blue-600" />
              <div>
                <h2 className="text-xl font-bold text-gray-900">
                  変更履歴・監査ログ
                </h2>
                <p className="text-sm text-gray-600">
                  {entityTitle
                    ? `${entityTitle} の変更履歴`
                    : "システム全体の変更履歴"}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 rounded-lg transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Summary Stats */}
          {auditSummary && (
            <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-4 mb-6 border border-blue-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-blue-600" />
                監査サマリー
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">
                    {auditSummary.totalChanges}
                  </div>
                  <div className="text-sm text-blue-700">総変更数</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {Object.keys(auditSummary.byUser).length}
                  </div>
                  <div className="text-sm text-green-700">関与ユーザー</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-orange-600">
                    {auditSummary.suspiciousActivity.length}
                  </div>
                  <div className="text-sm text-orange-700">要注意活動</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-600">
                    {auditSummary.recentActivity.length}
                  </div>
                  <div className="text-sm text-purple-700">最近の活動</div>
                </div>
              </div>
            </div>
          )}

          {/* Filters */}
          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Search */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Search className="h-4 w-4 inline mr-1" />
                  検索
                </label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="ユーザー名、エンティティ、理由で検索..."
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  />
                </div>
              </div>

              {/* Action Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Filter className="h-4 w-4 inline mr-1" />
                  アクション
                </label>
                <select
                  value={actionFilter}
                  onChange={(e) => setActionFilter(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                >
                  <option value="all">すべて</option>
                  {uniqueActions.map((action) => (
                    <option key={action} value={action}>
                      {getActionText(action)}
                    </option>
                  ))}
                </select>
              </div>

              {/* User Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <User className="h-4 w-4 inline mr-1" />
                  ユーザー
                </label>
                <select
                  value={userFilter}
                  onChange={(e) => setUserFilter(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                >
                  <option value="all">すべて</option>
                  {uniqueUsers.map((user) => (
                    <option key={user} value={user}>
                      {user}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="mt-4 flex items-center gap-4">
              <button
                onClick={() => setShowSuspicious(!showSuspicious)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  showSuspicious
                    ? "bg-orange-600 text-white hover:bg-orange-700"
                    : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                }`}
              >
                <AlertTriangle className="h-4 w-4 inline mr-1" />
                {showSuspicious ? "全履歴を表示" : "要注意活動のみ表示"}
              </button>

              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-gray-500" />
                <input
                  type="date"
                  value={dateRange.start || ""}
                  onChange={(e) =>
                    setDateRange((prev) => ({ ...prev, start: e.target.value }))
                  }
                  className="px-3 py-1 border border-gray-300 rounded text-sm"
                />
                <span className="text-gray-500">〜</span>
                <input
                  type="date"
                  value={dateRange.end || ""}
                  onChange={(e) =>
                    setDateRange((prev) => ({ ...prev, end: e.target.value }))
                  }
                  className="px-3 py-1 border border-gray-300 rounded text-sm"
                />
              </div>
            </div>
          </div>

          {/* Audit Log List */}
          <div className="space-y-3">
            {displayLogs.length === 0 ? (
              <div className="text-center py-12">
                <Shield className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  変更履歴がありません
                </h3>
                <p className="text-gray-600">
                  {showSuspicious
                    ? "要注意活動は検出されていません"
                    : "指定した条件に一致する変更履歴がありません"}
                </p>
              </div>
            ) : (
              displayLogs.map((log) => (
                <div
                  key={log.id}
                  className={`bg-white border rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer ${
                    auditSummary?.suspiciousActivity.some(
                      (s) => s.id === log.id
                    )
                      ? "border-orange-200 bg-orange-50"
                      : "border-gray-200"
                  }`}
                  onClick={() => setSelectedLog(log)}
                >
                  <div className="flex items-start gap-4">
                    <div
                      className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${getActionColor(
                        log.action
                      )}`}
                    >
                      {getActionIcon(log.action)}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-gray-900">
                          {log.userName}
                        </span>
                        <span className="text-sm text-gray-500">が</span>
                        <span className="text-sm font-medium text-blue-600">
                          {log.entityTitle}
                        </span>
                        <span className="text-sm text-gray-500">
                          の{getActionText(log.action)}を実行
                        </span>
                        {auditSummary?.suspiciousActivity.some(
                          (s) => s.id === log.id
                        ) && (
                          <div title="要注意活動">
                            <AlertTriangle
                              className="h-4 w-4 text-orange-500"
                            />
                          </div>
                        )}
                      </div>

                      <div className="text-sm text-gray-600 mb-2">
                        {formatChangeDescription(log)}
                      </div>

                      {log.reason && (
                        <div className="text-sm text-gray-700 bg-gray-100 rounded p-2 mb-2">
                          <strong>理由:</strong> {log.reason}
                        </div>
                      )}

                      <div className="flex items-center gap-4 text-xs text-gray-500">
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {log.timestamp.toLocaleString("ja-JP")}
                        </div>
                        {log.metadata?.automated && (
                          <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded-full">
                            自動実行
                          </span>
                        )}
                      </div>
                    </div>

                    <button
                      className="flex-shrink-0 p-1 text-gray-400 hover:text-gray-600 rounded"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedLog(log);
                      }}
                    >
                      <Eye className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Detail Modal */}
      {selectedLog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-60 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-gray-900">変更詳細</h3>
                <button
                  onClick={() => setSelectedLog(null)}
                  className="p-1 text-gray-400 hover:text-gray-600 rounded"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <label className="font-medium text-gray-700">実行者</label>
                    <p>{selectedLog.userName}</p>
                  </div>
                  <div>
                    <label className="font-medium text-gray-700">
                      実行日時
                    </label>
                    <p>{selectedLog.timestamp.toLocaleString("ja-JP")}</p>
                  </div>
                  <div>
                    <label className="font-medium text-gray-700">対象</label>
                    <p>{selectedLog.entityTitle}</p>
                  </div>
                  <div>
                    <label className="font-medium text-gray-700">
                      アクション
                    </label>
                    <p>{getActionText(selectedLog.action)}</p>
                  </div>
                </div>

                <div>
                  <label className="font-medium text-gray-700">変更内容</label>
                  <div className="mt-2 space-y-2">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-red-50 p-3 rounded border border-red-200">
                        <h4 className="font-medium text-red-800 mb-2">
                          変更前
                        </h4>
                        <pre className="text-sm text-red-700 whitespace-pre-wrap">
                          {JSON.stringify(selectedLog.before, null, 2)}
                        </pre>
                      </div>
                      <div className="bg-green-50 p-3 rounded border border-green-200">
                        <h4 className="font-medium text-green-800 mb-2">
                          変更後
                        </h4>
                        <pre className="text-sm text-green-700 whitespace-pre-wrap">
                          {JSON.stringify(selectedLog.after, null, 2)}
                        </pre>
                      </div>
                    </div>
                  </div>
                </div>

                {selectedLog.reason && (
                  <div>
                    <label className="font-medium text-gray-700">
                      変更理由
                    </label>
                    <p className="mt-1 text-gray-600">{selectedLog.reason}</p>
                  </div>
                )}

                {selectedLog.metadata && (
                  <div>
                    <label className="font-medium text-gray-700">
                      メタデータ
                    </label>
                    <pre className="mt-1 text-sm text-gray-600 bg-gray-50 p-3 rounded whitespace-pre-wrap">
                      {JSON.stringify(selectedLog.metadata, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
