import { PrismaClient } from '@prisma/client';

// Предотвращение множественных экземпляров PrismaClient в режиме разработки
declare global {
  var prisma: PrismaClient | undefined;
}

// Настройка клиента с пулом соединений для лучшей производительности
const prisma = global.prisma || new PrismaClient({
  log: ['query', 'error', 'warn'],
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
  // Настраиваем пул соединений
  // @ts-ignore
  __internal: {
    engine: {
      connectionLimit: 5, // Оптимальное количество соединений
    },
  },
});

if (process.env.NODE_ENV !== 'production') {
  global.prisma = prisma;
}

export { prisma };

// Кеш для хранения результатов запросов
const cache = {
  chats: new Map<string, any>(),
  chatList: { data: null as any, timestamp: 0 },
  messagesByChat: new Map<string, { data: any, timestamp: number }>(),
  TTL: 30000, // Время жизни кеша в миллисекундах (30 секунд)
  
  // Очистка кеша чатов
  invalidateChatList: () => {
    cache.chatList.data = null;
    cache.chatList.timestamp = 0;
  },
  
  // Очистка кеша сообщений для конкретного чата
  invalidateChatMessages: (chatId: string) => {
    cache.messagesByChat.delete(chatId);
  }
};

// Функции для работы с чатами
export const chatService = {
  // Получить все чаты
  getChats: async () => {
    // Проверяем кеш
    const now = Date.now();
    if (cache.chatList.data && now - cache.chatList.timestamp < cache.TTL) {
      return cache.chatList.data;
    }
    
    const chats = await prisma.chat.findMany({
      select: {
        id: true,
        name: true,
        createdAt: true,
        updatedAt: true,
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: {
            content: true
          }
        },
      },
      orderBy: { updatedAt: 'desc' },
    });

    const formattedChats = chats.map((chat: any) => ({
      id: chat.id,
      name: chat.name,
      createdAt: chat.createdAt,
      lastMessage: chat.messages[0]?.content,
    }));
    
    // Сохраняем в кеше
    cache.chatList.data = formattedChats;
    cache.chatList.timestamp = now;
    
    return formattedChats;
  },

  // Получить чат по ID
  getChatById: async (id: string) => {
    // Проверяем кеш
    if (cache.chats.has(id)) {
      return cache.chats.get(id);
    }
    
    const chat = await prisma.chat.findUnique({
      where: { id },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });
    
    if (chat) {
      // Сохраняем в кеше
      cache.chats.set(id, chat);
      setTimeout(() => cache.chats.delete(id), cache.TTL);
    }

    return chat;
  },

  // Создать новый чат
  createChat: async (name: string, modelId?: string) => {
    const chat = await prisma.chat.create({
      data: { 
        name,
        modelId: modelId
      } as any,
    });
    
    // Инвалидируем кеш списка чатов
    cache.invalidateChatList();

    return chat;
  },

  // Обновить чат
  updateChat: async (id: string, data: { name?: string, modelId?: string }) => {
    const chat = await prisma.chat.update({
      where: { id },
      data
    });
    
    // Инвалидируем кеш
    cache.chats.delete(id);
    cache.invalidateChatList();

    return chat;
  },

  // Удалить чат
  deleteChat: async (id: string) => {
    await prisma.chat.delete({
      where: { id },
    });
    
    // Инвалидируем кеш
    cache.chats.delete(id);
    cache.messagesByChat.delete(id);
    cache.invalidateChatList();
  },

  // Функции для работы с сообщениями
  messages: {
    // Создать новое сообщение
    create: async (chatId: string, content: string, role: 'user' | 'assistant') => {
      // Используем транзакцию для атомарного обновления чата и создания сообщения
      const [message] = await prisma.$transaction([
        prisma.message.create({
          data: {
            content,
            role,
            chatId,
          },
        }),
        prisma.chat.update({
          where: { id: chatId },
          data: { updatedAt: new Date() },
        })
      ]);
      
      // Инвалидируем кеш
      cache.chats.delete(chatId);
      cache.messagesByChat.delete(chatId);
      cache.invalidateChatList();

      return message;
    },

    // Получить сообщения чата
    getAll: async (chatId: string) => {
      // Проверяем кеш
      const cacheEntry = cache.messagesByChat.get(chatId);
      const now = Date.now();
      if (cacheEntry && now - cacheEntry.timestamp < cache.TTL) {
        return cacheEntry.data;
      }
      
      const messages = await prisma.message.findMany({
        where: { chatId },
        orderBy: { createdAt: 'asc' },
      });
      
      // Сохраняем в кеше
      cache.messagesByChat.set(chatId, { data: messages, timestamp: now });
      
      return messages;
    },
  },
}; 