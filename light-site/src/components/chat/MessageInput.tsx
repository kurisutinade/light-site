'use client';

import { useState, useRef, useEffect, KeyboardEvent } from 'react';

interface MessageInputProps {
  onSendMessage: (message: string, withWebSearch?: boolean) => void;
  disabled?: boolean;
}

export function MessageInput({ onSendMessage, disabled = false }: MessageInputProps) {
  const [message, setMessage] = useState('');
  const [withWebSearch, setWithWebSearch] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSend = () => {
    if (message.trim() && !disabled) {
      onSendMessage(message.trim(), withWebSearch);
      setMessage('');
    }
  };

  const toggleWebSearch = () => {
    setWithWebSearch(!withWebSearch);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
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

  return (
    <div className="p-3" style={{ backgroundColor: '#141414' }}>
      <div className="relative max-w-4xl mx-auto">
        <div className="relative">
          <textarea
            ref={textareaRef}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={withWebSearch ? "Поиск в интернете..." : "Спросите что-нибудь..."}
            className="w-full bg-[#262626] text-gray-200 rounded-3xl py-4 pr-24 pl-6 focus:outline-none resize-none overflow-hidden min-h-[56px]"
            rows={1}
            disabled={disabled}
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
              title={withWebSearch ? "Выключить поиск в интернете" : "Включить поиск в интернете"}
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
      </div>
    </div>
  );
}