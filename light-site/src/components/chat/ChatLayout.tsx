'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ChatList } from './ChatList';
import { ChatWindow } from './ChatWindow';
import { MessageInput } from './MessageInput';

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
  onSendMessage: (message: string) => void;
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
  return (
    <div className="flex h-screen" style={{ backgroundColor: '#141414' }}>
      <ChatList
        chats={chats}
        activeChat={activeChatId}
        onNewChat={onNewChat}
        onDeleteChat={onDeleteChat}
      />
      
      <div className="flex flex-col flex-1 h-full">
        <ChatWindow messages={messages} isLoading={isProcessing} />
        
        <MessageInput onSendMessage={onSendMessage} disabled={isProcessing} />
      </div>
    </div>
  );
} 