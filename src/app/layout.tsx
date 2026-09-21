import type { Metadata } from "next";
import NextAuthProvider from "@/components/NextAuthProvider";
import "./globals.css";

export const metadata: Metadata = {
  title: "Claude",
  description: "AI Assistant",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full">
      <body className="h-full overflow-hidden">
        <NextAuthProvider>{children}</NextAuthProvider>
      </body>
    </html>
  );
}
