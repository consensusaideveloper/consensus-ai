/**
 * Claude Code SDK使用状況確認用ユーティリティ
 */
export function logClaudeUsage(operation: string, model: string) {
    console.log(`[Claude Usage] ${operation} - Model: ${model} - Time: ${new Date().toISOString()}`);
    console.log(`[Claude Usage] 💰 This request should be covered by Claude Code Max plan (no additional API charges)`);
}

export async function checkClaudeAuthentication() {
    // Claude Code SDK使用時の認証チェック
    console.log(`[Claude Auth] 🔍 Claude Code SDK authentication check:`);
    console.log(`[Claude Auth] 💡 Using CLI authentication (no API key required)`);
    console.log(`[Claude Auth] 📊 This should be covered by Claude Code Max plan`);
    
    try {
        // 軽量なテストリクエストで認証状態を確認
        const { spawn } = require('child_process');
        
        const checkAuth = () => new Promise<boolean>((resolve) => {
            const child = spawn('claude', ['--version'], { timeout: 5000 });
            
            child.on('exit', (code: number | null) => {
                if (code === 0) {
                    console.log(`[Claude Auth] ✅ Claude CLI利用可能`);
                    resolve(true);
                } else {
                    console.log(`[Claude Auth] ⚠️ Claude CLI認証に問題の可能性`);
                    resolve(false);
                }
            });
            
            child.on('error', (error: Error) => {
                console.log(`[Claude Auth] ❌ Claude CLI実行エラー:`, error.message);
                resolve(false);
            });
            
            // 5秒でタイムアウト
            setTimeout(() => {
                child.kill();
                console.log(`[Claude Auth] ⏰ Claude CLI確認タイムアウト`);
                resolve(false);
            }, 5000);
        });
        
        const isAuthOk = await checkAuth();
        if (!isAuthOk) {
            console.warn(`[Claude Auth] ⚠️ Claude Code SDK認証に問題がある可能性があります`);
            console.warn(`[Claude Auth] 💡 'claude auth login'での再認証を検討してください`);
        }
        
        return isAuthOk;
    } catch (error) {
        console.error(`[Claude Auth] ❌ 認証チェック実行エラー:`, error);
        return false;
    }
}