/**
 * 匹克球随机组队系统 - 核心类型定义
 */

// 参与者状态枚举
export type ParticipantStatus = 'playing' | 'queued' | 'resting' | 'away';

// 权重类型枚举
export type WeightType = 'teammate' | 'opponent';

// 用户角色枚举
export type UserRole = 'participant' | 'admin' | 'superadmin';

// 参与者接口
export interface Participant {
  id: string;
  name: string;
  gamesPlayed: number;
  restRounds: number;
  teammates: Record<string, number>;  // 队友记录 - playerId: 次数
  opponents: Record<string, number>;  // 对手记录 - playerId: 次数
  status: ParticipantStatus;
  joinedAt: Date;
  hasLeft: boolean;          // 是否已离开
  leftAt?: Date;            // 离开时间
  leftReason?: string;      // 离开原因（可选）
}

// 队伍接口
export interface Team {
  player1: string;
  player2: string;
}

// 场地状态枚举
export type CourtStatus = 'playing' | 'waiting' | 'empty';

// 场地接口
export interface Court {
  id: number;
  name?: string;  // 场地名称，可选字段
  team1: Team | null;
  team2: Team | null;
  status: CourtStatus;
  startTime?: Date;
}

// 权重设置接口
export interface Weight {
  id: string;
  player1: string;
  player2: string;
  weight: number; // 1-10
  type: WeightType;
  createdAt: Date;
}

// 比赛匹配接口
export interface GameMatch {
  team1: Team;
  team2: Team;
  courtId?: number;
}

// 游戏会话接口
export interface GameSession {
  id: string;
  participants: Participant[];
  courts: Court[];
  queue: GameMatch[];  // 预分配队列
  weights: Weight[];
  createdBy: string; // 创建者用户ID
  createdAt: Date;
  updatedAt: Date;
  settings: {
    courtCount: number;
    participantCount: number;
    maxGamesPerRound: number;
  };
  stats: {
    totalGamesPlayed: number;
    currentRound: number;
  };
}

// 算法计算结果接口
export interface TeamAssignmentResult {
  courts: Court[];
  queue: GameMatch[];
  waiting: string[];
  stats: {
    fairnessScore: number;
    weightEffectiveness: number;
    diversityScore: number;
  };
}

// 队伍评分详情接口
export interface TeamScoreDetails {
  fairnessScore: number;
  weightBonus: number;
  repetitionPenalty: number;
  randomFactor: number;
  totalScore: number;
}

// Socket.io 事件类型定义
export interface ServerToClientEvents {
  'session-updated': (session: GameSession) => void;
  'court-ended': (courtId: number) => void;
  'new-teams-assigned': (result: TeamAssignmentResult) => void;
  'participant-added': (participant: Participant) => void;
  'participant-removed': (participantId: string) => void;
  'weights-updated': (weights: Weight[]) => void;
  'error': (message: string) => void;
}

export interface ClientToServerEvents {
  'join-session': (sessionId: string, userRole: UserRole) => void;
  'admin-end-court': (sessionId: string, courtId: number) => void;
  'admin-add-participant': (sessionId: string, name: string) => void;
  'admin-remove-participant': (sessionId: string, participantId: string) => void;
  'admin-mark-away': (sessionId: string, participantId: string) => void;
  'admin-mark-return': (sessionId: string, participantId: string) => void;
  'superadmin-set-weight': (sessionId: string, weight: Omit<Weight, 'id' | 'createdAt'>) => void;
  'superadmin-remove-weight': (sessionId: string, weightId: string) => void;
}

// API 响应类型
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// 创建会话请求接口
export interface CreateSessionRequest {
  participantNames: string[];
  courtCount: number;
  maxGamesPerRound?: number;
  customSessionId?: string; // 可选的自定义会话ID
}

// 统计信息接口
export interface SessionStats {
  totalParticipants: number;
  activePlayers: number;
  totalGames: number;
  averageGamesPerPlayer: number;
  fairnessIndex: number; // 0-1, 1为完全公平
  mostActivePlayer: string;
  leastActivePlayer: string;
}

// 用户认证相关类型
export interface User {
  id: string;
  username: string;
  passwordHash: string;
  role: 'superadmin' | 'admin';
  wechatId?: string; // 微信号，用于联系管理员
  createdBy?: string;
  createdAt: Date;
  lastLogin?: Date;
  isActive: boolean;
}

export interface AuthSession {
  token: string;
  userId: string;
  username: string;
  role: 'superadmin' | 'admin';
  expiresAt: Date;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface CreateUserRequest {
  username: string;
  password: string;
  role: 'admin'; // 只能创建管理员，超级管理员通过代码创建
}

// 密码策略
export interface PasswordPolicy {
  minLength: number;
  requireUppercase: boolean;
  requireLowercase: boolean;
  requireNumbers: boolean;
} 