'use client'; // Next.jsのクライアントコンポーネントとして動作することを宣言

import { useState } from 'react';
import { useRouter } from 'next/navigation'; // ページ遷移用のフックをインポート
import { signInWithEmailAndPassword } from 'firebase/auth'; // Firebaseのメール/パスワード認証関数
import { auth } from './lib/firebase'; // Firebaseの認証インスタンス
import styles from './rogin.module.css'; // CSSモジュールをインポート（ファイル名はtypo？）

export default function LoginPage() {
  // フォーム入力値のstate管理
  const [email, setEmail] = useState(''); // メールアドレス
  const [pw, setPw] = useState(''); // パスワード
  const [error, setError] = useState(''); // エラーメッセージ
  const router = useRouter(); // ページ遷移用のフック

  /**
   * ログイン処理のハンドラー
   * @param {Event} e フォーム送信イベント
   */
  const handleLogin = async (e) => {
    e.preventDefault(); // フォーム送信によるページリロードを防止
    setError(''); // エラーメッセージリセット
    try {
      // Firebaseでメール・パスワードを使ったログインを試みる
      await signInWithEmailAndPassword(auth, email, pw);
      router.push('/recipe-search'); // ログイン成功後、レシピ検索画面へ遷移
    } catch (err) {
      // Firebase認証のエラーコードに応じた処理
      if (err.code === 'auth/user-not-found') {
        alert('このアカウントは登録されていません。新規登録を行ってください');
      } else if (err.code === 'auth/wrong-password' || err.code === 'auth/invalid-login-credentials') {
        alert('メールアドレス、もしくはパスワードが間違っています');
      } else {
        alert('ログインに失敗しました: ' + err.message);
      }
      setError(err.message); // エラーメッセージをstateにセット（画面下部に表示）
    }
  };

  // 新規登録ページへ遷移する関数
  const goToSignUp = () => {
    router.push('/sign_up');
  };

  return (
      <div className={styles.pageContainer}>
        {/* アプリのタイトル */}
        <h1 className={styles.h1_text}>レシピ検索アプリ</h1>

        <div className={styles.container}>
          {/* ログイン画面の見出し */}
          <h1 className={styles.heading}>ログイン</h1>

          {/* ログインフォーム */}
          <form onSubmit={handleLogin} className={styles.form}>

            {/* メールアドレス入力グループ */}
            <div className={styles.inputGroup}>
              <label htmlFor="email" className={styles.label}>メールアドレス</label>
              <input
                  id="email"
                  type="email"
                  placeholder="メールアドレス"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)} // 入力値更新
                  required
                  className={styles.input}
              />
            </div>

            {/* パスワード入力グループ */}
            <div className={styles.inputGroup}>
              <label htmlFor="password" className={styles.label}>パスワード</label>
              <div className={styles.passwordContainer}>
                <input
                    id="password"
                    type="password"
                    placeholder="パスワード"
                    value={pw}
                    onChange={(e) => setPw(e.target.value)} // 入力値更新
                    required
                    className={styles.passwordInput}
                />
                {/* パスワードの表示切替ボタンなどのアイコンを入れる場合はここに配置可能 */}
              </div>
            </div>

            {/* ログインボタン */}
            <button type="submit" className={styles.button}>ログイン</button>
          </form>

          {/* 新規登録ページへのリンク */}
          <p className={styles.loginLink}>
            アカウントをお持ちでない方は
            <button onClick={goToSignUp} className={styles.linkButton}>新規登録へ</button>
          </p>

          {/* エラーメッセージの表示（あれば） */}
          {error && <p className={styles.error}>{error}</p>}
        </div>
      </div>
  );
}
