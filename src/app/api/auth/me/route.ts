/**
 * 获取当前用户信息API路由
 */

import { NextRequest, NextResponse } from 'next/server';
import { ApiResponse, User } from '@/lib/types';
import { validateAuthSession } from '@/lib/auth';

export async function GET(request: NextRequest): Promise<NextResponse<ApiResponse<Omit<User, 'passwordHash'>>>> {
  try {
    // 从cookie或header获取token
    const token = request.cookies.get('auth-token')?.value || 
                  request.headers.get('authorization')?.replace('Bearer ', '');

    if (!token) {
      return NextResponse.json({
        success: false,
        error: '未提供认证token'
      }, { status: 401 });
    }

    // 验证认证会话
    const user = await validateAuthSession(token);
    
    if (!user) {
      return NextResponse.json({
        success: false,
        error: '认证token无效或已过期'
      }, { status: 401 });
    }

    // 返回用户信息（不包含密码哈希）
    const userResponse = {
      id: user.id,
      username: user.username,
      role: user.role,
      createdBy: user.createdBy,
      createdAt: user.createdAt,
      lastLogin: user.lastLogin,
      isActive: user.isActive,
    };

    return NextResponse.json({
      success: true,
      data: userResponse,
      message: '获取用户信息成功'
    });

  } catch (error) {
    console.error('获取用户信息失败:', error);
    return NextResponse.json({
      success: false,
      error: '服务器内部错误'
    }, { status: 500 });
  }
} 