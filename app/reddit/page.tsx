import { redirect } from "next/navigation";
import { canAccess, getSession } from "@/lib/auth";
import RedditClient from "./RedditClient";

export default async function RedditPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!canAccess(session, "reddit")) redirect("/chat");
  return <RedditClient username={session.username} />;
}
