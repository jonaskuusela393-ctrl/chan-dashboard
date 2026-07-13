"use client";

import { useState } from "react";
import BrandMark from "../BrandMark";

export default function LoginClient() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState("Private staff accounts only.");
  const [loading, setLoading] = useState(false);

  async function login() {
    if (!username.trim() || !password || loading) return;
    setLoading(true);
    setStatus("Checking credentials…");
    try {
      const response = await fetch("/api/auth/login", { method: "POST", cache: "no-store", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ username, password }) });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Login failed");
      window.location.href = data.role === "user" ? "/chat" : "/dashboard";
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return <div className="login-layout">
    <section className="login-intro"><BrandMark/><p className="eyebrow">RACCOON NORTH · PRIVATE OPERATIONS</p><h1>Staff access</h1><p>The customer-facing website does not require an account. This page is only for the private business dashboard and team chat.</p><a href="/">← Return to the public website</a></section>
    <section className="login-card"><div><span className="status-dot online"/><small>SECURE SESSION</small></div><h2>Sign in</h2><p>Use an administrator or private chat account.</p><label>Username<input value={username} onChange={(event) => setUsername(event.target.value)} autoComplete="username" autoFocus/></label><label>Password<input value={password} onChange={(event) => setPassword(event.target.value)} type="password" autoComplete="current-password" onKeyDown={(event) => { if (event.key === "Enter") void login(); }}/></label><button className="public-primary" onClick={login} disabled={loading || !username.trim() || !password}>{loading ? "Signing in…" : "Sign in securely"}</button><p className="form-status" role="status">{status}</p></section>
  </div>;
}
