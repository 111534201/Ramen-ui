// src/components/Navbar.jsx
import React, { useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import useAuth from '../hooks/useAuth';
import { Role } from '../constants/roles';
import './Navbar.css';

const Navbar = () => {
  const { user, logout, isAuthenticated, isLoading } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const isShopOwner = useMemo(
    () => user?.roles?.includes(Role.ROLE_SHOP_OWNER),
    [user]
  );
  const isAdmin = useMemo(
    () => user?.roles?.includes(Role.ROLE_ADMIN),
    [user]
  );
  const isUser = useMemo(
    () => user?.roles?.includes(Role.ROLE_USER),
    [user]
  );

  if (isLoading) {
    return (
      <nav className="navbar">
        <div className="navbar-container">
          <Link to="/" className="navbar-logo">🍜 拉麵地圖</Link>
          <ul className="navbar-menu">
            <li className="navbar-item"><Link to="/" className="navbar-link">首頁</Link></li>
            <li className="navbar-item"><Link to="/shops" className="navbar-link">店家列表</Link></li>
            <li className="navbar-item"><span style={{color: '#ccc'}}>檢查登入狀態...</span></li>
          </ul>
        </div>
      </nav>
    );
  }

  return (
    <nav className="navbar">
      <div className="navbar-container">
        <Link to="/" className="navbar-logo">🍜 拉麵地圖</Link>
        <ul className="navbar-menu">

          {/* 公開連結 */}
          <li className="navbar-item"><Link to="/" className="navbar-link">首頁</Link></li>
          <li className="navbar-item"><Link to="/shops" className="navbar-link">店家列表</Link></li>
          <li className="navbar-item"><Link to="/top-shops" className="navbar-link">店家排行</Link></li>
          <li className="navbar-item"><Link to="/events" className="navbar-link">最新活動</Link></li>

          {/* 食客專屬「動態牆」 */}
          {isUser && (
            <li className="navbar-item">
              <Link to="/activities" className="navbar-link">動態牆</Link>
            </li>
          )}

          {/* 管理員專屬 */}
          {isAdmin && (
            <>
              <li className="navbar-item">
                <Link to="/add-shop" className="navbar-link admin-link">新增店家</Link>
              </li>
              <li className="navbar-item">
                <Link to="/admin/users" className="navbar-link admin-link">用戶管理</Link>
              </li>
            </>
          )}

          {/* 店家專屬 */}
          {isShopOwner && (
            <li className="navbar-item">
              <Link to="/my-shop" className="navbar-link owner-link">我的店家</Link>
            </li>
          )}

          {/* 活動管理 (店家 / 管理員) */}
          {(isAdmin || isShopOwner) && (
            <li className="navbar-item">
              <Link to="/manage-events" className="navbar-link manage-events-link">活動管理</Link>
            </li>
          )}

          {/* 登入/登出 */}
          {isAuthenticated && user ? (
            <>
              <li className="navbar-item">
                <span className="navbar-user-greeting">你好, {user.username}</span>
              </li>
              <li className="navbar-item">
                <button onClick={handleLogout} className="navbar-button logout-button">
                  登出
                </button>
              </li>
            </>
          ) : (
            <>
              <li className="navbar-item">
                <Link to="/login" className="navbar-link">登入</Link>
              </li>
              <li className="navbar-item">
                <Link to="/signup" className="navbar-link signup-link">註冊食客</Link>
              </li>
              <li className="navbar-item">
                <Link to="/signup-shop" className="navbar-link owner-signup-link">註冊店家</Link>
              </li>
            </>
          )}
        </ul>
      </div>
    </nav>
  );
};

export default Navbar;
