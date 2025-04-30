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
    <div className="bg-[#262626] rounded-3xl p-3">
      {/* Поле ввода вверху */}
      <textarea
        ref={textareaRef}
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        onKeyDown={handleKeyDown}
        onKeyUp={handleKeyUp}
        placeholder={inputPlaceholder}
        className="w-full bg-transparent text-white border-none focus:outline-none resize-none overflow-hidden min-h-[40px] py-2 px-3"
        rows={1}
        disabled={disabled}
        autoFocus={autoFocus}
      />

      {/* Кнопки внизу */}
      <div className="flex items-center justify-between mt-2">
        <div className="flex gap-2">
          {/* Кнопка Поиск */}
          <button
            onClick={toggleWebSearch}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-full text-sm ${withWebSearch ? 'bg-[#333333] text-white' : 'text-gray-400 hover:bg-[#333333]'}`}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            </svg>
            <span>Поиск</span>
          </button>

          {/* Кнопка Обоснуй */}
          <button
            onClick={toggleDeepThink}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-full text-sm ${withDeepThink ? 'bg-[#333333] text-white' : 'text-gray-400 hover:bg-[#333333]'}`}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path>
            </svg>
            <span>Обоснуй</span>
          </button>
        </div>

        {/* Кнопка отправки/отмены */}
        {isProcessing ? (
          <button
            onClick={handleCancel}
            className="w-10 h-10 rounded-full flex items-center justify-center bg-white text-red-500"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        ) : (
          <button
            onClick={handleSend}
            disabled={!message.trim() || disabled}
            className={`w-10 h-10 rounded-full flex items-center justify-center ${!message.trim() || disabled ? 'text-gray-500' : 'bg-white text-black'}`}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="22" y1="2" x2="11" y2="13"></line>
              <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
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
      <div className="relative max-w-2xl mx-auto">
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