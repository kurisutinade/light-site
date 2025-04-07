import { NextRequest, NextResponse } from 'next/server';
import { chatService } from '@/lib/db';

// GET /api/chats - получить все чаты
export async function GET() {
  try {
    const chats = await chatService.getChats();
    return NextResponse.json(chats);
  } catch (error) {
    console.error('Error getting chats:', error);
    return NextResponse.json(
      { error: 'Не удалось получить список чатов' }, 
      { status: 500 }
    );
  }
}

// POST /api/chats - создать новый чат
export async function POST(request: NextRequest) {
  try {
    const { name, modelId } = await request.json();
    
    if (!name) {
      return NextResponse.json(
        { error: 'Имя чата обязательно' },
        { status: 400 }
      );
    }

    const chat = await chatService.createChat(name, modelId);
    return NextResponse.json(chat);
  } catch (error) {
    console.error('Error creating chat:', error);
    return NextResponse.json(
      { error: 'Не удалось создать чат' },
      { status: 500 }
    );
  }
} 