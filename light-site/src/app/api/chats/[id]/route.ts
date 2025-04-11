import { NextRequest, NextResponse } from 'next/server';
import { chatService } from '@/lib/db';

interface RouteParams {
  params: {
    id: string;
  };
}

// GET /api/chats/[id] - получить конкретный чат
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const chat = await chatService.getChatById(id);
    
    if (!chat) {
      return NextResponse.json(
        { error: 'Чат не найден' },
        { status: 404 }
      );
    }
    
    return NextResponse.json(chat);
  } catch (error) {
    console.error('Error getting chat:', error);
    return NextResponse.json(
      { error: 'Не удалось получить чат' },
      { status: 500 }
    );
  }
}

// DELETE /api/chats/[id] - удалить чат
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    await chatService.deleteChat(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting chat:', error);
    return NextResponse.json(
      { error: 'Не удалось удалить чат' },
      { status: 500 }
    );
  }
}

// PATCH /api/chats/[id] - обновить название чата
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const { name, modelId } = await request.json();
    
    if (!name && !modelId) {
      return NextResponse.json(
        { error: 'Необходимо указать имя чата или ID модели' },
        { status: 400 }
      );
    }
    
    const updateData: { name?: string, modelId?: string } = {};
    
    if (name) {
      updateData.name = name;
    }
    
    if (modelId) {
      updateData.modelId = modelId;
    }
    
    const chat = await chatService.updateChat(id, updateData);
    
    return NextResponse.json(chat);
  } catch (error) {
    console.error('Error updating chat:', error);
    return NextResponse.json(
      { error: 'Не удалось обновить чат' },
      { status: 500 }
    );
  }
} 