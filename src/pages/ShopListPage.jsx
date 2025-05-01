// src/pages/ShopListPage.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import apiClient from '../services/api';
import ShopCard from '../components/ShopCard';         // *** 確保引入 ShopCard ***
import Pagination from '../components/Pagination';       // *** 確保引入 Pagination ***
import './ShopListPage.css';                         // 引入頁面樣式
// 可選：如果需要復用按鈕等樣式
import './AuthForm.css';
import "../components/ShopForm.css";

// --- 篩選/排序選項 ---
const SORT_OPTIONS = [
  { value: 'createdAt_desc', label: '最新加入' },
  { value: 'weightedRating_desc', label: '綜合評分' },
  { value: 'averageRating_desc', label: '平均評分最高' },
  { value: 'reviewCount_desc', label: '評論最多' },
];

// --- 全台灣縣市列表 ---
const TAIWAN_CITIES_COUNTIES = [
    "", "臺北市", "新北市", "桃園市", "臺中市", "臺南市", "高雄市",
    "基隆市", "新竹市", "嘉義市", "新竹縣", "苗栗縣", "彰化縣",
    "南投縣", "雲林縣", "嘉義縣", "屏東縣", "宜蘭縣", "花蓮縣",
    "臺東縣", "澎湖縣", "金門縣", "連江縣"
];

const ShopListPage = () => {
  const [shops, setShops] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState({
    currentPage: 0, totalPages: 0, totalElements: 0, pageSize: 12,
  });

  const [searchParams, setSearchParams] = useSearchParams();

  // --- URL 參數讀取回調 ---
  const getCurrentPageFromUrl = useCallback(() => parseInt(searchParams.get('page') || '0', 10), [searchParams]);
  const getCurrentSortFromUrl = useCallback(() => searchParams.get('sort') || SORT_OPTIONS[0].value, [searchParams]);
  const getCurrentCityFromUrl = useCallback(() => searchParams.get('city') || '', [searchParams]);

  // --- UI 狀態 ---
  const [currentSort, setCurrentSort] = useState(getCurrentSortFromUrl());
  const [currentCity, setCurrentCity] = useState(getCurrentCityFromUrl());

  // --- 獲取店家數據 ---
  const fetchShops = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    const page = getCurrentPageFromUrl();
    const sortValue = getCurrentSortFromUrl();
    const cityFilter = getCurrentCityFromUrl();
    const safePage = Math.max(0, page);

    try {
      const size = pagination.pageSize;
      let sortBy, sortDir;
      if (sortValue && sortValue.includes('_')) { [sortBy, sortDir] = sortValue.split('_'); }
      else { [sortBy, sortDir] = SORT_OPTIONS[0].value.split('_'); }

      const params = { page: safePage, size: size, sortBy: sortBy, sortDir: sortDir?.toUpperCase() || 'DESC' };
      if (cityFilter) { params.city = cityFilter; }

      console.log("[ShopListPage] Fetching shops with params:", params);
      const response = await apiClient.get('/shops', { params }); // 調用獲取店家列表 API

      if (response.data?.success && response.data?.data && typeof response.data.data === 'object') {
        const pageData = response.data.data;
        if (!Array.isArray(pageData.content)) { throw new Error('後端返回的店家列表格式不正確'); }
        setShops(pageData.content || []);
        setPagination(prev => ({
          ...prev,
          currentPage: pageData.pageNo ?? 0,
          totalPages: pageData.totalPages ?? 0,
          totalElements: pageData.totalElements ?? 0,
        }));
      } else {
        throw new Error(response.data?.message || "無法獲取店家列表");
      }
    } catch (err) {
      console.error("[ShopListPage] Error fetching shops:", err);
      const errorMsg = err?.data?.message || err?.message || '無法載入店家資訊';
      setError(errorMsg);
      setShops([]);
      setPagination(prev => ({ ...prev, currentPage: 0, totalPages: 0, totalElements: 0 }));
    } finally {
      setIsLoading(false);
    }
  }, [pagination.pageSize, getCurrentPageFromUrl, getCurrentSortFromUrl, getCurrentCityFromUrl]);

  // --- 監聽 URL 變化 ---
  useEffect(() => {
    console.log("[ShopListPage - useEffect] searchParams changed:", searchParams.toString());
    setCurrentSort(getCurrentSortFromUrl());
    setCurrentCity(getCurrentCityFromUrl());
    fetchShops();
  }, [searchParams, fetchShops, getCurrentSortFromUrl, getCurrentCityFromUrl]);

  // --- 事件處理 ---
  const handleSortChange = (event) => { /* ... (之前已實現) ... */
    const newSortValue = event.target.value;
    const newParams = new URLSearchParams(searchParams);
    newParams.set('sort', newSortValue);
    newParams.set('page', '0');
    setSearchParams(newParams);
  };
  const handleCityChange = (event) => { /* ... (之前已實現) ... */
    const newCityValue = event.target.value;
    const newParams = new URLSearchParams(searchParams);
    if (newCityValue) { newParams.set('city', newCityValue); }
    else { newParams.delete('city'); }
    newParams.set('page', '0');
    setSearchParams(newParams);
  };
  const handleResetFilters = () => { /* ... (之前已實現) ... */
    const newParams = new URLSearchParams();
    newParams.set('page', '0');
    newParams.set('sort', SORT_OPTIONS[0].value);
    setSearchParams(newParams);
  }
  const handlePageChange = (pageNumber) => { /* ... (之前已實現) ... */
    const safePageNumber = Math.max(0, pageNumber);
    const newParams = new URLSearchParams(searchParams);
    newParams.set('page', safePageNumber.toString());
    setSearchParams(newParams);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // --- 渲染 ---
  return (
    <div className="shop-list-page-container">
        <div className="page-header">
          <h1>探索拉麵店</h1>
          <div className="filter-sort-controls">
             <fieldset className="filter-group">
                 <legend>篩選與排序</legend>
                 <div className="controls-wrapper">
                     {/* 縣市 */}
                     <div className="control-item">
                        <label htmlFor="city-select">縣市:</label>
                        <select id="city-select" value={currentCity} onChange={handleCityChange} disabled={isLoading}>
                          {TAIWAN_CITIES_COUNTIES.map(city => ( <option key={city || 'all'} value={city}>{city || '全部縣市'}</option> ))}
                        </select>
                     </div>
                     {/* 排序 */}
                     <div className="control-item">
                        <label htmlFor="sort-select">排序:</label>
                        <select id="sort-select" value={currentSort} onChange={handleSortChange} disabled={isLoading}>
                          {SORT_OPTIONS.map(option => ( <option key={option.value} value={option.value}>{option.label}</option> ))}
                        </select>
                     </div>
                     {/* 清除 */}
                     <button onClick={handleResetFilters} className="reset-button" disabled={isLoading}>清除條件</button>
                 </div>
             </fieldset>
          </div>
        </div>

        {/* --- 內容顯示區域 --- */}
         <div className="shop-list-content">
             {isLoading && shops.length === 0 && <div className="loading list-loading">載入店家資訊中...</div>}
             {error && !isLoading && <div className="error list-error">錯誤: {error}</div>}
             {!isLoading && !error && shops.length === 0 && ( <div className="no-results list-no-results">找不到符合條件的店家。</div> )}

             {shops.length > 0 && (
                 <>
                   {isLoading && <div className="loading list-loading-update">更新中...</div>}
                   {/* *** 使用 ShopCard 渲染列表 *** */}
                   <div className="shop-list-grid">
                     {shops.map((shop) => ( shop && shop.id ? <ShopCard key={shop.id} shop={shop} /> : null ))}
                   </div>
                   {/* *** --- *** */}

                   {/* *** 使用 Pagination 渲染分頁 *** */}
                    {pagination.totalPages > 1 && !isLoading && (
                       <div className="pagination-container">
                           <Pagination
                             currentPage={pagination.currentPage}
                             totalPages={pagination.totalPages}
                             onPageChange={handlePageChange}
                           />
                       </div>
                    )}
                   {/* *** --- *** */}
                 </>
             )}
        </div>
    </div>
  );
};

export default ShopListPage;