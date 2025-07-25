// lib/firebase.js
import { initializeApp } from "firebase/app";
import { getFirestore } from 'firebase/firestore';
import { getAnalytics, isSupported } from "firebase/analytics";
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
    apiKey: "AIzaSyAKrWPizK17J8LqWksWxiwbt_mIqn3EuZs",
    authDomain: "food-search-e6722.firebaseapp.com",
    projectId: "food-search-e6722",
    storageBucket: "food-search-e6722.firebasestorage.app",
    messagingSenderId: "927738703019",
    appId: "1:927738703019:web:17afe32c1257841d329bee",
    measurementId: "G-4GYEF0RCN7"
};

const app = initializeApp(firebaseConfig);

export const db = getFirestore(app);
export const auth = getAuth(app); // ←これがないとログインでエラーになる！

let analytics;
if (typeof window !== 'undefined') {
    isSupported().then((ok) => {
        if (ok) {
            analytics = getAnalytics(app);
        }
    });
}

export { analytics };
