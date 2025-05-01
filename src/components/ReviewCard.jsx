// src/components/ReviewCard.jsx
import React from 'react';
import { format } from 'date-fns';
import { zhTW } from 'date-fns/locale';

// --- MUI Imports ---
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Rating from '@mui/material/Rating';
// --- ---

// 輔助函數：構建媒體 URL
const buildMediaUrl = (relativePath) => {
    if (!relativePath) return '/placeholder-image.png';
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

// 格式化日期時間函數
const formatDateTime = (dateTimeString) => {
    if (!dateTimeString) return '未知';
    try {
        const date = new Date(dateTimeString);
        if (isNaN(date.getTime())) { console.warn("無效的日期格式:", dateTimeString); return dateTimeString; }
        // 使用 date-fns 格式化日期時間，包含繁體中文地區設定
        return format(date, 'yyyy年MM月dd日 HH:mm', { locale: zhTW });
    } catch (e) { console.error("日期格式化時發生錯誤:", dateTimeString, e); return dateTimeString; }
};


const ReviewCard = ({
    review,              // 傳入的評論或回覆對象
    isReply,             // 標記是否為回覆卡片
    shopOwnerId,         // 店家擁有者的 ID，用於標記店家回覆
    currentUserId,       // 當前登入用戶的 ID，用於判斷編輯/刪除權限
    isShopOwnerViewing,  // 標記當前是否為店家主人在查看 (影響是否顯示回覆按鈕)
    onDelete,            // 刪除按鈕的回調函數 (傳入 review.id)
    onEdit,              // 編輯按鈕的回調函數 (傳入完整的 review 對象)
    onReply,             // 回覆按鈕的回調函數 (傳入 parentReviewId, 即 review.id)
    onLoadReplies,       // 加載更多回覆的回調函數 (傳入 parentReviewId)
    isExpanded,          // 標記回覆列表是否已展開
    replyCount = 0,      // 回覆數量
    isLoadingReplies = false // 標記是否正在加載回覆
}) => {

    // --- 基本檢查 ---
    if (!review || !review.user) {
        console.warn("[ReviewCard] Rendering skipped: Invalid 'review' or 'review.user' prop.");
        return null; // 如果 review 或 user 無效，不渲染任何東西
    }

    // --- 權限檢查 (使用 String 比較確保類型一致) ---
    // 確保 currentUserId 存在且轉為字串後與 review.user.id (也轉為字串) 相同
    const isCurrentUserAuthor = !!currentUserId && String(review.user.id) === String(currentUserId);
    // 只有作者能編輯/刪除
    const canEditDelete = isCurrentUserAuthor;
    // 回覆按鈕顯示條件：是店家主人在查看 & 這張卡片不是回覆本身 & 提供了 onReply 函數
    const canReply = isShopOwnerViewing && !isReply && typeof onReply === 'function';

    // --- 顯示邏輯 ---
    // 判斷是否為店家發出的評論/回覆
    const isShopOwnerComment = !!shopOwnerId && String(review.user.id) === String(shopOwnerId);
    // 取得用戶名，若無則顯示匿名
    const userName = review.user.username || '匿名用戶';
    // 取得創建和更新時間
    const createdAt = review.createdAt ? new Date(review.createdAt) : null;
    const updatedAt = review.updatedAt ? new Date(review.updatedAt) : null;
    // 判斷是否編輯過 (更新時間比創建時間晚至少一分鐘)
    const wasEdited = createdAt && updatedAt && (updatedAt.getTime() - createdAt.getTime() > 1000 * 60);

    // --- 事件處理函數 (確保回調函數存在再調用) ---
    const handleEditClick = () => {
        if (typeof onEdit === 'function') onEdit(review);
        else console.error(`[ReviewCard] onEdit prop is not a function for review ID: ${review.id}`);
    };
    const handleDeleteClick = () => {
         if (typeof onDelete === 'function') onDelete(review.id);
         else console.error(`[ReviewCard] onDelete prop is not a function for review ID: ${review.id}`);
      };
    const handleReplyClick = () => {
         if (typeof onReply === 'function') onReply(review.id);
         else console.error(`[ReviewCard] onReply prop is not a function for review ID: ${review.id}`);
       };
    const handleLoadRepliesClick = () => {
        if (typeof onLoadReplies === 'function') onLoadReplies(review.id);
        else console.error(`[ReviewCard] onLoadReplies prop is not a function for review ID: ${review.id}`);
    };

    // --- JSX 渲染 ---
    return (
        // 外層 Box，設定邊距、邊框、圓角，回覆有不同背景色
        <Box className={`review-card ${isReply ? 'reply-card' : ''}`} sx={{ mb: 2, p: 1.5, border: '1px solid', borderColor: 'divider', borderRadius: 1, backgroundColor: isReply ? '#f9f9f9' : 'transparent' }}>
            {/* 評論頭部：用戶名和時間 */}
            <Box className="review-header" sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                {/* 用戶名，若是店家則加上標籤 */}
                <Typography variant="subtitle2" component="span" className="review-user">
                    {userName}
                    {isShopOwnerComment && <Typography component="span" variant="caption" color="primary" sx={{ ml: 0.5 }}>(店家)</Typography>}
                </Typography>
                {/* 時間戳，若編輯過則加上標籤 */}
                <Typography variant="caption" color="text.secondary" className="review-meta">
                    {formatDateTime(review.updatedAt || review.createdAt)}
                    {wasEdited && <Typography component="span" variant="caption" sx={{ ml: 0.5 }}>(已編輯)</Typography>}
                </Typography>
            </Box>

            {/* 評分 (只有非回覆卡片且有評分時顯示) */}
            {!isReply && review.rating !== null && review.rating !== undefined && (
                 <Rating
                     name={`rating-${review.id}`} // 提供唯一名稱以符合無障礙要求
                     value={review.rating || 0}   // 確保傳入數字值
                     readOnly                    // 設為只讀
                     precision={0.5}             // 允許半星
                     size="small"                // 較小的尺寸
                     sx={{ mb: 1 }}              // 底部間距
                 />
            )}

            {/* 評論內容 */}
            <Box className="review-body" sx={{ mb: 1 }}>
                {/* 使用 <pre> 標籤配合 CSS white-space: pre-wrap 來保留換行和空格 */}
                <Typography component="pre" variant="body2" className="review-comment" sx={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                    {review.content || ''} {/* 確保有內容或空字串 */}
                </Typography>
            </Box>

            {/* 評論圖片 (只有當 review.media 是陣列且長度大於 0 時渲染) */}
            {Array.isArray(review.media) && review.media.length > 0 && (
                // 圖片容器，使用 flex 佈局，允許換行，設定間隙和底部邊距
                <Box className="review-media-container" sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 1 }}>
                    {review.media.map((mediaItem, index) => (
                        // 每張圖片的容器 Box，設定固定大小、隱藏溢出、圓角
                        // **這裡移除了 backgroundColor**
                        <Box key={mediaItem.id || index} className="review-media-item" sx={{ width: '70px', height: '70px', overflow: 'hidden', borderRadius: '4px' }}>
                            {/* 使用連結包裹圖片，點擊可查看大圖 */}
                            <a href={buildMediaUrl(mediaItem.url)} target="_blank" rel="noopener noreferrer" title="點擊查看大圖">
                                <img
                                    src={buildMediaUrl(mediaItem.url)} // 圖片來源
                                    alt={`評論照片 ${index + 1}`}      // 無障礙文字
                                    loading="lazy"                     // 延遲加載
                                    onError={(e) => {                 // 圖片加載失敗處理
                                        console.error(`[ReviewCard] Error loading review image: ${mediaItem.url}`);
                                        e.target.onerror = null;       // 防止無限循環
                                        e.target.src = '/placeholder-image.png'; // 替換為佔位圖
                                    }}
                                    style={{                          // 內聯樣式
                                        width: '100%',                 // 寬度 100%
                                        height: '100%',                // 高度 100%
                                        objectFit: 'contain',          // **修改點：保持比例，完整放入**
                                        display: 'block'               // 避免圖片下方多餘空間
                                    }}
                                />
                            </a>
                        </Box>
                    ))}
                </Box>
            )}

            {/* 操作按鈕區域 */}
            <Box className="review-actions" sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 1, alignItems: 'center' }}>
                {/* 編輯按鈕 (只有作者可見且提供了 onEdit 函數) */}
                {canEditDelete && typeof onEdit === 'function' && (
                    <Button size="small" onClick={handleEditClick} variant="text">編輯</Button>
                )}
                {/* 刪除按鈕 (只有作者可見且提供了 onDelete 函數) */}
                {canEditDelete && typeof onDelete === 'function' && (
                    <Button size="small" onClick={handleDeleteClick} color="error" variant="text">刪除</Button>
                )}
                {/* 回覆按鈕 (符合 canReply 條件時顯示) */}
                {canReply && (
                     <Button size="small" onClick={handleReplyClick} variant="text">回覆</Button>
                )}
                {/* 查看/隱藏回覆按鈕 (非回覆卡片、有回覆且提供了 onLoadReplies 函數時顯示) */}
                {!isReply && replyCount > 0 && typeof onLoadReplies === 'function' && (
                    <Button size="small" onClick={handleLoadRepliesClick} disabled={isLoadingReplies} variant="text">
                        {isLoadingReplies ? '載入中...' : (isExpanded ? '隱藏回覆' : `查看 ${replyCount} 則回覆`)}
                    </Button>
                )}
                {/* 尚無回覆提示 (非回覆卡片、無回覆且是店家在查看時顯示) */}
                 {!isReply && replyCount === 0 && isShopOwnerViewing && (
                    <Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}>尚無回覆</Typography>
                 )}
            </Box>
        </Box>
    );
};

export default ReviewCard; // 導出組件