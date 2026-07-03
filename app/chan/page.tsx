import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import ChanClient from "./ChanClient";

export default async function ChanPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  return <ChanClient username={session.username} />;
}
