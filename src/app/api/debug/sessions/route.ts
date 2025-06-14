/**
 * 调试API - 检查数据库中的球局数据
 * 仅用于调试，生产环境应该删除
 */

import { NextRequest, NextResponse } from 'next/server';
import { validateAuthSession, isSuperAdmin } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    // 验证认证
    const token = request.cookies.get('auth-token')?.value || 
                  request.headers.get('authorization')?.replace('Bearer ', '');

    if (!token) {
      return NextResponse.json({ error: '未提供认证token' }, { status: 401 });
    }

    const currentUser = await validateAuthSession(token);
    if (!currentUser || !isSuperAdmin(currentUser.role)) {
      return NextResponse.json({ error: '权限不足' }, { status: 403 });
    }

    // 动态导入数据库模块
    const usePostgreSQL = process.env.DATABASE_URL && process.env.NODE_ENV === 'production';
    
    if (usePostgreSQL) {
      const { getDatabase } = await import('@/lib/database-postgres');
      const database = getDatabase();
      
      // 查询sessions表的所有数据
      const sessionsResult = await database.query(`
        SELECT id, created_by, created_at, updated_at, 
               LENGTH(data) as data_length,
               SUBSTRING(data, 1, 200) as data_preview
        FROM sessions 
        ORDER BY created_at DESC
      `);
      
      // 查询用户表
      const usersResult = await database.query(`
        SELECT id, username, role, created_at
        FROM users 
        ORDER BY created_at DESC
      `);
      
      return NextResponse.json({
        databaseType: 'PostgreSQL',
        currentUser: {
          id: currentUser.id,
          username: currentUser.username,
          role: currentUser.role
        },
        sessions: sessionsResult.rows,
        users: usersResult.rows,
        environment: {
          NODE_ENV: process.env.NODE_ENV,
          DATABASE_URL_EXISTS: !!process.env.DATABASE_URL
        }
      });
    } else {
      const { getDatabase } = await import('@/lib/database-sqlite');
      const database = getDatabase();
      
      // SQLite查询
      const sessionsStmt = database.prepare(`
        SELECT id, created_by, created_at, updated_at, 
               LENGTH(data) as data_length,
               SUBSTR(data, 1, 200) as data_preview
        FROM sessions 
        ORDER BY created_at DESC
      `);
      
      const usersStmt = database.prepare(`
        SELECT id, username, role, created_at
        FROM users 
        ORDER BY created_at DESC
      `);
      
      return NextResponse.json({
        databaseType: 'SQLite',
        currentUser: {
          id: currentUser.id,
          username: currentUser.username,
          role: currentUser.role
        },
        sessions: sessionsStmt.all(),
        users: usersStmt.all(),
        environment: {
          NODE_ENV: process.env.NODE_ENV,
          DATABASE_URL_EXISTS: !!process.env.DATABASE_URL
        }
      });
    }
    
  } catch (error) {
    console.error('调试API失败:', error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 });
  }
} 