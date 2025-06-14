/**
 * SQLite 数据库连接和初始化
 * 用于开发环境的本地存储
 */

import Database from 'better-sqlite3';
import bcrypt from 'bcryptjs';
import { User, GameSession } from './types';
import path from 'path';

// 数据库文件路径 - 生产环境使用 /app/data，开发环境使用 ./data
const getDbPath = () => {
  if (process.env.NODE_ENV === 'production') {
    // Railway 生产环境路径
    return path.join('/app', 'data', 'pickleball.db');
  } else {
    // 开发环境路径
    return path.join(process.cwd(), 'data', 'pickleball.db');
  }
};

const DB_PATH = getDbPath();

// 创建数据库连接
let db: Database.Database | null = null;

export function getDatabase(): Database.Database {
  if (!db) {
    // 确保数据目录存在
    const fs = require('fs');
    const dataDir = path.dirname(DB_PATH);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    db = new Database(DB_PATH);
    initializeDatabase();
  }
  return db;
}

/**
 * 初始化数据库表结构
 */
function initializeDatabase() {
  if (!db) return;

  // 创建用户表
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL CHECK (role IN ('superadmin', 'admin')),
      wechat_id TEXT DEFAULT 'aho206',
      created_by TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      last_login DATETIME,
      is_active BOOLEAN DEFAULT 1,
      FOREIGN KEY (created_by) REFERENCES users(id)
    )
  `);

  // 检查是否需要添加wechat_id字段（用于现有数据库的迁移）
  try {
    db.exec(`ALTER TABLE users ADD COLUMN wechat_id TEXT DEFAULT 'aho206'`);
    console.log('[SQLite] 已添加wechat_id字段');
  } catch (error) {
    // 字段已存在，忽略错误
  }

  // 创建会话表
  db.exec(`
    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      data TEXT NOT NULL,
      created_by TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (created_by) REFERENCES users(id)
    )
  `);

  // 创建认证会话表
  db.exec(`
    CREATE TABLE IF NOT EXISTS auth_sessions (
      token TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      username TEXT NOT NULL,
      role TEXT NOT NULL,
      expires_at DATETIME NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);

  // 创建默认超级管理员账号
  createDefaultSuperAdmin();

  console.log('[SQLite] 数据库初始化完成');
}

/**
 * 创建默认超级管理员账号
 */
function createDefaultSuperAdmin() {
  if (!db) return;

  const checkStmt = db.prepare('SELECT COUNT(*) as count FROM users WHERE role = ?');
  const result = checkStmt.get('superadmin') as { count: number };

  if (result.count === 0) {
    const { v4: uuidv4 } = require('uuid');
    // 使用环境变量或生成安全的默认密码
    const defaultPassword = process.env.SUPERADMIN_PASSWORD || 'PickleBall2024!@#$';
    const passwordHash = bcrypt.hashSync(defaultPassword, 10);
    
    const insertStmt = db.prepare(`
      INSERT INTO users (id, username, password_hash, role, is_active)
      VALUES (?, ?, ?, ?, ?)
    `);

    const userId = uuidv4();
    insertStmt.run(userId, 'superadmin', passwordHash, 'superadmin', 1);
    
    console.log('[SQLite] 默认超级管理员账号已创建');
    console.log('[SQLite] 用户名: superadmin');
    console.log('[SQLite] 密码:', defaultPassword);
    console.log('[SQLite] 请立即登录并修改密码！');
  }
}

/**
 * 关闭数据库连接
 */
export async function closeDatabase() {
  if (db) {
    db.close();
    db = null;
  }
}

/**
 * 根据ID获取用户
 */
export async function getUserById(userId: string): Promise<User | null> {
  const database = getDatabase();
  const stmt = database.prepare(`
    SELECT id, username, role, wechat_id, created_by, created_at, last_login, is_active
    FROM users 
    WHERE id = ?
  `);
  
  const row = stmt.get(userId) as any;
  if (!row) return null;

  return {
    id: row.id,
    username: row.username,
    passwordHash: '', // 不返回密码哈希
    role: row.role,
    wechatId: row.wechat_id,
    createdBy: row.created_by,
    createdAt: new Date(row.created_at),
    lastLogin: row.last_login ? new Date(row.last_login) : undefined,
    isActive: Boolean(row.is_active)
  };
}

/**
 * 获取超级管理员的微信号（用于联系管理员功能）
 */
export async function getSuperAdminWechatId(): Promise<string> {
  const database = getDatabase();
  const stmt = database.prepare(`
    SELECT wechat_id
    FROM users 
    WHERE role = 'superadmin' AND is_active = 1
    ORDER BY created_at ASC
    LIMIT 1
  `);
  
  const row = stmt.get() as any;
  return row?.wechat_id || 'aho206'; // 返回微信号或默认值
}

/**
 * 更新超级管理员的微信号
 */
export async function updateSuperAdminWechatId(userId: string, wechatId: string): Promise<boolean> {
  const database = getDatabase();
  const stmt = database.prepare(`
    UPDATE users 
    SET wechat_id = ?
    WHERE id = ? AND role = 'superadmin'
  `);
  
  const result = stmt.run(wechatId, userId);
  return result.changes > 0;
}

/**
 * 根据用户名获取用户（用于登录）
 */
export async function getUserByUsername(username: string): Promise<User | null> {
  const database = getDatabase();
  const stmt = database.prepare(`
    SELECT id, username, password_hash, role, wechat_id, created_by, created_at, last_login, is_active
    FROM users 
    WHERE username = ?
  `);
  
  const row = stmt.get(username) as any;
  if (!row) return null;

  return {
    id: row.id,
    username: row.username,
    passwordHash: row.password_hash,
    role: row.role,
    wechatId: row.wechat_id,
    createdBy: row.created_by,
    createdAt: new Date(row.created_at),
    lastLogin: row.last_login ? new Date(row.last_login) : undefined,
    isActive: Boolean(row.is_active)
  };
}

/**
 * 创建新用户
 */
export async function createUser(user: Omit<User, 'id' | 'createdAt' | 'lastLogin'>): Promise<User> {
  const database = getDatabase();
  const { v4: uuidv4 } = require('uuid');
  
  const userId = uuidv4();
  const now = new Date();
  
  const stmt = database.prepare(`
    INSERT INTO users (id, username, password_hash, role, wechat_id, created_by, created_at, is_active)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
  
  stmt.run(userId, user.username, user.passwordHash, user.role, user.wechatId, user.createdBy, now.toISOString(), user.isActive ? 1 : 0);
  
  return {
    ...user,
    id: userId,
    createdAt: now
  };
}

/**
 * 获取所有用户
 */
export async function getAllUsers(): Promise<User[]> {
  const database = getDatabase();
  const stmt = database.prepare(`
    SELECT id, username, role, wechat_id, created_by, created_at, last_login, is_active
    FROM users 
    ORDER BY created_at DESC
  `);
  
  const rows = stmt.all() as any[];
  return rows.map(row => ({
    id: row.id,
    username: row.username,
    passwordHash: '', // 不返回密码哈希
    role: row.role,
    wechatId: row.wechat_id,
    createdBy: row.created_by,
    createdAt: new Date(row.created_at),
    lastLogin: row.last_login ? new Date(row.last_login) : undefined,
    isActive: Boolean(row.is_active)
  }));
}

/**
 * 更新用户信息
 */
export async function updateUser(userId: string, updates: Partial<Pick<User, 'isActive'>>): Promise<User> {
  const database = getDatabase();
  
  // 构建更新语句
  const fields = [];
  const values = [];

  if (updates.isActive !== undefined) {
    fields.push('is_active = ?');
    values.push(updates.isActive ? 1 : 0);
  }

  if (fields.length === 0) {
    throw new Error('没有要更新的字段');
  }

  values.push(userId); // 最后一个参数是userId
  
  const stmt = database.prepare(`
    UPDATE users 
    SET ${fields.join(', ')}
    WHERE id = ?
  `);
  
  stmt.run(...values);

  // 返回更新后的用户信息
  const updatedUser = await getUserById(userId);
  if (!updatedUser) {
    throw new Error('用户不存在');
  }
  
  return updatedUser;
}

/**
 * 删除用户
 */
export async function deleteUser(userId: string): Promise<void> {
  const database = getDatabase();
  
  // 检查是否为最后一个超级管理员
  const checkStmt = database.prepare('SELECT COUNT(*) as count FROM users WHERE role = ? AND is_active = 1');
  const superAdminCount = (checkStmt.get('superadmin') as { count: number }).count;
  
  const userStmt = database.prepare('SELECT role FROM users WHERE id = ?');
  const userRow = userStmt.get(userId) as { role: string } | undefined;
  
  if (!userRow) {
    throw new Error('用户不存在');
  }
  
  if (userRow.role === 'superadmin' && superAdminCount <= 1) {
    throw new Error('不能删除最后一个超级管理员');
  }

  const deleteStmt = database.prepare('DELETE FROM users WHERE id = ?');
  deleteStmt.run(userId);
}

/**
 * 保存游戏会话到数据库
 */
export async function saveGameSessionToDB(session: GameSession, createdBy: string): Promise<void> {
  const database = getDatabase();
  const now = new Date().toISOString();
  
  const stmt = database.prepare(`
    INSERT OR REPLACE INTO sessions (id, data, created_by, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?)
  `);
  
  stmt.run(session.id, JSON.stringify(session), createdBy, now, now);
  console.log(`[SQLite] 保存会话成功: ${session.id}`);
}

/**
 * 从数据库获取游戏会话
 */
export async function getGameSessionFromDB(sessionId: string): Promise<GameSession | null> {
  const database = getDatabase();
  const stmt = database.prepare('SELECT data FROM sessions WHERE id = ?');
  const row = stmt.get(sessionId) as { data: string } | undefined;
  
  if (!row) return null;
  
  try {
    return JSON.parse(row.data);
  } catch (error) {
    console.error('[SQLite] 解析会话数据失败:', error);
    return null;
  }
}

/**
 * 获取用户的游戏会话
 */
export async function getUserSessions(userId: string): Promise<GameSession[]> {
  const database = getDatabase();
  const stmt = database.prepare(`
    SELECT data FROM sessions 
    WHERE created_by = ? 
    ORDER BY created_at DESC
  `);
  
  const rows = stmt.all(userId) as { data: string }[];
  return rows.map(row => {
    try {
      return JSON.parse(row.data);
    } catch (error) {
      console.error('[SQLite] 解析会话数据失败:', error);
      return null;
    }
  }).filter(Boolean);
}

/**
 * 获取所有游戏会话
 */
export async function getAllSessions(): Promise<GameSession[]> {
  const database = getDatabase();
  const stmt = database.prepare(`
    SELECT data FROM sessions 
    ORDER BY created_at DESC
  `);
  
  const rows = stmt.all() as { data: string }[];
  return rows.map(row => {
    try {
      return JSON.parse(row.data);
    } catch (error) {
      console.error('[SQLite] 解析会话数据失败:', error);
      return null;
    }
  }).filter(Boolean);
}

/**
 * 从数据库删除游戏会话
 */
export async function deleteGameSessionFromDB(sessionId: string): Promise<boolean> {
  const database = getDatabase();
  const stmt = database.prepare('DELETE FROM sessions WHERE id = ?');
  const result = stmt.run(sessionId);
  return result.changes > 0;
}

/**
 * 保存认证会话
 */
export async function saveAuthSession(token: string, userId: string, username: string, role: string, expiresAt: Date): Promise<void> {
  const database = getDatabase();
  const stmt = database.prepare(`
    INSERT OR REPLACE INTO auth_sessions (token, user_id, username, role, expires_at)
    VALUES (?, ?, ?, ?, ?)
  `);
  stmt.run(token, userId, username, role, expiresAt.toISOString());
}

/**
 * 获取认证会话
 */
export async function getAuthSession(token: string): Promise<{ userId: string; username: string; role: string; expiresAt: Date } | null> {
  const database = getDatabase();
  const stmt = database.prepare(`
    SELECT user_id, username, role, expires_at
    FROM auth_sessions 
    WHERE token = ? AND expires_at > datetime('now')
  `);
  
  const row = stmt.get(token) as any;
  if (!row) return null;
  
  return {
    userId: row.user_id,
    username: row.username,
    role: row.role,
    expiresAt: new Date(row.expires_at)
  };
}

/**
 * 删除认证会话
 */
export async function deleteAuthSession(token: string): Promise<void> {
  const database = getDatabase();
  const stmt = database.prepare('DELETE FROM auth_sessions WHERE token = ?');
  stmt.run(token);
}

/**
 * 清理过期的认证会话
 */
export async function cleanupExpiredAuthSessions(): Promise<void> {
  const database = getDatabase();
  const stmt = database.prepare('DELETE FROM auth_sessions WHERE expires_at <= datetime("now")');
  const result = stmt.run();
  if (result.changes > 0) {
    console.log(`[SQLite] 清理了 ${result.changes} 个过期认证会话`);
  }
}

/**
 * 更新用户最后登录时间
 */
export async function updateUserLastLogin(userId: string): Promise<void> {
  const database = getDatabase();
  const stmt = database.prepare(`
    UPDATE users 
    SET last_login = datetime('now')
    WHERE id = ?
  `);
  stmt.run(userId);
} 