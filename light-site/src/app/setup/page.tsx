'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function SetupPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isChecking, setIsChecking] = useState(true);
  const router = useRouter();

  // Проверяем, есть ли уже пользователь-администратор
  useEffect(() => {
    const checkAdmin = async () => {
      try {
        const response = await fetch('/api/auth/check-admin');
        const data = await response.json();
        
        if (data.hasAdmin) {
          // Если администратор уже существует, перенаправляем на страницу входа
          router.push('/login');
        } else {
          // Если администратора нет, показываем форму настройки
          setIsChecking(false);
        }
      } catch (error) {
        console.error('Error checking admin status:', error);
        setError('Не удалось проверить статус администратора');
        setIsChecking(false);
      }
    };

    checkAdmin();
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Проверка валидности данных
    if (!username.trim()) {
      setError('Введите имя пользователя');
      return;
    }
    
    if (!password) {
      setError('Введите пароль');
      return;
    }
    
    if (password.length < 6) {
      setError('Пароль должен содержать не менее 6 символов');
      return;
    }
    
    if (password !== confirmPassword) {
      setError('Пароли не совпадают');
      return;
    }
    
    setError('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/auth/setup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Ошибка при создании администратора');
        return;
      }

      // Если настройка успешна, перенаправляем на страницу входа
      router.push('/login');
    } catch (err: any) {
      setError('Произошла ошибка при настройке учетной записи администратора');
      console.error('Setup error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  if (isChecking) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[#0c0c0c]">
        <div className="w-full max-w-md p-8 space-y-8 bg-[#1a1a1a] rounded-lg shadow-2xl border border-[#333333] text-center">
          <div className="animate-pulse">
            <div className="h-8 bg-[#333333] rounded w-3/4 mx-auto mb-4"></div>
            <div className="h-4 bg-[#333333] rounded w-1/2 mx-auto"></div>
          </div>
          <p className="text-[#999999]">Проверка статуса системы...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#0c0c0c]">
      <div className="w-full max-w-md p-8 space-y-8 bg-[#1a1a1a] rounded-lg shadow-2xl border border-[#333333]">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-[#e0e0e0]">Настройка администратора</h1>
          <p className="mt-2 text-[#999999]">
            Это первый запуск системы. Создайте учетную запись администратора.
          </p>
        </div>
        
        {error && (
          <div className="bg-[#3d0000] border border-[#ff6b6b] text-[#ff9999] px-4 py-3 rounded relative" role="alert">
            <span className="block sm:inline">{error}</span>
          </div>
        )}
        
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div>
            <label htmlFor="username" className="block text-sm font-medium text-[#cccccc]">
              Имя пользователя
            </label>
            <div className="mt-1">
              <input
                id="username"
                name="username"
                type="text"
                autoComplete="username"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="appearance-none block w-full px-3 py-2 border border-[#444444] rounded-md shadow-sm bg-[#222222] text-[#e0e0e0] focus:outline-none focus:ring-2 focus:ring-[#4f6bff] focus:border-[#4f6bff]"
                placeholder="Введите имя пользователя"
              />
            </div>
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-[#cccccc]">
              Пароль
            </label>
            <div className="mt-1">
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="new-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="appearance-none block w-full px-3 py-2 border border-[#444444] rounded-md shadow-sm bg-[#222222] text-[#e0e0e0] focus:outline-none focus:ring-2 focus:ring-[#4f6bff] focus:border-[#4f6bff]"
                placeholder="Введите пароль"
              />
            </div>
          </div>

          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-[#cccccc]">
              Подтверждение пароля
            </label>
            <div className="mt-1">
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                autoComplete="new-password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="appearance-none block w-full px-3 py-2 border border-[#444444] rounded-md shadow-sm bg-[#222222] text-[#e0e0e0] focus:outline-none focus:ring-2 focus:ring-[#4f6bff] focus:border-[#4f6bff]"
                placeholder="Подтвердите пароль"
              />
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-[#3b5bdb] hover:bg-[#2b4bc1] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#5f73ff] disabled:opacity-50 disabled:bg-[#283a8a]"
            >
              {isLoading ? 'Создание...' : 'Создать аккаунт администратора'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
} 