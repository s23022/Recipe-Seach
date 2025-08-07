'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { auth } from '../lib/firebase';
import { signOut } from "firebase/auth";
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
import { useRouter } from 'next/navigation';

export default function Home() {
    const router = useRouter();

    const [ingredient, setIngredient] = useState('');
    const [recipes, setRecipes] = useState([]);
    const [selectedRecipe, setSelectedRecipe] = useState(null);
    const [loading, setLoading] = useState(false);
    const [hasSearched, setHasSearched] = useState(false);
    const [searchKeyword, setSearchKeyword] = useState('');
    const [favorites, setFavorites] = useState([]);

    useEffect(() => {
        const unsubscribe = auth.onAuthStateChanged(user => {
            if (user) {
                loadFavoritesFromFirestore();
            } else {
                setFavorites([]);
            }
        });
        return () => unsubscribe();
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
      
    const [user, setUser] = useState(null);
    const [isMenuVisible, setIsMenuVisible] = useState(false);

    useEffect(() => {
        const unsubscribe = auth.onAuthStateChanged((user) => {
            if (user) {
                setUser(user);
            } else {
                setUser(null);
                router.push('/');
            }
        });
        return () => unsubscribe();
    }, [router]);

    const handleLogout = async () => {
        try {
            await signOut(auth);
            router.push('/');
        } catch (error) {
            console.error('ログアウトエラー', error);
            alert('ログアウトに失敗しました。');
        }
    };


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

    async function fetchRandomRecipes(count = 8) {
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
        setSearchKeyword(ingredient);

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
                        filtered.push(detail); // 詳細情報を直接格納
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

            <header className={styles.header}>
                <h1 className={styles.title}>Recipe Finder</h1>
                <button
                    onClick={() => router.push('/favorites')}
                    className={styles.favLink}
                >
                    ❤️ お気に入り
                </button>
            </header>

            <div className={styles.searchBar}>

            {user && (
                <div>
                    <div className={styles.userIcon} onClick={() => setIsMenuVisible(!isMenuVisible)}>
                        {user.email.charAt(0).toUpperCase()}
                    </div>

                    {isMenuVisible && (
                        <div className={styles.userMenu}>
                            <div className={styles.userInfo}>
                                <div className={styles.menuIcon}>{user.email.charAt(0).toUpperCase()}</div>
                                <span className={styles.menuEmail}>{user.email}</span>
                            </div>
                            <button onClick={handleLogout} className={styles.logoutButton}>
                                ログアウト
                            </button>
                        </div>
                    )}
                </div>
            )}

            <h1 className={styles.h1_01}>食材から探せるレシピ検索</h1>

            <div className={styles.SearchBar}>

                <input
                    type="text"
                    placeholder="例: chicken, garlic, onion"
                    value={ingredient}
                    onChange={(e) => setIngredient(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && searchRecipes()}
                    className={styles.input}
                />
                <button onClick={searchRecipes} className={styles.button}>検索</button>
            </div>

            {loading && <div className={styles.loader}></div>}
            
            {!loading && !selectedRecipe && (
                <>
                    <h2 className={styles.sectionTitle}>
                        {hasSearched
                            ? `「${searchKeyword}」の検索結果`
                            : '✨ おすすめレシピ'}
                    </h2>
                    
                    {recipes.length > 0 ? (
                        <div className={styles.recipeGrid}>
                            {recipes.map((r) => {
                                const isFavorite = favorites.some(f => f.idMeal === r.idMeal);
                                return (
                                    <div
                                        key={r.idMeal}
                                        className={styles.recipeCard}
                                        onClick={() => fetchRecipeDetail(r.idMeal)}
                                    >
                                        <img
                                            src={r.strMealThumb}
                                            alt={r.strMeal}
                                            className={styles.recipeThumb}
                                        />
                                        <div className={styles.recipeCardContent}>
                                            <span className={styles.recipeTitle}>{r.strMeal}</span>
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    toggleFavorite(r);
                                                }}
                                                className={`${styles.favoriteButton} ${isFavorite ? styles.isFavorite : ''}`}
                                            >
                                                {isFavorite ? '★' : '☆'}
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        hasSearched && <p className={styles.noResults}>レシピが見つかりませんでした。</p>
                    )}
                </>
            )}

            {!loading && selectedRecipe && (
                <div className={styles.recipeDetail}>
                    <button onClick={() => setSelectedRecipe(null)} className={styles.backButton}>
                        ← 検索結果に戻る
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
                        onClick={() => toggleFavorite(selectedRecipe)}
                        className={`${styles.mainFavoriteButton} ${favorites.some(f => f.idMeal === selectedRecipe.idMeal) ? styles.isFavorite : ''}`}
                    >
                        {favorites.some(f => f.idMeal === selectedRecipe.idMeal) ? '★ お気に入りから削除' : '☆ お気に入りに追加'}
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
