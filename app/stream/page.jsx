"use client";

import { useRouter } from "next/navigation";

export default function StreamPage() {
  const router = useRouter();

  const channel = "BestestCreature"; // change this

  return (
    <div style={styles.page}>
      {/* TOP BAR */}
      <div style={styles.topBar}>
        <button onClick={() => router.back()} style={styles.btn}>
          ← Back
        </button>

        <button
          onClick={() =>
            document.documentElement.requestFullscreen?.()
          }
          style={styles.btn}
        >
          ⛶ Fullscreen
        </button>
      </div>

      {/* STREAM */}
      <iframe
        src={`https://player.kick.com/${channel}`}
        allow="autoplay; fullscreen"
        allowFullScreen
        style={styles.iframe}
      />
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    background: "#000",
    minHeight: "100vh",
    width: "100%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
    overflow: "hidden",
  },

  topBar: {
    position: "absolute",
    top: 10,
    left: 10,
    display: "flex",
    gap: 10,
    zIndex: 10,
  },

  btn: {
    padding: "8px 12px",
    background: "#111",
    color: "#fff",
    border: "1px solid #333",
    cursor: "pointer",
    fontFamily: "inherit",
  },

  iframe: {
    width: "95vw",
    height: "90vh",
    border: "1px solid #222",
    borderRadius: "8px",
    background: "#000",
  },
};