'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { auth, db } from '../lib/firebase';
import { doc, setDoc } from 'firebase/firestore';
import styles from './sign_up.module.css';

export default function SignUpPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const router = useRouter();

    const handleSignUp = async (e) => {
        e.preventDefault();
        if (password !== confirmPassword) {
            alert('パスワードが一致しません');
            return;
        }

        try {
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            await setDoc(doc(db, 'users', email), { email });
            alert('登録成功！ログイン画面に移動します。');
            router.push('/');
        } catch (err) {
            if (err.code === 'auth/email-already-in-use') {
                alert('このメールアドレスは既に使われています。ログインしてください。');
            } else if (err.code === 'auth/invalid-email') {
                alert('無効なメールアドレスです。正しいメールアドレスを入力してください。');
            } else if (err.code === 'auth/weak-password') {
                alert('パスワードは6文字以上にしてください。');
            } else {
                alert('登録に失敗しました: ' + err.message);
            }
        }
    };

    const goToLogin = () => {
        router.push('/');
    };

    return (
        <div className={styles.container}>
            <h1 className={styles.heading}>新規登録</h1>
            <form onSubmit={handleSignUp} className={styles.form}>
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
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className={styles.input}
                />
                <input
                    type="password"
                    placeholder="パスワード確認"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    className={styles.input}
                />
                <button type="submit" className={styles.button}>登録</button>
            </form>

            <p className={styles.loginLink}>
                すでにアカウントをお持ちの方は
                <button onClick={goToLogin} className={styles.linkButton}>ログインへ</button>
            </p>
        </div>
    );
}
