import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import PersonalClient from "./PersonalClient";

export const metadata: Metadata = { title: "Personal tools", robots: { index: false, follow: false } };

export default async function PersonalPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role !== "admin") redirect("/chat");
  const params = await searchParams;
  const initialTab = params.tab === "chan" ? "chan" : params.tab === "twitch" ? "twitch" : params.tab === "reddit" ? "reddit" : "youtube";
  return <PersonalClient username={session.username} initialTab={initialTab} />;
}
