import { NextResponse } from 'next/server';
import { getGameSession, saveGameSession } from '@/lib/memory-store';
import { v4 as uuidv4 } from 'uuid';

// 添加参与者到球局
export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const sessionId = params.id;
    const { name } = await request.json();

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json({ 
        success: false, 
        error: '参与者姓名不能为空' 
      }, { status: 400 });
    }

    const session = await getGameSession(sessionId);
    if (!session) {
      return NextResponse.json({ 
        success: false, 
        error: '球局不存在' 
      }, { status: 404 });
    }

    // 检查是否已存在同名参与者
    const existingParticipant = session.participants.find((p: any) => p.name === name.trim());
    if (existingParticipant) {
      return NextResponse.json({ 
        success: false, 
        error: '参与者已存在' 
      }, { status: 400 });
    }

    // 添加新参与者
    const newParticipant = {
      id: uuidv4(),
      name: name.trim(),
      gamesPlayed: 0,
      restRounds: 0,
      teammates: {},
      opponents: {},
      status: 'resting' as const,
      joinedAt: new Date(),
      hasLeft: false
    };

    session.participants.push(newParticipant);
    session.updatedAt = new Date();

    // 保存更新后的球局
    await saveGameSession(session, session.createdBy);
    
    return NextResponse.json({ success: true, data: session });
  } catch (error) {
    console.error('添加参与者失败:', error);
    return NextResponse.json({ success: false, error: '服务器错误' }, { status: 500 });
  }
}

// 移除参与者从球局
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const sessionId = params.id;
    const { searchParams } = new URL(request.url);
    const participantId = searchParams.get('participantId');

    if (!participantId) {
      return NextResponse.json({ 
        success: false, 
        error: '参与者ID不能为空' 
      }, { status: 400 });
    }

    const session = await getGameSession(sessionId);
    if (!session) {
      return NextResponse.json({ 
        success: false, 
        error: '球局不存在' 
      }, { status: 404 });
    }

    // 移除参与者
    session.participants = session.participants.filter(p => p.id !== participantId);
    session.updatedAt = new Date();

    // 保存更新后的球局
    await saveGameSession(session, session.createdBy);
    
    return NextResponse.json({ success: true, data: session });
  } catch (error) {
    console.error('移除参与者失败:', error);
    return NextResponse.json({ success: false, error: '服务器错误' }, { status: 500 });
  }
} 