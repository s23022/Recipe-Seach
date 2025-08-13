import styles from './Home.module.css';
// Home.module.cssからCSSモジュールを読み込む
// このファイル内で使用するクラス名は styles.クラス名 で参照可能になる

// RecipeDetailコンポーネント
// Props:
//   recipe: 表示するレシピ情報のオブジェクト
//   favorites: 現在のお気に入りレシピの配列
//   toggleFavorite: お気に入りの追加・削除を行う関数
//   onBack: 「戻る」ボタン押下時に呼び出される関数
//   ingredients: 材料と分量の配列（{ name, measure }の形）
export default function RecipeDetail({ recipe, favorites, toggleFavorite, onBack, ingredients }) {

    // recipe が存在しない場合は何も表示しない
    if (!recipe) return null;

    return (
        <div className={styles.recipeDetail}>
            {/* 戻るボタン */}
            <button onClick={onBack} className={styles.backButton}>
                ← 検索結果に戻る
            </button>

            {/* レシピ名 */}
            <h2 className={styles.detailTitle}>{recipe.strMeal}</h2>

            {/* レシピのカテゴリと地域（存在する場合のみ表示） */}
            <div className={styles.detailHeader}>
                {recipe.strCategory && (
                    <span className={styles.tag}>{recipe.strCategory}</span>
                )}
                {recipe.strArea && (
                    <span className={styles.tag}>{recipe.strArea}</span>
                )}
            </div>

            {/* レシピ画像 */}
            <img
                src={recipe.strMealThumb}
                alt={recipe.strMeal}
                className={styles.recipeDetailImg}
            />

            {/* お気に入り追加・削除ボタン */}
            <button
                onClick={() => toggleFavorite(recipe)}
                className={`
                    ${styles.mainFavoriteButton} 
                    ${favorites.some(f => f.idMeal === recipe.idMeal) ? styles.isFavorite : ''}
                `}
            >
                {favorites.some(f => f.idMeal === recipe.idMeal)
                    ? '★ お気に入りから削除'
                    : '☆ お気に入りに追加'}
            </button>

            {/* 材料と分量セクション */}
            <div className={styles.detailSection}>
                <h3>材料と分量</h3>
                <ul className={styles.ingredientList}>
                    {ingredients.map((item, index) => (
                        <li key={index}>
                            <span>{item.name}</span>
                            <span>{item.measure}</span>
                        </li>
                    ))}
                </ul>
            </div>

            {/* 作り方セクション */}
            <div className={styles.detailSection}>
                <h3>作り方</h3>
                <p className={styles.instructions}>
                    {recipe.strInstructions}
                </p>
            </div>
        </div>
    );
}
