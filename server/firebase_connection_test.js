require('dotenv').config();
const { database, adminDatabase, isFirebaseInitialized } = require('./dist/lib/firebase-admin.js');

console.log('🔍 Firebase接続診断:');
console.log('- isFirebaseInitialized:', isFirebaseInitialized);
console.log('- database available:', \!\!database);
console.log('- adminDatabase available:', \!\!adminDatabase);

if (database) {
  console.log('- Database URL:', database._delegate._repoInternal.repoInfo_.host);
  console.log('- Database instance:', database._delegate._repoInternal.repoInfo_);
}

console.log('🔍 環境変数:');
console.log('- NODE_ENV:', process.env.NODE_ENV);
console.log('- GOOGLE_APPLICATION_CREDENTIALS:', process.env.GOOGLE_APPLICATION_CREDENTIALS ? 'SET' : 'NOT SET');
console.log('- FIREBASE_SERVICE_ACCOUNT:', process.env.FIREBASE_SERVICE_ACCOUNT ? 'SET' : 'NOT SET');
