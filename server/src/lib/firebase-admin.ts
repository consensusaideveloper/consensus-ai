import * as admin from 'firebase-admin';

let isFirebaseInitialized = false;

// Firebase Admin SDK の初期化
if (!admin.apps.length) {
  try {
    console.log('[Firebase Admin] 🔧 Firebase Admin SDK 初期化中...');
    
    // 開発環境での認証設定
    if (process.env.NODE_ENV === 'development') {
      console.log('[Firebase Admin] 🔧 開発環境: Firebase Admin SDK初期化');
      
      // 環境変数からサービスアカウントキーを確認
      const serviceAccountPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
      const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT;
      
      if (serviceAccountJson) {
        console.log('[Firebase Admin] 🔐 サービスアカウントJSON使用');
        admin.initializeApp({
          credential: admin.credential.cert(JSON.parse(serviceAccountJson)),
          databaseURL: process.env.FIREBASE_DATABASE_URL || 'https://consensusai-325a7-default-rtdb.firebaseio.com',
          databaseAuthVariableOverride: null
        });
      } else if (serviceAccountPath) {
        console.log('[Firebase Admin] 🔐 サービスアカウントファイル使用');
        admin.initializeApp({
          credential: admin.credential.applicationDefault(),
          databaseURL: process.env.FIREBASE_DATABASE_URL || 'https://consensusai-325a7-default-rtdb.firebaseio.com',
          databaseAuthVariableOverride: null
        });
      } else {
        console.log('[Firebase Admin] ⚠️ 認証情報なし - 開発モードでスキップ');
        throw new Error('Development mode: Firebase credentials not configured');
      }
    } else {
      // 本番環境では適切な認証情報が必要
      const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT 
        ? JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)
        : null;
        
      if (serviceAccount) {
        admin.initializeApp({
          credential: admin.credential.cert(serviceAccount),
          databaseURL: process.env.FIREBASE_DATABASE_URL || 'https://consensusai-325a7-default-rtdb.firebaseio.com',
          databaseAuthVariableOverride: null
        });
      } else {
        throw new Error('本番環境でFIREBASE_SERVICE_ACCOUNT環境変数が設定されていません');
      }
    }
    
    console.log('[Firebase Admin] ✅ Firebase Admin SDK初期化成功');
    isFirebaseInitialized = true;
  } catch (error) {
    console.error('[Firebase Admin] ❌ Firebase Admin SDK初期化エラー:', error);
    console.error('[Firebase Admin] 💡 認証問題により一時的にスキップしますが、サーバーは継続します');
    isFirebaseInitialized = false;
    // エラーでもサーバーが起動できるように、throwしない
  }
}

// Firebase接続が失敗した場合でもexportできるようにnull許可
export const adminAuth = isFirebaseInitialized ? admin.auth() : null;
export const adminDatabase = isFirebaseInitialized ? admin.database() : null;
export const database = adminDatabase;
export { isFirebaseInitialized };

export default admin;