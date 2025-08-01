import { Router } from 'express';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import { prisma } from '../lib/database';
import { AIServiceManager } from '../services/aiServiceManager';
import { adminDatabase, isFirebaseInitialized } from '../lib/firebase-admin';

const router = Router();

// Apply authentication to all routes
router.use(requireAuth);

/**
 * Phase 1: 独立AI Sentiment分析API
 * 既存システムへの影響: ゼロ（完全分離）
 * 
 * このAPIは読み取り専用でデータベースを更新しません
 * 分析結果のみを返却し、既存機能に一切干渉しません
 */

/**
 * GET /api/ai-sentiment/health
 * AI sentiment分析機能のヘルスチェック
 */
router.get('/health', async (req: AuthenticatedRequest, res, next) => {
    try {
        const userId = req.userId!;
        
        console.log('[AISentimentAPI] 🏥 ヘルスチェック開始:', { userId, timestamp: new Date().toISOString() });
        
        // 環境変数チェック
        const isEnabled = process.env.ENABLE_AI_SENTIMENT === 'true';
        const isEmergencyDisabled = process.env.EMERGENCY_DISABLE_AI_SENTIMENT === 'true';
        
        if (isEmergencyDisabled) {
            console.log('[AISentimentAPI] 🚨 緊急停止モード検出');
            return res.json({
                success: true,
                status: 'disabled',
                reason: 'Emergency disabled',
                timestamp: new Date().toISOString(),
                checks: {
                    environmentConfig: { status: 'disabled', reason: 'Emergency stop activated' },
                    aiService: { status: 'disabled' },
                    database: { status: 'disabled' }
                }
            });
        }
        
        if (!isEnabled) {
            console.log('[AISentimentAPI] ⚠️ 機能無効化検出');
            return res.json({
                success: true,
                status: 'disabled',
                reason: 'Feature not enabled',
                timestamp: new Date().toISOString(),
                checks: {
                    environmentConfig: { status: 'disabled', reason: 'ENABLE_AI_SENTIMENT=false' },
                    aiService: { status: 'disabled' },
                    database: { status: 'disabled' }
                }
            });
        }
        
        // AIサービスチェック
        let aiServiceStatus = 'unknown';
        let aiServiceError = null;
        try {
            const aiManager = AIServiceManager.getInstance();
            await aiManager.testConnection();
            aiServiceStatus = 'healthy';
            console.log('[AISentimentAPI] ✅ AIサービス接続正常');
        } catch (error) {
            aiServiceStatus = 'error';
            aiServiceError = error instanceof Error ? error.message : 'Unknown error';
            console.error('[AISentimentAPI] ❌ AIサービス接続エラー:', error);
        }
        
        // データベースチェック
        let databaseStatus = 'unknown';
        let databaseError = null;
        try {
            await prisma.opinion.count(); // 軽量なクエリでDB接続確認
            databaseStatus = 'healthy';
            console.log('[AISentimentAPI] ✅ データベース接続正常');
        } catch (error) {
            databaseStatus = 'error';
            databaseError = error instanceof Error ? error.message : 'Unknown error';
            console.error('[AISentimentAPI] ❌ データベース接続エラー:', error);
        }
        
        const overallStatus = aiServiceStatus === 'healthy' && databaseStatus === 'healthy' ? 'healthy' : 'degraded';
        
        res.json({
            success: true,
            status: overallStatus,
            timestamp: new Date().toISOString(),
            checks: {
                environmentConfig: { 
                    status: 'enabled',
                    ENABLE_AI_SENTIMENT: isEnabled,
                    EMERGENCY_DISABLE_AI_SENTIMENT: isEmergencyDisabled
                },
                aiService: { 
                    status: aiServiceStatus,
                    error: aiServiceError
                },
                database: { 
                    status: databaseStatus,
                    error: databaseError
                }
            }
        });
        
        console.log('[AISentimentAPI] ✅ ヘルスチェック完了:', { overallStatus });
        
    } catch (error) {
        console.error('[AISentimentAPI] ❌ ヘルスチェックエラー:', error);
        next(error);
    }
});

/**
 * POST /api/ai-sentiment/analyze-single
 * 単一意見のAI sentiment分析（読み取り専用）
 * 
 * Request Body (以下のいずれかが必須):
 * {
 *   "opinionId": "opinion-id-string",     // DBから意見を取得して分析
 *   "content": "意見内容"                 // 直接提供されたコンテンツを分析
 * }
 * 
 * 両方指定された場合はopinionIdが優先されます
 */
router.post('/analyze-single', async (req: AuthenticatedRequest, res, next) => {
    try {
        const userId = req.userId!;
        const { opinionId, content } = req.body;
        
        console.log('[AISentimentAPI] 🔍 単一意見分析開始:', { 
            userId, 
            opinionId, 
            hasContent: !!content,
            timestamp: new Date().toISOString() 
        });
        
        // 機能有効性チェック
        if (process.env.EMERGENCY_DISABLE_AI_SENTIMENT === 'true') {
            throw new AppError(503, 'SERVICE_DISABLED', 'AI sentiment analysis is temporarily disabled');
        }
        
        if (process.env.ENABLE_AI_SENTIMENT !== 'true') {
            throw new AppError(503, 'SERVICE_DISABLED', 'AI sentiment analysis is not enabled');
        }
        
        // 入力検証 - opinionIdまたはcontentのいずれかが必要
        if (!opinionId && !content) {
            throw new AppError(400, 'MISSING_REQUIRED_PARAMETER', 'Either opinionId or content is required');
        }
        
        let opinionContent = content;
        let opinionData = null;
        
        // opinionIdが指定されている場合、DBから取得
        if (opinionId) {
            opinionData = await prisma.opinion.findFirst({
                where: { 
                    id: opinionId,
                    project: { userId } // ユーザー所有プロジェクトの意見のみ
                },
                include: { project: true }
            });
            
            if (!opinionData) {
                throw new AppError(404, 'OPINION_NOT_FOUND', 'Opinion not found or access denied');
            }
            
            // DBから取得したコンテンツを使用（リクエストのcontentより優先）
            opinionContent = opinionData.content;
        }
        
        // 最終的にコンテンツが空の場合はエラー
        if (!opinionContent) {
            throw new AppError(400, 'MISSING_CONTENT', 'Content is required for analysis');
        }
        
        // AI分析実行
        const aiManager = AIServiceManager.getInstance();
        const analysisResult = await aiManager.analyzeSentiment(opinionContent, {
            language: 'ja',
            model: 'claude-3-5-sonnet-20241022'
        });
        
        console.log('[AISentimentAPI] ✅ AI分析完了:', { 
            opinionId: opinionId || 'direct-content',
            sentiment: analysisResult.sentiment,
            confidence: analysisResult.confidence
        });
        
        // 結果返却（データベース更新なし）
        const response: any = {
            success: true,
            analysis: {
                sentiment: analysisResult.sentiment,
                confidence: analysisResult.confidence,
                reasoning: analysisResult.reasoning,
                analyzedAt: new Date().toISOString(),
                model: analysisResult.model || 'claude-3-5-sonnet-20241022'
            },
            input: {
                content: opinionContent,
                characterCount: opinionContent.length
            },
            metadata: {
                phase: 'phase1-read-only',
                databaseUpdated: false,
                processingTime: Date.now() - Date.now() // Will be calculated properly
            }
        };
        
        // opinionIdが指定されている場合のみレスポンスに含める
        if (opinionId) {
            response.opinionId = opinionId;
        }
        
        res.json(response);
        
    } catch (error) {
        console.error('[AISentimentAPI] ❌ 単一意見分析エラー:', error);
        next(error);
    }
});

/**
 * POST /api/ai-sentiment/analyze-batch
 * プロジェクト内複数意見の一括AI sentiment分析（読み取り専用）
 * 
 * Request Body:
 * {
 *   "projectId": "project-id-string",
 *   "opinionIds": ["id1", "id2", ...], // オプション、未指定時は全意見
 *   "limit": 50 // オプション、最大処理件数
 * }
 */
router.post('/analyze-batch', async (req: AuthenticatedRequest, res, next) => {
    try {
        const userId = req.userId!;
        const { projectId, opinionIds, limit = 50 } = req.body;
        
        console.log('[AISentimentAPI] 📊 一括意見分析開始:', { 
            userId, 
            projectId, 
            opinionIdsCount: opinionIds?.length || 'all',
            limit,
            timestamp: new Date().toISOString() 
        });
        
        // 機能有効性チェック
        if (process.env.EMERGENCY_DISABLE_AI_SENTIMENT === 'true') {
            throw new AppError(503, 'SERVICE_DISABLED', 'AI sentiment analysis is temporarily disabled');
        }
        
        if (process.env.ENABLE_AI_SENTIMENT !== 'true') {
            throw new AppError(503, 'SERVICE_DISABLED', 'AI sentiment analysis is not enabled');
        }
        
        // 入力検証
        if (!projectId) {
            throw new AppError(400, 'MISSING_PROJECT_ID', 'Project ID is required');
        }
        
        if (limit > 100) {
            throw new AppError(400, 'LIMIT_TOO_HIGH', 'Limit cannot exceed 100 opinions per request');
        }
        
        // プロジェクト確認
        const project = await prisma.project.findFirst({
            where: {
                OR: [
                    { id: projectId, userId },
                    { firebaseId: projectId, userId }
                ]
            }
        });
        
        if (!project) {
            throw new AppError(404, 'PROJECT_NOT_FOUND', 'Project not found or access denied');
        }
        
        // 対象意見取得
        const whereClause: any = { projectId: project.id };
        if (opinionIds && opinionIds.length > 0) {
            whereClause.id = { in: opinionIds };
        }
        
        const opinions = await prisma.opinion.findMany({
            where: whereClause,
            take: limit,
            orderBy: { submittedAt: 'desc' }
        });
        
        console.log('[AISentimentAPI] 📄 対象意見取得完了:', { count: opinions.length });
        
        if (opinions.length === 0) {
            return res.json({
                success: true,
                projectId,
                analysis: {
                    totalOpinions: 0,
                    analyzedOpinions: [],
                    summary: {
                        positive: 0,
                        negative: 0,
                        neutral: 0
                    }
                },
                metadata: {
                    phase: 'phase1-read-only',
                    databaseUpdated: false,
                    processingTime: 0
                }
            });
        }
        
        // AI分析実行（バッチ処理）
        const startTime = Date.now();
        const aiManager = AIServiceManager.getInstance();
        const analysisResults = [];
        
        for (const opinion of opinions) {
            try {
                const result = await aiManager.analyzeSentiment(opinion.content, {
                    language: 'ja',
                    model: 'claude-3-5-sonnet-20241022'
                });
                
                analysisResults.push({
                    opinionId: opinion.id,
                    content: opinion.content,
                    sentiment: result.sentiment,
                    confidence: result.confidence,
                    reasoning: result.reasoning,
                    analyzedAt: new Date().toISOString()
                });
                
                console.log('[AISentimentAPI] ✅ 意見分析完了:', { 
                    opinionId: opinion.id,
                    sentiment: result.sentiment 
                });
                
            } catch (error) {
                console.error('[AISentimentAPI] ❌ 個別意見分析エラー:', { 
                    opinionId: opinion.id,
                    error: error instanceof Error ? error.message : 'Unknown error'
                });
                
                // エラーの場合もneutralとして記録（分析継続）
                analysisResults.push({
                    opinionId: opinion.id,
                    content: opinion.content,
                    sentiment: 'neutral',
                    confidence: 0,
                    reasoning: 'Analysis failed',
                    error: error instanceof Error ? error.message : 'Unknown error',
                    analyzedAt: new Date().toISOString()
                });
            }
        }
        
        const processingTime = Date.now() - startTime;
        
        // 集計統計計算
        const summary = {
            positive: analysisResults.filter(r => r.sentiment === 'positive').length,
            negative: analysisResults.filter(r => r.sentiment === 'negative').length,
            neutral: analysisResults.filter(r => r.sentiment === 'neutral').length
        };
        
        console.log('[AISentimentAPI] ✅ 一括分析完了:', { 
            totalOpinions: opinions.length,
            analyzedCount: analysisResults.length,
            summary,
            processingTime
        });
        
        // 結果返却（データベース更新なし）
        res.json({
            success: true,
            projectId,
            analysis: {
                totalOpinions: opinions.length,
                analyzedOpinions: analysisResults,
                summary
            },
            metadata: {
                phase: 'phase1-read-only',
                databaseUpdated: false,
                processingTime,
                model: 'claude-3-5-sonnet-20241022',
                analyzedAt: new Date().toISOString()
            }
        });
        
    } catch (error) {
        console.error('[AISentimentAPI] ❌ 一括意見分析エラー:', error);
        next(error);
    }
});

/**
 * Phase 3: AI Sentiment データベース更新API
 * 既存システムへの影響: 制御された更新（Firebase + SQLite両方）
 * 
 * このAPIはAI分析結果をデータベースに安全に保存します
 * 両方のデータベースへの更新が成功した場合のみコミットされます
 */

/**
 * POST /api/ai-sentiment/update-single
 * 単一意見のAI sentiment分析とデータベース更新
 * 
 * Request Body:
 * {
 *   "opinionId": "opinion-id-string",
 *   "forceUpdate": false // オプション、既存の分析結果を強制更新
 * }
 */
router.post('/update-single', async (req: AuthenticatedRequest, res, next) => {
    try {
        const userId = req.userId!;
        const { opinionId, forceUpdate = false } = req.body;
        
        console.log('[AISentimentAPI] 🔄 単一意見更新開始:', { 
            userId, 
            opinionId,
            forceUpdate,
            timestamp: new Date().toISOString() 
        });
        
        // 機能有効性チェック
        if (process.env.EMERGENCY_DISABLE_AI_SENTIMENT === 'true') {
            throw new AppError(503, 'SERVICE_DISABLED', 'AI sentiment analysis is temporarily disabled');
        }
        
        if (process.env.ENABLE_AI_SENTIMENT !== 'true') {
            throw new AppError(503, 'SERVICE_DISABLED', 'AI sentiment analysis is not enabled');
        }
        
        // 入力検証
        if (!opinionId) {
            throw new AppError(400, 'MISSING_OPINION_ID', 'Opinion ID is required');
        }
        
        // 意見取得（ユーザー権限確認含む）
        const opinion = await prisma.opinion.findFirst({
            where: { 
                id: opinionId,
                project: { userId }
            },
            include: { 
                project: { 
                    select: { 
                        id: true, 
                        userId: true, 
                        firebaseId: true 
                    } 
                } 
            }
        });
        
        if (!opinion) {
            throw new AppError(404, 'OPINION_NOT_FOUND', 'Opinion not found or access denied');
        }
        
        // 既存の分析結果確認
        if (opinion.sentiment !== 'NEUTRAL' && !forceUpdate) {
            console.log('[AISentimentAPI] ⚠️ 既存分析結果スキップ:', { 
                opinionId,
                currentSentiment: opinion.sentiment
            });
            
            return res.json({
                success: true,
                opinionId,
                status: 'skipped',
                reason: 'Already analyzed',
                current: {
                    sentiment: opinion.sentiment,
                    updatedAt: opinion.analyzedAt
                },
                metadata: {
                    phase: 'phase3-database-update',
                    databaseUpdated: false,
                    skipped: true
                }
            });
        }
        
        // AI分析実行
        console.log('[AISentimentAPI] 🧠 AI分析開始:', { opinionId });
        const aiManager = AIServiceManager.getInstance();
        const analysisResult = await aiManager.analyzeSentiment(opinion.content, {
            language: 'ja',
            model: 'claude-3-5-sonnet-20241022'
        });
        
        console.log('[AISentimentAPI] ✅ AI分析完了:', { 
            opinionId,
            sentiment: analysisResult.sentiment,
            confidence: analysisResult.confidence
        });
        
        // Sentiment値をデータベース形式に変換
        const dbSentiment = analysisResult.sentiment === 'positive' ? 'POSITIVE' : 
                           analysisResult.sentiment === 'negative' ? 'NEGATIVE' : 'NEUTRAL';
        
        let sqlUpdateSuccessful = false;
        let firebaseUpdateSuccessful = false;
        let originalSentiment = opinion.sentiment;
        
        try {
            // Phase 1: SQLite更新
            console.log('[AISentimentAPI] 🗄️ SQLite更新開始:', { opinionId, dbSentiment });
            
            const updatedOpinion = await prisma.opinion.update({
                where: { id: opinionId },
                data: {
                    sentiment: dbSentiment,
                    analyzedAt: new Date(),
                    analysisStatus: 'analyzed'
                }
            });
            
            sqlUpdateSuccessful = true;
            console.log('[AISentimentAPI] ✅ SQLite更新完了:', { 
                opinionId,
                newSentiment: dbSentiment
            });
            
            // Phase 2: Firebase更新（Firebase接続が有効な場合のみ）
            if (isFirebaseInitialized && adminDatabase && opinion.firebaseId) {
                console.log('[AISentimentAPI] 🔥 Firebase更新開始:', { 
                    opinionId,
                    firebaseId: opinion.firebaseId
                });
                
                try {
                    const firebaseData = {
                        sentiment: dbSentiment,
                        analyzedAt: new Date().toISOString(),
                        analysisStatus: 'analyzed'
                    };
                    
                    // Firebase Realtime Database更新
                    const firebaseRef = adminDatabase.ref(`users/${userId}/projects/${opinion.project.firebaseId}/responses/${opinion.firebaseId}`);
                    await firebaseRef.update(firebaseData);
                    
                    firebaseUpdateSuccessful = true;
                    console.log('[AISentimentAPI] ✅ Firebase更新完了:', { 
                        opinionId,
                        firebaseId: opinion.firebaseId
                    });
                    
                } catch (firebaseError) {
                    console.error('[AISentimentAPI] ❌ Firebase更新エラー:', firebaseError);
                    
                    // Firebase更新失敗時はSQLite更新をロールバック
                    console.log('[AISentimentAPI] 🔄 SQLite更新ロールバック開始:', { opinionId });
                    await prisma.opinion.update({
                        where: { id: opinionId },
                        data: {
                            sentiment: originalSentiment,
                            analyzedAt: opinion.analyzedAt,
                            analysisStatus: opinion.analysisStatus
                        }
                    });
                    console.log('[AISentimentAPI] ✅ SQLite更新ロールバック完了');
                    
                    throw new AppError(500, 'FIREBASE_UPDATE_FAILED', 'Firebase update failed, changes rolled back');
                }
            } else {
                console.log('[AISentimentAPI] ⚠️ Firebase更新スキップ:', { 
                    isFirebaseInitialized,
                    hasAdminDatabase: !!adminDatabase,
                    hasFirebaseId: !!opinion.firebaseId
                });
                firebaseUpdateSuccessful = true; // Firebase無効時は成功とみなす
            }
            
            // 成功レスポンス
            res.json({
                success: true,
                opinionId,
                status: 'updated',
                analysis: {
                    sentiment: analysisResult.sentiment,
                    confidence: analysisResult.confidence,
                    reasoning: analysisResult.reasoning,
                    dbSentiment: dbSentiment,
                    analyzedAt: new Date().toISOString()
                },
                database: {
                    sqlite: { updated: sqlUpdateSuccessful },
                    firebase: { 
                        updated: firebaseUpdateSuccessful,
                        available: isFirebaseInitialized && !!adminDatabase,
                        hasFirebaseId: !!opinion.firebaseId
                    }
                },
                metadata: {
                    phase: 'phase3-database-update',
                    databaseUpdated: true,
                    forceUpdate: forceUpdate
                }
            });
            
        } catch (error) {
            console.error('[AISentimentAPI] ❌ 更新エラー:', error);
            
            // SQLite更新が成功していた場合はロールバック
            if (sqlUpdateSuccessful) {
                try {
                    console.log('[AISentimentAPI] 🔄 エラー時SQLite更新ロールバック開始:', { opinionId });
                    await prisma.opinion.update({
                        where: { id: opinionId },
                        data: {
                            sentiment: originalSentiment,
                            analyzedAt: opinion.analyzedAt,
                            analysisStatus: opinion.analysisStatus
                        }
                    });
                    console.log('[AISentimentAPI] ✅ エラー時SQLite更新ロールバック完了');
                } catch (rollbackError) {
                    console.error('[AISentimentAPI] ❌ ロールバックエラー:', rollbackError);
                }
            }
            
            throw error;
        }
        
    } catch (error) {
        console.error('[AISentimentAPI] ❌ 単一意見更新エラー:', error);
        next(error);
    }
});

/**
 * POST /api/ai-sentiment/update-batch
 * プロジェクト内複数意見の一括AI sentiment分析とデータベース更新
 * 
 * Request Body:
 * {
 *   "projectId": "project-id-string",
 *   "opinionIds": ["id1", "id2", ...], // オプション、未指定時は全意見
 *   "forceUpdate": false, // オプション、既存の分析結果を強制更新
 *   "limit": 50 // オプション、最大処理件数
 * }
 */
router.post('/update-batch', async (req: AuthenticatedRequest, res, next) => {
    try {
        const userId = req.userId!;
        const { projectId, opinionIds, forceUpdate = false, limit = 50 } = req.body;
        
        console.log('[AISentimentAPI] 🔄 一括意見更新開始:', { 
            userId, 
            projectId,
            opinionIdsCount: opinionIds?.length || 'all',
            forceUpdate,
            limit,
            timestamp: new Date().toISOString() 
        });
        
        // 機能有効性チェック
        if (process.env.EMERGENCY_DISABLE_AI_SENTIMENT === 'true') {
            throw new AppError(503, 'SERVICE_DISABLED', 'AI sentiment analysis is temporarily disabled');
        }
        
        if (process.env.ENABLE_AI_SENTIMENT !== 'true') {
            throw new AppError(503, 'SERVICE_DISABLED', 'AI sentiment analysis is not enabled');
        }
        
        // 入力検証
        if (!projectId) {
            throw new AppError(400, 'MISSING_PROJECT_ID', 'Project ID is required');
        }
        
        if (limit > 100) {
            throw new AppError(400, 'LIMIT_TOO_HIGH', 'Limit cannot exceed 100 opinions per request');
        }
        
        // プロジェクト確認
        const project = await prisma.project.findFirst({
            where: {
                OR: [
                    { id: projectId, userId },
                    { firebaseId: projectId, userId }
                ]
            }
        });
        
        if (!project) {
            throw new AppError(404, 'PROJECT_NOT_FOUND', 'Project not found or access denied');
        }
        
        // 対象意見取得
        const whereClause: any = { projectId: project.id };
        
        if (opinionIds && opinionIds.length > 0) {
            whereClause.id = { in: opinionIds };
        } else if (!forceUpdate) {
            // 強制更新が無効の場合は、未分析の意見のみ対象
            whereClause.sentiment = 'NEUTRAL';
        }
        
        const opinions = await prisma.opinion.findMany({
            where: whereClause,
            take: limit,
            orderBy: { submittedAt: 'desc' }
        });
        
        console.log('[AISentimentAPI] 📄 対象意見取得完了:', { 
            totalCount: opinions.length,
            alreadyAnalyzed: opinions.filter(o => o.sentiment !== 'NEUTRAL').length,
            needsAnalysis: opinions.filter(o => o.sentiment === 'NEUTRAL').length
        });
        
        if (opinions.length === 0) {
            return res.json({
                success: true,
                projectId,
                status: 'completed',
                analysis: {
                    totalOpinions: 0,
                    processedOpinions: 0,
                    updatedOpinions: 0,
                    skippedOpinions: 0,
                    results: []
                },
                database: {
                    sqlite: { totalUpdated: 0 },
                    firebase: { totalUpdated: 0 }
                },
                metadata: {
                    phase: 'phase3-database-update',
                    databaseUpdated: false,
                    processingTime: 0
                }
            });
        }
        
        // 一括更新処理
        const startTime = Date.now();
        const aiManager = AIServiceManager.getInstance();
        const updateResults = [];
        let totalUpdated = 0;
        let totalSkipped = 0;
        let totalErrors = 0;
        
        for (let i = 0; i < opinions.length; i++) {
            const opinion = opinions[i];
            
            try {
                console.log(`[AISentimentAPI] 🔄 意見分析中 (${i + 1}/${opinions.length}):`, { 
                    opinionId: opinion.id,
                    progress: `${Math.round((i + 1) / opinions.length * 100)}%`
                });
                
                // 既存分析結果確認
                if (opinion.sentiment !== 'NEUTRAL' && !forceUpdate) {
                    console.log('[AISentimentAPI] ⚠️ 既存分析結果スキップ:', { 
                        opinionId: opinion.id,
                        currentSentiment: opinion.sentiment
                    });
                    
                    updateResults.push({
                        opinionId: opinion.id,
                        status: 'skipped',
                        reason: 'Already analyzed',
                        current: {
                            sentiment: opinion.sentiment,
                            analyzedAt: opinion.analyzedAt
                        }
                    });
                    
                    totalSkipped++;
                    continue;
                }
                
                // AI分析実行
                const analysisResult = await aiManager.analyzeSentiment(opinion.content, {
                    language: 'ja',
                    model: 'claude-3-5-sonnet-20241022'
                });
                
                // Sentiment値をデータベース形式に変換
                const dbSentiment = analysisResult.sentiment === 'positive' ? 'POSITIVE' : 
                                   analysisResult.sentiment === 'negative' ? 'NEGATIVE' : 'NEUTRAL';
                
                let sqlUpdateSuccessful = false;
                let firebaseUpdateSuccessful = false;
                const originalSentiment = opinion.sentiment;
                
                try {
                    // SQLite更新
                    await prisma.opinion.update({
                        where: { id: opinion.id },
                        data: {
                            sentiment: dbSentiment,
                            analyzedAt: new Date(),
                            analysisStatus: 'analyzed'
                        }
                    });
                    
                    sqlUpdateSuccessful = true;
                    
                    // Firebase更新（Firebase接続が有効で、firebaseIdが存在する場合のみ）
                    if (isFirebaseInitialized && adminDatabase && opinion.firebaseId) {
                        try {
                            const firebaseData = {
                                sentiment: dbSentiment,
                                analyzedAt: new Date().toISOString(),
                                analysisStatus: 'analyzed'
                            };
                            
                            const firebaseRef = adminDatabase.ref(`users/${userId}/projects/${project.firebaseId}/responses/${opinion.firebaseId}`);
                            await firebaseRef.update(firebaseData);
                            
                            firebaseUpdateSuccessful = true;
                            
                        } catch (firebaseError) {
                            console.error('[AISentimentAPI] ❌ Firebase更新エラー:', { 
                                opinionId: opinion.id,
                                error: firebaseError
                            });
                            
                            // Firebase更新失敗時はSQLite更新をロールバック
                            await prisma.opinion.update({
                                where: { id: opinion.id },
                                data: {
                                    sentiment: originalSentiment,
                                    analyzedAt: opinion.analyzedAt,
                                    analysisStatus: opinion.analysisStatus
                                }
                            });
                            
                            throw firebaseError;
                        }
                    } else {
                        firebaseUpdateSuccessful = true; // Firebase無効時は成功とみなす
                    }
                    
                    // 成功結果記録
                    updateResults.push({
                        opinionId: opinion.id,
                        status: 'updated',
                        analysis: {
                            sentiment: analysisResult.sentiment,
                            confidence: analysisResult.confidence,
                            dbSentiment: dbSentiment,
                            analyzedAt: new Date().toISOString()
                        },
                        database: {
                            sqlite: { updated: sqlUpdateSuccessful },
                            firebase: { 
                                updated: firebaseUpdateSuccessful,
                                available: isFirebaseInitialized && !!adminDatabase,
                                hasFirebaseId: !!opinion.firebaseId
                            }
                        }
                    });
                    
                    totalUpdated++;
                    console.log(`[AISentimentAPI] ✅ 意見更新完了 (${i + 1}/${opinions.length}):`, { 
                        opinionId: opinion.id,
                        sentiment: analysisResult.sentiment,
                        dbSentiment: dbSentiment
                    });
                    
                } catch (updateError) {
                    console.error('[AISentimentAPI] ❌ 個別意見更新エラー:', { 
                        opinionId: opinion.id,
                        error: updateError
                    });
                    
                    // SQLite更新が成功していた場合はロールバック
                    if (sqlUpdateSuccessful) {
                        try {
                            await prisma.opinion.update({
                                where: { id: opinion.id },
                                data: {
                                    sentiment: originalSentiment,
                                    analyzedAt: opinion.analyzedAt,
                                    analysisStatus: opinion.analysisStatus
                                }
                            });
                        } catch (rollbackError) {
                            console.error('[AISentimentAPI] ❌ ロールバックエラー:', rollbackError);
                        }
                    }
                    
                    // エラー結果記録
                    updateResults.push({
                        opinionId: opinion.id,
                        status: 'error',
                        error: updateError instanceof Error ? updateError.message : 'Unknown error',
                        analysis: {
                            sentiment: analysisResult.sentiment,
                            confidence: analysisResult.confidence
                        }
                    });
                    
                    totalErrors++;
                }
                
            } catch (error) {
                console.error('[AISentimentAPI] ❌ 個別意見分析エラー:', { 
                    opinionId: opinion.id,
                    error: error instanceof Error ? error.message : 'Unknown error'
                });
                
                // AI分析エラー結果記録
                updateResults.push({
                    opinionId: opinion.id,
                    status: 'error',
                    error: error instanceof Error ? error.message : 'Unknown error',
                    reason: 'AI analysis failed'
                });
                
                totalErrors++;
            }
        }
        
        const processingTime = Date.now() - startTime;
        
        // 集計統計計算
        const successfulResults = updateResults.filter(r => r.status === 'updated');
        const summary = {
            positive: successfulResults.filter(r => r.analysis?.sentiment === 'positive').length,
            negative: successfulResults.filter(r => r.analysis?.sentiment === 'negative').length,
            neutral: successfulResults.filter(r => r.analysis?.sentiment === 'neutral').length
        };
        
        console.log('[AISentimentAPI] ✅ 一括更新完了:', { 
            totalOpinions: opinions.length,
            totalUpdated,
            totalSkipped,
            totalErrors,
            summary,
            processingTime
        });
        
        // 結果返却
        res.json({
            success: true,
            projectId,
            status: 'completed',
            analysis: {
                totalOpinions: opinions.length,
                processedOpinions: totalUpdated + totalSkipped + totalErrors,
                updatedOpinions: totalUpdated,
                skippedOpinions: totalSkipped,
                errorOpinions: totalErrors,
                results: updateResults,
                summary
            },
            database: {
                sqlite: { totalUpdated },
                firebase: { 
                    totalUpdated,
                    available: isFirebaseInitialized && !!adminDatabase
                }
            },
            metadata: {
                phase: 'phase3-database-update',
                databaseUpdated: totalUpdated > 0,
                forceUpdate: forceUpdate,
                processingTime,
                analyzedAt: new Date().toISOString()
            }
        });
        
    } catch (error) {
        console.error('[AISentimentAPI] ❌ 一括意見更新エラー:', error);
        next(error);
    }
});

export default router;