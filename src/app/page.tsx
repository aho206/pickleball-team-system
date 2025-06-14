'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function HomePage() {
  const [sessionId, setSessionId] = useState('')
  const router = useRouter()

  const handleJoinSession = () => {
    if (!sessionId.trim()) {
      alert('请输入会话ID')
      return
    }
    router.push(`/session/${sessionId}`)
  }

  const handleAdminLogin = () => {
    router.push('/login')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-pickleball-50 to-pickleball-100">
      {/* 自定义导航栏 - 不使用全局认证状态 */}
      <nav className="bg-white shadow-sm border-b sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <h1 className="text-xl font-semibold text-gray-900">
              🏓 匹克球系统
            </h1>
            <button
              onClick={handleAdminLogin}
              className="bg-pickleball-600 text-white px-4 py-2 rounded-lg hover:bg-pickleball-700 transition-colors"
            >
              管理员登录
            </button>
          </div>
        </div>
      </nav>

      {/* 主要内容 */}
      <div className="container mx-auto px-4 py-8">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-pickleball-800 mb-4">
            欢迎参与匹克球比赛
          </h1>
          <p className="text-lg text-pickleball-600">
            输入会话ID查看实时比赛状况和轮次安排
          </p>
        </div>

        <div className="max-w-md mx-auto">
          <div className="bg-white rounded-xl shadow-lg p-8">
            <h2 className="text-2xl font-semibold text-gray-800 mb-6 text-center">
              进入比赛会话
            </h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  会话ID
                </label>
                <input
                  type="text"
                  value={sessionId}
                  onChange={(e) => setSessionId(e.target.value)}
                  placeholder="输入会话ID (例如: abc123)"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pickleball-500 focus:border-transparent text-lg"
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      handleJoinSession()
                    }
                  }}
                />
              </div>

              <button
                onClick={handleJoinSession}
                disabled={!sessionId.trim()}
                className="w-full bg-pickleball-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-pickleball-700 focus:ring-2 focus:ring-pickleball-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-lg"
              >
                进入会话
              </button>
            </div>

            <div className="mt-8 pt-6 border-t border-gray-200">
              <div className="text-center text-sm text-gray-600">
                <p className="mb-2">管理员功能：</p>
                <ul className="space-y-1">
                  <li>• 创建新的比赛会话</li>
                  <li>• 管理参与者和场地</li>
                  <li>• 设置权重和偏好</li>
                </ul>
                <p className="mt-4 text-gray-500">
                  管理员请点击右上角按钮登录
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* 功能介绍 */}
        <div className="max-w-4xl mx-auto mt-16">
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="bg-white rounded-lg p-6 shadow-md">
                <div className="text-3xl mb-4">⚖️</div>
                <h3 className="text-lg font-semibold text-gray-800 mb-2">公平轮换</h3>
                <p className="text-gray-600 text-sm">
                  智能算法确保每个人都有相等的比赛机会
                </p>
              </div>
            </div>
            
            <div className="text-center">
              <div className="bg-white rounded-lg p-6 shadow-md">
                <div className="text-3xl mb-4">🔄</div>
                <h3 className="text-lg font-semibold text-gray-800 mb-2">多样配对</h3>
                <p className="text-gray-600 text-sm">
                  避免重复组合，让你与不同的人配对
                </p>
              </div>
            </div>
            
            <div className="text-center">
              <div className="bg-white rounded-lg p-6 shadow-md">
                <div className="text-3xl mb-4">📱</div>
                <h3 className="text-lg font-semibold text-gray-800 mb-2">实时更新</h3>
                <p className="text-gray-600 text-sm">
                  实时查看比赛状况和下一轮安排
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 