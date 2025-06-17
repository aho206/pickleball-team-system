'use client'

import { useState } from 'react';

interface EditableCourtNameProps {
  courtId: number;
  currentName: string;
  onUpdate: (courtId: number, newName: string) => void;
  disabled?: boolean;
}

export default function EditableCourtName({ 
  courtId, 
  currentName, 
  onUpdate, 
  disabled = false 
}: EditableCourtNameProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(currentName);
  const [isUpdating, setIsUpdating] = useState(false);

  const handleStartEdit = () => {
    if (disabled) return;
    setIsEditing(true);
    setEditValue(currentName);
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditValue(currentName);
  };

  const handleSave = async () => {
    const trimmedValue = editValue.trim();
    
    if (!trimmedValue) {
      alert('场地名称不能为空');
      return;
    }

    if (trimmedValue === currentName) {
      setIsEditing(false);
      return;
    }

    if (trimmedValue.length > 20) {
      alert('场地名称不能超过20个字符');
      return;
    }

    setIsUpdating(true);
    try {
      await onUpdate(courtId, trimmedValue);
      setIsEditing(false);
    } catch (error) {
      // 错误处理由父组件完成
    } finally {
      setIsUpdating(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSave();
    } else if (e.key === 'Escape') {
      handleCancel();
    }
  };

  if (isEditing) {
    return (
      <div className="flex items-center space-x-2">
        <input
          type="text"
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onKeyDown={handleKeyPress}
          className="font-semibold text-gray-800 bg-white border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-pickleball-500 focus:border-transparent"
          maxLength={20}
          autoFocus
          disabled={isUpdating}
        />
        <button
          onClick={handleSave}
          disabled={isUpdating}
          className="text-green-600 hover:text-green-800 text-sm px-1 disabled:opacity-50"
          title="保存"
        >
          {isUpdating ? '⏳' : '✓'}
        </button>
        <button
          onClick={handleCancel}
          disabled={isUpdating}
          className="text-red-600 hover:text-red-800 text-sm px-1 disabled:opacity-50"
          title="取消"
        >
          ✕
        </button>
      </div>
    );
  }

  return (
    <div 
      className={`font-semibold text-gray-800 ${disabled ? '' : 'cursor-pointer hover:text-pickleball-600'} flex items-center space-x-1`}
      onClick={handleStartEdit}
      title={disabled ? '' : '点击编辑场地名称'}
    >
      <span>{currentName}</span>
      {!disabled && (
        <span className="text-gray-400 text-xs opacity-0 group-hover:opacity-100 transition-opacity">
          ✏️
        </span>
      )}
    </div>
  );
} 