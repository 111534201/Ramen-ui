// src/pages/NotFoundPage.jsx
import React from 'react';
import { Link } from 'react-router-dom';
import './NotFoundPage.css'; // 引入樣式

/**
 * 404 Not Found 或通用錯誤提示頁面
 * @param {object} props
 * @param {string} [props.message] - 可選的自定義錯誤消息
 */
const NotFoundPage = ({ message }) => {
  const defaultMessage = "哎呀！您要找的頁面不存在。";
  const displayMessage = message || defaultMessage;

  return (
    <div className="not-found-container">
      <div className="not-found-content">
        <h1 className="not-found-title">{message ? '錯誤' : '404'}</h1>
        <p className="not-found-message">{displayMessage}</p>
        <img src="/404-ramen.png" alt="迷路的拉麵" className="not-found-image" /> {/* 假設 public 文件夾有這張圖 */}
        <Link to="/" className="not-found-link">返回首頁</Link>
      </div>
    </div>
  );
};

export default NotFoundPage;