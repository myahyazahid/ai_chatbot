import { getToken } from "next-auth/jwt";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function proxy(req: NextRequest) {
  // Hanya ambil path URL
  const path = req.nextUrl.pathname;

  // Bebaskan route login, api/auth, dan aset statis Next.js
  if (
    path.startsWith("/login") ||
    path.startsWith("/api/auth") ||
    path.startsWith("/_next") ||
    path === "/favicon.ico" ||
    path === "/favicon.png"
  ) {
    return NextResponse.next();
  }

  // Gunakan 'secret' yang sama dengan di authOptions
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET || "super-secret-key-that-is-at-least-32-characters-long-12345" });

  if (!token) {
    // Kalau belum login, lempar ke /login
    const url = new URL("/login", req.url);
    url.searchParams.set("callbackUrl", encodeURI(req.url));
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api/auth|_next/static|_next/image|favicon.ico).*)"],
};
