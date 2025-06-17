/**
 * 生成新轮次API路由
 */

import { NextRequest, NextResponse } from 'next/server';
import { GameSession, ApiResponse } from '@/lib/types';
import { generateOptimalTeams } from '@/lib/algorithm';
import { getGameSession, saveGameSession } from '@/lib/memory-store';

export async function POST(
  request: NextRequest,
  { params }: { params: { sessionId: string } }
): Promise<NextResponse<ApiResponse<GameSession>>> {
  try {
    const sessionId = params.sessionId;

    if (!sessionId) {
      return NextResponse.json({
        success: false,
        error: '球局ID不能为空'
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

    // 生成新的队伍分配
    const assignment = generateOptimalTeams(
      session.participants,
      session.settings.courtCount,
      session.weights
    );

    // 更新球局数据
    session.courts = assignment.courts;
    session.queue = assignment.queue;
    session.stats.currentRound += 1;
    session.updatedAt = new Date();

    // 更新参与者状态
    for (const participant of session.participants) {
      participant.status = 'resting';
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

    // 保存到内存存储
    await saveGameSession(session, session.createdBy);

    return NextResponse.json({
      success: true,
      data: session,
      message: '新轮次生成成功'
    });

  } catch (error) {
    console.error('生成新轮次失败:', error);
    return NextResponse.json({
      success: false,
      error: '服务器内部错误'
    }, { status: 500 });
  }
} 