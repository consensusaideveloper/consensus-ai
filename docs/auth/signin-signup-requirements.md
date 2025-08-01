# ConsensusAI サインイン・サインアップ時の必要フィールドと処理要件

## 🔐 サインイン・サインアップ時の必要フィールド

### 1. 新規サインアップ時（初回ログイン）

#### Firebase Auth から自動取得されるフィールド
```typescript
interface FirebaseUserData {
  uid: string              // Firebase UID（一意識別子）
  email: string            // Googleアカウントのメール
  displayName: string      // Googleアカウントの表示名
  photoURL?: string        // Googleプロフィール画像URL
}
```

#### アプリケーション側で設定するフィールド
```typescript
interface AppUserData {
  // 必須フィールド
  id: string              // Firebase UIDをコピー
  name: string            // displayNameをコピー
  email: string           // emailをコピー
  
  // 設定フィールド
  language: "ja" | "en"   // 言語設定（自動判定）
  avatar?: string         // photoURLをコピー
  
  // 後から設定するフィールド
  purpose?: string        // 利用目的（後から選択）
  purposeSkipped?: boolean // 目的選択をスキップしたか
}
```

#### 言語設定の自動判定ロジック
```typescript
const determineLanguage = (): "ja" | "en" => {
  // 1. localStorage の設定を優先
  const savedLanguage = localStorage.getItem("consensusai_language") as "ja" | "en";
  if (savedLanguage) return savedLanguage;
  
  // 2. ブラウザ言語設定を確認
  const browserLanguage = navigator.language;
  if (browserLanguage.startsWith("ja")) return "ja";
  
  // 3. デフォルトは日本語
  return "ja";
};
```

### 2. 既存ユーザーのサインイン時

#### Firebase から取得・更新チェックするフィールド
```typescript
interface ExistingUserCheck {
  // 既存データ取得
  userData: User           // Firebase Realtime Database から取得
  
  // 自動更新チェック
  currentAvatar: string    // 現在のGoogle アバター
  savedAvatar?: string     // 保存済みのアバター
  
  // 更新が必要な場合
  needsAvatarUpdate: boolean
}
```

#### アバター自動更新の判定ロジック
```typescript
const checkAvatarUpdate = (current: string, saved?: string): boolean => {
  return current && saved !== current;
};
```

## 🔄 データベース同期処理要件

### 1. 新規ユーザー作成時の処理順序
```
1. Firebase Auth認証完了
   ↓
2. ユーザーデータ構築
   ├── Firebase UIDを取得
   ├── 言語設定を自動判定
   ├── Google情報を取得
   └── 初期値を設定
   ↓
3. Firebase Realtime Database保存
   ├── update()メソッドで安全に保存
   ├── 既存プロジェクトデータを保護
   └── 保存確認
   ↓
4. SQLite Database同期
   ├── API経由でユーザー作成
   ├── avatarフィールドを除外
   └── エラー時のログ記録
   ↓
5. AuthContext更新
   └── UI状態反映
```

### 2. 既存ユーザーのデータ同期処理
```
1. Firebase認証確認
   ↓
2. Firebase Realtime Database読み取り
   ├── 既存ユーザーデータ取得
   └── アバター更新チェック
   ↓
3. 必要に応じてアバター更新
   ├── Firebase側を更新
   └── ローカル状態更新
   ↓
4. SQLite Database同期
   ├── 最新データで更新
   ├── データ整合性確認
   └── エラー時は継続
   ↓
5. リアルタイム同期開始
   └── Firebase変更の監視
```

## 📊 データ変換・マッピング要件

### Firebase → SQL 変換時の除外フィールド
```typescript
interface FirebaseToSQLMapping {
  // 含めるフィールド
  include: {
    id: string
    email: string
    name: string
    purpose?: string
    purposeSkipped?: boolean
    language?: string
  }
  
  // 除外するフィールド（SQLスキーマに存在しない）
  exclude: {
    avatar?: string        // Firebase専用
    [projectData]: any     // プロジェクト関連データ
  }
}
```

### SQL → Firebase 変換時の追加フィールド
```typescript
interface SQLToFirebaseMapping {
  // SQLから取得
  sqlData: SQLUserData
  
  // Firebase専用フィールドを追加
  firebaseData: SQLUserData & {
    avatar?: string        // Google アバター情報
  }
}
```

## ⚠️ エラーハンドリング要件

### 1. Firebase Auth エラー
```typescript
interface FirebaseAuthErrors {
  "auth/popup-closed-by-user": "ログインがキャンセルされました"
  "auth/popup-blocked": "ポップアップがブロックされました"
  "auth/cancelled-popup-request": "ログイン処理がキャンセルされました"
  "auth/unauthorized-domain": "このドメインは認証が許可されていません"
  "auth/operation-not-allowed": "Google認証が有効になっていません"
  default: "ログインに失敗しました"
}
```

### 2. データベース同期エラー
```typescript
interface DatabaseSyncErrors {
  // Firebase エラー
  firebaseError: {
    action: "ログ記録のみ"
    userAction: "エラー通知"
    recovery: "SQL同期は継続"
  }
  
  // SQL エラー
  sqlError: {
    action: "ログ記録のみ"
    userAction: "警告なし"
    recovery: "Firebase操作は継続"
  }
  
  // 両方エラー
  bothError: {
    action: "エラー通知"
    userAction: "再試行促進"
    recovery: "手動同期"
  }
}
```

## 🔒 セキュリティ要件

### 1. 認証トークンの管理
```typescript
interface AuthTokenRequirements {
  // 開発環境
  development: {
    method: "x-user-id header"
    validation: "基本的なUID確認"
    security: "低レベル"
  }
  
  // 本番環境
  production: {
    method: "Firebase JWT Token"
    validation: "完全な署名検証"
    security: "高レベル"
  }
}
```

### 2. データアクセス制御
```typescript
interface DataAccessControl {
  // Firebase Rules
  firebaseRules: {
    read: "auth.uid === $userId"
    write: "auth.uid === $userId"
    validate: "必要フィールドの存在確認"
  }
  
  // API認証
  apiAuth: {
    middleware: "auth.ts"
    validation: "ユーザー存在確認"
    creation: "自動ユーザー作成"
  }
}
```

## 📝 必要なバリデーション

### 1. 入力値検証
```typescript
interface ValidationRules {
  id: {
    required: true
    type: "string"
    pattern: "Firebase UID format"
  }
  
  email: {
    required: true
    type: "string"
    format: "email"
    unique: true
  }
  
  name: {
    required: true
    type: "string"
    minLength: 1
    maxLength: 100
  }
  
  purpose: {
    required: false
    type: "string"
    enum: ["government", "business", "corporate", "community", "research"]
  }
  
  language: {
    required: false
    type: "string"
    enum: ["ja", "en"]
    default: "ja"
  }
}
```

### 2. データ整合性チェック
```typescript
interface DataIntegrityChecks {
  // 重複チェック
  duplicateCheck: {
    firebase: "uid の一意性"
    sql: "email の一意性"
    conflict: "手動解決"
  }
  
  // 同期チェック
  syncCheck: {
    timing: "定期的実行"
    fields: "重要フィールドのみ"
    repair: "自動修復"
  }
}
```

## 🚀 パフォーマンス要件

### 1. 初回ログイン時間
```typescript
interface PerformanceTargets {
  authTime: "< 2秒"          // Firebase認証完了
  databaseSync: "< 1秒"      // 両DB同期完了
  uiUpdate: "< 0.5秒"        // UI状態更新
  totalTime: "< 3.5秒"       // 全体完了時間
}
```

### 2. 既存ユーザーログイン時間
```typescript
interface LoginPerformance {
  authCheck: "< 1秒"         // 認証状態確認
  dataLoad: "< 0.5秒"        // データ読み込み
  syncCheck: "< 0.5秒"       // 同期確認
  totalTime: "< 2秒"         // 全体完了時間
}
```

## 🔄 今後の改善点

### 1. 短期改善（1-2週間）
- 完全なロールバック機能の実装
- より詳細なエラーメッセージ
- 同期失敗時のリトライ機能
- パフォーマンスモニタリング

### 2. 中期改善（1-2ヶ月）
- 本番環境のJWT認証実装
- データ競合解決機能
- オフライン対応
- 複数デバイス同期

### 3. 長期改善（3-6ヶ月）
- 他のOAuthプロバイダー対応
- 2FA実装
- 企業SSO連携
- 監査ログ機能

---

**このドキュメントは現在の実装に基づいた要件定義です。**
**実装時は最新の技術仕様を確認してください。**