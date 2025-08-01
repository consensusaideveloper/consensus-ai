require('dotenv').config();
const { database } = require('./dist/lib/firebase-admin.js');

async function detailedFirebaseCheck() {
  try {
    const userId = 'd7Py48dB7abiiaHPM2knakpdgha2';
    
    console.log('🔍 詳細Firebase調査開始');
    console.log('対象ユーザーID:', userId);
    console.log('====================================');
    
    // 1. ユーザールート全体確認
    console.log('\n📋 1. ユーザーデータ全体:');
    const userSnapshot = await database.ref(`users/${userId}`).once('value');
    if (userSnapshot.exists()) {
      const userData = userSnapshot.val();
      console.log('- ユーザー存在: ✅');
      console.log('- 全フィールド:', Object.keys(userData));
      console.log('- planHistory存在:', userData.hasOwnProperty('planHistory') ? '✅' : '❌');
      
      if (userData.planHistory) {
        console.log('- planHistory内容:', JSON.stringify(userData.planHistory, null, 2));
      }
    } else {
      console.log('- ユーザー存在: ❌');
    }
    
    // 2. planHistoryパス直接確認
    console.log('\n📋 2. planHistoryパス直接確認:');
    const planHistorySnapshot = await database.ref(`users/${userId}/planHistory`).once('value');
    console.log('- パス存在:', planHistorySnapshot.exists() ? '✅' : '❌');
    if (planHistorySnapshot.exists()) {
      console.log('- データ詳細:', JSON.stringify(planHistorySnapshot.val(), null, 2));
    }
    
    // 3. Firebase全体構造確認
    console.log('\n📋 3. Firebaseルート構造:');
    const rootSnapshot = await database.ref().limitToFirst(10).once('value');
    if (rootSnapshot.exists()) {
      console.log('- ルートキー:', Object.keys(rootSnapshot.val()));
    }
    
    // 4. users配下の構造確認
    console.log('\n📋 4. users配下の構造:');
    const usersSnapshot = await database.ref('users').limitToFirst(3).once('value');
    if (usersSnapshot.exists()) {
      const usersData = usersSnapshot.val();
      console.log('- 存在するユーザー数:', Object.keys(usersData).length);
      Object.keys(usersData).forEach(uid => {
        console.log(`  - ${uid}: フィールド [${Object.keys(usersData[uid]).join(', ')}]`);
        if (usersData[uid].planHistory) {
          console.log(`    📝 planHistory存在: ${Object.keys(usersData[uid].planHistory).length}件`);
        }
      });
    }
    
    // 5. Firebase接続状態確認
    console.log('\n📋 5. Firebase接続状態:');
    const connectedSnapshot = await database.ref('.info/connected').once('value');
    console.log('- 接続状態:', connectedSnapshot.val() ? '✅' : '❌');
    
    console.log('\n====================================');
    console.log('🔍 詳細調査完了');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ エラー:', error.message);
    console.error('スタックトレース:', error.stack);
    process.exit(1);
  }
}

detailedFirebaseCheck();