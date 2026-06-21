import { sql } from "@/lib/db";
import { getUser } from "@/lib/getUser";

export async function POST(req: Request) {
  const user = await getUser();

  if (!user || user.role !== "admin") {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const { itemId, itemType, board } = await req.json();

  await sql`
    INSERT INTO deleted_items (item_type, item_id, board, deleted_by)
    VALUES (${itemType}, ${itemId}, ${board}, ${user.id})
  `;

  return Response.json({ success: true });
}