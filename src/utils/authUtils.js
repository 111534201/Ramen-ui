// src/utils/authUtils.js
import { jwtDecode } from 'jwt-decode'; // 確保 jwt-decode 已安裝

/**
 * 解碼 JWT Token 並提取用戶信息。
 * @param {string | null} token - JWT Token 字符串，或 null。
 * @returns {object | null} 包含用戶信息的對象，或 null (如果 token 無效)。
 */
export const decodeToken = (token) => {
    if (!token) {
        // console.log('[decodeToken] No token provided.');
        return null;
    }
    try {
        const decoded = jwtDecode(token);
        // 打印解碼後的 payload 以便調試
        //console.log('[decodeToken] Decoded Payload:', decoded);

        // --- 從 decoded payload 中提取信息 ---
        // !!! 這裡的鍵名 ('userId', 'sub', 'roles', 'ownedShopId', 'ownedShopIds')
        // !!! 必須與你後端 JwtServiceImpl 生成 Token 時放入 extraClaims 的鍵名完全一致 !!!
        const roles = Array.isArray(decoded.roles)
                      ? decoded.roles
                      : (decoded.roles ? [String(decoded.roles)] : []); // 確保 roles 是數組

        const ownedShopIds = Array.isArray(decoded.ownedShopIds)
                           ? decoded.ownedShopIds
                           : (decoded.ownedShopId ? [decoded.ownedShopId] : []); // 兼容列表或單個 ID

        const userInfo = {
            id: decoded.userId || decoded.sub, // 優先用 userId
            username: decoded.sub,              // 用戶名用 sub
            roles: roles,                      // 角色列表
            ownedShopIds: ownedShopIds,        // 店家 ID 列表
            ownedShopId: ownedShopIds.length > 0 ? ownedShopIds[0] : null // 提供第一個店家 ID 作為方便屬性
            // email: decoded.email || null, // 如果 Token 中有 email
        };
        // 再次打印最終生成的 userInfo 對象
       // console.log('[decodeToken] Parsed User Info:', userInfo);
        return userInfo;
        // --- ---

    } catch (error) {
        console.error("Failed to decode JWT:", error);
        // 如果解碼失敗，也清除本地 token (雖然 AuthProvider 也會做)
        // localStorage.removeItem('authToken');
        return null; // 返回 null 表示解碼失敗或 Token 無效
    }
};

// 可以添加其他與認證相關的工具函數，例如檢查 Token 是否過期等
// export const isTokenExpired = (token) => { ... };