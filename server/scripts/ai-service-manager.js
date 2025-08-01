#!/usr/bin/env node

/**
 * AI Service Manager CLI
 * 開発者向けAIサービス管理スクリプト
 */

const readline = require('readline');
const fs = require('fs');
const path = require('path');

// 環境設定
const ENV_FILE = path.join(__dirname, '../.env');
const SERVER_URL = process.env.SERVER_URL || 'http://localhost:3001';
const API_ENDPOINTS = {
    status: `${SERVER_URL}/api/developer/ai-service/status`,
    switch: `${SERVER_URL}/api/developer/ai-service/switch`,
    test: `${SERVER_URL}/api/developer/ai-service/test`,
    environment: `${SERVER_URL}/api/developer/environment`,
    reinitialize: `${SERVER_URL}/api/developer/ai-service/reinitialize`
};

// CLI インターフェース
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

console.log('🤖 AI Service Manager CLI');
console.log('============================');
console.log('開発者向けAIサービス管理ツール');
console.log('');

class AIServiceManager {
    constructor() {
        this.token = null;
        this.currentService = 'unknown';
    }

    // メインメニューを表示
    showMainMenu() {
        console.log('\\n📋 利用可能なコマンド:');
        console.log('1. サービス状態確認 (status)');
        console.log('2. サービス切り替え (switch)');
        console.log('3. サービステスト (test)');
        console.log('4. 環境変数確認 (env)');
        console.log('5. 環境変数編集 (edit-env)');
        console.log('6. サービス再初期化 (reinit)');
        console.log('7. 終了 (exit)');
        console.log('');

        rl.question('コマンドを選択してください (1-7): ', (answer) => {
            this.handleCommand(answer.trim());
        });
    }

    // コマンド処理
    async handleCommand(command) {
        try {
            switch (command) {
                case '1':
                case 'status':
                    await this.checkStatus();
                    break;
                case '2':
                case 'switch':
                    await this.switchService();
                    break;
                case '3':
                case 'test':
                    await this.testService();
                    break;
                case '4':
                case 'env':
                    await this.checkEnvironment();
                    break;
                case '5':
                case 'edit-env':
                    await this.editEnvironment();
                    break;
                case '6':
                case 'reinit':
                    await this.reinitializeService();
                    break;
                case '7':
                case 'exit':
                    console.log('👋 お疲れ様でした！');
                    rl.close();
                    return;
                default:
                    console.log('❌ 無効なコマンドです。');
                    break;
            }
        } catch (error) {
            console.error('❌ エラーが発生しました:', error.message);
        }

        // メニューに戻る
        setTimeout(() => this.showMainMenu(), 1000);
    }

    // サービス状態確認
    async checkStatus() {
        console.log('\\n🔍 AIサービス状態を確認中...');
        
        try {
            // 実際のAPIコールの代わりに、環境変数から推測
            const envVars = this.readEnvFile();
            const hasOpenAI = !!envVars.OPENAI_API_KEY;
            const useAiService = envVars.USE_AI_SERVICE || 'auto';
            const nodeEnv = envVars.NODE_ENV || 'development';
            
            console.log('📊 現在のサービス状態:');
            console.log(`   環境: ${nodeEnv}`);
            console.log(`   OpenAI API: ${hasOpenAI ? '✅ 設定済み' : '❌ 未設定'}`);
            console.log(`   Mock AI Service: ✅ 常時利用可能 (API不要)'}`);
            console.log(`   使用予定サービス: ${useAiService === 'mock' ? 'Mock AI Service' : useAiService === 'openai' ? 'OpenAI API' : 'Auto (開発:Mock, 本番:OpenAI)'}`);
            
            if (nodeEnv === 'development') {
                console.log('\\n💡 開発環境ではAPI不要のMock AI Serviceが利用できます');
            } else {
                console.log('\\n⚠️  本番環境ではOpenAI APIが使用されます');
            }
            
        } catch (error) {
            console.error('❌ 状態確認に失敗しました:', error.message);
        }
    }

    // サービス切り替え
    async switchService() {
        console.log('\\n🔄 AIサービス切り替え');
        console.log('1. Mock AI Service (API不要)');
        console.log('2. OpenAI API');
        console.log('3. 自動選択 (auto)');
        console.log('');

        rl.question('切り替え先を選択してください (1-3): ', (answer) => {
            const serviceMap = {
                '1': 'mock',
                '2': 'openai',  
                '3': 'auto'
            };

            const selectedService = serviceMap[answer.trim()];
            if (!selectedService) {
                console.log('❌ 無効な選択です。');
                return;
            }

            this.updateEnvironmentVariable('USE_AI_SERVICE', selectedService);
            console.log(`✅ サービスを ${selectedService === 'mock' ? 'Mock AI Service' : selectedService === 'openai' ? 'OpenAI API' : '自動選択'} に切り替えました`);
            console.log('💡 変更を反映するにはサーバーを再起動してください');
        });
    }

    // サービステスト
    async testService() {
        console.log('\\n🧪 AIサービステスト');
        
        rl.question('テスト用プロンプトを入力してください (空白でデフォルト): ', (prompt) => {
            const testPrompt = prompt.trim() || 'Test prompt - please respond with "Test successful"';
            
            console.log(`\\n📤 テスト実行中...`);
            console.log(`プロンプト: "${testPrompt}"`);
            console.log('💡 実際のテストにはサーバーが起動している必要があります');
            console.log('   curl コマンド例:');
            console.log(`   curl -X POST ${API_ENDPOINTS.test} \\\\`);
            console.log(`        -H "Content-Type: application/json" \\\\`);
            console.log(`        -H "x-user-id: test-user" \\\\`);
            console.log(`        -d '{"prompt": "${testPrompt}"}'`);
        });
    }

    // 環境変数確認
    async checkEnvironment() {
        console.log('\\n🔍 環境変数確認');
        
        try {
            const envVars = this.readEnvFile();
            
            console.log('📋 現在の設定:');
            console.log(`   NODE_ENV: ${envVars.NODE_ENV || '未設定'}`);
            console.log(`   USE_AI_SERVICE: ${envVars.USE_AI_SERVICE || '未設定'}`);
            console.log(`   OPENAI_API_KEY: ${envVars.OPENAI_API_KEY ? '設定済み (' + envVars.OPENAI_API_KEY.substring(0, 10) + '...)' : '未設定'}`);
            console.log(`   DATABASE_URL: ${envVars.DATABASE_URL || '未設定'}`);
            console.log(`   PORT: ${envVars.PORT || '3001 (デフォルト)'}`);
            
        } catch (error) {
            console.error('❌ 環境変数の読み込みに失敗しました:', error.message);
        }
    }

    // 環境変数編集
    async editEnvironment() {
        console.log('\\n📝 環境変数編集');
        console.log('編集可能な変数:');
        console.log('1. USE_AI_SERVICE');
        console.log('2. NODE_ENV');
        console.log('3. OPENAI_API_KEY');
        console.log('');

        rl.question('編集する変数を選択してください (1-3): ', (answer) => {
            const varMap = {
                '1': 'USE_AI_SERVICE',
                '2': 'NODE_ENV',
                '3': 'OPENAI_API_KEY'
            };

            const selectedVar = varMap[answer.trim()];
            if (!selectedVar) {
                console.log('❌ 無効な選択です。');
                return;
            }

            rl.question(`${selectedVar}の新しい値を入力してください: `, (newValue) => {
                this.updateEnvironmentVariable(selectedVar, newValue.trim());
                console.log(`✅ ${selectedVar} を更新しました`);
                console.log('💡 変更を反映するにはサーバーを再起動してください');
            });
        });
    }

    // サービス再初期化
    async reinitializeService() {
        console.log('\\n🔄 AIサービス再初期化');
        console.log('💡 実際の再初期化にはサーバーが起動している必要があります');
        console.log('   curl コマンド例:');
        console.log(`   curl -X POST ${API_ENDPOINTS.reinitialize} \\\\`);
        console.log(`        -H "Content-Type: application/json" \\\\`);
        console.log(`        -H "x-user-id: test-user"`);
    }

    // .envファイル読み込み
    readEnvFile() {
        try {
            const envContent = fs.readFileSync(ENV_FILE, 'utf8');
            const envVars = {};
            
            envContent.split('\\n').forEach(line => {
                const match = line.match(/^([^=]+)=(.*)$/);
                if (match) {
                    envVars[match[1]] = match[2].replace(/^"|"$/g, '');
                }
            });
            
            return envVars;
        } catch (error) {
            console.warn('⚠️ .envファイルが見つかりません');
            return {};
        }
    }

    // 環境変数更新
    updateEnvironmentVariable(key, value) {
        try {
            let envContent = '';
            try {
                envContent = fs.readFileSync(ENV_FILE, 'utf8');
            } catch (error) {
                // .envファイルが存在しない場合は新規作成
            }

            const lines = envContent.split('\\n');
            let updated = false;

            // 既存の設定を更新
            const newLines = lines.map(line => {
                if (line.startsWith(`${key}=`)) {
                    updated = true;
                    return `${key}="${value}"`;
                }
                return line;
            });

            // 新しい設定を追加
            if (!updated) {
                newLines.push(`${key}="${value}"`);
            }

            fs.writeFileSync(ENV_FILE, newLines.join('\\n'));
            
        } catch (error) {
            console.error('❌ 環境変数の更新に失敗しました:', error.message);
        }
    }
}

// CLI実行
const manager = new AIServiceManager();
manager.showMainMenu();