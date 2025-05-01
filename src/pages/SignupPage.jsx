// src/pages/SignupPage.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom'; // 引入路由相關 hooks 和 Link
import  useAuth from '../hooks/useAuth'; // 引入 useAuth hook (用於檢查是否已登入)
import apiClient from '../services/api'; // 引入 apiClient 直接調用註冊 API
import './AuthForm.css'; // 復用 Auth 表單樣式

const SignupPage = () => {
    const [username, setUsername] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState(''); // 確認密碼
    const [error, setError] = useState('');
    const [successMessage, setSuccessMessage] = useState(''); // 註冊成功提示
    const [isLoading, setIsLoading] = useState(false);
    const navigate = useNavigate();
    const { isAuthenticated, isLoading: isAuthLoading } = useAuth(); // 只獲取認證狀態和加載狀態

    // --- 檢查是否已登入 ---
    useEffect(() => {
        if (!isAuthLoading && isAuthenticated) {
            console.log('[SignupPage] User already authenticated. Redirecting to home.');
            navigate('/', { replace: true }); // 已登入則跳轉到首頁
        }
    }, [isAuthenticated, isAuthLoading, navigate]);

    // --- 處理表單提交 ---
    const handleSubmit = async (event) => {
        event.preventDefault();
        setError('');
        setSuccessMessage('');
        setIsLoading(true);

        // --- 前端密碼確認 ---
        if (password !== confirmPassword) {
            setError('兩次輸入的密碼不一致');
            setIsLoading(false);
            return; // 阻止提交
        }

        try {
            // 準備請求數據
            const signUpData = { username, email, password };

            // 直接調用 apiClient 發送註冊請求
            const response = await apiClient.post('/auth/signup/user', signUpData);

            if (response.data?.success && response.data?.data) {
                // 註冊成功
                console.log('[SignupPage] Signup successful for:', response.data.data.username);
                setSuccessMessage('註冊成功！您現在可以前往登入頁面登入了。');
                // 清空表單 (可選)
                setUsername('');
                setEmail('');
                setPassword('');
                setConfirmPassword('');
                // 可選：幾秒後自動跳轉到登錄頁
                setTimeout(() => {
                    navigate('/login');
                }, 3000); // 3 秒後跳轉
            } else {
                // API 返回不成功
                throw new Error(response.data?.message || '註冊失敗，請稍後再試。');
            }
        } catch (error) {
            // 處理請求錯誤 (包括後端返回的業務錯誤，例如用戶名已存在)
            console.error("[SignupPage] Signup failed:", error?.data?.message || error?.message || error);
            setError(error?.data?.message || error?.message || '註冊過程中發生錯誤，請檢查您的輸入或稍後再試。');
        } finally {
            setIsLoading(false); // 結束加載
        }
    };

     // --- 如果 AuthContext 仍在加載，顯示提示 ---
     if (isAuthLoading) {
         return <div className="loading">檢查登入狀態中...</div>;
     }

    // --- 渲染註冊表單 ---
    return (
        <div className="auth-container">
            <div className="auth-form-wrapper">
                <h2>註冊 食客帳號</h2>
                <form onSubmit={handleSubmit} className="auth-form">
                    {/* 錯誤訊息顯示區域 */}
                    {error && <div className="error-message">{error}</div>}
                    {/* 成功訊息顯示區域 */}
                    {successMessage && <div className="success-message" style={{backgroundColor: '#e8f5e9', color: '#2e7d32', padding: '0.8rem 1rem', border: '1px solid #a5d6a7', borderRadius: '4px', marginBottom: '1.5rem'}}>{successMessage}</div>}

                    {/* 用戶名輸入 */}
                    <div className="form-group">
                        <label htmlFor="username">用戶名</label>
                        <input
                            type="text"
                            id="username"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            required
                            minLength="3" // 添加最小長度限制
                            maxLength="20"
                            autoComplete="username"
                            disabled={isLoading}
                        />
                    </div>

                    {/* Email 輸入 */}
                    <div className="form-group">
                        <label htmlFor="email">Email</label>
                        <input
                            type="email"
                            id="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            maxLength="50"
                            autoComplete="email"
                            disabled={isLoading}
                        />
                    </div>

                    {/* 密碼輸入 */}
                    <div className="form-group">
                        <label htmlFor="password">密碼</label>
                        <input
                            type="password"
                            id="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            minLength="6" // 添加最小長度限制
                            maxLength="40"
                            autoComplete="new-password" // 提示瀏覽器這是新密碼
                            disabled={isLoading}
                        />
                    </div>

                     {/* 確認密碼輸入 */}
                     <div className="form-group">
                        <label htmlFor="confirmPassword">確認密碼</label>
                        <input
                            type="password"
                            id="confirmPassword"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            required
                            minLength="6"
                            maxLength="40"
                            autoComplete="new-password"
                            disabled={isLoading}
                        />
                    </div>

                    {/* 提交按鈕 */}
                    <button type="submit" className="submit-button" disabled={isLoading}>
                        {isLoading ? '註冊中...' : '註冊'}
                    </button>
                </form>

                {/* 跳轉到登入頁面的連結 */}
                <div className="auth-switch">
                    已經有帳號了？ <Link to="/login">前往登入</Link>
                    <br/>
                     <Link to="/signup-shop">註冊成為店家</Link>
                </div>
            </div>
        </div>
    );
};

export default SignupPage;