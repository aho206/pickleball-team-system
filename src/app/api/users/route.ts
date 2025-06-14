/**
 * 用户管理API路由
 */

import { NextRequest, NextResponse } from 'next/server';
import { CreateUserRequest, ApiResponse, User } from '@/lib/types';
import { createUser, getAllUsers } from '@/lib/user-store';
import { validateAuthSession, isSuperAdmin } from '@/lib/auth';

/**
 * 创建新用户 (仅超级管理员)
 */
export async function POST(request: NextRequest): Promise<NextResponse<ApiResponse<Omit<User, 'passwordHash'>>>> {
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

    // 检查超级管理员权限
    if (!isSuperAdmin(currentUser.role)) {
      return NextResponse.json({
        success: false,
        error: '权限不足，仅超级管理员可以创建用户'
      }, { status: 403 });
    }

    const body: CreateUserRequest = await request.json();
    const { username, password, role } = body;

    // 验证输入
    if (!username || !password || !role) {
      return NextResponse.json({
        success: false,
        error: '用户名、密码和角色不能为空'
      }, { status: 400 });
    }

    if (role !== 'admin') {
      return NextResponse.json({
        success: false,
        error: '只能创建管理员角色的用户'
      }, { status: 400 });
    }

    // 创建用户
    const newUser = await createUser(body, currentUser.id);

    // 返回用户信息（不包含密码哈希）
    const userResponse = {
      id: newUser.id,
      username: newUser.username,
      role: newUser.role,
      createdBy: newUser.createdBy,
      createdAt: newUser.createdAt,
      isActive: newUser.isActive,
    };

    return NextResponse.json({
      success: true,
      data: userResponse,
      message: '用户创建成功'
    });

  } catch (error) {
    console.error('创建用户失败:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : '服务器内部错误'
    }, { status: 500 });
  }
}

/**
 * 获取用户列表 (仅超级管理员)
 */
export async function GET(request: NextRequest): Promise<NextResponse<ApiResponse<Omit<User, 'passwordHash'>[]>>> {
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

    // 检查超级管理员权限
    if (!isSuperAdmin(currentUser.role)) {
      return NextResponse.json({
        success: false,
        error: '权限不足，仅超级管理员可以查看用户列表'
      }, { status: 403 });
    }

    // 获取用户列表
    const users = await getAllUsers();

    return NextResponse.json({
      success: true,
      data: users,
      message: '获取用户列表成功'
    });

  } catch (error) {
    console.error('获取用户列表失败:', error);
    return NextResponse.json({
      success: false,
      error: '服务器内部错误'
    }, { status: 500 });
  }
} 