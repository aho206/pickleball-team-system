/**
 * 健康检查API端点
 * Railway 用于检查应用是否正常运行
 */

import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // 检查数据库连接
    const { getDatabase } = await import('@/lib/database');
    const db = getDatabase();
    
    // 简单的数据库查询测试
    const result = db.prepare('SELECT 1 as test').get();
    
    return NextResponse.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      database: result ? 'connected' : 'disconnected',
      environment: process.env.NODE_ENV || 'development'
    });
  } catch (error) {
    console.error('Health check failed:', error);
    return NextResponse.json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 