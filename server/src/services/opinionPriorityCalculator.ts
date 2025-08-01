import { Opinion } from '../types';

/**
 * 意見の優先度計算インターフェース
 */
export interface OpinionPriority {
  opinionId: string;
  content: string;
  priority: number;        // 0-100の重要度スコア
  tokenCount: number;
  reasons: string[];       // 優先度の理由
  submittedAt: Date;
  characterCount: number;
}

/**
 * 分析コンテキストインターフェース
 */
export interface AnalysisContext {
  existingTopics: ExistingTopic[];
  projectKeywords?: string[];
  recentAnalysisThemes?: string[];
}

export interface ExistingTopic {
  id: string;
  name: string;
  summary: string;
  count: number;
  keywords?: string[];
}

/**
 * 意見優先度計算エンジン
 * 
 * 核心機能:
 * - 意見の重要度を多角的に評価
 * - トークン制限内での最適選択に必要な優先度付け
 * - 新規性、情報量、感情的強度、キーワード分析
 */
export class OpinionPriorityCalculator {
  private readonly TOKEN_ESTIMATION_FACTOR = 1.3; // 文字数 × 1.3 = 概算トークン数
  private readonly MAX_PRIORITY_SCORE = 100;
  
  /**
   * 意見の優先度を計算する
   */
  calculatePriority(opinion: Opinion, context: AnalysisContext): OpinionPriority {
    let priority = 0;
    const reasons: string[] = [];
    
    console.log(`[OpinionPriority] 🔍 意見優先度計算開始: ID=${opinion.id}`);
    
    // 1. 文字数（情報量）評価 (最大25点)
    const lengthScore = this.calculateLengthScore(opinion.content, reasons);
    priority += lengthScore;
    
    // 2. 新しさ評価 (最大30点)
    const recentnessScore = this.calculateRecentnessScore(opinion.submittedAt, reasons);
    priority += recentnessScore;
    
    // 3. ユニークキーワード評価 (最大25点)
    const uniquenessScore = this.calculateUniquenessScore(opinion.content, context, reasons);
    priority += uniquenessScore;
    
    // 4. 感情的強度評価 (最大20点)
    const emotionalScore = this.calculateEmotionalScore(opinion.content, reasons);
    priority += emotionalScore;
    
    const finalPriority = Math.min(priority, this.MAX_PRIORITY_SCORE);
    const tokenCount = this.estimateTokens(opinion.content);
    
    const result: OpinionPriority = {
      opinionId: opinion.id,
      content: opinion.content,
      priority: finalPriority,
      tokenCount,
      reasons,
      submittedAt: new Date(opinion.submittedAt),
      characterCount: opinion.content.length
    };
    
    console.log(`[OpinionPriority] ✅ 優先度計算完了:`, {
      opinionId: opinion.id,
      priority: finalPriority,
      tokenCount,
      reasonsCount: reasons.length,
      characterCount: opinion.content.length
    });
    
    return result;
  }
  
  /**
   * 複数意見の優先度を一括計算
   */
  async calculateBatchPriorities(
    opinions: Opinion[], 
    context: AnalysisContext
  ): Promise<OpinionPriority[]> {
    console.log(`[OpinionPriority] 📊 一括優先度計算開始: ${opinions.length}件`);
    
    const startTime = Date.now();
    const priorities = opinions.map(opinion => this.calculatePriority(opinion, context));
    
    // 優先度降順でソート
    priorities.sort((a, b) => b.priority - a.priority);
    
    const executionTime = Date.now() - startTime;
    
    console.log(`[OpinionPriority] 🎯 一括計算完了:`, {
      totalOpinions: opinions.length,
      executionTime: `${executionTime}ms`,
      averagePriority: Math.round(priorities.reduce((sum, p) => sum + p.priority, 0) / priorities.length),
      highPriorityCount: priorities.filter(p => p.priority > 70).length,
      mediumPriorityCount: priorities.filter(p => p.priority >= 40 && p.priority <= 70).length,
      lowPriorityCount: priorities.filter(p => p.priority < 40).length
    });
    
    return priorities;
  }
  
  /**
   * 文字数（情報量）スコア計算
   */
  private calculateLengthScore(content: string, reasons: string[]): number {
    const length = content.length;
    let score = 0;
    
    if (length > 200) {
      score = 25;
      reasons.push('豊富な情報量 (200文字以上)');
    } else if (length > 100) {
      score = 20;
      reasons.push('十分な情報量 (100-200文字)');
    } else if (length > 50) {
      score = 15;
      reasons.push('標準的な情報量 (50-100文字)');
    } else if (length > 20) {
      score = 10;
      reasons.push('最低限の情報量 (20-50文字)');
    } else {
      score = 5;
      reasons.push('短文');
    }
    
    return score;
  }
  
  /**
   * 新しさスコア計算
   */
  private calculateRecentnessScore(submittedAt: string | Date, reasons: string[]): number {
    const submissionDate = new Date(submittedAt);
    const now = new Date();
    const hoursOld = (now.getTime() - submissionDate.getTime()) / (1000 * 60 * 60);
    
    let score = 0;
    
    if (hoursOld < 1) {
      score = 30;
      reasons.push('超新規投稿 (1時間以内)');
    } else if (hoursOld < 6) {
      score = 25;
      reasons.push('新規投稿 (6時間以内)');
    } else if (hoursOld < 24) {
      score = 20;
      reasons.push('当日投稿 (24時間以内)');
    } else if (hoursOld < 72) {
      score = 15;
      reasons.push('最近の投稿 (3日以内)');
    } else if (hoursOld < 168) {
      score = 10;
      reasons.push('1週間以内の投稿');
    } else {
      score = 5;
      reasons.push('過去の投稿');
    }
    
    return score;
  }
  
  /**
   * ユニークキーワードスコア計算
   */
  private calculateUniquenessScore(
    content: string, 
    context: AnalysisContext, 
    reasons: string[]
  ): number {
    const contentKeywords = this.extractKeywords(content);
    const existingKeywords = this.collectExistingKeywords(context.existingTopics);
    
    // 既存トピックにないユニークなキーワードを特定
    const uniqueKeywords = contentKeywords.filter(keyword => 
      !existingKeywords.some(existing => 
        existing.toLowerCase().includes(keyword.toLowerCase()) ||
        keyword.toLowerCase().includes(existing.toLowerCase())
      )
    );
    
    let score = 0;
    if (uniqueKeywords.length > 0) {
      score = Math.min(uniqueKeywords.length * 5, 25);
      reasons.push(`新規キーワード: ${uniqueKeywords.slice(0, 3).join(', ')}${uniqueKeywords.length > 3 ? '他' : ''}`);
    }
    
    // プロジェクト関連キーワードとの関連性評価
    if (context.projectKeywords) {
      const relevantKeywords = contentKeywords.filter(keyword =>
        context.projectKeywords!.some(projectKeyword =>
          keyword.toLowerCase().includes(projectKeyword.toLowerCase())
        )
      );
      
      if (relevantKeywords.length > 0) {
        score += 5;
        reasons.push('プロジェクト関連キーワード含む');
      }
    }
    
    return score;
  }
  
  /**
   * 感情的強度スコア計算
   */
  private calculateEmotionalScore(content: string, reasons: string[]): number {
    let score = 0;
    
    // 強い感情を示すキーワード
    const strongEmotionKeywords = [
      // 強い感情表現
      '素晴らしい', '最高', '最悪', '絶対', '完全に', '間違いなく',
      '驚く', '感動', '失望', '怒り', '不安', '心配', '喜び', '嬉しい',
      // 強調表現
      '！！', '？？', '本当に', 'とても', 'すごく', 'かなり', '非常に',
      // 問題指摘
      '問題', '課題', '改善', '必要', '重要', '緊急', '危険'
    ];
    
    const emotionMatches = strongEmotionKeywords.filter(keyword => 
      content.includes(keyword)
    );
    
    if (emotionMatches.length > 0) {
      score = Math.min(emotionMatches.length * 3, 15);
      reasons.push(`感情表現: ${emotionMatches.slice(0, 2).join(', ')}${emotionMatches.length > 2 ? '他' : ''}`);
    }
    
    // 疑問文の検出
    if (content.includes('？') || content.includes('?')) {
      score += 5;
      reasons.push('疑問文・質問');
    }
    
    // 提案や改善案の検出
    const suggestionKeywords = ['提案', '改善', 'もっと', 'ほしい', 'べき', '必要'];
    const suggestionMatches = suggestionKeywords.filter(keyword => content.includes(keyword));
    
    if (suggestionMatches.length > 0) {
      score += 5;
      reasons.push('提案・改善案');
    }
    
    return score;
  }
  
  /**
   * キーワード抽出
   */
  private extractKeywords(content: string): string[] {
    // 基本的なキーワード抽出（実際にはより高度な形態素解析が可能）
    // 長い単語を優先して抽出
    const words = content
      .replace(/[。、！？\n\r\t]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length >= 2)
      .filter(word => !/^[a-zA-Z0-9]+$/.test(word)) // 英数字のみを除外
      .sort((a, b) => b.length - a.length)
      .slice(0, 10);
    
    return [...new Set(words)]; // 重複除去
  }
  
  /**
   * 既存トピックからキーワード収集
   */
  private collectExistingKeywords(existingTopics: ExistingTopic[]): string[] {
    const keywords: string[] = [];
    
    existingTopics.forEach(topic => {
      // トピック名からキーワード抽出
      keywords.push(...this.extractKeywords(topic.name));
      // 概要からキーワード抽出
      keywords.push(...this.extractKeywords(topic.summary));
      // 既存キーワードがあれば追加
      if (topic.keywords) {
        keywords.push(...topic.keywords);
      }
    });
    
    return [...new Set(keywords)]; // 重複除去
  }
  
  /**
   * トークン数推定
   */
  private estimateTokens(content: string): number {
    return Math.ceil(content.length * this.TOKEN_ESTIMATION_FACTOR);
  }
  
  /**
   * 優先度統計情報の生成
   */
  generatePriorityStats(priorities: OpinionPriority[]): {
    totalOpinions: number;
    averagePriority: number;
    highPriorityCount: number;
    mediumPriorityCount: number;
    lowPriorityCount: number;
    totalTokens: number;
    averageTokensPerOpinion: number;
  } {
    const totalOpinions = priorities.length;
    const averagePriority = totalOpinions > 0 
      ? Math.round(priorities.reduce((sum, p) => sum + p.priority, 0) / totalOpinions)
      : 0;
    
    const highPriorityCount = priorities.filter(p => p.priority > 70).length;
    const mediumPriorityCount = priorities.filter(p => p.priority >= 40 && p.priority <= 70).length;
    const lowPriorityCount = priorities.filter(p => p.priority < 40).length;
    
    const totalTokens = priorities.reduce((sum, p) => sum + p.tokenCount, 0);
    const averageTokensPerOpinion = totalOpinions > 0 
      ? Math.round(totalTokens / totalOpinions)
      : 0;
    
    return {
      totalOpinions,
      averagePriority,
      highPriorityCount,
      mediumPriorityCount,
      lowPriorityCount,
      totalTokens,
      averageTokensPerOpinion
    };
  }
}