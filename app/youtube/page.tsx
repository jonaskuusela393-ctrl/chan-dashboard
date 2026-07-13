import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { canAccess, getSession } from "@/lib/auth";
import YouTubeClient from "./YouTubeClient";

export const metadata: Metadata = { title: "Video research", robots: { index: false, follow: false } };

export default async function YouTubePage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!canAccess(session, "youtube")) redirect("/chat");
  return <YouTubeClient />;
}
