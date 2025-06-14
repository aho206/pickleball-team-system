/**
 * 获取当前用户的球局列表API路由
 */

import { NextRequest, NextResponse } from 'next/server';
import { GameSession, ApiResponse } from '@/lib/types';
import { getUserGameSessions } from '@/lib/memory-store';
import { validateAuthSession, isAdmin } from '@/lib/auth';

/**
 * 获取当前用户的球局列表
 */
export async function GET(request: NextRequest): Promise<NextResponse<ApiResponse<GameSession[]>>> {
  try {
    // 验证认证
    const token = request.cookies.get('auth-token')?.value || 
                  request.headers.get('authorization')?.replace('Bearer ', '');

    if (!token) {
      return NextResponse.json({
        success: false,
        error: '未提供认证token'
      }, { status: 401 });
    }

    const currentUser = await validateAuthSession(token);
    if (!currentUser) {
      return NextResponse.json({
        success: false,
        error: '认证token无效或已过期'
      }, { status: 401 });
    }

    // 检查管理员权限
    if (!isAdmin(currentUser.role)) {
      return NextResponse.json({
        success: false,
        error: '权限不足，仅管理员可以查看球局列表'
      }, { status: 403 });
    }

    // 获取用户的球局列表
    const sessions = await getUserGameSessions(currentUser.id);

    return NextResponse.json({
      success: true,
      data: sessions,
      message: '获取球局列表成功'
    });

  } catch (error) {
    console.error('获取球局列表失败:', error);
    return NextResponse.json({
      success: false,
      error: '服务器内部错误'
    }, { status: 500 });
  }
} 