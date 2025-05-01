// src/components/ProtectedRoute.jsx
import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import  useAuth from '../hooks/useAuth';
import { Role } from '../constants/roles';


const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user, isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return <div className="loading" style={{ padding: '2rem', textAlign: 'center' }}>檢查登入狀態中...</div>;
  }

  if (!isAuthenticated) {
    console.log('[ProtectedRoute] User not authenticated. Redirecting to login from:', location.pathname);
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // 進行角色檢查 (如果需要)
  if (allowedRoles && allowedRoles.length > 0) {
    // 確保 user.roles 是一個數組
    const userRoles = Array.isArray(user?.roles) ? user.roles : (user?.role ? [user.role] : []); // 兼容 roles 是數組或單個 role 字符串的情況
    const hasRequiredRole = allowedRoles.some(role => userRoles.includes(role));

    if (!hasRequiredRole) {
      console.warn(`[ProtectedRoute] User ${user?.username} (Roles: ${userRoles.join(', ')}) does not have required roles: ${allowedRoles.join(', ')}. Redirecting to home.`);
      // 可以導向權限不足頁面，或顯示提示後導向首頁
      alert('您的權限不足，無法訪問此頁面。');
      return <Navigate to="/" replace />;
    }
  }

  // 權限通過，渲染目標組件
  return children;
};

export default ProtectedRoute;