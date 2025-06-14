/**
 * SQLite 数据库连接和初始化
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
      created_by TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      last_login DATETIME,
      is_active BOOLEAN DEFAULT 1,
      FOREIGN KEY (created_by) REFERENCES users(id)
    )
  `);

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

  console.log('[Database] 数据库初始化完成');
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
    const passwordHash = bcrypt.hashSync('Admin@123*123', 10);
    
    const insertStmt = db.prepare(`
      INSERT INTO users (id, username, password_hash, role, is_active)
      VALUES (?, ?, ?, ?, ?)
    `);

    const userId = uuidv4();
    insertStmt.run(userId, 'superadmin', passwordHash, 'superadmin', 1);
    
    console.log('[Database] 默认超级管理员账号已创建: superadmin / Admin@123*123');
  }
}

/**
 * 关闭数据库连接
 */
export function closeDatabase() {
  if (db) {
    db.close();
    db = null;
  }
}

/**
 * 根据ID获取用户
 */
export function getUserById(userId: string): User | null {
  const database = getDatabase();
  const stmt = database.prepare(`
    SELECT id, username, role, created_by, created_at, last_login, is_active
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
    createdBy: row.created_by,
    createdAt: new Date(row.created_at),
    lastLogin: row.last_login ? new Date(row.last_login) : undefined,
    isActive: Boolean(row.is_active)
  };
}

/**
 * 更新用户信息
 */
export function updateUser(userId: string, updates: Partial<Pick<User, 'isActive'>>): User {
  const database = getDatabase();
  
  // 构建更新语句
  const fields = [];
  const values = [];
  
  if (updates.isActive !== undefined) {
    fields.push('is_active = ?');
    values.push(updates.isActive ? 1 : 0);
  }
  
  if (fields.length === 0) {
    throw new Error('没有提供要更新的字段');
  }
  
  values.push(userId);
  
  const stmt = database.prepare(`
    UPDATE users 
    SET ${fields.join(', ')}
    WHERE id = ?
  `);
  
  const result = stmt.run(...values);
  
  if (result.changes === 0) {
    throw new Error('用户不存在或更新失败');
  }
  
  // 返回更新后的用户信息
  const updatedUser = getUserById(userId);
  if (!updatedUser) {
    throw new Error('获取更新后的用户信息失败');
  }
  
  return updatedUser;
}

/**
 * 删除用户
 */
export function deleteUser(userId: string): void {
  const database = getDatabase();
  
  // 开始事务
  const deleteTransaction = database.transaction(() => {
    // 删除用户的认证会话
    const deleteAuthSessionsStmt = database.prepare('DELETE FROM auth_sessions WHERE user_id = ?');
    deleteAuthSessionsStmt.run(userId);
    
    // 删除用户创建的会话
    const deleteSessionsStmt = database.prepare('DELETE FROM sessions WHERE created_by = ?');
    deleteSessionsStmt.run(userId);
    
    // 删除用户
    const deleteUserStmt = database.prepare('DELETE FROM users WHERE id = ?');
    const result = deleteUserStmt.run(userId);
    
    if (result.changes === 0) {
      throw new Error('用户不存在或删除失败');
    }
  });
  
  deleteTransaction();
}

/**
 * 保存游戏会话到数据库
 */
export function saveGameSessionToDB(session: any, createdBy: string): void {
  const database = getDatabase();
  
  const stmt = database.prepare(`
    INSERT OR REPLACE INTO sessions (id, data, created_by, updated_at)
    VALUES (?, ?, ?, CURRENT_TIMESTAMP)
  `);
  
  stmt.run(session.id, JSON.stringify(session), createdBy);
  console.log(`[Database] 保存会话到数据库: ${session.id}`);
}

/**
 * 从数据库获取游戏会话
 */
export function getGameSessionFromDB(sessionId: string): any | null {
  const database = getDatabase();
  
  const stmt = database.prepare('SELECT data FROM sessions WHERE id = ?');
  const row = stmt.get(sessionId) as any;
  
  if (!row) {
    console.log(`[Database] 会话${sessionId}不存在`);
    return null;
  }
  
  try {
    const session = JSON.parse(row.data);
    console.log(`[Database] 从数据库获取会话: ${sessionId}`);
    return session;
  } catch (error) {
    console.error(`[Database] 解析会话数据失败: ${sessionId}`, error);
    return null;
  }
}

/**
 * 获取用户的所有会话
 */
export function getUserSessions(userId: string): any[] {
  const database = getDatabase();
  
  const stmt = database.prepare('SELECT data FROM sessions WHERE created_by = ?');
  const rows = stmt.all(userId) as any[];
  
  return rows.map(row => {
    try {
      return JSON.parse(row.data);
    } catch (error) {
      console.error('[Database] 解析会话数据失败', error);
      return null;
    }
  }).filter(Boolean);
}

/**
 * 获取所有会话（仅超级管理员）
 */
export function getAllSessions(): any[] {
  const database = getDatabase();
  
  const stmt = database.prepare('SELECT data FROM sessions');
  const rows = stmt.all() as any[];
  
  return rows.map(row => {
    try {
      return JSON.parse(row.data);
    } catch (error) {
      console.error('[Database] 解析会话数据失败', error);
      return null;
    }
  }).filter(Boolean);
}

/**
 * 删除会话
 */
export function deleteGameSessionFromDB(sessionId: string): boolean {
  const database = getDatabase();
  
  const stmt = database.prepare('DELETE FROM sessions WHERE id = ?');
  const result = stmt.run(sessionId);
  
  console.log(`[Database] 删除会话: ${sessionId}, 结果: ${result.changes > 0}`);
  return result.changes > 0;
} 