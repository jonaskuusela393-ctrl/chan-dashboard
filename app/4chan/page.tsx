import Link from "next/link";
import BackButton from "@/components/BackButton";

type Board = {
  board?: string;
  title?: string;
};

type ApiResponse = {
  boards?: Board[];
};

export default async function BoardsPage() {
  let boards: Board[] = [];

  try {
    const res = await fetch("https://a.4cdn.org/boards.json", {
      next: { revalidate: 300 },
    });

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }

    const data: ApiResponse = await res.json();

    boards = Array.isArray(data?.boards) ? data.boards : [];
  } catch (err) {
    return (
      <div className="container">
        <BackButton />

        <h1>4chan Boards</h1>

        <p style={{ color: "red" }}>
          Failed to load boards. API may be down or blocked.
        </p>
      </div>
    );
  }

  return (
    <div className="container">
      <BackButton />

      <h1>4chan Boards</h1>

      {boards.length === 0 ? (
        <p style={{ opacity: 0.6 }}>No boards available.</p>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
            gap: 10,
            marginTop: 20,
          }}
        >
          {boards
            .filter((b) => b?.board) // 🔥 safety fix
            .map((b) => {
              const id = b.board as string;

              return (
                <Link
                  key={id}
                  href={`/4chan/${id}`}
                  className="card"
                  style={{
                    display: "block",
                    textDecoration: "none",
                    color: "inherit",
                  }}
                >
                  <div style={{ fontWeight: 600 }}>/{id}/</div>

                  <div style={{ fontSize: 12, opacity: 0.7 }}>
                    {b.title ?? "No title"}
                  </div>
                </Link>
              );
            })}
        </div>
      )}
    </div>
  );
}