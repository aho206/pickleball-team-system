import Navigation from '@/components/ui/Navigation';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation
        title="🏓 匹克球系统"
        showBackButton={true}
        backUrl="/"
        backText="返回主页"
        showHomeButton={true}
      />
      
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <div className="text-6xl mb-4">🏓</div>
          <h1 className="text-4xl font-bold text-gray-900 mb-4">页面未找到</h1>
          <p className="text-gray-600 mb-8">抱歉，您访问的页面不存在。</p>
          <div className="space-x-4">
            <a
              href="/"
              className="bg-pickleball-600 text-white px-6 py-3 rounded-lg hover:bg-pickleball-700 transition-colors inline-block"
            >
              返回主页
            </a>
            <a
              href="/login"
              className="bg-gray-600 text-white px-6 py-3 rounded-lg hover:bg-gray-700 transition-colors inline-block"
            >
              管理员登录
            </a>
          </div>
        </div>
      </div>
    </div>
  );
} 