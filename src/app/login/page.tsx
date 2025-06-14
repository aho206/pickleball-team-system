'use client'

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import Navigation from '@/components/ui/Navigation';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [sessionId, setSessionId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const { login } = useAuth();
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const result = await login(username, password);
    
    if (result.success) {
      // 登录成功，跳转到仪表板
      router.push('/dashboard');
    } else {
      setError(result.error || '登录失败');
    }
    
    setLoading(false);
  };

  const handleParticipantAccess = () => {
    if (!sessionId.trim()) {
      setError('请输入会话ID');
      return;
    }
    router.push(`/session/${sessionId}`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-pickleball-50 to-pickleball-100">
      {/* 导航栏 */}
      <Navigation
        title="🏓 匹克球系统"
        showBackButton={true}
        backUrl="/"
        backText="返回主页"
        showHomeButton={true}
      />
      
      <div className="flex items-center justify-center py-12">
        <div className="max-w-md w-full mx-4">
          <div className="bg-white rounded-xl shadow-lg p-8">
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold text-pickleball-800 mb-2">
                🏓 匹克球系统
              </h1>
              <p className="text-gray-600">管理员登录</p>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
                {error}
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  用户名
                </label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pickleball-500 focus:border-transparent"
                  placeholder="输入用户名"
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
                  placeholder="输入密码"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-pickleball-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-pickleball-700 focus:ring-2 focus:ring-pickleball-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? '登录中...' : '登录'}
              </button>
            </form>

            <div className="mt-8 pt-6 border-t border-gray-200">
              <div className="text-center mb-4">
                <p className="text-sm text-gray-600">参与者？直接进入球局</p>
              </div>
              
              <div className="space-y-3">
                <input
                  type="text"
                  value={sessionId}
                  onChange={(e) => setSessionId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="输入球局ID"
                />
                <button
                  onClick={handleParticipantAccess}
                  className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg font-medium hover:bg-blue-700 transition-colors"
                >
                  进入球局
                </button>
              </div>
            </div>

            <div className="mt-6 text-center">
              <p className="text-xs text-gray-500">
                如需帮助，请联系系统管理员
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}