import { NextRequest, NextResponse } from 'next/server';
import { chatService } from '@/lib/db';
import { ApiClient, Message as ApiMessage } from '@/lib/api-client';
import { WebSearchService } from '@/lib/web-search';

interface RouteParams {
  params: {
    id: string;
  };
}

interface DbMessage {
  id: string;
  content: string;
  role: string;
  createdAt: Date;
  chatId: string;
  thinkingProcess?: string;
}

interface DbChat {
  id: string;
  name: string;
  modelId?: string;
  createdAt: Date;
  updatedAt: Date;
  messages: DbMessage[];
}

// Создаем экземпляр для веб-поиска
const webSearchApiClient = new ApiClient(process.env.OPENROUTER_API_KEY!);
const webSearch = new WebSearchService(
  process.env.GOOGLE_SEARCH_API_KEY!,
  process.env.GOOGLE_SEARCH_ENGINE_ID!,
  webSearchApiClient
);

// GET /api/chats/[id]/messages - получить сообщения чата
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const messages = await chatService.messages.getAll(id);
    return NextResponse.json(messages);
  } catch (error) {
    console.error('Error getting messages:', error);
    return NextResponse.json(
      { error: 'Не удалось получить сообщения' },
      { status: 500 }
    );
  }
}

// POST /api/chats/[id]/messages - отправить сообщение
export async function POST(request: NextRequest, { params }: RouteParams) {
  const controller = new AbortController();
  const { signal } = controller;
  
  // Обработка отмены запроса клиентом
  request.signal.addEventListener('abort', () => {
    console.log('Request aborted by client, cancelling ongoing operations...');
    controller.abort();
  });

  const { id: chatId } = await params;
  const apiKey = process.env.OPENROUTER_API_KEY;
  
  if (!apiKey) {
    return NextResponse.json(
      { error: 'API ключ не настроен' },
      { status: 500 }
    );
  }

  // Проверяем, существует ли чат
  const chat = await chatService.getChatById(chatId) as DbChat;
  if (!chat) {
    return NextResponse.json(
      { error: 'Чат не найден' },
      { status: 404 }
    );
  }

  try {
    const requestData = await request.json();
    const { content, modelId } = requestData;
    let { withWebSearch, withDeepThink } = requestData;
    
    if (!content) {
      return NextResponse.json(
        { error: 'Содержимое сообщения обязательно' },
        { status: 400 }
      );
    }

    // Получаем сохраненный в чате ID модели или используем переданный
    const chatModelId = chat.modelId || modelId;
    console.log(`Using model ID: ${chatModelId}`);
    
    // Создаем экземпляр ApiClient с конкретной моделью для этого запроса
    const apiClient = new ApiClient(process.env.OPENROUTER_API_KEY!, chatModelId);

    // Сохраняем сообщение пользователя
    const userMessage = await chatService.messages.create(
      chatId,
      content,
      'user'
    );

    // Отправляем ответ в виде потока
    const encoder = new TextEncoder();
    const stream = new TransformStream();
    const writer = stream.writable.getWriter();

    // Запускаем обработку ответа от API в фоновом режиме
    (async () => {
      try {
        let responseText = '';
        let thinkingProcessText = '';
        
        if (withDeepThink) {
          try {
            console.log('Starting deep thinking process');
            
            // Сигнализируем клиенту о начале процесса размышлений
            writer.write(encoder.encode(`data: ${JSON.stringify({ status: "thinking_started" })}\n\n`));
            
            // Получаем историю сообщений для контекста
            const allMessages = await chatService.messages.getAll(chatId);
            const apiMessages = allMessages.map((msg: DbMessage) => ({
              role: msg.role as 'user' | 'assistant',
              content: msg.content
            }));
            
            // Получаем размышления от модели
            let thinkingProcessText = '';
            await apiClient.streamChat(
              [
                ...apiMessages, 
                { 
                  role: 'user',
                  content: `Ваша задача - показать процесс размышления над вопросом: "${content}".\n\nОбратите внимание, это НЕ финальный ответ, а демонстрация вашего процесса мышления. Разбейте на шаги, выделите ключевые вопросы, рассмотрите возможные подходы и методы решения.\n\nФормат: пошаговый, структурированный процесс размышления.`
                }
              ], 
              (chunk) => {
                thinkingProcessText += chunk;
                // Указываем, что передаются данные размышления, isComplete = false пока не завершено
                writer.write(encoder.encode(`data: ${JSON.stringify({ chunk: thinkingProcessText, status: "thinking_process", isComplete: false })}\n\n`));
              },
              { retries: 1, timeout: 60000 }
            );
            
            // Отмечаем завершение размышлений
            writer.write(encoder.encode(`data: ${JSON.stringify({ chunk: thinkingProcessText, status: "thinking_process", isComplete: true })}\n\n`));
            
            console.log('Finished thinking process, generating final answer');
            
            // Теперь отправляем новый запрос с предыдущими размышлениями для финального ответа
            let responseText = '';
            await apiClient.streamChat(
              [
                ...apiMessages,
                {
                  role: 'assistant',
                  content: `Мои размышления:\n${thinkingProcessText}`
                },
                {
                  role: 'user',
                  content: `Спасибо за размышления. Теперь дай полный, структурированный и детальный ответ на мой исходный вопрос: "${content}" с учетом этих размышлений.`
                }
              ],
              (chunk) => {
                responseText += chunk;
                writer.write(encoder.encode(`data: ${JSON.stringify({ chunk: responseText, status: "content" })}\n\n`));
              }
            );

            // Сохраняем сообщение с размышлениями в базу данных
            try {
              await chatService.messages.create(
                chatId,
                responseText,
                'assistant',
                { thinkingProcess: thinkingProcessText }
              );
              console.log('Successfully saved message with thinking process');
            } catch (saveError) {
              console.error('Error saving message with thinking process:', saveError);
              // Резервный вариант сохранения без размышлений
              try {
                await chatService.messages.create(
                  chatId,
                  responseText,
                  'assistant'
                );
              } catch (fallbackError) {
                console.error('Error saving fallback message:', fallbackError);
              }
            }
          } catch (thinkingError) {
            console.error('Error during deep thinking:', thinkingError);
            writer.write(encoder.encode(`data: ${JSON.stringify({ 
              chunk: "Произошла ошибка при глубоком размышлении. Использую стандартный режим.", 
              status: "error" 
            })}\n\n`));
            
            // Если процесс размышления не удался, переключаемся на стандартный режим
            withDeepThink = false;
          }
        }
        
        if (withWebSearch) {
          // Режим веб-поиска: выполняем поиск и суммаризацию результатов
          writer.write(encoder.encode(`data: ${JSON.stringify({ chunk: "Выполняется поиск по вашему запросу...", status: "search_started" })}\n\n`));
          
          try {
            const searchResults = await webSearch.search(content, 5, 10);
            writer.write(encoder.encode(`data: ${JSON.stringify({ chunk: "Анализирую найденную информацию...", status: "analyzing" })}\n\n`));
            
            responseText = await webSearch.summarizeWithSources(content, searchResults, chatModelId);
            
            // Отправляем ответ частями, чтобы UI обновлялся постепенно
            const chunkSize = 50;
            for (let i = 0; i < responseText.length; i += chunkSize) {
              const chunk = responseText.substring(0, i + chunkSize);
              writer.write(encoder.encode(`data: ${JSON.stringify({ chunk, status: "content" })}\n\n`));
              // Небольшая задержка для более естественного вывода
              await new Promise(resolve => setTimeout(resolve, 10));
            }
          } catch (searchError) {
            console.error('Error during web search:', searchError);
            writer.write(encoder.encode(`data: ${JSON.stringify({ chunk: "Произошла ошибка при выполнении поиска. Использую стандартный режим.", status: "error" })}\n\n`));
            
            // Если поиск не удался, переключаемся на стандартный режим
            // Подготавливаем историю сообщений для отправки в API
            const allMessages = await chatService.messages.getAll(chatId);
            const apiMessages = allMessages.map((msg: DbMessage) => ({
              role: msg.role as 'user' | 'assistant',
              content: msg.content
            }));
            
            // Обработчик для каждого фрагмента ответа с таймаутом и повторными попытками
            let fallbackResponse = '';
            await apiClient.streamChat(
              apiMessages, 
              (chunk) => {
                fallbackResponse += chunk;
                writer.write(encoder.encode(`data: ${JSON.stringify({ chunk: fallbackResponse, status: "content" })}\n\n`));
              },
              { 
                retries: 1, 
                timeout: 30000,
                cacheKey: `chat_${chatId}_fallback`
              }
            );
            
            responseText = fallbackResponse;
          }
        } else if (!withDeepThink) {
          // Стандартный режим: отправляем запрос в модель с историей сообщений
          const allMessages = await chatService.messages.getAll(chatId);
          const apiMessages = allMessages.map((msg: DbMessage) => ({
            role: msg.role as 'user' | 'assistant',
            content: msg.content
          }));
          
          // Обработчик для каждого фрагмента ответа с оптимизированными настройками
          await apiClient.streamChat(
            apiMessages, 
            (chunk) => {
              responseText += chunk;
              writer.write(encoder.encode(`data: ${JSON.stringify({ chunk: responseText, status: "content" })}\n\n`));
            },
            { 
              retries: 1, 
              timeout: 60000,
              cacheKey: `chat_${chatId}_${Date.now()}`
            }
          );

          // Добавляем сохранение сообщения в базу данных для стандартного режима
          if (responseText && !withDeepThink) {
            try {
              await chatService.messages.create(
                chatId,
                responseText,
                'assistant'
              );
            } catch (saveError) {
              console.error('Error saving standard message:', saveError);
            }
          }
        }

        // Завершаем поток
        try {
          if (!controller.signal.aborted) {
            await writer.write(encoder.encode('data: [DONE]\n\n'));
            await writer.close();
          }
        } catch (closeError) {
          console.error('Error closing stream writer:', closeError);
        }
      } catch (error) {
        console.error('Error in stream processing:', error);
        
        try {
          if (!controller.signal.aborted) {
            await writer.write(encoder.encode(`data: ${JSON.stringify({ error: 'Ошибка обработки ответа', status: "error" })}\n\n`));
            await writer.close();
          }
        } catch (closeError) {
          console.error('Error writing error to stream:', closeError);
        }
      }
    })();

    return new Response(stream.readable, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });

  } catch (error) {
    console.error('Error processing message:', error);
    return NextResponse.json(
      { error: 'Ошибка обработки сообщения' },
      { status: 500 }
    );
  }
} 