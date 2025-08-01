# サブスクリプション終了検知の重大な問題

**発見日**: 2025-01-28  
**問題**: サブスクリプション終了時のステータス変更検知に根本的な設計問題

## 🚨 現在の実装の深刻な矛盾

### **Webhook処理の矛盾**

#### 1. `customer.subscription.updated` 処理（期間中の変更）
```typescript
// /server/src/services/stripeService.ts:259-261
} else if (subscription.status === 'canceled' || subscription.status === 'incomplete_expired') {
  // トライアル期限切れまたはキャンセル
  status = 'free';  // ❌ cancel_at_period_end=true でも即座に'free'に変更！
}
```

#### 2. `customer.subscription.deleted` 処理（完全削除時）
```typescript
// /server/src/services/stripeService.ts:372
await TrialService.updateSubscriptionStatus(userId, 'cancelled', customer.id);
```

## 🔍 **根本的な問題**

### **問題1: cancel_at_period_end の誤解**

**現在の実装の誤った前提**:
- `cancel_at_period_end: true` 設定時、Stripe はすぐに `subscription.status = 'canceled'` にする
- しかし実際は **期間終了まで `status = 'active'` のまま**

**Stripe の実際の動作**:
1. `cancel_at_period_end: true` 設定
2. 期間中: `status = 'active'`, `cancel_at_period_end = true`
3. 期間終了: `customer.subscription.deleted` Webhook 発火（`updated` ではない）

### **問題2: 期間中のステータス変更**

**現在のコード**:
```typescript
if (subscription.status === 'canceled') {
  status = 'free';  // ❌ 期間中でも'free'に変更してしまう
}
```

**正しい期待動作**:
- 期間中: `status = 'active'` → DB `subscriptionStatus = 'pro'` 維持
- 期間終了: `customer.subscription.deleted` → DB `subscriptionStatus = 'free'`

## 🎯 **正しい実装のあるべき姿**

### **Stripe の正しいWebhookフロー**

#### シナリオ1: 通常キャンセル
1. **キャンセル時**: `cancel_at_period_end: true` 設定
2. **期間中**: `customer.subscription.updated` でも `status = 'active'` のまま
3. **期間終了**: `customer.subscription.deleted` Webhook で削除処理

#### シナリオ2: 即座キャンセル
1. **即座キャンセル**: `subscription.cancel()` 実行
2. **即座**: `customer.subscription.deleted` Webhook で削除処理

### **修正すべきコード**

#### 1. `handleSubscriptionUpdated` の修正
```typescript
// 現在（❌ 間違い）
if (subscription.status === 'canceled') {
  status = 'free';
}

// 正しい実装（✅）
if (subscription.status === 'active') {
  // cancel_at_period_end の状態に関わらず、activeなら'pro'
  status = 'pro';  
} else if (subscription.status === 'trialing') {
  status = 'trial';
} else if (subscription.status === 'canceled') {
  // 即座キャンセルの場合のみここに到達
  status = 'free';
}
```

#### 2. `handleSubscriptionDeleted` の修正
```typescript
// 期間終了・完全削除時の処理
await TrialService.updateSubscriptionStatus(userId, 'free', customer.id);
// 'cancelled' → 'free' に変更
```

## 🔧 **検証方法**

### **Stripe Dashboard での確認**
1. `cancel_at_period_end: true` のサブスクリプション状態確認
2. 期間中の `subscription.status` の値確認
3. Webhook イベントログの確認

### **実装での確認ポイント**
- [ ] `cancel_at_period_end: true` 設定後の Webhook 内容
- [ ] 期間中の `subscription.status` の実際の値
- [ ] 期間終了時に発火する Webhook の種類（`updated` vs `deleted`）

## ⚠️ **現在の影響**

### **問題のあるシナリオ**
1. ユーザーがキャンセル実行
2. `cancel_at_period_end: true` 設定
3. **もし `subscription.status` が `'canceled'` になったら**
4. `customer.subscription.updated` で `status = 'free'` に変更
5. 期間中なのにサービス停止

### **検証が必要**
- 実際の Stripe の動作確認
- 現在の実装での Webhook ログ確認
- テスト環境での動作検証

## 🚀 **次のアクション**

1. **Stripe の実際の動作確認**
2. **Webhook ログの詳細確認**
3. **必要に応じて Webhook 処理の修正**
4. **テスト環境での検証**

---

**重要**: この問題が確認されるまで、フロントエンド修正のみでは根本解決にならない可能性があります。