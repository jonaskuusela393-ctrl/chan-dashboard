"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import BrandMark from "./BrandMark";
import { LanguageToggle, usePublicLanguage } from "./PublicHeaderNav";

type SessionInfo = { username: string; role: string } | null;
type Access = { business: boolean; email: boolean; youtube: boolean; dev: boolean };

const publicPaths = new Set(["/", "/company", "/privacy", "/cookies", "/terms", "/accessibility", "/data-processing", "/support", "/register", "/forgot-password", "/reset-password"]);

export default function SiteHeader({ serviceName, session, access, showDev }: { serviceName: string; session: SessionInfo; access: Access; showDev: boolean }) {
  const pathname = usePathname();
  const language = usePublicLanguage();
  const fi = language === "fi";
  const [open, setOpen] = useState(false);
  const isPublic = publicPaths.has(pathname);
  const isLogin = pathname === "/login";
  const chatOnly = session?.role === "user";
  const customer = session?.role === "customer";

  useEffect(() => setOpen(false), [pathname]);

  const brand = (
    <Link className="brand" href="/" aria-label={`${serviceName} ${fi ? "etusivu" : "home"}`}>
      <BrandMark compact />
      <span className="brand-copy"><strong>{serviceName}</strong><small>{fi ? "verkkopalvelut yrityksille" : "digital services for business"}</small></span>
    </Link>
  );

  if (isPublic || isLogin) {
    return (
      <header className="topbar public-topbar">
        {brand}
        <button className="mobile-menu-button" type="button" aria-expanded={open} aria-controls="site-navigation" onClick={() => setOpen((value) => !value)}>
          <span /> <span /> <span /><b>{fi ? "Valikko" : "Menu"}</b>
        </button>
        <nav id="site-navigation" className={`nav public-nav ${open ? "open" : ""}`} aria-label={fi ? "Päänavigaatio" : "Main navigation"}>
          {!isLogin && <>
            <a href="/#services">{fi ? "Palvelut" : "Services"}</a>
            <a href="/#process">{fi ? "Työvaiheet" : "Process"}</a>
            <a href="/#pricing">{fi ? "Hinnat" : "Pricing"}</a>
            <a href="/#estimate">{fi ? "Hinta-arvio" : "Estimate"}</a>
            <a href="/#contact">{fi ? "Yhteys" : "Contact"}</a>
            <Link href="/support">{fi ? "Asiakastuki" : "Client support"}</Link>
          </>}
          {isLogin && <Link href="/">{fi ? "Takaisin sivustolle" : "Back to website"}</Link>}
          <LanguageToggle />
          {session ? <Link className="nav-admin-link" href={session.role === "customer" ? "/portal" : session.role === "user" ? "/chat" : "/dashboard"}>{fi ? "Oma työtila" : "Workspace"}</Link> : <><Link href="/login">{fi ? "Kirjaudu" : "Sign in"}</Link><Link className="nav-admin-link" href="/register">{fi ? "Luo tili" : "Create account"}</Link></>}
        </nav>
      </header>
    );
  }

  return (
    <header className="topbar private-topbar">
      {brand}
      <button className="mobile-menu-button" type="button" aria-expanded={open} aria-controls="private-navigation" onClick={() => setOpen((value) => !value)}>
        <span /> <span /> <span /><b>Menu</b>
      </button>
      <nav id="private-navigation" className={`nav private-nav ${open ? "open" : ""}`} aria-label="Private navigation">
        {customer ? <><Link href="/portal">Workspace</Link><Link href="/portal#billing">Billing</Link><Link href="/support">Support</Link><Link href="/">Public site</Link></> : chatOnly ? <>
          <Link href="/chat">Chat</Link>
          <Link href="/">Public site</Link>
        </> : <>
          <Link href="/dashboard">Overview</Link>
          {access.business && <Link href="/business">Business</Link>}
          {access.email && <Link href="/email">Inbox</Link>}
          <Link href="/chat">Chat</Link>
          {access.youtube && <Link href="/personal">Personal</Link>}
          <Link href="/admin">Admin</Link>
          {showDev && access.dev && <Link href="/dev">Workspace</Link>}
          <Link href="/">Public site</Link>
        </>}
        <span className="userpill">{session?.username || "private"}</span>
        <a className="logout-link" href="/api/auth/logout">Log out</a>
      </nav>
    </header>
  );
}
