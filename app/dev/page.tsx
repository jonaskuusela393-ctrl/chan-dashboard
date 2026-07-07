import { redirect } from "next/navigation";
import { canAccess, getSession } from "@/lib/auth";
import DevClient from "./DevClient";

export default async function DevPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!canAccess(session, "dev")) redirect("/chat");
  return <DevClient username={session.username} />;
}
