// src/pages/AddShopPage.jsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../services/api';
import ShopForm from '../components/ShopForm'; // *** 引入 ShopForm 元件 ***
import useAuth from '../hooks/useAuth'; // 引入 useAuth (雖然有路由保護，確認下總是好的)
import { Role } from '../constants/roles'; // 引入角色常量
import NotFoundPage from './NotFoundPage'; // 用於權限不足時顯示
import './AuthForm.css'; // 復用樣式
import '../components/ShopForm.css';

// 假設地圖狀態從 App.jsx 傳遞下來 (如果 ShopForm 需要)
const AddShopPage = ({ mapLoaded, mapLoadError }) => {
  const navigate = useNavigate();
  const { user, isAuthenticated, isLoading: isAuthLoading } = useAuth(); // 獲取用戶信息和狀態

  const [isSubmitting, setIsSubmitting] = useState(false); // 表單提交狀態
  const [error, setError] = useState('');             // 錯誤訊息狀態

  // --- 處理表單提交 ---
  // 這個函數會傳遞給 ShopForm 組件
  // shopFormData: 包含基本信息的對象
  // newFiles: 新選擇要上傳的文件列表 File[]
  // deletedMediaIds: 在新增模式下應為空數組
  const handleAddSubmit = async ({ shopFormData, newFiles /*, deletedMediaIds (新增時忽略) */ }) => {
    setError('');
    setIsSubmitting(true);

    // 再次確認是管理員 (雖然有路由保護)
    if (!user || !user.roles?.includes(Role.ROLE_ADMIN)) {
        setError("只有管理員可以新增店家。");
        setIsSubmitting(false);
        return;
    }

    // --- 創建 FormData 對象 ---
    const formData = new FormData();
    // 1. 添加店家信息的 JSON 部分 (命名為 "shopData")
    // 注意：後端 Admin 創建店家的 API 可能不同，可能直接接收 CreateShopRequest JSON
    // 如果後端 /api/shops (POST) 端點設計為接收 CreateShopRequest JSON，
    // 則不需要 FormData，直接發送 shopFormData 即可。
    // 但如果後端新增也需要處理文件，則仍需 FormData。
    // 我們假設後端 createShopByAdmin (如果存在) 或某個統一端點能處理 FormData。
    // **這裡假設後端需要一個特定的 DTO，我們傳遞基礎信息**
    const createRequest = { ...shopFormData }; // 複製一份
     // 由管理員創建的店家，owner 可以是 null 或創建者 ID，取決於後端邏輯
     // createRequest.ownerId = null; or user.id;
    const createRequestBlob = new Blob([JSON.stringify(createRequest)], { type: 'application/json' });
    formData.append('shopData', createRequestBlob); // 或者後端直接收 CreateShopRequest

    // 2. 添加文件部分 (命名為 "files")
    if (newFiles && newFiles.length > 0) {
      newFiles.forEach(file => formData.append('files', file));
    }

    // --- 發送請求 ---
    try {
        console.log("[AddShopPage] Submitting new shop data...");
        // 調用哪個 API 端點？
        // 方案一：如果 AuthController 的 /api/auth/signup/shop 允許 Admin 調用並處理 owner=null
        // const response = await apiClient.post('/api/auth/signup/shop', formData); // (需要後端支持Admin註冊店家)

        // 方案二：假設有一個專門給 Admin 新增的端點 /api/shops (POST)
        //         並且這個端點也能處理 multipart/form-data
        // 需要創建一個對應的後端 Controller 方法和 Service 方法
         const response = await apiClient.post('/api/shops/admin-create', formData); // 假設有這個端點

        if (response.data?.success && response.data?.data) {
            console.log('[AddShopPage] Shop created successfully:', response.data.data);
            alert('店家新增成功！');
            // 跳轉到新店家的詳情頁或列表頁
            navigate(`/shops/${response.data.data.id}`); // 跳轉到詳情頁
            // navigate('/shops'); // 或者跳轉到列表頁
        } else {
             throw new Error(response.data?.message || '新增店家失敗');
        }
    } catch (err) {
        console.error("[AddShopPage] Submit failed:", err?.data?.message || err?.message || err);
        // 處理 Geocoding 錯誤
        if (err?.data?.message && err.data.message.toLowerCase().includes('geocoding')) {
             setError('地址無法成功轉換為座標，請檢查地址是否正確或嘗試更詳細的地址。');
        } else {
            setError(err?.data?.message || err?.message || '新增店家時發生錯誤');
        }
    } finally {
      setIsSubmitting(false);
    }
  };

  // --- 渲染邏輯 ---
  if (isAuthLoading) {
    return <div className="loading" style={{textAlign: 'center', padding: '2rem'}}>載入中...</div>;
  }

  // 權限檢查 (雖然有路由保護，多一層客戶端檢查)
  if (!isAuthenticated || !user?.roles?.includes(Role.ROLE_ADMIN)) {
     return <NotFoundPage message="您沒有權限訪問此頁面。" />;
  }

  // 渲染表單
  return (
    <div className="page-container add-shop-container" style={{maxWidth: '800px', margin: '2rem auto', padding: '0 1rem'}}>
      <ShopForm
        isEditMode={false} // 告知 ShopForm 是新增模式
        // initialData 在新增模式下為 null (預設值)
        onSubmit={handleAddSubmit} // 傳遞新增的提交函數
        isSubmitting={isSubmitting} // 傳遞提交狀態
        error={error} // 傳遞錯誤信息
        // mapLoaded={mapLoaded} // 如果 ShopForm 需要地圖
        // mapLoadError={mapLoadError}
      />
    </div>
  );
};

// 導入日誌 (前端用 console)
const logger = console;

export default AddShopPage;