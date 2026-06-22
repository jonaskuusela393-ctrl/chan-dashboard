import { sql } from "@/lib/db";

type HiddenRow = {
  item_id: number | string;
  item_type: string;
};

export async function getHiddenItems(userId: string, board: string) {
  const rows = (await sql`
    SELECT item_id, item_type
    FROM hidden_items
    WHERE user_id = ${userId}
      AND board = ${board}
  `) as HiddenRow[];

  return rows.map((r) => ({
    id: String(r.item_id),
    type: r.item_type,
  }));
}