import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { canAccess, getSession } from "@/lib/auth";
import DevClient from "./DevClient";
import { devWorkspaceEnabled } from "@/lib/devGuard";

export const metadata: Metadata = { title: "Development workspace", robots: { index: false, follow: false } };

export default async function DevPage() {
  if (!devWorkspaceEnabled()) redirect("/");
  const session = await getSession();
  if (!session) redirect("/login");
  if (!canAccess(session, "dev")) redirect("/chat");
  return <DevClient username={session.username} />;
}
