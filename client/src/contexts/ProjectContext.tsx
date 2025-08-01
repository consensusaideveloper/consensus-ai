import { push, ref, set, update } from "firebase/database";
import {
  createContext,
  ReactNode,
  useCallback,
  useEffect,
  useState,
} from "react";
import { useAuth } from "../hooks/useAuth";
import { database } from "../lib/firebase";
import { TopicStatus } from "../utils/topicStatus";

export interface Task {
  id: string;
  title: string;
  description: string;
  status: "pending" | "in-progress" | "completed";
  dueDate: Date;
  createdAt: Date;
}

export interface InsightData {
  id: string;
  title: string;
  description?: string;
  priority?: "low" | "medium" | "high";
  status?: "unhandled" | "in-progress" | "resolved";
  count?: number;
  opinions?: Array<{
    id: string;
    content: string;
    sentiment?: "positive" | "negative" | "neutral";
    isBookmarked?: boolean;
    topicId?: string;
    opinionId?: string;
  }>;
}

export interface TopicData {
  id: string;
  title?: string;
  name?: string;
  description?: string;
  count?: number;
  status?: TopicStatus;
  keywords?: string[];
  sentiment?: {
    positive: number;
    negative: number;
    neutral: number;
  };
  priority?: {
    level: "low" | "medium" | "high";
    assignee?: string;
    reason?: string;
    updatedAt?: number;
  } | null;
  opinions?: Array<{
    id: string;
    content: string;
    sentiment?: "positive" | "negative" | "neutral";
    isBookmarked?: boolean;
    topicId?: string;
    opinionId?: string;
  }>;
}

export interface Project {
  id: string;
  name: string;
  description?: string;
  status:
    | "collecting"
    | "analyzing"
    | "processing"
    | "ready-for-analysis"
    | "in-progress"
    | "completed"
    | "paused"
    | "error";
  collectionMethod: "slack" | "webform";
  createdAt: Date;
  opinionsCount: number;
  unanalyzedOpinionsCount?: number; // 未分析意見数（backendから取得）
  isCompleted?: boolean;
  completedAt?: Date;
  isArchived?: boolean; // アーカイブフラグ
  archivedAt?: Date; // アーカイブ日時
  isAnalyzed?: boolean; // AI分析完了フラグ
  lastAnalysisAt?: Date | string; // 最終分析日時
  lastAnalyzedOpinionsCount?: number; // 最終分析時の意見数
  sqliteId?: string; // SQLiteのプロジェクトID
  priority?: {
    level: "low" | "medium" | "high";
    reason?: string;
    updatedAt?: Date;
    assignee?: string;
  };
  analysis?: {
    topInsights: Array<{
      id: string;
      title: string;
      count: number;
      description: string;
      status?: "unhandled" | "in-progress" | "resolved";
      keywords?: string[];
      sentiment?: {
        positive: number;
        negative: number;
        neutral: number;
      };
      priority?: {
        level: "low" | "medium" | "high";
        assignee?: string;
        reason?: string;
        updatedAt?: number;
      };
      opinions?: Array<{
        id: string;
        content: string;
        sentiment?: "positive" | "negative" | "neutral";
        isBookmarked?: boolean;
        topicId?: string;
        opinionId?: string;
      }>;
    }>;
    clusters?: Array<{
      id: number;
      name: string;
      count: number;
      percentage: number;
    }>;
    executedAt?: string;
    insights?: InsightData[];
    topics?: TopicData[];
    summary?: string;
    generatedAt?: string;
  };
  tasks?: Task[];
  config?: {
    slackChannel?: string;
    webformUrl?: string;
  };
}

interface ProjectContextType {
  projects: Project[];
  addProject: (project: Omit<Project, "id" | "createdAt">) => Promise<string>;
  updateProject: (id: string, updates: Partial<Project>) => Promise<void>;
  resetProjectPriority: (id: string) => Promise<void>;
  getProject: (id: string) => Project | undefined;
  completeProject: (id: string) => Promise<void>;
  deleteProject: (id: string) => Promise<void>;
  archiveProject: (id: string) => Promise<void>;
  restoreProject: (id: string) => Promise<void>;
  addTask: (
    projectId: string,
    task: Omit<Task, "id" | "createdAt">
  ) => Promise<void>;
  updateTask: (
    projectId: string,
    taskId: string,
    updates: Partial<Task>
  ) => Promise<void>;
  reloadProjects: () => Promise<void>;
  loading: boolean;
  error: string | null;
}

const ProjectContext = createContext<ProjectContextType | undefined>(undefined);

function ProjectProvider({ children }: { children: ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 動的カウント: 意見数はバックエンドAPI経由で動的に取得

  // CLAUDE.md要件: Firebase + SQLite両方のデータを取得するためバックエンドAPIを使用
  const loadProjects = useCallback(async () => {
    if (!user) {
      // 🔒 認証中はプロジェクトリストをクリアしない（データ保護）
      if (authLoading) {
        setLoading(true);
        return;
      }
      setProjects([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      // CLAUDE.md要件: バックエンドAPIからFirebase + SQLite統合データを取得
      const response = await fetch("/api/db/projects", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": user.id,
        },
      });

      if (!response.ok) {
        // プロジェクト一覧取得失敗
        throw new Error(
          `プロジェクト一覧の取得に失敗しました: ${response.statusText}`
        );
      }

      const projectsData = await response.json();

      // プロジェクトデータをProject型に変換
      const projectsList: Project[] = projectsData.map(
        (projectData: Record<string, unknown>) => ({
          ...projectData,
          createdAt: new Date(projectData.createdAt as string),
          completedAt: projectData.completedAt
            ? new Date(projectData.completedAt as string)
            : undefined,
          archivedAt: projectData.archivedAt
            ? new Date(projectData.archivedAt as string)
            : undefined,
          tasks: projectData.tasks || [],
        })
      );

      setProjects(projectsList);
      setError(null);
    } catch (err) {
      // プロジェクト読み込みエラー
      console.error("[ProjectContext] Load error:", err);
      setError("プロジェクトの読み込みに失敗しました");
    } finally {
      setLoading(false);
    }
  }, [user, authLoading]);

  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  // リアルタイム更新は Socket.IO または定期ポーリングで実装予定

  const addProject = async (
    projectData: Omit<Project, "id" | "createdAt">
  ): Promise<string> => {
    if (!user) throw new Error("User not authenticated");

    try {
      // バックエンドAPI経由で統一プロジェクト作成（重複作成を防止）
      const requestBody = {
        name: projectData.name,
        description: projectData.description || "",
        collectionMethod: projectData.collectionMethod || "webform",
      };

      // タイムアウト付きでリクエスト実行
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10秒タイムアウト

      const response = await fetch("/api/db/projects", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": user.id,
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        // プロジェクト作成失敗 - 詳細なエラー情報を取得
        try {
          const errorData = await response.json();
          const error = new Error(
            errorData.error ||
              errorData.message ||
              `プロジェクト作成に失敗しました: ${response.statusText}`
          );
          // エラーオブジェクトにAPIレスポンス情報を追加
          (error as any).response = {
            status: response.status,
            data: errorData,
          };
          throw error;
        } catch (parseError) {
          // parseErrorがErrorオブジェクトで、かつ既にresponseプロパティがある場合はそのまま投げる
          if (parseError instanceof Error && (parseError as any).response) {
            throw parseError;
          }
          // JSON解析に失敗した場合はシンプルなエラーを投げる
          throw new Error(
            `プロジェクト作成に失敗しました: ${response.statusText}`
          );
        }
      }

      const createdProject = await response.json();

      // ローカルprojects配列にも即座に追加（リアルタイム更新を待たない）
      const completeProject: Project = {
        ...createdProject,
        createdAt: new Date(createdProject.createdAt),
        completedAt: createdProject.completedAt
          ? new Date(createdProject.completedAt)
          : undefined,
        archivedAt: createdProject.archivedAt
          ? new Date(createdProject.archivedAt)
          : undefined,
        tasks: createdProject.tasks || [],
      };

      setProjects((prevProjects) => [...prevProjects, completeProject]);

      return createdProject.id;
    } catch (err) {
      // プロジェクト作成エラー
      setError("プロジェクトの作成に失敗しました");
      throw err;
    }
  };

  const updateProject = async (
    id: string,
    updates: Partial<Project>
  ): Promise<void> => {
    if (!user) throw new Error("User not authenticated");

    try {
      // CLAUDE.md要件: Firebase + SQLite両方を更新するため、バックエンドAPIを使用
      // PATCH method used to avoid requireActiveProject middleware for archived projects
      const response = await fetch(`/api/db/projects/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "X-User-ID": user.id,
        },
        body: JSON.stringify(updates),
      });

      if (!response.ok) {
        // プロジェクト更新失敗
        throw new Error(
          `プロジェクト更新に失敗しました: ${response.statusText}`
        );
      }

      const updatedProject = await response.json();

      // ローカルのprojects配列も更新
      setProjects((prevProjects) =>
        prevProjects.map((p) =>
          p.id === id
            ? {
                ...updatedProject,
                createdAt: new Date(updatedProject.createdAt),
                completedAt: updatedProject.completedAt
                  ? new Date(updatedProject.completedAt)
                  : undefined,
                archivedAt: updatedProject.archivedAt
                  ? new Date(updatedProject.archivedAt)
                  : undefined,
                tasks: updatedProject.tasks || [],
              }
            : p
        )
      );
    } catch (err) {
      // プロジェクト更新エラー
      setError("プロジェクトの更新に失敗しました");
      throw err;
    }
  };

  const resetProjectPriority = async (id: string): Promise<void> => {
    if (!user) throw new Error("User not authenticated");

    try {
      // バックエンドAPI を使用してFirebase + SQL 両方から優先度をリセット
      const response = await fetch(`/api/db/projects/${id}/priority`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          "X-User-ID": user.id,
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "優先度のリセットに失敗しました");
      }

      // ローカルstate から優先度を削除
      setProjects((prev) =>
        prev.map((project) =>
          project.id === id ? { ...project, priority: undefined } : project
        )
      );
    } catch (err) {
      // Error resetting project priority
      setError("優先度のリセットに失敗しました");
      throw err;
    }
  };

  const getProject = (id: string): Project | undefined => {
    return projects.find((project) => project.id === id);
  };

  const completeProject = async (id: string): Promise<void> => {
    await updateProject(id, {
      isCompleted: true,
      completedAt: new Date(),
      status: "completed",
    });
  };

  const deleteProject = async (id: string): Promise<void> => {
    if (!user) throw new Error("User not authenticated");

    try {
      // サーバー側の双方向同期削除機能を使用
      // プロジェクトIDを使用してFirebaseとSQLiteの両方から削除
      const response = await fetch(`/api/db/projects/${id}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          "X-User-ID": user.id,
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "プロジェクトの削除に失敗しました");
      }

      // ローカル状態を更新（削除されたプロジェクトを配列から除去）
      setProjects((prev) => prev.filter((project) => project.id !== id));

      // プロジェクト削除完了
    } catch (err) {
      // プロジェクト削除エラー
      setError("プロジェクトの削除に失敗しました");
      throw err;
    }
  };

  const archiveProject = async (id: string): Promise<void> => {
    if (!user) throw new Error("User not authenticated");

    try {
      const archiveData = {
        isArchived: true,
        archivedAt: new Date().toISOString(),
      };

      // SQLiteでアーカイブ（統一API経由）
      const response = await fetch(`/api/db/projects/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "X-User-ID": user.id,
        },
        body: JSON.stringify(archiveData),
      });

      if (!response.ok) {
        throw new Error("アーカイブ処理に失敗しました");
      }

      // ローカル状態を更新
      setProjects((prev) =>
        prev.map((project) =>
          project.id === id
            ? {
                ...project,
                isArchived: true,
                archivedAt: new Date(archiveData.archivedAt),
              }
            : project
        )
      );
    } catch (err) {
      // プロジェクトアーカイブエラー
      setError("プロジェクトのアーカイブに失敗しました");
      throw err;
    }
  };

  const restoreProject = async (id: string): Promise<void> => {
    if (!user) throw new Error("User not authenticated");

    try {
      const restoreData = {
        isArchived: false,
        archivedAt: null,
        status: "collecting", // 復元時は意見収集状態に戻す
      };

      // SQLiteで復元（統一API経由）
      const response = await fetch(`/api/db/projects/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "X-User-ID": user.id,
        },
        body: JSON.stringify(restoreData),
      });

      if (!response.ok) {
        throw new Error("復元処理に失敗しました");
      }

      const updatedProject = await response.json();

      // ローカル状態を更新（サーバーからの完全なプロジェクトデータで更新）
      setProjects((prev) =>
        prev.map((project) =>
          project.id === id
            ? {
                ...updatedProject,
                createdAt: new Date(updatedProject.createdAt),
                completedAt: updatedProject.completedAt
                  ? new Date(updatedProject.completedAt)
                  : undefined,
                archivedAt: updatedProject.archivedAt
                  ? new Date(updatedProject.archivedAt)
                  : undefined,
                tasks: updatedProject.tasks || [],
              }
            : project
        )
      );
    } catch (err) {
      // プロジェクト復元エラー
      setError("プロジェクトの復元に失敗しました");
      throw err;
    }
  };

  const addTask = async (
    projectId: string,
    task: Omit<Task, "id" | "createdAt">
  ): Promise<void> => {
    if (!user) throw new Error("User not authenticated");

    try {
      const tasksRef = ref(
        database,
        `users/${user.id}/projects/${projectId}/tasks`
      );
      const newTaskRef = push(tasksRef);

      const newTask = {
        ...task,
        createdAt: new Date().toISOString(),
        dueDate: task.dueDate.toISOString(),
      };

      await set(newTaskRef, newTask);
    } catch (err) {
      // Error adding task
      setError("タスクの作成に失敗しました");
      throw err;
    }
  };

  const updateTask = async (
    projectId: string,
    taskId: string,
    updates: Partial<Task>
  ): Promise<void> => {
    if (!user) throw new Error("User not authenticated");

    try {
      const taskRef = ref(
        database,
        `users/${user.id}/projects/${projectId}/tasks/${taskId}`
      );

      // Convert dates to ISO strings for Firebase
      const updatesWithDates = { ...updates };
      if (updatesWithDates.dueDate) {
        updatesWithDates.dueDate =
          updatesWithDates.dueDate.toISOString() as unknown as Date;
      }

      await update(taskRef, updatesWithDates);
    } catch (err) {
      // Error updating task
      setError("タスクの更新に失敗しました");
      throw err;
    }
  };

  const reloadProjects = async (): Promise<void> => {
    await loadProjects();
  };

  return (
    <ProjectContext.Provider
      value={{
        projects,
        addProject,
        updateProject,
        resetProjectPriority,
        getProject,
        completeProject,
        deleteProject,
        archiveProject,
        restoreProject,
        addTask,
        updateTask,
        reloadProjects,
        loading,
        error,
      }}
    >
      {children}
    </ProjectContext.Provider>
  );
}

export { ProjectContext, ProjectProvider };
