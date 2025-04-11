import { DEFAULT_MODEL_ID } from './models';

export interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export interface StreamingResponse {
  done: boolean;
  chunk?: string;
}

interface RequestOptions {
  timeout?: number;
  retries?: number;
  cacheKey?: string;
  cacheTTL?: number;
  signal?: AbortSignal;
}

// Кеш для хранения результатов запросов по ключу
const responseCache = new Map<string, { data: any; timestamp: number }>();

export class ApiClient {
  private readonly baseUrl = 'https://openrouter.ai/api/v1';
  private readonly apiKey: string;
  private readonly modelId: string;
  private abortControllers: Map<string, AbortController> = new Map();

  // Настройки по умолчанию
  private readonly defaultOptions: RequestOptions = {
    timeout: 60000, // 60 секунд таймаут
    retries: 2,     // 2 повторные попытки
    cacheTTL: 30000 // 30 секунд кеширования
  };

  constructor(apiKey: string, modelId?: string) {
    this.apiKey = apiKey;
    
    // Проверяем, если запущено на клиенте и доступен localStorage
    if (typeof window !== 'undefined') {
      // Проверяем, есть ли сохраненный API ключ в localStorage
      const savedApiKey = localStorage.getItem('openrouterApiKey');
      if (savedApiKey) {
        this.apiKey = savedApiKey;
      }
      
      // Если явно не указана модель, пробуем загрузить из localStorage
      if (modelId) {
        this.modelId = modelId;
        console.log(`ApiClient initialized with specified model: ${modelId}`);
      } else {
        this.modelId = localStorage.getItem('selectedModelId') || DEFAULT_MODEL_ID;
        console.log(`ApiClient initialized with model from localStorage: ${this.modelId}`);
      }
    } else {
      // Серверная сторона
      this.modelId = modelId || DEFAULT_MODEL_ID;
      console.log(`ApiClient initialized with default model: ${this.modelId}`);
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

  // Метод для создания ключа кеша на основе запроса
  private generateCacheKey(model: string, messages: Message[]): string {
    const lastThreeMessages = messages.slice(-3); // Берем только последние 3 сообщения для кеша
    return `${model}:${JSON.stringify(lastThreeMessages)}`;
  }

  // Метод для отмены запроса
  cancelRequest(cacheKey: string): void {
    const controller = this.abortControllers.get(cacheKey);
    if (controller) {
      controller.abort();
      this.abortControllers.delete(cacheKey);
      console.log(`Request with key ${cacheKey} was canceled`);
    }
  }

  // Поддержка сжатия данных для отправки больших запросов
  private async compressMessages(messages: Message[]): Promise<Message[]> {
    // Для длинных диалогов: суммируем историю, оставляя только последние сообщения
    if (messages.length > 10) {
      // Оставляем первые 2 сообщения (контекст) и последние 8 сообщений
      const importantMessages = [
        ...messages.slice(0, 2),
        ...messages.slice(-8)
      ];
      
      // Если в истории были пропущены сообщения, добавляем краткую сводку
      if (messages.length > importantMessages.length) {
        importantMessages.splice(2, 0, {
          role: 'assistant' as 'user' | 'assistant',
          content: `[Предыдущие сообщения пропущены. Всего было ${messages.length} сообщений.]`
        });
      }
      
      return importantMessages;
    }
    
    return messages;
  }

  // Реализация повторных попыток с экспоненциальной задержкой
  private async fetchWithRetry(
    url: string, 
    options: RequestInit, 
    retries: number,
    timeout: number,
    signal?: AbortSignal
  ): Promise<Response> {
    try {
      // Создаем контроллер для таймаута, если не передан сигнал
      const timeoutController = new AbortController();
      const timeoutId = setTimeout(() => timeoutController.abort(), timeout);
      
      // Определяем, какой сигнал использовать
      const fetchSignal = signal || timeoutController.signal;
      
      try {
        const response = await fetch(url, { ...options, signal: fetchSignal });
        clearTimeout(timeoutId);
        
        if (!response.ok && retries > 0) {
          console.warn(`Request failed with status ${response.status}, retrying... (${retries} retries left)`);
          // Экспоненциальная задержка: 1с, 2с, 4с...
          const delay = 1000 * Math.pow(2, this.defaultOptions.retries! - retries);
          await new Promise(resolve => setTimeout(resolve, delay));
          return this.fetchWithRetry(url, options, retries - 1, timeout, signal);
        }
        
        return response;
      } catch (error: any) {
        clearTimeout(timeoutId);
        
        if (error.name === 'AbortError' && signal?.aborted) {
          throw error; // Пробрасываем ошибку, если запрос был отменен внешним контроллером
        } else if (retries > 0) {
          console.warn(`Request failed with error: ${error.message}, retrying... (${retries} retries left)`);
          const delay = 1000 * Math.pow(2, this.defaultOptions.retries! - retries);
          await new Promise(resolve => setTimeout(resolve, delay));
          return this.fetchWithRetry(url, options, retries - 1, timeout, signal);
        } else {
          throw error;
        }
      }
    } catch (error: any) {
      throw error;
    }
  }

  async streamChat(
    messages: Message[],
    onChunk: (chunk: string) => void,
    options: RequestOptions = {}
  ): Promise<void> {
    // Объединяем настройки по умолчанию с переданными опциями
    const finalOptions = { ...this.defaultOptions, ...options };
    
    // Создаем ключ кеша
    const cacheKey = finalOptions.cacheKey || this.generateCacheKey(this.modelId, messages);
    
    // Сжимаем сообщения для более эффективной передачи
    const compressedMessages = await this.compressMessages(messages);
    
    console.log(`Making API request with model: ${this.modelId}`);
    
    // Создаем контроллер для возможности отмены запроса
    const controller = new AbortController();
    this.abortControllers.set(cacheKey, controller);
    
    try {
      const response = await this.fetchWithRetry(
        `${this.baseUrl}/chat/completions`, 
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.apiKey}`,
            'HTTP-Referer': 'https://light-site.com',
            'X-Title': 'Light Site Chat',
            'Accept': 'text/event-stream',
            'Accept-Encoding': 'gzip, deflate, br', // Поддержка сжатия
            'Connection': 'keep-alive'
          },
          body: JSON.stringify({
            model: this.modelId,
            messages: compressedMessages,
            stream: true,
          }),
        },
        finalOptions.retries || this.defaultOptions.retries!,
        finalOptions.timeout || this.defaultOptions.timeout!,
        controller.signal
      );

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
      
      // Для оптимизации используем более эффективную обработку потока
      const processStream = async (): Promise<void> => {
        try {
          while (true) {
            const { value, done } = await reader.read();
            
            if (done) {
              // Обрабатываем оставшиеся данные в буфере
              if (buffer.trim() && !buffer.includes('[DONE]')) {
                processBuffer(buffer);
              }
              break;
            }
            
            buffer += decoder.decode(value, { stream: true });
            
            // Обрабатываем буфер, если содержит полные строки
            if (buffer.includes('\n')) {
              processBuffer(buffer);
              // Оставляем в буфере только часть после последнего перевода строки
              const lastNewLineIndex = buffer.lastIndexOf('\n');
              buffer = buffer.substring(lastNewLineIndex + 1);
            }
          }
        } catch (error) {
          console.error('Error processing stream:', error);
          throw error;
        } finally {
          this.abortControllers.delete(cacheKey);
        }
      };
      
      // Обработка буфера строк
      const processBuffer = (buffer: string): void => {
        const lines = buffer.split('\n');
        
        for (const line of lines) {
          if (!line.trim()) continue;
          
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
      };
      
      await processStream();
    } catch (error: any) {
      // Проверяем, не был ли запрос отменен пользователем
      if (error.name === 'AbortError') {
        console.log('Request was aborted');
      } else {
        console.error('Error in streamChat:', error);
        throw error;
      }
    } finally {
      this.abortControllers.delete(cacheKey);
    }
  }

  // Неблокирующий метод для выполнения запроса с возможностью отмены
  async completionWithTimeout(
    messages: Message[],
    options: RequestOptions = {}
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      let result = '';
      const timeout = options.timeout || this.defaultOptions.timeout;
      const timeoutId = setTimeout(() => {
        this.cancelRequest(options.cacheKey || this.generateCacheKey(this.modelId, messages));
        resolve(result || 'Запрос прерван по таймауту.');
      }, timeout);
      
      this.streamChat(
        messages,
        (chunk) => {
          result += chunk;
        },
        options
      )
      .then(() => {
        clearTimeout(timeoutId);
        resolve(result);
      })
      .catch((error) => {
        clearTimeout(timeoutId);
        reject(error);
      });
    });
  }
} 