'use client';

import { useEffect, useState, useRef } from 'react';
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
  thinkingProcess?: string;
  thinkingComplete?: boolean;
}

export default function ChatPage() {
  const router = useRouter();
  const params = useParams();
  const [chats, setChats] = useState<Chat[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);

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
          const { content, withWebSearch, withDeepThink, fromHomepage, fromNewChatPage } = pendingData;
          
          // Удаляем сообщение из localStorage сразу, чтобы избежать повторной отправки
          localStorage.removeItem('pendingMessage');
          
          // Если сообщение пришло с главной страницы или страницы нового чата,
          // даем большую задержку, чтобы чат успел корректно инициализироваться
          const delay = (fromHomepage || fromNewChatPage) ? 800 : 100;
          
          console.log(`Processing pending message with delay ${delay}ms...`);
          console.log(`Message parameters: withWebSearch=${withWebSearch}, withDeepThink=${withDeepThink}`);
          
          setTimeout(() => {
            handleSendMessage(content, withWebSearch, withDeepThink);
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
  const handleSendMessage = async (content: string, withWebSearch: boolean = false, withDeepThink: boolean = false) => {
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
      // Создаем AbortController для возможности отмены запроса
      abortControllerRef.current = new AbortController();
      const signal = abortControllerRef.current.signal;

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
        thinkingProcess: '' // Инициализируем поле для размышлений
      };
      
      setMessages(prev => [...prev, assistantMessage]);

      console.log(`Sending message to chat ${chatId}: ${content.substring(0, 30)}...`);
      console.log(`Parameters: withWebSearch=${withWebSearch}, withDeepThink=${withDeepThink}`);

      // Отправляем запрос на сервер
      const response = await fetch(`/api/chats/${chatId}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          content,
          modelId: selectedModelId,
          withWebSearch,
          withDeepThink // Передаем параметр режима Deep Think
        }),
        signal // Добавляем signal для возможности отмены запроса
      });

      if (!response.ok) {
        throw new Error(`API request failed: ${response.status}`);
      }
      
      let isCancelled = false;
      
      // Обрабатываем ответ как поток событий
      if (response.headers.get('Content-Type')?.includes('text/event-stream')) {
        const reader = response.body?.getReader();
        const decoder = new TextDecoder();
        
        if (reader) {
          let accumulatedContent = '';
          let accumulatedThinking = '';
          let isFirstAssistantResponse = messages.filter(m => m.role === 'assistant').length === 0;
          
          while (true) {
            try {
              // Проверяем, не был ли запрос отменен
              if (abortControllerRef.current === null) {
                isCancelled = true;
                break;
              }
              
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
                    
                    // Добавляем подробное логирование для отладки
                    console.log(`Received message with status: ${parsed.status || 'none'}`);
                    
                    if (parsed.status === 'thinking_started') {
                      console.log('Deep thinking started');
                      // Обновляем UI для отображения начала размышлений
                    } else if (parsed.status === 'thinking_process') {
                      console.log(`Thinking process update, length: ${parsed.chunk?.length || 0} chars, isComplete: ${parsed.isComplete}`);
                      // Обновляем размышления в сообщении ассистента
                      accumulatedThinking = parsed.chunk;
                      
                      if (!isCancelled) {
                        setMessages(prev => 
                          prev.map(msg => 
                            msg.id === assistantMessageId 
                              ? { 
                                  ...msg, 
                                  thinkingProcess: accumulatedThinking,
                                  // Добавляем к сообщению метаданные о состоянии размышления
                                  thinkingComplete: parsed.isComplete === true 
                                } 
                              : msg
                          )
                        );
                      }
                    } else if (parsed.status === 'content') {
                      console.log(`Content update, length: ${parsed.chunk?.length || 0} chars`);
                      // Стандартное обновление содержимого сообщения
                      accumulatedContent = parsed.chunk;
                      
                      if (!isCancelled) {
                        setMessages(prev => 
                          prev.map(msg => 
                            msg.id === assistantMessageId 
                              ? { ...msg, content: accumulatedContent } 
                              : msg
                          )
                        );
                      }
                    } else if (parsed.chunk) {
                      // Для обратной совместимости со старым форматом
                      accumulatedContent = parsed.chunk;
                      
                      if (!isCancelled) {
                        setMessages(prev => 
                          prev.map(msg => 
                            msg.id === assistantMessageId 
                              ? { ...msg, content: accumulatedContent } 
                              : msg
                          )
                        );
                      }
                    }
                  } catch (e) {
                    console.error('Error parsing stream data:', e);
                  }
                }
              }
            } catch (readError) {
              // Проверяем, была ли ошибка вызвана отменой операции
              if (readError instanceof DOMException && readError.name === 'AbortError') {
                console.log('Stream reading was aborted');
                isCancelled = true;
                break;
              }
              console.error('Error reading stream:', readError);
              break;
            }
          }
          
          // Если это первый ответ ассистента в чате и операция не была отменена, обновляем название чата
          if (isFirstAssistantResponse && accumulatedContent && !isCancelled) {
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
      } else {
        // ... existing code for non-stream response ...
      }

      // После завершения стриминга, обновляем список чатов для отображения последнего сообщения
      fetchChats();
    } catch (error) {
      console.error('Error sending message:', error);
      // Если запрос был отменен, выводим сообщение
      if (error instanceof DOMException && error.name === 'AbortError') {
        console.log('Request was cancelled');
        // Обновляем последнее сообщение, чтобы показать, что генерация была отменена
        setMessages(prev => 
          prev.map(msg => 
            msg.role === 'assistant' && msg.content === '' 
              ? { ...msg, content: '_Генерация ответа была отменена._' } 
              : msg
          )
        );
      }
      // Если чат не найден, перенаправляем на главную страницу
      else if (error instanceof Error && error.message.includes('404')) {
        router.push('/');
      }
    } finally {
      setIsProcessing(false);
      abortControllerRef.current = null;
    }
  };

  // Функция для отмены генерации
  const handleCancelGeneration = () => {
    if (abortControllerRef.current) {
      console.log('Cancelling message generation...');
      // Обновляем UI перед отменой, чтобы избежать гонки состояний
      setMessages(prev => 
        prev.map(msg => 
          msg.role === 'assistant' && msg.content === '' 
            ? { ...msg, content: '_Генерация ответа была отменена._' } 
            : msg
        )
      );
      
      try {
        abortControllerRef.current.abort();
      } catch (error) {
        console.error('Error aborting request:', error);
      } finally {
        abortControllerRef.current = null;
      }
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
      onCancelGeneration={handleCancelGeneration}
    />
  );
} 