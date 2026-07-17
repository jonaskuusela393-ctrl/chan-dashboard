import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import LoginClient from "./LoginClient";

export const metadata: Metadata = { title: "Secure sign in", robots: { index: false, follow: false } };

export default async function LoginPage() {
  const session = await getSession();
  if (session) redirect(session.role === "user" ? "/chat" : session.role === "customer" ? "/portal" : "/dashboard");
  return <LoginClient />;
}
