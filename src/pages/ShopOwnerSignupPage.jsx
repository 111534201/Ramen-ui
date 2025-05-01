// src/pages/ShopOwnerSignupPage.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import useAuth from '../hooks/useAuth';
import apiClient from '../services/api';
import './AuthForm.css'; // 復用基礎樣式
import '../components/ShopForm.css';

const ShopOwnerSignupPage = () => {
    // --- 用戶信息狀態 ---
    const [username, setUsername] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');

    // --- 店家信息狀態 ---
    const [shopName, setShopName] = useState('');
    const [address, setAddress] = useState('');
    const [phone, setPhone] = useState(''); // 可選
    const [openingHours, setOpeningHours] = useState(''); // 可選
    const [description, setDescription] = useState(''); // 可選

    // --- 文件上傳狀態 ---
    const [initialPhotos, setInitialPhotos] = useState([]); // 存儲選中的文件對象 File[]
    const [photoPreviews, setPhotoPreviews] = useState([]); // 存儲照片預覽 URL string[]

    // --- 其他狀態 ---
    const [error, setError] = useState('');
    const [successMessage, setSuccessMessage] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const navigate = useNavigate();
    const { isAuthenticated, isLoading: isAuthLoading } = useAuth();

    // --- 檢查是否已登入 ---
    useEffect(() => {
        if (!isAuthLoading && isAuthenticated) {
            navigate('/', { replace: true });
        }
    }, [isAuthenticated, isAuthLoading, navigate]);

    // --- 處理文件選擇 ---
    const handleFileChange = (event) => {
        const files = Array.from(event.target.files); // 獲取選中的文件列表
         if (files.length === 0) return; // 沒有選擇文件則返回

        // 簡單的文件數量限制 (可選)
        // if (files.length > 5) {
        //     setError('最多只能上傳 5 張照片');
        //     return;
        // }

        setInitialPhotos(files); // 存儲文件對象

        // --- 生成預覽 URL ---
        const newPreviews = files.map(file => URL.createObjectURL(file));
        // 清理舊的預覽 URL 內存
        photoPreviews.forEach(url => URL.revokeObjectURL(url));
        setPhotoPreviews(newPreviews);
        setError(''); // 清除可能的文件錯誤
    };

    // --- 清理預覽 URL (組件卸載時) ---
     useEffect(() => {
         // 返回一個清理函數
         return () => {
              console.log("Cleaning up photo previews...");
             photoPreviews.forEach(url => URL.revokeObjectURL(url));
         };
     }, [photoPreviews]); // 當 photoPreviews 變化時，確保舊的被清理

    // --- 處理表單提交 ---
    const handleSubmit = async (event) => {
        event.preventDefault();
        setError('');
        setSuccessMessage('');
        setIsLoading(true);

        // --- 前端驗證 ---
        if (password !== confirmPassword) {
            setError('兩次輸入的密碼不一致'); setIsLoading(false); return;
        }
        if (!shopName || !address) { // 基礎店家信息驗證
             setError('店家名稱和地址為必填項'); setIsLoading(false); return;
        }
        // 可選：添加更詳細的文件類型/大小前端驗證
        // ...

        // --- 創建 FormData 對象來發送 multipart/form-data ---
        const formData = new FormData();

        // 1. 添加用戶和店家信息的 JSON 部分 (命名為 "shopData" 以匹配後端 @RequestPart)
        const shopData = {
            username, email, password, // 用戶信息
            shopName, address, phone, openingHours, description // 店家信息
        };
         // 將 JSON 對象轉換為 Blob
         const shopDataBlob = new Blob([JSON.stringify(shopData)], { type: 'application/json' });
         formData.append('shopData', shopDataBlob);


        // 2. 添加文件部分 (命名為 "initialPhotos" 以匹配後端 @RequestPart)
        if (initialPhotos.length > 0) {
            initialPhotos.forEach((photo) => {
                formData.append('initialPhotos', photo); // 使用相同名稱添加多個文件
            });
        }

        // --- 發送請求 ---
        try {
            // 注意：這裡不需要手動設置 Content-Type，瀏覽器會自動處理 FormData
            const response = await apiClient.post('/auth/signup/shop', formData);

             if (response.data?.success && response.data?.data) {
                console.log('[ShopOwnerSignupPage] Signup successful for:', response.data.data.username);
                setSuccessMessage('店家註冊成功！您現在可以使用該帳號登入了。');
                // 清空表單
                setUsername(''); setEmail(''); setPassword(''); setConfirmPassword('');
                setShopName(''); setAddress(''); setPhone(''); setOpeningHours(''); setDescription('');
                setInitialPhotos([]); setPhotoPreviews([]);
                // 跳轉到登錄頁
                setTimeout(() => navigate('/login'), 3000);
            } else {
                throw new Error(response.data?.message || '店家註冊失敗，請稍後再試。');
            }
        } catch (error) {
             console.error("[ShopOwnerSignupPage] Signup failed:", error?.data?.message || error?.message || error);
             // 處理 Geocoding 失敗的特定提示
             if (error?.data?.message && error.data.message.toLowerCase().includes('geocoding')) {
                  setError('地址無法成功轉換為座標，請檢查地址是否正確或嘗試更詳細的地址。');
             } else {
                 setError(error?.data?.message || error?.message || '註冊過程中發生錯誤，請檢查您的輸入或稍後再試。');
             }
        } finally {
            setIsLoading(false);
        }
    };

     // --- 如果 AuthContext 仍在加載 ---
     if (isAuthLoading) {
         return <div className="loading">檢查登入狀態中...</div>;
     }

    // --- 渲染店家註冊表單 ---
    return (
        <div className="auth-container shop-signup-container"> {/* 可以加特定 class */}
            <div className="auth-form-wrapper shop-form-wrapper"> {/* 可以加特定 class */}
                <h2>註冊 店家帳號</h2>
                <p style={{ marginBottom: '1.5rem', fontSize: '0.9rem', color: '#666' }}>
                    註冊店家帳號後，您將可以管理您的店家資訊並回覆顧客評論。
                </p>
                <form onSubmit={handleSubmit} className="auth-form shop-form"> {/* 可以加特定 class */}
                    {error && <div className="error-message">{error}</div>}
                    {successMessage && <div className="success-message" style={{backgroundColor: '#e8f5e9', color: '#2e7d32', padding: '0.8rem 1rem', border: '1px solid #a5d6a7', borderRadius: '4px', marginBottom: '1.5rem'}}>{successMessage}</div>}

                    {/* --- 用戶信息區塊 --- */}
                    <fieldset>
                        <legend>帳號資訊</legend>
                        <div className="form-group">
                            <label htmlFor="username">用戶名 *</label>
                            <input type="text" id="username" value={username} onChange={(e) => setUsername(e.target.value)} required minLength="3" maxLength="20" autoComplete="username" disabled={isLoading} />
                        </div>
                        <div className="form-group">
                            <label htmlFor="email">Email *</label>
                            <input type="email" id="email" value={email} onChange={(e) => setEmail(e.target.value)} required maxLength="50" autoComplete="email" disabled={isLoading} />
                        </div>
                        <div className="form-group">
                            <label htmlFor="password">密碼 *</label>
                            <input type="password" id="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength="6" maxLength="40" autoComplete="new-password" disabled={isLoading} />
                        </div>
                        <div className="form-group">
                            <label htmlFor="confirmPassword">確認密碼 *</label>
                            <input type="password" id="confirmPassword" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required minLength="6" maxLength="40" autoComplete="new-password" disabled={isLoading} />
                        </div>
                    </fieldset>

                     {/* --- 店家信息區塊 --- */}
                     <fieldset>
                        <legend>店家資訊</legend>
                        <div className="form-group">
                            <label htmlFor="shopName">店家名稱 *</label>
                            <input type="text" id="shopName" value={shopName} onChange={(e) => setShopName(e.target.value)} required maxLength="100" disabled={isLoading} />
                        </div>
                        <div className="form-group">
                            <label htmlFor="address">店家地址 *</label>
                            <input type="text" id="address" value={address} onChange={(e) => setAddress(e.target.value)} required maxLength="512" disabled={isLoading} />
                            <small>請輸入完整、可被 Google Maps 識別的地址。</small>
                        </div>
                        <div className="form-group">
                            <label htmlFor="phone">電話 (選填)</label>
                            <input type="tel" id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} maxLength="20" disabled={isLoading} />
                        </div>
                         <div className="form-group">
                            <label htmlFor="openingHours">營業時間描述 (選填)</label>
                            <textarea id="openingHours" value={openingHours} onChange={(e) => setOpeningHours(e.target.value)} rows="4" disabled={isLoading}></textarea>
                            <small>例如：週一至週五 11:00-21:00，週六、日公休。</small>
                        </div>
                         <div className="form-group">
                            <label htmlFor="description">特色描述 (選填)</label>
                            <textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} rows="4" disabled={isLoading}></textarea>
                            <small>介紹一下你的拉麵特色、故事等。</small>
                        </div>
                    </fieldset>

                    {/* --- 文件上傳區塊 --- */}
                     <fieldset>
                        <legend>店家照片 (選填)</legend>
                         <div className="form-group">
                             <label htmlFor="initialPhotos">選擇照片 (可多選)</label>
                             <input
                                 type="file"
                                 id="initialPhotos"
                                 multiple // 允許多選
                                 accept="image/*" // 限制只接受圖片
                                 onChange={handleFileChange}
                                 disabled={isLoading}
                             />
                         </div>
                         {/* 預覽區域 */}
                         {photoPreviews.length > 0 && (
                             <div className="photo-previews">
                                 <p>已選擇的照片預覽：</p>
                                 {photoPreviews.map((previewUrl, index) => (
                                     <img key={index} src={previewUrl} alt={`預覽 ${index + 1}`} className="photo-preview-item" />
                                 ))}
                             </div>
                         )}
                     </fieldset>

                    {/* 提交按鈕 */}
                    <button type="submit" className="submit-button" disabled={isLoading}>
                        {isLoading ? '註冊中...' : '完成註冊並建立店家'}
                    </button>
                </form>

                {/* 跳轉連結 */}
                <div className="auth-switch">
                    已經有帳號了？ <Link to="/login">前往登入</Link>
                    <br/>
                    <Link to="/signup">註冊成為食客</Link>
                </div>
            </div>
        </div>
    );
};

export default ShopOwnerSignupPage;