/**
 * Redis连接配置
 */

import { createClient } from 'redis';
import { GameSession } from './types';

// Redis客户端实例
let redisClient: ReturnType<typeof createClient> | null = null;

/**
 * 获取Redis客户端
 */
export async function getRedisClient() {
  if (!redisClient) {
    redisClient = createClient({
      url: process.env.REDIS_URL || 'redis://localhost:6379'
    });

    redisClient.on('error', (err) => {
      console.error('Redis Client Error:', err);
    });

    await redisClient.connect();
  }

  return redisClient;
}

/**
 * 保存游戏会话到Redis
 */
export async function saveGameSession(session: GameSession): Promise<void> {
  const client = await getRedisClient();
  const key = `session:${session.id}`;
  
  await client.setEx(key, 3600 * 24, JSON.stringify({
    ...session,
    createdAt: session.createdAt.toISOString(),
    updatedAt: session.updatedAt.toISOString(),
    participants: session.participants.map(p => ({
      ...p,
      joinedAt: p.joinedAt.toISOString()
    })),
    weights: session.weights.map(w => ({
      ...w,
      createdAt: w.createdAt.toISOString()
    })),
    courts: session.courts.map(c => ({
      ...c,
      startTime: c.startTime?.toISOString()
    }))
  }));
}

/**
 * 从Redis获取游戏会话
 */
export async function getGameSession(sessionId: string): Promise<GameSession | null> {
  const client = await getRedisClient();
  const key = `session:${sessionId}`;
  
  const data = await client.get(key);
  if (!data) return null;

  const parsed = JSON.parse(data);
  
  return {
    ...parsed,
    createdAt: new Date(parsed.createdAt),
    updatedAt: new Date(parsed.updatedAt),
    participants: parsed.participants.map((p: any) => ({
      ...p,
      joinedAt: new Date(p.joinedAt)
    })),
    weights: parsed.weights.map((w: any) => ({
      ...w,
      createdAt: new Date(w.createdAt)
    })),
    courts: parsed.courts.map((c: any) => ({
      ...c,
      startTime: c.startTime ? new Date(c.startTime) : undefined
    }))
  };
}

/**
 * 删除游戏会话
 */
export async function deleteGameSession(sessionId: string): Promise<void> {
  const client = await getRedisClient();
  const key = `session:${sessionId}`;
  
  await client.del(key);
}

/**
 * 获取所有活跃的会话ID
 */
export async function getActiveSessionIds(): Promise<string[]> {
  const client = await getRedisClient();
  const keys = await client.keys('session:*');
  
  return keys.map(key => key.replace('session:', ''));
}

/**
 * 关闭Redis连接
 */
export async function closeRedisConnection(): Promise<void> {
  if (redisClient) {
    await redisClient.quit();
    redisClient = null;
  }
} 