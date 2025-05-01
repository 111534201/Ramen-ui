// src/components/EventForm.jsx
import React, { useState, useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
// 引入日期選擇器 (假設您會安裝並使用 react-datepicker)
// npm install react-datepicker date-fns
import DatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";
import { registerLocale, setDefaultLocale } from "react-datepicker";
import { zhTW } from 'date-fns/locale'; // 引入中文語系

// 註冊中文語系
registerLocale('zh-TW', zhTW);
setDefaultLocale('zh-TW');

// 引入樣式 (可以創建新的或復用)
import './EventForm.css'; // 稍後創建或修改此 CSS 檔案
// 可能復用 AuthForm 或 ShopForm 的部分樣式
import '../pages/AuthForm.css';
import './ShopForm.css';

// 輔助函數：構建媒體 URL (與 ShopForm 相同)
const buildMediaUrl = (relativePath) => {
    if (!relativePath) return null;
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


const EventForm = ({
    isEditMode = false,
    initialData = null, // EventDTO (編輯模式下)
    onSubmit,
    isSubmitting = false,
    error: externalError = null, // 外部傳入的錯誤
    onCancel // 可選的取消回調
}) => {

    // --- 表單欄位狀態 ---
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [startDate, setStartDate] = useState(null); // 使用 null 或 Date 物件
    const [endDate, setEndDate] = useState(null);   // 使用 null 或 Date 物件
    const [eventType, setEventType] = useState('ANNOUNCEMENT'); // 預設類型

    // --- 媒體管理狀態 (編輯模式) ---
    const [existingMedia, setExistingMedia] = useState([]); // EventMediaDTO[]
    const [deletedMediaIds, setDeletedMediaIds] = useState(new Set()); // Set<number>

    // --- 新文件上傳狀態 ---
    const [newFiles, setNewFiles] = useState([]); // File[]
    const [newFilePreviews, setNewFilePreviews] = useState([]); // string[]
    const fileInputRef = useRef(null);

    // --- 內部錯誤狀態 ---
    const [formError, setFormError] = useState('');

    // --- 效果：初始化表單 (編輯模式) ---
    useEffect(() => {
        setFormError('');
        setDeletedMediaIds(new Set());
        setNewFiles([]);
        setNewFilePreviews([]); // 清理舊預覽

        if (isEditMode && initialData) {
            setTitle(initialData.title || '');
            setContent(initialData.content || '');
            // 將 ISO 字符串轉換為 Date 物件供 DatePicker 使用
            setStartDate(initialData.startDate ? new Date(initialData.startDate) : null);
            setEndDate(initialData.endDate ? new Date(initialData.endDate) : null);
            setEventType(initialData.eventType || 'ANNOUNCEMENT');
            setExistingMedia(Array.isArray(initialData.media) ? initialData.media : []);
        } else {
            // 清空表單 (新增模式或無初始資料)
            setTitle(''); setContent(''); setStartDate(new Date()); setEndDate(null);
            setEventType('ANNOUNCEMENT'); setExistingMedia([]);
        }
    }, [initialData, isEditMode]);

    // --- 效果：清理新文件預覽 URL ---
    useEffect(() => {
        return () => {
            newFilePreviews.forEach(url => URL.revokeObjectURL(url));
        };
    }, [newFilePreviews]);

    // --- 輸入處理 ---
    const handleDateChange = (date, field) => {
        if (field === 'startDate') {
            setStartDate(date);
            // 可選：如果開始日期晚於結束日期，清空結束日期
            if (endDate && date && date > endDate) {
                setEndDate(null);
            }
        } else if (field === 'endDate') {
            setEndDate(date);
        }
    };

    // --- 處理新文件選擇 ---
    const handleFileChange = (event) => {
        const files = Array.from(event.target.files);
        if (!files || files.length === 0) return;

        // 簡單驗證 (可擴充)
        const allowedFiles = files.filter(file => file.type.startsWith('image/') || file.type.startsWith('video/'));
        if (allowedFiles.length !== files.length) {
            setFormError('只能上傳圖片或影片文件');
            if (fileInputRef.current) fileInputRef.current.value = "";
            setNewFiles([]); setNewFilePreviews([]); return;
        }
        // TODO: 添加數量或大小限制檢查
        // 例如：限制總媒體數 (現有+新上傳)
        const currentMediaCount = existingMedia.length - deletedMediaIds.size;
        const maxMediaItems = 5; // 假設最多5個
        if (currentMediaCount + allowedFiles.length > maxMediaItems) {
             setFormError(`每個活動最多只能有 ${maxMediaItems} 個媒體文件。`);
             if (fileInputRef.current) fileInputRef.current.value = "";
             // 不更新 setNewFiles / setNewFilePreviews
             return;
         }


        setNewFiles(prevFiles => [...prevFiles, ...allowedFiles]); // 添加到現有新文件列表
        const currentPreviews = allowedFiles.map(file => URL.createObjectURL(file)).filter(Boolean);
        // newFilePreviews.forEach(url => URL.revokeObjectURL(url)); // 不應清理舊的，而是追加
        setNewFilePreviews(prevPreviews => [...prevPreviews, ...currentPreviews]); // 追加預覽
        setFormError('');
        // 清空文件輸入框以便可以再次選擇相同文件
        if (fileInputRef.current) {
             fileInputRef.current.value = "";
         }
    };

    // --- 移除新文件預覽 ---
     const handleRemoveNewFile = (indexToRemove) => {
         URL.revokeObjectURL(newFilePreviews[indexToRemove]); // 清理內存
         setNewFiles(prev => prev.filter((_, index) => index !== indexToRemove));
         setNewFilePreviews(prev => prev.filter((_, index) => index !== indexToRemove));
     };


    // --- 標記/取消標記刪除現有媒體 ---
    const toggleDeleteExistingMedia = (mediaId) => {
        setDeletedMediaIds(prev => {
            const newSet = new Set(prev);
            if (newSet.has(mediaId)) newSet.delete(mediaId);
            else newSet.add(mediaId);
            return newSet;
        });
    };

    // --- 處理表單提交 ---
    const handleSubmit = (event) => {
        event.preventDefault();
        setFormError('');

        // --- 前端基礎驗證 ---
        if (!title) { setFormError('活動標題為必填項'); return; }
        if (!startDate) { setFormError('活動開始時間為必填項'); return; }
        if (endDate && startDate && endDate < startDate) { setFormError('結束時間不能早於開始時間'); return; }

        // 準備提交的數據
        const eventFormData = {
            title,
            content,
            startDate: startDate ? startDate.toISOString() : null,
            endDate: endDate ? endDate.toISOString() : null,
            eventType,
        };

        // 調用父組件的 onSubmit 回調
        onSubmit({
            eventFormData,
            newFiles, // 傳遞 File 對象數組
            deletedMediaIds: Array.from(deletedMediaIds) // 將 Set 轉為數組
        });
    };

    // --- 活動類型選項 ---
    const eventTypeOptions = [
        { value: 'ANNOUNCEMENT', label: '公告' },
        { value: 'PROMOTION', label: '促銷優惠' },
        { value: 'SPECIAL_MENU', label: '特別菜單' },
        { value: 'CLOSURE', label: '公休/休業' },
        { value: 'OTHER', label: '其他' },
    ];

    // --- 渲染 ---
    return (
        <form onSubmit={handleSubmit} className="event-form shop-form auth-form"> {/* 組合使用樣式 */}
            <h2>{isEditMode ? '編輯活動' : '新增活動'}</h2>

            {(externalError || formError) && (
                <div className="error-message">{externalError || formError}</div>
            )}

            <fieldset disabled={isSubmitting}>
                <legend>活動資訊</legend>
                <div className="form-group">
                    <label htmlFor="event-title">活動標題 *</label>
                    <input type="text" id="event-title" value={title} onChange={(e) => setTitle(e.target.value)} required maxLength="255" />
                </div>
                <div className="form-group">
                    <label htmlFor="event-content">活動內容 (選填)</label>
                    <textarea id="event-content" value={content} onChange={(e) => setContent(e.target.value)} rows="5"></textarea>
                </div>
                <div className="form-group">
                    <label htmlFor="event-start-date">開始時間 *</label>
                    <DatePicker
                        id="event-start-date"
                        selected={startDate}
                        onChange={(date) => handleDateChange(date, 'startDate')}
                        showTimeSelect
                        timeFormat="HH:mm"
                        timeIntervals={15}
                        dateFormat="yyyy/MM/dd HH:mm"
                        locale="zh-TW"
                        required
                        className="date-picker-input"
                        placeholderText="選擇開始日期和時間"
                        selectsStart
                        startDate={startDate}
                        endDate={endDate}
                    />
                </div>
                <div className="form-group">
                    <label htmlFor="event-end-date">結束時間 (選填)</label>
                    <DatePicker
                        id="event-end-date"
                        selected={endDate}
                        onChange={(date) => handleDateChange(date, 'endDate')}
                        showTimeSelect
                        timeFormat="HH:mm"
                        timeIntervals={15}
                        dateFormat="yyyy/MM/dd HH:mm"
                        locale="zh-TW"
                        className="date-picker-input"
                        placeholderText="選擇結束日期和時間 (若無則不填)"
                        selectsEnd
                        startDate={startDate}
                        endDate={endDate}
                        minDate={startDate}
                        isClearable
                    />
                    <small>若活動無明確結束時間，請留空。</small>
                </div>
                <div className="form-group">
                    <label htmlFor="event-type">活動類型 *</label>
                    <select id="event-type" value={eventType} onChange={(e) => setEventType(e.target.value)} required>
                        {eventTypeOptions.map(option => (
                            <option key={option.value} value={option.value}>{option.label}</option>
                        ))}
                    </select>
                </div>
            </fieldset>

            <fieldset disabled={isSubmitting}>
                <legend>活動媒體管理</legend>
                {isEditMode && existingMedia.length > 0 && (
                    <div className="existing-media-section">
                        <h4>現有照片/影片</h4>
                        <div className="media-grid">
                            {existingMedia.map(media => {
                                const fullUrl = buildMediaUrl(media.url);
                                const isMarkedForDelete = deletedMediaIds.has(media.id);
                                const isVideo = media.type && media.type.toLowerCase().includes('video');
                                return (
                                    <div key={media.id} className={`media-item-wrapper ${isMarkedForDelete ? 'marked-for-delete' : ''}`}>
                                        {isVideo ? (
                                            <video src={fullUrl} className="media-preview" controls={false} muted playsInline preload="metadata" title={media.url || 'video'}/>
                                        ) : (
                                            <img src={fullUrl} alt={`現有媒體 ${media.id}`} className="media-preview" loading="lazy" title={media.url || 'image'}/>
                                        )}
                                        <button type="button" onClick={() => toggleDeleteExistingMedia(media.id)} className={`media-action-button ${isMarkedForDelete ? 'undelete-button' : 'delete-button'}`} title={isMarkedForDelete ? '取消刪除' : '標記刪除'}>
                                            {isMarkedForDelete ? '↩️' : '❌'}
                                        </button>
                                    </div>
                                );
                            })}
                        </div>
                        <small>點擊 ❌ 將媒體標記為待刪除，點擊 ↩️ 取消標記。</small>
                    </div>
                )}
                <div className="form-group upload-section">
                   <label htmlFor="event-new-files">{isEditMode ? '上傳新照片/影片' : '上傳活動照片/影片'} (選填)</label>
                   <input type="file" id="event-new-files" multiple accept="image/*,video/*" onChange={handleFileChange} ref={fileInputRef} />
                </div>
                {newFilePreviews.length > 0 && (
                     <div className="photo-previews new-photo-previews">
                         <p>新選擇的文件預覽：</p>
                         <div className="media-grid"> {/* 使用 grid 佈局預覽 */}
                             {newFilePreviews.map((previewUrl, index) => {
                                  const file = newFiles[index];
                                  const fileType = file?.type || 'unknown';
                                  return (
                                       <div key={`new-${index}`} className="media-item-wrapper">
                                            {fileType.startsWith('video/') ? (
                                               <video src={previewUrl} className="media-preview" muted playsInline controls={false} title={file?.name}/>
                                           ) : (
                                                <img src={previewUrl} alt={`新預覽 ${index + 1}`} className="media-preview" title={file?.name}/>
                                           )}
                                           <button type="button" onClick={() => handleRemoveNewFile(index)} className="media-action-button delete-button" title="移除此預覽">
                                               ❌
                                           </button>
                                       </div>
                                  );
                             })}
                         </div>
                     </div>
                 )}
            </fieldset>

            <div className="form-actions">
                {typeof onCancel === 'function' && (
                    <button type="button" onClick={onCancel} className="cancel-button" disabled={isSubmitting}>取消</button>
                )}
               <button type="submit" className="submit-button" disabled={isSubmitting}>
                   {isSubmitting ? '處理中...' : (isEditMode ? '更新活動' : '新增活動')}
               </button>
            </div>
        </form>
    );
};

EventForm.propTypes = {
    isEditMode: PropTypes.bool,
    initialData: PropTypes.object,
    onSubmit: PropTypes.func.isRequired,
    isSubmitting: PropTypes.bool,
    error: PropTypes.string,
    onCancel: PropTypes.func
};

export default EventForm;