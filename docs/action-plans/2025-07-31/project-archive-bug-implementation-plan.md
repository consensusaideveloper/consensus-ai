# AI分析後プロジェクトアーカイブ問題 - 安全な修正実装計画

## 🎯 修正目標

**主要問題**: AI分析後にプロジェクトが自動的に「完了・アーカイブ」タブに移動する
**根本原因**: `projectService.db.ts` の自動ステータス修正ロジック
**修正方針**: 自動ステータス変更を削除し、ユーザーの明示的操作でのみ状態変更を許可

## 🔧 実装内容

### 修正対象ファイル
`server/src/services/projectService.db.ts` (742-763行)

### 修正前コード
```typescript
// ステータス自動修正: アーカイブされていないプロジェクトで、分析済みで未分析意見が0の場合は'completed'にする
let correctedStatus = prismaProject.status;
if (!prismaProject.isArchived && prismaProject.isAnalyzed && unanalyzedOpinionsCount === 0 && prismaProject.status !== 'completed') {
    console.log('[ProjectService] 🔧 ステータス自動修正検出:', {
        projectId: prismaProject.id,
        currentStatus: prismaProject.status,
        shouldBe: 'completed',
        reason: 'isArchived=false and isAnalyzed=true and unanalyzedOpinionsCount=0'
    });
    
    // DBを修正（非同期だが背景で実行）
    setImmediate(async () => {
        try {
            await prisma.project.update({
                where: { id: prismaProject.id },
                data: { status: 'completed' }
            });
            console.log('[ProjectService] ✅ ステータス自動修正完了:', prismaProject.id);
        } catch (error) {
            console.error('[ProjectService] ❌ ステータス自動修正失敗:', error);
        }
    });
    
    correctedStatus = 'completed';
}
```

### 修正後コード
```typescript
// 修正: ユーザーの明示的な操作でのみプロジェクトステータスを変更
// AI分析完了後も元のステータスを維持（collecting, processing等）
let correctedStatus = prismaProject.status;

console.log('[ProjectService] 📊 プロジェクトステータス維持:', {
    projectId: prismaProject.id,
    currentStatus: prismaProject.status,
    isAnalyzed: prismaProject.isAnalyzed,
    unanalyzedOpinionsCount: unanalyzedOpinionsCount,
    note: 'AI分析後もユーザーの明示的操作まで元ステータスを維持'
});
```

## 🔄 実装手順

### Step 1: 自動ステータス修正ロジック削除
1. `projectService.db.ts` の該当箇所を修正
2. ログメッセージをわかりやすく変更
3. 自動DBアップデートロジックを削除

### Step 2: 動作確認
1. AI分析実行後のプロジェクト状態確認
2. ダッシュボードでの表示確認
3. 「アクティブに戻す」ボタンの動作確認

### Step 3: 手動操作の動作確認
1. 完了ボタンの動作確認
2. アーカイブボタンの動作確認
3. 復元ボタンの動作確認

## ✅ 期待される修正効果

### 修正前の問題
- AI分析 → 自動的に `status = 'completed'` → 完了タブに移動
- 「アクティブに戻す」 → `status = 'collecting'` → 自動修正で再び `'completed'`

### 修正後の正常動作
- AI分析 → `status` は変更されない → アクティブタブに留まる
- 手動完了 → `status = 'completed'` → 完了タブに移動
- 「アクティブに戻す」 → `status = 'collecting'` → アクティブタブに移動

## 🧪 検証方法

### 1. AI分析後の状態確認
```bash
# SQLiteでプロジェクト状態確認
sqlite3 server/prisma/dev.db "SELECT id, name, status, isAnalyzed FROM projects WHERE isAnalyzed = 1;"
```

### 2. ダッシュボード表示確認
- アクティブタブに分析済みプロジェクトが表示されること
- 完了タブには手動完了のプロジェクトのみ表示されること

### 3. 機能動作確認
- AI分析ボタン → 分析後もアクティブタブに残存
- 完了ボタン → 完了タブに移動
- アーカイブボタン → アーカイブタブに移動
- 「アクティブに戻す」ボタン → アクティブタブに復帰

## 🚨 リスク評価と対策

### 低リスク要因
- **既存機能への影響なし**: AI分析機能自体は変更なし
- **データベース構造変更なし**: スキーマ変更は不要
- **手動操作は正常動作**: completeProject, archiveProject は影響なし

### 注意点
- **既存の completed ステータス**: 修正前に自動設定されたプロジェクトの扱い
- **後方互換性**: 既存のワークフローに影響しないこと

### 対策
- **段階的展開**: 開発環境で十分な検証後に適用
- **ログ監視**: 修正後の動作をログで追跡
- **ロールバック準備**: 問題時の迅速な復旧手順

## 📋 実装チェックリスト

- [ ] `projectService.db.ts` の自動修正ロジック削除
- [ ] 修正後のログメッセージ実装
- [ ] AI分析 → アクティブタブ残存の確認
- [ ] 「アクティブに戻す」ボタンの動作確認
- [ ] 手動完了・アーカイブ機能の動作確認
- [ ] エラーハンドリングの確認
- [ ] データ整合性の確認

## 🎯 成功基準

1. **AI分析後**: プロジェクトがアクティブタブに残る
2. **復元機能**: 「アクティブに戻す」ボタンが正常動作
3. **手動操作**: 完了・アーカイブが正常動作
4. **既存機能**: 他の機能に影響がない

---

**実装予定日**: 2025-07-31  
**実装者**: Claude Code  
**レビュー**: 修正後の動作確認必須