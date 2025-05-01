// src/components/EventCard.jsx
import React from 'react';
import PropTypes from 'prop-types';
import { Link } from 'react-router-dom';
// --- ✨ 引入 parseISO ✨ ---
import { format, parseISO } from 'date-fns';
import { zhTW } from 'date-fns/locale';

// 引入樣式
import './EventCard.css';
import './ShopCard.css';  // 復用 ShopCard 的部分基礎樣式

// --- 輔助函數 ---
const buildMediaUrl = (relativePath) => {
    // 提供一個活動專用的預設圖路徑 (用於 onError)
    const defaultEventCover = '/placeholder-event-cover.png';
    if (!relativePath) return defaultEventCover; // 如果傳入空路徑，返回預設圖 (主要給 onError 用)
    // 前端不再檢查 http，假設後端傳來的 media.url 都是相對路徑
    const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';
    const uploadPath = '/uploads';
    const cleanRelativePath = relativePath.startsWith('/') ? relativePath.substring(1) : relativePath;
    const normalizedRelativePath = cleanRelativePath.replace(/\\/g, '/');
    const cleanBaseUrl = baseUrl.endsWith('/') ? baseUrl.substring(0, baseUrl.length - 1) : baseUrl;
    const cleanUploadUrlPath = uploadPath.startsWith('/') ? uploadPath : '/' + uploadPath;
    const finalUploadPath = cleanUploadUrlPath.endsWith('/') ? cleanUploadUrlPath : cleanUploadUrlPath + '/';
    return `${cleanBaseUrl}${finalUploadPath}${normalizedRelativePath}`;
};

// --- ✨ 修改：日期時間格式化，使用 parseISO ✨ ---
const formatEventDateTime = (dateTimeString) => {
    if (!dateTimeString) return null;
    try {
        // 使用 parseISO 解析標準 ISO 字符串
        const dateObject = parseISO(dateTimeString);
        return format(dateObject, 'yyyy/MM/dd HH:mm', { locale: zhTW });
    } catch (e) {
        console.error("Error formatting date:", dateTimeString, e);
        return '無效日期';
    }
};
// --- ✨ ---

const formatEventDateRange = (start, end) => {
    const formattedStart = formatEventDateTime(start);
    if (!formattedStart) return '日期未定';
    const formattedEnd = formatEventDateTime(end);
    if (formattedEnd) {
        try {
            const startDate = parseISO(start); // Use parseISO here too
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

// --- ✨ 修改：找不到圖片時返回 null ✨ ---
const getEventCoverImageUrl = (mediaArray) => {
    if (!Array.isArray(mediaArray) || mediaArray.length === 0) {
        return null; // <-- 返回 null
    }
    // 確保檢查 media item 和 type/url 是否存在
    const firstImage = mediaArray.find(m => m && typeof m.type === 'string' && m.type.toUpperCase() === 'IMAGE' && m.url);
    if (firstImage) {
        // 調用 buildMediaUrl (它現在假設輸入是相對路徑)
        return buildMediaUrl(firstImage.url);
    }
    return null; // <-- 返回 null
};
// --- ✨ ---

const getEventTypeLabel = (type) => { /* ... (不變) ... */
     switch(type?.toUpperCase()) {
        case 'PROMOTION': return '促銷'; case 'CLOSURE': return '公休';
        case 'SPECIAL_MENU': return '限定菜單'; case 'ANNOUNCEMENT': return '公告';
        case 'OTHER': return '其他'; default: return type || '活動';
    }
};
const getStatusChipStyle = (status) => { /* ... (不變) ... */
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
const getStatusLabel = (status) => { /* ... (不變) ... */
     switch (status?.toUpperCase()) {
        case 'ACTIVE': return '進行中'; case 'UPCOMING': return '即將開始';
        case 'PENDING_APPROVAL': return '待審核'; case 'EXPIRED': return '已結束';
        case 'REJECTED': return '已拒絕'; case 'CANCELLED': return '已取消/下架';
        case 'DRAFT': return '草稿'; default: return status || '未知';
    }
};

// --- 主組件 ---
const EventCard = ({
    event,
    onDelete,
    onEdit,
    showManagementButtons = false,
    showStatus = false
}) => {

    if (!event || !event.id) {
        console.warn("EventCard: 無效的 event prop.");
        return null;
    }

    // --- ✨ 調用修改後的函數 ✨ ---
    const coverImageUrl = getEventCoverImageUrl(event.media);
    const dateRange = formatEventDateRange(event.startDate, event.endDate);
    const eventTypeLabel = getEventTypeLabel(event.eventType);
    const statusChipStyle = getStatusChipStyle(event.status);
    const statusLabel = getStatusLabel(event.status);

    const handleEditClick = (e) => {
        e.preventDefault(); e.stopPropagation(); if (onEdit) onEdit(event);
    };
    const handleDeleteClick = (e) => {
        e.preventDefault(); e.stopPropagation();
        // 確認視窗移到 ManageEventsPage 執行
        if (onDelete) onDelete(event.id);
    };

    return (
        <div className="event-card shop-card" data-status={event.status?.toUpperCase()}>
            <div className="shop-card-image-container event-card-image-container">
                 {/* 狀態標籤 */}
                 {showStatus && event.status && (
                     <span className="status-chip" style={statusChipStyle}>{statusLabel}</span>
                 )}

                 {/* --- ✨ 修改：條件渲染圖片或提示信息 ✨ --- */}
                 {coverImageUrl ? (
                     // 如果有圖片 URL，渲染圖片連結
                     <Link to={`/events/${event.id}`} className="event-card-image-link">
                        <img
                            src={coverImageUrl}
                            alt={`${event.title || '活動'} 封面`}
                            className="shop-card-image event-card-image"
                            loading="lazy"
                            onError={(e) => {
                                console.error(`EventCard: Error loading image ${coverImageUrl}`);
                                e.target.onerror = null; // 防止無限循環
                                e.target.src = '/placeholder-event-cover.png'; // 圖片本身加載失敗時才顯示預設圖
                            }}
                        />
                    </Link>
                 ) : (
                     // 如果沒有圖片 URL，顯示提示信息
                     // 添加一個 div 容器，用於樣式控制
                     <div className="no-image-container">
                         <span className="no-image-text">未提供照片</span>
                     </div>
                 )}
                 {/* --- ✨ --- */}
            </div>

            {/* 卡片資訊區塊 (保持不變) */}
            <div className="shop-card-info event-card-info">
                 <span className="event-type-badge" data-type={event.eventType?.toUpperCase()}>{eventTypeLabel}</span>
                <h3 className="shop-card-title event-card-title" title={event.title}>
                    <Link to={`/events/${event.id}`}>{event.title || '無標題活動'}</Link>
                </h3>
                {event.shopName && (
                    <p className="event-card-shop-name">
                        店家: <Link to={`/shops/${event.shopId}`}>{event.shopName}</Link>
                    </p>
                )}
                <p className="event-card-date">{dateRange}</p>
            </div>

            {/* 操作按鈕區塊 (保持不變) */}
            {showManagementButtons && (onEdit || onDelete) && (
                 <div className="event-card-actions shop-card-actions">
                     {typeof onEdit === 'function' && <button onClick={handleEditClick} className="action-button edit-button">編輯</button>}
                     {typeof onDelete === 'function' && <button onClick={handleDeleteClick} className="action-button delete-button">刪除</button>}
                 </div>
            )}
        </div>
    );
};

// --- PropTypes (保持不變) ---
EventCard.propTypes = {
    event: PropTypes.shape({
        id: PropTypes.number.isRequired, title: PropTypes.string, content: PropTypes.string,
        startDate: PropTypes.string, endDate: PropTypes.string, eventType: PropTypes.string,
        status: PropTypes.string, media: PropTypes.arrayOf(PropTypes.shape({
            id: PropTypes.number, url: PropTypes.string, type: PropTypes.string
        })), shopId: PropTypes.number, shopName: PropTypes.string
    }).isRequired,
    onDelete: PropTypes.func, onEdit: PropTypes.func,
    showManagementButtons: PropTypes.bool, showStatus: PropTypes.bool
};

export default EventCard;