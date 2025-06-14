'use client'

import { useState, useEffect } from 'react';

interface ContactAdminProps {
  className?: string;
}

export default function ContactAdmin({ className = '' }: ContactAdminProps) {
  const [wechatId, setWechatId] = useState<string>('aho206');
  const [showCopySuccess, setShowCopySuccess] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadContactInfo();
  }, []);

  const loadContactInfo = async () => {
    try {
      const response = await fetch('/api/contact-info');
      const data = await response.json();
      
      if (data.success && data.data?.wechatId) {
        setWechatId(data.data.wechatId);
      }
    } catch (error) {
      console.error('获取联系信息失败:', error);
      // 使用默认值
    } finally {
      setLoading(false);
    }
  };

  const copyWechatId = async () => {
    try {
      await navigator.clipboard.writeText(wechatId);
      setShowCopySuccess(true);
      
      // 3秒后隐藏成功提示
      setTimeout(() => {
        setShowCopySuccess(false);
      }, 3000);
    } catch (error) {
      console.error('复制失败:', error);
      // 降级方案：选择文本
      const textArea = document.createElement('textarea');
      textArea.value = wechatId;
      document.body.appendChild(textArea);
      textArea.select();
      try {
        document.execCommand('copy');
        setShowCopySuccess(true);
        setTimeout(() => setShowCopySuccess(false), 3000);
      } catch (fallbackError) {
        alert(`复制失败，请手动复制微信号：${wechatId}`);
      }
      document.body.removeChild(textArea);
    }
  };

  if (loading) {
    return null; // 加载时不显示
  }

  return (
    <div className={`bg-white border border-gray-200 rounded-lg p-4 ${className}`}>
      <div className="flex items-center justify-center mb-3">
        <span className="text-lg mr-2">💬</span>
        <span className="text-gray-700 font-medium">遇到问题？联系管理员</span>
      </div>
      
      <div className="flex items-center justify-between bg-gray-50 rounded-lg p-3">
        <div className="flex items-center space-x-2">
          <span className="text-green-600 font-medium">微信号:</span>
          <span className="text-gray-800 font-mono bg-white px-2 py-1 rounded border">
            {wechatId}
          </span>
        </div>
        
        <button
          onClick={copyWechatId}
          className="bg-green-600 text-white px-3 py-1 rounded-lg hover:bg-green-700 transition-colors text-sm font-medium"
        >
          复制
        </button>
      </div>
      
      {/* 复制成功提示 */}
      {showCopySuccess && (
        <div className="mt-3 bg-green-50 border border-green-200 rounded-lg p-3 text-center">
          <div className="flex items-center justify-center space-x-2">
            <span className="text-green-600">✅</span>
            <span className="text-green-700 text-sm font-medium">
              已复制，请打开微信添加好友
            </span>
          </div>
        </div>
      )}
    </div>
  );
} 