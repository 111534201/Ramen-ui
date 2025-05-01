// src/pages/EventListPage.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
// 導入 API 服務函數
import { getPublicEvents } from '../services/api'; // 確保 api.js 有導出此函數
import EventCard from '../components/EventCard';       // 引入活動卡片
import Pagination from '../components/Pagination';     // 引入分頁組件
// 引入樣式
import './EventListPage.css'; // 頁面專屬樣式 (主要復用 ShopListPage)
import './ShopListPage.css';  // 復用列表頁樣式

const EventListPage = () => {
    const [events, setEvents] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [pagination, setPagination] = useState({
        currentPage: 0,
        totalPages: 0,
        totalElements: 0,
        pageSize: 12, // 每頁顯示 12 個活動
    });

    const [searchParams, setSearchParams] = useSearchParams();

    // 從 URL 讀取當前頁碼
    const getCurrentPageFromUrl = useCallback(() => {
        const page = parseInt(searchParams.get('page') || '0', 10);
        return isNaN(page) || page < 0 ? 0 : page;
    }, [searchParams]);

    // TODO: 從 URL 讀取篩選條件 (如果添加篩選器)
    // const getCurrentFiltersFromUrl = useCallback(() => { ... }, [searchParams]);

    // 獲取活動數據的回調函數
    const fetchEvents = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        const currentPage = getCurrentPageFromUrl();
        const size = pagination.pageSize;
        // 預設排序：即將開始的在前 (按 startDate 升序)
        const sortBy = 'startDate';
        const sortDir = 'ASC';
        // 預設獲取的狀態：進行中和即將開始
        const statuses = ['ACTIVE', 'UPCOMING'];

        try {
            const params = {
                page: currentPage,
                size: size,
                sortBy: sortBy,
                sortDir: sortDir,
                statuses: statuses.join(',') // 將狀態列表轉為逗號分隔字串
            };
            console.log("[EventListPage] Fetching public events with params:", params);

            // 調用 API 獲取數據 (response.data 應為 ApiResponse 結構)
            const apiResponse = await getPublicEvents(params);

            if (apiResponse?.success && apiResponse.data && typeof apiResponse.data === 'object') {
                const pageData = apiResponse.data; // pageData 應為 PageResponse<EventDTO>
                if (!Array.isArray(pageData.content)) {
                     console.error("[EventListPage] API response data.content is not an array:", pageData);
                     throw new Error('後端返回的活動列表格式不正確');
                 }
                setEvents(pageData.content || []);
                setPagination(prev => ({
                    ...prev,
                    currentPage: pageData.pageNo ?? 0,
                    totalPages: pageData.totalPages ?? 0,
                    totalElements: pageData.totalElements ?? 0,
                }));
                 console.log("[EventListPage] Events fetched successfully:", pageData.content.length, "items");
            } else {
                 console.error("[EventListPage] API call failed or returned unexpected format:", apiResponse);
                 throw new Error(apiResponse?.message || "無法獲取活動列表");
            }

        } catch (err) {
            // 錯誤處理：err 可能是 axios 的 error response，也可能是上面 throw 的 Error
             const errMsg = err?.data?.message || err?.message || '無法載入活動資訊';
             console.error("[EventListPage] Error fetching events:", errMsg, err);
             setError(errMsg);
             setEvents([]); // 清空列表
             setPagination(prev => ({ ...prev, currentPage: 0, totalPages: 0, totalElements: 0 }));
        } finally {
            setIsLoading(false);
        }
    }, [pagination.pageSize, getCurrentPageFromUrl]); // 依賴 pageSize 和 URL 中的 page

    // 監聽 URL searchParams 變化來重新獲取數據
    useEffect(() => {
        console.log("[EventListPage - useEffect] searchParams changed, fetching events:", searchParams.toString());
        // TODO: 在這裡可以根據 searchParams 更新篩選狀態
        fetchEvents();
    }, [searchParams, fetchEvents]); // 依賴 searchParams 和 fetchEvents 回調

    // 處理分頁變更
    const handlePageChange = (pageNumber) => {
        // pageNumber 是從 0 開始的
        const safePageNumber = Math.max(0, pageNumber);
        const newParams = new URLSearchParams(searchParams);
        newParams.set('page', safePageNumber.toString());
        setSearchParams(newParams); // 更新 URL，會觸發 useEffect 重新 fetch
        window.scrollTo({ top: 0, behavior: 'smooth' }); // 跳轉到頁面頂部
    };

    // TODO: 添加處理篩選條件變化的函數

    return (
        <div className="event-list-page-container shop-list-page-container">
            <div className="page-header">
                <h1>探索活動</h1>
                {/* 可以在這裡添加篩選器控件 */}
                {/* <div className="filter-sort-controls"> ... </div> */}
            </div>

            <div className="event-list-content shop-list-content">
                 {/* --- 加載/錯誤/無結果提示 --- */}
                 {isLoading && events.length === 0 && <div className="loading list-loading">載入活動中...</div>}
                 {error && !isLoading && <div className="error list-error">錯誤: {error}</div>}
                 {!isLoading && !error && events.length === 0 && ( <div className="no-results list-no-results">目前沒有公開的活動。</div> )}

                 {/* --- 活動列表網格 --- */}
                 {events.length > 0 && (
                    <>
                        {/* 正在加載下一頁時的提示 (可選) */}
                        {isLoading && <div className="loading list-loading-update">更新列表中...</div>}
                        <div className="event-list-grid shop-list-grid">
                            {events.map((event) => (
                                // 確保 event 和 event.id 存在才渲染
                                event && event.id ? (
                                    <EventCard
                                        key={event.id}
                                        event={event}
                                        showManagementButtons={false} // 公開列表不顯示管理按鈕
                                        showStatus={true} // 可以選擇是否顯示狀態 (Active/Upcoming)
                                     />
                                ) : null
                            ))}
                        </div>

                        {/* --- 分頁組件 --- */}
                        {pagination.totalPages > 1 && !isLoading && (
                            <div className="pagination-container">
                                <Pagination
                                    currentPage={pagination.currentPage}
                                    totalPages={pagination.totalPages}
                                    onPageChange={handlePageChange}
                                />
                            </div>
                        )}
                    </>
                 )}
            </div>
        </div>
    );
};

export default EventListPage;