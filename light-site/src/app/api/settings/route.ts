import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

// Функция для обновления .env файла
async function updateEnvFile(key: string, value: string): Promise<boolean> {
  try {
    const envFilePath = path.join(process.cwd(), '.env');
    
    // Читаем содержимое .env файла
    let envContent = await fs.promises.readFile(envFilePath, 'utf-8');
    
    // Проверяем, существует ли ключ в файле
    const regex = new RegExp(`^${key}=.*`, 'm');
    
    if (regex.test(envContent)) {
      // Если ключ существует, обновляем его значение
      envContent = envContent.replace(regex, `${key}=${value}`);
    } else {
      // Если ключа нет, добавляем его в конец файла
      envContent += `\n${key}=${value}`;
    }
    
    // Записываем обновленное содержимое обратно в файл
    await fs.promises.writeFile(envFilePath, envContent, 'utf-8');
    
    // Обновляем переменную окружения в текущем процессе
    process.env[key] = value;
    
    return true;
  } catch (error) {
    console.error('Error updating .env file:', error);
    return false;
  }
}

// POST /api/settings - обновить настройки
export async function POST(request: NextRequest) {
  try {
    const { openrouterApiKey } = await request.json();
    
    if (!openrouterApiKey) {
      return NextResponse.json(
        { error: 'API ключ не предоставлен' },
        { status: 400 }
      );
    }
    
    // Обновляем .env файл
    const success = await updateEnvFile('OPENROUTER_API_KEY', openrouterApiKey);
    
    if (!success) {
      return NextResponse.json(
        { error: 'Не удалось обновить настройки' },
        { status: 500 }
      );
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating settings:', error);
    return NextResponse.json(
      { error: 'Не удалось обновить настройки' },
      { status: 500 }
    );
  }
}

// GET /api/settings - получить текущие настройки (без возврата секретных ключей)
export async function GET() {
  try {
    return NextResponse.json({
      hasApiKey: !!process.env.OPENROUTER_API_KEY,
    });
  } catch (error) {
    console.error('Error getting settings:', error);
    return NextResponse.json(
      { error: 'Не удалось получить настройки' },
      { status: 500 }
    );
  }
} 