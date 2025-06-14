/**
 * JWT认证和权限检查工具
 */

import jwt from 'jsonwebtoken';
import { getDatabase } from './database';
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
export function saveAuthSession(token: string, user: User): Promise<void> {
  return new Promise((resolve, reject) => {
    try {
      const db = getDatabase();
      
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + SESSION_EXPIRE_HOURS);

      const stmt = db.prepare(`
        INSERT OR REPLACE INTO auth_sessions (token, user_id, username, role, expires_at)
        VALUES (?, ?, ?, ?, ?)
      `);

      stmt.run(token, user.id, user.username, user.role, expiresAt.toISOString());
      resolve();
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * 验证认证会话
 */
export function validateAuthSession(token: string): Promise<User | null> {
  return new Promise(async (resolve, reject) => {
    try {
      // 首先验证JWT token
      const tokenData = verifyToken(token);
      if (!tokenData) {
        resolve(null);
        return;
      }

      // 检查数据库中的会话
      const db = getDatabase();
      const stmt = db.prepare(`
        SELECT user_id, expires_at 
        FROM auth_sessions 
        WHERE token = ? AND expires_at > CURRENT_TIMESTAMP
      `);

      const session = stmt.get(token) as any;
      if (!session) {
        resolve(null);
        return;
      }

      // 获取用户信息
      const user = await getUserById(session.user_id);
      resolve(user);
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * 删除认证会话（登出）
 */
export function removeAuthSession(token: string): Promise<boolean> {
  return new Promise((resolve, reject) => {
    try {
      const db = getDatabase();
      const stmt = db.prepare('DELETE FROM auth_sessions WHERE token = ?');
      const result = stmt.run(token);
      resolve(result.changes > 0);
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * 清理过期的认证会话
 */
export function cleanupExpiredSessions(): Promise<number> {
  return new Promise((resolve, reject) => {
    try {
      const db = getDatabase();
      const stmt = db.prepare('DELETE FROM auth_sessions WHERE expires_at <= CURRENT_TIMESTAMP');
      const result = stmt.run();
      resolve(result.changes);
    } catch (error) {
      reject(error);
    }
  });
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