import { sql } from "@/lib/db";

export async function getDeletedItems(board: string) {
  const rows = await sql`
    SELECT item_id, item_type
    FROM deleted_items
    WHERE board = ${board}
  `;

  return new Set(rows.map((r) => String(r.item_id)));
}