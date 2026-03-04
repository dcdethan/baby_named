// utils/auth.ts
// 登录状态管理模块

import { invokeEdgeFunction } from './supabase'

// 用户信息类型
export interface UserInfo {
  id: string
  openid: string
  phoneNumber: string | null
  nickname: string | null
  avatarUrl: string | null
}

// 存储键名
const STORAGE_KEYS = {
  USER_INFO: 'user_info',
  OPENID: 'openid',
  PHONE: 'phone_number',
  SESSION_KEY: 'session_key',
  IS_LOGGED_IN: 'is_logged_in'
}

// 云函数名
const AUTH_FUNCTION = 'user-auth'

/**
 * 检查是否已登录
 */
export function isLoggedIn(): boolean {
  try {
    return wx.getStorageSync(STORAGE_KEYS.IS_LOGGED_IN) === true
  } catch {
    return false
  }
}

/**
 * 获取本地存储的用户信息
 */
export function getUser(): UserInfo | null {
  try {
    const userStr = wx.getStorageSync(STORAGE_KEYS.USER_INFO)
    return userStr ? JSON.parse(userStr) : null
  } catch {
    return null
  }
}

/**
 * 获取 openid
 */
export function getOpenId(): string | null {
  try {
    return wx.getStorageSync(STORAGE_KEYS.OPENID) || null
  } catch {
    return null
  }
}

/**
 * 获取手机号
 */
export function getPhoneNumber(): string | null {
  try {
    return wx.getStorageSync(STORAGE_KEYS.PHONE) || null
  } catch {
    return null
  }
}

/**
 * 保存 session_key 到本地（用于解密手机号）
 */
function saveSessionKey(sessionKey: string): void {
  try {
    wx.setStorageSync(STORAGE_KEYS.SESSION_KEY, sessionKey)
  } catch (e) {
    console.error('保存 session_key 失败:', e)
  }
}

/**
 * 获取 session_key
 */
function getSessionKey(): string | null {
  try {
    return wx.getStorageSync(STORAGE_KEYS.SESSION_KEY) || null
  } catch {
    return null
  }
}

/**
 * 保存用户信息到本地
 */
function saveUserToStorage(user: UserInfo): void {
  try {
    wx.setStorageSync(STORAGE_KEYS.USER_INFO, JSON.stringify(user))
    wx.setStorageSync(STORAGE_KEYS.OPENID, user.openid)
    if (user.phoneNumber) {
      wx.setStorageSync(STORAGE_KEYS.PHONE, user.phoneNumber)
    }
    wx.setStorageSync(STORAGE_KEYS.IS_LOGGED_IN, true)
  } catch (e) {
    console.error('保存用户信息失败:', e)
  }
}

/**
 * 清除登录状态
 */
export function logout(): void {
  try {
    wx.removeStorageSync(STORAGE_KEYS.USER_INFO)
    wx.removeStorageSync(STORAGE_KEYS.OPENID)
    wx.removeStorageSync(STORAGE_KEYS.PHONE)
    wx.removeStorageSync(STORAGE_KEYS.SESSION_KEY)
    wx.removeStorageSync(STORAGE_KEYS.IS_LOGGED_IN)
  } catch (e) {
    console.error('清除登录状态失败:', e)
  }
}

/**
 * 获取微信登录 session（用于后续解密手机号）
 * 返回 code，同时后端会缓存 session_key
 */
export async function getWxSession(): Promise<string> {
  return new Promise((resolve, reject) => {
    wx.login({
      success: async (res) => {
        if (!res.code) {
          reject(new Error('获取登录 code 失败'))
          return
        }
        resolve(res.code)
      },
      fail: (err) => {
        console.error('wx.login 失败:', err)
        reject(new Error('微信登录失败'))
      }
    })
  })
}

/**
 * 手机号登录
 * @param code wx.login 获取的 code
 * @param phoneCode getPhoneNumber 回调中的 code（新版API）
 */
export async function loginWithPhone(code: string, phoneCode: string): Promise<UserInfo> {
  try {
    const { data, error } = await invokeEdgeFunction<{
      success: boolean
      data?: { user: UserInfo }
      error?: string
    }>(AUTH_FUNCTION, {
      action: 'loginWithPhone',
      code,
      phoneCode
    })

    if (error || !data?.success || !data?.data?.user) {
      const errMsg = error?.message || data?.error || '登录失败'
      throw new Error(errMsg)
    }

    // 保存用户信息
    const user = data.data.user
    saveUserToStorage(user)

    return user
  } catch (e: any) {
    console.error('手机号登录失败:', e)
    throw e
  }
}

/**
 * 微信静默登录（保留用于兼容，但不推荐使用）
 * @deprecated 请使用 loginWithPhone
 */
export async function login(): Promise<UserInfo> {
  return new Promise((resolve, reject) => {
    // 调用微信登录获取 code
    wx.login({
      success: async (res) => {
        if (!res.code) {
          reject(new Error('获取登录 code 失败'))
          return
        }

        try {
          // 调用云函数进行登录
          const { data, error } = await invokeEdgeFunction<{
            success: boolean
            data?: { user: UserInfo }
            error?: string
          }>(AUTH_FUNCTION, {
            action: 'login',
            code: res.code
          })

          if (error || !data?.success || !data?.data?.user) {
            const errMsg = error?.message || data?.error || '登录失败'
            throw new Error(errMsg)
          }

          // 保存用户信息
          const user = data.data.user
          saveUserToStorage(user)

          resolve(user)
        } catch (e: any) {
          console.error('登录失败:', e)
          reject(e)
        }
      },
      fail: (err) => {
        console.error('wx.login 失败:', err)
        reject(new Error('微信登录失败'))
      }
    })
  })
}


/**
 * 更新用户信息
 */
export async function updateUserInfo(updates: {
  nickname?: string
  avatarUrl?: string
}): Promise<UserInfo> {
  const openid = getOpenId()
  if (!openid) {
    throw new Error('未登录')
  }

  const { data, error } = await invokeEdgeFunction<{
    success: boolean
    data?: { user: UserInfo }
    error?: string
  }>(AUTH_FUNCTION, {
    action: 'updateUser',
    openid,
    ...updates
  })

  if (error || !data?.success || !data?.data?.user) {
    throw new Error(error?.message || data?.error || '更新失败')
  }

  // 更新本地存储
  saveUserToStorage(data.data.user)

  return data.data.user
}

/**
 * 刷新用户信息
 */
export async function refreshUserInfo(): Promise<UserInfo | null> {
  const openid = getOpenId()
  if (!openid) {
    return null
  }

  try {
    const { data, error } = await invokeEdgeFunction<{
      success: boolean
      data?: { user: UserInfo }
      error?: string
    }>(AUTH_FUNCTION, {
      action: 'getUser',
      openid
    })

    if (error || !data?.success || !data?.data?.user) {
      return null
    }

    // 更新本地存储
    saveUserToStorage(data.data.user)

    return data.data.user
  } catch {
    return null
  }
}
