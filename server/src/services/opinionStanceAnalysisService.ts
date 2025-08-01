import { prisma } from '../lib/database';
import { getAIServiceManager } from './aiServiceManager';
import { AppError } from '../middleware/errorHandler';
import { FirebaseDataService } from './firebaseDataService';

export interface OpinionStanceAnalysis {
  id: string;
  opinionId: string;
  topicId: string;
  stance: 'agree' | 'disagree' | 'neutral' | 'conditional';
  confidence: number;
  reasoning?: string;
  analyzedAt: Date;
  // 拡張分析結果（内部処理用）
  detailedStance?: 'strong_agree' | 'agree' | 'conditional_agree' | 'lean_agree' | 'neutral' | 'lean_disagree' | 'conditional_disagree' | 'disagree' | 'strong_disagree';
  sentiment?: 'positive' | 'negative' | 'neutral' | 'mixed';
  constructiveness?: 'constructive' | 'neutral' | 'destructive';
  emotionalTone?: 'calm' | 'passionate' | 'frustrated' | 'enthusiastic' | 'concerned';
}

export interface OpinionStanceAnalysisRequest {
  opinions: Array<{
    id: string;
    content: string;
  }>;
  topic: {
    id: string;
    name: string;
    summary: string;
  };
}

export interface OpinionStanceAnalysisResult {
  analyses: OpinionStanceAnalysis[];
  summary: {
    totalOpinions: number;
    agreeCount: number;
    disagreeCount: number;
    neutralCount: number;
    conditionalCount: number;
    averageConfidence: number;
  };
}

export class OpinionStanceAnalysisService {
  private firebaseDataService: FirebaseDataService;

  constructor() {
    this.firebaseDataService = new FirebaseDataService();
  }

  /**
   * 複数の意見に対するトピック立場分析を実行
   */
  async analyzeOpinionStances(request: OpinionStanceAnalysisRequest): Promise<OpinionStanceAnalysisResult> {
    console.log('[StanceAnalysis] 🎯 立場分析開始:', {
      topicId: request.topic.id,
      topicName: request.topic.name,
      opinionsCount: request.opinions.length,
      timestamp: new Date().toISOString()
    });

    if (!request.opinions || request.opinions.length === 0) {
      throw new AppError(400, 'NO_OPINIONS', '分析対象の意見がありません');
    }

    try {
      // AI分析で各意見の立場を分析
      const aiAnalysisResult = await this.performAIStanceAnalysis(request);
      
      // 結果をデータベースに保存
      const savedAnalyses = await this.saveStanceAnalysesToDB(aiAnalysisResult, request.topic.id);
      
      // サマリーを生成
      const summary = this.generateStanceSummary(savedAnalyses);
      
      console.log('[StanceAnalysis] ✅ 立場分析完了:', {
        topicId: request.topic.id,
        analyzedCount: savedAnalyses.length,
        summary
      });

      return {
        analyses: savedAnalyses,
        summary
      };

    } catch (error) {
      console.error('[StanceAnalysis] ❌ 立場分析エラー:', error);
      throw new AppError(
        500,
        'STANCE_ANALYSIS_ERROR',
        `立場分析に失敗しました: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * 単一意見の立場分析
   */
  async analyzeSingleOpinionStance(
    opinionId: string,
    topicId: string,
    opinion: { id: string; content: string },
    topic: { id: string; name: string; summary: string }
  ): Promise<OpinionStanceAnalysis> {
    console.log('[StanceAnalysis] 🔍 単一意見立場分析:', { opinionId, topicId });

    const request: OpinionStanceAnalysisRequest = {
      opinions: [opinion],
      topic
    };

    const result = await this.analyzeOpinionStances(request);
    
    if (result.analyses.length === 0) {
      throw new AppError(500, 'STANCE_ANALYSIS_FAILED', '立場分析結果が取得できませんでした');
    }

    return result.analyses[0];
  }

  /**
   * プロジェクト内の全トピックに対する立場分析
   */
  async analyzeProjectStances(projectId: string, userId: string): Promise<OpinionStanceAnalysisResult[]> {
    console.log('[StanceAnalysis] 🏗️ プロジェクト全体立場分析:', { projectId, userId });

    try {
      // プロジェクトのトピックと意見を取得
      const projectData = await prisma.project.findFirst({
        where: {
          OR: [
            { id: projectId },
            { firebaseId: projectId }
          ],
          userId
        },
        include: {
          topics: {
            include: {
              opinions: true
            }
          }
        }
      });

      if (!projectData) {
        throw new AppError(404, 'PROJECT_NOT_FOUND', 'プロジェクトが見つかりません');
      }

      if (!projectData.topics || projectData.topics.length === 0) {
        throw new AppError(400, 'NO_TOPICS', '分析対象のトピックがありません');
      }

      const results: OpinionStanceAnalysisResult[] = [];

      // 各トピックについて立場分析を実行
      for (const topic of projectData.topics) {
        if (topic.opinions.length === 0) {
          console.log(`[StanceAnalysis] ⚠️ トピック "${topic.name}" には意見がありません`);
          continue;
        }

        const request: OpinionStanceAnalysisRequest = {
          opinions: topic.opinions.map(op => ({
            id: op.id,
            content: op.content
          })),
          topic: {
            id: topic.id,
            name: topic.name,
            summary: topic.summary
          }
        };

        try {
          const result = await this.analyzeOpinionStances(request);
          results.push(result);
        } catch (topicError) {
          console.error(`[StanceAnalysis] ❌ トピック "${topic.name}" の立場分析エラー:`, topicError);
          // 個別のトピックでエラーが発生しても全体の処理は継続
        }
      }

      console.log('[StanceAnalysis] ✅ プロジェクト全体立場分析完了:', {
        projectId,
        topicsProcessed: results.length,
        totalTopics: projectData.topics.length
      });

      return results;

    } catch (error) {
      console.error('[StanceAnalysis] ❌ プロジェクト立場分析エラー:', error);
      throw error;
    }
  }

  /**
   * AI分析による立場判定
   */
  private async performAIStanceAnalysis(request: OpinionStanceAnalysisRequest): Promise<OpinionStanceAnalysis[]> {
    console.log('[StanceAnalysis] 🤖 AI立場分析開始');

    const opinionsText = request.opinions.map((op, index) => 
      `意見${index + 1} (ID: ${op.id}): "${op.content}"`
    ).join('\n\n');

    const stancePrompt = `
以下のトピックに対する各意見の立場を多層的に分析してください：

トピック: ${request.topic.name}
トピック概要: ${request.topic.summary}

意見一覧:
${opinionsText}

## 🎯 分析指針：3段階の多層的分析

### 第1段階：感情・語調分析
- **sentiment**: positive（肯定的）, negative（否定的）, neutral（中立的）, mixed（複合的）
- **emotionalTone**: calm（冷静）, passionate（情熱的）, frustrated（不満）, enthusiastic（熱意）, concerned（懸念）
- **constructiveness**: constructive（建設的）, neutral（中立）, destructive（破壊的）

### 第2段階：詳細立場分析 
- **strong_agree**: 明確で強い賛成、積極的支持
- **agree**: 基本的に賛成、支持的
- **conditional_agree**: 条件付き賛成、改善案付き賛成
- **lean_agree**: やや賛成寄り、傾向的支持
- **neutral**: 真の中立、情報不足、判断保留
- **lean_disagree**: やや反対寄り、傾向的反対
- **conditional_disagree**: 条件付き反対、改善必要
- **disagree**: 基本的に反対、否定的
- **strong_disagree**: 明確で強い反対、完全否定

### 第3段階：最終立場判定
詳細分析を踏まえて従来の4分類に統合：
- **agree**: strong_agree, agree, conditional_agree, lean_agree
- **disagree**: strong_disagree, disagree, conditional_disagree, lean_disagree  
- **neutral**: neutral
- **conditional**: 複雑な条件付き立場

## 🔍 高精度分析のポイント

### 1. 文脈重視の判定
- 批判的語調でも建設的提案があれば「conditional_agree」
- 賞賛でも根本的反対があれば「conditional_disagree」
- 質問形式でも意図を読み取り立場を判定

### 2. 語調と立場の分離
- 感情的表現と実際の立場を区別
- 「問題はあるが改善案支持」→ conditional_agree
- 「良いアイデアだが実現困難」→ conditional_disagree

### 3. 建設性の評価
- 批判でも改善提案があれば constructive
- 単純な否定や攻撃は destructive
- 現状報告や質問は neutral

### 4. 信頼度の精密算出
- 明確な表現：0.8-1.0
- 推測可能：0.6-0.8
- 曖昧・複雑：0.4-0.6
- 不明確：0.2-0.4

## 📋 出力形式
{
  "stanceAnalysis": [
    {
      "opinionIndex": 1,
      "stance": "agree|disagree|neutral|conditional",
      "detailedStance": "strong_agree|agree|conditional_agree|lean_agree|neutral|lean_disagree|conditional_disagree|disagree|strong_disagree",
      "confidence": 0.0-1.0の数値,
      "reasoning": "詳細な判定理由（感情・語調・建設性・文脈を含む総合判断）",
      "sentiment": "positive|negative|neutral|mixed",
      "emotionalTone": "calm|passionate|frustrated|enthusiastic|concerned",
      "constructiveness": "constructive|neutral|destructive"
    }
  ]
}

## ⚠️ 重要ルール
1. **全意見必須分析**: 除外なし、全意見を分析対象とする
2. **多層的判定**: 感情→詳細立場→最終立場の順で分析
3. **文脈優先**: 表面的単語より文脈・意図・目的を重視
4. **建設性評価**: 批判的でも改善提案があれば建設的と判定
5. **精密confidence**: 判定根拠の強さを正確に数値化
6. **JSON厳守**: 上記形式の完全なJSONのみ出力

JSONのみ出力し、説明文は含めないでください。
`;

    try {
      const aiServiceManager = getAIServiceManager();
      const response = await aiServiceManager.generateResponse(
        stancePrompt,
        'gpt-4.1-nano',
        {
          purpose: 'classification',
          projectId: request.topic.id,
          userId: 'system'
        }
      );

      console.log('[StanceAnalysis] ✅ AI応答受信:', {
        responseLength: response.content.length,
        topicId: request.topic.id
      });

      // JSON解析
      let analysisData;
      try {
        let cleanContent = response.content.trim();
        
        // マークダウンコードブロックを除去
        if (cleanContent.startsWith('```json')) {
          cleanContent = cleanContent.replace(/^```json\s*/, '').replace(/\s*```$/, '');
        } else if (cleanContent.startsWith('```')) {
          cleanContent = cleanContent.replace(/^```\s*/, '').replace(/\s*```$/, '');
        }
        
        // JSON部分を抽出
        cleanContent = cleanContent.replace(/^[^{]*/, '').replace(/[^}]*$/, '');
        
        analysisData = JSON.parse(cleanContent);
        console.log('[StanceAnalysis] ✅ JSON解析成功');
      } catch (parseError) {
        console.error('[StanceAnalysis] ❌ JSON解析エラー:', parseError);
        console.error('[StanceAnalysis] 📄 問題のあるコンテンツ:', response.content.substring(0, 500));
        throw new AppError(500, 'AI_RESPONSE_PARSE_ERROR', 'AI分析結果の解析に失敗しました');
      }

      // 結果を変換
      const results: OpinionStanceAnalysis[] = [];
      
      if (analysisData.stanceAnalysis && Array.isArray(analysisData.stanceAnalysis)) {
        for (const analysis of analysisData.stanceAnalysis) {
          const opinionIndex = analysis.opinionIndex - 1; // 0ベースに変換
          if (opinionIndex >= 0 && opinionIndex < request.opinions.length) {
            const opinion = request.opinions[opinionIndex];
            
            // stance値の検証と自動修正
            const validStances = ['agree', 'disagree', 'neutral', 'conditional'];
            let stance = validStances.includes(analysis.stance) ? analysis.stance : 'neutral';
            
            // 詳細立場からの自動推論（analysisに詳細立場がある場合）
            if (analysis.detailedStance && !validStances.includes(analysis.stance)) {
              const detailedStance = analysis.detailedStance;
              if (['strong_agree', 'agree', 'conditional_agree', 'lean_agree'].includes(detailedStance)) {
                stance = detailedStance === 'conditional_agree' ? 'conditional' : 'agree';
              } else if (['strong_disagree', 'disagree', 'conditional_disagree', 'lean_disagree'].includes(detailedStance)) {
                stance = detailedStance === 'conditional_disagree' ? 'conditional' : 'disagree';
              } else {
                stance = 'neutral';
              }
            }
            
            // 拡張フィールドの検証
            const validDetailedStances = ['strong_agree', 'agree', 'conditional_agree', 'lean_agree', 'neutral', 'lean_disagree', 'conditional_disagree', 'disagree', 'strong_disagree'];
            const validSentiments = ['positive', 'negative', 'neutral', 'mixed'];
            const validEmotionalTones = ['calm', 'passionate', 'frustrated', 'enthusiastic', 'concerned'];
            const validConstructiveness = ['constructive', 'neutral', 'destructive'];
            
            results.push({
              id: '', // データベース保存時に設定
              opinionId: opinion.id,
              topicId: request.topic.id,
              stance: stance as 'agree' | 'disagree' | 'neutral' | 'conditional',
              confidence: Math.max(0, Math.min(1, Number(analysis.confidence) || 0)),
              reasoning: analysis.reasoning || '',
              analyzedAt: new Date(),
              // 拡張フィールド（検証付き）
              detailedStance: validDetailedStances.includes(analysis.detailedStance) ? analysis.detailedStance : undefined,
              sentiment: validSentiments.includes(analysis.sentiment) ? analysis.sentiment : undefined,
              constructiveness: validConstructiveness.includes(analysis.constructiveness) ? analysis.constructiveness : undefined,
              emotionalTone: validEmotionalTones.includes(analysis.emotionalTone) ? analysis.emotionalTone : undefined
            });
          }
        }
      }

      // 未処理の意見があれば中立として追加
      while (results.length < request.opinions.length) {
        const missingOpinion = request.opinions[results.length];
        results.push({
          id: '',
          opinionId: missingOpinion.id,
          topicId: request.topic.id,
          stance: 'neutral',
          confidence: 0.3,
          reasoning: 'AI分析で処理されなかった意見のため中立と判定',
          analyzedAt: new Date()
        });
      }

      console.log('[StanceAnalysis] ✅ AI立場分析完了:', {
        requestedCount: request.opinions.length,
        analyzedCount: results.length,
        stanceDistribution: this.countStanceDistribution(results)
      });

      return results;

    } catch (error) {
      console.error('[StanceAnalysis] ❌ AI立場分析エラー:', error);
      throw error;
    }
  }

  /**
   * 立場分析結果をデータベースに保存
   */
  private async saveStanceAnalysesToDB(analyses: OpinionStanceAnalysis[], topicId: string): Promise<OpinionStanceAnalysis[]> {
    console.log('[StanceAnalysis] 💾 データベース保存開始:', analyses.length, '件');

    const savedAnalyses: OpinionStanceAnalysis[] = [];

    try {
      await prisma.$transaction(async (tx) => {
        for (const analysis of analyses) {
          const saved = await tx.opinionStanceAnalysis.upsert({
            where: {
              opinionId_topicId: {
                opinionId: analysis.opinionId,
                topicId: topicId
              }
            },
            update: {
              stance: analysis.stance,
              confidence: analysis.confidence,
              reasoning: analysis.reasoning,
              analyzedAt: analysis.analyzedAt,
              updatedAt: new Date(),
              syncStatus: 'pending',
              // 拡張フィールド
              detailedStance: analysis.detailedStance,
              sentiment: analysis.sentiment,
              constructiveness: analysis.constructiveness,
              emotionalTone: analysis.emotionalTone
            },
            create: {
              opinionId: analysis.opinionId,
              topicId: topicId,
              stance: analysis.stance,
              confidence: analysis.confidence,
              reasoning: analysis.reasoning,
              analyzedAt: analysis.analyzedAt,
              syncStatus: 'pending',
              // 拡張フィールド
              detailedStance: analysis.detailedStance,
              sentiment: analysis.sentiment,
              constructiveness: analysis.constructiveness,
              emotionalTone: analysis.emotionalTone
            }
          });

          savedAnalyses.push({
            id: saved.id,
            opinionId: saved.opinionId,
            topicId: saved.topicId,
            stance: saved.stance as 'agree' | 'disagree' | 'neutral' | 'conditional',
            confidence: Number(saved.confidence),
            reasoning: saved.reasoning || undefined,
            analyzedAt: saved.analyzedAt,
            // 拡張フィールド
            detailedStance: saved.detailedStance as any,
            sentiment: saved.sentiment as any,
            constructiveness: saved.constructiveness as any,
            emotionalTone: saved.emotionalTone as any
          });
        }
      });

      console.log('[StanceAnalysis] ✅ データベース保存完了:', savedAnalyses.length, '件');

      // Firebase同期（ベストエフォート）
      try {
        await this.syncStanceAnalysesToFirebase(savedAnalyses);
      } catch (syncError) {
        console.warn('[StanceAnalysis] ⚠️ Firebase同期失敗:', syncError);
        // Firebase同期失敗は致命的エラーではない
      }

      return savedAnalyses;

    } catch (error) {
      console.error('[StanceAnalysis] ❌ データベース保存エラー:', error);
      throw new AppError(500, 'DATABASE_SAVE_ERROR', 'データベースへの保存に失敗しました');
    }
  }

  /**
   * Firebase同期（ベストエフォート）
   */
  private async syncStanceAnalysesToFirebase(analyses: OpinionStanceAnalysis[]): Promise<void> {
    console.log('[StanceAnalysis] 🔄 Firebase同期開始:', analyses.length, '件');

    try {
      // Firebase同期の実装は後続のフェーズで追加
      // 現在はSQLiteでの保存を確実に実行
      console.log('[StanceAnalysis] ⚠️ Firebase同期は次のフェーズで実装予定');
    } catch (error) {
      console.error('[StanceAnalysis] ❌ Firebase同期エラー:', error);
      throw error;
    }
  }

  /**
   * 立場分析のサマリー生成
   */
  private generateStanceSummary(analyses: OpinionStanceAnalysis[]): OpinionStanceAnalysisResult['summary'] {
    const distribution = this.countStanceDistribution(analyses);
    const totalConfidence = analyses.reduce((sum, analysis) => sum + analysis.confidence, 0);

    return {
      totalOpinions: analyses.length,
      agreeCount: distribution.agree,
      disagreeCount: distribution.disagree,
      neutralCount: distribution.neutral,
      conditionalCount: distribution.conditional,
      averageConfidence: analyses.length > 0 ? Math.round((totalConfidence / analyses.length) * 100) / 100 : 0
    };
  }

  /**
   * 立場の分布をカウント
   */
  private countStanceDistribution(analyses: OpinionStanceAnalysis[]): {
    agree: number;
    disagree: number;
    neutral: number;
    conditional: number;
  } {
    return analyses.reduce((acc, analysis) => {
      acc[analysis.stance]++;
      return acc;
    }, { agree: 0, disagree: 0, neutral: 0, conditional: 0 });
  }

  /**
   * トピックの立場分析結果を取得
   */
  async getTopicStanceAnalyses(topicId: string): Promise<OpinionStanceAnalysis[]> {
    try {
      const analyses = await prisma.opinionStanceAnalysis.findMany({
        where: { topicId },
        orderBy: { analyzedAt: 'desc' }
      });

      return analyses.map(analysis => ({
        id: analysis.id,
        opinionId: analysis.opinionId,
        topicId: analysis.topicId,
        stance: analysis.stance as 'agree' | 'disagree' | 'neutral' | 'conditional',
        confidence: Number(analysis.confidence),
        reasoning: analysis.reasoning || undefined,
        analyzedAt: analysis.analyzedAt,
        // 拡張フィールド
        detailedStance: analysis.detailedStance as any,
        sentiment: analysis.sentiment as any,
        constructiveness: analysis.constructiveness as any,
        emotionalTone: analysis.emotionalTone as any
      }));
    } catch (error) {
      console.error('[StanceAnalysis] ❌ 立場分析結果取得エラー:', error);
      throw new AppError(500, 'GET_STANCE_ANALYSIS_ERROR', '立場分析結果の取得に失敗しました');
    }
  }

  /**
   * 意見の立場分析結果を取得
   */
  async getOpinionStanceAnalyses(opinionId: string): Promise<OpinionStanceAnalysis[]> {
    try {
      const analyses = await prisma.opinionStanceAnalysis.findMany({
        where: { opinionId },
        orderBy: { analyzedAt: 'desc' }
      });

      return analyses.map(analysis => ({
        id: analysis.id,
        opinionId: analysis.opinionId,
        topicId: analysis.topicId,
        stance: analysis.stance as 'agree' | 'disagree' | 'neutral' | 'conditional',
        confidence: Number(analysis.confidence),
        reasoning: analysis.reasoning || undefined,
        analyzedAt: analysis.analyzedAt,
        // 拡張フィールド
        detailedStance: analysis.detailedStance as any,
        sentiment: analysis.sentiment as any,
        constructiveness: analysis.constructiveness as any,
        emotionalTone: analysis.emotionalTone as any
      }));
    } catch (error) {
      console.error('[StanceAnalysis] ❌ 意見立場分析結果取得エラー:', error);
      throw new AppError(500, 'GET_OPINION_STANCE_ERROR', '意見の立場分析結果取得に失敗しました');
    }
  }
}