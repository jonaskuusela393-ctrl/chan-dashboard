import { sql } from "@/lib/db";
import { getUser } from "@/lib/getUser";

export async function POST(req: Request) {
  const user = await getUser();

  if (!user) {
    return Response.json({ error: "Not logged in" }, { status: 401 });
  }

  const form = await req.formData();

  const itemId = form.get("itemId");
  const itemType = form.get("itemType");
  const board = form.get("board");

  await sql`
    INSERT INTO hidden_items (user_id, item_id, item_type, board)
    VALUES (${user.id}, ${itemId}, ${itemType}, ${board})
  `;

  return Response.redirect(new URL("/settings/hidden", req.url));
}