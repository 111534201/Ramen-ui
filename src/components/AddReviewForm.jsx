// src/components/AddReviewForm.jsx
import React, { useState, useEffect, useRef } from 'react';
import apiClient from '../services/api';
import useAuth from '../hooks/useAuth';

// --- MUI Imports ---
import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import Rating from '@mui/material/Rating';
import Card from '@mui/material/Card';
import CardMedia from '@mui/material/CardMedia';
import Alert from '@mui/material/Alert';
import CircularProgress from '@mui/material/CircularProgress';
import DeleteIcon from '@mui/icons-material/Delete';
import RemoveCircleOutlineIcon from '@mui/icons-material/RemoveCircleOutline';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
// --- ---

// --- 輔助函數：構建完整的圖片 URL ---
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
// --- ---

const AddReviewForm = ({
    shopId,                  // 當前店家的 ID
    reviewToEdit = null,     // 如果是編輯模式，傳入要編輯的 review 對象
    isReplyMode = false,     // 是否為回覆模式？
    parentReviewId = null,   // 如果是回覆模式，父評論的 ID
    onReviewAdded,           // 新增成功後的回調函數 (接收新 review DTO)
    onReviewUpdated,         // 更新成功後的回調函數 (不接收 DTO，由父組件刷新)
    onCancelEdit             // 取消編輯/回覆的回調函數
}) => {
    const { isAuthenticated, user, isLoading: isAuthLoading } = useAuth();

    // --- State ---
    const [rating, setRating] = useState(0);
    const [comment, setComment] = useState('');
    const [photos, setPhotos] = useState([]); // 新選擇的文件 File 對象列表
    const [photoPreviews, setPhotoPreviews] = useState([]); // 新選擇文件的預覽 URL 列表
    const [existingMedia, setExistingMedia] = useState([]); // 從 reviewToEdit 加載的現有媒體 DTO 列表
    const [mediaToDelete, setMediaToDelete] = useState([]); // 要刪除的 existingMedia 的 ID 列表
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const fileInputRef = useRef(null);

    // --- 效果：編輯模式下初始化表單 ---
    useEffect(() => {
        if (reviewToEdit) {
            setRating(reviewToEdit.rating || 0);
            setComment(reviewToEdit.content || '');
            setPhotos([]); setPhotoPreviews([]); setMediaToDelete([]);
            setExistingMedia(Array.isArray(reviewToEdit.media) ? reviewToEdit.media : []);
        } else {
            setRating(0); setComment(''); setPhotos([]); setPhotoPreviews([]);
            setMediaToDelete([]); setExistingMedia([]);
        }
        setError('');
    }, [reviewToEdit, isReplyMode]);

    // --- 評分處理 ---
    const handleRatingChange = (event, newValue) => {
         if (isLoading || isReplyMode || (reviewToEdit && reviewToEdit.parentReviewId)) return;
         setRating(newValue === null ? 0 : newValue);
     };

    // --- 評論內容處理 ---
    const handleCommentChange = (event) => {
        setComment(event.target.value);
    };

    // --- 圖片處理 ---
    const handlePhotoChange = (event) => {
        if (event.target.files) {
            const newFiles = Array.from(event.target.files);
            const validFiles = newFiles.filter(file => file.type.startsWith('image/'));
            setError('');

            if (validFiles.length !== newFiles.length) setError('只能上傳圖片文件。');

            const maxPhotos = 5;
            const currentTotalCount = (existingMedia.length - mediaToDelete.length) + photos.length;
            const availableSlots = maxPhotos - currentTotalCount;

            if (availableSlots <= 0 && validFiles.length > 0) {
                setError(`最多只能有 ${maxPhotos} 張照片。`);
                event.target.value = null; return;
            }

            if (validFiles.length > availableSlots) {
                setError(`最多只能有 ${maxPhotos} 張照片。您還可以添加 ${availableSlots} 張。`);
                const allowedNewFiles = validFiles.slice(0, availableSlots);
                setPhotos(prev => [...prev, ...allowedNewFiles]);
                const previews = allowedNewFiles.map(file => URL.createObjectURL(file));
                setPhotoPreviews(prev => [...prev, ...previews]);
            } else {
                setPhotos(prev => [...prev, ...validFiles]);
                const previews = validFiles.map(file => URL.createObjectURL(file));
                setPhotoPreviews(prev => [...prev, ...previews]);
            }
            event.target.value = null;
        }
    };
    const handleRemoveNewPhoto = (indexToRemove) => {
        URL.revokeObjectURL(photoPreviews[indexToRemove]);
        setPhotos(prev => prev.filter((_, index) => index !== indexToRemove));
        setPhotoPreviews(prev => prev.filter((_, index) => index !== indexToRemove));
    };
    const handleToggleDeleteExistingMedia = (mediaId) => {
        setMediaToDelete(prev => prev.includes(mediaId) ? prev.filter(id => id !== mediaId) : [...prev, mediaId]);
    };
    useEffect(() => { return () => { photoPreviews.forEach(url => URL.revokeObjectURL(url)); }; }, [photoPreviews]);

    // --- 提交表單 ---
    const handleSubmit = async (event) => {
        event.preventDefault();
        setError('');
        if (!isReplyMode && !(reviewToEdit && reviewToEdit.parentReviewId) && rating === 0) { setError('請選擇評分。'); return; }
        if (!comment.trim() && photos.length === 0 && (!reviewToEdit || existingMedia.length - mediaToDelete.length === 0) ) { setError('請填寫內容或上傳照片。'); return; }
        if (!isAuthenticated || !user) { setError('請先登入。'); return; }
        setIsLoading(true);

        try {
            if (reviewToEdit) {
                // --- 更新評論/回覆 ---
                const reviewId = reviewToEdit.id;
                let partialError = null;

                // 1. 更新文字/評分
                const hasTextChanged = comment !== (reviewToEdit.content || '');
                const hasRatingChanged = !isReplyMode && !reviewToEdit.parentReviewId && rating !== (reviewToEdit.rating || 0);
                if(hasTextChanged || hasRatingChanged) {
                    try {
                        const updatePayload = { content: comment, rating: (isReplyMode || reviewToEdit.parentReviewId) ? null : rating };
                        const updateResponse = await apiClient.put(`/reviews/${reviewId}`, updatePayload);
                        if (!updateResponse.data?.success) throw new Error(updateResponse.data?.message || '更新失敗');
                    } catch (err) { partialError = `更新文字/評分失敗: ${err?.data?.message || err?.response?.data?.message || err?.message || '未知錯誤'}`; setError(partialError); setIsLoading(false); return; }
                }

                // 2. 刪除舊圖片
                if (mediaToDelete.length > 0) {
                    const deletePromises = mediaToDelete.map(mediaId => apiClient.delete(`/reviews/${reviewId}/media/${mediaId}`).catch(err => { console.error(`Failed to delete media ${mediaId}:`, err); if (!partialError) partialError = "部分舊圖片刪除失敗。"; }));
                    await Promise.allSettled(deletePromises);
                }

                // 3. 上傳新圖片
                if (photos.length > 0) {
                    const photoFormData = new FormData();
                    photos.forEach(p => photoFormData.append('photos', p));
                    try {
                        const uploadResponse = await apiClient.post(`/reviews/${reviewId}/media`, photoFormData, { headers: { 'Content-Type': 'multipart/form-data' } });
                        if (!uploadResponse.data?.success) throw new Error(uploadResponse.data?.message || '圖片上傳失敗');
                    } catch (err) { console.error(`Error uploading new photos:`, err); if (!partialError) partialError = `新圖片上傳失敗: ${err?.data?.message || err?.response?.data?.message || err?.message || '未知錯誤'}`; }
                }

                // 4. 處理最終結果
                if (partialError) { setError(partialError + " (請稍後刷新查看結果)"); }
                if (typeof onReviewUpdated === 'function') onReviewUpdated(); // 通知父組件刷新

            } else {
                // --- 新增評論或回覆 ---
                const finalRating = isReplyMode ? null : rating;
                const finalParentId = isReplyMode ? parentReviewId : null;
                const reviewDataPayload = { rating: finalRating, content: comment, parentReviewId: finalParentId };
                const formData = new FormData();
                formData.append('reviewData', new Blob([JSON.stringify(reviewDataPayload)], { type: 'application/json' }));
                photos.forEach(p => formData.append('photos', p));

                const response = await apiClient.post(`/reviews/shop/${shopId}`, formData, { headers: { 'Content-Type': 'multipart/form-data' } });

                if (response.data?.success) {
                    if (typeof onReviewAdded === 'function') onReviewAdded(response.data.data);
                    setRating(0); setComment(''); setPhotos([]); setPhotoPreviews([]); setError(''); // 清空表單
                } else { throw new Error(response.data?.message || '提交失敗'); }
            }
        } catch (err) {
            console.error("[AddReviewForm] Submit error:", err);
            setError(err?.data?.message || err?.response?.data?.message || err?.message || '提交時發生錯誤');
        } finally {
            setIsLoading(false);
        }
    };

    // --- 取消按鈕處理 ---
    const handleCancel = () => {
        if (typeof onCancelEdit === 'function') onCancelEdit();
        else { setRating(0); setComment(''); setPhotos([]); setPhotoPreviews([]); setError(''); setMediaToDelete([]); setExistingMedia([]); }
    };

    // --- 渲染 ---
    if (isAuthLoading) { return <Typography sx={{ p: 2 }}>正在檢查登入狀態...</Typography>; }
    if (!isAuthenticated) { return <Typography sx={{ p: 2 }}>請先登入才能發表或編輯評論。</Typography>; }

    const formTitle = reviewToEdit ? (isReplyMode || reviewToEdit.parentReviewId ? '編輯回覆' : '編輯評論') : (isReplyMode ? '發表回覆' : '發表評論');
    const submitButtonText = reviewToEdit ? '更新' : '送出'; // 統一按鈕文字
    const currentTotalPhotos = existingMedia.length - mediaToDelete.length + photos.length;

    return (
        <Box component="form" onSubmit={handleSubmit} sx={{ mt: 2, p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
            <Typography variant="h6" gutterBottom>{formTitle}</Typography>

            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

            {/* 評分：回覆模式不顯示 */}
            {!isReplyMode && (!reviewToEdit || !reviewToEdit.parentReviewId) && (
                <Box sx={{ mb: 2, display: 'flex', alignItems: 'center' }}>
                    <Typography component="legend" sx={{ mr: 1 }}>評分<span style={{color: 'red'}}>*</span>:</Typography>
                    <Rating name="rating" value={rating} onChange={handleRatingChange} disabled={isLoading} />
                     {rating > 0 && <Typography variant="body2" sx={{ ml: 1 }}>({rating} 星)</Typography>}
                </Box>
            )}

            {/* 內容 */}
            <TextField
                id={`comment-${parentReviewId || shopId || 'new'}`}
                label={isReplyMode ? '回覆內容' : '評論內容'}
                multiline rows={4} value={comment} onChange={handleCommentChange}
                placeholder={isReplyMode ? '輸入您的回覆...' : '分享您的用餐體驗...'}
                fullWidth required disabled={isLoading} variant="outlined" sx={{ mb: 2 }}
            />

            {/* 圖片上傳區域：回覆和編輯時都顯示 */}
            <Box sx={{ mb: 2 }}>
                 <Typography variant="subtitle1" gutterBottom>上傳照片 (選填，最多 5 張)</Typography>
                 {/* 圖片預覽網格 */}
                 {(existingMedia.length > 0 || photoPreviews.length > 0) && (
                     <Grid container spacing={1} sx={{ mb: 1 }}>
                         {/* 現有圖片 */}
                         {existingMedia.map(media => (
                             <Grid item xs={4} sm={3} md={2} key={`existing-${media.id}`}>
                                 <Card sx={{ position: 'relative', border: mediaToDelete.includes(media.id) ? '2px dashed red' : '1px solid transparent' }}>
                                     <CardMedia component="img" height="80" image={buildMediaUrl(media.url)} alt="已上傳照片" sx={{ objectFit: 'cover' }} />
                                     <IconButton size="small" onClick={() => handleToggleDeleteExistingMedia(media.id)} disabled={isLoading} sx={{ position: 'absolute', top: 2, right: 2, backgroundColor: 'rgba(0, 0, 0, 0.4)', color: 'white', '&:hover': { backgroundColor: 'rgba(0, 0, 0, 0.6)' } }} title={mediaToDelete.includes(media.id) ? '取消刪除' : '標記刪除'}>
                                         <DeleteIcon fontSize="small" />
                                     </IconButton>
                                 </Card>
                             </Grid>
                         ))}
                         {/* 新圖片預覽 */}
                         {photoPreviews.map((previewUrl, index) => (
                             <Grid item xs={4} sm={3} md={2} key={`new-${index}`}>
                                 <Card sx={{ position: 'relative' }}>
                                     <CardMedia component="img" height="80" image={previewUrl} alt={`預覽 ${index + 1}`} sx={{ objectFit: 'cover' }} />
                                     <IconButton size="small" onClick={() => handleRemoveNewPhoto(index)} disabled={isLoading} sx={{ position: 'absolute', top: 2, right: 2, backgroundColor: 'rgba(0, 0, 0, 0.4)', color: 'white', '&:hover': { backgroundColor: 'rgba(0, 0, 0, 0.6)' } }} title="移除此預覽">
                                         <RemoveCircleOutlineIcon fontSize="small" />
                                     </IconButton>
                                 </Card>
                             </Grid>
                         ))}
                     </Grid>
                 )}
                 {/* 文件選擇按鈕和提示 */}
                 <Box sx={{ display: 'flex', alignItems: 'center' }}>
                     <Button variant="outlined" component="label" startIcon={<CloudUploadIcon />} disabled={isLoading || currentTotalPhotos >= 5} sx={{ mr: 1 }}>
                         選擇檔案
                         <input type="file" accept="image/*" multiple onChange={handlePhotoChange} ref={fileInputRef} hidden />
                     </Button>
                     <Typography variant="body2" color="text.secondary">
                          (總共 {currentTotalPhotos} / 5 張)
                     </Typography>
                 </Box>
            </Box>

            {/* 操作按鈕 */}
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 3 }}>
                {(reviewToEdit || isReplyMode) && typeof onCancelEdit === 'function' && (
                    <Button onClick={handleCancel} variant="text" disabled={isLoading} sx={{ mr: 1 }}>
                        取消
                    </Button>
                )}
                <Button type="submit" variant="contained" color="primary" disabled={isLoading} startIcon={isLoading ? <CircularProgress size={20} color="inherit" /> : null}>
                    {isLoading ? '提交中' : submitButtonText}
                </Button>
            </Box>
        </Box>
    );
};

export default AddReviewForm;