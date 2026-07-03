import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import LoginClient from "./LoginClient";

export default async function LoginPage() {
  const session = await getSession();
  if (session) redirect("/");
  return <LoginClient />;
}
