/**
 * 调试API - 检查数据库原始数据和JSON解析
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

    // 直接查询PostgreSQL原始数据
    const { getDatabase } = await import('@/lib/database-postgres');
    const database = getDatabase();
    
    // 查询原始数据
    const rawResult = await database.query(`
      SELECT id, created_by, created_at, updated_at, data
      FROM sessions 
      ORDER BY created_at DESC
    `);
    
    const results: any = {
      currentUser: {
        id: currentUser.id,
        username: currentUser.username,
        role: currentUser.role
      },
      rawData: rawResult.rows.map(row => ({
        id: row.id,
        created_by: row.created_by,
        created_at: row.created_at,
        updated_at: row.updated_at,
        dataType: typeof row.data,
        dataIsObject: typeof row.data === 'object',
        dataKeys: typeof row.data === 'object' ? Object.keys(row.data || {}) : null,
        dataPreview: typeof row.data === 'object' 
          ? JSON.stringify(row.data).substring(0, 200)
          : (row.data ? row.data.substring(0, 200) : null)
      })),
      parsedData: []
    };

    // 尝试解析每个数据
    for (const row of rawResult.rows) {
      try {
        // PostgreSQL JSONB字段已经是对象，不需要JSON.parse
        const parsed = typeof row.data === 'object' ? row.data : JSON.parse(row.data);
        results.parsedData.push({
          id: row.id,
          success: true,
          parsedId: parsed.id,
          parsedCreatedBy: parsed.createdBy,
          participantCount: parsed.participants?.length || 0,
          hasQueue: !!parsed.queue,
          queueLength: parsed.queue?.length || 0
        });
      } catch (error) {
        results.parsedData.push({
          id: row.id,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    return NextResponse.json(results);
    
  } catch (error) {
    console.error('原始数据调试API失败:', error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 });
  }
} 