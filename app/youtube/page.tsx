import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import YouTubeClient from "./YouTubeClient";

export default async function YouTubePage() {
  const session = await getSession();
  if (!session) redirect("/login");
  return <YouTubeClient />;
}
