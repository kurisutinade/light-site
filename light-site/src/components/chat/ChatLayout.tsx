'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ChatList } from './ChatList';
import { ChatWindow } from './ChatWindow';
import { MessageInput } from './MessageInput';
import { WelcomeInput } from './WelcomeInput';

interface Chat {
  id: string;
  name: string;
  lastMessage?: string;
}

interface Message {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  createdAt: Date;
}

interface ChatLayoutProps {
  chats: Chat[];
  messages: Message[];
  activeChatId?: string;
  isProcessing?: boolean;
  onSendMessage: (message: string, withWebSearch?: boolean) => void;
  onNewChat: () => void;
  onDeleteChat: (id: string) => void;
}

export function ChatLayout({
  chats,
  messages,
  activeChatId,
  isProcessing = false,
  onSendMessage,
  onNewChat,
  onDeleteChat,
}: ChatLayoutProps) {
  const [isSidebarVisible, setIsSidebarVisible] = useState(true);
  const isEmptyChat = messages.length === 0;
  const shouldShowCenteredInput = isEmptyChat && (!activeChatId || activeChatId === 'new');

  // Загружаем сохраненное состояние при первой загрузке
  useEffect(() => {
    const savedState = localStorage.getItem('isSidebarVisible');
    if (savedState !== null) {
      setIsSidebarVisible(savedState === 'true');
    }
  }, []);

  const toggleSidebar = () => {
    const newState = !isSidebarVisible;
    setIsSidebarVisible(newState);
    // Сохраняем состояние в localStorage
    localStorage.setItem('isSidebarVisible', String(newState));
  };

  return (
    <div className="flex h-screen" style={{ backgroundColor: '#141414' }}>
      {isSidebarVisible && (
        <ChatList
          chats={chats}
          activeChat={activeChatId}
          onNewChat={onNewChat}
          onDeleteChat={onDeleteChat}
          toggleSidebar={toggleSidebar}
          isSidebarVisible={isSidebarVisible}
        />
      )}
      
      <div className="flex flex-col flex-1 h-full">
        {!isSidebarVisible && (
          <div className="absolute top-4 left-4 z-10">
            <button 
              onClick={toggleSidebar} 
              className="text-gray-400 hover:text-white transition-colors shadow-lg"
              title="Показать панель чатов"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        )}
        
        <ChatWindow 
          messages={messages} 
          isLoading={isProcessing} 
          showCenteredInput={shouldShowCenteredInput} 
        />
        
        {shouldShowCenteredInput ? (
          <div className="absolute top-0 left-0 right-0 bottom-0 pointer-events-none flex items-center justify-center">
            <div className="pointer-events-auto w-full max-w-2xl">
              <WelcomeInput onSendMessage={onSendMessage} disabled={isProcessing} />
            </div>
          </div>
        ) : (
          <MessageInput onSendMessage={onSendMessage} disabled={isProcessing} />
        )}
      </div>
    </div>
  );
} 