"use client";

import { useRouter } from "next/navigation";

export default function BackButton() {
  const router = useRouter();

  return (
    <button
      onClick={() => router.back()}
      style={{
        marginBottom: 15,
        padding: "6px 10px",
        background: "#111",
        color: "#fff",
        border: "1px solid #333",
        borderRadius: "6px",
        cursor: "pointer",
        fontFamily: "inherit",
        fontSize: "14px",
      }}
    >
      ← Back
    </button>
  );
}