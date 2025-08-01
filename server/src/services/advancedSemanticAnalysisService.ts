import { AIService } from './aiService';
import { Opinion, Topic } from '../types';
import { AppError } from '../middleware/errorHandler';

export interface MultiLayerSimilarity {
    syntactic: number;      // 構文的類似度
    semantic: number;       // 意味的類似度
    contextual: number;     // 文脈的類似度
    combined: number;       // 統合類似度
}

export interface OpinionCluster {
    id: string;
    opinions: Opinion[];
    centroid: string;       // クラスター中心文
    similarity: number;     // 内部類似度
    keywords: string[];
}

export interface TopicHierarchy {
    topicId: string;
    parentTopic?: string;
    childTopics: string[];
    level: number;
    significance: number;
    relatedTopics: string[];
}

export interface AdvancedSemanticResult {
    clusters: OpinionCluster[];
    hierarchy: TopicHierarchy[];
    qualityScore: number;
    confidence: number;
}

export class AdvancedSemanticAnalysisService {
    private aiService: AIService;
    
    // Phase 3-1: 高度分析パラメータ
    private readonly MIN_CLUSTER_SIZE = 2;
    private readonly MAX_CLUSTERS = 15;
    private readonly SIMILARITY_THRESHOLD = 0.7;
    private readonly HIERARCHY_THRESHOLD = 0.6;

    constructor() {
        this.aiService = new AIService();
    }

    /**
     * Phase 3-1: 高度なセマンティック分析を実行
     */
    async performAdvancedSemanticAnalysis(
        opinions: Opinion[], 
        existingTopics: Topic[] = []
    ): Promise<AdvancedSemanticResult> {
        console.log('[AdvancedSemantic] 🧠 高度セマンティック分析開始:', {
            opinionsCount: opinions.length,
            existingTopicsCount: existingTopics.length,
            timestamp: new Date().toISOString()
        });

        const startTime = Date.now();

        try {
            // Step 1: 多層類似度分析
            console.log('[AdvancedSemantic] 📊 STEP 1: 多層類似度分析実行中...');
            const similarityMatrix = await this.calculateMultiLayerSimilarity(opinions);
            
            // Step 2: 高度クラスタリング
            console.log('[AdvancedSemantic] 🔍 STEP 2: 高度クラスタリング実行中...');
            const clusters = await this.performAdvancedClustering(opinions, similarityMatrix);
            
            // Step 3: トピック階層化
            console.log('[AdvancedSemantic] 🌳 STEP 3: トピック階層化実行中...');
            const hierarchy = await this.buildTopicHierarchy(clusters, existingTopics);
            
            // Step 4: 品質・信頼度評価
            console.log('[AdvancedSemantic] 📈 STEP 4: 品質評価実行中...');
            const qualityScore = await this.calculateAnalysisQuality(clusters, hierarchy);
            const confidence = await this.calculateConfidenceScore(clusters, hierarchy);

            const executionTime = Date.now() - startTime;
            console.log('[AdvancedSemantic] ✅ 高度セマンティック分析完了:', {
                executionTime: `${executionTime}ms`,
                clustersCount: clusters.length,
                hierarchyLevels: Math.max(...hierarchy.map(h => h.level)),
                qualityScore,
                confidence
            });

            return {
                clusters,
                hierarchy,
                qualityScore,
                confidence
            };

        } catch (error) {
            console.error('[AdvancedSemantic] ❌ 高度セマンティック分析エラー:', error);
            throw new AppError(
                500,
                'ADVANCED_SEMANTIC_ANALYSIS_ERROR',
                `高度セマンティック分析に失敗: ${error instanceof Error ? error.message : String(error)}`
            );
        }
    }

    /**
     * 多層類似度分析（構文・意味・文脈）
     */
    private async calculateMultiLayerSimilarity(opinions: Opinion[]): Promise<MultiLayerSimilarity[][]> {
        const matrix: MultiLayerSimilarity[][] = [];
        const batchSize = 5; // 効率的な処理のためのバッチサイズ

        console.log('[AdvancedSemantic] 🔍 多層類似度マトリックス計算開始:', {
            totalComparisons: opinions.length * (opinions.length - 1) / 2
        });

        for (let i = 0; i < opinions.length; i++) {
            matrix[i] = [];
            
            for (let j = 0; j < opinions.length; j++) {
                if (i === j) {
                    matrix[i][j] = {
                        syntactic: 1.0,
                        semantic: 1.0,
                        contextual: 1.0,
                        combined: 1.0
                    };
                    continue;
                }

                // 既に計算済みの場合は対称性を利用
                if (i > j && matrix[j] && matrix[j][i]) {
                    matrix[i][j] = matrix[j][i];
                    continue;
                }

                // AI分析による多層類似度計算
                const similarity = await this.computePairwiseSimilarity(
                    opinions[i].content,
                    opinions[j].content
                );
                
                matrix[i][j] = similarity;
            }

            // プログレス表示
            if ((i + 1) % Math.max(1, Math.floor(opinions.length / 10)) === 0) {
                console.log(`[AdvancedSemantic] 📊 類似度計算進捗: ${i + 1}/${opinions.length} (${Math.round((i + 1) / opinions.length * 100)}%)`);
            }
        }

        console.log('[AdvancedSemantic] ✅ 多層類似度マトリックス計算完了');
        return matrix;
    }

    /**
     * 2つの意見の多層類似度を計算
     */
    private async computePairwiseSimilarity(text1: string, text2: string): Promise<MultiLayerSimilarity> {
        const prompt = `
以下の2つの意見について、多層的な類似度を分析してください。

意見A: "${text1}"
意見B: "${text2}"

以下の観点から類似度を0-1の数値で評価し、JSON形式で回答してください：

{
  "syntactic": 構文的類似度（文の構造、語順、表現パターンの類似性）,
  "semantic": 意味的類似度（内容、概念、主張の類似性）,
  "contextual": 文脈的類似度（背景、目的、対象領域の類似性）,
  "combined": 統合類似度（上記3つを総合した全体的類似度）
}

各数値は小数点第2位まで記載してください。
        `;

        try {
            const aiResponse = await this.aiService.generateResponse(prompt, 'gpt-4.1-nano');
            const response = aiResponse.content;

            const similarity = JSON.parse(response);

            // 数値検証とサニタイゼーション
            const sanitized: MultiLayerSimilarity = {
                syntactic: this.clampSimilarity(similarity.syntactic),
                semantic: this.clampSimilarity(similarity.semantic),
                contextual: this.clampSimilarity(similarity.contextual),
                combined: this.clampSimilarity(similarity.combined)
            };

            return sanitized;

        } catch (error) {
            console.warn('[AdvancedSemantic] ⚠️ 類似度計算失敗、デフォルト値使用:', error);
            
            // フォールバック: 簡易的な類似度計算
            const simpleScore = this.calculateSimpleSimilarity(text1, text2);
            return {
                syntactic: simpleScore,
                semantic: simpleScore,
                contextual: simpleScore,
                combined: simpleScore
            };
        }
    }

    /**
     * 類似度値をクランプして正規化
     */
    private clampSimilarity(value: any): number {
        const num = Number(value);
        if (isNaN(num)) return 0;
        return Math.max(0, Math.min(1, num));
    }

    /**
     * 簡易類似度計算（フォールバック用）
     */
    private calculateSimpleSimilarity(text1: string, text2: string): number {
        const words1 = new Set(text1.toLowerCase().split(/\s+/));
        const words2 = new Set(text2.toLowerCase().split(/\s+/));
        
        const intersection = new Set(Array.from(words1).filter(x => words2.has(x)));
        const union = new Set([...Array.from(words1), ...Array.from(words2)]);
        
        return union.size > 0 ? intersection.size / union.size : 0;
    }

    /**
     * 高度クラスタリング（階層クラスタリング + 品質最適化）
     */
    private async performAdvancedClustering(
        opinions: Opinion[], 
        similarityMatrix: MultiLayerSimilarity[][]
    ): Promise<OpinionCluster[]> {
        console.log('[AdvancedSemantic] 🔍 高度クラスタリング開始');

        // 統合類似度マトリックスを抽出
        const combinedMatrix = similarityMatrix.map(row => 
            row.map(cell => cell.combined)
        );

        // 階層クラスタリング実行
        const clusters = await this.hierarchicalClustering(opinions, combinedMatrix);
        
        // クラスター品質評価と最適化
        const optimizedClusters = await this.optimizeClusters(clusters);

        console.log('[AdvancedSemantic] ✅ 高度クラスタリング完了:', {
            clustersCount: optimizedClusters.length,
            averageSize: optimizedClusters.reduce((sum, c) => sum + c.opinions.length, 0) / optimizedClusters.length
        });

        return optimizedClusters;
    }

    /**
     * 階層クラスタリング実装
     */
    private async hierarchicalClustering(
        opinions: Opinion[], 
        similarityMatrix: number[][]
    ): Promise<OpinionCluster[]> {
        // 各意見を初期クラスターとして設定
        let clusters: OpinionCluster[] = opinions.map((opinion, index) => ({
            id: `cluster_${index}`,
            opinions: [opinion],
            centroid: opinion.content,
            similarity: 1.0,
            keywords: []
        }));

        // 類似度が閾値を超えるクラスターを順次マージ
        while (clusters.length > this.MIN_CLUSTER_SIZE && clusters.length > 1) {
            let maxSimilarity = 0;
            let mergeIndices = [-1, -1];

            // 最も類似度の高いクラスターペアを探索
            for (let i = 0; i < clusters.length; i++) {
                for (let j = i + 1; j < clusters.length; j++) {
                    const similarity = this.calculateClusterSimilarity(
                        clusters[i], clusters[j], similarityMatrix
                    );
                    
                    if (similarity > maxSimilarity && similarity >= this.SIMILARITY_THRESHOLD) {
                        maxSimilarity = similarity;
                        mergeIndices = [i, j];
                    }
                }
            }

            // マージ条件を満たすペアが見つからない場合は終了
            if (mergeIndices[0] === -1 || clusters.length <= this.MIN_CLUSTER_SIZE) {
                break;
            }

            // クラスターマージ実行
            const cluster1 = clusters[mergeIndices[0]];
            const cluster2 = clusters[mergeIndices[1]];
            
            const mergedCluster: OpinionCluster = {
                id: `merged_${cluster1.id}_${cluster2.id}`,
                opinions: [...cluster1.opinions, ...cluster2.opinions],
                centroid: await this.calculateClusterCentroid([...cluster1.opinions, ...cluster2.opinions]),
                similarity: maxSimilarity,
                keywords: Array.from(new Set([...cluster1.keywords, ...cluster2.keywords]))
            };

            // 古いクラスターを削除して新しいクラスターを追加
            clusters = clusters.filter((_, index) => index !== mergeIndices[0] && index !== mergeIndices[1]);
            clusters.push(mergedCluster);

            console.log(`[AdvancedSemantic] 🔗 クラスターマージ: ${cluster1.opinions.length} + ${cluster2.opinions.length} = ${mergedCluster.opinions.length} (類似度: ${maxSimilarity.toFixed(3)})`);
        }

        return clusters;
    }

    /**
     * 2つのクラスター間の類似度計算（平均リンク法）
     */
    private calculateClusterSimilarity(
        cluster1: OpinionCluster, 
        cluster2: OpinionCluster, 
        similarityMatrix: number[][]
    ): number {
        let totalSimilarity = 0;
        let count = 0;

        for (const opinion1 of cluster1.opinions) {
            for (const opinion2 of cluster2.opinions) {
                const index1 = this.getOpinionIndex(opinion1);
                const index2 = this.getOpinionIndex(opinion2);
                
                if (index1 !== -1 && index2 !== -1) {
                    totalSimilarity += similarityMatrix[index1][index2];
                    count++;
                }
            }
        }

        return count > 0 ? totalSimilarity / count : 0;
    }

    /**
     * 意見のインデックスを取得（簡易実装）
     */
    private getOpinionIndex(opinion: Opinion): number {
        // 実際の実装では、意見とインデックスのマッピングを保持
        // 簡易実装: ID文字列から数値を抽出
        const idNum = opinion.id.replace(/\D/g, '');
        return idNum ? parseInt(idNum) % 1000 : -1; // 大きすぎる値を制限
    }

    /**
     * クラスターの中心文を計算
     */
    private async calculateClusterCentroid(opinions: Opinion[]): Promise<string> {
        if (opinions.length === 0) return '';
        if (opinions.length === 1) return opinions[0].content;

        // AI分析でクラスターの代表的な内容を生成
        const prompt = `
以下の意見群の中心的な内容を1文で要約してください：

${opinions.map((op, index) => `${index + 1}. ${op.content}`).join('\n')}

これらの意見に共通する核心的なテーマや主張を、簡潔で分かりやすい1文で表現してください。
        `;

        try {
            const aiResponse = await this.aiService.generateResponse(prompt, 'gpt-4.1-nano');
            const centroid = aiResponse.content;
            return centroid.trim();
        } catch (error) {
            console.warn('[AdvancedSemantic] ⚠️ 中心文計算失敗、最長意見使用:', error);
            return opinions.reduce((longest, current) => 
                current.content.length > longest.content.length ? current : longest
            ).content;
        }
    }

    /**
     * クラスター品質最適化
     */
    private async optimizeClusters(clusters: OpinionCluster[]): Promise<OpinionCluster[]> {
        console.log('[AdvancedSemantic] 🎯 クラスター品質最適化実行中...');

        // 小さすぎるクラスターのマージまたは除去
        const optimized = clusters.filter(cluster => 
            cluster.opinions.length >= this.MIN_CLUSTER_SIZE
        );

        // 各クラスターのキーワード抽出
        for (const cluster of optimized) {
            cluster.keywords = await this.extractClusterKeywords(cluster);
        }

        console.log('[AdvancedSemantic] ✅ クラスター品質最適化完了:', {
            originalClusters: clusters.length,
            optimizedClusters: optimized.length
        });

        return optimized;
    }

    /**
     * クラスターのキーワード抽出
     */
    private async extractClusterKeywords(cluster: OpinionCluster): Promise<string[]> {
        const prompt = `
以下のクラスターに含まれる意見から、重要なキーワードを5個まで抽出してください：

${cluster.opinions.map((op, index) => `${index + 1}. ${op.content}`).join('\n')}

キーワードは名詞または名詞句で、このクラスターの特徴を最もよく表すものを選んでください。
カンマ区切りで出力してください。
        `;

        try {
            const aiResponse = await this.aiService.generateResponse(prompt, 'gpt-4.1-nano');
            const response = aiResponse.content;
            return response.split(',').map((keyword: string) => keyword.trim()).slice(0, 5);
        } catch (error) {
            console.warn('[AdvancedSemantic] ⚠️ キーワード抽出失敗:', error);
            return [];
        }
    }

    /**
     * トピック階層構造の構築
     */
    private async buildTopicHierarchy(
        clusters: OpinionCluster[], 
        existingTopics: Topic[]
    ): Promise<TopicHierarchy[]> {
        console.log('[AdvancedSemantic] 🌳 トピック階層構築開始');

        const hierarchy: TopicHierarchy[] = [];

        // 既存トピックを階層に含める
        for (const topic of existingTopics) {
            hierarchy.push({
                topicId: topic.id,
                parentTopic: undefined,
                childTopics: [],
                level: 0,
                significance: this.calculateTopicSignificance(topic),
                relatedTopics: []
            });
        }

        // 新しいクラスターベースのトピック階層を構築
        for (const cluster of clusters) {
            const topicHierarchy: TopicHierarchy = {
                topicId: cluster.id,
                parentTopic: undefined,
                childTopics: [],
                level: 0,
                significance: cluster.opinions.length,
                relatedTopics: []
            };

            // 既存トピックとの関連性を分析
            topicHierarchy.relatedTopics = await this.findRelatedTopics(cluster, existingTopics);
            
            hierarchy.push(topicHierarchy);
        }

        // 階層レベルを決定
        await this.assignHierarchyLevels(hierarchy);

        console.log('[AdvancedSemantic] ✅ トピック階層構築完了:', {
            totalNodes: hierarchy.length,
            maxLevel: Math.max(...hierarchy.map(h => h.level)),
            rootNodes: hierarchy.filter(h => h.level === 0).length
        });

        return hierarchy;
    }

    /**
     * トピックの重要度計算
     */
    private calculateTopicSignificance(topic: Topic): number {
        // 意見数、感情スコア、キーワード数などを総合的に評価
        return topic.count * 1.0; // topic.opinionsではなくcountを使用
    }

    /**
     * 関連トピックの発見
     */
    private async findRelatedTopics(cluster: OpinionCluster, existingTopics: Topic[]): Promise<string[]> {
        const relatedTopics: string[] = [];

        for (const topic of existingTopics) {
            const similarity = await this.calculateTopicClusterSimilarity(topic, cluster);
            if (similarity >= this.HIERARCHY_THRESHOLD) {
                relatedTopics.push(topic.id);
            }
        }

        return relatedTopics;
    }

    /**
     * トピックとクラスターの類似度計算
     */
    private async calculateTopicClusterSimilarity(topic: Topic, cluster: OpinionCluster): Promise<number> {
        // 簡易実装: キーワードマッチング
        const topicKeywords = new Set((topic.keywords || []).map((k: string) => k.toLowerCase()));
        const clusterKeywords = new Set(cluster.keywords.map(k => k.toLowerCase()));
        
        const intersection = new Set(Array.from(topicKeywords).filter((x: string) => clusterKeywords.has(x)));
        const union = new Set([...Array.from(topicKeywords), ...Array.from(clusterKeywords)]);
        
        return union.size > 0 ? intersection.size / union.size : 0;
    }

    /**
     * 階層レベルの割り当て
     */
    private async assignHierarchyLevels(hierarchy: TopicHierarchy[]): Promise<void> {
        // 関連性に基づいて階層レベルを決定
        hierarchy.forEach(node => {
            if (node.relatedTopics.length === 0) {
                node.level = 0; // ルートレベル
            } else {
                node.level = 1; // 子レベル（簡易実装）
            }
        });
    }

    /**
     * 分析品質スコア計算
     */
    private async calculateAnalysisQuality(
        clusters: OpinionCluster[], 
        hierarchy: TopicHierarchy[]
    ): Promise<number> {
        let qualityScore = 0;

        // クラスター内類似度（高いほど良い）
        const intraClusterSimilarity = clusters.reduce((sum, cluster) => 
            sum + cluster.similarity, 0) / clusters.length;
        
        // クラスター数の適切性（多すぎず少なすぎず）
        const clusterCountScore = Math.max(0, 1 - Math.abs(clusters.length - 8) / 10);
        
        // 階層構造の完成度
        const hierarchyScore = hierarchy.length > 0 ? 
            hierarchy.filter(h => h.relatedTopics.length > 0).length / hierarchy.length : 0;

        qualityScore = (intraClusterSimilarity * 0.5) + 
                      (clusterCountScore * 0.3) + 
                      (hierarchyScore * 0.2);

        return Math.max(0, Math.min(1, qualityScore));
    }

    /**
     * 信頼度スコア計算
     */
    private async calculateConfidenceScore(
        clusters: OpinionCluster[], 
        hierarchy: TopicHierarchy[]
    ): Promise<number> {
        // 分析の一貫性と安定性を評価
        const consistencyScore = clusters.every(cluster => 
            cluster.opinions.length >= this.MIN_CLUSTER_SIZE
        ) ? 1.0 : 0.5;

        const coverageScore = clusters.reduce((sum, cluster) => 
            sum + cluster.opinions.length, 0) / 100; // 仮の総意見数

        return Math.max(0, Math.min(1, (consistencyScore + coverageScore) / 2));
    }
}