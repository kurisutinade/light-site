'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { MessageBubble } from './MessageBubble';

interface Message {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  createdAt: Date;
}

interface ChatWindowProps {
  messages: Message[];
  isLoading?: boolean;
  showCenteredInput?: boolean;
}

export function ChatWindow({ messages, isLoading = false, showCenteredInput = false }: ChatWindowProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [isScrollingToBottom, setIsScrollingToBottom] = useState(false);
  const [visibleRange, setVisibleRange] = useState({ start: 0, end: 50 });
  const [autoScrollEnabled, setAutoScrollEnabled] = useState(true);

  // Функция для оптимизированного рендеринга сообщений
  const getVisibleMessages = useCallback(() => {
    // Если у нас меньше 50 сообщений, показываем их все
    if (messages.length <= 50) {
      return messages;
    }
    
    // Иначе показываем только видимую часть
    return messages.slice(
      Math.max(0, visibleRange.start), 
      Math.min(messages.length, visibleRange.end)
    );
  }, [messages, visibleRange]);

  // Обработчик прокрутки
  const handleScroll = useCallback(() => {
    if (!containerRef.current) return;
    
    const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
    const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;
    const isNearTop = scrollTop < 200;
    
    // Показываем/скрываем кнопку прокрутки вверх
    setShowScrollButton(scrollTop > 300);
    
    // Обновляем состояние автоскролла
    setAutoScrollEnabled(isNearBottom);
    
    // Вычисляем оптимальный диапазон отображаемых сообщений
    if (messages.length > 50) {
      const totalMessages = messages.length;
      const scrollPercentage = scrollTop / (scrollHeight - clientHeight);
      const center = Math.floor(scrollPercentage * totalMessages);
      
      setVisibleRange({
        start: Math.max(0, center - 25),
        end: Math.min(totalMessages, center + 25)
      });
    }
  }, [messages.length]);

  // Автоскролл к последнему сообщению при добавлении новых
  useEffect(() => {
    if (autoScrollEnabled && messagesEndRef.current && !isScrollingToBottom) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, autoScrollEnabled, isScrollingToBottom]);

  // Устанавливаем обработчик скролла
  useEffect(() => {
    const container = containerRef.current;
    if (container) {
      container.addEventListener('scroll', handleScroll);
      return () => {
        container.removeEventListener('scroll', handleScroll);
      };
    }
  }, [handleScroll]);

  // Прокрутка к концу чата
  const scrollToBottom = () => {
    if (messagesEndRef.current) {
      setIsScrollingToBottom(true);
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
      
      // Сбрасываем флаг после завершения прокрутки
      setTimeout(() => {
        setIsScrollingToBottom(false);
        setAutoScrollEnabled(true);
      }, 500);
    }
  };

  // Прокрутка в начало чата
  const scrollToTop = () => {
    if (containerRef.current) {
      containerRef.current.scrollTo({
        top: 0,
        behavior: 'smooth'
      });
    }
  };

  // Видимые сообщения
  const visibleMessages = getVisibleMessages();

  return (
    <div 
      className="flex-1 overflow-y-auto p-4 relative" 
      style={{ backgroundColor: '#141414' }}
      ref={containerRef}
    >
      {messages.length === 0 ? (
        <div className="h-full flex flex-col items-center justify-center text-gray-500">
          {!showCenteredInput ? (
            <>
              <svg 
                xmlns="http://www.w3.org/2000/svg" 
                className="h-16 w-16 mb-4 text-gray-700" 
                fill="none" 
                viewBox="0 0 24 24" 
                stroke="currentColor"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={1.5} 
                  d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" 
                />
              </svg>
              <p className="text-lg">Начните новый разговор</p>
            </>
          ) : null}
        </div>
      ) : (
        <div className="max-w-4xl mx-auto">
          {/* Показываем сообщение о виртуализации, если сообщений много */}
          {messages.length > 50 && visibleRange.start > 0 && (
            <div className="text-center text-gray-500 mb-4 py-2 rounded-lg bg-gray-800 bg-opacity-50">
              Показаны сообщения {visibleRange.start + 1}-{Math.min(visibleRange.end, messages.length)} из {messages.length}
              <button 
                onClick={scrollToTop}
                className="ml-2 text-blue-400 hover:text-blue-300 underline"
              >
                Перейти к началу
              </button>
            </div>
          )}
          
          {visibleMessages.map((message) => (
            <MessageBubble
              key={message.id}
              content={message.content}
              role={message.role as 'user' | 'assistant'}
              timestamp={message.createdAt}
            />
          ))}
          
          {isLoading && (
            <div className="flex justify-start mb-4">
              <div className="p-3 rounded-lg">
                <div className="flex space-x-2">
                  <div className="w-2 h-2 bg-gray-200 rounded-full animate-pulse" style={{ animationDelay: '0ms' }}></div>
                  <div className="w-2 h-2 bg-gray-200 rounded-full animate-pulse" style={{ animationDelay: '200ms' }}></div>
                  <div className="w-2 h-2 bg-gray-200 rounded-full animate-pulse" style={{ animationDelay: '400ms' }}></div>
                </div>
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>
      )}
      
      {/* Кнопка прокрутки вверх/вниз */}
      {messages.length > 5 && (
        <>
          {showScrollButton && (
            <button
              className="fixed bottom-24 right-8 bg-gray-700 hover:bg-gray-600 text-white rounded-full p-3 shadow-lg transition-all z-10"
              onClick={scrollToTop}
              title="Прокрутить вверх"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z" clipRule="evenodd" />
              </svg>
            </button>
          )}
          
          {!autoScrollEnabled && !showCenteredInput && (
            <button
              className="fixed bottom-24 right-8 bg-blue-600 hover:bg-blue-500 text-white rounded-full p-3 shadow-lg transition-all z-10"
              onClick={scrollToBottom}
              title="Прокрутить к последнему сообщению"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          )}
        </>
      )}
    </div>
  );
} 