/**
 * ステータス変更履歴・監査サービス
 * 誰がいつどのステータスを変更したかを記録・追跡
 */

// Time constants
const MILLISECONDS_PER_HOUR = 60 * 60 * 1000;
const MILLISECONDS_PER_15_MINUTES = 15 * 60 * 1000;

export interface AuditLog {
  id: string;
  timestamp: Date;
  userId: string;
  userName: string;
  action:
    | "status_change"
    | "priority_change"
    | "assignment_change"
    | "resolution_update"
    | "project_completion";
  entityType: "project" | "topic" | "response";
  entityId: string;
  entityTitle: string;
  before: Record<string, unknown>;
  after: Record<string, unknown>;
  reason?: string;
  metadata?: {
    projectId?: string;
    topicId?: string;
    opinionId?: string;
    confidence?: number;
    automated?: boolean;
  };
}

export interface AuditSummary {
  totalChanges: number;
  byUser: Record<string, number>;
  byAction: Record<string, number>;
  byEntity: Record<string, number>;
  recentActivity: AuditLog[];
  suspiciousActivity: AuditLog[];
}

export interface ValidationRule {
  id: string;
  name: string;
  description: string;
  validate: (
    log: AuditLog,
    context: { allLogs: AuditLog[] }
  ) => {
    isValid: boolean;
    severity: "low" | "medium" | "high";
    message: string;
  };
}

class AuditService {
  private auditLogs: AuditLog[] = [];
  private validationRules: ValidationRule[] = [];

  constructor() {
    this.initializeValidationRules();
  }

  /**
   * ステータス変更を記録
   */
  async logStatusChange(
    userId: string,
    userName: string,
    entityType: AuditLog["entityType"],
    entityId: string,
    entityTitle: string,
    beforeStatus: string,
    afterStatus: string,
    reason?: string,
    metadata?: AuditLog["metadata"]
  ): Promise<string> {
    const auditLog: AuditLog = {
      id: this.generateId(),
      timestamp: new Date(),
      userId,
      userName,
      action: "status_change",
      entityType,
      entityId,
      entityTitle,
      before: { status: beforeStatus },
      after: { status: afterStatus },
      reason,
      metadata,
    };

    this.auditLogs.push(auditLog);

    // バリデーション実行
    await this.validateChange(auditLog);

    // 実際の実装ではFirebaseに保存

    return auditLog.id;
  }

  /**
   * 優先度変更を記録
   */
  async logPriorityChange(
    userId: string,
    userName: string,
    entityType: AuditLog["entityType"],
    entityId: string,
    entityTitle: string,
    beforePriority: string | number,
    afterPriority: string | number,
    reason?: string,
    metadata?: AuditLog["metadata"]
  ): Promise<string> {
    const auditLog: AuditLog = {
      id: this.generateId(),
      timestamp: new Date(),
      userId,
      userName,
      action: "priority_change",
      entityType,
      entityId,
      entityTitle,
      before: { priority: beforePriority },
      after: { priority: afterPriority },
      reason,
      metadata,
    };

    this.auditLogs.push(auditLog);
    await this.validateChange(auditLog);

    return auditLog.id;
  }

  /**
   * 担当者変更を記録
   */
  async logAssignmentChange(
    userId: string,
    userName: string,
    entityType: AuditLog["entityType"],
    entityId: string,
    entityTitle: string,
    beforeAssignee: string,
    afterAssignee: string,
    reason?: string,
    metadata?: AuditLog["metadata"]
  ): Promise<string> {
    const auditLog: AuditLog = {
      id: this.generateId(),
      timestamp: new Date(),
      userId,
      userName,
      action: "assignment_change",
      entityType,
      entityId,
      entityTitle,
      before: { assignee: beforeAssignee },
      after: { assignee: afterAssignee },
      reason,
      metadata,
    };

    this.auditLogs.push(auditLog);
    await this.validateChange(auditLog);

    return auditLog.id;
  }

  /**
   * 解決更新を記録
   */
  async logResolutionUpdate(
    userId: string,
    userName: string,
    entityId: string,
    entityTitle: string,
    resolutionData: Record<string, unknown>,
    reason?: string,
    metadata?: AuditLog["metadata"]
  ): Promise<string> {
    const auditLog: AuditLog = {
      id: this.generateId(),
      timestamp: new Date(),
      userId,
      userName,
      action: "resolution_update",
      entityType: "topic",
      entityId,
      entityTitle,
      before: {},
      after: { resolution: resolutionData },
      reason,
      metadata,
    };

    this.auditLogs.push(auditLog);
    await this.validateChange(auditLog);

    return auditLog.id;
  }

  /**
   * プロジェクト完了を記録
   */
  async logProjectCompletion(
    userId: string,
    userName: string,
    projectId: string,
    projectTitle: string,
    completionData: Record<string, unknown>,
    reason?: string
  ): Promise<string> {
    const auditLog: AuditLog = {
      id: this.generateId(),
      timestamp: new Date(),
      userId,
      userName,
      action: "project_completion",
      entityType: "project",
      entityId: projectId,
      entityTitle: projectTitle,
      before: { status: "in-progress" },
      after: { status: "completed", completion: completionData },
      reason,
      metadata: { projectId },
    };

    this.auditLogs.push(auditLog);
    await this.validateChange(auditLog);

    return auditLog.id;
  }

  /**
   * 監査ログを取得
   */
  getAuditLogs(filters?: {
    entityType?: AuditLog["entityType"];
    entityId?: string;
    userId?: string;
    action?: AuditLog["action"];
    startDate?: Date;
    endDate?: Date;
    limit?: number;
  }): AuditLog[] {
    let filteredLogs = [...this.auditLogs];

    if (filters) {
      if (filters.entityType) {
        filteredLogs = filteredLogs.filter(
          (log) => log.entityType === filters.entityType
        );
      }
      if (filters.entityId) {
        filteredLogs = filteredLogs.filter(
          (log) => log.entityId === filters.entityId
        );
      }
      if (filters.userId) {
        filteredLogs = filteredLogs.filter(
          (log) => log.userId === filters.userId
        );
      }
      if (filters.action) {
        filteredLogs = filteredLogs.filter(
          (log) => log.action === filters.action
        );
      }
      if (filters.startDate) {
        filteredLogs = filteredLogs.filter(
          (log) => log.timestamp >= filters.startDate!
        );
      }
      if (filters.endDate) {
        filteredLogs = filteredLogs.filter(
          (log) => log.timestamp <= filters.endDate!
        );
      }
    }

    // 最新順にソート
    filteredLogs.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    if (filters?.limit) {
      filteredLogs = filteredLogs.slice(0, filters.limit);
    }

    return filteredLogs;
  }

  /**
   * 監査サマリーを生成
   */
  generateAuditSummary(
    entityId?: string,
    entityType?: AuditLog["entityType"]
  ): AuditSummary {
    let logs = this.auditLogs;

    if (entityId && entityType) {
      logs = logs.filter(
        (log) => log.entityId === entityId && log.entityType === entityType
      );
    }

    const byUser: Record<string, number> = {};
    const byAction: Record<string, number> = {};
    const byEntity: Record<string, number> = {};

    logs.forEach((log) => {
      byUser[log.userName] = (byUser[log.userName] || 0) + 1;
      byAction[log.action] = (byAction[log.action] || 0) + 1;
      byEntity[log.entityType] = (byEntity[log.entityType] || 0) + 1;
    });

    const recentActivity = logs
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, 10);

    const suspiciousActivity = this.identifySuspiciousActivity(logs);

    return {
      totalChanges: logs.length,
      byUser,
      byAction,
      byEntity,
      recentActivity,
      suspiciousActivity,
    };
  }

  /**
   * 変更の妥当性をチェック
   */
  private async validateChange(log: AuditLog): Promise<void> {
    for (const rule of this.validationRules) {
      const result = rule.validate(log, { allLogs: this.auditLogs });

      if (!result.isValid) {
        // Validation warning logged

        if (result.severity === "high") {
          // 高リスクの場合は通知などの処理
          this.handleHighRiskActivity();
        }
      }
    }
  }

  /**
   * 疑わしい活動を特定
   */
  private identifySuspiciousActivity(logs: AuditLog[]): AuditLog[] {
    const suspicious: AuditLog[] = [];
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - MILLISECONDS_PER_HOUR);

    // 1時間以内の頻繁な変更
    const recentLogs = logs.filter((log) => log.timestamp >= oneHourAgo);
    const userActivity: Record<string, AuditLog[]> = {};

    recentLogs.forEach((log) => {
      if (!userActivity[log.userId]) {
        userActivity[log.userId] = [];
      }
      userActivity[log.userId].push(log);
    });

    // 1時間に10回以上の変更
    Object.values(userActivity).forEach((userLogs) => {
      if (userLogs.length >= 10) {
        suspicious.push(...userLogs);
      }
    });

    // 同じエンティティの短時間での繰り返し変更
    const entityChanges: Record<string, AuditLog[]> = {};
    recentLogs.forEach((log) => {
      const key = `${log.entityType}-${log.entityId}`;
      if (!entityChanges[key]) {
        entityChanges[key] = [];
      }
      entityChanges[key].push(log);
    });

    Object.values(entityChanges).forEach((entityLogs) => {
      if (entityLogs.length >= 5) {
        suspicious.push(...entityLogs);
      }
    });

    return [...new Set(suspicious)]; // 重複除去
  }

  /**
   * バリデーションルールを初期化
   */
  private initializeValidationRules(): void {
    this.validationRules = [
      {
        id: "frequent_changes",
        name: "頻繁な変更チェック",
        description: "短時間での頻繁な変更を検出",
        validate: (log, context) => {
          const recentLogs = context.allLogs.filter(
            (l: AuditLog) =>
              l.userId === log.userId &&
              l.timestamp > new Date(Date.now() - MILLISECONDS_PER_15_MINUTES) // 15分以内
          );

          if (recentLogs.length > 5) {
            return {
              isValid: false,
              severity: "medium" as const,
              message: `ユーザー ${log.userName} が15分間に${recentLogs.length}回の変更を実行`,
            };
          }

          return { isValid: true, severity: "low" as const, message: "" };
        },
      },
      {
        id: "status_regression",
        name: "ステータス逆行チェック",
        description: "完了済みから未完了への変更を検出",
        validate: (log) => {
          if (log.action === "status_change") {
            const before = log.before?.status as string;
            const after = log.after?.status as string;

            const completedStatuses = ["resolved", "dismissed", "completed"];
            const incompleteStatuses = ["unhandled", "in-progress"];

            if (
              completedStatuses.includes(before) &&
              incompleteStatuses.includes(after)
            ) {
              return {
                isValid: false,
                severity: "high" as const,
                message: `完了ステータス(${before})から未完了ステータス(${after})への変更`,
              };
            }
          }

          return { isValid: true, severity: "low" as const, message: "" };
        },
      },
      {
        id: "bulk_completion",
        name: "一括完了チェック",
        description: "短時間での大量完了を検出",
        validate: (log, context) => {
          if (
            log.action === "status_change" &&
            (log.after?.status === "resolved" ||
              log.after?.status === "completed")
          ) {
            const recentCompletions = context.allLogs.filter(
              (l: AuditLog) =>
                l.userId === log.userId &&
                l.action === "status_change" &&
                (l.after?.status === "resolved" ||
                  l.after?.status === "completed") &&
                l.timestamp > new Date(Date.now() - 30 * 60 * 1000) // 30分以内
            );

            if (recentCompletions.length > 10) {
              return {
                isValid: false,
                severity: "medium" as const,
                message: `30分間に${recentCompletions.length}件の完了処理を実行`,
              };
            }
          }

          return { isValid: true, severity: "low" as const, message: "" };
        },
      },
    ];
  }

  /**
   * 高リスク活動の処理
   */
  private handleHighRiskActivity(): void {
    // High risk activity detected - would notify admin in production
    // 実際の実装では管理者通知などを行う
  }

  /**
   * IDを生成
   */
  private generateId(): string {
    return `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 変更理由の必須チェック
   */
  isReasonRequired(
    action: AuditLog["action"],
    before: Record<string, unknown>,
    after: Record<string, unknown>
  ): boolean {
    // 重要な変更には理由を必須とする
    if (action === "status_change") {
      const completedStatuses = ["resolved", "dismissed", "completed"];
      const incompleteStatuses = ["unhandled", "in-progress"];

      // 完了から未完了への変更
      if (
        completedStatuses.includes(before?.status as string) &&
        incompleteStatuses.includes(after?.status as string)
      ) {
        return true;
      }

      // プロジェクト完了
      if (after?.status === "completed") {
        return true;
      }
    }

    // 優先度の大幅変更
    if (action === "priority_change") {
      const priorityLevels = { low: 1, medium: 2, high: 3 };
      const beforeLevel =
        priorityLevels[before?.level as keyof typeof priorityLevels] || 0;
      const afterLevel =
        priorityLevels[after?.level as keyof typeof priorityLevels] || 0;

      if (Math.abs(beforeLevel - afterLevel) >= 2) {
        return true;
      }
    }

    return false;
  }
}

export const auditService = new AuditService();
