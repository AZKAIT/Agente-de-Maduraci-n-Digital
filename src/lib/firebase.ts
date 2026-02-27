import { initializeApp, getApps, getApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

const envWindow: any =
  typeof window !== "undefined" ? (globalThis as any).__ENV || {} : {};
const firebaseConfig: any = {
  apiKey:
    process.env.NEXT_PUBLIC_FIREBASE_API_KEY ||
    envWindow.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain:
    process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ||
    envWindow.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId:
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ||
    envWindow.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket:
    process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ||
    envWindow.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId:
    process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ||
    envWindow.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId:
    process.env.NEXT_PUBLIC_FIREBASE_APP_ID ||
    envWindow.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId:
    process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID ||
    envWindow.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

const required = [
  firebaseConfig.apiKey,
  firebaseConfig.authDomain,
  firebaseConfig.projectId,
  firebaseConfig.appId,
];
const canInitialize = required.every(Boolean);

let app: any = null;
let analytics: any = null;
let db: any = null;
let auth: any = null;

if (canInitialize) {
  app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
  if (typeof window !== 'undefined') {
    analytics = getAnalytics(app);
  }
  db = getFirestore(app);
  auth = getAuth(app);
} else {
  if (typeof window !== 'undefined') {
    console.error('Firebase no inicializado: variables de entorno faltantes');
  }
}

export { app, analytics, db, auth };
