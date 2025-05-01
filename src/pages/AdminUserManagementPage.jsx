// src/pages/AdminUserManagementPage.jsx
import React, { useState, useEffect, useCallback } from 'react';
import apiClient from '../services/api';
import useAuth from '../hooks/useAuth'; // 用於獲取當前登入的管理員信息
import { Role } from '../constants/roles'; // 引入角色常量，確保路徑正確
import { format } from 'date-fns';     // 用於格式化日期
import { zhTW } from 'date-fns/locale'; // 引入中文語系
import './AdminUserManagementPage.css'; // 引入頁面專屬樣式

const AdminUserManagementPage = () => {
  const { user: currentUser } = useAuth(); // 獲取當前登入的管理員信息
  const [users, setUsers] = useState([]);         // 存儲從 API 獲取的用戶列表
  const [isLoading, setIsLoading] = useState(true); // 頁面初始加載狀態
  const [error, setError] = useState(null);       // 存儲 API 錯誤信息
  const [operatingUserId, setOperatingUserId] = useState(null); // 記錄正在進行操作的用戶 ID，防止重複操作

  // --- 回調函數：從後端 API 獲取所有用戶列表 ---
  const fetchUsers = useCallback(async () => {
    setIsLoading(true); // 開始加載
    setError(null);     // 清除舊錯誤
    try {
      console.log('[AdminUserManagementPage] Fetching user list...');
      const response = await apiClient.get('/admin/users'); // 調用後端 API
      if (response.data?.success && Array.isArray(response.data.data)) {
        // 按照 ID 排序或按需排序
        const sortedUsers = response.data.data.sort((a, b) => a.id - b.id);
        setUsers(sortedUsers); // 更新用戶列表狀態
        console.log('[AdminUserManagementPage] Users fetched:', sortedUsers.length);
      } else {
        // API 返回不成功或數據格式錯誤
        throw new Error(response.data?.message || '無法獲取用戶列表');
      }
    } catch (err) {
      console.error('[AdminUserManagementPage] Error fetching users:', err);
      // 根據錯誤來源提取錯誤信息
      const errorMsg = err?.data?.message || err?.message || '載入用戶列表時發生錯誤';
      setError(errorMsg); // 設置錯誤狀態
      setUsers([]); // 清空列表
    } finally {
      setIsLoading(false); // 結束加載
    }
  }, []); // 空依賴數組，此回調本身不依賴外部變量

  // --- 組件首次掛載時執行一次用戶獲取 ---
  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]); // 依賴 fetchUsers 回調

  // --- 回調函數：修改用戶角色 ---
  const handleRoleChange = async (userId, currentRole) => {
    // 確定目標角色
    const newRole = currentRole === Role.ROLE_ADMIN ? Role.ROLE_USER : Role.ROLE_ADMIN;
    const roleString = newRole === Role.ROLE_ADMIN ? '管理員' : '食客';

    // 彈出確認框
    if (window.confirm(`確定要將用戶 ID ${userId} 的角色變更為 ${roleString} 嗎？\n(店家角色無法在此變更)`)) {
       setOperatingUserId(userId); // 標記正在操作此用戶
       setError(null); // 清除之前的錯誤
      try {
        console.log(`[AdminUserManagementPage] Updating role for user ${userId} to ${newRole}`);
        // 調用後端 API 更新角色
        await apiClient.patch(`/admin/users/${userId}/role`, { role: newRole });
        alert('用戶角色更新成功！'); // 提示成功
        fetchUsers(); // 重新加載用戶列表以顯示最新狀態
      } catch (err) {
        console.error(`[AdminUserManagementPage] Error updating role for user ${userId}:`, err);
        const errorMsg = err?.data?.message || err?.message || '更新角色失敗';
        setError(errorMsg); // 顯示錯誤信息
         alert(`更新角色失敗: ${errorMsg}`);
      } finally {
           setOperatingUserId(null); // 清除正在操作的標記
      }
    }
  };

  // --- 回調函數：啟用/禁用用戶 ---
  const handleToggleEnable = async (userId, currentEnabledStatus) => {
    const action = currentEnabledStatus ? '禁用' : '啟用'; // 確定操作文本
    // 彈出確認框
    if (window.confirm(`確定要 ${action} 用戶 ID ${userId} 嗎？`)) {
        setOperatingUserId(userId); // 標記正在操作
        setError(null); // 清除錯誤
      try {
        console.log(`[AdminUserManagementPage] Setting enabled=${!currentEnabledStatus} for user ${userId}`);
        // 調用後端 API 更新啟用狀態
        await apiClient.patch(`/admin/users/${userId}/enabled`, { enabled: !currentEnabledStatus });
        alert(`用戶帳號已成功${action}！`); // 提示成功
        fetchUsers(); // 刷新列表
      } catch (err) {
        console.error(`[AdminUserManagementPage] Error toggling enabled for user ${userId}:`, err);
         const errorMsg = err?.data?.message || err?.message || `${action}用戶失敗`;
         setError(errorMsg); // 顯示錯誤
         alert(`${action}用戶失敗: ${errorMsg}`);
      } finally {
           setOperatingUserId(null); // 清除標記
      }
    }
  };

  // --- 回調函數：刪除用戶 ---
  const handleDeleteUser = async (userIdToDelete, usernameToDelete) => {
    // 顯示極其危險操作的確認框
    if (!window.confirm(`【！！！高風險操作！！！】\n確定要永久刪除用戶 "${usernameToDelete}" (ID: ${userIdToDelete}) 嗎？\n\n此操作將刪除該用戶的所有資料，包括：\n- 用戶帳號本身\n- 該用戶擁有的所有店家資訊\n- 該店家下的所有評論\n- 該用戶發表的所有評論和回覆\n- 所有相關上傳的照片和媒體文件\n\n此操作無法恢復！請謹慎確認！`)) {
      return; // 用戶取消
    }

    setOperatingUserId(userIdToDelete); // 標記正在操作
    setError(null);
    try {
      console.warn(`[AdminUserManagementPage] Attempting to delete user ${userIdToDelete} (${usernameToDelete})...`); // 使用 warn 級別
      // 調用後端刪除用戶 API
      await apiClient.delete(`/admin/users/${userIdToDelete}`);
      alert(`用戶 "${usernameToDelete}" 已成功永久刪除。`);
      fetchUsers(); // 刷新用戶列表
    } catch (err) {
      console.error(`[AdminUserManagementPage] Error deleting user ${userIdToDelete}:`, err);
      const errorMsg = err?.data?.message || err?.message || '刪除用戶失敗';
      setError(errorMsg);
      alert(`刪除用戶失敗: ${errorMsg}`);
    } finally {
      setOperatingUserId(null); // 清除操作標記
    }
  };

   // --- 輔助函數：格式化日期時間 ---
   const formatDateTime = (dateTimeString) => {
       if (!dateTimeString) return 'N/A';
       try {
           // 使用 date-fns 格式化，顯示年月日和時間
           return format(new Date(dateTimeString), 'yyyy/MM/dd HH:mm', { locale: zhTW });
       } catch (e) {
           console.error("Error formatting date:", dateTimeString, e);
           return '無效日期'; // 返回錯誤提示
       }
   }

  // --- 渲染邏輯 ---
  return (
    <div className="admin-user-management-page page-container"> {/* 使用 page-container 作為基礎容器 */}
      <h1>用戶管理</h1>

      {/* 加載狀態 */}
      {isLoading && <div className="loading" style={{marginTop: '2rem'}}>載入用戶列表中...</div>}
      {/* 錯誤提示 */}
      {error && <div className="error-message" style={{ marginBottom: '1rem' }}>錯誤: {error}</div>}

      {/* 無用戶數據提示 */}
      {!isLoading && !error && users.length === 0 && <p style={{marginTop: '2rem', textAlign: 'center'}}>目前沒有其他用戶。</p>}

      {/* 用戶表格 */}
      {!isLoading && users.length > 0 && (
        <div className="user-table-container">
          <table className="user-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>用戶名</th>
                <th>Email</th>
                <th>角色</th>
                <th>狀態</th>
                <th>註冊時間</th>
                <th>最後更新</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {users.map(user => {
                const isCurrentUser = currentUser?.id === user.id; // 是否為當前登入的管理員
                const isOperating = operatingUserId === user.id; // 是否正在對此用戶進行操作

                return (
                  <tr key={user.id} className={isOperating ? 'operating' : ''}>
                    <td>{user.id}</td>
                    <td>{user.username}</td>
                    <td>{user.email}</td>
                    <td>
                      {/* 根據角色顯示不同文本 */}
                      {user.role === Role.ROLE_ADMIN && '管理員'}
                      {user.role === Role.ROLE_USER && '食客'}
                      {user.role === Role.ROLE_SHOP_OWNER && '店家'}
                      {/* 可以添加其他角色顯示 */}
                    </td>
                    <td>
                      {/* 狀態標籤 */}
                      <span className={`status-badge ${user.enabled ? 'enabled' : 'disabled'}`}>
                        {user.enabled ? '啟用中' : '已禁用'}
                      </span>
                    </td>
                    <td>{formatDateTime(user.createdAt)}</td>
                    <td>{formatDateTime(user.updatedAt)}</td>
                    <td>
                       {/* 操作按鈕容器 */}
                       <div className="action-buttons">
                           {/* 修改角色按鈕: 不能修改店家角色, 不能修改自己 */}
                           {(user.role === Role.ROLE_USER || user.role === Role.ROLE_ADMIN) && !isCurrentUser && (
                                <button
                                    onClick={() => handleRoleChange(user.id, user.role)}
                                    disabled={isOperating} // 操作中禁用
                                    className="action-button role-button"
                                    title={`變更為 ${user.role === Role.ROLE_ADMIN ? '食客' : '管理員'}`}
                                >
                                  {isOperating ? '...' : (user.role === Role.ROLE_ADMIN ? '設為食客' : '設為管理員')}
                                </button>
                            )}
                           {/* 啟用/禁用按鈕: 不能禁用自己 */}
                           {!isCurrentUser && (
                                <button
                                    onClick={() => handleToggleEnable(user.id, user.enabled)}
                                    disabled={isOperating}
                                    className={`action-button enable-button ${user.enabled ? 'disable' : 'enable'}`}
                                    title={`${user.enabled ? '禁用' : '啟用'}此帳號`}
                                >
                                  {isOperating ? '...' : (user.enabled ? '禁用' : '啟用')}
                                </button>
                           )}
                           {/* 刪除用戶按鈕: 不能刪除自己 */}
                           {!isCurrentUser && (
                               <button
                                   onClick={() => handleDeleteUser(user.id, user.username)}
                                   disabled={isOperating}
                                   className="action-button delete-button"
                                   title={`永久刪除用戶 ${user.username} (高風險!)`}
                               >
                                 {isOperating ? '刪除中...' : '刪除'}
                               </button>
                           )}
                       </div>
                    </td>
                  </tr>
                );
               })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default AdminUserManagementPage;