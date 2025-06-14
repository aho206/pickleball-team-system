/**
 * 健康检查API端点
 * Railway 用于检查应用是否正常运行
 */

import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // 检查数据库连接 - 通过尝试获取超级管理员微信号来测试数据库
    const { getSuperAdminWechatId } = await import('@/lib/database');
    const wechatId = await getSuperAdminWechatId();
    
    return NextResponse.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      database: wechatId ? 'connected' : 'disconnected',
      environment: process.env.NODE_ENV || 'development',
      databaseType: process.env.DATABASE_URL && process.env.NODE_ENV === 'production' ? 'PostgreSQL' : 'SQLite',
      version: '1.0.1'
    });
  } catch (error) {
    console.error('Health check failed:', error);
    return NextResponse.json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error',
      databaseType: process.env.DATABASE_URL && process.env.NODE_ENV === 'production' ? 'PostgreSQL' : 'SQLite',
      version: '1.0.1'
    }, { status: 500 });
  }
} 