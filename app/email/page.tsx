import { redirect } from "next/navigation";
import { canAccess, getSession } from "@/lib/auth";
import EmailClient from "./EmailClient";

export default async function EmailPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!canAccess(session, "email")) redirect("/chat");
  return <EmailClient username={session.username} />;
}
