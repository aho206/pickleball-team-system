/**
 * 结束比赛的API路由
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
        error: '权限不足，仅管理员可以结束比赛'
      }, { status: 403 });
    }

    const sessionId = params.id;
    const { courtId } = await request.json();

    if (!courtId) {
      return NextResponse.json({
        success: false,
        error: '场地ID不能为空'
      }, { status: 400 });
    }

    const session = await getGameSession(sessionId);

    if (!session) {
      return NextResponse.json({
        success: false,
        error: '球局不存在'
      }, { status: 404 });
    }

    // 找到指定的场地
    const court = session.courts.find(c => c.id === courtId);
    if (!court) {
      return NextResponse.json({
        success: false,
        error: '场地不存在'
      }, { status: 404 });
    }

    if (court.status !== 'playing') {
      return NextResponse.json({
        success: false,
        error: '该场地没有正在进行的比赛'
      }, { status: 400 });
    }

    // 更新参与者统计
    if (court.team1 && court.team2) {
      const playingPlayerIds = [
        court.team1.player1,
        court.team1.player2,
        court.team2.player1,
        court.team2.player2
      ];

      for (const participant of session.participants) {
        if (playingPlayerIds.includes(participant.id)) {
          participant.gamesPlayed += 1;
          participant.status = 'resting';
          
          // 更新队友和对手统计
          const isTeam1 = court.team1.player1 === participant.id || court.team1.player2 === participant.id;
          const teammates = isTeam1 
            ? [court.team1.player1, court.team1.player2].filter(id => id !== participant.id)
            : [court.team2.player1, court.team2.player2].filter(id => id !== participant.id);
          const opponents = isTeam1 
            ? [court.team2.player1, court.team2.player2]
            : [court.team1.player1, court.team1.player2];

          // 更新队友统计
          for (const teammateId of teammates) {
            participant.teammates[teammateId] = (participant.teammates[teammateId] || 0) + 1;
          }

          // 更新对手统计
          for (const opponentId of opponents) {
            participant.opponents[opponentId] = (participant.opponents[opponentId] || 0) + 1;
          }
        }
      }
    }

    // 清空场地
    court.team1 = null;
    court.team2 = null;
    court.status = 'empty';
    court.startTime = undefined;

    // 更新统计信息
    session.stats.totalGamesPlayed += 1;

    // 如果有等待队列，安排下一场比赛
    if (session.queue.length > 0) {
      const nextMatch = session.queue.shift()!;
      court.team1 = nextMatch.team1;
      court.team2 = nextMatch.team2;
      court.status = 'playing';
      court.startTime = new Date();

      // 更新参与者状态
      const nextPlayingPlayerIds = [
        nextMatch.team1.player1,
        nextMatch.team1.player2,
        nextMatch.team2.player1,
        nextMatch.team2.player2
      ];

      for (const participant of session.participants) {
        if (nextPlayingPlayerIds.includes(participant.id)) {
          participant.status = 'playing';
        }
      }

      // 如果队列还有剩余，需要重新生成队列以补充
      if (session.queue.length < 2) {
        const assignment = generateOptimalTeams(
          session.participants.filter(p => !p.hasLeft),
          session.settings.courtCount,
          session.weights || []
        );
        
        // 保留当前正在进行的比赛，只更新队列
        session.queue = assignment.queue;
        
        // 更新排队状态
        for (const participant of session.participants) {
          if (participant.status === 'queued') {
            participant.status = 'resting';
          }
        }
        
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
      }
    }

    session.updatedAt = new Date();

    // 保存更新后的球局
    await saveGameSession(session, currentUser.id);

    return NextResponse.json({
      success: true,
      data: session,
      message: '比赛结束成功'
    });

  } catch (error) {
    console.error('结束比赛失败:', error);
    return NextResponse.json({
      success: false,
      error: '服务器内部错误'
    }, { status: 500 });
  }
} 