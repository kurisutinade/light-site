import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';

const prisma = new PrismaClient();

// Константа для срока действия кук (7 дней)
const AUTH_COOKIE_EXPIRATION = 7 * 24 * 60 * 60 * 1000;

// Функция для создания хэша пароля
function hashPassword(password: string): string {
  return crypto
    .createHash('sha256')
    .update(password)
    .digest('hex');
}

export async function POST(request: NextRequest) {
  console.log('=== AUTH LOGIN API ===');
  console.log('Получен POST-запрос на /api/auth/login');
  
  // Включаем заголовки CORS для локальной разработки
  const origin = request.headers.get('origin') || '';
  
  try {
    // Получаем данные из тела запроса
    let body;
    try {
      body = await request.json();
      console.log('Тело запроса:', JSON.stringify(body));
    } catch (e) {
      console.error('Ошибка парсинга JSON:', e);
      return new NextResponse(JSON.stringify({ error: 'Некорректный формат данных' }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': origin,
          'Access-Control-Allow-Credentials': 'true',
        }
      });
    }
    
    const { username, password } = body;
    
    if (!username || !password) {
      console.log('Ошибка: имя пользователя или пароль не предоставлены');
      return new NextResponse(JSON.stringify({ error: 'Имя пользователя и пароль обязательны' }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': origin,
          'Access-Control-Allow-Credentials': 'true',
        }
      });
    }
    
    // Ищем пользователя в базе данных
    const user = await prisma.user.findUnique({
      where: {
        username: username
      }
    });
    
    // Если пользователь не найден или пароль неверный
    if (!user) {
      console.log('Ошибка: пользователь не найден');
      return new NextResponse(JSON.stringify({ error: 'Неверное имя пользователя или пароль' }), {
        status: 401,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': origin,
          'Access-Control-Allow-Credentials': 'true',
        }
      });
    }
    
    // Проверяем пароль
    const passwordHash = hashPassword(password);
    console.log('Введенный хеш пароля:', passwordHash);
    console.log('Сохраненный хеш пароля:', user.passwordHash);
    
    if (passwordHash !== user.passwordHash) {
      console.log('Ошибка: неверный пароль');
      return new NextResponse(JSON.stringify({ error: 'Неверное имя пользователя или пароль' }), {
        status: 401,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': origin,
          'Access-Control-Allow-Credentials': 'true',
        }
      });
    }
    
    // Если пароль верный, создаем токен сессии
    const sessionToken = crypto.randomBytes(32).toString('hex');
    console.log('Создан токен сессии');
    
    // Создаем ответ с установкой cookie
    const response = new NextResponse(JSON.stringify({ 
      success: true,
      user: {
        id: user.id,
        username: user.username,
        isAdmin: user.isAdmin
      }
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': origin,
        'Access-Control-Allow-Credentials': 'true',
      }
    });
    
    // Устанавливаем cookie
    response.cookies.set('auth_token', sessionToken, { 
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax', // Используем 'lax' вместо 'strict' для лучшей совместимости
      maxAge: AUTH_COOKIE_EXPIRATION,
      path: '/'
    });
    console.log('Установлена cookie auth_token');
    
    // Сохраняем информацию о сессии в базе данных (в будущих версиях)
    // В данный момент просто храним в переменной окружения для примера
    process.env.CURRENT_AUTH_TOKEN = sessionToken;
    process.env.CURRENT_USER_ID = user.id;
    
    console.log('Авторизация успешна, отправка ответа');
    await prisma.$disconnect();
    return response;
  } catch (error) {
    console.error('Ошибка аутентификации:', error);
    return new NextResponse(JSON.stringify({ error: 'Ошибка аутентификации' }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': origin,
        'Access-Control-Allow-Credentials': 'true',
      }
    });
  } finally {
    await prisma.$disconnect();
  }
}

export async function OPTIONS(request: NextRequest) {
  const origin = request.headers.get('origin') || '';
  
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': origin,
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Allow-Credentials': 'true',
      'Access-Control-Max-Age': '86400'
    }
  });
} 