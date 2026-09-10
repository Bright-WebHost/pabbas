import { NextResponse, type NextRequest } from 'next/server'

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  // ── Production guard: block /dev/* routes entirely ──────────────────
  if (
    process.env.NODE_ENV === 'production' &&
    pathname.startsWith('/dev')
  ) {
    return new NextResponse('Not Found', { status: 404 })
  }

  return NextResponse.next({ request })
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for static files and assets
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
