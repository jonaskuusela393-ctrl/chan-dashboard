"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import BackButton from "@/components/BackButton";

function isValidUrl(value: string) {
  try {
    new URL(value);
    return true;
  } catch {
    return false;
  }
}

export default function StrimPage() {
  const [url, setUrl] = useState("");
  const [favorites, setFavorites] = useState<string[]>([]);
  const router = useRouter();

  // load safely
  useEffect(() => {
    try {
      const saved = localStorage.getItem("favorites");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) setFavorites(parsed);
      }
    } catch {
      setFavorites([]);
    }
  }, []);

  function save(list: string[]) {
    setFavorites(list);
    localStorage.setItem("favorites", JSON.stringify(list));
  }

  function play(link: string) {
    const clean = link.trim();

    if (!clean || !isValidUrl(clean)) return;

    router.push(`/strim/play?url=${encodeURIComponent(clean)}`);
  }

  function addFavorite() {
    const clean = url.trim();

    if (!clean || !isValidUrl(clean)) return;
    if (favorites.includes(clean)) return;

    save([...favorites, clean]);
    setUrl("");
  }

  function removeFavorite(item: string) {
    save(favorites.filter((f) => f !== item));
  }

  return (
    <div className="container">
      <BackButton />

      <h1>Strim 🎥</h1>

      {/* INPUT */}
      <input
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        placeholder="Paste Kick / YouTube URL"
        style={{
          width: "100%",
          padding: 10,
          marginTop: 10,
          background: "#111",
          border: "1px solid #333",
          color: "white",
        }}
      />

      <div style={{ display: "flex", gap: 10, marginTop: 10 }}>
        <button className="card" onClick={() => play(url)}>
          Play
        </button>

        <button className="card" onClick={addFavorite}>
          ⭐ Add Favorite
        </button>
      </div>

      {/* FAVORITES */}
      <h3 style={{ marginTop: 20 }}>Favorites</h3>

      {favorites.length === 0 ? (
        <p style={{ opacity: 0.6 }}>No saved streams</p>
      ) : (
        favorites.map((f) => (
          <div
            key={f}
            className="card"
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: 10,
            }}
          >
            <span style={{ fontSize: 12, wordBreak: "break-all" }}>
              {f}
            </span>

            <div style={{ display: "flex", gap: 8 }}>
              <button className="card" onClick={() => play(f)}>
                ▶
              </button>

              <button className="card" onClick={() => removeFavorite(f)}>
                ✕
              </button>
            </div>
          </div>
        ))
      )}
    </div>
  );
}