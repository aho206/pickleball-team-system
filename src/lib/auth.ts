/**
 * JWT认证和权限检查工具
 */

import jwt from 'jsonwebtoken';
import { 
  saveAuthSession as saveAuthSessionToDB,
  getAuthSession,
  deleteAuthSession,
  cleanupExpiredAuthSessions,
  updateUserLastLogin
} from './database';
import { AuthSession, User } from './types';
import { getUserById } from './user-store';

// JWT密钥 (生产环境应该使用环境变量)
const JWT_SECRET = process.env.JWT_SECRET || 'pickleball-secret-key-2024';

// 会话过期时间 (24小时)
const SESSION_EXPIRE_HOURS = 24;

/**
 * 生成JWT token
 */
export function generateToken(user: User): string {
  const payload = {
    userId: user.id,
    username: user.username,
    role: user.role,
    exp: Math.floor(Date.now() / 1000) + (SESSION_EXPIRE_HOURS * 60 * 60), // 24小时后过期
  };

  return jwt.sign(payload, JWT_SECRET);
}

/**
 * 验证JWT token
 */
export function verifyToken(token: string): { userId: string; username: string; role: string } | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    return {
      userId: decoded.userId,
      username: decoded.username,
      role: decoded.role,
    };
  } catch (error) {
    return null;
  }
}

/**
 * 保存认证会话到数据库
 */
export async function saveAuthSession(token: string, user: User): Promise<void> {
  try {
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + SESSION_EXPIRE_HOURS);

    await saveAuthSessionToDB(token, user.id, user.username, user.role, expiresAt);
    
    // 更新用户最后登录时间
    await updateUserLastLogin(user.id);
  } catch (error) {
    console.error('[Auth] 保存认证会话失败:', error);
    throw error;
  }
}

/**
 * 验证认证会话
 */
export async function validateAuthSession(token: string): Promise<User | null> {
  try {
    // 首先验证JWT token
    const tokenData = verifyToken(token);
    if (!tokenData) {
      return null;
    }

    // 检查数据库中的会话
    const session = await getAuthSession(token);
    if (!session) {
      return null;
    }

    // 获取用户信息
    const user = await getUserById(session.userId);
    return user;
  } catch (error) {
    console.error('[Auth] 验证认证会话失败:', error);
    return null;
  }
}

/**
 * 删除认证会话（登出）
 */
export async function removeAuthSession(token: string): Promise<boolean> {
  try {
    await deleteAuthSession(token);
    return true;
  } catch (error) {
    console.error('[Auth] 删除认证会话失败:', error);
    return false;
  }
}

/**
 * 清理过期的认证会话
 */
export async function cleanupExpiredSessions(): Promise<number> {
  try {
    await cleanupExpiredAuthSessions();
    return 0; // PostgreSQL版本不返回删除数量，SQLite版本会在控制台输出
  } catch (error) {
    console.error('[Auth] 清理过期会话失败:', error);
    return 0;
  }
}

/**
 * 检查用户是否有权限管理指定会话
 */
export function canManageSession(userId: string, userRole: string, sessionCreatedBy: string): boolean {
  // 超级管理员可以管理所有会话
  if (userRole === 'superadmin') {
    return true;
  }

  // 管理员只能管理自己创建的会话
  if (userRole === 'admin' && userId === sessionCreatedBy) {
    return true;
  }

  return false;
}

/**
 * 检查用户是否有超级管理员权限
 */
export function isSuperAdmin(userRole: string): boolean {
  return userRole === 'superadmin';
}

/**
 * 检查用户是否有管理员权限（包括超级管理员）
 */
export function isAdmin(userRole: string): boolean {
  return userRole === 'admin' || userRole === 'superadmin';
} 