'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

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

  const handleChatClick = (id: string) => {
    router.push(`/chat/${id}`);
  };

  return (
    <div className="flex flex-col h-full bg-[#1b1b1b] p-4 w-64">
      <div className="flex items-center justify-between mb-4">
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
          onClick={onNewChat}
          className="bg-blue-600 hover:bg-blue-700 text-white rounded p-2 transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd" />
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
    </div>
  );
} 