'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
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

export default function ChatPage() {
  const router = useRouter();
  const params = useParams();
  const [chats, setChats] = useState<Chat[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isReady, setIsReady] = useState(false);

  // Используем useParams для получения chatId
  const chatId = Array.isArray(params.id) ? params.id[0] : params.id;

  // Загрузка списка чатов
  const fetchChats = async () => {
    try {
      const response = await fetch('/api/chats');
      if (response.ok) {
        const data = await response.json();
        setChats(data);
        return data;
      }
    } catch (error) {
      console.error('Error fetching chats:', error);
    }
    return [];
  };

  // Загрузка сообщений текущего чата
  const fetchMessages = async () => {
    try {
      const response = await fetch(`/api/chats/${chatId}/messages`);
      if (response.ok) {
        const data = await response.json();
        
        // Преобразуем строковые даты в объекты Date
        const messagesWithDates = data.map((msg: any) => ({
          ...msg,
          createdAt: new Date(msg.createdAt)
        }));
        
        setMessages(messagesWithDates);
        return messagesWithDates;
      }
    } catch (error) {
      console.error('Error fetching messages:', error);
    }
    return [];
  };

  // Загрузка данных при монтировании компонента
  useEffect(() => {
    const initialize = async () => {
      setIsReady(false);
      await fetchChats();
      if (chatId) {
        await fetchMessages();
      }
      setIsReady(true);
    };
    
    initialize();
  }, [chatId]);

  // Отдельный эффект для обработки отложенного сообщения
  useEffect(() => {
    if (chatId && isReady && !isProcessing) {
      // Проверяем, есть ли отложенное сообщение
      const pendingMessage = localStorage.getItem('pendingMessage');
      if (pendingMessage) {
        try {
          const pendingData = JSON.parse(pendingMessage);
          const { content, withWebSearch, fromHomepage, fromNewChatPage } = pendingData;
          
          // Удаляем сообщение из localStorage сразу, чтобы избежать повторной отправки
          localStorage.removeItem('pendingMessage');
          
          // Если сообщение пришло с главной страницы или страницы нового чата,
          // даем большую задержку, чтобы чат успел корректно инициализироваться
          const delay = (fromHomepage || fromNewChatPage) ? 800 : 100;
          
          console.log(`Processing pending message with delay ${delay}ms...`);
          
          setTimeout(() => {
            handleSendMessage(content, withWebSearch);
          }, delay);
        } catch (error) {
          console.error('Error processing pending message:', error);
          localStorage.removeItem('pendingMessage');
        }
      }
    }
  }, [chatId, isReady, isProcessing]);

  // Создание нового чата
  const handleNewChat = async () => {
    try {
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
        if (id === chatId) {
          // Если удаляем текущий чат, переходим на главную страницу
          router.push('/');
        } else {
          // Иначе просто обновляем список чатов
          fetchChats();
        }
      }
    } catch (error) {
      console.error('Error deleting chat:', error);
    }
  };

  // Отправка сообщения
  const handleSendMessage = async (content: string, withWebSearch: boolean = false) => {
    if (!content.trim() || isProcessing) return;
    
    // Проверка наличия chatId
    if (!chatId) {
      console.error('Cannot send message: chatId is missing');
      return;
    }
    
    // Проверка, существует ли чат с таким ID
    const chatExists = chats.some(chat => chat.id === chatId);
    if (!chatExists) {
      console.error(`Chat with ID ${chatId} does not exist in the list of chats`);
      // Попробуем перепроверить чат
      const updatedChats = await fetchChats();
      if (!updatedChats.some((chat: Chat) => chat.id === chatId)) {
        console.error(`Chat with ID ${chatId} still not found after refresh`);
        router.push('/');
        return;
      }
    }

    setIsProcessing(true);

    try {
      // Получаем ID выбранной модели
      const selectedModelId = localStorage.getItem('selectedModelId');
      
      // Добавляем сообщение пользователя в UI немедленно
      const tempUserMessage: Message = {
        id: Date.now().toString(),
        content,
        role: 'user',
        createdAt: new Date(),
      };
      
      setMessages(prev => [...prev, tempUserMessage]);

      // Создаем пустое сообщение для ассистента, которое будет заполняться по мере поступления ответа
      const assistantMessageId = (Date.now() + 1).toString();
      const assistantMessage: Message = {
        id: assistantMessageId,
        content: '',
        role: 'assistant',
        createdAt: new Date(),
      };
      
      setMessages(prev => [...prev, assistantMessage]);

      console.log(`Sending message to chat ${chatId}: ${content.substring(0, 30)}...`);

      // Отправляем запрос на сервер
      const response = await fetch(`/api/chats/${chatId}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          content,
          modelId: selectedModelId,
          withWebSearch
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to send message: ${response.status}`);
      }

      if (response.headers.get('Content-Type')?.includes('text/event-stream')) {
        const reader = response.body?.getReader();
        const decoder = new TextDecoder();
        
        if (reader) {
          let accumulatedContent = '';
          let isFirstAssistantResponse = messages.filter(m => m.role === 'assistant').length === 0;
          
          while (true) {
            const { value, done } = await reader.read();
            
            if (done) break;
            
            const chunk = decoder.decode(value, { stream: true });
            const lines = chunk.split('\n\n');
            
            for (const line of lines) {
              if (line.startsWith('data: ')) {
                const data = line.slice(6);
                
                if (data === '[DONE]') break;
                
                try {
                  const parsed = JSON.parse(data);
                  
                  if (parsed.chunk) {
                    // Проверяем статус сообщения
                    if (parsed.status === 'search_started' || parsed.status === 'analyzing' || parsed.status === 'content' || parsed.status === 'error') {
                      // Заменяем содержимое для всех типов статусных сообщений
                      accumulatedContent = parsed.chunk;
                    } else {
                      // Для обратной совместимости со старым форматом
                      accumulatedContent += parsed.chunk;
                    }
                    
                    // Обновляем сообщение ассистента
                    setMessages(prev => 
                      prev.map(msg => 
                        msg.id === assistantMessageId 
                          ? { ...msg, content: accumulatedContent } 
                          : msg
                      )
                    );
                  }
                } catch (e) {
                  console.error('Error parsing stream data:', e);
                }
              }
            }
          }
          
          // Если это первый ответ ассистента в чате, обновляем название чата
          if (isFirstAssistantResponse && accumulatedContent) {
            // Извлекаем первое предложение или первые 50 символов для названия чата
            let chatName = accumulatedContent;
            
            // Находим конец первого предложения (точка, восклицательный или вопросительный знак)
            const sentenceEnd = chatName.search(/[.!?]/);
            if (sentenceEnd > 0) {
              chatName = chatName.substring(0, sentenceEnd + 1);
            }
            
            // Ограничиваем длину названия до 50 символов
            if (chatName.length > 50) {
              chatName = chatName.substring(0, 47) + '...';
            }
            
            // Обновляем название чата через API
            try {
              await fetch(`/api/chats/${chatId}`, {
                method: 'PATCH',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({ name: chatName }),
              });
            } catch (e) {
              console.error('Error updating chat name:', e);
            }
          }
        }
      }

      // После завершения стриминга, обновляем список чатов для отображения последнего сообщения
      fetchChats();
    } catch (error) {
      console.error('Error sending message:', error);
      // Если чат не найден, перенаправляем на главную страницу
      if (error instanceof Error && error.message.includes('404')) {
        router.push('/');
      }
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <ChatLayout
      chats={chats}
      messages={messages}
      activeChatId={chatId}
      isProcessing={isProcessing}
      onSendMessage={handleSendMessage}
      onNewChat={handleNewChat}
      onDeleteChat={handleDeleteChat}
    />
  );
} 