import BackButton from "@/components/BackButton";

export default async function ThreadPage({
  params,
}: {
  params: { board: string; id: string };
}) {
  const { board, id } = params;

  let data = null;

  try {
    const res = await fetch(
      `https://a.4cdn.org/${board}/thread/${id}.json`,
      {
        next: { revalidate: 30 }, // cache refresh
      }
    );

    if (!res.ok) throw new Error("Thread not found");

    data = await res.json();
  } catch (err) {
    return (
      <div className="container">
        <BackButton />

        <h1>
          /{board}/ — thread {id}
        </h1>

        <p style={{ color: "red" }}>
          Failed to load thread. It may be deleted or archived.
        </p>
      </div>
    );
  }

  const posts = Array.isArray(data?.posts) ? data.posts : [];

  return (
    <div className="container">
      <BackButton />

      <h1>
        /{board}/ — thread {id}
      </h1>

      {posts.length === 0 ? (
        <p>No posts found.</p>
      ) : (
        posts.map((p, index) => {
          const isOP = index === 0;

          const imageUrl =
            p?.tim && p?.ext
              ? `https://i.4cdn.org/${board}/${p.tim}${p.ext}`
              : null;

          return (
            <div
              key={p?.no ?? index}
              className="card"
              style={{
                borderColor: isOP ? "#666" : "#222",
              }}
            >
              <div className="meta">
                No.{p?.no ?? "?"} {isOP && "• OP"}
              </div>

              <div
                className="post-body"
                dangerouslySetInnerHTML={{
                  __html: p?.com ?? "",
                }}
              />

              {imageUrl && (
                <a
                  href={imageUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="image-link"
                  style={{
                    display: "block",
                    marginTop: 10,
                  }}
                >
                  <img
                    className="post-img"
                    src={imageUrl}
                    alt=""
                    loading="lazy"
                    decoding="async"
                  />
                </a>
              )}
            </div>
          );
        })
      )}
    </div>
  );
}