'use client';
// Next.js App Router環境でクライアントコンポーネントとして動作させる宣言。
// Firebaseのリアルタイム機能やuseState/useEffectを使うため必須。

import { useState, useEffect, useMemo } from 'react';
// Reactの状態管理(useState)、副作用処理(useEffect)、計算結果のメモ化(useMemo)を利用。

import { signOut } from "firebase/auth";
// Firebase AuthenticationからsignOut関数をインポート（ログアウトに使用）。

import { auth, db } from '../lib/firebase';
// 自作のfirebase設定ファイルから、認証(auth)とFirestore(db)インスタンスをインポート。

import {
    collection,
    addDoc,
    deleteDoc,
    doc,
    getDocs,
    query,
    where,
} from 'firebase/firestore';
// Firestoreの各操作関数をインポート。
// collection: コレクション参照作成
// addDoc: 新規ドキュメント追加
// deleteDoc: ドキュメント削除
// doc: ドキュメント参照作成
// getDocs: クエリ実行＆ドキュメント取得
// query/where: クエリ条件作成

import { useRouter } from 'next/navigation';
// Next.jsのルーター機能。ページ遷移に使用。

import styles from './Home.module.css';
// CSSモジュール読み込み（画面全体のスタイル用）

// 子コンポーネントを読み込み
import UserMenu from './user-menu';
import SearchBar from './searchbar';
import RecipeList from './recipe-list';
import RecipeDetail from './recipe-detail';

export default function HomePage() {
    const router = useRouter(); // ページ遷移用インスタンス

    // ----------------------------
    // 状態管理
    // ----------------------------
    const [ingredient, setIngredient] = useState(''); // 検索用の材料入力
    const [recipes, setRecipes] = useState([]); // レシピ一覧データ
    const [selectedRecipe, setSelectedRecipe] = useState(null); // 詳細表示中のレシピ
    const [loading, setLoading] = useState(false); // ローディング表示フラグ
    const [hasSearched, setHasSearched] = useState(false); // 検索を実行したか
    const [searchKeyword, setSearchKeyword] = useState(''); // 検索ワード（表示用）
    const [favorites, setFavorites] = useState([]); // お気に入りレシピリスト
    const [user, setUser] = useState(null); // ログイン中のユーザー
    const [isMenuVisible, setIsMenuVisible] = useState(false); // ユーザーメニューの開閉状態

    // ----------------------------
    // 認証状態の監視
    // ----------------------------
    useEffect(() => {
        const unsubscribe = auth.onAuthStateChanged(user => {
            if (user) {
                // ログインしている場合
                setUser(user);
                loadFavoritesFromFirestore(user.uid); // Firestoreからお気に入りを取得
            } else {
                // 未ログインの場合
                setUser(null);
                setFavorites([]); // お気に入りをリセット
                router.push('/'); // ホームにリダイレクト
            }
        });
        return () => unsubscribe(); // コンポーネント破棄時に監視解除
    }, [router]);

    // ----------------------------
    // 初回ロード時のおすすめレシピ表示
    // ----------------------------
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

    // ----------------------------
    // Firestoreお気に入り取得
    // ----------------------------
    async function loadFavoritesFromFirestore(userId) {
        if (!userId) return;
        const q = query(collection(db, 'favorites'), where('userId', '==', userId));
        const snapshot = await getDocs(q);
        setFavorites(snapshot.docs.map(doc => doc.data().recipe));
    }

    // ----------------------------
    // お気に入り登録/解除
    // ----------------------------
    async function toggleFavorite(recipe) {
        const exists = favorites.some(fav => fav.idMeal === recipe.idMeal); // 既に登録済みか判定
        const user = auth.currentUser;
        if (!user) return;

        if (exists) {
            // 既にお気に入り → 削除処理
            setFavorites(favorites.filter(f => f.idMeal !== recipe.idMeal));
            const q = query(
                collection(db, 'favorites'),
                where('userId', '==', user.uid),
                where('recipeId', '==', recipe.idMeal)
            );
            const snapshot = await getDocs(q);
            const deletePromises = snapshot.docs.map(docSnap =>
                deleteDoc(doc(db, 'favorites', docSnap.id))
            );
            await Promise.all(deletePromises);
        } else {
            // 未登録 → Firestoreに追加
            setFavorites([...favorites, recipe]);
            await addDoc(collection(db, 'favorites'), {
                userId: user.uid,
                recipeId: recipe.idMeal,
                recipe
            });
        }
    }

    // ----------------------------
    // ログアウト処理
    // ----------------------------
    const handleLogout = async () => {
        try {
            await signOut(auth);
            setIsMenuVisible(false); // メニュー閉じる
        } catch (error) {
            console.error('ログアウトエラー', error);
            alert('ログアウトに失敗しました。');
        }
    };

    // ----------------------------
    // API: ランダムレシピ取得
    // ----------------------------
    async function fetchRandomRecipes(count = 8) {
        const promises = Array.from({ length: count }, () =>
            fetch('https://www.themealdb.com/api/json/v1/1/random.php').then(res => res.json())
        );
        const results = await Promise.all(promises);
        const randomMeals = results.map(data => data.meals?.[0]).filter(Boolean);
        // 重複を除外して返す
        return Array.from(new Map(randomMeals.map(meal => [meal.idMeal, meal])).values());
    }

    // ----------------------------
    // API: 材料から検索
    // ----------------------------
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
                .map(s => s.trim().toLowerCase())
                .filter(Boolean);
            if (inputIngredients.length === 0) {
                setRecipes([]);
                setLoading(false);
                return;
            }
            const primary = inputIngredients[0];
            const others = inputIngredients.slice(1);

            const res = await fetch(`https://www.themealdb.com/api/json/v1/1/filter.php?i=${encodeURIComponent(primary)}`);
            const data = await res.json();

            if (data.meals) {
                // 詳細取得
                const detailPromises = data.meals.map(meal =>
                    fetch(`https://www.themealdb.com/api/json/v1/1/lookup.php?i=${meal.idMeal}`).then(res => res.json())
                );
                const detailResults = await Promise.all(detailPromises);

                // 他の材料も含むかフィルタ
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
            console.error('検索エラー', error);
            setRecipes([]);
        }
        setLoading(false);
    }

    // ----------------------------
    // API: 詳細取得
    // ----------------------------
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

    // ----------------------------
    // 詳細レシピの材料配列を作成（useMemoでキャッシュ）
    // ----------------------------
    const selectedRecipeIngredients = useMemo(() => {
        if (!selectedRecipe) return [];
        return Array.from({ length: 20 }, (_, i) => ({
            name: selectedRecipe[`strIngredient${i + 1}`],
            measure: selectedRecipe[`strMeasure${i + 1}`],
        })).filter(item => item.name && item.name.trim());
    }, [selectedRecipe]);

    // ----------------------------
    // JSXレンダリング
    // ----------------------------
    return (
        <div className={styles.container}>
            {/* ユーザーメニュー */}
            <UserMenu
                user={user}
                isMenuVisible={isMenuVisible}
                setIsMenuVisible={setIsMenuVisible}
                handleLogout={handleLogout}
            />

            <header className={styles.header}>
                <h1 className={styles.title}>レシピ検索</h1>
                <button
                    onClick={() => router.push('/favorites')}
                    className={styles.favLink}
                >
                    ❤️ お気に入り
                </button>
            </header>

            <main>
                {/* 検索バー（詳細画面では非表示） */}
                {!selectedRecipe && (
                    <SearchBar
                        ingredient={ingredient}
                        setIngredient={setIngredient}
                        searchRecipes={searchRecipes}
                    />
                )}

                {/* ローディングスピナー */}
                {loading && <div className={styles.loader}></div>}

                {/* 検索結果 or おすすめ */}
                {!loading && !selectedRecipe && (
                    <>
                        <h2 className={styles.sectionTitle}>
                            {hasSearched
                                ? `「${searchKeyword}」の検索結果`
                                : '✨ おすすめレシピ'}
                        </h2>
                        {recipes.length > 0 ? (
                            <RecipeList
                                recipes={recipes}
                                favorites={favorites}
                                toggleFavorite={toggleFavorite}
                                fetchRecipeDetail={fetchRecipeDetail}
                            />
                        ) : (
                            hasSearched && (
                                <p className={styles.noResults}>
                                    レシピが見つかりませんでした。
                                </p>
                            )
                        )}
                    </>
                )}

                {/* 詳細表示 */}
                {!loading && selectedRecipe && (
                    <RecipeDetail
                        recipe={selectedRecipe}
                        favorites={favorites}
                        toggleFavorite={toggleFavorite}
                        onBack={() => setSelectedRecipe(null)}
                        ingredients={selectedRecipeIngredients}
                    />
                )}
            </main>
        </div>
    );
}
