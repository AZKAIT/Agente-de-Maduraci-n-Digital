import { initializeApp, getApps, getApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

// Fallback público: usa estas claves SOLO si no llegan por env/runtime
// Nota: Estas claves de Firebase son públicas (NEXT_PUBLIC_*). No incluyen secretos del Admin SDK.
const FALLBACK_PUBLIC_CONFIG = {
  apiKey: "AIzaSyC_Rt5GYqwl4HQRwW1Fw9fV_jaXwWzo4vA",
  authDomain: "agente-de-madurez-digital.firebaseapp.com",
  projectId: "agente-de-madurez-digital",
  storageBucket: "agente-de-madurez-digital.firebasestorage.app",
  messagingSenderId: "1051006374454",
  appId: "1:1051006374454:web:4b8067c525b576bf2ffe97",
  measurementId: "G-PEEGXTTEQL",
};

const envWindow: any =
  typeof window !== "undefined" ? (globalThis as any).__ENV || {} : {};
const firebaseConfig: any = {
  apiKey:
    process.env?.["NEXT_PUBLIC_FIREBASE_API_KEY"] ||
    envWindow.NEXT_PUBLIC_FIREBASE_API_KEY ||
    FALLBACK_PUBLIC_CONFIG.apiKey,
  authDomain:
    process.env?.["NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN"] ||
    envWindow.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ||
    FALLBACK_PUBLIC_CONFIG.authDomain,
  projectId:
    process.env?.["NEXT_PUBLIC_FIREBASE_PROJECT_ID"] ||
    envWindow.NEXT_PUBLIC_FIREBASE_PROJECT_ID ||
    FALLBACK_PUBLIC_CONFIG.projectId,
  storageBucket:
    process.env?.["NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET"] ||
    envWindow.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ||
    FALLBACK_PUBLIC_CONFIG.storageBucket,
  messagingSenderId:
    process.env?.["NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID"] ||
    envWindow.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ||
    FALLBACK_PUBLIC_CONFIG.messagingSenderId,
  appId:
    process.env?.["NEXT_PUBLIC_FIREBASE_APP_ID"] ||
    envWindow.NEXT_PUBLIC_FIREBASE_APP_ID ||
    FALLBACK_PUBLIC_CONFIG.appId,
  measurementId:
    process.env?.["NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID"] ||
    envWindow.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID ||
    FALLBACK_PUBLIC_CONFIG.measurementId,
};

const requiredMap: Record<string, any> = {
  apiKey: firebaseConfig.apiKey,
  authDomain: firebaseConfig.authDomain,
  projectId: firebaseConfig.projectId,
  appId: firebaseConfig.appId,
};
const missingKeys = Object.entries(requiredMap)
  .filter(([, v]) => !v)
  .map(([k]) => k);
const canInitialize = missingKeys.length === 0;

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
    console.error('Firebase no inicializado: variables de entorno faltantes', { missingKeys, env: (globalThis as any).__ENV || null });
  }
}

export { app, analytics, db, auth };
