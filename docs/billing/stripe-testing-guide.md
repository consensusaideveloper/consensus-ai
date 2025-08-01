# Stripe決済テスト完全ガイド

## 📋 概要
このガイドでは、Stripeの公式テストカードを使用した包括的なテスト手順を説明します。  
参考: [Stripe Testing Documentation](https://docs.stripe.com/testing#cards)

## 🎯 テストの基本原則

### ✅ テストで使用すべきもの
- **テスト用APIキー**: `sk_test_...` / `pk_test_...`
- **専用テストカード番号**: Stripeが提供する特殊な番号
- **テスト環境**: 本番環境と完全に分離

### ❌ テストで使用してはいけないもの
- **実際のカード番号**: セキュリティリスクとなる
- **本番APIキー**: `sk_live_...` / `pk_live_...`
- **実際の顧客情報**: プライバシー保護のため

## 💳 Stripeテストカード一覧

### 🏆 基本成功パターン

| カードブランド | カード番号 | 説明 | 推奨利用シーン |
|---|---|---|---|
| **Visa** | `4242 4242 4242 4242` | 最も基本的なテストカード | 初回テスト・基本動作確認 |
| **Visa (debit)** | `4000 0566 5566 5556` | デビットカード | 決済タイプの区別テスト |
| **Mastercard** | `5555 5555 5555 4444` | Mastercard標準 | ブランド対応確認 |
| **Mastercard (debit)** | `5200 8282 8282 8210` | Mastercardデビット | デビット処理の確認 |
| **Mastercard (prepaid)** | `5105 1051 0510 5100` | プリペイドカード | プリペイド処理の確認 |
| **American Express** | `3782 822463 10005` | AMEX標準 | 4桁CVC対応の確認 |
| **American Express** | `3714 496353 98431` | AMEX代替 | AMEX複数パターン |
| **Discover** | `6011 1111 1111 1117` | Discover標準 | Discover対応確認 |
| **Diners Club** | `3056 9300 0902 0004` | Diners Club | 特殊ブランド対応 |
| **JCB** | `3566 0020 2036 0505` | JCB標準 | 日本向けサービステスト |

**共通設定:**
- **有効期限**: 任意の未来の日付（例：`12/34`, `01/30`）
- **CVC**: 任意の数字（Visa/MC/Discover: 3桁、AMEX: 4桁）
- **名前**: 任意の名前（例：`Test User`）
- **郵便番号**: 任意（例：`12345`, `90210`）

### ❌ エラーシナリオテストカード

#### 決済拒否パターン
| エラータイプ | カード番号 | レスポンス | テスト目的 |
|---|---|---|---|
| **一般的な拒否** | `4000 0000 0000 0002` | `generic_decline` | 基本的なエラーハンドリング |
| **残高不足** | `4000 0000 0000 9995` | `insufficient_funds` | 残高不足時の処理 |
| **紛失・盗難カード** | `4000 0000 0000 9987` | `lost_card` | セキュリティ関連拒否 |
| **盗難カード** | `4000 0000 0000 9979` | `stolen_card` | 盗難カード検出 |
| **期限切れカード** | `4000 0000 0000 0069` | `expired_card` | カード期限エラー |
| **不正カード** | `4000 0000 0000 0259` | `incorrect_number` | カード番号エラー |
| **CVCエラー** | `4000 0000 0000 0127` | `incorrect_cvc` | CVC検証失敗 |
| **処理エラー** | `4000 0000 0000 0119` | `processing_error` | システムエラー |
| **発行者拒否** | `4000 0000 0000 0101` | `issuer_not_available` | 発行者側エラー |

#### 不正検知・リスク管理
| シナリオ | カード番号 | 説明 |
|---|---|---|
| **不正疑い（高リスク）** | `4100 0000 0000 0019` | 不正な取引として拒否 |
| **不正疑い（要確認）** | `4000 0000 0000 0010` | 追加確認が必要 |
| **リスク評価（中）** | `4000 0000 0000 0036` | 中リスクとして分類 |

### 🔐 3D Secure (SCA) 認証テスト

#### Strong Customer Authentication (SCA) 対応
| シナリオ | カード番号 | 動作 | テスト内容 |
|---|---|---|---|
| **3DS認証必須** | `4000 0025 0000 3155` | 認証画面表示 | 基本的な3DS フロー |
| **3DS認証（失敗）** | `4000 0000 0000 9987` | 認証失敗 | 認証失敗時の処理 |
| **3DS非対応** | `4000 0000 0000 3220` | 認証不可 | 古いカードのシミュレート |
| **3DS2認証** | `4000 0027 6000 0016` | 3DS 2.0対応 | 最新認証規格 |

**3D Secure テスト手順:**
1. 上記テストカードで決済実行
2. 認証画面が表示される
3. **「Complete authentication」** をクリック
4. 認証完了後、決済処理が継続される

### 🌍 国際カード・地域別テスト

#### ヨーロッパ
| 国 | カード番号 | 特徴 |
|---|---|---|
| **英国** | `4000 0082 6000 0000` | GBP通貨、SCA対応 |
| **フランス** | `4000 0025 0000 0003` | EUR通貨、Carte Bleue |
| **ドイツ** | `4000 0027 6000 0016` | EUR通貨、3DS 2.0 |
| **オランダ** | `4000 0052 8000 0008` | EUR通貨、iDEAL対応 |

#### アジア太平洋
| 国 | カード番号 | 特徴 |
|---|---|---|
| **日本** | `4000 0039 2000 0003` | JPY通貨、JCB支持 |
| **シンガポール** | `4000 0070 2000 0007` | SGD通貨 |
| **オーストラリア** | `4000 0036 0000 0006` | AUD通貨 |
| **香港** | `4000 0034 4000 0004` | HKD通貨 |

#### 北米
| 国 | カード番号 | 特徴 |
|---|---|---|
| **カナダ** | `4000 0012 4000 0000` | CAD通貨 |
| **米国** | `4242 4242 4242 4242` | USD通貨（標準） |

### 💰 支払い方法別テスト

#### サブスクリプション特化
| 用途 | カード番号 | 説明 |
|---|---|---|
| **即座に失敗** | `4000 0000 0000 0341` | 初回請求で失敗 |
| **2回目で失敗** | `4000 0000 0000 0259` | 継続課金で失敗 |
| **ダンニング管理** | `4000 0000 0000 0077` | 支払い再試行テスト |

#### ワンタイム決済
| 用途 | カード番号 | 説明 |
|---|---|---|
| **高額決済** | `4242 4242 4242 4242` | 標準カード（金額制限なし） |
| **小額決済** | `4000 0566 5566 5556` | デビットカード |

## 🧪 実践的テストシナリオ

### シナリオ1: 基本的な決済成功フロー
```bash
# 使用カード: 4242 4242 4242 4242
# 期待結果: 決済成功、ユーザープラン更新
```

### シナリオ2: エラーハンドリング確認
```bash
# 使用カード: 4000 0000 0000 0002
# 期待結果: エラーメッセージ表示、プラン変更なし
```

### シナリオ3: 3D Secure認証フロー
```bash
# 使用カード: 4000 0025 0000 3155
# 期待結果: 認証画面表示 → 認証完了 → 決済成功
```

### シナリオ4: 国際カード決済
```bash
# 使用カード: 4000 0039 2000 0003 (日本)
# 期待結果: 日本発行カードとして処理
```

## 🔄 自動テストスクリプト例

### 基本テストスクリプト
```bash
#!/bin/bash
# ConsensusAI Stripe Test Suite

# テスト設定
USER_ID="test-user-id"
PRICE_ID="price_test_xxxxx"
BASE_URL="http://localhost:3001"

# テストカード配列
declare -a TEST_CARDS=(
    "4242424242424242:success:Basic Visa Test"
    "4000000000000002:decline:Generic Decline"
    "4000000000009995:decline:Insufficient Funds"
    "4000002500003155:3ds:3D Secure Required"
)

echo "🧪 ConsensusAI Stripe Test Suite"
echo "================================="

for card_info in "${TEST_CARDS[@]}"; do
    IFS=':' read -r card expected description <<< "$card_info"
    
    echo -e "\n📋 Testing: $description"
    echo "💳 Card: $card"
    echo "🎯 Expected: $expected"
    
    # APIテスト実行（実装により調整）
    # curl -X POST $BASE_URL/api/billing/test-payment \
    #   -H "Content-Type: application/json" \
    #   -d "{'cardNumber': '$card', 'userId': '$USER_ID'}"
    
    echo "✅ Test completed"
    sleep 1
done

echo -e "\n🎉 All tests completed!"
```

### PaymentIntent テストスクリプト
```javascript
// Node.js テストスクリプト例
const stripe = require('stripe')('sk_test_...');

const testCards = [
  { number: '4242424242424242', expected: 'success' },
  { number: '4000000000000002', expected: 'decline' },
  { number: '4000002500003155', expected: '3ds_required' }
];

async function runTests() {
  console.log('🧪 Stripe PaymentIntent Tests');
  
  for (const card of testCards) {
    try {
      const paymentIntent = await stripe.paymentIntents.create({
        amount: 2000, // $20.00
        currency: 'usd',
        payment_method_data: {
          type: 'card',
          card: { number: card.number, exp_month: 12, exp_year: 2034, cvc: '123' }
        },
        confirm: true,
        return_url: 'https://localhost:3000/return'
      });
      
      console.log(`✅ ${card.number}: ${paymentIntent.status}`);
    } catch (error) {
      console.log(`❌ ${card.number}: ${error.code}`);
    }
  }
}

runTests();
```

## 📊 テスト結果記録テンプレート

### テスト実行記録
```markdown
## Stripe決済テスト実行記録

**実行日時**: YYYY-MM-DD HH:MM:SS
**テスト環境**: Development/Staging
**実行者**: [名前]

### ✅ 成功テスト
| カード番号 | シナリオ | 結果 | 備考 |
|---|---|---|---|
| 4242 4242 4242 4242 | 基本決済 | ✅ | プラン更新確認済み |
| 5555 5555 5555 4444 | Mastercard | ✅ | ブランド表示正常 |

### ❌ エラーテスト
| カード番号 | 期待エラー | 実際の結果 | 対応状況 |
|---|---|---|---|
| 4000 0000 0000 0002 | generic_decline | ✅ エラー表示 | 正常 |
| 4000 0000 0000 9995 | insufficient_funds | ✅ 残高不足 | 正常 |

### 🔐 3D Secureテスト
| カード番号 | 認証フロー | 結果 | 備考 |
|---|---|---|---|
| 4000 0025 0000 3155 | 3DS認証 | ✅ | 認証画面表示確認 |

### 🌍 国際カードテスト
| 国/地域 | カード番号 | 結果 | 通貨処理 |
|---|---|---|---|
| 日本 | 4000 0039 2000 0003 | ✅ | JPY対応確認 |
| 英国 | 4000 0082 6000 0000 | ✅ | GBP対応確認 |

### 🚨 問題・課題
- [ ] 問題1: [詳細]
- [ ] 問題2: [詳細]

### 📝 次回改善点
- [ ] 改善点1
- [ ] 改善点2
```

## 🔍 デバッグとトラブルシューティング

### よくある問題と解決方法

#### 1. 「カード番号が無効です」エラー
```
原因: 実際のカード番号を使用している
解決: Stripe公式テストカード番号を使用
```

#### 2. Webhook が受信されない
```
原因: ローカル環境でWebhookが届かない
解決: ngrok等でローカルサーバーを公開
```

#### 3. 3D Secure認証画面が表示されない
```
原因: 3DS対応テストカードを使用していない
解決: 4000 0025 0000 3155 を使用
```

#### 4. 国際カードテストが失敗する
```
原因: 通貨設定や地域制限
解決: Stripe Dashboard の設定を確認
```

### デバッグツール

#### Stripe CLI
```bash
# Stripe CLI インストール
# https://stripe.com/docs/stripe-cli

# Webhookリスニング
stripe listen --forward-to localhost:3001/api/stripe/webhook

# テストイベント送信
stripe trigger payment_intent.succeeded
```

#### ログ監視
```bash
# サーバーログ監視
tail -f server/logs/combined.log | grep stripe

# Stripe Dashboard
# ログ > Webhook > 配信試行で詳細確認
```

## 📚 参考資料

### Stripe公式ドキュメント
- [Testing Overview](https://docs.stripe.com/testing)
- [Test Cards](https://docs.stripe.com/testing#cards)
- [3D Secure Testing](https://docs.stripe.com/testing/3ds)
- [International Testing](https://docs.stripe.com/testing#international-cards)

### ConsensusAI固有の設定
- [Stripe Setup Guide](./stripe-setup-guide.md)
- [Billing Implementation](./current-implementation.md)

---

**最終更新**: 2025-07-26  
**対応バージョン**: Stripe API 2024-06-20