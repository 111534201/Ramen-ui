// src/pages/MyOwnedShopPage.jsx
import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { GoogleMap, MarkerF as Marker } from '@react-google-maps/api';
import Slider from "react-slick";
import apiClient from '../services/api';
import useAuth from '../hooks/useAuth';
import { Role } from '../constants/roles';
import ReviewCard from '../components/ReviewCard';
import Pagination from '../components/Pagination';
import AddReviewForm from '../components/AddReviewForm';
// --- ✨ 引入 EventCard 和相關 API ✨ ---
import EventCard from '../components/EventCard';
import { getEventsByShop } from '../services/api';
// --- ✨ ---
import { renderStars } from '../utils/uiUtils';
import NotFoundPage from './NotFoundPage';
import { format } from 'date-fns';
import { zhTW } from 'date-fns/locale';
import PropTypes from 'prop-types'; // 引入 PropTypes
// --- 引入樣式 ---
import './ShopDetailPage.css'; // 復用店家詳情頁的基礎樣式
import './MyOwnedShopPage.css'; // 店家管理頁的特定樣式
import '../components/EventCard.css'; // 引入 EventCard 樣式

// --- 常量和輔助函數 ---
const mapContainerStyle = { width: '100%', height: '400px', borderRadius: '8px' };
const defaultMapOptions = { streetViewControl: false, mapTypeControl: false, fullscreenControl: false, zoomControl: true, gestureHandling: 'cooperative' };
const sliderSettings = { dots: true, infinite: false, speed: 500, slidesToShow: 1, slidesToScroll: 1, adaptiveHeight: true };

// 構建媒體 URL
const buildMediaUrl = (relativePath) => {
    const defaultPlaceholder = '/placeholder-image.png';
    if (!relativePath) return defaultPlaceholder;
    if (relativePath.startsWith('http')) return relativePath;
    const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';
    const uploadPath = '/uploads';
    const cleanRelativePath = relativePath.startsWith('/') ? relativePath.substring(1) : relativePath;
    const normalizedRelativePath = cleanRelativePath.replace(/\\/g, '/');
    const cleanBaseUrl = baseUrl.endsWith('/') ? baseUrl.substring(0, baseUrl.length - 1) : baseUrl;
    const cleanUploadUrlPath = uploadPath.startsWith('/') ? uploadPath : '/' + uploadPath;
    const finalUploadPath = cleanUploadUrlPath.endsWith('/') ? cleanUploadUrlPath : cleanUploadUrlPath + '/';
    return `${cleanBaseUrl}${finalUploadPath}${normalizedRelativePath}`;
};

// 格式化日期時間
const formatDateTime = (dateTimeString) => {
    if (!dateTimeString) return '未知';
    try { return format(new Date(dateTimeString), 'yyyy年MM月dd日 HH:mm', { locale: zhTW }); }
    catch (e) { console.error("日期格式化錯誤:", dateTimeString, e); return dateTimeString; }
};

// 渲染媒體項目
const renderMediaItem = (mediaItem, index) => {
    if (!mediaItem || !mediaItem.url) return (<div key={`placeholder-${index}`} className="shop-media-item placeholder"><span className="placeholder-text">媒體加載失敗</span></div>);
    const url = buildMediaUrl(mediaItem.url);
    const type = (mediaItem.type === 'VIDEO') ? 'VIDEO' : 'IMAGE';
    if (type === 'VIDEO') { return ( <div key={mediaItem.id || `video-${index}`} className="shop-media-item video-item"><video controls src={url} preload="metadata" playsInline style={{ maxWidth: '100%', maxHeight: '100%', display: 'block' }} title={mediaItem.url}>您的瀏覽器不支持 Video 標籤。<a href={url} target="_blank" rel="noopener noreferrer">觀看影片</a></video></div> ); }
    else { return ( <div key={mediaItem.id || `image-${index}`} className="shop-media-item image-item"><img src={url} alt={`店家媒體 ${index + 1}`} loading="lazy" onError={(e) => { e.target.onerror = null; e.target.src = '/placeholder-image.png'; e.target.style.objectFit = 'contain'; }} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} title={mediaItem.url}/></div> ); }
};
// --- ---

const MyOwnedShopPage = ({ mapLoaded, mapLoadError }) => {
    const { user, isAuthenticated, isLoading: isAuthLoading } = useAuth();
    const navigate = useNavigate();

    // --- State ---
    const [shop, setShop] = useState(null);
    const [isLoadingShop, setIsLoadingShop] = useState(true);
    const [errorShop, setErrorShop] = useState('');
    const [reviews, setReviews] = useState([]);
    const [isLoadingReviews, setIsLoadingReviews] = useState(false); // 評論初始不加載
    const [errorReviews, setErrorReviews] = useState('');
    const [reviewPagination, setReviewPagination] = useState({ currentPage: 0, totalPages: 0, pageSize: 5, totalElements: 0 });
    const [reviewSortBy, setReviewSortBy] = useState('createdAt');
    const [reviewSortDir, setReviewSortDir] = useState('DESC');
    const [editingReview, setEditingReview] = useState(null);
    const [replyingToReviewId, setReplyingToReviewId] = useState(null);
    const [repliesMap, setRepliesMap] = useState({});
    const [loadingRepliesMap, setLoadingRepliesMap] = useState({});
    const [expandedRepliesMap, setExpandedRepliesMap] = useState({});

    // --- ✨ 新增：活動相關 State ✨ ---
    const [events, setEvents] = useState([]);
    const [isLoadingEvents, setIsLoadingEvents] = useState(false); // 初始不加載
    const [errorEvents, setErrorEvents] = useState('');
    // --- ✨ ---

    // --- Refs ---
    const reviewSectionRef = useRef(null);
    const reviewFormRef = useRef(null);
    const mapRef = useRef(null); // 地圖 Ref

    // --- Helper Function: 檢查是否店家 ---
    const isShopOwner = useMemo(() => user?.roles?.includes(Role.ROLE_SHOP_OWNER), [user]);

    // --- 獲取店家 ID ---
    const ownedShopId = useMemo(() => (isShopOwner && user?.ownedShopIds?.length > 0 ? user.ownedShopIds[0] : null), [user, isShopOwner]);
    const numericShopId = useMemo(() => ownedShopId ? parseInt(ownedShopId, 10) : null, [ownedShopId]); // 確保是數字
    const isValidShopId = useMemo(() => numericShopId !== null && !isNaN(numericShopId), [numericShopId]);

    // --- 回調函數：獲取店家詳情 ---
     const fetchOwnedShopDetails = useCallback(async () => {
         if (!isValidShopId) { setIsLoadingShop(false); setErrorShop('無法獲取店家 ID。'); return Promise.reject('Invalid ownedShopId'); }
         setIsLoadingShop(true); setErrorShop(''); setShop(null);
         try {
             console.log(`[MyOwnedShopPage] Fetching owned shop details for ID: ${numericShopId}`);
             const response = await apiClient.get(`/shops/${numericShopId}`);
             if (response.data?.success && response.data?.data) { setShop(response.data.data); return response.data.data; }
             else { throw new Error(response.data?.message || `無法獲取您的店家信息 (ID: ${numericShopId})`); }
         } catch (err) {
             const errMsg = err?.response?.data?.message || err?.data?.message || err?.message || '無法載入您的店家信息';
             console.error("[MyOwnedShopPage] Fetch shop error:", errMsg, err);
             setErrorShop(errMsg); setShop(null); throw err;
         } finally { setIsLoadingShop(false); }
     }, [numericShopId, isValidShopId]);

    // --- 回調函數：獲取評論 ---
    const fetchReviews = useCallback(async (page) => {
        if (!isValidShopId) return;
        setIsLoadingReviews(true); setErrorReviews('');
        const safePage = Math.max(0, page);
        try {
            const params = { page: safePage, size: reviewPagination.pageSize, sortBy: reviewSortBy, sortDir: reviewSortDir };
            const response = await apiClient.get(`/reviews/shop/${numericShopId}`, { params });
             if (response.data?.success && response.data?.data && typeof response.data.data === 'object') {
                 const d = response.data.data; setReviews(Array.isArray(d.content) ? d.content : []);
                 setReviewPagination(p => ({ ...p, currentPage: d.pageNo ?? 0, totalPages: d.totalPages ?? 0, totalElements: d.totalElements ?? 0 }));
             } else { throw new Error(response.data?.message || '無法獲取評論'); }
        } catch (err) { setErrorReviews(err?.response?.data?.message || err?.data?.message || '無法載入評論'); setReviews([]); setReviewPagination(p => ({ ...p, currentPage: 0, totalPages: 0, totalElements: 0 })); }
        finally { setIsLoadingReviews(false); }
    }, [numericShopId, isValidShopId, reviewPagination.pageSize, reviewSortBy, reviewSortDir]);

    // --- ✨ 新增：回調函數：獲取店家活動 ✨ ---
    const fetchShopEvents = useCallback(async () => {
        if (!isValidShopId) return;
        setIsLoadingEvents(true); setErrorEvents('');
        try {
            const params = { statuses: 'ACTIVE,UPCOMING', page: 0, size: 3, sortBy: 'startDate', sortDir: 'ASC' };
            const apiResponse = await getEventsByShop(numericShopId, params);
             if (apiResponse?.success && apiResponse.data && typeof apiResponse.data === 'object') {
                 const pageData = apiResponse.data;
                 if (!Array.isArray(pageData.content)) throw new Error('後端返回的活動列表格式不正確');
                 setEvents(pageData.content || []);
             } else { throw new Error(apiResponse?.message || "無法獲取店家活動"); }
        } catch (err) { setErrorEvents(err?.data?.message || err?.message || '載入店家活動時發生錯誤'); setEvents([]); }
        finally { setIsLoadingEvents(false); }
    }, [numericShopId, isValidShopId]);
    // --- ✨ ---

    // --- 其他回調函數 (保持不變) ---
    const loadReplies = useCallback(async (parentReviewId) => { /* ... */ }, [repliesMap, loadingRepliesMap, expandedRepliesMap]);
    const scrollToElement = (ref) => { /* ... */ };
    const handleReviewAdded = useCallback((addedReviewDTO) => { /* ... (需要確保 fetchOwnedShopDetails 被調用) */ }, [fetchReviews, fetchOwnedShopDetails, loadReplies, reviewSectionRef]); // 確認依賴
    const handleReviewUpdated = useCallback(() => { /* ... (需要確保 fetchOwnedShopDetails 被調用) */ }, [fetchReviews, fetchOwnedShopDetails, reviewPagination.currentPage]); // 確認依賴
    const handleCancelEdit = useCallback(() => { /* ... */ }, []);
    const handleDeleteReview = useCallback(async (idToDelete) => { /* ... (需要確保 fetchOwnedShopDetails 被調用) */ }, [reviews, repliesMap, editingReview, reviewPagination, fetchReviews, fetchOwnedShopDetails]); // 確認依賴
    const handleEditReview = useCallback((reviewToEdit) => { /* ... */ }, [user, scrollToElement, reviewFormRef]);
    const handleReplyToReview = useCallback((parentReviewId) => { /* ... */ }, [user, navigate, location, scrollToElement, reviewFormRef]);
    const handleReviewPageChange = (pageNumber) => { /* ... */ };
    const handleSortChange = (event) => { /* ... */ };
    const onMapLoad = useCallback((map) => { mapRef.current = map; }, []);
    const onMapUnmount = useCallback(() => { mapRef.current = null; }, []);
    const handleMarkerClick = () => { /* 可選 */ };

    // --- useEffect for initial data loading ---
    useEffect(() => {
        if (isAuthLoading) return; // 等待認證加載完成
        if (!isAuthenticated || !isShopOwner) { setIsLoadingShop(false); setErrorShop('只有店家用戶可以訪問此頁面。'); return; }
        if (!isValidShopId) { setIsLoadingShop(false); setErrorShop('無法獲取您的店家信息，請聯繫管理員。'); return; }

        // 重置狀態
        setShop(null); setReviews([]); setErrorShop(''); setErrorReviews(''); setIsLoadingShop(true); setIsLoadingReviews(true);
        setEditingReview(null); setReplyingToReviewId(null);
        setReviewPagination(prev => ({ ...prev, currentPage: 0, totalPages: 0, totalElements: 0 }));
        setReviewSortBy('createdAt'); setReviewSortDir('DESC');
        setRepliesMap({}); setLoadingRepliesMap({}); setExpandedRepliesMap({});
        setEvents([]); setErrorEvents(''); setIsLoadingEvents(true); // ✨ 重置活動狀態 ✨

        console.log(`[MyOwnedShopPage] useEffect loading for owned shop ID: ${numericShopId}`);
        // 並行加載店家信息、第一頁評論和活動
        Promise.allSettled([
            fetchOwnedShopDetails(),
            fetchReviews(0),
            fetchShopEvents() // ✨ 調用獲取活動的函數 ✨
        ]).then(results => {
             results.forEach((result, index) => {
                  if (result.status === 'rejected') {
                      console.error(`Initial fetch failed for ${['shop', 'reviews', 'events'][index]}:`, result.reason);
                      // 設置對應錯誤
                      if (index === 0) setErrorShop("無法載入店家資訊");
                      if (index === 1) setErrorReviews("無法載入評論");
                      if (index === 2) setErrorEvents("無法載入活動");
                  }
             });
             // 確保所有加載狀態都結束
             setIsLoadingShop(false);
             setIsLoadingReviews(false);
             setIsLoadingEvents(false);
        });

    }, [numericShopId, isValidShopId, isAuthenticated, isAuthLoading, isShopOwner, fetchOwnedShopDetails, fetchReviews, fetchShopEvents]); // ✨ 加入 fetchShopEvents 依賴 ✨

    // --- 渲染邏輯 ---
    if (isAuthLoading || (isLoadingShop && !shop && !errorShop)) { // 改進初始加載條件
        return <div className="loading page-loading" style={{ paddingTop: '5rem' }}>載入店家管理頁面...</div>;
    }

    // 權限或數據加載錯誤
    if (!isAuthenticated || !isShopOwner || !isValidShopId || (errorShop && !shop)) {
        return <NotFoundPage message={errorShop || "您沒有權限訪問此頁面或無法加載店家信息。"} />;
    }
    if (!shop) { // 雖然加載完成但 shop 還是 null
        return <NotFoundPage message={"無法載入您的店家資料。"} />;
    }

    // --- 準備渲染數據 ---
    const shopLocation = shop.latitude && shop.longitude ? { lat: parseFloat(shop.latitude), lng: parseFloat(shop.longitude) } : null;
    const shopAvgRating = parseFloat(shop.averageRating) || 0;
    const shopMediaList = Array.isArray(shop.media) ? shop.media : [];
    const shopOwnerIdForCheck = user?.id; // 店家本人 ID
    const currentSliderSettings = { ...sliderSettings, infinite: shopMediaList.length > 1, arrows: shopMediaList.length > 1 };

    return (
        <div className="my-owned-shop-page shop-detail-page page-container">
            {/* 頁面標頭 */}
            <div className="page-header my-shop-header">
                <h1>我的店面管理：{shop.name}</h1>
                <div className="header-actions"> {/* 用一個容器包裹按鈕 */}
                    <button
                        onClick={() => navigate(`/shops/${numericShopId}/edit`)}
                        className="edit-shop-button main-action-button"
                    >
                        編輯店家資訊
                    </button>
                </div>
            </div>

            {/* 主要內容網格 */}
            <div className="shop-content-grid">
                 <div className="shop-info"> {/* 左側 */}
                     {/* 媒體輪播 */}
                     {shopMediaList.length > 0 ? ( <div className="shop-media-carousel-container"><Slider {...currentSliderSettings}>{shopMediaList.map(renderMediaItem)}</Slider></div> )
                     : ( <div className="shop-media-carousel-container placeholder"><span className="placeholder-text">尚未上傳圖片或影片</span></div> )}
                     {/* 基本信息 */}
                    <p><strong>地址:</strong> {shop.address || '未提供'}</p>
                    {shop.phone && <p><strong>電話:</strong> <a href={`tel:${shop.phone}`}>{shop.phone}</a></p>}
                    {shop.openingHours && ( <div className="shop-info-block"><strong>營業時間:</strong><pre>{shop.openingHours}</pre></div> )}
                    {shop.description && ( <div className="shop-info-block"><strong>特色描述:</strong><pre>{shop.description}</pre></div> )}
                    {/* 評分 */}
                    <div className="shop-rating-summary"><strong>平均評分: </strong>{shopAvgRating > 0 ? (<>{renderStars(shopAvgRating)}<span className="rating-value"> {shopAvgRating.toFixed(1)} / 5</span><span className="rating-count"> ({shop.reviewCount || 0} 則評論)</span></>) : (<span> 尚無評分</span>)}</div>
                    <p><small>最後更新於: {formatDateTime(shop.updatedAt)}</small></p>
                 </div>
                 <div className="shop-map"> {/* 右側 */}
                     {shopLocation && mapLoaded ? (<GoogleMap mapContainerStyle={mapContainerStyle} center={shopLocation} zoom={16} options={defaultMapOptions} onLoad={onMapLoad} onUnmount={onMapUnmount}><Marker position={shopLocation} title={shop.name} onClick={handleMarkerClick} /></GoogleMap>)
                     : (<div className="map-placeholder">{mapLoaded ? '未提供座標。' : '地圖載入中...'}</div>)}
                 </div>
            </div>

            {/* --- ✨ 店家活動區塊 ✨ --- */}
            <div className="shop-events-section section-container">
                 <h2>進行中/即將開始的活動</h2>
                 {isLoadingEvents && <div className="loading">載入活動中...</div>}
                 {errorEvents && !isLoadingEvents && <div className="error">無法載入活動: {errorEvents}</div>}
                 {!isLoadingEvents && !errorEvents && events.length === 0 && (<div className="no-results">目前沒有進行中或即將開始的活動。</div>)}
                 {!isLoadingEvents && !errorEvents && events.length > 0 && (
                     <div className="event-list-grid shop-list-grid">
                         {events.map((event) => (
                             event && event.id ? (
                                 <EventCard
                                     key={event.id}
                                     event={event}
                                     showManagementButtons={false} // 不在此頁顯示編輯/刪除
                                     showStatus={true} // 顯示狀態
                                 />
                             ) : null
                         ))}
                     </div>
                 )}
            </div>
            {/* --- ✨ 活動區塊結束 ✨ --- */}

            {/* 評論區 */}
            <div className="review-section section-container shop-owner-reviews" ref={reviewSectionRef}>
                <h2>顧客評論與回覆 ({reviewPagination.totalElements})</h2>

                {/* 回覆/編輯表單區域 */}
                <div ref={reviewFormRef}>
                    {/* 編輯店家自己的回覆 */}
                    {editingReview && (
                        <AddReviewForm
                            shopId={numericShopId}
                            reviewToEdit={editingReview}
                            onReviewUpdated={handleReviewUpdated}
                            onCancelEdit={handleCancelEdit}
                            isReplyMode={true} // 編輯回覆也算回覆模式
                        />
                    )}
                    {/* 回覆顧客的頂級評論 */}
                    {replyingToReviewId && !editingReview && (
                        <AddReviewForm
                            shopId={numericShopId}
                            isReplyMode={true}
                            parentReviewId={replyingToReviewId}
                            onReviewAdded={handleReviewAdded}
                            onCancelEdit={handleCancelEdit}
                        />
                    )}
                </div>

                {/* 評論排序 */}
                 {(reviewPagination.totalElements > 0 || isLoadingReviews) && (
                     <div className="review-controls">
                         <div className="review-sort-controls">
                             <label htmlFor="review-sort">排序: </label>
                             <select
                                 id="review-sort"
                                 value={reviewSortBy === 'createdAt' ? 'createdAt_desc' : (reviewSortDir === 'DESC' ? 'rating_desc' : 'rating_asc')}
                                 onChange={handleSortChange}
                                 disabled={isLoadingReviews}
                             >
                                 <option value="createdAt_desc">最新</option>
                                 <option value="rating_desc">評分高到低</option>
                                 <option value="rating_asc">評分低到高</option>
                             </select>
                         </div>
                     </div>
                 )}

                {/* 評論列表 */}
                {isLoadingReviews && reviews.length === 0 && <div className="loading">載入評論中...</div>}
                {errorReviews && !isLoadingReviews && <div className="error">錯誤: {errorReviews}</div>}
                {!isLoadingReviews && !errorReviews && reviews.length === 0 && reviewPagination.totalElements === 0 && ( <div className="no-results">目前還沒有顧客評論。</div> )}
                <div className="review-list">
                    {Array.isArray(reviews) && reviews.map((review) => {
                      if (!review || !review.user) return null;
                      const reviewIdStr = String(review.id);
                      const currentReplies = repliesMap[reviewIdStr] || [];
                      const isLoadingCurrentReplies = loadingRepliesMap[reviewIdStr] || false;
                      const areRepliesExpanded = expandedRepliesMap[reviewIdStr] || false;
                      return (
                        <div key={review.id} className="review-item-container">
                            <ReviewCard
                              review={review}
                              isReply={false}
                              isShopOwnerViewing={true} // 明確告知是店家視角
                              shopOwnerId={shopOwnerIdForCheck}
                              currentUserId={user?.id}
                              onDelete={null} // 店家不能刪除顧客評論
                              onEdit={null} // 店家不能編輯顧客評論
                              onReply={handleReplyToReview} // 店家可以回覆頂級評論
                              onLoadReplies={loadReplies}
                              isExpanded={areRepliesExpanded}
                              replyCount={review.replyCount ?? 0}
                              isLoadingReplies={isLoadingCurrentReplies}
                            />
                            {areRepliesExpanded && (
                                <div className="replies-list-container">
                                    {isLoadingCurrentReplies ? ( <div className="loading">載入回覆中...</div> )
                                    : ( currentReplies.length > 0 ? (
                                        currentReplies.map(reply => {
                                            if (!reply || !reply.user) return null;
                                            const isEditingThisReply = editingReview?.id === reply.id;
                                            // 檢查回覆是否由當前店家用戶所寫
                                            const isOwnReply = reply.user?.id === user?.id;
                                            if (isEditingThisReply) return null;
                                            return (
                                                <ReviewCard
                                                    key={reply.id}
                                                    review={reply}
                                                    isReply={true}
                                                    isShopOwnerViewing={true}
                                                    shopOwnerId={shopOwnerIdForCheck}
                                                    currentUserId={user?.id}
                                                    onDelete={isOwnReply ? handleDeleteReview : null} // 只有店家自己寫的回覆才能刪除
                                                    onEdit={isOwnReply ? handleEditReview : null} // 只有店家自己寫的回覆才能編輯
                                                    onReply={null}
                                                    onLoadReplies={null}
                                                />
                                            );
                                        })
                                     ) : ( <p className="no-replies">目前沒有回覆。</p> )
                                    )}
                                </div>
                            )}
                        </div>
                      );
                    })}
                </div>
                {/* 評論分頁 */}
                {!isLoadingReviews && !errorReviews && reviewPagination.totalPages > 1 && (
                    <div className="pagination-container">
                         <Pagination
                             currentPage={reviewPagination.currentPage}
                             totalPages={reviewPagination.totalPages}
                             onPageChange={handleReviewPageChange}
                         />
                     </div>
                )}
            </div>
        </div>
    );
};

// --- PropTypes ---
MyOwnedShopPage.propTypes = {
  mapLoaded: PropTypes.bool,
  mapLoadError: PropTypes.object,
};

export default MyOwnedShopPage;