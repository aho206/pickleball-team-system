/**
 * 会话管理API路由
 */

import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { GameSession, Participant, CreateSessionRequest, ApiResponse } from '@/lib/types';
import { generateOptimalTeams } from '@/lib/algorithm';
import { saveGameSession, getGameSession, validateCustomSessionId, isSessionIdExists, deleteGameSession } from '@/lib/memory-store';
import { validateAuthSession, isAdmin, isSuperAdmin } from '@/lib/auth';

/**
 * 创建新的游戏会话
 */
export async function POST(request: NextRequest): Promise<NextResponse<ApiResponse<GameSession>>> {
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
        error: '权限不足，仅管理员可以创建会话'
      }, { status: 403 });
    }

    const body: CreateSessionRequest = await request.json();
    const { participantNames, courtCount, maxGamesPerRound = 10, customSessionId } = body;

    // 验证输入
    if (!participantNames || !Array.isArray(participantNames) || participantNames.length < 4) {
      return NextResponse.json({
        success: false,
        error: '至少需要4个参与者'
      }, { status: 400 });
    }

    if (!courtCount || courtCount < 1 || courtCount > 10) {
      return NextResponse.json({
        success: false,
        error: '场地数量必须在1-10之间'
      }, { status: 400 });
    }

    // 处理会话ID
    let sessionId: string;
    
    if (customSessionId) {
      // 验证自定义会话ID格式
      const validation = validateCustomSessionId(customSessionId);
      if (!validation.valid) {
        return NextResponse.json({
          success: false,
          error: validation.error
        }, { status: 400 });
      }
      
      // 检查会话ID是否已存在
      if (isSessionIdExists(customSessionId)) {
        return NextResponse.json({
          success: false,
          error: '会话ID已存在，请选择其他ID'
        }, { status: 409 });
      }
      
      sessionId = customSessionId;
    } else {
      // 使用UUID生成随机会话ID
      sessionId = uuidv4();
    }

    // 创建参与者
    const participants: Participant[] = participantNames.map(name => ({
      id: uuidv4(),
      name: name.trim(),
      gamesPlayed: 0,
      restRounds: 0,
      teammates: {},
      opponents: {},
      status: 'resting',
      joinedAt: new Date(),
      hasLeft: false  // 初始化为未离开
    }));

    // 创建游戏会话
    const session: GameSession = {
      id: sessionId,
      participants,
      courts: [],
      queue: [],
      weights: [],
      createdBy: currentUser.id, // 添加创建者信息
      createdAt: new Date(),
      updatedAt: new Date(),
      settings: {
        courtCount,
        participantCount: participants.length,
        maxGamesPerRound
      },
      stats: {
        totalGamesPlayed: 0,
        currentRound: 1
      }
    };

    // 生成初始队伍分配
    const assignment = generateOptimalTeams(participants, courtCount, []);
    session.courts = assignment.courts;
    session.queue = assignment.queue;

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
    await saveGameSession(session, currentUser.id);

    return NextResponse.json({
      success: true,
      data: session,
      message: '会话创建成功'
    });

  } catch (error) {
    console.error('创建会话失败:', error);
    return NextResponse.json({
      success: false,
      error: '服务器内部错误'
    }, { status: 500 });
  }
}

/**
 * 获取会话信息
 */
export async function GET(request: NextRequest): Promise<NextResponse<ApiResponse<GameSession>>> {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('id');

    if (!sessionId) {
      return NextResponse.json({
        success: false,
        error: '球局ID不能为空'
      }, { status: 400 });
    }

    // 从内存存储获取数据
    const session = await getGameSession(sessionId);
    
    if (!session) {
      return NextResponse.json({
        success: false,
        error: '球局不存在'
      }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: session,
      message: '获取球局成功'
    });

  } catch (error) {
    console.error('获取球局失败:', error);
    return NextResponse.json({
      success: false,
      error: '服务器内部错误'
    }, { status: 500 });
  }
}

/**
 * 删除会话
 */
export async function DELETE(request: NextRequest): Promise<NextResponse<ApiResponse<void>>> {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('id');

    if (!sessionId) {
      return NextResponse.json({
        success: false,
        error: '球局ID不能为空'
      }, { status: 400 });
    }

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
        error: '权限不足，仅管理员可以删除会话'
      }, { status: 403 });
    }

    // 从内存存储删除数据
    await deleteGameSession(sessionId);

    return NextResponse.json({
      success: true,
      message: '会话删除成功'
    });

  } catch (error) {
    console.error('删除会话失败:', error);
    return NextResponse.json({
      success: false,
      error: '服务器内部错误'
    }, { status: 500 });
  }
} 