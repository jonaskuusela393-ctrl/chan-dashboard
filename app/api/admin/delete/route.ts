import { sql } from "@/lib/db";
import { getUser } from "@/lib/getUser";

export async function POST(req: Request) {
  const user = await getUser();

  if (!user || user.role !== "admin") {
    return new Response("Unauthorized", { status: 401 });
  }

  const { itemId, itemType, board } = await req.json();

  await sql`
    DELETE FROM hidden_items
    WHERE user_id = ${user.id}
    AND item_id = ${itemId}
    AND item_type = ${itemType}
    AND board = ${board}
  `;

  return Response.json({ success: true });
}