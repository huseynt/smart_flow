import { initializeApp, getApps } from "firebase/app";
import { getAuth as getFirebaseAuth, Auth } from "firebase/auth";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

let authInstance: Auth | null = null;

function initFirebase() {
  try {
    const apps = getApps();
    if (apps.length === 0) {
      initializeApp(firebaseConfig);
    }
    return getFirebaseAuth();
  } catch (error) {
    console.error("Firebase initialization error:", error);
    throw error;
  }
}

export function getAuth(): Auth {
  if (!authInstance) {
    authInstance = initFirebase();
  }
  return authInstance;
}

// Lazy auth object - only initializes when accessed
export const auth = new Proxy({}, {
  get: (_, prop) => {
    const auth = getAuth();
    return (auth as any)[prop];
  },
}) as unknown as Auth;



