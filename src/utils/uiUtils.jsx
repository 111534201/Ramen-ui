// src/utils/uiUtils.jsx
import React from 'react'; // 需要引入 React 來使用 JSX

/**
 * 根據評分渲染星星圖標。
 * @param {number} rating - 評分數字 (例如 3.5, 4, 0)。
 * @returns {React.ReactNode[]} - 包含星星圖標 span 元素的數組。
 */
export const renderStars = (rating) => {
  // 將傳入的 rating 確保為數字，並處理 NaN 或非數字情況
  const numericRating = Number(rating);
  const validRating = isNaN(numericRating) ? 0 : numericRating;

  const fullStars = Math.floor(validRating);
  const halfStar = validRating % 1 >= 0.5 ? 1 : 0;
  // 確保空星數量不為負數
  const emptyStars = Math.max(0, 5 - fullStars - halfStar);
  const stars = [];

  // 添加實心星
  for (let i = 0; i < fullStars; i++) {
    stars.push(<span key={`full-${i}`} className="star full-star">★</span>);
  }

  // 添加半實心星 (需要 CSS 配合實現視覺效果)
  if (halfStar === 1) {
    stars.push(<span key="half" className="star half-star">★</span>);
  }

  // 添加空心星
  for (let i = 0; i < emptyStars; i++) {
    stars.push(<span key={`empty-${i}`} className="star empty-star">☆</span>);
  }

  // 如果評分為 0 或無效，返回 5 個空星作為預設
  if (stars.length === 0 && fullStars === 0 && halfStar === 0 && emptyStars === 0) {
      for (let i = 0; i < 5; i++) {
          stars.push(<span key={`empty-fallback-${i}`} className="star empty-star">☆</span>);
      }
  }


  return stars; // 返回包含 JSX 元素的數組
};

// 你可以在這個文件裡添加其他與 UI 相關的輔助函數，例如：
// export const formatCurrency = (amount) => { ... };
// export const truncateText = (text, maxLength) => { ... };