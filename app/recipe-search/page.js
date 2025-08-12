'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
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
    const [user, setUser] = useState(null);
    const [isMenuVisible, setIsMenuVisible] = useState(false);

    const menuRef = useRef(null);
    const userIconRef = useRef(null);

    // --- 認証状態の監視 ---
    useEffect(() => {
        const unsubscribe = auth.onAuthStateChanged(user => {
            if (user) {
                setUser(user);
                loadFavoritesFromFirestore(user.uid);
            } else {
                setUser(null);
                setFavorites([]);
                router.push('/');
            }
        });
        return () => unsubscribe();
    }, [router]);

    // --- UI操作の監視 (メニュー外クリックで閉じる) ---
    useEffect(() => {
        function handleClickOutside(event) {
            if (
                menuRef.current && !menuRef.current.contains(event.target) &&
                userIconRef.current && !userIconRef.current.contains(event.target)
            ) {
                setIsMenuVisible(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, []);

    // --- おすすめレシピの読み込み ---
    useEffect(() => {
        if (ingredient.trim() === '' && !selectedRecipe) {
            setLoading(true);
            fetchRandomRecipes().then((randoms) => {
                setRecipes(randoms);
                setLoading(false);
                setHasSearched(false);
                setSearchKeyword('');
            });
        }
    }, [ingredient, selectedRecipe]);

    // --- データ操作関数 ---
    async function loadFavoritesFromFirestore(userId) {
        if (!userId) return;
        const q = query(collection(db, 'favorites'), where('userId', '==', userId));
        const snapshot = await getDocs(q);
        setFavorites(snapshot.docs.map(doc => doc.data().recipe));
    }

    async function toggleFavorite(recipe) {
        const exists = favorites.some(fav => fav.idMeal === recipe.idMeal);
        const user = auth.currentUser;
        if (!user) return;

        if (exists) {
            setFavorites(favorites.filter(f => f.idMeal !== recipe.idMeal));
            const q = query(collection(db, 'favorites'), where('userId', '==', user.uid), where('recipeId', '==', recipe.idMeal));
            const snapshot = await getDocs(q);
            const deletePromises = snapshot.docs.map(docSnap => deleteDoc(doc(db, 'favorites', docSnap.id)));
            await Promise.all(deletePromises);
        } else {
            setFavorites([...favorites, recipe]);
            await addDoc(collection(db, 'favorites'), { userId: user.uid, recipeId: recipe.idMeal, recipe });
        }
    }

    const handleLogout = async () => {
        try {
            await signOut(auth);
            setIsMenuVisible(false);
            // router.push('/'); は onAuthStateChanged が検知して自動で遷移させるので不要
        } catch (error) {
            console.error('ログアウトエラー', error);
            alert('ログアウトに失敗しました。');
        }
    };

    // --- API通信関数 ---
    async function fetchRandomRecipes(count = 8) {
        const promises = Array.from({ length: count }, () => fetch('https://www.themealdb.com/api/json/v1/1/random.php').then(res => res.json()));
        const results = await Promise.all(promises);
        const randomMeals = results.map(data => data.meals?.[0]).filter(Boolean);
        return Array.from(new Map(randomMeals.map(meal => [meal.idMeal, meal])).values());
    }

    async function searchRecipes() {
        if (!ingredient.trim()) return;
        setLoading(true);
        setSelectedRecipe(null);
        setRecipes([]);
        setHasSearched(true);
        setSearchKeyword(ingredient);

        try {
            const inputIngredients = ingredient.split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
            if (inputIngredients.length === 0) {
                setRecipes([]); setLoading(false); return;
            }
            const primary = inputIngredients[0];
            const others = inputIngredients.slice(1);

            const res = await fetch(`https://www.themealdb.com/api/json/v1/1/filter.php?i=${encodeURIComponent(primary)}`);
            const data = await res.json();

            if (data.meals) {
                const detailPromises = data.meals.map(meal => fetch(`https://www.themealdb.com/api/json/v1/1/lookup.php?i=${meal.idMeal}`).then(res => res.json()));
                const detailResults = await Promise.all(detailPromises);

                const filtered = detailResults
                    .map(detailData => detailData.meals?.[0])
                    .filter(detail => {
                        if (!detail) return false;
                        if (others.length === 0) return true;
                        const ingredientsList = Object.keys(detail)
                            .filter(key => key.startsWith('strIngredient') && detail[key])
                            .map(key => detail[key].trim().toLowerCase());
                        return others.every(i => ingredientsList.includes(i));
                    });
                setRecipes(filtered);
            } else {
                setRecipes([]);
            }
        } catch (error) {
            console.error('検索エラー', error); setRecipes([]);
        }
        setLoading(false);
    }

    async function fetchRecipeDetail(id) {
        setLoading(true);
        try {
            const res = await fetch(`https://www.themealdb.com/api/json/v1/1/lookup.php?i=${id}`);
            const data = await res.json();
            if (data.meals?.[0]) setSelectedRecipe(data.meals[0]);
        } catch (error) {
            console.error('詳細取得エラー', error);
        }
        setLoading(false);
    }

    // --- 表示用データ整形 ---
    const selectedRecipeIngredients = useMemo(() => {
        if (!selectedRecipe) return [];
        return Array.from({ length: 20 }, (_, i) => ({
            name: selectedRecipe[`strIngredient${i + 1}`],
            measure: selectedRecipe[`strMeasure${i + 1}`],
        })).filter(item => item.name && item.name.trim());
    }, [selectedRecipe]);

    return (
        <div className={styles.container}>
            {/* ▼▼▼ 修正点: ユーザーメニューをヘッダーやメインコンテンツから分離 ▼▼▼ */}
            {user && (
                <>
                    <div ref={userIconRef} className={styles.userIcon} onClick={() => setIsMenuVisible(!isMenuVisible)}>
                        {user.email.charAt(0).toUpperCase()}
                    </div>
                    {isMenuVisible && (
                        <div ref={menuRef} className={styles.userMenu}>
                            <div className={styles.userInfo}>
                                <div className={styles.menuIcon}>{user.email.charAt(0).toUpperCase()}</div>
                                <span className={styles.menuEmail}>{user.email}</span>
                            </div>
                            <button onClick={handleLogout} className={styles.logoutButton}>ログアウト</button>
                        </div>
                    )}
                </>
            )}

            <header className={styles.header}>
                <h1 className={styles.title}>レシピ検索</h1>
                <button onClick={() => router.push('/favorites')} className={styles.favLink}>❤️ お気に入り</button>
            </header>

            <main>
                {/* ▼▼▼ 修正点: 検索エリアの構造を整理 ▼▼▼ */}
                {!selectedRecipe && (
                    <section className={styles.searchSection}>
                        <div className={styles.searchBar}>
                            <input
                                type="text"
                                placeholder="例: chicken, onion"
                                value={ingredient}
                                onChange={(e) => setIngredient(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && searchRecipes()}
                                className={styles.input}
                            />
                            <button onClick={searchRecipes} className={styles.button}>検索</button>
                        </div>
                    </section>
                )}

                {loading && <div className={styles.loader}></div>}

                {/* --- レシピ一覧表示 --- */}
                {!loading && !selectedRecipe && (
                    <>
                        <h2 className={styles.sectionTitle}>
                            {hasSearched ? `「${searchKeyword}」の検索結果` : '✨ おすすめレシピ'}
                        </h2>
                        {recipes.length > 0 ? (
                            <div className={styles.recipeGrid}>
                                {recipes.map((r) => {
                                    const isFavorite = favorites.some(f => f.idMeal === r.idMeal);
                                    return (
                                        <div key={r.idMeal} className={styles.recipeCard} onClick={() => fetchRecipeDetail(r.idMeal)}>
                                            <img src={r.strMealThumb} alt={r.strMeal} className={styles.recipeThumb} />
                                            <div className={styles.recipeCardContent}>
                                                <span className={styles.recipeTitle}>{r.strMeal}</span>
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); toggleFavorite(r); }}
                                                    className={`${styles.favoriteButton} ${isFavorite ? styles.isFavorite : ''}`}
                                                    aria-label={isFavorite ? 'お気に入りから削除' : 'お気に入りに追加'}
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

                {/* --- レシピ詳細表示 --- */}
                {!loading && selectedRecipe && (
                    <div className={styles.recipeDetail}>
                        <button onClick={() => setSelectedRecipe(null)} className={styles.backButton}>← 検索結果に戻る</button>
                        <h2 className={styles.detailTitle}>{selectedRecipe.strMeal}</h2>
                        <div className={styles.detailHeader}>
                            {selectedRecipe.strCategory && <span className={styles.tag}>{selectedRecipe.strCategory}</span>}
                            {selectedRecipe.strArea && <span className={styles.tag}>{selectedRecipe.strArea}</span>}
                        </div>
                        <img src={selectedRecipe.strMealThumb} alt={selectedRecipe.strMeal} className={styles.recipeDetailImg} />
                        <button onClick={() => toggleFavorite(selectedRecipe)} className={`${styles.mainFavoriteButton} ${favorites.some(f => f.idMeal === selectedRecipe.idMeal) ? styles.isFavorite : ''}`}>
                            {favorites.some(f => f.idMeal === selectedRecipe.idMeal) ? '★ お気に入りから削除' : '☆ お気に入りに追加'}
                        </button>
                        <div className={styles.detailSection}>
                            <h3>材料と分量</h3>
                            <ul className={styles.ingredientList}>
                                {selectedRecipeIngredients.map((item, index) => (
                                    <li key={index}><span>{item.name}</span><span>{item.measure}</span></li>
                                ))}
                            </ul>
                        </div>
                        <div className={styles.detailSection}>
                            <h3>作り方</h3>
                            <p className={styles.instructions}>{selectedRecipe.strInstructions}</p>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}