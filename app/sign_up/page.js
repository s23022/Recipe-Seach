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
    const [isLoading, setIsLoading] = useState(false);
    const [errors, setErrors] = useState({});

    const router = useRouter();

    // パスワード強度を計算する関数
    const calculatePasswordStrength = (password) => {
        if (!password) return { score: 0, label: '', color: '', percentage: 0 };
        
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

        const maxScore = 6;
        const percentage = (score / maxScore) * 100;

        // 強度判定
        if (score <= 2) return { score, label: '弱い', color: '#f44336', percentage };
        if (score <= 4) return { score, label: '普通', color: '#ff9800', percentage };
        if (score <= 5) return { score, label: '強い', color: '#4caf50', percentage };
        return { score, label: '非常に強い', color: '#2e7d32', percentage };
    };

    const passwordStrength = calculatePasswordStrength(password);

    // リアルタイムバリデーション
    const validateForm = () => {
        const newErrors = {};

        // メールバリデーション
        if (!email) {
            newErrors.email = 'メールアドレスを入力してください';
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            newErrors.email = '有効なメールアドレスを入力してください';
        }

        // パスワードバリデーション
        if (!password) {
            newErrors.password = 'パスワードを入力してください';
        } else if (password.length < 6) {
            newErrors.password = 'パスワードは6文字以上で入力してください';
        }

        // パスワード確認バリデーション
        if (!confirmPassword) {
            newErrors.confirmPassword = 'パスワード確認を入力してください';
        } else if (password !== confirmPassword) {
            newErrors.confirmPassword = 'パスワードが一致しません';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSignUp = async (e) => {
        e.preventDefault();
        
        if (!validateForm()) {
            return;
        }

        if (isLoading) return;

        setIsLoading(true);
        setErrors({});

        try {
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            
            // ユーザー情報をFirestoreに保存（UIDをドキュメントIDとして使用）
            await setDoc(doc(db, 'users', userCredential.user.uid), { 
                email: email,
                createdAt: new Date().toISOString(),
                displayName: email.split('@')[0] // メールアドレスのローカル部分を初期表示名として使用
            });
            
            alert('登録成功！ログイン画面に移動します。');
            router.push('/');
        } catch (err) {
            let errorMessage = '登録に失敗しました。';
            
            switch (err.code) {
                case 'auth/email-already-in-use':
                    errorMessage = 'このメールアドレスは既に使われています。ログインしてください。';
                    setErrors({ email: errorMessage });
                    break;
                case 'auth/invalid-email':
                    errorMessage = '無効なメールアドレスです。正しいメールアドレスを入力してください。';
                    setErrors({ email: errorMessage });
                    break;
                case 'auth/weak-password':
                    errorMessage = 'パスワードは6文字以上にしてください。';
                    setErrors({ password: errorMessage });
                    break;
                case 'auth/operation-not-allowed':
                    errorMessage = 'アカウント作成が無効になっています。管理者に連絡してください。';
                    break;
                case 'auth/network-request-failed':
                    errorMessage = 'ネットワークエラーが発生しました。接続を確認してください。';
                    break;
                default:
                    errorMessage = `登録に失敗しました: ${err.message}`;
            }
            
            if (!errors.email && !errors.password) {
                alert(errorMessage);
            }
        } finally {
            setIsLoading(false);
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

    // パスワード要件チェック用の配列
    const passwordRequirements = [
        { 
            test: (pwd) => pwd.length >= 8, 
            label: '8文字以上' 
        },
        { 
            test: (pwd) => /[a-z]/.test(pwd), 
            label: '小文字を含む' 
        },
        { 
            test: (pwd) => /[A-Z]/.test(pwd), 
            label: '大文字を含む' 
        },
        { 
            test: (pwd) => /\d/.test(pwd), 
            label: '数字を含む' 
        },
        { 
            test: (pwd) => /[!@#$%^&*(),.?":{}|<>]/.test(pwd), 
            label: '記号を含む' 
        }
    ];

    const EyeIcon = ({ isVisible }) => (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            {isVisible ? (
                <>
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <line x1="1" y1="1" x2="23" y2="23" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </>
            ) : (
                <>
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </>
            )}
        </svg>
    );

    return (
        <div className={styles.container}>
            <h1 className={styles.heading}>新規登録</h1>
            <form onSubmit={handleSignUp} className={styles.form}>
                <div className={styles.inputGroup}>
                    <input
                        type="email"
                        placeholder="メールアドレス"
                        value={email}
                        onChange={(e) => {
                            setEmail(e.target.value);
                            if (errors.email) {
                                setErrors(prev => ({ ...prev, email: '' }));
                            }
                        }}
                        required
                        disabled={isLoading}
                        className={`${styles.input} ${errors.email ? styles.inputError : ''}`}
                        aria-describedby={errors.email ? "email-error" : undefined}
                    />
                    {errors.email && (
                        <div id="email-error" className={styles.errorMessage} role="alert">
                            {errors.email}
                        </div>
                    )}
                </div>

                <div className={styles.inputGroup}>
                    <div className={styles.passwordContainer}>
                        <input
                            type={showPassword ? "text" : "password"}
                            placeholder="パスワード"
                            value={password}
                            onChange={(e) => {
                                setPassword(e.target.value);
                                if (errors.password) {
                                    setErrors(prev => ({ ...prev, password: '' }));
                                }
                            }}
                            required
                            disabled={isLoading}
                            className={`${styles.passwordInput} ${errors.password ? styles.inputError : ''}`}
                            aria-describedby={errors.password ? "password-error" : "password-requirements"}
                        />
                        <button
                            type="button"
                            onClick={togglePasswordVisibility}
                            className={styles.eyeButton}
                            disabled={isLoading}
                            aria-label={showPassword ? "パスワードを隠す" : "パスワードを表示"}
                        >
                            <EyeIcon isVisible={showPassword} />
                        </button>
                    </div>
                    {errors.password && (
                        <div id="password-error" className={styles.errorMessage} role="alert">
                            {errors.password}
                        </div>
                    )}
                </div>

                {password && (
                    <div className={styles.passwordStrength}>
                        <div className={styles.strengthMeter}>
                            <div 
                                className={styles.strengthBar}
                                style={{ 
                                    width: `${passwordStrength.percentage}%`,
                                    backgroundColor: passwordStrength.color,
                                    transition: 'width 0.3s ease, background-color 0.3s ease'
                                }}
                            />
                        </div>
                        <div className={styles.strengthLabel} style={{ color: passwordStrength.color }}>
                            パスワード強度: {passwordStrength.label}
                        </div>
                        <div id="password-requirements" className={styles.passwordTips}>
                            <ul>
                                {passwordRequirements.map((requirement, index) => (
                                    <li 
                                        key={index}
                                        className={requirement.test(password) ? styles.valid : styles.invalid}
                                    >
                                        {requirement.label}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>
                )}

                <div className={styles.inputGroup}>
                    <div className={styles.passwordContainer}>
                        <input
                            type={showConfirmPassword ? "text" : "password"}
                            placeholder="パスワード確認"
                            value={confirmPassword}
                            onChange={(e) => {
                                setConfirmPassword(e.target.value);
                                if (errors.confirmPassword) {
                                    setErrors(prev => ({ ...prev, confirmPassword: '' }));
                                }
                            }}
                            required
                            disabled={isLoading}
                            className={`${styles.passwordInput} ${errors.confirmPassword ? styles.inputError : ''}`}
                            aria-describedby={errors.confirmPassword ? "confirm-password-error" : undefined}
                        />
                        <button
                            type="button"
                            onClick={toggleConfirmPasswordVisibility}
                            className={styles.eyeButton}
                            disabled={isLoading}
                            aria-label={showConfirmPassword ? "パスワードを隠す" : "パスワードを表示"}
                        >
                            <EyeIcon isVisible={showConfirmPassword} />
                        </button>
                    </div>
                    {errors.confirmPassword && (
                        <div id="confirm-password-error" className={styles.errorMessage} role="alert">
                            {errors.confirmPassword}
                        </div>
                    )}
                </div>

                <button 
                    type="submit" 
                    className={`${styles.button} ${isLoading ? styles.loading : ''}`}
                    disabled={isLoading}
                >
                    {isLoading ? '登録中...' : '登録'}
                </button>
            </form>

            <p className={styles.loginLink}>
                すでにアカウントをお持ちの方は
                <button 
                    onClick={goToLogin} 
                    className={styles.linkButton}
                    disabled={isLoading}
                >
                    ログインへ
                </button>
            </p>
        </div>
    );
}