// src/pages/ShopDetailPage.jsx
import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useParams, Link, useNavigate, useLocation } from 'react-router-dom';
import { GoogleMap, MarkerF as Marker } from '@react-google-maps/api';
import Slider from "react-slick"; // 引入 react-slick
import "slick-carousel/slick/slick.css"; // react-slick 基礎樣式
import "slick-carousel/slick/slick-theme.css"; // react-slick 主題樣式
import apiClient from '../services/api';
import useAuth from '../hooks/useAuth';
import { Role } from '../constants/roles'; // 假設你有定義角色的常量
import ReviewCard from '../components/ReviewCard';
import Pagination from '../components/Pagination';
import AddReviewForm from '../components/AddReviewForm';
// --- ✨ 引入 EventCard ✨ ---
import EventCard from '../components/EventCard';
// --- ✨ ---
import { renderStars } from '../utils/uiUtils'; // 假設你有星星渲染工具函數
import NotFoundPage from './NotFoundPage'; // 引入 404 頁面
import { format } from 'date-fns';
import { zhTW } from 'date-fns/locale';
import PropTypes from 'prop-types'; // 引入 PropTypes
import './ShopDetailPage.css'; // 引入頁面樣式
// --- ✨ 引入 EventCard 的樣式 (如果 EventCard.css 是獨立的) ✨ ---
import '../components/EventCard.css';
// --- ✨ ---

// --- 常量和輔助函數 ---
const mapContainerStyle = { width: '100%', height: '400px', borderRadius: '8px' };
const defaultMapOptions = { streetViewControl: false, mapTypeControl: false, fullscreenControl: true, zoomControl: true, gestureHandling: 'cooperative' };
const sliderSettings = { dots: true, infinite: false, speed: 500, slidesToShow: 1, slidesToScroll: 1, adaptiveHeight: true };

// 構建媒體 URL
const buildMediaUrl = (relativePath) => {
    const defaultPlaceholder = '/placeholder-image.png'; // 通用預設圖
    if (!relativePath) return defaultPlaceholder;
    if (relativePath.startsWith('http')) return relativePath; // 絕對 URL 直接返回
    const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';
    const uploadPath = '/uploads'; // 與後端 WebConfig 匹配
    const cleanRelativePath = relativePath.startsWith('/') ? relativePath.substring(1) : relativePath;
    // 確保路徑分隔符統一為 /
    const normalizedRelativePath = cleanRelativePath.replace(/\\/g, '/');
    // 拼接路徑
    const cleanBaseUrl = baseUrl.endsWith('/') ? baseUrl.substring(0, baseUrl.length - 1) : baseUrl;
    const cleanUploadUrlPath = uploadPath.startsWith('/') ? uploadPath : '/' + uploadPath;
    const finalUploadPath = cleanUploadUrlPath.endsWith('/') ? cleanUploadUrlPath : cleanUploadUrlPath + '/';
    return `${cleanBaseUrl}${finalUploadPath}${normalizedRelativePath}`;
};

// 格式化日期時間
const formatDateTime = (dateTimeString) => {
    if (!dateTimeString) return '未知';
    try {
        const date = new Date(dateTimeString);
        if (isNaN(date.getTime())) {
            console.warn("無效的日期格式:", dateTimeString);
            return dateTimeString;
        }
        return format(date, 'yyyy年MM月dd日 HH:mm', { locale: zhTW });
    } catch (e) {
        console.error("日期格式化時發生錯誤:", dateTimeString, e);
        return dateTimeString;
    }
};

// 渲染媒體項目 (圖片或影片)
const renderMediaItem = (mediaItem, index) => {
    //console.log('Processing media item:', JSON.stringify(mediaItem, null, 2));
    // 基本檢查
    if (!mediaItem || !mediaItem.url) {
        console.warn(`[renderMediaItem] Invalid media item at index ${index}`, mediaItem);
        // 返回一個佔位符或其他錯誤提示
        return (
            <div key={`placeholder-${index}`} className="shop-media-item placeholder">
                <span className="placeholder-text">媒體加載失敗</span>
            </div>
        );
    }

    const url = buildMediaUrl(mediaItem.url);
    // 判斷媒體類型，預設為 IMAGE
    const type = (mediaItem.type?.toUpperCase() === 'VIDEO') ? 'VIDEO' : 'IMAGE'; // 使用可選鏈和轉大寫比較

    // *** 根據類型渲染不同標籤 ***
    if (type === 'VIDEO') {
        // 渲染 <video> 標籤
        return (
            <div key={mediaItem.id || `video-${index}`} className="shop-media-item video-item">
                <video
                    controls // 顯示播放控制項
                    src={url}
                    preload="metadata" // 建議預載入元數據 (影片長度等)
                    playsInline // 在移動設備上行內播放
                    style={{ maxWidth: '100%', maxHeight: '100%', display: 'block' }} // 樣式
                    title={mediaItem.url} // 提示文字
                    onError={(e) => { // 影片加載錯誤處理
                         console.error(`[renderMediaItem] Error loading video: ${url}`, e);
                         // 可以顯示錯誤提示或佔位符
                         e.target.style.display = 'none'; // 隱藏損壞的 video 標籤
                         // 或者替換成錯誤提示文字
                    }}
                >
                    您的瀏覽器不支持 Video 標籤。
                    <a href={url} target="_blank" rel="noopener noreferrer">觀看影片</a>
                </video>
            </div>
        );
    } else {
        // 渲染 <img> 標籤 (原有的邏輯)
        return (
            <div key={mediaItem.id || `image-${index}`} className="shop-media-item image-item">
                <img
                    src={url}
                    alt={`店家媒體 ${index + 1}`}
                    loading="lazy"
                    onError={(e) => {
                        console.error(`[renderMediaItem] Error loading image: ${url}`);
                        e.target.onerror = null;
                        e.target.src = '/placeholder-image.png'; // 圖片加載失敗時的佔位圖
                        e.target.style.objectFit = 'contain'; // 調整樣式避免圖片變形
                    }}
                    style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                    title={mediaItem.url}
                />
            </div>
        );
    }
};
// --- ---

// --- ✨ 導入獲取店家活動的 API 函數 ✨ ---
import { getEventsByShop } from '../services/api';
// --- ✨ ---


const ShopDetailPage = ({ mapLoaded, mapLoadError }) => {
    const { id: shopId } = useParams(); // 從 URL 獲取店家 ID
    const numericShopId = parseInt(shopId, 10); // 轉換為數字
    const isValidShopId = !isNaN(numericShopId); // 驗證 ID

    const { user, isAuthenticated, isLoading: isAuthLoading } = useAuth(); // 獲取用戶認證信息
    const navigate = useNavigate();
    const location = useLocation(); // 用於登入後跳轉回來

    // --- State 定義 ---
    const [shop, setShop] = useState(null); // 店家詳細資訊
    const [isLoadingShop, setIsLoadingShop] = useState(true); // 是否正在加載店家資訊
    const [errorShop, setErrorShop] = useState(''); // 加載店家資訊的錯誤信息

    const [reviews, setReviews] = useState([]); // 評論列表 (當前頁)
    const [isLoadingReviews, setIsLoadingReviews] = useState(true); // 是否正在加載評論
    const [errorReviews, setErrorReviews] = useState(''); // 加載評論的錯誤信息
    const [reviewPagination, setReviewPagination] = useState({ currentPage: 0, totalPages: 0, pageSize: 5, totalElements: 0 }); // 評論分頁信息
    const [reviewSortBy, setReviewSortBy] = useState('createdAt'); // 評論排序字段
    const [reviewSortDir, setReviewSortDir] = useState('DESC'); // 評論排序方向

    // --- ✨ 新增：活動相關 State ✨ ---
    const [events, setEvents] = useState([]); // 店家活動列表
    const [isLoadingEvents, setIsLoadingEvents] = useState(true); // 是否正在加載活動
    const [errorEvents, setErrorEvents] = useState(''); // 加載活動的錯誤信息
    // --- ✨ ---

    const [editingReview, setEditingReview] = useState(null); // 正在編輯的評論對象 (用於傳給表單)
    const [replyingToReviewId, setReplyingToReviewId] = useState(null); // 正在回覆的父評論 ID

    const [repliesMap, setRepliesMap] = useState({}); // 存儲已加載的回覆 { parentId: [reply1, reply2] }
    const [loadingRepliesMap, setLoadingRepliesMap] = useState({}); // 標記哪些評論的回覆正在加載 { parentId: true }
    const [expandedRepliesMap, setExpandedRepliesMap] = useState({}); // 標記哪些評論的回覆列表已展開 { parentId: true }

    // --- Refs 定義 ---
    const reviewSectionRef = useRef(null); // 用於滾動到評論區
    const reviewFormRef = useRef(null); // 用於滾動到評論表單
    const mapRef = useRef(null); // Google Map 實例引用

    // --- 計算屬性 ---
    // 判斷當前用戶是否為店家主人
    const isOwner = useMemo(() => {
        if (!isAuthenticated || !user || !shop || !shop.owner) return false;
        // 確保比較 ID 時類型一致
        return String(user.id) === String(shop.owner.id);
    }, [isAuthenticated, user, shop]);

    // --- 回調函數：獲取店家詳情 ---
    const fetchShopDetails = useCallback(async () => {
        if (!isValidShopId) { setIsLoadingShop(false); setErrorShop('無效的店家 ID。'); return Promise.reject('Invalid shop ID'); }
        setIsLoadingShop(true); setErrorShop('');
        try {
            //console.log(`[ShopDetailPage] Fetching shop details for ID: ${numericShopId}`);
            const response = await apiClient.get(`/shops/${numericShopId}`);
            if (response.data?.success && response.data?.data) {
                setShop(response.data.data);
                return response.data.data; // 返回數據供 Promise.all 使用
            } else {
                throw new Error(response.data?.message || '無法獲取店家信息');
            }
        } catch (err) {
            const errMsg = err?.response?.data?.message || err?.data?.message || err?.message || '無法載入店家信息';
             console.error(`[ShopDetailPage] Error fetching shop details: ${errMsg}`, err);
            if (err?.response?.status === 404 || err?.status === 404 || errMsg.includes('not found') || errMsg.includes('找不到')) {
                setErrorShop(`找不到 ID 為 ${numericShopId} 的店家。`);
            } else {
                setErrorShop(errMsg);
            }
            setShop(null);
            throw err; // 重新拋出以便 Promise.allSettled 捕獲
        } finally {
            setIsLoadingShop(false);
        }
    }, [numericShopId, isValidShopId]);

    // --- 回調函數：獲取評論 ---
    const fetchReviews = useCallback(async (page) => {
        if (!isValidShopId) { return; }
        setIsLoadingReviews(true); setErrorReviews('');
        const safePage = Math.max(0, page);
        try {
            const params = { page: safePage, size: reviewPagination.pageSize, sortBy: reviewSortBy, sortDir: reviewSortDir };
           // console.log(`[ShopDetailPage] Fetching reviews for shop ID: ${numericShopId}, params:`, params);
            const response = await apiClient.get(`/reviews/shop/${numericShopId}`, { params });
            if (response.data?.success && response.data?.data && typeof response.data.data === 'object') {
                 const d = response.data.data;
                 const content = Array.isArray(d.content) ? d.content : [];
                 setReviews(content);
                 setReviewPagination(p => ({ ...p, currentPage: d.pageNo ?? 0, totalPages: d.totalPages ?? 0, totalElements: d.totalElements ?? 0 }));
                 //console.log(`[ShopDetailPage] Reviews fetched: ${content.length} items`);
            } else {
                 console.error('[ShopDetailPage] fetchReviews API response format incorrect or failed', response.data);
                 throw new Error(response.data?.message || '無法獲取評論');
            }
        } catch (err) {
            const backendMessage = err?.response?.data?.message || err?.data?.message || err?.message || '無法載入評論';
            console.error(`[ShopDetailPage] Error fetching reviews: ${backendMessage}`, err);
            setErrorReviews(backendMessage);
            setReviews([]);
            setReviewPagination(p => ({ ...p, currentPage: 0, totalPages: 0, totalElements: 0 }));
        } finally {
            setIsLoadingReviews(false);
        }
    }, [numericShopId, isValidShopId, reviewPagination.pageSize, reviewSortBy, reviewSortDir]);

    // --- ✨ 新增：回調函數：獲取店家活動 ✨ ---
    const fetchShopEvents = useCallback(async () => {
        if (!isValidShopId) return;
        setIsLoadingEvents(true);
        setErrorEvents('');
        //console.log(`[ShopDetailPage] Fetching events for shop ID: ${numericShopId}`);
        try {
            const params = {
                statuses: 'ACTIVE,UPCOMING', // 查詢狀態
                page: 0,                     // 只查第一頁
                size: 3,                     // 最多顯示 3 個
                sortBy: 'startDate',
                sortDir: 'ASC'               // 即將開始的在前
            };
            const apiResponse = await getEventsByShop(numericShopId, params);

             if (apiResponse?.success && apiResponse.data && typeof apiResponse.data === 'object') {
                 const pageData = apiResponse.data;
                 if (!Array.isArray(pageData.content)) {
                     console.error("[ShopDetailPage] Event API response data.content is not an array:", pageData);
                     throw new Error('後端返回的活動列表格式不正確');
                 }
                 setEvents(pageData.content || []);
                 //console.log("[ShopDetailPage] Events fetched:", pageData.content.length);
             } else {
                  console.error("[ShopDetailPage] Fetching events failed or returned unexpected format:", apiResponse);
                  throw new Error(apiResponse?.message || "無法獲取店家活動");
             }
        } catch (err) {
             const errMsg = err?.data?.message || err?.message || '載入店家活動時發生錯誤';
             console.error("[ShopDetailPage] Error fetching events:", errMsg, err);
             setErrorEvents(errMsg);
             setEvents([]);
        } finally {
            setIsLoadingEvents(false);
        }
    }, [numericShopId, isValidShopId]);
    // --- ✨ ---

    // --- 回調函數：加載回覆 ---
    const loadReplies = useCallback(async (parentReviewId) => {
        const idStr = String(parentReviewId);
        const alreadyLoaded = !!repliesMap[idStr];
        const isLoading = loadingRepliesMap[idStr];
        const isExpanded = expandedRepliesMap[idStr];

        // 切換展開狀態
        setExpandedRepliesMap(prev => ({ ...prev, [idStr]: !isExpanded }));

        // 如果要展開，且尚未加載且不在加載中
        if (!isExpanded && !alreadyLoaded && !isLoading) {
            //console.log(`[ShopDetailPage] Loading replies for parent review ID: ${parentReviewId}`);
            setLoadingRepliesMap(prev => ({ ...prev, [idStr]: true }));
            try {
                const response = await apiClient.get(`/reviews/${parentReviewId}/replies`);
                if (response.data?.success && Array.isArray(response.data.data)) {
                    setRepliesMap(prev => ({ ...prev, [idStr]: response.data.data }));
                    //console.log(`[ShopDetailPage] Replies loaded for ${parentReviewId}:`, response.data.data.length);
                } else {
                    throw new Error(response.data?.message || '無法獲取回覆');
                }
            } catch (error) {
                console.error(`[ShopDetailPage] Error loading replies for parent review ID ${parentReviewId}:`, error);
                setRepliesMap(prev => ({ ...prev, [idStr]: [] })); // 加載失敗設為空數組
            } finally {
                setLoadingRepliesMap(prev => ({ ...prev, [idStr]: false }));
            }
        }
    }, [repliesMap, loadingRepliesMap, expandedRepliesMap]);

    // --- 滾動到指定元素 ---
    const scrollToElement = (ref) => {
        if (ref.current) {
            ref.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    };

    // --- 評論操作回調 ---
    const handleReviewAdded = useCallback((addedReviewDTO) => {
        const isReply = !!addedReviewDTO.parentReviewId;
        setReplyingToReviewId(null);
        setEditingReview(null);
        alert(isReply ? '回覆成功！' : '評論成功！');
        if (!isReply) {
            // 新增頂級評論後，刷新店家資訊(評分)和評論列表(跳回第一頁)
            fetchShopDetails().catch(e => console.error("Error refetching shop after review added:", e));
            fetchReviews(0); // 跳回評論第一頁
            scrollToElement(reviewSectionRef);
        } else {
            // 新增回覆後，更新父評論的回覆數，並重新加載該評論的回覆
            const parentId = addedReviewDTO.parentReviewId;
            setRepliesMap(p => { const n = { ...p }; delete n[String(parentId)]; return n; }); // 清除舊的回覆緩存
            setExpandedRepliesMap(p => ({ ...p, [String(parentId)]: true })); // 確保回覆列表是展開的
            loadReplies(parentId); // 重新加載回覆
            // 更新頂級評論列表中的 replyCount
            setReviews(prev => prev.map(r => r.id === parentId ? { ...r, replyCount: (r.replyCount ?? 0) + 1 } : r));
        }
    }, [fetchReviews, fetchShopDetails, loadReplies, reviewSectionRef]);

    const handleReviewUpdated = useCallback(() => {
        setEditingReview(null); // 關閉編輯表單
        alert('更新成功！');
        // 刷新當前頁評論和店家資訊
        fetchReviews(reviewPagination.currentPage);
        fetchShopDetails().catch(e => console.error("Error refetching shop after review updated:", e));
    }, [fetchReviews, fetchShopDetails, reviewPagination.currentPage]);

    const handleCancelEdit = useCallback(() => {
        setEditingReview(null);
        setReplyingToReviewId(null);
    }, []);

    const handleDeleteReview = useCallback(async (idToDelete) => {
        if (!idToDelete || !window.confirm('確定刪除此評論或回覆嗎？此操作無法撤銷。')) return;
        try {
            let parentReviewIdToUpdate = null;
            let isTopLevelReview = false;
            const reviewIndex = reviews.findIndex(r => r?.id === idToDelete);
            if (reviewIndex > -1) {
                isTopLevelReview = true;
            } else {
                for (const parentIdStr in repliesMap) {
                    const replyIndex = repliesMap[parentIdStr]?.findIndex(rp => rp?.id === idToDelete);
                    if (replyIndex > -1) {
                        parentReviewIdToUpdate = parseInt(parentIdStr, 10);
                        break;
                    }
                }
            }

            await apiClient.delete(`/reviews/${idToDelete}`);
            alert('刪除成功');
            if (editingReview?.id === idToDelete) setEditingReview(null); // 如果正在編輯的被刪了，關閉表單

            if (isTopLevelReview) {
                // 刪除頂級評論後，刷新店家信息和評論列表
                fetchShopDetails().catch(e => console.error("Error refetching shop after delete:", e));
                // 清理可能存在的回覆緩存和展開狀態
                setRepliesMap(p => { const n = { ...p }; delete n[String(idToDelete)]; return n; });
                setExpandedRepliesMap(p => { const n = { ...p }; delete n[String(idToDelete)]; return n; });
                // 重新計算分頁
                const { totalElements: prevTotal, pageSize: ps, currentPage: pc } = reviewPagination;
                const newTotal = Math.max(0, prevTotal - 1);
                const newTotalPages = Math.ceil(newTotal / ps);
                let pageToFetch = pc;
                if (pc > 0 && pc >= newTotalPages) { // 如果刪除的是最後一頁的最後一條
                    pageToFetch = Math.max(0, newTotalPages - 1);
                }
                fetchReviews(pageToFetch); // 刷新評論列表
            } else if (parentReviewIdToUpdate) {
                // 刪除回覆後，更新回覆列表和父評論的計數
                setRepliesMap(p => {
                    const n = { ...p };
                    const ps = String(parentReviewIdToUpdate);
                    if (n[ps]) {
                        n[ps] = n[ps].filter(rp => rp?.id !== idToDelete);
                    }
                    return n;
                });
                setReviews(prev => prev.map(r => r.id === parentReviewIdToUpdate ? { ...r, replyCount: Math.max(0, (r.replyCount ?? 0) - 1) } : r));
            }
        } catch (e) {
            console.error("刪除失敗:", e);
            alert(`刪除失敗: ${e?.response?.data?.message || e?.message}`);
        }
    }, [reviews, repliesMap, editingReview, reviewPagination, fetchReviews, fetchShopDetails]);

    const handleEditReview = useCallback((reviewToEdit) => {
        if (!reviewToEdit || !user) { console.error('[handleEditReview] Invalid data or user not logged in.'); return; }
        setReplyingToReviewId(null); // 確保不在回覆模式
        setEditingReview(reviewToEdit); // 設置編輯狀態
        // 延遲滾動以確保表單已渲染
        setTimeout(() => { scrollToElement(reviewFormRef); }, 100);
    }, [user, scrollToElement, reviewFormRef]);

    const handleReplyToReview = useCallback((parentReviewId) => {
        if (!user) { alert("請先登入才能回覆"); navigate('/login', { state: { from: location } }); return; }
        setEditingReview(null); // 確保不在編輯模式
        setReplyingToReviewId(parentReviewId); // 設置回覆模式
        setTimeout(() => scrollToElement(reviewFormRef), 100);
    }, [user, navigate, location, scrollToElement, reviewFormRef]);

    const handleReviewPageChange = (pageNumber) => {
        const safePageNumber = Math.max(0, pageNumber);
        if (safePageNumber !== reviewPagination.currentPage) {
            fetchReviews(safePageNumber);
            scrollToElement(reviewSectionRef);
        }
    };

    const handleSortChange = (event) => {
        const selectedValue = event.target.value;
        let newSortBy = 'createdAt';
        let newSortDir = 'DESC';
        if (selectedValue === 'rating_desc') { newSortBy = 'rating'; newSortDir = 'DESC'; }
        else if (selectedValue === 'rating_asc') { newSortBy = 'rating'; newSortDir = 'ASC'; }

        if (newSortBy !== reviewSortBy || newSortDir !== reviewSortDir) {
            setReviewSortBy(newSortBy);
            setReviewSortDir(newSortDir);
            // 排序改變後，通常需要跳回第一頁
            fetchReviews(0);
        }
    };

    // --- 地圖相關回調 ---
    const onMapLoad = useCallback((map) => { mapRef.current = map; }, []);
    const onMapUnmount = useCallback(() => { mapRef.current = null; }, []);
    const handleMarkerClick = () => { /* 可選實現 */ };
    // InfoWindow 會自動處理關閉事件，不需要 handleInfoWindowClose

    // --- useEffect for initial data loading ---
    useEffect(() => {
        // 重置所有狀態
        setShop(null); setReviews([]); setErrorShop(''); setErrorReviews(''); setIsLoadingShop(true); setIsLoadingReviews(true);
        setEditingReview(null); setReplyingToReviewId(null); setReviewPagination(prev => ({ ...prev, currentPage: 0, totalPages: 0, totalElements: 0 }));
        setReviewSortBy('createdAt'); setReviewSortDir('DESC'); setRepliesMap({}); setLoadingRepliesMap({}); setExpandedRepliesMap({});
        // ✨ 重置活動狀態 ✨
        setEvents([]); setErrorEvents(''); setIsLoadingEvents(true);

        if (isValidShopId) {
            // console.log(`[ShopDetailPage - useEffect] shopId changed to: ${numericShopId}, fetching data...`);
            // 並行獲取店家詳情、評論和活動
            Promise.allSettled([
                fetchShopDetails(),
                fetchReviews(0),
                fetchShopEvents() // ✨ 調用獲取活動的函數 ✨
            ]).then(results => {
                 results.forEach((result, index) => {
                      if (result.status === 'rejected') {
                          console.error(`Initial fetch failed for ${['shop', 'reviews', 'events'][index]}:`, result.reason);
                          // 可以根據需要設置對應的錯誤狀態
                          if (index === 0) setErrorShop("無法載入店家資訊");
                          if (index === 1) setErrorReviews("無法載入評論");
                          if (index === 2) setErrorEvents("無法載入活動");
                      }
                 });
                 // 即使部分失敗，也要結束初始加載狀態 (Service 層內部已處理 setIs...ing(false))
                 // 但為了確保 UI 顯示，這裡可以再設置一次
                 setIsLoadingShop(false);
                 setIsLoadingReviews(false);
                 setIsLoadingEvents(false);
            });
        } else {
            setErrorShop("無效的店家 ID。");
            setIsLoadingShop(false);
            setIsLoadingReviews(false);
            setIsLoadingEvents(false);
        }
    }, [numericShopId, isValidShopId, fetchShopDetails, fetchReviews, fetchShopEvents]); // ✨ 加入 fetchShopEvents 依賴 ✨

    // --- 主渲染邏輯 ---
    if (isAuthLoading) { // 等待認證狀態加載完成
        return <div className="loading page-loading">檢查登入狀態...</div>;
    }
    if (mapLoadError) { // 地圖 API 加載失敗
        return ( <div className="shop-detail-page page-container"><NotFoundPage message={`地圖資源載入失敗: ${mapLoadError.message}`} /></div> );
    }
    if (!mapLoaded && !mapLoadError) { // 地圖 API 正在加載
        return ( <div className="shop-detail-page page-container"><div className="loading page-loading">地圖資源初始化中...</div></div> );
    }
    // 等待店家核心資訊加載
    if (isLoadingShop && !shop) { // 修改條件：初始加載且 shop 為 null
        return <div className="loading page-loading">載入店家資料...</div>;
    }
    // 店家確定不存在或加載失敗
    if (errorShop && !shop) {
        return <NotFoundPage message={errorShop} />;
    }
    // 雖然加載完成且無錯誤，但 shop 仍然是 null (理論上不太可能發生，除非API返回成功但data為空)
    if (!shop) {
        return <NotFoundPage message="無法加載店家資料。" />;
    }

    // --- 準備渲染所需數據 ---
    const shopLocation = shop.latitude && shop.longitude ? { lat: parseFloat(shop.latitude), lng: parseFloat(shop.longitude) } : null;
    const shopAvgRating = parseFloat(shop.averageRating) || 0;
    const shopMediaList = Array.isArray(shop.media) ? shop.media : [];
    const shopOwnerIdForCheck = shop.owner?.id;
    // 確保媒體數量大於 1 才啟用無限循環和箭頭
    const currentSliderSettings = { ...sliderSettings, infinite: shopMediaList.length > 1, arrows: shopMediaList.length > 1 };

    return (
        <div className="shop-detail-page page-container">
            {/* 頁面標頭 */}
            <div className="page-header shop-detail-header">
                <h1>{shop.name}</h1>
                {isOwner && (
                    <button
                        onClick={() => navigate(`/shops/${numericShopId}/edit`)}
                        className="edit-shop-button main-action-button"
                    >
                        編輯店家資訊
                    </button>
                )}
            </div>

            {/* 主要內容網格 */}
            <div className="shop-content-grid">
                <div className="shop-info">
                    {/* 媒體輪播 */}
                    {shopMediaList.length > 0 ? (
                        <div className="shop-media-carousel-container">
                            <Slider {...currentSliderSettings}>
                                {shopMediaList.map(renderMediaItem)}
                            </Slider>
                        </div>
                    ) : (
                        <div className="shop-media-carousel-container placeholder">
                            <span className="placeholder-text">店家尚未上傳圖片或影片</span>
                        </div>
                    )}

                    {/* 其他信息 */}
                    <p><strong>地址:</strong> {shop.address || '未提供'}</p>
                    {shop.phone && <p><strong>電話:</strong> <a href={`tel:${shop.phone}`}>{shop.phone}</a></p>}
                    {shop.openingHours && (
                        <div className="shop-info-block">
                            <strong>營業時間:</strong>
                            <pre>{shop.openingHours}</pre>
                        </div>
                    )}
                    {shop.description && (
                        <div className="shop-info-block">
                            <strong>特色描述:</strong>
                            <pre>{shop.description}</pre>
                        </div>
                    )}
                    {/* 評分 */}
                    <div className="shop-rating-summary">
                         <strong>平均評分: </strong>
                         {shopAvgRating > 0 ? (
                             <>
                                 {renderStars(shopAvgRating)}
                                 <span className="rating-value"> {shopAvgRating.toFixed(1)} / 5</span>
                                 <span className="rating-count"> ({shop.reviewCount || 0} 則評論)</span>
                             </>
                         ) : (
                             <span> 尚無評分</span>
                         )}
                    </div>
                    <p><small>最後更新於: {formatDateTime(shop.updatedAt)}</small></p>
                </div>
                {/* 地圖 */}
                <div className="shop-map">
                    {shopLocation && mapLoaded ? (
                        <GoogleMap
                            mapContainerStyle={mapContainerStyle}
                            center={shopLocation}
                            zoom={16}
                            options={defaultMapOptions}
                            onLoad={onMapLoad}
                            onUnmount={onMapUnmount}
                        >
                            <Marker position={shopLocation} title={shop.name} onClick={handleMarkerClick} />
                        </GoogleMap>
                    ) : (
                        <div className="map-placeholder">
                            {mapLoaded ? '店家未提供座標。' : '地圖載入中...'}
                        </div>
                    )}
                </div>
            </div>

             {/* --- ✨ 店家活動區塊 ✨ --- */}
             <div className="shop-events-section section-container">
                 <h2>店家活動</h2>
                 {isLoadingEvents && <div className="loading">載入活動中...</div>}
                 {errorEvents && !isLoadingEvents && <div className="error">無法載入活動: {errorEvents}</div>}
                 {!isLoadingEvents && !errorEvents && events.length === 0 && (<div className="no-results">此店家目前沒有公開的活動。</div>)}
                 {!isLoadingEvents && !errorEvents && events.length > 0 && (
                     <div className="event-list-grid shop-list-grid"> {/* 復用網格布局 */}
                         {events.map((event) => (
                             event && event.id ? (
                                 <EventCard
                                     key={event.id}
                                     event={event}
                                     showManagementButtons={false} // 在店家詳情頁不顯示管理按鈕
                                     showStatus={true} // 顯示活動狀態 (Active/Upcoming)
                                 />
                             ) : null
                         ))}
                     </div>
                 )}
                 {/* 可選：查看所有活動連結 */}
                 {/* {!isLoadingEvents && !errorEvents && events.length > 0 && ( // 可以添加條件，例如活動數量超過 3 個才顯示
                      <div style={{ textAlign: 'right', marginTop: '1rem' }}>
                          <Link to={`/shops/${shopId}/events`}>查看店家所有活動 →</Link> // 需要新路由/頁面
                      </div>
                  )} */}
             </div>
             {/* --- ✨ 活動區塊結束 ✨ --- */}


            {/* --- 評論區 --- */}
            <div className="review-section section-container" ref={reviewSectionRef}>
                <h2>評論 ({reviewPagination.totalElements})</h2>
                {/* 評論表單區域 */}
                <div ref={reviewFormRef}>
                    {/* 編輯模式 */}
                    {editingReview && (
                        <AddReviewForm
                            shopId={numericShopId}
                            reviewToEdit={editingReview}
                            onReviewUpdated={handleReviewUpdated}
                            onCancelEdit={handleCancelEdit}
                            isReplyMode={!!editingReview.parentReviewId}
                        />
                    )}
                    {/* 回覆模式 */}
                    {replyingToReviewId && !editingReview && (
                        <AddReviewForm
                            shopId={numericShopId}
                            isReplyMode={true}
                            parentReviewId={replyingToReviewId}
                            onReviewAdded={handleReviewAdded}
                            onCancelEdit={handleCancelEdit}
                        />
                    )}
                    {/* 新增評論模式 (非店家) */}
                    {isAuthenticated && !isOwner && !editingReview && !replyingToReviewId && (
                        <AddReviewForm
                            shopId={numericShopId}
                            onReviewAdded={handleReviewAdded}
                            onCancelEdit={null} // 新增時不需要取消編輯
                        />
                    )}
                    {/* 未登入提示 */}
                    {!isAuthenticated && !isAuthLoading && (
                        <p className="login-prompt">
                            請先 <Link to="/login" state={{ from: location }}>登入</Link> 以發表評論或回覆。
                        </p>
                    )}
                    {/* 店家提示 */}
                    {isAuthenticated && isOwner && !editingReview && !replyingToReviewId && (
                        <p className="info-prompt">
                            店家您好，您可以點擊評論旁的「回覆」按鈕來回應顧客。
                        </p>
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

                {/* 評論列表渲染 */}
                <div className="review-list-container">
                    {isLoadingReviews && <div className="loading">載入評論中...</div>}
                    {errorReviews && !isLoadingReviews && <div className="error">錯誤: {errorReviews}</div>}
                    {!isLoadingReviews && !errorReviews && reviews.length === 0 && (<div className="no-results">目前還沒有評論。</div>)}
                    {!isLoadingReviews && !errorReviews && reviews.length > 0 && (
                        <div className="review-list">
                            {reviews.map((review) => {
                                if (!review || !review.user) return null; // 基本保護
                                const reviewIdStr = String(review.id);
                                const isEditingThisTopLevel = editingReview?.id === review.id && !editingReview?.parentReviewId;
                                const currentReplies = repliesMap[reviewIdStr] || [];
                                const isLoadingCurrentReplies = loadingRepliesMap[reviewIdStr] || false;
                                const areRepliesExpanded = expandedRepliesMap[reviewIdStr] || false;
                                const canUserEditThis = !!user && String(review.user.id) === String(user.id);

                                // 如果正在編輯頂級評論，則不渲染其卡片，而是在表單區顯示表單
                                if (isEditingThisTopLevel) return null;

                                return (
                                    <div key={review.id} className="review-item-container">
                                        <ReviewCard
                                            review={review}
                                            isReply={false}
                                            shopOwnerId={shopOwnerIdForCheck}
                                            currentUserId={user?.id}
                                            isShopOwnerViewing={isOwner}
                                            onDelete={canUserEditThis ? handleDeleteReview : null}
                                            onEdit={canUserEditThis ? handleEditReview : null}
                                            onReply={isOwner ? handleReplyToReview : null} // 店家才能回覆頂級評論
                                            onLoadReplies={loadReplies}
                                            isExpanded={areRepliesExpanded}
                                            replyCount={review.replyCount ?? 0}
                                            isLoadingReplies={isLoadingCurrentReplies}
                                        />
                                        {/* 回覆列表 */}
                                        {areRepliesExpanded && (
                                            <div className="replies-list-container">
                                                 {isLoadingCurrentReplies ? (
                                                     <div className="loading">載入回覆中...</div>
                                                 ) : (
                                                     currentReplies.length > 0 ? (
                                                         currentReplies.map(reply => {
                                                             if (!reply || !reply.user) return null;
                                                             const isEditingThisReply = editingReview?.id === reply.id;
                                                             const canUserEditReply = !!user && String(reply.user.id) === String(user.id);
                                                             // 如果正在編輯此回覆，不渲染卡片
                                                             if (isEditingThisReply) return null;
                                                             return (
                                                                 <ReviewCard
                                                                     key={reply.id}
                                                                     review={reply}
                                                                     isReply={true}
                                                                     shopOwnerId={shopOwnerIdForCheck}
                                                                     currentUserId={user?.id}
                                                                     isShopOwnerViewing={isOwner}
                                                                     onDelete={canUserEditReply ? handleDeleteReview : null} // 只有作者能刪除
                                                                     onEdit={canUserEditReply ? handleEditReview : null} // 只有作者能編輯
                                                                     onReply={null} // 回覆不能再被回覆
                                                                     onLoadReplies={null} // 回覆不顯示加載按鈕
                                                                 />
                                                             );
                                                         })
                                                     ) : (
                                                         <p className="no-replies">目前沒有回覆。</p>
                                                     )
                                                 )}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
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
            {/* --- 評論區結束 --- */}
        </div>
    );
};

// --- PropTypes ---
ShopDetailPage.propTypes = {
  mapLoaded: PropTypes.bool,
  mapLoadError: PropTypes.object,
};

export default ShopDetailPage;