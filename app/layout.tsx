import type { Metadata } from "next";
import "./globals.css";
import Link from "next/link";

export const metadata: Metadata = {
  title: "4chan Dashboard",
  description: "Custom 4chan viewer",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-black text-white antialiased">
        <div style={{ display: "flex", minHeight: "100vh" }}>
          
          {/* SIDEBAR */}
          <aside
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
            <Link href="/4chan" className="card">4chan</Link>
            <Link href="/strim" className="card">Strim</Link>
          </aside>

          {/* MAIN CONTENT */}
          <main style={{ flex: 1 }}>
            <div className="app-shell">
              {children}
            </div>
          </main>

        </div>
      </body>
    </html>
  );
}