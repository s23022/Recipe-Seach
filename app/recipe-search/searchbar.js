import styles from './Home.module.css';

// 検索バーのコンポーネント
// ingredient: 現在の検索ワード
// setIngredient: 検索ワードを更新する関数
// searchRecipes: 検索実行用の関数
export default function SearchBar({ ingredient, setIngredient, searchRecipes }) {
    return (
        // 検索エリア全体のコンテナ
        <section className={styles.searchSection}>
            <div className={styles.searchBar}>
                {/* 食材入力欄 */}
                <input
                    type="text"
                    placeholder="例: chicken, onion" // 入力例のヒント
                    value={ingredient} // 入力欄の値を state と同期
                    onChange={(e) => setIngredient(e.target.value)} // 入力内容が変わったら更新
                    onKeyDown={(e) => e.key === 'Enter' && searchRecipes()} // Enterキーで検索実行
                    className={styles.input}
                />
                {/* 検索ボタン */}
                <button onClick={searchRecipes} className={styles.button}>
                    検索
                </button>
            </div>
        </section>
    );
}
