import { TopicProtectionService } from '../services/topicProtectionService';
import { prisma } from '../lib/database';

// モックデータベース
jest.mock('../lib/database', () => ({
  prisma: {
    opinion: {
      count: jest.fn(),
      findMany: jest.fn()
    },
    topic: {
      findMany: jest.fn(),
      findUnique: jest.fn()
    }
  }
}));

describe('TopicProtectionService', () => {
  let topicProtectionService: TopicProtectionService;
  
  beforeEach(() => {
    topicProtectionService = new TopicProtectionService();
    jest.clearAllMocks();
  });

  describe('hasActiveActions', () => {
    it('アクション済みトピックでtrueを返す', async () => {
      // アクションが存在する場合
      (prisma.opinion.count as jest.Mock).mockResolvedValue(2);
      
      const result = await topicProtectionService.hasActiveActions('topic-123');
      
      expect(result).toBe(true);
      expect(prisma.opinion.count).toHaveBeenCalledWith({
        where: {
          AND: [
            { id: { in: [] } }, // 実際のテストでは意見IDが渡される
            { actionStatus: { in: ['in-progress', 'resolved'] } }
          ]
        }
      });
    });

    it('アクション未実施トピックでfalseを返す', async () => {
      // アクションが存在しない場合
      (prisma.opinion.count as jest.Mock).mockResolvedValue(0);
      
      const result = await topicProtectionService.hasActiveActions('topic-456');
      
      expect(result).toBe(false);
    });
  });

  describe('isTopicProtected', () => {
    it('ステータスがUNHANDLED以外の場合、保護対象と判定', async () => {
      const result = await topicProtectionService.isTopicProtected('topic-123');
      
      expect(result).toBe(true);
    });

    it('アクション済みトピックは保護対象と判定', async () => {
      (prisma.opinion.count as jest.Mock).mockResolvedValue(1);
      
      const result = await topicProtectionService.isTopicProtected('topic-123');
      
      expect(result).toBe(true);
    });
  });

  describe('getTopicsWithProtectionStatus', () => {
    it('プロジェクトのトピック一覧を保護情報付きで返す', async () => {
      const mockTopics = [
        {
          id: 'topic-1',
          name: 'テストトピック1',
          status: 'IN_PROGRESS',
          hasActiveActions: true,
          lastActionDate: new Date('2024-01-01'),
          opinions: []
        },
        {
          id: 'topic-2', 
          name: 'テストトピック2',
          status: 'UNHANDLED',
          hasActiveActions: false,
          lastActionDate: null,
          opinions: []
        }
      ];

      (prisma.topic.findMany as jest.Mock).mockResolvedValue(mockTopics);
      (prisma.opinion.count as jest.Mock)
        .mockResolvedValueOnce(1) // topic-1: アクション有り
        .mockResolvedValueOnce(0); // topic-2: アクション無し

      const result = await topicProtectionService.getTopicsWithProtectionStatus('project-123');

      expect(result).toHaveLength(2);
      expect(result[0].isProtected).toBe(true);
      expect(result[0].protectionReason).toBe('ステータス: IN_PROGRESS');
      expect(result[1].isProtected).toBe(false);
      expect(result[1].protectionReason).toBeUndefined();
    });
  });

  describe('protectionReason判定', () => {
    it('ステータス変更済みの場合、ステータス理由を返す', async () => {
      const mockTopic = {
        id: 'topic-1',
        status: 'IN_PROGRESS', 
        hasActiveActions: false
      };

      const protectionReason = topicProtectionService.getProtectionReason(mockTopic as any);
      expect(protectionReason).toBe('ステータス: IN_PROGRESS');
    });

    it('アクション管理済みの場合、アクション理由を返す', async () => {
      const mockTopic = {
        id: 'topic-1',
        status: 'UNHANDLED',
        hasActiveActions: true
      };

      const protectionReason = topicProtectionService.getProtectionReason(mockTopic as any);
      expect(protectionReason).toBe('アクション管理済み');
    });

    it('保護されていない場合、undefinedを返す', async () => {
      const mockTopic = {
        id: 'topic-1',
        status: 'UNHANDLED',
        hasActiveActions: false
      };

      const protectionReason = topicProtectionService.getProtectionReason(mockTopic as any);
      expect(protectionReason).toBeUndefined();
    });
  });
});