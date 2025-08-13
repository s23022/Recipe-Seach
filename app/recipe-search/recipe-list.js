import styles from './Home.module.css';
// CSSモジュールを読み込み。クラス名の衝突を避けてスタイリングするため。

export default function RecipeList({ recipes, favorites, toggleFavorite, fetchRecipeDetail }) {
    // RecipeListコンポーネントは、レシピ一覧をカード形式で表示する
    // props:
    //   recipes: 表示するレシピ配列
    //   favorites: お気に入りに登録されたレシピ配列
    //   toggleFavorite: お気に入り登録/解除を行う関数
    //   fetchRecipeDetail: レシピ詳細を取得する関数

    if (recipes.length === 0) return null;
    // レシピ配列が空の場合は何も表示しない

    return (
        <div className={styles.recipeGrid}>
            {/* レシピ一覧をグリッドレイアウトで表示 */}
            {recipes.map((r) => {
                // 各レシピが「お気に入り」かどうかを判定
                const isFavorite = favorites.some(f => f.idMeal === r.idMeal);

                return (
                    <div
                        key={r.idMeal}
                        className={styles.recipeCard}
                        onClick={() => fetchRecipeDetail(r.idMeal)}
                        // カードクリックでそのレシピの詳細を取得
                    >
                        <img
                            src={r.strMealThumb}
                            alt={r.strMeal}
                            className={styles.recipeThumb}
                            // レシピのサムネイル画像
                        />
                        <div className={styles.recipeCardContent}>
                            {/* レシピ名 */}
                            <span className={styles.recipeTitle}>{r.strMeal}</span>

                            {/* お気に入りボタン */}
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    // カードクリックイベントを無効化（詳細ページに飛ばないようにする）
                                    toggleFavorite(r);
                                    // お気に入り登録/解除を実行
                                }}
                                className={`${styles.favoriteButton} ${isFavorite ? styles.isFavorite : ''}`}
                                // isFavoriteがtrueならスタイルを変更（色や見た目）
                                aria-label={isFavorite ? 'お気に入りから削除' : 'お気に入りに追加'}
                                // アクセシビリティ対応（スクリーンリーダー向けの説明）
                            >
                                {/* お気に入り状態に応じてアイコンを切り替え */}
                                {isFavorite ? '★' : '☆'}
                            </button>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
