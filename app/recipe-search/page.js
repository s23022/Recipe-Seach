'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { auth } from '../lib/firebase';
import { signOut } from "firebase/auth";
import styles from './Home.module.css';

export default function Home() {

    const [ingredient, setIngredient] = useState('');
    const [recipes, setRecipes] = useState([]);
    const [selectedRecipe, setSelectedRecipe] = useState(null);
    const [loading, setLoading] = useState(false);
    const [hasSearched, setHasSearched] = useState(false);
    const [searchKeyword, setSearchKeyword] = useState('');
    const [user, setUser] = useState(null);
    const [isMenuVisible, setIsMenuVisible] = useState(false);
    const router = useRouter();

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
                        {recipes.map((r) => (
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
                                <span>{r.strMeal}</span>
                            </li>
                        ))}
                    </ul>
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