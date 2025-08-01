/**
 * API通信テスト用ユーティリティ
 * AI分析機能のログ出力とAPI通信状況を確認するためのテスト関数
 */

import { AIService } from '../services/aiService';

export async function testOpenAIConnection(): Promise<void> {
    console.log('\n=== OpenAI API 接続テスト開始 ===');
    console.log('時刻:', new Date().toISOString());

    try {
        const aiService = new AIService();
        
        console.log('\n[Test] 🧪 簡単なテストプロンプトでAPI接続確認中...');
        
        const testPrompt = 'こんにちは。このメッセージは API接続テストです。"接続成功"と短く返答してください。';
        
        const result = await aiService.generateResponse(testPrompt, 'gpt-4.1-nano');
        
        console.log('\n[Test] ✅ OpenAI API接続テスト成功!');
        console.log('[Test] レスポンス概要:', {
            id: result.id,
            model: result.model,
            contentLength: result.content.length,
            content: result.content.substring(0, 100)
        });
        
    } catch (error) {
        console.error('\n[Test] ❌ OpenAI API接続テスト失敗:');
        console.error('[Test] エラー詳細:', {
            message: error instanceof Error ? error.message : 'Unknown error',
            stack: error instanceof Error ? error.stack : undefined
        });
        
        // よくあるエラーの対処法を表示
        if (error instanceof Error) {
            if (error.message.includes('API_KEY')) {
                console.error('\n[Test] 💡 対処法: 環境変数 OPENAI_API_KEY が正しく設定されているか確認してください');
            } else if (error.message.includes('401')) {
                console.error('\n[Test] 💡 対処法: APIキーが無効です。OpenAIダッシュボードで確認してください');
            } else if (error.message.includes('429')) {
                console.error('\n[Test] 💡 対処法: レート制限に達しました。しばらく待ってから再試行してください');
            } else if (error.message.includes('UNSUPPORTED_MODEL')) {
                console.error('\n[Test] 💡 対処法: o3モデルが利用可能か確認してください');
            }
        }
    }
    
    console.log('\n=== OpenAI API 接続テスト終了 ===\n');
}

export function logSystemInfo(): void {
    console.log('\n=== システム情報 ===');
    console.log('Node.js バージョン:', process.version);
    console.log('プラットフォーム:', process.platform);
    console.log('環境:', process.env.NODE_ENV || 'development');
    console.log('プロセスID:', process.pid);
    console.log('稼働時間:', Math.round(process.uptime()), '秒');
    
    console.log('\n=== 環境変数確認 ===');
    console.log('OPENAI_API_KEY 設定状況:', process.env.OPENAI_API_KEY ? '✅ 設定済み' : '❌ 未設定');
    console.log('DATABASE_URL 設定状況:', process.env.DATABASE_URL ? '✅ 設定済み' : '❌ 未設定');
    console.log('PORT 設定:', process.env.PORT || '3000 (デフォルト)');
    
    if (process.env.OPENAI_API_KEY) {
        const apiKey = process.env.OPENAI_API_KEY;
        console.log('APIキー長さ:', apiKey.length);
        console.log('APIキー形式チェック:', apiKey.startsWith('sk-') ? '✅ 正常' : '⚠️ 異常');
    }
    
    console.log('\n=== メモリ使用状況 ===');
    const memUsage = process.memoryUsage();
    console.log('ヒープ使用量:', Math.round(memUsage.heapUsed / 1024 / 1024), 'MB');
    console.log('ヒープ合計:', Math.round(memUsage.heapTotal / 1024 / 1024), 'MB');
    console.log('外部メモリ:', Math.round(memUsage.external / 1024 / 1024), 'MB');
    console.log('===================\n');
}

export async function testAnalysisFlow(opinions: string[]): Promise<void> {
    console.log('\n=== AI分析フローテスト開始 ===');
    
    if (!opinions || opinions.length === 0) {
        console.error('[Test] ❌ 分析対象の意見が提供されていません');
        return;
    }
    
    try {
        const aiService = new AIService();
        
        const analysisPrompt = `
以下の意見・フィードバックを分析し、主要なトピックを特定してください。
日本語で回答し、以下のJSON形式で結果を返してください：

{
  "topics": [
    {
      "name": "トピック名",
      "summary": "トピックの概要説明",
      "keywords": ["キーワード1", "キーワード2"],
      "priority": "high/medium/low"
    }
  ],
  "insights": [
    {
      "title": "インサイトのタイトル",
      "description": "詳細な説明",
      "priority": "high/medium/low"
    }
  ],
  "summary": "全体的な分析サマリー"
}

意見データ:
${opinions.join('\n\n')}
`;

        console.log('[Test] 🧪 AI分析フローテスト実行中...');
        console.log('[Test] 意見数:', opinions.length);
        
        const result = await aiService.generateResponse(analysisPrompt);
        
        console.log('[Test] ✅ AI分析レスポンス受信成功');
        
        try {
            const analysisData = JSON.parse(result.content);
            console.log('[Test] ✅ JSON解析成功');
            console.log('[Test] 分析結果概要:', {
                topicsCount: analysisData.topics?.length || 0,
                insightsCount: analysisData.insights?.length || 0,
                hasSummary: !!analysisData.summary
            });
        } catch (parseError) {
            console.error('[Test] ❌ JSON解析エラー:', parseError);
            console.log('[Test] 生のレスポンス:', result.content.substring(0, 200));
        }
        
    } catch (error) {
        console.error('[Test] ❌ AI分析フローテスト失敗:', error);
    }
    
    console.log('=== AI分析フローテスト終了 ===\n');
}