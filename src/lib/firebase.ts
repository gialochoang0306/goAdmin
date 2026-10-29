import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

const config = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};
export const configError = Object.values(config).every(Boolean)
  ? null
  : "Chưa có cấu hình Firebase. Điền các biến trong .env.local theo tệp .env.example, sau đó khởi động lại web.";
export const firebaseAuth = configError ? null : getAuth(initializeApp(config));
