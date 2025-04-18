'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChatLayout } from '@/components/chat/ChatLayout';

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

export default function Home() {
  const router = useRouter();
  const [chats, setChats] = useState<Chat[]>([]);

  // Загрузка списка чатов
  const fetchChats = async () => {
    try {
      const response = await fetch('/api/chats');
      if (response.ok) {
        const data = await response.json();
        setChats(data);
      }
    } catch (error) {
      console.error('Error fetching chats:', error);
    }
  };

  useEffect(() => {
    fetchChats();
  }, []);

  // Создание нового чата
  const handleNewChat = async () => {
    try {
      const name = `Новый чат ${new Date().toLocaleString()}`;
      const response = await fetch('/api/chats', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name }),
      });

      if (response.ok) {
        const chat = await response.json();
        router.push(`/chat/${chat.id}`);
      }
    } catch (error) {
      console.error('Error creating chat:', error);
    }
  };

  // Удаление чата
  const handleDeleteChat = async (id: string) => {
    try {
      const response = await fetch(`/api/chats/${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        fetchChats();
      }
    } catch (error) {
      console.error('Error deleting chat:', error);
    }
  };

  // Заглушки для ChatLayout
  const emptyMessages: Message[] = [];
  const handleSendMessage = async (content: string, withWebSearch: boolean = false) => {
    try {
      // Создаем новый чат
      const name = `Новый чат ${new Date().toLocaleString()}`;
      // Получаем ID модели из localStorage
      const selectedModelId = localStorage.getItem('selectedModelId');
      
      const response = await fetch('/api/chats', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          name,
          modelId: selectedModelId 
        }),
      });

      if (response.ok) {
        const chat = await response.json();
        
        // Перенаправляем на новый чат, передавая сообщение через localStorage
        localStorage.setItem('pendingMessage', JSON.stringify({
          content,
          withWebSearch,
          fromHomepage: true
        }));
        
        router.push(`/chat/${chat.id}`);
      }
    } catch (error) {
      console.error('Error creating chat with message:', error);
    }
  };

  return (
    <ChatLayout
      chats={chats}
      messages={emptyMessages}
      isProcessing={false}
      onSendMessage={handleSendMessage}
      onNewChat={handleNewChat}
      onDeleteChat={handleDeleteChat}
    />
  );
}
