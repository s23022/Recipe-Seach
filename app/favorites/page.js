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
  const [selectedRecipe, setSelectedRecipe] = useState(null);


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

  async function fetchRecipeDetail(id) {
        setLoading(true);
        try {
            const res = await fetch(`https://www.themealdb.com/api/json/v1/1/lookup.php?i=${id}`);
            const data = await res.json();
            if (data.meals && data.meals.length > 0) {
                setSelectedRecipe(data.meals[0]);
            }
        } catch (error) {
            console.error('詳細取得エラー', error);
        }
        setLoading(false);
    }


  return (
    <div className={styles.container}>
      <button onClick={() => {
        // 詳細表示中なら一覧に戻り、そうでなければトップページへ
        if (selectedRecipe) {
          setSelectedRecipe(null);
        } else {
          router.push('/recipe-search');
        }
      }}>
        {selectedRecipe ? '← お気に入り一覧に戻る' : '← トップに戻る'}
      </button>

      {/* 条件分岐: selectedRecipeがなければお気に入り一覧、あれば詳細を表示 */}
      
      {!selectedRecipe ? (
        // ▼▼▼ お気に入り一覧の表示 ▼▼▼
        <>
          <h1 className={styles.title}>❤️ お気に入りレシピ一覧</h1>

          {loading && <p className={styles.message}>読み込み中...</p>}

          {!loading && favorites.length === 0 && (
            <p className={styles.message}>お気に入りのレシピがまだありません。</p>
          )}

          <ul className={styles.recipeList}>
            {favorites.map((recipe) => (
              <li key={recipe.idMeal} className={styles.recipeItem}>
                <div onClick={() => fetchRecipeDetail(recipe.idMeal)} className={styles.recipeLink}>
                  <img src={recipe.strMealThumb} alt={recipe.strMeal} className={styles.recipeImage} />
                  <span className={styles.recipeName}>{recipe.strMeal}</span>
                </div>
                <button onClick={() => {
                  if (window.confirm(`「${recipe.strMeal}」を削除しますか？`)) {
                    removeFavorite(recipe.idMeal)
                  }
                }} className={styles.deleteButton}>
                    削除
                </button>
              </li>
            ))}
          </ul>
        </>
      ) : (
        // ▼▼▼ レシピ詳細の表示 (Home.jsからコピー) ▼▼▼
        <div>
            <h2>{selectedRecipe.strMeal}</h2>
            <img
                src={selectedRecipe.strMealThumb}
                alt={selectedRecipe.strMeal}
                className={styles.recipeDetailImg} // CSSファイルにこのクラスを追加する必要があるかもしれません
            />

            <h3>カテゴリー: {selectedRecipe.strCategory}</h3>
            <h3>地域: {selectedRecipe.strArea}</h3>

            <h3>材料と分量</h3>
            <ul>
                {[...Array(20)].map((_, i) => {
                    const ing = selectedRecipe[`strIngredient${i + 1}`];
                    const measure = selectedRecipe[`strMeasure${i + 1}`];
                    if (ing && ing.trim()) {
                        return <li key={i}>{ing} : {measure}</li>;
                    }
                    return null;
                })}
            </ul>

            <h3>作り方</h3>
            <p style={{ whiteSpace: 'pre-line' }}>
                {selectedRecipe.strInstructions}
            </p>
        </div>
      )}
    </div>
  );
}

