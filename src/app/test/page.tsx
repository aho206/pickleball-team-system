'use client'

import { useState } from 'react'
import { generateOptimalTeams, updatePlayerStats } from '@/lib/algorithm'
import { Participant, Weight } from '@/lib/types'

export default function TestPage() {
  const [participants, setParticipants] = useState<Participant[]>([])
  const [courtCount, setCourtCount] = useState(3)
  const [weights, setWeights] = useState<Weight[]>([])
  const [result, setResult] = useState<any>(null)

  // 创建测试参与者
  const createTestParticipants = () => {
    const names = [
      '张三', '李四', '王五', '赵六', '钱七', '孙八',
      '周九', '吴十', '郑十一', '王十二', '冯十三', '陈十四',
      '褚十五', '卫十六', '蒋十七', '沈十八', '韩十九', '杨二十',
      '朱二十一', '秦二十二', '尤二十三', '许二十四'
    ]

    const testParticipants: Participant[] = names.slice(0, 12).map((name, index) => ({
      id: `player-${index + 1}`,
      name,
      gamesPlayed: Math.floor(Math.random() * 3), // 随机0-2场游戏
      restRounds: Math.floor(Math.random() * 2),  // 随机0-1轮休息
      teammates: {},
      opponents: {},
      status: 'resting' as const,
      joinedAt: new Date(),
      hasLeft: false  // 添加缺少的hasLeft属性
    }))

    setParticipants(testParticipants)
  }

  // 运行算法测试
  const runAlgorithmTest = () => {
    if (participants.length === 0) {
      alert('请先创建测试参与者')
      return
    }

    const assignment = generateOptimalTeams(participants, courtCount, weights)
    setResult(assignment)
  }

  // 模拟完成一轮比赛
  const simulateGameCompletion = () => {
    if (!result || result.courts.length === 0) {
      alert('请先运行算法测试')
      return
    }

    // 更新参与者统计
    const updatedParticipants = [...participants]
    
    for (const court of result.courts) {
      if (court.team1 && court.team2) {
        const gameMatch = {
          team1: court.team1,
          team2: court.team2
        }
        updatePlayerStats(updatedParticipants, gameMatch)
      }
    }

    setParticipants(updatedParticipants)
    
    // 重新分配
    const newAssignment = generateOptimalTeams(updatedParticipants, courtCount, weights)
    setResult(newAssignment)
  }

  // 添加权重测试
  const addTestWeight = () => {
    if (participants.length < 2) {
      alert('需要至少2个参与者才能设置权重')
      return
    }

    const newWeight: Weight = {
      id: `weight-${weights.length + 1}`,
      player1: participants[0].id,
      player2: participants[1].id,
      weight: 8,
      type: 'teammate',
      createdAt: new Date()
    }

    setWeights([...weights, newWeight])
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-800 mb-8">
          🧪 算法测试页面
        </h1>

        {/* 控制面板 */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">控制面板</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <button
              onClick={createTestParticipants}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
            >
              创建测试参与者
            </button>
            
            <button
              onClick={runAlgorithmTest}
              className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
            >
              运行算法测试
            </button>
            
            <button
              onClick={simulateGameCompletion}
              className="bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700"
            >
              模拟完成比赛
            </button>
            
            <button
              onClick={addTestWeight}
              className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700"
            >
              添加权重测试
            </button>
          </div>

          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              场地数量: {courtCount}
            </label>
            <input
              type="range"
              min="1"
              max="5"
              value={courtCount}
              onChange={(e) => setCourtCount(Number(e.target.value))}
              className="w-full"
            />
          </div>
        </div>

        {/* 参与者列表 */}
        {participants.length > 0 && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-8">
            <h2 className="text-xl font-semibold mb-4">参与者状态</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {participants.map((participant) => (
                <div
                  key={participant.id}
                  className="border rounded-lg p-3 bg-gray-50"
                >
                  <div className="font-medium">{participant.name}</div>
                  <div className="text-sm text-gray-600">
                    游戏: {participant.gamesPlayed} | 休息: {participant.restRounds}
                  </div>
                  <div className="text-sm">
                    状态: <span className={`px-2 py-1 rounded text-xs ${
                      participant.status === 'playing' ? 'bg-green-200 text-green-800' :
                      participant.status === 'queued' ? 'bg-yellow-200 text-yellow-800' :
                      'bg-gray-200 text-gray-800'
                    }`}>
                      {participant.status === 'playing' ? '比赛中' :
                       participant.status === 'queued' ? '排队中' : '休息中'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 权重设置 */}
        {weights.length > 0 && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-8">
            <h2 className="text-xl font-semibold mb-4">权重设置</h2>
            <div className="space-y-2">
              {weights.map((weight) => {
                const player1 = participants.find(p => p.id === weight.player1)
                const player2 = participants.find(p => p.id === weight.player2)
                return (
                  <div key={weight.id} className="flex items-center space-x-4 p-2 bg-gray-50 rounded">
                    <span>{player1?.name} & {player2?.name}</span>
                    <span className="px-2 py-1 bg-blue-200 text-blue-800 rounded text-sm">
                      {weight.type === 'teammate' ? '队友' : '对手'} 权重: {weight.weight}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* 分配结果 */}
        {result && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold mb-4">分配结果</h2>
            
            {/* 统计信息 */}
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="bg-blue-50 p-4 rounded-lg text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {(result.stats.fairnessScore * 100).toFixed(1)}%
                </div>
                <div className="text-sm text-blue-800">公平性评分</div>
              </div>
              <div className="bg-green-50 p-4 rounded-lg text-center">
                <div className="text-2xl font-bold text-green-600">
                  {(result.stats.weightEffectiveness * 100).toFixed(1)}%
                </div>
                <div className="text-sm text-green-800">权重有效性</div>
              </div>
              <div className="bg-purple-50 p-4 rounded-lg text-center">
                <div className="text-2xl font-bold text-purple-600">
                  {(result.stats.diversityScore * 100).toFixed(1)}%
                </div>
                <div className="text-sm text-purple-800">多样性评分</div>
              </div>
            </div>

            {/* 场地分配 */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
              {result.courts.map((court: any) => (
                <div key={court.id} className="border rounded-lg p-4">
                  <h3 className="font-semibold mb-2">场地 {court.id}</h3>
                  {court.team1 && court.team2 ? (
                    <div className="space-y-2">
                      <div className="bg-blue-50 p-2 rounded">
                        <div className="text-sm font-medium text-blue-800">队伍1</div>
                        <div className="text-sm">
                          {participants.find(p => p.id === court.team1.player1)?.name} & {' '}
                          {participants.find(p => p.id === court.team1.player2)?.name}
                        </div>
                      </div>
                      <div className="text-center text-gray-500">VS</div>
                      <div className="bg-red-50 p-2 rounded">
                        <div className="text-sm font-medium text-red-800">队伍2</div>
                        <div className="text-sm">
                          {participants.find(p => p.id === court.team2.player1)?.name} & {' '}
                          {participants.find(p => p.id === court.team2.player2)?.name}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-gray-500 text-center py-4">空闲</div>
                  )}
                </div>
              ))}
            </div>

            {/* 队列 */}
            {result.queue.length > 0 && (
              <div>
                <h3 className="font-semibold mb-2">预分配队列</h3>
                <div className="space-y-2">
                  {result.queue.map((match: any, index: number) => (
                    <div key={index} className="border rounded-lg p-3 bg-gray-50">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="bg-blue-50 p-2 rounded">
                          <div className="text-sm font-medium text-blue-800">队伍1</div>
                          <div className="text-sm">
                            {participants.find(p => p.id === match.team1.player1)?.name} & {' '}
                            {participants.find(p => p.id === match.team1.player2)?.name}
                          </div>
                        </div>
                        <div className="bg-red-50 p-2 rounded">
                          <div className="text-sm font-medium text-red-800">队伍2</div>
                          <div className="text-sm">
                            {participants.find(p => p.id === match.team2.player1)?.name} & {' '}
                            {participants.find(p => p.id === match.team2.player2)?.name}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
} 