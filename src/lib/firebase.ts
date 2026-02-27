import { initializeApp, getApps, getApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyC_Rt5GYqwl4HQRwW1Fw9fV_jaXwWzo4vA",
  authDomain: "agente-de-madurez-digital.firebaseapp.com",
  projectId: "agente-de-madurez-digital",
  storageBucket: "agente-de-madurez-digital.firebasestorage.app",
  messagingSenderId: "1051006374454",
  appId: "1:1051006374454:web:4b8067c525b576bf2ffe97",
  measurementId: "G-PEEGXTTEQL",
};

const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
const analytics = typeof window !== "undefined" ? getAnalytics(app) : null;
const db = getFirestore(app);
const auth = getAuth(app);

export { app, analytics, db, auth };
