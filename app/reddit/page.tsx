import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";

export default async function RedditPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role !== "admin") redirect("/chat");
  redirect("/personal?tab=reddit");
}
