"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

export type PublicLanguage = "en" | "fi";

function initialLanguage(): PublicLanguage {
  if (typeof window === "undefined") return "en";
  const query = new URLSearchParams(window.location.search).get("lang");
  if (query === "fi" || query === "en") return query;
  const saved = window.localStorage.getItem("raccoon-language");
  if (saved === "fi" || saved === "en") return saved;
  return navigator.language.toLowerCase().startsWith("fi") ? "fi" : "en";
}

export function setPublicLanguage(language: PublicLanguage) {
  window.localStorage.setItem("raccoon-language", language);
  document.documentElement.lang = language;
  window.dispatchEvent(new CustomEvent("raccoon-language", { detail: language }));
}

export function usePublicLanguage() {
  const [language, setLanguage] = useState<PublicLanguage>("en");
  useEffect(() => {
    const selected = initialLanguage();
    setLanguage(selected);
    document.documentElement.lang = selected;
    const listener = (event: Event) => {
      const next = (event as CustomEvent<PublicLanguage>).detail;
      if (next === "fi" || next === "en") setLanguage(next);
    };
    window.addEventListener("raccoon-language", listener);
    return () => window.removeEventListener("raccoon-language", listener);
  }, []);
  return language;
}

export default function PublicHeaderNav({ loggedIn }: { loggedIn: boolean }) {
  const language = usePublicLanguage();
  const fi = language === "fi";
  return (
    <nav className="nav public-nav" aria-label={fi ? "Päänavigaatio" : "Main navigation"}>
      <a href="/#services">{fi ? "Palvelut" : "Services"}</a>
      <a href="/#pricing">{fi ? "Hinnat" : "Pricing"}</a>
      <a href="/#estimate">{fi ? "Hinta-arvio" : "Estimate"}</a>
      <a href="/#contact">{fi ? "Yhteys" : "Contact"}</a>
      <button className="language-button" type="button" onClick={() => setPublicLanguage(fi ? "en" : "fi")} aria-label={fi ? "Switch to English" : "Vaihda suomeksi"}>
        {fi ? "EN" : "FI"}
      </button>
      {loggedIn && <Link href="/dashboard">{fi ? "Hallinta" : "Dashboard"}</Link>}
    </nav>
  );
}
