import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import RedditClient from "./RedditClient";

export default async function RedditPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  return <RedditClient username={session.username} />;
}
