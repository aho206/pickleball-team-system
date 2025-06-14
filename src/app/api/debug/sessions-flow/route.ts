/**
 * 调试API - 跟踪球局查询流程
 */

import { NextRequest, NextResponse } from 'next/server';
import { validateAuthSession, isSuperAdmin } from '@/lib/auth';
import { getUserGameSessions, getAllGameSessions } from '@/lib/memory-store';

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

    // 测试不同的查询方法
    const results: any = {
      currentUser: {
        id: currentUser.id,
        username: currentUser.username,
        role: currentUser.role
      },
      isSuperAdminCheck: isSuperAdmin(currentUser.role),
      queries: {}
    };

    // 1. 测试getAllGameSessions
    try {
      const allSessions = await getAllGameSessions();
      results.queries.getAllGameSessions = {
        success: true,
        count: allSessions.length,
        sessionIds: allSessions.map(s => s.id),
        sessions: allSessions.map(s => ({
          id: s.id,
          createdBy: s.createdBy,
          participantCount: s.participants?.length || 0
        }))
      };
    } catch (error) {
      results.queries.getAllGameSessions = {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }

    // 2. 测试getUserGameSessions
    try {
      const userSessions = await getUserGameSessions(currentUser.id);
      results.queries.getUserGameSessions = {
        success: true,
        count: userSessions.length,
        sessionIds: userSessions.map(s => s.id),
        sessions: userSessions.map(s => ({
          id: s.id,
          createdBy: s.createdBy,
          participantCount: s.participants?.length || 0
        }))
      };
    } catch (error) {
      results.queries.getUserGameSessions = {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }

    // 3. 直接测试数据库查询
    try {
      const { getAllSessions, getUserSessions } = await import('@/lib/database');
      
      const dbAllSessions = await getAllSessions();
      results.queries.dbGetAllSessions = {
        success: true,
        count: dbAllSessions.length,
        sessionIds: dbAllSessions.map(s => s.id),
        sessions: dbAllSessions.map(s => ({
          id: s.id,
          createdBy: s.createdBy,
          participantCount: s.participants?.length || 0
        }))
      };

      const dbUserSessions = await getUserSessions(currentUser.id);
      results.queries.dbGetUserSessions = {
        success: true,
        count: dbUserSessions.length,
        sessionIds: dbUserSessions.map(s => s.id),
        sessions: dbUserSessions.map(s => ({
          id: s.id,
          createdBy: s.createdBy,
          participantCount: s.participants?.length || 0
        }))
      };
    } catch (error) {
      results.queries.dbQueries = {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }

    return NextResponse.json(results);
    
  } catch (error) {
    console.error('调试流程API失败:', error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 });
  }
} 