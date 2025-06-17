/**
 * 匹克球随机组队系统 - 核心分配算法
 * 
 * 算法优先级：
 * 1. 轮换公平性 (最高) - 每个人上场机会均等
 * 2. 权重影响 (中等) - 根据设置增加特定组合概率
 * 3. 避免重复 (最低) - 在满足前两个条件下尽量多样化
 * 4. 随机因子 - 避免过于机械化
 */

import { 
  Participant, 
  Team, 
  Court, 
  Weight, 
  GameMatch, 
  TeamAssignmentResult, 
  TeamScoreDetails,
  WeightType 
} from './types';
import { v4 as uuidv4 } from 'uuid';

/**
 * 生成最优队伍分配
 * @param participants 所有参与者
 * @param courtCount 场地数量
 * @param weights 权重设置
 * @returns 分配结果
 */
export function generateOptimalTeams(
  participants: Participant[], 
  courtCount: number,
  weights: Weight[] = []
): TeamAssignmentResult {
  // 过滤出可用的参与者（未离开的参与者）
  const availableParticipants = participants.filter(p => !p.hasLeft);
  
  if (availableParticipants.length < 4) {
    return {
      courts: Array.from({ length: courtCount }, (_, i) => ({
        id: i + 1,
        name: `场地 ${i + 1}`,
        team1: null,
        team2: null,
        status: 'empty' as const
      })),
      queue: [],
      waiting: availableParticipants.map(p => p.id),
      stats: {
        fairnessScore: 1,
        weightEffectiveness: 0,
        diversityScore: 1
      }
    };
  }

  // 按优先级排序参与者（游戏次数少的优先，休息轮数多的优先）
  const sortedParticipants = [...availableParticipants].sort((a, b) => {
    // 首先按游戏次数排序（少的优先）
    if (a.gamesPlayed !== b.gamesPlayed) {
      return a.gamesPlayed - b.gamesPlayed;
    }
    // 然后按休息轮数排序（多的优先）
    if (a.restRounds !== b.restRounds) {
      return b.restRounds - a.restRounds;
    }
    // 最后随机排序
    return Math.random() - 0.5;
  });

  // 新的通用分配策略：
  // 1. 计算实际可用场地数（基于总人数）
  // 2. 确保等待队列始终显示两组（8人），即使需要从当前比赛者中补充
  // 3. 剩余的人处于休息状态
  
  const totalPlayers = sortedParticipants.length;
  const maxCourtsCanFill = Math.min(courtCount, Math.floor(totalPlayers / 4));
  
  // 计算当前比赛人数
  const playingCount = maxCourtsCanFill * 4;
  const playingPlayers = sortedParticipants.slice(0, playingCount);
  
  // 计算等待队列 - 关键改进：确保始终有两组
  const remainingPlayers = sortedParticipants.slice(playingCount);
  const queuePlayers = generateQueueWithSupplement(
    remainingPlayers, 
    playingPlayers, 
    courtCount,
    weights,
    participants
  );
  
  // 剩余休息的人（排除正在比赛和排队的）
  const queuePlayerIds = queuePlayers.flatMap(match => [
    match.team1.player1, match.team1.player2,
    match.team2.player1, match.team2.player2
  ]);
  const playingPlayerIds = playingPlayers.map(p => p.id);
  const waitingPlayers = sortedParticipants.filter(p => 
    !playingPlayerIds.includes(p.id) && !queuePlayerIds.includes(p.id)
  );

  // 使用全局优化算法分配场地
  const actualCourtsUsed = Math.ceil(playingCount / 4);
  const courts = assignPlayersToCourts(playingPlayers, actualCourtsUsed, weights, participants);
  
  // 补充空场地
  while (courts.length < courtCount) {
    const courtId = courts.length + 1;
    courts.push({
      id: courtId,
      name: `场地 ${courtId}`,
      team1: null,
      team2: null,
      status: 'empty' as const
    });
  }

  // 计算统计信息
  const stats = calculateAssignmentStats(courts, queuePlayers, weights, participants);

  return {
    courts,
    queue: queuePlayers,
    waiting: waitingPlayers.map(p => p.id),
    stats
  };
}

/**
 * 将玩家分配到场地 - 使用全局优化算法
 */
function assignPlayersToCourts(
  players: Participant[], 
  courtCount: number, 
  weights: Weight[], 
  allParticipants: Participant[]
): Court[] {
  const courts: Court[] = Array.from({ length: courtCount }, (_, i) => ({
    id: i + 1,
    name: `场地 ${i + 1}`,
    team1: null,
    team2: null,
    status: 'empty' as const
  }));

  if (players.length < 4) {
    return courts;
  }

  // 如果只有一个场地或人数刚好够一个场地
  if (courtCount === 1 || players.length === 4) {
    const bestMatch = findBestTeamMatch(players, weights, allParticipants);
    if (bestMatch) {
      courts[0] = {
        id: 1,
        name: courts[0].name || '场地 1',
        team1: bestMatch.team1,
        team2: bestMatch.team2,
        status: 'playing',
        startTime: new Date()
      };
    }
    return courts;
  }

  // 多场地全局优化分配
  const bestAssignment = findBestGlobalAssignment(players, courtCount, weights, allParticipants);
  
  for (let i = 0; i < bestAssignment.length && i < courtCount; i++) {
    if (bestAssignment[i]) {
      const match = bestAssignment[i];
      if (match && match.team1 && match.team2) {
        courts[i] = {
          id: i + 1,
          name: courts[i].name || `场地 ${i + 1}`,
          team1: match.team1,
          team2: match.team2,
          status: 'playing',
          startTime: new Date()
        };
      }
    }
  }

  return courts;
}

/**
 * 找到最佳的全局分配方案
 */
function findBestGlobalAssignment(
  players: Participant[], 
  courtCount: number, 
  weights: Weight[], 
  allParticipants: Participant[]
): (GameMatch | null)[] {
  const playerIds = players.map(p => p.id);
  const totalPlayers = playerIds.length;
  const playersPerCourt = 4;
  const maxCourts = Math.min(courtCount, Math.floor(totalPlayers / playersPerCourt));
  
  if (maxCourts === 0) {
    return Array(courtCount).fill(null);
  }

  // 生成所有可能的场地分配组合
  const allAssignments = generateCourtAssignments(playerIds, maxCourts);
  
  let bestAssignment: (GameMatch | null)[] = Array(courtCount).fill(null);
  let bestScore = -Infinity;

  for (const assignment of allAssignments) {
    let totalScore = 0;
    const matches: (GameMatch | null)[] = Array(courtCount).fill(null);
    
    for (let courtIndex = 0; courtIndex < assignment.length; courtIndex++) {
      const courtPlayers = assignment[courtIndex];
      if (courtPlayers.length === 4) {
        const courtParticipants = courtPlayers.map(id => 
          players.find(p => p.id === id)!
        );
        const bestMatch = findBestTeamMatch(courtParticipants, weights, allParticipants);
        if (bestMatch) {
          matches[courtIndex] = bestMatch;
          totalScore += calculateTeamScore(bestMatch.team1, bestMatch.team2, weights, allParticipants);
        }
      }
    }
    
    if (totalScore > bestScore) {
      bestScore = totalScore;
      bestAssignment = matches;
    }
  }

  return bestAssignment;
}

/**
 * 生成所有可能的场地分配组合
 */
function generateCourtAssignments(playerIds: string[], courtCount: number): string[][][] {
  const assignments: string[][][] = [];
  
  if (courtCount === 1) {
    return [[playerIds.slice(0, 4)]];
  }
  
  if (courtCount === 2 && playerIds.length >= 8) {
    // 2个场地的情况：选择前8个人，分成两组
    const firstEight = playerIds.slice(0, 8);
    const combinations = getCombinations(firstEight, 4);
    
    for (const court1Players of combinations) {
      const court2Players = firstEight.filter(id => !court1Players.includes(id));
      if (court2Players.length === 4) {
        assignments.push([court1Players, court2Players]);
      }
    }
  } else if (courtCount >= 3) {
    // 3个或更多场地：简化处理，按顺序分配
    const result: string[][] = [];
    for (let i = 0; i < courtCount && i * 4 < playerIds.length; i++) {
      const courtPlayers = playerIds.slice(i * 4, (i + 1) * 4);
      if (courtPlayers.length === 4) {
        result.push(courtPlayers);
      }
    }
    if (result.length > 0) {
      assignments.push(result);
    }
  }
  
  return assignments;
}

/**
 * 获取数组的所有组合
 */
function getCombinations<T>(arr: T[], size: number): T[][] {
  if (size > arr.length) return [];
  if (size === arr.length) return [arr];
  if (size === 1) return arr.map(item => [item]);
  
  const combinations: T[][] = [];
  
  function backtrack(start: number, current: T[]) {
    if (current.length === size) {
      combinations.push([...current]);
      return;
    }
    
    for (let i = start; i < arr.length; i++) {
      current.push(arr[i]);
      backtrack(i + 1, current);
      current.pop();
    }
  }
  
  backtrack(0, []);
  return combinations;
}

/**
 * 为指定的玩家找到最佳的2v2组合
 */
function findBestTeamMatch(
  players: Participant[], 
  weights: Weight[], 
  allParticipants: Participant[]
): GameMatch | null {
  if (players.length < 4) return null;

  const allCombinations = generateTeamCombinationsForPlayers(players);
  let bestMatch: GameMatch | null = null;
  let bestScore = -Infinity;

  for (const combination of allCombinations) {
    const score = calculateTeamScore(
      combination.team1, 
      combination.team2, 
      weights, 
      allParticipants
    );
    
    if (score > bestScore) {
      bestScore = score;
      bestMatch = combination;
    }
  }

  return bestMatch;
}

/**
 * 生成指定玩家的所有可能2v2组合
 */
function generateTeamCombinationsForPlayers(players: Participant[]): GameMatch[] {
  const combinations: GameMatch[] = [];
  const playerIds = players.map(p => p.id);
  
  // 生成所有可能的队伍组合
  for (let i = 0; i < playerIds.length; i++) {
    for (let j = i + 1; j < playerIds.length; j++) {
      for (let k = 0; k < playerIds.length; k++) {
        if (k === i || k === j) continue;
        for (let l = k + 1; l < playerIds.length; l++) {
          if (l === i || l === j) continue;
          
          const team1: Team = { player1: playerIds[i], player2: playerIds[j] };
          const team2: Team = { player1: playerIds[k], player2: playerIds[l] };
          
          combinations.push({ team1, team2 });
        }
      }
    }
  }
  
  return combinations;
}

/**
 * 计算队伍组合的评分
 * @param team1 队伍1
 * @param team2 队伍2
 * @param weights 权重设置
 * @param participants 所有参与者
 * @returns 评分（越高越好）
 */
export function calculateTeamScore(
  team1: Team, 
  team2: Team, 
  weights: Weight[], 
  participants: Participant[]
): number {
  const playerStats = participants.reduce((acc, p) => {
    acc[p.id] = p;
    return acc;
  }, {} as Record<string, Participant>);

  // 1. 公平性评分 - 基于游戏次数差异
  const fairnessScore = calculateFairnessScore(team1, team2, playerStats);
  
  // 2. 权重加分
  const weightBonus = calculateWeightBonus(team1, team2, weights);
  
  // 3. 重复惩罚 - 避免相同组合
  const repetitionPenalty = calculateRepetitionPenalty(team1, team2, playerStats);
  
  // 4. 随机因子
  const randomFactor = (Math.random() - 0.5) * 0.1; // ±5% 随机性
  
  // 综合评分（权重可调整）
  const totalScore = 
    fairnessScore * 1.0 +      // 公平性权重最高
    weightBonus * 0.8 +        // 权重影响中等
    repetitionPenalty * 0.6 +  // 多样性权重较低
    randomFactor;              // 随机因子最低

  return totalScore;
}

/**
 * 计算公平性评分
 */
function calculateFairnessScore(
  team1: Team, 
  team2: Team, 
  playerStats: Record<string, Participant>
): number {
  const players = [team1.player1, team1.player2, team2.player1, team2.player2];
  const gamesPlayed = players.map(id => playerStats[id]?.gamesPlayed || 0);
  
  // 计算游戏次数的标准差，越小越公平
  const mean = gamesPlayed.reduce((sum, games) => sum + games, 0) / gamesPlayed.length;
  const variance = gamesPlayed.reduce((sum, games) => sum + Math.pow(games - mean, 2), 0) / gamesPlayed.length;
  const stdDev = Math.sqrt(variance);
  
  // 转换为评分（标准差越小，评分越高）
  return Math.max(0, 10 - stdDev * 2);
}

/**
 * 计算权重加分
 */
function calculateWeightBonus(team1: Team, team2: Team, weights: Weight[]): number {
  let bonus = 0;
  
  // 检查队友权重
  const teammateWeights = weights.filter(w => w.type === 'teammate');
  for (const weight of teammateWeights) {
    if (isTeammates(team1, weight.player1, weight.player2) || 
        isTeammates(team2, weight.player1, weight.player2)) {
      bonus += weight.weight * 0.5; // 队友权重加分
    }
  }
  
  // 检查对手权重
  const opponentWeights = weights.filter(w => w.type === 'opponent');
  for (const weight of opponentWeights) {
    if (isOpponents(team1, team2, weight.player1, weight.player2)) {
      bonus += weight.weight * 0.3; // 对手权重加分
    }
  }
  
  return bonus;
}

/**
 * 计算重复惩罚
 */
function calculateRepetitionPenalty(
  team1: Team, 
  team2: Team, 
  playerStats: Record<string, Participant>
): number {
  let penalty = 0;
  
  // 检查队友重复次数
  const team1Player1 = playerStats[team1.player1];
  const team1Player2 = playerStats[team1.player2];
  if (team1Player1 && team1Player2) {
    const teammateCount = team1Player1.teammates[team1.player2] || 0;
    penalty -= teammateCount * 0.5; // 队友重复惩罚
  }
  
  const team2Player1 = playerStats[team2.player1];
  const team2Player2 = playerStats[team2.player2];
  if (team2Player1 && team2Player2) {
    const teammateCount = team2Player1.teammates[team2.player2] || 0;
    penalty -= teammateCount * 0.5;
  }
  
  // 检查对手重复次数
  const allPlayers = [team1.player1, team1.player2, team2.player1, team2.player2];
  for (let i = 0; i < 2; i++) {
    for (let j = 2; j < 4; j++) {
      const player1 = playerStats[allPlayers[i]];
      const player2Id = allPlayers[j];
      if (player1) {
        const opponentCount = player1.opponents[player2Id] || 0;
        penalty -= opponentCount * 0.3; // 对手重复惩罚
      }
    }
  }
  
  return penalty;
}

/**
 * 检查两个玩家是否在同一队伍
 */
function isTeammates(team: Team, player1: string, player2: string): boolean {
  return (team.player1 === player1 && team.player2 === player2) ||
         (team.player1 === player2 && team.player2 === player1);
}

/**
 * 检查两个玩家是否是对手
 */
function isOpponents(team1: Team, team2: Team, player1: string, player2: string): boolean {
  const team1Players = [team1.player1, team1.player2];
  const team2Players = [team2.player1, team2.player2];
  
  return (team1Players.includes(player1) && team2Players.includes(player2)) ||
         (team1Players.includes(player2) && team2Players.includes(player1));
}

/**
 * 生成所有可能的队伍组合
 */
function generateAllTeamCombinations(players: Participant[]): GameMatch[] {
  const combinations: GameMatch[] = [];
  const playerIds = players.map(p => p.id);
  
  for (let i = 0; i < playerIds.length; i++) {
    for (let j = i + 1; j < playerIds.length; j++) {
      for (let k = 0; k < playerIds.length; k++) {
        if (k === i || k === j) continue;
        for (let l = k + 1; l < playerIds.length; l++) {
          if (l === i || l === j) continue;
          
          const team1: Team = { player1: playerIds[i], player2: playerIds[j] };
          const team2: Team = { player1: playerIds[k], player2: playerIds[l] };
          
          combinations.push({ team1, team2 });
        }
      }
    }
  }
  
  return combinations;
}

/**
 * 生成等待队列，确保始终有两组，必要时从当前比赛者中补充
 * @param remainingPlayers 剩余可用的参与者
 * @param playingPlayers 当前比赛的参与者
 * @param courtCount 场地数量
 * @param weights 权重设置
 * @param allParticipants 所有参与者
 * @returns 等待队列比赛列表
 */
function generateQueueWithSupplement(
  remainingPlayers: Participant[],
  playingPlayers: Participant[],
  courtCount: number,
  weights: Weight[],
  allParticipants: Participant[]
): GameMatch[] {
  const targetQueueSize = 2; // 始终保持两组
  const playersPerMatch = 4;
  const totalNeededPlayers = targetQueueSize * playersPerMatch;
  
  // 构建队列候选人池
  let queueCandidates = [...remainingPlayers];
  
  // 如果剩余人数不足以组成两组，从当前比赛者中补充
  if (queueCandidates.length < totalNeededPlayers) {
    const shortage = totalNeededPlayers - queueCandidates.length;
    
    // 从当前比赛者中选择比赛次数最多的人作为补充
    const supplementPlayers = [...playingPlayers]
      .sort((a, b) => {
        // 优先选择比赛次数多的
        if (a.gamesPlayed !== b.gamesPlayed) {
          return b.gamesPlayed - a.gamesPlayed;
        }
        // 然后选择休息轮数少的（刚上场的）
        if (a.restRounds !== b.restRounds) {
          return a.restRounds - b.restRounds;
        }
        return Math.random() - 0.5;
      })
      .slice(0, shortage);
    
    queueCandidates.push(...supplementPlayers);
  }
  
  // 生成两组队列
  const queue: GameMatch[] = [];
  const usedPlayers = new Set<string>();
  
  for (let i = 0; i < targetQueueSize && queueCandidates.length - usedPlayers.size >= playersPerMatch; i++) {
    // 从未使用的候选人中选择4人
    const availableCandidates = queueCandidates.filter(p => !usedPlayers.has(p.id));
    
    if (availableCandidates.length < playersPerMatch) {
      break;
    }
    
    // 选择最优的4人组合
    const selectedPlayers = selectOptimalQueueGroup(availableCandidates, allParticipants, playersPerMatch);
    
    if (selectedPlayers.length === playersPerMatch) {
      // 为这4个玩家生成最优队伍组合
      const bestMatch = findBestTeamMatch(selectedPlayers, weights, allParticipants);
      
      if (bestMatch) {
        queue.push(bestMatch);
        
        // 标记这些玩家为已使用
        [bestMatch.team1.player1, bestMatch.team1.player2, 
         bestMatch.team2.player1, bestMatch.team2.player2].forEach(id => usedPlayers.add(id));
      }
    }
  }
  
  return queue;
}

/**
 * 选择最优的队列组合（考虑公平性和多样性）
 * @param candidates 候选参与者
 * @param allParticipants 所有参与者
 * @param groupSize 组大小
 * @returns 选中的参与者
 */
function selectOptimalQueueGroup(
  candidates: Participant[], 
  allParticipants: Participant[], 
  groupSize: number
): Participant[] {
  if (candidates.length <= groupSize) {
    return candidates.slice(0, groupSize);
  }
  
  // 优先选择游戏次数少、休息轮数多的组合
  const sortedCandidates = [...candidates].sort((a, b) => {
    // 首先按游戏次数排序（少的优先）
    if (a.gamesPlayed !== b.gamesPlayed) {
      return a.gamesPlayed - b.gamesPlayed;
    }
    // 然后按休息轮数排序（多的优先）
    if (a.restRounds !== b.restRounds) {
      return b.restRounds - a.restRounds;
    }
    return Math.random() - 0.5;
  });
  
  return sortedCandidates.slice(0, groupSize);
}

/**
 * 计算分配统计信息
 */
function calculateAssignmentStats(
  courts: Court[], 
  queue: GameMatch[], 
  weights: Weight[], 
  participants: Participant[]
) {
  // 公平性评分 - 基于游戏次数的标准差
  const gamesPlayed = participants.map(p => p.gamesPlayed);
  const mean = gamesPlayed.reduce((sum, games) => sum + games, 0) / gamesPlayed.length;
  const variance = gamesPlayed.reduce((sum, games) => sum + Math.pow(games - mean, 2), 0) / gamesPlayed.length;
  const fairnessScore = Math.max(0, 1 - Math.sqrt(variance) / 10);
  
  // 权重有效性 - 权重组合在当前分配中的体现程度
  let weightMatches = 0;
  let totalWeights = weights.length;
  
  for (const court of courts) {
    if (court.team1 && court.team2) {
      for (const weight of weights) {
        if (weight.type === 'teammate') {
          if (isTeammates(court.team1, weight.player1, weight.player2) ||
              isTeammates(court.team2, weight.player1, weight.player2)) {
            weightMatches++;
          }
        } else if (weight.type === 'opponent') {
          if (isOpponents(court.team1, court.team2, weight.player1, weight.player2)) {
            weightMatches++;
          }
        }
      }
    }
  }
  
  const weightEffectiveness = totalWeights > 0 ? weightMatches / totalWeights : 1;
  
  // 多样性评分 - 基于组合的重复程度
  const diversityScore = 0.8; // 简化计算，实际应该基于历史组合数据
  
  return {
    fairnessScore,
    weightEffectiveness,
    diversityScore
  };
}

/**
 * 更新参与者统计信息
 * @param participants 参与者列表
 * @param completedGame 完成的比赛
 */
export function updatePlayerStats(
  participants: Participant[],
  completedGame: GameMatch
): void {
  const { team1, team2 } = completedGame;
  const allPlayers = [team1.player1, team1.player2, team2.player1, team2.player2];
  
  // 更新游戏次数
  for (const playerId of allPlayers) {
    const player = participants.find(p => p.id === playerId);
    if (player) {
      player.gamesPlayed++;
      player.restRounds = 0; // 重置休息轮数
    }
  }
  
  // 更新队友记录
  updateTeammateStats(participants, team1.player1, team1.player2);
  updateTeammateStats(participants, team2.player1, team2.player2);
  
  // 更新对手记录
  for (const team1Player of [team1.player1, team1.player2]) {
    for (const team2Player of [team2.player1, team2.player2]) {
      updateOpponentStats(participants, team1Player, team2Player);
    }
  }
  
  // 更新其他参与者的休息轮数
  for (const participant of participants) {
    if (!allPlayers.includes(participant.id) && participant.status !== 'away') {
      participant.restRounds++;
    }
  }
}

/**
 * 更新队友统计
 */
function updateTeammateStats(participants: Participant[], player1Id: string, player2Id: string): void {
  const player1 = participants.find(p => p.id === player1Id);
  const player2 = participants.find(p => p.id === player2Id);
  
  if (player1) {
    player1.teammates[player2Id] = (player1.teammates[player2Id] || 0) + 1;
  }
  if (player2) {
    player2.teammates[player1Id] = (player2.teammates[player1Id] || 0) + 1;
  }
}

/**
 * 更新对手统计
 */
function updateOpponentStats(participants: Participant[], player1Id: string, player2Id: string): void {
  const player1 = participants.find(p => p.id === player1Id);
  const player2 = participants.find(p => p.id === player2Id);
  
  if (player1) {
    player1.opponents[player2Id] = (player1.opponents[player2Id] || 0) + 1;
  }
  if (player2) {
    player2.opponents[player1Id] = (player2.opponents[player1Id] || 0) + 1;
  }
}

/**
 * 当比赛结束后，自动维护等待队列
 * @param session 游戏会话
 */
export function autoMaintainQueue(session: any): void {
  // 首先更新所有非playing状态玩家的休息轮数
  for (const participant of session.participants) {
    if (participant.status === 'resting') {
      // 休息中的玩家休息轮数+1（如果还没有在这轮更新过）
      // 这个逻辑在updatePlayerStats中已经处理了
    }
  }
  
  // 使用新的通用队列生成逻辑
  regenerateQueueWithSupplement(session);
}

/**
 * 重新生成等待队列，确保始终有两组，必要时从当前比赛者中补充
 * @param session 游戏会话
 */
function regenerateQueueWithSupplement(session: any): void {
  // 获取当前比赛的参与者
  const playingPlayers: any[] = [];
  for (const court of session.courts) {
    if (court.team1 && court.team2 && court.status === 'playing') {
      const courtPlayers = [
        court.team1.player1, court.team1.player2,
        court.team2.player1, court.team2.player2
      ];
      for (const playerId of courtPlayers) {
        const player = session.participants.find((p: any) => p.id === playerId);
        if (player) {
          playingPlayers.push(player);
        }
      }
    }
  }
  
  // 获取休息中的参与者
  const restingPlayers = session.participants.filter((p: any) => 
    p.status === 'resting' && !p.hasLeft
  );
  
  // 清空当前队列，重新生成
  session.queue = [];
  
  // 重置所有排队状态为休息状态
  for (const participant of session.participants) {
    if (participant.status === 'queued') {
      participant.status = 'resting';
    }
  }
  
  // 使用新的队列生成逻辑
  const newQueue = generateQueueWithSupplement(
    restingPlayers,
    playingPlayers,
    session.settings.courtCount,
    session.weights || [],
    session.participants
  );
  
  // 更新会话队列
  session.queue = newQueue;
  
  // 更新参与者状态：设置排队的人为queued状态
  for (const match of session.queue) {
    const queuedPlayerIds = [
      match.team1.player1, match.team1.player2,
      match.team2.player1, match.team2.player2
    ];
    
    for (const participant of session.participants) {
      if (queuedPlayerIds.includes(participant.id) && participant.status === 'resting') {
        participant.status = 'queued';
      }
    }
  }
}

/**
 * 验证分配结果的完整性，确保没有人员重复
 * @param result 分配结果
 * @returns 验证结果和错误信息
 */
export function validateAssignment(result: TeamAssignmentResult): {
  isValid: boolean;
  errors: string[];
  duplicates: string[];
} {
  const errors: string[] = [];
  const duplicates: string[] = [];
  const allAssignedPlayers = new Set<string>();
  
  // 检查场地中的人员
  for (const court of result.courts) {
    if (court.team1 && court.team2) {
      const courtPlayers = [
        court.team1.player1,
        court.team1.player2,
        court.team2.player1,
        court.team2.player2
      ];
      
      for (const playerId of courtPlayers) {
        if (allAssignedPlayers.has(playerId)) {
          duplicates.push(playerId);
          errors.push(`玩家 ${playerId} 在场地 ${court.id} 中重复出现`);
        } else {
          allAssignedPlayers.add(playerId);
        }
      }
    }
  }
  
  // 检查等待队列中的人员
  for (let i = 0; i < result.queue.length; i++) {
    const match = result.queue[i];
    const queuePlayers = [
      match.team1.player1,
      match.team1.player2,
      match.team2.player1,
      match.team2.player2
    ];
    
    for (const playerId of queuePlayers) {
      if (allAssignedPlayers.has(playerId)) {
        duplicates.push(playerId);
        errors.push(`玩家 ${playerId} 在等待队列第 ${i + 1} 组中重复出现`);
      } else {
        allAssignedPlayers.add(playerId);
      }
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    duplicates: [...new Set(duplicates)]
  };
}

/**
 * 验证会话状态的完整性
 * @param session 游戏会话
 * @returns 验证结果
 */
export function validateSessionIntegrity(session: any): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];
  const playerStatusCount = new Map<string, number>();
  
  // 统计每个玩家的状态出现次数
  for (const participant of session.participants) {
    const count = playerStatusCount.get(participant.id) || 0;
    playerStatusCount.set(participant.id, count + 1);
  }
  
  // 检查是否有重复的玩家ID
  for (const [playerId, count] of playerStatusCount) {
    if (count > 1) {
      errors.push(`玩家 ${playerId} 在参与者列表中出现 ${count} 次`);
    }
  }
  
  // 检查场地和队列中的玩家是否都在参与者列表中
  const allParticipantIds = new Set(session.participants.map((p: any) => p.id));
  const assignedPlayerIds = new Set<string>();
  
  // 检查场地
  for (const court of session.courts) {
    if (court.team1 && court.team2) {
      const courtPlayers = [
        court.team1.player1,
        court.team1.player2,
        court.team2.player1,
        court.team2.player2
      ];
      
      for (const playerId of courtPlayers) {
        if (!allParticipantIds.has(playerId)) {
          errors.push(`场地 ${court.id} 中的玩家 ${playerId} 不在参与者列表中`);
        }
        if (assignedPlayerIds.has(playerId)) {
          errors.push(`玩家 ${playerId} 在多个位置被分配`);
        }
        assignedPlayerIds.add(playerId);
      }
    }
  }
  
  // 检查等待队列
  for (let i = 0; i < session.queue.length; i++) {
    const match = session.queue[i];
    const queuePlayers = [
      match.team1.player1,
      match.team1.player2,
      match.team2.player1,
      match.team2.player2
    ];
    
    for (const playerId of queuePlayers) {
      if (!allParticipantIds.has(playerId)) {
        errors.push(`等待队列第 ${i + 1} 组中的玩家 ${playerId} 不在参与者列表中`);
      }
      if (assignedPlayerIds.has(playerId)) {
        errors.push(`玩家 ${playerId} 在多个位置被分配`);
      }
      assignedPlayerIds.add(playerId);
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
} 