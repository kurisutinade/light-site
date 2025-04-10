import { ApiClient } from './api-client';
import * as cheerio from 'cheerio';

export interface SearchResult {
  link: string;
  title: string;
  snippet: string;
  content?: string;
}

export class WebSearchService {
  private readonly apiKey: string;
  private readonly searchEngineId: string;
  private readonly apiClient: ApiClient;

  constructor(apiKey: string, searchEngineId: string, apiClient: ApiClient) {
    this.apiKey = apiKey;
    this.searchEngineId = searchEngineId;
    this.apiClient = apiClient;
  }

  async search(query: string, numResults: number = 5, concurrentRequests: number = 5): Promise<SearchResult[]> {
    const startTime = Date.now();
    console.log(`Starting web search for query: ${query}`);
    
    const url = new URL('https://www.googleapis.com/customsearch/v1');
    url.searchParams.append('key', this.apiKey);
    url.searchParams.append('cx', this.searchEngineId);
    url.searchParams.append('q', query);
    url.searchParams.append('num', numResults.toString());

    try {
      const response = await fetch(url.toString());
      if (!response.ok) {
        throw new Error(`Google Search API request failed: ${response.status}`);
      }

      const data = await response.json();
      if (!data.items || !Array.isArray(data.items)) {
        return [];
      }
      
      const results = data.items.map((item: any) => ({
        link: item.link,
        title: item.title,
        snippet: item.snippet,
      }));

      // Создаем функцию для обработки одного результата
      const processResult = async (result: SearchResult): Promise<SearchResult> => {
        try {
          // Пропускаем PDF и другие нетекстовые форматы
          if (result.link.endsWith('.pdf') || result.link.endsWith('.doc') || result.link.endsWith('.docx')) {
            return result;
          }

          // Пропускаем сайты, которые могут блокировать запросы
          if (result.link.includes('medium.com') || 
              result.link.includes('linkedin.com') || 
              result.link.includes('facebook.com') ||
              result.link.includes('twitter.com') ||
              result.link.includes('instagram.com') ||
              result.link.includes('perplexity.ai')) {
            console.log(`Skipping blocked site: ${result.link}`);
            return result;
          }

          // Используем AbortController для таймаута
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 секунд таймаут
          
          try {
            const pageResponse = await fetch(result.link, {
              signal: controller.signal,
              headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.5',
                'Connection': 'keep-alive',
                'Upgrade-Insecure-Requests': '1',
                'Cache-Control': 'no-cache'
              },
              redirect: 'manual' // Не следовать за редиректами автоматически
            });
            
            clearTimeout(timeoutId);
            
            // Обрабатываем редиректы
            if (pageResponse.status >= 300 && pageResponse.status < 400) {
              const location = pageResponse.headers.get('location');
              if (location) {
                console.log(`Following redirect from ${result.link} to ${location}`);
                try {
                  const redirectResponse = await fetch(location, {
                    signal: controller.signal,
                    headers: {
                      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                      'Accept-Language': 'en-US,en;q=0.5',
                      'Connection': 'keep-alive',
                      'Upgrade-Insecure-Requests': '1',
                      'Cache-Control': 'no-cache'
                    }
                  });
                  
                  if (redirectResponse.ok) {
                    const contentType = redirectResponse.headers.get('content-type');
                    if (!contentType || !contentType.includes('text/html')) {
                      console.warn(`Skipping non-HTML content from redirect ${location}: ${contentType}`);
                      return result;
                    }
                    
                    const html = await redirectResponse.text();
                    if (!html || html.length === 0) {
                      console.warn(`Empty response from redirect ${location}, skipping...`);
                      return result;
                    }
                    
                    const $ = cheerio.load(html);
                    $('script, style, nav, footer, header, iframe, noscript, aside, form, .ads, .banner, .comments, .social-share, .related-posts').remove();
                    
                    let content = '';
                    const mainElement = $('main, article, .content, .post, .entry, #content, .article, .post-content, .entry-content');
                    if (mainElement.length > 0) {
                      content = mainElement.first().text();
                    } else {
                      content = $('body').text();
                    }
                    
                    content = content
                      .replace(/\s+/g, ' ')
                      .trim()
                      .substring(0, 2000);
                    
                    if (content.length > 0) {
                      result.content = content;
                    }
                    
                    return result;
                  }
                } catch (redirectError) {
                  console.error(`Error following redirect to ${location}:`, redirectError);
                  return result;
                }
              }
            }
            
            if (!pageResponse.ok) {
              if (pageResponse.status === 403) {
                console.warn(`Access forbidden for ${result.link}, skipping...`);
                return result;
              }
              console.warn(`Failed to fetch ${result.link}: ${pageResponse.status} ${pageResponse.statusText}`);
              return result;
            }

            const contentType = pageResponse.headers.get('content-type');
            if (!contentType || !contentType.includes('text/html')) {
              console.warn(`Skipping non-HTML content from ${result.link}: ${contentType}`);
              return result;
            }

            const html = await pageResponse.text();
            if (!html || html.length === 0) {
              console.warn(`Empty response from ${result.link}, skipping...`);
              return result;
            }

            const $ = cheerio.load(html);

            // Удаляем ненужные элементы
            $('script, style, nav, footer, header, iframe, noscript, aside, form, .ads, .banner, .comments, .social-share, .related-posts').remove();

            // Извлекаем основной контент, сначала пробуем найти основной контент страницы
            let content = '';
            const mainElement = $('main, article, .content, .post, .entry, #content, .article, .post-content, .entry-content');
            if (mainElement.length > 0) {
              content = mainElement.first().text();
            } else {
              content = $('body').text();
            }

            // Чистим текст
            content = content
              .replace(/\s+/g, ' ')
              .trim()
              .substring(0, 2000); // Ограничиваем размер контента

            if (content.length > 0) {
              result.content = content;
            }
          } catch (fetchError) {
            console.error(`Error fetching ${result.link}:`, fetchError);
          }
        } catch (error) {
          console.error(`Error processing ${result.link}:`, error);
        }
        return result;
      };

      // Функция для параллельной обработки результатов с ограничением
      const processResultsInParallel = async (items: SearchResult[], concurrency: number = 5) => {
        let active = 0;
        let index = 0;
        const results: SearchResult[] = new Array(items.length);
        
        return new Promise<SearchResult[]>((resolve) => {
          const startNext = () => {
            // Если достигли конца массива, не запускаем новые задачи
            if (index >= items.length) return;
            
            const currentIndex = index++;
            active++;
            
            // Обрабатываем элемент
            processResult(items[currentIndex])
              .then(result => {
                // Сохраняем результат в том же порядке
                results[currentIndex] = result;
                active--;
                
                // Запускаем следующую задачу
                startNext();
                
                // Если больше нет активных задач и достигли конца массива, завершаем
                if (active === 0 && index >= items.length) {
                  resolve(results.filter(Boolean)); // Фильтруем на случай пустых значений
                }
              })
              .catch(() => {
                active--;
                startNext();
                
                if (active === 0 && index >= items.length) {
                  resolve(results.filter(Boolean));
                }
              });
          };
          
          // Запускаем первые concurrency задач
          for (let i = 0; i < Math.min(concurrency, items.length); i++) {
            startNext();
          }
        });
      };
      
      // Обрабатываем результаты параллельно с заданным ограничением запросов
      console.log(`Starting parallel processing of ${results.length} search results with concurrency ${concurrentRequests}`);
      const processingStartTime = Date.now();
      let processedResults = await processResultsInParallel(results, concurrentRequests);
      console.log(`Parallel processing completed in ${(Date.now() - processingStartTime)/1000} seconds`);
      
      // Сортируем результаты, ставя вперёд те, у которых есть контент
      processedResults.sort((a, b) => {
        // Результаты с контентом получают более высокий приоритет
        if (a.content && !b.content) return -1;
        if (!a.content && b.content) return 1;
        return 0;
      });
      
      // Фильтруем дублирующиеся результаты на основе содержимого
      const uniqueResults = processedResults.filter((result, index, self) => {
        // Если у результата нет контента, оставляем его
        if (!result.content) return true;
        
        // Проверяем, есть ли уже результат с очень похожим контентом
        const isDuplicate = self.findIndex((r, i) => {
          if (i < index && r.content && result.content) {
            // Создаем "отпечаток" контента, удаляя пробелы и приводя к нижнему регистру
            const contentA = r.content.toLowerCase().replace(/\s+/g, '');
            const contentB = result.content.toLowerCase().replace(/\s+/g, '');
            
            // Если контент похож более чем на 80%, считаем дубликатом
            return contentA.length > 50 && 
                   contentB.length > 50 && 
                   (contentA.includes(contentB.substring(0, Math.floor(contentB.length * 0.8))) || 
                    contentB.includes(contentA.substring(0, Math.floor(contentA.length * 0.8))));
          }
          return false;
        }) !== -1;
        
        return !isDuplicate;
      });
      
      console.log(`Removed ${processedResults.length - uniqueResults.length} duplicate results`);
      
      const contentfulResults = uniqueResults.filter(r => r.content).length;
      console.log(`Web search completed in ${(Date.now() - startTime)/1000} seconds. Found ${contentfulResults} pages with content out of ${uniqueResults.length} total`);
      return uniqueResults;

    } catch (error) {
      console.error('Error performing search:', error);
      return [];
    }
  }

  async summarizeWithSources(query: string, results: SearchResult[], modelId?: string): Promise<string> {
    try {
      // Используем только результаты с контентом или сниппетом
      const validResults = results.filter(result => result.content || result.snippet);
      
      console.log(`Summarizing ${validResults.length} search results for query: "${query}"`);
      
      // Ограничиваем количество источников для модели, чтобы не перегружать контекст
      const maxResults = 7;
      const topResults = validResults.slice(0, maxResults);
      
      const prompt = `
        Запрос пользователя: ${query}
        
        Проанализируй следующую информацию и предоставь развернутый, информативный ответ:
        ${topResults.map((result, index) => `
          [${index + 1}] ${result.title}
          URL: ${result.link}
          ${result.content ? `Контент: ${result.content}` : `Сниппет: ${result.snippet}`}
        `).join('\n\n')}
        
        Требования к ответу:
        1. Предоставь структурированный ответ, основанный только на информации из указанных источников.
        2. Если информации недостаточно, укажи это.
        3. Если источники противоречат друг другу, отметь это и объясни разные точки зрения.
        4. В конце ответа перечисли использованные источники в формате:
        
        Источники:
        [1] Название источника (URL)
        [2] Название источника (URL)
        и т.д.
        
        Используй только те источники, информация из которых реально помогла при составлении ответа.
      `;

      console.log(`Sending prompt to API with ${prompt.length} characters`);
      const startTime = Date.now();
      
      // Если передан modelId, используем его для создания экземпляра ApiClient
      const apiClient = modelId 
        ? new ApiClient(this.apiClient.getApiKey(), modelId) 
        : this.apiClient;
      
      let fullResponse = '';
      await apiClient.streamChat(
        [{ role: 'user', content: prompt }],
        (chunk) => {
          fullResponse += chunk;
        }
      );
      
      console.log(`Summarization completed in ${(Date.now() - startTime)/1000} seconds`);
      return fullResponse;
    } catch (error: any) {
      console.error('Error summarizing search results:', error);
      return `Произошла ошибка при обработке результатов поиска: ${error?.message || 'Неизвестная ошибка'}`;
    }
  }
} 