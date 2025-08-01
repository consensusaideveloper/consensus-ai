import { OpinionPriority } from './opinionPriorityCalculator';

/**
 * 最適選択結果インターフェース
 */
export interface OptimalSelectionResult {
  selectedOpinions: OpinionPriority[];
  unselectedOpinions: OpinionPriority[];
  selectionStats: SelectionStats;
  optimizationInfo: OptimizationInfo;
}

export interface SelectionStats {
  totalOpinions: number;
  selectedCount: number;
  unselectedCount: number;
  selectionRate: number;
  totalTokens: number;
  tokenLimit: number;
  tokenUsageRate: number;
  averagePriority: number;
  totalPriorityScore: number;
  efficiency: number; // 優先度 / トークン比
}

export interface OptimizationInfo {
  algorithmUsed: 'greedy_priority' | 'token_efficiency' | 'balanced';
  constraintType: 'token_limit' | 'opinion_limit' | 'both';
  optimizationTime: number;
  alternativesConsidered: number;
}

/**
 * 最適意見選択エンジン
 * 
 * 核心機能:
 * - トークン制限内での最適意見セット選択
 * - 優先度の総和を最大化する動的選択
 * - 複数の最適化戦略（貪欲法、効率優先、バランス型）
 * - 制約条件の柔軟な対応
 */
export class OptimalSelectionEngine {
  private readonly DEFAULT_TOKEN_LIMIT = 4000;
  private readonly DEFAULT_MAX_OPINIONS = 15;
  private readonly EFFICIENCY_THRESHOLD = 20; // 優先度/トークン比の最低閾値
  
  /**
   * 最適な意見セットを選択
   */
  selectOptimalSet(
    prioritizedOpinions: OpinionPriority[],
    tokenLimit: number = this.DEFAULT_TOKEN_LIMIT,
    maxOpinions: number = this.DEFAULT_MAX_OPINIONS,
    strategy: 'greedy_priority' | 'token_efficiency' | 'balanced' = 'balanced'
  ): OptimalSelectionResult {
    const startTime = Date.now();
    
    console.log(`[OptimalSelection] 🎯 最適選択開始:`, {
      totalOpinions: prioritizedOpinions.length,
      tokenLimit,
      maxOpinions,
      strategy
    });
    
    let result: OptimalSelectionResult;
    
    switch (strategy) {
      case 'greedy_priority':
        result = this.greedyPrioritySelection(prioritizedOpinions, tokenLimit, maxOpinions);
        break;
      case 'token_efficiency':
        result = this.tokenEfficiencySelection(prioritizedOpinions, tokenLimit, maxOpinions);
        break;
      case 'balanced':
      default:
        result = this.balancedSelection(prioritizedOpinions, tokenLimit, maxOpinions);
        break;
    }
    
    const optimizationTime = Date.now() - startTime;
    result.optimizationInfo.optimizationTime = optimizationTime;
    
    console.log(`[OptimalSelection] ✅ 最適選択完了:`, {
      selectedCount: result.selectedOpinions.length,
      tokenUsage: `${result.selectionStats.totalTokens}/${tokenLimit}`,
      tokenUsageRate: `${Math.round(result.selectionStats.tokenUsageRate)}%`,
      averagePriority: result.selectionStats.averagePriority,
      efficiency: Math.round(result.selectionStats.efficiency * 100) / 100,
      strategy,
      optimizationTime: `${optimizationTime}ms`
    });
    
    return result;
  }
  
  /**
   * 貪欲法による優先度優先選択
   */
  private greedyPrioritySelection(
    opinions: OpinionPriority[],
    tokenLimit: number,
    maxOpinions: number
  ): OptimalSelectionResult {
    const selected: OpinionPriority[] = [];
    let totalTokens = 0;
    let totalPriority = 0;
    
    // 優先度降順でソート（すでにソートされているが念のため）
    const sortedByPriority = [...opinions].sort((a, b) => b.priority - a.priority);
    
    for (const opinion of sortedByPriority) {
      const wouldExceedTokens = totalTokens + opinion.tokenCount > tokenLimit;
      const wouldExceedCount = selected.length >= maxOpinions;
      
      if (!wouldExceedTokens && !wouldExceedCount) {
        selected.push(opinion);
        totalTokens += opinion.tokenCount;
        totalPriority += opinion.priority;
      }
    }
    
    const unselected = opinions.filter(op => !selected.find(sel => sel.opinionId === op.opinionId));
    
    return this.createSelectionResult(
      selected,
      unselected,
      tokenLimit,
      totalTokens,
      totalPriority,
      'greedy_priority',
      this.determineConstraintType(totalTokens, tokenLimit, selected.length, maxOpinions)
    );
  }
  
  /**
   * トークン効率優先選択
   */
  private tokenEfficiencySelection(
    opinions: OpinionPriority[],
    tokenLimit: number,
    maxOpinions: number
  ): OptimalSelectionResult {
    // 効率性（優先度/トークン比）でソート
    const sortedByEfficiency = [...opinions]
      .map(op => ({
        ...op,
        efficiency: op.priority / op.tokenCount
      }))
      .sort((a, b) => b.efficiency - a.efficiency);
    
    const selected: OpinionPriority[] = [];
    let totalTokens = 0;
    let totalPriority = 0;
    
    for (const opinion of sortedByEfficiency) {
      const wouldExceedTokens = totalTokens + opinion.tokenCount > tokenLimit;
      const wouldExceedCount = selected.length >= maxOpinions;
      const meetsEfficiencyThreshold = opinion.efficiency >= this.EFFICIENCY_THRESHOLD;
      
      if (!wouldExceedTokens && !wouldExceedCount && meetsEfficiencyThreshold) {
        selected.push(opinion);
        totalTokens += opinion.tokenCount;
        totalPriority += opinion.priority;
      }
    }
    
    const unselected = opinions.filter(op => !selected.find(sel => sel.opinionId === op.opinionId));
    
    return this.createSelectionResult(
      selected,
      unselected,
      tokenLimit,
      totalTokens,
      totalPriority,
      'token_efficiency',
      this.determineConstraintType(totalTokens, tokenLimit, selected.length, maxOpinions)
    );
  }
  
  /**
   * バランス型選択（優先度と効率のバランス）
   */
  private balancedSelection(
    opinions: OpinionPriority[],
    tokenLimit: number,
    maxOpinions: number
  ): OptimalSelectionResult {
    // バランススコアを計算（優先度 * 70% + 効率性 * 30%）
    const balancedOpinions = opinions
      .map(op => {
        const efficiency = op.priority / op.tokenCount;
        const normalizedPriority = op.priority / 100; // 0-1に正規化
        const normalizedEfficiency = Math.min(efficiency / 50, 1); // 効率性を0-1に正規化
        const balanceScore = normalizedPriority * 0.7 + normalizedEfficiency * 0.3;
        
        return {
          ...op,
          efficiency,
          balanceScore: balanceScore * 100 // 0-100スケールに戻す
        };
      })
      .sort((a, b) => b.balanceScore - a.balanceScore);
    
    const selected: OpinionPriority[] = [];
    let totalTokens = 0;
    let totalPriority = 0;
    
    for (const opinion of balancedOpinions) {
      const wouldExceedTokens = totalTokens + opinion.tokenCount > tokenLimit;
      const wouldExceedCount = selected.length >= maxOpinions;
      
      if (!wouldExceedTokens && !wouldExceedCount) {
        selected.push(opinion);
        totalTokens += opinion.tokenCount;
        totalPriority += opinion.priority;
      }
    }
    
    const unselected = opinions.filter(op => !selected.find(sel => sel.opinionId === op.opinionId));
    
    return this.createSelectionResult(
      selected,
      unselected,
      tokenLimit,
      totalTokens,
      totalPriority,
      'balanced',
      this.determineConstraintType(totalTokens, tokenLimit, selected.length, maxOpinions)
    );
  }
  
  /**
   * 選択結果オブジェクトの作成
   */
  private createSelectionResult(
    selected: OpinionPriority[],
    unselected: OpinionPriority[],
    tokenLimit: number,
    totalTokens: number,
    totalPriority: number,
    algorithmUsed: 'greedy_priority' | 'token_efficiency' | 'balanced',
    constraintType: 'token_limit' | 'opinion_limit' | 'both'
  ): OptimalSelectionResult {
    const totalOpinions = selected.length + unselected.length;
    const selectionRate = totalOpinions > 0 ? (selected.length / totalOpinions) * 100 : 0;
    const tokenUsageRate = tokenLimit > 0 ? (totalTokens / tokenLimit) * 100 : 0;
    const averagePriority = selected.length > 0 ? totalPriority / selected.length : 0;
    const efficiency = totalTokens > 0 ? totalPriority / totalTokens : 0;
    
    return {
      selectedOpinions: selected,
      unselectedOpinions: unselected,
      selectionStats: {
        totalOpinions,
        selectedCount: selected.length,
        unselectedCount: unselected.length,
        selectionRate: Math.round(selectionRate * 100) / 100,
        totalTokens,
        tokenLimit,
        tokenUsageRate: Math.round(tokenUsageRate * 100) / 100,
        averagePriority: Math.round(averagePriority * 100) / 100,
        totalPriorityScore: totalPriority,
        efficiency: Math.round(efficiency * 100) / 100
      },
      optimizationInfo: {
        algorithmUsed,
        constraintType,
        optimizationTime: 0, // 後で設定
        alternativesConsidered: totalOpinions
      }
    };
  }
  
  /**
   * 制約タイプの判定
   */
  private determineConstraintType(
    totalTokens: number,
    tokenLimit: number,
    selectedCount: number,
    maxOpinions: number
  ): 'token_limit' | 'opinion_limit' | 'both' {
    const hitTokenLimit = totalTokens >= tokenLimit * 0.95; // 95%以上で制限ヒット
    const hitOpinionLimit = selectedCount >= maxOpinions;
    
    if (hitTokenLimit && hitOpinionLimit) {
      return 'both';
    } else if (hitTokenLimit) {
      return 'token_limit';
    } else if (hitOpinionLimit) {
      return 'opinion_limit';
    } else {
      return 'token_limit'; // デフォルト
    }
  }
  
  /**
   * 選択品質の評価
   */
  evaluateSelectionQuality(result: OptimalSelectionResult): {
    quality: 'excellent' | 'good' | 'fair' | 'poor';
    score: number;
    recommendations: string[];
  } {
    const stats = result.selectionStats;
    const recommendations: string[] = [];
    let score = 0;
    
    // 選択率評価 (25点満点)
    if (stats.selectionRate > 80) {
      score += 25;
    } else if (stats.selectionRate > 60) {
      score += 20;
    } else if (stats.selectionRate > 40) {
      score += 15;
      recommendations.push('選択率が低めです。トークン制限の緩和を検討してください');
    } else {
      score += 10;
      recommendations.push('選択率が低すぎます。制限の見直しが必要です');
    }
    
    // トークン使用率評価 (25点満点)
    if (stats.tokenUsageRate > 85 && stats.tokenUsageRate <= 95) {
      score += 25;
    } else if (stats.tokenUsageRate > 70) {
      score += 20;
    } else if (stats.tokenUsageRate > 50) {
      score += 15;
    } else {
      score += 10;
      recommendations.push('トークン使用率が低いです。より多くの意見を含められます');
    }
    
    // 平均優先度評価 (25点満点)
    if (stats.averagePriority > 70) {
      score += 25;
    } else if (stats.averagePriority > 60) {
      score += 20;
    } else if (stats.averagePriority > 50) {
      score += 15;
    } else {
      score += 10;
      recommendations.push('選択された意見の優先度が低いです');
    }
    
    // 効率性評価 (25点満点)
    if (stats.efficiency > 20) {
      score += 25;
    } else if (stats.efficiency > 15) {
      score += 20;
    } else if (stats.efficiency > 10) {
      score += 15;
    } else {
      score += 10;
      recommendations.push('優先度/トークン効率が低いです');
    }
    
    let quality: 'excellent' | 'good' | 'fair' | 'poor';
    if (score >= 90) {
      quality = 'excellent';
    } else if (score >= 75) {
      quality = 'good';
    } else if (score >= 60) {
      quality = 'fair';
    } else {
      quality = 'poor';
    }
    
    return {
      quality,
      score,
      recommendations
    };
  }
  
  /**
   * 選択戦略の推奨
   */
  recommendStrategy(opinions: OpinionPriority[]): {
    recommendedStrategy: 'greedy_priority' | 'token_efficiency' | 'balanced';
    reason: string;
    confidence: number;
  } {
    const totalOpinions = opinions.length;
    const averageTokens = opinions.reduce((sum, op) => sum + op.tokenCount, 0) / totalOpinions;
    const averagePriority = opinions.reduce((sum, op) => sum + op.priority, 0) / totalOpinions;
    const priorityVariance = this.calculateVariance(opinions.map(op => op.priority));
    const tokenVariance = this.calculateVariance(opinions.map(op => op.tokenCount));
    
    // 高優先度の意見が多い場合：優先度重視
    if (averagePriority > 70 && priorityVariance > 200) {
      return {
        recommendedStrategy: 'greedy_priority',
        reason: '高優先度の意見が多く、優先度にばらつきがあるため優先度重視が最適',
        confidence: 0.85
      };
    }
    
    // トークン数にばらつきがある場合：効率重視
    if (tokenVariance > averageTokens * 0.5) {
      return {
        recommendedStrategy: 'token_efficiency',
        reason: 'トークン数にばらつきがあるため効率重視が最適',
        confidence: 0.80
      };
    }
    
    // 標準的な場合：バランス型
    return {
      recommendedStrategy: 'balanced',
      reason: '標準的な分布のためバランス型が最適',
      confidence: 0.75
    };
  }
  
  /**
   * 分散計算
   */
  private calculateVariance(values: number[]): number {
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const squaredDiffs = values.map(val => Math.pow(val - mean, 2));
    return squaredDiffs.reduce((sum, diff) => sum + diff, 0) / values.length;
  }
}