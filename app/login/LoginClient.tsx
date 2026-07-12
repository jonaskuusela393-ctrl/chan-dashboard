"use client";

import { useState } from "react";

export default function LoginClient() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState("Enter a private operations account.");
  const [loading, setLoading] = useState(false);

  async function login() {
    if (!username.trim() || !password || loading) return;
    setLoading(true);
    setStatus("checking credentials...");
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        cache: "no-store",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Login failed");
      window.location.href = data.role === "user" ? "/chat" : "/dashboard";
    } catch (error: any) {
      setStatus(error?.message || "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="stack" style={{ maxWidth: 520, margin: "40px auto" }}>
      <section className="panel stack">
        <p className="badge">LOCKED TERMINAL</p>
        <h1>Login</h1>
        <p className="muted">The public service site stays visible. Business operations and chat require a signed private account.</p>
        <input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="username" autoComplete="username" />
        <input value={password} onChange={(e) => setPassword(e.target.value)} placeholder="password" type="password" autoComplete="current-password" onKeyDown={(e) => { if (e.key === "Enter") login(); }} />
        <button onClick={login} disabled={loading || !username.trim() || !password}>{loading ? "checking..." : "enter"}</button>
        <p className="muted small">{status}</p>
      </section>
    </div>
  );
}
