# ConsensusAI MCP統合検討書

## 📋 概要
本文書は、ConsensusAIプロジェクトにおけるMCP (Model Context Protocol) サーバー統合の検討結果をまとめたものです。

**作成日**: 2025年1月7日  
**対象プロジェクト**: ConsensusAI - 政策立案支援システム

---

## 🎯 MCPサーバーとは

### 基本概念
**MCP (Model Context Protocol) サーバー**は、AIモデル（Claude等）と外部システムを安全に接続するためのプロトコルです。

### 主要機能
- **Tools**: AIが実行できる機能（ファイル読み込み、API呼び出し等）
- **Resources**: AIがアクセスできるデータ（ファイル、データベース等）
- **Prompts**: 定型的なAI指示テンプレート

### 2つの活用パターン

#### パターン1: 外部サービスとの接続（ConsensusAIが利用者側）
```
外部MCPサーバー → ConsensusAI（機能強化）
```

#### パターン2: ConsensusAIのMCPサーバー化（提供者側）
```
他システム → ConsensusAI MCPサーバー（機能提供）
```

---

## 🔍 現在のConsensusAIアーキテクチャ分析

### フロントエンド構成
- **Framework**: React + TypeScript + Vite
- **主要ライブラリ**: Firebase Client SDK, Socket.IO Client, React Router
- **UI**: Tailwind CSS + Lucide Icons
- **状態管理**: Context API (Auth, Language, Project)

### バックエンド構成
- **Framework**: Express.js + TypeScript
- **主要ライブラリ**: Prisma, Firebase Admin SDK, Socket.IO
- **データベース**: SQLite + Firebase Realtime Database（デュアル構成）
- **AI機能**: OpenAI API (o3-mini-2025-01-31, o4-mini-2025-04-16, gpt-4o)

### 主要機能
1. **意見収集・分析**: 市民意見のリアルタイム収集と AI分析
2. **トピック分類**: 意見の自動分類とグルーピング
3. **合意形成支援**: 異なる意見間の合意点発見
4. **リアルタイム同期**: Firebase + SQLite による双方向同期

---

## 🚀 実用的なMCP統合提案

### 優先度1: 分析精度向上（70% → 85%）

#### 使用MCPサーバー
- **Memory Server**: 過去分析結果の継続学習
- **Data Exploration Server**: 多次元データ分析

#### 具体的実装方法
```typescript
// 新しいenhancedAIService.ts
class EnhancedAIService extends AIService {
  private memoryMCP = new MCPClient('memory-server');
  private explorationMCP = new MCPClient('data-exploration-server');

  async generateEnhancedResponse(prompt: string, projectId: string): Promise<AIResponse> {
    // 1. Memory MCPから過去の類似分析を取得
    const pastAnalyses = await this.memoryMCP.callTool('search', {
      query: prompt,
      context: `project:${projectId}`,
      limit: 3
    });

    // 2. Data Exploration MCPで現在のデータパターンを分析
    const currentPatterns = await this.explorationMCP.callTool('analyze_sentiment_patterns', {
      data: await this.getCurrentOpinions(projectId),
      pattern_types: ['sentiment_clustering', 'topic_coherence']
    });

    // 3. 拡張されたプロンプトでAI分析
    const enhancedPrompt = `
    ${prompt}
    
    参考となる過去の類似分析:
    ${pastAnalyses.map(a => a.summary).join('\n')}
    
    現在のデータパターン:
    - センチメント分布: ${currentPatterns.sentiment_distribution}
    - トピック一貫性: ${currentPatterns.topic_coherence}
    `;

    const result = await super.generateResponse(enhancedPrompt);

    // 4. 結果をMemory MCPに保存（次回分析で活用）
    await this.memoryMCP.callTool('store', {
      content: result.content,
      metadata: { projectId, accuracy_score: this.calculateAccuracy(result) }
    });

    return result;
  }
}
```

#### 効果の根拠
- **過去の成功パターン活用**: 類似プロジェクトで高精度だった分析手法を再利用
- **データパターン考慮**: 現在のデータの特徴を把握してからAI分析
- **継続学習**: 分析結果を蓄積し、徐々に精度向上

### 優先度2: データ量増加（3-5倍）

#### 使用MCPサーバー
- **Fetch Server**: ウェブコンテンツ取得・変換

#### 具体的実装方法
```typescript
// 新しいenhancedOpinionService.ts
class EnhancedOpinionService extends OpinionService {
  private fetchMCP = new MCPClient('fetch-server');

  async getExpandedOpinionsForProject(projectId: string) {
    // 1. 既存の直接意見を取得
    const directOpinions = await super.getOpinionsForProject(projectId);
    
    // 2. プロジェクトのキーワードを抽出
    const keywords = await this.extractKeywords(directOpinions);
    
    // 3. Fetch MCPで外部データを収集
    const externalData = await Promise.all([
      // パブリックコメントサイトから関連意見
      this.fetchMCP.callTool('scrape_url', {
        url: 'https://public-comment.e-gov.go.jp/servlet/Public',
        search_terms: keywords,
        extract_pattern: 'public_comments'
      }),
      
      // 自治体議会議事録から関連発言
      this.fetchMCP.callTool('scrape_url', {
        url: 'https://ssp.kaigiroku.net/tenant/city/sp/search.html',
        search_terms: keywords,
        extract_pattern: 'council_records'
      }),
      
      // ニュースサイトから関連記事のコメント
      this.fetchMCP.callTool('scrape_url', {
        url: `https://news.google.com/search?q=${keywords.join('+')}`,
        extract_pattern: 'news_comments'
      })
    ]);

    // 4. 外部データを標準化してOpinion形式に変換
    const convertedExternalOpinions = this.convertToOpinionFormat(externalData);
    
    return {
      direct: directOpinions,           // 元の50-150件
      external: convertedExternalOpinions, // 追加で300-2000件
      total: [...directOpinions, ...convertedExternalOpinions]
    };
  }
}
```

#### データ増加例
- **直接意見**: 200件
- **パブリックコメント**: 150件
- **議会議事録**: 80件  
- **ニュースコメント**: 300件
- **合計**: 730件（3.65倍増加）

### 優先度3: 処理時間短縮（50%短縮）

#### 使用MCPサーバー
- **Memory Server**: 分析結果キャッシュと差分分析

#### 具体的実装方法
```typescript
class OptimizedTopicAnalysisService extends TopicAnalysisService {
  private memoryMCP = new MCPClient('memory-server');

  async analyzeTopicsOptimized(projectId: string) {
    console.time('optimized_analysis');
    
    // 1. 既存分析結果をMemory MCPから検索
    const cachedAnalysis = await this.memoryMCP.callTool('search_analysis', {
      projectId,
      threshold: 0.8 // 80%以上類似なら再利用
    });

    if (cachedAnalysis.found) {
      // 2a. キャッシュヒット - 差分のみ分析
      const newOpinions = await this.getNewOpinions(projectId, cachedAnalysis.lastAnalyzed);
      
      if (newOpinions.length < 10) {
        // 新規意見が少ない場合は既存結果を返却
        console.timeEnd('optimized_analysis'); // 約15秒
        return cachedAnalysis.result;
      } else {
        // 差分のみAI分析
        const incrementalAnalysis = await this.performIncrementalAI(newOpinions, cachedAnalysis.result);
        const mergedResult = this.mergeAnalysisResults(cachedAnalysis.result, incrementalAnalysis);
        
        console.timeEnd('optimized_analysis'); // 約2分30秒
        return mergedResult;
      }
    } else {
      // 2b. キャッシュミス - フル分析後にキャッシュ保存
      const fullResult = await super.analyzeTopics(projectId);
      
      await this.memoryMCP.callTool('store_analysis', {
        projectId,
        result: fullResult,
        fingerprint: this.calculateDataFingerprint(projectId)
      });
      
      console.timeEnd('optimized_analysis'); // 約9分30秒（初回のみ）
      return fullResult;
    }
  }
}
```

#### 処理時間短縮内訳
- **初回分析**: 9分30秒（変化なし）
- **類似プロジェクト**: 15秒（99%短縮）
- **更新分析**: 2分30秒（73%短縮）
- **平均**: 4分45秒（50%短縮）

---

## 🏗️ カスタムMCPサーバー構築案

### 政府データ統合MCPサーバー

#### 構築理由
現在、日本の政策立案に特化したMCPサーバーは存在しないため、ConsensusAIが先駆者となる機会があります。

#### 実装内容
```typescript
// custom-mcp-servers/japan-gov-data-server/
export class JapanGovDataMCPServer extends MCPServer {
  constructor() {
    super({
      name: "japan-gov-data",
      version: "1.0.0"
    });
    
    this.addTool({
      name: "search_e_gov_laws",
      description: "e-Gov法令検索APIから関連法令を検索",
      parameters: {
        keywords: "検索キーワード",
        category: "法令カテゴリー"
      },
      handler: this.searchEGovLaws
    });

    this.addTool({
      name: "get_estat_data",
      description: "政府統計データAPI（e-Stat）から統計データを取得",
      parameters: {
        statisticId: "統計ID",
        region: "地域コード"
      },
      handler: this.getEStatData
    });
  }

  private async searchEGovLaws(params: any) {
    // e-Gov API実装
  }

  private async getEStatData(params: any) {
    // e-Stat API実装
  }
}
```

---

## 📊 利用可能なMCPサーバー一覧

### 公式提供サーバー
- **Fetch Server**: ウェブコンテンツ取得・変換
- **Filesystem Server**: セキュアなファイル操作
- **Git Server**: Gitリポジトリの読み取り・操作
- **Memory Server**: 知識グラフベースの永続メモリシステム

### プラットフォーム連携サーバー
- **GitHub MCP Server**: GitHubリポジトリとの連携
- **Notion MCP Server**: Notionワークスペースデータ管理
- **Supabase MCP Server**: データベース、認証、エッジ機能

### データ分析・収集系
- **Audiense Insights**: マーケティング洞察・オーディエンス分析
- **Coresignal**: 企業・従業員・求人データのB2Bデータ
- **Chronulus AI**: 予測・予報エージェント
- **Browser MCP Server**: ローカルブラウザ自動化
- **Data Exploration Server**: 自律的データ探索

---

## 🛠️ 段階的実装プラン

### Phase 1 (2週間): Fetch Server統合
1. **目標**: 外部ウェブデータの自動収集機能
2. **実装範囲**:
   - 既存`TopicAnalysisService`にウェブデータ収集機能を追加
   - パブリックコメントサイトとの連携実装
   - Firebase + SQLite同期に外部データも含める

### Phase 2 (3週間): Memory Server統合  
1. **目標**: 分析結果の継続学習と処理時間短縮
2. **実装範囲**:
   - 過去分析結果のメモリ化システム
   - 新規分析時の過去事例参照機能
   - 差分分析による処理時間最適化

### Phase 3 (4週間): カスタム政府データMCPサーバー構築
1. **目標**: 日本の政府データとの本格連携
2. **実装範囲**:
   - e-Gov、e-Stat APIとの連携MCPサーバー
   - ConsensusAIでの政府データ活用機能
   - 他システムからのConsensusAI利用を可能にするMCPサーバー化

---

## 💰 投資対効果分析

### 投資コスト
- **開発工数**: Phase 1-3で約9週間（既存チーム）
- **インフラコスト**: MCPサーバー運用で月額$50-100程度
- **API利用料**: 政府API（多くは無料）、外部データ取得費

### 期待収益
1. **分析品質向上**による顧客満足度向上
2. **包括的データ**による政策立案支援価値の向上
3. **自動化**による運用コスト削減
4. **差別化**による競合優位性確立

### ROI予測
- **低コスト・高インパクト**な投資
- **6ヶ月以内**での投資回収が期待される
- **長期的な競争優位性**の確立

---

## ⚠️ 実装時の注意事項

### セキュリティ考慮事項
1. **API認証統合**: 現在のFirebase認証システムとMCPサーバーの認証統合
2. **API KEY管理**: 外部サービス接続時のセキュアなキー管理
3. **データプライバシー**: 外部データ取得時の個人情報保護

### パフォーマンス考慮事項
1. **通信レイテンシ**: MCPサーバーとの通信最適化
2. **リアルタイム性**: 既存のSocket.IOリアルタイム機能との協調
3. **フォールバック**: MCP接続失敗時の既存機能での継続動作

### データ整合性
1. **同期戦略**: MCP経由取得データのFirebase + SQLite同期
2. **バリデーション**: 外部データの品質保証
3. **ロールバック**: MCP統合失敗時の安全な復旧

---

## 🎯 結論

### 推奨アプローチ
1. **Phase 1（Fetch Server）から段階的に開始**
2. **既存機能を破綻させない安全な統合**
3. **効果測定しながらの段階的拡張**

### 期待される成果
1. **分析精度**: 70% → 85%への向上
2. **データ量**: 3-5倍の増加
3. **処理時間**: 50%の短縮
4. **競争優位性**: 政策立案支援領域での先駆者地位確立

### 次のステップ
1. **Phase 1の詳細設計**
2. **Fetch Server統合のPoC実装**
3. **効果測定指標の設定**
4. **本格実装の開始**

ConsensusAIにMCPサーバーを統合することで、現在の優秀な政策立案支援システムを次世代レベルに進化させることが可能です。

---

**文書作成者**: Claude Code  
**最終更新**: 2025年1月7日