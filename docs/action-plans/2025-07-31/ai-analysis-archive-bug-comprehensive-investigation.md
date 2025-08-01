# AI分析後プロジェクトアーカイブ問題 - 完全調査報告書

## 📋 問題概要

**症状**: AI分析実行後、プロジェクトが「完了・アーカイブ」タブに自動移動し、「アクティブ」タブから消える

**期待動作**: AI分析後もプロジェクトは「アクティブ」タブに留まり、完了・アーカイブはユーザーの明示的な操作でのみ実行される

## 🔍 根本原因の特定

### 主要原因: 自動ステータス修正ロジック

**場所**: `server/src/services/projectService.db.ts:742-763`

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

### 動作フロー

1. **AI分析実行** → `isAnalyzed: true` に設定
2. **プロジェクト読み込み時** → `mapPrismaToProject` メソッド呼び出し
3. **自動修正条件判定**:
   - `!isArchived` (アーカイブされていない)
   - `isAnalyzed` (分析済み)
   - `unanalyzedOpinionsCount === 0` (未分析意見なし)
   - `status !== 'completed'` (まだ完了ではない)
4. **条件満足** → `status = 'completed'` に自動変更
5. **ダッシュボード表示時** → 完了プロジェクトとして扱われる

## 🎯 ダッシュボード表示ロジック

**場所**: `client/src/components/Dashboard.tsx:489-501`

### アクティブタブの条件
```typescript
matchesTab =
  !project.isArchived &&
  project.status !== "completed" &&
  (project.status === "collecting" ||
    project.status === "processing" ||
    project.status === "paused" ||
    project.status === "ready-for-analysis" ||
    project.status === "analyzing" ||
    project.status === "in-progress");
```

### 完了・アーカイブタブの条件
```typescript
matchesTab = (project.status === "completed" || !!project.isArchived);
```

## 🐛 「アクティブに戻す」ボタン機能不全の原因

**場所**: `client/src/contexts/ProjectContext.tsx:493-542`

### 問題のある動作フロー
1. **ユーザーがボタンクリック** → `restoreProject` 実行
2. **API呼び出し** → `status: "collecting"` で更新
3. **データベース更新** → SQLiteで `status = 'collecting'` に設定
4. **レスポンス生成時** → `mapPrismaToProject` 呼び出し
5. **自動修正再実行** → 条件満たすので再び `status = 'completed'`
6. **結果** → プロジェクトは依然として完了タブに表示

### restoreProject実装
```typescript
const restoreData = {
  isArchived: false,
  archivedAt: null,
  status: "collecting", // ←これが自動修正で上書きされる
};
```

## 📊 影響範囲の分析

### 直接影響
- AI分析後のプロジェクトが全て「完了・アーカイブ」タブに移動
- 「アクティブに戻す」ボタンが機能しない
- ユーザーの意図しないプロジェクト状態変更

### 間接影響
- ユーザーエクスペリエンスの低下
- プロジェクト管理フローの混乱
- AI分析への不信感

## 🔧 技術的詳細

### 関連ファイル一覧

1. **`server/src/services/projectService.db.ts`**
   - 自動ステータス修正ロジック (742-763行)
   - プロジェクトマッピング処理

2. **`client/src/components/Dashboard.tsx`**
   - タブフィルタリングロジック (489-501行)
   - プロジェクト表示条件

3. **`client/src/contexts/ProjectContext.tsx`**
   - `restoreProject` 実装 (493-542行)
   - `completeProject` 実装 (413-419行)
   - `archiveProject` 実装 (451-491行)

### データベーススキーマ関連フィールド
```sql
-- projects テーブル
status                    String                 @default("collecting")
isCompleted               Boolean                @default(false)
completedAt               DateTime?
isArchived                Boolean                @default(false)
archivedAt                DateTime?
isAnalyzed                Boolean                @default(false)
lastAnalysisAt            DateTime?
```

## ✅ 正常な動作設計

### 本来の期待動作
1. **AI分析完了** → `isAnalyzed: true`, `lastAnalysisAt: 更新`
2. **プロジェクトステータス** → 元のまま維持 (通常は `collecting`)
3. **完了操作** → ユーザーが明示的に「完了」ボタンをクリック
4. **アーカイブ操作** → ユーザーが明示的に「アーカイブ」ボタンをクリック

### 手動操作の仕組み
- **完了**: `completeProject` → `status: "completed"`, `isCompleted: true`
- **アーカイブ**: `archiveProject` → `isArchived: true`, `archivedAt: 設定`
- **復元**: `restoreProject` → `isArchived: false`, `status: "collecting"`

## 🚨 修正方針

### 1. 自動ステータス修正ロジックの削除
**対象**: `server/src services/projectService.db.ts:742-763`

現在の自動修正ロジックを完全に削除し、プロジェクトステータスはユーザーの明示的な操作でのみ変更されるようにする。

### 2. AI分析完了時のステータス維持
**対象**: `server/src/services/topicAnalysisService.ts`

AI分析完了時にプロジェクトステータスを変更しない（既に実装済み）。

### 3. データ整合性の確保
既存の「completed」ステータスになっているプロジェクトで、ユーザーが意図していないものを適切に処理する仕組みを検討。

## 📝 実装計画

### Phase 1: 緊急修正
1. **自動ステータス修正ロジック削除**
2. **既存データの状態確認**
3. **動作確認とテスト**

### Phase 2: 検証と改善
1. **復元ボタンの動作確認**
2. **手動完了・アーカイブ機能の確認**
3. **エッジケースの処理**

### Phase 3: データクリーンアップ
1. **意図しない「completed」ステータスの調査**
2. **必要に応じてユーザー同意のもとでデータ修正**

## 🧪 テストシナリオ

### 主要テストケース
1. **AI分析後の状態維持**: 分析後もプロジェクトがアクティブタブに残る
2. **手動完了**: 完了ボタンでのみ完了タブに移動
3. **手動アーカイブ**: アーカイブボタンでのみアーカイブ状態に
4. **復元機能**: 「アクティブに戻す」ボタンが正常動作
5. **データ整合性**: SQL-Firebase間の整合性維持

### 回帰テスト
- 既存のプロジェクト管理機能に影響がないこと
- AI分析機能自体には影響がないこと

## 📈 期待される改善効果

1. **ユーザーエクスペリエンス**: 意図した通りのプロジェクト管理が可能
2. **システム信頼性**: ユーザーの操作が正確に反映される
3. **運用効率**: 不適切な状態のプロジェクトが生成されない

## ⚠️ リスク評価

### 低リスク
- 既存のAI分析機能への影響なし
- データベーススキーマ変更なし

### 注意点
- 既存の「completed」ステータスプロジェクトの取り扱い
- ユーザーの既存ワークフローへの影響

---

**作成日**: 2025-07-31  
**調査者**: Claude Code  
**優先度**: Critical - 緊急対応必要