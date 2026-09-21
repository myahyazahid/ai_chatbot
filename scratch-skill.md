---
name: nextjs-chatbot
description: "Use when building a chat UI with Next.js + LLM API."
tags: [nextjs, chatbot, llm, openai, streaming, sse, tailwind]
---

# Next.js Chatbot with OpenAI-Compatible API

Scaffold and build a chat web app (like ChatGPT/Claude) using Next.js App Router, Tailwind CSS, and any OpenAI-compatible LLM backend (9router, OpenRouter, LiteLLM, etc.). Covers streaming SSE, multi-conversation, model selector, and dark theme.

## Pre-flight: gather requirements

Before writing code, ask:
1. **API base URL** — where is the LLM endpoint? (e.g. `https://router.example.com/v1`)
2. **API key** — store in `.env.local` as `API_KEY`, never commit.
3. **Feature scope** — basic chat, multi-conversation, model selector, streaming.
4. **Styling** — Tailwind CSS is the user's default preference.
5. **Model list** — auto-fetch from `/v1/models` or manual list.

## Architecture

```
src/
├── app/
│   ├── api/
│   │   ├── auth/[...nextauth]/route.ts  # NextAuth handler
│   │   ├── chat/route.ts       # POST — streaming proxy to LLM
│   │   ├── conversations/
│   │   │   ├── route.ts        # GET/POST user's conversations
│   │   │   └── [id]/
│   │   │       ├── route.ts    # PATCH/DELETE conversation
│   │   │       └── messages/route.ts  # POST message
│   │   └── models/route.ts     # GET — fetch available models
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx                # Main chat page (client component)
├── components/
│   ├── ChatSidebar.tsx         # Conversation list + new/delete
│   ├── ChatMessage.tsx         # Message rendering + code blocks
│   ├── ChatInput.tsx           # Textarea + send button
│   └── ModelSelector.tsx       # Dropdown with search
└── lib/
    ├── auth.ts                 # NextAuth config + credentials provider
    ├── db.ts                   # Prisma singleton client
    ├── store.ts                # localStorage CRUD for conversations
    └── types.ts                # Message, Conversation, Model types
prisma/
└── schema.prisma               # User, Session, Conversation, Message models
```

## Procedure

### 1. Scaffold Next.js project

```bash
npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir --import-alias "@/*" --use-npm --no-turbopack
```

- On WSL, `npm install` on `/mnt/c/` is extremely slow. Use `background=true` with a long timeout and poll/wait. Write source files while install runs.
- **CRITICAL WSL /mnt/c/ Next 16 BUG:** Next.js 16 uses Turbopack by default, which fails on Windows mounts (`/mnt/c/`) with lockfile permissions (`os error 13`) and breaks Tailwind v4's LightningCSS native module resolution (`Cannot find module '../lightningcss.linux-x64-gnu.node'`). 
  **The Fix:** Do not build on `/mnt/c/`. Copy/rsync the source to the native WSL filesystem (e.g. `~/project-name`), run `npm install && npx next build` there, then rsync the `.next` directory back to `/mnt/c/` and run `npx next start`.

### 2. Set up environment

Create `.env.local`:
```
NEXT_PUBLIC_API_BASE_URL=https://your-api.example.com/v1
API_KEY=your-key-here
DATABASE_URL="postgresql://user:password@host:5432/database"
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=generate-with-openssl-rand-base64-32
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=
```

Verify `.env*` is in `.gitignore` (Next.js template includes it by default).

**On Windows with Laragon MySQL:** The database runs on Windows `127.0.0.1:3306`. From WSL, this IP does not resolve to the Windows host. Use `cmd.exe` to run Prisma and npm scripts so they execute in Windows context and can reach `127.0.0.1:3306` correctly.

### 3. API route: chat streaming proxy (`/api/chat`)

- Accept `{ messages, model }` in POST body.
- Forward to `${baseUrl}/chat/completions` with `stream: true`.
- Pass `Authorization: Bearer ${API_KEY}` from server-side env.
- Return `response.body` directly as SSE stream — no need to manually re-chunk.
- API key stays server-side only; the client calls `/api/chat`, never the upstream directly.

### 4. API route: models (`/api/models`)

- GET proxy to `${baseUrl}/models`.
- Return the JSON as-is; client reads `data.data[]` array.

### 5. Client-side streaming

Parse SSE on the client:
```ts
const reader = response.body?.getReader();
const decoder = new TextDecoder();
let accumulated = "";

while (true) {
  const { done, value } = await reader.read();
  if (done) break;
  const chunk = decoder.decode(value, { stream: true });
  for (const line of chunk.split("\n")) {
    if (line.startsWith("data: ")) {
      const data = line.slice(6).trim();
      if (data === "[DONE]") continue;
      const parsed = JSON.parse(data);
      const delta = parsed.choices?.[0]?.delta?.content;
      if (delta) {
        accumulated += delta;
        // Update state with accumulated text
      }
    }
  }
}
```

### 6. Multi-conversation with localStorage

- Each conversation: `{ id, title, messages[], model, createdAt, updatedAt }`.
- Auto-title from first user message (first 50 chars).
- Store array of conversations in one localStorage key.
- Active conversation ID in a separate key.

### 7. Model selector

- Fetch from `/api/models` on mount.
- Dropdown with search/filter input.
- Each conversation remembers its model; changing model mid-conversation updates only that conversation.

### 8. Authentication with NextAuth (PrismaAdapter, OAuth, Credentials)

Install:
```bash
npm install next-auth @auth/prisma-adapter @prisma/client prisma bcrypt @types/bcrypt --save-exact
```

**Prisma schema (NextAuth compliant with OAuth):**
```prisma
datasource db {
  provider = "postgresql" // or "mysql"
  url      = env("DATABASE_URL")
}

model Account {
  id                String  @id @default(cuid())
  userId            String
  type              String
  provider          String
  providerAccountId String
  refresh_token     String? @db.Text
  access_token      String? @db.Text
  expires_at        Int?
  token_type        String?
  scope             String?
  id_token          String? @db.Text
  session_state     String?
  user              User    @relation(fields: [userId], references: [id], onDelete: Cascade)
  @@unique([provider, providerAccountId])
}

model Session {
  id           String   @id @default(cuid())
  sessionToken String   @unique
  userId       String
  expires      DateTime
  user         User     @relation(fields: [userId], references: [id], onDelete: Cascade)
}

model User {
  id            String         @id @default(cuid())
  name          String?
  email         String?        @unique
  emailVerified DateTime?
  password      String?        // For credentials
  image         String?
  createdAt     DateTime       @default(now())
  updatedAt     DateTime       @updatedAt
  accounts      Account[]
  sessions      Session[]
  conversations Conversation[]
}

model VerificationToken {
  identifier String
  token      String   @unique
  expires    DateTime
  @@unique([identifier, token])
}

model Conversation {
  id        String    @id
  title     String
  model     String
  userId    String
  createdAt DateTime  @default(now())
  updatedAt DateTime  @updatedAt
  user      User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  messages  Message[]
  @@index([userId])
}

model Message {
  id             String       @id @default(cuid())
  role           String
  content        String       @db.Text
  conversationId String
  createdAt      DateTime     @default(now())
  conversation   Conversation @relation(fields: [conversationId], references: [id], onDelete: Cascade)
  @@index([conversationId])
}
```

**Push schema:**
```bash
npx prisma db push
```

**Create `src/lib/db.ts`:**
```ts
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
```

**Create `src/lib/auth.ts`:**
```ts
import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import GithubProvider from "next-auth/providers/github";
import { PrismaAdapter } from "@auth/prisma-adapter";
import bcrypt from "bcrypt";
import { prisma } from "@/lib/db";

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma) as any,
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
    }),
    GithubProvider({
      clientId: process.env.GITHUB_CLIENT_ID || "",
      clientSecret: process.env.GITHUB_CLIENT_SECRET || "",
    }),
    CredentialsProvider({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;
        let user = await prisma.user.findUnique({
          where: { email: credentials.email },
        });
        if (!user) {
           const hashedPassword = await bcrypt.hash(credentials.password, 10);
           user = await prisma.user.create({
             data: { email: credentials.email, password: hashedPassword }
           });
           return user;
        }
        if (user.password) {
          const valid = await bcrypt.compare(credentials.password, user.password);
          if (!valid) return null;
        }
        return user;
      },
    }),
  ],
  callbacks: {
    jwt: async ({ token, user }) => {
      if (user) token.id = user.id;
      return token;
    },
    session: async ({ session, token }) => {
      if (session.user) (session.user as any).id = token.id;
      return session;
    },
  },
  pages: { signIn: "/login" },
  session: { strategy: "jwt" }, // Required for Credentials
  secret: process.env.NEXTAUTH_SECRET,
};
```

**Type augmentation `src/types/next-auth.d.ts`:**
```ts
import "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
    };
  }
}
```

**Create handler `src/app/api/auth/[...nextauth]/route.ts`:**
```ts
import NextAuth from "next-auth";
import { authOptions } from "@/lib/auth";

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
```

### 9. Verify

- `npx next build` — confirm no TypeScript or build errors.
- Start dev server, open `/login`, register a new user or use OAuth.
- Confirm login redirects to chat UI.
- Curl `/api/models` to confirm model list returns.
- Send a message, confirm streaming works and conversation persists in DB.
- Refresh browser — conversation history should reload from database.

## Pitfalls

- **NextAuth OAuth with Prisma:** You MUST include the `Account` and `VerificationToken` models in `schema.prisma`. Without them, OAuth logins will fail to save the provider linked accounts.
- **WSL cannot reach Windows 127.0.0.1 services:** When database or other services run on Windows (e.g., Laragon MySQL at `127.0.0.1:3306`), WSL's `127.0.0.1` resolves to WSL's own loopback, not Windows. Run Node/npm/Prisma commands through `cmd.exe /d /s /c "cd /d C:\path && command"` so they execute in Windows context and can reach the Windows service directly. Alternatively, find the WSL host IP from `ip route` (usually `172.x.x.1`) and configure the service to listen on that IP, but running commands via `cmd.exe` is simpler and requires no service reconfiguration.
- **Windows browser cannot reach WSL servers on 127.0.0.1:** A server listening on `127.0.0.1` inside WSL is only reachable from within WSL. To access it from the Windows browser: (1) bind the server to `0.0.0.0` instead of `127.0.0.1`, then (2) set up port forwarding in an elevated PowerShell: `netsh interface portproxy add v4tov4 listenport=PORT listenaddress=127.0.0.1 connectport=PORT connectaddress=$(hostname -I)`. Some servers (e.g. Hermes dashboard) refuse `0.0.0.0` binding without auth configured — set up auth first, then rebind. Clean up with `netsh interface portproxy delete v4tov4 listenport=PORT listenaddress=127.0.0.1`. Note: `netsh` requires Administrator privileges; it cannot be run from WSL terminal, the user must open PowerShell as Admin on Windows.
- **Platform-specific native modules (lightningcss, bcrypt, sharp):** When switching environments (WSL ↔ Windows), these require platform-matched binaries. For lightningcss on Windows, install `lightningcss-win32-x64-msvc`; on Linux, `lightningcss-linux-x64-gnu`. If npm rejects a platform-mismatched package already in `node_modules`, remove the old entry from `package.json`, delete `node_modules/.package-lock.json`, then install the correct one. If Turbopack still complains about a missing `.node` file after install, manually copy the binary from `node_modules/<package-name>/<file>.node` to `node_modules/<parent-package>/<file>.node` and clear `.next` cache.
- **Supabase IPv4 Connection Pooling:** When running from environments without IPv6 (like default WSL), direct Supabase connections (`db.[project_ref].supabase.co:5432`) will fail with "Network is unreachable". Use the Transaction Pooler (IPv4) instead: `aws-0-[region].pooler.supabase.com:6543`.
  **CRITICAL:** For the pooler, the DB username MUST be formatted as `postgres.[project_ref]` (e.g., `postgres.yihpylreqlygpstvpafq`), NOT just `postgres`, otherwise it throws `tenant/user not found`. Append `?pgbouncer=true&connection_limit=1`.
- **Next.js 16 + NextAuth Middleware:** Next.js 15+ enforces stricter middleware exports. Do not use `export { default } from "next-auth/middleware"`. Instead, use `import { withAuth } from "next-auth/middleware"; export default withAuth({ ... });` otherwise the build fails complaining about missing function exports.
- **Next.js 16 Turbopack on WSL `/mnt/c/`:** Fails with `os error 13` and native module path errors. Build on native WSL `~/` and copy `.next` back, or develop entirely in `~/`.
- **npm install on WSL is extremely slow** — run it as a background process and write all source files in parallel. Don't wait for install before starting to code.
- **Don't expose API keys to the client** — proxy through Next.js API routes. The API key lives in `.env.local` (no `NEXT_PUBLIC_` prefix) and is read only in `route.ts` server code.
- **SSE forward is simple** — just return `response.body` from the upstream fetch as the Response body with `Content-Type: text/event-stream`. No need to manually create a ReadableStream or re-encode chunks.
- **Wrap JSON.parse in try/catch** when parsing SSE data lines — some lines may be empty or contain non-JSON content.
- **Use `AbortController`** for cancellable requests — store ref and abort on unmount or new message.

## User preferences (this user)

- Language: Indonesian (Bahasa) for conversation, English for code. User sometimes makes typos (wls→wsl, etc); auto-correct/infer their intent without pointing it out or complaining.
- Styling: High-quality, polished UI. If asked for a "Claude-like" UI, use Claude's signature aesthetic: warm beige canvas (`#F5F4ED`), terracotta accents (`#C96442`), Serif font for assistant text (Georgia), right-aligned warm-tinted user bubbles (`#F0EFE7`), and an icon-only collapsible sidebar.
- Animation (Claude-like): Always include streaming animations. 1) A pulsing/spinning avatar logo while generating, 2) a blinking block cursor (`▍`) at the end of the streaming text, and 3) pulsing dots while waiting for the first token.
- UI: responsive with collapsible sidebar on mobile.
- **Infrastructure preference:** Use native Windows tools (MySQL from Laragon, Windows Node runtime) when available on the system instead of Docker or WSL-only solutions. Verify what's already installed and running before proposing new containers.
