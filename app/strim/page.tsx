"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import BackButton from "@/components/BackButton";

type Stream = {
  id: string;
  name: string;
  category: string;
};

const STREAMS: Stream[] = [
  { id: "xqc", name: "xQc", category: "Just Chatting" },
  { id: "adin", name: "Adin Ross", category: "Just Chatting" },
  { id: "gamer1", name: "Pro Gamer", category: "Gaming" },
  { id: "music1", name: "Live DJ", category: "Music" },
  { id: "irl1", name: "IRL Walker", category: "IRL" },
];

const CATEGORIES = ["All", "Just Chatting", "Gaming", "Music", "IRL"];

export default function StrimPage() {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All");

  const filtered = useMemo(() => {
    return STREAMS.filter((s) => {
      const matchesSearch = s.name.toLowerCase().includes(query.toLowerCase());
      const matchesCategory =
        category === "All" || s.category === category;
      return matchesSearch && matchesCategory;
    });
  }, [query, category]);

  return (
    <div className="container">
      <BackButton />

      <h1>Strim 🎥</h1>

      {/* SEARCH */}
      <input
        placeholder="Search streams..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        style={{
          width: "100%",
          padding: "10px",
          marginTop: 10,
          marginBottom: 10,
          background: "#111",
          border: "1px solid #333",
          color: "white",
        }}
      />

      {/* CATEGORY BAR */}
      <div style={{ display: "flex", gap: 8, marginBottom: 15, flexWrap: "wrap" }}>
        {CATEGORIES.map((c) => (
          <button
            key={c}
            onClick={() => setCategory(c)}
            style={{
              padding: "6px 10px",
              border: "1px solid #333",
              background: category === c ? "#222" : "transparent",
              color: "white",
              cursor: "pointer",
            }}
          >
            {c}
          </button>
        ))}
      </div>

      {/* GRID */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
          gap: 10,
        }}
      >
        {filtered.map((stream) => (
          <Link
            key={stream.id}
            href={`/strim/${stream.id}`}
            className="card"
            style={{ display: "block" }}
          >
            <div style={{ fontWeight: 700 }}>{stream.name}</div>
            <div style={{ fontSize: 12, opacity: 0.7 }}>
              {stream.category}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}