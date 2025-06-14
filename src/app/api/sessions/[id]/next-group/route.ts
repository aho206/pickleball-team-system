/**
 * 下一组进入场地API路由
 */

import { NextRequest, NextResponse } from 'next/server';
import { GameSession, ApiResponse } from '@/lib/types';
import { updatePlayerStats, autoMaintainQueue } from '@/lib/algorithm';
import { getGameSession, saveGameSession } from '@/lib/memory-store';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse<ApiResponse<GameSession>>> {
  try {
    const sessionId = params.id;
    const { courtId } = await request.json();

    if (!sessionId) {
      return NextResponse.json({
        success: false,
        error: '球局ID不能为空'
      }, { status: 400 });
    }

    if (typeof courtId !== 'number' || courtId < 1) {
      return NextResponse.json({
        success: false,
        error: '无效的场地ID'
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
      }, { status: 400 });
    }

    // 如果场地有正在进行的比赛，先结束它并更新统计
    if (court.team1 && court.team2 && court.status === 'playing') {
      const completedGame = {
        team1: court.team1,
        team2: court.team2
      };

      // 更新参与者统计信息
      updatePlayerStats(session.participants, completedGame);
      
      // 更新总比赛次数
      session.stats.totalGamesPlayed += 1;
      
      // 将刚结束比赛的玩家状态设为resting
      const finishedPlayerIds = [
        court.team1.player1,
        court.team1.player2,
        court.team2.player1,
        court.team2.player2
      ];
      
      for (const participant of session.participants) {
        if (finishedPlayerIds.includes(participant.id)) {
          participant.status = 'resting';
        }
      }
    }

    // 清空当前场地
    court.team1 = null;
    court.team2 = null;
    court.status = 'empty';
    court.startTime = undefined;

    // 如果有等待队列，让下一组进入场地
    if (session.queue.length > 0) {
      const nextMatch = session.queue.shift()!;
      court.team1 = nextMatch.team1;
      court.team2 = nextMatch.team2;
      court.status = 'playing';
      court.startTime = new Date();

      // 更新参与者状态：新上场的设为playing
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
    }

    // 使用新的智能等待队列管理函数
    autoMaintainQueue(session);

    // 更新球局时间
    session.updatedAt = new Date();

    // 保存到内存存储
    await saveGameSession(session, session.createdBy);

    return NextResponse.json({
      success: true,
      data: session,
      message: '下一组已进入场地'
    });

  } catch (error) {
    console.error('下一组进入场地失败:', error);
    return NextResponse.json({
      success: false,
      error: '服务器内部错误'
    }, { status: 500 });
  }
} 