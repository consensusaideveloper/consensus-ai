import { auth } from '../lib/firebase';

export interface DashboardStats {
  totalProjects: number;
  activeProjects: number;
  pendingActions: number;
  unhandledActions?: number;
  inProgressActions?: number;
}

export const dashboardService = {
  // ダッシュボード統計情報取得
  async getDashboardStats(): Promise<DashboardStats> {
    try {
      const user = auth.currentUser;
      if (!user) {
        throw new Error('User not authenticated');
      }

      const response = await fetch('/api/db/actions/dashboard-stats', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': user.uid,
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Dashboard stats fetch error:', error);
      // エラー時は0を返す
      return {
        totalProjects: 0,
        activeProjects: 0,
        pendingActions: 0,
      };
    }
  },

  // 特定プロジェクトの未対応アクション数取得
  async getPendingActionsCount(projectId: string): Promise<number> {
    try {
      const user = auth.currentUser;
      if (!user) {
        throw new Error('User not authenticated');
      }

      const response = await fetch(`/api/db/projects/${projectId}/actions/pending-count`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': user.uid,
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data.pendingCount;
    } catch (error) {
      console.error('Pending actions count fetch error:', error);
      return 0;
    }
  },
};