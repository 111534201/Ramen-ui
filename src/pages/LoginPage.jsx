// src/pages/LoginPage.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import useAuth from '../hooks/useAuth';
import { Role } from '../constants/roles';
// import { decodeToken } from '../utils/authUtils'; // 不再需要在本組件中 decode
import './AuthForm.css';

const LoginPage = () => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const navigate = useNavigate();
    const location = useLocation();
    const { login, isAuthenticated, isLoading: isAuthLoading, user } = useAuth();

    // --- 效果：如果已登入，根據來源或預設路徑重定向 ---
    useEffect(() => {
        if (!isAuthLoading && isAuthenticated) {
            let navigateTo = '/'; // *** 修改：預設跳轉到首頁 ***
            const from = location.state?.from?.pathname;

            // 1. 優先跳轉回用戶原本想去的頁面 (如果不是登入頁本身)
            if (from && from !== '/login') {
                navigateTo = from;
            }
            // 2. (可選) 保留管理員的特殊跳轉
            else if (user?.roles?.includes(Role.ROLE_ADMIN)) {
                navigateTo = '/admin/users';
            }
            // *** 移除了對 ROLE_SHOP_OWNER 跳轉到 /my-shop 的判斷 ***
            // 所有其他用戶 (包括店家) 都會遵循上面的邏輯，跳轉到 'from' 或 '/'

            console.log('[LoginPage] Authenticated. Redirecting to:', navigateTo);
            navigate(navigateTo, { replace: true });
        }
        // 依賴項保持不變，確保在狀態更新後觸發
    }, [isAuthenticated, isAuthLoading, navigate, user, location.state]);

    // --- 處理表單提交 ---
    const handleSubmit = async (event) => {
        event.preventDefault();
        setError('');
        setIsLoading(true);

        const result = await login(username, password);

        setIsLoading(false);

        if (!result.success) {
            setError(result.message || '登入失敗，請檢查您的用戶名和密碼。');
        }
        // 登入成功後的跳轉由上面的 useEffect 處理
    };

     // --- 初始加載狀態顯示 ---
     if (isAuthLoading) {
         return <div className="loading" style={{ padding: '2rem', textAlign: 'center' }}>檢查登入狀態中...</div>;
     }

    // --- 渲染登入表單 (保持不變) ---
    return (
        <div className="auth-container">
            <div className="auth-form-wrapper">
                <h2>登入 拉麵地圖</h2>
                <form onSubmit={handleSubmit} className="auth-form">
                    {error && <div className="error-message">{error}</div>}
                    <div className="form-group">
                        <label htmlFor="username">用戶名</label>
                        <input
                            type="text" id="username" value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            required autoComplete="username" disabled={isLoading}
                        />
                    </div>
                    <div className="form-group">
                        <label htmlFor="password">密碼</label>
                        <input
                            type="password" id="password" value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required autoComplete="current-password" disabled={isLoading}
                        />
                    </div>
                    <button type="submit" className="submit-button" disabled={isLoading}>
                        {isLoading ? '登入中...' : '登入'}
                    </button>
                </form>
                <div className="auth-switch">
                    還沒有帳號？{' '}
                    <Link to="/signup">註冊食客帳號</Link>
                    {' | '}
                    <Link to="/signup-shop">註冊成為店家</Link>
                </div>
            </div>
        </div>
    );
};
export default LoginPage;