// src/pages/TopShopsPage.jsx
import React, { useState, useEffect, useCallback } from 'react';
import apiClient from '../services/api';
import ShopCard from '../components/ShopCard'; // 引入店家卡片
import useAuth from '../hooks/useAuth'; // 引入 useAuth 檢查權限
import './TopShopsPage.css'; // 引入頁面樣式
// 可以復用列表頁或表單的樣式
import './ShopListPage.css';
import "../components/ShopForm.css";

// 假設的台灣縣市列表 (與 ShopListPage 相同)
const TAIWAN_CITIES_COUNTIES = [
    "", "臺北市", "新北市", "桃園市", "臺中市", "臺南市", "高雄市",
    "基隆市", "新竹市", "嘉義市", "新竹縣", "苗栗縣", "彰化縣",
    "南投縣", "雲林縣", "嘉義縣", "屏東縣", "宜蘭縣", "花蓮縣",
    "臺東縣", "澎湖縣", "金門縣", "連江縣"
];
const Role = { ROLE_USER: 'ROLE_USER', ROLE_SHOP_OWNER: 'ROLE_SHOP_OWNER', ROLE_ADMIN: 'ROLE_ADMIN' }; // 角色常量

const TopShopsPage = () => {
  const { user, isAuthenticated, isLoading: isAuthLoading } = useAuth(); // 獲取用戶信息
  const [topShops, setTopShops] = useState([]);
  const [selectedRegion, setSelectedRegion] = useState(''); // 當前選擇的區域 ("" 表示全台灣)
  const [limit, setLimit] = useState(10); // 排行榜顯示數量 (可以做成可選)
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // --- 權限檢查 ---
  // 判斷當前用戶是否有權限查看 (食客或管理員)
  const canViewPage = !isAuthLoading && isAuthenticated && (user?.roles?.includes(Role.ROLE_USER) || user?.roles?.includes(Role.ROLE_ADMIN));
   // 如果用戶是店家，理論上不應該看到這個頁面 (可以在 Navbar 隱藏連結)
  const isShopOwnerOnly = !isAuthLoading && isAuthenticated && user?.roles?.includes(Role.ROLE_SHOP_OWNER) && !user?.roles?.includes(Role.ROLE_ADMIN) && !user?.roles?.includes(Role.ROLE_USER);


  // --- 獲取排行榜數據 ---
  const fetchTopShops = useCallback(async () => {
    // 如果權限檢查未完成或不符合資格，則不加載
    if(isAuthLoading || !canViewPage) {
        setTopShops([]); // 清空列表
        return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const params = { limit }; // 基礎參數：限制數量
      if (selectedRegion) {
        params.region = selectedRegion; // 如果選擇了區域，添加 region 參數
      }
      console.log('[TopShopsPage] Fetching top shops with params:', params);
      const response = await apiClient.get('/shops/top', { params }); // 調用 API

      if (response.data?.success && Array.isArray(response.data.data)) {
        setTopShops(response.data.data); // 更新狀態
      } else {
        throw new Error(response.data?.message || '無法獲取排行榜數據');
      }
    } catch (err) {
      console.error('[TopShopsPage] Error fetching top shops:', err);
       const errorMsg = err?.data?.message || err?.message || '載入排行榜時發生錯誤';
      setError(errorMsg);
      setTopShops([]); // 清空列表
    } finally {
      setIsLoading(false);
    }
  }, [limit, selectedRegion, canViewPage, isAuthLoading]); // 依賴 limit 和 selectedRegion

  // --- 組件掛載或篩選條件變化時獲取數據 ---
  useEffect(() => {
    fetchTopShops();
  }, [fetchTopShops]); // fetchTopShops 的依賴已包含 limit 和 selectedRegion

  // --- 處理區域選擇變化 ---
  const handleRegionChange = (event) => {
    setSelectedRegion(event.target.value);
    // fetchTopShops 會在 useEffect 中因為 selectedRegion 變化而自動觸發
  };

   // --- 處理顯示數量變化 (可選) ---
   const handleLimitChange = (event) => {
        const newLimit = parseInt(event.target.value, 10);
        if (!isNaN(newLimit) && newLimit > 0 && newLimit <= 50) { // 限制範圍
            setLimit(newLimit);
        }
   };

  // --- 渲染邏輯 ---

   // 如果仍在檢查認證狀態
   if (isAuthLoading) {
       return <div className="loading" style={{ padding: '2rem', textAlign: 'center' }}>檢查權限中...</div>;
   }

   // 如果用戶是店家且非管理員/食客，顯示無權限提示
    if (isShopOwnerOnly) {
         return <div className="error-message" style={{ padding: '2rem', textAlign: 'center' }}>店家用戶無法查看此頁面。</div>;
    }

   // 如果用戶未登入或非食客/管理員 (AuthProvider 加載完畢後)
    if (!isAuthenticated || !canViewPage) {
         // 這個情況理論上應該被路由保護攔截，但作為雙重保險
         return <div className="error-message" style={{ padding: '2rem', textAlign: 'center' }}>您需要以食客或管理員身份登入才能查看排行榜。</div>;
    }


  // 有權限，渲染頁面內容
  return (
    <div className="top-shops-page-container">
      <div className="page-header">
        <h1>拉麵排行榜</h1>
         <div className="filter-sort-controls"> {/* 復用樣式 */}
             <fieldset className="filter-group">
                 <legend>選擇區域與數量</legend>
                 <div className="controls-wrapper">
                     {/* 區域選擇 */}
                     <div className="control-item">
                         <label htmlFor="region-select">區域:</label>
                         <select id="region-select" value={selectedRegion} onChange={handleRegionChange} disabled={isLoading}>
                             {/* 全台灣選項 */}
                             <option value="">全台灣</option>
                             {/* 其他縣市選項 */}
                             {TAIWAN_CITIES_COUNTIES.map(city => (
                                 city && <option key={city} value={city}>{city}</option> // 排除空字符串
                             ))}
                         </select>
                     </div>
                     {/* 顯示數量選擇 (可選) */}
                      <div className="control-item">
                         <label htmlFor="limit-select">顯示數量:</label>
                         <select id="limit-select" value={limit} onChange={handleLimitChange} disabled={isLoading}>
                             <option value="10">Top 10</option>
                             <option value="20">Top 20</option>
                             <option value="30">Top 30</option>
                             <option value="50">Top 50</option>
                         </select>
                     </div>
                 </div>
             </fieldset>
         </div>
      </div>

      <div className="shop-list-content"> {/* 復用列表內容樣式 */}
        {isLoading && <div className="loading list-loading">載入排行榜中...</div>}
        {error && !isLoading && <div className="error list-error">錯誤: {error}</div>}
        {!isLoading && !error && topShops.length === 0 && (
          <div className="no-results list-no-results">此區域暫無足夠評論的店家進入排行。</div>
        )}

        {topShops.length > 0 && (
          <div className="shop-list-grid"> {/* 使用與列表頁相同的網格布局 */}
            {topShops.map((shop, index) => (
              shop && shop.id ? (
                <div key={shop.id} className="ranked-shop-item">
                   <span className="rank-badge">#{index + 1}</span> {/* 添加排名標籤 */}
                   <ShopCard shop={shop} />
                </div>
              ) : null
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default TopShopsPage;