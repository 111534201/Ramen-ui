// src/pages/EditShopPage.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import apiClient from '../services/api';
import ShopForm from '../components/ShopForm'; // *** 引入 ShopForm 元件 ***
import useAuth from '../hooks/useAuth';
import NotFoundPage from './NotFoundPage'; // 用於顯示錯誤
import { Role } from '../constants/roles'; // 引入角色常量
import './AuthForm.css'; // 可能會用到一些基礎表單樣式
import "../components/ShopForm.css";

const EditShopPage = ({ mapLoaded, mapLoadError }) => {
  const { id: shopId } = useParams();
  const numericShopId = parseInt(shopId, 10);
  const isValidShopId = !isNaN(numericShopId);

  const navigate = useNavigate();
  const { user, isAuthenticated, isLoading: isAuthLoading } = useAuth();

  const [initialData, setInitialData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [canEdit, setCanEdit] = useState(false);

  // --- 獲取店家初始數據 ---
  const fetchShopData = useCallback(async () => {
    if (!isValidShopId) { setError("無效的店家 ID"); setIsLoading(false); return; }
    if (isAuthLoading) return; // 等待 AuthContext 加載完成
    if (!isAuthenticated) { setError("請先登入"); setIsLoading(false); setCanEdit(false); return; }

    setIsLoading(true); setError(''); setInitialData(null); setCanEdit(false);

    try {
      console.log(`[EditShopPage] Fetching shop data for ID: ${numericShopId}`);
      const response = await apiClient.get(`/shops/${numericShopId}`);

      if (response.data?.success && response.data?.data) {
        const shopData = response.data.data;
        console.log(`[EditShopPage] Shop data fetched:`, shopData);

        // --- 前端權限檢查 ---
        const isAdmin = user?.roles?.includes(Role.ROLE_ADMIN);
        // *** 修改這裡：使用 JavaScript 的 === 或 == 進行比較 ***
        const isOwner = user?.roles?.includes(Role.ROLE_SHOP_OWNER) && shopData.owner?.id && shopData.owner.id === user.id;
        // *** --- ***

        if (isAdmin || isOwner) {
           setInitialData(shopData);
           setCanEdit(true);
        } else {
          setError('您沒有權限編輯此店家。');
          setCanEdit(false);
        }
      } else {
        throw new Error(response.data?.message || `無法獲取店家 ${numericShopId} 的數據`);
      }
    } catch (err) {
      console.error("[EditShopPage] Error fetching shop data:", err);
       const statusCode = err?.response?.status || err?.status;
       let errorMsg = err?.data?.message || err?.response?.data?.message || err?.message || '無法載入店家數據';
       if (statusCode === 404) { errorMsg = `找不到 ID 為 ${numericShopId} 的店家。`; }
       else if (statusCode === 403) { errorMsg = '您沒有權限查看或編輯此店家。'; }
       setError(errorMsg);
       setInitialData(null);
       setCanEdit(false);
    } finally {
      setIsLoading(false);
    }
  }, [numericShopId, isValidShopId, shopId, user, isAuthenticated, isAuthLoading]);

  // --- 組件掛載或依賴變化時獲取數據 ---
  useEffect(() => {
    fetchShopData();
  }, [fetchShopData]);


  // --- 處理表單提交 ---
  const handleEditSubmit = async ({ shopFormData, newFiles, deletedMediaIds }) => {
    if (!canEdit) { setError("無權限提交"); return; }

    setIsSubmitting(true);
    setError('');
    let baseInfoUpdated = false;

    try {
      // 步驟 1: 更新基本資訊
      console.log(`[EditShopPage] Step 1: Updating shop ${shopId} info:`, shopFormData);
      const updateResponse = await apiClient.put(`/shops/${shopId}`, shopFormData);
      if (!updateResponse.data?.success) { throw new Error(updateResponse.data?.message || '更新店家基本資訊失敗'); }
      baseInfoUpdated = true;
      console.log('[EditShopPage] Step 1 Success: Shop info updated.');

      // 步驟 2: 刪除媒體 (使用 Promise.allSettled)
      if (deletedMediaIds && deletedMediaIds.length > 0) {
        console.log(`[EditShopPage] Step 2: Deleting ${deletedMediaIds.length} media items...`);
        const deletePromises = deletedMediaIds.map(mediaId =>
          apiClient.delete(`/shops/${shopId}/media/${mediaId}`)
            .then(() => console.info(`Media ${mediaId} deleted.`)) // 使用 console.info
            .catch(err => console.error(`Failed to delete media ${mediaId}:`, err))
        );
        await Promise.allSettled(deletePromises);
        console.log('[EditShopPage] Step 2 Completed: Media deletion attempted.');
      }

      // 步驟 3: 上傳新媒體
      if (newFiles && newFiles.length > 0) {
        console.log(`[EditShopPage] Step 3: Uploading ${newFiles.length} new files...`);
        const uploadFormData = new FormData();
        newFiles.forEach(file => uploadFormData.append('files', file));
        try {
            const uploadResponse = await apiClient.post(`/shops/${shopId}/media`, uploadFormData, { headers: { 'Content-Type': 'multipart/form-data' } });
            if (!uploadResponse.data?.success) {
                logger.warn(`[EditShopPage] Step 3 Warning: New media upload failed.`, uploadResponse.data?.message);
                alert(`店家資訊已更新，但部分新圖片上傳失敗: ${uploadResponse.data?.message || '未知錯誤'}`);
            } else { console.log('[EditShopPage] Step 3 Success: New media uploaded.'); }
        } catch (uploadError) {
             logger.error(`[EditShopPage] Step 3 Error: Uploading new media failed:`, uploadError);
             alert(`店家資訊已更新，但新圖片上傳時發生錯誤: ${uploadError?.data?.message || uploadError?.message || '未知錯誤'}`);
        }
      }

      // 步驟 4: 完成提示與跳轉
      alert('店家資訊已成功更新！');
      navigate(`/shops/${shopId}`); // 跳回詳情頁

    } catch (err) {
      console.error("[EditShopPage] Submit failed:", err?.data?.message || err?.message || err);
      setError(err?.data?.message || err?.message || '更新店家時發生錯誤');
    } finally {
      setIsSubmitting(false);
    }
  };

  // --- 渲染邏輯 ---
  if (isLoading || isAuthLoading) {
    return <div className="loading" style={{textAlign: 'center', padding: '2rem'}}>載入編輯數據中...</div>;
  }

  if (error) {
      if (error.includes('權限') || error.includes('找不到')) {
           return <NotFoundPage message={error} />;
      }
       return <div className="error page-error">{error}</div>; // 顯示其他錯誤
  }

   if (!initialData || !canEdit) { // 確保有數據且有權限
        // 如果 canEdit 為 false 但沒有 error，也顯示權限不足
        return <NotFoundPage message={error || '您沒有權限編輯此店家。'} />;
   }

   return (
     <div className="page-container shop-edit-container" style={{maxWidth: '800px', margin: '2rem auto', padding: '0 1rem'}}>
       <ShopForm
         isEditMode={true}
         initialData={initialData}
         onSubmit={handleEditSubmit}
         isSubmitting={isSubmitting}
         error={error}
         // 如果 ShopForm 需要地圖，傳遞 props
         // mapLoaded={mapLoaded}
         // mapLoadError={mapLoadError}
       />
     </div>
   );
};

// 前端使用 console
const logger = console;

export default EditShopPage;