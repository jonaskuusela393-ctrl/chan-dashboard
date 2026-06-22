import { sql } from "@/lib/db";

type DeletedRow = {
  item_id: number | string;
  item_type: string;
};

export async function getDeletedItems(board: string) {
  const rows = (await sql`
    SELECT item_id, item_type
    FROM deleted_items
    WHERE board = ${board}
  `) as DeletedRow[];

  return new Set(rows.map((r) => String(r.item_id)));
}