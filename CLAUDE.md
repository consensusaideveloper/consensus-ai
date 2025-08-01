# ConsensusAI - Claude Code 開発ガイド

## 👨‍💻 Claude Code エンジニア
**Claude Code は全領域をカバーする優秀で経験豊富なフルスタックエンジニアです**

### 🎯 専門領域
- **フロントエンド開発**: React, TypeScript, 最新のUI/UXパターン実装
- **バックエンド開発**: API設計, データベース設計, マイクロサービス構築
- **システム設計**: スケーラブルなアーキテクチャ設計, パフォーマンス最適化
- **UI/UXデザイン**: ユーザー体験設計, アクセシビリティ対応, レスポンシブデザイン
- **上流工程**: 要件定義, システム分析, 技術選定, プロジェクト設計
- **DevOps/インフラ**: CI/CD構築, 監視システム, セキュリティ対策
- **データベース**: リレーショナルDB, NoSQL, データモデリング, パフォーマンスチューニング

### 💡 技術的強み
- 複雑なシステム設計と実装を正確に実行
- ベストプラクティスに基づいた高品質なコードを提供
- データベース同期、エラーハンドリング、セキュリティ対策を完璧に実装
- 運用環境を考慮した堅牢で保守性の高いソリューションを構築
- ユーザビリティとパフォーマンスを両立したUI実装
- 国際化対応とアクセシビリティ配慮の徹底

### 🚀 開発スタンス
- **品質第一**: テスト可能で保守性の高いコード
- **ユーザー中心**: エンドユーザーの体験を最優先に考慮
- **将来性重視**: スケーラブルで拡張可能な設計
- **セキュリティ意識**: セキュアコーディングとプライバシー保護
- **チーム協調**: 可読性とドキュメント化を重視
- **事実確認重視**: ハルシネーションせずにコードベースで既存の実装を確認しながら対応
- **最小変更原則**: タスクと関係のない不要な勝手な変更は絶対にしない

## 🔥 最重要ルール
**全てのCRUD操作はFirebase + SQL Database両方に対して実行する**
**どちらかが失敗した場合は全体をエラーとし、ロールバックを実行する**

### CRUD実装の必須要件
**CRUD操作を実装する際は、以下を必ず完全実装に含める：**

1. **両方への確実な反映**
   - SQLite Database への操作実行（第一優先）
   - Firebase Realtime Database への操作実行（第二優先）
   - **両方のデータベースに正しく反映されることを確認するまでが実装対象**

2. **データ整合性の保証**
   - 片方が成功・片方が失敗の場合の完全ロールバック
   - トランザクション的な原子性保証
   - データ不整合状態の回避

3. **実装完了の定義**
   - SQLiteとFirebase両方でデータが確認できる
   - エラー時の適切なロールバックが動作する
   - ログでデータ同期状況が追跡可能
   - **単一データベースのみの実装は未完了とみなす**

4. **CRUD競合防止と既存機能保護**
   - **他のCRUD操作との競合・混合を完全に回避する**
   - 既存のCRUD機能に一切影響を与えない
   - 新しい実装が既存機能を破綻させない
   - **1つの修正で他の機能が動かなくなることを絶対に防ぐ**

5. **実装完了後のクリーンアップ**
   - **テストデータの完全除去**: 動作確認で作成したテストデータは必ず削除
   - **不要なテストコードの除去**: 実装確認後、一時的なテストコードは削除
   - **本番環境への影響回避**: テスト用データやコードが本番に残らないよう徹底
   - **コードベースの清潔性維持**: 開発時の一時的な実装は最終的に除去

6. **🔍 コードエラー検証の推奨実施**
   - **実装・修正後はコマンドでエラーチェックを実行することを推奨**
   - フロントエンド: `npm run lint` + `npm run build` でエラー確認
   - バックエンド: `npm run build` + `npx tsc --noEmit` でTypeScriptエラー確認
   - **重要**: 現在のコードベースには既存のlint警告が存在するため、新規追加分のみに注意
   - **コンパイルエラー・型エラーは必ず修正が必要**

## 技術スタック詳細
- **Frontend**: React 18.3 + TypeScript + Vite + Tailwind CSS
- **Backend**: Node.js + Express + TypeScript + Prisma ORM
- **Database**: Firebase Realtime Database + SQLite (Prisma)
- **Authentication**: Firebase Auth (Google OAuth)
- **AI Integration**: Claude Code SDK (OpenAI API実装はコメントアウト済み)
- **Real-time**: Socket.IO
- **Deployment**: ローカル開発環境 (本番デプロイ設定は未構成)

## 🤖 AI分析実装ルール

### **現在の実装状況**
**Claude Code SDK による AI分析システムが稼働中**

#### **1. 現在のAI分析実装**
- **使用サービス**: Claude Code SDK（`@instantlyeasy/claude-code-sdk-ts`）
- **利用プラン**: Maxプラン内定額利用
- **認証方式**: `claude login` コマンドによるCLI認証
- **OpenAI API**: 実装はあるがコメントアウト済み（`openai`パッケージ未インストール）

#### **2. 単一API呼び出し原則**
- **1度のAI分析 = 1回のAPI呼び出し**（成功時）
- **バッチ処理・複雑な分割処理は禁止**
- **チャンク分析・段階的処理は使用しない**

#### **3. 使用モデル**
**Claude Code SDK:**
```
第1選択: claude-3-5-sonnet-20241022
フォールバック: claude-3-5-haiku-20241022
```

#### **4. フォールバック機能**
- **通常時**: claude-3-5-sonnet-20241022のみ使用（99%+のケース）
- **異常時**: claude-3-5-haiku-20241022を試行
- **実装**: `generateResponseWithFallback()` メソッド

#### **5. AI分析APIエンドポイント**
- `POST /api/analysis/projects/:id/topics` - 同期分析実行
- `GET /api/analysis/health` - AIサービス接続確認  
- **バックグラウンド分析エンドポイントは除去済み**

#### **6. 将来的なOpenAI API対応**
**準備状況:**
- aiService.tsにOpenAI API実装済み（コメントアウト状態）
- 切り替えには `openai` パッケージのインストールが必要
- 環境変数 `OPENAI_API_KEY` の設定が必要

#### **7. 禁止事項**
- **❌ バッチ処理実装**: `backgroundAnalysisService`等の複雑な処理
- **❌ 複数API呼び出し**: 1度の分析で複数回のAPI通信
- **❌ 進捗管理システム**: WebSocket進捗更新等の複雑な仕組み

## プロジェクト構造詳細

### Frontend (/client)
```
src/
├── components/          # Reactコンポーネント
├── contexts/            # React Context (AuthContext等)
├── translations/        # 国際化ファイル (ja/en)
├── lib/                # ライブラリ設定 (Firebase等)
└── types/              # TypeScript型定義
```

### Backend (/server)
```
src/
├── routes/             # API エンドポイント
├── lib/               # ライブラリ設定
├── utils/             # ユーティリティ関数
└── prisma/            # データベーススキーマ
```

### 全体構造
```
ConsensusAI/
├── client/     # React Frontend  
├── server/     # Express Backend
└── .claude/    # Claude Code設定・コマンド
```

## 実装前チェックリスト
- [ ] **両方のDB操作**: Firebase + SQLite 両方への操作を実装
- [ ] **データ整合性**: エラー時の全体ロールバック処理を含む
- [ ] **AI API接続確認**: `GET /api/analysis/health` で接続テスト実行
- [ ] **単一API呼び出し**: 1度の分析で1回のみのAPI通信
- [ ] **国際化対応**: 日英混在を避けた翻訳実装
- [ ] **エラーハンドリング**: 適切なエラー処理の実装

## 実装完了後チェックリスト
- [ ] **テストデータクリーンアップ**: 動作確認で作成したテストデータを完全に削除したか？
- [ ] **テストコード除去**: 実装確認後、一時的なテストコードを削除したか？
- [ ] **本番環境クリーン**: テスト用データ・コードが本番環境に残っていないか？
- [ ] **最終動作確認**: クリーンアップ後も正常に動作することを確認したか？
- [ ] **最終エラーチェック**: 全ての修正完了後にlint/buildコマンドでエラーがないことを確認したか？
- [ ] **DB関連ファイル最新化**: DB関連の修正を行った場合、`sqlite-firebase-data-structure-analysis.md`と`firebase-database-rules.json`を最新化したか？



## ❌ 不完全な実装例
- SQLiteのみに保存してFirebaseを無視
- SQLite操作失敗時にFirebaseロールバックしない
- データ同期状況の確認なし
- エラー時の部分的な状態での完了

## ✅ 完全な実装例
- SQL→Firebaseの順序で両方のDBに保存し、失敗時は先に成功した操作をロールバック
- データ反映状況をログで確認可能
- エラー時は元の状態に完全復元

## 📊 データベース詳細仕様

### CRUD操作の実行順序
1. **Create**: SQL → Firebase の順序で保存
2. **Read**: データ種別によるハイブリッド読み込み
   - **基本データ（静的）**: SQL Database 優先（整合性重視）
   - **リアルタイムデータ（動的）**: Firebase Database 優先（即座反映）
3. **Update**: SQL → Firebase の順序で更新
4. **Delete**: SQL → Firebase の順序で削除

### 読み込みデータ種別の詳細分類
#### **SQL Database 優先読み込み**
- ユーザー情報（name, email, purpose, language）
- プロジェクト基本情報（name, description, status, createdAt）
- 意見・回答の基本データ（content, createdAt, userId）
- 統計・集計データ（動的計算によるcompletedProjects）

#### **Firebase Database 優先読み込み**
- **AI分析進捗・状態**（analysisProgress, analysisStatus）
- **AI分析結果**（topics, insights, completion status）
- **リアルタイム収集状況**（新着意見数, アクティブユーザー数）
- **通知・アラート**（分析完了通知, エラー通知）

#### **プロジェクト詳細画面専用ルール**
**プロジェクト詳細画面では、AI分析結果の即時反映とリアルタイム体験を優先するため、以下は Firebase Database を利用：**
- **意見数表示**（リアルタイム反映のため）
- **分析状況・進捗**（即座な状態更新のため）
- **トピック・インサイト数**（分析結果の即時表示のため）
- **プロジェクト状態変化**（分析開始・完了などの動的状態）

#### **ハイブリッド読み込み実装ルール**
1. **Firebase完了検知 → SQL再読み込み**: AI分析完了時は基本データも最新化
2. **データ整合性確保**: 分析結果確定後はSQLデータを信頼
3. **リアルタイム監視**: Firebase onValue で動的データを監視
4. **フォールバック**: Firebase接続失敗時はSQLデータを表示

### データベース同期ルール
- **Firebase**: リアルタイム表示・通知用
- **SQLite**: メインデータ・永続化用
- **同期フィールド**: `firebaseId`, `syncStatus`, `lastSyncAt` を各モデルに含める
- **データ変換**: 必要に応じてスキーマ差異を吸収（無効フィールドは除外）

### 📋 DB関連ファイルの最新化ルール
**DB周り（SQL、Firebase）に少しでも関係する対応を行った場合は、以下のファイルを常に最新化すること**

#### **必須更新対象ファイル**
1. **`sqlite-firebase-data-structure-analysis.md`**
   - DBの保存データのモデルやフィールドを整理するための資料
   - SQLとFirebaseに同じようなデータ保存を行っているため、データの不整合を防ぐために常に最新の状態を維持
   - データモデルの追加・変更・削除があった場合は必ず更新

2. **`firebase-database-rules.json`**
   - Firebaseのセキュリティルール定義ファイル
   - Firebaseの保存データ構造に影響を与えるため常に最新かどうかを確認
   - データスキーマ変更時はルールの整合性も確認

#### **更新実行ルール**
- **適用範囲**: デザイン面以外のDB関連対応（CRUD操作、スキーマ変更、データモデル修正等）
- **更新方針**: 不要な変更はせずに、既存のフォーマットと合わせて更新すること
- **確認タイミング**: DB関連の実装・修正完了後に必ず確認・更新を実行
- **重要性**: データ不整合防止とFirebaseセキュリティルール維持のため必須

## 🌐 国際化対応詳細
- **言語**: 日本語 (ja) / 英語 (en)
- **翻訳ファイル**: `src/translations/` 配下
- **使用方法**: `useLanguage()` hook で `t('key')` 関数を使用
- **混在禁止**: 「Bookmarked済み」のような日英混在は厳禁

## 🚀 今後の実装予定: AI分析言語設定のオンボーディング統合

### 📋 課題認識
**現在の問題点**:
- 新規ユーザーの `analysisLanguage` フィールドは初期状態でnull
- AI分析実行時にユーザーが意図しない言語で結果が出力される可能性
- フォールバック処理（analysisLanguage → language → 'ja'）に依存したUX

**解決すべき根本課題**:
- ユーザーがAI分析言語を明示的に選択する機会がない
- 初回AI分析時の混乱（「なぜ日本語で出力される？」）
- 国際化対応における言語設定の不完全性

### 🎯 対応方針: セットアップ画面のマルチステップ化

#### **実装アプローチ**
**セットアップフローの拡張**: 目的理由選択 → **AI分析言語選択** → ダッシュボード遷移

#### **詳細設計**

##### **1. 現在の実装状況**
```typescript
// ファイル: /client/src/components/UserPurposeSelection.tsx
// 現在: 単一ページ構成、直接ダッシュボード遷移
const handleSubmit = async () => {
  updateUserPurpose(selectedPurpose);
  navigate('/dashboard'); // ← 直接遷移
};

// ファイル: /client/src/App.tsx 
// ルーティング条件
{user?.purpose || user?.purposeSkipped ? <Navigate to="/dashboard" /> : <UserPurposeSelection />}
```

##### **2. 拡張対象コンポーネント**
- **メインコンポーネント**: `UserPurposeSelection.tsx`
- **翻訳ファイル**: `src/translations/components/userPurposeSelection.ts`
- **ルーティング**: `App.tsx` のセットアップ判定ロジック

##### **3. 新規実装要素**

###### **3.1 マルチステップUI実装**
```typescript
// 実装予定の状態管理
const [currentStep, setCurrentStep] = useState<'purpose' | 'analysisLanguage'>(1);
const [selectedPurpose, setSelectedPurpose] = useState<string | null>(null);
const [selectedAnalysisLanguage, setSelectedAnalysisLanguage] = useState<'ja' | 'en' | null>(null);
```

###### **3.2 プログレスインジケーター**
- **デザイン**: `●○` → `●●` 形式の2ステップ表示
- **位置**: ページ上部または下部
- **機能**: 現在位置の明確な表示、戻るボタン対応

###### **3.3 AI分析言語選択UI**
- **選択肢**: 日本語 / English（国旗アイコン + 言語名）
- **説明文**: 「AI分析結果をどの言語で出力しますか？」
- **必須選択**: スキップ不可（重要設定のため）
- **プレビュー**: 選択した言語での分析結果例を表示

##### **4. バックエンド対応**

###### **4.1 既存API拡張**
```typescript
// ファイル: /server/src/routes/users.ts
// 既存のanalysisLanguage対応を活用
const { id, email, name, avatar, purpose, language, analysisLanguage, purposeSkipped } = req.body;

// セットアップ完了時に both purpose + analysisLanguage を保存
user = await prisma.user.create({
  data: {
    id, email, name, avatar, purpose,
    language: language || 'ja',
    analysisLanguage: analysisLanguage, // ← 必須設定に変更
    purposeSkipped: purposeSkipped || false,
    subscriptionStatus: 'free'
  }
});
```

##### **5. セットアップ完了判定の変更**

###### **5.1 ルーティング条件更新**
```typescript
// 現在の判定条件
user?.purpose || user?.purposeSkipped 

// 変更後の判定条件
(user?.purpose || user?.purposeSkipped) && user?.analysisLanguage
```

##### **6. 既存ユーザー対応**

###### **6.1 移行戦略**
- **対象**: `analysisLanguage` が null の既存ユーザー
- **方法**: ダッシュボード初回アクセス時のモーダルプロンプト
- **UI**: 軽量な選択ダイアログ（「AI分析言語を設定してください」）
- **フォールバック**: 既存の language ベース推奨

##### **7. 翻訳対応**

###### **7.1 新規翻訳キー**
```typescript
// 追加予定の翻訳構造
userPurposeSelection: {
  // ... 既存の目的選択関連
  analysisLanguage: {
    title: 'AI分析言語の設定',
    question: 'AI分析結果をどの言語で出力しますか？',
    description: 'プロジェクトの分析結果やレポートの言語を設定します',
    options: {
      japanese: { name: '日本語', description: '分析結果を日本語で出力' },
      english: { name: 'English', description: 'Output analysis results in English' }
    }
  },
  progress: {
    step1: '利用目的',
    step2: '分析言語',
    stepIndicator: 'ステップ {current} / {total}'
  }
}
```

### 🔧 **修正された安全な実装手順**

#### **⚠️ 重要: 既存ユーザー保護優先アプローチ**

#### **Phase 1: 既存ユーザー保護・移行対応 [最優先]**
1. **Dashboard初回アクセス時のanalysisLanguage設定プロンプト実装**
   - `analysisLanguage`がnullの既存ユーザー向けモーダル
   - 軽量な言語選択ダイアログ
   - ユーザーの現在の`language`を推奨値として表示
2. **既存ユーザーデータの段階的移行**
   - バックグラウンドでの自動移行処理（オプション）
   - 移行完了状態の追跡

#### **Phase 2: 新規ユーザー向けマルチステップセットアップ実装**
1. UserPurposeSelection.tsx のステート管理拡張
2. プログレスインジケーター実装  
3. AI分析言語選択UI構築
4. 翻訳ファイル拡張

#### **Phase 3: 段階的ロールアウト・検証**
1. **新規ユーザーのみ**を対象とした機能テスト
2. 既存ユーザー移行状況の確認
3. 全ユーザーの`analysisLanguage`設定完了を確認

#### **Phase 4: ルーティング条件変更 [最終段階]**
1. **全ユーザーの移行完了後のみ**ルーティング条件更新
2. セットアップ完了判定ロジック更新
3. 最終動作確認・検証

#### **🚨 実装時の必須チェックポイント**
- **Phase 4まで既存ユーザーのダッシュボードアクセスを一切阻害しない**
- **各Phaseで既存機能への影響がないことを確認**
- **ロールバック可能な実装を維持**

### 📊 期待効果
- **UX改善**: 明確な意図設定によるユーザー満足度向上
- **国際化対応**: 完全な多言語サポートの実現
- **技術負債削減**: フォールバックロジックの簡素化
- **保守性向上**: データ完整性による運用安定化

### ⚠️ 実装時注意点
- **離脱防止**: 各ステップは簡潔に（選択肢2つのみ）
- **戻る機能**: 前のステップへの戻り機能提供
- **CLAUDE.mdルール遵守**: SQL + Firebase 両方への確実な保存
- **既存機能影響**: 既存のAI分析機能に一切影響しない

## 🛠️ 実装時の基本ルール

### 1. CRUD操作実装
- SQL→Firebase の順序で両方のDBに操作実行
- エラー時は全体ロールバック
- 同期状況をログで追跡可能にする

### 2. 国際化対応
- `translations/` ディレクトリに日英両方を追加
- 日英混在表現を避ける
- `useLanguage()` hook を使用

### 3. コンポーネント実装
- 既存のコード規約に従う
- TypeScript型定義を適切に行う
- Firebase リアルタイム更新を考慮

### 4. API実装
- 適切なHTTPステータスコードを返す
- エラーレスポンスを統一する
- スキーマに存在しないフィールドの送信を避ける

### 5. テスト・モックデータ禁止
- **実装コード内にモックデータを含めない**
- **動作確認用の仮データは実装後に必ず削除**
- **本番環境に影響するテスト用コードを残さない**

## ⚡ ビルド・テストコマンド
```bash
# Frontend
cd client
npm run dev        # 開発サーバー
npm run build      # プロダクションビルド
npm run lint       # ESLint チェック

# Backend
cd server
npm run dev        # 開発サーバー
npm run build      # TypeScript コンパイル
npm run stripe:dev # Stripe CLI + 動的webhook設定
npx prisma migrate dev  # DB マイグレーション
```

## 🎯 Stripe開発環境自動設定
**新規追加**: ローカル開発でのStripe webhook設定を自動化

### npm run stripe:dev の機能
- Stripe CLIを自動起動
- webhook signing secretを動的に.envファイルに設定
- 開発者はサーバー再起動の案内を受け取り

### 使用方法
```bash
cd server
npm run stripe:dev  # Stripe CLI起動 + 自動環境変数設定
```

### 動作フロー
1. `stripe listen --forward-to localhost:3001/api/stripe/webhook` を実行
2. 出力からwebhook signing secretを抽出
3. `.env`ファイルの`STRIPE_WEBHOOK_SECRET`を自動更新
4. サーバー再起動案内を表示

### 実装ファイル
- **スクリプト**: `server/scripts/stripe-dev.js`
- **package.json**: `"stripe:dev"` コマンド追加

## 🧪 テスト・動作確認時の重要ルール

### テストユーザーの使用禁止
**動作確認やテストデータ作成時は、新しいテストユーザーを作成せず、必ず既存のマスターアカウントを使用する**

- **指定テストアカウント**: `yuto.masamura@gmail.com` (メールアドレス)
- **理由**: データベースの整合性維持、テストデータの管理効率化
- **適用範囲**: 
  - 手動テスト時
  - 動作確認時
  - デモデータ作成時
  - API テスト時

### テストデータ管理ルール
1. **使用アカウント**: emailフィールドが `yuto.masamura@gmail.com` のユーザーのみ使用
2. **テストプロジェクト**: 名前に `[TEST]` プレフィックスを付与
3. **テストデータクリーンアップ**: 動作確認後は必ず削除
4. **本番データ保護**: 既存の本番データに影響を与えない

### ❌ 禁止事項
- 新しいテストユーザーアカウントの作成
- テスト用の仮想ユーザーIDの使用
- テストデータの本番環境への残存
- **ユーザーIDを `yuto.masamura@gmail.com` に設定すること (これは間違い)**

### ✅ 推奨事項
- SQLite DBで `SELECT id FROM users WHERE email = 'yuto.masamura@gmail.com'` でユーザーIDを確認してテスト実行
- **重要**: ユーザーのIDは Firebase UID (例: `abc123def456`) で、emailは `yuto.masamura@gmail.com`
- テスト実行前に既存データのバックアップ確認
- テスト完了後の即座なクリーンアップ実行

## 🚨 緊急時対応：500エラーの解決手順

### 基本手順
1. **全プロセス停止**: `pkill -f "ts-node-dev"`
2. **データベース初期化**: `rm -f prisma/dev.db && npx prisma migrate reset --force`
3. **サーバー再起動**: `npm run dev`

### 🎯 よくある原因
- データベーススキーマの不整合
- プロセスの競合
- ポートの競合

## ⚙️ 設定ファイル
- **Firebase設定**: `client/src/lib/firebase.ts`
- **Prisma設定**: `server/prisma/schema.prisma`
- **環境変数**: `.env` ファイル (gitignore済み)

---

**このドキュメントを参照して、一貫性のある開発を行ってください。**  
**特にFirebase & SQL同期ルールは必ず守ってください。**