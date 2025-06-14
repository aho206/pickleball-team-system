/**
 * 用户登录API路由
 */

import { NextRequest, NextResponse } from 'next/server';
import { LoginRequest, ApiResponse, User } from '@/lib/types';
import { validateUserLogin } from '@/lib/user-store';
import { generateToken, saveAuthSession } from '@/lib/auth';

export async function POST(request: NextRequest): Promise<NextResponse<ApiResponse<{ user: Omit<User, 'passwordHash'>; token: string }>>> {
  try {
    const body: LoginRequest = await request.json();
    const { username, password } = body;

    // 验证输入
    if (!username || !password) {
      return NextResponse.json({
        success: false,
        error: '用户名和密码不能为空'
      }, { status: 400 });
    }

    // 验证用户登录
    const user = await validateUserLogin(username, password);
    
    if (!user) {
      return NextResponse.json({
        success: false,
        error: '用户名或密码错误'
      }, { status: 401 });
    }

    // 生成JWT token
    const token = generateToken(user);

    // 保存认证会话
    await saveAuthSession(token, user);

    // 返回用户信息和token（不包含密码哈希）
    const userResponse = {
      id: user.id,
      username: user.username,
      role: user.role,
      createdBy: user.createdBy,
      createdAt: user.createdAt,
      lastLogin: user.lastLogin,
      isActive: user.isActive,
    };

    const response = NextResponse.json({
      success: true,
      data: {
        user: userResponse,
        token
      },
      message: '登录成功'
    });

    // 设置HTTP-only cookie
    response.cookies.set('auth-token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 24 * 60 * 60 * 1000, // 24小时
    });

    return response;

  } catch (error) {
    console.error('登录失败:', error);
    return NextResponse.json({
      success: false,
      error: '服务器内部错误'
    }, { status: 500 });
  }
} 