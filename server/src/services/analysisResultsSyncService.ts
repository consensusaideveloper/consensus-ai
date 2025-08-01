import { prisma } from '../lib/database';
import { TopicAnalysisResult } from './topicAnalysisService';
import { AppError } from '../middleware/errorHandler';
import { adminDatabase, isFirebaseInitialized } from '../lib/firebase-admin';

export class AnalysisResultsSyncService {
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
            console.log('[AnalysisSync] 🌐 ユーザー言語設定取得:', { userId: userId.substring(0, 8), language });
            return language;
        } catch (error) {
            console.warn('[AnalysisSync] ⚠️ ユーザー言語設定取得失敗、デフォルト(ja)を使用:', error);
            return 'ja';
        }
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
            statusReason: 'ステータス: {status}',
            actionManaged: 'アクション管理済み',
            defaultError: 'エラーが発生しました'
        };
    }

    /**
     * 英語メッセージ定義
     */
    private getEnglishMessages(): Record<string, string> {
        return {
            statusReason: 'Status: {status}',
            actionManaged: 'Action managed',
            defaultError: 'An error occurred'
        };
    }

    /**
     * 分析結果をFirebaseに同期する（CLAUDE.md要件対応）
     */
    async syncAnalysisResultsToFirebase(projectId: string): Promise<boolean> {
        console.log('[AnalysisSync] 🔄 Firebase同期実行開始:', projectId);

        // Phase 1-2 テスト: Firebase同期無効化チェック
        if (process.env.FIREBASE_DISABLE_SYNC === 'true') {
            console.log('[AnalysisSync] ⚠️ Firebase同期が無効化されています (検証用) - SQLiteのみに保存');
            return true;
        }

        try {
            if (!isFirebaseInitialized || !adminDatabase) {
                console.error('[AnalysisSync] ❌ Firebase未初期化');
                throw new AppError(500, 'FIREBASE_ERROR', 'Firebase is not initialized');
            }

            // 同期前にデータ整合性をチェック・修正
            console.log('[AnalysisSync] 🔍 同期前データ整合性チェック実行');
            try {
                const validationResult = await this.validateAndFixAnalysisHistoryData(projectId);
                if (validationResult.fixed > 0) {
                    console.log('[AnalysisSync] ✅ 同期前データ修正完了:', validationResult);
                }
            } catch (validationError) {
                console.warn('[AnalysisSync] ⚠️ データ整合性チェック失敗（同期続行）:', validationError);
            }

            // Firebaseプロジェクトの取得とユーザーID取得
            let firebaseProjectId = projectId;
            const project = await prisma.project.findUnique({ where: { id: projectId } });
            if (!project) {
                throw new AppError(404, 'PROJECT_NOT_FOUND', 'Project not found');
            }
            
            const userId = project.userId;
            const userLanguage = await this.getUserLanguage(userId);

            // 分析結果データを準備
            const syncData = await this.prepareAnalysisResultsForFirebase(projectId, userLanguage);
            if (!syncData) {
                console.log('[AnalysisSync] ⚠️ 同期対象データなし');
                return false;
            }
            if (!projectId.startsWith('-')) {
                firebaseProjectId = project.firebaseId || projectId;
            }

            // Firebase書き込みパスを決定（フロントエンドが期待するパス構造に合わせる）
            const analysisPath = `users/${userId}/projects/${firebaseProjectId}/analysis`;

            console.log('[AnalysisSync] 📝 Firebase書き込み開始:', {
                firebaseProjectId,
                analysisPath,
                topicsCount: Object.keys(syncData.analysisResults.topics).length,
                insightsCount: Object.keys(syncData.analysisResults.insights).length,
                analysisHistoryCount: Object.keys(syncData.analysisResults.analysisHistory).length
            });

            // トランザクション的にFirebaseに書き込み
            const updates: { [key: string]: any } = {};
            
            // 分析結果を書き込み（topics重複回避：analysisパスのみに保存）
            updates[analysisPath] = syncData.analysisResults;
            
            // プロジェクト直下のtopicsパスを削除して重複を回避
            const legacyTopicsPath = `users/${userId}/projects/${firebaseProjectId}/topics`;
            updates[legacyTopicsPath] = null;

            // Firebase更新実行
            await adminDatabase.ref().update(updates);

            // 同期成功後にSQLの同期情報を更新
            await this.updateSyncStatusAfterFirebaseSync(
                projectId, 
                Object.keys(syncData.analysisResults.analysisHistory),
                firebaseProjectId
            );

            console.log('[AnalysisSync] ✅ Firebase同期実行完了:', {
                updatesCount: Object.keys(updates).length,
                firebaseProjectId,
                note: 'topics重複回避：analysisパスのみに保存、legacy topicsパス削除'
            });

            return true;

        } catch (error) {
            console.error('[AnalysisSync] ❌ Firebase同期実行エラー:', error);
            throw new AppError(
                500,
                'FIREBASE_SYNC_ERROR',
                `Failed to sync analysis results to Firebase: ${error instanceof Error ? error.message : String(error)}`,
                error
            );
        }
    }

    /**
     * 分析結果をFirebaseフォーマットで準備する
     */
    async prepareAnalysisResultsForFirebase(projectId: string, userLanguage: string): Promise<any> {
        console.log('[AnalysisSync] 🔄 Firebase用分析結果準備開始:', projectId);

        try {
            // SQLiteから分析結果を取得（分析履歴も含む）
            const [topics, insights, analysisHistory] = await Promise.all([
                prisma.topic.findMany({
                    where: { projectId },
                    include: { opinions: true },
                    orderBy: { createdAt: 'desc' }
                }),
                prisma.insight.findMany({
                    where: { projectId },
                    orderBy: { createdAt: 'desc' }
                }),
                prisma.analysisHistory.findMany({
                    where: { projectId },
                    orderBy: { createdAt: 'desc' },
                    take: 10, // 最新10件の履歴を同期
                    select: {
                        id: true,
                        projectId: true,
                        analysisType: true,
                        opinionsProcessed: true,
                        newTopicsCreated: true,
                        updatedTopics: true,
                        executionTimeSeconds: true,
                        executedBy: true,
                        executionReason: true,
                        createdAt: true,
                        firebaseId: true,
                        syncStatus: true,
                        lastSyncAt: true
                    }
                })
            ]);

            if (topics.length === 0 && insights.length === 0) {
                console.log('[AnalysisSync] ⚠️ 同期する分析結果がありません');
                return null;
            }

            // Firebase形式のデータ構造を作成（分析履歴も含む）
            const firebaseData = {
                analysisResults: {
                    projectId,
                    lastUpdated: new Date().toISOString(),
                    topics: {} as { [key: string]: any },
                    insights: {} as { [key: string]: any },
                    analysisHistory: {} as { [key: string]: any },
                    // フロントエンドが期待するtopInsightsフィールドを追加
                    topInsights: [] as any[],
                    summary: {
                        topicsCount: topics.length,
                        insightsCount: insights.length,
                        totalOpinions: topics.reduce((sum, topic) => sum + topic.count, 0),
                        analysisHistoryCount: analysisHistory.length,
                        generatedAt: topics[0]?.createdAt?.toISOString() || new Date().toISOString()
                    },
                    // 分析実行時間を追加
                    executedAt: new Date().toISOString()
                }
            };

            // トピックをFirebase形式に変換（保護情報を含む）
            topics.forEach(topic => {
                const topicData = {
                    id: topic.id,
                    name: topic.name,
                    category: topic.category || null,
                    title: topic.name, // フロントエンドが期待するtitleフィールドを追加
                    count: topic.count,
                    summary: topic.summary,
                    description: topic.summary, // フロントエンドが期待するdescriptionフィールドを追加
                    status: topic.status,
                    createdAt: topic.createdAt.toISOString(),
                    updatedAt: topic.updatedAt.toISOString(),
                    // 改良版インクリメンタル分析用の保護情報
                    hasActiveActions: topic.hasActiveActions || false,
                    lastActionDate: topic.lastActionDate?.toISOString() || null,
                    isProtected: topic.status !== 'UNHANDLED' || topic.hasActiveActions || false,
                    protectionReason: topic.status !== 'UNHANDLED' 
                        ? this.getMultiLanguageMessage(userLanguage, 'statusReason', { status: topic.status }) 
                        : topic.hasActiveActions 
                            ? this.getMultiLanguageMessage(userLanguage, 'actionManaged') 
                            : null,
                    keywords: [], // キーワードフィールドを追加
                    sentiment: 'neutral', // センチメントフィールドを追加
                    opinions: topic.opinions.map(opinion => ({
                        id: opinion.id,
                        content: opinion.content,
                        submittedAt: opinion.submittedAt.toISOString(),
                        sentiment: opinion.sentiment,
                        characterCount: opinion.characterCount,
                        isBookmarked: opinion.isBookmarked
                    }))
                };
                
                // topicsオブジェクトに追加
                firebaseData.analysisResults.topics[topic.id] = topicData;
                
                // topInsightsにも追加（フロントエンドが期待する構造）
                firebaseData.analysisResults.topInsights.push(topicData);
            });

            // インサイトをFirebase形式に変換
            insights.forEach(insight => {
                firebaseData.analysisResults.insights[insight.id] = {
                    id: insight.id,
                    title: insight.title,
                    description: insight.description,
                    count: insight.count,
                    priority: insight.priority,
                    status: insight.status,
                    createdAt: insight.createdAt.toISOString(),
                    updatedAt: insight.updatedAt.toISOString()
                };
            });

            // 分析履歴をFirebase形式に変換（SQL側の全フィールドを完全同期）
            analysisHistory.forEach(history => {
                // フィールドの存在と値を検証して、不足がある場合はデフォルト値を設定
                const executedBy = history.executedBy && history.executedBy.trim() !== '' 
                    ? history.executedBy 
                    : 'system';
                const executionReason = history.executionReason && history.executionReason.trim() !== '' 
                    ? history.executionReason 
                    : 'auto';

                firebaseData.analysisResults.analysisHistory[history.id] = {
                    id: history.id,
                    projectId: history.projectId,
                    analysisType: history.analysisType,
                    opinionsProcessed: history.opinionsProcessed,
                    newTopicsCreated: history.newTopicsCreated || 0,
                    updatedTopics: history.updatedTopics || 0,
                    executionTimeSeconds: history.executionTimeSeconds || 0,
                    createdAt: history.createdAt.toISOString(),
                    // 不足フィールドの確実な設定（CLAUDE.md要件対応）
                    executedBy: executedBy,
                    executionReason: executionReason,
                    // 同期関連フィールド
                    firebaseId: history.firebaseId || null,
                    syncStatus: history.syncStatus || 'pending',
                    lastSyncAt: history.lastSyncAt ? history.lastSyncAt.toISOString() : new Date().toISOString()
                };
                
                // デフォルト値を使用した場合はログ出力
                if (history.executedBy !== executedBy || history.executionReason !== executionReason) {
                    console.log('[AnalysisSync] 🔧 Firebase同期時にデフォルト値を適用:', {
                        historyId: history.id,
                        originalExecutedBy: history.executedBy,
                        appliedExecutedBy: executedBy,
                        originalExecutionReason: history.executionReason,
                        appliedExecutionReason: executionReason
                    });
                }
            });

            console.log('[AnalysisSync] ✅ Firebase用分析結果準備完了:', {
                topicsCount: topics.length,
                insightsCount: insights.length,
                analysisHistoryCount: analysisHistory.length,
                totalItems: topics.length + insights.length + analysisHistory.length
            });

            // 分析履歴の詳細をログ出力（安全な方法）
            if (analysisHistory.length > 0) {
                console.log('[AnalysisSync] 📝 分析履歴詳細:', analysisHistory.map(h => ({
                    id: h.id,
                    analysisType: h.analysisType,
                    opinionsProcessed: h.opinionsProcessed,
                    newTopicsCreated: h.newTopicsCreated
                })));
            } else {
                console.log('[AnalysisSync] ⚠️ 分析履歴が見つかりません');
            }

            return firebaseData;

        } catch (error) {
            console.error('[AnalysisSync] ❌ Firebase用分析結果準備エラー:', error);
            throw new AppError(
                500,
                'ANALYSIS_SYNC_PREPARE_ERROR',
                'Failed to prepare analysis results for Firebase sync',
                error
            );
        }
    }

    /**
     * 分析結果の同期ステータスを更新
     */
    async updateSyncStatus(projectId: string, status: 'pending' | 'synced' | 'error', error?: string): Promise<void> {
        try {
            await prisma.project.update({
                where: { id: projectId },
                data: {
                    syncStatus: status,
                    lastSyncAt: new Date(),
                    updatedAt: new Date()
                }
            });

            console.log('[AnalysisSync] 📝 同期ステータス更新:', { projectId, status });

        } catch (updateError) {
            console.error('[AnalysisSync] ❌ 同期ステータス更新エラー:', updateError);
        }
    }

    /**
     * 分析結果が存在するかチェック
     */
    async hasAnalysisResults(projectId: string): Promise<boolean> {
        try {
            const [topicsCount, insightsCount] = await Promise.all([
                prisma.topic.count({ where: { projectId } }),
                prisma.insight.count({ where: { projectId } })
            ]);

            return topicsCount > 0 || insightsCount > 0;
        } catch (error) {
            console.error('[AnalysisSync] ❌ 分析結果存在チェックエラー:', error);
            return false;
        }
    }

    /**
     * 古い分析結果をクリーンアップ
     */
    async cleanupOldAnalysisResults(projectId: string, keepLatestCount: number = 3): Promise<void> {
        try {
            console.log('[AnalysisSync] 🧹 古い分析結果のクリーンアップ開始:', projectId);

            // 最新のN件を残して古いトピックを削除
            const oldTopics = await prisma.topic.findMany({
                where: { projectId },
                orderBy: { createdAt: 'desc' },
                skip: keepLatestCount,
                select: { id: true }
            });

            if (oldTopics.length > 0) {
                const topicIds = oldTopics.map(t => t.id);
                await prisma.topic.deleteMany({
                    where: { id: { in: topicIds } }
                });
                console.log('[AnalysisSync] 🗑️ 古いトピックを削除:', oldTopics.length, '件');
            }

            // 最新のN件を残して古いインサイトを削除
            const oldInsights = await prisma.insight.findMany({
                where: { projectId },
                orderBy: { createdAt: 'desc' },
                skip: keepLatestCount,
                select: { id: true }
            });

            if (oldInsights.length > 0) {
                const insightIds = oldInsights.map(i => i.id);
                await prisma.insight.deleteMany({
                    where: { id: { in: insightIds } }
                });
                console.log('[AnalysisSync] 🗑️ 古いインサイトを削除:', oldInsights.length, '件');
            }

        } catch (error) {
            console.error('[AnalysisSync] ❌ 古い分析結果クリーンアップエラー:', error);
        }
    }

    /**
     * プロジェクトの全分析結果を削除
     */
    async deleteAllAnalysisResults(projectId: string): Promise<void> {
        try {
            console.log('[AnalysisSync] 🗑️ プロジェクトの全分析結果削除:', projectId);

            await Promise.all([
                prisma.topic.deleteMany({ where: { projectId } }),
                prisma.insight.deleteMany({ where: { projectId } })
            ]);

            console.log('[AnalysisSync] ✅ プロジェクトの全分析結果削除完了');

        } catch (error) {
            console.error('[AnalysisSync] ❌ 分析結果削除エラー:', error);
            throw new AppError(
                500,
                'ANALYSIS_DELETE_ERROR',
                'Failed to delete analysis results',
                error
            );
        }
    }

    /**
     * 分析結果の統計情報を取得
     */
    async getAnalysisResultsStats(projectId?: string): Promise<any> {
        try {
            const whereClause = projectId ? { projectId } : {};

            const [topicsCount, insightsCount, projectsWithAnalysis] = await Promise.all([
                prisma.topic.count({ where: whereClause }),
                prisma.insight.count({ where: whereClause }),
                prisma.project.count({
                    where: {
                        ...whereClause,
                        OR: [
                            { topics: { some: {} } },
                            { insights: { some: {} } }
                        ]
                    }
                })
            ]);

            return {
                totalTopics: topicsCount,
                totalInsights: insightsCount,
                projectsWithAnalysis,
                timestamp: new Date().toISOString()
            };

        } catch (error) {
            console.error('[AnalysisSync] ❌ 分析結果統計取得エラー:', error);
            throw new AppError(
                500,
                'ANALYSIS_STATS_ERROR',
                'Failed to get analysis results statistics',
                error
            );
        }
    }

    /**
     * 分析履歴データの整合性をチェック・修正する
     */
    async validateAndFixAnalysisHistoryData(projectId?: string): Promise<{ fixed: number, checked: number }> {
        try {
            console.log('[AnalysisSync] 🔍 分析履歴データ整合性チェック開始:', { projectId });

            const whereClause = projectId ? { projectId } : {};
            
            // 不完全なレコードを検索
            const incompleteRecords = await prisma.analysisHistory.findMany({
                where: {
                    ...whereClause,
                    OR: [
                        { executedBy: null },
                        { executionReason: null },
                        { executedBy: '' },
                        { executionReason: '' }
                    ]
                },
                select: {
                    id: true,
                    executedBy: true,
                    executionReason: true
                }
            });

            console.log('[AnalysisSync] 📊 不完全レコード検出:', {
                count: incompleteRecords.length,
                ids: incompleteRecords.map(r => r.id)
            });

            let fixedCount = 0;

            // 不完全なレコードを修正
            for (const record of incompleteRecords) {
                const updateData: any = {};
                
                if (!record.executedBy || record.executedBy.trim() === '') {
                    updateData.executedBy = 'system'; // デフォルト値
                }
                
                if (!record.executionReason || record.executionReason.trim() === '') {
                    updateData.executionReason = 'auto'; // デフォルト値
                }

                if (Object.keys(updateData).length > 0) {
                    await prisma.analysisHistory.update({
                        where: { id: record.id },
                        data: {
                            ...updateData,
                            lastSyncAt: new Date(), // 修正したので同期情報も更新
                            syncStatus: 'pending' // Firebase再同期が必要
                        }
                    });
                    fixedCount++;
                    
                    console.log('[AnalysisSync] ✅ レコード修正完了:', {
                        id: record.id,
                        updates: updateData
                    });
                }
            }

            // 全体の統計
            const totalRecords = await prisma.analysisHistory.count({ where: whereClause });

            console.log('[AnalysisSync] ✅ 分析履歴データ整合性チェック完了:', {
                totalChecked: totalRecords,
                incompleteFound: incompleteRecords.length,
                fixed: fixedCount
            });

            return { fixed: fixedCount, checked: totalRecords };

        } catch (error) {
            console.error('[AnalysisSync] ❌ 分析履歴データ整合性チェックエラー:', error);
            throw new AppError(
                500,
                'DATA_VALIDATION_ERROR',
                'Failed to validate analysis history data',
                error
            );
        }
    }

    /**
     * Firebase同期後にSQLの同期情報を更新
     */
    private async updateSyncStatusAfterFirebaseSync(
        projectId: string, 
        analysisHistoryIds: string[],
        firebaseProjectId: string
    ): Promise<void> {
        try {
            console.log('[AnalysisSync] 🔄 Firebase同期後のSQL同期情報更新開始');

            const now = new Date();

            // 分析履歴のfirebaseIdとlastSyncAtを更新
            if (analysisHistoryIds.length > 0) {
                await prisma.analysisHistory.updateMany({
                    where: { 
                        id: { in: analysisHistoryIds },
                        projectId: projectId
                    },
                    data: {
                        firebaseId: firebaseProjectId,
                        syncStatus: 'completed',
                        lastSyncAt: now
                    }
                });

                console.log('[AnalysisSync] ✅ 分析履歴同期情報更新完了:', {
                    analysisHistoryIds: analysisHistoryIds.length,
                    firebaseProjectId,
                    updatedAt: now.toISOString()
                });
            }

        } catch (error) {
            console.error('[AnalysisSync] ❌ Firebase同期後のSQL同期情報更新エラー:', error);
            // エラーがあってもFirebase同期は成功しているので、例外は投げない
        }
    }

    /**
     * 分析結果をFirebaseに同期する（公開メソッド - analysis.tsから呼び出し用）
     * 
     * @param projectId プロジェクトID
     * @param userId ユーザーID（使用しないが互換性のため保持）
     * @param result 分析結果（使用しないが互換性のため保持）
     */
    async syncAnalysisResults(projectId: string, userId?: string, result?: TopicAnalysisResult): Promise<void> {
        console.log('[AnalysisSync] 🔄 公開メソッド syncAnalysisResults 実行開始:', {
            projectId,
            userId: userId?.substring(0, 8),
            hasResult: !!result
        });

        try {
            const success = await this.syncAnalysisResultsToFirebase(projectId);
            
            if (!success) {
                throw new AppError(
                    500,
                    'FIREBASE_SYNC_FAILED',
                    'Failed to sync analysis results to Firebase'
                );
            }

            await this.updateSyncStatus(projectId, 'synced');
            console.log('[AnalysisSync] ✅ 公開メソッド syncAnalysisResults 実行完了');

        } catch (error) {
            await this.updateSyncStatus(projectId, 'error', error instanceof Error ? error.message : String(error));
            console.error('[AnalysisSync] ❌ 公開メソッド syncAnalysisResults 実行エラー:', error);
            throw error;
        }
    }
}