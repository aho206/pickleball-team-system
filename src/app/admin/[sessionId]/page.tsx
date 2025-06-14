'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { GameSession, Participant, Court, GameMatch } from '@/lib/types'
import Navigation from '@/components/ui/Navigation'

export default function AdminPage() {
  const params = useParams()
  const sessionId = params.sessionId as string
  
  const [session, setSession] = useState<GameSession | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [generating, setGenerating] = useState(false)
  const [newParticipantName, setNewParticipantName] = useState('')
  const [addingParticipant, setAddingParticipant] = useState(false)

  useEffect(() => {
    loadSession()
  }, [sessionId])

  const loadSession = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/sessions?id=${sessionId}`)
      const data = await response.json()
      
      if (data.success) {
        setSession(data.data)
      } else {
        setError(data.error || '加载会话失败')
      }
    } catch (err) {
      setError('网络错误，请重试')
    } finally {
      setLoading(false)
    }
  }

  const generateNewRound = async () => {
    if (!session) return
    
    try {
      setGenerating(true)
      const response = await fetch(`/api/sessions/${sessionId}/generate`, {
        method: 'POST'
      })
      const data = await response.json()
      
      if (data.success) {
        setSession(data.data)
      } else {
        alert(data.error || '生成新轮次失败')
      }
    } catch (err) {
      alert('网络错误，请重试')
    } finally {
      setGenerating(false)
    }
  }

  const addParticipant = async () => {
    if (!session || !newParticipantName.trim()) return
    
    try {
      setAddingParticipant(true)
      const response = await fetch(`/api/sessions/${sessionId}/participants`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: newParticipantName.trim() })
      })
      const data = await response.json()
      
      if (data.success) {
        setSession(data.data)
        setNewParticipantName('')
        alert(`${newParticipantName.trim()} 已成功加入会话`)
      } else {
        alert(data.error || '添加参与者失败')
      }
    } catch (err) {
      alert('网络错误，请重试')
    } finally {
      setAddingParticipant(false)
    }
  }

  const nextGroup = async (courtId: number) => {
    if (!session) return
    
    try {
      const response = await fetch(`/api/sessions/${sessionId}/next-group`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ courtId })
      })
      const data = await response.json()
      
      if (data.success) {
        setSession(data.data)
      } else {
        alert(data.error || '下一组进入失败')
      }
    } catch (err) {
      alert('网络错误，请重试')
    }
  }

  const markParticipantLeft = async (participantId: string, reason?: string) => {
    if (!session) return
    
    try {
      const response = await fetch(`/api/sessions/${sessionId}/participants/${participantId}/leave`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ reason: reason || '提前离开' })
      })
      const data = await response.json()
      
      if (data.success) {
        setSession(data.data)
      } else {
        alert(data.error || '标记离开失败')
      }
    } catch (err) {
      alert('网络错误，请重试')
    }
  }

  const rejoinParticipant = async (participantId: string) => {
    if (!session) return
    
    try {
      const response = await fetch(`/api/sessions/${sessionId}/participants/${participantId}/leave`, {
        method: 'DELETE'
      })
      const data = await response.json()
      
      if (data.success) {
        setSession(data.data)
      } else {
        alert(data.error || '重新加入失败')
      }
    } catch (err) {
      alert('网络错误，请重试')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pickleball-600 mx-auto mb-4"></div>
          <p className="text-gray-600">加载中...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-500 text-xl mb-4">❌</div>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={loadSession}
            className="bg-pickleball-600 text-white px-4 py-2 rounded-lg hover:bg-pickleball-700"
          >
            重试
          </button>
        </div>
      </div>
    )
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">会话不存在</p>
        </div>
      </div>
    )
  }

  const getParticipantName = (id: string) => {
    return session.participants.find(p => p.id === id)?.name || '未知'
  }

  const activeParticipants = session.participants.filter(p => !p.hasLeft)
  const leftParticipants = session.participants.filter(p => p.hasLeft)
  
  const playingParticipants = activeParticipants.filter(p => p.status === 'playing')
  const queuedParticipants = activeParticipants.filter(p => p.status === 'queued')
  const restingParticipants = activeParticipants.filter(p => p.status === 'resting')

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 导航栏 */}
      <Navigation
        title="🏓 管理员控制台"
        showBackButton={true}
        backUrl="/dashboard"
        backText="返回仪表板"
        showHomeButton={true}
        showLogout={true}
        rightContent={
          <div className="flex items-center space-x-3">
            {/* 添加参与者 */}
            <div className="flex items-center space-x-2">
              <input
                type="text"
                value={newParticipantName}
                onChange={(e) => setNewParticipantName(e.target.value)}
                placeholder="新参与者姓名"
                className="px-3 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-pickleball-500"
                onKeyPress={(e) => {
                  if (e.key === 'Enter' && newParticipantName.trim()) {
                    addParticipant()
                  }
                }}
              />
              <button
                onClick={addParticipant}
                disabled={addingParticipant || !newParticipantName.trim()}
                className="bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {addingParticipant ? '添加中...' : '添加'}
              </button>
            </div>
            
            <button
              onClick={generateNewRound}
              disabled={generating}
              className="bg-pickleball-600 text-white px-4 py-2 rounded-lg hover:bg-pickleball-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {generating ? '生成中...' : '生成新轮次'}
            </button>
          </div>
        }
      />

      <div className="container mx-auto px-4 py-8">
        {/* 会话信息 */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h2 className="text-2xl font-bold text-gray-800">会话 {sessionId}</h2>
              <p className="text-gray-600">
                第 {session.stats.currentRound} 轮 • 总比赛: {session.stats.totalGamesPlayed} 场 • 
                活跃参与者: {activeParticipants.length} / {session.participants.length}
              </p>
            </div>
          </div>
          
          <div className="grid grid-cols-4 gap-4 text-center">
            <div className="bg-green-50 rounded-lg p-4">
              <div className="text-2xl font-bold text-green-600">{playingParticipants.length}</div>
              <div className="text-sm text-green-700">正在比赛</div>
            </div>
            <div className="bg-yellow-50 rounded-lg p-4">
              <div className="text-2xl font-bold text-yellow-600">{queuedParticipants.length}</div>
              <div className="text-sm text-yellow-700">排队等待</div>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="text-2xl font-bold text-gray-600">{restingParticipants.length}</div>
              <div className="text-sm text-gray-700">休息中</div>
            </div>
            <div className="bg-red-50 rounded-lg p-4">
              <div className="text-2xl font-bold text-red-600">{leftParticipants.length}</div>
              <div className="text-sm text-red-700">已离开</div>
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* 当前比赛 */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-semibold text-gray-800">当前比赛</h2>
            </div>
            
            <div className="space-y-4">
              {session.courts.map((court, index) => (
                <div key={index} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex justify-between items-center mb-3">
                    <h3 className="font-semibold text-gray-800">场地 {court.id}</h3>
                    {(court.team1 && court.team2) || session.queue.length > 0 ? (
                      <button
                        onClick={() => nextGroup(court.id)}
                        className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700"
                      >
                        下一组
                      </button>
                    ) : null}
                  </div>
                  
                  {court.team1 && court.team2 ? (
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-blue-50 rounded-lg p-3">
                        <div className="text-sm text-blue-700 font-medium mb-1">队伍 A</div>
                        <div className="text-blue-800">
                          {getParticipantName(court.team1.player1)}
                        </div>
                        <div className="text-blue-800">
                          {getParticipantName(court.team1.player2)}
                        </div>
                      </div>
                      <div className="bg-red-50 rounded-lg p-3">
                        <div className="text-sm text-red-700 font-medium mb-1">队伍 B</div>
                        <div className="text-red-800">
                          {getParticipantName(court.team2.player1)}
                        </div>
                        <div className="text-red-800">
                          {getParticipantName(court.team2.player2)}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-gray-500 text-center py-4">
                      暂无比赛安排
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* 等待队列 */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-2xl font-semibold text-gray-800 mb-6">等待队列</h2>
            {session.queue.length > 0 ? (
              <div className="space-y-3">
                {session.queue.map((match, index) => (
                  <div key={index} className="border border-gray-200 rounded-lg p-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-blue-50 rounded-lg p-3">
                        <div className="text-sm text-blue-700 font-medium mb-1">队伍 A</div>
                        <div className="text-blue-800">
                          {getParticipantName(match.team1.player1)} & {getParticipantName(match.team1.player2)}
                        </div>
                      </div>
                      <div className="bg-red-50 rounded-lg p-3">
                        <div className="text-sm text-red-700 font-medium mb-1">队伍 B</div>
                        <div className="text-red-800">
                          {getParticipantName(match.team2.player1)} & {getParticipantName(match.team2.player2)}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-gray-500 text-center py-8">
                暂无等待队列
              </div>
            )}
          </div>
        </div>

        {/* 参与者状态 */}
        <div className="bg-white rounded-xl shadow-lg p-6 mt-8">
          <h2 className="text-2xl font-semibold text-gray-800 mb-6">参与者管理</h2>
          
          <div className="space-y-8">
            {/* 活跃参与者 */}
            <div>
              <h3 className="text-lg font-medium text-gray-800 mb-4">活跃参与者 ({activeParticipants.length})</h3>
              
              <div className="space-y-6">
                {/* 正在比赛 */}
                {playingParticipants.length > 0 && (
                  <div>
                    <h4 className="font-medium text-green-700 mb-2">正在比赛 ({playingParticipants.length})</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {playingParticipants.map(participant => (
                        <div key={participant.id} className="bg-green-50 rounded-lg p-3 flex justify-between items-center">
                          <div>
                            <div className="font-medium text-green-800">{participant.name}</div>
                            <div className="text-green-600 text-sm">{participant.gamesPlayed} 场比赛</div>
                          </div>
                          <button
                            onClick={() => {
                              if (confirm(`确定要标记 ${participant.name} 为离开吗？`)) {
                                markParticipantLeft(participant.id, '比赛中离开');
                              }
                            }}
                            className="text-red-600 hover:text-red-800 text-sm px-2 py-1 rounded hover:bg-red-100"
                          >
                            标记离开
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 排队等待 */}
                {queuedParticipants.length > 0 && (
                  <div>
                    <h4 className="font-medium text-yellow-700 mb-2">排队等待 ({queuedParticipants.length})</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {queuedParticipants.map(participant => (
                        <div key={participant.id} className="bg-yellow-50 rounded-lg p-3 flex justify-between items-center">
                          <div>
                            <div className="font-medium text-yellow-800">{participant.name}</div>
                            <div className="text-yellow-600 text-sm">{participant.gamesPlayed} 场比赛</div>
                          </div>
                          <button
                            onClick={() => {
                              if (confirm(`确定要标记 ${participant.name} 为离开吗？`)) {
                                markParticipantLeft(participant.id, '等待中离开');
                              }
                            }}
                            className="text-red-600 hover:text-red-800 text-sm px-2 py-1 rounded hover:bg-red-100"
                          >
                            标记离开
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 休息中 */}
                {restingParticipants.length > 0 && (
                  <div>
                    <h4 className="font-medium text-gray-700 mb-2">休息中 ({restingParticipants.length})</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {restingParticipants.map(participant => (
                        <div key={participant.id} className="bg-gray-50 rounded-lg p-3 flex justify-between items-center">
                          <div>
                            <div className="font-medium text-gray-800">{participant.name}</div>
                            <div className="text-gray-600 text-sm">{participant.gamesPlayed} 场比赛</div>
                          </div>
                          <button
                            onClick={() => {
                              if (confirm(`确定要标记 ${participant.name} 为离开吗？`)) {
                                markParticipantLeft(participant.id, '休息中离开');
                              }
                            }}
                            className="text-red-600 hover:text-red-800 text-sm px-2 py-1 rounded hover:bg-red-100"
                          >
                            标记离开
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* 已离开参与者 */}
            {leftParticipants.length > 0 && (
              <div>
                <h3 className="text-lg font-medium text-gray-800 mb-4">已离开参与者 ({leftParticipants.length})</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {leftParticipants.map(participant => (
                    <div key={participant.id} className="bg-red-50 rounded-lg p-3 flex justify-between items-center">
                      <div>
                        <div className="font-medium text-red-800">{participant.name}</div>
                        <div className="text-red-600 text-sm">
                          {participant.gamesPlayed} 场比赛 • 
                          {participant.leftReason} • 
                          {participant.leftAt && new Date(participant.leftAt).toLocaleTimeString()}
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          if (confirm(`确定要让 ${participant.name} 重新加入吗？`)) {
                            rejoinParticipant(participant.id);
                          }
                        }}
                        className="text-green-600 hover:text-green-800 text-sm px-2 py-1 rounded hover:bg-green-100"
                      >
                        重新加入
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
} 