'use client';

import { useEffect, useState } from 'react';
import { AI_MODELS, AIModel, DEFAULT_MODEL_ID } from '@/lib/models';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeChatId?: string;
}

export function SettingsModal({ isOpen, onClose, activeChatId }: SettingsModalProps) {
  const [selectedModelId, setSelectedModelId] = useState(DEFAULT_MODEL_ID);
  const [isUpdating, setIsUpdating] = useState(false);

  // Загружаем сохраненные настройки при открытии
  useEffect(() => {
    if (isOpen) {
      const savedModelId = localStorage.getItem('selectedModelId');
      if (savedModelId) {
        setSelectedModelId(savedModelId);
      }
    }
  }, [isOpen]);

  const handleModelChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedModelId(event.target.value);
  };

  const handleSave = async () => {
    setIsUpdating(true);
    try {
      // Сохраняем настройки
      localStorage.setItem('selectedModelId', selectedModelId);

      // Если есть активный чат, обновляем его модель
      if (activeChatId) {
        await fetch(`/api/chats/${activeChatId}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ modelId: selectedModelId }),
        });
      }

      onClose();
    } catch (error) {
      console.error('Failed to update chat model:', error);
    } finally {
      setIsUpdating(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-lg shadow-xl max-w-lg w-full">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-white">Настройки</h2>
            <button 
              onClick={onClose} 
              className="text-gray-400 hover:text-white transition-colors"
              disabled={isUpdating}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          <div className="space-y-6">
            <div>
              <label className="block text-gray-300 mb-2 font-medium">Модель ИИ</label>
              <select 
                value={selectedModelId}
                onChange={handleModelChange}
                className="w-full bg-gray-700 border border-gray-600 text-white rounded-md p-2.5 focus:outline-none focus:ring-2 focus:ring-blue-600"
                disabled={isUpdating}
              >
                {AI_MODELS.map((model) => (
                  <option key={model.id} value={model.id}>
                    {model.name} ({model.provider})
                  </option>
                ))}
              </select>
              <p className="mt-2 text-sm text-gray-400">
                {AI_MODELS.find(model => model.id === selectedModelId)?.description}
              </p>
            </div>
          </div>

          <div className="flex justify-end mt-8 space-x-3">
            <button 
              onClick={onClose}
              className="px-4 py-2 bg-gray-700 text-white rounded-md hover:bg-gray-600 transition-colors"
              disabled={isUpdating}
            >
              Отмена
            </button>
            <button 
              onClick={handleSave}
              className={`px-4 py-2 text-white rounded-md transition-colors ${isUpdating ? 'bg-blue-800' : 'bg-blue-600 hover:bg-blue-700'}`}
              disabled={isUpdating}
            >
              {isUpdating ? 'Сохранение...' : 'Сохранить'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
} 