import Link from "next/link";
import BackButton from "@/components/BackButton";

export default async function BoardPage({ params }) {
  const { board } = await params;

  let data = [];

  try {
    const res = await fetch(
      `https://a.4cdn.org/${board}/catalog.json`,
      {
        next: { revalidate: 60 }, // ⚡ cache 1 min (big speed boost)
      }
    );

    if (!res.ok) {
      throw new Error(`Failed to fetch board: ${res.status}`);
    }

    data = await res.json();
  } catch (err) {
    return (
      <div className="container">
        <BackButton />

        <h1>/{board}/</h1>

        <p style={{ color: "red" }}>
          Failed to load threads. The board may not exist or 4chan API is down.
        </p>
      </div>
    );
  }

  const threads = Array.isArray(data)
    ? data.flatMap((page) => page?.threads ?? [])
    : [];

  return (
    <div className="container">
      <BackButton />

      <h1>/{board}/</h1>

      {threads.length === 0 ? (
        <p>No threads found.</p>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
            gap: 12,
            marginTop: 16,
          }}
        >
          {threads.map((t) => {
            const id = t?.no;
            if (!id) return null;

            return (
              <Link
                key={id}
                href={`/4chan/${board}/thread/${id}`}
                className="card"
                style={{
                  display: "block",
                  textDecoration: "none",
                  color: "inherit",
                }}
              >
                <div className="title">
                  {t?.sub?.trim() || "No title"}
                </div>

                <div className="meta">
                  replies: {t?.replies ?? 0}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}