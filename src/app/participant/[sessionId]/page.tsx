'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { GameSession, Participant } from '@/lib/types'

export default function ParticipantPage() {
  const params = useParams()
  const sessionId = params.sessionId as string
  
  const [session, setSession] = useState<GameSession | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadSession()
    // 这里应该设置Socket.io连接来实时更新
    const interval = setInterval(loadSession, 5000) // 每5秒刷新一次
    return () => clearInterval(interval)
  }, [sessionId])

  const loadSession = async () => {
    try {
      if (loading) setLoading(true)
      console.log('正在加载会话:', sessionId)
      const response = await fetch(`/api/sessions?id=${sessionId}`)
      const data = await response.json()
      console.log('API响应:', data)
      
      if (data.success) {
        setSession(data.data)
        setError(null)
      } else {
        console.error('加载会话失败:', data.error)
        setError(data.error || '加载会话失败')
      }
    } catch (err) {
      console.error('网络错误:', err)
      setError('网络错误，请重试')
    } finally {
      setLoading(false)
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
        <div className="text-center max-w-md mx-auto p-6">
          <div className="text-red-500 text-xl mb-4">❌</div>
          <p className="text-gray-600 mb-2">{error}</p>
          <p className="text-sm text-gray-500 mb-4">会话ID: {sessionId}</p>
          <div className="space-y-2">
            <button
              onClick={loadSession}
              className="bg-pickleball-600 text-white px-4 py-2 rounded-lg hover:bg-pickleball-700 w-full"
            >
              重试
            </button>
            <a
              href="/"
              className="block bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 text-center"
            >
              创建新会话
            </a>
          </div>
        </div>
      </div>
    )
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-6">
          <div className="text-gray-500 text-xl mb-4">🔍</div>
          <p className="text-gray-600 mb-2">会话不存在</p>
          <p className="text-sm text-gray-500 mb-4">会话ID: {sessionId}</p>
          <div className="space-y-2">
            <button
              onClick={loadSession}
              className="bg-pickleball-600 text-white px-4 py-2 rounded-lg hover:bg-pickleball-700 w-full"
            >
              重新加载
            </button>
            <a
              href="/"
              className="block bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 text-center"
            >
              创建新会话
            </a>
          </div>
        </div>
      </div>
    )
  }

  const getParticipantName = (id: string) => {
    return session.participants.find(p => p.id === id)?.name || '未知'
  }

  const playingParticipants = session.participants.filter(p => p.status === 'playing')
  const queuedParticipants = session.participants.filter(p => p.status === 'queued')
  const restingParticipants = session.participants.filter(p => p.status === 'resting')

  // 计算平均比赛次数
  const avgGames = session.participants.length > 0 
    ? session.participants.reduce((sum, p) => sum + p.gamesPlayed, 0) / session.participants.length 
    : 0

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        {/* 头部信息 */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
          <div className="text-center mb-6">
            <h1 className="text-3xl font-bold text-gray-800 mb-2">🏓 匹克球组队</h1>
            <p className="text-gray-600">会话ID: {sessionId}</p>
            <div className="text-sm text-gray-500 mt-2">
              第 {session.stats.currentRound} 轮 | 总比赛 {session.stats.totalGamesPlayed} 场
            </div>
          </div>
          
          <div className="grid grid-cols-3 gap-4 text-center">
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
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-8 mb-8">
          {/* 当前比赛 - 最重要，左上角 */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-2xl font-semibold text-gray-800 mb-6">当前比赛</h2>
            
            <div className="space-y-4">
              {session.courts.map((court, index) => (
                <div key={index} className="border border-gray-200 rounded-lg p-4">
                  <h3 className="font-semibold text-gray-800 mb-3">场地 {index + 1}</h3>
                  
                  {court.team1 && court.team2 ? (
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-blue-50 rounded-lg p-3">
                        <div className="text-sm text-blue-700 font-medium mb-1">队伍 A</div>
                        <div className="text-blue-800 font-medium">
                          {getParticipantName(court.team1.player1)}
                        </div>
                        <div className="text-blue-800 font-medium">
                          {getParticipantName(court.team1.player2)}
                        </div>
                      </div>
                      <div className="bg-red-50 rounded-lg p-3">
                        <div className="text-sm text-red-700 font-medium mb-1">队伍 B</div>
                        <div className="text-red-800 font-medium">
                          {getParticipantName(court.team2.player1)}
                        </div>
                        <div className="text-red-800 font-medium">
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

          {/* 等待队列 - 第二重要，右上角 */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-2xl font-semibold text-gray-800 mb-6">
              等待队列 ({session.queue.length} 场比赛)
            </h2>
            {session.queue.length > 0 ? (
              <div className="space-y-4 max-h-96 overflow-y-auto">
                {session.queue.map((match, index) => (
                  <div key={index} className="border border-gray-200 rounded-lg p-4">
                    <div className="text-sm text-gray-500 mb-2">第 {index + 1} 场</div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-blue-50 rounded-lg p-3">
                        <div className="text-xs text-blue-700 font-medium mb-1">队伍 A</div>
                        <div className="text-sm text-blue-800">
                          {getParticipantName(match.team1.player1)}
                        </div>
                        <div className="text-sm text-blue-800">
                          {getParticipantName(match.team1.player2)}
                        </div>
                      </div>
                      <div className="bg-red-50 rounded-lg p-3">
                        <div className="text-xs text-red-700 font-medium mb-1">队伍 B</div>
                        <div className="text-sm text-red-800">
                          {getParticipantName(match.team2.player1)}
                        </div>
                        <div className="text-sm text-red-800">
                          {getParticipantName(match.team2.player2)}
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

        {/* 参与者统计 - 最后，底部全宽 */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h2 className="text-2xl font-semibold text-gray-800 mb-6">参与者统计</h2>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {session.participants
              .sort((a, b) => b.gamesPlayed - a.gamesPlayed)
              .map(participant => {
                const isAboveAvg = participant.gamesPlayed > avgGames
                const statusColor = {
                  playing: 'bg-green-100 text-green-800',
                  queued: 'bg-yellow-100 text-yellow-800',
                  resting: 'bg-gray-100 text-gray-800',
                  away: 'bg-red-100 text-red-800'
                }[participant.status]
                
                return (
                  <div key={participant.id} className="border border-gray-200 rounded-lg p-3">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center space-x-3">
                        <div className="font-medium text-gray-800">{participant.name}</div>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColor}`}>
                          {participant.status === 'playing' ? '比赛中' :
                           participant.status === 'queued' ? '排队中' :
                           participant.status === 'resting' ? '休息中' : '离开'}
                        </span>
                      </div>
                      <div className="text-right">
                        <div className={`text-sm font-medium ${isAboveAvg ? 'text-green-600' : 'text-gray-600'}`}>
                          {participant.gamesPlayed} 场
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
          </div>
          
          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="text-sm text-gray-600 text-center">
              平均比赛次数: {avgGames.toFixed(1)} 场
            </div>
          </div>
        </div>

        {/* 刷新提示 */}
        <div className="text-center mt-8">
          <p className="text-sm text-gray-500">
            页面每5秒自动刷新 | 如有问题请联系管理员
          </p>
        </div>
      </div>
    </div>
  )
} 