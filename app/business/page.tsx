import { redirect } from "next/navigation";
import { canAccess, getSession } from "@/lib/auth";
import BusinessClient from "./BusinessClient";

export default async function BusinessPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!canAccess(session, "business")) redirect("/chat");
  return <BusinessClient username={session.username} />;
}
