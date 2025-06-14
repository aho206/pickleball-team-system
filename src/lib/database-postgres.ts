/**
 * PostgreSQL 数据库连接和初始化
 * 用于Railway生产环境的持久化存储
 */

import { Pool, PoolClient } from 'pg';
import bcrypt from 'bcryptjs';
import { User, GameSession } from './types';

// 数据库连接池
let pool: Pool | null = null;

export function getDatabase(): Pool {
  if (!pool) {
    // 使用Railway提供的DATABASE_URL环境变量
    const connectionString = process.env.DATABASE_URL;
    
    if (!connectionString) {
      throw new Error('DATABASE_URL环境变量未设置');
    }

    pool = new Pool({
      connectionString,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
      max: 20, // 最大连接数
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });

    // 初始化数据库表结构
    initializeDatabase();
  }
  return pool;
}

/**
 * 初始化数据库表结构
 */
async function initializeDatabase() {
  if (!pool) return;

  try {
    const client = await pool.connect();
    
    try {
      // 创建用户表
      await client.query(`
        CREATE TABLE IF NOT EXISTS users (
          id TEXT PRIMARY KEY,
          username TEXT UNIQUE NOT NULL,
          password_hash TEXT NOT NULL,
          role TEXT NOT NULL CHECK (role IN ('superadmin', 'admin')),
          wechat_id TEXT DEFAULT 'aho206',
          created_by TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          last_login TIMESTAMP,
          is_active BOOLEAN DEFAULT true,
          FOREIGN KEY (created_by) REFERENCES users(id)
        )
      `);

      // 创建会话表
      await client.query(`
        CREATE TABLE IF NOT EXISTS sessions (
          id TEXT PRIMARY KEY,
          data JSONB NOT NULL,
          created_by TEXT NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (created_by) REFERENCES users(id)
        )
      `);

      // 创建认证会话表
      await client.query(`
        CREATE TABLE IF NOT EXISTS auth_sessions (
          token TEXT PRIMARY KEY,
          user_id TEXT NOT NULL,
          username TEXT NOT NULL,
          role TEXT NOT NULL,
          expires_at TIMESTAMP NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id)
        )
      `);

      // 创建索引
      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_sessions_created_by ON sessions(created_by);
      `);
      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_auth_sessions_user_id ON auth_sessions(user_id);
      `);
      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_auth_sessions_expires_at ON auth_sessions(expires_at);
      `);

      // 创建默认超级管理员账号
      await createDefaultSuperAdmin(client);

      console.log('[PostgreSQL] 数据库初始化完成');
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('[PostgreSQL] 数据库初始化失败:', error);
    throw error;
  }
}

/**
 * 创建默认超级管理员账号
 */
async function createDefaultSuperAdmin(client: PoolClient) {
  try {
    const result = await client.query('SELECT COUNT(*) as count FROM users WHERE role = $1', ['superadmin']);
    const count = parseInt(result.rows[0].count);

    if (count === 0) {
      const { v4: uuidv4 } = require('uuid');
      // 使用环境变量或生成安全的默认密码
      const defaultPassword = process.env.SUPERADMIN_PASSWORD || 'PickleBall2024!@#$';
      const passwordHash = bcrypt.hashSync(defaultPassword, 10);
      
      const userId = uuidv4();
      await client.query(`
        INSERT INTO users (id, username, password_hash, role, is_active)
        VALUES ($1, $2, $3, $4, $5)
      `, [userId, 'superadmin', passwordHash, 'superadmin', true]);
      
      console.log('[PostgreSQL] 默认超级管理员账号已创建');
      console.log('[PostgreSQL] 用户名: superadmin');
      console.log('[PostgreSQL] 密码:', defaultPassword);
      console.log('[PostgreSQL] 请立即登录并修改密码！');
    }
  } catch (error) {
    console.error('[PostgreSQL] 创建默认超级管理员失败:', error);
  }
}

/**
 * 关闭数据库连接
 */
export async function closeDatabase() {
  if (pool) {
    await pool.end();
    pool = null;
  }
}

/**
 * 根据ID获取用户
 */
export async function getUserById(userId: string): Promise<User | null> {
  const database = getDatabase();
  
  try {
    const result = await database.query(`
      SELECT id, username, role, wechat_id, created_by, created_at, last_login, is_active
      FROM users 
      WHERE id = $1
    `, [userId]);
    
    if (result.rows.length === 0) return null;

    const row = result.rows[0];
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
  } catch (error) {
    console.error('[PostgreSQL] 获取用户失败:', error);
    return null;
  }
}

/**
 * 获取超级管理员的微信号（用于联系管理员功能）
 */
export async function getSuperAdminWechatId(): Promise<string> {
  const database = getDatabase();
  
  try {
    const result = await database.query(`
      SELECT wechat_id
      FROM users 
      WHERE role = 'superadmin' AND is_active = true
      ORDER BY created_at ASC
      LIMIT 1
    `);
    
    return result.rows[0]?.wechat_id || 'aho206'; // 返回微信号或默认值
  } catch (error) {
    console.error('[PostgreSQL] 获取超级管理员微信号失败:', error);
    return 'aho206';
  }
}

/**
 * 更新超级管理员的微信号
 */
export async function updateSuperAdminWechatId(userId: string, wechatId: string): Promise<boolean> {
  const database = getDatabase();
  
  try {
    const result = await database.query(`
      UPDATE users 
      SET wechat_id = $1
      WHERE id = $2 AND role = 'superadmin'
    `, [wechatId, userId]);
    
    return (result.rowCount ?? 0) > 0;
  } catch (error) {
    console.error('[PostgreSQL] 更新超级管理员微信号失败:', error);
    return false;
  }
}

/**
 * 根据用户名获取用户（用于登录）
 */
export async function getUserByUsername(username: string): Promise<User | null> {
  const database = getDatabase();
  
  try {
    const result = await database.query(`
      SELECT id, username, password_hash, role, wechat_id, created_by, created_at, last_login, is_active
      FROM users 
      WHERE username = $1
    `, [username]);
    
    if (result.rows.length === 0) return null;

    const row = result.rows[0];
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
  } catch (error) {
    console.error('[PostgreSQL] 根据用户名获取用户失败:', error);
    return null;
  }
}

/**
 * 创建新用户
 */
export async function createUser(user: Omit<User, 'id' | 'createdAt' | 'lastLogin'>): Promise<User> {
  const database = getDatabase();
  const { v4: uuidv4 } = require('uuid');
  
  try {
    const userId = uuidv4();
    const now = new Date();
    
    await database.query(`
      INSERT INTO users (id, username, password_hash, role, wechat_id, created_by, created_at, is_active)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    `, [userId, user.username, user.passwordHash, user.role, user.wechatId, user.createdBy, now, user.isActive]);
    
    return {
      ...user,
      id: userId,
      createdAt: now
    };
  } catch (error) {
    console.error('[PostgreSQL] 创建用户失败:', error);
    throw error;
  }
}

/**
 * 获取所有用户
 */
export async function getAllUsers(): Promise<User[]> {
  const database = getDatabase();
  
  try {
    const result = await database.query(`
      SELECT id, username, role, wechat_id, created_by, created_at, last_login, is_active
      FROM users 
      ORDER BY created_at DESC
    `);
    
    return result.rows.map(row => ({
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
  } catch (error) {
    console.error('[PostgreSQL] 获取所有用户失败:', error);
    return [];
  }
}

/**
 * 更新用户信息
 */
export async function updateUser(userId: string, updates: Partial<Pick<User, 'isActive'>>): Promise<User> {
  const database = getDatabase();
  
  try {
    // 构建更新语句
    const fields = [];
    const values = [];
    let paramIndex = 1;

    if (updates.isActive !== undefined) {
      fields.push(`is_active = $${paramIndex++}`);
      values.push(updates.isActive);
    }

    if (fields.length === 0) {
      throw new Error('没有要更新的字段');
    }

    values.push(userId); // 最后一个参数是userId
    
    await database.query(`
      UPDATE users 
      SET ${fields.join(', ')}
      WHERE id = $${paramIndex}
    `, values);

    // 返回更新后的用户信息
    const updatedUser = await getUserById(userId);
    if (!updatedUser) {
      throw new Error('用户不存在');
    }
    
    return updatedUser;
  } catch (error) {
    console.error('[PostgreSQL] 更新用户失败:', error);
    throw error;
  }
}

/**
 * 删除用户
 */
export async function deleteUser(userId: string): Promise<void> {
  const database = getDatabase();
  
  try {
    // 检查是否为最后一个超级管理员
    const superAdminResult = await database.query('SELECT COUNT(*) as count FROM users WHERE role = $1 AND is_active = true', ['superadmin']);
    const superAdminCount = parseInt(superAdminResult.rows[0].count);
    
    const userResult = await database.query('SELECT role FROM users WHERE id = $1', [userId]);
    if (userResult.rows.length === 0) {
      throw new Error('用户不存在');
    }
    
    const userRole = userResult.rows[0].role;
    if (userRole === 'superadmin' && superAdminCount <= 1) {
      throw new Error('不能删除最后一个超级管理员');
    }

    await database.query('DELETE FROM users WHERE id = $1', [userId]);
  } catch (error) {
    console.error('[PostgreSQL] 删除用户失败:', error);
    throw error;
  }
}

/**
 * 保存游戏会话到数据库
 */
export async function saveGameSessionToDB(session: GameSession, createdBy: string): Promise<void> {
  const database = getDatabase();
  
  try {
    const now = new Date();
    
    await database.query(`
      INSERT INTO sessions (id, data, created_by, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (id) 
      DO UPDATE SET 
        data = EXCLUDED.data,
        updated_at = EXCLUDED.updated_at
    `, [session.id, JSON.stringify(session), createdBy, now, now]);
    
    console.log(`[PostgreSQL] 保存会话成功: ${session.id}`);
  } catch (error) {
    console.error('[PostgreSQL] 保存会话失败:', error);
    throw error;
  }
}

/**
 * 从数据库获取游戏会话
 */
export async function getGameSessionFromDB(sessionId: string): Promise<GameSession | null> {
  const database = getDatabase();
  
  try {
    const result = await database.query('SELECT data FROM sessions WHERE id = $1', [sessionId]);
    
    if (result.rows.length === 0) return null;
    
    return JSON.parse(result.rows[0].data);
  } catch (error) {
    console.error('[PostgreSQL] 获取会话失败:', error);
    return null;
  }
}

/**
 * 获取用户的游戏会话
 */
export async function getUserSessions(userId: string): Promise<GameSession[]> {
  const database = getDatabase();
  
  try {
    const result = await database.query(`
      SELECT data FROM sessions 
      WHERE created_by = $1 
      ORDER BY created_at DESC
    `, [userId]);
    
    return result.rows.map(row => JSON.parse(row.data));
  } catch (error) {
    console.error('[PostgreSQL] 获取用户会话失败:', error);
    return [];
  }
}

/**
 * 获取所有游戏会话
 */
export async function getAllSessions(): Promise<GameSession[]> {
  const database = getDatabase();
  
  try {
    const result = await database.query(`
      SELECT data FROM sessions 
      ORDER BY created_at DESC
    `);
    
    return result.rows.map(row => JSON.parse(row.data));
  } catch (error) {
    console.error('[PostgreSQL] 获取所有会话失败:', error);
    return [];
  }
}

/**
 * 从数据库删除游戏会话
 */
export async function deleteGameSessionFromDB(sessionId: string): Promise<boolean> {
  const database = getDatabase();
  
  try {
    const result = await database.query('DELETE FROM sessions WHERE id = $1', [sessionId]);
    return (result.rowCount ?? 0) > 0;
  } catch (error) {
    console.error('[PostgreSQL] 删除会话失败:', error);
    return false;
  }
}

/**
 * 保存认证会话
 */
export async function saveAuthSession(token: string, userId: string, username: string, role: string, expiresAt: Date): Promise<void> {
  const database = getDatabase();
  
  try {
    await database.query(`
      INSERT INTO auth_sessions (token, user_id, username, role, expires_at)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (token) 
      DO UPDATE SET 
        user_id = EXCLUDED.user_id,
        username = EXCLUDED.username,
        role = EXCLUDED.role,
        expires_at = EXCLUDED.expires_at
    `, [token, userId, username, role, expiresAt]);
  } catch (error) {
    console.error('[PostgreSQL] 保存认证会话失败:', error);
    throw error;
  }
}

/**
 * 获取认证会话
 */
export async function getAuthSession(token: string): Promise<{ userId: string; username: string; role: string; expiresAt: Date } | null> {
  const database = getDatabase();
  
  try {
    const result = await database.query(`
      SELECT user_id, username, role, expires_at
      FROM auth_sessions 
      WHERE token = $1 AND expires_at > NOW()
    `, [token]);
    
    if (result.rows.length === 0) return null;
    
    const row = result.rows[0];
    return {
      userId: row.user_id,
      username: row.username,
      role: row.role,
      expiresAt: new Date(row.expires_at)
    };
  } catch (error) {
    console.error('[PostgreSQL] 获取认证会话失败:', error);
    return null;
  }
}

/**
 * 删除认证会话
 */
export async function deleteAuthSession(token: string): Promise<void> {
  const database = getDatabase();
  
  try {
    await database.query('DELETE FROM auth_sessions WHERE token = $1', [token]);
  } catch (error) {
    console.error('[PostgreSQL] 删除认证会话失败:', error);
  }
}

/**
 * 清理过期的认证会话
 */
export async function cleanupExpiredAuthSessions(): Promise<void> {
  const database = getDatabase();
  
  try {
    const result = await database.query('DELETE FROM auth_sessions WHERE expires_at <= NOW()');
    const deletedCount = result.rowCount ?? 0;
    if (deletedCount > 0) {
      console.log(`[PostgreSQL] 清理了 ${deletedCount} 个过期认证会话`);
    }
  } catch (error) {
    console.error('[PostgreSQL] 清理过期认证会话失败:', error);
  }
}

/**
 * 更新用户最后登录时间
 */
export async function updateUserLastLogin(userId: string): Promise<void> {
  const database = getDatabase();
  
  try {
    await database.query(`
      UPDATE users 
      SET last_login = CURRENT_TIMESTAMP
      WHERE id = $1
    `, [userId]);
  } catch (error) {
    console.error('[PostgreSQL] 更新用户最后登录时间失败:', error);
  }
} 