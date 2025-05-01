// src/components/ShopCard.jsx
import React from 'react';
import { Link } from 'react-router-dom';
import { renderStars } from '../utils/uiUtils'; // 確保從正確的路徑導入
import './ShopCard.css'; // 引入對應的 CSS
import PropTypes from 'prop-types'; // 引入 PropTypes

// --- 輔助函數：構建完整的媒體 URL ---
const buildImageUrl = (relativePath) => {
    if (!relativePath) {
        return '/placeholder-image.png'; // 通用佔位圖
    }
    if (relativePath.startsWith('http://') || relativePath.startsWith('https://')) {
        return relativePath; // 如果已經是完整 URL，直接返回
    }
    const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';
    const uploadPath = '/uploads'; // 假設後端配置的訪問路徑是 /uploads/
    // 確保路徑分隔符統一為 /
    const cleanRelativePath = relativePath.startsWith('/') ? relativePath.substring(1) : relativePath;
    const normalizedRelativePath = cleanRelativePath.replace(/\\/g, '/');
    // 拼接路徑
    const cleanBaseUrl = baseUrl.endsWith('/') ? baseUrl.substring(0, baseUrl.length - 1) : baseUrl;
    const cleanUploadUrlPath = uploadPath.startsWith('/') ? uploadPath : '/' + uploadPath;
    const finalUploadPath = cleanUploadUrlPath.endsWith('/') ? cleanUploadUrlPath : cleanUploadUrlPath + '/';
    return `${cleanBaseUrl}${finalUploadPath}${normalizedRelativePath}`;
};
// --- ---

// --- 決定封面圖片的邏輯函數 ---
const getShopCoverImageUrl = (mediaArray) => {
  const defaultShopCover = '/placeholder-shop-cover.png'; // 店家預設封面圖片路徑

  if (!Array.isArray(mediaArray) || mediaArray.length === 0) {
    return defaultShopCover;
  }

  // ===== 修改點 =====
  // 判斷媒體項目是否為圖片 (修改後的判斷)
  const isImage = (mediaItem) => {
    const itemType = mediaItem?.type;
    const itemUrl = mediaItem?.url;
    // 改為：檢查 type 是否為字串，且不區分大小寫地以 "image" 開頭，且 url 存在
    return typeof itemType === 'string' && itemType.toLowerCase().startsWith('image') && !!itemUrl;
  };
  // ===== 修改結束 =====

  // 找出第一個符合 isImage 條件的項目
  const firstImageItem = mediaArray.find(isImage);

  if (firstImageItem) {
    // 找到圖片，返回其完整 URL
    return buildImageUrl(firstImageItem.url);
  } else {
    // 未找到圖片，返回預設封面
    return defaultShopCover;
  }
};
// --- ---


const ShopCard = ({ shop }) => {
  // --- 提供預設值，防止 shop 或其屬性為 null/undefined ---
  const shopId = shop?.id;
  const shopName = shop?.name || '店家名稱 N/A';
  const shopAddress = shop?.address || '地址未提供';
  const averageRating = parseFloat(shop?.averageRating) || 0;
  const reviewCount = shop?.reviewCount || 0;

  // --- 使用封面圖片邏輯函數獲取 URL ---
  const coverImageUrl = getShopCoverImageUrl(shop?.media);

  // 如果 shopId 無效，返回錯誤提示卡片
  if (!shopId) {
      console.warn("ShopCard: 無效的 shop ID，無法生成連結。", shop);
      return (
          <div className="shop-card invalid-card">
              <p>店家資料錯誤</p>
          </div>
      );
  }

  return (
    <div className="shop-card">
      {/* 連結到店家詳情頁 */}
      <Link to={`/shops/${shopId}`} className="shop-card-link">
        <div className="shop-card-image-container">
          <img
            src={coverImageUrl} // 使用獲取到的封面 URL
            alt={`${shopName} 封面`}
            className="shop-card-image"
            loading="lazy"
            onError={(e) => {
                console.warn(`ShopCard: 圖片加載失敗 for shop ${shopId}: ${coverImageUrl}`);
                e.target.onerror = null; // 防止無限循環
                e.target.src = '/placeholder-image.png'; // 替換為通用佔位圖
            }}
          />
        </div>
        <h3 className="shop-card-title">{shopName}</h3>
      </Link>

      {/* 店家摘要信息 */}
      <div className="shop-card-info">
         <p className="shop-card-address">{shopAddress}</p>
         <div className="shop-card-rating">
           <span className="stars">{renderStars(averageRating)}</span>
           <span className="rating-text">
             {averageRating > 0 ? averageRating.toFixed(1) : 'N/A'}
           </span>
           <span className="review-count">({reviewCount} 則評論)</span>
         </div>
      </div>

      {/* 查看詳情按鈕 */}
       <Link to={`/shops/${shopId}`} className="shop-card-details-button">
         查看詳情
       </Link>
    </div>
  );
};

// PropTypes 檢查 (建議保留)
ShopCard.propTypes = {
    shop: PropTypes.shape({
        id: PropTypes.number.isRequired,
        name: PropTypes.string,
        address: PropTypes.string,
        averageRating: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
        reviewCount: PropTypes.number,
        media: PropTypes.arrayOf(PropTypes.shape({
            id: PropTypes.number,
            url: PropTypes.string,
            type: PropTypes.string // 修改後能接受不同格式
        }))
    }).isRequired
};


export default ShopCard; // 導出組件