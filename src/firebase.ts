import { initializeApp, getApps } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getDatabase } from "firebase/database";

const config = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  databaseURL: process.env.EXPO_PUBLIC_FIREBASE_DATABASE_URL,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};
export const configured = Object.values(config).every(
  (v) => !!v && !v.includes("YOUR_"),
);
export const adminUid = process.env.EXPO_PUBLIC_FIREBASE_ADMIN_UID?.trim();
const app = configured ? getApps()[0] || initializeApp(config) : null;
export const auth = app ? getAuth(app) : null;
export const db = app ? getDatabase(app) : null;
