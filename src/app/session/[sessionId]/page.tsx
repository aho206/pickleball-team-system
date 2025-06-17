'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { GameSession, Participant } from '@/lib/types'
import Navigation from '@/components/ui/Navigation'

export default function SessionPage() {
  const params = useParams()
  const sessionId = params.sessionId as string
  
  const [session, setSession] = useState<GameSession | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [autoRefresh, setAutoRefresh] = useState(true)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  useEffect(() => {
    loadSession()
    // 根据autoRefresh状态决定是否自动刷新
    if (autoRefresh) {
      const interval = setInterval(loadSession, 5000)
      return () => clearInterval(interval)
    }
  }, [sessionId, autoRefresh])

  const loadSession = async () => {
    try {
      const response = await fetch(`/api/sessions?id=${sessionId}`)
      const data = await response.json()
      
      if (data.success) {
        setSession(data.data)
        setError('')
        setLastUpdated(new Date())
      } else {
        setError(data.error || '获取球局失败')
      }
    } catch (error) {
      setError('网络错误，请重试')
    } finally {
      setLoading(false)
    }
  }

  const getPlayerName = (playerId: string): string => {
    const participant = session?.participants.find(p => p.id === playerId)
    return participant?.name || '未知'
  }

  const getStatusText = (status: string): string => {
    switch (status) {
      case 'playing': return '比赛中'
      case 'queued': return '等待中'
      case 'resting': return '休息中'
      default: return '未知'
    }
  }

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'playing': return 'bg-green-100 text-green-800'
      case 'queued': return 'bg-yellow-100 text-yellow-800'
      case 'resting': return 'bg-gray-100 text-gray-800'
      default: return 'bg-gray-100 text-gray-800'
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
          <h1 className="text-2xl font-bold text-gray-800 mb-2">加载失败</h1>
          <p className="text-gray-600 mb-6">{error}</p>
          <div className="flex space-x-3 justify-center">
            <button
              onClick={() => window.location.href = '/'}
              className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700"
            >
              返回主页
            </button>
            <button
              onClick={loadSession}
              className="bg-pickleball-600 text-white px-4 py-2 rounded-lg hover:bg-pickleball-700"
            >
              重试
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-gray-400 text-xl mb-4">🔍</div>
          <h1 className="text-2xl font-bold text-gray-800 mb-2">球局不存在</h1>
          <p className="text-gray-600 mb-6">请检查球局编号是否正确，或联系管理员确认球局状态</p>
          <div className="flex space-x-3 justify-center">
            <button
              onClick={() => window.location.href = '/'}
              className="bg-pickleball-600 text-white px-4 py-2 rounded-lg hover:bg-pickleball-700"
            >
              返回主页
            </button>
            <button
              onClick={loadSession}
              className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700"
            >
              重试
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 导航栏 */}
      <Navigation
        title={`🏓 球局 ${session.id}`}
        showBackButton={true}
        backUrl="/"
        backText="返回主页"
        showHomeButton={true}
        rightContent={
          <div className="flex items-center space-x-4">
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.checked)}
                className="rounded border-gray-300 text-pickleball-600 focus:ring-pickleball-500"
              />
              <span className="text-sm text-gray-600">自动刷新</span>
            </label>
            <div className="text-sm text-gray-500">
              {lastUpdated && `更新于 ${lastUpdated.toLocaleTimeString()}`}
            </div>
            <button
              onClick={loadSession}
              className="bg-pickleball-600 text-white px-3 py-1 rounded text-sm hover:bg-pickleball-700"
            >
              刷新
            </button>
          </div>
        }
      />

      {/* 球局信息 */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <p className="text-sm text-gray-600">
            第 {session.stats.currentRound} 轮 • 
            {session.participants.length} 参与者 • 
            {session.settings.courtCount} 场地
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid lg:grid-cols-2 gap-8">
          {/* 当前比赛 */}
          <div>
            <h2 className="text-lg font-medium text-gray-900 mb-4">当前比赛</h2>
            <div className="space-y-4">
              {session.courts.map((court) => (
                <div key={court.id} className="bg-white rounded-lg shadow p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-medium text-gray-900">
                      {court.name || `场地 ${court.id}`}
                    </h3>
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      court.status === 'playing' 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {court.status === 'playing' ? '比赛中' : '空闲'}
                    </span>
                  </div>
                  
                  {court.team1 && court.team2 ? (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="text-sm">
                          <div className="font-medium text-blue-600">队伍 A</div>
                          <div>{getPlayerName(court.team1.player1)} & {getPlayerName(court.team1.player2)}</div>
                        </div>
                        <div className="text-2xl font-bold text-gray-400">VS</div>
                        <div className="text-sm text-right">
                          <div className="font-medium text-red-600">队伍 B</div>
                          <div>{getPlayerName(court.team2.player1)} & {getPlayerName(court.team2.player2)}</div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center text-gray-500 py-4">
                      暂无比赛安排
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* 等待队列 */}
          <div>
            <h2 className="text-lg font-medium text-gray-900 mb-4">等待队列</h2>
            <div className="bg-white rounded-lg shadow">
              {session.queue.length > 0 ? (
                <div className="divide-y divide-gray-200">
                  {session.queue.map((match, index) => (
                    <div key={index} className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="text-sm">
                          <div className="font-medium text-blue-600">队伍 A</div>
                          <div>{getPlayerName(match.team1.player1)} & {getPlayerName(match.team1.player2)}</div>
                        </div>
                        <div className="text-lg font-bold text-gray-400">VS</div>
                        <div className="text-sm text-right">
                          <div className="font-medium text-red-600">队伍 B</div>
                          <div>{getPlayerName(match.team2.player1)} & {getPlayerName(match.team2.player2)}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-8 text-center text-gray-500">
                  暂无等待队列
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 参与者状态 */}
        <div className="mt-8">
          <h2 className="text-lg font-medium text-gray-900 mb-4">参与者状态</h2>
          
          {/* 活跃参与者 */}
          <div className="bg-white rounded-lg shadow overflow-hidden mb-6">
            <div className="px-4 py-3 bg-gray-50 border-b">
              <h3 className="text-sm font-medium text-gray-700">
                活跃参与者 ({session.participants.filter(p => !p.hasLeft).length})
              </h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 divide-y md:divide-y-0 md:divide-x divide-gray-200">
              {session.participants
                .filter(p => !p.hasLeft)
                .sort((a, b) => b.gamesPlayed - a.gamesPlayed)
                .map((participant) => (
                <div key={participant.id} className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-medium text-gray-900">{participant.name}</h3>
                    <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(participant.status)}`}>
                      {getStatusText(participant.status)}
                    </span>
                  </div>
                  <div className="text-sm text-gray-600">
                    比赛场数: {participant.gamesPlayed}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 已离开参与者 */}
          {session.participants.filter(p => p.hasLeft).length > 0 && (
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <div className="px-4 py-3 bg-red-50 border-b">
                <h3 className="text-sm font-medium text-red-700">
                  已离开参与者 ({session.participants.filter(p => p.hasLeft).length})
                </h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 divide-y md:divide-y-0 md:divide-x divide-gray-200">
                {session.participants
                  .filter(p => p.hasLeft)
                  .sort((a, b) => b.gamesPlayed - a.gamesPlayed)
                  .map((participant) => (
                  <div key={participant.id} className="p-4 opacity-60">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-medium text-gray-600">{participant.name}</h3>
                      <span className="px-2 py-1 text-xs rounded-full bg-red-100 text-red-800">
                        已离开
                      </span>
                    </div>
                    <div className="text-sm text-gray-500">
                      比赛场数: {participant.gamesPlayed}
                    </div>
                    <div className="text-xs text-gray-400 mt-1">
                      {participant.leftReason} • {participant.leftAt && new Date(participant.leftAt).toLocaleTimeString()}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}