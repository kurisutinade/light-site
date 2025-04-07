'use client';

import { useState, useRef, useEffect, KeyboardEvent } from 'react';

interface MessageInputProps {
  onSendMessage: (message: string) => void;
  disabled?: boolean;
}

export function MessageInput({ onSendMessage, disabled = false }: MessageInputProps) {
  const [message, setMessage] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSend = () => {
    if (message.trim() && !disabled) {
      onSendMessage(message.trim());
      setMessage('');
    }
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
            placeholder="Спросите что-нибудь..."
            className="w-full bg-[#262626] text-gray-200 rounded-3xl py-4 pr-14 pl-6 focus:outline-none resize-none overflow-hidden min-h-[56px]"
            rows={1}
            disabled={disabled}
          />
          <button
            onClick={handleSend}
            disabled={!message.trim() || disabled}
            className={`
              absolute right-3 bottom-3
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
  );
}