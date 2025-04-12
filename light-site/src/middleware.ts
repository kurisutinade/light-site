import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Пути, которые не требуют аутентификации
const publicPaths = [
  '/login',
  '/setup',
  '/api/auth/login',
  '/api/auth/setup',
  '/api/auth/check-admin'
];

export function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;
  
  // Проверяем, является ли путь публичным
  const isPublicPath = publicPaths.some(publicPath => 
    path === publicPath || path.startsWith(`${publicPath}/`)
  );

  // Если путь публичный, разрешаем доступ
  if (isPublicPath) {
    return NextResponse.next();
  }

  // Получаем токен из куки
  const authToken = request.cookies.get('auth_token')?.value;
  
  // Проверяем наличие токена
  const isAuthenticated = Boolean(authToken);

  // Если пользователь не аутентифицирован, перенаправляем на страницу входа
  if (!isAuthenticated) {
    const loginUrl = new URL('/login', request.url);
    return NextResponse.redirect(loginUrl);
  }

  // Если пользователь аутентифицирован, разрешаем доступ
  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - images/ (local images)
     */
    '/((?!_next/static|_next/image|favicon.ico|images/).*)',
  ],
} 