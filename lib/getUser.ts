import { getServerSession } from "next-auth";

export async function getUser() {
  const session = await getServerSession();

  if (!session?.user) return null;

  return {
    id: (session.user as any).name,
    role: (session.user as any).role,
  };
}