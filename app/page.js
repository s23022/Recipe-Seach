"use client";
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import { auth, db } from './lib/firebase';
import { doc, setDoc } from 'firebase/firestore';
import styles from './rogin.module.css';

export default function LoginSignupPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: ''
  });
  const router = useRouter();

  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleLogin = async () => {
    try {
      await signInWithEmailAndPassword(auth, formData.email, formData.password);
      alert('ログインに成功しました！');
      router.push('/dashboard'); // ログイン後のページに遷移
    } catch (err) {
      if (err.code === 'auth/user-not-found') {
        alert('ユーザーが見つかりません。メールアドレスを確認してください。');
      } else if (err.code === 'auth/wrong-password') {
        alert('パスワードが間違っています。');
      } else if (err.code === 'auth/invalid-email') {
        alert('無効なメールアドレスです。');
      } else {
        alert('ログインに失敗しました: ' + err.message);
      }
    }
  };

  const handleSignUp = async () => {
    // この関数は使用しないが、後で必要になった時のために残しておく
    if (formData.password !== formData.confirmPassword) {
      alert('パスワードが一致しません');
      return;
    }

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, formData.email, formData.password);
      await setDoc(doc(db, 'users', formData.email), {
        email: formData.email,
      });
      alert('登録成功！ダッシュボードに移動します。');
      router.push('/dashboard');
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (isLogin) {
      await handleLogin();
    } else {
      // サインアップページに遷移
      router.push('/signup');
    }
  };

  return (
    <div className={styles.pageContainer}>
      <div className={styles.loginContainer}>
        <h1 className={styles.title}>
          {isLogin ? 'ログイン' : 'アカウント作成'}
        </h1>
        
        <form onSubmit={handleSubmit}>
          <div className={styles.formGroup}>
            <input
              type="email"
              name="email"
              placeholder="E-mail"
              value={formData.email}
              onChange={handleInputChange}
              required
            />
          </div>
          
          <div className={styles.formGroup}>
            <input
              type="password"
              name="password"
              placeholder="Password"
              value={formData.password}
              onChange={handleInputChange}
              required
            />
          </div>
          
          {!isLogin && (
            <div className={styles.formGroup}>
              <input
                type="password"
                name="confirmPassword"
                placeholder="Confirm Password"
                value={formData.confirmPassword}
                onChange={handleInputChange}
                required
              />
            </div>
          )}
          
          <button type="submit">
            {isLogin ? 'LOGIN' : 'SIGNUP'}
          </button>
        </form>
        
        <div className={styles.switchSection}>
          <p className={styles.switchText}>
            {isLogin ? 'アカウントをお持ちでない方は' : 'すでにアカウントをお持ちの方は'}
          </p>
          <button
            onClick={() => {
              if (!isLogin) {
                router.push('/signup');
              } else {
                setIsLogin(!isLogin);
              }
            }}
            className={styles.switchButton}
            type="button"
          >
            {isLogin ? 'アカウント作成' : 'ログインに戻る'}
          </button>
        </div>
      </div>
    </div>
  );
}