// src/pages/ManageEventsPage.jsx
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
// --- 導入服務、組件和 Hook ---
import {
    getEventsByShop,            // 店家獲取自己的活動
    createEvent,
    updateEvent,
    deleteEvent,
    hideEventByAdmin,           // 管理員下架活動
    addEventMedia,
    deleteEventMedia,
    getAdminFilteredEvents      // <-- 管理員獲取/篩選活動 (新)
} from '../services/api';      // <-- 確認 api.js 已更新
import useAuth from '../hooks/useAuth';
import { Role } from '../constants/roles';
import EventCard from '../components/EventCard';
import EventForm from '../components/EventForm';
import Pagination from '../components/Pagination';
import NotFoundPage from './NotFoundPage';

// --- 導入樣式 ---
import './ManageEventsPage.css';
import './ShopListPage.css';      // 復用列表頁樣式 (篩選器, 分頁等)
import './AdminUserManagementPage.css'; // 復用管理頁面樣式 (按鈕等)
import '../components/ShopForm.css'; // EventForm 可能依賴的樣式

const ManageEventsPage = () => {
    const { user, isAuthenticated, isLoading: isAuthLoading } = useAuth();
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();

    // --- 頁面狀態 ---
    const [events, setEvents] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [pagination, setPagination] = useState({ currentPage: 0, totalPages: 0, totalElements: 0, pageSize: 10 });
    const [adminStatusFilter, setAdminStatusFilter] = useState(''); // 管理員的狀態篩選

    // --- UI 模式控制 ---
    const [mode, setMode] = useState('view'); // 'view', 'add', 'edit'
    const [editingEvent, setEditingEvent] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [formError, setFormError] = useState('');

    // --- 獲取用戶角色和店家 ID ---
    const isAdmin = useMemo(() => user?.roles?.includes(Role.ROLE_ADMIN), [user]);
    const isShopOwner = useMemo(() => user?.roles?.includes(Role.ROLE_SHOP_OWNER), [user]);
    const ownerShopId = useMemo(() => (isShopOwner && user?.ownedShopIds?.length > 0 ? user.ownedShopIds[0] : null), [user, isShopOwner]);

    // --- 從 URL 獲取參數 ---
    const getCurrentPageFromUrl = useCallback(() => {
        const page = parseInt(searchParams.get('page') || '0', 10);
        return isNaN(page) || page < 0 ? 0 : page;
    }, [searchParams]);

    // --- 效果：從 URL 同步管理員篩選狀態 ---
    useEffect(() => {
        if (isAdmin) {
            setAdminStatusFilter(searchParams.get('status') || '');
        }
    }, [searchParams, isAdmin]);


    // --- 獲取活動數據 (核心修改處) ---
    const fetchManagedEvents = useCallback(async () => {
        if (isAuthLoading || !isAuthenticated) return;

        setIsLoading(true);
        setError(null);
        const page = getCurrentPageFromUrl();
        const size = pagination.pageSize;
        // 管理員和店家使用不同的預設排序
        const sortBy = isAdmin ? 'createdAt' : 'startDate';
        const sortDir = 'DESC';
        const pageableParams = { page, size, sortBy, sortDir };

        try {
            let apiResponse;
            if (isAdmin) {
                // *** 管理員邏輯：調用新的 Admin API ***
                console.log(`[ManageEventsPage] Admin view: Fetching events with status filter: '${adminStatusFilter}'`);
                const adminParams = { ...pageableParams };
                if (adminStatusFilter) {
                    adminParams.status = adminStatusFilter; // 添加狀態過濾參數
                }
                // 可選：未來可在此添加 shopId 等其他管理員篩選參數
                // if (adminShopFilter) { adminParams.shopId = adminShopFilter; }

                // === 調用新的管理員 API ===
                apiResponse = await getAdminFilteredEvents(adminParams);
                // =======================

            } else if (isShopOwner && ownerShopId) {
                 // *** 店家邏輯：獲取自己店家的所有活動 ***
                 console.log(`[ManageEventsPage] Shop Owner view: Fetching all events for shop ${ownerShopId}`);
                 // 傳遞 null 或不傳 statusFilter 以獲取所有狀態
                 apiResponse = await getEventsByShop(ownerShopId, { ...pageableParams }); // 確保 params 裡沒有 status

            } else {
                 // 邏輯上不應到達此處，因為有權限檢查
                 throw new Error("無法確定用戶角色或店家信息");
            }

             // --- 處理 API 響應 (通用部分) ---
             if (apiResponse?.success && apiResponse.data && typeof apiResponse.data === 'object') {
                 const pageData = apiResponse.data; // data 應為 PageResponse<EventDTO>
                 if (!Array.isArray(pageData.content)) {
                      console.error("[ManageEventsPage] API response data.content is not an array:", pageData);
                      throw new Error('後端返回的活動列表格式不正確');
                  }
                 setEvents(pageData.content || []);
                 setPagination(prev => ({
                     ...prev,
                     currentPage: pageData.pageNo ?? 0,
                     totalPages: pageData.totalPages ?? 0,
                     totalElements: pageData.totalElements ?? 0,
                     // pageSize 保持不變
                 }));
             } else {
                 // API 返回明確的失敗或數據格式錯誤
                 console.error("[ManageEventsPage] API call failed or returned unexpected format:", apiResponse);
                 throw new Error(apiResponse?.message || "無法獲取活動列表");
             }
             // --- ---

        } catch (err) {
            // 捕獲所有錯誤 (網絡錯誤、後端 500/400、數據格式錯誤等)
            const errMsg = err?.data?.message // 嘗試從 Axios 錯誤響應中獲取
                         || err?.message       // 或者使用 JS Error 的 message
                         || '無法載入活動資訊'; // 最終的通用錯誤
            console.error("[ManageEventsPage] Error fetching events:", errMsg, err);
            setError(errMsg);
            setEvents([]); // 清空列表
            setPagination(prev => ({ ...prev, currentPage: 0, totalPages: 0, totalElements: 0 })); // 重置分頁
        } finally {
            setIsLoading(false);
        }
    }, [isAuthLoading, isAuthenticated, isAdmin, isShopOwner, ownerShopId, getCurrentPageFromUrl, pagination.pageSize, adminStatusFilter]); // 保持 adminStatusFilter 依賴

    // --- 效果：組件掛載或 URL/篩選變化時獲取數據 ---
    useEffect(() => {
        if (isAuthenticated) {
            fetchManagedEvents();
        } else if (!isAuthLoading) { // 認證加載完成但未登入
            setIsLoading(false);
            setError("請先登入以管理活動。"); // 或者 ProtectedRoute 會處理跳轉
        }
    }, [isAuthenticated, isAuthLoading, searchParams, adminStatusFilter, fetchManagedEvents]); // 包含所有依賴項

    // --- 事件處理函數 ---
    const handlePageChange = (pageNumber) => {
        const newParams = new URLSearchParams(searchParams);
        newParams.set('page', pageNumber.toString());
        setSearchParams(newParams);
        window.scrollTo({ top: 0, behavior: 'smooth' }); // 跳轉到頁面頂部
    };

    const handleShowAddForm = () => {
        if (!isShopOwner || !ownerShopId) {
            alert("只有店家才能新增活動");
            return;
        }
        setMode('add');
        setEditingEvent(null);
        setFormError('');
    };

    const handleShowEditForm = (eventToEdit) => {
        setMode('edit');
        setEditingEvent(eventToEdit);
        setFormError('');
    };

    const handleCancelForm = () => {
        setMode('view');
        setEditingEvent(null);
        setFormError('');
    };

    const handleSubmitEvent = async ({ eventFormData, newFiles, deletedMediaIds }) => {
        if (!ownerShopId && mode === 'add' && !isAdmin) {
            setFormError("無法確定要為哪個店家新增活動。");
            return;
        }
        setIsSubmitting(true);
        setFormError('');
        try {
            let savedOrUpdatedEvent;
            if (mode === 'add') {
                console.log("[ManageEventsPage] Submitting new event:", eventFormData);
                 const createApiResponse = await createEvent(ownerShopId, eventFormData, newFiles);
                 if (!createApiResponse?.success || !createApiResponse.data) {
                     throw new Error(createApiResponse?.message || '新增活動失敗');
                 }
                 savedOrUpdatedEvent = createApiResponse.data;
                 alert("活動已成功發布！"); // 修改提示

            } else if (mode === 'edit' && editingEvent) {
                console.log("[ManageEventsPage] Submitting updated event:", editingEvent.id, eventFormData);
                 const updateApiResponse = await updateEvent(editingEvent.id, eventFormData);
                 if (!updateApiResponse?.success || !updateApiResponse.data) {
                     throw new Error(updateApiResponse?.message || '更新活動資訊失敗');
                 }
                 savedOrUpdatedEvent = updateApiResponse.data;
                 console.log("[ManageEventsPage] Event info updated.");

                 // 處理媒體刪除 (Promise.allSettled 保持不變)
                 if (deletedMediaIds && deletedMediaIds.length > 0) {
                     console.log("[ManageEventsPage] Deleting media IDs:", deletedMediaIds);
                     const deletePromises = deletedMediaIds.map(mediaId =>
                         deleteEventMedia(editingEvent.id, mediaId)
                             .catch(err => ({ id: mediaId, error: err?.data?.message || err?.message || '刪除失敗' }))
                     );
                     await Promise.allSettled(deletePromises);
                 }
                 // 處理新媒體上傳 (保持不變)
                 if (newFiles && newFiles.length > 0) {
                    console.log("[ManageEventsPage] Adding new media:", newFiles.length);
                     try {
                          const addMediaResponse = await addEventMedia(editingEvent.id, newFiles);
                          if (!addMediaResponse?.success) console.warn("更新活動資訊成功，但添加新媒體時出錯:", addMediaResponse?.message);
                          else savedOrUpdatedEvent = addMediaResponse.data;
                     } catch (uploadError) { console.warn("更新活動資訊成功，但添加新媒體時拋出異常:", uploadError); }
                 }
                 alert("活動更新成功！");
            } else {
                throw new Error("無效的操作模式或缺少編輯數據");
            }
            setMode('view');
            fetchManagedEvents(); // 重新加載列表
        } catch (err) {
             const errMsg = err?.data?.message || err?.message || '提交活動時發生錯誤';
             console.error("[ManageEventsPage] Submit event failed:", errMsg, err);
             setFormError(errMsg);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDeleteEvent = async (eventIdToDelete) => {
        if (!window.confirm(`確定要刪除活動 ID: ${eventIdToDelete} 嗎？此操作無法復原。`)) return;
         console.warn(`[ManageEventsPage] Attempting to delete event ID: ${eventIdToDelete}`);
         setIsLoading(true);
         try {
             const apiResponse = await deleteEvent(eventIdToDelete);
             if (apiResponse?.success) {
                  alert("活動已成功刪除。");
                  fetchManagedEvents(); // 刷新列表
             } else {
                  throw new Error(apiResponse?.message || '刪除活動失敗');
             }
         } catch (err) {
              const errMsg = err?.data?.message || err?.message || '刪除活動時發生錯誤';
              console.error("[ManageEventsPage] Delete event failed:", errMsg, err);
              setError(errMsg); // 顯示頁面錯誤
              alert(`刪除失敗: ${errMsg}`); // 同時 alert
         } finally {
              setIsLoading(false);
         }
    };

    // --- 管理員下架事件處理 (保持不變) ---
    const handleHideEvent = async (eventIdToHide) => {
        if (!isAdmin) return;
        const notes = window.prompt("請輸入下架理由（可選）：");
        if (notes === null) return; // 用戶取消

        console.warn(`[ManageEventsPage] Admin hiding event ID: ${eventIdToHide} with notes: ${notes}`);
        setIsLoading(true);
        try {
            const apiResponse = await hideEventByAdmin(eventIdToHide, notes || '');
            if (apiResponse?.success) {
                alert("活動已成功下架。");
                fetchManagedEvents();
            } else { throw new Error(apiResponse?.message || '下架活動失敗'); }
        } catch (err) {
            const errMsg = err?.data?.message || err?.message || '下架活動時發生錯誤';
            console.error("[ManageEventsPage] Hide event failed:", errMsg, err);
            setError(errMsg);
            alert(`下架失敗: ${errMsg}`);
        } finally { setIsLoading(false); }
    };

    // --- 處理管理員狀態篩選 (保持不變) ---
    const handleAdminStatusFilterChange = (event) => {
        const newStatus = event.target.value;
        const newParams = new URLSearchParams(searchParams);
        if (newStatus) { newParams.set('status', newStatus); }
        else { newParams.delete('status'); }
        newParams.set('page', '0');
        setSearchParams(newParams);
    };

    // --- 權限檢查 ---
    if (isAuthLoading) { return <div className="loading">檢查權限中...</div>; }
    if (!isAuthenticated || (!isAdmin && !isShopOwner)) { return <NotFoundPage message="您需要以店家或管理員身份登入才能訪問此頁面。" />; }
    if (isShopOwner && !ownerShopId) { return <NotFoundPage message="無法獲取您的店家信息，請嘗試重新登入或聯繫管理員。" />; }

    // --- 渲染 ---
    return (
        <div className={`page-container manage-events-page ${isAdmin ? 'admin-view' : 'owner-view'}`}>
            <h1>{isAdmin ? '活動管理 (管理員)' : '我的活動管理'}</h1>

             {error && !formError && <div className="error page-error">{error}</div>}

            {mode === 'view' && (
                <>
                    {isShopOwner && ( <div className="page-actions"><button onClick={handleShowAddForm} className="add-button">+ 新增活動</button></div> )}
                    {isAdmin && (
                         <div className="admin-filters filter-sort-controls">
                            <fieldset className="filter-group">
                                <legend>篩選活動</legend>
                                <div className="controls-wrapper">
                                    <div className="control-item">
                                        <label htmlFor="admin-status-filter">狀態: </label>
                                        <select id="admin-status-filter" value={adminStatusFilter} onChange={handleAdminStatusFilterChange} disabled={isLoading}>
                                            <option value="">所有狀態</option>
                                            <option value="ACTIVE">進行中 (Active)</option>
                                            <option value="UPCOMING">即將開始 (Upcoming)</option>
                                            <option value="EXPIRED">已結束 (Expired)</option>
                                            <option value="CANCELLED">已下架/取消 (Cancelled)</option>
                                            <option value="REJECTED">已拒絕 (Rejected)</option>
                                            <option value="PENDING_APPROVAL">待審核 (Pending)</option> {/* 雖然已移除流程，但可能還有舊數據 */}
                                            <option value="DRAFT">草稿 (Draft)</option> {/* 如果後端支持 */}
                                        </select>
                                    </div>
                                    {/* TODO: 添加按店家篩選 */}
                                </div>
                            </fieldset>
                         </div>
                     )}

                     {/* 加載、錯誤、無結果提示 */}
                     {isLoading && events.length === 0 && <div className="loading list-loading">載入活動中...</div>}
                     {!isLoading && error && <div className="error list-error">錯誤: {error}</div>} {/* 確保錯誤時也顯示 */}
                     {!isLoading && !error && events.length === 0 && ( <div className="no-results list-no-results">目前沒有符合條件的活動記錄。</div> )}

                     {/* 活動列表 */}
                     {events.length > 0 && (
                        <>
                             {isLoading && <div className="loading list-loading-update">更新列表中...</div>}
                             <div className="event-list-grid shop-list-grid manage-event-grid">
                                 {events.map(event => (
                                     event && event.id ? (
                                         <div key={event.id} className="manage-event-item">
                                             <EventCard
                                                 event={event}
                                                 showManagementButtons={true} // 在管理頁顯示按鈕
                                                 showStatus={true} // 顯示狀態標籤
                                                 // 編輯權限：管理員 或 店家本人
                                                 onEdit={isAdmin || (isShopOwner && event.shopId === ownerShopId) ? handleShowEditForm : null}
                                                 // 刪除權限：管理員 或 店家本人 (後端會檢查狀態)
                                                 onDelete={isAdmin || (isShopOwner && event.shopId === ownerShopId) ? handleDeleteEvent : null}
                                              />
                                              {/* 管理員下架按鈕 (移除舊的審核按鈕) */}
                                              {isAdmin && !['CANCELLED', 'REJECTED', 'EXPIRED'].includes(event.status?.toUpperCase()) && (
                                                   <div className="admin-actions">
                                                       <button
                                                           onClick={() => handleHideEvent(event.id)}
                                                           className="action-button hide-event-button" // 使用新樣式
                                                           disabled={isLoading}
                                                           title="將此活動下架，設為非公開狀態"
                                                       >
                                                           下架活動
                                                       </button>
                                                   </div>
                                              )}
                                         </div>
                                     ) : null
                                 ))}
                             </div>
                             {/* 分頁 */}
                             {pagination.totalPages > 1 && !isLoading && (
                                 <div className="pagination-container">
                                     <Pagination currentPage={pagination.currentPage} totalPages={pagination.totalPages} onPageChange={handlePageChange} />
                                 </div>
                             )}
                         </>
                     )}
                </>
            )}

            {/* 新增/編輯表單 */}
            {(mode === 'add' || mode === 'edit') && (
                <div className="form-section">
                    <EventForm
                        isEditMode={mode === 'edit'}
                        initialData={editingEvent}
                        onSubmit={handleSubmitEvent}
                        isSubmitting={isSubmitting}
                        error={formError}
                        onCancel={handleCancelForm}
                     />
                </div>
            )}

        </div>
    );
};

export default ManageEventsPage;