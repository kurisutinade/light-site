import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';

const prisma = new PrismaClient();

// Функция для создания хэша пароля
function hashPassword(password: string): string {
  return crypto
    .createHash('sha256')
    .update(password)
    .digest('hex');
}

export async function POST(request: NextRequest) {
  try {
    // Проверяем, существует ли уже администратор
    const existingAdmin = await prisma.user.findFirst({
      where: {
        isAdmin: true
      }
    });

    if (existingAdmin) {
      return NextResponse.json(
        { error: 'Администратор уже существует' },
        { status: 400 }
      );
    }

    // Получаем данные из запроса
    const { username, password } = await request.json();

    // Проверяем данные
    if (!username || !password) {
      return NextResponse.json(
        { error: 'Имя пользователя и пароль обязательны' },
        { status: 400 }
      );
    }

    // Проверяем, не занято ли имя пользователя
    const existingUser = await prisma.user.findUnique({
      where: {
        username
      }
    });

    if (existingUser) {
      return NextResponse.json(
        { error: 'Имя пользователя уже занято' },
        { status: 400 }
      );
    }

    // Хешируем пароль
    const passwordHash = hashPassword(password);

    // Создаем пользователя
    const newAdmin = await prisma.user.create({
      data: {
        username,
        passwordHash,
        isAdmin: true
      }
    });

    return NextResponse.json({
      success: true,
      message: 'Администратор успешно создан',
      userId: newAdmin.id
    });
  } catch (error) {
    console.error('Error setting up admin account:', error);
    return NextResponse.json(
      { error: 'Ошибка при создании учетной записи администратора' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
} 