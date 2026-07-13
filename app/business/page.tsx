import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { canAccess, getSession } from "@/lib/auth";
import BusinessClient from "./BusinessClient";

export const metadata: Metadata = { title: "Business operations", robots: { index: false, follow: false } };

export default async function BusinessPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!canAccess(session, "business")) redirect("/chat");
  return <BusinessClient username={session.username} />;
}
