// src/hooks/useAuth.js
import { useContext } from 'react';
// 使用花括號 {} 導入在 AuthContext.jsx 中具名導出的 AuthContext
import { AuthContext } from '../context/AuthContext';

/**
 * 自定義 Hook，用於方便地從任何子組件中獲取 AuthContext 的值。
 * 它確保了該 Hook 只在 AuthProvider 的包裹範圍內被調用。
 */
const useAuth = () => {
  // 使用 React 的 useContext Hook 來獲取 AuthContext 的當前值
  const context = useContext(AuthContext);

  // 如果 context 是 undefined，表示 useAuth 沒有在 AuthProvider 內部被調用
  // 拋出錯誤以提示開發者修正組件樹結構
  if (context === undefined) {
    throw new Error('useAuth 必須在 AuthProvider 內部使用');
  }

  // 返回從 AuthContext 獲取到的值 (包含 user, isAuthenticated, isLoading, login, logout 等)
  return context;
};

// 將 useAuth 這個 Hook 作為此模塊的默認導出
export default useAuth;