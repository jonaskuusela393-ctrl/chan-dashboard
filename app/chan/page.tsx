import { redirect } from "next/navigation";
import { canAccess, getSession } from "@/lib/auth";
import ChanClient from "./ChanClient";

export default async function ChanPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!canAccess(session, "chan")) redirect("/chat");
  return <ChanClient username={session.username} />;
}
