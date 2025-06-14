/**
 * 开始下一轮比赛的API路由
 */

import { NextRequest, NextResponse } from 'next/server';
import { GameSession, ApiResponse } from '@/lib/types';
import { generateOptimalTeams } from '@/lib/algorithm';
import { getGameSession, saveGameSession } from '@/lib/memory-store';
import { validateAuthSession, isAdmin } from '@/lib/auth';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
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
        error: '权限不足，仅管理员可以开始下一轮'
      }, { status: 403 });
    }

    const sessionId = params.id;
    const session = await getGameSession(sessionId);

    if (!session) {
      return NextResponse.json({
        success: false,
        error: '球局不存在'
      }, { status: 404 });
    }

    // 检查是否有正在进行的比赛
    const hasActiveGames = session.courts.some(court => court.status === 'playing');
    if (hasActiveGames) {
      return NextResponse.json({
        success: false,
        error: '还有比赛正在进行中，请等待所有比赛结束后再开始下一轮'
      }, { status: 400 });
    }

    // 更新统计信息
    session.stats.currentRound += 1;

    // 为所有参与者增加休息轮数
    for (const participant of session.participants) {
      if (participant.status === 'resting') {
        participant.restRounds += 1;
      }
    }

    // 生成新的队伍分配
    const assignment = generateOptimalTeams(
      session.participants.filter(p => !p.hasLeft), // 只包含未离开的参与者
      session.settings.courtCount,
      session.weights || []
    );

    session.courts = assignment.courts;
    session.queue = assignment.queue;

    // 重置所有参与者状态为休息
    for (const participant of session.participants) {
      if (!participant.hasLeft) {
        participant.status = 'resting';
      }
    }

    // 设置正在比赛的参与者状态
    for (const court of session.courts) {
      if (court.team1 && court.team2) {
        const playingPlayerIds = [
          court.team1.player1,
          court.team1.player2,
          court.team2.player1,
          court.team2.player2
        ];
        
        for (const participant of session.participants) {
          if (playingPlayerIds.includes(participant.id)) {
            participant.status = 'playing';
          }
        }
      }
    }

    // 设置排队等待的参与者状态
    for (const match of session.queue) {
      const queuedPlayerIds = [
        match.team1.player1,
        match.team1.player2,
        match.team2.player1,
        match.team2.player2
      ];
      
      for (const participant of session.participants) {
        if (queuedPlayerIds.includes(participant.id) && participant.status === 'resting') {
          participant.status = 'queued';
        }
      }
    }

    session.updatedAt = new Date();

    // 保存更新后的球局
    await saveGameSession(session, currentUser.id);

    return NextResponse.json({
      success: true,
      data: session,
      message: '下一轮开始成功'
    });

  } catch (error) {
    console.error('开始下一轮失败:', error);
    return NextResponse.json({
      success: false,
      error: '服务器内部错误'
    }, { status: 500 });
  }
} 