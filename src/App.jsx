// src/App.jsx
import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { useJsApiLoader } from '@react-google-maps/api';

// --- 核心組件導入 ---
import Navbar from './components/Navbar';
import ProtectedRoute from './components/ProtectedRoute';
import { AuthProvider } from './context/AuthContext';
import { Role } from './constants/roles';

// --- 頁面組件導入 ---
import ActivitiesPage from './pages/ActivitiesPage';
import HomePage from './pages/HomePage';
import ShopListPage from './pages/ShopListPage';
import ShopDetailPage from './pages/ShopDetailPage';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import ShopOwnerSignupPage from './pages/ShopOwnerSignupPage';
import AddShopPage from './pages/AddShopPage';
import EditShopPage from './pages/EditShopPage';
import TopShopsPage from './pages/TopShopsPage';
import AdminUserManagementPage from './pages/AdminUserManagementPage';
import NotFoundPage from './pages/NotFoundPage';
import EventListPage from './pages/EventListPage';
import EventDetailPage from './pages/EventDetailPage';
import MyOwnedShopPage from './pages/MyOwnedShopPage';
import ManageEventsPage from './pages/ManageEventsPage';

// --- 全局樣式 ---
import './App.css';
import "slick-carousel/slick/slick.css";
import "slick-carousel/slick/slick-theme.css";

// --- Google Maps API Key 和 Libraries ---
const googleMapsApiKey = import.meta.env.VITE_Maps_API_KEY;
const libraries = ['places'];

function App() {
  const { isLoaded: mapLoaded, loadError: mapLoadError } = useJsApiLoader({
    googleMapsApiKey: googleMapsApiKey || "",
    libraries,
    language: 'zh-TW'
  });

  return (
    <AuthProvider>
      <Navbar />
      <div className="main-content">
        <Routes>
          {/* === 公開路由 === */}
          <Route  
            path="/activities"
            element={
              <ProtectedRoute allowedRoles={[Role.ROLE_USER]}>
                <ActivitiesPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/"
            element={<HomePage mapLoaded={mapLoaded} mapLoadError={mapLoadError} />}
          />
          <Route
            path="/shops"
            element={<ShopListPage mapLoaded={mapLoaded} mapLoadError={mapLoadError} />}
          />
          <Route
            path="/shops/:id"
            element={<ShopDetailPage mapLoaded={mapLoaded} mapLoadError={mapLoadError} />}
          />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />
          <Route path="/signup-shop" element={<ShopOwnerSignupPage />} />
          <Route path="/events" element={<EventListPage />} />
          <Route path="/events/:eventId" element={<EventDetailPage />} />

          {/* === 受保護的路由 === */}
          <Route
            path="/top-shops"
            element={
              <ProtectedRoute allowedRoles={[Role.ROLE_USER, Role.ROLE_ADMIN, Role.ROLE_SHOP_OWNER]}>
                <TopShopsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/add-shop"
            element={
              <ProtectedRoute allowedRoles={[Role.ROLE_ADMIN]}>
                <AddShopPage mapLoaded={mapLoaded} mapLoadError={mapLoadError} />
              </ProtectedRoute>
            }
          />
          <Route
            path="/shops/:id/edit"
            element={
              <ProtectedRoute allowedRoles={[Role.ROLE_ADMIN, Role.ROLE_SHOP_OWNER]}>
                <EditShopPage mapLoaded={mapLoaded} mapLoadError={mapLoadError} />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/users"
            element={
              <ProtectedRoute allowedRoles={[Role.ROLE_ADMIN]}>
                <AdminUserManagementPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/my-shop"
            element={
              <ProtectedRoute allowedRoles={[Role.ROLE_SHOP_OWNER]}>
                <MyOwnedShopPage mapLoaded={mapLoaded} mapLoadError={mapLoadError} />
              </ProtectedRoute>
            }
          />
          {/* --- ✨ 新增：活動管理頁面路由 (店家/管理員) ✨ --- */}
          <Route
            path="/manage-events"
            element={
              <ProtectedRoute allowedRoles={[Role.ROLE_ADMIN, Role.ROLE_SHOP_OWNER]}>
                <ManageEventsPage />
              </ProtectedRoute>
            }
          />
          {/* ------------------------------------------ */}

          {/* 404 路由 */}
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </div>
    </AuthProvider>
  );
}

export default App;
