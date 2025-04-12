import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

// Создаем новый экземпляр PrismaClient
const prisma = new PrismaClient();

// Интерфейс для типизации результата запроса
interface QueryResult {
  hasAdmin: boolean;
}

export async function GET() {
  try {
    // Используем прямой SQL-запрос вместо проблемного user.findFirst
    const result = await prisma.$queryRaw<QueryResult[]>`
      SELECT EXISTS (
        SELECT 1 FROM users WHERE "isAdmin" = true LIMIT 1
      ) as "hasAdmin"
    `;
    
    const hasAdmin = result[0]?.hasAdmin || false;

    // Возвращаем статус (есть ли администратор)
    return NextResponse.json({
      hasAdmin
    });
  } catch (error) {
    console.error('Error checking admin status:', error);
    return NextResponse.json(
      { error: 'Не удалось проверить статус администратора' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
} 