"use client";

import { useRouter } from "next/navigation";

export default function StreamPage() {
  const router = useRouter();

  const channel = "YOUR_CHANNEL_NAME"; // change this

  return (
    <div
      style={{
        background: "#000",
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {/* TOP BAR */}
      <div
        style={{
          position: "absolute",
          top: 10,
          left: 10,
          display: "flex",
          gap: 10,
        }}
      >
        <button
          onClick={() => router.back()}
          style={btnStyle}
        >
          ← Back
        </button>
      </div>

      {/* STREAM */}
      <iframe
        src={`https://player.kick.com/${channel}`}
        allow="autoplay; fullscreen"
        allowFullScreen
        style={{
          width: "90vw",
          height: "80vh",
          border: "1px solid #222",
          borderRadius: "8px",
          background: "#000",
        }}
      />
    </div>
  );
}

const btnStyle = {
  padding: "6px 10px",
  background: "#111",
  color: "#fff",
  border: "1px solid #333",
  cursor: "pointer",
  fontFamily: "inherit",
};