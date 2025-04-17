'use client';

import { useState, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import rehypeHighlight from 'rehype-highlight';
import 'highlight.js/styles/github-dark.css';
import { ThinkingProcess } from './ThinkingProcess';

interface MessageBubbleProps {
  content: string;
  role: 'user' | 'assistant';
  timestamp?: Date;
  thinkingProcess?: string; // Содержимое размышлений для Deep Think режима
  thinkingComplete?: boolean; // Статус завершения размышлений
}

// Пользовательский тип для функции рендеринга кода
interface CodeProps {
  inline?: boolean;
  className?: string;
  children: React.ReactNode;
  [key: string]: any;
}

export function MessageBubble({ content, role, timestamp, thinkingProcess, thinkingComplete = false }: MessageBubbleProps) {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  
  // Используем стабильную карту для связывания блоков кода с их ID
  const codeBlocksRef = useRef<Map<string, string>>(new Map());
  
  // Генерирует или возвращает существующий ID для блока кода
  const getCodeId = (codeContent: string): string => {
    const key = codeContent.trim();
    if (!codeBlocksRef.current.has(key)) {
      codeBlocksRef.current.set(key, `code-${Math.random().toString(36).substr(2, 9)}`);
    }
    return codeBlocksRef.current.get(key)!;
  };

  const copyToClipboard = async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text);
      
      // Устанавливаем ID скопированного блока кода
      setCopiedId(id);
      // Через 2 секунды возвращаем к исходному состоянию
      setTimeout(() => {
        setCopiedId(null);
      }, 2000);
    } catch (error) {
      console.error('Failed to copy text:', error);
    }
  };

  const isUser = role === 'user';
  
  // Для сообщений пользователя используем обычный выравниваемый контейнер
  if (isUser) {
    return (
      <div className="flex justify-end mb-4 group">
        <div className="max-w-[80%] p-3 rounded-lg relative bg-[#303030] text-white text-base">
          <div className="whitespace-pre-wrap break-words">{content}</div>
        </div>
      </div>
    );
  }
  
  // Для сообщений ассистента используем полную ширину
  return (
    <div className="mb-4 group">
      {/* Если есть размышления, отображаем их перед основным содержимым */}
      {thinkingProcess && <ThinkingProcess content={thinkingProcess} isComplete={thinkingComplete} />}
      
      <div className="w-full p-3 text-gray-200 text-base">
        <div className="markdown-content">
          <ReactMarkdown
            rehypePlugins={[rehypeHighlight]}
            components={{
              // Стили для кода - добавляем явное приведение типа для устранения ошибки
              code: function Code(props: any) {
                const { inline, className, children } = props as CodeProps;
                const match = /language-(\w+)/.exec(className || '');
                
                // Правильное извлечение текста кода из объектов React
                const getTextContent = (node: React.ReactNode): string => {
                  if (typeof node === 'string') return node;
                  if (typeof node === 'number') return String(node);
                  if (node === null || node === undefined) return '';
                  
                  if (Array.isArray(node)) {
                    return node.map(getTextContent).join('');
                  }
                  
                  if (typeof node === 'object') {
                    // @ts-ignore - это нормально для React-узлов
                    const props = node.props;
                    if (props && props.children) {
                      return getTextContent(props.children);
                    }
                  }
                  
                  return '';
                };
                
                if (!inline && match) {
                  // Извлечь чистый текстовый контент
                  const codeContent = getTextContent(children);
                  const codeId = getCodeId(codeContent);
                  
                  // Определяем язык для улучшенного отображения
                  const language = match[1].toLowerCase();
                  const languageNames: Record<string, string> = {
                    'js': 'JavaScript',
                    'ts': 'TypeScript',
                    'jsx': 'React JSX',
                    'tsx': 'React TSX',
                    'py': 'Python',
                    'python': 'Python',
                    'java': 'Java',
                    'cs': 'C#',
                    'cpp': 'C++',
                    'c': 'C',
                    'go': 'Go',
                    'rust': 'Rust',
                    'php': 'PHP',
                    'ruby': 'Ruby',
                    'sql': 'SQL',
                    'html': 'HTML',
                    'css': 'CSS',
                    'json': 'JSON',
                    'xml': 'XML',
                    'md': 'Markdown',
                    'bash': 'Bash',
                    'sh': 'Shell',
                    'dockerfile': 'Dockerfile',
                    'yaml': 'YAML',
                    'yml': 'YAML',
                  };
                  
                  const displayLanguage = languageNames[language] || language.toUpperCase();
                  
                  return (
                    <div className="relative group my-4">
                      <div className="flex justify-between items-center bg-gray-700 px-3 py-1 rounded-t text-sm text-gray-300">
                        <span>{displayLanguage}</span>
                        <div className="flex gap-2">
                          <button
                            onClick={() => copyToClipboard(codeContent, codeId)}
                            className={`
                              ${copiedId === codeId ? 'bg-green-600' : 'bg-blue-600 hover:bg-blue-500'} 
                              text-white rounded px-2 py-0.5 text-sm transition-all duration-300
                            `}
                            aria-label="Copy code"
                          >
                            {copiedId === codeId ? (
                              <span className="flex items-center">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" viewBox="0 0 20 20" fill="currentColor">
                                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                </svg>
                                Скопировано
                              </span>
                            ) : (
                              <span className="flex items-center">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" viewBox="0 0 20 20" fill="currentColor">
                                  <path d="M7 9a2 2 0 012-2h6a2 2 0 012 2v6a2 2 0 01-2 2H9a2 2 0 01-2-2V9z" />
                                  <path d="M5 3a2 2 0 00-2 2v6a2 2 0 002 2V5h8a2 2 0 00-2-2H5z" />
                                </svg>
                                Копировать
                              </span>
                            )}
                          </button>
                        </div>
                      </div>
                      <pre className="rounded-t-none rounded-b overflow-x-auto p-3" style={{ backgroundColor: "#0d1117" }}>
                        <code id={codeId} className={`language-${match[1]} text-sm`} style={{ fontFamily: "var(--font-jetbrains-mono), monospace" }} {...props}>
                          {children}
                        </code>
                      </pre>
                    </div>
                  );
                } else {
                  return (
                    <code className="px-1 py-0.5 bg-gray-700 rounded text-base" style={{ fontFamily: "var(--font-jetbrains-mono), monospace" }} {...props}>
                      {children}
                    </code>
                  );
                }
              },
              // Стили для ссылок
              a: props => (
                <a 
                  className="text-blue-400 hover:text-blue-300 underline" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  {...props}
                />
              ),
              // Стили для заголовков
              h1: props => <h1 className="text-2xl font-bold mt-6 mb-3" {...props} />,
              h2: props => <h2 className="text-xl font-bold mt-5 mb-3" {...props} />,
              h3: props => <h3 className="text-lg font-bold mt-4 mb-2" {...props} />,
              
              // Стили для абзацев
              p: props => <p className="my-3 text-base" {...props} />,
              
              // Стили для списков
              ul: props => <ul className="list-disc pl-6 my-3" {...props} />,
              ol: props => <ol className="list-decimal pl-6 my-3" {...props} />,
              
              // Стили для цитат
              blockquote: props => (
                <blockquote className="border-l-4 border-gray-500 pl-3 py-1 my-3 italic" {...props} />
              ),
              
              // Горизонтальная линия
              hr: props => <hr className="my-4 border-gray-600" {...props} />,
              
              // Таблица и её элементы
              table: props => (
                <div className="overflow-x-auto my-4">
                  <table className="border-collapse w-full" {...props} />
                </div>
              ),
              thead: props => <thead className="bg-gray-700" {...props} />,
              tbody: props => <tbody {...props} />,
              tr: props => <tr className="border-b border-gray-700" {...props} />,
              th: props => <th className="py-2 px-3 text-left" {...props} />,
              td: props => <td className="py-2 px-3" {...props} />
            }}
          >
            {content}
          </ReactMarkdown>
        </div>
      </div>
    </div>
  );
} 