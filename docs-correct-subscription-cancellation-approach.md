# 正しいサブスクリプションキャンセル対応方針

## 🎯 現状の正確な理解

### ✅ バックエンド実装（正しい）
- キャンセル時: `cancel_at_period_end: true` 設定
- 期間中: DB `subscriptionStatus: 'pro'` 維持（サービス継続）
- 期間終了: Webhook で DB `subscriptionStatus: 'free'` 更新

### ❌ フロントエンド実装（問題）
- DB の `subscriptionStatus` のみ参照
- Stripe の `cancel_at_period_end` 情報を無視
- キャンセル済みでも `'pro'` = ボタン表示継続

## 🔧 正しい解決方針

### **方針**: UIレイヤーでの適切な状態管理

**要件**:
1. 期間中は `subscriptionStatus: 'pro'` 維持（変更禁止）
2. UI では「キャンセル済み・期間終了時停止予定」を明示
3. キャンセルボタンの重複実行を防止

### **実装アプローチ**

#### 1. `usePlanStatus` フック拡張

```typescript
// /client/src/hooks/usePlanStatus.ts
export function usePlanStatus(): PlanStatus | null {
  const { user } = useAuth();
  const [stripeInfo, setStripeInfo] = useState<any>(null);
  
  // Proユーザーの場合のみStripe情報取得
  useEffect(() => {
    if (user?.id && user.subscriptionStatus === 'pro') {
      fetch(`/api/billing/subscription-info/${user.id}`, {
        headers: { 'x-user-id': user.id }
      })
      .then(res => res.json())
      .then(data => setStripeInfo(data.subscription))
      .catch(err => console.error('Stripe info fetch failed:', err));
    }
  }, [user?.id, user?.subscriptionStatus]);
  
  return useMemo(() => {
    // 既存のロジック...
    
    // 新規追加: キャンセル状態判定
    const isCancelScheduled = stripeInfo?.cancel_at_period_end === true;
    const contractEndDate = stripeInfo?.current_period_end 
      ? new Date(stripeInfo.current_period_end * 1000) 
      : null;
    
    return {
      // 既存フィールド...
      subscriptionStatus,
      
      // 新規フィールド
      isCancelScheduled,
      contractEndDate,
      
      // 既存フィールド...
      displayInfo: {
        ...displayInfo,
        // キャンセル済みの場合はステータステキスト変更
        statusText: isCancelScheduled 
          ? `${displayInfo.statusText} (期間終了時停止予定)`
          : displayInfo.statusText
      }
    };
  }, [user, projects, stripeInfo, t]);
}
```

#### 2. キャンセルボタン表示条件の修正

```typescript
// /client/src/components/AccountSettings.tsx
{/* Cancel Subscription Button - 修正版 */}
{planStatus.subscriptionStatus === PLAN_TYPES.PRO && 
 !planStatus.isCancelScheduled && 
 onCancelClick && (
  <div className="mt-4 pt-4 border-t border-gray-200">
    <button onClick={onCancelClick}>
      {t('accountSettings.planStatus.cancelSubscription')}
    </button>
  </div>
)}

{/* キャンセル済み状態の表示 - 新規追加 */}
{planStatus.subscriptionStatus === PLAN_TYPES.PRO && 
 planStatus.isCancelScheduled && (
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
              `${formatDate(planStatus.contractEndDate)} に自動更新停止`
            }
          </p>
        </div>
      </div>
    </div>
  </div>
)}
```

#### 3. 翻訳文言の追加

```typescript
// /client/src/translations/pages/accountSettings.ts
planStatus: {
  // 既存...
  subscriptionCancelled: 'サブスクリプション停止予定',
  cancelledDescription: '{date} に自動更新が停止されます',
  contractEndsOn: '契約終了日',
}
```

## ✅ この方針のメリット

1. **データ整合性保持**
   - DB ステータスは変更せず、サービス継続を保証
   - 期間終了時の既存 Webhook 処理をそのまま活用

2. **正確な状態表示**
   - キャンセル済み状態をユーザーに明示
   - 契約終了日の明確な表示

3. **UX 向上**
   - 重複キャンセルの防止
   - 適切な期待値設定

4. **実装安全性**
   - 既存の正しいバックエンド処理に影響なし
   - フロントエンドの限定的な変更のみ

## 🔍 検証ポイント

- [ ] キャンセル実行後、ボタンが非表示になる
- [ ] 「停止予定」状態が明確に表示される
- [ ] 期間中はサービス利用可能（`subscriptionStatus: 'pro'`）
- [ ] 期間終了時に自動的に DB 更新される
- [ ] ページリロード後も状態が正しく表示される

## ⚠️ 注意事項

1. **API 呼び出し追加**
   - Pro ユーザーのみ Stripe 情報取得
   - パフォーマンス影響は軽微

2. **エラーハンドリング**
   - Stripe API 失敗時のフォールバック処理

3. **キャッシュ考慮**
   - 必要に応じて情報の更新タイミング調整

---

**結論**: 現在のバックエンド実装は正しく、フロントエンドでの適切な状態管理により問題解決が可能