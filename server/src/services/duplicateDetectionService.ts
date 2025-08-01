import { AIService } from './aiService';
import { Opinion } from '../types';
import { AppError } from '../middleware/errorHandler';

export interface DuplicateScore {
    exactMatch: number;          // 完全一致度
    nearDuplicate: number;       // 準重複度
    paraphraseMatch: number;     // 言い換え一致度
    semanticMatch: number;       // 意味的一致度
    overallScore: number;        // 総合重複度
}

export interface DuplicateGroup {
    id: string;
    masterOpinion: Opinion;      // 代表意見
    duplicateOpinions: Opinion[]; // 重複意見
    groupScore: number;          // グループ内類似度
    mergeStrategy: 'combine' | 'select_best' | 'flag_for_review';
    confidence: number;
}

export interface QualityScore {
    clarity: number;             // 明確さ
    specificity: number;         // 具体性
    relevance: number;           // 関連性
    constructiveness: number;    // 建設性
    overall: number;             // 総合品質
    reasoning: string;           // 評価理由
}

export interface DuplicateDetectionResult {
    duplicateGroups: DuplicateGroup[];
    qualityScores: Map<string, QualityScore>;
    statistics: {
        totalOpinions: number;
        duplicateOpinions: number;
        uniqueOpinions: number;
        duplicateRate: number;
        averageQuality: number;
    };
    processingTime: number;
}

export class DuplicateDetectionService {
    private aiService: AIService;
    
    // Phase 3-2: 重複検出パラメータ
    private readonly DUPLICATE_THRESHOLD = 0.85;
    private readonly NEAR_DUPLICATE_THRESHOLD = 0.75;
    private readonly SEMANTIC_THRESHOLD = 0.70;
    private readonly BATCH_SIZE = 8;
    private readonly MIN_LENGTH_FOR_ANALYSIS = 10;

    constructor() {
        this.aiService = new AIService();
    }

    /**
     * Phase 3-2: 高度重複検出・品質分析を実行
     */
    async performDuplicateDetectionAndQualityAnalysis(opinions: Opinion[]): Promise<DuplicateDetectionResult> {
        console.log('[DuplicateDetection] 🔍 高度重複検出・品質分析開始:', {
            opinionsCount: opinions.length,
            timestamp: new Date().toISOString()
        });

        const startTime = Date.now();

        try {
            // Step 1: 重複度マトリックス計算
            console.log('[DuplicateDetection] 📊 STEP 1: 重複度マトリックス計算中...');
            const duplicateMatrix = await this.calculateDuplicateMatrix(opinions);
            
            // Step 2: 重複グループ識別
            console.log('[DuplicateDetection] 🔍 STEP 2: 重複グループ識別中...');
            const duplicateGroups = await this.identifyDuplicateGroups(opinions, duplicateMatrix);
            
            // Step 3: 品質スコア計算
            console.log('[DuplicateDetection] 📈 STEP 3: 品質スコア計算中...');
            const qualityScores = await this.calculateQualityScores(opinions);
            
            // Step 4: 統計情報計算
            const statistics = this.calculateStatistics(opinions, duplicateGroups, qualityScores);

            const processingTime = Date.now() - startTime;
            console.log('[DuplicateDetection] ✅ 高度重複検出・品質分析完了:', {
                processingTime: `${processingTime}ms`,
                duplicateGroups: duplicateGroups.length,
                duplicateRate: `${(statistics.duplicateRate * 100).toFixed(1)}%`,
                averageQuality: statistics.averageQuality.toFixed(2)
            });

            return {
                duplicateGroups,
                qualityScores,
                statistics,
                processingTime
            };

        } catch (error) {
            console.error('[DuplicateDetection] ❌ 重複検出・品質分析エラー:', error);
            throw new AppError(
                500,
                'DUPLICATE_DETECTION_ERROR',
                `重複検出・品質分析に失敗: ${error instanceof Error ? error.message : String(error)}`
            );
        }
    }

    /**
     * 2つの意見の重複度を計算
     */
    async calculateDuplicateScore(opinion1: Opinion, opinion2: Opinion): Promise<DuplicateScore> {
        const text1 = opinion1.content.trim();
        const text2 = opinion2.content.trim();

        // 短すぎるテキストの場合は簡易計算
        if (text1.length < this.MIN_LENGTH_FOR_ANALYSIS || text2.length < this.MIN_LENGTH_FOR_ANALYSIS) {
            return this.calculateSimpleDuplicateScore(text1, text2);
        }

        const prompt = `
以下の2つの意見について、多次元的な重複度を分析してください。

意見A: "${text1}"
意見B: "${text2}"

以下の観点から重複度を0-1の数値で評価し、JSON形式で回答してください：

{
  "exactMatch": 完全一致度（文字列レベルの一致性）,
  "nearDuplicate": 準重複度（表現は異なるが内容がほぼ同じ）,
  "paraphraseMatch": 言い換え一致度（同じ内容を異なる言葉で表現）,
  "semanticMatch": 意味的一致度（本質的な意味の類似性）,
  "overallScore": 総合重複度（上記4つを総合した判定）
}

各数値は小数点第3位まで記載してください。
        `;

        try {
            const aiResponse = await this.aiService.generateResponse(prompt, 'gpt-4.1-nano');
            const response = aiResponse.content;
            const scores = JSON.parse(response);

            return {
                exactMatch: this.clampScore(scores.exactMatch),
                nearDuplicate: this.clampScore(scores.nearDuplicate),
                paraphraseMatch: this.clampScore(scores.paraphraseMatch),
                semanticMatch: this.clampScore(scores.semanticMatch),
                overallScore: this.clampScore(scores.overallScore)
            };

        } catch (error) {
            console.warn('[DuplicateDetection] ⚠️ AI重複分析失敗、簡易計算使用:', error);
            return this.calculateSimpleDuplicateScore(text1, text2);
        }
    }

    /**
     * 重複度マトリックス計算
     */
    private async calculateDuplicateMatrix(opinions: Opinion[]): Promise<DuplicateScore[][]> {
        const matrix: DuplicateScore[][] = [];
        const total = opinions.length * (opinions.length - 1) / 2;
        let processed = 0;

        console.log('[DuplicateDetection] 🔍 重複度マトリックス計算開始:', {
            totalComparisons: total,
            batchSize: this.BATCH_SIZE
        });

        for (let i = 0; i < opinions.length; i++) {
            matrix[i] = [];
            
            for (let j = 0; j < opinions.length; j++) {
                if (i === j) {
                    // 自分自身との比較は完全一致
                    matrix[i][j] = {
                        exactMatch: 1.0,
                        nearDuplicate: 1.0,
                        paraphraseMatch: 1.0,
                        semanticMatch: 1.0,
                        overallScore: 1.0
                    };
                    continue;
                }

                // 対称性を利用（j > iの場合は既に計算済み）
                if (j > i && matrix[j] && matrix[j][i]) {
                    matrix[i][j] = matrix[j][i];
                    continue;
                }

                // 重複度計算実行
                if (j > i) {
                    matrix[i][j] = await this.calculateDuplicateScore(opinions[i], opinions[j]);
                    processed++;

                    // 進捗表示
                    if (processed % Math.max(1, Math.floor(total / 20)) === 0) {
                        console.log(`[DuplicateDetection] 📊 計算進捗: ${processed}/${total} (${Math.round(processed / total * 100)}%)`);
                    }
                }
            }
        }

        console.log('[DuplicateDetection] ✅ 重複度マトリックス計算完了');
        return matrix;
    }

    /**
     * 重複グループの識別
     */
    private async identifyDuplicateGroups(
        opinions: Opinion[], 
        duplicateMatrix: DuplicateScore[][]
    ): Promise<DuplicateGroup[]> {
        const groups: DuplicateGroup[] = [];
        const processedOpinions = new Set<number>();

        console.log('[DuplicateDetection] 🔍 重複グループ識別開始');

        for (let i = 0; i < opinions.length; i++) {
            if (processedOpinions.has(i)) continue;

            const duplicates: number[] = [];
            
            // この意見と重複する他の意見を探索
            for (let j = i + 1; j < opinions.length; j++) {
                if (processedOpinions.has(j)) continue;

                const score = duplicateMatrix[i][j] || duplicateMatrix[j][i];
                if (score && score.overallScore >= this.DUPLICATE_THRESHOLD) {
                    duplicates.push(j);
                }
            }

            // 重複が見つかった場合、グループを作成
            if (duplicates.length > 0) {
                const allIndices = [i, ...duplicates];
                const groupOpinions = allIndices.map(idx => opinions[idx]);
                
                // 品質の高い意見を代表として選択
                const masterOpinion = await this.selectMasterOpinion(groupOpinions);
                const duplicateOpinions = groupOpinions.filter(op => op.id !== masterOpinion.id);
                
                const group: DuplicateGroup = {
                    id: `duplicate_group_${groups.length + 1}`,
                    masterOpinion,
                    duplicateOpinions,
                    groupScore: this.calculateGroupScore(allIndices, duplicateMatrix),
                    mergeStrategy: this.determineMergeStrategy(groupOpinions),
                    confidence: this.calculateGroupConfidence(allIndices, duplicateMatrix)
                };

                groups.push(group);
                
                // 処理済みとしてマーク
                allIndices.forEach(idx => processedOpinions.add(idx));
                
                console.log(`[DuplicateDetection] 🔗 重複グループ作成: ${groupOpinions.length}個の意見 (スコア: ${group.groupScore.toFixed(3)})`);
            }
        }

        console.log('[DuplicateDetection] ✅ 重複グループ識別完了:', {
            totalGroups: groups.length,
            totalDuplicates: groups.reduce((sum, g) => sum + g.duplicateOpinions.length, 0)
        });

        return groups;
    }

    /**
     * 品質スコア計算
     */
    private async calculateQualityScores(opinions: Opinion[]): Promise<Map<string, QualityScore>> {
        const qualityScores = new Map<string, QualityScore>();
        const batches = this.createBatches(opinions, this.BATCH_SIZE);

        console.log('[DuplicateDetection] 📈 品質スコア計算開始:', {
            totalOpinions: opinions.length,
            batches: batches.length
        });

        for (let i = 0; i < batches.length; i++) {
            const batch = batches[i];
            console.log(`[DuplicateDetection] 📊 品質分析バッチ ${i + 1}/${batches.length} 処理中...`);

            const batchScores = await this.calculateQualityScoresBatch(batch);
            batchScores.forEach((score, opinionId) => {
                qualityScores.set(opinionId, score);
            });

            // 進捗表示
            const progress = Math.round((i + 1) / batches.length * 100);
            console.log(`[DuplicateDetection] 📈 品質分析進捗: ${progress}%`);
        }

        console.log('[DuplicateDetection] ✅ 品質スコア計算完了');
        return qualityScores;
    }

    /**
     * バッチ単位での品質スコア計算
     */
    private async calculateQualityScoresBatch(opinions: Opinion[]): Promise<Map<string, QualityScore>> {
        const scores = new Map<string, QualityScore>();

        for (const opinion of opinions) {
            try {
                const score = await this.calculateSingleQualityScore(opinion);
                scores.set(opinion.id, score);
            } catch (error) {
                console.warn(`[DuplicateDetection] ⚠️ 品質分析失敗 (${opinion.id}):`, error);
                scores.set(opinion.id, this.getDefaultQualityScore());
            }
        }

        return scores;
    }

    /**
     * 単一意見の品質スコア計算
     */
    private async calculateSingleQualityScore(opinion: Opinion): Promise<QualityScore> {
        const prompt = `
以下の意見について、品質を多面的に評価してください。

意見: "${opinion.content}"

以下の観点から品質を0-1の数値で評価し、JSON形式で回答してください：

{
  "clarity": 明確さ（わかりやすく表現されているか）,
  "specificity": 具体性（具体的で詳細な内容か）,
  "relevance": 関連性（テーマに関連した内容か）,
  "constructiveness": 建設性（建設的で前向きな内容か）,
  "overall": 総合品質（上記4つを総合した評価）,
  "reasoning": "評価理由を簡潔に説明"
}

数値は小数点第2位まで記載してください。
        `;

        try {
            const aiResponse = await this.aiService.generateResponse(prompt, 'gpt-4.1-nano');
            const response = aiResponse.content;
            const analysis = JSON.parse(response);

            return {
                clarity: this.clampScore(analysis.clarity),
                specificity: this.clampScore(analysis.specificity),
                relevance: this.clampScore(analysis.relevance),
                constructiveness: this.clampScore(analysis.constructiveness),
                overall: this.clampScore(analysis.overall),
                reasoning: analysis.reasoning || '評価理由不明'
            };

        } catch (error) {
            console.warn('[DuplicateDetection] ⚠️ AI品質分析失敗、簡易評価使用:', error);
            return this.calculateSimpleQualityScore(opinion);
        }
    }

    /**
     * 簡易重複度計算（フォールバック用）
     */
    private calculateSimpleDuplicateScore(text1: string, text2: string): DuplicateScore {
        // 完全一致チェック
        const exactMatch = text1 === text2 ? 1.0 : 0.0;
        
        // 正規化してから比較
        const normalized1 = text1.toLowerCase().replace(/\s+/g, ' ').trim();
        const normalized2 = text2.toLowerCase().replace(/\s+/g, ' ').trim();
        const nearDuplicate = normalized1 === normalized2 ? 1.0 : 0.0;
        
        // 単語レベルの類似度
        const words1 = new Set(normalized1.split(/\s+/));
        const words2 = new Set(normalized2.split(/\s+/));
        const intersection = new Set(Array.from(words1).filter(x => words2.has(x)));
        const union = new Set([...Array.from(words1), ...Array.from(words2)]);
        const semanticMatch = union.size > 0 ? intersection.size / union.size : 0;
        
        // 文字レベルの類似度（Levenshtein距離ベース）
        const maxLength = Math.max(text1.length, text2.length);
        const levenshteinDistance = this.calculateLevenshteinDistance(text1, text2);
        const paraphraseMatch = maxLength > 0 ? 1 - (levenshteinDistance / maxLength) : 0;
        
        const overallScore = (exactMatch * 0.4) + (nearDuplicate * 0.3) + (semanticMatch * 0.2) + (paraphraseMatch * 0.1);

        return {
            exactMatch,
            nearDuplicate,
            paraphraseMatch,
            semanticMatch,
            overallScore
        };
    }

    /**
     * Levenshtein距離計算
     */
    private calculateLevenshteinDistance(str1: string, str2: string): number {
        const matrix: number[][] = [];
        
        for (let i = 0; i <= str2.length; i++) {
            matrix[i] = [i];
        }
        
        for (let j = 0; j <= str1.length; j++) {
            matrix[0][j] = j;
        }
        
        for (let i = 1; i <= str2.length; i++) {
            for (let j = 1; j <= str1.length; j++) {
                if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
                    matrix[i][j] = matrix[i - 1][j - 1];
                } else {
                    matrix[i][j] = Math.min(
                        matrix[i - 1][j - 1] + 1,
                        matrix[i][j - 1] + 1,
                        matrix[i - 1][j] + 1
                    );
                }
            }
        }
        
        return matrix[str2.length][str1.length];
    }

    /**
     * 簡易品質スコア計算（フォールバック用）
     */
    private calculateSimpleQualityScore(opinion: Opinion): QualityScore {
        const content = opinion.content;
        const length = content.length;
        
        // 長さベースの基本評価
        const clarity = Math.min(1, length / 100); // 100文字を基準
        const specificity = Math.min(1, (content.match(/[、。]/g) || []).length / 3); // 句読点数
        const relevance = 0.7; // デフォルト値
        const constructiveness = opinion.sentiment === 'positive' ? 0.8 : 0.6;
        const overall = (clarity + specificity + relevance + constructiveness) / 4;

        return {
            clarity,
            specificity,
            relevance,
            constructiveness,
            overall,
            reasoning: '簡易評価による算出'
        };
    }

    /**
     * 代表意見選択
     */
    private async selectMasterOpinion(opinions: Opinion[]): Promise<Opinion> {
        if (opinions.length === 1) return opinions[0];
        
        // 品質スコアベースの選択（簡易実装）
        let bestOpinion = opinions[0];
        let bestScore = 0;
        
        for (const opinion of opinions) {
            const score = this.calculateSimpleQualityScore(opinion).overall;
            if (score > bestScore) {
                bestScore = score;
                bestOpinion = opinion;
            }
        }
        
        return bestOpinion;
    }

    /**
     * マージ戦略決定
     */
    private determineMergeStrategy(opinions: Opinion[]): DuplicateGroup['mergeStrategy'] {
        if (opinions.length <= 2) return 'select_best';
        if (opinions.length >= 5) return 'flag_for_review';
        return 'combine';
    }

    /**
     * グループスコア計算
     */
    private calculateGroupScore(indices: number[], matrix: DuplicateScore[][]): number {
        let totalScore = 0;
        let comparisons = 0;
        
        for (let i = 0; i < indices.length; i++) {
            for (let j = i + 1; j < indices.length; j++) {
                const score = matrix[indices[i]][indices[j]] || matrix[indices[j]][indices[i]];
                if (score) {
                    totalScore += score.overallScore;
                    comparisons++;
                }
            }
        }
        
        return comparisons > 0 ? totalScore / comparisons : 0;
    }

    /**
     * グループ信頼度計算
     */
    private calculateGroupConfidence(indices: number[], matrix: DuplicateScore[][]): number {
        const groupScore = this.calculateGroupScore(indices, matrix);
        return Math.min(1, groupScore * 1.2); // 信頼度は少し高めに設定
    }

    /**
     * 統計情報計算
     */
    private calculateStatistics(
        opinions: Opinion[], 
        duplicateGroups: DuplicateGroup[], 
        qualityScores: Map<string, QualityScore>
    ): DuplicateDetectionResult['statistics'] {
        const totalOpinions = opinions.length;
        const duplicateOpinions = duplicateGroups.reduce((sum, group) => sum + group.duplicateOpinions.length, 0);
        const uniqueOpinions = totalOpinions - duplicateOpinions;
        const duplicateRate = totalOpinions > 0 ? duplicateOpinions / totalOpinions : 0;
        
        const qualitySum = Array.from(qualityScores.values()).reduce((sum, score) => sum + score.overall, 0);
        const averageQuality = qualityScores.size > 0 ? qualitySum / qualityScores.size : 0;

        return {
            totalOpinions,
            duplicateOpinions,
            uniqueOpinions,
            duplicateRate,
            averageQuality
        };
    }

    /**
     * ヘルパーメソッド
     */
    private clampScore(value: any): number {
        const num = Number(value);
        if (isNaN(num)) return 0;
        return Math.max(0, Math.min(1, num));
    }

    private getDefaultQualityScore(): QualityScore {
        return {
            clarity: 0.5,
            specificity: 0.5,
            relevance: 0.5,
            constructiveness: 0.5,
            overall: 0.5,
            reasoning: 'デフォルト評価'
        };
    }

    private createBatches<T>(array: T[], batchSize: number): T[][] {
        const batches: T[][] = [];
        for (let i = 0; i < array.length; i += batchSize) {
            batches.push(array.slice(i, i + batchSize));
        }
        return batches;
    }
}