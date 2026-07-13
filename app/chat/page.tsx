import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import ChatClient from "./ChatClient";

export const metadata: Metadata = { title: "Private chat", robots: { index: false, follow: false } };

export default async function ChatPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  return <ChatClient username={session.username} role={session.role} />;
}
