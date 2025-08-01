# AI分析機能404エラー調査レポート

**調査日時**: 2025-07-30  
**調査対象**: AI分析機能が動作しない問題（404エラー）  
**調査範囲**: フロントエンドからバックエンドまでの完全な調査  

## 📋 問題概要

### 発生している問題
AI分析機能が実行できない状態になっており、以下の404エラーが発生：

```
GET http://localhost:5173/api/db/projects/cmdppyxgn0003iis5az0aptbl/opinion-limits 404 (Not Found)
GET http://localhost:5173/api/analysis/projects/cmdppyxgn0003iis5az0aptbl/detection-status 404 (Not Found)
POST http://localhost:5173/api/analysis/projects/cmdppyxgn0003iis5az0aptbl/topics/background 404 (Not Found)
```

### エラーの詳細ログ
```
ProjectDetail.tsx:743 [ProjectDetail] ❌ AI分析エラー: 404 <!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>Error</title>
</head>
<body>
<pre>Cannot POST /api/analysis/projects/cmdppyxgn0003iis5az0aptbl/topics/background</pre>
</body>
</html>
```

## 🔍 詳細調査結果

### 1. フロントエンド調査（ProjectDetail.tsx）

#### 呼び出されているAPIエンドポイント
以下の3つのAPIエンドポイントがフロントエンドから呼び出されている：

1. **`GET /api/db/projects/${id}/opinion-limits`**
   - **場所**: ProjectDetail.tsx（fetchOpinionLimits関数内）
   - **目的**: 意見制限情報を取得
   - **実装状況**: ✅ **正常実装**

2. **`GET /api/analysis/projects/${id}/detection-status`** 
   - **場所**: ProjectDetail.tsx（handleIncrementalAnalysis関数内）
   - **目的**: 新規意見の有無をチェック
   - **実装状況**: ❌ **未実装（404エラーの原因）**

3. **`POST /api/analysis/projects/${id}/topics/background`**
   - **場所**: ProjectDetail.tsx（handleIncrementalAnalysis関数内）
   - **目的**: バックグラウンドでAI分析を実行
   - **実装状況**: ❌ **未実装（404エラーの原因）**

#### コードの詳細確認
```typescript
// 1. opinion-limitsエンドポイント（正常）
const response = await fetch(`/api/db/projects/${id}/opinion-limits`, {
  headers: { "X-User-ID": user.id },
});

// 2. detection-statusエンドポイント（存在しない）
const statusResponse = await fetch(`/api/analysis/projects/${id}/detection-status`, {
  headers: { "X-User-ID": user?.id || "anonymous" },
});

// 3. topics/backgroundエンドポイント（存在しない）
fetch(`/api/analysis/projects/${id}/topics/background`, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "X-User-ID": user?.id || "anonymous",
  },
  body: JSON.stringify({ ...options }),
});
```

### 2. バックエンド調査

#### 2.1 プロジェクトDBルーター（/server/src/routes/projects.db.ts）

**正常に実装されているエンドポイント：**
- **`GET /:id/opinion-limits`** (131-184行目) ✅
  - 意見収集制限情報を取得
  - PlanLimitServiceを使用して制限値を算出
  - プロジェクトの現在の意見数をカウント
  - 適切なレスポンスを返却

```typescript
router.get('/:id/opinion-limits', async (req: AuthenticatedRequest, res, next) => {
  // プロジェクトの存在確認
  const project = await projectService.getProject(req.params.id, req.userId!);
  
  // プラン制限値取得
  const limits = PlanLimitService.getPlanLimits(user?.subscriptionStatus, user);
  
  // 現在の意見数取得と制限チェック
  const currentOpinionCount = await prisma.opinion.count({
    where: { projectId: req.params.id }
  });
  
  // レスポンス返却
  res.json({
    success: true,
    data: {
      allowed: allowed,
      currentUsage: currentOpinionCount,
      limit: limits.maxOpinionsPerProject,
      remaining: remaining
    }
  });
});
```

#### 2.2 分析ルーター（/server/src/routes/analysis.ts）

**正常に実装されているエンドポイント：**
- **`POST /projects/:id/topics`** (81-282行目) ✅ - 同期分析実行
- **`GET /projects/:id/topics`** (288-302行目) ✅ - 分析済みトピック取得
- **`GET /projects/:id/summary`** (348-409行目) ✅ - 分析サマリー取得
- **`GET /health`** (531-558行目) ✅ - AIサービスヘルスチェック

**存在しないエンドポイント（404エラーの原因）：**
- **`GET /projects/:id/detection-status`** ❌ - フロントエンドが呼び出しているが未実装
- **`POST /projects/:id/topics/background`** ❌ - フロントエンドが呼び出しているが未実装

#### 2.3 サーバーメイン設定（/server/src/index.ts）

**ルートマッピング状況：**
```typescript
// プロジェクトDBルーター（53-55行目）
import projectsDbRouter from './routes/projects.db';
app.use('/api/db/projects', projectsDbRouter);  // ✅ 正常マウント

// AI分析ルーター（58-60行目）
import analysisRouter from './routes/analysis';
app.use('/api/analysis', analysisRouter);  // ✅ 正常マウント
```

**結果として以下のURLが有効：**
- ✅ `GET /api/db/projects/:id/opinion-limits` → projects.db.tsルーター
- ✅ `POST /api/analysis/projects/:id/topics` → analysis.tsルーター  
- ❌ `GET /api/analysis/projects/:id/detection-status` → **存在しない**
- ❌ `POST /api/analysis/projects/:id/topics/background` → **存在しない**

## 🎯 根本原因の特定

### 主要な問題点

1. **APIエンドポイントの不整合**
   - フロントエンドが呼び出すエンドポイントとバックエンドで実装されているエンドポイントが一致していない
   - 特に`detection-status`と`topics/background`エンドポイントが存在しない

2. **分析フローの実装方針の相違**
   - フロントエンド: バックグラウンド分析を想定した実装
   - バックエンド: 同期分析のみ実装済み

3. **CLAUDE.mdの指針との相違**
   - CLAUDE.mdでは「単一API呼び出し原則」と「同期分析実行」を指定
   - フロントエンドはバックグラウンド分析を前提とした複数API呼び出しを実装

## 📊 現在の実装状況マトリックス

| エンドポイント | フロントエンド | バックエンド | 状態 | 備考 |
|----------------|----------------|-------------|------|------|
| `GET /api/db/projects/:id/opinion-limits` | ✅ 呼び出し | ✅ 実装済み | 🟢 正常 | 意見制限情報取得 |
| `GET /api/analysis/projects/:id/detection-status` | ✅ 呼び出し | ❌ 未実装 | 🔴 404エラー | 新規意見検知用（不要） |
| `POST /api/analysis/projects/:id/topics/background` | ✅ 呼び出し | ❌ 未実装 | 🔴 404エラー | バックグラウンド分析用 |
| `POST /api/analysis/projects/:id/topics` | ❌ 未使用 | ✅ 実装済み | 🟡 未使用 | 同期分析実行 |
| `GET /api/analysis/health` | ❌ 未使用 | ✅ 実装済み | 🟡 未使用 | ヘルスチェック |

## 🔧 解決策の提案

### 選択肢1: フロントエンドを修正（推奨）

**CLAUDE.mdの方針に合わせた修正**

1. **不要なAPIコールを削除**
   - `GET /api/analysis/projects/:id/detection-status` の呼び出しを削除
   - 分析前の意見数チェックは既存の同期APIで実行

2. **同期分析APIに切り替え**
   - `POST /api/analysis/projects/:id/topics/background` → `POST /api/analysis/projects/:id/topics`
   - バックグラウンド処理→同期処理に変更

3. **修正対象ファイル**
   - `/client/src/components/ProjectDetail.tsx`
   - `handleIncrementalAnalysis`関数の大幅修正

**修正例：**
```typescript
// 修正前（現在）
const statusResponse = await fetch(`/api/analysis/projects/${id}/detection-status`);
const response = await fetch(`/api/analysis/projects/${id}/topics/background`, {
  method: "POST",
  body: JSON.stringify(options)
});

// 修正後（推奨）
const response = await fetch(`/api/analysis/projects/${id}/topics`, {
  method: "POST",
  body: JSON.stringify({ force: false, ...options })
});
```

### 選択肢2: バックエンドを拡張（非推奨）

**不足しているエンドポイントを追加**
- `GET /api/analysis/projects/:id/detection-status` の実装
- `POST /api/analysis/projects/:id/topics/background` の実装

**問題点：**
- CLAUDE.mdの「単一API呼び出し原則」に反する
- 複雑なバックグラウンド処理システムの実装が必要
- メンテナンス性の低下

## 🚨 緊急度と影響範囲

### 緊急度: **高**
- AI分析機能が完全に停止している
- ユーザーの主要機能が使用不可

### 影響範囲
- **ユーザー影響**: AI分析を実行しようとするすべてのユーザー
- **機能影響**: プロジェクト分析機能全体
- **データ影響**: なし（データ破損等はなし）

## 📝 推奨アクションプラン

### Phase 1: 緊急修正（即座実行）
1. **ProjectDetail.tsxの修正**
   - `detection-status`エンドポイント呼び出しを削除
   - `topics/background`エンドポイントを`topics`に変更
   - 同期処理に合わせたUI調整

### Phase 2: 動作検証（修正後）
1. **機能テスト**
   - AI分析の実行確認
   - エラーログの解消確認
   - パフォーマンス確認

### Phase 3: 将来の改善（長期）
1. **APIドキュメントの整備**
   - フロントエンド・バックエンド間のAPI仕様統一
   - エンドポイント一覧の作成・管理

## 📚 参考情報

### CLAUDE.mdの関連指針
```markdown
## 🤖 AI分析実装ルール

#### **4. フォールバック機能**
- **通常時**: claude-3-5-sonnet-20241022のみ使用（99%+のケース）
- **実装**: `generateResponseWithFallback()` メソッド

#### **5. AI分析APIエンドポイント**
- `POST /api/analysis/projects/:id/topics` - 同期分析実行
- `GET /api/analysis/health` - AIサービス接続確認  
- **バックグラウンド分析エンドポイントは除去済み**

#### **7. 禁止事項**
- **❌ バッチ処理実装**: `backgroundAnalysisService`等の複雑な処理
- **❌ 複数API呼び出し**: 1度の分析で複数回のAPI通信
```

### エラーログの詳細パターン
- `Cannot POST /api/analysis/projects/.../topics/background` 
- `404 (Not Found)` 
- Express.jsの標準404HTMLページが返却

## 🎯 結論

**404エラーの根本原因は、フロントエンドとバックエンドのAPIエンドポイント仕様の不整合です。**

特に、フロントエンドが呼び出している以下の2つのエンドポイントが存在しないことが主要原因：
1. `GET /api/analysis/projects/:id/detection-status` 
2. `POST /api/analysis/projects/:id/topics/background`

**最も効率的な解決策は、CLAUDE.mdの方針に合わせてフロントエンドを修正すること**であり、既に実装済みの同期分析API（`POST /api/analysis/projects/:id/topics`）を使用することです。

これにより、AI分析機能を迅速に復旧させることができます。