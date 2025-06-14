/**
 * 用户登出API路由
 */

import { NextRequest, NextResponse } from 'next/server';
import { ApiResponse } from '@/lib/types';
import { removeAuthSession } from '@/lib/auth';

export async function POST(request: NextRequest): Promise<NextResponse<ApiResponse<null>>> {
  try {
    // 从cookie或header获取token
    const token = request.cookies.get('auth-token')?.value || 
                  request.headers.get('authorization')?.replace('Bearer ', '');

    if (token) {
      // 删除认证会话
      await removeAuthSession(token);
    }

    const response = NextResponse.json({
      success: true,
      message: '登出成功'
    });

    // 清除cookie
    response.cookies.delete('auth-token');

    return response;

  } catch (error) {
    console.error('登出失败:', error);
    return NextResponse.json({
      success: false,
      error: '服务器内部错误'
    }, { status: 500 });
  }
} 