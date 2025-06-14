/**
 * 参与者离开API路由
 */

import { NextRequest, NextResponse } from 'next/server';
import { GameSession, ApiResponse } from '@/lib/types';
import { getGameSession, saveGameSession } from '@/lib/memory-store';

/**
 * 标记参与者离开
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { sessionId: string; participantId: string } }
): Promise<NextResponse<ApiResponse<GameSession>>> {
  try {
    const { sessionId, participantId } = params;
    const { reason } = await request.json();

    if (!sessionId || !participantId) {
      return NextResponse.json({
        success: false,
        error: '缺少会话ID或参与者ID'
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

    // 找到参与者
    const participant = session.participants.find(p => p.id === participantId);
    
    if (!participant) {
      return NextResponse.json({
        success: false,
        error: '参与者不存在'
      }, { status: 404 });
    }

    if (participant.hasLeft) {
      return NextResponse.json({
        success: false,
        error: '参与者已经离开'
      }, { status: 400 });
    }

    // 标记参与者离开
    participant.hasLeft = true;
    participant.leftAt = new Date();
    participant.leftReason = reason || '提前离开';
    participant.status = 'resting'; // 设置为休息状态

    // 从当前比赛中移除（如果正在比赛）
    for (const court of session.courts) {
      if (court.team1 && court.team2) {
        const playingPlayerIds = [
          court.team1.player1,
          court.team1.player2,
          court.team2.player1,
          court.team2.player2
        ];
        
        if (playingPlayerIds.includes(participantId)) {
          // 注意：这里不立即结束比赛，让当前比赛继续进行
          // 管理员可以手动处理这种情况
          console.log(`参与者 ${participant.name} 在比赛中离开，比赛继续进行`);
        }
      }
    }

    // 从等待队列中移除
    session.queue = session.queue.filter(match => {
      const queuePlayerIds = [
        match.team1.player1,
        match.team1.player2,
        match.team2.player1,
        match.team2.player2
      ];
      return !queuePlayerIds.includes(participantId);
    });

    // 更新会话时间
    session.updatedAt = new Date();

    // 保存到内存存储
    await saveGameSession(session, session.createdBy);

    return NextResponse.json({
      success: true,
      data: session,
      message: `${participant.name} 已标记为离开`
    });

  } catch (error) {
    console.error('标记参与者离开失败:', error);
    return NextResponse.json({
      success: false,
      error: '服务器内部错误'
    }, { status: 500 });
  }
}

/**
 * 参与者重新加入
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { sessionId: string; participantId: string } }
): Promise<NextResponse<ApiResponse<GameSession>>> {
  try {
    const { sessionId, participantId } = params;

    if (!sessionId || !participantId) {
      return NextResponse.json({
        success: false,
        error: '缺少会话ID或参与者ID'
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

    // 找到参与者
    const participant = session.participants.find(p => p.id === participantId);
    
    if (!participant) {
      return NextResponse.json({
        success: false,
        error: '参与者不存在'
      }, { status: 404 });
    }

    if (!participant.hasLeft) {
      return NextResponse.json({
        success: false,
        error: '参与者未离开'
      }, { status: 400 });
    }

    // 重新加入
    participant.hasLeft = false;
    participant.leftAt = undefined;
    participant.leftReason = undefined;
    participant.status = 'resting'; // 重新加入后处于休息状态

    // 更新会话时间
    session.updatedAt = new Date();

    // 保存到内存存储
    await saveGameSession(session, session.createdBy);

    return NextResponse.json({
      success: true,
      data: session,
      message: `${participant.name} 已重新加入`
    });

  } catch (error) {
    console.error('参与者重新加入失败:', error);
    return NextResponse.json({
      success: false,
      error: '服务器内部错误'
    }, { status: 500 });
  }
} 