// src/context/AuthContext.jsx
import React, { createContext, useState, useEffect, useCallback, useContext } from 'react'; // 確保 useContext 也導入 (雖然此文件內部不直接用，但保持完整)
import apiClient from '../services/api'; // 導入配置好的 Axios 實例
import { decodeToken } from '../utils/authUtils'; // 導入 Token 解碼工具函數

// 1. 創建 Auth Context 並使用 **具名導出**
export const AuthContext = createContext(undefined);

// 2. 創建並 **具名導出** Auth Provider 元件
export const AuthProvider = ({ children }) => {
    // --- State 定義 ---
    const [user, setUser] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isAuthenticated, setIsAuthenticated] = useState(false);

    // --- 效果：組件首次掛載時，嘗試從 localStorage 恢復登入狀態 ---
    useEffect(() => {
        //console.log('[AuthProvider] useEffect triggered: Checking local storage...');
        const storedToken = localStorage.getItem('authToken');

        if (storedToken) {
            const decodedUser = decodeToken(storedToken);
            if (decodedUser) {
                setUser(decodedUser);
                setIsAuthenticated(true);
               // console.log('[AuthProvider] User loaded from localStorage:', decodedUser.username);
            } else {
                localStorage.removeItem('authToken');
                setIsAuthenticated(false);
               // console.log('[AuthProvider] Invalid token found in localStorage, removed.');
            }
        } else {
           // console.log('[AuthProvider] No token found in local storage.');
            setIsAuthenticated(false);
        }
        setIsLoading(false);
    }, []); // 空依賴數組，確保只執行一次

    // --- 登入函數 ---
    const login = useCallback(async (username, password) => {
        //console.log('[AuthProvider] Attempting login...');
        try {
            const response = await apiClient.post('/auth/login', { username, password });
            if (response.data?.success && response.data?.data?.token) {
                const { token } = response.data.data;
                localStorage.setItem('authToken', token);
                const decodedUser = decodeToken(token);
                 if (decodedUser) {
                     setUser(decodedUser);
                     setIsAuthenticated(true);
                     console.log('[AuthProvider] Login successful for:', decodedUser.username);
                     return { success: true, user: decodedUser };
                 } else {
                      console.error('[AuthProvider] Login successful but failed to decode token.');
                      localStorage.removeItem('authToken');
                      setUser(null);
                      setIsAuthenticated(false);
                      throw new Error('登入成功但無法解析用戶信息');
                 }
            } else {
                 throw new Error(response.data?.message || '登入失敗，響應格式錯誤');
            }
        } catch (error) {
            const errorMessage = error?.data?.message || error?.message || '登入時發生錯誤';
            console.error("[AuthProvider] Login failed:", errorMessage, error);
            localStorage.removeItem('authToken');
            setUser(null);
            setIsAuthenticated(false);
            return { success: false, message: errorMessage };
        }
    }, []);

    // --- 登出函數 ---
    const logout = useCallback(() => {
        console.log('[AuthProvider] Logging out...');
        localStorage.removeItem('authToken');
        setUser(null);
        setIsAuthenticated(false);
        console.log('[AuthProvider] Logout completed.');
    }, []);

    // --- Context 的值 ---
    const value = {
        user,
        isLoading,
        isAuthenticated,
        login,
        logout,
    };

    // --- 返回 Provider ---
    // 使用 **上面具名導出的 AuthContext** 的 Provider
    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};