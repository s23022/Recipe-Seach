'use client'; // Next.jsでクライアント側（ブラウザ側）で動くコンポーネントであることを宣言

import { useRef, useEffect } from 'react';
import styles from './Home.module.css';

// ユーザーメニューコンポーネント
// props:
// - user: ログイン中のユーザー情報（nullなら未ログイン）
// - isMenuVisible: メニューの表示状態（trueで表示）
// - setIsMenuVisible: メニュー表示状態を更新する関数
// - handleLogout: ログアウト処理を実行する関数
export default function UserMenu({ user, isMenuVisible, setIsMenuVisible, handleLogout }) {
    // メニュー部分のDOM要素への参照
    const menuRef = useRef(null);
    // ユーザーアイコン部分のDOM要素への参照
    const userIconRef = useRef(null);

    // コンポーネントがマウントされた後の副作用処理
    useEffect(() => {
        // メニュー外をクリックした時にメニューを閉じる処理
        function handleClickOutside(event) {
            // クリックされた場所がメニュー内でもユーザーアイコン内でもない場合
            if (
                menuRef.current && !menuRef.current.contains(event.target) &&
                userIconRef.current && !userIconRef.current.contains(event.target)
            ) {
                setIsMenuVisible(false); // メニューを非表示にする
            }
        }
        // マウスクリックイベント（mousedown）を監視
        document.addEventListener("mousedown", handleClickOutside);

        // クリーンアップ（コンポーネントがアンマウントされる時にイベントを解除）
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [setIsMenuVisible]);

    // ユーザー情報がない場合（未ログイン時）は何も表示しない
    if (!user) return null;

    return (
        <>
            {/* ユーザーアイコン部分 */}
            <div
                ref={userIconRef} // DOM参照を設定
                className={styles.userIcon} // CSSクラスを適用
                onClick={() => setIsMenuVisible(!isMenuVisible)} // クリックでメニュー表示/非表示を切り替える
            >
                {/* ユーザーのメールアドレスの先頭文字を大文字で表示 */}
                {user.email.charAt(0).toUpperCase()}
            </div>

            {/* メニューが表示状態のときだけ描画 */}
            {isMenuVisible && (
                <div ref={menuRef} className={styles.userMenu}>
                    {/* メニュー上部のユーザー情報表示 */}
                    <div className={styles.userInfo}>
                        <div className={styles.menuIcon}>
                            {user.email.charAt(0).toUpperCase()}
                        </div>
                        <span className={styles.menuEmail}>{user.email}</span>
                    </div>

                    {/* ログアウトボタン */}
                    <button
                        onClick={handleLogout} // クリック時にログアウト処理
                        className={styles.logoutButton}
                    >
                        ログアウト
                    </button>
                </div>
            )}
        </>
    );
}
