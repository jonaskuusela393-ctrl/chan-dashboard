"use client";

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

export function LanguageToggle() {
  const language = usePublicLanguage();
  return (
    <div className="language-switch" role="group" aria-label={language === "fi" ? "Valitse kieli" : "Choose language"}>
      <button type="button" className={language === "fi" ? "active" : ""} onClick={() => setPublicLanguage("fi")} aria-pressed={language === "fi"}>FI</button>
      <button type="button" className={language === "en" ? "active" : ""} onClick={() => setPublicLanguage("en")} aria-pressed={language === "en"}>EN</button>
    </div>
  );
}
