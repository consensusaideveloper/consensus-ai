require('dotenv').config();
const { database } = require('./dist/lib/firebase-admin.js');

async function immediateCheck() {
  try {
    const userId = 'test_execution_order_fix_1753771980';
    const historyId = 'cmdo40oq3000hvhdwl74w62cx';
    
    console.log('🔍 即座のFirebase確認開始');
    console.log('対象ユーザーID:', userId);
    console.log('対象履歴ID:', historyId);
    console.log('====================================');
    
    // 1. 特定のplanHistoryレコード確認
    console.log('\n📋 1. 特定planHistoryレコード確認:');
    const specificPath = `users/${userId}/planHistory/${historyId}`;
    console.log('確認パス:', specificPath);
    
    const specificSnapshot = await database.ref(specificPath).once('value');
    console.log('- 存在:', specificSnapshot.exists() ? '✅' : '❌');
    if (specificSnapshot.exists()) {
      console.log('- データ:', JSON.stringify(specificSnapshot.val(), null, 2));
    }
    
    // 2. planHistory配下全体確認
    console.log('\n📋 2. planHistory配下全体:');
    const planHistoryPath = `users/${userId}/planHistory`;
    const planHistorySnapshot = await database.ref(planHistoryPath).once('value');
    console.log('- planHistory存在:', planHistorySnapshot.exists() ? '✅' : '❌');
    if (planHistorySnapshot.exists()) {
      const data = planHistorySnapshot.val();
      console.log('- 履歴件数:', Object.keys(data).length);
      console.log('- 全データ:', JSON.stringify(data, null, 2));
    }
    
    // 3. ユーザー全体構造確認
    console.log('\n📋 3. ユーザー全体構造:');
    const userSnapshot = await database.ref(`users/${userId}`).once('value');
    if (userSnapshot.exists()) {
      const userData = userSnapshot.val();
      console.log('- ユーザー存在: ✅');
      console.log('- 全フィールド:', Object.keys(userData));
      console.log('- planHistory存在:', userData.hasOwnProperty('planHistory') ? '✅' : '❌');
      
      if (userData.planHistory) {
        console.log('- planHistory詳細:', JSON.stringify(userData.planHistory, null, 2));
      }
    } else {
      console.log('- ユーザー存在: ❌');
    }
    
    // 4. データベース全体での検索試行
    console.log('\n📋 4. データベース全体検索:');
    try {
      const allUsersSnapshot = await database.ref('users').once('value');
      if (allUsersSnapshot.exists()) {
        const allUsers = allUsersSnapshot.val();
        let totalPlanHistoryCount = 0;
        
        Object.keys(allUsers).forEach(uid => {
          if (allUsers[uid].planHistory) {
            totalPlanHistoryCount += Object.keys(allUsers[uid].planHistory).length;
            if (uid === userId) {
              console.log(`- 対象ユーザー(${uid})のplanHistory: ${Object.keys(allUsers[uid].planHistory).length}件`);
            }
          }
        });
        
        console.log('- 全体planHistory合計:', totalPlanHistoryCount);
      }
    } catch (searchError) {
      console.log('- 全体検索失敗:', searchError.message);
    }
    
    console.log('\n====================================');
    console.log('🔍 即座確認完了');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ エラー:', error.message);
    console.error('スタックトレース:', error.stack);
    process.exit(1);
  }
}

immediateCheck();