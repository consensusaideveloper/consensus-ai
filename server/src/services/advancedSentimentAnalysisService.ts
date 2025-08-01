import { AIService } from './aiService';
import { Opinion } from '../types';
import { AppError } from '../middleware/errorHandler';

export interface MultiDimensionalEmotion {
    joy: number;
    sadness: number;
    anger: number;
    fear: number;
    surprise: number;
    disgust: number;
    trust: number;
    anticipation: number;
}

export interface ToneAnalysis {
    formal: number;
    casual: number;
    urgent: number;
    constructive: number;
    critical: number;
}

export interface ObjectivityAnalysis {
    subjective: number;
    objective: number;
    factual: number;
    opinion: number;
}

export interface AdvancedSentimentResult {
    opinionId: string;
    emotions: MultiDimensionalEmotion;
    tone: ToneAnalysis;
    objectivity: ObjectivityAnalysis;
    overallSentiment: {
        polarity: number;      // -1 (negative) to 1 (positive)
        intensity: number;     // 0 to 1
        confidence: number;    // 0 to 1
    };
    linguisticFeatures: {
        wordCount: number;
        sentenceCount: number;
        averageWordLength: number;
        complexityScore: number;
    };
}

export interface BatchSentimentResult {
    results: AdvancedSentimentResult[];
    aggregatedEmotions: MultiDimensionalEmotion;
    aggregatedTone: ToneAnalysis;
    aggregatedObjectivity: ObjectivityAnalysis;
    qualityMetrics: {
        consistencyScore: number;
        reliabilityScore: number;
        processingTime: number;
    };
}

export class AdvancedSentimentAnalysisService {
    private aiService: AIService;
    
    // Phase 3-1: 感情分析パラメータ
    private readonly BATCH_SIZE = 10;
    private readonly MAX_RETRIES = 3;
    private readonly CONFIDENCE_THRESHOLD = 0.7;

    constructor() {
        this.aiService = new AIService();
    }

    /**
     * Phase 3-1: 高度感情・トーン分析をバッチ実行
     */
    async performBatchAdvancedSentimentAnalysis(opinions: Opinion[]): Promise<BatchSentimentResult> {
        console.log('[AdvancedSentiment] 🎭 高度感情分析開始:', {
            opinionsCount: opinions.length,
            batchSize: this.BATCH_SIZE,
            timestamp: new Date().toISOString()
        });

        const startTime = Date.now();
        const results: AdvancedSentimentResult[] = [];

        try {
            // バッチ処理で効率的に分析
            for (let i = 0; i < opinions.length; i += this.BATCH_SIZE) {
                const batch = opinions.slice(i, i + this.BATCH_SIZE);
                
                console.log(`[AdvancedSentiment] 📊 バッチ ${Math.floor(i / this.BATCH_SIZE) + 1}/${Math.ceil(opinions.length / this.BATCH_SIZE)} 処理中...`);
                
                const batchResults = await this.processBatch(batch);
                results.push(...batchResults);
                
                // 進捗表示
                const progress = Math.round((i + batch.length) / opinions.length * 100);
                console.log(`[AdvancedSentiment] 🔄 進捗: ${progress}% (${i + batch.length}/${opinions.length})`);
            }

            // 集約分析
            const aggregatedData = this.aggregateResults(results);
            const qualityMetrics = this.calculateQualityMetrics(results, Date.now() - startTime);

            console.log('[AdvancedSentiment] ✅ 高度感情分析完了:', {
                processedOpinions: results.length,
                executionTime: `${Date.now() - startTime}ms`,
                averageConfidence: results.reduce((sum, r) => sum + r.overallSentiment.confidence, 0) / results.length,
                dominantEmotion: this.getDominantEmotion(aggregatedData.aggregatedEmotions)
            });

            return {
                results,
                ...aggregatedData,
                qualityMetrics
            };

        } catch (error) {
            console.error('[AdvancedSentiment] ❌ 高度感情分析エラー:', error);
            throw new AppError(
                500,
                'ADVANCED_SENTIMENT_ANALYSIS_ERROR',
                `高度感情分析に失敗: ${error instanceof Error ? error.message : String(error)}`
            );
        }
    }

    /**
     * 単一意見の高度感情分析
     */
    async analyzeSingleOpinion(opinion: Opinion): Promise<AdvancedSentimentResult> {
        console.log('[AdvancedSentiment] 🔍 単一意見分析:', opinion.id);

        try {
            const result = await this.performDetailedSentimentAnalysis(opinion);
            
            console.log('[AdvancedSentiment] ✅ 単一意見分析完了:', {
                opinionId: opinion.id,
                dominantEmotion: this.getDominantEmotion(result.emotions),
                overallPolarity: result.overallSentiment.polarity,
                confidence: result.overallSentiment.confidence
            });

            return result;

        } catch (error) {
            console.error('[AdvancedSentiment] ❌ 単一意見分析エラー:', error);
            throw new AppError(
                500,
                'SINGLE_SENTIMENT_ANALYSIS_ERROR',
                `意見感情分析に失敗: ${error instanceof Error ? error.message : String(error)}`
            );
        }
    }

    /**
     * バッチ処理実行
     */
    /**
     * 🚀 統合バッチ処理：単一API呼び出しで複数意見を一括分析
     */
    private async processBatch(batch: Opinion[]): Promise<AdvancedSentimentResult[]> {
        console.log(`[AdvancedSentiment] 🚀 統合バッチ分析開始: ${batch.length}件の意見を単一API呼び出しで分析`);
        
        try {
            // 🔄 統合AI分析で全意見を一括処理
            const unifiedResult = await this.performUnifiedBatchSentimentAnalysis(batch);
            
            console.log(`[AdvancedSentiment] ✅ 統合バッチ分析完了`, {
                processedOpinions: unifiedResult.length,
                apiCalls: 1,
                originalApiCalls: batch.length // 削減前の予想API呼び出し数
            });
            
            return unifiedResult;
            
        } catch (error) {
            console.error(`[AdvancedSentiment] ❌ 統合バッチ分析エラー - フォールバック実行:`, error);
            // フォールバック: 簡易分析で代替
            return batch.map(opinion => this.getFallbackSentimentAnalysis(opinion));
        }
    }

    /**
     * 🚀 統合バッチ感情分析：複数意見を単一API呼び出しで分析
     */
    private async performUnifiedBatchSentimentAnalysis(opinions: Opinion[]): Promise<AdvancedSentimentResult[]> {
        const opinionsText = opinions.map((opinion, index) => 
            `意見${index + 1} (ID: ${opinion.id}): "${opinion.content}"`
        ).join('\n\n');

        const unifiedPrompt = `
以下の${opinions.length}件の意見について、多次元的な感情・トーン分析を行い、JSON形式で回答してください。

意見一覧:
${opinionsText}

各意見について以下の項目を0-1の数値で評価し、JSON形式で回答してください：

{
  "results": [
    {
      "opinionIndex": 1, // 1から始まる意見番号
      "emotions": {
        "joy": 喜び・楽しさの度合い,
        "sadness": 悲しみ・落胆の度合い,
        "anger": 怒り・憤りの度合い,
        "fear": 恐れ・不安の度合い,
        "surprise": 驚き・意外性の度合い,
        "disgust": 嫌悪・拒否の度合い,
        "trust": 信頼・確信の度合い,
        "anticipation": 期待・希望の度合い
      },
      "tone": {
        "formal": 公式・堅い表現の度合い,
        "casual": 親しみやすい・カジュアルな度合い,
        "urgent": 緊急性・切迫感の度合い,
        "constructive": 建設的・前向きな度合い,
        "critical": 批判的・否定的な度合い
      },
      "objectivity": {
        "subjective": 主観的・個人的な度合い,
        "objective": 客観的・中立的な度合い,
        "factual": 事実に基づく度合い,
        "opinion": 意見・推測の度合い
      },
      "overallSentiment": {
        "polarity": 全体的な感情の方向性（-1: 否定的, 0: 中立, 1: 肯定的）,
        "intensity": 感情の強さ（0: 弱い, 1: 強い）,
        "confidence": 分析の確信度（0: 低い, 1: 高い）
      }
    }
  ]
}

注意事項:
- 各意見について独立して分析してください
- すべての数値は小数点第2位まで記載してください
- opinionIndexは1から始まり、上記の意見一覧の番号と一致させてください

JSONのみを回答してください。`;

        try {
            const aiResponse = await this.aiService.generateResponse(unifiedPrompt, 'gpt-4.1-nano');
            const response = JSON.parse(aiResponse.content);

            // 結果をAdvancedSentimentResult形式に変換
            const results: AdvancedSentimentResult[] = [];
            
            if (response.results && Array.isArray(response.results)) {
                for (const result of response.results) {
                    const opinionIndex = result.opinionIndex - 1; // 0ベースに変換
                    if (opinionIndex >= 0 && opinionIndex < opinions.length) {
                        const opinion = opinions[opinionIndex];
                        
                        const sentimentResult: AdvancedSentimentResult = {
                            opinionId: opinion.id,
                            emotions: this.sanitizeEmotions(result.emotions),
                            tone: this.sanitizeTone(result.tone),
                            objectivity: this.sanitizeObjectivity(result.objectivity),
                            overallSentiment: this.sanitizeOverallSentiment(result.overallSentiment),
                            linguisticFeatures: this.calculateLinguisticFeatures(opinion.content)
                        };
                        
                        results.push(sentimentResult);
                    }
                }
            }

            // 結果が不完全な場合はフォールバックで補完
            while (results.length < opinions.length) {
                const missingOpinion = opinions[results.length];
                results.push(this.getFallbackSentimentAnalysis(missingOpinion));
            }

            return results;
            
        } catch (error) {
            console.error('[AdvancedSentiment] ❌ 統合AI分析エラー:', error);
            throw error;
        }
    }

    /**
     * 詳細感情分析実行
     */
    private async performDetailedSentimentAnalysis(opinion: Opinion): Promise<AdvancedSentimentResult> {
        const prompt = `
以下の意見について、多次元的な感情・トーン分析を行ってください。

意見内容: "${opinion.content}"

以下の項目について0-1の数値で評価し、JSON形式で回答してください：

{
  "emotions": {
    "joy": 喜び・楽しさの度合い,
    "sadness": 悲しみ・落胆の度合い,
    "anger": 怒り・憤りの度合い,
    "fear": 恐れ・不安の度合い,
    "surprise": 驚き・意外性の度合い,
    "disgust": 嫌悪・拒否の度合い,
    "trust": 信頼・確信の度合い,
    "anticipation": 期待・希望の度合い
  },
  "tone": {
    "formal": 公式・堅い表現の度合い,
    "casual": 親しみやすい・カジュアルな度合い,
    "urgent": 緊急性・切迫感の度合い,
    "constructive": 建設的・前向きな度合い,
    "critical": 批判的・否定的な度合い
  },
  "objectivity": {
    "subjective": 主観的・個人的な度合い,
    "objective": 客観的・中立的な度合い,
    "factual": 事実に基づく度合い,
    "opinion": 意見・推測の度合い
  },
  "overallSentiment": {
    "polarity": 全体的な感情の方向性（-1: 否定的, 0: 中立, 1: 肯定的）,
    "intensity": 感情の強さ（0: 弱い, 1: 強い）,
    "confidence": 分析の確信度（0: 低い, 1: 高い）
  }
}

すべての数値は小数点第2位まで記載してください。
        `;

        try {
            const aiResponse = await this.aiService.generateResponse(prompt, 'gpt-4.1-nano');
            const response = aiResponse.content;

            const analysis = JSON.parse(response);

            // データ検証とサニタイゼーション
            const sanitizedResult: AdvancedSentimentResult = {
                opinionId: opinion.id,
                emotions: this.sanitizeEmotions(analysis.emotions),
                tone: this.sanitizeTone(analysis.tone),
                objectivity: this.sanitizeObjectivity(analysis.objectivity),
                overallSentiment: this.sanitizeOverallSentiment(analysis.overallSentiment),
                linguisticFeatures: this.calculateLinguisticFeatures(opinion.content)
            };

            return sanitizedResult;

        } catch (error) {
            console.warn('[AdvancedSentiment] ⚠️ AI分析失敗、フォールバック分析使用:', error);
            return this.getFallbackSentimentAnalysis(opinion);
        }
    }

    /**
     * 感情データのサニタイゼーション
     */
    private sanitizeEmotions(emotions: any): MultiDimensionalEmotion {
        return {
            joy: this.clampValue(emotions?.joy),
            sadness: this.clampValue(emotions?.sadness),
            anger: this.clampValue(emotions?.anger),
            fear: this.clampValue(emotions?.fear),
            surprise: this.clampValue(emotions?.surprise),
            disgust: this.clampValue(emotions?.disgust),
            trust: this.clampValue(emotions?.trust),
            anticipation: this.clampValue(emotions?.anticipation)
        };
    }

    /**
     * トーンデータのサニタイゼーション
     */
    private sanitizeTone(tone: any): ToneAnalysis {
        return {
            formal: this.clampValue(tone?.formal),
            casual: this.clampValue(tone?.casual),
            urgent: this.clampValue(tone?.urgent),
            constructive: this.clampValue(tone?.constructive),
            critical: this.clampValue(tone?.critical)
        };
    }

    /**
     * 客観性データのサニタイゼーション
     */
    private sanitizeObjectivity(objectivity: any): ObjectivityAnalysis {
        return {
            subjective: this.clampValue(objectivity?.subjective),
            objective: this.clampValue(objectivity?.objective),
            factual: this.clampValue(objectivity?.factual),
            opinion: this.clampValue(objectivity?.opinion)
        };
    }

    /**
     * 全体感情データのサニタイゼーション
     */
    private sanitizeOverallSentiment(overall: any): AdvancedSentimentResult['overallSentiment'] {
        return {
            polarity: this.clampValue(overall?.polarity, -1, 1),
            intensity: this.clampValue(overall?.intensity),
            confidence: this.clampValue(overall?.confidence)
        };
    }

    /**
     * 値の正規化・クランプ
     */
    private clampValue(value: any, min: number = 0, max: number = 1): number {
        const num = Number(value);
        if (isNaN(num)) return min;
        return Math.max(min, Math.min(max, num));
    }

    /**
     * 言語的特徴の計算
     */
    private calculateLinguisticFeatures(text: string): AdvancedSentimentResult['linguisticFeatures'] {
        const words = text.trim().split(/\s+/);
        const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
        
        const averageWordLength = words.reduce((sum, word) => sum + word.length, 0) / words.length;
        
        // 複雑性スコア（語彙の多様性と文の長さから計算）
        const uniqueWords = new Set(words.map(w => w.toLowerCase()));
        const lexicalDiversity = uniqueWords.size / words.length;
        const averageSentenceLength = words.length / sentences.length;
        const complexityScore = (lexicalDiversity + Math.min(averageSentenceLength / 20, 1)) / 2;

        return {
            wordCount: words.length,
            sentenceCount: sentences.length,
            averageWordLength: parseFloat(averageWordLength.toFixed(2)),
            complexityScore: parseFloat(complexityScore.toFixed(2))
        };
    }

    /**
     * フォールバック感情分析（AI分析失敗時）
     */
    private getFallbackSentimentAnalysis(opinion: Opinion): AdvancedSentimentResult {
        const content = opinion.content.toLowerCase();
        
        // 簡易キーワードベース分析
        const positiveWords = ['良い', '素晴らしい', '改善', '向上', '効果', '成功', '満足'];
        const negativeWords = ['悪い', '問題', '困る', '失敗', '不満', '課題', '困難'];
        
        const positiveCount = positiveWords.filter(word => content.includes(word)).length;
        const negativeCount = negativeWords.filter(word => content.includes(word)).length;
        
        const polarity = positiveCount > negativeCount ? 0.6 : negativeCount > positiveCount ? -0.6 : 0;
        const intensity = Math.min((positiveCount + negativeCount) / 10, 1);

        return {
            opinionId: opinion.id,
            emotions: {
                joy: positiveCount > 0 ? 0.5 : 0.1,
                sadness: negativeCount > 0 ? 0.4 : 0.1,
                anger: negativeCount > 1 ? 0.3 : 0.05,
                fear: negativeCount > 0 ? 0.2 : 0.05,
                surprise: 0.1,
                disgust: negativeCount > 1 ? 0.2 : 0.05,
                trust: positiveCount > 0 ? 0.6 : 0.3,
                anticipation: positiveCount > 0 ? 0.5 : 0.2
            },
            tone: {
                formal: content.includes('です') || content.includes('ます') ? 0.7 : 0.3,
                casual: 0.3,
                urgent: content.includes('急') || content.includes('すぐ') ? 0.6 : 0.2,
                constructive: positiveCount > 0 ? 0.6 : 0.3,
                critical: negativeCount > 0 ? 0.5 : 0.2
            },
            objectivity: {
                subjective: 0.6,
                objective: 0.4,
                factual: 0.3,
                opinion: 0.7
            },
            overallSentiment: {
                polarity,
                intensity,
                confidence: 0.3 // 低い信頼度
            },
            linguisticFeatures: this.calculateLinguisticFeatures(opinion.content)
        };
    }

    /**
     * 結果の集約処理
     */
    private aggregateResults(results: AdvancedSentimentResult[]): {
        aggregatedEmotions: MultiDimensionalEmotion;
        aggregatedTone: ToneAnalysis;
        aggregatedObjectivity: ObjectivityAnalysis;
    } {
        const count = results.length;
        
        // 感情の平均値計算
        const aggregatedEmotions: MultiDimensionalEmotion = {
            joy: results.reduce((sum, r) => sum + r.emotions.joy, 0) / count,
            sadness: results.reduce((sum, r) => sum + r.emotions.sadness, 0) / count,
            anger: results.reduce((sum, r) => sum + r.emotions.anger, 0) / count,
            fear: results.reduce((sum, r) => sum + r.emotions.fear, 0) / count,
            surprise: results.reduce((sum, r) => sum + r.emotions.surprise, 0) / count,
            disgust: results.reduce((sum, r) => sum + r.emotions.disgust, 0) / count,
            trust: results.reduce((sum, r) => sum + r.emotions.trust, 0) / count,
            anticipation: results.reduce((sum, r) => sum + r.emotions.anticipation, 0) / count
        };

        // トーンの平均値計算
        const aggregatedTone: ToneAnalysis = {
            formal: results.reduce((sum, r) => sum + r.tone.formal, 0) / count,
            casual: results.reduce((sum, r) => sum + r.tone.casual, 0) / count,
            urgent: results.reduce((sum, r) => sum + r.tone.urgent, 0) / count,
            constructive: results.reduce((sum, r) => sum + r.tone.constructive, 0) / count,
            critical: results.reduce((sum, r) => sum + r.tone.critical, 0) / count
        };

        // 客観性の平均値計算
        const aggregatedObjectivity: ObjectivityAnalysis = {
            subjective: results.reduce((sum, r) => sum + r.objectivity.subjective, 0) / count,
            objective: results.reduce((sum, r) => sum + r.objectivity.objective, 0) / count,
            factual: results.reduce((sum, r) => sum + r.objectivity.factual, 0) / count,
            opinion: results.reduce((sum, r) => sum + r.objectivity.opinion, 0) / count
        };

        return {
            aggregatedEmotions,
            aggregatedTone,
            aggregatedObjectivity
        };
    }

    /**
     * 品質メトリクス計算
     */
    private calculateQualityMetrics(results: AdvancedSentimentResult[], processingTime: number): BatchSentimentResult['qualityMetrics'] {
        // 一貫性スコア（結果のばらつきが少ないほど高い）
        const confidenceScores = results.map(r => r.overallSentiment.confidence);
        const averageConfidence = confidenceScores.reduce((sum, c) => sum + c, 0) / confidenceScores.length;
        const confidenceVariance = confidenceScores.reduce((sum, c) => sum + Math.pow(c - averageConfidence, 2), 0) / confidenceScores.length;
        const consistencyScore = Math.max(0, 1 - confidenceVariance);

        // 信頼性スコア（高信頼度の結果の割合）
        const highConfidenceCount = results.filter(r => r.overallSentiment.confidence >= this.CONFIDENCE_THRESHOLD).length;
        const reliabilityScore = highConfidenceCount / results.length;

        return {
            consistencyScore: parseFloat(consistencyScore.toFixed(3)),
            reliabilityScore: parseFloat(reliabilityScore.toFixed(3)),
            processingTime
        };
    }

    /**
     * 支配的感情の特定
     */
    private getDominantEmotion(emotions: MultiDimensionalEmotion): string {
        const emotionEntries = Object.entries(emotions);
        const dominant = emotionEntries.reduce((max, current) => 
            current[1] > max[1] ? current : max
        );
        return dominant[0];
    }

    /**
     * 配列をチャンクに分割
     */
    private chunkArray<T>(array: T[], chunkSize: number): T[][] {
        const chunks: T[][] = [];
        for (let i = 0; i < array.length; i += chunkSize) {
            chunks.push(array.slice(i, i + chunkSize));
        }
        return chunks;
    }
}