import { sql } from "@/lib/db";

export async function getHiddenItems(userId: string, board: string) {
  const rows = await sql`
    SELECT item_id, item_type
    FROM hidden_items
    WHERE user_id = ${userId}
    AND board = ${board}
  `;

  return rows.map((r) => ({
    id: String(r.item_id),
    type: r.item_type,
  }));
}