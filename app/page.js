'use client';  // Next.jsのApp Routerでクライアントコンポーネントを示す

import { useState } from 'react'; // ReactのuseStateフックを使うためインポート
import styles from './Home.module.css'; // CSSモジュールでスタイルを読み込み

export default function Home() {
    // 入力された材料のテキスト状態（初期値は空文字）
    const [ingredient, setIngredient] = useState('');
    // APIから取得したレシピ一覧を格納（初期は空配列）
    const [recipes, setRecipes] = useState([]);
    // 選択したレシピの詳細情報を格納（初期はnullで何も選択されていない状態）
    const [selectedRecipe, setSelectedRecipe] = useState(null);
    // ローディング中かどうかのフラグ（API通信中にtrueにして処理中を表示）
    const [loading, setLoading] = useState(false);

    // 材料テキストからレシピ検索をする非同期関数
    async function searchRecipes() {
        if (!ingredient.trim()) return;

        setLoading(true);
        setSelectedRecipe(null);
        setRecipes([]);

        try {
            // 材料をカンマで分割しトリム（["chicken", "garlic"] みたいに）
            const inputIngredients = ingredient
                .split(',')
                .map((s) => s.trim().toLowerCase())
                .filter((s) => s);

            const primary = inputIngredients[0];          // 最初の材料でAPI検索
            const others = inputIngredients.slice(1);     // それ以外は絞り込み対象

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

                    // 入力された全ての材料が含まれているかチェック
                    const allIncluded = others.every((i) => ingredientsList.includes(i));
                    if (allIncluded) {
                        filtered.push(meal); // 条件を満たすレシピだけ追加
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

    // レシピIDを指定して詳細情報を取得する非同期関数
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
                    placeholder="例(複数指定の場合):chicken, garlic"
                    value={ingredient}
                    onChange={(e) => {
                        const val = e.target.value;
                        setIngredient(val);

                        // 入力が空文字ならリセット
                        if (val.trim() === '') {
                            setRecipes([]);
                            setSelectedRecipe(null);
                            setLoading(false); // 念のためloadingもfalseにしておく
                        }
                    }}
                    className={styles.input}
                />
            <button onClick={searchRecipes} className={styles.button}>検索</button>

            </div>
            {loading && <p>読み込み中...</p>}

            {!loading && !selectedRecipe && (
                <>
                    {recipes.length === 0 ? (
                        <p className={styles.Not_recipes}>レシピがありません</p>
                    ) : (
                        <>
                            <p className={styles.Search_results}>{ingredient} に関するレシピ</p>
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
