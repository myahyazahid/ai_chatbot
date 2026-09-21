import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import ChatClient from "./ChatClient";

export default async function Page() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login");
  }

  return <ChatClient />;
}
