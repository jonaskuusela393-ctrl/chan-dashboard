import { redirect } from "next/navigation";
import { canAccess, getSession } from "@/lib/auth";
import YouTubeClient from "./YouTubeClient";

export default async function YouTubePage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!canAccess(session, "youtube")) redirect("/chat");
  return <YouTubeClient />;
}
