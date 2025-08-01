/**
 * AI による意見重要度自動判定サービス
 * トピック解決への影響度を算出し、個別対応要否を自動判定
 */

export interface ImportanceScore {
  score: number; // 0-100のスコア
  level: "critical" | "high" | "medium" | "low";
  reasoning: string[];
  confidence: number; // 0-1の信頼度
  factors: {
    sentimentImpact: number;
    keywordRelevance: number;
    lengthQuality: number;
    uniqueness: number;
    stakeholderImpact: number;
  };
  actionRequired: boolean;
  suggestedPriority: "high" | "medium" | "low" | "none";
}

export interface OpinionAnalysis {
  id: string;
  content: string;
  topicId: string;
  topicTitle: string;
  importance: ImportanceScore;
  analyzedAt: Date;
}

interface TopicContext {
  title: string;
  keywords: string[];
  totalOpinions: number;
  sentiment: {
    positive: number;
    negative: number;
    neutral: number;
  };
}

class OpinionImportanceService {
  /**
   * 意見の重要度を分析
   */
  async analyzeOpinionImportance(
    _opinionId: string,
    content: string,
    topicContext: TopicContext,
    allOpinions: Array<{ id: string; content: string; sentiment?: string }>
  ): Promise<ImportanceScore> {
    const factors = {
      sentimentImpact: this.calculateSentimentImpact(content),
      keywordRelevance: this.calculateKeywordRelevance(content, topicContext),
      lengthQuality: this.calculateLengthQuality(content),
      uniqueness: this.calculateUniqueness(content, allOpinions),
      stakeholderImpact: this.calculateStakeholderImpact(content),
    };

    const score = this.calculateOverallScore(factors);
    const level = this.determineImportanceLevel(score);
    const confidence = this.calculateConfidence(factors);
    const reasoning = this.generateReasoning(factors, score);
    const actionRequired = this.determineActionRequired(score, level);
    const suggestedPriority = this.suggestPriority(score, level);

    return {
      score,
      level,
      reasoning,
      confidence,
      factors,
      actionRequired,
      suggestedPriority,
    };
  }

  /**
   * 感情的影響度を計算
   */
  private calculateSentimentImpact(content: string): number {
    const emotionalWords = [
      // 強い反対・懸念
      { words: ["反対", "問題", "困る", "心配", "不安", "危険"], weight: 0.9 },
      // 強い賛成・支持
      { words: ["賛成", "良い", "素晴らしい", "必要", "重要"], weight: 0.8 },
      // 緊急性
      { words: ["緊急", "急ぎ", "すぐに", "早急", "至急"], weight: 0.9 },
      // 影響範囲
      { words: ["皆", "みんな", "住民", "市民", "全体"], weight: 0.7 },
    ];

    let maxImpact = 0;
    const lowerContent = content.toLowerCase();

    for (const category of emotionalWords) {
      const matchCount = category.words.filter((word) =>
        lowerContent.includes(word)
      ).length;

      if (matchCount > 0) {
        const impact = Math.min(
          category.weight * (matchCount / category.words.length),
          1
        );
        maxImpact = Math.max(maxImpact, impact);
      }
    }

    return maxImpact;
  }

  /**
   * キーワード関連性を計算
   */
  private calculateKeywordRelevance(
    content: string,
    topicContext: TopicContext
  ): number {
    if (!topicContext.keywords || topicContext.keywords.length === 0) {
      return 0.5; // デフォルト値
    }

    const lowerContent = content.toLowerCase();
    const matchingKeywords = topicContext.keywords.filter((keyword) =>
      lowerContent.includes(keyword.toLowerCase())
    );

    const relevanceScore =
      matchingKeywords.length / topicContext.keywords.length;

    // キーワードの出現頻度も考慮
    const frequency = matchingKeywords.reduce((sum, keyword) => {
      const matches = (
        lowerContent.match(new RegExp(keyword.toLowerCase(), "g")) || []
      ).length;
      return sum + matches;
    }, 0);

    return Math.min(relevanceScore + frequency * 0.1, 1);
  }

  /**
   * 文章の質を計算
   */
  private calculateLengthQuality(content: string): number {
    const length = content.trim().length;
    const sentences = content
      .split(/[。！？]/)
      .filter((s) => s.trim().length > 0).length;

    // 適切な長さ（50-500文字）で高スコア
    const lengthScore =
      length < 20
        ? 0.2
        : length < 50
        ? 0.5
        : length < 500
        ? 1.0
        : length < 1000
        ? 0.8
        : 0.6;

    // 文章構造（複数文で構成されているか）
    const structureScore = sentences > 1 ? 1.0 : 0.7;

    return (lengthScore + structureScore) / 2;
  }

  /**
   * 独自性を計算
   */
  private calculateUniqueness(
    content: string,
    allOpinions: Array<{ id: string; content: string }>
  ): number {
    const lowerContent = content.toLowerCase();
    const contentWords = lowerContent
      .split(/\s+/)
      .filter((word) => word.length > 2);

    let similaritySum = 0;
    let comparisonCount = 0;

    for (const other of allOpinions) {
      if (other.content === content) continue; // 自分自身を除外

      const otherWords = other.content
        .toLowerCase()
        .split(/\s+/)
        .filter((word) => word.length > 2);
      const commonWords = contentWords.filter((word) =>
        otherWords.includes(word)
      );
      const similarity =
        commonWords.length / Math.max(contentWords.length, otherWords.length);

      similaritySum += similarity;
      comparisonCount++;
    }

    if (comparisonCount === 0) return 1.0; // 他の意見がない場合は最高スコア

    const averageSimilarity = similaritySum / comparisonCount;
    return Math.max(0, 1 - averageSimilarity); // 類似度が低いほど独自性が高い
  }

  /**
   * ステークホルダー影響度を計算
   */
  private calculateStakeholderImpact(content: string): number {
    const stakeholderIndicators = [
      // 直接的な影響を示すフレーズ
      { phrases: ["私は", "私の", "私たち", "我々"], weight: 0.6 }, // 個人的経験
      { phrases: ["子供", "高齢者", "障害者", "妊婦"], weight: 0.9 }, // 脆弱な立場
      { phrases: ["事業者", "商店", "企業", "会社"], weight: 0.8 }, // 経済的影響
      { phrases: ["学校", "病院", "保育園"], weight: 0.9 }, // 重要施設
      { phrases: ["交通", "道路", "バス", "電車"], weight: 0.7 }, // インフラ
    ];

    let maxImpact = 0;
    const lowerContent = content.toLowerCase();

    for (const category of stakeholderIndicators) {
      const hasMatch = category.phrases.some((phrase) =>
        lowerContent.includes(phrase)
      );

      if (hasMatch) {
        maxImpact = Math.max(maxImpact, category.weight);
      }
    }

    return maxImpact;
  }

  /**
   * 総合スコアを計算
   */
  private calculateOverallScore(factors: ImportanceScore["factors"]): number {
    const weights = {
      sentimentImpact: 0.25,
      keywordRelevance: 0.2,
      lengthQuality: 0.15,
      uniqueness: 0.2,
      stakeholderImpact: 0.2,
    };

    const weightedScore = Object.entries(factors).reduce(
      (sum, [key, value]) => {
        return sum + value * weights[key as keyof typeof weights];
      },
      0
    );

    return Math.round(weightedScore * 100);
  }

  /**
   * 重要度レベルを決定
   */
  private determineImportanceLevel(score: number): ImportanceScore["level"] {
    if (score >= 85) return "critical";
    if (score >= 70) return "high";
    if (score >= 50) return "medium";
    return "low";
  }

  /**
   * 信頼度を計算
   */
  private calculateConfidence(factors: ImportanceScore["factors"]): number {
    // 各要素のバランスが取れているほど信頼度が高い
    const values = Object.values(factors);
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const variance =
      values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) /
      values.length;

    // 分散が小さいほど（バランスが取れているほど）信頼度が高い
    const balance = Math.max(0, 1 - variance);

    // 平均値も考慮（極端に低い値の場合は信頼度を下げる）
    const reliability = mean > 0.3 ? 1 : mean / 0.3;

    return Math.min(balance * reliability, 1);
  }

  /**
   * 判定理由を生成
   */
  private generateReasoning(
    factors: ImportanceScore["factors"],
    score: number
  ): string[] {
    const reasoning: string[] = [];

    if (factors.sentimentImpact > 0.7) {
      reasoning.push("強い感情的反応を含む内容です");
    }

    if (factors.keywordRelevance > 0.7) {
      reasoning.push("トピックに高度に関連する内容です");
    }

    if (factors.lengthQuality > 0.8) {
      reasoning.push("十分に詳細で構造化された意見です");
    }

    if (factors.uniqueness > 0.7) {
      reasoning.push("他の意見にない独自の視点を含みます");
    }

    if (factors.stakeholderImpact > 0.7) {
      reasoning.push("重要なステークホルダーへの影響が示されています");
    }

    if (score >= 85) {
      reasoning.push("トピック解決に極めて重要な意見です");
    } else if (score >= 70) {
      reasoning.push("トピック解決に重要な意見です");
    } else if (score >= 50) {
      reasoning.push("一定の重要性を持つ意見です");
    } else {
      reasoning.push("基本的な意見として記録されます");
    }

    return reasoning.length > 0
      ? reasoning
      : ["一般的な意見として評価されました"];
  }

  /**
   * アクション要否を判定
   */
  private determineActionRequired(
    score: number,
    level: ImportanceScore["level"]
  ): boolean {
    return level === "critical" || level === "high" || score >= 70;
  }

  /**
   * 推奨優先度を決定
   */
  private suggestPriority(
    score: number,
    level: ImportanceScore["level"]
  ): ImportanceScore["suggestedPriority"] {
    if (level === "critical" || score >= 85) return "high";
    if (level === "high" || score >= 70) return "high";
    if (level === "medium" || score >= 50) return "medium";
    if (score >= 30) return "low";
    return "none";
  }

  /**
   * 複数の意見を一括分析
   */
  async analyzeBatchOpinions(
    opinions: Array<{ id: string; content: string; sentiment?: string }>,
    topicContext: TopicContext
  ): Promise<OpinionAnalysis[]> {
    const results: OpinionAnalysis[] = [];

    for (const opinion of opinions) {
      const importance = await this.analyzeOpinionImportance(
        opinion.id,
        opinion.content,
        topicContext,
        opinions
      );

      results.push({
        id: opinion.id,
        content: opinion.content,
        topicId: topicContext.title, // 実際の実装ではtopicIdを使用
        topicTitle: topicContext.title,
        importance,
        analyzedAt: new Date(),
      });
    }

    // 重要度順にソート
    return results.sort((a, b) => b.importance.score - a.importance.score);
  }

  /**
   * トピック解決への影響度を算出
   */
  calculateTopicResolutionImpact(analyses: OpinionAnalysis[]): {
    criticalCount: number;
    highCount: number;
    totalImportanceScore: number;
    topCriticalOpinions: OpinionAnalysis[];
    resolutionReadiness: number; // 0-1 (解決準備度)
  } {
    const criticalCount = analyses.filter(
      (a) => a.importance.level === "critical"
    ).length;
    const highCount = analyses.filter(
      (a) => a.importance.level === "high"
    ).length;
    const totalImportanceScore = analyses.reduce(
      (sum, a) => sum + a.importance.score,
      0
    );
    const topCriticalOpinions = analyses
      .filter(
        (a) =>
          a.importance.level === "critical" || a.importance.level === "high"
      )
      .slice(0, 5);

    // 重要な意見のアクション対応率に基づく解決準備度（実際の実装では対応状況データが必要）
    const resolutionReadiness =
      analyses.length > 0
        ? analyses.filter((a) => a.importance.actionRequired).length /
          analyses.length
        : 0;

    return {
      criticalCount,
      highCount,
      totalImportanceScore,
      topCriticalOpinions,
      resolutionReadiness,
    };
  }
}

export const opinionImportanceService = new OpinionImportanceService();
