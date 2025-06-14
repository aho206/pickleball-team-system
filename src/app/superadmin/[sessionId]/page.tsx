'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { GameSession, Weight, Participant } from '@/lib/types'
import { useSuperAdminSocket } from '@/hooks/useSocket'

export default function SuperAdminPage() {
  const params = useParams()
  const sessionId = params.sessionId as string
  
  const [session, setSession] = useState<GameSession | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showAddWeight, setShowAddWeight] = useState(false)
  const [newWeight, setNewWeight] = useState({
    player1: '',
    player2: '',
    weight: 5,
    type: 'teammate' as 'teammate' | 'opponent'
  })

  const { isConnected, on, off, setWeight, removeWeight } = useSuperAdminSocket(sessionId)

  useEffect(() => {
    loadSession()
  }, [sessionId])

  useEffect(() => {
    // 监听实时更新
    on('session-updated', (updatedSession: GameSession) => {
      setSession(updatedSession)
    })

    on('weight-added', (weight: Weight) => {
      setSession(prev => prev ? {
        ...prev,
        weights: [...prev.weights, weight]
      } : null)
    })

    on('weight-removed', (weightId: string) => {
      setSession(prev => prev ? {
        ...prev,
        weights: prev.weights.filter(w => w.id !== weightId)
      } : null)
    })

    return () => {
      off('session-updated')
      off('weight-added')
      off('weight-removed')
    }
  }, [on, off])

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

  const handleAddWeight = async () => {
    if (!newWeight.player1 || !newWeight.player2 || newWeight.player1 === newWeight.player2) {
      alert('请选择两个不同的参与者')
      return
    }

    try {
      const response = await fetch(`/api/sessions/${sessionId}/weights`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newWeight),
      });

      const data = await response.json();
      
      if (data.success) {
        // 重新加载会话数据
        await loadSession();
        setNewWeight({
          player1: '',
          player2: '',
          weight: 5,
          type: 'teammate'
        });
        setShowAddWeight(false);
        alert('权重设置添加成功！');
      } else {
        alert(data.error || '添加权重失败');
      }
    } catch (error) {
      console.error('添加权重失败:', error);
      alert('网络错误，请重试');
    }
  }

  const handleRemoveWeight = async (weightId: string) => {
    if (!confirm('确定要删除这个权重设置吗？')) {
      return;
    }

    try {
      const response = await fetch(`/api/sessions/${sessionId}/weights?weightId=${weightId}`, {
        method: 'DELETE',
      });

      const data = await response.json();
      
      if (data.success) {
        // 重新加载会话数据
        await loadSession();
        alert('权重设置删除成功！');
      } else {
        alert(data.error || '删除权重失败');
      }
    } catch (error) {
      console.error('删除权重失败:', error);
      alert('网络错误，请重试');
    }
  }

  const getParticipantName = (id: string) => {
    return session?.participants.find(p => p.id === id)?.name || '未知'
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
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
            className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700"
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

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        {/* 头部信息 */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h1 className="text-3xl font-bold text-purple-800">超级管理员控制台</h1>
              <p className="text-gray-600">会话ID: {sessionId}</p>
            </div>
            <div className="flex items-center space-x-4">
              <div className={`px-3 py-1 rounded-full text-sm ${
                isConnected ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
              }`}>
                {isConnected ? '已连接' : '未连接'}
              </div>
              <button
                onClick={() => setShowAddWeight(true)}
                className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700"
              >
                添加权重
              </button>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4 text-center">
            <div className="bg-purple-50 rounded-lg p-4">
              <div className="text-2xl font-bold text-purple-600">{session.participants.length}</div>
              <div className="text-sm text-purple-700">总参与者</div>
            </div>
            <div className="bg-blue-50 rounded-lg p-4">
              <div className="text-2xl font-bold text-blue-600">{session.weights.length}</div>
              <div className="text-sm text-blue-700">权重设置</div>
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* 权重管理 */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-2xl font-semibold text-gray-800 mb-6">权重管理</h2>
            <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-700">
                💡 <strong>提示</strong>：可以为同一对参与者分别设置队友权重和对手权重，两种权重会同时生效。
              </p>
            </div>
            
            {session.weights.length > 0 ? (
              <div className="space-y-3">
                {session.weights.map((weight) => (
                  <div key={weight.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex justify-between items-center">
                      <div>
                        <div className="font-medium text-gray-800">
                          {getParticipantName(weight.player1)} & {getParticipantName(weight.player2)}
                        </div>
                        <div className="text-sm text-gray-600">
                          <span className={`px-2 py-1 rounded text-xs ${
                            weight.type === 'teammate' 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {weight.type === 'teammate' ? '队友偏好' : '对手偏好'}
                          </span>
                          <span className="ml-2">权重: {weight.weight}/10</span>
                        </div>
                      </div>
                      <button
                        onClick={() => handleRemoveWeight(weight.id)}
                        className="text-red-600 hover:text-red-800 text-sm"
                      >
                        删除
                      </button>
                    </div>
                    
                    {/* 权重条 */}
                    <div className="mt-2">
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className={`h-2 rounded-full ${
                            weight.type === 'teammate' ? 'bg-green-500' : 'bg-red-500'
                          }`}
                          style={{ width: `${weight.weight * 10}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                暂无权重设置
              </div>
            )}
          </div>

          {/* 参与者列表 */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-2xl font-semibold text-gray-800 mb-6">参与者列表</h2>
            
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {session.participants.map(participant => (
                <div key={participant.id} className="border border-gray-200 rounded-lg p-3">
                  <div className="flex justify-between items-center">
                    <div>
                      <div className="font-medium text-gray-800">{participant.name}</div>
                      <div className="text-sm text-gray-600">
                        {participant.gamesPlayed} 场比赛 | 休息 {participant.restRounds} 轮
                      </div>
                    </div>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      participant.status === 'playing' ? 'bg-green-100 text-green-800' :
                      participant.status === 'queued' ? 'bg-yellow-100 text-yellow-800' :
                      participant.status === 'resting' ? 'bg-gray-100 text-gray-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {participant.status === 'playing' ? '比赛中' :
                       participant.status === 'queued' ? '排队中' :
                       participant.status === 'resting' ? '休息中' : '离开'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 添加权重模态框 */}
        {showAddWeight && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md">
              <h3 className="text-lg font-semibold mb-4">添加权重设置</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    参与者 1
                  </label>
                  <select
                    value={newWeight.player1}
                    onChange={(e) => setNewWeight({...newWeight, player1: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  >
                    <option value="">选择参与者</option>
                    {session.participants.map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    参与者 2
                  </label>
                  <select
                    value={newWeight.player2}
                    onChange={(e) => setNewWeight({...newWeight, player2: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  >
                    <option value="">选择参与者</option>
                    {session.participants
                      .filter(p => p.id !== newWeight.player1)
                      .map(p => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    权重类型
                  </label>
                  <select
                    value={newWeight.type}
                    onChange={(e) => setNewWeight({...newWeight, type: e.target.value as 'teammate' | 'opponent'})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  >
                    <option value="teammate">队友偏好 (增加组队概率)</option>
                    <option value="opponent">对手偏好 (增加对战概率)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    权重值: {newWeight.weight}/10
                  </label>
                  <input
                    type="range"
                    min="1"
                    max="10"
                    value={newWeight.weight}
                    onChange={(e) => setNewWeight({...newWeight, weight: Number(e.target.value)})}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>低</span>
                    <span>高</span>
                  </div>
                </div>
              </div>

              <div className="flex space-x-3 mt-6">
                <button
                  onClick={() => setShowAddWeight(false)}
                  className="flex-1 bg-gray-200 text-gray-800 py-2 px-4 rounded-lg hover:bg-gray-300"
                >
                  取消
                </button>
                <button
                  onClick={handleAddWeight}
                  className="flex-1 bg-purple-600 text-white py-2 px-4 rounded-lg hover:bg-purple-700"
                >
                  添加
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
} 