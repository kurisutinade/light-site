import { PrismaClient } from '@prisma/client';

// Предотвращение множественных экземпляров PrismaClient в режиме разработки
declare global {
  var prisma: PrismaClient | undefined;
}

const prisma = global.prisma || new PrismaClient();

if (process.env.NODE_ENV !== 'production') {
  global.prisma = prisma;
}

export { prisma };

// Функции для работы с чатами
export const chatService = {
  // Получить все чаты
  getChats: async () => {
    const chats = await prisma.chat.findMany({
      include: {
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
      orderBy: { updatedAt: 'desc' },
    });

    return chats.map((chat: any) => ({
      id: chat.id,
      name: chat.name,
      createdAt: chat.createdAt,
      lastMessage: chat.messages[0]?.content,
    }));
  },

  // Получить чат по ID
  getChatById: async (id: string) => {
    const chat = await prisma.chat.findUnique({
      where: { id },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });

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

    return chat;
  },

  // Обновить чат
  updateChat: async (id: string, data: { name?: string, modelId?: string }) => {
    const chat = await prisma.chat.update({
      where: { id },
      data
    });

    return chat;
  },

  // Удалить чат
  deleteChat: async (id: string) => {
    await prisma.chat.delete({
      where: { id },
    });
  },

  // Функции для работы с сообщениями
  messages: {
    // Создать новое сообщение
    create: async (chatId: string, content: string, role: 'user' | 'assistant') => {
      const message = await prisma.message.create({
        data: {
          content,
          role,
          chatId,
        },
      });

      // Обновляем updatedAt у чата
      await prisma.chat.update({
        where: { id: chatId },
        data: { updatedAt: new Date() },
      });

      return message;
    },

    // Получить сообщения чата
    getAll: async (chatId: string) => {
      const messages = await prisma.message.findMany({
        where: { chatId },
        orderBy: { createdAt: 'asc' },
      });

      return messages;
    },
  },
}; 