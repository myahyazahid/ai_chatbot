import { withAuth } from "next-auth/middleware";

export default withAuth({
  pages: {
    signIn: "/login",
  },
});

// Lindungi semua route kecuali login, api auth, dan public folder
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - login (login page)
     * - api/auth (auth api routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico, favicon.png (favicon files)
     */
    "/((?!login|api/auth|_next/static|_next/image|favicon.ico|favicon.png).*)",
  ],
};
