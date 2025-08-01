/**
 * Stripe CLI Development Helper
 * 
 * このスクリプトはStripe CLIを起動し、webhook signing secretを動的に.envファイルに設定します。
 * 開発段階でのローカルwebhook開発を簡単にするために作成されました。
 * 
 * 使用方法:
 *   npm run stripe:dev
 * 
 * 動作:
 *   1. stripe listen コマンドを実行
 *   2. 出力からwebhook signing secretを抽出
 *   3. .envファイルのSTRIPE_WEBHOOK_SECRETを更新
 *   4. サーバー再起動の案内を表示
 */

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const ENV_FILE_PATH = path.join(__dirname, '../.env');
const WEBHOOK_ENDPOINT = 'localhost:3001/api/stripe/webhook';

console.log('🚀 Stripe CLI Development Helper');
console.log('================================\n');

// .envファイルの存在確認
if (!fs.existsSync(ENV_FILE_PATH)) {
  console.error('❌ .env file not found:', ENV_FILE_PATH);
  process.exit(1);
}

console.log('📡 Starting Stripe CLI listener...');
console.log(`📍 Webhook endpoint: ${WEBHOOK_ENDPOINT}\n`);

// Stripe CLIプロセスを起動
const stripeProcess = spawn('stripe', ['listen', '--forward-to', WEBHOOK_ENDPOINT], {
  stdio: 'pipe'
});

let webhookSecretFound = false;

// Stripe CLIの出力を監視
stripeProcess.stdout.on('data', (data) => {
  const output = data.toString();
  console.log(output);

  // Webhook signing secretを抽出
  const secretMatch = output.match(/webhook signing secret is (whsec_[a-zA-Z0-9]+)/);
  
  if (secretMatch && !webhookSecretFound) {
    const webhookSecret = secretMatch[1];
    webhookSecretFound = true;
    
    console.log('\n🔑 Webhook signing secret detected!');
    console.log(`📝 Secret: ${webhookSecret}`);
    
    // .envファイルを更新
    updateEnvFile(webhookSecret);
  }
});

stripeProcess.stderr.on('data', (data) => {
  const errorOutput = data.toString();
  console.error('❌ Stripe CLI Error:', errorOutput);
});

stripeProcess.on('close', (code) => {
  if (code !== 0) {
    console.error(`\n❌ Stripe CLI exited with code ${code}`);
  } else {
    console.log('\n👋 Stripe CLI stopped.');
  }
});

// Ctrl+C での終了処理
process.on('SIGINT', () => {
  console.log('\n\n🛑 Stopping Stripe CLI...');
  stripeProcess.kill('SIGINT');
  process.exit(0);
});

/**
 * .envファイルのSTRIPE_WEBHOOK_SECRETを更新
 */
function updateEnvFile(webhookSecret) {
  try {
    // 現在の.envファイルを読み込み
    let envContent = fs.readFileSync(ENV_FILE_PATH, 'utf8');
    
    // STRIPE_WEBHOOK_SECRETの行を更新
    const webhookSecretRegex = /^STRIPE_WEBHOOK_SECRET=.*$/m;
    const newLine = `STRIPE_WEBHOOK_SECRET=${webhookSecret}`;
    
    if (webhookSecretRegex.test(envContent)) {
      // 既存の行を更新
      envContent = envContent.replace(webhookSecretRegex, newLine);
    } else {
      // 新しい行を追加
      envContent += `\n${newLine}\n`;
    }
    
    // ファイルに書き込み
    fs.writeFileSync(ENV_FILE_PATH, envContent);
    
    console.log('✅ Environment variable updated successfully!');
    console.log(`📄 File: ${ENV_FILE_PATH}`);
    console.log(`🔄 Please restart your server: npm run dev\n`);
    
    // サーバー再起動の案内
    console.log('🎯 Next steps:');
    console.log('   1. Open a new terminal');
    console.log('   2. Navigate to server directory: cd server');
    console.log('   3. Restart the server: npm run dev');
    console.log('   4. Test webhook functionality\n');
    
  } catch (error) {
    console.error('❌ Failed to update .env file:', error.message);
  }
}