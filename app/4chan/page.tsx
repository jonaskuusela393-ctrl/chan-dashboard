import Link from "next/link";
import BackButton from "@/components/BackButton";

type Board = {
  board: string;
  title: string;
};

type ApiResponse = {
  boards: Board[];
};

export default async function BoardsPage() {
  try {
    const res = await fetch("https://a.4cdn.org/boards.json", {
      next: { revalidate: 300 },
    });

    if (!res.ok) {
      throw new Error(`4chan API HTTP ${res.status}`);
    }

    const data: ApiResponse = await res.json();

    const boards = Array.isArray(data?.boards) ? data.boards : [];

    if (boards.length === 0) {
      return (
        <div className="container">
          <BackButton />
          <h1>4chan Boards</h1>
          <p style={{ opacity: 0.6 }}>No boards available.</p>
        </div>
      );
    }

    return (
      <div className="container">
        <BackButton />

        <h1>4chan Boards</h1>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
            gap: 10,
            marginTop: 20,
          }}
        >
          {boards.map((b) => (
            <Link
              key={b.board}
              href={`/4chan/${b.board}`}
              className="card"
              style={{
                display: "block",
                textDecoration: "none",
                color: "inherit",
              }}
            >
              <div style={{ fontWeight: 600 }}>/{b.board}/</div>
              <div style={{ fontSize: 12, opacity: 0.7 }}>
                {b.title || "No title"}
              </div>
            </Link>
          ))}
        </div>
      </div>
    );
  } catch (err) {
    console.error("Boards fetch failed:", err);

    return (
      <div className="container">
        <BackButton />

        <h1>4chan Boards</h1>

        <p style={{ color: "red" }}>
          Failed to load boards. API may be down, blocked, or rate-limited.
        </p>
      </div>
    );
  }
}