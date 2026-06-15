import Link from "next/link";
import BackButton from "@/components/BackButton";

export default function Home() {
  return (
    <div className="container">
      <BackButton />

      <h1>My Dashboard 🎉</h1>

      <p style={{ opacity: 0.7 }}>
        Select a module to continue
      </p>

      <div style={{ marginTop: 20, display: "flex", gap: 10 }}>
        <Link
          href="/4chan"
          className="card"
          style={{
            padding: "12px 16px",
            fontWeight: 600,
            color: "#9ad1ff",
          }}
        >
          → 4chan viewer
        </Link>
      </div>
    </div>
  );
}