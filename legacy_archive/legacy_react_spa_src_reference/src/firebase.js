import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
// === 关键修改：导入 Analytics 模块 ===
import { getAnalytics } from "firebase/analytics";

// 安全配置检查
const validateFirebaseConfig = (config) => {
  const requiredFields = [
    'apiKey',
    'authDomain',
    'projectId',
    'storageBucket',
    'messagingSenderId',
    'appId'
  ];

  const missingFields = requiredFields.filter(field => !config[field]);

  if (missingFields.length > 0) {
    console.warn(
      `Firebase配置不完整，缺少字段: ${missingFields.join(', ')}. ` +
      '请在 .env.local 中设置 VITE_FIREBASE_* 环境变量。'
    );
    return null;
  }

  return config;
};

// 从环境变量获取配置（无 fallback，必须通过 .env 或 .env.local 提供）
const firebaseConfig = validateFirebaseConfig({
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
});

let app = null;
let auth = null;
let db = null;
let analytics = null;

if (firebaseConfig) {
  // 1. 初始化 Firebase 应用
  try {
    app = initializeApp(firebaseConfig);
    console.log('Firebase应用初始化成功');
  } catch (error) {
    console.warn('Firebase初始化失败:', error.message);
  }

  // 2. 初始化 Analytics (仅在浏览器环境运行，防止 SSR 报错)
  if (app && typeof window !== 'undefined') {
    try {
      const enableAnalytics = import.meta.env.VITE_ENABLE_ANALYTICS !== 'false';
      if (enableAnalytics) {
        analytics = getAnalytics(app);
        console.log('Firebase Analytics初始化成功');
      }
    } catch (error) {
      console.warn('Firebase Analytics初始化失败:', error.message);
    }
  }

  // 3. 导出 Auth 和 Firestore 供 App.jsx 使用
  if (app) {
    try {
      auth = getAuth(app);
      db = getFirestore(app);
      console.log('Firebase Auth和Firestore初始化成功');
    } catch (error) {
      console.warn('Firebase服务初始化失败:', error.message);
    }
  }
} else {
  console.warn('Firebase未配置，应用将以只读/离线模式运行');
}

export { auth, db, analytics };
export default app;
