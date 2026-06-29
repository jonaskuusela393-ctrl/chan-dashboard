import type { Metadata } from "next";
import "./globals.css";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Dashboard",
  description: "Custom viewer + AI terminal",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-black text-white antialiased">

        <div className="app-shell" style={{ display: "flex", minHeight: "100vh" }}>
          
          {/* SIDEBAR */}
          <aside
            className="sidebar"
            style={{
              width: 220,
              borderRight: "1px solid #222",
              padding: 15,
              display: "flex",
              flexDirection: "column",
              gap: 10,
            }}
          >
            <h3 style={{ margin: 0 }}>Menu</h3>

            <Link href="/" className="card">Home</Link>
            <Link href="/viewer/dreamviews" className="card">Dreamviews</Link>
            <Link href="/viewer/rule34" className="card">Rule34</Link>
            <Link href="/stream" className="card">Streaming</Link>
          </aside>

          {/* MAIN CONTENT */}
          <main style={{ flex: 1 }}>
            {children}
          </main>

        </div>

      </body>
    </html>
  );
}
