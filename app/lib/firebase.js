// lib/firebase.js
import { initializeApp } from "firebase/app";
import { getFirestore } from 'firebase/firestore';
import { getAnalytics, isSupported } from "firebase/analytics";
import { getAuth } from 'firebase/auth';

// Firebaseプロジェクトの設定情報
// Firebaseコンソールで取得した各種キーやIDが含まれる
const firebaseConfig = {
    apiKey: "AIzaSyAKrWPizK17J8LqWksWxiwbt_mIqn3EuZs",
    authDomain: "food-search-e6722.firebaseapp.com",
    projectId: "food-search-e6722",
    storageBucket: "food-search-e6722.firebasestorage.app",
    messagingSenderId: "927738703019",
    appId: "1:927738703019:web:17afe32c1257841d329bee",
    measurementId: "G-4GYEF0RCN7"
};

// Firebaseアプリの初期化（設定情報を元にFirebaseを使える状態にする）
const app = initializeApp(firebaseConfig);

// Firestore（FirebaseのNoSQLデータベース）を初期化しエクスポート
export const db = getFirestore(app);

// Firebase Authentication（認証機能）を初期化しエクスポート
// これがないとログイン関連の処理でエラーになるので必須
export const auth = getAuth(app);

let analytics; // Firebase Analytics（利用状況解析）用の変数

// windowが存在する（ブラウザ環境）かつAnalyticsが利用可能か確認
if (typeof window !== 'undefined') {
    isSupported().then((ok) => {
        if (ok) {
            // Analyticsを初期化（有効ならば）
            analytics = getAnalytics(app);
        }
    });
}

// Analyticsオブジェクトをエクスポート（利用可能ならば利用可能）
export { analytics };
