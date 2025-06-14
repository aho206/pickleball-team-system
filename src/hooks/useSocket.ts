/**
 * Socket.io 客户端 Hook
 * 用于实时通信功能
 */

import { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { UserRole } from '@/lib/types';

export function useSocket(sessionId?: string, userRole?: UserRole) {
  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!sessionId || !userRole) return;

    // 创建 Socket.io 连接
    const socket = io(process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3000', {
      transports: ['websocket', 'polling']
    });

    socketRef.current = socket;

    // 连接事件
    socket.on('connect', () => {
      console.log('Socket 连接成功:', socket.id);
      setIsConnected(true);
      setError(null);
      
      // 加入会话房间
      socket.emit('join-session', sessionId, userRole);
    });

    // 断开连接事件
    socket.on('disconnect', () => {
      console.log('Socket 断开连接');
      setIsConnected(false);
    });

    // 错误事件
    socket.on('error', (message: string) => {
      console.error('Socket 错误:', message);
      setError(message);
    });

    // 连接错误
    socket.on('connect_error', (error) => {
      console.error('Socket 连接错误:', error);
      setError('连接失败，请检查网络');
      setIsConnected(false);
    });

    // 清理函数
    return () => {
      socket.disconnect();
      socketRef.current = null;
      setIsConnected(false);
    };
  }, [sessionId, userRole]);

  // 发送事件的辅助函数
  const emit = (event: string, ...args: any[]) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit(event, ...args);
    } else {
      console.warn('Socket 未连接，无法发送事件:', event);
    }
  };

  // 监听事件的辅助函数
  const on = (event: string, handler: (...args: any[]) => void) => {
    if (socketRef.current) {
      socketRef.current.on(event, handler);
    }
  };

  // 移除事件监听器
  const off = (event: string, handler?: (...args: any[]) => void) => {
    if (socketRef.current) {
      socketRef.current.off(event, handler);
    }
  };

  return {
    socket: socketRef.current,
    isConnected,
    error,
    emit,
    on,
    off
  };
}

// 管理员专用 Hook
export function useAdminSocket(sessionId: string) {
  const { socket, isConnected, error, emit, on, off } = useSocket(sessionId, 'admin');

  const endCourt = (courtId: number) => {
    emit('admin-end-court', sessionId, courtId);
  };

  const addParticipant = (name: string) => {
    emit('admin-add-participant', sessionId, name);
  };

  const removeParticipant = (participantId: string) => {
    emit('admin-remove-participant', sessionId, participantId);
  };

  const markAway = (participantId: string) => {
    emit('admin-mark-away', sessionId, participantId);
  };

  const markReturn = (participantId: string) => {
    emit('admin-mark-return', sessionId, participantId);
  };

  return {
    socket,
    isConnected,
    error,
    on,
    off,
    endCourt,
    addParticipant,
    removeParticipant,
    markAway,
    markReturn
  };
}

// 超级管理员专用 Hook
export function useSuperAdminSocket(sessionId: string) {
  const { socket, isConnected, error, emit, on, off } = useSocket(sessionId, 'superadmin');

  const setWeight = (weight: {
    player1: string;
    player2: string;
    weight: number;
    type: 'teammate' | 'opponent';
  }) => {
    emit('superadmin-set-weight', sessionId, weight);
  };

  const removeWeight = (weightId: string) => {
    emit('superadmin-remove-weight', sessionId, weightId);
  };

  return {
    socket,
    isConnected,
    error,
    on,
    off,
    setWeight,
    removeWeight
  };
}

// 参与者专用 Hook
export function useParticipantSocket(sessionId: string) {
  const { socket, isConnected, error, on, off } = useSocket(sessionId, 'participant');

  return {
    socket,
    isConnected,
    error,
    on,
    off
  };
} 