import { DEFAULT_MODEL_ID } from './models';

export interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export interface StreamingResponse {
  done: boolean;
  chunk?: string;
}

export class ApiClient {
  private readonly baseUrl = 'https://openrouter.ai/api/v1';
  private readonly apiKey: string;
  private readonly modelId: string;

  constructor(apiKey: string, modelId?: string) {
    this.apiKey = apiKey;
    
    // Если явно не указана модель, пробуем загрузить из localStorage, иначе используем модель по умолчанию
    if (modelId) {
      this.modelId = modelId;
      console.log(`ApiClient initialized with specified model: ${modelId}`);
    } else if (typeof window !== 'undefined') {
      this.modelId = localStorage.getItem('selectedModelId') || DEFAULT_MODEL_ID;
      console.log(`ApiClient initialized with model from localStorage: ${this.modelId}`);
    } else {
      this.modelId = DEFAULT_MODEL_ID;
      console.log(`ApiClient initialized with default model: ${DEFAULT_MODEL_ID}`);
    }
  }

  // Метод для получения API-ключа
  getApiKey(): string {
    return this.apiKey;
  }
  
  // Метод для получения ID модели
  getModelId(): string {
    return this.modelId;
  }

  async streamChat(
    messages: Message[],
    onChunk: (chunk: string) => void
  ): Promise<void> {
    console.log(`Making API request with model: ${this.modelId}`);
    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
        'HTTP-Referer': 'https://light-site.com',
        'X-Title': 'Light Site Chat'
      },
      body: JSON.stringify({
        model: this.modelId,
        messages,
        stream: true,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`API error: ${response.status} - ${error}`);
    }

    if (!response.body) {
      throw new Error('Response body is null');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    
    let buffer = '';
    
    while (true) {
      const { value, done } = await reader.read();
      
      if (done) {
        break;
      }
      
      buffer += decoder.decode(value, { stream: true });
      
      let lines = buffer.split('\n');
      buffer = lines.pop() || '';
      
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6);
          
          if (data === '[DONE]') {
            return;
          }
          
          try {
            const parsed = JSON.parse(data);
            const content = parsed.choices?.[0]?.delta?.content || '';
            
            if (content) {
              onChunk(content);
            }
          } catch (e) {
            console.error('Failed to parse JSON from stream:', e);
          }
        }
      }
    }
  }
} 