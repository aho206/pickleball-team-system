/**
 * 联系信息API路由
 */

import { NextRequest, NextResponse } from 'next/server';
import { ApiResponse } from '@/lib/types';
import { getSuperAdminWechatId, updateSuperAdminWechatId } from '@/lib/database';
import { validateAuthSession } from '@/lib/auth';

/**
 * 获取联系信息
 */
export async function GET(): Promise<NextResponse<ApiResponse<{ wechatId: string }>>> {
  try {
    const wechatId = getSuperAdminWechatId();
    
    return NextResponse.json({
      success: true,
      data: {
        wechatId
      }
    });
  } catch (error) {
    console.error('获取联系信息失败:', error);
    return NextResponse.json({
      success: false,
      error: '服务器内部错误'
    }, { status: 500 });
  }
}

/**
 * 更新联系信息（仅超级管理员）
 */
export async function PUT(request: NextRequest): Promise<NextResponse<ApiResponse<null>>> {
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
    if (currentUser.role !== 'superadmin') {
      return NextResponse.json({
        success: false,
        error: '权限不足，仅超级管理员可以修改联系信息'
      }, { status: 403 });
    }

    const { wechatId } = await request.json();

    if (!wechatId || typeof wechatId !== 'string') {
      return NextResponse.json({
        success: false,
        error: '微信号不能为空'
      }, { status: 400 });
    }

    // 验证微信号格式（简单验证）
    if (wechatId.length < 1 || wechatId.length > 50) {
      return NextResponse.json({
        success: false,
        error: '微信号长度应在1-50个字符之间'
      }, { status: 400 });
    }

    // 更新微信号
    const success = updateSuperAdminWechatId(currentUser.id, wechatId);
    
    if (!success) {
      return NextResponse.json({
        success: false,
        error: '更新失败'
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      data: null,
      message: '联系信息更新成功'
    });

  } catch (error) {
    console.error('更新联系信息失败:', error);
    return NextResponse.json({
      success: false,
      error: '服务器内部错误'
    }, { status: 500 });
  }
} 