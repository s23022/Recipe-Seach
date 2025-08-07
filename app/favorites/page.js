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
    const unsubscribe = auth.onAuthStateChanged(user => {
      if (user) {
        loadFavorites(user.uid);
      } else {
        router.push('/');
      }
    });
    return () => unsubscribe();
  }, [router]);

  async function loadFavorites(userId) {
    setLoading(true);
    try {
      const q = query(collection(db, 'favorites'), where('userId', '==', userId));
      const snapshot = await getDocs(q);
      const favs = snapshot.docs.map((doc) => ({ ...doc.data().recipe, firestoreId: doc.id }));
      setFavorites(favs);
    } catch (err) {
      console.error('お気に入り取得エラー:', err);
    } finally {
      setLoading(false);
    }
  }

  async function removeFavorite(recipeId, firestoreId) {
    const user = auth.currentUser;
    if (!user) return;

    // Firestoreからドキュメントを削除
    const docRef = doc(db, 'favorites', firestoreId);
    await deleteDoc(docRef);

    // UIからも削除
    setFavorites(currentFavorites =>
      currentFavorites.filter(fav => fav.idMeal !== recipeId)
    );
     // 詳細画面を開いている場合は、一覧に戻す
    if (selectedRecipe && selectedRecipe.idMeal === recipeId) {
        setSelectedRecipe(null);
    }
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
        <header className={styles.header}>
            <h1 className={styles.title}>❤️ お気に入り</h1>
            <button
                onClick={() => router.push('/recipe-search')}
                className={styles.backLink}
            >
                レシピを探す
            </button>
        </header>

      {loading && <div className={styles.loader}></div>}

      {!loading && !selectedRecipe && (
        <>
          {favorites.length === 0 ? (
            <p className={styles.message}>お気に入りのレシピはまだありません。</p>
          ) : (
            <div className={styles.favoriteGrid}>
              {favorites.map((recipe) => (
                <div key={recipe.idMeal} className={styles.recipeCard}>
                    <div onClick={() => fetchRecipeDetail(recipe.idMeal)} className={styles.cardClickableArea}>
                        <img src={recipe.strMealThumb} alt={recipe.strMeal} className={styles.recipeThumb} />
                        <div className={styles.recipeCardContent}>
                            <span className={styles.recipeTitle}>{recipe.strMeal}</span>
                        </div>
                    </div>
                    <button 
                        onClick={(e) => {
                            e.stopPropagation();
                            if (window.confirm(`「${recipe.strMeal}」をお気に入りから削除しますか？`)) {
                                removeFavorite(recipe.idMeal, recipe.firestoreId);
                            }
                        }} 
                        className={styles.deleteButton}
                    >
                        削除
                    </button>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {!loading && selectedRecipe && (
        <div className={styles.recipeDetail}>
            <button onClick={() => setSelectedRecipe(null)} className={styles.backButton}>
                ← お気に入り一覧に戻る
            </button>

            <h2 className={styles.detailTitle}>{selectedRecipe.strMeal}</h2>
            
            <div className={styles.detailHeader}>
                <span className={styles.tag}>{selectedRecipe.strCategory}</span>
                <span className={styles.tag}>{selectedRecipe.strArea}</span>
            </div>

            <img
                src={selectedRecipe.strMealThumb}
                alt={selectedRecipe.strMeal}
                className={styles.recipeDetailImg}
            />
            
            <button
                onClick={() => {
                    if (window.confirm(`「${selectedRecipe.strMeal}」をお気に入りから削除しますか？`)) {
                        const fav = favorites.find(f => f.idMeal === selectedRecipe.idMeal);
                        if (fav) {
                            removeFavorite(selectedRecipe.idMeal, fav.firestoreId);
                        }
                    }
                }}
                className={styles.mainFavoriteButton}
            >
                ★ お気に入りから削除
            </button>
            
            <div className={styles.detailSection}>
                <h3>材料と分量</h3>
                <ul className={styles.ingredientList}>
                    {[...Array(20)].map((_, i) => {
                        const ing = selectedRecipe[`strIngredient${i + 1}`];
                        const measure = selectedRecipe[`strMeasure${i + 1}`];
                        if (ing && ing.trim()) {
                            return <li key={i}><span>{ing}</span><span>{measure}</span></li>;
                        }
                        return null;
                    })}
                </ul>
            </div>
            
            <div className={styles.detailSection}>
                <h3>作り方</h3>
                <p className={styles.instructions}>
                    {selectedRecipe.strInstructions}
                </p>
            </div>
        </div>
      )}
    </div>
  );
}