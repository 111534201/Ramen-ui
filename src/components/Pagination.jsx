// src/components/Pagination.jsx
import React from 'react';
import './Pagination.css'; // 引入對應的 CSS

/**
 * 分頁組件
 * @param {object} props
 * @param {number} props.currentPage - 當前頁碼 (從 0 開始)
 * @param {number} props.totalPages - 總頁數
 * @param {function} props.onPageChange - 頁碼變更時的回調函數，接收新的頁碼 (從 0 開始) 作為參數
 * @param {number} [props.pageNeighbours=1] - 當前頁碼左右兩側顯示的頁碼按鈕數量 (可選)
 */
const Pagination = ({ currentPage, totalPages, onPageChange, pageNeighbours = 1 }) => {

  // --- 處理邊界情況 ---
  if (!totalPages || totalPages <= 1) {
    return null; // 如果只有一頁或沒有頁面，不顯示分頁
  }

  // --- 生成頁碼數組 ---
  const fetchPageNumbers = () => {
    const totalNumbers = (pageNeighbours * 2) + 3; // 核心數字 + 兩側省略號 + 首尾頁
    const totalBlocks = totalNumbers + 2; // 加上上一頁/下一頁按鈕

    if (totalPages > totalBlocks) {
      const startPage = Math.max(1, currentPage - pageNeighbours); // 從 1 開始算頁碼
      const endPage = Math.min(totalPages - 1, currentPage + pageNeighbours); // 總頁數 - 1

      let pages = range(startPage, endPage);

      /**
       * hasLeftSpill: هل يوجد أرقام مخفية على اليسار؟
       * hasRightSpill: هل يوجد أرقام مخفية على اليمين؟
       * spillOffset: عدد الأرقام المخفية على كل جانب
       */
      const hasLeftSpill = startPage > 1;
      const hasRightSpill = (totalPages - 1) > endPage;
      const spillOffset = totalNumbers - (pages.length + 1); // +1 for current page

      switch (true) {
        // الحالة 1: لا يوجد أرقام مخفية على اليمين، ولكن يوجد على اليسار
        case (hasLeftSpill && !hasRightSpill): {
          const extraPages = range(startPage - spillOffset, startPage - 1);
          pages = ["LEFT", ...extraPages, ...pages]; // LEFT 表示左側省略號
          break;
        }
        // الحالة 2: لا يوجد أرقام مخفية على اليسار، ولكن يوجد على اليمين
        case (!hasLeftSpill && hasRightSpill): {
          const extraPages = range(endPage + 1, endPage + spillOffset);
          pages = [...pages, ...extraPages, "RIGHT"]; // RIGHT 表示右側省略號
          break;
        }
        // الحالة 3: يوجد أرقام مخفية على كلا الجانبين
        case (hasLeftSpill && hasRightSpill):
        default: {
          pages = ["LEFT", ...pages, "RIGHT"];
          break;
        }
      }
       // 添加首頁 (0) 和尾頁 (totalPages - 1)
      return [0, ...pages, totalPages - 1];
    }

    // 如果總頁數不多，直接顯示所有頁碼
    return range(0, totalPages - 1);
  };

  // 輔助函數：生成數字範圍數組
  const range = (from, to, step = 1) => {
    let i = from;
    const rangeArr = [];
    while (i <= to) {
      rangeArr.push(i);
      i += step;
    }
    return rangeArr;
  };

  // --- 頁碼按鈕點擊處理 ---
  const handleClick = (page) => {
    // 頁碼從 0 開始
    onPageChange(page);
  };

  // --- 上一頁/下一頁按鈕處理 ---
  const handleMoveLeft = () => {
    // 確保不小於 0
    onPageChange(Math.max(0, currentPage - 1));
  };

  const handleMoveRight = () => {
     // 確保不大於 totalPages - 1
    onPageChange(Math.min(totalPages - 1, currentPage + 1));
  };

  // --- 獲取要渲染的頁碼 ---
  const pages = fetchPageNumbers();

  // --- 渲染分頁組件 ---
  return (
    <nav aria-label="Page navigation" className="pagination-container">
      <ul className="pagination">
        {/* 上一頁按鈕 */}
        <li className={`page-item ${currentPage === 0 ? 'disabled' : ''}`}>
          <button
            className="page-link prev-next"
            onClick={handleMoveLeft}
            disabled={currentPage === 0}
            aria-label="上一頁"
          >
            « {/* 左雙箭頭 */}
          </button>
        </li>

        {/* 頁碼按鈕 */}
        {pages.map((page, index) => {
          if (page === "LEFT" || page === "RIGHT") {
            // 渲染省略號
            return <li key={index} className="page-item disabled"><span className="page-link ellipsis">...</span></li>;
          }

          // 渲染頁碼按鈕
          return (
            <li key={index} className={`page-item ${currentPage === page ? 'active' : ''}`}>
              <button
                className="page-link"
                onClick={() => handleClick(page)}
                disabled={currentPage === page}
              >
                {page + 1} {/* 顯示給用戶的頁碼從 1 開始 */}
              </button>
            </li>
          );
        })}

        {/* 下一頁按鈕 */}
        <li className={`page-item ${currentPage === totalPages - 1 ? 'disabled' : ''}`}>
          <button
            className="page-link prev-next"
            onClick={handleMoveRight}
            disabled={currentPage === totalPages - 1}
            aria-label="下一頁"
          >
             » {/* 右雙箭頭 */}
          </button>
        </li>
      </ul>
    </nav>
  );
};

export default Pagination;