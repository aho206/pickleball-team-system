/**
 * 统一导航栏组件
 */

'use client'

import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

interface NavigationProps {
  title?: string;
  showBackButton?: boolean;
  backUrl?: string;
  backText?: string;
  showHomeButton?: boolean;
  showLogout?: boolean;
  rightContent?: React.ReactNode;
}

export default function Navigation({
  title = "🏓 匹克球系统",
  showBackButton = false,
  backUrl = "/",
  backText = "返回",
  showHomeButton = false,
  showLogout = false,
  rightContent
}: NavigationProps) {
  const router = useRouter();
  const { user, logout, isAuthenticated } = useAuth();

  const handleLogout = async () => {
    await logout();
    router.push('/');
  };

  const handleBack = () => {
    if (backUrl) {
      router.push(backUrl);
    } else {
      router.back();
    }
  };

  const handleHome = () => {
    router.push('/');
  };

  return (
    <nav className="bg-white shadow-sm border-b sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* 左侧：标题和返回按钮 */}
          <div className="flex items-center space-x-4">
            {showBackButton && (
              <button
                onClick={handleBack}
                className="flex items-center text-gray-600 hover:text-gray-900 transition-colors"
              >
                <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                {backText}
              </button>
            )}
            
            <h1 className="text-xl font-semibold text-gray-900">
              {title}
            </h1>
          </div>

          {/* 右侧：操作按钮 */}
          <div className="flex items-center space-x-4">
            {rightContent}
            
            {showHomeButton && (
              <button
                onClick={handleHome}
                className="text-gray-600 hover:text-gray-900 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
              </button>
            )}

            {isAuthenticated && user && (
              <div className="flex items-center space-x-3">
                <span className="text-sm text-gray-600">
                  {user.username} ({user.role === 'superadmin' ? '超级管理员' : '管理员'})
                </span>
                {showLogout && (
                  <button
                    onClick={handleLogout}
                    className="text-sm text-red-600 hover:text-red-800 transition-colors"
                  >
                    登出
                  </button>
                )}
              </div>
            )}

            {!isAuthenticated && (
              <button
                onClick={() => router.push('/login')}
                className="bg-pickleball-600 text-white px-4 py-2 rounded-lg hover:bg-pickleball-700 transition-colors"
              >
                管理员登录
              </button>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
} 