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
  const [apiKey, setApiKey] = useState('');
  const [googleSearchApiKey, setGoogleSearchApiKey] = useState('');
  const [googleSearchEngineId, setGoogleSearchEngineId] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);
  const [showGoogleApiKey, setShowGoogleApiKey] = useState(false);

  // Загружаем сохраненные настройки при открытии
  useEffect(() => {
    if (isOpen) {
      const savedModelId = localStorage.getItem('selectedModelId');
      if (savedModelId) {
        setSelectedModelId(savedModelId);
      }
      
      const savedApiKey = localStorage.getItem('openrouterApiKey');
      if (savedApiKey) {
        setApiKey(savedApiKey);
      }
      
      const savedGoogleSearchApiKey = localStorage.getItem('googleSearchApiKey');
      if (savedGoogleSearchApiKey) {
        setGoogleSearchApiKey(savedGoogleSearchApiKey);
      }
      
      const savedGoogleSearchEngineId = localStorage.getItem('googleSearchEngineId');
      if (savedGoogleSearchEngineId) {
        setGoogleSearchEngineId(savedGoogleSearchEngineId);
      }
    }
  }, [isOpen]);

  const handleModelChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedModelId(event.target.value);
  };
  
  const handleApiKeyChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setApiKey(event.target.value);
  };
  
  const handleGoogleSearchApiKeyChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setGoogleSearchApiKey(event.target.value);
  };
  
  const handleGoogleSearchEngineIdChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setGoogleSearchEngineId(event.target.value);
  };
  
  const toggleApiKeyVisibility = () => {
    setShowApiKey(!showApiKey);
  };
  
  const toggleGoogleApiKeyVisibility = () => {
    setShowGoogleApiKey(!showGoogleApiKey);
  };

  const handleSave = async () => {
    setIsUpdating(true);
    try {
      // Сохраняем настройки
      localStorage.setItem('selectedModelId', selectedModelId);
      
      // Подготавливаем данные для отправки на сервер
      const settings: Record<string, string> = {};
      
      // Сохраняем API ключ если он был изменен
      if (apiKey.trim() !== '') {
        localStorage.setItem('openrouterApiKey', apiKey);
        settings.openrouterApiKey = apiKey;
      }
      
      // Сохраняем настройки Google Search API если они были изменены
      if (googleSearchApiKey.trim() !== '') {
        localStorage.setItem('googleSearchApiKey', googleSearchApiKey);
        settings.googleSearchApiKey = googleSearchApiKey;
      }
      
      if (googleSearchEngineId.trim() !== '') {
        localStorage.setItem('googleSearchEngineId', googleSearchEngineId);
        settings.googleSearchEngineId = googleSearchEngineId;
      }
      
      // Отправляем настройки на сервер
      if (Object.keys(settings).length > 0) {
        await fetch('/api/settings', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(settings),
        });
      }

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
      console.error('Failed to update settings:', error);
    } finally {
      setIsUpdating(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
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
          
          <div className="space-y-6 max-h-[70vh] overflow-y-auto pr-2">
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
            
            <div>
              <label className="block text-gray-300 mb-2 font-medium">OpenRouter API Ключ</label>
              <div className="relative">
                <input
                  type={showApiKey ? "text" : "password"}
                  value={apiKey}
                  onChange={handleApiKeyChange}
                  placeholder="Введите API ключ от OpenRouter"
                  className="w-full bg-gray-700 border border-gray-600 text-white rounded-md p-2.5 pr-10 focus:outline-none focus:ring-2 focus:ring-blue-600"
                  disabled={isUpdating}
                />
                <button 
                  type="button"
                  onClick={toggleApiKeyVisibility}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-white"
                  disabled={isUpdating}
                >
                  {showApiKey ? (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                      <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                    </svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M3.707 2.293a1 1 0 00-1.414 1.414l14 14a1 1 0 001.414-1.414l-1.473-1.473A10.014 10.014 0 0019.542 10C18.268 5.943 14.478 3 10 3a9.958 9.958 0 00-4.512 1.074l-1.78-1.781zm4.261 4.26l1.514 1.515a2.003 2.003 0 012.45 2.45l1.514 1.514a4 4 0 00-5.478-5.478z" clipRule="evenodd" />
                      <path d="M12.454 16.697L9.75 13.992a4 4 0 01-3.742-3.741L2.335 6.578A9.98 9.98 0 00.458 10c1.274 4.057 5.065 7 9.542 7 .847 0 1.669-.105 2.454-.303z" />
                    </svg>
                  )}
                </button>
              </div>
              <p className="mt-2 text-sm text-gray-400">
                API ключ для доступа к моделям OpenRouter. Вы можете получить его на <a href="https://openrouter.ai/keys" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">openrouter.ai/keys</a>
              </p>
            </div>
            
            <div className="border-t border-gray-700 pt-6">
              <h3 className="text-white font-medium mb-4">Настройки веб-поиска</h3>
              
              <div className="mb-4">
                <label className="block text-gray-300 mb-2 font-medium">Google Search API Ключ</label>
                <div className="relative">
                  <input
                    type={showGoogleApiKey ? "text" : "password"}
                    value={googleSearchApiKey}
                    onChange={handleGoogleSearchApiKeyChange}
                    placeholder="Введите API ключ Google Search"
                    className="w-full bg-gray-700 border border-gray-600 text-white rounded-md p-2.5 pr-10 focus:outline-none focus:ring-2 focus:ring-blue-600"
                    disabled={isUpdating}
                  />
                  <button 
                    type="button"
                    onClick={toggleGoogleApiKeyVisibility}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-white"
                    disabled={isUpdating}
                  >
                    {showGoogleApiKey ? (
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                        <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                      </svg>
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M3.707 2.293a1 1 0 00-1.414 1.414l14 14a1 1 0 001.414-1.414l-1.473-1.473A10.014 10.014 0 0019.542 10C18.268 5.943 14.478 3 10 3a9.958 9.958 0 00-4.512 1.074l-1.78-1.781zm4.261 4.26l1.514 1.515a2.003 2.003 0 012.45 2.45l1.514 1.514a4 4 0 00-5.478-5.478z" clipRule="evenodd" />
                        <path d="M12.454 16.697L9.75 13.992a4 4 0 01-3.742-3.741L2.335 6.578A9.98 9.98 0 00.458 10c1.274 4.057 5.065 7 9.542 7 .847 0 1.669-.105 2.454-.303z" />
                      </svg>
                    )}
                  </button>
                </div>
                <p className="mt-2 text-sm text-gray-400">
                  API ключ для доступа к Google Custom Search. Получите ключ в <a href="https://console.cloud.google.com/apis/credentials" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">Google Cloud Console</a>
                </p>
              </div>
              
              <div>
                <label className="block text-gray-300 mb-2 font-medium">ID поисковой системы Google</label>
                <input
                  type="text"
                  value={googleSearchEngineId}
                  onChange={handleGoogleSearchEngineIdChange}
                  placeholder="Введите ID поисковой системы"
                  className="w-full bg-gray-700 border border-gray-600 text-white rounded-md p-2.5 focus:outline-none focus:ring-2 focus:ring-blue-600"
                  disabled={isUpdating}
                />
                <p className="mt-2 text-sm text-gray-400">
                  ID вашей поисковой системы из <a href="https://programmablesearchengine.google.com/controlpanel/all" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">Programmable Search Engine</a>
                </p>
              </div>
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