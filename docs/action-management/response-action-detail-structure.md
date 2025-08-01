# ConsensusAI 回答アクション詳細画面・データ構造仕様

## 📋 概要

本ドキュメントは、ConsensusAIの**回答アクション詳細画面**（ResponseActionDetail）の実装詳細とデータ構造を整理した仕様書です。各回答（Opinion）に対するアクション管理機能の完全な実装状況を記載しています。

## 🎯 機能概要

### 主要機能
- **アクション管理**: 回答に対する対応ステータス管理（未対応/対応中/解決済み/見送り）
- **優先度設定**: 重要度レベル（高/中/低）と設定理由の記録
- **期限管理**: 対応期限の設定・追跡
- **ブックマーク機能**: 重要な回答のマーキング
- **依存関係管理**: 他のアクションとの依存関係設定
- **アクティビティログ**: 全ての操作履歴の記録・表示

### 対応領域
- **UI/UX**: レスポンシブデザイン・国際化対応
- **データ同期**: Firebase + SQLite 二重同期
- **リアルタイム更新**: Firebase Realtime Database による即座更新
- **トピック解決寄与**: 各回答がトピック解決に与える影響の評価

## 📊 データベース構造

### 1. ActionManagement テーブル（SQLite）

```sql
model ActionManagement {
  id               String    @id @default(cuid())
  responseId       String    # 対象の意見ID（Opinion.id）
  actionStatus     String    # unhandled, in-progress, resolved, dismissed
  priorityLevel    String?   # high, medium, low
  priorityReason   String?   # 優先度設定理由
  priorityUpdatedAt DateTime? # 優先度更新日時
  dueDate          DateTime? # 対応期限
  isBookmarked     Boolean   @default(false)
  createdAt        DateTime  @default(now())
  updatedAt        DateTime  @updatedAt
  
  # Relations
  projectId        String    # プロジェクトID
  project          Project   @relation(fields: [projectId], references: [id], onDelete: Cascade)
  dependencies     ActionDependency[]
  logs             ActionLog[]
  
  # Sync fields (Firebase同期用)
  firebaseId       String?   # Firebase同期ID
  syncStatus       String?   @default("pending") # pending, synced, conflict
  lastSyncAt       DateTime? # 最終同期日時
  
  @@index([responseId])
  @@index([projectId])
  @@index([actionStatus])
}
```

### 2. ActionDependency テーブル（SQLite）

```sql
model ActionDependency {
  id                    String    @id @default(cuid())
  actionId              String    # 依存元アクションID
  dependsOnActionId     String    # 依存するアクションID
  dependsOnResponseId   String    # 依存する意見ID
  dependsOnDescription  String    # 依存関係の説明
  status                String    # pending, satisfied, blocked
  createdAt             DateTime  @default(now())
  updatedAt             DateTime  @updatedAt
  
  # Relations
  action               ActionManagement @relation(fields: [actionId], references: [id], onDelete: Cascade)
  
  # Sync fields (Firebase同期用)
  firebaseId           String?   # Firebase同期ID
  syncStatus           String?   @default("pending")
  lastSyncAt           DateTime?
  
  @@index([actionId])
  @@index([dependsOnActionId])
}
```

### 3. ActionLog テーブル（SQLite）

```sql
model ActionLog {
  id        String    @id @default(cuid())
  actionId  String    # 対象アクションID
  content   String    # ログ内容
  author    String    # 作成者（ユーザーID）
  type      String    # comment, status_change, priority_change, dependency_change
  metadata  String?   # JSON形式のメタデータ
  createdAt DateTime  @default(now())
  
  # Relations
  action    ActionManagement @relation(fields: [actionId], references: [id], onDelete: Cascade)
  
  # Sync fields (Firebase同期用)
  firebaseId String?   # Firebase同期ID
  syncStatus String?   @default("pending")
  lastSyncAt DateTime?
  
  @@index([actionId])
  @@index([createdAt])
}
```

## 🔥 Firebase Realtime Database 構造

### アクション管理データ
```json
{
  "users": {
    "{userId}": {
      "projects": {
        "{projectId}": {
          "actions": {
            "{actionId}": {
              "id": "string",
              "responseId": "string",
              "actionStatus": "unhandled|in-progress|resolved|dismissed",
              "priorityLevel": "high|medium|low",
              "priorityReason": "string",
              "priorityUpdatedAt": "ISO string",
              "dueDate": "ISO string",
              "isBookmarked": "boolean",
              "createdAt": "ISO string",
              "updatedAt": "ISO string",
              "dependencies": {
                "{dependencyId}": {
                  "dependsOnActionId": "string",
                  "dependsOnResponseId": "string",
                  "dependsOnDescription": "string",
                  "status": "pending|satisfied|blocked",
                  "createdAt": "ISO string"
                }
              },
              "logs": {
                "{logId}": {
                  "content": "string",
                  "author": "string",
                  "type": "comment|status_change|priority_change|dependency_change",
                  "metadata": "JSON string",
                  "createdAt": "ISO string"
                }
              }
            }
          }
        }
      }
    }
  }
}
```

## 🔄 CRUD操作・データフロー

### アクション作成フロー
```
1. User Input → ActionManagement作成
2. SQLite保存 → ActionService.db.ts
3. Firebase同期 → ActionService.ts
4. 同期結果確認 → firebaseId更新
5. UI更新 → リアルタイム反映
```

### データ同期戦略（CLAUDE.md準拠）
```typescript
interface ActionCRUDFlow {
  create: {
    step1: "SQLite ActionManagement作成"
    step2: "Firebase users/{userId}/projects/{projectId}/actions/{actionId} 作成"
    step3: "失敗時SQLiteロールバック"
    step4: "成功時firebaseId更新"
  }
  
  update: {
    step1: "SQLite ActionManagement更新"
    step2: "Firebase同期更新"
    step3: "updatedAt自動更新"
    step4: "失敗時元データ復元"
  }
  
  delete: {
    step1: "SQLite ActionManagement削除（カスケード）"
    step2: "Firebase actions/{actionId} 削除"
    step3: "失敗時SQLite復元"
    step4: "関連データ（依存関係・ログ）自動削除"
  }
}
```

## 🎨 UI/UX実装詳細

### 1. ResponseActionDetail コンポーネント

**ファイル**: `/client/src/components/ResponseActionDetail.tsx`

#### 主要機能
- **レスポンシブデザイン**: モバイル・デスクトップ対応
- **国際化対応**: 日本語・英語の完全対応
- **リアルタイム更新**: Firebase Realtime Database による即座更新
- **通知システム**: 操作成功・失敗の通知表示

#### 画面構成
```typescript
interface ResponseActionDetailUI {
  header: {
    title: "回答アクション詳細"
    backButton: "プロジェクト詳細への戻る"
    breadcrumb: "プロジェクト > 回答 > アクション詳細"
  }
  
  mainContent: {
    responseDisplay: "対象回答の内容表示"
    actionStatusBadge: "現在のステータス表示"
    priorityIndicator: "優先度インジケーター"
    dueDateDisplay: "期限日時表示"
  }
  
  actionManagement: {
    statusSelector: "ステータス変更セレクター"
    prioritySelector: "優先度変更セレクター"
    dueDatePicker: "期限日時ピッカー"
    bookmarkToggle: "ブックマーク切り替え"
    reasonTextarea: "理由記述エリア"
  }
  
  dependencyManagement: {
    dependencyList: "依存関係一覧"
    addDependencyButton: "依存関係追加"
    dependencyStatusBadge: "依存状態表示"
  }
  
  activityLog: {
    logList: "アクティビティログ一覧"
    addCommentForm: "コメント追加フォーム"
    logTypeFilter: "ログタイプフィルター"
  }
}
```

### 2. 翻訳ファイル

**ファイル**: `/client/src/translations/pages/responseActionDetail.ts`

#### 国際化対応
```typescript
interface ResponseActionDetailTranslations {
  ja: {
    title: "回答アクション詳細"
    status: {
      unhandled: "未対応"
      inProgress: "対応中"
      resolved: "解決済み"
      dismissed: "見送り"
    }
    priority: {
      high: "高"
      medium: "中"
      low: "低"
    }
    // ... 他の翻訳項目
  }
  
  en: {
    title: "Response Action Detail"
    status: {
      unhandled: "Unhandled"
      inProgress: "In Progress"
      resolved: "Resolved"
      dismissed: "Dismissed"
    }
    priority: {
      high: "High"
      medium: "Medium"
      low: "Low"
    }
    // ... 対応する英語翻訳
  }
}
```

## 🔗 API エンドポイント仕様

### 1. CRUD操作エンドポイント

**ファイル**: `/server/src/routes/actions.db.ts`

```typescript
interface ActionAPIEndpoints {
  // アクション作成
  "POST /api/db/projects/:projectId/actions": {
    request: CreateActionRequest
    response: ActionManagement
    service: "ActionService.db.ts"
  }
  
  // プロジェクト内全アクション取得
  "GET /api/db/projects/:projectId/actions": {
    response: ActionManagement[]
    service: "ActionService.db.ts"
  }
  
  // 特定回答のアクション取得
  "GET /api/db/projects/:projectId/actions/response/:responseId": {
    response: ActionManagement
    service: "ActionService.db.ts"
  }
  
  // アクション更新
  "PUT /api/db/actions/:actionId": {
    request: UpdateActionRequest
    response: ActionManagement
    service: "ActionService.db.ts"
  }
  
  // Firebase ID指定更新
  "PUT /api/db/actions/firebase/:firebaseId": {
    request: UpdateActionRequest
    response: ActionManagement
    service: "ActionService.db.ts"
  }
  
  // アクション削除
  "DELETE /api/db/actions/:actionId": {
    response: { success: boolean }
    service: "ActionService.db.ts"
  }
}
```

### 2. 依存関係管理エンドポイント

```typescript
interface DependencyAPIEndpoints {
  // 依存関係追加
  "POST /api/db/actions/:actionId/dependencies": {
    request: CreateDependencyRequest
    response: ActionDependency
    service: "ActionService.db.ts"
  }
  
  // 依存関係削除
  "DELETE /api/db/dependencies/:dependencyId": {
    response: { success: boolean }
    service: "ActionService.db.ts"
  }
}
```

### 3. ログ管理エンドポイント

```typescript
interface LogAPIEndpoints {
  // ログ追加
  "POST /api/db/actions/:actionId/logs": {
    request: CreateLogRequest
    response: ActionLog
    service: "ActionService.db.ts"
  }
}
```

## 🛠️ サービス実装詳細

### 1. ActionService.db.ts（SQLite操作）

**ファイル**: `/server/src/services/actionService.db.ts`

#### 主要機能
- **CRUD操作**: ActionManagement, ActionDependency, ActionLog の完全管理
- **トランザクション処理**: 原子性を保証する安全な操作
- **リレーション管理**: Project, Opinion との関連付け
- **同期ステータス管理**: Firebase同期状況の追跡

#### 実装メソッド
```typescript
interface ActionServiceDB {
  // アクション管理
  createAction: (projectId: string, data: CreateActionRequest) => Promise<ActionManagement>
  getProjectActions: (projectId: string) => Promise<ActionManagement[]>
  getActionByResponseId: (projectId: string, responseId: string) => Promise<ActionManagement | null>
  updateAction: (actionId: string, data: UpdateActionRequest) => Promise<ActionManagement>
  deleteAction: (actionId: string) => Promise<void>
  
  // 依存関係管理
  addDependency: (actionId: string, data: CreateDependencyRequest) => Promise<ActionDependency>
  removeDependency: (dependencyId: string) => Promise<void>
  
  // ログ管理
  addLog: (actionId: string, data: CreateLogRequest) => Promise<ActionLog>
  
  // 同期管理
  updateFirebaseId: (actionId: string, firebaseId: string) => Promise<void>
  updateSyncStatus: (actionId: string, status: string) => Promise<void>
}
```

### 2. ActionService.ts（Firebase操作）

**ファイル**: `/client/src/services/actionService.ts`

#### 主要機能
- **Firebase CRUD**: Realtime Database への直接操作
- **リアルタイム更新**: データ変更の即座反映
- **同期調整**: SQLite との整合性維持
- **エラーハンドリング**: 接続エラー・データエラーの処理

#### 実装メソッド
```typescript
interface ActionServiceFirebase {
  // Firebase CRUD
  createAction: (userId: string, projectId: string, action: ActionData) => Promise<string>
  updateAction: (userId: string, projectId: string, actionId: string, data: Partial<ActionData>) => Promise<void>
  deleteAction: (userId: string, projectId: string, actionId: string) => Promise<void>
  
  // リアルタイム購読
  subscribeToActions: (userId: string, projectId: string, callback: (actions: ActionData[]) => void) => () => void
  
  // 依存関係管理
  addDependency: (userId: string, projectId: string, actionId: string, dependency: DependencyData) => Promise<void>
  removeDependency: (userId: string, projectId: string, actionId: string, dependencyId: string) => Promise<void>
  
  // ログ管理
  addLog: (userId: string, projectId: string, actionId: string, log: LogData) => Promise<void>
}
```

## 🎛️ 状態管理・フロー

### アクションステータス管理

```typescript
type ActionStatus = 
  | "unhandled"     // 未対応
  | "in-progress"   // 対応中
  | "resolved"      // 解決済み
  | "dismissed"     // 見送り

interface ActionStatusFlow {
  unhandled: {
    nextStates: ["in-progress", "dismissed"]
    description: "新規作成時のデフォルト状態"
    actions: ["優先度設定", "期限設定", "担当者割り当て"]
  }
  
  "in-progress": {
    nextStates: ["resolved", "dismissed", "unhandled"]
    description: "対応作業中の状態"
    actions: ["進捗更新", "コメント追加", "期限変更"]
  }
  
  resolved: {
    nextStates: ["in-progress"]
    description: "対応完了状態"
    actions: ["解決結果記録", "効果測定"]
  }
  
  dismissed: {
    nextStates: ["unhandled", "in-progress"]
    description: "対応見送り状態"
    actions: ["見送り理由記録", "将来見直し設定"]
  }
}
```

### 優先度管理

```typescript
type PriorityLevel = 
  | "high"      // 高
  | "medium"    // 中
  | "low"       // 低

interface PriorityManagement {
  high: {
    description: "緊急対応が必要"
    dueDate: "設定必須"
    escalation: "自動エスカレーション"
    color: "red"
  }
  
  medium: {
    description: "通常対応"
    dueDate: "推奨設定"
    escalation: "期限超過時"
    color: "yellow"
  }
  
  low: {
    description: "時間のある時に対応"
    dueDate: "オプション"
    escalation: "なし"
    color: "green"
  }
}
```

### 依存関係管理

```typescript
interface DependencyManagement {
  status: {
    pending: "依存関係待機中"
    satisfied: "依存関係解決済み"
    blocked: "依存関係でブロック中"
  }
  
  resolution: {
    autoCheck: "依存するアクションの状態変更時に自動チェック"
    manualOverride: "手動での依存関係解除"
    cascadeUpdate: "依存関係の連鎖更新"
  }
}
```

## 📈 パフォーマンス最適化

### データベース最適化

```sql
-- 主要インデックス
CREATE INDEX idx_action_response_id ON ActionManagement(responseId);
CREATE INDEX idx_action_project_id ON ActionManagement(projectId);
CREATE INDEX idx_action_status ON ActionManagement(actionStatus);
CREATE INDEX idx_action_priority ON ActionManagement(priorityLevel);
CREATE INDEX idx_action_due_date ON ActionManagement(dueDate);

-- 複合インデックス
CREATE INDEX idx_action_project_status ON ActionManagement(projectId, actionStatus);
CREATE INDEX idx_action_project_priority ON ActionManagement(projectId, priorityLevel);

-- 依存関係インデックス
CREATE INDEX idx_dependency_action_id ON ActionDependency(actionId);
CREATE INDEX idx_dependency_depends_on ON ActionDependency(dependsOnActionId);

-- ログインデックス
CREATE INDEX idx_log_action_id ON ActionLog(actionId);
CREATE INDEX idx_log_created_at ON ActionLog(createdAt);
```

### Firebase最適化

```typescript
interface FirebaseOptimization {
  // 選択的リスニング
  selectiveListening: {
    projectActions: "プロジェクト内アクションのみ"
    statusFilter: "アクティブなアクションのみ"
    recentLogs: "最新50件のログのみ"
  }
  
  // 接続管理
  connectionManagement: {
    connectionReuse: "接続の再利用"
    offlineSupport: "オフライン時のキューイング"
    retryLogic: "自動再接続"
  }
  
  // データ圧縮
  dataCompression: {
    batchUpdates: "複数更新の一括処理"
    deltaSync: "差分同期"
    compressionTypes: "gzip圧縮"
  }
}
```

## 🔒 セキュリティ・権限管理

### アクセス制御

```typescript
interface ActionAccessControl {
  // ユーザー権限
  userPermissions: {
    owner: "プロジェクトオーナー - 全権限"
    collaborator: "コラボレーター - 読み書き権限"
    viewer: "閲覧者 - 読み取り専用"
  }
  
  // 操作権限
  operationPermissions: {
    create: "owner, collaborator"
    read: "owner, collaborator, viewer"
    update: "owner, collaborator (自分が作成したアクション)"
    delete: "owner, collaborator (自分が作成したアクション)"
  }
  
  // データ分離
  dataIsolation: {
    userBased: "ユーザー毎のデータ分離"
    projectBased: "プロジェクト毎のデータ分離"
    actionBased: "アクション毎のアクセス制御"
  }
}
```

### データ保護

```typescript
interface DataProtection {
  // 入力検証
  inputValidation: {
    sanitization: "XSS対策の入力サニタイズ"
    validation: "TypeScript型による検証"
    lengthLimit: "文字数制限"
  }
  
  // 暗号化
  encryption: {
    transit: "HTTPS通信の暗号化"
    storage: "Firebase・SQLiteの暗号化"
    logs: "ログデータの暗号化"
  }
  
  // 監査
  audit: {
    accessLog: "アクセスログの記録"
    changeLog: "変更履歴の記録"
    errorLog: "エラーログの記録"
  }
}
```

## 🚀 実装完了状況

### ✅ 完全実装済み機能
- **基本CRUD操作**: 作成・読込・更新・削除
- **アクション状態管理**: 4つの状態（未対応/対応中/解決済み/見送り）
- **優先度管理**: 3段階（高/中/低）+ 理由記録
- **期限管理**: 日時設定・期限切れ検知
- **ブックマーク機能**: 重要な回答のマーキング
- **依存関係管理**: 他アクションとの依存関係設定
- **アクティビティログ**: 全操作履歴の記録
- **Firebase + SQLite同期**: CLAUDE.md要件準拠の二重同期
- **リアルタイム更新**: Firebase Realtime Database
- **国際化対応**: 日本語・英語の完全対応
- **レスポンシブデザイン**: モバイル・デスクトップ対応
- **エラーハンドリング**: 包括的なエラー処理
- **セキュリティ**: アクセス制御・データ保護

### 🔄 部分実装済み機能
- **依存関係ステータス確認**: 基本的な状態チェック（より高度な自動処理は今後実装予定）
- **通知システム**: 基本的な通知表示（メール通知等の高度な機能は未実装）

### ❌ 未実装機能
- **添付ファイル機能**: 翻訳は存在するが、アップロード・表示機能は未実装
- **担当者割り当て**: 翻訳は存在するが、ユーザー管理機能は未実装
- **詳細設定**: 見積もり工数・成功基準等の高度な設定項目
- **自動化機能**: 条件に基づく自動ステータス変更
- **レポート機能**: アクション統計・分析レポート
- **外部連携**: Slack・メール等の外部ツール連携

## 🔄 今後の拡張計画

### Phase 1: 基本機能の強化
- **添付ファイル機能**: 画像・文書の添付機能
- **担当者割り当て**: ユーザー管理・権限制御
- **高度な依存関係**: 自動状態チェック・カスケード更新

### Phase 2: 自動化・最適化
- **自動化ルール**: 条件に基づく自動処理
- **レポート機能**: 統計・分析機能
- **パフォーマンス最適化**: 大量データ対応

### Phase 3: 外部連携・高度機能
- **外部ツール連携**: Slack・メール・カレンダー
- **AI支援**: 自動優先度設定・推奨アクション
- **企業向け機能**: 承認フロー・監査機能

---

**このドキュメントは「回答アクション詳細画面」の完全な実装仕様です。**
**CLAUDE.md要件に基づく高品質なデータ同期・エラーハンドリング・セキュリティ対策を実装しています。**
**最終更新: 2025年7月9日 - 実装調査・機能検証完了**