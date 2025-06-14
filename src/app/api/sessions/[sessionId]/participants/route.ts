/**
 * 参与者管理API路由
 */

import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { GameSession, Participant, ApiResponse } from '@/lib/types';
import { getGameSession, saveGameSession } from '@/lib/memory-store';
import { validateAuthSession, isAdmin } from '@/lib/auth';
import { maintainQueueSize } from '@/lib/algorithm';

/**
 * 添加新参与者到会话
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { sessionId: string } }
): Promise<NextResponse<ApiResponse<GameSession>>> {
  try {
    const { sessionId } = params;
    
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
        error: '权限不足，仅管理员可以添加参与者'
      }, { status: 403 });
    }

    const { name } = await request.json();

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json({
        success: false,
        error: '参与者姓名不能为空'
      }, { status: 400 });
    }

    if (name.trim().length > 20) {
      return NextResponse.json({
        success: false,
        error: '参与者姓名不能超过20个字符'
      }, { status: 400 });
    }

    // 获取会话数据
    const session = await getGameSession(sessionId);
    
    if (!session) {
      return NextResponse.json({
        success: false,
        error: '会话不存在'
      }, { status: 404 });
    }

    // 检查是否有权限管理此会话（超级管理员可以管理所有会话，管理员只能管理自己创建的）
    if (currentUser.role !== 'superadmin' && session.createdBy !== currentUser.id) {
      return NextResponse.json({
        success: false,
        error: '权限不足，只能管理自己创建的会话'
      }, { status: 403 });
    }

    // 检查姓名是否已存在
    const existingParticipant = session.participants.find(
      p => p.name.toLowerCase() === name.trim().toLowerCase()
    );
    
    if (existingParticipant) {
      return NextResponse.json({
        success: false,
        error: '参与者姓名已存在'
      }, { status: 409 });
    }

    // 计算当前活跃参与者的最少游戏场数
    const activeParticipants = session.participants.filter(p => !p.hasLeft);
    const minGamesPlayed = activeParticipants.length > 0 
      ? Math.min(...activeParticipants.map(p => p.gamesPlayed))
      : 0;

    // 创建新参与者
    const newParticipant: Participant = {
      id: uuidv4(),
      name: name.trim(),
      gamesPlayed: minGamesPlayed, // 设为当前最少场数
      restRounds: 0, // 新人刚加入，休息轮数为0
      teammates: {},
      opponents: {},
      status: 'resting',
      joinedAt: new Date(),
      hasLeft: false
    };

    // 添加到参与者列表
    session.participants.push(newParticipant);

    // 更新会话设置
    session.settings.participantCount = session.participants.length;
    session.updatedAt = new Date();

    // 重新生成等待队列，让新人能够参与下一轮分配
    maintainQueueSize(session, 2);

    // 保存到内存存储
    await saveGameSession(session, session.createdBy);

    return NextResponse.json({
      success: true,
      data: session,
      message: `${newParticipant.name} 已成功加入会话`
    });

  } catch (error) {
    console.error('添加参与者失败:', error);
    return NextResponse.json({
      success: false,
      error: '服务器内部错误'
    }, { status: 500 });
  }
} 