# お問い合わせフォーム実装対応方針書

**作成日**: 2025-07-28  
**対象**: ConsensusAI サービス  
**目的**: お問い合わせフォーム機能の実装方針策定

## 📋 現在のコードベース分析結果

### 既存システム確認
- ✅ **お問い合わせ機能**: 未実装（コンポーネント・API・翻訳すべて存在しない）
- ✅ **メール送信機能**: 未実装（nodemailer等のライブラリ未インストール）
- ✅ **データベース**: SQLite + Firebase Realtime Database のハイブリッド構成
- ✅ **翻訳システム**: 日英対応の完全国際化システム実装済み
- ✅ **認証システム**: Firebase Auth ベースの完全なユーザー管理
- ✅ **環境変数管理**: `.env.example` による標準化された管理体制

### アーキテクチャ特徴
```
Frontend (React + TypeScript + Tailwind)
├── 翻訳システム: translations/配下で完全国際化
├── コンポーネント: 統一されたUI/UXデザインシステム
└── 認証: Firebase Auth + Context API

Backend (Express + TypeScript + Prisma)
├── API: RESTful設計、統一されたエラーハンドリング
├── DB: SQLite (メイン) + Firebase (リアルタイム)
└── 環境変数: .env による設定管理
```

## 🎯 実装方針：サービス内統合型お問い合わせシステム

### 選択理由
1. **UX一貫性**: 既存のConsensusAI品質基準に合致
2. **ユーザー情報活用**: ログイン状態・プラン情報の自動取得で運用効率化
3. **将来拡張性**: FAQ連携・管理画面・自動分類等の発展が可能
4. **ブランド統一性**: 既存UIデザインシステムとの完全統合

## 🚀 段階的実装計画

### Phase 1: MVP実装 (2-3日)
**目標**: 基本的なお問い合わせフォーム機能

#### 1.1 バックエンド実装
```typescript
// 新規ファイル: server/src/routes/contact.ts
router.post('/api/contact', requireAuth, async (req, res) => {
  // フォームデータ受信・検証
  // メール送信処理
  // データベース保存（オプション）
  // レスポンス返却
});
```

#### 1.2 フロントエンド実装
```typescript
// 新規ファイル: client/src/components/ContactForm.tsx
// 新規ファイル: client/src/pages/Contact.tsx
// ルート追加: /contact
```

#### 1.3 翻訳対応
```typescript
// 新規ファイル: client/src/translations/pages/contact.ts
// index.tsに統合
```

### Phase 2: 機能拡張 (1週間後)
- カテゴリ別自動振り分け
- 添付ファイル対応
- 自動返信メール機能

### Phase 3: 高度化 (将来)
- 管理画面での問い合わせ管理
- FAQ連携
- AIによる自動回答候補

## 📊 データベース設計

### 新規テーブル: Contact
```sql
-- Prismaスキーマ追加
model Contact {
  id          String   @id @default(cuid())
  userId      String?  // ログインユーザーの場合
  name        String   
  email       String   
  category    String   // 'technical' | 'billing' | 'feature' | 'other'
  subject     String   
  message     String   
  status      String   @default("open") // 'open' | 'in_progress' | 'resolved'
  priority    String   @default("normal") // 'low' | 'normal' | 'high' | 'urgent'
  
  // メタデータ
  userAgent   String?  
  browserInfo String?  
  userPlan    String?  // 自動取得
  projectCount Int?    // 自動取得
  
  // Firebase同期
  firebaseId  String?  
  syncStatus  String?  @default("pending")
  lastSyncAt  DateTime?
  
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  
  user        User?    @relation(fields: [userId], references: [id])
  
  @@index([userId, createdAt])
  @@index([category, status])
  @@index([status, priority])
  @@map("contacts")
}
```

## ⚙️ 環境変数設定

### 新規環境変数 (.env.example 追加)
```bash
# Contact Form Configuration
CONTACT_ENABLED=true
CONTACT_RECIPIENT_EMAIL=
CONTACT_SENDER_EMAIL=
CONTACT_SENDER_NAME="ConsensusAI Support"

# Email Service Configuration (Gmail SMTP)
GMAIL_USER=
GMAIL_APP_PASSWORD=
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587

# Google Sheets Integration (Optional)
GOOGLE_SHEETS_ID=
GOOGLE_SERVICE_ACCOUNT_KEY=

# Rate Limiting
CONTACT_RATE_LIMIT_REQUESTS=5
CONTACT_RATE_LIMIT_WINDOW_MS=900000
```

### 🚫 ハードコーディング禁止方針
```typescript
// ❌ 絶対にNG - ハードコーディング
const SUPPORT_EMAIL = "support@consensusai.com";
const SHEET_URL = "https://docs.google.com/spreadsheets/d/1234...";

// ✅ 正しい実装 - 環境変数使用
const SUPPORT_EMAIL = process.env.CONTACT_RECIPIENT_EMAIL;
const SHEET_ID = process.env.GOOGLE_SHEETS_ID;

// 環境変数未設定チェック
if (!SUPPORT_EMAIL) {
  throw new Error('CONTACT_RECIPIENT_EMAIL environment variable is required');
}
```

## 🛡️ セキュリティ対策

### 1. 入力検証
```typescript
import { z } from 'zod';

const contactSchema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email(),
  category: z.enum(['technical', 'billing', 'feature', 'other']),
  subject: z.string().min(1).max(200),
  message: z.string().min(10).max(5000)
});
```

### 2. レート制限
```typescript
// express-rate-limit使用
const contactRateLimit = rateLimit({
  windowMs: parseInt(process.env.CONTACT_RATE_LIMIT_WINDOW_MS || '900000'),
  max: parseInt(process.env.CONTACT_RATE_LIMIT_REQUESTS || '5'),
  message: 'Too many contact requests, please try again later.'
});
```

### 3. スパム対策
- reCAPTCHA統合（フロントエンド）
- Honeypot フィールド
- IPベースのレート制限

## 📱 UI/UX設計

### デザインシステム統合
```typescript
// 既存パターンに準拠
- ResponsiveHeader使用
- 統一されたTailwind CSSクラス
- 既存のモーダル・フォームパターン踏襲
- 国際化対応（useLanguage hook）
```

### アクセシビリティ
- ARIA ラベル完全対応
- キーボードナビゲーション
- スクリーンリーダー対応

## 🔄 既存コードへの影響最小化方針

### 変更対象ファイル
```
新規作成のみ:
├── server/src/routes/contact.ts
├── client/src/components/ContactForm.tsx  
├── client/src/pages/Contact.tsx
├── client/src/translations/pages/contact.ts
└── server/prisma/migrations/xxx_add_contact_table.sql

最小限変更:
├── client/src/App.tsx (ルート追加のみ)
├── client/src/translations/index.ts (import追加のみ)
├── server/src/index.ts (ルート追加のみ)
└── server/prisma/schema.prisma (モデル追加のみ)
```

### 🚫 変更しないファイル
- 既存のコンポーネント
- 既存のAPIエンドポイント  
- 既存のデータベーステーブル
- 既存の翻訳ファイル
- 認証システム
- 既存のUIデザインシステム

## 📈 運用・管理方針

### 1. 問い合わせ管理フロー
```
ユーザー入力 
→ バリデーション 
→ データベース保存 
→ メール送信（管理者・ユーザー両方）
→ Slack通知（オプション）
```

### 2. 自動分類ロジック
```typescript
const priorityRules = {
  billing: 'high',      // 課金関連は高優先度
  technical: 'normal',  //技術問題は通常優先度
  feature: 'low',       // 機能要望は低優先度
  other: 'normal'       // その他は通常優先度
};
```

### 3. 応答時間目標
- 高優先度：24時間以内
- 通常優先度：48時間以内  
- 低優先度：72時間以内

## 🧪 テスト戦略

### 1. 単体テスト
- フォームバリデーション
- メール送信機能
- データベース操作

### 2. 統合テスト  
- エンドツーエンドのお問い合わせフロー
- メール配信確認
- 多言語対応確認

### 3. 負荷テスト
- レート制限動作確認
- 大量送信時の安定性

## 📝 実装チェックリスト

### Phase 1 MVP
- [ ] 環境変数設定 (.env)
- [ ] nodemailer インストール & 設定
- [ ] Prisma スキーマ更新 (Contact model)
- [ ] データベースマイグレーション実行
- [ ] バックエンドAPI実装 (/api/contact)
- [ ] フロントエンドフォーム実装
- [ ] 翻訳ファイル作成 (日英)
- [ ] ルート設定 (/contact)
- [ ] 基本テスト実行

### Phase 2 拡張
- [ ] カテゴリ別自動振り分け
- [ ] 添付ファイル対応
- [ ] 自動返信メール
- [ ] 管理者向け通知設定

## 🚨 注意事項・制約

### 1. Gmail SMTP制限
- 1日500通の送信制限
- アプリパスワード必須
- 2段階認証設定必要

### 2. データ保護
- GDPR準拠のデータ処理
- 個人情報の適切な暗号化
- データ保持ポリシーの明確化

### 3. スケーラビリティ
- 将来的な大量問い合わせに備えた設計
- 外部メールサービス移行の準備

## 📞 最終確認事項

実装開始前に以下を確認・決定：

1. **運営メールアドレス**: Gmail等の受信用アドレス設定
2. **Google Sheets連携**: 管理用スプレッドシート作成の要否
3. **Slack通知**: 開発チーム向け通知チャンネル設定
4. **優先度設定**: カテゴリ別の対応優先度ルール確定
5. **自動返信内容**: ユーザー向け自動返信メールテンプレート

---

## 🔄 実装状況検証・最適化方針 (2025-07-28 更新)

### 📊 現在の実装状況検証結果

#### ✅ 正しく実装済みの部分
1. **SQLiteデータベース**: Contact モデルが適切に設計済み
   - `userId` フィールドは `String?` (null可) - 未認証ユーザー対応済み
   - User モデルとのリレーションは optional - 独立性保持
   
2. **Firebase構造**: ルート階層に独立配置済み
   ```
   /contacts/{contactId}/ ← ルート階層（users配下ではない）
   ```

3. **バックエンドAPI**: 認証済み・未認証両方対応済み
   ```typescript
   // 未認証ユーザーでも処理続行
   let userId: string | null = null;
   if (userIdHeader) { /* 認証済みの場合のみユーザー情報取得 */ }
   ```

#### ❌ 改善が必要な部分

1. **Firebase同期失敗**
   - 現在 `syncStatus: "pending"` で停止
   - 権限エラーにより同期未完了
   ```
   [Contact API] ⚠️ Firebase同期エラー: Error: PERMISSION_DENIED
   ```

2. **管理画面準備不足**
   - お問い合わせ一覧API実装済み（`GET /api/contact`）
   - しかしフロントエンド管理画面は未実装

### 🎯 最適化対応方針

#### Phase 1: Firebase同期問題解決
```json
// firebase-database-rules.json 最適化
{
  "rules": {
    "contacts": {
      "$contactId": {
        ".read": true,  // Admin SDK対応
        ".write": true, // Admin SDK対応
        ".validate": "newData.hasChildren(['name', 'email', 'category', 'subject', 'message'])"
      }
    }
  }
}
```

#### Phase 2: 管理画面実装
1. **管理者用コンポーネント**
   ```typescript
   // 実装予定: /client/src/pages/Admin/ContactManagement.tsx
   - お問い合わせ一覧表示
   - カテゴリ・ステータス・優先度フィルタ
   - 個別お問い合わせ詳細表示
   - ステータス更新機能
   ```

2. **管理者権限チェック**
   ```typescript
   // 現在はrequireAuthのみ - 管理者権限の実装が必要
   const isAdmin = user.email === process.env.ADMIN_EMAIL;
   ```

#### Phase 3: データ構造最適化

1. **Firebase構造詳細設計**
   ```json
   {
     "contacts": {
       "contact_id_123": {
         "id": "contact_id_123",
         "userId": "user_abc123",     // 認証済み
         "name": "田中太郎",
         "email": "tanaka@example.com",
         "category": "billing",
         "subject": "請求について", 
         "message": "...",
         "status": "open",
         "priority": "high",
         "userPlan": "pro",
         "projectCount": 5,
         "createdAt": "2025-07-28T...",
         "updatedAt": "2025-07-28T...",
         // 管理用メタデータ
         "assignedTo": null,
         "lastResponseAt": null,
         "responseCount": 0
       },
       "contact_id_456": {
         "userId": null,              // 未認証ユーザー
         "name": "匿名ユーザー",
         "email": "anon@example.com",
         // ... 同様の構造
       }
     }
   }
   ```

2. **管理効率化フィールド追加**
   ```sql
   -- Prisma schema 追加予定
   model Contact {
     // 既存フィールド...
     
     // 管理強化フィールド
     assignedTo      String?   // 担当者ID
     lastResponseAt  DateTime? // 最終回答日時
     responseCount   Int       @default(0) // 回答数
     tags            String?   // カスタムタグ (JSON配列)
     internalNotes   String?   // 内部メモ
   }
   ```

### 🔧 即座実行項目

1. **Firebase同期問題の解決**
   - Admin SDK権限の確認
   - Firebase Realtime Database接続テスト
   
2. **管理API拡張**
   ```typescript
   // 実装予定エンドポイント
   PUT  /api/contact/:id/status  // ステータス更新
   POST /api/contact/:id/assign  // 担当者割り当て
   GET  /api/contact/stats       // 統計情報取得
   ```

3. **テストデータクリーンアップ**
   - 開発時のテストお問い合わせデータ削除
   - 本番環境への影響防止

### 📈 管理画面設計思想

#### アクセス制御
- **管理者認証**: メールアドレスベースの管理者判定
- **権限レベル**: 一般管理者 / スーパー管理者
- **操作ログ**: 全管理操作の記録・追跡

#### UI/UX方針
- **ダッシュボード**: 未対応件数・優先度別統計
- **フィルタリング**: カテゴリ・ステータス・期間・キーワード検索
- **ワークフロー**: ステータス変更・担当者割り当て・コメント追加

---

この最適化方針に基づき、お問い合わせシステムを管理効率とユーザー体験を両立した形で完成させることで、ConsensusAIサービスの運用品質を大幅に向上できます。