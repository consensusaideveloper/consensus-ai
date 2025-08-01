import { Opinion, Topic } from '../types';
import { AIService } from './aiService';
import { AppError } from '../middleware/errorHandler';
import { LimitsConfig } from '../config/limits';

export interface ConfidenceMetrics {
    topicClassification: number;  // トピック分類の信頼度
    sentimentAccuracy: number;    // 感情分析の精度
    duplicateDetection: number;   // 重複検出の確実性
    overallConfidence: number;    // 全体的な信頼度
}

export interface UncertaintyQuantification {
    ambiguousOpinions: Array<{
        opinion: Opinion;
        ambiguityScore: number;
        ambiguityReasons: string[];
    }>;
    borderlineClassifications: Array<{
        opinion: Opinion;
        topicId: string;
        confidence: number;
        alternativeTopics: Array<{
            topicId: string;
            confidence: number;
        }>;
    }>;
    lowConfidenceTopics: Array<{
        topic: Topic;
        confidenceScore: number;
        issues: string[];
    }>;
}

export interface AnalysisRecommendations {
    manualReview: boolean;
    additionalData: boolean;
    reclassification: boolean;
    confidence: number;
    actions: Array<{
        action: string;
        priority: 'high' | 'medium' | 'low';
        description: string;
        estimatedImpact: number;
    }>;
}

export interface AnalysisConfidenceResult {
    confidenceMetrics: ConfidenceMetrics;
    uncertaintyQuantification: UncertaintyQuantification;
    recommendations: AnalysisRecommendations;
    qualityIndicators: {
        dataCompleteness: number;
        analysisConsistency: number;
        resultStability: number;
        methodReliability: number;
    };
    processingTime: number;
}

export class AnalysisConfidenceService {
    private aiService: AIService;
    
    // 環境変数対応: AI信頼性設定を取得
    private getReliabilityConfig() {
        return LimitsConfig.getAIReliabilityConfig();
    }

    constructor() {
        this.aiService = new AIService();
    }

    /**
     * Phase 3-2: 分析結果の信頼性評価を実行
     */
    async evaluateAnalysisConfidence(
        opinions: Opinion[],
        topics: Topic[],
        analysisMetadata: any = {}
    ): Promise<AnalysisConfidenceResult> {
        console.log('[AnalysisConfidence] 🎯 分析信頼性評価開始:', {
            opinionsCount: opinions.length,
            topicsCount: topics.length,
            timestamp: new Date().toISOString()
        });

        const startTime = Date.now();

        try {
            // Step 1: 信頼度メトリクス計算
            console.log('[AnalysisConfidence] 📊 STEP 1: 信頼度メトリクス計算中...');
            const confidenceMetrics = await this.calculateConfidenceMetrics(opinions, topics, analysisMetadata);
            
            // Step 2: 不確実性の定量化
            console.log('[AnalysisConfidence] 🔍 STEP 2: 不確実性定量化中...');
            const uncertaintyQuantification = await this.quantifyUncertainty(opinions, topics);
            
            // Step 3: 推奨アクション生成
            console.log('[AnalysisConfidence] 💡 STEP 3: 推奨アクション生成中...');
            const recommendations = await this.generateRecommendations(
                confidenceMetrics, 
                uncertaintyQuantification, 
                opinions, 
                topics
            );
            
            // Step 4: 品質指標計算
            console.log('[AnalysisConfidence] 📈 STEP 4: 品質指標計算中...');
            const qualityIndicators = await this.calculateQualityIndicators(opinions, topics, analysisMetadata);

            const processingTime = Date.now() - startTime;
            console.log('[AnalysisConfidence] ✅ 分析信頼性評価完了:', {
                processingTime: `${processingTime}ms`,
                overallConfidence: confidenceMetrics.overallConfidence.toFixed(3),
                ambiguousOpinions: uncertaintyQuantification.ambiguousOpinions.length,
                recommendedActions: recommendations.actions.length
            });

            return {
                confidenceMetrics,
                uncertaintyQuantification,
                recommendations,
                qualityIndicators,
                processingTime
            };

        } catch (error) {
            console.error('[AnalysisConfidence] ❌ 分析信頼性評価エラー:', error);
            throw new AppError(
                500,
                'ANALYSIS_CONFIDENCE_ERROR',
                `分析信頼性評価に失敗: ${error instanceof Error ? error.message : String(error)}`
            );
        }
    }

    /**
     * 信頼度メトリクス計算
     */
    private async calculateConfidenceMetrics(
        opinions: Opinion[], 
        topics: Topic[], 
        metadata: any
    ): Promise<ConfidenceMetrics> {
        console.log('[AnalysisConfidence] 📊 信頼度メトリクス計算開始');

        // トピック分類の信頼度
        const topicClassification = await this.evaluateTopicClassificationConfidence(opinions, topics);
        
        // 感情分析の精度
        const sentimentAccuracy = await this.evaluateSentimentAccuracy(opinions);
        
        // 重複検出の確実性
        const duplicateDetection = await this.evaluateDuplicateDetectionConfidence(opinions);
        
        // 全体的な信頼度（重み付き平均）
        const overallConfidence = (
            topicClassification * 0.4 + 
            sentimentAccuracy * 0.3 + 
            duplicateDetection * 0.3
        );

        const metrics = {
            topicClassification,
            sentimentAccuracy,
            duplicateDetection,
            overallConfidence
        };

        console.log('[AnalysisConfidence] ✅ 信頼度メトリクス計算完了:', metrics);
        return metrics;
    }

    /**
     * トピック分類信頼度評価
     */
    private async evaluateTopicClassificationConfidence(opinions: Opinion[], topics: Topic[]): Promise<number> {
        let totalConfidence = 0;
        let classifiedCount = 0;

        // 分類済み意見の信頼度を評価
        const classifiedOpinions = opinions.filter(op => op.topicId);
        
        for (const opinion of classifiedOpinions) {
            const confidence = await this.calculateClassificationConfidence(opinion, topics);
            totalConfidence += confidence;
            classifiedCount++;
        }

        // 未分類意見の存在も信頼度に影響
        const classificationRate = opinions.length > 0 ? classifiedOpinions.length / opinions.length : 0;
        const baseConfidence = classifiedCount > 0 ? totalConfidence / classifiedCount : 0;
        
        // 分類率を考慮した最終信頼度
        return baseConfidence * Math.min(1, classificationRate + 0.2);
    }

    /**
     * 単一意見の分類信頼度計算
     */
    private async calculateClassificationConfidence(opinion: Opinion, topics: Topic[]): Promise<number> {
        if (!opinion.topicId) return 0;

        const assignedTopic = topics.find(t => t.id === opinion.topicId);
        if (!assignedTopic) return 0;

        // 簡易実装: 意見内容とトピック名の関連性を評価
        try {
            const prompt = `
以下の意見が指定されたトピックに適切に分類されているかを評価してください。

意見: "${opinion.content}"
分類先トピック: "${assignedTopic.name}"
トピック説明: "${assignedTopic.summary}"

分類の適切性を0-1の数値で評価してください。
数値のみを回答してください。
            `;

            const aiResponse = await this.aiService.generateResponse(prompt, 'gpt-4.1-nano');
            const confidence = parseFloat(aiResponse.content.replace(/[^\d.]/g, ''));
            
            return isNaN(confidence) ? 0.5 : Math.max(0, Math.min(1, confidence));

        } catch (error) {
            console.warn('[AnalysisConfidence] ⚠️ 分類信頼度計算失敗:', error);
            return 0.5; // デフォルト値
        }
    }

    /**
     * 感情分析精度評価
     */
    private async evaluateSentimentAccuracy(opinions: Opinion[]): Promise<number> {
        let accuracySum = 0;
        let evaluatedCount = 0;

        // サンプルを選んで感情分析の妥当性を評価
        const sampleSize = Math.min(20, opinions.length);
        const sampleOpinions = this.selectRandomSample(opinions, sampleSize);

        for (const opinion of sampleOpinions) {
            const accuracy = await this.evaluateSentimentAccuracy_Single(opinion);
            accuracySum += accuracy;
            evaluatedCount++;
        }

        return evaluatedCount > 0 ? accuracySum / evaluatedCount : 0.5;
    }

    /**
     * 単一意見の感情分析精度評価
     */
    private async evaluateSentimentAccuracy_Single(opinion: Opinion): Promise<number> {
        try {
            const prompt = `
以下の意見について、感情分析の結果が適切かを評価してください。

意見: "${opinion.content}"
現在の感情分類: ${opinion.sentiment}

この感情分類の適切性を0-1の数値で評価してください。
数値のみを回答してください。
            `;

            const aiResponse = await this.aiService.generateResponse(prompt, 'gpt-4.1-nano');
            const accuracy = parseFloat(aiResponse.content.replace(/[^\d.]/g, ''));
            
            return isNaN(accuracy) ? 0.5 : Math.max(0, Math.min(1, accuracy));

        } catch (error) {
            console.warn('[AnalysisConfidence] ⚠️ 感情分析精度評価失敗:', error);
            return 0.5;
        }
    }

    /**
     * 重複検出信頼度評価
     */
    private async evaluateDuplicateDetectionConfidence(opinions: Opinion[]): Promise<number> {
        // 簡易実装: 内容の多様性から重複検出の信頼度を推定
        if (opinions.length < 2) return 1.0;

        const uniqueWords = new Set<string>();
        const totalWords: string[] = [];

        opinions.forEach(opinion => {
            const words = opinion.content.toLowerCase().split(/\s+/);
            words.forEach(word => {
                if (word.length > 2) {
                    uniqueWords.add(word);
                    totalWords.push(word);
                }
            });
        });

        // 語彙多様性が高いほど重複検出の信頼度も高い
        const lexicalDiversity = uniqueWords.size / totalWords.length;
        return Math.min(1, lexicalDiversity * 2); // 0.5以上で満点
    }

    /**
     * 不確実性の定量化
     */
    private async quantifyUncertainty(opinions: Opinion[], topics: Topic[]): Promise<UncertaintyQuantification> {
        console.log('[AnalysisConfidence] 🔍 不確実性定量化開始');

        // 曖昧な意見の特定
        const ambiguousOpinions = await this.identifyAmbiguousOpinions(opinions);
        
        // 境界的な分類の特定
        const borderlineClassifications = await this.identifyBorderlineClassifications(opinions, topics);
        
        // 低信頼度トピックの特定
        const lowConfidenceTopics = await this.identifyLowConfidenceTopics(topics, opinions);

        console.log('[AnalysisConfidence] ✅ 不確実性定量化完了:', {
            ambiguous: ambiguousOpinions.length,
            borderline: borderlineClassifications.length,
            lowConfidence: lowConfidenceTopics.length
        });

        return {
            ambiguousOpinions,
            borderlineClassifications,
            lowConfidenceTopics
        };
    }

    /**
     * 曖昧な意見の特定
     */
    private async identifyAmbiguousOpinions(opinions: Opinion[]): Promise<UncertaintyQuantification['ambiguousOpinions']> {
        const ambiguousOpinions: UncertaintyQuantification['ambiguousOpinions'] = [];

        for (const opinion of opinions) {
            const ambiguityAnalysis = await this.analyzeOpinionAmbiguity(opinion);
            
            if (ambiguityAnalysis.score >= this.getReliabilityConfig().ambiguityThreshold) {
                ambiguousOpinions.push({
                    opinion,
                    ambiguityScore: ambiguityAnalysis.score,
                    ambiguityReasons: ambiguityAnalysis.reasons
                });
            }
        }

        return ambiguousOpinions;
    }

    /**
     * 意見の曖昧性分析
     */
    private async analyzeOpinionAmbiguity(opinion: Opinion): Promise<{score: number, reasons: string[]}> {
        try {
            const prompt = `
以下の意見について、曖昧性を分析してください。

意見: "${opinion.content}"

以下の観点から曖昧性を評価し、JSON形式で回答してください：

{
  "score": 曖昧性スコア（0-1、1が最も曖昧）,
  "reasons": ["曖昧な理由1", "曖昧な理由2", ...]
}

曖昧性の要因例：
- 文意が不明確
- 複数の解釈が可能
- 主語や目的語が不明
- 専門用語が多く理解困難
- 文章が断片的
            `;

            const aiResponse = await this.aiService.generateResponse(prompt, 'gpt-4.1-nano');
            const analysis = JSON.parse(aiResponse.content);

            return {
                score: this.clampValue(analysis.score),
                reasons: Array.isArray(analysis.reasons) ? analysis.reasons : ['分析不可']
            };

        } catch (error) {
            console.warn('[AnalysisConfidence] ⚠️ 曖昧性分析失敗:', error);
            return {
                score: 0.3,
                reasons: ['分析エラー']
            };
        }
    }

    /**
     * 境界的分類の特定
     */
    private async identifyBorderlineClassifications(
        opinions: Opinion[], 
        topics: Topic[]
    ): Promise<UncertaintyQuantification['borderlineClassifications']> {
        const borderlineClassifications: UncertaintyQuantification['borderlineClassifications'] = [];

        const classifiedOpinions = opinions.filter(op => op.topicId);

        for (const opinion of classifiedOpinions) {
            const confidence = await this.calculateClassificationConfidence(opinion, topics);
            
            if (confidence < this.getReliabilityConfig().borderlineThreshold) {
                const alternativeTopics = await this.findAlternativeTopics(opinion, topics);
                
                borderlineClassifications.push({
                    opinion,
                    topicId: opinion.topicId!,
                    confidence,
                    alternativeTopics
                });
            }
        }

        return borderlineClassifications;
    }

    /**
     * 代替トピック候補の発見
     */
    private async findAlternativeTopics(
        opinion: Opinion, 
        topics: Topic[]
    ): Promise<Array<{topicId: string, confidence: number}>> {
        const alternatives: Array<{topicId: string, confidence: number}> = [];

        for (const topic of topics) {
            if (topic.id === opinion.topicId) continue;

            const confidence = await this.calculateTopicSimilarity(opinion, topic);
            if (confidence > 0.3) {
                alternatives.push({
                    topicId: topic.id,
                    confidence
                });
            }
        }

        return alternatives.sort((a, b) => b.confidence - a.confidence).slice(0, 3);
    }

    /**
     * トピック類似度計算
     */
    private async calculateTopicSimilarity(opinion: Opinion, topic: Topic): Promise<number> {
        // 簡易実装: キーワードマッチング
        const opinionWords = new Set(opinion.content.toLowerCase().split(/\s+/));
        const topicWords = new Set([
            ...topic.name.toLowerCase().split(/\s+/),
            ...topic.summary.toLowerCase().split(/\s+/)
        ]);

        const intersection = new Set(Array.from(opinionWords).filter(x => topicWords.has(x)));
        const union = new Set([...Array.from(opinionWords), ...Array.from(topicWords)]);

        return union.size > 0 ? intersection.size / union.size : 0;
    }

    /**
     * 低信頼度トピックの特定
     */
    private async identifyLowConfidenceTopics(
        topics: Topic[], 
        opinions: Opinion[]
    ): Promise<UncertaintyQuantification['lowConfidenceTopics']> {
        const lowConfidenceTopics: UncertaintyQuantification['lowConfidenceTopics'] = [];

        for (const topic of topics) {
            const analysis = await this.analyzeTopicConfidence(topic, opinions);
            
            if (analysis.score < this.getReliabilityConfig().lowConfidenceThreshold) {
                lowConfidenceTopics.push({
                    topic,
                    confidenceScore: analysis.score,
                    issues: analysis.issues
                });
            }
        }

        return lowConfidenceTopics;
    }

    /**
     * トピック信頼度分析
     */
    private async analyzeTopicConfidence(topic: Topic, opinions: Opinion[]): Promise<{score: number, issues: string[]}> {
        const topicOpinions = opinions.filter(op => op.topicId === topic.id);
        
        if (topicOpinions.length === 0) {
            return {
                score: 0,
                issues: ['トピックに割り当てられた意見がない']
            };
        }

        const issues: string[] = [];
        let scoreFactors: number[] = [];

        // 意見数の適切性
        if (topicOpinions.length < 3) {
            issues.push('意見数が少ない');
            scoreFactors.push(0.3);
        } else {
            scoreFactors.push(0.8);
        }

        // 意見の一貫性
        const consistencyScore = await this.calculateTopicConsistency(topicOpinions);
        if (consistencyScore < 0.6) {
            issues.push('意見の一貫性が低い');
        }
        scoreFactors.push(consistencyScore);

        // トピック名の適切性
        const nameRelevance = await this.evaluateTopicNameRelevance(topic, topicOpinions);
        if (nameRelevance < 0.6) {
            issues.push('トピック名が内容と一致しない');
        }
        scoreFactors.push(nameRelevance);

        const overallScore = scoreFactors.reduce((sum, score) => sum + score, 0) / scoreFactors.length;

        return {
            score: overallScore,
            issues
        };
    }

    /**
     * トピック一貫性計算
     */
    private async calculateTopicConsistency(opinions: Opinion[]): Promise<number> {
        if (opinions.length < 2) return 1.0;

        // 感情の一貫性
        const sentiments = opinions.map(op => op.sentiment);
        const sentimentCounts = sentiments.reduce((acc, sentiment) => {
            acc[sentiment] = (acc[sentiment] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);

        const dominantSentimentRatio = Math.max(...Object.values(sentimentCounts)) / opinions.length;
        
        return dominantSentimentRatio;
    }

    /**
     * トピック名関連性評価
     */
    private async evaluateTopicNameRelevance(topic: Topic, opinions: Opinion[]): Promise<number> {
        // 簡易実装: トピック名のキーワードが意見にどの程度含まれているか
        const topicKeywords = topic.name.toLowerCase().split(/\s+/);
        let relevanceSum = 0;

        for (const opinion of opinions) {
            const opinionText = opinion.content.toLowerCase();
            const relevantKeywords = topicKeywords.filter(keyword => opinionText.includes(keyword));
            relevanceSum += relevantKeywords.length / topicKeywords.length;
        }

        return opinions.length > 0 ? relevanceSum / opinions.length : 0;
    }

    /**
     * 推奨アクション生成
     */
    private async generateRecommendations(
        metrics: ConfidenceMetrics,
        uncertainty: UncertaintyQuantification,
        opinions: Opinion[],
        topics: Topic[]
    ): Promise<AnalysisRecommendations> {
        console.log('[AnalysisConfidence] 💡 推奨アクション生成開始');

        const actions: AnalysisRecommendations['actions'] = [];

        // 全体信頼度に基づく推奨
        const manualReview = metrics.overallConfidence < this.getReliabilityConfig().confidenceThreshold;
        const additionalData = opinions.length < 50 || topics.length < 5;
        const reclassification = uncertainty.borderlineClassifications.length > opinions.length * 0.2;

        // 具体的なアクション提案
        if (manualReview) {
            actions.push({
                action: 'manual_review',
                priority: 'high',
                description: '全体的な信頼度が低いため、人間による手動レビューを推奨',
                estimatedImpact: 0.8
            });
        }

        if (additionalData) {
            actions.push({
                action: 'collect_more_data',
                priority: 'medium',
                description: 'より多くの意見データの収集を推奨',
                estimatedImpact: 0.6
            });
        }

        if (reclassification) {
            actions.push({
                action: 'reclassify_borderline',
                priority: 'medium',
                description: '境界的な分類の見直しを推奨',
                estimatedImpact: 0.7
            });
        }

        if (uncertainty.ambiguousOpinions.length > 0) {
            actions.push({
                action: 'clarify_ambiguous',
                priority: 'low',
                description: '曖昧な意見の明確化を推奨',
                estimatedImpact: 0.4
            });
        }

        console.log('[AnalysisConfidence] ✅ 推奨アクション生成完了:', {
            actionsCount: actions.length,
            manualReview,
            additionalData,
            reclassification
        });

        return {
            manualReview,
            additionalData,
            reclassification,
            confidence: metrics.overallConfidence,
            actions
        };
    }

    /**
     * 品質指標計算
     */
    private async calculateQualityIndicators(
        opinions: Opinion[], 
        topics: Topic[], 
        metadata: any
    ): Promise<AnalysisConfidenceResult['qualityIndicators']> {
        // データ完全性
        const dataCompleteness = this.calculateDataCompleteness(opinions, topics);
        
        // 分析一貫性
        const analysisConsistency = await this.calculateAnalysisConsistency(opinions, topics);
        
        // 結果安定性
        const resultStability = this.calculateResultStability(topics);
        
        // 手法信頼性
        const methodReliability = this.calculateMethodReliability(metadata);

        return {
            dataCompleteness,
            analysisConsistency,
            resultStability,
            methodReliability
        };
    }

    /**
     * データ完全性計算
     */
    private calculateDataCompleteness(opinions: Opinion[], topics: Topic[]): number {
        if (opinions.length === 0) return 0;

        const classifiedCount = opinions.filter(op => op.topicId).length;
        const classificationRate = classifiedCount / opinions.length;
        
        const topicsWithOpinions = topics.filter(topic => 
            opinions.some(op => op.topicId === topic.id)
        ).length;
        const topicUtilization = topics.length > 0 ? topicsWithOpinions / topics.length : 0;

        return (classificationRate + topicUtilization) / 2;
    }

    /**
     * 分析一貫性計算
     */
    private async calculateAnalysisConsistency(opinions: Opinion[], topics: Topic[]): Promise<number> {
        // 感情分析の一貫性
        const sentimentConsistency = this.calculateSentimentConsistency(opinions);
        
        // トピック分類の一貫性
        const classificationConsistency = await this.calculateClassificationConsistency(topics, opinions);

        return (sentimentConsistency + classificationConsistency) / 2;
    }

    /**
     * 感情分析一貫性計算
     */
    private calculateSentimentConsistency(opinions: Opinion[]): number {
        if (opinions.length === 0) return 1;

        const sentimentCounts = opinions.reduce((acc, op) => {
            acc[op.sentiment] = (acc[op.sentiment] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);

        const entropy = Object.values(sentimentCounts).reduce((sum, count) => {
            const p = count / opinions.length;
            return sum - (p * Math.log2(p));
        }, 0);

        // エントロピーが低いほど一貫性が高い
        return Math.max(0, 1 - (entropy / Math.log2(3))); // 3は感情種類数
    }

    /**
     * 分類一貫性計算
     */
    private async calculateClassificationConsistency(topics: Topic[], opinions: Opinion[]): Promise<number> {
        let consistencySum = 0;
        let topicCount = 0;

        for (const topic of topics) {
            const topicOpinions = opinions.filter(op => op.topicId === topic.id);
            if (topicOpinions.length > 1) {
                const consistency = await this.calculateTopicConsistency(topicOpinions);
                consistencySum += consistency;
                topicCount++;
            }
        }

        return topicCount > 0 ? consistencySum / topicCount : 1;
    }

    /**
     * 結果安定性計算
     */
    private calculateResultStability(topics: Topic[]): number {
        if (topics.length === 0) return 1;

        // トピックサイズの分散が小さいほど安定性が高い
        const sizes = topics.map(topic => topic.count);
        const mean = sizes.reduce((sum, size) => sum + size, 0) / sizes.length;
        const variance = sizes.reduce((sum, size) => sum + Math.pow(size - mean, 2), 0) / sizes.length;
        const coefficient = mean > 0 ? Math.sqrt(variance) / mean : 0;

        return Math.max(0, 1 - coefficient);
    }

    /**
     * 手法信頼性計算
     */
    private calculateMethodReliability(metadata: any): number {
        // メタデータから手法の信頼性を評価
        let reliability = 0.7; // ベースライン

        if (metadata.executionTime && metadata.executionTime < 300000) { // 5分以内
            reliability += 0.1;
        }

        if (metadata.apiErrors === 0) {
            reliability += 0.1;
        }

        return Math.min(1, reliability);
    }

    /**
     * ヘルパーメソッド
     */
    private clampValue(value: any): number {
        const num = Number(value);
        if (isNaN(num)) return 0;
        return Math.max(0, Math.min(1, num));
    }

    private selectRandomSample<T>(array: T[], sampleSize: number): T[] {
        if (array.length <= sampleSize) return array;
        
        const shuffled = Array.from(array).sort(() => 0.5 - Math.random());
        return shuffled.slice(0, sampleSize);
    }
}