"use client";

import { useState } from "react";
import BrandMark from "../BrandMark";

export default function LoginClient() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [status, setStatus] = useState("Enter your staff username or customer email.");
  const [loading, setLoading] = useState(false);

  async function login() {
    if (!username.trim() || !password || loading) return;
    setLoading(true);
    setStatus("Checking credentials…");
    try {
      const response = await fetch("/api/auth/login", { method: "POST", cache: "no-store", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ username, password, code }) });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Login failed");
      window.location.href = data.role === "user" ? "/chat" : data.role === "customer" ? "/portal" : "/dashboard";
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return <div className="login-layout">
    <section className="login-intro"><BrandMark/><p className="eyebrow">RACCOON NORTH · PRIVATE OPERATIONS</p><h1>Sign in</h1><p>Customers use the same secure sign-in page for their private workspace. Staff accounts continue to use their administrator credentials.</p><a href="/">← Return to the public website</a></section>
    <section className="login-card"><div><span className="status-dot online"/><small>SECURE SESSION</small></div><h2>Sign in</h2><p>Use your email address or staff username.</p><label>Email or username<input value={username} onChange={(event) => setUsername(event.target.value)} autoComplete="username" autoFocus/></label><label>Password<input value={password} onChange={(event) => setPassword(event.target.value)} type="password" autoComplete="current-password" onKeyDown={(event) => { if (event.key === "Enter") void login(); }}/></label><label>Authenticator code (owner account only)<input value={code} onChange={(event) => setCode(event.target.value)} inputMode="numeric" autoComplete="one-time-code" placeholder="123456"/></label><button className="public-primary" onClick={login} disabled={loading || !username.trim() || !password}>{loading ? "Signing in…" : "Sign in securely"}</button><p className="form-status" role="status">{status}</p><p><a href="/forgot-password">Forgot password?</a> · <a href="/register">Create customer account</a></p></section>
  </div>;
}
