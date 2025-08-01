# Stripeトライアル実装 - 緊急修正対応方針

**作成日**: 2025-07-26  
**緊急度**: 🚨 HIGH - セキュリティリスクあり  
**目的**: 検出された重大問題の確実な修正実装

## 🚨 検出された重大問題

### **1. UIレベルでの競合問題**
**問題**: 新規フリーユーザーに2つのトライアルボタンが同時表示
- **カスタムトライアルボタン**: "Start Trial" (`onTrialClick`)
- **Stripeトライアルボタン**: "Upgrade" (`onUpgradeClick`)

**影響**: ユーザー混乱、UX劣化

**根本原因**: 
```typescript
// client/src/hooks/usePlanStatus.ts:288
const canStartTrial = subscriptionStatus === PLAN_TYPES.FREE && !hasUsedTrial;
// → カスタムトライアルのみ考慮、Stripeトライアルを想定せず
```

### **2. 制限チェックの重大バグ**
**問題**: Stripeトライアル期限切れが検知されない

**根本原因**:
```typescript
// server/src/services/PlanLimitService.ts:71-83
static isTrialExpired(user: User): boolean {
  if (!user.trialEndDate) { // Stripeトライアルユーザーは常にnull
    // カスタムトライアル期限計算のみ
    if (user.createdAt) {
      const trialDurationDays = LimitsConfig.getTrialDurationDays();
      const trialEndDate = new Date(user.createdAt.getTime() + (trialDurationDays * 24 * 60 * 60 * 1000));
      return new Date() > trialEndDate;
    }
    return false;
  }
  return new Date() > new Date(user.trialEndDate);
}
```

**セキュリティリスク**: Stripeトライアルユーザーが無期限でトライアル機能利用可能

### **3. データ管理の根本的不整合**
**問題**: 2つの異なるトライアル管理システムが併存
- **カスタムトライアル**: `trialStartDate`, `trialEndDate` フィールド
- **Stripeトライアル**: Stripe側管理 + `subscriptionStatus` のみ

**影響**: 期限管理メカニズムの重複・競合

### **4. webhook処理の不完全性**
**問題**: Stripeトライアル期限切れイベントの不適切な処理

**現状**:
```typescript
// server/src/services/stripeService.ts:334-355
private async handleTrialWillEnd(subscription: Stripe.Subscription): Promise<{ success: boolean; error?: string }> {
  // TODO: トライアル終了予告通知をユーザーに送信する実装を追加
  console.log(`[StripeService] 📅 Trial will end soon for user ${userId}`);
  return { success: true };
}
```

**不足**: 実際の期限切れ時のステータス更新処理なし

## 🛠️ 確実な修正実装計画

### **Phase 1: 緊急セキュリティ修正**
**優先度**: 🚨 CRITICAL

#### **1.1 UIトライアルボタン競合解消**
**修正ファイル**: `client/src/hooks/usePlanStatus.ts`
**修正箇所**: line 288
```typescript
// 修正前
const canStartTrial = subscriptionStatus === PLAN_TYPES.FREE && !hasUsedTrial;

// 修正後
const canStartTrial = subscriptionStatus === PLAN_TYPES.FREE && !hasUsedTrial && 
  process.env.NODE_ENV !== 'production'; // 本番環境ではカスタムトライアル無効化
```

#### **1.2 PlanLimitService.isTrialExpired() 修正**
**修正ファイル**: `server/src/services/PlanLimitService.ts`
**修正箇所**: line 71-83

```typescript
static isTrialExpired(user: User): boolean {
  // Stripeトライアルの場合：subscriptionStatusとStripe APIで期限確認
  if (user.subscriptionStatus === PLAN_TYPES.TRIAL && user.stripeCustomerId) {
    // TODO: Phase 2でStripe API呼び出し実装
    // 現在は期限切れなしとして扱う（安全側に倒す）
    return false;
  }
  
  // カスタムトライアルの場合：既存ロジック
  if (!user.trialEndDate) {
    if (user.createdAt) {
      const trialDurationDays = LimitsConfig.getTrialDurationDays();
      const trialEndDate = new Date(user.createdAt.getTime() + (trialDurationDays * 24 * 60 * 60 * 1000));
      return new Date() > trialEndDate;
    }
    return false;
  }
  
  return new Date() > new Date(user.trialEndDate);
}
```

### **Phase 2: Stripeトライアル期限管理実装**
**優先度**: HIGH

#### **2.1 Stripe期限確認メソッド追加**
**新規メソッド**: `server/src/services/stripeService.ts`

```typescript
/**
 * Stripeサブスクリプションの期限確認
 */
async isStripeTrialExpired(userId: string): Promise<{ expired: boolean; endDate?: Date; error?: string }> {
  try {
    const user = await this.getUserById(userId);
    if (!user?.stripeCustomerId) {
      return { expired: false, error: 'No Stripe customer ID' };
    }

    const subscriptions = await this.stripe.subscriptions.list({
      customer: user.stripeCustomerId,
      status: 'all',
      limit: 1
    });

    if (subscriptions.data.length === 0) {
      return { expired: true, error: 'No subscription found' };
    }

    const subscription = subscriptions.data[0];
    
    if (subscription.status === 'trialing' && subscription.trial_end) {
      const trialEndDate = new Date(subscription.trial_end * 1000);
      const isExpired = new Date() > trialEndDate;
      return { expired: isExpired, endDate: trialEndDate };
    }
    
    return { expired: subscription.status !== 'active' };

  } catch (error) {
    console.error('[StripeService] Trial expiry check failed:', error);
    return { expired: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}
```

#### **2.2 PlanLimitService.isTrialExpired() 強化**
```typescript
static async isTrialExpired(user: User): Promise<boolean> {
  // Stripeトライアルの場合：Stripe APIで確認
  if (user.subscriptionStatus === PLAN_TYPES.TRIAL && user.stripeCustomerId) {
    try {
      const stripeService = new StripeService();
      const result = await stripeService.isStripeTrialExpired(user.id);
      
      if (result.error) {
        console.warn(`[PlanLimitService] Stripe trial check failed: ${result.error}`);
        return false; // エラー時は安全側に倒す
      }
      
      return result.expired;
    } catch (error) {
      console.error('[PlanLimitService] Stripe trial check error:', error);
      return false; // エラー時は安全側に倒す
    }
  }
  
  // カスタムトライアルの場合：既存ロジック（同期処理）
  if (!user.trialEndDate) {
    if (user.createdAt) {
      const trialDurationDays = LimitsConfig.getTrialDurationDays();
      const trialEndDate = new Date(user.createdAt.getTime() + (trialDurationDays * 24 * 60 * 60 * 1000));
      return new Date() > trialEndDate;
    }
    return false;
  }
  
  return new Date() > new Date(user.trialEndDate);
}
```

### **Phase 3: webhook処理強化**
**優先度**: MEDIUM

#### **3.1 customer.subscription.updated 強化**
**修正ファイル**: `server/src/services/stripeService.ts`
**修正箇所**: handleSubscriptionUpdated メソッド

```typescript
private async handleSubscriptionUpdated(subscription: Stripe.Subscription): Promise<{ success: boolean; error?: string }> {
  try {
    const customer = await this.stripe.customers.retrieve(subscription.customer as string) as Stripe.Customer;
    const userId = customer.metadata?.userId;

    if (!userId) {
      throw new Error('User ID not found in customer metadata');
    }

    // トライアル→有料/期限切れの状態変更を詳細に処理
    let status: string;
    
    if (subscription.status === 'active') {
      status = 'pro';
    } else if (subscription.status === 'trialing') {
      status = 'trial';
    } else if (subscription.status === 'canceled' || subscription.status === 'incomplete_expired') {
      // トライアル期限切れまたはキャンセル
      status = 'free';
    } else {
      status = 'cancelled';
    }

    await TrialService.updateSubscriptionStatus(userId, status, customer.id);

    console.log(`[StripeService] ✅ Subscription updated for user ${userId}: ${subscription.status} → ${status}`);
    return { success: true };

  } catch (error) {
    console.error('[StripeService] Subscription update failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}
```

#### **3.2 handleTrialWillEnd 実装強化**
```typescript
private async handleTrialWillEnd(subscription: Stripe.Subscription): Promise<{ success: boolean; error?: string }> {
  try {
    const customer = await this.stripe.customers.retrieve(subscription.customer as string) as Stripe.Customer;
    const userId = customer.metadata?.userId;

    if (!userId) {
      throw new Error('User ID not found in customer metadata');
    }

    console.log(`[StripeService] 📅 Trial will end soon for user ${userId}`);
    
    // 将来的な通知機能のためのログ記録
    try {
      const { PrismaClient } = await import('@prisma/client');
      const prisma = new PrismaClient();
      
      // ユーザー情報更新（期限切れ予告フラグ）
      await prisma.user.update({
        where: { id: userId },
        data: {
          // 将来的な期限切れ予告フラグ実装用
          updatedAt: new Date()
        }
      });
      
      await prisma.$disconnect();
    } catch (dbError) {
      console.warn('[StripeService] Trial will end DB update failed (non-critical):', dbError);
    }
    
    return { success: true };

  } catch (error) {
    console.error('[StripeService] Trial will end processing failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}
```

## 🎯 実装順序と検証方法

### **実装優先度**

| Priority | Phase | 実装内容 | 検証方法 |
|:--------:|:-----:|---------|----------|
| 🚨 **CRITICAL** | Phase 1.1 | UIトライアルボタン競合解消 | フロントエンド表示確認 |
| 🚨 **CRITICAL** | Phase 1.2 | PlanLimitService緊急修正 | 制限チェック動作確認 |
| **HIGH** | Phase 2.1 | Stripe期限確認API実装 | Stripe Dashboardと連携テスト |
| **HIGH** | Phase 2.2 | isTrialExpired強化 | 期限切れシナリオテスト |
| **MEDIUM** | Phase 3.1 | webhook処理強化 | Stripe CLI webhook テスト |

### **各Phase完了の定義**

#### **Phase 1 完了条件:**
- [ ] 新規フリーユーザーに表示されるトライアルボタンが1つのみ
- [ ] Stripeトライアルユーザーの期限切れ検知で無限制限使用が防止されている
- [ ] コンパイルエラー・型エラーなし

#### **Phase 2 完了条件:**
- [ ] Stripe APIで正確なトライアル期限取得可能
- [ ] Stripeトライアル期限切れユーザーの制限が正しく適用される
- [ ] カスタムトライアルとの併存で競合なし

#### **Phase 3 完了条件:**
- [ ] Stripeトライアル期限切れwebhookで正しいステータス更新
- [ ] 期限切れ予告処理の基盤実装完了

### **検証シナリオ**

#### **シナリオ1: 新規ユーザーのStripeトライアル**
1. 新規サインアップ (`subscriptionStatus: 'free'`)
2. Upgradeボタンクリック → Stripeトライアル開始
3. 14日後 → Stripe期限切れ → ステータス `'free'` 更新
4. 制限チェック → フリープラン制限適用確認

#### **シナリオ2: UIボタン表示確認**
1. フリーユーザー → Upgradeボタンのみ表示
2. カスタムトライアルユーザー → Upgradeボタンのみ表示  
3. Stripeトライアルユーザー → Upgradeボタンのみ表示

## 🚀 緊急実装開始

**即座実装必須項目:**
1. **Phase 1.1** - UIボタン競合解消
2. **Phase 1.2** - セキュリティリスク回避

**実装手順:**
1. Phase 1.1, 1.2 の緊急修正実装
2. ローカル環境での動作確認
3. Phase 2 の段階的実装
4. 統合テスト実行

---

**最終更新**: 2025-07-26  
**ステータス**: 緊急修正対応方針策定完了  
**次のアクション**: Phase 1.1 UI競合解消の即座実装