/**
 * 统一导航栏组件
 */

'use client'

import { useState } from 'react';
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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    router.push('/');
    setMobileMenuOpen(false);
  };

  const handleBack = () => {
    if (backUrl) {
      router.push(backUrl);
    } else {
      router.back();
    }
    setMobileMenuOpen(false);
  };

  const handleHome = () => {
    router.push('/');
    setMobileMenuOpen(false);
  };

  return (
    <nav className="bg-white shadow-sm border-b sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* 左侧：标题和返回按钮 */}
          <div className="flex items-center space-x-2 sm:space-x-4 flex-1 min-w-0">
            {showBackButton && (
              <button
                onClick={handleBack}
                className="flex items-center text-gray-600 hover:text-gray-900 transition-colors flex-shrink-0"
              >
                <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                <span className="hidden sm:inline">{backText}</span>
              </button>
            )}
            
            <h1 className="text-lg sm:text-xl font-semibold text-gray-900 truncate">
              {title}
            </h1>
          </div>

          {/* 桌面端右侧按钮 */}
          <div className="hidden lg:flex items-center space-x-3">
            {rightContent}
            
            {showHomeButton && (
              <button
                onClick={handleHome}
                className="text-gray-600 hover:text-gray-900 transition-colors p-2"
                title="首页"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
              </button>
            )}

            {isAuthenticated && user && (
              <div className="flex items-center space-x-3">
                <span className="text-sm text-gray-600 hidden xl:inline">
                  {user.username} ({user.role === 'superadmin' ? '超级管理员' : '管理员'})
                </span>
                {showLogout && (
                  <button
                    onClick={handleLogout}
                    className="text-sm text-red-600 hover:text-red-800 transition-colors px-3 py-1 rounded"
                  >
                    登出
                  </button>
                )}
              </div>
            )}

            {!isAuthenticated && (
              <button
                onClick={() => router.push('/login')}
                className="bg-pickleball-600 text-white px-4 py-2 rounded-lg hover:bg-pickleball-700 transition-colors text-sm"
              >
                管理员登录
              </button>
            )}
          </div>

          {/* 移动端汉堡菜单按钮 */}
          <div className="lg:hidden">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="text-gray-600 hover:text-gray-900 transition-colors p-2"
              aria-label="菜单"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {mobileMenuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
        </div>

        {/* 移动端下拉菜单 */}
        {mobileMenuOpen && (
          <div className="lg:hidden border-t border-gray-200 py-4 space-y-3">
            {/* 用户信息 */}
            {isAuthenticated && user && (
              <div className="px-2 py-2 text-sm text-gray-600 border-b border-gray-100 pb-3">
                {user.username} ({user.role === 'superadmin' ? '超级管理员' : '管理员'})
              </div>
            )}

            {/* 移动端按钮组 */}
            <div className="space-y-2">
              {rightContent && (
                <div className="px-2">
                  <div className="space-y-2">
                    {rightContent}
                  </div>
                </div>
              )}
              
              {showHomeButton && (
                <button
                  onClick={handleHome}
                  className="w-full text-left px-4 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded transition-colors"
                >
                  🏠 首页
                </button>
              )}

              {isAuthenticated && showLogout && (
                <button
                  onClick={handleLogout}
                  className="w-full text-left px-4 py-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded transition-colors"
                >
                  🚪 登出
                </button>
              )}

              {!isAuthenticated && (
                <button
                  onClick={() => {
                    router.push('/login');
                    setMobileMenuOpen(false);
                  }}
                  className="w-full bg-pickleball-600 text-white px-4 py-2 rounded-lg hover:bg-pickleball-700 transition-colors"
                >
                  管理员登录
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
} 