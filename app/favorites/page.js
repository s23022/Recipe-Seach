'use client';

import styles from './Favorite.module.css'
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { auth, db } from '../lib/firebase';
import {
  collection,
  query,
  where,
  getDocs,
  deleteDoc,
  doc,
} from 'firebase/firestore';

export default function FavoritesPage() {
  const router = useRouter();
  const [favorites, setFavorites] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Firebaseの認証状態の変更を監視するリスナーをセット
    const unsubscribe = auth.onAuthStateChanged(user => {
      if (user) {
        // ユーザーがログインしている場合、そのユーザーIDでお気に入りを読み込む
        loadFavorites(user.uid);
      } else {
        // ユーザーがログインしていない場合、トップページにリダイレクト
        console.log("ユーザーがログインしていません。");
        router.push('/');
      }
    });

    // コンポーネントがアンマウントされるときにリスナーを解除（クリーンアップ）
    return () => unsubscribe();
  }, [router]); // router を依存配列に追加


  async function loadFavorites(userId) {
    try {
      const q = query(collection(db, 'favorites'), where('userId', '==', userId));
      const snapshot = await getDocs(q);
      const favs = snapshot.docs.map((doc) => doc.data().recipe);
      setFavorites(favs);
    } catch (err) {
      console.error('お気に入り取得エラー:', err);
    } finally {
      setLoading(false);
    }
  }

  async function removeFavorite(recipeId) {
    const user = auth.currentUser;
    if (!user) return;

    // Firestoreからドキュメントを削除
    const q = query(
      collection(db, 'favorites'),
      where('userId', '==', user.uid),
      where('recipeId', '==', recipeId)
    );
    const snapshot = await getDocs(q);
    snapshot.forEach(docSnap => {
      deleteDoc(doc(db, 'favorites', docSnap.id));
    });

    // UI（画面）からも即座に削除
    setFavorites(currentFavorites =>
      currentFavorites.filter(fav => fav.idMeal !== recipeId)
    );
  }

  function handleRecipeClick(recipeId) {
    // HomeコンポーネントにレシピIDを渡して遷移
    router.push(`/?recipeId=${recipeId}`);
  }

  return (
    <div className={styles.container}>
      <button onClick={() => router.push('/recipe-search')}>
        ← トップに戻る
      </button>

      <h1 className={styles.title}>❤️ お気に入りレシピ一覧</h1>

      {loading && <p className={styles.message}>読み込み中...</p>}

      {!loading && favorites.length === 0 && (
        <p className={styles.message}>お気に入りのレシピがまだありません。</p>
      )}

      <ul className={styles.recipeList}>
        {favorites.map((recipe) => (
          <li key={recipe.idMeal} className={styles.recipeItem}>
            <div onClick={() => handleRecipeClick(recipe.idMeal)} className={styles.recipeLink}>
            <img src={recipe.strMealThumb} alt={recipe.strMeal} className={styles.recipeImage} />
            <span className={styles.recipeName}>{recipe.strMeal}</span>
            </div>
            <button onClick={() => removeFavorite(recipe.idMeal)} className={styles.deleteButton}>
                削除
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
