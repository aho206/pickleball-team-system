/**
 * 下一组进入场地API路由
 */

import { NextRequest, NextResponse } from 'next/server';
import { GameSession, ApiResponse } from '@/lib/types';
import { updatePlayerStats, generateOptimalTeams } from '@/lib/algorithm';
import { getGameSession, saveGameSession } from '@/lib/memory-store';

export async function POST(
  request: NextRequest,
  { params }: { params: { sessionId: string } }
): Promise<NextResponse<ApiResponse<GameSession>>> {
  try {
    const { sessionId } = params;
    const { courtId } = await request.json();

    if (!sessionId) {
      return NextResponse.json({
        success: false,
        error: '缺少会话ID'
      }, { status: 400 });
    }

    if (typeof courtId !== 'number' || courtId < 1) {
      return NextResponse.json({
        success: false,
        error: '无效的场地ID'
      }, { status: 400 });
    }

    // 从内存存储获取会话数据
    const session = await getGameSession(sessionId);
    
    if (!session) {
      return NextResponse.json({
        success: false,
        error: '会话不存在'
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

      // 如果等待队列变少了，尝试生成新的等待队伍
      if (session.queue.length < 2) {
        const restingParticipants = session.participants.filter(p => p.status === 'resting');
        
        // 如果有足够的休息参与者，生成新的等待队伍
        if (restingParticipants.length >= 4) {
          const newAssignment = generateOptimalTeams(
            session.participants,
            session.settings.courtCount,
            session.weights
          );
          
          // 只添加新的等待队伍，不影响当前比赛
          const newQueueMatches = newAssignment.queue.filter(match => {
            const matchPlayerIds = [
              match.team1.player1,
              match.team1.player2,
              match.team2.player1,
              match.team2.player2
            ];
            
            // 确保这些玩家都在休息中
            return matchPlayerIds.every(id => {
              const participant = session.participants.find(p => p.id === id);
              return participant && participant.status === 'resting';
            });
          });
          
          // 添加新的等待队伍
          session.queue.push(...newQueueMatches);
          
          // 更新新加入等待队列的参与者状态
          for (const match of newQueueMatches) {
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
    }

    // 更新会话时间
    session.updatedAt = new Date();

    // 保存到内存存储
    await saveGameSession(session);

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