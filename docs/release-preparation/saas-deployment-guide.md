# SaaS サービス低コストデプロイメントガイド

## 概要
Prisma + SQL + Firebase バックエンドと React フロントエンドを持つ SaaS サービスの低コスト・簡単な公開手順を解説します。

## 対象構成
- **フロントエンド**: React
- **バックエンド**: Prisma（ORM）、SQL データベース、Firebase（認証・ストレージ）
- **目標**: 無料/低価格・簡単・個人向けサービス

## 推奨サービス比較

| サービス | 用途 | 無料枠 | 難易度 | 補足 |
|---------|------|--------|--------|------|
| Vercel | フロント（React） | 個人開発〜小規模は無料 | 易 | GitHub から自動デプロイ可能 |
| Netlify | フロント（React） | 同上 | 易 | Firebase Hosting も類似 |
| Render | バックエンド（Node.js等） | 永久無料の Web サービス枠あり | 易 | Prisma サーバも可 |
| Railway | バックエンド/DB | 毎月 $5 無料クレジット | 易 | PostgreSQL, MySQL 等すぐ使える |
| PlanetScale | DB（MySQL 互換） | 無料プランあり | 易 | Prisma 対応 |
| Firebase Hosting | サイト静的配信 | 小規模は無料 | 易 | 認証等その他機能も利用 |

## デプロイ手順

### 1. フロントエンド（React）のデプロイ

**推奨**: Vercel, Netlify, Firebase Hosting

1. GitHub などに React プロジェクトを Push
2. Vercel（https://vercel.com）や Netlify アカウント作成
3. 上記サービスで「新規プロジェクト→GitHub 連携」を選択
4. ビルドコマンド・公開ディレクトリ（例: build や dist）を設定
5. 独自ドメインも無料プランで設定可能

### 2. バックエンド/Prisma の運用

#### 選択肢 A: Firebase Functions
- TypeScript/Node.js で書いた API エンドポイントを Functions としてデプロイ可能
- Firebase Hosting と組み合わせて全体を Firebase で完結させることも可能

#### 選択肢 B: Render または Railway
- Node.js/Express/Prisma のバックエンドを GitHub 連携で無料枠で公開可能
- npm start などのコマンド指定とポート番号設定のみ注意

### 3. SQL データベース

#### Railway
- PostgreSQL や MySQL が無料で作成可能
- Prisma の DB 接続用 URL も発行される

#### PlanetScale
- MySQL 互換で無料プランが使いやすい
- Prisma 公式サポートあり

#### Firebase のみ利用
- 認証・ストレージだけ使い、SQL は外部サービスにすることも可能

## 具体的な手順例（Vercel + Railway + Prisma）

### 1. DB 構築
- Railway または PlanetScale で DB を作成
- Prisma 用の接続 URL を取得

### 2. バックエンド（API）構築/デプロイ
- 選択したサービス（Railway/Render）に Node.js バックエンドを GitHub からデプロイ
- .env で上記 DB の情報を設定

### 3. フロントエンド構築/デプロイ
- Vercel/Netlify/Firebase Hosting に React アプリをデプロイ

### 4. Firebase 設定
- 認証やストレージ用として継続利用
- 各サービスの API キーや URL は .env にまとめる

### 5. 動作確認・DNS 設定
- 独自ドメイン利用時も無料枠で対応可能

## 注意点

- **制限事項**: 無料枠には同時アクセス数・帯域制限あり。本リリース後に月額有料への変更も検討
- **セキュリティ**: .env 管理、API キー非公開、GitHub のプライベートリポジトリ化推奨
- **機密情報管理**: Prisma の DATABASE_URL や Firebase の認証情報は漏洩しないよう注意

## 推奨構成とコスト

### 基本構成
1. **フロント（React）**: Vercel または Netlify に GitHub 連携で即デプロイ
2. **バックエンド（Prisma 利用）**: Railway や Render にデプロイ + SQL DB に接続
3. **Firebase（認証・ストレージ）**: Firebase Console で運用継続

### 運用コスト
- **完全無料** または **$5/月以内** からスタート可能

## 推奨スタート構成

**Vercel + Railway + Firebase** の組み合わせが最も手軽でおすすめです。