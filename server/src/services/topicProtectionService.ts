import { prisma } from '../lib/database';
import { logger } from '../utils/logger';

export interface TopicWithProtection {
  id: string;
  name: string;
  summary: string;
  status: string;
  count: number;
  isProtected: boolean;
  protectionReason?: string;
  hasActiveActions: boolean;
  lastActionDate?: Date | null;
  createdAt: Date;
  updatedAt: Date;
  opinions?: any[];
}

/**
 * トピック保護判定サービス
 * 改良版インクリメンタル分析でのトピック保護機能を提供
 */
export class TopicProtectionService {
  
  /**
   * 指定されたトピックに対してアクティブなアクションが存在するかチェック
   */
  async hasActiveActions(topicId: string): Promise<boolean> {
    try {
      console.log('[TopicProtection] 🔍 アクティブアクション確認開始:', topicId);
      
      // トピックに属する意見IDを取得
      const topicOpinions = await prisma.opinion.findMany({
        where: { topicId },
        select: { id: true }
      });
      
      if (topicOpinions.length === 0) {
        console.log('[TopicProtection] ℹ️ トピックに意見なし:', topicId);
        return false;
      }
      
      const opinionIds = topicOpinions.map(opinion => opinion.id);
      
      // アクティブなアクション（in-progress, resolved）の存在確認
      const activeActions = await prisma.opinion.count({
        where: {
          AND: [
            { id: { in: opinionIds } },
            { actionStatus: { in: ['in-progress', 'resolved'] } }
          ]
        }
      });
      
      const hasActive = activeActions > 0;
      console.log('[TopicProtection] 📊 アクティブアクション確認結果:', {
        topicId,
        opinionCount: opinionIds.length,
        activeActionCount: activeActions,
        hasActiveActions: hasActive
      });
      
      return hasActive;
      
    } catch (error) {
      console.error('[TopicProtection] ❌ アクティブアクション確認エラー:', error);
      // エラー時は安全側に倒して保護しない
      return false;
    }
  }
  
  /**
   * トピックが保護対象かどうかを判定
   */
  async isTopicProtected(topicId: string): Promise<boolean> {
    try {
      console.log('[TopicProtection] 🔍 トピック保護判定開始:', topicId);
      
      const topic = await prisma.topic.findUnique({
        where: { id: topicId }
      });
      
      if (!topic) {
        console.log('[TopicProtection] ⚠️ トピックが見つかりません:', topicId);
        return false;
      }
      
      // 保護判定の条件
      const statusProtected = topic.status !== 'UNHANDLED';
      const actionProtected = await this.hasActiveActions(topicId);
      
      const isProtected = statusProtected || actionProtected;
      
      console.log('[TopicProtection] 📊 保護判定結果:', {
        topicId,
        status: topic.status,
        statusProtected,
        actionProtected,
        isProtected
      });
      
      return isProtected;
      
    } catch (error) {
      console.error('[TopicProtection] ❌ トピック保護判定エラー:', error);
      // エラー時は安全側に倒して保護対象とする
      return true;
    }
  }
  
  /**
   * プロジェクトの全トピックに保護情報を付与して取得
   */
  async getTopicsWithProtectionStatus(projectId: string): Promise<TopicWithProtection[]> {
    try {
      console.log('[TopicProtection] 📊 保護状況付きトピック取得開始:', projectId);
      
      // 既存トピック取得
      let topics;
      if (projectId.startsWith('-')) {
        const project = await prisma.project.findFirst({
          where: { firebaseId: projectId },
          include: {
            topics: {
              include: {
                opinions: true
              }
            }
          }
        });
        topics = project?.topics || [];
      } else {
        topics = await prisma.topic.findMany({
          where: { projectId },
          include: {
            opinions: true
          }
        });
      }
      
      // 各トピックに保護情報を付与
      const topicsWithProtection: TopicWithProtection[] = [];
      
      for (const topic of topics) {
        const isProtected = await this.isTopicProtected(topic.id);
        const hasActiveActions = await this.hasActiveActions(topic.id);
        
        let protectionReason = '';
        if (topic.status !== 'UNHANDLED') {
          protectionReason = `ステータス: ${topic.status}`;
        }
        if (hasActiveActions) {
          protectionReason += protectionReason ? ', アクション管理済み' : 'アクション管理済み';
        }
        
        topicsWithProtection.push({
          ...topic,
          isProtected,
          protectionReason: protectionReason || undefined,
          hasActiveActions
        });
      }
      
      console.log('[TopicProtection] ✅ 保護状況付きトピック取得完了:', {
        projectId,
        totalTopics: topicsWithProtection.length,
        protectedTopics: topicsWithProtection.filter(t => t.isProtected).length
      });
      
      return topicsWithProtection;
      
    } catch (error) {
      logger.error('[TopicProtection] ❌ 保護状況付きトピック取得エラー:', error);
      throw error;
    }
  }
  
  /**
   * トピックの保護フラグを更新
   */
  async updateTopicProtectionFlags(topicId: string): Promise<void> {
    try {
      console.log('[TopicProtection] 🔄 保護フラグ更新開始:', topicId);
      
      const hasActiveActions = await this.hasActiveActions(topicId);
      const lastActionDate = hasActiveActions ? new Date() : null;
      
      await prisma.topic.update({
        where: { id: topicId },
        data: {
          hasActiveActions,
          lastActionDate,
          updatedAt: new Date()
        }
      });
      
      console.log('[TopicProtection] ✅ 保護フラグ更新完了:', {
        topicId,
        hasActiveActions,
        lastActionDate
      });
      
    } catch (error) {
      logger.error('[TopicProtection] ❌ 保護フラグ更新エラー:', error);
      throw error;
    }
  }

  /**
   * 保護理由を取得
   */
  getProtectionReason(topic: { status: string; hasActiveActions: boolean }): string | undefined {
    if (topic.status !== 'UNHANDLED') {
      return `ステータス: ${topic.status}`;
    } else if (topic.hasActiveActions) {
      return 'アクション管理済み';
    }
    return undefined;
  }
}