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
    const data = await request.json();
    const { 
      openrouterApiKey,
      googleSearchApiKey,
      googleSearchEngineId
    } = data;
    
    const updates = [];
    let hasUpdates = false;
    
    // Обновляем ключ OpenRouter API, если он был предоставлен
    if (openrouterApiKey) {
      const success = await updateEnvFile('OPENROUTER_API_KEY', openrouterApiKey);
      if (success) {
        updates.push('OpenRouter API Key');
        hasUpdates = true;
      }
    }
    
    // Обновляем ключ Google Search API, если он был предоставлен
    if (googleSearchApiKey) {
      const success = await updateEnvFile('GOOGLE_SEARCH_API_KEY', googleSearchApiKey);
      if (success) {
        updates.push('Google Search API Key');
        hasUpdates = true;
      }
    }
    
    // Обновляем ID поисковой системы Google, если он был предоставлен
    if (googleSearchEngineId) {
      const success = await updateEnvFile('GOOGLE_SEARCH_ENGINE_ID', googleSearchEngineId);
      if (success) {
        updates.push('Google Search Engine ID');
        hasUpdates = true;
      }
    }
    
    if (!hasUpdates) {
      return NextResponse.json(
        { error: 'Не предоставлены данные для обновления' },
        { status: 400 }
      );
    }
    
    return NextResponse.json({
      success: true,
      updated: updates
    });
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
      hasOpenRouterApiKey: !!process.env.OPENROUTER_API_KEY,
      hasGoogleSearchApiKey: !!process.env.GOOGLE_SEARCH_API_KEY,
      hasGoogleSearchEngineId: !!process.env.GOOGLE_SEARCH_ENGINE_ID,
    });
  } catch (error) {
    console.error('Error getting settings:', error);
    return NextResponse.json(
      { error: 'Не удалось получить настройки' },
      { status: 500 }
    );
  }
} 