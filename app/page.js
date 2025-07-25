'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from './lib/firebase';
import styles from './rogin.module.css';

export default function LoginPage() {
    const [email, setEmail] = useState('');
    const [pw, setPw] = useState('');
    const [error, setError] = useState('');
    const router = useRouter();

    const handleLogin = async (e) => {
        e.preventDefault();
        setError('');
        try {
            await signInWithEmailAndPassword(auth, email, pw);
            router.push('/recipe-search'); // ここで遷移！
        } catch (err) {
            if (err.code === 'auth/user-not-found') {
                alert('このアカウントは登録されていません。新規登録を行ってください');
            } else if (err.code === 'auth/wrong-password' || err.code === 'auth/invalid-login-credentials') {
                alert('メールアドレス、もしくはパスワードが間違っています');
            } else {
                alert('ログインに失敗しました: ' + err.message);
            }
            setError(err.message);
        }
    };

    const goToSignUp = () => {
        router.push('/sign_up');
    };

    return (
        <div className={styles.container}>
            <h1 className={styles.title}>ログイン画面</h1>
            <form onSubmit={handleLogin} className={styles.form}>
                <input
                    type="email"
                    placeholder="メールアドレス"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className={styles.input}
                />
                <input
                    type="password"
                    placeholder="パスワード"
                    value={pw}
                    onChange={(e) => setPw(e.target.value)}
                    required
                    className={styles.input}
                />
                <button type="submit" className={styles.button}>ログイン</button>
            </form>

            <p className={styles.linkText}>
                アカウントをお持ちでない方は
                <button onClick={goToSignUp} className={styles.linkButton}>新規登録へ</button>
            </p>

            {error && <p className={styles.error}>{error}</p>}
        </div>
    );
}
