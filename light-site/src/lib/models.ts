export interface AIModel {
  id: string;
  name: string;
  provider: string;
  description: string;
}

export const AI_MODELS: AIModel[] = [
  {
    id: 'deepseek/deepseek-chat-v3-0324:free',
    name: 'DeepSeek v3',
    provider: 'DeepSeek',
    description: 'Модель от компании DeepSeek, имеет 671B параметров, универсальная модель которая подойдет для большинства задач.',
  },
  {
    id: 'meta-llama/llama-4-maverick:free',
    name: 'Llama 4 Maverick',
    provider: 'Meta',
    description: 'Модель от компании Meta, имеет 400B параметров из которых 17B активных.',
  },
  {
    id: 'openai/gpt-4o-mini',
    name: 'GPT-4o Mini',
    provider: 'OpenAI',
    description: 'Модель от компании OpenAI, имеет 125M параметров из которых 17B активных.',
  }
];

// Модель по умолчанию
export const DEFAULT_MODEL_ID = 'deepseek/deepseek-chat-v3-0324:free';

// Получение модели по ID
export function getModelById(id: string): AIModel | undefined {
  return AI_MODELS.find(model => model.id === id);
} 