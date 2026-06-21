import BackButton from "@/components/BackButton";

type Props = {
  searchParams: {
    url?: string;
  };
};

export default function PlayPage({ searchParams }: Props) {
  const url = searchParams?.url;

  console.log("DEBUG URL:", url); // <- check browser console

  if (!url) {
    return (
      <div className="container">
        <BackButton />
        <p>No stream URL provided</p>
      </div>
    );
  }

  const decoded = decodeURIComponent(url);

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
          src={decoded}
          style={{ width: "100%", height: "100%", border: "none" }}
          allow="autoplay; fullscreen"
          allowFullScreen
        />
      </div>
    </div>
  );
}