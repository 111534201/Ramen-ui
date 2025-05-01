// src/services/api.js
import axios from 'axios';

// 從環境變數讀取後端 API URL
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';

//console.log('[API Client] Base URL:', API_BASE_URL);

// --- 創建 axios 實例 ---
const apiClient = axios.create({
  baseURL: API_BASE_URL + '/api', // 將 /api 前綴加到基礎 URL
});

// --- 請求攔截器：自動附加 JWT Token ---
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('authToken'); // 從 localStorage 獲取 Token
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`; // 添加 Authorization 頭
    }
    // 打印請求信息 (調試用，生產環境可移除)
    //console.log(`[API Request] ${config.method?.toUpperCase()} ${config.url}`, config.params || '', config.data instanceof FormData ? '(FormData)' : (config.data || '') );
    return config;
  },
  (error) => {
    console.error('[API Request Error]', error);
    return Promise.reject(error);
  }
);

// --- 響應攔截器：全局錯誤處理 ---
apiClient.interceptors.response.use(
  (response) => {
    // 返回完整響應對象，讓調用者可以訪問 headers, status 等
    return response;
  },
  (error) => {
    console.error('[API Response Error]', error.response || error.message || error);

    if (error.response) {
      const { status, data } = error.response;
      const errorMessage = data?.message || error.message || '發生未知伺服器錯誤';

      if (status === 401) {
        console.error('API Error 401: 未授權', errorMessage);
        localStorage.removeItem('authToken');
        // 檢查是否在瀏覽器環境中再操作 window
        if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
             alert('您的登入已過期或無效，請重新登入。');
             window.location.href = '/login'; // 強制跳轉到登入頁
        }
      } else if (status === 403) {
        console.error('API Error 403: 權限不足', errorMessage);
        alert(`權限不足：${errorMessage}`); // 提示用戶權限不足
      } else if (status === 404) {
        console.error('API Error 404: 資源未找到', errorMessage);
        // 404 通常不需要 alert，由頁面自行處理
      } else if (status === 400) {
          console.error('API Error 400: 錯誤的請求', errorMessage);
          // 400 錯誤通常由前端驗證或業務邏輯問題引起，訊息可能需要在表單上顯示
          // 不建議在這裡 alert，除非是全局性的 Bad Request
      } else if (status === 409) {
          console.error('API Error 409: 資源衝突', errorMessage);
          // 例如用戶名/Email 已存在，訊息應在表單上顯示
      } else if (status === 413) {
           console.error('API Error 413: 請求體過大', errorMessage);
           alert(`上傳失敗：${errorMessage || '文件大小超過限制'}`);
      } else if (status === 500) {
           console.error('API Error 500: 伺服器內部錯誤', errorMessage);
           // 顯示通用錯誤訊息給用戶
           alert(`伺服器錯誤：${errorMessage}`);
      } else {
        console.error(`API Error ${status}: ${errorMessage}`);
        // 其他未知狀態碼的錯誤，可以考慮顯示通用訊息
        alert(`發生錯誤 (${status})：${errorMessage}`);
      }
      // 拋出包含後端響應的錯誤，讓 try/catch 區塊可以獲取詳細信息
      return Promise.reject(error.response);
    } else if (error.request) {
      // 請求已發出但沒有收到響應 (網路問題)
      console.error('API Network Error:', error.request);
      alert('網路錯誤或無法連接到伺服器，請檢查您的網路連線並稍後重試。');
    } else {
      // 請求設置錯誤
      console.error('API Request Setup Error:', error.message);
      alert(`發送請求時發生錯誤: ${error.message}`);
    }
    // 返回一個標準化的錯誤 reject
    return Promise.reject({ response: undefined, message: error.message || '發生未知錯誤' });
  }
);

// =============================================
// 認證 (Auth) 相關 API
// =============================================
/** 使用者登入 */
export const loginUser = async (credentials) => {
    const response = await apiClient.post('/auth/login', credentials);
    return response.data; // 返回 ApiResponse data
};

/** 註冊食客帳號 */
export const registerUser = async (userData) => {
    const response = await apiClient.post('/auth/signup/user', userData);
    return response.data;
};

/** 註冊店家帳號 (包含店家資訊和初始照片) */
export const registerShopOwner = async (formData) => {
    // 注意：需要傳入 FormData 對象
    const response = await apiClient.post('/auth/signup/shop', formData);
    return response.data;
};

// =============================================
// 店家 (Shop) 相關 API
// =============================================
/** 獲取店家列表 (分頁/篩選/排序) */
export const getShops = async (params = {}) => {
    const response = await apiClient.get('/shops', { params });
    return response.data;
};

/** 根據 ID 獲取店家詳情 */
export const getShopById = async (shopId) => {
    const response = await apiClient.get(`/shops/${shopId}`);
    return response.data;
};

/** 更新店家資訊 (店家本人或管理員) */
export const updateShop = async (shopId, shopData) => {
    const response = await apiClient.put(`/shops/${shopId}`, shopData);
    return response.data;
};

/** (管理員) 刪除店家 */
export const deleteShopByAdmin = async (shopId) => {
    const response = await apiClient.delete(`/shops/${shopId}`);
    return response.data;
};

/** 獲取 Top N 排行榜店家 */
export const getTopShops = async (params = {}) => {
    const response = await apiClient.get('/shops/top', { params });
    return response.data;
};

/** 根據關鍵字搜尋店家 */
export const searchShops = async (query) => {
    const response = await apiClient.get('/shops/search', { params: { query } });
    return response.data;
};

/** 為店家上傳媒體文件 */
export const uploadShopMedia = async (shopId, formData) => {
    // 注意：需要傳入 FormData 對象
    const response = await apiClient.post(`/shops/${shopId}/media`, formData);
    return response.data;
};

/** 刪除店家媒體文件 */
export const deleteShopMedia = async (shopId, mediaId) => {
    const response = await apiClient.delete(`/shops/${shopId}/media/${mediaId}`);
    return response.data;
};


// =============================================
// 評論 (Review) 相關 API
// =============================================
/** 創建評論或回覆 (包含照片) */
export const createReview = async (shopId, formData) => {
    // 注意：需要傳入 FormData 對象
    const response = await apiClient.post(`/reviews/shop/${shopId}`, formData);
    return response.data;
};

/** 更新評論或回覆 (文字內容/評分) */
export const updateReview = async (reviewId, reviewData) => {
    const response = await apiClient.put(`/reviews/${reviewId}`, reviewData);
    return response.data;
};

/** 刪除評論或回覆 */
export const deleteReview = async (reviewId) => {
    const response = await apiClient.delete(`/reviews/${reviewId}`);
    return response.data;
};

/** 獲取店家頂級評論列表 (分頁) */
export const getShopReviews = async (shopId, params = {}) => {
    const response = await apiClient.get(`/reviews/shop/${shopId}`, { params });
    return response.data;
};

/** 獲取評論的回覆列表 */
export const getReviewReplies = async (parentReviewId) => {
    const response = await apiClient.get(`/reviews/${parentReviewId}/replies`);
    return response.data;
};

/** 為評論添加照片 */
export const addReviewMedia = async (reviewId, formData) => {
    // 注意：需要傳入 FormData 對象
    const response = await apiClient.post(`/reviews/${reviewId}/media`, formData);
    return response.data;
};

/** 刪除評論照片 */
export const deleteReviewMedia = async (reviewId, mediaId) => {
    const response = await apiClient.delete(`/reviews/${reviewId}/media/${mediaId}`);
    return response.data;
};


// =============================================
// 店家活動 (Event) 相關 API
// =============================================

/** 創建新的店家活動 (包含媒體檔案) */
export const createEvent = async (shopId, eventData, files) => {
    const formData = new FormData();
    formData.append('eventData', new Blob([JSON.stringify(eventData)], { type: 'application/json' }));
    if (files && files.length > 0) {
        Array.from(files).forEach(file => formData.append('files', file));
    }
    const response = await apiClient.post(`/shops/${shopId}/events`, formData);
    return response.data;
};

/** 更新指定活動的資訊 */
export const updateEvent = async (eventId, eventData) => {
    const response = await apiClient.put(`/events/${eventId}`, eventData);
    return response.data;
};

/** 刪除指定活動 */
export const deleteEvent = async (eventId) => {
    const response = await apiClient.delete(`/events/${eventId}`);
    return response.data;
};

/** 獲取單一活動詳情 */
export const getEventById = async (eventId) => {
    const response = await apiClient.get(`/events/${eventId}`);
    return response.data;
};

/** 獲取某店家的活動列表 (可分頁、篩選) */
export const getEventsByShop = async (shopId, params = {}) => {
    const response = await apiClient.get(`/shops/${shopId}/events`, { params });
    return response.data;
};

/** 為指定活動添加媒體檔案 */
export const addEventMedia = async (eventId, files) => {
    const formData = new FormData();
    if (!files || files.length === 0) throw new Error("必須選擇要上傳的檔案");
    Array.from(files).forEach(file => formData.append('files', file));
    const response = await apiClient.post(`/events/${eventId}/media`, formData);
    return response.data;
};

/** 刪除指定的活動媒體 */
export const deleteEventMedia = async (eventId, mediaId) => {
    const response = await apiClient.delete(`/events/${eventId}/media/${mediaId}`);
    return response.data;
};

/** 獲取公開的活動列表 */
export const getPublicEvents = async (params = {}) => {
    const response = await apiClient.get(`/events/public`, { params });
    return response.data;
};

// --- Admin Event API Functions ---

// === 移除審核相關 API ===
/*
export const getPendingEvents = async (params = {}) => { ... };
export const approveEvent = async (eventId) => { ... };
export const rejectEvent = async (eventId, notes) => { ... };
*/
// === ===

// === 新增：管理員獲取/篩選活動 API ===
/**
 * (管理員) 獲取活動列表，支持按狀態、店家等篩選
 * @param {object} params 查詢參數 (例如 { status: 'ACTIVE', shopId: 12, page: 0, size: 10 })
 * @returns {Promise<object>} 後端返回的 ApiResponse data (包含 PageResponse<EventDTO>)
 */
export const getAdminFilteredEvents = async (params = {}) => {
    //console.log("[API] Calling GET /admin/events with params:", params);
    const response = await apiClient.get(`/admin/events`, { params });
    return response.data;
};
// === ===

// === 管理員下架活動 API ===
/**
 * (管理員) 下架活動
 * @param {number} eventId 活動 ID
 * @param {string} notes 下架理由 (可選)
 * @returns {Promise<object>} 後端返回的 ApiResponse data (包含更新後的 EventDTO)
 */
export const hideEventByAdmin = async (eventId, notes) => {
    const payload = notes ? { notes } : {};
    const response = await apiClient.patch(`/admin/events/${eventId}/hide`, payload);
    return response.data;
};
// === ===

// =============================================
// 用戶管理 (Admin User Management) API
// =============================================
/** (管理員) 獲取所有用戶列表 */
export const getAllUsers = async () => {
    const response = await apiClient.get('/admin/users');
    return response.data;
};

/** (管理員) 根據 ID 獲取用戶信息 */
export const getUserById = async (userId) => {
    const response = await apiClient.get(`/admin/users/${userId}`);
    return response.data;
};

/** (管理員) 更新用戶角色 */
export const updateUserRole = async (userId, role) => {
    const response = await apiClient.patch(`/admin/users/${userId}/role`, { role });
    return response.data;
};

/** (管理員) 啟用/禁用用戶 */
export const setUserEnabled = async (userId, enabled) => {
    const response = await apiClient.patch(`/admin/users/${userId}/enabled`, { enabled });
    return response.data;
};

/** (管理員) 刪除用戶 */
export const deleteUser = async (userId) => {
    const response = await apiClient.delete(`/admin/users/${userId}`);
    return response.data;
};

// =============================================
// 新增：動態牆 (Recent Activities) 相關 API
// =============================================
/**
 * 取得動態牆（活動 + 最新評論）分頁資料
 * @param {number} page 第幾頁（0 起始）
 * @param {number} size 每頁筆數
 */
export async function getRecentActivities(page = 0, size = 10) {
    const response = await apiClient.get('/activities', {
      params: { page, size }
    });
    return response.data;
  }

export default apiClient; // 導出配置好的 axios 實例