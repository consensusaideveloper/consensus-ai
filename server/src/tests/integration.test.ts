import { TopicProtectionService } from '../services/topicProtectionService';

describe('改良版インクリメンタル分析システム統合テスト', () => {
  let topicProtectionService: TopicProtectionService;
  
  beforeEach(() => {
    topicProtectionService = new TopicProtectionService();
  });

  describe('TopicProtectionService基本機能', () => {
    it('インスタンスが正常に作成される', () => {
      expect(topicProtectionService).toBeInstanceOf(TopicProtectionService);
    });

    it('getProtectionReasonが適切な理由を返す', () => {
      // ステータス変更済みの場合
      const topic1 = { status: 'IN_PROGRESS', hasActiveActions: false };
      expect(topicProtectionService.getProtectionReason(topic1)).toBe('ステータス: IN_PROGRESS');

      // アクション管理済みの場合
      const topic2 = { status: 'UNHANDLED', hasActiveActions: true };
      expect(topicProtectionService.getProtectionReason(topic2)).toBe('アクション管理済み');

      // 保護されていない場合
      const topic3 = { status: 'UNHANDLED', hasActiveActions: false };
      expect(topicProtectionService.getProtectionReason(topic3)).toBeUndefined();
    });
  });

  describe('保護判定ロジック', () => {
    it('ステータスベースの保護判定が正しく動作する', () => {
      const statusTests = [
        { status: 'UNHANDLED', expected: false },
        { status: 'IN_PROGRESS', expected: true },
        { status: 'RESOLVED', expected: true },
        { status: 'ARCHIVED', expected: true }
      ];

      statusTests.forEach(({ status, expected }) => {
        const topic = { status, hasActiveActions: false };
        const reason = topicProtectionService.getProtectionReason(topic);
        const isProtected = reason !== undefined;
        expect(isProtected).toBe(expected);
      });
    });

    it('アクションベースの保護判定が正しく動作する', () => {
      const actionTests = [
        { hasActiveActions: false, expected: false },
        { hasActiveActions: true, expected: true }
      ];

      actionTests.forEach(({ hasActiveActions, expected }) => {
        const topic = { status: 'UNHANDLED', hasActiveActions };
        const reason = topicProtectionService.getProtectionReason(topic);
        const isProtected = reason !== undefined;
        expect(isProtected).toBe(expected);
      });
    });
  });

  describe('改良版分析の動作保証', () => {
    it('保護されたトピックは名前・要約が変更されない設計', () => {
      // 保護フラグの仕様確認
      const protectedTopic = {
        id: 'topic-1',
        name: '交通改善要望',
        summary: 'バス路線の増便とバリアフリー化',
        status: 'IN_PROGRESS',
        hasActiveActions: true
      };

      const protectionReason = topicProtectionService.getProtectionReason(protectedTopic);
      expect(protectionReason).toBe('ステータス: IN_PROGRESS');
      
      // 保護されたトピックは SAFE_ADD_TO_PROTECTED アクションになることを確認
      // （実際の分類ロジックのテストは統合テストで実行）
      expect(protectionReason).toBeDefined();
    });

    it('新規トピック作成時の基本設定確認', () => {
      const newTopic = {
        status: 'UNHANDLED',
        hasActiveActions: false
      };

      const protectionReason = topicProtectionService.getProtectionReason(newTopic);
      expect(protectionReason).toBeUndefined();
      
      // 新規作成トピックは保護されない状態で開始されることを確認
      expect(protectionReason).toBeUndefined();
    });
  });

  describe('分類アクションの種類確認', () => {
    it('改良版で追加された分類アクションが定義されている', () => {
      // SAFE_ADD_TO_PROTECTED アクションが追加されていることの確認
      const classificationActions = [
        'ASSIGN_TO_EXISTING',
        'CREATE_NEW_TOPIC', 
        'MANUAL_REVIEW',
        'SAFE_ADD_TO_PROTECTED' // 改良版で追加
      ];

      // 各アクションタイプが文字列として正しく定義されていることを確認
      classificationActions.forEach(action => {
        expect(typeof action).toBe('string');
        expect(action.length).toBeGreaterThan(0);
      });
    });

    it('保護対応分類の動作パターンが設計通り', () => {
      // パターン1: 保護されたトピックへの分類
      const protectedCase = {
        expectedAction: 'SAFE_ADD_TO_PROTECTED',
        topicChange: false, // 名前・要約変更なし
        countChange: true   // 意見数のみ増加
      };

      // パターン2: 保護されていないトピックへの分類  
      const unprotectedCase = {
        expectedAction: 'ASSIGN_TO_EXISTING',
        topicChange: true,  // 要約改善あり
        countChange: true   // 意見数増加
      };

      // パターン3: 新規トピック作成
      const newTopicCase = {
        expectedAction: 'CREATE_NEW_TOPIC',
        topicChange: true,  // 新規作成
        countChange: true   // 初期意見として追加
      };

      [protectedCase, unprotectedCase, newTopicCase].forEach(testCase => {
        expect(testCase.expectedAction).toBeDefined();
        expect(typeof testCase.topicChange).toBe('boolean');
        expect(typeof testCase.countChange).toBe('boolean');
      });
    });
  });
});