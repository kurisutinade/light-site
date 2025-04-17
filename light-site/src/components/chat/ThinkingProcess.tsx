'use client';

import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import rehypeHighlight from 'rehype-highlight';

interface ThinkingProcessProps {
  content: string;
  isComplete?: boolean;
}

export function ThinkingProcess({ content, isComplete = false }: ThinkingProcessProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  
  const toggleExpand = () => {
    setIsExpanded(!isExpanded);
  };
  
  if (!content) return null;
  
  return (
    <div className="mb-4 border-l-4 border-purple-500 pl-3 group">
      <div className="flex items-center mb-2">
        <div className="flex items-center gap-2">
          <span className="text-purple-400 font-medium">
            {isComplete ? 'Размышления завершены' : 'Размышления в процессе'}
          </span>
          {!isComplete && (
            <div className="flex items-center">
              <div className="animate-pulse h-1.5 w-1.5 bg-purple-400 rounded-full"></div>
              <div className="animate-pulse h-1.5 w-1.5 bg-purple-400 rounded-full mx-1" style={{ animationDelay: '0.2s' }}></div>
              <div className="animate-pulse h-1.5 w-1.5 bg-purple-400 rounded-full" style={{ animationDelay: '0.4s' }}></div>
            </div>
          )}
          <button
            onClick={toggleExpand}
            className="text-gray-400 hover:text-white text-sm px-2 py-0.5 rounded transition-colors"
            title={isExpanded ? 'Свернуть размышления' : 'Развернуть размышления'}
          >
            {isExpanded ? 'Свернуть' : 'Развернуть'}
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className={`h-4 w-4 inline-block ml-1 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="6 9 12 15 18 9"></polyline>
            </svg>
          </button>
        </div>
      </div>
      
      {isExpanded && (
        <div className="mt-2 p-3 bg-[#1f1f1f] rounded-md text-gray-300 text-sm overflow-auto max-h-[500px]">
          <div className="markdown-content">
            <ReactMarkdown
              rehypePlugins={[rehypeHighlight]}
            >
              {content}
            </ReactMarkdown>
          </div>
        </div>
      )}
    </div>
  );
} 