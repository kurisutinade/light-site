# DeepSeek Chat

Веб-приложение для общения с нейросетью DeepSeek V3 через API платформы OpenRouter.ai.

## Технологии

- Next.js 14+ с App Router
- React Server Components
- Tailwind CSS
- PostgreSQL с Prisma ORM
- OpenRouter API (модель deepseek-chat)

## Особенности

- Чат-интерфейс в минималистичном стиле
- Анимация стриминга ответа (символы появляются по одному)
- Создание, переключение и удаление чатов
- Сохранение истории чатов в базе данных
- Возможность копирования текста сообщений

## Установка и запуск

### Предварительные требования

- Node.js 18+ и npm
- PostgreSQL
- Ключ API OpenRouter.ai

### Настройка переменных окружения

1. Переименуйте файл `.env` в `.env.local`
2. Отредактируйте строку подключения к базе данных в `DATABASE_URL`
3. Добавьте ваш ключ API OpenRouter в `OPENROUTER_API_KEY`

### Установка и запуск

```bash
# Установка зависимостей
npm install

# Инициализация базы данных
npx prisma migrate dev --name init

# Генерация Prisma клиента
npx prisma generate

# Запуск в режиме разработки
npm run dev
```

Приложение будет доступно по адресу [http://localhost:3000](http://localhost:3000).

### Сборка для продакшна

```bash
npm run build
npm start
```

## Структура проекта

- `src/app` - страницы приложения (Next.js App Router)
- `src/components` - React компоненты
- `src/lib` - вспомогательные функции и утилиты
- `prisma` - схема и миграции базы данных

## Лицензия

MIT
