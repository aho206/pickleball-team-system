/**
 * 场地管理API路由
 */

import { NextRequest, NextResponse } from 'next/server';
import { GameSession, ApiResponse } from '@/lib/types';
import { getGameSession, saveGameSession } from '@/lib/memory-store';
import { validateAuthSession, isAdmin } from '@/lib/auth';

/**
 * 更新场地名称
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string; courtId: string } }
): Promise<NextResponse<ApiResponse<GameSession>>> {
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
        error: '权限不足，仅管理员可以修改场地名称'
      }, { status: 403 });
    }

    const sessionId = params.id;
    const courtId = parseInt(params.courtId);
    const { name } = await request.json();

    if (!sessionId) {
      return NextResponse.json({
        success: false,
        error: '球局ID不能为空'
      }, { status: 400 });
    }

    if (isNaN(courtId) || courtId < 1) {
      return NextResponse.json({
        success: false,
        error: '无效的场地ID'
      }, { status: 400 });
    }

    if (typeof name !== 'string') {
      return NextResponse.json({
        success: false,
        error: '场地名称必须是字符串'
      }, { status: 400 });
    }

    // 验证场地名称长度
    const trimmedName = name.trim();
    if (trimmedName.length === 0) {
      return NextResponse.json({
        success: false,
        error: '场地名称不能为空'
      }, { status: 400 });
    }

    if (trimmedName.length > 20) {
      return NextResponse.json({
        success: false,
        error: '场地名称不能超过20个字符'
      }, { status: 400 });
    }

    // 从内存存储获取球局数据
    const session = await getGameSession(sessionId);
    
    if (!session) {
      return NextResponse.json({
        success: false,
        error: '球局不存在'
      }, { status: 404 });
    }

    // 找到指定场地
    const court = session.courts.find(c => c.id === courtId);
    
    if (!court) {
      return NextResponse.json({
        success: false,
        error: '场地不存在'
      }, { status: 404 });
    }

    // 检查是否有其他场地使用了相同的名称
    const existingCourt = session.courts.find(c => c.id !== courtId && c.name === trimmedName);
    if (existingCourt) {
      return NextResponse.json({
        success: false,
        error: '该场地名称已被使用'
      }, { status: 400 });
    }

    // 更新场地名称
    court.name = trimmedName;

    // 更新球局时间
    session.updatedAt = new Date();

    // 保存到内存存储
    await saveGameSession(session, session.createdBy);

    return NextResponse.json({
      success: true,
      data: session,
      message: '场地名称更新成功'
    });

  } catch (error) {
    console.error('更新场地名称失败:', error);
    return NextResponse.json({
      success: false,
      error: '服务器内部错误'
    }, { status: 500 });
  }
} 