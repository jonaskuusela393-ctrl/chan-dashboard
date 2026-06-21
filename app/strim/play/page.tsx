import BackButton from "@/components/BackButton";

type Props = {
  searchParams?: { url?: string };
};

function getEmbed(url: string) {
  // YouTube embed
  if (url.includes("youtube.com") || url.includes("youtu.be")) {
    const id =
      url.split("v=")[1]?.split("&")[0] ||
      url.split("/").pop();

    return `https://www.youtube.com/embed/${id}`;
  }

  // Kick (direct page, may or may not embed)
  if (url.includes("kick.com")) {
    return url;
  }

  return url;
}

export default function PlayPage({ searchParams }: Props) {
  const raw = searchParams?.url;

  if (!raw) {
    return (
      <div className="container">
        <BackButton />
        <p>No stream URL provided</p>
      </div>
    );
  }

  const url = decodeURIComponent(raw);
  const embed = getEmbed(url);

  return (
    <div className="container">
      <BackButton />

      <h1>Player</h1>

      <div
        style={{
          marginTop: 15,
          width: "100%",
          aspectRatio: "16 / 9",
          background: "#111",
          border: "1px solid #333",
        }}
      >
        <iframe
          src={embed}
          style={{ width: "100%", height: "100%", border: "none" }}
          allow="autoplay; fullscreen"
          allowFullScreen
        />
      </div>

      {/* fallback link */}
      <div style={{ marginTop: 10 }}>
        <a
          href={url}
          target="_blank"
          rel="noreferrer"
          style={{
            color: "#9ad1ff",
            fontSize: 12,
          }}
        >
          Open original stream
        </a>
      </div>
    </div>
  );
}