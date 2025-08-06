'use client';

import { useState, useEffect } from 'react';
import styles from './Home.module.css';
import { auth, db } from '../lib/firebase';
import {
  collection,
  addDoc,
  deleteDoc,
  doc,
  getDocs,
  query,
  where,
} from 'firebase/firestore';

export default function Home() {

    const [ingredient, setIngredient] = useState('');
    const [recipes, setRecipes] = useState([]);
    const [selectedRecipe, setSelectedRecipe] = useState(null);
    const [loading, setLoading] = useState(false);
    const [hasSearched, setHasSearched] = useState(false);
    const [searchKeyword, setSearchKeyword] = useState('');
    const [favorites, setFavorites] = useState([]);

    useEffect(() => {
        if (auth.currentUser) {
            loadFavoritesFromFirestore();
        }
    }, []);

    async function loadFavoritesFromFirestore() {
        const user = auth.currentUser;
        if (!user) return;

        const q = query(collection(db, 'favorites'), where('userId', '==', user.uid));
        const snapshot = await getDocs(q);
        const favs = snapshot.docs.map(doc => doc.data().recipe);
        setFavorites(favs);
    }

    async function addFavoriteToFirestore(recipe) {
        const user = auth.currentUser;
        if (!user) return;

        await addDoc(collection(db, 'favorites'), {
            userId: user.uid,
            recipeId: recipe.idMeal,
            recipe,
            });
        }

    async function removeFavoriteFromFirestore(recipeId) {
        const user = auth.currentUser;
        if (!user) return;

        const q = query(
            collection(db, 'favorites'),
            where('userId', '==', user.uid),
            where('recipeId', '==', recipeId)
        );

    const snapshot = await getDocs(q);
    snapshot.forEach(docSnap => {
      deleteDoc(doc(db, 'favorites', docSnap.id));
    });
  }

  async function toggleFavorite(recipe) {
    const exists = favorites.some(fav => fav.idMeal === recipe.idMeal);
    if (exists) {
      await removeFavoriteFromFirestore(recipe.idMeal);
      setFavorites(favorites.filter(f => f.idMeal !== recipe.idMeal));
    } else {
      await addFavoriteToFirestore(recipe);
      setFavorites([...favorites, recipe]);
    }
  }

    async function fetchRandomRecipes(count = 6) {
        const promises = Array.from({ length: count }, async () => {
            const res = await fetch('https://www.themealdb.com/api/json/v1/1/random.php');
            const data = await res.json();
            return data.meals?.[0];
        });

        const randomMeals = await Promise.all(promises);
        const uniqueMeals = Array.from(
            new Map(randomMeals.filter(Boolean).map((meal) => [meal.idMeal, meal])).values()
        );

        return uniqueMeals;
    }

    useEffect(() => {
        if (ingredient.trim() === '') {
            setSelectedRecipe(null);
            setLoading(true);
            fetchRandomRecipes().then((randoms) => {
                setRecipes(randoms);
                setLoading(false);
                setHasSearched(false);
                setSearchKeyword('');
            });
        }
    }, [ingredient]);

    async function searchRecipes() {
        if (!ingredient.trim()) return;

        setLoading(true);
        setSelectedRecipe(null);
        setRecipes([]);
        setHasSearched(true);
        setSearchKeyword(ingredient); // ← 表示用に保持

        try {
            const inputIngredients = ingredient
                .split(',')
                .map((s) => s.trim().toLowerCase())
                .filter((s) => s);

            const primary = inputIngredients[0];
            const others = inputIngredients.slice(1);

            const res = await fetch(`https://www.themealdb.com/api/json/v1/1/filter.php?i=${encodeURIComponent(primary)}`);
            const data = await res.json();

            if (data.meals) {
                const filtered = [];

                for (const meal of data.meals) {
                    const detailRes = await fetch(`https://www.themealdb.com/api/json/v1/1/lookup.php?i=${meal.idMeal}`);
                    const detailData = await detailRes.json();
                    const detail = detailData.meals?.[0];

                    if (!detail) continue;

                    const ingredientsList = [];
                    for (let i = 1; i <= 20; i++) {
                        const ing = detail[`strIngredient${i}`];
                        if (ing && ing.trim()) {
                            ingredientsList.push(ing.trim().toLowerCase());
                        }
                    }

                    const allIncluded = others.every((i) => ingredientsList.includes(i));
                    if (allIncluded) {
                        filtered.push(meal);
                    }
                }

                setRecipes(filtered);
            } else {
                setRecipes([]);
            }
        } catch (error) {
            console.error('検索エラー', error);
            setRecipes([]);
        }

        setLoading(false);
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
            <h1 className={styles.h1_01}>食材から探せるレシピ検索</h1>

            <div className={styles.SearchBar}>
                <input
                    type="text"
                    placeholder="例(複数指定): chicken, garlic"
                    value={ingredient}
                    onChange={(e) => {
                        const val = e.target.value;
                        setIngredient(val);

                        if (val.trim() === '') {
                            setRecipes([]);
                            setSelectedRecipe(null);
                            setLoading(false);
                            setHasSearched(false);
                            setSearchKeyword('');
                        }
                    }}
                    className={styles.input}
                />
                <button onClick={searchRecipes} className={styles.button}>検索</button>
            </div>

            {loading && <p>読み込み中...</p>}

            {!loading && !selectedRecipe && (
                <>
                    <p className={styles.Search_results}>
                        {hasSearched
                            ? `${searchKeyword} に関するレシピ`
                            : '✨おすすめレシピ✨'}
                    </p>

                    <ul className={styles.recipeList}>
                        {recipes.map((r) => {
                            const isFavorite = favorites.some(f => f.idMeal === r.idMeal);
                            return (
                                <li
                                    key={r.idMeal}
                                    className={styles.recipeItem}
                                    onClick={() => fetchRecipeDetail(r.idMeal)}
                                >
                                    <img
                                        src={r.strMealThumb}
                                        alt={r.strMeal}
                                        className={styles.recipeThumb}
                                    />
                                    <div className={styles.recipeTitleRow}>
                                        <span>{r.strMeal}</span>
                                        <button 
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                toggleFavorite(r);
                                            }}
                                            className={styles.favoriteButton}
                                        >
                                        {isFavorite ? '★' : '☆'}
                                    </button>
                                </div>
                            </li>
                            );
                        })}
                    </ul>

        {favorites.length > 0 && (
            <>
              <h2 className={styles.favHeading}>❤️ お気に入りレシピ</h2>
              <ul className={styles.recipeList}>
                {favorites.map((r) => (
                  <li
                    key={r.idMeal}
                    className={styles.recipeItem}
                    onClick={() => fetchRecipeDetail(r.idMeal)}
                  >
                    <img src={r.strMealThumb} alt={r.strMeal} className={styles.recipeThumb} />
                    <div className={styles.recipeTitleRow}>
                      <span>{r.strMeal}</span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleFavorite(r);
                        }}
                        className={styles.favoriteButton}
                      >
                        {'★'}
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </>
          )}
        </>
    )}

            {selectedRecipe && (
                <div>
                    <button onClick={() => setSelectedRecipe(null)} className={styles.backButton}>
                        ← 一覧に戻る
                    </button>

                    <h2>{selectedRecipe.strMeal}</h2>
                    <img
                        src={selectedRecipe.strMealThumb}
                        alt={selectedRecipe.strMeal}
                        className={styles.recipeDetailImg}
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
