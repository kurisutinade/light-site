import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function POST() {
  try {
    // Создаем ответ
    const response = NextResponse.json({ success: true });
    
    // Удаляем куки авторизации
    response.cookies.delete('auth_token');
    
    // Удаляем токен из переменных среды
    delete process.env.CURRENT_AUTH_TOKEN;
    
    return response;
  } catch (error) {
    console.error('Ошибка при выходе из системы:', error);
    return NextResponse.json(
      { error: 'Ошибка при выходе из системы' },
      { status: 500 }
    );
  }
} 