require('dotenv').config();
const { database } = require('./dist/lib/firebase-admin.js');

async function checkFirebase() {
  try {
    const userId = 'test_admin_fix_1753772180';
    console.log('🔍 Firebase接続情報:');
    console.log('- databaseURL:', database.ref().toString());
    
    const snapshot = await database.ref(`users/${userId}/planHistory`).once('value');
    console.log('Firebase planHistory存在:', snapshot.exists());
    if (snapshot.exists()) {
      console.log('データ詳細:', JSON.stringify(snapshot.val(), null, 2));
    } else {
      console.log('❌ planHistoryデータが存在しません');
      
      // ユーザー全体を確認
      const userSnapshot = await database.ref(`users/${userId}`).once('value');
      console.log('ユーザー全体存在:', userSnapshot.exists());
      if (userSnapshot.exists()) {
        const userData = userSnapshot.val();
        console.log('ユーザーデータのキー:', Object.keys(userData));
      }
    }
    
    // Firebaseルート参照テスト
    const rootSnapshot = await database.ref('.info/connected').once('value');
    console.log('Firebase接続状態:', rootSnapshot.val());
    
    process.exit(0);
  } catch (error) {
    console.error('エラー:', error.message);
    process.exit(1);
  }
}

checkFirebase();
