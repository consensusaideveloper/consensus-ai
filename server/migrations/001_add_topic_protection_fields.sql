-- 改良版インクリメンタル分析用のトピック保護フィールド追加
-- 実行日: 2025-07-01

-- Topicテーブルに保護関連フィールドを追加
ALTER TABLE topics ADD COLUMN hasActiveActions BOOLEAN DEFAULT FALSE;
ALTER TABLE topics ADD COLUMN lastActionDate DATETIME;
ALTER TABLE topics ADD COLUMN firebaseId TEXT;
ALTER TABLE topics ADD COLUMN syncStatus TEXT DEFAULT 'pending';
ALTER TABLE topics ADD COLUMN lastSyncAt DATETIME;

-- 既存データの初期化
-- 既存のトピックのhasActiveActionsフラグを適切に設定
UPDATE topics 
SET hasActiveActions = CASE 
  WHEN EXISTS (
    SELECT 1 FROM action_management am 
    JOIN opinions o ON am.responseId = o.id 
    WHERE o.topicId = topics.id 
    AND am.actionStatus IN ('in-progress', 'resolved')
  ) THEN TRUE 
  ELSE FALSE 
END;

-- ステータスが変更されているトピックも保護対象として設定
UPDATE topics 
SET hasActiveActions = TRUE 
WHERE status != 'UNHANDLED' AND hasActiveActions = FALSE;

-- lastActionDateの設定
UPDATE topics 
SET lastActionDate = (
  SELECT MAX(am.updatedAt) 
  FROM action_management am 
  JOIN opinions o ON am.responseId = o.id 
  WHERE o.topicId = topics.id 
  AND am.actionStatus IN ('in-progress', 'resolved')
)
WHERE hasActiveActions = TRUE;

-- ログ出力用のクエリ（実行結果確認）
SELECT 
  'Migration 001 completed' as status,
  COUNT(*) as total_topics,
  SUM(CASE WHEN hasActiveActions THEN 1 ELSE 0 END) as protected_topics,
  SUM(CASE WHEN hasActiveActions THEN 0 ELSE 1 END) as unprotected_topics
FROM topics;