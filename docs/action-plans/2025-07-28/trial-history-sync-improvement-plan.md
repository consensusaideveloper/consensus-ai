# TrialHistory同期改善・課金分析機能実装計画

**作成日**: 2025-07-28  
**目的**: TrialHistory更新時同期と課金関連分析機能の実装  
**スコープ**: 最小限の変更で最大効果を実現、既存機能への影響回避

---

## 🔍 現状分析

### 現在のTrialHistory同期実装状況

#### ✅ 実装済み部分
- **作成時同期**: `trialService.ts`でトライアル開始時のみFirebase同期
- **Basic同期**: Firebase path `trialHistories/{userId}/{recordId}` に基本データ保存
- **Best Effort**: Firebase失敗でもSQL操作は継続（適切な設計）

#### ❌ 未実装・課題部分
1. **同期フィールド不足**: `firebaseId`, `syncStatus`, `lastSyncAt` フィールドなし
2. **更新時非同期**: ステータス変更（active → expired）時のFirebase同期なし
3. **ステータス遷移の未追跡**: 
   - 認証ミドルウェア（`auth.ts` L94-111）でのトライアル期限切れ検知
   - Stripeウェブフック（`stripeService.ts`）でのサブスクリプション変更
   - これらでUserテーブルは更新されるがTrialHistoryは更新されない
4. **分析機能不足**: 課金関連の分析・レポート機能が未実装

### 他モデルとの同期パターン比較

**標準的な同期実装例**（Contact, Project等）:
```typescript
// Prismaスキーマ
firebaseId    String?
syncStatus    String? @default("pending")
lastSyncAt    DateTime?

// サービス実装
- 原子的トランザクション（SQL → Firebase）
- エラー時の完全ロールバック
- 同期状態追跡
- 統一的なエラーハンドリング
```

**現在のTrialHistory**:
```typescript
// 同期フィールドなし
// Best Effort同期のみ
// 作成時のみ同期
```

---

## 🎯 実装方針

### 基本原則

1. **最小変更原則**: 既存機能への影響を最小限に抑制
2. **後方互換性維持**: 既存のTrialHistory実装は保持
3. **段階的実装**: Phase 1（同期改善） → Phase 2（分析機能）
4. **既存パターン踏襲**: 他モデルの成功した同期パターンを採用
5. **影響範囲限定**: 課金・トライアル関連のみに変更を限定

### 実装スコープ

#### Phase 1: TrialHistory同期改善（優先度: 高）
- ✅ **範囲限定**: TrialHistory関連のみ
- ✅ **影響回避**: 既存のUser同期、Stripe連携への影響なし
- ✅ **漸進的改善**: 現在の機能を拡張する形で実装

#### Phase 2: 課金分析機能（優先度: 中）
- ✅ **新規機能**: 既存機能への影響なし
- ✅ **管理者限定**: 一般ユーザー機能への影響なし

---

## 📋 Phase 1: TrialHistory同期改善実装計画

### 1.1 データベーススキーマ更新

**ファイル**: `/server/prisma/schema.prisma`

**変更内容**:
```prisma
model TrialHistory {
  id          String   @id @default(cuid())
  userId      String
  startDate   DateTime @default(now())
  endDate     DateTime
  status      String   @default("active")
  trialType   String   @default("standard")
  source      String?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  
  // 新規追加: Firebase同期フィールド
  firebaseId  String?                    // 新規追加
  syncStatus  String?  @default("pending") // 新規追加  
  lastSyncAt  DateTime?                  // 新規追加
  
  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  @@index([userId, startDate])
  @@index([userId, status])
  @@index([status, endDate])
  @@index([syncStatus])              // 新規追加
  @@map("trial_histories")
}
```

**マイグレーション実行**:
```bash
npx prisma migrate dev --name add_trial_history_sync_fields
```

**影響範囲**: TrialHistoryモデルのみ、既存データ・機能への影響なし

### 1.2 TrialService同期機能強化

**ファイル**: `/server/src/services/trialService.ts`

**実装内容**:

#### 1.2.1 Firebase同期メソッド追加
```typescript
/**
 * TrialHistoryのFirebase同期（新規メソッド）
 */
private static async syncTrialHistoryToFirebase(
  trialHistory: TrialHistory, 
  operation: 'create' | 'update'
): Promise<void> {
  try {
    const firebaseData = {
      id: trialHistory.id,
      userId: trialHistory.userId,
      startDate: trialHistory.startDate.toISOString(),
      endDate: trialHistory.endDate.toISOString(),
      status: trialHistory.status,
      trialType: trialHistory.trialType,
      source: trialHistory.source || null,
      createdAt: trialHistory.createdAt.toISOString(),
      updatedAt: trialHistory.updatedAt.toISOString(),
      lastSyncAt: new Date().toISOString()
    };

    const trialHistoryRef = database.ref(`trialHistories/${trialHistory.userId}/${trialHistory.id}`);
    await trialHistoryRef.set(firebaseData);

    // 同期状態をSQLiteに記録
    await prisma.trialHistory.update({
      where: { id: trialHistory.id },
      data: {
        firebaseId: trialHistory.id,
        syncStatus: 'synced',
        lastSyncAt: new Date()
      }
    });

  } catch (error) {
    // Best Effort: Firebase失敗をログ記録のみ（既存動作維持）
    console.warn('[TrialService] Firebase同期失敗（非クリティカル）:', error);
    
    // 同期エラー状態を記録
    await prisma.trialHistory.update({
      where: { id: trialHistory.id },
      data: {
        syncStatus: 'error',
        lastSyncAt: new Date()
      }
    }).catch(() => {}); // SQLite更新失敗も許容
  }
}
```

#### 1.2.2 ステータス更新メソッド追加
```typescript
/**
 * TrialHistoryステータス更新（新規メソッド）
 */
static async updateTrialHistoryStatus(
  userId: string, 
  newStatus: string, 
  reason?: string
): Promise<void> {
  try {
    // 最新のactiveなTrialHistoryを取得
    const activeTrialHistory = await prisma.trialHistory.findFirst({
      where: {
        userId,
        status: 'active'
      },
      orderBy: { createdAt: 'desc' }
    });

    if (!activeTrialHistory) {
      console.log('[TrialService] 更新対象のTrialHistoryが見つかりません:', { userId });
      return;
    }

    // ステータス更新
    const updatedTrialHistory = await prisma.trialHistory.update({
      where: { id: activeTrialHistory.id },
      data: {
        status: newStatus,
        syncStatus: 'pending' // Firebase再同期対象にマーク
      }
    });

    // Firebase同期
    await this.syncTrialHistoryToFirebase(updatedTrialHistory, 'update');

    console.log('[TrialService] TrialHistoryステータス更新完了:', {
      trialHistoryId: updatedTrialHistory.id,
      userId,
      oldStatus: activeTrialHistory.status,
      newStatus: newStatus,
      reason: reason || 'unspecified'
    });

  } catch (error) {
    console.error('[TrialService] TrialHistoryステータス更新エラー:', error);
    // エラーログのみ、処理は継続（非クリティカル）
  }
}
```

#### 1.2.3 既存メソッド更新
```typescript
// startTrial メソッド内の同期処理を新しいメソッドに変更
// 既存のFirebase同期コード（L439-457）を新しいsyncTrialHistoryToFirebaseメソッド呼び出しに置換
await this.syncTrialHistoryToFirebase(historyRecord, 'create');
```

**影響範囲**: TrialServiceのみ、既存のAPI・認証・Stripe連携への影響なし

### 1.3 認証ミドルウェア連携

**ファイル**: `/server/src/middleware/auth.ts`

**変更内容**:
```typescript
// 既存のcheckAndUpdateExpiredTrial呼び出し（L102）後に追加
if (hasExpiredTrial) {
  // TrialHistoryのステータスも更新（新規追加）
  await TrialService.updateTrialHistoryStatus(
    userPayload.uid, 
    'expired', 
    'trial_period_ended'
  );
}
```

**影響範囲**: 認証処理の既存ロジックは変更なし、追加処理のみ

### 1.4 Stripeウェブフック連携

**ファイル**: `/server/src/services/stripeService.ts`

**変更内容**:
```typescript
// 既存のサブスクリプション更新処理に追加
// handleSubscriptionCreated, handleSubscriptionUpdated, handleSubscriptionDeleted内

// Userテーブル更新後に追加
if (subscriptionStatus === 'active') {
  // Pro移行時はTrialHistoryを完了状態に更新
  await TrialService.updateTrialHistoryStatus(
    user.id, 
    'completed', 
    'upgraded_to_pro'
  );
} else if (subscriptionStatus === 'canceled') {
  // キャンセル時はTrialHistoryをキャンセル状態に更新
  await TrialService.updateTrialHistoryStatus(
    user.id, 
    'cancelled', 
    'subscription_cancelled'
  );
}
```

**影響範囲**: Stripe連携の既存ロジックは変更なし、追加処理のみ

---

## 📋 Phase 2: 課金分析機能実装計画

### 2.1 管理者向け課金分析API

**ファイル**: `/server/src/routes/admin.ts`

**新規エンドポイント追加**:

#### 2.1.1 トライアル統計エンドポイント
```typescript
/**
 * GET /api/admin/trial-stats
 * トライアル統計情報取得
 */
router.get('/trial-stats', async (req, res) => {
  try {
    const stats = await BillingAnalyticsService.getTrialStatistics();
    res.json(stats);
  } catch (error) {
    console.error('[Admin] トライアル統計取得エラー:', error);
    res.status(500).json({ error: 'トライアル統計の取得に失敗しました' });
  }
});
```

#### 2.1.2 課金レポートエンドポイント  
```typescript
/**
 * GET /api/admin/billing-report
 * 課金レポート取得
 */
router.get('/billing-report', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const report = await BillingAnalyticsService.getBillingReport({
      startDate: startDate ? new Date(startDate as string) : undefined,
      endDate: endDate ? new Date(endDate as string) : undefined
    });
    res.json(report);
  } catch (error) {
    console.error('[Admin] 課金レポート取得エラー:', error);
    res.status(500).json({ error: '課金レポートの取得に失敗しました' });
  }
});
```

### 2.2 BillingAnalyticsService新規作成

**ファイル**: `/server/src/services/billingAnalyticsService.ts`（新規作成）

**実装内容**:
```typescript
export class BillingAnalyticsService {
  /**
   * トライアル統計取得
   */
  static async getTrialStatistics() {
    // トライアル開始数・完了数・コンバージョン率等
    // TrialHistoryテーブルを活用した分析
  }

  /**
   * 課金レポート取得
   */
  static async getBillingReport(options: {
    startDate?: Date;
    endDate?: Date;
  }) {
    // 期間別の課金状況・収益分析
    // User・TrialHistory・Stripe APIの組み合わせ
  }

  /**
   * リテンション分析
   */
  static async getRetentionAnalysis() {
    // トライアル→Pro移行率・継続率分析
  }
}
```

**影響範囲**: 新規サービス、既存機能への影響なし

---

## 🚧 実装手順

### Phase 1実装手順

1. **データベースマイグレーション**
   - TrialHistoryテーブルに同期フィールド追加
   - マイグレーション実行・テスト

2. **TrialService更新**
   - 新規同期メソッド実装
   - 既存メソッドの同期処理更新
   - ユニットテスト追加

3. **認証ミドルウェア連携**
   - 期限切れ時のTrialHistory更新追加
   - 統合テスト実行

4. **Stripe連携強化**
   - ウェブフック処理にTrialHistory更新追加
   - Stripeテストアカウントでの動作確認

5. **動作確認・テスト**
   - 全体統合テスト
   - Firebase同期状況確認
   - ログ出力確認

### Phase 2実装手順

1. **BillingAnalyticsService作成**
   - 分析ロジック実装
   - データ取得・集計処理

2. **管理者API追加**
   - エンドポイント実装
   - 権限チェック確認

3. **フロントエンド連携**（オプション）
   - 管理画面での表示
   - レポート可視化

---

## 🔒 リスク管理・影響回避

### 既存機能への影響回避策

1. **User同期への影響なし**
   - User関連の同期処理は一切変更しない
   - TrialHistoryのみに変更を限定

2. **Stripe連携への影響最小化**
   - 既存のStripe処理は変更しない
   - 追加処理のみ実装（失敗しても既存処理は継続）

3. **認証フローへの影響最小化**
   - 既存の認証・期限切れ検知は変更しない
   - 追加のTrialHistory更新のみ実装

4. **Best Effort維持**
   - Firebase同期失敗でもSQL処理は継続
   - 既存のBest Effort設計を踏襲

### 失敗時の影響範囲

1. **Phase 1失敗時**
   - TrialHistory同期のみ影響
   - 既存の課金・認証・Stripe機能は正常動作継続

2. **Phase 2失敗時**
   - 分析機能のみ影響
   - 全ての既存機能は正常動作継続

### ロールバック計画

1. **データベースマイグレーション**
   - 追加フィールドは nullable のため安全にロールバック可能

2. **コード変更**
   - Git による差分管理でロールバック容易
   - 既存機能は無変更のため影響なし

---

## 📊 期待効果

### Phase 1完了後

1. **完全なトライアルライフサイクル追跡**
   - 開始 → 期限切れ → Pro移行 → キャンセル の全過程を記録

2. **Firebase同期完全性向上**
   - TrialHistory の全変更が Firebase に反映
   - 他モデルと統一的な同期パターン

3. **運用データ精度向上**
   - 正確なトライアル状況把握
   - サポート対応時の詳細情報提供

### Phase 2完了後

1. **データドリブンな意思決定**
   - トライアルコンバージョン率の把握
   - 課金収益の詳細分析

2. **プロダクト改善指標**
   - どの段階でユーザーが離脱するかの特定
   - 効果的なトライアル期間の検証

3. **ビジネス成長支援**
   - 収益予測の精度向上
   - 顧客獲得コスト最適化

---

**最終更新**: 2025-07-28  
**レビュー予定**: Phase 1実装完了後  
**承認**: 技術チームレビュー後に実装開始