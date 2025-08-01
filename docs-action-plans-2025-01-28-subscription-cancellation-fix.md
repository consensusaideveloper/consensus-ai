# サブスクリプションキャンセル問題 - 技術調査報告書・対応方針

**作成日**: 2025-01-28  
**対象問題**: サブスクリプションキャンセル後もキャンセルボタンが表示され続ける問題

## 📋 問題の概要

ユーザーがプロプランのサブスクリプションをキャンセルしても、マイアカウント画面のプラン・使用状況セクションでサブスクリプションキャンセルボタンが何度でも実行できる状態になっている。

## 🔍 技術調査結果

### 現在の実装フロー

1. **フロントエンド**: キャンセルボタン押下
   - `SubscriptionCancellationModal` 表示
   - `/api/billing/cancel-subscription` API呼び出し
   - 成功時: `window.location.reload()` でページリロード

2. **バックエンド**: APIエンドポイント処理
   - `stripeService.cancelSubscription(userId)` 呼び出し
   - Stripeで `cancel_at_period_end: true` 設定
   - **正常**: ローカルDBのステータス更新なし（期間中はサービス継続のため）

3. **フロントエンド**: リロード後の表示
   - `usePlanStatus` フックが `user.subscriptionStatus` を確認
   - 正常に `'pro'` だが、Stripe のキャンセル状態を把握していない

### 根本原因の特定

#### 🎯 **主要原因**: フロントエンドがStripeキャンセル状態を把握していない

| 項目 | 現在の実装 | 正しい状態 |
|------|------------|--------|
| **Stripe状態** | `cancel_at_period_end: true` | ✅ 正常（自動更新停止予約済み） |
| **ローカルDB** | `subscriptionStatus: 'pro'` | ✅ 正常（期間中はサービス継続） |
| **フロントエンド** | `usePlanStatus` → `'pro'` のみ | ❌ キャンセル予約状態を認識できない |
| **UI表示** | キャンセルボタン表示 | ❌ 何度でも押下可能 |

#### 🔧 **技術的詳細**

1. **`/server/src/services/stripeService.ts:571`**
   ```typescript
   await this.stripe.subscriptions.update(subscription.id, {
     cancel_at_period_end: true  // ✅ 正常（自動更新停止）
   });
   ```

2. **`/server/src/routes/billing.ts:257`**
   ```typescript
   const result = await stripeService.cancelSubscription(userId);
   // ✅ 正常（期間中はDBステータス変更すべきでない）
   ```

3. **`/client/src/hooks/usePlanStatus.ts:262`**
   ```typescript
   const subscriptionStatus = (user as any).subscriptionStatus || PLAN_TYPES.FREE;
   // ❌ Stripe情報(`cancel_at_period_end`)を考慮していない
   ```

4. **`/client/src/components/AccountSettings.tsx:キャンセルボタン表示条件`**
   ```typescript
   {planStatus.subscriptionStatus === PLAN_TYPES.PRO && onCancelClick && (
   // ❌ DBの'pro'ステータスのみで判定、キャンセル予約状態は考慮なし
   ```

### 設計理解の重要なポイント

#### 📊 **サブスクリプションキャンセルの正しい概念**
- **キャンセル = 自動更新の停止**（サービス停止ではない）
- 契約期間中はサービス継続（`subscriptionStatus: 'pro'` 維持が正しい）
- 期間終了時に初めてステータス変更（Webhook経由）

#### 💡 **現在の実装の正しさ**
- ✅ Stripe: `cancel_at_period_end: true` 設定
- ✅ DB: 期間中は `'pro'` ステータス維持
- ✅ Webhook: 期間終了時の自動ステータス切り替え
- ❌ UI: キャンセル予約状態の表示不備

## 🎯 対応方針

### **方針1: フロントエンド改善（推奨・緊急対応）**

**概要**: 既存のStripe情報取得APIを活用してキャンセル状態を表示

**基本原則**:
1. **DBステータス変更禁止** - 期間中は `subscriptionStatus: 'pro'` 維持必須
2. **Stripe情報に基づくUI制御** - `cancel_at_period_end` によるボタン制御
3. **Webhook処理は後で修正** - まずはUI問題を解決

#### 実装ステップ

1. **`usePlanStatus` フック拡張**
   ```typescript
   // /client/src/hooks/usePlanStatus.ts
   import { useState, useEffect } from 'react';
   
   export function usePlanStatus(): PlanStatus | null {
     const { user } = useAuth();
     const { projects } = useProjects();
     const { t } = useLanguage();
     const [stripeInfo, setStripeInfo] = useState<any>(null);
     const [isLoadingStripe, setIsLoadingStripe] = useState(false);
     
     // Proユーザーの場合のみStripe情報取得
     useEffect(() => {
       if (user?.id && user.subscriptionStatus === 'pro') {
         setIsLoadingStripe(true);
         fetch(`/api/billing/subscription-info/${user.id}`, {
           headers: { 'x-user-id': user.id }
         })
         .then(res => res.json())
         .then(data => {
           if (data.success) {
             setStripeInfo(data.subscription);
           }
         })
         .catch(err => console.error('Stripe info fetch failed:', err))
         .finally(() => setIsLoadingStripe(false));
       } else {
         setStripeInfo(null);
       }
     }, [user?.id, user?.subscriptionStatus]);
     
     return useMemo(() => {
       if (!user) return null;
       
       // 基本プラン情報
       const subscriptionStatus = (user as any).subscriptionStatus || PLAN_TYPES.FREE;
       
       // 既存のロジック...
       const trialDaysRemaining = calculateTrialDaysRemaining((user as any).trialEndDate);
       const isTrialActive = subscriptionStatus === PLAN_TYPES.TRIAL && (trialDaysRemaining === null || trialDaysRemaining > 0);
       const limits = getPlanLimits(subscriptionStatus);
       
       // 使用状況計算（既存のまま）
       const projectsUsed = projects?.length || 0;
       const analysesUsed = projects?.filter(project => project.isAnalyzed).length || 0;
       const opinionsUsed = projects?.reduce((total, project) => total + (project.opinionsCount || 0), 0) || 0;
       
       const usage = {
         projects: calculateUsage(projectsUsed, limits.projects),
         analyses: calculateUsage(analysesUsed, limits.analysesTotal),
         opinions: calculateUsage(opinionsUsed, limits.opinionsPerProject)
       };
       
       // 新規追加: キャンセル状態判定
       const isCancelScheduled = stripeInfo?.cancel_at_period_end === true;
       const contractEndDate = stripeInfo?.current_period_end 
         ? new Date(stripeInfo.current_period_end * 1000) 
         : null;
       
       // 表示用情報生成（既存のまま）
       const displayInfo = generateDisplayInfo(subscriptionStatus, trialDaysRemaining, usage, t);
       
       return {
         subscriptionStatus: subscriptionStatus as PlanStatus['subscriptionStatus'],
         isTrialActive,
         trialDaysRemaining,
         hasUsedTrial: (user as any)?.trialStartDate != null,
         canStartTrial: false,
         trialEndDate: (user as any).trialEndDate || null,
         nextBillingDate: calculateNextBillingDate(user),
         usage,
         limits,
         displayInfo,
         
         // 新規フィールド
         isCancelScheduled,
         contractEndDate,
         isLoadingStripe
       };
     }, [user, projects, stripeInfo, isLoadingStripe, t]);
   }
   ```

2. **PlanStatus型定義の拡張**
   ```typescript
   // /client/src/hooks/usePlanStatus.ts
   export interface PlanStatus {
     // 既存フィールド...
     subscriptionStatus: PlanType;
     // ... 他の既存フィールド
     
     // 新規フィールド
     isCancelScheduled?: boolean;
     contractEndDate?: Date | null;
     isLoadingStripe?: boolean;
   }
   ```

3. **キャンセルボタン表示条件の修正**
   ```typescript
   // /client/src/components/AccountSettings.tsx
   {/* キャンセルボタン - 修正版 */}
   {planStatus.subscriptionStatus === PLAN_TYPES.PRO && 
    !planStatus.isCancelScheduled && 
    !planStatus.isLoadingStripe &&
    onCancelClick && (
     <div className="mt-4 pt-4 border-t border-gray-200">
       <button
         onClick={onCancelClick}
         className="w-full py-2 px-4 text-sm text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg transition-all duration-200 flex items-center justify-center"
       >
         <AlertTriangle className="h-4 w-4 mr-2" />
         {t('accountSettings.planStatus.cancelSubscription')}
       </button>
     </div>
   )}
   
   {/* ローディング表示 */}
   {planStatus.subscriptionStatus === PLAN_TYPES.PRO && 
    planStatus.isLoadingStripe && (
     <div className="mt-4 pt-4 border-t border-gray-200">
       <div className="text-center text-sm text-gray-500">
         サブスクリプション情報を確認中...
       </div>
     </div>
   )}
   
   {/* キャンセル済み状態の表示 - 新規追加 */}
   {planStatus.subscriptionStatus === PLAN_TYPES.PRO && 
    planStatus.isCancelScheduled && 
    !planStatus.isLoadingStripe && (
     <div className="mt-4 pt-4 border-t border-gray-200">
       <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
         <div className="flex items-center">
           <AlertTriangle className="h-4 w-4 text-yellow-600 mr-2" />
           <div className="text-sm">
             <p className="font-medium text-yellow-800">
               サブスクリプション停止予定
             </p>
             <p className="text-yellow-700">
               {planStatus.contractEndDate && 
                 `${planStatus.contractEndDate.toLocaleDateString('ja-JP', {
                   year: 'numeric', month: 'long', day: 'numeric'
                 })} に自動更新停止`
               }
             </p>
           </div>
         </div>
       </div>
     </div>
   )}
   ```

### **方針2: バックエンドWebhook処理の修正（根本解決）**

**概要**: Webhook処理の問題を修正して、正しいステータス管理を実現

#### 修正すべき問題

1. **handleSubscriptionUpdated の修正**
   ```typescript
   // 現在（❌）
   } else if (subscription.status === 'canceled') {
     status = 'free';  // 期間中でも即座に'free'に変更
   }
   
   // 修正後（✅）
   } else if (subscription.status === 'canceled') {
     // cancel_at_period_end: trueの場合、期間中はactiveのまま
     // このケースは即座キャンセルの場合のみ
     status = 'free';
   }
   ```

2. **handleSubscriptionDeleted の修正**
   ```typescript
   // 現在（❌）
   await TrialService.updateSubscriptionStatus(userId, 'cancelled', customer.id);
   
   // 修正後（✅）
   await TrialService.updateSubscriptionStatus(userId, 'free', customer.id);
   ```

### **方針3: ハイブリッド実装（完全解決）**

**Phase 1**: 方針1の実装（緊急対応）
**Phase 2**: 方針2の実装（根本解決）
**Phase 3**: 統合テスト・検証

## 🚀 実装計画

### 実装対象ファイル

**必須変更ファイル**:
- `/client/src/hooks/usePlanStatus.ts` - Stripe情報取得・キャンセル状態判定
- `/client/src/components/AccountSettings.tsx` - UI条件分岐修正
- `/client/src/translations/pages/accountSettings.ts` - 翻訳文言追加

**影響なしファイル**:
- バックエンドファイル（現在の実装は正しい）
- DBスキーマ（変更不要）
- Webhook処理（現在の実装は正しい）

**所要時間**: 4-6時間

**優先度**: 高（UX改善・重複実行防止のため）

## 🧪 テスト計画

### 機能テスト
- [ ] `usePlanStatus` フックの `isCancelScheduled` 判定が正しく動作
- [ ] キャンセルボタン表示/非表示条件が適切に機能
- [ ] キャンセル済み状態表示が正しく表示される
- [ ] 契約終了日が正確に表示される

### 統合テスト
- [ ] キャンセル実行 → UI更新フロー（ボタン非表示・状態表示）
- [ ] ページリロード後のキャンセル状態維持
- [ ] 複数回キャンセル押下の完全防止
- [ ] 期間中の `subscriptionStatus: 'pro'` 維持確認

### ユーザーシナリオテスト
- [ ] プロユーザーによるキャンセル操作
- [ ] キャンセル後のサービス継続確認（期間中）
- [ ] 契約期間終了後の自動ステータス切り替え確認

## 📊 成功指標

- ✅ **重複実行防止**: キャンセル実行後、ボタンが非表示になる
- ✅ **状態明示**: 「停止予定・契約終了日」が明確に表示される
- ✅ **サービス継続**: 期間中は `subscriptionStatus: 'pro'` でサービス利用可能
- ✅ **自動切り替え**: 期間終了時にWebhookで適切にステータス変更
- ✅ **UX向上**: ユーザーの混乱解消

## ⚠️ リスク評価

| リスク | 影響度 | 対策 |
|--------|--------|------|
| Stripe API呼び出し増加 | 低 | Proユーザーのみ・必要時のみ実行 |
| フロントエンド複雑化 | 低 | 明確なコメント・適切なテスト |
| キャッシュ同期問題 | 低 | エラーハンドリング・フォールバック実装 |

## 🔄 実装ステップ

1. **`usePlanStatus` フック拡張**: Stripe情報取得・状態判定ロジック
2. **UI条件分岐修正**: ボタン制御・状態表示の実装
3. **翻訳文言追加**: キャンセル関連の適切な日英文言
4. **テスト実行**: 機能・統合・ユーザーシナリオテスト
5. **本番デプロイ**: 段階的リリース・監視

---

## 📋 まとめ

### 🔍 **問題の本質**
サブスクリプションキャンセル = 自動更新停止（サービス停止ではない）という正しい概念を、UIレイヤーで適切に表現できていない

### ✅ **現在の実装状況**
- **バックエンド**: 完璧（`cancel_at_period_end: true` + 期間中ステータス維持）
- **フロントエンド**: 改善必要（Stripe状態の考慮不足）

### 🎯 **解決方針**
**UIレイヤーでのキャンセル状態表示改善**のみが正しいアプローチ
- DBステータス変更は期間中のサービス継続を阻害するため禁止
- Stripe の `cancel_at_period_end` 情報に基づくUI制御
- 既存のWebhook処理による期間終了時の自動切り替え活用

---

**担当**: 開発チーム  
**完了予定**: 4-6時間での実装完了  
**重要度**: 高（UX改善・重複実行防止）