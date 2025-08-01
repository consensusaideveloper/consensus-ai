import { useState, useEffect, useCallback } from 'react';
import { useAuth } from './useAuth';
import { TopicStatus, TopicData, normalizeTopicStatus } from '../utils/topicStatus';

export function useTopicStatus(projectId?: string) {
  const { user } = useAuth();
  const [topics, setTopics] = useState<TopicData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadTopics = useCallback(async () => {
    if (!user?.id || !projectId) {
      setTopics([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      
      const response = await fetch(`/api/topics/${projectId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': user.id,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch topics: ${response.statusText}`);
      }

      const data = await response.json();

      if (data.success && data.topics) {
        // Transform SQL API response to TopicData format
        const topicList: TopicData[] = data.topics.map((topic: {
          id: string;
          name: string;
          summary: string;
          count: number;
          status: string;
          statusReason?: string;
          statusUpdatedAt?: string;
          sentiment?: { positive: number; negative: number; neutral: number };
          keywords?: string[];
          priority?: string;
          createdAt: string;
          updatedAt: string;
        }) => ({
          id: topic.id,
          title: topic.name, // SQL API uses 'name' field
          description: topic.summary, // SQL API uses 'summary' field
          count: topic.count || 0,
          status: topic.status ? normalizeTopicStatus(topic.status) : 'unhandled',
          statusReason: topic.statusReason,
          statusUpdatedAt: topic.statusUpdatedAt ? new Date(topic.statusUpdatedAt).getTime() : undefined,
          createdAt: new Date(topic.createdAt).getTime(),
          updatedAt: new Date(topic.updatedAt).getTime(),
          sentiment: topic.sentiment,
          keywords: topic.keywords,
          priority: topic.priority && typeof topic.priority === 'object' ? {
            level: topic.priority.level as 'high' | 'medium' | 'low',
            reason: topic.priority.reason,
            updatedAt: topic.priority.updatedAt ? new Date(topic.priority.updatedAt).getTime() : undefined
          } : null
        }));

        setTopics(topicList);
      } else {
        // No topics found - this is normal for new projects
        setTopics([]);
      }
      
      setError(null);
    } catch (err) {
      console.error('[useTopicStatus] Load error:', err);
      setError('データの取得中にエラーが発生しました');
    } finally {
      setIsLoading(false);
    }
  }, [user?.id, projectId]);

  useEffect(() => {
    loadTopics();
  }, [loadTopics]);

  const updateTopicStatus = async (
    topicId: string, 
    newStatus: TopicStatus, 
    additionalData?: Partial<TopicData>,
    statusReason?: string
  ): Promise<void> => {
    if (!user?.id || !projectId) {
      throw new Error('ユーザーIDまたはプロジェクトIDが見つかりません');
    }

    try {
      
      const updateData: {
        status: TopicStatus;
        statusReason?: string;
        name?: string;
        summary?: string;
      } = {
        status: newStatus,
      };

      // Add statusReason if provided
      if (statusReason !== undefined) updateData.statusReason = statusReason;

      // Transform TopicData fields to SQL API fields if provided
      if (additionalData?.title) updateData.name = additionalData.title;
      if (additionalData?.description) updateData.summary = additionalData.description;

      const response = await fetch(`/api/topics/${topicId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': user.id,
        },
        body: JSON.stringify(updateData),
      });

      if (!response.ok) {
        throw new Error(`Failed to update topic: ${response.statusText}`);
      }

      // Reload topics to reflect changes
      await loadTopics();
    } catch (err) {
      console.error('[useTopicStatus] Update error:', err);
      throw new Error('更新に失敗しました');
    }
  };

  const updateTopicPriority = async (
    topicId: string,
    priority: TopicData['priority'] | null
  ): Promise<void> => {
    if (!user?.id || !projectId) {
      throw new Error('ユーザーIDまたはプロジェクトIDが見つかりません');
    }

    try {
      
      // Transform priority data to SQL API format
      const updateData: {
        priority?: {
          level: 'high' | 'medium' | 'low';
          reason?: string;
          updatedAt: string;
        } | null;
      } = {};
      
      if (priority === null) {
        // Remove priority - set to null
        updateData.priority = null;
      } else {
        // Set priority object (SQL API expects priority object)
        updateData.priority = {
          level: priority.level,
          reason: priority.reason || undefined,
          updatedAt: priority.updatedAt ? new Date(priority.updatedAt).toISOString() : new Date().toISOString()
        };
      }

      const response = await fetch(`/api/topics/${topicId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': user.id,
        },
        body: JSON.stringify(updateData),
      });

      if (!response.ok) {
        throw new Error(`Failed to update priority: ${response.statusText}`);
      }

      // Reload topics to reflect changes
      await loadTopics();
    } catch (err) {
      console.error('[useTopicStatus] Priority update error:', err);
      throw new Error('優先度の更新に失敗しました');
    }
  };

  const createTopic = async (topicData: Omit<TopicData, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> => {
    if (!user?.id || !projectId) {
      throw new Error('ユーザーIDまたはプロジェクトIDが見つかりません');
    }

    try {
      
      // Transform TopicData to SQL API format
      const createData: {
        name: string;
        summary: string;
        status: TopicStatus;
        priority?: string;
      } = {
        name: topicData.title || '',
        summary: topicData.description || '',
        status: topicData.status || 'unhandled',
      };

      if (topicData.priority) {
        createData.priority = topicData.priority.level;
      }

      const response = await fetch(`/api/topics/${projectId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': user.id,
        },
        body: JSON.stringify(createData),
      });

      if (!response.ok) {
        throw new Error(`Failed to create topic: ${response.statusText}`);
      }

      const result = await response.json();
      
      if (!result.success || !result.topic) {
        throw new Error('Invalid response from server');
      }

      // Reload topics to reflect changes
      await loadTopics();

      return result.topic.id;
    } catch (err) {
      console.error('[useTopicStatus] Create error:', err);
      throw new Error('トピックの作成に失敗しました');
    }
  };

  const syncTopicsFromAnalysis = async (analysisTopics: unknown[]): Promise<void> => {
    if (!user?.id || !projectId) {
      throw new Error('ユーザーIDまたはプロジェクトIDが見つかりません');
    }

    try {
      
      // Create topics sequentially to ensure proper ID handling
      for (const topic of analysisTopics) {
        const topicData: {
          name: string;
          summary: string;
          count: number;
          status: TopicStatus;
          priority?: string;
        } = {
          name: (topic as { name?: string; title?: string }).name || (topic as { name?: string; title?: string }).title || '',
          summary: (topic as { summary?: string; description?: string }).summary || (topic as { summary?: string; description?: string }).description || '',
          count: (topic as { count?: number }).count || 0,
          status: ((topic as { status?: string }).status as TopicStatus) || 'unhandled',
        };

        // Add priority if exists
        const topicPriority = (topic as { priority?: string }).priority;
        if (topicPriority) {
          topicData.priority = topicPriority;
        }

        try {
          const response = await fetch(`/api/topics/${projectId}`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-user-id': user.id,
            },
            body: JSON.stringify(topicData),
          });

          if (!response.ok) {
            console.error('[useTopicStatus] Failed to create topic:', (topic as { name?: string; title?: string }).name || (topic as { name?: string; title?: string }).title);
            continue; // Continue with next topic instead of failing completely
          }

          await response.json();

          // Update opinions with topicId if they exist
          const topicOpinions = (topic as { opinions?: unknown[] }).opinions;
          if (topicOpinions && topicOpinions.length > 0) {
            // Note: We'll need to implement opinion update API for this
            // For now, we'll skip this part as it requires additional API endpoints
          }
        } catch (err) {
          console.error('[useTopicStatus] Error creating topic:', err);
          // Continue with other topics
        }
      }

      // Reload topics after all creations
      await loadTopics();
    } catch (err) {
      console.error('[useTopicStatus] Sync error:', err);
      throw new Error('分析データの同期に失敗しました');
    }
  };

  return {
    topics,
    isLoading,
    error,
    updateTopicStatus,
    updateTopicPriority,
    createTopic,
    syncTopicsFromAnalysis,
    loadTopics
  };
}