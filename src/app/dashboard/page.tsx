'use client'

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { User, GameSession } from '@/lib/types';
import Navigation from '@/components/ui/Navigation';

export default function DashboardPage() {
  const { user, logout, isAuthenticated, isSuperAdmin, loading } = useAuth();
  const router = useRouter();
  
  const [sessions, setSessions] = useState<GameSession[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [showCreateUser, setShowCreateUser] = useState(false);
  const [showCreateSession, setShowCreateSession] = useState(false);
  const [showContactSettings, setShowContactSettings] = useState(false);
  const [loadingData, setLoadingData] = useState(true);

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.push('/login');
      return;
    }
    
    if (isAuthenticated) {
      loadDashboardData();
    }
  }, [isAuthenticated, loading, router]);

  const loadDashboardData = async () => {
    try {
      // 加载用户会话列表
      const sessionsResponse = await fetch('/api/sessions/my');
      const sessionsData = await sessionsResponse.json();
      if (sessionsData.success) {
        setSessions(sessionsData.data);
      }

      // 如果是超级管理员，加载用户列表
      if (isSuperAdmin) {
        const response = await fetch('/api/users');
        const data = await response.json();
        if (data.success) {
          setUsers(data.data);
        }
      }
    } catch (error) {
      console.error('加载仪表板数据失败:', error);
    } finally {
      setLoadingData(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    router.push('/login');
  };

  const toggleUserStatus = async (userId: string, newStatus: boolean) => {
    try {
      const response = await fetch(`/api/users/${userId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ isActive: newStatus }),
      });

      const data = await response.json();
      if (data.success) {
        // 重新加载用户列表
        loadDashboardData();
      } else {
        alert(data.error || '操作失败');
      }
    } catch (error) {
      alert('网络错误，请重试');
    }
  };

  const deleteUser = async (userId: string) => {
    if (!confirm('确定要删除这个用户吗？此操作不可撤销。')) {
      return;
    }

    try {
      const response = await fetch(`/api/users/${userId}`, {
        method: 'DELETE',
      });

      const data = await response.json();
      if (data.success) {
        // 重新加载用户列表
        loadDashboardData();
      } else {
        alert(data.error || '删除失败');
      }
    } catch (error) {
      alert('网络错误，请重试');
    }
  };

  const shareSession = async (sessionId: string) => {
    const sessionUrl = `${window.location.origin}/session/${sessionId}`;
    
    try {
      // 尝试使用Web Share API
      if (navigator.share) {
        await navigator.share({
          title: '匹克球比赛会话',
          text: `加入匹克球比赛会话: ${sessionId}`,
          url: sessionUrl,
        });
      } else {
        // 回退到复制到剪贴板
        await navigator.clipboard.writeText(sessionUrl);
        alert(`会话链接已复制到剪贴板:\n${sessionUrl}`);
      }
    } catch (error) {
      // 如果都失败了，显示链接让用户手动复制
      prompt('请复制以下链接分享给参与者:', sessionUrl);
    }
  };

  const exportSessionData = async (session: GameSession) => {
    try {
      // 准备导出数据
      const exportData = {
        会话信息: {
          会话ID: session.id,
          创建时间: session.createdAt,
          参与者数量: session.participants.length,
          场地数量: session.settings.courtCount,
          当前轮次: session.stats.currentRound,
          总比赛场数: session.stats.totalGamesPlayed
        },
        参与者统计: session.participants.map(p => ({
          姓名: p.name,
          比赛场数: p.gamesPlayed,
          休息轮数: p.restRounds,
          当前状态: p.status === 'playing' ? '比赛中' : 
                   p.status === 'queued' ? '等待中' : '休息中',
          加入时间: p.joinedAt
        })),
        当前比赛: session.courts.map(court => ({
          场地: court.id,
          状态: court.status === 'playing' ? '比赛中' : '空闲',
          队伍A: court.team1 ? [
            session.participants.find(p => p.id === court.team1?.player1)?.name,
            session.participants.find(p => p.id === court.team1?.player2)?.name
          ].filter(Boolean).join(' & ') : '无',
          队伍B: court.team2 ? [
            session.participants.find(p => p.id === court.team2?.player1)?.name,
            session.participants.find(p => p.id === court.team2?.player2)?.name
          ].filter(Boolean).join(' & ') : '无',
          开始时间: court.startTime
        })),
        等待队列: session.queue.map((match, index) => ({
          序号: index + 1,
          队伍A: [
            session.participants.find(p => p.id === match.team1.player1)?.name,
            session.participants.find(p => p.id === match.team1.player2)?.name
          ].filter(Boolean).join(' & '),
          队伍B: [
            session.participants.find(p => p.id === match.team2.player1)?.name,
            session.participants.find(p => p.id === match.team2.player2)?.name
          ].filter(Boolean).join(' & ')
        }))
      };

      // 转换为JSON字符串
      const jsonString = JSON.stringify(exportData, null, 2);
      
      // 创建下载链接
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `匹克球会话_${session.id}_${new Date().toISOString().split('T')[0]}.json`;
      
      // 触发下载
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
    } catch (error) {
      alert('导出失败，请重试');
    }
  };

  const deleteSession = async (sessionId: string) => {
    if (!confirm('确定要删除这个会话吗？此操作不可撤销，所有相关数据将被永久删除。')) {
      return;
    }

    try {
      const response = await fetch(`/api/sessions?id=${sessionId}`, {
        method: 'DELETE',
      });

      const data = await response.json();
      if (data.success) {
        // 重新加载会话列表
        await loadDashboardData();
        alert('会话删除成功！');
      } else {
        alert(data.error || '删除失败');
      }
    } catch (error) {
      console.error('删除会话失败:', error);
      alert('网络错误，请重试');
    }
  };

  const updateContactInfo = async (wechatId: string) => {
    try {
      const response = await fetch('/api/contact-info', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ wechatId }),
      });

      const data = await response.json();
      if (data.success) {
        alert('联系信息更新成功');
        setShowContactSettings(false);
      } else {
        alert(data.error || '更新失败');
      }
    } catch (error) {
      alert('网络错误，请重试');
    }
  };

  if (loading || !isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pickleball-600 mx-auto mb-4"></div>
          <p className="text-gray-600">加载中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 导航栏 */}
      <Navigation
        title="🏓 匹克球管理系统"
        showHomeButton={true}
        showLogout={true}
        rightContent={
          <div className="flex items-center space-x-4">
            <button
              onClick={() => setShowCreateSession(true)}
              className="bg-pickleball-600 text-white px-4 py-2 rounded-lg hover:bg-pickleball-700 transition-colors"
            >
              创建会话
            </button>
            {isSuperAdmin && (
              <>
                <button
                  onClick={() => setShowCreateUser(true)}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  创建管理员
                </button>
                <button
                  onClick={() => setShowContactSettings(true)}
                  className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
                >
                  联系信息
                </button>
              </>
            )}
          </div>
        }
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 系统监控 (仅超级管理员) */}
        {isSuperAdmin && (
          <div className="mb-8">
            <h2 className="text-lg font-medium text-gray-900 mb-4">系统监控</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                      <span className="text-blue-600 text-sm font-medium">👥</span>
                    </div>
                  </div>
                  <div className="ml-4">
                    <div className="text-sm font-medium text-gray-500">总用户数</div>
                    <div className="text-2xl font-bold text-gray-900">{users.length}</div>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                      <span className="text-green-600 text-sm font-medium">✅</span>
                    </div>
                  </div>
                  <div className="ml-4">
                    <div className="text-sm font-medium text-gray-500">活跃用户</div>
                    <div className="text-2xl font-bold text-gray-900">
                      {users.filter(u => u.isActive).length}
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-pickleball-100 rounded-full flex items-center justify-center">
                      <span className="text-pickleball-600 text-sm font-medium">🏓</span>
                    </div>
                  </div>
                  <div className="ml-4">
                    <div className="text-sm font-medium text-gray-500">活跃会话</div>
                    <div className="text-2xl font-bold text-gray-900">{sessions.length}</div>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                      <span className="text-purple-600 text-sm font-medium">👤</span>
                    </div>
                  </div>
                  <div className="ml-4">
                    <div className="text-sm font-medium text-gray-500">总参与者</div>
                    <div className="text-2xl font-bold text-gray-900">
                      {sessions.reduce((total, session) => total + session.participants.length, 0)}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 我的会话 */}
        <div className="mb-8">
          <h2 className="text-lg font-medium text-gray-900 mb-4">我的会话</h2>
          <div className="bg-white rounded-lg shadow">
            {sessions.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                暂无活跃会话
              </div>
            ) : (
              <div className="divide-y divide-gray-200">
                {sessions.map((session) => (
                  <div key={session.id} className="p-6 hover:bg-gray-50">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-lg font-medium text-gray-900">
                          会话 {session.id}
                        </h3>
                        <p className="text-sm text-gray-600">
                          {session.participants.length} 参与者 • {session.settings.courtCount} 场地
                        </p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => router.push(`/admin/${session.id}`)}
                          className="bg-pickleball-600 text-white px-3 py-1 rounded text-sm hover:bg-pickleball-700"
                        >
                          管理
                        </button>
                        {isSuperAdmin && (
                          <button
                            onClick={() => router.push(`/superadmin/${session.id}`)}
                            className="bg-purple-600 text-white px-3 py-1 rounded text-sm hover:bg-purple-700"
                          >
                            权重设置
                          </button>
                        )}
                        <button
                          onClick={() => router.push(`/session/${session.id}`)}
                          className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700"
                        >
                          查看
                        </button>
                        <button
                          onClick={() => shareSession(session.id)}
                          className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700"
                        >
                          分享
                        </button>
                        <button
                          onClick={() => exportSessionData(session)}
                          className="bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700"
                        >
                          导出
                        </button>
                        <button
                          onClick={() => deleteSession(session.id)}
                          className="bg-red-600 text-white px-3 py-1 rounded text-sm hover:bg-red-700"
                        >
                          删除
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* 用户管理 (仅超级管理员) */}
        {isSuperAdmin && (
          <div>
            <h2 className="text-lg font-medium text-gray-900 mb-4">用户管理</h2>
            <div className="bg-white rounded-lg shadow">
              {loadingData ? (
                <div className="p-8 text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-pickleball-600 mx-auto mb-4"></div>
                  <p className="text-gray-600">加载用户列表...</p>
                </div>
              ) : users.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  暂无用户
                </div>
              ) : (
                <div className="divide-y divide-gray-200">
                  {users.map((user) => (
                    <div key={user.id} className="p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-lg font-medium text-gray-900">
                            {user.username}
                          </h3>
                          <p className="text-sm text-gray-600">
                            {user.role === 'superadmin' ? '超级管理员' : '管理员'} • 
                            创建于 {new Date(user.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className={`px-2 py-1 text-xs rounded-full ${
                            user.isActive 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {user.isActive ? '活跃' : '禁用'}
                          </span>
                          {user.role !== 'superadmin' && (
                            <div className="flex space-x-1">
                              <button
                                onClick={() => toggleUserStatus(user.id, !user.isActive)}
                                className={`px-2 py-1 text-xs rounded ${
                                  user.isActive 
                                    ? 'bg-red-100 text-red-700 hover:bg-red-200' 
                                    : 'bg-green-100 text-green-700 hover:bg-green-200'
                                }`}
                              >
                                {user.isActive ? '禁用' : '启用'}
                              </button>
                              <button
                                onClick={() => deleteUser(user.id)}
                                className="px-2 py-1 text-xs rounded bg-red-100 text-red-700 hover:bg-red-200"
                              >
                                删除
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* 创建用户模态框 */}
      {showCreateUser && (
        <CreateUserModal 
          onClose={() => setShowCreateUser(false)}
          onSuccess={() => {
            setShowCreateUser(false);
            loadDashboardData();
          }}
        />
      )}

      {/* 创建会话模态框 */}
      {showCreateSession && (
        <CreateSessionModal 
          onClose={() => setShowCreateSession(false)}
          onSuccess={(sessionId) => {
            setShowCreateSession(false);
            router.push(`/admin/${sessionId}`);
          }}
        />
      )}

      {/* 联系信息设置模态框 */}
      {showContactSettings && (
        <ContactSettingsModal 
          onClose={() => setShowContactSettings(false)}
          onSuccess={updateContactInfo}
        />
      )}
    </div>
  );
}

// 创建用户模态框组件
function CreateUserModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username,
          password,
          role: 'admin',
        }),
      });

      const data = await response.json();

      if (data.success) {
        onSuccess();
      } else {
        setError(data.error || '创建用户失败');
      }
    } catch (error) {
      setError('网络错误，请重试');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
        <h3 className="text-lg font-medium text-gray-900 mb-4">创建管理员用户</h3>
        
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              用户名
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pickleball-500 focus:border-transparent"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              密码
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pickleball-500 focus:border-transparent"
              required
            />
            <p className="text-xs text-gray-500 mt-1">
              密码至少6位，包含大小写字母和数字
            </p>
          </div>

          <div className="flex space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-400"
            >
              取消
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-pickleball-600 text-white py-2 px-4 rounded-lg hover:bg-pickleball-700 disabled:opacity-50"
            >
              {loading ? '创建中...' : '创建'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// 创建会话模态框组件
function CreateSessionModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: (sessionId: string) => void }) {
  const [participantNames, setParticipantNames] = useState('');
  const [courtCount, setCourtCount] = useState(2);
  const [customSessionId, setCustomSessionId] = useState('');
  const [useCustomId, setUseCustomId] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const names = participantNames.split('\n').map(name => name.trim()).filter(name => name);
    
    if (names.length < 4) {
      setError('至少需要4个参与者');
      setLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/sessions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          participantNames: names,
          courtCount,
          customSessionId: useCustomId ? customSessionId : undefined,
        }),
      });

      const data = await response.json();

      if (data.success) {
        onSuccess(data.data.id);
      } else {
        setError(data.error || '创建会话失败');
      }
    } catch (error) {
      setError('网络错误，请重试');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto">
        <h3 className="text-lg font-medium text-gray-900 mb-4">创建新会话</h3>
        
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              参与者姓名 (每行一个)
            </label>
            <textarea
              value={participantNames}
              onChange={(e) => setParticipantNames(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pickleball-500 focus:border-transparent"
              rows={8}
              placeholder="张三&#10;李四&#10;王五&#10;赵六"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              场地数量
            </label>
            <select
              value={courtCount}
              onChange={(e) => setCourtCount(Number(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pickleball-500 focus:border-transparent"
            >
              {[1, 2, 3, 4, 5].map(num => (
                <option key={num} value={num}>{num} 个场地</option>
              ))}
            </select>
          </div>

          <div>
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={useCustomId}
                onChange={(e) => setUseCustomId(e.target.checked)}
                className="rounded border-gray-300 text-pickleball-600 focus:ring-pickleball-500"
              />
              <span className="text-sm font-medium text-gray-700">使用自定义会话ID</span>
            </label>
          </div>

          {useCustomId && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                自定义会话ID
              </label>
              <input
                type="text"
                value={customSessionId}
                onChange={(e) => setCustomSessionId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pickleball-500 focus:border-transparent"
                placeholder="例如: abc123"
                pattern="^[a-zA-Z0-9][a-zA-Z0-9_-]{2,19}$"
                title="3-20个字符，只允许字母、数字、连字符和下划线，必须以字母或数字开头"
              />
            </div>
          )}

          <div className="flex space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-400"
            >
              取消
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-pickleball-600 text-white py-2 px-4 rounded-lg hover:bg-pickleball-700 disabled:opacity-50"
            >
              {loading ? '创建中...' : '创建'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// 联系信息设置模态框组件
function ContactSettingsModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: (wechatId: string) => void }) {
  const [wechatId, setWechatId] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingCurrent, setLoadingCurrent] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadCurrentWechatId();
  }, []);

  const loadCurrentWechatId = async () => {
    try {
      const response = await fetch('/api/contact-info');
      const data = await response.json();
      
      if (data.success && data.data?.wechatId) {
        setWechatId(data.data.wechatId);
      }
    } catch (error) {
      console.error('获取当前微信号失败:', error);
    } finally {
      setLoadingCurrent(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (!wechatId.trim()) {
      setError('微信号不能为空');
      setLoading(false);
      return;
    }

    if (wechatId.length > 50) {
      setError('微信号长度不能超过50个字符');
      setLoading(false);
      return;
    }

    try {
      await onSuccess(wechatId.trim());
    } catch (error) {
      setError('更新失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
        <h3 className="text-lg font-medium text-gray-900 mb-4">设置联系信息</h3>
        
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4">
            {error}
          </div>
        )}

        {loadingCurrent ? (
          <div className="text-center py-4">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-pickleball-600 mx-auto mb-2"></div>
            <p className="text-gray-600 text-sm">加载当前设置...</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                管理员微信号
              </label>
              <input
                type="text"
                value={wechatId}
                onChange={(e) => setWechatId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pickleball-500 focus:border-transparent"
                placeholder="输入微信号"
                required
              />
              <p className="text-xs text-gray-500 mt-1">
                参与者可以通过此微信号联系您解决问题
              </p>
            </div>

            <div className="flex space-x-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-400"
              >
                取消
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 disabled:opacity-50"
              >
                {loading ? '保存中...' : '保存'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
} 