"use client";

import BackButton from "@/components/BackButton";
import { useEffect, useState } from "react";

type Props = {
  searchParams: { url?: string };
};

function getEmbed(url: string) {
  // YouTube
  if (url.includes("youtube.com") || url.includes("youtu.be")) {
    const id = url.split("v=")[1] || url.split("/").pop();
    return `https://www.youtube.com/embed/${id}`;
  }

  // Kick (try direct page, may fail in iframe)
  if (url.includes("kick.com")) {
    return url;
  }

  return url;
}

export default function PlayPage({ searchParams }: Props) {
  const raw = searchParams.url;
  const [failed, setFailed] = useState(false);

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

  useEffect(() => {
    setFailed(false);
  }, [embed]);

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
          position: "relative",
        }}
      >
        {!failed ? (
          <iframe
            src={embed}
            style={{ width: "100%", height: "100%", border: "none" }}
            allow="autoplay; fullscreen"
            allowFullScreen
            onError={() => setFailed(true)}
          />
        ) : (
          <div
            style={{
              height: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexDirection: "column",
              gap: 10,
            }}
          >
            <p style={{ opacity: 0.7 }}>Player blocked or unsupported</p>

            <a
              href={url}
              target="_blank"
              rel="noreferrer"
              style={{
                padding: "8px 12px",
                border: "1px solid #333",
              }}
            >
              Open stream externally
            </a>
          </div>
        )}
      </div>
    </div>
  );
}