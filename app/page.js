'use client';

import { useState } from 'react';

export default function Home() {
    const [keyword, setKeyword] = useState('');
    const [recipes, setRecipes] = useState([]);
    const [loading, setLoading] = useState(false);

    async function searchRecipes() {
        if (!keyword) return;
        setLoading(true);

        // APIをNext.jsのAPI Route経由で呼び出す
        const res = await fetch(`/api/recipes?keyword=${encodeURIComponent(keyword)}`);
        const data = await res.json();

        setRecipes(data.result ? data.result : []);
        setLoading(false);
    }

    return (
        <main style={{ maxWidth: 600, margin: 'auto', padding: 20 }}>
            <h1>楽天レシピ検索</h1>
            <input
                type="text"
                placeholder="材料や料理名を入力"
                value={keyword}
                onChange={e => setKeyword(e.target.value)}
                style={{ width: '100%', padding: 8, marginBottom: 10 }}
            />
            <button onClick={searchRecipes} disabled={loading}>
                {loading ? '検索中...' : '検索'}
            </button>

            <ul style={{ marginTop: 20 }}>
                {recipes.length === 0 && !loading && <li>レシピがありません</li>}
                {recipes.map(recipe => (
                    <li key={recipe.recipeId} style={{ marginBottom: 10 }}>
                        <a href={recipe.recipeUrl} target="_blank" rel="noopener noreferrer">
                            <strong>{recipe.recipeTitle}</strong>
                        </a>
                        <br />
                        材料: {recipe.recipeMaterial}
                        <br />
                        <img src={recipe.recipeThumbnailUrl} alt={recipe.recipeTitle} style={{ width: 100, marginTop: 5 }} />
                    </li>
                ))}
            </ul>
        </main>
    );
}
