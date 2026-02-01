import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
    const maintenanceMode = process.env.MAINTENANCE_MODE === 'true';

    // If maintenance mode is ON and the user is NOT already on the maintenance page
    // and they are not requesting a static asset or internal next files.
    if (
        maintenanceMode &&
        !request.nextUrl.pathname.startsWith('/maintenance') &&
        !request.nextUrl.pathname.startsWith('/_next') &&
        !request.nextUrl.pathname.includes('/api/') && // Keep APIs functional if needed, or disable them too
        !request.nextUrl.pathname.includes('.') // Skip files like favicon.ico, images, etc.
    ) {
        return NextResponse.redirect(new URL('/maintenance', request.url));
    }

    return NextResponse.next();
}

// See "Matching Paths" below to learn more
export const config = {
    matcher: [
        /*
         * Match all request paths except for the ones starting with:
         * - api (API routes)
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         */
        '/((?!api|_next/static|_next/image|favicon.ico).*)',
    ],
};
