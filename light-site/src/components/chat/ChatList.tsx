'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { SettingsModal } from '@/components/settings/SettingsModal';

type Chat = {
  id: string;
  name: string;
  lastMessage?: string;
};

interface ChatListProps {
  chats: Chat[];
  activeChat?: string;
  onNewChat: () => void;
  onDeleteChat: (id: string) => void;
  toggleSidebar: () => void;
  isSidebarVisible: boolean;
}

export function ChatList({ chats, activeChat, onNewChat, onDeleteChat, toggleSidebar, isSidebarVisible }: ChatListProps) {
  const router = useRouter();
  const [hoveredChat, setHoveredChat] = useState<string | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const handleChatClick = (id: string) => {
    router.push(`/chat/${id}`);
  };

  const handleOpenSettings = () => {
    setIsSettingsOpen(true);
  };

  const handleCloseSettings = () => {
    setIsSettingsOpen(false);
  };

  return (
    <div className="flex flex-col h-full bg-[#1b1b1b] p-4 w-64">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <button 
            onClick={toggleSidebar} 
            className="text-gray-400 hover:text-white transition-colors p-1"
            title="Скрыть панель чатов"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <button 
            onClick={handleOpenSettings}
            className="text-gray-400 hover:text-white transition-colors p-1"
            title="Настройки"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>
        </div>
        <button
          onClick={onNewChat}
          className="flex items-center justify-center bg-[#262626] hover:bg-[#303030] border border-gray-700 hover:border-gray-500 text-gray-300 hover:text-white rounded-md p-2 transition-colors"
          title="Создать новый чат"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 20h9"></path>
            <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
          </svg>
        </button>
      </div>
      
      <div className="border-b border-gray-700 mb-4"></div>

      <div className="overflow-y-auto flex-grow">
        {chats.length === 0 ? (
          <div className="text-center text-gray-500 mt-8">
            Нет активных чатов
          </div>
        ) : (
          <ul className="space-y-2">
            {chats.map((chat) => (
              <li 
                key={chat.id}
                className={`
                  relative rounded-lg transition-colors cursor-pointer p-3 
                  ${activeChat === chat.id ? 'bg-gray-800' : 'hover:bg-gray-900'}
                `}
                onClick={() => handleChatClick(chat.id)}
                onMouseEnter={() => setHoveredChat(chat.id)}
                onMouseLeave={() => setHoveredChat(null)}
              >
                <div className="font-medium text-gray-200 truncate">{chat.name}</div>
                {chat.lastMessage && (
                  <div className="text-sm text-gray-400 truncate">{chat.lastMessage}</div>
                )}
                
                {hoveredChat === chat.id && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteChat(chat.id);
                    }}
                    className="absolute right-2 top-2 text-gray-400 hover:text-red-500 rounded-full p-1 transition-colors"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
      
      <SettingsModal isOpen={isSettingsOpen} onClose={handleCloseSettings} activeChatId={activeChat} />
    </div>
  );
} 