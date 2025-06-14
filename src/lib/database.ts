/**
 * 数据库适配器 - 根据环境选择PostgreSQL或SQLite
 */

import { User, GameSession } from './types';

// 根据环境变量选择数据库实现
const usePostgreSQL = process.env.DATABASE_URL && process.env.NODE_ENV === 'production';

if (usePostgreSQL) {
  console.log('[Database] 使用PostgreSQL数据库');
} else {
  console.log('[Database] 使用SQLite数据库');
}

// 动态导入数据库实现
let dbModule: any = null;

async function getDbModule() {
  if (!dbModule) {
    if (usePostgreSQL) {
      dbModule = await import('./database-postgres');
    } else {
      dbModule = await import('./database-sqlite');
    }
  }
  return dbModule;
}

// 导出异步版本的函数
export async function getUserById(userId: string): Promise<User | null> {
  const db = await getDbModule();
  return await db.getUserById(userId);
}

export async function getSuperAdminWechatId(): Promise<string> {
  const db = await getDbModule();
  return await db.getSuperAdminWechatId();
}

export async function updateSuperAdminWechatId(userId: string, wechatId: string): Promise<boolean> {
  const db = await getDbModule();
  return await db.updateSuperAdminWechatId(userId, wechatId);
}

export async function getUserByUsername(username: string): Promise<User | null> {
  const db = await getDbModule();
  return await db.getUserByUsername(username);
}

export async function createUser(user: Omit<User, 'id' | 'createdAt' | 'lastLogin'>): Promise<User> {
  const db = await getDbModule();
  return await db.createUser(user);
}

export async function getAllUsers(): Promise<User[]> {
  const db = await getDbModule();
  return await db.getAllUsers();
}

export async function updateUser(userId: string, updates: Partial<Pick<User, 'isActive'>>): Promise<User> {
  const db = await getDbModule();
  return await db.updateUser(userId, updates);
}

export async function deleteUser(userId: string): Promise<void> {
  const db = await getDbModule();
  return await db.deleteUser(userId);
}

export async function saveGameSessionToDB(session: GameSession, createdBy: string): Promise<void> {
  const db = await getDbModule();
  return await db.saveGameSessionToDB(session, createdBy);
}

export async function getGameSessionFromDB(sessionId: string): Promise<GameSession | null> {
  const db = await getDbModule();
  return await db.getGameSessionFromDB(sessionId);
}

export async function getUserSessions(userId: string): Promise<GameSession[]> {
  const db = await getDbModule();
  return await db.getUserSessions(userId);
}

export async function getAllSessions(): Promise<GameSession[]> {
  const db = await getDbModule();
  return await db.getAllSessions();
}

export async function deleteGameSessionFromDB(sessionId: string): Promise<boolean> {
  const db = await getDbModule();
  return await db.deleteGameSessionFromDB(sessionId);
}

export async function saveAuthSession(token: string, userId: string, username: string, role: string, expiresAt: Date): Promise<void> {
  const db = await getDbModule();
  return await db.saveAuthSession(token, userId, username, role, expiresAt);
}

export async function getAuthSession(token: string): Promise<{ userId: string; username: string; role: string; expiresAt: Date } | null> {
  const db = await getDbModule();
  return await db.getAuthSession(token);
}

export async function deleteAuthSession(token: string): Promise<void> {
  const db = await getDbModule();
  return await db.deleteAuthSession(token);
}

export async function cleanupExpiredAuthSessions(): Promise<void> {
  const db = await getDbModule();
  return await db.cleanupExpiredAuthSessions();
}

export async function updateUserLastLogin(userId: string): Promise<void> {
  const db = await getDbModule();
  return await db.updateUserLastLogin(userId);
}

export async function closeDatabase(): Promise<void> {
  const db = await getDbModule();
  if (db.closeDatabase) {
    return await db.closeDatabase();
  }
} 