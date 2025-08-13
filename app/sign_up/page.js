'use client'; // Next.jsのクライアントコンポーネントとして動作することを宣言
import {useState} from 'react';
import {useRouter} from 'next/navigation'; // Next.jsのルーターを使うためのフック
import {createUserWithEmailAndPassword} from 'firebase/auth'; // Firebase Authenticationのメール登録関数
import {auth, db} from '../lib/firebase'; // Firebase初期化済みのauth, dbをインポート
import {doc, setDoc} from 'firebase/firestore'; // Firestoreのドキュメント作成用関数
import styles from './sign_up.module.css'; // CSSモジュールでスタイルをインポート

export default function SignUpPage() {
    // フォームの入力状態を管理するstate
    const [email, setEmail] = useState(''); // メールアドレス
    const [password, setPassword] = useState(''); // パスワード
    const [confirmPassword, setConfirmPassword] = useState(''); // パスワード確認用
    const [showPassword, setShowPassword] = useState(false); // パスワードの表示・非表示トグル
    const [showConfirmPassword, setShowConfirmPassword] = useState(false); // 確認パスワードの表示・非表示トグル
    const [isLoading, setIsLoading] = useState(false); // 処理中かどうかのフラグ（ボタンの多重押し防止など）
    const [errors, setErrors] = useState({}); // 入力エラー情報を格納するオブジェクト

    const router = useRouter(); // ページ遷移用のルーター

    /**
     * パスワードの強度を計算する関数
     * - 文字数や文字種（小文字、大文字、数字、記号）をチェックしスコア化
     * - スコアに応じて強度ラベル、色、強度バーの割合を返す
     */
    const calculatePasswordStrength = (password) => {
        if (!password) return {score: 0, label: '', color: '', percentage: 0};

        let score = 0;
        const checks = {
            length: password.length >= 8,
            lowercase: /[a-z]/.test(password),
            uppercase: /[A-Z]/.test(password),
            numbers: /\d/.test(password),
            symbols: /[!@#$%^&*(),.?":{}|<>]/.test(password)
        };

        // 条件ごとにスコアを加算
        if (checks.length) score += 1;
        if (checks.lowercase) score += 1;
        if (checks.uppercase) score += 1;
        if (checks.numbers) score += 1;
        if (checks.symbols) score += 1;

        // パスワードが12文字以上なら追加加点
        if (password.length >= 12) score += 1;

        const maxScore = 6;
        const percentage = (score / maxScore) * 100;

        // スコアに応じた強度の判定と色の設定
        if (score <= 2) return {score, label: '弱い', color: '#f44336', percentage};
        if (score <= 4) return {score, label: '普通', color: '#ff9800', percentage};
        if (score <= 5) return {score, label: '強い', color: '#4caf50', percentage};
        return {score, label: '非常に強い', color: '#2e7d32', percentage};
    };

    // 現在のパスワード入力の強度情報
    const passwordStrength = calculatePasswordStrength(password);

    /**
     * フォームの入力値に対してリアルタイムにバリデーションを行い
     * エラーメッセージをerrorsにセットする
     * @returns {boolean} バリデーションが成功したかどうか
     */
    const validateForm = () => {
        const newErrors = {};

        // メールアドレスの必須チェックと形式チェック
        if (!email) {
            newErrors.email = 'メールアドレスを入力してください';
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            newErrors.email = '有効なメールアドレスを入力してください';
        }

        // パスワードの必須チェックと最小文字数チェック
        if (!password) {
            newErrors.password = 'パスワードを入力してください';
        } else if (password.length < 6) {
            newErrors.password = 'パスワードは6文字以上で入力してください';
        }

        // パスワード確認の必須チェックと一致チェック
        if (!confirmPassword) {
            newErrors.confirmPassword = 'パスワード確認を入力してください';
        } else if (password !== confirmPassword) {
            newErrors.confirmPassword = 'パスワードが一致しません';
        }

        setErrors(newErrors); // エラー状態を更新
        return Object.keys(newErrors).length === 0; // エラーがなければtrueを返す
    };

    /**
     * 新規登録処理を実行するハンドラー
     * @param {Event} e フォーム送信イベント
     */
    const handleSignUp = async (e) => {
        e.preventDefault(); // ページリロード防止

        if (!validateForm()) { // バリデーション失敗なら中断
            return;
        }

        if (isLoading) return; // 処理中なら多重送信防止

        setIsLoading(true); // ローディング状態開始
        setErrors({});      // エラーリセット

        try {
            // Firebase Authenticationでメール・パスワード登録を実行
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);

            // 登録成功後、Firestoreにユーザーデータを保存（ユーザーIDをドキュメントIDに使用）
            await setDoc(doc(db, 'users', userCredential.user.uid), {
                email: email,
                createdAt: new Date().toISOString(),
                displayName: email.split('@')[0] // メールの@前を初期表示名に
            });

            alert('登録成功！ログイン画面に移動します。');
            router.push('/'); // ログイン画面へ遷移
        } catch (err) {
            // Firebaseのエラーコードに応じてエラーメッセージを設定
            let errorMessage = '登録に失敗しました。';

            switch (err.code) {
                case 'auth/email-already-in-use':
                    errorMessage = 'このメールアドレスは既に使われています。ログインしてください。';
                    setErrors({email: errorMessage});
                    break;
                case 'auth/invalid-email':
                    errorMessage = '無効なメールアドレスです。正しいメールアドレスを入力してください。';
                    setErrors({email: errorMessage});
                    break;
                case 'auth/weak-password':
                    errorMessage = 'パスワードは6文字以上にしてください。';
                    setErrors({password: errorMessage});
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

            // もしemailやpassword以外のエラーならアラート表示
            if (!errors.email && !errors.password) {
                alert(errorMessage);
            }
        } finally {
            setIsLoading(false); // ローディング状態終了
        }
    };

    // ログイン画面へ遷移する関数
    const goToLogin = () => {
        router.push('/');
    };

    // パスワード表示切り替えトグル
    const togglePasswordVisibility = () => {
        setShowPassword(!showPassword);
    };

    // 確認パスワード表示切り替えトグル
    const toggleConfirmPasswordVisibility = () => {
        setShowConfirmPassword(!showConfirmPassword);
    };

    // パスワード要件のチェック条件とラベル一覧
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

    /**
     * パスワード表示切り替えボタンのアイコンコンポーネント
     * @param {boolean} isVisible - パスワードが表示状態かどうか
     */
    const EyeIcon = ({isVisible}) => (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            {isVisible ? (
                <>
                    {/* パスワード表示中（目に斜線） */}
                    <path
                        d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"
                        stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <line x1="1" y1="1" x2="23" y2="23" stroke="currentColor" strokeWidth="2" strokeLinecap="round"
                          strokeLinejoin="round"/>
                </>
            ) : (
                <>
                    {/* パスワード非表示（目のアイコン） */}
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" stroke="currentColor" strokeWidth="2"
                          strokeLinecap="round" strokeLinejoin="round"/>
                    <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2" strokeLinecap="round"
                            strokeLinejoin="round"/>
                </>
            )}
        </svg>
    );

    return (
        <div className={styles.pageContainer}>
            <div className={styles.container}>
                {/* ページタイトル */}
                <h1 className={styles.heading}>新規登録</h1>

                {/* 新規登録フォーム */}
                <form onSubmit={handleSignUp} className={styles.form}>
                    {/* メールアドレス入力欄 */}
                    <div className={styles.inputGroup}>
                        <input
                            type="email"
                            placeholder="メールアドレス"
                            value={email}
                            onChange={(e) => {
                                setEmail(e.target.value);
                                if (errors.email) {
                                    setErrors(prev => ({...prev, email: ''}));
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

                    {/* パスワード入力欄 */}
                    <div className={styles.inputGroup}>
                        <div className={styles.passwordContainer}>
                            <input
                                type={showPassword ? "text" : "password"}
                                placeholder="パスワード"
                                value={password}
                                onChange={(e) => {
                                    setPassword(e.target.value);
                                    if (errors.password) {
                                        setErrors(prev => ({...prev, password: ''}));
                                    }
                                }}
                                required
                                disabled={isLoading}
                                className={`${styles.passwordInput} ${errors.password ? styles.inputError : ''}`}
                                aria-describedby={errors.password ? "password-error" : "password-requirements"}
                            />
                            {/* パスワード表示切替ボタン */}
                            <button
                                type="button"
                                onClick={togglePasswordVisibility}
                                className={styles.eyeButton}
                                disabled={isLoading}
                                aria-label={showPassword ? "パスワードを隠す" : "パスワードを表示"}
                            >
                                <EyeIcon isVisible={showPassword}/>
                            </button>
                        </div>
                        {errors.password && (
                            <div id="password-error" className={styles.errorMessage} role="alert">
                                {errors.password}
                            </div>
                        )}
                    </div>

                    {/* パスワード強度表示 */}
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
                            <div className={styles.strengthLabel} style={{color: passwordStrength.color}}>
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

                    {/* パスワード確認入力欄 */}
                    <div className={styles.inputGroup}>
                        <div className={styles.passwordContainer}>
                            <input
                                type={showConfirmPassword ? "text" : "password"}
                                placeholder="パスワード確認"
                                value={confirmPassword}
                                onChange={(e) => {
                                    setConfirmPassword(e.target.value);
                                    if (errors.confirmPassword) {
                                        setErrors(prev => ({...prev, confirmPassword: ''}));
                                    }
                                }}
                                required
                                disabled={isLoading}
                                className={`${styles.passwordInput} ${errors.confirmPassword ? styles.inputError : ''}`}
                                aria-describedby={errors.confirmPassword ? "confirm-password-error" : undefined}
                            />
                            {/* パスワード確認表示切替ボタン */}
                            <button
                                type="button"
                                onClick={toggleConfirmPasswordVisibility}
                                className={styles.eyeButton}
                                disabled={isLoading}
                                aria-label={showConfirmPassword ? "パスワードを隠す" : "パスワードを表示"}
                            >
                                <EyeIcon isVisible={showConfirmPassword}/>
                            </button>
                        </div>
                        {errors.confirmPassword && (
                            <div id="confirm-password-error" className={styles.errorMessage} role="alert">
                                {errors.confirmPassword}
                            </div>
                        )}
                    </div>

                    {/* 登録ボタン */}
                    <button
                        type="submit"
                        className={`${styles.button} ${isLoading ? styles.loading : ''}`}
                        disabled={isLoading}
                    >
                        {isLoading ? '登録中...' : '登録'}
                    </button>
                </form>

                {/* ログイン画面へのリンク */}
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
        </div>
    );
}
