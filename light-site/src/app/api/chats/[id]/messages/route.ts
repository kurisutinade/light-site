import { NextRequest, NextResponse } from 'next/server';
import { chatService } from '@/lib/db';
import { ApiClient, Message as ApiMessage } from '@/lib/api-client';

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
  const chat = await chatService.getChatById(chatId);
  if (!chat) {
    return NextResponse.json(
      { error: 'Чат не найден' },
      { status: 404 }
    );
  }

  try {
    const { content } = await request.json();
    
    if (!content) {
      return NextResponse.json(
        { error: 'Содержимое сообщения обязательно' },
        { status: 400 }
      );
    }

    // Сохраняем сообщение пользователя
    const userMessage = await chatService.messages.create(
      chatId,
      content,
      'user'
    );

    // Подготавливаем историю сообщений для отправки в API
    const allMessages = await chatService.messages.getAll(chatId);
    const apiMessages = allMessages.map((msg: DbMessage) => ({
      role: msg.role as 'user' | 'assistant',
      content: msg.content
    }));

    // Создаем экземпляр API клиента
    const apiClient = new ApiClient(apiKey);

    // Отправляем ответ в виде потока
    const encoder = new TextEncoder();
    const stream = new TransformStream();
    const writer = stream.writable.getWriter();

    // Запускаем обработку ответа от API в фоновом режиме
    (async () => {
      try {
        let responseText = '';
        
        // Обработчик для каждого фрагмента ответа
        await apiClient.streamChat(apiMessages, (chunk) => {
          responseText += chunk;
          writer.write(encoder.encode(`data: ${JSON.stringify({ chunk })}\n\n`));
        });

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
        writer.write(encoder.encode(`data: ${JSON.stringify({ error: 'Ошибка обработки ответа' })}\n\n`));
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