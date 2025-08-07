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
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    // パスワード強度を計算する関数
    const calculatePasswordStrength = (password) => {
        if (!password) return { score: 0, label: '', color: '' };
        
        let score = 0;
        const checks = {
            length: password.length >= 8,
            lowercase: /[a-z]/.test(password),
            uppercase: /[A-Z]/.test(password),
            numbers: /\d/.test(password),
            symbols: /[!@#$%^&*(),.?":{}|<>]/.test(password)
        };

        // スコア計算
        if (checks.length) score += 1;
        if (checks.lowercase) score += 1;
        if (checks.uppercase) score += 1;
        if (checks.numbers) score += 1;
        if (checks.symbols) score += 1;

        // 長さボーナス
        if (password.length >= 12) score += 1;

        // 強度判定
        if (score <= 2) return { score, label: '弱い', color: '#f44336' };
        if (score <= 4) return { score, label: '普通', color: '#ff9800' };
        if (score <= 5) return { score, label: '強い', color: '#4caf50' };
        return { score, label: '非常に強い', color: '#2e7d32' };
    };

    const passwordStrength = calculatePasswordStrength(password);
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

    const togglePasswordVisibility = () => {
        setShowPassword(!showPassword);
    };

    const toggleConfirmPasswordVisibility = () => {
        setShowConfirmPassword(!showConfirmPassword);
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
                <div className={styles.passwordContainer}>
                    <input
                        type={showPassword ? "text" : "password"}
                        placeholder="パスワード"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        className={styles.passwordInput}
                    />
                    <button
                        type="button"
                        onClick={togglePasswordVisibility}
                        className={styles.eyeButton}
                        aria-label={showPassword ? "パスワードを隠す" : "パスワードを表示"}
                    >
                        {showPassword ? (
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                <line x1="1" y1="1" x2="23" y2="23" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                        ) : (
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                        )}
                    </button>
                </div>
                {password && (
                    <div className={styles.passwordStrength}>
                        <div className={styles.strengthMeter}>
                            <div 
                                className={styles.strengthBar}
                                style={{ 
                                    width: `${(passwordStrength.score / 6) * 100}%`,
                                    backgroundColor: passwordStrength.color
                                }}
                            ></div>
                        </div>
                        <div className={styles.strengthLabel} style={{ color: passwordStrength.color }}>
                            パスワード強度: {passwordStrength.label}
                        </div>
                        <div className={styles.passwordTips}>
                            <ul>
                                <li className={password.length >= 8 ? styles.valid : styles.invalid}>
                                    8文字以上
                                </li>
                                <li className={/[a-z]/.test(password) ? styles.valid : styles.invalid}>
                                    小文字を含む
                                </li>
                                <li className={/[A-Z]/.test(password) ? styles.valid : styles.invalid}>
                                    大文字を含む
                                </li>
                                <li className={/\d/.test(password) ? styles.valid : styles.invalid}>
                                    数字を含む
                                </li>
                                <li className={/[!@#$%^&*(),.?":{}|<>]/.test(password) ? styles.valid : styles.invalid}>
                                    記号を含む
                                </li>
                            </ul>
                        </div>
                    </div>
                )}
                <div className={styles.passwordContainer}>
                    <input
                        type={showConfirmPassword ? "text" : "password"}
                        placeholder="パスワード確認"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        required
                        className={styles.passwordInput}
                    />
                    <button
                        type="button"
                        onClick={toggleConfirmPasswordVisibility}
                        className={styles.eyeButton}
                        aria-label={showConfirmPassword ? "パスワードを隠す" : "パスワードを表示"}
                    >
                        {showConfirmPassword ? (
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                <line x1="1" y1="1" x2="23" y2="23" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                        ) : (
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                        )}
                    </button>
                </div>
                <button type="submit" className={styles.button}>登録</button>
            </form>

            <p className={styles.loginLink}>
                すでにアカウントをお持ちの方は
                <button onClick={goToLogin} className={styles.linkButton}>ログインへ</button>
            </p>
        </div>
    );
}