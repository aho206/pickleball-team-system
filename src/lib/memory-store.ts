/**
 * 简单的内存存储
 * 用于开发和测试，替代Redis
 * 现在支持数据库持久化
 */

import { GameSession } from './types';
import { 
  saveGameSessionToDB, 
  getGameSessionFromDB, 
  getUserSessions, 
  getAllSessions,
  deleteGameSessionFromDB 
} from './database';

// 内存存储（作为缓存）
const sessionStore = new Map<string, GameSession>();

/**
 * 验证自定义球局ID格式
 */
export function validateCustomSessionId(sessionId: string): { valid: boolean; error?: string } {
  // 检查长度 (3-20字符)
  if (sessionId.length < 3 || sessionId.length > 20) {
    return { valid: false, error: '球局ID长度必须在3-20个字符之间' };
  }
  
  // 检查字符格式 (只允许字母、数字、连字符和下划线)
  const validPattern = /^[a-zA-Z0-9_-]+$/;
  if (!validPattern.test(sessionId)) {
    return { valid: false, error: '球局ID只能包含字母、数字、连字符(-)和下划线(_)' };
  }
  
  // 检查是否以字母或数字开头
  const startsWithAlphanumeric = /^[a-zA-Z0-9]/;
  if (!startsWithAlphanumeric.test(sessionId)) {
    return { valid: false, error: '球局ID必须以字母或数字开头' };
  }
  
  return { valid: true };
}

/**
 * 检查球局ID是否已存在
 */
export async function isSessionIdExists(sessionId: string): Promise<boolean> {
  // 先检查内存缓存
  if (sessionStore.has(sessionId)) {
    return true;
  }
  
  // 再检查数据库
  const session = await getGameSessionFromDB(sessionId);
  if (session) {
    // 如果数据库中存在，加载到内存缓存
    sessionStore.set(sessionId, session);
    return true;
  }
  
  return false;
}

/**
 * 保存游戏球局
 */
export async function saveGameSession(session: GameSession, createdBy?: string): Promise<void> {
  console.log(`[MemoryStore] 保存球局: ${session.id}`);
  
  // 保存到内存缓存
  sessionStore.set(session.id, {
    ...session,
    updatedAt: new Date()
  });
  
  // 保存到数据库（如果提供了创建者ID）
  if (createdBy) {
    try {
      await saveGameSessionToDB(session, createdBy);
    } catch (error) {
      console.error(`[MemoryStore] 保存到数据库失败:`, error);
    }
  }
  
  console.log(`[MemoryStore] 当前存储的球局数量: ${sessionStore.size}`);
}

/**
 * 获取游戏球局
 */
export async function getGameSession(sessionId: string): Promise<GameSession | null> {
  console.log(`[MemoryStore] 获取球局: ${sessionId}`);
  
  // 先检查内存缓存
  let session = sessionStore.get(sessionId);
  
  if (!session) {
    // 如果内存中没有，从数据库加载
    const dbSession = await getGameSessionFromDB(sessionId);
    if (dbSession) {
      // 加载到内存缓存
      sessionStore.set(sessionId, dbSession);
      session = dbSession;
      console.log(`[MemoryStore] 从数据库加载球局到缓存: ${sessionId}`);
    }
  }
  
  console.log(`[MemoryStore] 当前存储的球局数量: ${sessionStore.size}`);
  console.log(`[MemoryStore] 存储的球局ID列表:`, Array.from(sessionStore.keys()));
  console.log(`[MemoryStore] 球局${sessionId}${session ? '存在' : '不存在'}`);
  
  return session || null;
}

/**
 * 获取所有游戏球局
 */
export async function getAllGameSessions(): Promise<GameSession[]> {
  console.log(`[MemoryStore] 获取所有球局，当前数量: ${sessionStore.size}`);
  
  // 从数据库获取所有球局
  try {
    const dbSessions = await getAllSessions();
    
    // 更新内存缓存
    dbSessions.forEach(session => {
      sessionStore.set(session.id, session);
    });
    
    console.log(`[MemoryStore] 从数据库加载了 ${dbSessions.length} 个球局`);
    return dbSessions;
  } catch (error) {
    console.error(`[MemoryStore] 从数据库获取球局失败:`, error);
    return Array.from(sessionStore.values());
  }
}

/**
 * 获取用户的游戏球局
 */
export async function getUserGameSessions(userId: string): Promise<GameSession[]> {
  try {
    const userSessions = await getUserSessions(userId);
    
    // 更新内存缓存
    userSessions.forEach(session => {
      sessionStore.set(session.id, session);
    });
    
    console.log(`[MemoryStore] 获取用户 ${userId} 的 ${userSessions.length} 个球局`);
    return userSessions;
  } catch (error) {
    console.error(`[MemoryStore] 获取用户球局失败:`, error);
    return [];
  }
}

/**
 * 删除游戏球局
 */
export async function deleteGameSession(sessionId: string): Promise<boolean> {
  // 从内存删除
  const memoryDeleted = sessionStore.delete(sessionId);
  
  // 从数据库删除
  let dbDeleted = false;
  try {
    dbDeleted = await deleteGameSessionFromDB(sessionId);
  } catch (error) {
    console.error(`[MemoryStore] 从数据库删除球局失败:`, error);
  }
  
  const deleted = memoryDeleted || dbDeleted;
  console.log(`[MemoryStore] 删除球局: ${sessionId}, 结果: ${deleted}`);
  return deleted;
}

/**
 * 获取所有球局ID
 */
export async function getAllSessionIds(): Promise<string[]> {
  try {
    const dbSessions = await getAllSessions();
    const sessionIds = dbSessions.map(session => session.id);
    console.log(`[MemoryStore] 获取所有球局ID: ${sessionIds.length} 个`);
    return sessionIds;
  } catch (error) {
    console.error(`[MemoryStore] 获取球局ID失败:`, error);
    return Array.from(sessionStore.keys());
  }
}

/**
 * 清空所有球局
 */
export function clearAllSessions(): Promise<void> {
  sessionStore.clear();
  console.log(`[MemoryStore] 清空内存缓存`);
  return Promise.resolve();
} 