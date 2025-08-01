# プロプラン契約中のアカウント削除処理 完全実装計画

**作成日**: 2025-07-28  
**対象**: プロプラン契約中ユーザーのアカウント削除処理におけるStripe連携不備の完全修正  
**優先度**: 高（データ整合性・課金処理に直結）

---

## 📋 現状分析サマリー

### ✅ 完全実装済み機能
- **フロントエンドUI**: AccountDeletionModal、成功・失敗UI完備
- **基本削除フロー**: 削除要求→30日猶予→物理削除の流れ
- **データベース同期**: SQLite ↔ Firebase 双方向同期
- **API Endpoints**: 削除関連の全エンドポイント実装
- **定期削除処理**: cron jobによる自動物理削除

### 🚨 重要な実装不備（修正必須）
1. **Stripe復旧処理の完全欠如** - 削除キャンセル時
2. **物理削除時のStripe完全削除不備** - customer/subscription残存
3. **エラーハンドリング不完全** - Stripe処理失敗時の整合性

### 📊 実装完成度: **85%**
基本機能は完全だが、**プロプラン契約者の削除処理において、Stripe側の整合性を保つ重要な処理が不足**

---

## 🎯 修正対象ファイル・処理

### 主要修正対象
- **`/server/src/services/accountDeletionService.ts`**
- **`/server/src/services/stripeService.ts`**
- **`/server/src/services/scheduledDeletionService.ts`**

### 関連確認対象
- `/server/src/routes/users.ts` - エラーハンドリング強化
- `/client/src/components/AccountDeletionModal.tsx` - エラー表示改善

---

## 🔧 詳細実装計画

### **Phase 1: Stripe復旧処理の完全実装** ⭐ 最優先

#### **1.1 StripeService新機能追加**

**新規メソッド追加**: `restoreSubscription(userId: string)`

```typescript
// /server/src/services/stripeService.ts への追加
async restoreSubscription(userId: string): Promise<{
  success: boolean;
  subscription?: any;
  error?: string;
}> {
  try {
    // 処理フロー:
    // 1. ユーザーのStripe customerを取得
    // 2. キャンセル済みサブスクリプションを検索
    // 3. cancel_at_period_end = false に設定
    // 4. サブスクリプション復旧処理
    // 5. 成功確認とレスポンス
  } catch (error) {
    // エラーハンドリングと詳細ログ
  }
}
```

**実装詳細**:
- `cancel_at_period_end: false` でサブスクリプション継続設定
- 元のプラン状態（pro/trial）の正確な復元
- Stripe API エラー時の詳細エラー情報収集

#### **1.2 AccountDeletionService修正**

**修正箇所**: `cancelDeletionRequest()` メソッド

```typescript
// 現在の実装に追加する処理
async cancelDeletionRequest(userId: string): Promise<{
  success: boolean;
  user?: any;
  stripeRestored?: boolean;
  error?: string;
}> {
  try {
    // 【既存処理】
    // - データベース状態リセット (isDeleted: false)
    // - Firebase同期
    // - フィードバックログ削除
    
    // 【新規追加処理】
    // 1. 削除申請時にキャンセルされたStripeサブスクリプションの復旧
    const stripeResult = await StripeService.restoreSubscription(userId);
    
    // 2. Stripe復旧失敗時の処理
    if (!stripeResult.success) {
      // 部分状態防止: データベース変更をロールバック
      // 詳細エラーログ記録
      // ユーザーへの分かりやすいエラーメッセージ
    }
    
    // 3. 完全成功時の統合レスポンス
    return {
      success: true,
      user: updatedUser,
      stripeRestored: stripeResult.success
    };
  } catch (error) {
    // 統合エラーハンドリング
  }
}
```

### **Phase 2: 物理削除時のStripe完全削除実装** 

#### **2.1 StripeService拡張**

**新規メソッド追加**: `deleteCustomerCompletely(customerId: string)`

```typescript
// /server/src/services/stripeService.ts への追加
async deleteCustomerCompletely(customerId: string): Promise<{
  success: boolean;
  deletedSubscriptions: string[];
  deletedCustomer: boolean;
  error?: string;
}> {
  try {
    // 処理フロー:
    // 1. customer配下の全subscriptions取得
    // 2. アクティブなsubscriptionsの完全削除
    // 3. Stripe customerの削除
    // 4. payment methodsの削除確認
    // 5. 削除確認とレスポンス生成
  } catch (error) {
    // 部分削除状態の詳細ログ記録
  }
}
```

#### **2.2 AccountDeletionService修正**

**修正箇所**: `executeAccountDeletion()` メソッド

```typescript
// 物理削除処理の最後に追加
async executeAccountDeletion(userId: string): Promise<{
  success: boolean;
  deletedData: {
    database: boolean;
    firebase: boolean;
    stripe: boolean;
  };
  error?: string;
}> {
  try {
    // 【既存処理】
    // - フィードバックログ更新
    // - Firebase削除
    // - SQLite削除
    // - Firebase Auth削除
    
    // 【新規追加処理】
    // 1. ユーザーのStripe customerID取得
    const stripeCustomerId = deletedUser.stripeCustomerId;
    
    // 2. Stripe完全削除処理実行
    if (stripeCustomerId) {
      const stripeResult = await StripeService.deleteCustomerCompletely(stripeCustomerId);
      
      if (!stripeResult.success) {
        // Stripe削除失敗のログ記録（継続処理）
        // 管理者向け通知システム呼び出し
      }
    }
    
    // 3. 統合結果レスポンス
    return {
      success: true,
      deletedData: {
        database: true,
        firebase: true,
        stripe: stripeResult?.success || false
      }
    };
  } catch (error) {
    // 統合エラーハンドリング
  }
}
```

### **Phase 3: エラーハンドリング・整合性強化**

#### **3.1 部分状態防止システム**

**実装箇所**: 全Stripe連携処理

- **原子性保証**: データベース更新とStripe処理の同期
- **ロールバック機能**: Stripe処理失敗時のデータベース状態復元
- **詳細ログシステム**: 部分状態発生時の詳細追跡

#### **3.2 ユーザー向けエラー表示改善**

**修正箇所**: AccountDeletionModal

- Stripe処理失敗時の分かりやすいエラーメッセージ
- 部分状態時の対処方法提示
- サポート連絡先の明示

---

## 📅 実装スケジュール

### **Week 1: Phase 1実装** （最優先）
- **Day 1-2**: StripeService.restoreSubscription() 実装
- **Day 3-4**: AccountDeletionService.cancelDeletionRequest() 修正
- **Day 5**: 統合テスト・デバッグ

### **Week 2: Phase 2実装**
- **Day 1-2**: StripeService.deleteCustomerCompletely() 実装
- **Day 3-4**: AccountDeletionService.executeAccountDeletion() 修正
- **Day 5**: 統合テスト・デバッグ

### **Week 3: Phase 3実装**
- **Day 1-3**: エラーハンドリング強化
- **Day 4-5**: UI改善・最終統合テスト

---

## 🧪 テスト計画

### **単体テスト**
- [ ] StripeService新規メソッドの全ケーステスト
- [ ] AccountDeletionService修正メソッドのテスト
- [ ] エラーケース網羅テスト

### **統合テスト**
- [ ] **シナリオ1**: プロプラン契約中→削除申請→キャンセル→復旧確認
- [ ] **シナリオ2**: プロプラン契約中→削除申請→30日経過→物理削除完了
- [ ] **シナリオ3**: Stripe接続エラー時の処理確認
- [ ] **シナリオ4**: 部分状態発生時のロールバック確認

### **本番環境テスト**
- [ ] Stripe Webhook連携確認
- [ ] 定期削除処理の動作確認
- [ ] パフォーマンス・負荷テスト

---

## ⚠️ リスク分析・対策

### **高リスク**
1. **Stripe API制限**: 削除・復旧処理の頻度制限
   - **対策**: レート制限監視、リトライ機構実装

2. **部分状態発生**: データベースとStripe間の不整合
   - **対策**: 原子性保証、詳細ログ、手動復旧手順準備

### **中リスク**
3. **課金継続リスク**: 削除後のStripe customerで課金継続
   - **対策**: 削除確認プロセス強化、監視アラート

4. **データ復旧困難**: 物理削除後のStripeデータ復旧不可
   - **対策**: 削除前の最終確認UI、管理者確認プロセス

---

## 📝 実装完了後のチェックリスト

### **機能確認**
- [ ] プロプラン契約中のアカウント削除申請が正常動作
- [ ] 30日猶予期間中のプラン機能継続利用確認
- [ ] 削除キャンセル時のStripeサブスクリプション完全復旧
- [ ] 物理削除時のStripe customer/subscription完全削除
- [ ] エラー時の適切なロールバック動作

### **整合性確認**
- [ ] SQLite ↔ Firebase ↔ Stripe の3者データ整合性
- [ ] 部分状態が発生しないことの確認
- [ ] エラーログの完全性・追跡可能性

### **ユーザー体験確認**
- [ ] エラー時の分かりやすいメッセージ表示
- [ ] 処理状況の透明性確保
- [ ] サポート情報の適切な提示

---

## 🎯 成功基準

1. **完全性**: プロプラン契約中のアカウント削除で、全関連データ（DB + Stripe）が確実に処理される
2. **整合性**: 削除キャンセル時に元の状態へ100%復旧できる
3. **信頼性**: Stripe処理失敗時も部分状態を発生させない
4. **可視性**: 全処理状況がログで追跡可能
5. **ユーザビリティ**: エラー時も適切なガイダンスを提供

**目標実装完成度**: **100%** (Stripe連携を含む完全実装)

---

**関連資料**:
- `sqlite-firebase-data-structure-analysis.md` - データ構造詳細
- `subscription-account-deletion-implementation-plan.md` - 基本削除機能分析

**実装責任者**: Claude Code  
**レビュー**: 実装完了後、全フローの動作確認必須