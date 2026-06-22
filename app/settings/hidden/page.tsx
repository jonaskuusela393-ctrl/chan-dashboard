import BackButton from "@/components/BackButton";
import { sql } from "@/lib/db";
import { getUser } from "@/lib/getUser";

type HiddenItem = {
  id: number;
  item_id: string;
  item_type: string;
  board: string;
};

export default async function HiddenPage() {
  const user = await getUser();

  if (!user) {
    return (
      <div className="container">
        <BackButton />
        <h1>Hidden items</h1>
        <p style={{ color: "red" }}>You must be logged in.</p>
      </div>
    );
  }

  // ❌ NO TYPE HERE (this fixes your build error)
  const hidden = await sql`
    SELECT id, item_id, item_type, board
    FROM hidden_items
    WHERE user_id = ${user.id}
    ORDER BY id DESC
  `;

  // optional safe typing (no build issues)
  const hiddenItems = hidden as HiddenItem[];

  return (
    <div className="container">
      <BackButton />

      <h1>Hidden items</h1>

      {hiddenItems.length === 0 ? (
        <p style={{ opacity: 0.6 }}>No hidden items.</p>
      ) : (
        hiddenItems.map((h) => (
          <div key={h.id} className="card">
            <div className="meta">
              {h.item_type} — /{h.board}/ — {h.item_id}
            </div>

            <form action="/api/settings/hidden" method="POST">
              <input type="hidden" name="itemId" value={h.item_id} />
              <input type="hidden" name="itemType" value={h.item_type} />
              <input type="hidden" name="board" value={h.board} />

              <button
                style={{
                  marginTop: 8,
                  fontSize: 12,
                  background: "#111",
                  border: "1px solid #333",
                  color: "white",
                  cursor: "pointer",
                }}
              >
                Unhide
              </button>
            </form>
          </div>
        ))
      )}
    </div>
  );
}