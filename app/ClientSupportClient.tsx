"use client";

import Script from "next/script";
import { useRef, useState } from "react";
import BrandMark from "./BrandMark";
import { usePublicLanguage } from "./PublicHeaderNav";

declare global {
  interface Window {
    turnstile?: {
      render: (element: HTMLElement, options: Record<string, unknown>) => string;
      reset: (widgetId?: string) => void;
    };
  }
}

type SupportState = {
  token: string;
  name: string;
  email: string;
  type: string;
  priority: string;
  subject: string;
  message: string;
  consent: boolean;
  companyWebsite: string;
};

const blank: SupportState = { token: "", name: "", email: "", type: "change", priority: "normal", subject: "", message: "", consent: false, companyWebsite: "" };

export default function ClientSupportClient({ serviceName, siteKey }: { serviceName: string; siteKey: string }) {
  const language = usePublicLanguage();
  const fi = language === "fi";
  const [form, setForm] = useState(blank);
  const [status, setStatus] = useState(fi ? "Projektikoodi löytyy julkaisun yhteydessä toimitetuista tiedoista." : "Your project code is included in the launch information.");
  const [sending, setSending] = useState(false);
  const startedAt = useRef(Date.now());
  const container = useRef<HTMLDivElement | null>(null);
  const widgetId = useRef("");
  const [turnstileToken, setTurnstileToken] = useState("");

  function renderTurnstile() {
    if (!siteKey || !container.current || !window.turnstile || widgetId.current) return;
    widgetId.current = window.turnstile.render(container.current, {
      sitekey: siteKey,
      theme: "dark",
      callback: (value: unknown) => setTurnstileToken(String(value || "")),
      "expired-callback": () => setTurnstileToken(""),
      "error-callback": () => setTurnstileToken(""),
    });
  }

  async function submit() {
    if (sending || !form.consent) return;
    setSending(true);
    setStatus(fi ? "Tallennetaan pyyntöä…" : "Saving your request…");
    try {
      const response = await fetch("/api/public/support", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ language, ...form, startedAt: startedAt.current, turnstileToken }),
      });
      const data = await response.json().catch(() => ({})) as { ok?: boolean; error?: string; requestId?: string };
      if (!response.ok || !data.ok) throw new Error(data.error || (fi ? "Pyyntöä ei voitu tallentaa." : "The request could not be saved."));
      setStatus(fi ? `Pyyntö on tallennettu. Viite ${data.requestId || "tallennettu"}.` : `Your request has been saved. Reference ${data.requestId || "saved"}.`);
      setForm(blank);
      startedAt.current = Date.now();
      setTurnstileToken("");
      if (window.turnstile && widgetId.current) window.turnstile.reset(widgetId.current);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : (fi ? "Lähetys epäonnistui." : "Sending failed."));
    } finally {
      setSending(false);
    }
  }

  const requestTypes = fi ? [
    ["change", "Teksti- tai kuvamuutos"], ["fault", "Vika tai häiriö"], ["feature", "Uusi sivu tai toiminto"], ["billing", "Laskutus tai sopimus"], ["note", "Muistiinpano tulevaa työtä varten"],
  ] : [
    ["change", "Text or image change"], ["fault", "Fault or availability issue"], ["feature", "New page or feature"], ["billing", "Billing or agreement"], ["note", "Note for future work"],
  ];

  return <>
    {siteKey && <Script src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit" strategy="afterInteractive" onLoad={() => window.setTimeout(renderTurnstile, 0)}/>} 
    <section className="support-hero">
      <div><p className="eyebrow">{fi ? "NYKYISTEN ASIAKKAIDEN TUKI" : "EXISTING CLIENT SUPPORT"}</p><h1>{fi ? "Lähetä muutos, kysymys tai vikailmoitus ilman kirjautumista." : "Send a change, question or fault report without logging in."}</h1><p>{fi ? "Yksityinen projektikoodi yhdistää pyynnön oikeaan asiakkuuteen. Koodi ei näytä projektin tietoja eikä anna pääsyä hallintapaneeliin." : "A private project code connects the request to the correct client record. It does not reveal project information or provide dashboard access."}</p><a className="public-secondary" href="/">{fi ? "Takaisin etusivulle" : "Back to the website"}</a></div>
      <div className="support-identity"><BrandMark/><strong>{serviceName}</strong><span>{fi ? "asiakaspyyntö" : "client request"}</span></div>
    </section>

    <section className="public-section support-page-layout">
      <aside className="support-guide">
        <p className="eyebrow">{fi ? "ENNEN LÄHETYSTÄ" : "BEFORE SENDING"}</p>
        <h2>{fi ? "Anna mahdollisimman selkeät tiedot" : "Include clear, useful details"}</h2>
        <ol>
          <li><span>1</span><div><strong>{fi ? "Kerro, mitä sivua asia koskee" : "State which page is affected"}</strong><p>{fi ? "Liitä osoite tai sivun nimi, jos tiedät sen." : "Include the address or page name when known."}</p></div></li>
          <li><span>2</span><div><strong>{fi ? "Kuvaile haluttu lopputulos" : "Describe the desired result"}</strong><p>{fi ? "Kirjoita uusi teksti kokonaan tai kerro täsmällisesti, mikä muuttuu." : "Provide the full new text or explain exactly what should change."}</p></div></li>
          <li><span>3</span><div><strong>{fi ? "Kerro, onko sivusto poissa käytöstä" : "Say whether the site is unavailable"}</strong><p>{fi ? "Valitse kiireellinen vain, jos tärkeä toiminto ei toimi." : "Choose urgent only when an important function is not working."}</p></div></li>
        </ol>
        <div className="support-response-note"><strong>{fi ? "Huomaa" : "Please note"}</strong><p>{fi ? "Kiireellinen merkintä nostaa pyynnön etusijalle, mutta vasteaika määräytyy ylläpitosopimuksen mukaan. Uudet toiminnot voivat vaatia erillisen hinta-arvion." : "Urgent marks the request as a priority, but response time follows the maintenance agreement. New features may require a separate estimate."}</p></div>
      </aside>

      <div className="contact-form support-form stack">
        <div className="form-heading"><span>01</span><div><h2>{fi ? "Projektin tunnistus" : "Identify the project"}</h2><p>{fi ? "Projektikoodi toimitetaan asiakkaalle julkaisun yhteydessä." : "The project code is supplied to the client at launch."}</p></div></div>
        <div className="form-grid"><label>{fi ? "Yksityinen projektikoodi" : "Private project code"}<input value={form.token} onChange={(event) => setForm({ ...form, token: event.target.value })} autoComplete="off" placeholder="RN-••••-••••"/></label><label>{fi ? "Nimi" : "Your name"}<input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} autoComplete="name"/></label><label>{fi ? "Sähköposti" : "Email"}<input type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} autoComplete="email"/></label><label>{fi ? "Pyynnön tyyppi" : "Request type"}<select value={form.type} onChange={(event) => setForm({ ...form, type: event.target.value })}>{requestTypes.map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label><label>{fi ? "Kiireellisyys" : "Priority"}<select value={form.priority} onChange={(event) => setForm({ ...form, priority: event.target.value })}><option value="low">{fi ? "Ei kiire" : "Not urgent"}</option><option value="normal">{fi ? "Tavallinen" : "Normal"}</option><option value="high">{fi ? "Tärkeä" : "Important"}</option><option value="urgent">{fi ? "Sivusto tai tärkeä toiminto ei toimi" : "Site or important function is not working"}</option></select></label></div>
        <div className="form-heading"><span>02</span><div><h2>{fi ? "Pyynnön tiedot" : "Request details"}</h2><p>{fi ? "Älä lähetä salasanoja, maksukorttitietoja tai arkaluonteisia henkilötietoja." : "Do not send passwords, payment-card details or sensitive personal information."}</p></div></div>
        <label>{fi ? "Aihe" : "Subject"}<input value={form.subject} onChange={(event) => setForm({ ...form, subject: event.target.value })} placeholder={fi ? "Esimerkiksi: aukioloaikojen päivitys" : "For example: update opening hours"}/></label>
        <label>{fi ? "Pyyntö" : "Request"}<textarea rows={9} value={form.message} onChange={(event) => setForm({ ...form, message: event.target.value })} placeholder={fi ? "Kerro sivu, nykyinen sisältö, uusi sisältö ja toivottu ajankohta." : "Include the page, current content, new content and preferred timing."}/></label>
        <label className="honeypot" aria-hidden="true">Website<input tabIndex={-1} autoComplete="off" value={form.companyWebsite} onChange={(event) => setForm({ ...form, companyWebsite: event.target.value })}/></label>
        <label className="consent-row"><input type="checkbox" checked={form.consent} onChange={(event) => setForm({ ...form, consent: event.target.checked })}/><span>{fi ? "Hyväksyn tietojeni käytön tämän asiakaspyynnön käsittelyyn." : "I agree that my details may be used to handle this client request."} <a href="/privacy">{fi ? "Tietosuojaseloste" : "Privacy notice"}</a>.</span></label>
        {siteKey && <div ref={container} className="turnstile-slot"/>}
        <button className="public-primary" onClick={submit} disabled={sending || !form.consent || !form.token.trim() || !form.name.trim() || !form.email.trim() || !form.subject.trim() || !form.message.trim()}>{sending ? (fi ? "Tallennetaan…" : "Saving…") : (fi ? "Lähetä tukipyyntö" : "Send support request")}</button>
        <p className="form-status" role="status">{status}</p>
      </div>
    </section>
  </>;
}
