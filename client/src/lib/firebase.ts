// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth } from "firebase/auth";
import { getDatabase } from "firebase/database";

// Firebase configuration based on environment
const isDevelopment = import.meta.env.MODE === 'development';

// Development configuration
const developmentConfig = {
  apiKey: "AIzaSyCpKiaaRQsPJlsc7VW244Vy-9vLclWjk-0",
  authDomain: "consensusai-325a7.firebaseapp.com",
  databaseURL: "https://consensusai-325a7-default-rtdb.firebaseio.com",
  projectId: "consensusai-325a7",
  storageBucket: "consensusai-325a7.firebasestorage.app",
  messagingSenderId: "802317283756",
  appId: "1:802317283756:web:ffbb76c29ecd8ad2f1ca09",
  measurementId: "G-YC9N9ZXJK8"
};

// Production configuration
const productionConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyAnPzmfXHmvFjxHfM-AZRpbyRfP72sFFqo",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "consensusai-6cb0c.firebaseapp.com",
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL || "https://consensusai-6cb0c-default-rtdb.firebaseio.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "consensusai-6cb0c",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "consensusai-6cb0c.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "416580382683",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:416580382683:web:YOUR_APP_ID",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
};

// Select configuration based on environment
const firebaseConfig = isDevelopment ? developmentConfig : productionConfig;

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase services
export const auth = getAuth(app);
export const database = getDatabase(app);

// Initialize Analytics only in browser environment
let analytics;
if (typeof window !== 'undefined') {
  analytics = getAnalytics(app);
}
export { analytics };

// Development environment setup (optional)
if (process.env.NODE_ENV === 'development' && typeof window !== 'undefined') {
  // Uncomment these lines if you want to use Firebase emulators in development
  // connectAuthEmulator(auth, "http://localhost:9099");
  // connectDatabaseEmulator(database, "localhost", 9000);
}

export default app;