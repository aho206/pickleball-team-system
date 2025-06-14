/**
 * 用户存储和管理系统
 */

import { getDatabase } from './database';
import { User, CreateUserRequest, PasswordPolicy } from './types';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';

// 密码策略
export const PASSWORD_POLICY: PasswordPolicy = {
  minLength: 6,
  requireUppercase: true,
  requireLowercase: true,
  requireNumbers: true,
};

/**
 * 验证密码是否符合策略
 */
export function validatePassword(password: string): { valid: boolean; error?: string } {
  if (password.length < PASSWORD_POLICY.minLength) {
    return { valid: false, error: `密码长度至少${PASSWORD_POLICY.minLength}位` };
  }

  if (PASSWORD_POLICY.requireUppercase && !/[A-Z]/.test(password)) {
    return { valid: false, error: '密码必须包含大写字母' };
  }

  if (PASSWORD_POLICY.requireLowercase && !/[a-z]/.test(password)) {
    return { valid: false, error: '密码必须包含小写字母' };
  }

  if (PASSWORD_POLICY.requireNumbers && !/\d/.test(password)) {
    return { valid: false, error: '密码必须包含数字' };
  }

  return { valid: true };
}

/**
 * 创建用户
 */
export function createUser(userData: CreateUserRequest, createdBy: string): Promise<User> {
  return new Promise((resolve, reject) => {
    try {
      const db = getDatabase();

      // 验证密码
      const passwordValidation = validatePassword(userData.password);
      if (!passwordValidation.valid) {
        reject(new Error(passwordValidation.error));
        return;
      }

      // 检查用户名是否已存在
      const existingUser = db.prepare('SELECT id FROM users WHERE username = ?').get(userData.username);
      if (existingUser) {
        reject(new Error('用户名已存在'));
        return;
      }

      // 创建用户
      const userId = uuidv4();
      const passwordHash = bcrypt.hashSync(userData.password, 10);

      const insertStmt = db.prepare(`
        INSERT INTO users (id, username, password_hash, role, created_by, is_active)
        VALUES (?, ?, ?, ?, ?, ?)
      `);

      insertStmt.run(userId, userData.username, passwordHash, userData.role, createdBy, 1);

      // 返回创建的用户（不包含密码）
      const user: User = {
        id: userId,
        username: userData.username,
        passwordHash: '', // 不返回密码哈希
        role: userData.role,
        createdBy,
        createdAt: new Date(),
        isActive: true,
      };

      resolve(user);
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * 验证用户登录
 */
export function validateUserLogin(username: string, password: string): Promise<User | null> {
  return new Promise((resolve, reject) => {
    try {
      const db = getDatabase();

      const stmt = db.prepare(`
        SELECT id, username, password_hash, role, created_by, created_at, last_login, is_active
        FROM users 
        WHERE username = ? AND is_active = 1
      `);

      const row = stmt.get(username) as any;

      if (!row) {
        resolve(null);
        return;
      }

      // 验证密码
      const isValidPassword = bcrypt.compareSync(password, row.password_hash);
      if (!isValidPassword) {
        resolve(null);
        return;
      }

      // 更新最后登录时间
      const updateStmt = db.prepare('UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?');
      updateStmt.run(row.id);

      const user: User = {
        id: row.id,
        username: row.username,
        passwordHash: row.password_hash,
        role: row.role,
        createdBy: row.created_by,
        createdAt: new Date(row.created_at),
        lastLogin: new Date(),
        isActive: Boolean(row.is_active),
      };

      resolve(user);
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * 根据ID获取用户
 */
export function getUserById(userId: string): Promise<User | null> {
  return new Promise((resolve, reject) => {
    try {
      const db = getDatabase();

      const stmt = db.prepare(`
        SELECT id, username, password_hash, role, created_by, created_at, last_login, is_active
        FROM users 
        WHERE id = ? AND is_active = 1
      `);

      const row = stmt.get(userId) as any;

      if (!row) {
        resolve(null);
        return;
      }

      const user: User = {
        id: row.id,
        username: row.username,
        passwordHash: row.password_hash,
        role: row.role,
        createdBy: row.created_by,
        createdAt: new Date(row.created_at),
        lastLogin: row.last_login ? new Date(row.last_login) : undefined,
        isActive: Boolean(row.is_active),
      };

      resolve(user);
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * 获取所有用户列表（仅超级管理员）
 */
export function getAllUsers(): Promise<User[]> {
  return new Promise((resolve, reject) => {
    try {
      const db = getDatabase();

      const stmt = db.prepare(`
        SELECT id, username, role, created_by, created_at, last_login, is_active
        FROM users 
        ORDER BY created_at DESC
      `);

      const rows = stmt.all() as any[];

      const users: User[] = rows.map(row => ({
        id: row.id,
        username: row.username,
        passwordHash: '', // 不返回密码哈希
        role: row.role,
        createdBy: row.created_by,
        createdAt: new Date(row.created_at),
        lastLogin: row.last_login ? new Date(row.last_login) : undefined,
        isActive: Boolean(row.is_active),
      }));

      resolve(users);
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * 禁用/启用用户
 */
export function toggleUserStatus(userId: string, isActive: boolean): Promise<boolean> {
  return new Promise((resolve, reject) => {
    try {
      const db = getDatabase();

      const stmt = db.prepare('UPDATE users SET is_active = ? WHERE id = ?');
      const result = stmt.run(isActive ? 1 : 0, userId);

      resolve(result.changes > 0);
    } catch (error) {
      reject(error);
    }
  });
} 