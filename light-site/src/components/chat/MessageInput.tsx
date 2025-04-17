'use client';

import { useState, useRef, useEffect, KeyboardEvent } from 'react';

interface MessageInputProps {
  onSendMessage: (message: string, withWebSearch?: boolean, withDeepThink?: boolean) => void;
  onCancelGeneration?: () => void; // Добавляем функцию для отмены генерации
  disabled?: boolean;
  mode?: 'inline' | 'centered'; // Режим отображения: встроенный или центрированный
  autoFocus?: boolean;
  placeholder?: string;
  welcomeTitle?: string; // Заголовок для центрированного режима
  isProcessing?: boolean; // Флаг, показывающий происходит ли генерация
}

export function MessageInput({ 
  onSendMessage, 
  onCancelGeneration,
  disabled = false, 
  mode = 'inline',
  autoFocus = false,
  placeholder,
  welcomeTitle,
  isProcessing = false
}: MessageInputProps) {
  const [message, setMessage] = useState('');
  const [withWebSearch, setWithWebSearch] = useState(false);
  const [withDeepThink, setWithDeepThink] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [ctrlPressed, setCtrlPressed] = useState(false);

  const handleSend = () => {
    if (message.trim() && !disabled) {
      onSendMessage(message.trim(), withWebSearch, withDeepThink);
      setMessage('');
      // Возвращаем фокус на текстовое поле после отправки
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.focus();
        }
      }, 10);
    }
  };

  const handleCancel = () => {
    if (onCancelGeneration) {
      onCancelGeneration();
    }
  };

  const toggleWebSearch = () => {
    setWithWebSearch(!withWebSearch);
  };

  const toggleDeepThink = () => {
    setWithDeepThink(!withDeepThink);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    // Обработка горячих клавиш
    if (e.key === 'Control' || e.key === 'Meta') {
      setCtrlPressed(true);
    }

    // Enter без Shift для отправки сообщения
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }

    // Ctrl+Enter также отправляет сообщение (даже если нажат Shift)
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      handleSend();
    }
    
    // Добавим Esc для очистки поля ввода
    if (e.key === 'Escape') {
      setMessage('');
      e.currentTarget.blur();
    }

    // Ctrl+W для переключения веб-поиска
    if ((e.ctrlKey || e.metaKey) && e.key === 'w') {
      e.preventDefault();
      toggleWebSearch();
    }

    // Ctrl+D для переключения режима Deep Think
    if (e.ctrlKey && e.key === 'd') {
      e.preventDefault();
      toggleDeepThink();
      return;
    }
  };

  const handleKeyUp = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Control' || e.key === 'Meta') {
      setCtrlPressed(false);
    }
  };

  // Автоматическое изменение высоты textarea
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`;
    }
  }, [message]);

  // Определяем используемые заполнители текста
  const inputPlaceholder = placeholder || (withWebSearch 
    ? "Поиск в интернете..." 
    : "Спросите что-нибудь...");

  // Формирование контента в зависимости от режима
  const renderInput = () => (
    <div className="relative">
      <textarea
        ref={textareaRef}
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        onKeyDown={handleKeyDown}
        onKeyUp={handleKeyUp}
        placeholder={inputPlaceholder}
        className="w-full bg-[#262626] text-gray-200 rounded-3xl py-4 pr-24 pl-6 focus:outline-none resize-none overflow-hidden min-h-[56px]"
        rows={1}
        disabled={disabled}
        autoFocus={autoFocus}
      />
      <div className="absolute right-3 bottom-3 flex items-center gap-2">
        {/* Кнопка Deep Think */}
        <button
          onClick={toggleDeepThink}
          disabled={disabled}
          className={`
            p-2 rounded-full transition-all flex items-center
            ${disabled
              ? 'opacity-50 cursor-not-allowed'
              : 'hover:opacity-90'
            }
            ${withDeepThink
              ? 'bg-purple-600 text-white opacity-100'
              : 'bg-white text-gray-500 opacity-50'
            }
          `}
          aria-label="Режим глубокого размышления"
          title={`${withDeepThink ? "Выключить" : "Включить"} режим глубокого размышления (Ctrl+D)`}
        >
          <svg 
            xmlns="http://www.w3.org/2000/svg" 
            className="h-5 w-5" 
            viewBox="0 0 24 24" 
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path>
            <path d="M12 8v4"></path>
            <path d="M12 16h.01"></path>
          </svg>
          {withDeepThink && <span className="ml-1 text-sm">Deep Think</span>}
        </button>
        
        {/* Кнопка веб-поиска */}
        <button
          onClick={toggleWebSearch}
          disabled={disabled}
          className={`
            p-2 rounded-full transition-all flex items-center
            ${disabled
              ? 'opacity-50 cursor-not-allowed'
              : 'hover:opacity-90'
            }
            ${withWebSearch
              ? 'bg-blue-600 text-white opacity-100'
              : 'bg-white text-gray-500 opacity-50'
            }
          `}
          aria-label="Поиск в интернете"
          title={`${withWebSearch ? "Выключить" : "Включить"} поиск в интернете (Ctrl+W)`}
        >
          <svg 
            xmlns="http://www.w3.org/2000/svg" 
            className="h-5 w-5" 
            viewBox="0 0 24 24" 
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="10" />
            <line x1="2" y1="12" x2="22" y2="12" />
            <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
          </svg>
          {withWebSearch && <span className="ml-1 text-sm">Поиск</span>}
        </button>
        
        {/* Кнопка отправки/отмены генерации */}
        {isProcessing ? (
          <button
            onClick={handleCancel}
            className="p-2 bg-red-600 hover:bg-red-500 text-white rounded-full transition-opacity"
            aria-label="Отменить генерацию"
            title="Отменить генерацию"
          >
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              className="h-5 w-5" 
              viewBox="0 0 24 24" 
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        ) : (
          <button
            onClick={handleSend}
            disabled={!message.trim() || disabled}
            className={`
              p-2 bg-white rounded-full transition-opacity
              ${!message.trim() || disabled
                ? 'opacity-50 cursor-not-allowed'
                : 'opacity-100 hover:opacity-90'
              }
            `}
            aria-label="Отправить сообщение"
            title="Отправить сообщение (Enter)"
          >
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              className="h-5 w-5 text-black" 
              viewBox="0 0 24 24" 
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 19V5" />
              <path d="M5 12L12 5 19 12" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );

  // Рендерим содержимое в зависимости от режима
  if (mode === 'centered') {
    return (
      <div className="w-full px-4">
        {welcomeTitle && (
          <div className="mb-10 text-center">
            <h1 className="text-3xl font-bold mb-2 text-white">{welcomeTitle}</h1>
          </div>
        )}
        {renderInput()}
      </div>
    );
  }

  // Режим inline (по умолчанию)
  return (
    <div className="p-3" style={{ backgroundColor: '#141414' }}>
      <div className="relative max-w-4xl mx-auto">
        {renderInput()}
      </div>
      {ctrlPressed && (
        <div className="text-xs text-gray-500 text-center mt-2">
          <kbd className="bg-gray-700 px-1 rounded">Ctrl</kbd> + <kbd className="bg-gray-700 px-1 rounded">W</kbd> для переключения веб-поиска | 
          <kbd className="bg-gray-700 px-1 rounded ml-2">Ctrl</kbd> + <kbd className="bg-gray-700 px-1 rounded">Enter</kbd> для отправки
        </div>
      )}
    </div>
  );
}