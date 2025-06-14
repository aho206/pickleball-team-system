/**
 * 权重管理API路由
 */

import { NextRequest, NextResponse } from 'next/server';
import { ApiResponse, Weight } from '@/lib/types';
import { validateAuthSession, isSuperAdmin } from '@/lib/auth';
import { getGameSession, saveGameSession } from '@/lib/memory-store';
import { v4 as uuidv4 } from 'uuid';

/**
 * 添加权重设置
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { sessionId: string } }
): Promise<NextResponse<ApiResponse<Weight>>> {
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
        error: '权限不足，仅超级管理员可以设置权重'
      }, { status: 403 });
    }

    const sessionId = params.sessionId;
    const body = await request.json();
    const { player1, player2, weight, type } = body;

    // 验证输入
    if (!player1 || !player2 || !weight || !type) {
      return NextResponse.json({
        success: false,
        error: '参数不完整'
      }, { status: 400 });
    }

    if (player1 === player2) {
      return NextResponse.json({
        success: false,
        error: '不能为同一个人设置权重'
      }, { status: 400 });
    }

    if (weight < 1 || weight > 10) {
      return NextResponse.json({
        success: false,
        error: '权重值必须在1-10之间'
      }, { status: 400 });
    }

    if (!['teammate', 'opponent'].includes(type)) {
      return NextResponse.json({
        success: false,
        error: '权重类型必须是teammate或opponent'
      }, { status: 400 });
    }

    // 获取会话
    const session = await getGameSession(sessionId);
    if (!session) {
      return NextResponse.json({
        success: false,
        error: '会话不存在'
      }, { status: 404 });
    }

    // 检查参与者是否存在
    const participant1 = session.participants.find(p => p.id === player1);
    const participant2 = session.participants.find(p => p.id === player2);
    
    if (!participant1 || !participant2) {
      return NextResponse.json({
        success: false,
        error: '指定的参与者不存在'
      }, { status: 400 });
    }

    // 检查是否已存在相同类型的权重设置
    const existingWeight = session.weights.find(w => 
      ((w.player1 === player1 && w.player2 === player2) ||
       (w.player1 === player2 && w.player2 === player1)) &&
      w.type === type
    );

    if (existingWeight) {
      return NextResponse.json({
        success: false,
        error: `这两个参与者之间已存在${type === 'teammate' ? '队友' : '对手'}权重设置`
      }, { status: 409 });
    }

    // 创建新权重
    const newWeight: Weight = {
      id: uuidv4(),
      player1,
      player2,
      weight,
      type,
      createdAt: new Date()
    };

    // 添加到会话
    session.weights.push(newWeight);
    session.updatedAt = new Date();

    // 保存会话
    await saveGameSession(session);

    return NextResponse.json({
      success: true,
      data: newWeight,
      message: '权重设置添加成功'
    });

  } catch (error) {
    console.error('添加权重失败:', error);
    return NextResponse.json({
      success: false,
      error: '服务器内部错误'
    }, { status: 500 });
  }
}

/**
 * 删除权重设置
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { sessionId: string } }
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
        error: '权限不足，仅超级管理员可以删除权重'
      }, { status: 403 });
    }

    const sessionId = params.sessionId;
    const { searchParams } = new URL(request.url);
    const weightId = searchParams.get('weightId');

    if (!weightId) {
      return NextResponse.json({
        success: false,
        error: '未提供权重ID'
      }, { status: 400 });
    }

    // 获取会话
    const session = await getGameSession(sessionId);
    if (!session) {
      return NextResponse.json({
        success: false,
        error: '会话不存在'
      }, { status: 404 });
    }

    // 查找权重
    const weightIndex = session.weights.findIndex(w => w.id === weightId);
    if (weightIndex === -1) {
      return NextResponse.json({
        success: false,
        error: '权重设置不存在'
      }, { status: 404 });
    }

    // 删除权重
    session.weights.splice(weightIndex, 1);
    session.updatedAt = new Date();

    // 保存会话
    await saveGameSession(session);

    return NextResponse.json({
      success: true,
      data: null,
      message: '权重设置删除成功'
    });

  } catch (error) {
    console.error('删除权重失败:', error);
    return NextResponse.json({
      success: false,
      error: '服务器内部错误'
    }, { status: 500 });
  }
} 