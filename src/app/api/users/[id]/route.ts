/**
 * 用户管理API路由
 */

import { NextRequest, NextResponse } from 'next/server';
import { ApiResponse, User } from '@/lib/types';
import { validateAuthSession, isSuperAdmin } from '@/lib/auth';
import { updateUser, deleteUser, getUserById } from '@/lib/database';

/**
 * 更新用户信息
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse<ApiResponse<User>>> {
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
        error: '权限不足，仅超级管理员可以管理用户'
      }, { status: 403 });
    }

    const userId = params.id;
    const body = await request.json();
    const { isActive } = body;

    // 验证目标用户存在
    const targetUser = await getUserById(userId);
    if (!targetUser) {
      return NextResponse.json({
        success: false,
        error: '用户不存在'
      }, { status: 404 });
    }

    // 不能修改超级管理员状态
    if (targetUser.role === 'superadmin') {
      return NextResponse.json({
        success: false,
        error: '不能修改超级管理员状态'
      }, { status: 403 });
    }

    // 更新用户状态
    const updatedUser = await updateUser(userId, { isActive });

    return NextResponse.json({
      success: true,
      data: updatedUser,
      message: '用户状态更新成功'
    });

  } catch (error) {
    console.error('更新用户失败:', error);
    return NextResponse.json({
      success: false,
      error: '服务器内部错误'
    }, { status: 500 });
  }
}

/**
 * 删除用户
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse<ApiResponse<null>>> {
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
        error: '权限不足，仅超级管理员可以删除用户'
      }, { status: 403 });
    }

    const userId = params.id;

    // 验证目标用户存在
    const targetUser = await getUserById(userId);
    if (!targetUser) {
      return NextResponse.json({
        success: false,
        error: '用户不存在'
      }, { status: 404 });
    }

    // 不能删除超级管理员
    if (targetUser.role === 'superadmin') {
      return NextResponse.json({
        success: false,
        error: '不能删除超级管理员'
      }, { status: 403 });
    }

    // 不能删除自己
    if (targetUser.id === currentUser.id) {
      return NextResponse.json({
        success: false,
        error: '不能删除自己'
      }, { status: 403 });
    }

    // 删除用户
    await deleteUser(userId);

    return NextResponse.json({
      success: true,
      data: null,
      message: '用户删除成功'
    });

  } catch (error) {
    console.error('删除用户失败:', error);
    return NextResponse.json({
      success: false,
      error: '服务器内部错误'
    }, { status: 500 });
  }
} 