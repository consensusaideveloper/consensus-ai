# アクション管理画面 詳細分析資料

## 🔍 現状分析

### 1. アクション管理画面の構成

#### 1.1 画面種類
- **ActiveActionsList.tsx** (`/actions`) - 全プロジェクトのアクション管理
- **ProjectActionsList.tsx** (`/projects/:projectId/actions`) - 特定プロジェクトのアクション管理

#### 1.2 遷移経路
```
ProjectDetail.tsx (1633行目)
↓ アクション管理ボタンクリック
ProjectActionsList.tsx (/projects/:projectId/actions)
```

### 2. 表示されるべきデータ項目

#### 2.1 ActiveActionsList.tsx の期待データ
```typescript
interface ActiveActionItem {
  id: string;
  opinionId: string;
  taskDescription: string;           // 意見内容の要約
  relatedTopic: {
    id: string;
    title: string;                  // トピック名
    status: string;                 // トピックステータス
  };
  relatedProject: {
    id: string;
    name: string;                   // プロジェクト名
  };
  responseContent: string;           // 意見の全文
  actionStatus: string;              // アクションステータス
  assignee?: string;                 // 担当者
  dueDate?: Date;                   // 期限
  priority: string;                 // 優先度
  lastUpdated: Date;                // 最終更新日
}
```

#### 2.2 ProjectActionsList.tsx の期待データ
```typescript
interface ProjectActionItem {
  id: string;
  opinionId: string;
  taskDescription: string;           // 意見内容の要約
  relatedTopic: {
    id: string;
    title: string;                  // トピック名
    status: string;                 // トピックステータス
  };
  opinionContent: string;           // 意見の全文
  actionStatus: string;             // アクションステータス
  assignee?: string;                // 担当者
  dueDate?: Date;                   // 期限
  priority: string;                 // 優先度
  lastUpdated: Date;                // 最終更新日
}
```

## 🚨 現在の問題点

### 1. ActiveActionsList.tsx の問題
**APIエンドポイント**: `/api/db/actions/all`
**問題**: このAPIは**deprecated（非推奨）**になっている
**詳細**: アクション詳細機能はOpinion APIに統合済み

### 2. ProjectActionsList.tsx の問題
**データ取得方法**: localStorage使用（61-88行目）
**問題**: 実際のデータはデータベースに保存されているがlocalStorageから読み取ろうとしている
**影響**: アクションデータが取得できず、トピック情報のみ表示される

### 3. データ統合状況
現在、個別意見のアクション情報は以下のようにOpinionモデルに統合されている：

```prisma
model Opinion {
  // ... 他のフィールド
  actionStatus        String?                 @default("unhandled")
  actionStatusReason  String?
  actionStatusUpdatedAt DateTime?
  priorityLevel       String?                // 優先度
  priorityReason      String?
  priorityUpdatedAt   DateTime?
  dueDate             DateTime?              // 期限
  actionLogs          String?                // JSON形式のアクションログ
}
```

## 📋 利用可能な既存API

### 1. トピック別意見取得API
**エンドポイント**: `GET /api/topics/:projectId/:topicId/opinions`
**返却データ**:
```json
{
  "success": true,
  "opinions": [
    {
      "id": "string",
      "content": "string",
      "submittedAt": "ISO string",
      "isBookmarked": "boolean",
      "sentiment": "string",
      "characterCount": "number",
      "topicId": "string",
      "projectId": "string",
      "actionStatus": "string",      // 追加済み
      "priorityLevel": "string",     // 追加済み
      "dueDate": "ISO string"        // 追加済み
    }
  ]
}
```

### 2. 個別意見詳細API
**エンドポイント**: `GET /api/db/projects/:projectId/opinions/:opinionId`
**返却データ**: 完全なOpinionモデルのデータ

### 3. トピック一覧API
**エンドポイント**: `GET /api/topics/:projectId`
**返却データ**: プロジェクト内の全トピック情報

## 🎯 対応方針

### Phase 1: ProjectActionsList.tsx の修正（優先）
1. **localStorageベースの実装を削除**
2. **既存API使用によるデータ取得実装**
   - `/api/topics/:projectId` でトピック一覧を取得
   - 各トピックに対して `/api/topics/:projectId/:topicId/opinions` で意見とアクション情報を取得
3. **データ統合処理の実装**
   - トピック情報 + 意見情報 + アクション情報を統合
   - ProjectActionItem形式に変換

### Phase 2: ActiveActionsList.tsx の修正
1. **deprecated APIの使用を停止**
2. **全プロジェクトからアクションデータを集約する新しい実装**
   - プロジェクト一覧を取得
   - 各プロジェクトのトピック・意見・アクション情報を集約
3. **パフォーマンス考慮**
   - 必要に応じてバックエンドに専用APIエンドポイントを新設

### Phase 3: 表示機能の強化
1. **フィルタリング機能の改善**
2. **ソート機能の追加**
3. **リアルタイム更新対応**

## 🛠️ 実装計画

### Step 1: ProjectActionsList.tsx データ取得の修正
```typescript
// 新しいデータ取得ロジック
const fetchProjectActions = async () => {
  // 1. トピック一覧を取得
  const topicsResponse = await fetch(`/api/topics/${projectId}`);
  const topicsData = await topicsResponse.json();
  
  // 2. 各トピックの意見とアクション情報を取得
  const allActions = [];
  for (const topic of topicsData.topics) {
    const opinionsResponse = await fetch(`/api/topics/${projectId}/${topic.id}/opinions`);
    const opinionsData = await opinionsResponse.json();
    
    // 3. アクション情報がある意見のみを抽出・変換
    const topicActions = opinionsData.opinions
      .filter(opinion => opinion.actionStatus && opinion.actionStatus !== 'unhandled')
      .map(opinion => convertToProjectActionItem(opinion, topic));
    
    allActions.push(...topicActions);
  }
  
  setActions(allActions);
};
```

### Step 2: データ変換関数の実装
```typescript
const convertToProjectActionItem = (opinion: any, topic: any): ProjectActionItem => {
  return {
    id: `${projectId}-${topic.id}-${opinion.id}`,
    opinionId: opinion.id,
    taskDescription: opinion.content.substring(0, 100) + (opinion.content.length > 100 ? '...' : ''),
    relatedTopic: {
      id: topic.id,
      title: topic.title,
      status: topic.status || 'unhandled'
    },
    opinionContent: opinion.content,
    actionStatus: opinion.actionStatus || 'unhandled',
    assignee: undefined, // 現在未実装
    dueDate: opinion.dueDate ? new Date(opinion.dueDate) : undefined,
    priority: opinion.priorityLevel || 'medium',
    lastUpdated: opinion.priorityUpdatedAt ? new Date(opinion.priorityUpdatedAt) : new Date()
  };
};
```

## 📈 期待される効果

1. **データの正確性向上**: 実際のデータベースからアクション情報を取得
2. **リアルタイム性**: 最新のアクションステータス・優先度・期限を表示
3. **一貫性**: アクション詳細画面との整合性確保
4. **保守性**: localStorageの廃止により保守性向上

## ⚠️ 注意事項

1. **パフォーマンス**: 複数API呼び出しによる遅延の可能性
2. **エラーハンドリング**: API呼び出し失敗時の適切な処理
3. **キャッシュ戦略**: 頻繁なデータ取得を避けるキャッシュ実装
4. **後方互換性**: 既存機能への影響を最小限に抑制