'use client';

import { useState, useRef, useEffect, KeyboardEvent } from 'react';

interface MessageInputProps {
  onSendMessage: (message: string, withWebSearch?: boolean) => void;
  disabled?: boolean;
  mode?: 'inline' | 'centered'; // Режим отображения: встроенный или центрированный
  autoFocus?: boolean;
  placeholder?: string;
  welcomeTitle?: string; // Заголовок для центрированного режима
}

export function MessageInput({ 
  onSendMessage, 
  disabled = false, 
  mode = 'inline',
  autoFocus = false,
  placeholder,
  welcomeTitle
}: MessageInputProps) {
  const [message, setMessage] = useState('');
  const [withWebSearch, setWithWebSearch] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [ctrlPressed, setCtrlPressed] = useState(false);

  const handleSend = () => {
    if (message.trim() && !disabled) {
      onSendMessage(message.trim(), withWebSearch);
      setMessage('');
      // Возвращаем фокус на текстовое поле после отправки
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.focus();
        }
      }, 10);
    }
  };

  const toggleWebSearch = () => {
    setWithWebSearch(!withWebSearch);
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
        {/* Кнопка веб-поиска */}
        <button
          onClick={toggleWebSearch}
          disabled={disabled}
          className={`
            p-2 rounded-full transition-all
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
        </button>
        
        {/* Кнопка отправки */}
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