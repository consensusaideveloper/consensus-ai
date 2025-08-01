import { prisma } from '../lib/database';
import { AppError } from '../middleware/errorHandler';
import { Opinion } from '../types';
import { adminDatabase as database } from '../lib/firebase-admin';
// Lazy loading imports will be done in methods
// import { getRealtimeService } from './realtimeService';

export interface TopicAnalysisResult {
    topics: Array<{
        id: string;
        name: string;
        category?: string;
        count: number;
        summary: string;
        opinions: Opinion[];
        keywords: string[];
        sentiment: {
            positive: number;
            negative: number;
            neutral: number;
        };
    }>;
    insights: Array<{
        title: string;
        description: string;
        count: number;
        priority: 'high' | 'medium' | 'low';
    }>;
    summary: string;
    aiSentimentAnalysis?: {
        enabled: boolean;
        analysisResults: Array<{
            opinionId: string;
            sentiment: 'positive' | 'negative' | 'neutral';
            confidence: number;
            reasoning: string;
        }>;
        summary: {
            positive: number;
            negative: number;
            neutral: number;
        };
    };
}


export interface TopicAnalysisOptions {
    enableAISentiment?: boolean;
    sentimentAnalysisTimeout?: number;
    maxOpinionsForSentiment?: number;
    analysisLanguage?: string;
}

export class TopicAnalysisService {
    private firebaseDataService: any;
    private dataSyncService: any;
    private analysisSyncService: any;
    private aiServiceManager: any;

    constructor() {
        // Lazy loading - services will be initialized on first use
        console.log('[TopicAnalysisService] 🔧 初期化完了（サービスはオンデマンドロード）');
    }

    // Lazy loading methods
    private async getFirebaseDataService() {
        if (!this.firebaseDataService) {
            const { FirebaseDataService } = await import('./firebaseDataService');
            this.firebaseDataService = new FirebaseDataService();
        }
        return this.firebaseDataService;
    }

    private async getDataSyncService() {
        if (!this.dataSyncService) {
            const { DataSyncService } = await import('./dataSyncService');
            this.dataSyncService = new DataSyncService();
        }
        return this.dataSyncService;
    }

    private async getAnalysisResultsSyncService() {
        if (!this.analysisSyncService) {
            const { AnalysisResultsSyncService } = await import('./analysisResultsSyncService');
            this.analysisSyncService = new AnalysisResultsSyncService();
        }
        return this.analysisSyncService;
    }

    private async getAIServiceManager() {
        if (!this.aiServiceManager) {
            const { getAIServiceManager } = await import('./aiServiceManager');
            this.aiServiceManager = getAIServiceManager();
        }
        return this.aiServiceManager;
    }

    /**
     * ユーザーの言語設定を取得
     */
    private async getUserLanguage(userId: string): Promise<string> {
        try {
            const user = await prisma.user.findUnique({
                where: { id: userId },
                select: { language: true }
            });
            
            const language = user?.language || 'ja';
            console.log('[TopicAnalysis] 🌐 ユーザー言語設定取得:', { userId: userId.substring(0, 8), language });
            return language;
        } catch (error) {
            console.warn('[TopicAnalysis] ⚠️ ユーザー言語設定取得失敗、デフォルト(ja)を使用:', error);
            return 'ja'; // デフォルトは日本語
        }
    }

    /**
     * ユーザーの分析言語設定を取得（analysisLanguage優先、未設定時はlanguageをフォールバック）
     */
    private async getUserAnalysisLanguage(userId: string): Promise<string> {
        try {
            const user = await prisma.user.findUnique({
                where: { id: userId },
                select: { analysisLanguage: true, language: true }
            });
            
            // analysisLanguage優先、未設定時はlanguageをフォールバック
            const analysisLanguage = user?.analysisLanguage || user?.language || 'ja';
            console.log('[TopicAnalysis] 🌐 ユーザー分析言語設定取得:', { 
                userId: userId.substring(0, 8),
                dbAnalysisLanguage: user?.analysisLanguage,
                dbLanguage: user?.language,
                finalAnalysisLanguage: analysisLanguage,
                analysisLanguageFallbackUsed: !user?.analysisLanguage,
                languageFallbackUsed: !user?.analysisLanguage && !user?.language,
                userExists: !!user
            });
            return analysisLanguage;
        } catch (error) {
            console.warn('[TopicAnalysis] ⚠️ ユーザー分析言語設定取得失敗、デフォルト(ja)を使用:', error);
            return 'ja';
        }
    }

    /**
     * 多言語プロンプト管理システム
     */
    private getMultiLanguagePrompt(language: string, opinionsText: string): string {
        console.log('[TopicAnalysis] 🌍 プロンプト言語選択:', {
            inputLanguage: language,
            willUseEnglishPrompt: language === 'en',
            willUseJapanesePrompt: language !== 'en'
        });
        
        if (language === 'en') {
            console.log('[TopicAnalysis] 🇺🇸 英語プロンプトを使用');
            return this.getEnglishAnalysisPrompt(opinionsText);
        } else {
            console.log('[TopicAnalysis] 🇯🇵 日本語プロンプトを使用');
            return this.getJapaneseAnalysisPrompt(opinionsText);
        }
    }

    /**
     * 日本語分析プロンプト
     */
    private getJapaneseAnalysisPrompt(opinionsText: string): string {
        return `
以下の意見・回答を分析し、類似する内容をグループ化してトピックを作成してください。

意見データ:
${opinionsText}

## 分析指針
- 回答者の実際の課題、要望、関心事に基づいてトピックを分類
- 具体的で実用性のある改善提案として整理
- 感情的なニュアンス（不満、要望、提案、賛成、反対など）も考慮
- 同様のテーマや分野の意見は統合して整理
- **柔軟な解釈**: 微妙な表現やニュアンスの違いも含めて関連性を見つける
- **包括的な分類**: 可能な限り全ての意見を適切なトピックに分類する

## 意見品質フィルタリング
以下の条件に該当する意見は分析対象から除外してください：
- 意味不明な文字列やランダムな文字の羅列
- いたずらや悪意のある投稿
- 内容が理解できない投稿
- 極端に短すぎるまたは長すぎる投稿
- 文章として成り立っていない投稿
除外した意見の番号は結果に含めず、有効な意見のみを分類してください。

## 出力形式
以下のJSON形式で結果を返してください：

{
  "topics": [
    {
      "category": "分野・カテゴリ名",
      "name": "具体的なテーマ・課題名",
      "summary": "この分野での主な意見と具体的なポイント。何が求められているか、なぜ重要かを含める（80-120文字）",
      "keywords": ["関連する具体的なキーワード", "対象", "関連要素", "類似表現", "同義語"],
      "opinionIds": [1, 2, 3]
    }
  ],
  "insights": [
    {
      "title": "意見から見える重要なポイント",
      "description": "複数の意見から読み取れる根本的な問題や改善の方向性。具体的な示唆を含める",
      "priority": "high",
      "count": 5
    },
    {
      "title": "実装に向けた提案",
      "description": "意見を踏まえた具体的な改善案や実装方針。実現可能性を考慮した提案",
      "priority": "medium",
      "count": 3
    },
    {
      "title": "長期的な課題",
      "description": "今後継続的に取り組むべき課題や改善点。将来に向けた方向性",
      "priority": "low",
      "count": 2
    }
  ],
  "summary": "全体の意見の特徴と傾向。主要なテーマ、要望の内容、関心事を含めた総括（100-150文字）"
}

## 重要なルール
1. **品質フィルタリング**: 意味不明・いたずら・理解不能な意見は完全に除外し、opinionIdsに含めない
2. **カテゴリとトピック名**: categoryフィールドに分野・カテゴリ名、nameフィールドに具体的なテーマを分けて表現
3. **サマリー**: 単なる要約ではなく、回答者が何を求め、なぜ重要かを説明
4. **キーワード**: 抽象的でなく具体的な対象や要素を含める。同義語や類似表現も含める
5. **意見分類**: opinionIdsには有効で関連する意見の番号のみを含める
6. **トピック数**: 意見の内容に応じて適切な数のトピックを作成（柔軟な制限）
7. **統合原則**: 同じ分野・同じテーマの意見は統合し、散らばらせない
8. **理解しやすさ**: 専門用語を避け、一般的で分かりやすい表現を使用
9. **除外報告**: 品質が低い意見を除外した場合も、有効な意見のみでトピック作成を継続
10. **★完全分類の原則**: 全ての有効な意見を必ずいずれかのトピックに分類すること。関連性が薄い場合でも、最も近いトピックに含める
11. **★柔軟な関連性判定**: 直接的な言葉の一致だけでなく、概念的な関連性や文脈も考慮して分類する
12. **★キーワード充実**: 各トピックのキーワードには、関連する表現、同義語、類似概念を豊富に含める
13. **★JSON形式厳守**: 回答は必ず上記の正確なJSON形式で返すこと。説明文や追加テキストは含めない
14. **★Insights必須生成**: 必ず3つ以上のinsightsを生成すること。高・中・低の優先度を含める
15. **★Insights品質**: 各insightはトピックを横断した分析的な視点を提供し、具体的な改善提案を含める

## ⚠️ 重要：応答形式の注意点
- o3/o4モデルを使用する場合、推論過程は含めず、最終的なJSONのみを出力してください
- レスポンスの最初と最後に{ }で囲まれた有効なJSONが含まれていることを確認してください
- マークダウンコードブロックは使用せず、直接JSONを出力してください

**🌍 言語要求（重要）: 必ず日本語で回答してください。トピック名、カテゴリ、要約、インサイトのタイトル、説明、キーワード、全体要約など、全ての内容を日本語のみで記述してください。**

## 出力例
{
  "topics": [...],
  "insights": [...],
  "summary": "..."
}
`;
    }

    /**
     * 英語分析プロンプト
     */
    private getEnglishAnalysisPrompt(opinionsText: string): string {
        return `
Please analyze the following opinions and responses, grouping similar content into topics.

Opinion Data:
${opinionsText}

## Analysis Guidelines
- Categorize topics based on respondents' actual issues, requests, and concerns
- Organize as specific and practical improvement proposals
- Consider emotional nuances (dissatisfaction, requests, suggestions, agreement, opposition, etc.)
- Integrate opinions with similar themes or areas
- **Flexible interpretation**: Find relationships including subtle expressions and nuanced differences
- **Comprehensive classification**: Classify all opinions into appropriate topics as much as possible

## Opinion Quality Filtering
Please exclude opinions that meet the following criteria from analysis:
- Meaningless strings or random character sequences
- Spam or malicious posts
- Incomprehensible content
- Extremely short or long posts
- Content that doesn't form proper sentences
Do not include the numbers of excluded opinions in results, and classify only valid opinions.

## Output Format
Please return results in the following JSON format:

{
  "topics": [
    {
      "category": "Field/Category Name",
      "name": "Specific Theme/Issue Name",
      "summary": "Main opinions and specific points in this field. Include what is being requested and why it's important (80-120 characters)",
      "keywords": ["Specific related keywords", "targets", "related elements", "similar expressions", "synonyms"],
      "opinionIds": [1, 2, 3]
    }
  ],
  "insights": [
    {
      "title": "Important Points from Opinions",
      "description": "Fundamental issues or improvement directions derived from multiple opinions. Include specific implications",
      "priority": "high",
      "count": 5
    },
    {
      "title": "Implementation Proposals",
      "description": "Specific improvement plans or implementation policies based on opinions. Proposals considering feasibility",
      "priority": "medium",
      "count": 3
    },
    {
      "title": "Long-term Issues",
      "description": "Issues and improvements to be addressed continuously in the future. Future-oriented directions",
      "priority": "low",
      "count": 2
    }
  ],
  "summary": "Overall characteristics and trends of opinions. Summary including main themes, content of requests, and concerns (100-150 characters)"
}

## Important Rules
1. **Quality filtering**: Completely exclude meaningless, spam, or incomprehensible opinions from opinionIds
2. **Category and topic names**: Separate field/category name in category field and specific theme in name field
3. **Summary**: Not just a summary, but explain what respondents want and why it's important
4. **Keywords**: Include specific targets and elements, not abstract ones. Include synonyms and similar expressions
5. **Opinion classification**: Include only valid and related opinion numbers in opinionIds
6. **Number of topics**: Create appropriate number of topics according to opinion content (no limit)
7. **Integration principle**: Integrate opinions from same field/theme, don't scatter them
8. **Understandability**: Avoid technical terms, use general and understandable expressions
9. **Exclusion reporting**: Continue topic creation with only valid opinions even when low-quality opinions are excluded
10. **★Complete classification principle**: All valid opinions must be classified into one of the topics. Include in the closest topic even if relevance is weak
11. **★Flexible relevance judgment**: Consider conceptual relevance and context, not just direct word matching
12. **★Rich keywords**: Include abundant related expressions, synonyms, and similar concepts in each topic's keywords
13. **★JSON format compliance**: Always return in the exact JSON format above. Do not include explanatory text or additional text
14. **★Mandatory insights generation**: Always generate 3 or more insights. Include high, medium, and low priorities
15. **★Insights quality**: Each insight should provide analytical perspective across topics and include specific improvement proposals

## ⚠️ Important: Response Format Notes
- When using o3/o4 models, do not include reasoning process, output only the final JSON
- Ensure valid JSON enclosed in { } is included at the beginning and end of response
- Do not use markdown code blocks, output JSON directly

**🌍 CRITICAL LANGUAGE REQUIREMENT: Please respond entirely in English. ALL topic names, categories, summaries, insights titles, descriptions, keywords, and overall summary MUST be written in English only, regardless of the input language.**

## Output Example
{
  "topics": [...],
  "insights": [...],
  "summary": "..."
}
`;
    }

    /**
     * 多言語メッセージ管理システム
     */
    private getMultiLanguageMessage(language: string, messageKey: string, params?: Record<string, any>): string {
        const messages = language === 'en' ? this.getEnglishMessages() : this.getJapaneseMessages();
        const template = messages[messageKey] || messages['defaultError'] || 'An error occurred';
        
        if (!params) return template;
        
        // パラメータ置換
        return template.replace(/\{(\w+)\}/g, (match, key) => {
            return params[key]?.toString() || match;
        });
    }

    /**
     * 日本語メッセージ定義
     */
    private getJapaneseMessages(): Record<string, string> {
        return {
            fallbackTitle: '{category}における重要課題',
            defaultSummary: '市民の皆様から貴重なご意見をいただきました。',
            connectionError: 'AI分析サービスに接続できません。しばらく時間をおいて再試行してください。',
            summaryTemplate: '{opinionCount}件の意見から{topicCount}のトピックが生成されました。主要な関心事と改善提案が整理されています。',
            analysisResultSummary: '分析結果の要約です',
            incrementalComplete: 'インクリメンタル分析完了: {newTopics}個の新トピック、{assignedOpinions}件の意見を分類',
            newTopicName: '【新トピック】{preview}に関する意見',
            newTopicReason: '既存トピックがないため新規作成',
            defaultError: 'エラーが発生しました'
        };
    }

    /**
     * 英語メッセージ定義
     */
    private getEnglishMessages(): Record<string, string> {
        return {
            fallbackTitle: 'Important Issues in {category}',
            defaultSummary: 'We have received valuable opinions from citizens.',
            connectionError: 'Unable to connect to AI analysis service. Please wait a moment and try again.',
            summaryTemplate: '{topicCount} topics have been generated from {opinionCount} opinions. Key concerns and improvement proposals have been organized.',
            analysisResultSummary: 'Summary of analysis results',
            incrementalComplete: 'Incremental analysis complete: {newTopics} new topics, {assignedOpinions} opinions classified',
            newTopicName: '[New Topic] Opinions about {preview}',
            newTopicReason: 'Created new topic as no existing topic matched',
            defaultError: 'An error occurred'
        };
    }

    // Firebase分析セッション更新機能（BackgroundAnalysisServiceと同等）
    private async updateFirebaseProgress(projectId: string, sessionData: {
        status: 'pending' | 'processing' | 'completed' | 'failed';
        progress?: {
            percentage: number;
            currentPhase: string;
            processedBatches?: number;
            totalBatches?: number;
            estimatedTimeRemaining?: number;
        };
        startedAt?: number;
        completedAt?: number;
        error?: string;
        jobId?: string;
    }): Promise<void> {
        try {
            if (!database) {
                console.log('[TopicAnalysis] 🔍 Firebase未初期化 - 分析セッション更新スキップ');
                return;
            }

            const sessionRef = database.ref(`analysis-sessions/${projectId}`);
            const updateData: any = {
                status: sessionData.status,
                updatedAt: Date.now()
            };

            // undefinedを除外してFirebaseエラーを防ぐ
            if (sessionData.progress !== undefined) {
                updateData.progress = sessionData.progress;
            }
            if (sessionData.startedAt !== undefined) {
                updateData.startedAt = sessionData.startedAt;
            }
            if (sessionData.completedAt !== undefined) {
                updateData.completedAt = sessionData.completedAt;
            }
            if (sessionData.error !== undefined) {
                updateData.error = sessionData.error;
            }
            if (sessionData.jobId !== undefined) {
                updateData.jobId = sessionData.jobId;
            }

            await sessionRef.update(updateData);

            console.log('[TopicAnalysis] 🔥 Firebase分析セッション更新完了:', {
                projectId: projectId.substring(0, 8),
                status: sessionData.status,
                percentage: sessionData.progress?.percentage || 0,
                phase: sessionData.progress?.currentPhase || 'unknown'
            });
        } catch (error) {
            // Firebase更新失敗でも分析処理は継続（既存機能に影響させない）
            console.warn('[TopicAnalysis] ⚠️ Firebase分析セッション更新失敗（分析処理は継続）:', {
                projectId: projectId.substring(0, 8),
                error: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }

    async analyzeProject(projectId: string, userId: string, options?: TopicAnalysisOptions): Promise<TopicAnalysisResult> {
        // const realtimeService = getRealtimeService();
        const startTime = Date.now();
        
        
        console.log('='.repeat(80));
        console.log('[TopicAnalysis] ==> プロジェクト分析開始');
        console.log('='.repeat(80));
        console.log('[TopicAnalysis] 📊 開始情報:', {
            timestamp: new Date().toISOString(),
            projectId,
            userId,
            startTime: startTime
        });
        console.log('='.repeat(80));
        
        try {
            // リアルタイム通知：分析開始（一時的に無効化）
            // realtimeService?.notifyAnalysisProgress({
            //     projectId,
            //     stage: 'starting',
            //     progress: 0,
            //     message: '分析を開始しています...'
            // });

            // Firebase分析セッション更新：分析開始
            await this.updateFirebaseProgress(projectId, {
                status: 'processing',
                progress: {
                    percentage: 0,
                    currentPhase: '分析開始'
                },
                startedAt: startTime,
                jobId: `direct-${projectId}-${startTime}`
            });

            console.log('[TopicAnalysis] 📊 STEP 1: データ同期・取得中...');
            const step1Start = Date.now();

            // データ同期状況をチェック（古いデータの場合のみ同期実行）
            console.log('[TopicAnalysis] 🔍 同期状況チェック中...');
            const dataSyncService = await this.getDataSyncService();
            const isProjectSynced = await dataSyncService.isProjectSynced(projectId, 5);
            const areOpinionsSynced = await dataSyncService.areOpinionsSynced(projectId, 5);

            console.log('[TopicAnalysis] 📊 同期状況:', {
                projectSynced: isProjectSynced,
                opinionsSynced: areOpinionsSynced
            });

            // 必要に応じてFirebaseから同期
            if (!isProjectSynced) {
                console.log('[TopicAnalysis] 🔄 プロジェクトデータ同期実行中...');
                try {
                    await dataSyncService.syncProjectFromFirebase(projectId, userId);
                    console.log('[TopicAnalysis] ✅ プロジェクトデータ同期完了');
                } catch (syncError) {
                    console.error('[TopicAnalysis] ❌ プロジェクトデータ同期失敗:', syncError);
                    console.log('[TopicAnalysis] ⚠️ Firebase同期を無視して続行');
                }
            }

            if (!areOpinionsSynced) {
                console.log('[TopicAnalysis] 🔄 意見データ同期実行中...');
                try {
                    await dataSyncService.syncOpinionsFromFirebase(projectId, userId);
                    console.log('[TopicAnalysis] ✅ 意見データ同期完了');
                } catch (syncError) {
                    console.error('[TopicAnalysis] ❌ 意見データ同期失敗:', syncError);
                    console.log('[TopicAnalysis] ⚠️ Firebase同期を無視して続行');
                }
            }

            // 強制的に最新の意見データを同期
            console.log('[TopicAnalysis] 🔄 最新の意見データ強制同期中...');
            try {
                await dataSyncService.syncOpinionsFromFirebase(projectId, userId);
                console.log('[TopicAnalysis] ✅ 最新の意見データ同期完了');
            } catch (syncError) {
                console.error('[TopicAnalysis] ❌ 最新の意見データ同期失敗:', syncError);
            }

            // SQLiteからデータ取得
            console.log('[TopicAnalysis] ⚡ SQLiteからデータ取得中...');
            let project;
            let opinions;
            try {
                // Firebase IDでの検索を優先
                let projectData;
                if (projectId.startsWith('-')) {
                    console.log('[TopicAnalysis] 🔍 Firebase IDでプロジェクト検索:', projectId);
                    projectData = await prisma.project.findFirst({
                        where: { 
                            firebaseId: projectId,
                            userId: userId
                        },
                        include: {
                            opinions: {
                                orderBy: { submittedAt: 'desc' }
                            }
                        }
                    });
                } else {
                    console.log('[TopicAnalysis] 🔍 SQLite IDでプロジェクト検索:', projectId);
                    projectData = await prisma.project.findFirst({
                        where: { 
                            id: projectId,
                            userId: userId
                        },
                        include: {
                            opinions: {
                                orderBy: { submittedAt: 'desc' }
                            }
                        }
                    });
                }

                // 見つからない場合は両方で検索
                if (!projectData) {
                    console.log('[TopicAnalysis] 🔍 プロジェクトが見つからない、両方のIDで再検索');
                    projectData = await prisma.project.findFirst({
                        where: { 
                            OR: [
                                { id: projectId },
                                { firebaseId: projectId }
                            ],
                            userId: userId
                        },
                        include: {
                            opinions: {
                                orderBy: { submittedAt: 'desc' }
                            }
                        }
                    });
                }

                if (!projectData) {
                    console.error('[TopicAnalysis] ❌ プロジェクトが見つかりません:', projectId);
                    
                    // 最後の試行：Firebaseから直接データを取得
                    console.log('[TopicAnalysis] 🔄 Firebaseから直接データ取得を試行...');
                    try {
                        const firebaseDataService = await this.getFirebaseDataService();
                        const firebaseProject = await firebaseDataService.getProject(projectId, userId);
                        const firebaseOpinions = await firebaseDataService.getOpinions(projectId, userId);
                        
                        if (firebaseProject && firebaseOpinions.length > 0) {
                            console.log('[TopicAnalysis] ✅ Firebase直接取得成功:', {
                                name: firebaseProject.name,
                                opinionsCount: firebaseOpinions.length
                            });
                            
                            // Firebase形式のデータを分析用に変換
                            project = {
                                id: firebaseProject.id,
                                name: firebaseProject.name,
                                description: firebaseProject.description || '',
                                status: firebaseProject.status,
                                collectionMethod: firebaseProject.collectionMethod,
                                createdAt: firebaseProject.createdAt,
                                updatedAt: firebaseProject.updatedAt || firebaseProject.createdAt,
                                opinionsCount: firebaseProject.opinionsCount,
                                isCompleted: firebaseProject.isCompleted,
                                userId: userId
                            };
                            
                            opinions = firebaseOpinions.map((op: any) => ({
                                id: op.id,
                                content: op.content,
                                submittedAt: op.submittedAt,
                                isBookmarked: op.isBookmarked || false,
                                sentiment: op.sentiment || 'neutral',
                                characterCount: op.content.length,
                                projectId: projectId
                            }));
                        } else {
                            throw new AppError(404, 'PROJECT_NOT_FOUND', 'Project not found in Firebase either');
                        }
                    } catch (firebaseError) {
                        console.error('[TopicAnalysis] ❌ Firebase直接取得も失敗:', firebaseError);
                        
                        // Firebase認証エラーの場合でも、実データが存在しないため適切にエラーを返す
                        console.error('[TopicAnalysis] ❌ プロジェクトデータが見つかりません');
                        throw new AppError(404, 'PROJECT_NOT_FOUND', 'Project not found in database');
                    }
                } else {
                    // SQLiteからデータを正常に取得した場合
                    project = {
                        id: projectData.id,
                        name: projectData.name,
                        description: projectData.description || '',
                        status: projectData.status,
                        collectionMethod: projectData.collectionMethod,
                        createdAt: projectData.createdAt.toISOString(),
                        updatedAt: projectData.updatedAt.toISOString(),
                        // 動的カウント: opinionsCountフィールドは削除済み
                        isCompleted: projectData.isCompleted,
                        userId: projectData.userId
                    };

                    console.log('[TopicAnalysis] ✅ SQLiteプロジェクト取得成功:', project.name);
                    console.log('[TopicAnalysis] ✅ ユーザーアクセス権限確認済み（プロジェクト所有者）');
                    
                    // 意見データも同時に取得済み
                    opinions = projectData.opinions.map((op: any) => ({
                        id: op.id,
                        content: op.content,
                        submittedAt: op.submittedAt.toISOString(),
                        isBookmarked: op.isBookmarked,
                        sentiment: op.sentiment,
                        characterCount: op.characterCount,
                        projectId: op.projectId
                    }));

                    console.log('[TopicAnalysis] ✅ SQLite意見データ取得成功:', opinions.length, '件');
                    
                    // 動的カウント: SQLiteに意見がないが実際に意見が存在する場合、Firebaseから取得を試行
                    const actualOpinionsCount = await prisma.opinion.count({ where: { projectId } });
                    if (opinions.length === 0 && actualOpinionsCount > 0) {
                        console.log('[TopicAnalysis] ⚠️ SQLiteに意見なし、Firebaseから取得を試行...');
                        try {
                            const firebaseOpinions = await this.firebaseDataService.getOpinions(projectId, userId);
                            
                            if (firebaseOpinions && firebaseOpinions.length > 0) {
                                console.log('[TopicAnalysis] ✅ Firebase意見データ取得成功:', firebaseOpinions.length, '件');
                                
                                opinions = firebaseOpinions.map((op: any) => ({
                                    id: op.id,
                                    content: op.content,
                                    submittedAt: op.submittedAt,
                                    isBookmarked: op.isBookmarked || false,
                                    sentiment: op.sentiment || 'neutral',
                                    characterCount: op.content.length,
                                    projectId: projectId
                                }));
                            }
                        } catch (firebaseError) {
                            console.warn('[TopicAnalysis] ⚠️ Firebase意見取得失敗:', firebaseError);
                        }
                    }
                }
                
                console.log('[TopicAnalysis] ⏱️ STEP 1完了:', `${Date.now() - step1Start}ms`);
                
                // プログレスバー更新: STEP 1完了
                await this.updateFirebaseProgress(projectId, {
                    status: 'processing',
                    progress: {
                        percentage: 30,
                        currentPhase: 'データ取得完了'
                    }
                });
                
            } catch (dbError) {
                console.error('[TopicAnalysis] ❌ データ取得エラー:', dbError instanceof Error ? dbError.message : 'Unknown error');
                throw new AppError(500, 'PROJECT_NOT_FOUND', 'Failed to get project data', dbError);
            }
            
            console.log('[TopicAnalysis] ✅ 実際のプロジェクトデータ取得成功', {
                projectName: project.name,
                opinionsCount: opinions.length,
                currentStatus: project.status
            });

            if (!opinions || opinions.length === 0) {
                console.warn('[TopicAnalysis] ⚠️ 分析対象の意見がありません');
                throw new AppError(400, 'NO_OPINIONS', 'No opinions available for analysis');
            }

            // プロジェクトステータスを処理中に更新（Firebase版では一時的にスキップ）
            console.log('[TopicAnalysis] 🔄 プロジェクトステータス管理（Firebase版では省略）');
            
            // realtimeService?.notifyProjectStatusChange(projectId, 'processing', userId);

            // リアルタイム通知：分析中（一時的に無効化）
            // realtimeService?.notifyAnalysisProgress({
            //     projectId,
            //     stage: 'analyzing',
            //     progress: 20,
            //     message: `${opinions.length}件の意見を分析中...`
            // });

            // Phase 2: AI Sentiment分析をオプション機能として追加
            let aiSentimentResults: any = null;
            if (options?.enableAISentiment && process.env.ENABLE_AI_SENTIMENT === 'true') {
                console.log('[TopicAnalysis] 🧠 STEP 2.5: AI Sentiment分析開始...');
                const sentimentStart = Date.now();
                
                try {
                    // Opinion型の適切な変換（submittedAtをDate型、sentimentを適切な型に変換）
                    const typedOpinions: Opinion[] = opinions.map((op: any) => ({
                        ...op,
                        submittedAt: typeof op.submittedAt === 'string' ? new Date(op.submittedAt) : op.submittedAt,
                        sentiment: (op.sentiment?.toLowerCase() || 'neutral') as 'positive' | 'negative' | 'neutral'
                    }));
                    
                    aiSentimentResults = await this.performAISentimentAnalysis(typedOpinions, options);
                    console.log('[TopicAnalysis] ✅ AI Sentiment分析完了:', {
                        analyzedOpinions: aiSentimentResults.analysisResults.length,
                        processingTime: Date.now() - sentimentStart,
                        summary: aiSentimentResults.summary
                    });
                } catch (error) {
                    console.error('[TopicAnalysis] ❌ AI Sentiment分析エラー:', error);
                    console.log('[TopicAnalysis] ⚠️ Sentiment分析をスキップして続行');
                }
            }

            console.log('[TopicAnalysis] 🤖 STEP 3: AI分析実行開始...');
            
            // プログレスバー更新: STEP 3開始
            await this.updateFirebaseProgress(projectId, {
                status: 'processing',
                progress: {
                    percentage: 60,
                    currentPhase: 'AI分析実行中'
                }
            });
            
            const step3Start = Date.now();
            console.log('[TopicAnalysis] 📊 AI分析パラメータ:', {
                opinionsCount: opinions.length,
                totalCharacters: opinions.reduce((sum: number, op: any) => sum + op.content.length, 0),
                projectId: projectId,
                sentimentAnalysisEnabled: !!aiSentimentResults
            });

            // 🔍 分析方式の判定: 初回分析 vs インクリメンタル分析
            console.log('[TopicAnalysis] 🔍 分析方式を判定中...');
            console.log('[TopicAnalysis] 🔍 検索条件:', { 
                projectId: project.id, 
                projectType: typeof project.id,
                projectDbId: project.id,
                projectFirebaseId: (project as any).firebaseId || 'N/A' 
            });
            
            const existingTopics = await prisma.topic.findMany({
                where: { projectId: project.id },
                include: { opinions: true }
            });

            console.log('[TopicAnalysis] 🔍 既存トピック検索結果:', {
                existingTopicsLength: existingTopics.length,
                topicIds: existingTopics.map(t => t.id),
                topicNames: existingTopics.map(t => t.name)
            });

            const isFirstAnalysis = existingTopics.length === 0;
            const lastAnalysisAt = (project as any).lastAnalysisAt || null;
            const isAnalyzed = (project as any).isAnalyzed || false;

            console.log('='.repeat(50));
            console.log('[TopicAnalysis] 📊 分析状況詳細:', {
                isFirstAnalysis,
                existingTopicsCount: existingTopics.length,
                lastAnalysisAt,
                isAnalyzed,
                totalOpinions: opinions.length,
                projectId: project.id,
                projectFirebaseId: (project as any).firebaseId || 'N/A'
            });
            console.log('='.repeat(50));

            let topicAnalysis: any;

            // 強制的にログ出力してデバッグ
            console.error('🚨🚨🚨 FORCE LOG - ANALYZING DECISION 🚨🚨🚨');
            console.error('existingTopics:', existingTopics.length);
            console.error('isFirstAnalysis:', isFirstAnalysis);
            console.error('project.id:', project.id);
            console.error('opinions.length:', opinions.length);

            if (isFirstAnalysis) {
                console.log('🆕🆕🆕 [TopicAnalysis] 初回分析モードで実行 🆕🆕🆕');
                console.error('🆕 FORCE LOG - FIRST ANALYSIS PATH TAKEN');
                // 意見をAIでトピック分析（全体分析）
                console.log('[TopicAnalysis] 🔄 performTopicAnalysis 呼び出し中...');
                topicAnalysis = await this.performTopicAnalysis(opinions, projectId, userId);
            } else {
                console.log('🔄🔄🔄 [TopicAnalysis] インクリメンタル分析モードで実行 🔄🔄🔄');
                console.error('🔄 FORCE LOG - INCREMENTAL ANALYSIS PATH TAKEN');
                // 新しい意見のみを既存トピックに振り分けまたは新トピック作成
                topicAnalysis = await this.performIncrementalAnalysis(existingTopics, opinions, project.id);
            }
            console.log('[TopicAnalysis] ⏱️ STEP 3完了:', `${Date.now() - step3Start}ms`);

            console.log('[TopicAnalysis] ✅ AI分析完了', {
                topicsGenerated: topicAnalysis.topics.length,
                insightsGenerated: topicAnalysis.insights.length,
                processingTime: `${Date.now() - startTime}ms`
            });

            // リアルタイム通知：トピック生成中（一時的に無効化）
            // realtimeService?.notifyAnalysisProgress({
            //     projectId,
            //     stage: 'generating_topics',
            //     progress: 70,
            //     message: 'トピックを生成中...'
            // });

            console.log('[TopicAnalysis] 💾 分析結果をSQLiteに保存中...');

            // 分析結果をSQLiteに保存（データベース同期）
            try {
                await this.saveAnalysisToSQLite(project.id, topicAnalysis); // 実際のプロジェクトIDを使用
                console.log('[TopicAnalysis] ✅ SQLite保存完了');

                // Firebase同期実行
                try {
                    await this.analysisSyncService.updateSyncStatus(project.id, 'pending');
                    console.log('[TopicAnalysis] 📤 Firebase同期準備完了');
                    
                    // 実際にFirebaseに同期
                    const syncSuccess = await this.analysisSyncService.syncAnalysisResultsToFirebase(project.id);
                    if (syncSuccess) {
                        await this.analysisSyncService.updateSyncStatus(project.id, 'synced');
                        console.log('[TopicAnalysis] ✅ Firebase同期実行完了');
                    } else {
                        await this.analysisSyncService.updateSyncStatus(project.id, 'error');
                        console.warn('[TopicAnalysis] ⚠️ Firebase同期実行失敗');
                    }
                } catch (syncError) {
                    console.error('[TopicAnalysis] ❌ Firebase同期エラー:', syncError);
                    await this.analysisSyncService.updateSyncStatus(project.id, 'error');
                }
            } catch (saveError) {
                console.error('[TopicAnalysis] ❌ SQLite保存エラー:', saveError);
                // 保存エラーがあっても分析結果は返す
            }
            
            console.log('[TopicAnalysis] 🔄 プロジェクトステータス更新中...');
            
            // SQLiteのプロジェクト情報を更新（ステータスは元のまま維持）
            try {
                await prisma.project.update({
                    where: { id: project.id }, // 実際のプロジェクトIDを使用
                    data: { 
                        // status: 元のプロジェクトステータスを維持（意見収集状態を変更しない）
                        lastAnalysisAt: new Date(),
                        isAnalyzed: true,
                        updatedAt: new Date(),
                        syncStatus: 'pending' // Firebase同期が必要
                    }
                });
                console.log('[TopicAnalysis] ✅ プロジェクト情報更新完了（ステータス維持）');

            } catch (statusError) {
                console.error('[TopicAnalysis] ❌ ステータス更新エラー:', statusError);
            }

            // 分析履歴を保存（SQL→Firebase原子性保証）
            let analysisHistoryId: string | null = null;
            try {
                console.log('[TopicAnalysis] 🔄 分析履歴保存開始（原子性保証）');
                
                // Step 1: SQLite保存
                const analysisHistory = await prisma.analysisHistory.create({
                    data: {
                        projectId: project.id,
                        analysisType: 'full',
                        opinionsProcessed: opinions.length,
                        newTopicsCreated: topicAnalysis.topics.length,
                        updatedTopics: 0,
                        executionTimeSeconds: Math.round((Date.now() - startTime) / 1000),
                        executionReason: 'manual',
                        executedBy: userId,
                        syncStatus: 'pending' // Firebase同期待ち
                    }
                });
                analysisHistoryId = analysisHistory.id;
                console.log('[TopicAnalysis] ✅ 分析履歴SQLite保存完了:', analysisHistoryId);
                
                // Step 2: Firebase同期
                try {
                    console.log('[TopicAnalysis] 🔄 分析履歴Firebase同期開始...');
                    const syncSuccess = await this.analysisSyncService.syncAnalysisResultsToFirebase(project.id);
                    if (syncSuccess) {
                        console.log('[TopicAnalysis] ✅ 分析履歴Firebase同期成功');
                        console.log('[TopicAnalysis] 🎉 分析履歴保存完了（両方成功）');
                    } else {
                        console.warn('[TopicAnalysis] ⚠️ 分析履歴Firebase同期スキップ - SQLiteロールバック実行');
                        // Firebase同期失敗時はSQLiteロールバック
                        if (analysisHistoryId) {
                            await prisma.analysisHistory.delete({
                                where: { id: analysisHistoryId }
                            });
                        }
                        analysisHistoryId = null;
                        console.log('[TopicAnalysis] ✅ 分析履歴SQLiteロールバック完了');
                        console.error('[TopicAnalysis] ❌ 分析履歴保存失敗（両方失敗）: Firebase同期スキップ');
                    }
                } catch (syncError) {
                    console.error('[TopicAnalysis] ❌ 分析履歴Firebase同期エラー - SQLiteロールバック実行:', syncError);
                    // Firebase同期失敗時はSQLiteロールバック
                    try {
                        if (analysisHistoryId) {
                            await prisma.analysisHistory.delete({
                                where: { id: analysisHistoryId }
                            });
                        }
                        analysisHistoryId = null;
                        console.log('[TopicAnalysis] ✅ 分析履歴SQLiteロールバック完了');
                        console.error('[TopicAnalysis] ❌ 分析履歴保存失敗（両方失敗）: Firebase同期エラー');
                    } catch (rollbackError) {
                        console.error('[TopicAnalysis] ❌ 分析履歴SQLiteロールバック失敗:', rollbackError);
                        console.error('[TopicAnalysis] ❌ 分析履歴保存失敗（データ不整合の可能性）');
                    }
                }
                
            } catch (historyError) {
                console.error('[TopicAnalysis] ❌ 分析履歴SQLite保存エラー:', historyError);
                console.error('[TopicAnalysis] ❌ 分析履歴保存失敗（SQLite保存失敗）');
            }

            // リアルタイム通知：完了（一時的に無効化）
            // realtimeService?.notifyAnalysisProgress({
            //     projectId,
            //     stage: 'completed',
            //     progress: 100,
            //     message: '分析が完了しました！'
            // });

            // realtimeService?.notifyAnalysisCompleted(projectId, topicAnalysis, userId);
            // realtimeService?.notifyProjectStatusChange(projectId, 'completed', userId);

            const totalTime = Date.now() - startTime;
            console.log('[TopicAnalysis] 🎉 プロジェクト分析完了', {
                projectId,
                totalTopics: topicAnalysis.topics.length,
                totalInsights: topicAnalysis.insights.length,
                totalTime: `${totalTime}ms`
            });

            // 分析完了時に現在の回答数を保存
            try {
                const currentOpinionsCount = opinions.length;
                console.log('[TopicAnalysis] 💾 分析完了時の回答数を保存:', { 
                    projectId: project.id, 
                    opinionsCount: currentOpinionsCount 
                });

                // SQLiteを先に更新
                await prisma.project.update({
                    where: { id: project.id },
                    data: {
                        lastAnalyzedOpinionsCount: currentOpinionsCount,
                        lastAnalysisAt: new Date(),
                        isAnalyzed: true
                    }
                });
                console.log('[TopicAnalysis] ✅ SQLite更新完了 - 分析回答数保存');

                // Firebaseにも同期（エラー時はSQLiteをロールバック）
                try {
                    const firebaseDataService = await this.getFirebaseDataService();
                    const firebaseProjectId = (project as any).firebaseId || projectId;
                    await firebaseDataService.updateProject(userId, firebaseProjectId, {
                        lastAnalyzedOpinionsCount: currentOpinionsCount,
                        lastAnalysisAt: new Date().toISOString(),
                        isAnalyzed: true
                    });
                    console.log('[TopicAnalysis] ✅ Firebase同期完了 - 分析回答数保存');
                } catch (firebaseError) {
                    console.error('[TopicAnalysis] ❌ Firebase同期エラー (分析回答数):', firebaseError);
                    // Firebase同期失敗時はSQLiteをロールバック
                    try {
                        await prisma.project.update({
                            where: { id: project.id },
                            data: {
                                lastAnalyzedOpinionsCount: null,
                                isAnalyzed: false
                            }
                        });
                        console.log('[TopicAnalysis] ✅ SQLiteロールバック完了');
                    } catch (rollbackError) {
                        console.error('[TopicAnalysis] ❌ SQLiteロールバック失敗:', rollbackError);
                    }
                    // Firebase同期エラーは分析完了を阻害しない（ログのみ）
                    console.warn('[TopicAnalysis] ⚠️ Firebase同期失敗、分析は完了したが再分析可能な状態を維持');
                }

                console.log('[TopicAnalysis] ✅ 分析完了時の回答数保存完了');
            } catch (saveError) {
                console.error('[TopicAnalysis] ❌ 分析回答数保存エラー:', saveError);
                // 保存エラーがあっても分析結果は返す
            }

            // Phase 2: AI Sentiment分析結果を最終結果に追加
            if (aiSentimentResults) {
                console.log('[TopicAnalysis] 📊 AI Sentiment分析結果を最終結果に統合');
                topicAnalysis.aiSentimentAnalysis = aiSentimentResults;
            }

            // Firebase分析セッション更新：分析完了
            await this.updateFirebaseProgress(projectId, {
                status: 'completed',
                progress: {
                    percentage: 100,
                    currentPhase: '分析完了'
                },
                completedAt: Date.now(),
                jobId: `direct-${projectId}-${startTime}`
            });

            // プロジェクトステータスを「完了」に更新（SQLite + Firebase同期）
            try {
                console.log('[TopicAnalysis] 📊 プロジェクトステータスを「completed」に更新:', projectId);
                
                // SQLiteを先に更新
                await prisma.project.update({
                    where: { id: project.id },
                    data: {
                        status: 'completed'
                    }
                });
                console.log('[TopicAnalysis] ✅ SQLiteプロジェクトステータス更新完了');

                // Firebaseにも同期（エラー時はSQLiteをロールバック）
                try {
                    const firebaseDataService = await this.getFirebaseDataService();
                    const firebaseProjectId = (project as any).firebaseId || projectId;
                    await firebaseDataService.updateProject(userId, firebaseProjectId, {
                        status: 'completed'
                    });
                    console.log('[TopicAnalysis] ✅ Firebaseプロジェクトステータス同期完了');
                } catch (firebaseError) {
                    console.error('[TopicAnalysis] ❌ Firebaseステータス同期エラー:', firebaseError);
                    // CLAUDE.md要件: Firebase同期失敗でもSQLite（メイン機能）は成功として継続
                    // 分析が完了している場合はステータスを'completed'のまま維持
                    console.warn('[TopicAnalysis] ⚠️ Firebaseステータス同期失敗、但し分析は完了済みのためステータスはcompletedのまま維持');
                }

                console.log('[TopicAnalysis] ✅ プロジェクトステータス更新完了');
            } catch (statusError) {
                console.error('[TopicAnalysis] ❌ プロジェクトステータス更新エラー:', statusError);
                // ステータス更新エラーがあっても分析結果は返す
            }

            return topicAnalysis;
        } catch (error) {
            const totalTime = Date.now() - startTime;
            console.error('[TopicAnalysis] ❌ プロジェクト分析エラー', {
                projectId,
                userId,
                error: error instanceof Error ? error.message : 'Unknown error',
                totalTime: `${totalTime}ms`,
                stack: error instanceof Error ? error.stack : undefined
            });

            // エラーログのみ記録（コメントアウトされた通知処理）

            // realtimeService?.notifyAnalysisProgress({
            //     projectId,
            //     stage: 'error',
            //     progress: 0,
            //     message: errorMessage,
            //     userAction: userActionMessage
            // });

            // Firebase分析セッション更新：分析失敗
            await this.updateFirebaseProgress(projectId, {
                status: 'failed',
                progress: {
                    percentage: 0,
                    currentPhase: '分析失敗'
                },
                completedAt: Date.now(),
                error: error instanceof Error ? error.message : 'Unknown error',
                jobId: `direct-${projectId}-${startTime}`
            });

            console.log('[TopicAnalysis] 🔄 エラー時のステータス更新もスキップ（Firebase版では不要）');

            // Firebase版では、Prismaエラーステータス更新をスキップ
            // await prisma.project.update({
            //     where: { id: projectId },
            //     data: { status: 'ERROR' }
            // }).catch((updateError) => {
            //     console.error('[TopicAnalysis] ❌ ステータス更新エラー:', updateError);
            // });

            if (error instanceof AppError) {
                // 具体的なエラー情報を保持
                console.error('[TopicAnalysis] ❌ AppError詳細:', {
                    code: error.code,
                    message: error.message,
                    statusCode: error.statusCode
                });
                throw error;
            }
            
            // 一般的なエラーの場合は詳細情報を含める
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            console.error('[TopicAnalysis] ❌ 一般エラー詳細:', {
                message: errorMessage,
                stack: error instanceof Error ? error.stack : undefined,
                type: typeof error,
                errorObject: error
            });
            
            throw new AppError(
                500,
                'ANALYSIS_ERROR',
                `プロジェクト分析に失敗しました: ${errorMessage}`,
                error
            );
        }
    }

    /**
     * analyzeTopicsメソッド（analyzeProjectのラッパー - API互換性のため）
     * @param projectId プロジェクトID
     * @param userId ユーザーID
     * @param options 分析オプション
     * @returns 分析結果
     */
    async analyzeTopics(projectId: string, userId: string, options?: TopicAnalysisOptions): Promise<TopicAnalysisResult> {
        console.log('[TopicAnalysis] 📋 analyzeTopics呼び出し - analyzeProjectにリダイレクト');
        return this.analyzeProject(projectId, userId, options);
    }

    /**
     * 最適バッチサイズ計算（Phase A: 単一API呼び出し完全化）
     * @param opinions 分析対象の意見配列
     * @returns 安全に処理可能な意見数
     */

    private async performTopicAnalysis(opinions: any[], projectId?: string, userId?: string, options?: TopicAnalysisOptions): Promise<TopicAnalysisResult> {
        console.log('🔍 performTopicAnalysis メソッド開始 - Phase A: 単一API呼び出し完全化');
        console.log('[performTopicAnalysis] 📊 分析開始パラメータ:', {
            opinionsCount: opinions.length,
            projectId,
            timestamp: new Date().toISOString()
        });

        // Phase A: チャンク分析を完全廃止、常に単一API呼び出しで実行
        console.log('[TopicAnalysis] ⚡ 単一API呼び出しモードで実行（Phase A実装）');
        return await this.performSingleTopicAnalysis(opinions, projectId, userId, options);
    }

    /**
     * 単一分析モード（既存の分析ロジック）
     * 小規模データまたは制限内に収まるデータの分析
     */
    private async performSingleTopicAnalysis(opinions: any[], projectId?: string, userId?: string, options?: TopicAnalysisOptions): Promise<TopicAnalysisResult> {
        console.log('🔍 performSingleTopicAnalysis メソッド開始');
        
        // Simplified: Process all opinions with single API call (Claude Code SDK logic)
        const totalOpinions = opinions.length;
        const opinionsToAnalyze = opinions; // Process all opinions

        console.log('[TopicAnalysis] 📊 単一API呼び出し分析:', {
            totalOpinions,
            processingAll: true
        });
        
        // 意見テキストを結合してAI分析用に準備
        const opinionsText = opinionsToAnalyze.map((op, index) => `${index + 1}. ${op.content}`).join('\n\n');
        console.log('[TopicAnalysis] 📝 意見テキスト準備完了:', {
            originalOpinionsCount: totalOpinions,
            analyzingOpinionsCount: opinionsToAnalyze.length,
            totalCharacters: opinionsText.length,
            isLimited: opinionsToAnalyze.length < totalOpinions
        });

        // 最終的なプロンプト用テキスト
        let finalOpinionsText = opinionsText;
        
        // Phase A: 未分析回答の透明性向上
        if (opinionsToAnalyze.length < totalOpinions) {
            const remainingCount = totalOpinions - opinionsToAnalyze.length;
            finalOpinionsText += `\n\n[分析情報: 今回分析対象${opinionsToAnalyze.length}件、未分析回答${remainingCount}件（次回分析で処理予定）]`;
            console.log('[TopicAnalysis] 🎯 Phase A - 分析対象制御:', {
                thisAnalysis: opinionsToAnalyze.length,
                remaining: remainingCount,
                nextAnalysisRecommended: remainingCount > 0,
                singleApiCall: true,
                finalLength: finalOpinionsText.length
            });
        }

        // 実際のトピック分析プロンプト（多言語対応）
        const userLanguage = options?.analysisLanguage || (userId ? await this.getUserAnalysisLanguage(userId) : 'ja');
        console.log('[TopicAnalysis] 🌐 分析言語設定確認:', {
            userId: userId?.substring(0, 8),
            optionsAnalysisLanguage: options?.analysisLanguage,
            finalUserLanguage: userLanguage,
            fallbackUsed: !options?.analysisLanguage
        });
        const analysisPrompt = this.getMultiLanguagePrompt(userLanguage, finalOpinionsText);

        try {
            console.log('='.repeat(80));
            console.log('[TopicAnalysis] 🤖 AI API呼び出し開始');
            
            // プログレスバー更新: AI API呼び出し開始
            if (projectId) {
                await this.updateFirebaseProgress(projectId, {
                    status: 'processing',
                    progress: {
                        percentage: 80,
                        currentPhase: 'AI処理中'
                    }
                });
            }
            
            console.log('='.repeat(80));
            console.log('[TopicAnalysis] 📝 送信プロンプト長:', analysisPrompt.length, '文字');
            console.log('[TopicAnalysis] 🌐 送信プロンプト言語確認:', {
                startsWithJapanese: analysisPrompt.startsWith('以下の意見・回答を分析し'),
                startsWithEnglish: analysisPrompt.startsWith('Please analyze the following opinions'),
                promptPrefix: analysisPrompt.substring(0, 100) + '...'
            });
            console.log('[TopicAnalysis] 🕐 AI API呼び出し時刻:', new Date().toISOString());
            console.log('[TopicAnalysis] 🔍 AI API接続状況確認中...');
            
            const aiStartTime = Date.now();
            // AIServiceManager経由でAPI呼び出し統合管理（Lazy Loading）
            const aiServiceManager = await this.getAIServiceManager();
            const response = await aiServiceManager.generateResponse(
                analysisPrompt, 
                undefined, // Use default model selection (unified for both Claude SDK and OpenAI)
                {
                    purpose: 'main_analysis',
                    projectId: projectId || 'unknown',
                    userId: userId || 'unknown'
                }
            );
            const aiDuration = Date.now() - aiStartTime;
            
            console.log('='.repeat(80));
            console.log('[TopicAnalysis] ✅ AI API通信成功！');
            console.log('='.repeat(80));
            console.log('[TopicAnalysis] ⏱️ AI処理時間:', aiDuration, 'ms');
            console.log('[TopicAnalysis] 📄 AIレスポンス長:', response.content.length, '文字');
            console.log('[TopicAnalysis] 🔧 API接続確認: AI APIとの通信が正常に完了しました');
            console.log('[TopicAnalysis] 📄 AIレスポンス内容プレビュー:', response.content.substring(0, 200), '...');
            console.log('[TopicAnalysis] 🔍 AIレスポンス全体内容（デバッグ用）:');
            console.log('---START_OF_AI_RESPONSE---');
            console.log(response.content);
            console.log('---END_OF_AI_RESPONSE---');
            console.log('='.repeat(80));

            let analysisData;
            let cleanContent; // tryブロック外で宣言してcatchブロックからもアクセス可能にする
            try {
                // AIレスポンスからJSONを抽出（マークダウンコードブロックなどを除去）
                cleanContent = response.content.trim();
                
                // マークダウンコードブロックを除去
                if (cleanContent.startsWith('```json')) {
                    cleanContent = cleanContent.replace(/^```json\s*/, '').replace(/\s*```$/, '');
                } else if (cleanContent.startsWith('```')) {
                    cleanContent = cleanContent.replace(/^```\s*/, '').replace(/\s*```$/, '');
                }
                
                // バッククォートを除去
                cleanContent = cleanContent.replace(/^`+|`+$/g, '');
                
                // 不要な前後の文字を除去
                cleanContent = cleanContent.replace(/^[^{]*/, '').replace(/[^}]*$/, '');
                
                console.log('[performTopicAnalysis] 🧹 クリーンアップ後のコンテンツ長:', cleanContent.length);
                console.log('[performTopicAnalysis] 📄 クリーンアップ後のコンテンツ先頭:', cleanContent.substring(0, 200));

                analysisData = JSON.parse(cleanContent);
                console.log('[performTopicAnalysis] ✅ JSON解析成功');
                
                // AI分析結果の詳細ログ（トピック名の言語確認用）
                if (analysisData.topics && Array.isArray(analysisData.topics)) {
                    console.log('[TopicAnalysis] 📊 AI生成トピック詳細:', {
                        topicsCount: analysisData.topics.length,
                        topicNames: analysisData.topics.map((topic: any, index: number) => ({
                            index: index + 1,
                            name: topic.name,
                            category: topic.category,
                            nameLanguage: /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/.test(topic.name || '') ? 'Japanese' : 'English'
                        }))
                    });
                }
            } catch (parseError) {
                console.error('[TopicAnalysis] ❌ JSON解析エラー:', parseError);
                console.error('[TopicAnalysis] 📄 解析に失敗したオリジナルコンテンツ:', response.content.substring(0, 500));
                
                // cleanContentが未定義の場合の安全な処理
                const safeCleanContent = cleanContent || response.content || '';
                console.error('[TopicAnalysis] 🔍 クリーンアップ後コンテンツ:', safeCleanContent.substring(0, 300));
                console.error('[TopicAnalysis] 📊 コンテンツ統計:', {
                    originalLength: response.content.length,
                    cleanedLength: safeCleanContent.length,
                    startsWithBrace: safeCleanContent.startsWith('{'),
                    endsWithBrace: safeCleanContent.endsWith('}'),
                    braceCount: (safeCleanContent.match(/[{}]/g) || []).length
                });
                
                // 再試行: より柔軟なJSON抽出を試みる
                try {
                    console.log('[TopicAnalysis] 🔄 柔軟なJSON抽出を試行中...');
                    let flexibleContent = response.content.trim();
                    
                    // JSON部分を抽出するための正規表現パターン
                    const jsonPatterns = [
                        /{[\s\S]*}/,                    // 全体から{ }を抽出
                        /({[\s\S]*?})(?:\s*$|\s*[^}])/,  // 最初の完全なJSONオブジェクト
                        /```json([\s\S]*?)```/,         // jsonコードブロック
                        /```([\s\S]*?)```/,             // 一般的なコードブロック
                    ];
                    
                    for (const pattern of jsonPatterns) {
                        const match = flexibleContent.match(pattern);
                        if (match) {
                            const extracted = match[1] || match[0];
                            console.log('[TopicAnalysis] 🎯 パターンマッチ成功:', pattern.toString());
                            console.log('[TopicAnalysis] 📄 抽出内容:', extracted.substring(0, 200));
                            
                            try {
                                analysisData = JSON.parse(extracted.trim());
                                console.log('[TopicAnalysis] ✅ 柔軟なJSON解析成功');
                                break;
                            } catch (nestedError) {
                                console.log('[TopicAnalysis] ⚠️ このパターンは失敗:', nestedError instanceof Error ? nestedError.message : String(nestedError));
                                continue;
                            }
                        }
                    }
                    
                    if (!analysisData) {
                        throw new Error('全てのパターンマッチが失敗');
                    }
                } catch (flexibleError) {
                    console.error('[TopicAnalysis] ❌ 柔軟なJSON抽出も失敗:', flexibleError);
                    
                    // 根本的なエラーとして処理 - フォールバック禁止
                    console.error('[TopicAnalysis] 🚨 AI応答のJSON解析が完全に失敗しました');
                    console.error('[TopicAnalysis] 📄 問題のあるAI応答の詳細分析:');
                    console.error('応答長:', response.content.length);
                    console.error('応答開始100文字:', response.content.substring(0, 100));
                    console.error('応答終了100文字:', response.content.substring(response.content.length - 100));
                    console.error('JSON形式の文字が含まれているか:', /{.*}/.test(response.content));
                    console.error('コードブロックが含まれているか:', /```/.test(response.content));
                    
                    throw new AppError(500, 'AI_RESPONSE_PARSE_ERROR', 
                        `AI分析結果のJSON解析に失敗しました。AI応答形式が予期しないものです。応答長: ${response.content.length}文字。管理者に連絡してください。`);
                }
            }

            // AIが生成したトピックに基づいて意見を分類
            const topicsWithOpinions = this.organizeTopicsWithOpinions(
                opinionsToAnalyze, // AI分析対象の意見のみを分類対象とする
                analysisData.topics || []
            );

            // 最低限の結果を保証
            if (topicsWithOpinions.length === 0) {
                console.error('[TopicAnalysis] ❌ AIで分類されたトピックがありません');
                throw new AppError(500, 'NO_TOPICS_GENERATED', 'AI分析でトピックが生成されませんでした。意見の内容を確認してください。');
            }

            // Insights の処理を強化
            let processedInsights = [];
            
            console.log('[TopicAnalysis] 📊 AI分析結果のInsights確認:', {
                hasInsights: !!analysisData.insights,
                insightsLength: analysisData.insights?.length || 0,
                insightsType: typeof analysisData.insights,
                rawInsights: analysisData.insights
            });
            
            if (analysisData.insights && Array.isArray(analysisData.insights) && analysisData.insights.length > 0) {
                // AIが生成したInsightsを使用
                processedInsights = analysisData.insights.map((insight: any) => ({
                    title: insight.title || '重要なポイント',
                    description: insight.description || 'AI分析による洞察',
                    count: insight.count || 0,
                    priority: insight.priority || 'medium'
                }));
                console.log('[TopicAnalysis] ✅ AIが生成したInsights使用:', processedInsights.length, '件');
            } else {
                // AIがInsightsを生成しなかった場合のフォールバック
                console.log('[TopicAnalysis] ⚠️ AIがInsightsを生成しませんでした。フォールバック処理を実行');
                
                // トピックから自動的にInsightsを生成
                const userLanguage = userId ? await this.getUserAnalysisLanguage(userId) : 'ja';
                const topicBasedInsights = topicsWithOpinions.slice(0, 3).map((topic, index) => ({
                    title: this.getMultiLanguageMessage(userLanguage, 'fallbackTitle', { category: topic.category || 'カテゴリ' }),
                    description: `「${topic.name}」に関して${topic.count}件の意見が集まりました。${topic.summary.substring(0, 100)}...`,
                    count: topic.count,
                    priority: index === 0 ? 'high' : index === 1 ? 'medium' : 'low'
                }));
                
                processedInsights = topicBasedInsights;
                console.log('[TopicAnalysis] 🔄 フォールバックInsights生成:', processedInsights.length, '件');
            }
            
            const result: TopicAnalysisResult = {
                topics: topicsWithOpinions,
                insights: processedInsights,
                summary: analysisData.summary || this.getMultiLanguageMessage(userLanguage, 'defaultSummary')
            };

            console.log('[TopicAnalysis] ✅ トピック分析完了:', {
                finalTopicsCount: result.topics.length,
                finalInsightsCount: result.insights.length,
                insightsDetails: result.insights.map(i => ({ title: i.title, priority: i.priority }))
            });

            return result;
        } catch (error) {
            console.error('='.repeat(80));
            console.error('[TopicAnalysis] ❌ AI API呼び出しエラー - 詳細分析');
            console.error('='.repeat(80));
            console.error('[TopicAnalysis] エラーメッセージ:', error instanceof Error ? error.message : String(error));
            console.error('[TopicAnalysis] エラー種別:', error instanceof Error ? error.constructor.name : typeof error);
            console.error('[TopicAnalysis] エラースタック:', error instanceof Error ? error.stack : 'No stack trace');
            console.error('[TopicAnalysis] 🔍 AI API接続失敗: OpenAI APIとの通信に失敗しました');
            console.error('[TopicAnalysis] 💡 原因候補: API Key、ネットワーク、レート制限、サービス停止');
            console.error('='.repeat(80));
            throw new AppError(503, 'AI_SERVICE_UNAVAILABLE', this.getMultiLanguageMessage(userLanguage, 'connectionError'), error);
        }
    }

    // Phase A: performChunkedTopicAnalysis メソッドを完全削除
    // 理由: 単一API呼び出し完全化により、チャンク分析を廃止

    // Phase A: calculateSafeChunkSize メソッドを完全削除
    // 理由: チャンク分析廃止により不要となった

    // Phase A: chunkOpinions メソッドを完全削除
    // 理由: チャンク分析廃止により不要となった

    // Phase A: mergeChunkResults メソッドを完全削除
    // 理由: チャンク分析廃止により不要となった

    /**
     * 基本的なトピックマージ（Phase 1実装）
     */
    private basicTopicMerge(allTopics: any[]): any[] {
        console.log(`[ChunkedAnalysis] 🔄 基本トピックマージ実行: ${allTopics.length}トピック`);
        
        // Phase 1では簡単な重複排除のみ
        const merged: any[] = [];
        const seenNames = new Set<string>();
        
        for (const topic of allTopics) {
            const normalizedName = topic.name.toLowerCase().trim();
            
            if (!seenNames.has(normalizedName)) {
                merged.push(topic);
                seenNames.add(normalizedName);
            } else {
                // 同じ名前のトピックがある場合は意見を統合
                const existingTopic = merged.find(t => t.name.toLowerCase().trim() === normalizedName);
                if (existingTopic && existingTopic.opinions) {
                    existingTopic.opinions.push(...(topic.opinions || []));
                    existingTopic.count = existingTopic.opinions.length;
                }
            }
        }
        
        console.log(`[ChunkedAnalysis] 📈 基本マージ結果: ${allTopics.length} → ${merged.length}トピック`);
        return merged;
    }

    /**
     * インサイトのマージ
     */
    private mergeInsights(allInsights: any[]): any[] {
        // 重複するインサイトを除去
        const uniqueInsights = [];
        const seenTitles = new Set<string>();
        
        for (const insight of allInsights) {
            const normalizedTitle = insight.title.toLowerCase().trim();
            
            if (!seenTitles.has(normalizedTitle)) {
                uniqueInsights.push(insight);
                seenTitles.add(normalizedTitle);
            }
        }
        
        return uniqueInsights;
    }

    /**
     * マージされたサマリーを生成
     */
    private generateMergedSummary(allTopics: any[], allOpinions: any[], language: string = 'ja'): string {
        const topicCount = allTopics.length;
        const opinionCount = allOpinions.length;
        
        return this.getMultiLanguageMessage(language, 'summaryTemplate', { opinionCount, topicCount });
    }

    /**
     * AIが生成したトピックに実際の意見を分類する（参考版ベース）
     */
    private organizeTopicsWithOpinions(opinions: any[], aiTopics: any[]): any[] {
        console.log(`[TopicAnalysis] 🏷️ ${aiTopics.length}個のAIトピックに${opinions.length}個の意見を分類中...`);

        const organizedTopics = [];
        const usedOpinions = new Set<number>();

        for (const aiTopic of aiTopics) {
            const topicOpinions = [];
            const sentimentCounts = { positive: 0, negative: 0, neutral: 0 };

            // 1. まずAIが指定したopinionIdsを優先的に使用
            if (aiTopic.opinionIds && Array.isArray(aiTopic.opinionIds)) {
                console.log(`[TopicAnalysis] 📌 AI指定の意見ID: ${aiTopic.opinionIds.join(', ')}`);
                
                for (const opinionId of aiTopic.opinionIds) {
                    console.log(`[TopicAnalysis] 🔍 処理中のopinionId: ${opinionId}`);
                    
                    // opinionIdの正規化: 1-based, 0-based, 実際のDBのID値の3パターンを試行
                    const candidates = [
                        opinionId - 1,  // 1-based → 0-based
                        opinionId,      // 0-based（そのまま）
                        opinions.findIndex(op => op.id === opinionId || op.id === String(opinionId)) // 実際のDBのID
                    ];
                    
                    let foundOpinion = false;
                    for (const index of candidates) {
                        if (index >= 0 && index < opinions.length && !usedOpinions.has(index)) {
                            const opinion = opinions[index];
                            topicOpinions.push(opinion);
                            const validSentiment = ['positive', 'negative', 'neutral'].includes(opinion.sentiment) 
                                ? opinion.sentiment as keyof typeof sentimentCounts 
                                : 'neutral';
                            sentimentCounts[validSentiment]++;
                            usedOpinions.add(index);
                            foundOpinion = true;
                            console.log(`[TopicAnalysis] ✅ 意見ID ${opinionId} をインデックス ${index} で発見`);
                            break;
                        }
                    }
                    
                    if (!foundOpinion) {
                        console.log(`[TopicAnalysis] ⚠️ 意見ID ${opinionId} が見つかりません`);
                    }
                }
            }

            // 2. AI指定が不十分な場合のみ、補助的にキーワードマッチングを実行
            if (topicOpinions.length === 0) {
                console.log(`[TopicAnalysis] ⚠️ AI指定の意見IDがないため、改善されたキーワードマッチングを実行`);
                
                const keywords = aiTopic.keywords || [];
                const topicName = aiTopic.name.toLowerCase();

                for (let i = 0; i < opinions.length; i++) {
                    if (usedOpinions.has(i)) continue;

                    const opinion = opinions[i];
                    const opinionText = opinion.content.toLowerCase();

                    // より柔軟な関連性判定
                    let isRelated = false;
                    let matchScore = 0;
                    let matchReasons = [];

                    // 1. トピック名での部分一致（改善版）
                    const topicWords = topicName.replace(/【.*?】/g, '').split(/[\s・]+/).filter((word: string) => word.length > 1);
                    for (const word of topicWords) {
                        if (opinionText.includes(word)) {
                            matchScore += 10;
                            matchReasons.push(`トピック語「${word}」一致`);
                        }
                    }

                    // 2. キーワードでの一致（改善版）
                    if (keywords.length > 0) {
                        for (const keyword of keywords) {
                            if (keyword.length > 1 && opinionText.includes(keyword.toLowerCase())) {
                                matchScore += 8;
                                matchReasons.push(`キーワード「${keyword}」一致`);
                            }
                        }
                    }

                    // 3. 概念的な関連性チェック（新規追加）
                    const conceptualScore = this.calculateConceptualSimilarity(opinionText, topicName, keywords);
                    matchScore += conceptualScore.score;
                    matchReasons.push(...conceptualScore.reasons);

                    // 4. 関連性判定（閾値を下げてより包括的に）
                    if (matchScore >= 5) { // 以前は直接一致のみ、今は閾値ベース
                        isRelated = true;
                        console.log(`[TopicAnalysis] 📌 意見 ${i + 1} を ${aiTopic.name} に分類 (スコア: ${matchScore}, 理由: ${matchReasons.join(', ')})`);
                    }

                    if (isRelated) {
                        topicOpinions.push(opinion);
                        const validSentiment = ['positive', 'negative', 'neutral'].includes(opinion.sentiment) 
                            ? opinion.sentiment as keyof typeof sentimentCounts 
                            : 'neutral';
                        sentimentCounts[validSentiment]++;
                        usedOpinions.add(i);
                    }
                }
            }

            if (topicOpinions.length > 0) {
                organizedTopics.push({
                    id: `topic-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
                    name: aiTopic.name,
                    category: aiTopic.category || null,
                    count: topicOpinions.length,
                    summary: aiTopic.summary || `${topicOpinions.length}件の関連する意見が含まれています。`,
                    opinions: topicOpinions.map((op: any) => ({
                        id: op.id,
                        content: op.content,
                        submittedAt: op.submittedAt,
                        isBookmarked: op.isBookmarked || false,
                        sentiment: op.sentiment || 'neutral',
                        characterCount: op.content.length,
                        topicId: null,
                        projectId: op.projectId
                    })),
                    keywords: aiTopic.keywords || [],
                    sentiment: sentimentCounts
                });
            }
        }

        // 未分類の意見があれば詳細な再分類を試行
        const unclassifiedOpinions = opinions.filter((_, index) => !usedOpinions.has(index));
        
        if (unclassifiedOpinions.length > 0) {
            console.log(`[TopicAnalysis] 🔄 ${unclassifiedOpinions.length}件の未分類意見を再分類中...`);
            
            // 第2段階：より緩い条件で再分類を試行
            for (let i = 0; i < unclassifiedOpinions.length; i++) {
                const opinion = unclassifiedOpinions[i];
                const originalIndex = opinions.indexOf(opinion);
                
                if (usedOpinions.has(originalIndex)) continue;
                
                let bestMatch = null;
                let bestScore = 0;
                
                // 既存の各トピックとの関連度を計算
                for (const topic of organizedTopics) {
                    const similarity = this.calculateConceptualSimilarity(
                        opinion.content.toLowerCase(), 
                        topic.name.toLowerCase(), 
                        topic.keywords || []
                    );
                    
                    if (similarity.score > bestScore) {
                        bestScore = similarity.score;
                        bestMatch = topic;
                    }
                }
                
                // 閾値を下げて、より包括的に分類（3点以上で分類）
                if (bestMatch && bestScore >= 3) {
                    console.log(`[TopicAnalysis] 🔄 再分類成功: "${opinion.content}" → ${bestMatch.name} (スコア: ${bestScore})`);
                    
                    bestMatch.opinions.push({
                        id: opinion.id,
                        content: opinion.content,
                        submittedAt: opinion.submittedAt,
                        isBookmarked: opinion.isBookmarked || false,
                        sentiment: opinion.sentiment || 'neutral',
                        characterCount: opinion.content.length,
                        topicId: null,
                        projectId: opinion.projectId
                    });
                    
                    bestMatch.count++;
                    usedOpinions.add(originalIndex);
                }
            }
        }
        
        // 最終的に分類できなかった意見を処理
        const finalUnclassifiedOpinions = opinions.filter((_, index) => !usedOpinions.has(index));
        const invalidOpinions = finalUnclassifiedOpinions.filter(opinion => !this.isValidOpinion(opinion.content));
        const validUnclassifiedOpinions = finalUnclassifiedOpinions.filter(opinion => this.isValidOpinion(opinion.content));
        
        console.log(`[TopicAnalysis] 📊 分類状況:`, {
            total: opinions.length,
            classified: opinions.length - finalUnclassifiedOpinions.length,
            validUnclassified: validUnclassifiedOpinions.length,
            invalid: invalidOpinions.length
        });
        
        // 有効な意見は全て適切なトピックに分類されるべき
        if (validUnclassifiedOpinions.length > 0) {
            console.log(`[TopicAnalysis] 🔄 有効な意見${validUnclassifiedOpinions.length}件を最適なトピックに分類`);
            
            // 有効な意見は必ず既存のトピックに分類する
            for (const opinion of validUnclassifiedOpinions) {
                if (organizedTopics.length > 0) {
                    // 最も関連性の高いトピックを探す
                    let bestMatch = null;
                    let bestScore = 0;
                    
                    for (const topic of organizedTopics) {
                        const similarity = this.calculateConceptualSimilarity(
                            opinion.content.toLowerCase(), 
                            topic.name.toLowerCase(), 
                            topic.keywords || []
                        );
                        
                        if (similarity.score > bestScore) {
                            bestScore = similarity.score;
                            bestMatch = topic;
                        }
                    }
                    
                    // 最適なトピックが見つからない場合は最初のトピックに分類
                    const targetTopic = bestMatch || organizedTopics[0];
                    
                    console.log(`[TopicAnalysis] 🔄 有効意見を分類: "${opinion.content}" → ${targetTopic.name} (スコア: ${bestScore})`);
                    
                    targetTopic.opinions.push({
                        id: opinion.id,
                        content: opinion.content,
                        submittedAt: opinion.submittedAt,
                        isBookmarked: opinion.isBookmarked || false,
                        sentiment: opinion.sentiment || 'neutral',
                        characterCount: opinion.content.length,
                        topicId: null,
                        projectId: opinion.projectId
                    });
                    
                    targetTopic.count++;
                }
            }
        }
        
        // 無効な意見（意味不明・いたずら）のみを「その他」として処理
        if (invalidOpinions.length > 0) {
            console.log(`[TopicAnalysis] ⚠️ 無効な意見${invalidOpinions.length}件を「その他」トピックに分類`);
            
            organizedTopics.push({
                id: `topic-other-${Date.now()}`,
                name: '【その他】意味不明・不適切な投稿',
                count: invalidOpinions.length,
                summary: `意味不明・いたずら・不適切な投稿として分類された意見（${invalidOpinions.length}件）`,
                opinions: invalidOpinions.map((op: any) => ({
                    id: op.id,
                    content: op.content,
                    submittedAt: op.submittedAt,
                    isBookmarked: op.isBookmarked || false,
                    sentiment: op.sentiment || 'neutral',
                    characterCount: op.content.length,
                    topicId: null,
                    projectId: op.projectId
                })),
                keywords: ['その他', '不適切', '意味不明'],
                sentiment: { positive: 0, negative: 0, neutral: invalidOpinions.length }
            });
        }

        console.log(`[TopicAnalysis] ✅ 分類完了: ${organizedTopics.length}個のトピック`);
        return organizedTopics;
    }

    /**
     * 概念的な関連性を計算する
     */
    private calculateConceptualSimilarity(opinionText: string, topicName: string, keywords: string[]): { score: number; reasons: string[] } {
        let score = 0;
        const reasons: string[] = [];
        
        // 概念的な関連性のマッピング
        const conceptualMappings = {
            'UI・操作性': {
                keywords: ['使いやすい', '使いにくい', '操作', '画面', 'インターフェース', 'デザイン', '分かりやすい', '分かりにくい', '直感的', '複雑', 'シンプル', 'ユーザビリティ'],
                weight: 5
            },
            'パフォーマンス': {
                keywords: ['速度', '重い', '軽い', '遅い', '早い', '処理', '起動', '動作', 'パフォーマンス', 'レスポンス', '応答'],
                weight: 5
            },
            'サポート': {
                keywords: ['サポート', '対応', '問い合わせ', 'ヘルプ', 'カスタマー', '返答', '回答', '質問', 'お客様', 'サービス'],
                weight: 5
            },
            '価格・料金': {
                keywords: ['料金', '価格', '値段', '高い', '安い', 'コスト', '費用', '手頃', '値上げ', '値下げ', 'コストパフォーマンス'],
                weight: 5
            },
            '機能': {
                keywords: ['機能', '追加', '新しい', '便利', '改善', '強化', '拡張', '新機能', 'アップデート', 'バージョンアップ'],
                weight: 5
            }
        };
        
        // トピック名と意見の概念的マッチング
        for (const [concept, mapping] of Object.entries(conceptualMappings)) {
            const topicMatches = mapping.keywords.filter(keyword => 
                topicName.includes(keyword) || keywords.some(k => k.includes(keyword))
            );
            const opinionMatches = mapping.keywords.filter(keyword => 
                opinionText.includes(keyword)
            );
            
            if (topicMatches.length > 0 && opinionMatches.length > 0) {
                score += mapping.weight;
                reasons.push(`概念的関連性(${concept}): ${opinionMatches.join(', ')}`);
            }
        }
        
        // 類似表現の検出
        const similarityMappings = [
            { patterns: ['高い', '高すぎる', 'コスト', '費用', '料金'], concept: '価格関連' },
            { patterns: ['遅い', '重い', '速度', '処理', '動作'], concept: 'パフォーマンス関連' },
            { patterns: ['使いにくい', '分かりにくい', '操作', '画面', 'UI'], concept: 'UI関連' },
            { patterns: ['サポート', '対応', '問い合わせ', 'ヘルプ'], concept: 'サポート関連' },
            { patterns: ['機能', '追加', '新しい', '便利', '改善'], concept: '機能関連' }
        ];
        
        for (const mapping of similarityMappings) {
            const topicHasPattern = mapping.patterns.some(pattern => topicName.includes(pattern));
            const opinionHasPattern = mapping.patterns.some(pattern => opinionText.includes(pattern));
            
            if (topicHasPattern && opinionHasPattern) {
                score += 3;
                reasons.push(`類似表現(${mapping.concept})`);
            }
        }
        
        return { score, reasons };
    }

    /**
     * 意見の品質を判定する（基本的なチェックのみ）
     */
    private isValidOpinion(content: string): boolean {
        const trimmedContent = content.trim();
        
        // 1. 最小文字数チェック（2文字以上）
        if (trimmedContent.length < 2) {
            return false;
        }
        
        // 2. 最大文字数チェック（1000文字以下）
        if (trimmedContent.length > 1000) {
            return false;
        }
        
        // 3. 同じ文字の過度な繰り返しチェック（10回以上）
        if (/^(.)\1{9,}$/.test(trimmedContent)) {
            return false;
        }
        
        // 4. 文字の多様性チェック（異なる文字が2種類以上）
        const uniqueChars = new Set(trimmedContent.replace(/\s/g, ''));
        if (uniqueChars.size < 2 && trimmedContent.length > 5) {
            return false;
        }
        
        // 基本的な条件をクリアした意見は有効とし、
        // 詳細な品質判定はAIに委ねる
        return true;
    }

    /**
     * 分析結果をSQLiteに保存
     */
    private async saveAnalysisToSQLite(projectId: string, analysisResult: TopicAnalysisResult): Promise<void> {
        console.log('[TopicAnalysis] 💾 SQLite保存開始:', projectId);

        try {
            // トランザクション内でトピックと意見を保存
            await prisma.$transaction(async (tx) => {
                for (const topic of analysisResult.topics) {
                    // トピックを作成
                    const createdTopic = await tx.topic.create({
                        data: {
                            name: topic.name,
                            category: topic.category || null,
                            summary: topic.summary,
                            count: topic.count,
                            projectId: projectId,
                            status: 'unhandled',
                            syncStatus: 'pending'
                        }
                    });

                    // 意見をトピックに関連付け
                    for (const opinion of topic.opinions) {
                        await tx.opinion.update({
                            where: { id: opinion.id },
                            data: { topicId: createdTopic.id }
                        });

                        // OpinionAnalysisStateに分析済み記録を追加（初回・再分析両対応）
                        await tx.opinionAnalysisState.upsert({
                            where: { opinionId: opinion.id },
                            update: {
                                lastAnalyzedAt: new Date(),
                                topicId: createdTopic.id,
                                analysisVersion: 1,
                                updatedAt: new Date()
                            },
                            create: {
                                opinionId: opinion.id,
                                projectId: projectId,
                                lastAnalyzedAt: new Date(),
                                topicId: createdTopic.id,
                                analysisVersion: 1
                            }
                        });
                    }
                }

                // インサイトを保存
                console.log('[TopicAnalysis] 💾 Insight保存開始:', analysisResult.insights.length, '件');
                for (const insight of analysisResult.insights) {
                    await tx.insight.create({
                        data: {
                            title: insight.title,
                            description: insight.description,
                            count: insight.count,
                            priority: insight.priority.toUpperCase() as 'HIGH' | 'MEDIUM' | 'LOW',
                            projectId: projectId,
                            status: 'UNHANDLED'
                        }
                    });
                }
                console.log('[TopicAnalysis] ✅ Insight保存完了:', analysisResult.insights.length, '件');

                // 分析履歴は analyzeProject メソッド内で作成されるため、ここでは重複を避けて削除

                // プロジェクトステータスを更新
                await tx.project.update({
                    where: { id: projectId },
                    data: { 
                        status: 'READY_FOR_ANALYSIS',
                        isAnalyzed: true
                    }
                });
            });

            console.log('[TopicAnalysis] ✅ SQLite保存完了');
        } catch (error) {
            console.error('[TopicAnalysis] ❌ SQLite保存エラー:', error);
            throw new AppError(500, 'DATABASE_SAVE_ERROR', `データベース保存に失敗しました: ${error instanceof Error ? error.message : String(error)}`);
        }
    }

    /**
     * Get project topics from database
     */
    async getProjectTopics(projectId: string, userId: string): Promise<any[]> {
        try {
            const topics = await prisma.topic.findMany({
                where: {
                    projectId,
                    project: { userId }
                },
                include: {
                    opinions: true
                },
                orderBy: { createdAt: 'desc' }
            });

            return topics.map(topic => ({
                id: topic.id,
                name: topic.name,
                summary: topic.summary,
                count: topic.count,
                status: topic.status,
                opinions: topic.opinions
            }));
        } catch (error) {
            console.error('[TopicAnalysis] ❌ getProjectTopics エラー:', error);
            throw new AppError(500, 'DATABASE_ERROR', 'Failed to get project topics');
        }
    }

    /**
     * Get project insights from database
     */
    async getProjectInsights(projectId: string, userId: string): Promise<any[]> {
        try {
            const insights = await prisma.insight.findMany({
                where: {
                    projectId,
                    project: { userId }
                },
                orderBy: { createdAt: 'desc' }
            });

            return insights.map(insight => ({
                id: insight.id,
                title: insight.title,
                description: insight.description,
                count: insight.count,
                priority: insight.priority,
                status: insight.status
            }));
        } catch (error) {
            console.error('[TopicAnalysis] ❌ getProjectInsights エラー:', error);
            throw new AppError(500, 'DATABASE_ERROR', 'Failed to get project insights');
        }
    }

    /**
     * Get complete project analysis results
     */
    async getProjectAnalysisResults(projectId: string, userId: string): Promise<TopicAnalysisResult> {
        try {
            const [topics, insights, project] = await Promise.all([
                this.getProjectTopics(projectId, userId),
                this.getProjectInsights(projectId, userId),
                prisma.project.findFirst({
                    where: { 
                        OR: [
                            { id: projectId, userId },
                            { firebaseId: projectId, userId }
                        ]
                    }
                })
            ]);

            if (!project) {
                throw new AppError(404, 'PROJECT_NOT_FOUND', 'Project not found');
            }

            return {
                topics: topics.map(topic => ({
                    id: topic.id,
                    name: topic.name,
                    count: topic.count,
                    summary: topic.summary,
                    opinions: topic.opinions || [],
                    keywords: [],
                    sentiment: { positive: 0, negative: 0, neutral: 0 }
                })),
                insights: insights.map(insight => ({
                    title: insight.title,
                    description: insight.description,
                    count: insight.count,
                    priority: insight.priority.toLowerCase() as 'high' | 'medium' | 'low'
                })),
                summary: project.description || this.getMultiLanguageMessage(await this.getUserAnalysisLanguage(userId), 'analysisResultSummary')
            };
        } catch (error) {
            console.error('[TopicAnalysis] ❌ getProjectAnalysisResults エラー:', error);
            if (error instanceof AppError) throw error;
            throw new AppError(500, 'DATABASE_ERROR', 'Failed to get project analysis results');
        }
    }

    /**
     * インクリメンタル分析のサマリーを生成
     */
    private async getIncrementalSummary(projectId: string, incrementalResult: any): Promise<string> {
        try {
            const project = await prisma.project.findUnique({
                where: { id: projectId },
                select: { userId: true }
            });
            
            if (!project) {
                return this.getMultiLanguageMessage('ja', 'incrementalComplete', {
                    newTopics: incrementalResult.newTopicsCreated || 0,
                    assignedOpinions: incrementalResult.newOpinionsProcessed || 0
                });
            }
            
            const userLanguage = await this.getUserAnalysisLanguage(project.userId);
            return this.getMultiLanguageMessage(userLanguage, 'incrementalComplete', {
                newTopics: incrementalResult.newTopicsCreated || 0,
                assignedOpinions: incrementalResult.newOpinionsProcessed || 0
            });
        } catch (error) {
            console.warn('[TopicAnalysis] ⚠️ インクリメンタルサマリー生成失敗、日本語使用:', error);
            return this.getMultiLanguageMessage('ja', 'incrementalComplete', {
                newTopics: incrementalResult.newTopicsCreated || 0,
                assignedOpinions: incrementalResult.newOpinionsProcessed || 0
            });
        }
    }

    /**
     * インクリメンタル分析結果をTopicAnalysisResult形式に変換
     */
    private async convertIncrementalToTopicAnalysis(incrementalResult: any, _projectId: string): Promise<TopicAnalysisResult> {
        console.log('[TopicAnalysis] 🔄 インクリメンタル分析結果を変換中...');
        
        try {
            // データベースから最新のトピックと意見を取得
            const topics = await prisma.topic.findMany({
                where: { projectId: _projectId },
                include: {
                    opinions: {
                        orderBy: { submittedAt: 'desc' }
                    }
                },
                orderBy: { createdAt: 'desc' }
            });

            const insights = await prisma.insight.findMany({
                where: { projectId: _projectId },
                orderBy: { createdAt: 'desc' }
            });

            console.log('[TopicAnalysis] 📊 変換結果:', {
                topicsCount: topics.length,
                insightsCount: insights.length,
                newOpinionsProcessed: incrementalResult.newOpinionsProcessed || 0,
                newTopicsCreated: incrementalResult.newTopicsCreated || 0
            });

            // TopicAnalysisResult形式に変換
            const result: TopicAnalysisResult = {
                topics: topics.map(topic => ({
                    id: topic.id,
                    name: topic.name,
                    count: topic.opinions.length,
                    summary: topic.summary,
                    opinions: topic.opinions.map(opinion => ({
                        id: opinion.id,
                        content: opinion.content,
                        submittedAt: new Date(opinion.submittedAt),
                        isBookmarked: opinion.isBookmarked,
                        sentiment: opinion.sentiment as 'positive' | 'negative' | 'neutral',
                        characterCount: opinion.characterCount,
                        projectId: opinion.projectId,
                        topicId: opinion.topicId || undefined
                    })),
                    keywords: [],
                    sentiment: { positive: 0, negative: 0, neutral: 0 }
                })),
                insights: insights.map(insight => ({
                    title: insight.title,
                    description: insight.description,
                    count: insight.count,
                    priority: insight.priority.toLowerCase() as 'high' | 'medium' | 'low'
                })),
                summary: await this.getIncrementalSummary(_projectId, incrementalResult)
            };

            console.log('[TopicAnalysis] ✅ インクリメンタル分析結果変換完了');
            return result;

        } catch (error) {
            console.error('[TopicAnalysis] ❌ インクリメンタル分析結果変換エラー:', error);
            throw new AppError(500, 'CONVERSION_ERROR', 'Failed to convert incremental analysis result');
        }
    }

    /**
     * インクリメンタル分析の実行 - 新しい意見を既存トピックに振り分けまたは新トピック作成
     */
    private async performIncrementalAnalysis(existingTopics: any[], allOpinions: any[], projectId: string): Promise<TopicAnalysisResult> {
        console.log('🎯🎯🎯 [TopicAnalysis] インクリメンタル分析開始 🎯🎯🎯');
        
        try {
            // 1. プロジェクトID正規化処理 - Firebase ID と SQLite ID の両方に対応
            console.log('🔍 [TopicAnalysis] プロジェクトID正規化とOpinionAnalysisState検索開始...');
            
            // SQLite IDからFirebase IDを取得（互換性確保）
            let firebaseProjectId = null;
            try {
                const projectData = await prisma.project.findFirst({
                    where: { id: projectId },
                    select: { firebaseId: true }
                });
                firebaseProjectId = projectData?.firebaseId || null;
            } catch (projectLookupError) {
                console.warn('[TopicAnalysis] ⚠️ Firebase IDの取得に失敗、SQLite IDのみで継続:', projectLookupError);
            }
            
            console.log('[TopicAnalysis] 🔍 プロジェクトID検証:', {
                inputProjectId: projectId,
                detectedFirebaseId: firebaseProjectId,
                willSearchBothIds: !!firebaseProjectId
            });
            
            // OpinionAnalysisStateテーブルから分析済み意見IDを取得（両方のIDで検索、エラーハンドリング強化）
            const searchConditions = [{ projectId }]; // SQLite ID
            if (firebaseProjectId) {
                searchConditions.push({ projectId: firebaseProjectId }); // Firebase ID
            }
            
            let analyzedOpinionIds: { opinionId: string; projectId: string; }[] = [];
            try {
                const startTime = Date.now();
                analyzedOpinionIds = await prisma.opinionAnalysisState.findMany({
                    where: { OR: searchConditions },
                    select: { opinionId: true, projectId: true }
                });
                const queryTime = Date.now() - startTime;
                
                if (queryTime > 1000) {
                    console.warn('[TopicAnalysis] ⚠️ OpinionAnalysisStateクエリが遅い:', {
                        queryTime: `${queryTime}ms`,
                        recordCount: analyzedOpinionIds.length,
                        searchConditions: searchConditions.length
                    });
                }
            } catch (analysisStateError) {
                console.error('[TopicAnalysis] ❌ OpinionAnalysisStateクエリエラー:', {
                    error: analysisStateError instanceof Error ? analysisStateError.message : String(analysisStateError),
                    searchConditions,
                    projectId,
                    firebaseProjectId
                });
                
                // クエリ失敗時は全件を未分析として処理（フォールバック）
                console.warn('[TopicAnalysis] ⚠️ フォールバック: 全意見を未分析として処理');
                analyzedOpinionIds = [];
            }
            
            const analyzedIds = new Set(analyzedOpinionIds.map(state => state.opinionId));
            // 重複IDのチェックとクリーンアップ
            const duplicateOpinionIds = new Set<string>();
            const uniqueAnalyzedIds = new Set<string>();
            const projectIdUsageStats: Record<string, number> = {};
            
            analyzedOpinionIds.forEach(state => {
                if (uniqueAnalyzedIds.has(state.opinionId)) {
                    duplicateOpinionIds.add(state.opinionId);
                } else {
                    uniqueAnalyzedIds.add(state.opinionId);
                }
                
                // プロジェクトID使用統計
                projectIdUsageStats[state.projectId] = (projectIdUsageStats[state.projectId] || 0) + 1;
            });
            
            if (duplicateOpinionIds.size > 0) {
                console.warn('[TopicAnalysis] ⚠️ 重複分析状態検出:', {
                    duplicateOpinionIds: Array.from(duplicateOpinionIds),
                    totalDuplicates: duplicateOpinionIds.size
                });
            }
            
            console.log('📊 [TopicAnalysis] 分析済み意見検索結果:', {
                sqliteProjectId: projectId,
                firebaseProjectId: firebaseProjectId,
                foundRecords: analyzedOpinionIds.length,
                uniqueAnalyzedOpinions: uniqueAnalyzedIds.size,
                duplicateRecords: duplicateOpinionIds.size,
                projectIdUsageStats,
                sampleAnalyzedIds: Array.from(uniqueAnalyzedIds).slice(0, 5)
            });
            
            // 重複を除去したユニークIDを使用
            
            // 分析済みでない意見を新規回答として検出
            const unassignedOpinions = allOpinions.filter(opinion => !uniqueAnalyzedIds.has(opinion.id));
            
            console.log('✅ [TopicAnalysis] 新規回答検出完了:', {
                totalOpinions: allOpinions.length,
                analyzedOpinions: uniqueAnalyzedIds.size,
                newOpinions: unassignedOpinions.length
            });
            
            console.log('📊📊📊 [TopicAnalysis] 分析対象詳細:', {
                totalOpinions: allOpinions.length,
                existingTopics: existingTopics.length,
                unassignedOpinions: unassignedOpinions.length,
                unassignedOpinionIds: unassignedOpinions.map((op: any) => op.id),
                unassignedContents: unassignedOpinions.map((op: any) => op.content.substring(0, 30) + '...')
            });

            if (unassignedOpinions.length === 0) {
                console.log('[TopicAnalysis] ℹ️ 新しい意見がありません');
                // 既存の分析結果をそのまま返す
                const existingResult = await this.buildAnalysisResultFromTopics(existingTopics);
                return existingResult;
            }

            // 2. Phase A: 適切なバッチサイズで1回のAPI呼び出し制御
            const safeBatchSize = this.calculateSafeBatchSize(unassignedOpinions);
            const opinionsToAnalyze = unassignedOpinions.slice(0, safeBatchSize);
            
            console.log('[TopicAnalysis] 📊 Phase A - バッチサイズ制御:', {
                totalUnanalyzed: unassignedOpinions.length,
                safeBatchSize: safeBatchSize,
                thisAnalysis: opinionsToAnalyze.length,
                remaining: unassignedOpinions.length - opinionsToAnalyze.length
            });
            
            // Phase A: チャンク処理防止の確認ログ
            console.log('[TopicAnalysis] ✅ チャンク処理防止の確認:');
            console.log('[TopicAnalysis] ✅ 単一API呼び出しでの分析を実行');
            console.log(`[TopicAnalysis] ✅ 複数バッチでの処理は実行されません（${opinionsToAnalyze.length}件を1回で処理）`);
            
            let analysisResult;
            if (opinionsToAnalyze.length > 0) {
                console.log(`[TopicAnalysis] 🚀 単一バッチでの分析を実行: ${opinionsToAnalyze.length}件`);
                // 3. 選択された意見を1回のAPI呼び出しで分析
                analysisResult = await this.performSingleBatchAnalysis(existingTopics, opinionsToAnalyze, projectId);
                
                // 4. データベースに反映
                await this.applyIncrementalChanges(projectId, analysisResult);
            } else {
                console.log('[TopicAnalysis] ⚠️ 分析対象の意見がありません');
                const existingResult = await this.buildAnalysisResultFromTopics(existingTopics);
                return existingResult;
            }

            // 4. 最新の分析結果を取得して返す
            const updatedTopics = await prisma.topic.findMany({
                where: { projectId },
                include: {
                    opinions: {
                        orderBy: { submittedAt: 'desc' }
                    }
                },
                orderBy: { createdAt: 'desc' }
            });
            
            return await this.buildAnalysisResultFromTopics(updatedTopics);

        } catch (error) {
            console.error('[TopicAnalysis] ❌ インクリメンタル分析エラー詳細:', {
                error: error instanceof Error ? error.message : error,
                stack: error instanceof Error ? error.stack : undefined,
                errorType: typeof error,
                projectId: existingTopics?.length ? 'has existing topics' : 'no existing topics'
            });
            throw new AppError(500, 'INCREMENTAL_ANALYSIS_ERROR', `Failed to perform incremental analysis: ${error instanceof Error ? error.message : error}`);
        }
    }

    /**
     * Phase A: 安全なバッチサイズを計算
     */
    private calculateSafeBatchSize(opinions: any[]): number {
        const maxSafeCharacters = 15000;
        const maxSafeOpinions = 35;
        const safetyMargin = 0.8;
        const headerLength = 50;
        
        if (opinions.length === 0) return 0;
        
        // 平均文字数を計算
        const avgCharacters = opinions.reduce((sum, op) => sum + op.content.length, 0) / opinions.length;
        
        // 文字数ベースの制限
        const characterBasedLimit = Math.floor(maxSafeCharacters / (avgCharacters + headerLength));
        
        // 安全マージンを適用
        const optimalSize = Math.min(characterBasedLimit, maxSafeOpinions) * safetyMargin;
        const safeBatchSize = Math.max(1, Math.min(Math.floor(optimalSize), opinions.length));
        
        console.log(`[TopicAnalysis] calculateSafeBatchSize: 未分析回答数=${opinions.length}, 推定バッチサイズ=${safeBatchSize}`);
        console.log(`[TopicAnalysis] バッチサイズ計算の確認:`, {
            avgCharacters: Math.round(avgCharacters),
            characterBasedLimit,
            maxSafeOpinions,
            safetyMargin,
            finalBatchSize: safeBatchSize
        });
        
        return safeBatchSize;
    }

    /**
     * Phase A: 選択された意見を1回のAPI呼び出しで分析
     */
    private async performSingleBatchAnalysis(existingTopics: any[], opinionsToAnalyze: any[], projectId: string): Promise<any> {
        console.log('[TopicAnalysis] 🤖 単一バッチ分析開始:', {
            existingTopicsCount: existingTopics.length,
            opinionsToAnalyzeCount: opinionsToAnalyze.length
        });
        
        // 既存のトピック情報をまとめる
        const existingTopicsSummary = existingTopics.map(topic => 
            `${topic.name}: ${topic.summary} (${topic.count}件)`
        ).join('\n');
        
        // 分析対象の意見をまとめる
        const opinionsText = opinionsToAnalyze.map((op, index) => 
            `${index + 1}. ${op.content}`
        ).join('\n');
        
        const analysisPrompt = `
あなたは意見分析のエキスパートです。以下の新しい意見を、既存のトピックに適切に振り分けるか、新しいトピックを作成するかを判定してください。

【既存トピック一覧】
${existingTopicsSummary || '（既存トピックなし）'}

【分析対象の意見】
${opinionsText}

【詳細判定ルール】
1. 既存トピック振り分け条件:
   - 意見の主要テーマが既存トピックと80%以上類似
   - キーワードの重複度が高い（共通キーワード3個以上）
   - 問題領域が同じカテゴリ（環境・設備・働き方・施設・コミュニケーション）
   - 解決すべき課題の本質が同じ

2. 新トピック作成条件:
   - 既存トピックとの類似度が60%未満
   - 新しい問題領域や課題を提起
   - 独立したテーマとして扱うべき内容
   - 既存トピックでは適切に分類できない

3. 新トピック命名ガイドライン:
   - 【カテゴリ】形式で開始（例: 【環境】【設備】【働き方】【施設】【コミュニケーション】）
   - 15文字以内で具体的
   - 理解しやすい表現
   - 意見の核心を的確に表現
   - 抽象的すぎない、具体的すぎない適切なレベル

4. 品質保証・必須遵守事項:
   - 「新トピック1」「新トピック」のような無意味な名前は絶対に使用禁止
   - 既存トピックとの重複確認を必須実行
   - 判定に迷う場合は既存トピックへの振り分けを優先
   - 各判定には必ず具体的な理由を記述
   - 信頼度は慎重に設定（不確実な場合は0.6以下）

5. 判定優先順位:
   第1優先: 既存トピックへの適切な振り分け
   第2優先: 明確に異なる場合のみ新トピック作成
   第3優先: 判断困難な場合は最も近い既存トピックへ振り分け

以下のJSON形式で必ず回答してください：
{
  "assignments": [
    {"opinionIndex": 1, "action": "ASSIGN_TO_EXISTING", "topicId": "既存トピックID", "confidence": 0.8, "reasoning": "具体的な判定理由"},
    {"opinionIndex": 2, "action": "CREATE_NEW_TOPIC", "suggestedName": "【カテゴリ】具体的トピック名", "confidence": 0.9, "reasoning": "新トピック作成の理由"}
  ]
}`;

        try {
            // AI分析実行
            const aiServiceManager = await this.getAIServiceManager();
            const response = await aiServiceManager.generateResponse(analysisPrompt, undefined, { purpose: 'main_analysis' });
            const aiResponse = response.content;
            
            let aiResult;
            try {
                aiResult = JSON.parse(aiResponse);
            } catch (parseError) {
                console.warn('[TopicAnalysis] ⚠️ AI分析結果のパース失敗、改善フォールバック処理');
                
                // 🔧 FIX: 意見内容ベースの意味のある名前生成
                const improvedAssignments = await Promise.all(
                    opinionsToAnalyze.map(async (opinion, index) => ({
                        opinionIndex: index + 1,
                        action: 'CREATE_NEW_TOPIC',
                        suggestedName: await this.generateMeaningfulTopicName(opinion.content),
                        confidence: 0.7  // フォールバックだが意味のある名前なので信頼度向上
                    }))
                );
                
                aiResult = { assignments: improvedAssignments };
            }
            
            // 結果を既存の形式に変換
            const assignments = [];
            const newTopics = [];
            
            // 🔧 FIX: 非同期処理対応で二次フォールバック改善
            for (const assignment of aiResult.assignments || []) {
                const opinionIndex = assignment.opinionIndex - 1; // 0ベースに変換
                if (opinionIndex >= 0 && opinionIndex < opinionsToAnalyze.length) {
                    const opinion = opinionsToAnalyze[opinionIndex];
                    
                    // 📊 Phase 2: reasoning情報のログ出力
                    if (assignment.reasoning) {
                        console.log(`[TopicAnalysis] 🤖 AI判定理由 (意見${assignment.opinionIndex}):`, {
                            action: assignment.action,
                            reasoning: assignment.reasoning,
                            confidence: assignment.confidence,
                            opinionContent: opinion.content.substring(0, 50) + '...'
                        });
                    }
                    
                    if (assignment.action === 'ASSIGN_TO_EXISTING' && assignment.topicId) {
                        assignments.push({
                            opinionId: opinion.id,
                            topicId: assignment.topicId,
                            confidence: assignment.confidence || 0.5,
                            reasoning: assignment.reasoning || 'AI判定による既存トピック振り分け'
                        });
                    } else {
                        // 🔧 FIX: 改善されたフォールバック命名
                        const suggestedName = assignment.suggestedName || 
                            await this.generateMeaningfulTopicName(opinion.content);
                        
                        newTopics.push({
                            opinion: opinion,
                            suggestedName: suggestedName,
                            confidence: assignment.confidence || 0.6,  // 改善されたフォールバックなので信頼度向上
                            reasoning: assignment.reasoning || 'AI判定による新トピック作成'
                        });
                    }
                }
            }
            
            // 📊 Phase 2: 品質保証情報の詳細ログ出力
            const qualityMetrics = {
                totalProcessed: assignments.length + newTopics.length,
                assignmentsCount: assignments.length,
                newTopicsCount: newTopics.length,
                assignmentRate: assignments.length / (assignments.length + newTopics.length) * 100,
                averageConfidence: {
                    assignments: assignments.length > 0 ? 
                        assignments.reduce((sum, a) => sum + (a.confidence || 0), 0) / assignments.length : 0,
                    newTopics: newTopics.length > 0 ? 
                        newTopics.reduce((sum, t) => sum + (t.confidence || 0), 0) / newTopics.length : 0
                },
                reasoningProvided: aiResult.assignments?.filter((a: any) => a.reasoning)?.length || 0,
                qualityIndicators: {
                    hasReasoningData: (aiResult.assignments?.filter((a: any) => a.reasoning)?.length || 0) > 0,
                    confidenceDistribution: {
                        high: aiResult.assignments?.filter((a: any) => (a.confidence || 0) >= 0.8)?.length || 0,
                        medium: aiResult.assignments?.filter((a: any) => (a.confidence || 0) >= 0.6 && (a.confidence || 0) < 0.8)?.length || 0,
                        low: aiResult.assignments?.filter((a: any) => (a.confidence || 0) < 0.6)?.length || 0
                    }
                }
            };

            console.log('[TopicAnalysis] ✅ 単一バッチ分析完了 - 品質レポート:', qualityMetrics);
            
            return { assignments, newTopics };
            
        } catch (error) {
            console.error('[TopicAnalysis] ❌ 単一バッチ分析エラー:', error);
            // 🔧 FIX: エラー時フォールバック改善
            const newTopics = await Promise.all(
                opinionsToAnalyze.map(async (opinion) => ({
                    opinion: opinion,
                    suggestedName: await this.generateMeaningfulTopicName(opinion.content),
                    confidence: 0.5  // エラー時だが改善されたフォールバック名なので信頼度向上
                }))
            );
            return { assignments: [], newTopics };
        }
    }

    /**
     * 新しい意見を既存トピックに分類またはトピック作成（旧実装 - 使用停止）
     */
    private async classifyNewOpinions(existingTopics: any[], newOpinions: any[]): Promise<any> {
        console.log('[TopicAnalysis] 🤖 新しい意見の分類開始');

        const assignments = [];
        const newTopics = [];

        // AIで既存トピックとの一致度を評価
        for (const opinion of newOpinions) {
            const classification = await this.classifyOpinionAgainstTopics(opinion, existingTopics);
            
            if (classification.action === 'ASSIGN_TO_EXISTING') {
                assignments.push({
                    opinionId: opinion.id,
                    topicId: classification.topicId,
                    confidence: classification.confidence
                });
            } else if (classification.action === 'CREATE_NEW_TOPIC') {
                newTopics.push({
                    opinion: opinion,
                    suggestedName: classification.suggestedName,
                    confidence: classification.confidence
                });
            }
        }

        console.log('[TopicAnalysis] 📊 分類結果:', {
            assignments: assignments.length,
            newTopics: newTopics.length
        });

        return { assignments, newTopics };
    }

    /**
     * 単一の意見を既存トピックと比較してAIで分類
     */
    private async classifyOpinionAgainstTopics(opinion: any, existingTopics: any[]): Promise<any> {
        console.log(`[TopicAnalysis] 🔍 意見分類中: ${opinion.content.substring(0, 30)}...`);

        if (existingTopics.length === 0) {
            return {
                action: 'CREATE_NEW_TOPIC',
                suggestedName: this.getMultiLanguageMessage('ja', 'newTopicName', { preview: opinion.content.substring(0, 20) }),
                confidence: 0.8,
                reasoning: this.getMultiLanguageMessage('ja', 'newTopicReason')
            };
        }

        // 既存トピックの情報をまとめる
        const topicSummaries = existingTopics.map(topic => 
            `${topic.name}: ${topic.summary} (${topic.count}件)`
        ).join('\n');

        const classificationPrompt = `
以下の新しい意見を、既存のトピックに振り分けるか、新しいトピックを作成するかAIで判定してください。

【新しい意見】
${opinion.content}

【既存トピック一覧】
${topicSummaries}

【判定基準】
- 既存トピックと70%以上の関連性がある場合：既存トピックに振り分け
- 関連性が低い場合：新しいトピックを作成
- 曖昧な場合：最も関連性の高いトピックに振り分け

以下のJSON形式で回答してください：
{
  "action": "ASSIGN_TO_EXISTING" または "CREATE_NEW_TOPIC",
  "topicId": "既存トピックのID（ASSIGN_TO_EXISTINGの場合のみ）",
  "suggestedName": "新トピック名（CREATE_NEW_TOPICの場合のみ）",
  "confidence": 0.0-1.0の信頼度,
  "reasoning": "判定理由"
}`;

        // 🚫 COST OPTIMIZATION: 個別分類APIコールを無効化
        // メイン分析で意見分類も同時実行されるため、この追加API呼び出しは不要
        console.warn('[TopicAnalysis] ⚠️ 個別分類は無効化済み（コスト削減のため）');
        console.warn('[TopicAnalysis] 💡 メイン分析で意見分類も同時実行されます');
        
        // フォールバック: 新しいトピックを作成（安全な動作）
        return {
            action: 'CREATE_NEW_TOPIC',
            suggestedName: this.getMultiLanguageMessage('ja', 'newTopicName', { preview: opinion.content.substring(0, 20) }),
            confidence: 0.5,
            reasoning: '個別分類機能は無効化済み - メイン分析結果を使用してください'
        };
    }

    /**
     * インクリメンタル分析の結果をデータベースに適用
     */
    private async applyIncrementalChanges(projectId: string, analysisResult: any): Promise<void> {
        console.log('[TopicAnalysis] 💾 インクリメンタル変更をデータベースに適用中...');

        try {
            await prisma.$transaction(async (tx) => {
                // 1. 既存トピックへの意見割り当て
                for (const assignment of analysisResult.assignments) {
                    await tx.opinion.update({
                        where: { id: assignment.opinionId },
                        data: { topicId: assignment.topicId }
                    });

                    // OpinionAnalysisStateに分析済み記録を追加
                    await tx.opinionAnalysisState.create({
                        data: {
                            opinionId: assignment.opinionId,
                            projectId: projectId,
                            lastAnalyzedAt: new Date()
                        }
                    });

                    // トピックの件数を更新
                    await tx.topic.update({
                        where: { id: assignment.topicId },
                        data: { 
                            count: { increment: 1 },
                            updatedAt: new Date()
                        }
                    });
                }

                // 2. 新しいトピックの作成
                for (const newTopic of analysisResult.newTopics) {
                    const topic = await tx.topic.create({
                        data: {
                            name: newTopic.suggestedName,
                            summary: `${newTopic.opinion.content.substring(0, 50)}...に関するトピック`,
                            count: 1,
                            projectId: projectId,
                            status: 'UNHANDLED'
                        }
                    });

                    // 意見をトピックに紐付け
                    await tx.opinion.update({
                        where: { id: newTopic.opinion.id },
                        data: { topicId: topic.id }
                    });

                    // OpinionAnalysisStateに分析済み記録を追加
                    await tx.opinionAnalysisState.create({
                        data: {
                            opinionId: newTopic.opinion.id,
                            projectId: projectId,
                            lastAnalyzedAt: new Date()
                        }
                    });
                }

                // 3. プロジェクトの最終分析時刻を更新
                await tx.project.update({
                    where: { id: projectId },
                    data: { 
                        lastAnalysisAt: new Date(),
                        updatedAt: new Date()
                    }
                });
            });

            console.log('[TopicAnalysis] ✅ インクリメンタル変更適用完了');
        } catch (error) {
            console.error('[TopicAnalysis] ❌ インクリメンタル変更適用エラー:', error);
            throw error;
        }
    }

    /**
     * トピックデータからTopicAnalysisResult形式を構築
     */
    private async buildAnalysisResultFromTopics(topics: any[]): Promise<TopicAnalysisResult> {
        console.log('[TopicAnalysis] 🔄 分析結果を構築中...');

        // インサイトを取得（存在する場合）
        const insights = topics.length > 0 ? await prisma.insight.findMany({
            where: { projectId: topics[0].projectId },
            orderBy: { createdAt: 'desc' }
        }) : [];

        const result: TopicAnalysisResult = {
            topics: topics.map(topic => ({
                id: topic.id,
                name: topic.name,
                count: topic.opinions?.length || topic.count || 0,
                summary: topic.summary,
                opinions: topic.opinions?.map((opinion: any) => ({
                    id: opinion.id,
                    content: opinion.content,
                    submittedAt: opinion.submittedAt.toISOString(),
                    isBookmarked: opinion.isBookmarked,
                    sentiment: opinion.sentiment,
                    characterCount: opinion.characterCount,
                    projectId: opinion.projectId,
                    topicId: opinion.topicId
                })) || [],
                keywords: [],
                sentiment: { positive: 0, negative: 0, neutral: 0 }
            })),
            insights: insights.map(insight => ({
                title: insight.title,
                description: insight.description,
                count: insight.count,
                priority: insight.priority.toLowerCase() as 'high' | 'medium' | 'low'
            })),
            summary: `分析完了: ${topics.length}個のトピックに整理されました。`
        };

        console.log('[TopicAnalysis] ✅ 分析結果構築完了:', {
            topicsCount: result.topics.length,
            totalOpinions: result.topics.reduce((sum, topic) => sum + topic.count, 0)
        });

        return result;
    }

    /**
     * 意見内容に基づく意味のあるトピック名を生成（フォールバック用）
     */
    private async generateMeaningfulTopicName(content: string): Promise<string> {
        try {
            console.log('[TopicAnalysis] 🤖 フォールバック用トピック名生成');
            
            const prompt = `以下の意見に適切なトピック名を生成してください。

意見: "${content}"

要件:
- 15文字以内
- 【カテゴリ】形式で開始
- 具体的で分かりやすい
- 既存トピックと重複しない独自性

トピック名のみを回答してください。`;

            const aiServiceManager = await this.getAIServiceManager();
            const response = await aiServiceManager.generateResponse(
                prompt, 
                undefined, 
                { purpose: 'classification' }
            );
            return response.content.trim().substring(0, 15);
            
        } catch (error) {
            console.error('[TopicAnalysis] ❌ フォールバック名生成失敗:', error);
            
            // 最終フォールバック: キーワードベース分類
            return this.generateKeywordBasedTopicName(content);
        }
    }

    /**
     * キーワードベースのトピック名生成（最終フォールバック）
     */
    private generateKeywordBasedTopicName(content: string): string {
        const text = content.toLowerCase();
        const keywords = {
            '【環境】': ['環境', '温度', 'エアコン', '照明', '省エネ', '空調', '冷房', '暖房'],
            '【設備】': ['wi-fi', 'プリンター', '機器', '設備', 'システム', 'pc', 'コンピュータ'],
            '【働き方】': ['在宅', 'リモート', '勤務', '休憩', 'フリーアドレス', '働き方', '勤務時間'],
            '【施設】': ['駐車場', '会議室', 'スペース', '場所', '建物', '施設', 'フロア'],
            '【コミュニケーション】': ['会議', 'コミュニケーション', '連絡', '相談', '報告', '情報共有']
        };
        
        for (const [category, words] of Object.entries(keywords)) {
            if (words.some(word => text.includes(word))) {
                return `${category}${content.substring(0, 8)}関連`;
            }
        }
        
        // 最終的なフォールバック
        return `【その他】${content.substring(0, 10)}...`;
    }

    /**
     * AI Sentiment分析の実行 (Phase 2: オプション機能)
     * 既存システムへの影響: なし（オプション機能）
     */
    private async performAISentimentAnalysis(opinions: Opinion[], options: TopicAnalysisOptions): Promise<any> {
        const startTime = Date.now();
        
        console.log('[TopicAnalysis] 🧠 AI Sentiment分析開始:', {
            totalOpinions: opinions.length,
            maxOpinionsForSentiment: options.maxOpinionsForSentiment || 100,
            timeout: options.sentimentAnalysisTimeout || 30000
        });

        // 分析対象の意見を制限（パフォーマンス考慮）
        const maxOpinions = options.maxOpinionsForSentiment || 100;
        const opinionsToAnalyze = opinions.slice(0, maxOpinions);

        console.log('[TopicAnalysis] 📊 Sentiment分析対象:', {
            totalOpinions: opinions.length,
            analyzingOpinions: opinionsToAnalyze.length,
            skippedOpinions: opinions.length - opinionsToAnalyze.length
        });

        // AIServiceManagerを使用してバッチ分析実行
        const aiServiceManager = await this.getAIServiceManager();
        const analysisResults = [];

        try {
            // 分析結果を収集
            for (const opinion of opinionsToAnalyze) {
                try {
                    const result = await aiServiceManager.analyzeSentiment(opinion.content, {
                        language: 'ja',
                        timeout: options.sentimentAnalysisTimeout || 30000
                    });

                    analysisResults.push({
                        opinionId: opinion.id,
                        sentiment: result.sentiment,
                        confidence: result.confidence,
                        reasoning: result.reasoning
                    });

                    console.log('[TopicAnalysis] ✅ 意見分析完了:', {
                        opinionId: opinion.id,
                        sentiment: result.sentiment,
                        confidence: result.confidence
                    });

                } catch (error) {
                    console.error('[TopicAnalysis] ❌ 個別意見分析エラー:', {
                        opinionId: opinion.id,
                        error: error instanceof Error ? error.message : 'Unknown error'
                    });
                    
                    // エラーの場合はneutralとして記録
                    analysisResults.push({
                        opinionId: opinion.id,
                        sentiment: 'neutral',
                        confidence: 0,
                        reasoning: 'Analysis failed'
                    });
                }
            }

            // 統計情報を計算
            const summary = {
                positive: analysisResults.filter(r => r.sentiment === 'positive').length,
                negative: analysisResults.filter(r => r.sentiment === 'negative').length,
                neutral: analysisResults.filter(r => r.sentiment === 'neutral').length
            };

            const processingTime = Date.now() - startTime;

            console.log('[TopicAnalysis] ✅ AI Sentiment分析完了:', {
                totalAnalyzed: analysisResults.length,
                summary,
                processingTime: `${processingTime}ms`,
                averageTimePerOpinion: `${Math.round(processingTime / analysisResults.length)}ms`
            });

            return {
                enabled: true,
                analysisResults,
                summary,
                metadata: {
                    totalOpinions: opinions.length,
                    analyzedOpinions: analysisResults.length,
                    processingTime,
                    averageTimePerOpinion: Math.round(processingTime / analysisResults.length)
                }
            };

        } catch (error) {
            console.error('[TopicAnalysis] ❌ AI Sentiment分析失敗:', error);
            
            // エラー時はすべてneutralとして返す
            const fallbackResults = opinionsToAnalyze.map(opinion => ({
                opinionId: opinion.id,
                sentiment: 'neutral' as const,
                confidence: 0,
                reasoning: 'Analysis failed due to system error'
            }));

            return {
                enabled: true,
                analysisResults: fallbackResults,
                summary: {
                    positive: 0,
                    negative: 0,
                    neutral: fallbackResults.length
                },
                metadata: {
                    totalOpinions: opinions.length,
                    analyzedOpinions: fallbackResults.length,
                    processingTime: Date.now() - startTime,
                    error: error instanceof Error ? error.message : 'Unknown error'
                }
            };
        }
    }
}

