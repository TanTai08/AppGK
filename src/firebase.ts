import { initializeApp, getApps } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import defaults from "./firebase.config.json";

const config = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY?.trim() || defaults.apiKey,
  authDomain:
    process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN?.trim() || defaults.authDomain,
  projectId:
    process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID?.trim() || defaults.projectId,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID?.trim() || defaults.appId,
};
export const configured = Object.values(config).every(
  (v) => !!v && !v.includes("YOUR_"),
);
export const adminUid =
  process.env.EXPO_PUBLIC_FIREBASE_ADMIN_UID?.trim() || defaults.adminUid;
const app = configured ? getApps()[0] || initializeApp(config) : null;
export const auth = app ? getAuth(app) : null;
export const db = app ? getFirestore(app) : null;
