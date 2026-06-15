import type { Metadata } from "next";
import "./globals.css";

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
        {/* optional global wrapper */}
        <div className="app-shell">
          {children}
        </div>
      </body>
    </html>
  );
}