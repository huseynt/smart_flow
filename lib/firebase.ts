import { initializeApp, getApps, FirebaseApp } from "firebase/app";
import { getAuth as getFirebaseAuth, Auth } from "firebase/auth";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Validate Firebase config
if (!firebaseConfig.apiKey || !firebaseConfig.authDomain || !firebaseConfig.projectId) {
  console.error('Firebase configuration is incomplete:', {
    apiKey: !!firebaseConfig.apiKey,
    authDomain: !!firebaseConfig.authDomain,
    projectId: !!firebaseConfig.projectId,
  });
}

export { firebaseConfig };

// Initialize Firebase and get app instance
let app: FirebaseApp;
try {
  const apps = getApps();
  if (apps.length === 0) {
    console.log('Initializing Firebase app');
    app = initializeApp(firebaseConfig);
  } else {
    app = apps[0];
  }
} catch (error) {
  console.error("Firebase initialization error:", error);
  throw error;
}

export { app };

// Get Auth instance
export const auth: Auth = getFirebaseAuth(app);



