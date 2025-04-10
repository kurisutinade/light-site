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
    const { content, modelId, withWebSearch } = await request.json();
    
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
            
            // Обработчик для каждого фрагмента ответа
            let fallbackResponse = '';
            await apiClient.streamChat(apiMessages, (chunk) => {
              fallbackResponse += chunk;
              writer.write(encoder.encode(`data: ${JSON.stringify({ chunk: fallbackResponse, status: "content" })}\n\n`));
            });
            
            responseText = fallbackResponse;
          }
        } else {
          // Стандартный режим: отправляем запрос в модель с историей сообщений
          // Подготавливаем историю сообщений для отправки в API
          const allMessages = await chatService.messages.getAll(chatId);
          const apiMessages = allMessages.map((msg: DbMessage) => ({
            role: msg.role as 'user' | 'assistant',
            content: msg.content
          }));
          
          // Обработчик для каждого фрагмента ответа
          await apiClient.streamChat(apiMessages, (chunk) => {
            responseText += chunk;
            writer.write(encoder.encode(`data: ${JSON.stringify({ chunk: responseText, status: "content" })}\n\n`));
          });
        }

        // Сохраняем полный ответ в базу данных
        if (responseText) {
          await chatService.messages.create(
            chatId,
            responseText,
            'assistant'
          );
        }

        // Завершаем поток
        writer.write(encoder.encode('data: [DONE]\n\n'));
        writer.close();
      } catch (error) {
        console.error('Error in stream processing:', error);
        writer.write(encoder.encode(`data: ${JSON.stringify({ error: 'Ошибка обработки ответа', status: "error" })}\n\n`));
        writer.close();
      }
    })();

    // Возвращаем поток клиенту
    return new NextResponse(stream.readable, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (error) {
    console.error('Error sending message:', error);
    return NextResponse.json(
      { error: 'Не удалось отправить сообщение' },
      { status: 500 }
    );
  }
} 