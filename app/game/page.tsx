import { redirect } from "next/navigation";
import { canAccess, getSession } from "@/lib/auth";
import EarthGameClient from "./EarthGameClient";

export default async function GamePage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!canAccess(session, "game")) redirect("/chat");
  return <EarthGameClient username={session.username} />;
}
