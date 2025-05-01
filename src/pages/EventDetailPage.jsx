// src/pages/EventDetailPage.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import Slider from "react-slick";
import { format, parseISO } from 'date-fns'; // <-- 引入 parseISO
import { zhTW } from 'date-fns/locale';

// --- 導入服務和組件 ---
import { getEventById } from '../services/api';
import useAuth from '../hooks/useAuth';
import NotFoundPage from './NotFoundPage';
// --- ✨ 新增：導入 Role 常量 ✨ ---
import { Role } from '../constants/roles';
// --- ✨ ---

// --- 導入樣式 ---
import "slick-carousel/slick/slick.css";
import "slick-carousel/slick/slick-theme.css";
import './EventDetailPage.css';
import './ShopDetailPage.css'; // 復用樣式
import '../components/EventCard.css'; // 復用樣式

// --- 輔助函數 (與 EventCard 一致) ---
const buildMediaUrl = (relativePath) => {
    const defaultEventCover = '/placeholder-event-cover.png';
    if (!relativePath) return defaultEventCover;
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

const formatEventDateTime = (dateTimeString) => {
    if (!dateTimeString) return null;
    try {
        // 使用 parseISO 解析
        const dateObject = parseISO(dateTimeString);
        return format(dateObject, 'yyyy/MM/dd HH:mm', { locale: zhTW });
    } catch (e) {
        console.error("Error formatting date:", dateTimeString, e);
        return '無效日期';
    }
};

const formatEventDateRange = (start, end) => {
    const formattedStart = formatEventDateTime(start);
    if (!formattedStart) return '日期未定';
    const formattedEnd = formatEventDateTime(end);
    if (formattedEnd) {
        try {
            const startDate = parseISO(start); // 使用 parseISO
            const endDate = parseISO(end);
            if (startDate.getFullYear() === endDate.getFullYear() &&
                startDate.getMonth() === endDate.getMonth() &&
                startDate.getDate() === endDate.getDate()) {
                return `${format(startDate, 'yyyy/MM/dd HH:mm', { locale: zhTW })} - ${format(endDate, 'HH:mm', { locale: zhTW })}`;
            }
        } catch (e) { console.error("Error comparing dates:", start, end, e); }
        return `${formattedStart} - ${formattedEnd}`;
    }
    return `${formattedStart} 開始`;
};

const getEventTypeLabel = (type) => { /* ... (同前) ... */
    switch(type?.toUpperCase()) {
        case 'PROMOTION': return '促銷優惠'; case 'CLOSURE': return '公休/休業';
        case 'SPECIAL_MENU': return '特別菜單'; case 'ANNOUNCEMENT': return '公告';
        case 'OTHER': return '其他'; default: return type || '活動';
    }
};
const getStatusChipStyle = (status) => { /* ... (同前) ... */
    switch (status?.toUpperCase()) {
        case 'ACTIVE': return { backgroundColor: '#e8f5e9', color: '#2e7d32', borderColor: '#c8e6c9' };
        case 'UPCOMING': return { backgroundColor: '#e3f2fd', color: '#1565c0', borderColor: '#bbdefb' };
        case 'PENDING_APPROVAL': return { backgroundColor: '#fff9c4', color: '#f57f17', borderColor: '#fff59d' };
        case 'EXPIRED': return { backgroundColor: '#f5f5f5', color: '#757575', borderColor: '#e0e0e0' };
        case 'REJECTED': return { backgroundColor: '#ffebee', color: '#c62828', borderColor: '#ffcdd2' };
        case 'CANCELLED': return { backgroundColor: '#eceff1', color: '#546e7a', borderColor: '#cfd8dc' };
        case 'DRAFT': return { backgroundColor: '#f3e5f5', color: '#6a1b9a', borderColor: '#e1bee7' };
        default: return { backgroundColor: '#eee', color: '#555', borderColor: '#ddd' };
    }
};
const getStatusLabel = (status) => { /* ... (同前) ... */
     switch (status?.toUpperCase()) {
        case 'ACTIVE': return '進行中'; case 'UPCOMING': return '即將開始';
        case 'PENDING_APPROVAL': return '待審核'; case 'EXPIRED': return '已結束';
        case 'REJECTED': return '已拒絕'; case 'CANCELLED': return '已取消/下架';
        case 'DRAFT': return '草稿'; default: return status || '未知';
    }
};
// --- ---

const sliderSettings = {
    dots: true, infinite: false, speed: 500,
    slidesToShow: 1, slidesToScroll: 1, adaptiveHeight: true,
    prevArrow: <button className="slick-prev">Previous</button>,
    nextArrow: <button className="slick-next">Next</button>
};

const EventDetailPage = () => {
    const { eventId } = useParams();
    const navigate = useNavigate();
    const { user, isLoading: isAuthLoading } = useAuth(); // 只需 user 和 loading 狀態

    const [event, setEvent] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    const numericEventId = parseInt(eventId, 10);
    const isValidEventId = !isNaN(numericEventId);

    // --- 獲取活動詳情 ---
    const fetchEventDetails = useCallback(async () => {
        // ... (函數內容保持不變) ...
        if (!isValidEventId) { setError("無效的活動 ID"); setIsLoading(false); return; }
        setIsLoading(true); setError(null);
        console.log(`[EventDetailPage] Fetching event details for ID: ${numericEventId}`);
        try {
            const apiResponse = await getEventById(numericEventId);
            if (apiResponse?.success && apiResponse.data) { setEvent(apiResponse.data); console.log("[EventDetailPage] Event data fetched:", apiResponse.data); }
            else { throw new Error(apiResponse?.message || "無法獲取活動詳情"); }
        } catch (err) {
             const errMsg = err?.data?.message || err?.message || '載入活動詳情時發生錯誤';
             console.error("[EventDetailPage] Error fetching event:", errMsg, err);
             if (err?.status === 404) { setError(`找不到 ID 為 ${numericEventId} 的活動，或您沒有權限查看。`); }
             else { setError(errMsg); }
             setEvent(null);
        } finally { setIsLoading(false); }
    }, [numericEventId, isValidEventId]);

    // --- 效果：組件掛載或 eventId 改變時獲取數據 ---
    useEffect(() => {
        fetchEventDetails();
    }, [fetchEventDetails]);

    // --- 判斷用戶權限 ---
    // ✨ 使用導入的 Role ✨
    const isAdmin = user?.roles?.includes(Role.ROLE_ADMIN);
    const isShopOwner = user?.roles?.includes(Role.ROLE_SHOP_OWNER);
    const isOwnerOfThisEvent = isShopOwner && event?.shopId && user?.ownedShopIds?.includes(event.shopId);
    const canManage = isAdmin || isOwnerOfThisEvent; // 是否有管理此活動的權限
    // ✨ --- ✨

    // --- 渲染邏輯 ---
    if (isLoading || isAuthLoading) {
        return <div className="loading" style={{ padding: '2rem', textAlign: 'center' }}>載入活動詳情中...</div>;
    }
    if (error) { return <NotFoundPage message={error} />; }
    if (!event) { return <NotFoundPage message="找不到活動資訊。" />; }

    // --- 渲染活動詳情 ---
    const dateRange = formatEventDateRange(event.startDate, event.endDate);
    const eventTypeLabel = getEventTypeLabel(event.eventType);
    const statusLabel = getStatusLabel(event.status);
    const statusChipStyle = getStatusChipStyle(event.status);
    const eventMedia = Array.isArray(event.media) ? event.media : []; // 確保是數組

    // 調整輪播圖設置，只有在媒體數量 > 1 時才無限循環和顯示箭頭
    const currentSliderSettings = {
        ...sliderSettings,
        infinite: eventMedia.length > 1,
        arrows: eventMedia.length > 1
    };


    return (
        <div className="event-detail-page shop-detail-page">
            <div className="shop-header event-header">
                <h1>{event.title}</h1>
                {/* 管理按鈕：可以連結到 ManageEventsPage 並預設編輯此活動 */}
                {canManage && (
                     <Link to={`/manage-events?edit=${event.id}`} className="edit-shop-button"> {/* 調整連結 */}
                         管理此活動
                     </Link>
                 )}
                <Link to="/events" className="back-link">← 返回活動列表</Link>
            </div>

            <div className="event-meta-info">
                 <span className="event-type-badge" data-type={event.eventType?.toUpperCase()}>{eventTypeLabel}</span>
                 <span className="status-chip" style={statusChipStyle}>{statusLabel}</span>
                 <span className="event-date-info">📅 {dateRange}</span>
                 {event.shopName && (
                     <span className="event-shop-info">
                         📍 <Link to={`/shops/${event.shopId}`}>{event.shopName}</Link>
                     </span>
                 )}
            </div>

             {/* 媒體輪播圖 */}
             {eventMedia.length > 0 ? (
                <div className="shop-media-carousel-container event-media-slider"> {/* 沿用樣式名 */}
                    <Slider {...currentSliderSettings}>
                        {eventMedia.map((mediaItem, index) => {
                            if (!mediaItem || !mediaItem.url) return null; // 過濾無效數據
                            const url = buildMediaUrl(mediaItem.url);
                            const type = mediaItem.type?.toUpperCase();
                            return (
                                <div key={mediaItem.id || `media-${index}`} className="slide-item">
                                    {type === 'IMAGE' ? (
                                        <img src={url} alt={`活動媒體 ${index + 1}`} loading="lazy" onError={(e) => { e.target.onerror = null; e.target.src = '/placeholder-event-cover.png'; }}/>
                                    ) : type === 'VIDEO' ? (
                                        <video src={url} controls preload="metadata" playsInline style={{ maxWidth: '100%', display: 'block' }} />
                                    ) : (
                                        <p>不支持的媒體類型</p> // 顯示錯誤提示
                                    )}
                                </div>
                            );
                        })}
                    </Slider>
                </div>
             ) : (
                 <div className="no-media-placeholder">此活動沒有提供圖片或影片。</div>
             )}


            <div className="event-content-section shop-description">
                <h2>活動詳情</h2>
                <pre className="event-content-text">{event.content || '無詳細內容。'}</pre>
            </div>

            {canManage && event.adminNotes && (
                 <div className="admin-notes-section">
                     <h3>管理員備註</h3>
                     <pre className="admin-notes-text">{event.adminNotes}</pre>
                 </div>
            )}
        </div>
    );
};

export default EventDetailPage;