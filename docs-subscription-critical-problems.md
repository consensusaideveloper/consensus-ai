# サブスクリプション実装の致命的問題

**発見日**: 2025-01-28
**問題**: キャンセル申請データ保存とステータス変更の設計不備

## 🚨 **致命的な問題**

### **問題1: キャンセル申請の記録なし**

**現在の実装**:
```typescript
// キャンセル時
await this.stripe.subscriptions.update(subscription.id, {
  cancel_at_period_end: true  // Stripeにのみ保存
});
// ローカルDBには何も記録されない
```

**データベーススキーマ確認**:
```sql
-- User テーブル
subscriptionStatus  String?  @default("free")  -- プラン状態のみ
-- ❌ キャンセル申請関連のフィールドが存在しない
-- ❌ cancel_at_period_end の状態を記録する場所がない
-- ❌ キャンセル申請日時を記録する場所がない
```

### **問題2: Webhook処理の混乱**

**現在のWebhook処理**:
```typescript
// customer.subscription.updated
if (subscription.status === 'canceled') {
  status = 'free';  // ❌ 期間中でも即座に変更？
}

// customer.subscription.deleted  
await TrialService.updateSubscriptionStatus(userId, 'cancelled', customer.id);
// ❌ なぜ'cancelled'？ 'free'にすべきでは？
```

### **問題3: 期間中の状態不明**

**現在の状況**:
- キャンセル申請: Stripeのみに記録
- 期間中: ローカルDBは `subscriptionStatus: 'pro'` のまま
- フロントエンド: キャンセル状態を把握する手段なし

## 🎯 **正しい設計のあるべき姿**

### **方針1: ローカルDBでのキャンセル状態管理**

#### データベーススキーマ拡張
```sql
-- User テーブルに追加すべきフィールド
subscriptionCancelRequested   Boolean?   @default(false)
subscriptionCancelRequestedAt DateTime?
subscriptionCancelEffectiveAt DateTime?  -- 実際の終了予定日
```

#### 実装フロー
```typescript
// 1. キャンセル時の処理
async cancelSubscription(userId: string) {
  // Stripe設定
  await this.stripe.subscriptions.update(subscription.id, {
    cancel_at_period_end: true
  });
  
  // ローカルDB更新
  await prisma.user.update({
    where: { id: userId },
    data: {
      subscriptionCancelRequested: true,
      subscriptionCancelRequestedAt: new Date(),
      subscriptionCancelEffectiveAt: new Date(subscription.current_period_end * 1000)
    }
  });
}

// 2. Webhook処理の修正
case 'customer.subscription.deleted':
  // 期間終了時のみここに到達
  await TrialService.updateSubscriptionStatus(userId, 'free', customer.id);
  await prisma.user.update({
    where: { id: userId },
    data: {
      subscriptionCancelRequested: false,
      subscriptionCancelRequestedAt: null,
      subscriptionCancelEffectiveAt: null
    }
  });
```

### **方針2: Stripe情報による判定（現実的）**

#### 現在のAPIを活用
```typescript
// フロントエンドでStripe情報取得
const subscriptionInfo = await fetch(`/api/billing/subscription-info/${userId}`);
const isCancelScheduled = subscriptionInfo.cancel_at_period_end === true;
```

#### メリット・デメリット
**メリット**:
- 追加のDB変更不要
- Stripeが唯一の真実源

**デメリット**:
- 追加API呼び出し必要
- Stripe障害時の影響

## 🔧 **検証すべき重要なポイント**

### **Stripeの実際の動作**
1. `cancel_at_period_end: true` 設定後の `subscription.status` の値
2. 期間中に `customer.subscription.updated` Webhook が発火するか
3. 期間終了時に発火するWebhookの種類（`updated` vs `deleted`）

### **現在の実装での確認**
```bash
# テスト環境で確認すべき項目
1. サブスクリプションキャンセル実行
2. Webhook ログの確認
3. 期間中のsubscription.statusの値
4. 期間終了時のWebhook内容
```

## 🚀 **推奨される対応順序**

### **Phase 1: 緊急調査**
1. **Stripe実際の動作確認**
2. **現在のWebhookログ分析**
3. **期間終了時の動作検証**

### **Phase 2: 実装修正**
**選択肢A**: ローカルDBでキャンセル状態管理（推奨）
**選択肢B**: Stripe情報による判定（現実的）

### **Phase 3: テスト・検証**
1. **キャンセル→期間中→期間終了の全フロー検証**
2. **UI表示の正確性確認**
3. **重複実行防止の確認**

---

**重要**: この設計問題が解決されるまで、フロントエンド修正だけでは根本解決にならない可能性が高い。