"use client";

import Script from "next/script";
import { useMemo, useRef, useState } from "react";
import { usePublicLanguage } from "./PublicHeaderNav";
import { CARE_PLANS, FEATURE_OPTIONS, SITE_KINDS, calculateEstimate, euro, normalizeEstimateInput, type CarePlan, type EstimateInput, type SiteKind } from "@/lib/estimate";

declare global {
  interface Window {
    turnstile?: {
      render: (element: HTMLElement, options: Record<string, unknown>) => string;
      reset: (widgetId?: string) => void;
    };
  }
}

type PublicConfig = {
  serviceName: string;
  legalName: string;
  businessId: string;
  vatId: string;
  address: string;
  postalAddress: string;
  country: string;
  email: string;
  phone: string;
  privacyEmail: string;
  court: string;
  location: string;
  vatRegistered: boolean;
  vatRate: number;
  legalReady: boolean;
};

type PublicProps = { config: PublicConfig; loggedIn: boolean; turnstileSiteKey: string };
type FormState = { name: string; company: string; email: string; phone: string; website: string; message: string; consent: boolean; companyWebsite: string };
type SupportState = { token: string; name: string; email: string; type: string; priority: string; subject: string; message: string; consent: boolean; companyWebsite: string };

const blankForm: FormState = { name: "", company: "", email: "", phone: "", website: "", message: "", consent: false, companyWebsite: "" };
const blankSupport: SupportState = { token: "", name: "", email: "", type: "change", priority: "normal", subject: "", message: "", consent: false, companyWebsite: "" };

function useTurnstile(siteKey: string) {
  const container = useRef<HTMLDivElement | null>(null);
  const widgetId = useRef<string>("");
  const [token, setToken] = useState("");
  function render() {
    if (!siteKey || !container.current || !window.turnstile || widgetId.current) return;
    widgetId.current = window.turnstile.render(container.current, {
      sitekey: siteKey,
      theme: "dark",
      callback: (value: unknown) => setToken(String(value || "")),
      "expired-callback": () => setToken(""),
      "error-callback": () => setToken(""),
    });
  }
  function reset() {
    setToken("");
    if (window.turnstile && widgetId.current) window.turnstile.reset(widgetId.current);
  }
  return { container, token, render, reset };
}

async function postJson(path: string, payload: Record<string, unknown>) {
  const response = await fetch(path, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
  const data = await response.json().catch(() => ({})) as { ok?: boolean; error?: string; requestId?: string };
  if (!response.ok || !data.ok) throw new Error(data.error || "Request could not be sent.");
  return data;
}

const content = {
  en: {
    eyebrow: "WEBSITES FOR SMALL AND MEDIUM BUSINESSES",
    title: "A professional website without technical confusion.",
    lead: "We plan, write, build, launch and maintain the website. You receive a clear written scope, named owners for every account and one place to request changes after launch.",
    estimateButton: "get a price estimate",
    contactButton: "describe the project",
    supportButton: "existing client support",
    highlights: ["plain-language service", "mobile-first", "client-owned accounts", "optional managed care"],
    servicesTitle: "Everything needed to get the website working in the real world",
    servicesLead: "The service is designed for owners who do not want to learn hosting, databases or web development.",
    processTitle: "A clear process from first message to a working website",
    pricingTitle: "Clear starting packages",
    pricingLead: "These are realistic starting prices for defined small-business projects. The written proposal confirms the final scope and fixed price.",
    estimateTitle: "Build a plain-language project estimate",
    estimateLead: "Choose what customers should be able to see or do. Technical implementation is decided for you.",
    contactTitle: "Tell us what the business needs",
    contactLead: "No technical vocabulary is required. Describe the business, its customers and the result you want.",
    supportTitle: "Existing client support and change requests",
    supportLead: "Customers do not need an account. Use the private project code supplied at launch to send a change, content request, question or fault report.",
    faqTitle: "Important questions answered before work begins",
  },
  fi: {
    eyebrow: "VERKKOSIVUT PIENILLE JA KESKISUURILLE YRITYKSILLE",
    title: "Ammattimainen verkkosivusto ilman teknistä sekavuutta.",
    lead: "Suunnittelemme, kirjoitamme, rakennamme, julkaisemme ja tarvittaessa ylläpidämme verkkosivuston. Saat selkeän kirjallisen laajuuden, nimetyt omistajat kaikille tileille ja yhden kanavan muutospyyntöihin julkaisun jälkeen.",
    estimateButton: "laske hinta-arvio",
    contactButton: "kuvaile projekti",
    supportButton: "nykyisen asiakkaan tuki",
    highlights: ["selkokielinen palvelu", "toimii puhelimella", "asiakas omistaa tilit", "valinnainen ylläpito"],
    servicesTitle: "Kaikki, mitä toimiva yrityssivusto tarvitsee",
    servicesLead: "Palvelu on tarkoitettu yrittäjälle, joka ei halua opetella palvelimia, tietokantoja tai verkkokehitystä.",
    processTitle: "Selkeä prosessi ensimmäisestä viestistä toimivaan sivustoon",
    pricingTitle: "Selkeät aloituspaketit",
    pricingLead: "Nämä ovat realistisia aloitushintoja rajatuille pienyritysprojekteille. Lopullinen sisältö ja kiinteä hinta vahvistetaan kirjallisessa tarjouksessa.",
    estimateTitle: "Tee selkokielinen projektin hinta-arvio",
    estimateLead: "Valitse, mitä asiakkaiden pitää voida nähdä tai tehdä. Tekninen toteutus valitaan puolestasi.",
    contactTitle: "Kerro, mitä yritys tarvitsee",
    contactLead: "Teknisiä termejä ei tarvita. Kuvaile yritys, asiakkaat ja haluttu lopputulos.",
    supportTitle: "Nykyisten asiakkaiden tuki ja muutospyynnöt",
    supportLead: "Asiakkaan ei tarvitse kirjautua. Käytä julkaisun yhteydessä saatua yksityistä projektikoodia muutoksen, sisältöpyynnön, kysymyksen tai vikailmoituksen lähettämiseen.",
    faqTitle: "Tärkeät kysymykset selvitetään ennen työn alkua",
  },
};

export default function PublicLandingClient({ config, loggedIn, turnstileSiteKey }: PublicProps) {
  const language = usePublicLanguage();
  const fi = language === "fi";
  const text = content[language];
  const [estimateInput, setEstimateInput] = useState<EstimateInput>({ siteKind: "business", pages: 5, extraLanguages: 0, features: ["analytics"], carePlan: "managed", urgent: false });
  const [estimateForm, setEstimateForm] = useState<FormState>(blankForm);
  const [contactForm, setContactForm] = useState<FormState>(blankForm);
  const [supportForm, setSupportForm] = useState<SupportState>(blankSupport);
  const [estimateStatus, setEstimateStatus] = useState(fi ? "Muokkaa valintoja nähdäksesi arvion." : "Adjust the project to see an estimate.");
  const [contactStatus, setContactStatus] = useState(fi ? "Yhteydenotto ei sido mihinkään." : "The first message creates no obligation.");
  const [supportStatus, setSupportStatus] = useState(fi ? "Projektikoodi yhdistää pyynnön oikeaan asiakkuuteen." : "The project code connects the request to the correct client record.");
  const [estimateSending, setEstimateSending] = useState(false);
  const [contactSending, setContactSending] = useState(false);
  const [supportSending, setSupportSending] = useState(false);
  const estimateStarted = useRef(Date.now());
  const contactStarted = useRef(Date.now());
  const supportStarted = useRef(Date.now());
  const estimateTurnstile = useTurnstile(turnstileSiteKey);
  const contactTurnstile = useTurnstile(turnstileSiteKey);
  const supportTurnstile = useTurnstile(turnstileSiteKey);
  const estimate = useMemo(() => calculateEstimate(estimateInput, language), [estimateInput, language]);
  const selectedKind = SITE_KINDS.find((item) => item.value === estimateInput.siteKind) || SITE_KINDS[1];

  function patchEstimate<K extends keyof EstimateInput>(key: K, value: EstimateInput[K]) {
    setEstimateInput((current) => normalizeEstimateInput({ ...current, [key]: value }));
  }
  function toggleFeature(value: string) {
    patchEstimate("features", estimateInput.features.includes(value) ? estimateInput.features.filter((item) => item !== value) : [...estimateInput.features, value]);
  }

  async function submitEstimate() {
    if (!estimateForm.consent || estimateSending) return;
    setEstimateSending(true);
    setEstimateStatus(fi ? "Tallennetaan pyyntöä..." : "Saving your request...");
    try {
      const result = await postJson("/api/public/request", { requestType: "estimate", language, ...estimateForm, estimate: estimateInput, startedAt: estimateStarted.current, sourcePath: "/#estimate", turnstileToken: estimateTurnstile.token });
      setEstimateStatus(fi ? `Pyyntö vastaanotettu. Tunniste: ${result.requestId || "tallennettu"}. Saat henkilökohtaisen tarjouksen tarkistuksen jälkeen.` : `Request received. Reference: ${result.requestId || "saved"}. A personal proposal follows after review.`);
      setEstimateForm(blankForm); estimateStarted.current = Date.now(); estimateTurnstile.reset();
    } catch (error) { setEstimateStatus(error instanceof Error ? error.message : "Request failed."); } finally { setEstimateSending(false); }
  }

  async function submitContact() {
    if (!contactForm.consent || contactSending) return;
    setContactSending(true);
    setContactStatus(fi ? "Lähetetään viestiä..." : "Sending your message...");
    try {
      const result = await postJson("/api/public/request", { requestType: "contact", language, ...contactForm, startedAt: contactStarted.current, sourcePath: "/#contact", turnstileToken: contactTurnstile.token });
      setContactStatus(fi ? `Viesti vastaanotettu. Tunniste: ${result.requestId || "tallennettu"}.` : `Message received. Reference: ${result.requestId || "saved"}.`);
      setContactForm(blankForm); contactStarted.current = Date.now(); contactTurnstile.reset();
    } catch (error) { setContactStatus(error instanceof Error ? error.message : "Message failed."); } finally { setContactSending(false); }
  }

  async function submitSupport() {
    if (!supportForm.consent || supportSending) return;
    setSupportSending(true);
    setSupportStatus(fi ? "Tallennetaan tukipyyntöä..." : "Saving the support request...");
    try {
      const result = await postJson("/api/public/support", { language, ...supportForm, startedAt: supportStarted.current, turnstileToken: supportTurnstile.token });
      setSupportStatus(fi ? `Pyyntö tallennettu. Tunniste: ${result.requestId || "tallennettu"}.` : `Request saved. Reference: ${result.requestId || "saved"}.`);
      setSupportForm(blankSupport); supportStarted.current = Date.now(); supportTurnstile.reset();
    } catch (error) { setSupportStatus(error instanceof Error ? error.message : "Support request failed."); } finally { setSupportSending(false); }
  }

  const script = turnstileSiteKey ? <Script src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit" strategy="afterInteractive" onLoad={() => window.setTimeout(() => { estimateTurnstile.render(); contactTurnstile.render(); supportTurnstile.render(); }, 0)} /> : null;
  const packageData = fi ? [
    ["Yhden sivun aloitussivusto", "alkaen 890 €", "Yksi pitkä sivu, palvelut, yhteystiedot, lomake, mobiilitestaus ja julkaisu."],
    ["Täysi yrityssivusto", "alkaen 1 490 €", "Tyypillisesti 5 sivua, yksilöllinen ulkoasu, perustason hakunäkyvyys, lomake ja julkaisu."],
    ["Laajempi tai toiminnallinen sivusto", "alkaen 2 290 €", "Ajanvaraus, tarjouspyynnöt, laajat palvelut tai muu selkeä lisätoiminto."],
  ] : [
    ["One-page launch site", "from €890", "One focused page, services, contact details, form, mobile testing and launch."],
    ["Complete company website", "from €1,490", "Typically five pages, custom design, search basics, contact form and launch."],
    ["Larger or functional website", "from €2,290", "Booking, structured quote requests, larger service catalogues or another defined function."],
  ];

  return <>
    {script}
    {loggedIn && !config.legalReady && <div className="admin-legal-warning">ADMIN: add the legal business name, Business ID, address and public email in Vercel before accepting paid work.</div>}
    <section className="public-hero" id="top">
      <div className="public-hero-copy">
        <p className="eyebrow">{text.eyebrow}</p><h1>{text.title}</h1><p className="public-lead">{text.lead}</p>
        <div className="public-actions"><a className="public-primary" href="#estimate">{text.estimateButton}</a><a className="buttonlike" href="#contact">{text.contactButton}</a><a className="buttonlike" href="#support">{text.supportButton}</a>{loggedIn && <a className="buttonlike" href="/dashboard">dashboard</a>}</div>
        <div className="public-proof-row">{text.highlights.map((item) => <span key={item}>{item}</span>)}</div>
      </div>
      <div className="public-terminal-preview"><div className="terminal-preview-head"><span/><span/><span/><strong>{fi ? "PROJEKTIN TILA" : "PROJECT STATUS"}</strong></div><div className="terminal-preview-body">
        <p><b>01</b> {fi ? "laajuus ja vastuut sovittu" : "scope and responsibilities agreed"} <em>{fi ? "valmis" : "done"}</em></p>
        <p><b>02</b> {fi ? "ulkoasu ja sisältö" : "design and content"} <em>{fi ? "työn alla" : "active"}</em></p>
        <p><b>03</b> {fi ? "testaus ja hyväksyntä" : "testing and approval"} <em>{fi ? "jonossa" : "queued"}</em></p>
        <p><b>04</b> {fi ? "verkkotunnus ja julkaisu" : "domain and launch"} <em>{fi ? "jonossa" : "queued"}</em></p>
        <div className="terminal-meter"><span style={{ width: "48%" }}/></div><small>{fi ? "Sopimus kertoo hinnan, omistuksen, aikataulun ja ylläpidon." : "The agreement states the price, ownership, schedule and maintenance."}</small>
      </div></div>
    </section>

    <section className="public-section" id="services"><div className="public-section-head"><p className="eyebrow">{fi ? "PALVELU" : "THE SERVICE"}</p><h2>{text.servicesTitle}</h2><p>{text.servicesLead}</p></div><div className="public-card-grid">
      {(fi ? [
        ["01","Suunnittelu selkokielellä","Selvitämme, mitä asiakkaiden pitää löytää, ymmärtää ja pystyä tekemään sivustolla."],
        ["02","Ulkoasu ja rakentaminen","Rakennamme yritykselle oman mobiiliystävällisen sivuston valmiin geneerisen teeman sijaan."],
        ["03","Tekstit ja hakunäkyvyys","Palvelut, otsikot, yhteystiedot ja hakukoneiden tekniset perusteet tehdään selkeiksi."],
        ["04","Yhteydenotot ja toiminnot","Lomakkeet, ajanvaraus, maksaminen tai tietojen tallennus lisätään vain todelliseen tarpeeseen."],
        ["05","Julkaisu ja omistus","Verkkotunnus, HTTPS, Vercel ja tarvittavat palvelut yhdistetään. Omistajat kirjataan sopimukseen."],
        ["06","Ylläpito ja muutokset","Julkaisun jälkeen voit valita luovutuksen tai kuukausittaisen ylläpidon yhdellä tukikanavalla."],
      ] : [
        ["01","Plain-language planning","We identify what customers must find, understand and be able to do on the website."],
        ["02","Design and development","A mobile-friendly website is built for the business instead of forcing it into a generic theme."],
        ["03","Content and search basics","Services, headings, contact details and technical search foundations are made clear."],
        ["04","Contact and useful functions","Forms, booking, payments or data storage are added only when the business genuinely needs them."],
        ["05","Launch and ownership","The domain, HTTPS, Vercel and required services are connected. Account owners are written into the agreement."],
        ["06","Care and change requests","After launch, choose full handoff or monthly care with one support channel."],
      ]).map(([number,title,body]) => <article className="public-card" key={number}><span>{number}</span><h3>{title}</h3><p>{body}</p></article>)}</div></section>

    <section className="public-section public-platform" id="how-it-works"><div className="public-section-head"><p className="eyebrow">{fi ? "TYÖVAIHEET" : "WORKFLOW"}</p><h2>{text.processTitle}</h2></div><div className="platform-flow">
      {(fi ? [["1","Kartoitus","Tavoite, sivut, sisältö, vastuut ja budjetti."],["2","Kirjallinen tarjous","Kiinteä laajuus, hinta, aikataulu, omistus ja maksuerät."],["3","Rakennus ja tarkistus","Yksityinen esikatselu, korjauskierrokset ja testaus."],["4","Julkaisu ja tuki","Verkkotunnus julkaistaan ja ylläpito tai luovutus alkaa."]] : [["1","Discovery","Goals, pages, content, responsibilities and budget."],["2","Written proposal","Fixed scope, price, schedule, ownership and payment stages."],["3","Build and review","Private preview, agreed revisions and testing."],["4","Launch and support","The domain goes live and care or handoff begins."]]).map(([number,title,body], index) => <div className="flow-fragment" key={number}><div><b>{number}</b><h3>{title}</h3><p>{body}</p></div>{index < 3 && <i>→</i>}</div>)}
    </div><div className="ownership-note"><strong>{fi ? "Tekniikka lyhyesti:" : "Technology in plain language:"}</strong> {fi ? "Vercel pitää sivuston verkossa. Neon tai muu tietokanta tarvitaan vain, jos tietoja pitää tallentaa. Tavallinen yrityksen esittelysivusto ei yleensä tarvitse tietokantaa." : "Vercel keeps the website online. Neon or another database is used only when information must be stored. A normal company information website usually does not need a database."}</div></section>

    <section className="public-section" id="pricing"><div className="public-section-head"><p className="eyebrow">{fi ? "HINNAT" : "PRICING"}</p><h2>{text.pricingTitle}</h2><p>{text.pricingLead}</p></div><div className="pricing-grid">{packageData.map(([title,price,description]) => <article className="price-card" key={title}><h3>{title}</h3><strong>{price}</strong><p>{description}</p><a className="buttonlike" href="#estimate">{fi ? "muokkaa arviota" : "customise estimate"}</a></article>)}</div><p className="pricing-tax-note">{config.vatRegistered ? (fi ? `Hinnat ilman arvonlisäveroa. ALV ${config.vatRate} % lisätään.` : `Prices exclude VAT. VAT at ${config.vatRate}% is added.`) : (fi ? "Lopullinen tarjous kertoo verokäsittelyn. Kolmannen osapuolen maksut eritellään aina." : "The final proposal states the tax treatment. Third-party fees are always itemised.")}</p></section>

    <section className="public-section estimate-section" id="estimate"><div className="public-section-head"><p className="eyebrow">{fi ? "HINTA-ARVIO" : "PROJECT ESTIMATE"}</p><h2>{text.estimateTitle}</h2><p>{text.estimateLead}</p></div><div className="estimate-layout"><div className="estimate-controls stack">
      <label>{fi ? "Minkälaisen sivuston tarvitset?" : "What kind of website do you need?"}<select value={estimateInput.siteKind} onChange={(event) => patchEstimate("siteKind", event.target.value as SiteKind)}>{SITE_KINDS.map((item) => <option key={item.value} value={item.value}>{fi ? item.labelFi : item.label}</option>)}</select></label>
      <p className="muted small">{fi ? selectedKind.descriptionFi : selectedKind.description}</p>
      <label>{fi ? "Kuinka monta erillistä sivua arviolta?" : "Approximately how many separate pages?"}<input type="number" min={1} max={60} value={estimateInput.pages} onChange={(event) => patchEstimate("pages", Number(event.target.value))}/><small>{fi ? "Esimerkiksi etusivu, palvelut, yritys, referenssit ja yhteystiedot = 5 sivua." : "For example: home, services, company, work examples and contact = 5 pages."}</small></label>
      <label>{fi ? "Kuinka monta lisäkieltä suomen tai englannin lisäksi?" : "How many additional languages beyond the main language?"}<input type="number" min={0} max={5} value={estimateInput.extraLanguages} onChange={(event) => patchEstimate("extraLanguages", Number(event.target.value))}/></label>
      <fieldset className="estimate-fieldset"><legend>{fi ? "Mitä muuta sivuston pitää tehdä?" : "What else should the website do?"}</legend><div className="estimate-options">{FEATURE_OPTIONS.map((item) => <label className="check-card" key={item.value}><input type="checkbox" checked={estimateInput.features.includes(item.value)} onChange={() => toggleFeature(item.value)}/><span><b>{fi ? item.labelFi : item.label}</b><small>{fi ? item.descriptionFi : item.description} · +{euro(item.price)}</small></span></label>)}</div></fieldset>
      <fieldset className="estimate-fieldset"><legend>{fi ? "Mitä tapahtuu julkaisun jälkeen?" : "What happens after launch?"}</legend><div className="care-options">{CARE_PLANS.map((item) => <label className={`care-card ${estimateInput.carePlan === item.value ? "active" : ""}`} key={item.value}><input type="radio" name="care" checked={estimateInput.carePlan === item.value} onChange={() => patchEstimate("carePlan", item.value as CarePlan)}/><span><b>{fi ? item.labelFi : item.label} — {euro(item.monthly)}/{fi ? "kk" : "mo"}</b><small>{fi ? item.descriptionFi : item.description}</small></span></label>)}</div></fieldset>
      <label className="check-card urgency"><input type="checkbox" checked={estimateInput.urgent} onChange={(event) => patchEstimate("urgent", event.target.checked)}/><span><b>{fi ? "Kiireellinen toimitus" : "Priority delivery"}</b><small>{fi ? "Lyhyempi aikataulu, jos kapasiteettia on (+25 %)." : "A shorter schedule when capacity is available (+25%)."}</small></span></label>
    </div><aside className="estimate-result stack"><p className="badge">{fi ? "SUUNNITTELUARVIO" : "PLANNING ESTIMATE"}</p><div className="estimate-price"><small>{fi ? "kertaluonteinen rakennustyö" : "one-time website build"}</small><strong>{euro(estimate.setupLow)}–{euro(estimate.setupHigh)}</strong></div>{estimate.vatRegistered && <p className="muted small">{fi ? `ALV ${estimate.vatRate} % kanssa` : `including ${estimate.vatRate}% VAT`}: {euro(estimate.setupLowWithVat)}–{euro(estimate.setupHighWithVat)}</p>}<div className="estimate-monthly"><small>{fi ? "valittu jatkuva palvelu" : "selected ongoing service"}</small><strong>{euro(estimate.monthly)}/{fi ? "kk" : "month"}</strong></div><p><b>{fi ? "Tavallinen toimitusaika:" : "Typical delivery:"}</b> {estimate.deliveryWeeks}</p><ul>{estimate.included.map((item) => <li key={item}>{item}</li>)}</ul><details><summary>{fi ? "Arvion oletukset" : "Estimate assumptions"}</summary>{estimate.assumptions.map((item) => <p className="small muted" key={item}>{item}</p>)}</details><hr/><h3>{fi ? "Pyydä henkilökohtainen tarjous" : "Request a personal proposal"}</h3>
      <div className="form-grid"><label>{fi ? "Nimi" : "Your name"}<input value={estimateForm.name} onChange={(event) => setEstimateForm({...estimateForm,name:event.target.value})} autoComplete="name"/></label><label>{fi ? "Yrityksen nimi" : "Business name"}<input value={estimateForm.company} onChange={(event) => setEstimateForm({...estimateForm,company:event.target.value})} autoComplete="organization"/></label><label>{fi ? "Sähköposti" : "Email"}<input type="email" value={estimateForm.email} onChange={(event) => setEstimateForm({...estimateForm,email:event.target.value})} autoComplete="email"/></label><label>{fi ? "Puhelin, valinnainen" : "Phone, optional"}<input value={estimateForm.phone} onChange={(event) => setEstimateForm({...estimateForm,phone:event.target.value})} autoComplete="tel"/></label></div>
      <label>{fi ? "Nykyinen sivusto, valinnainen" : "Current website, optional"}<input value={estimateForm.website} onChange={(event) => setEstimateForm({...estimateForm,website:event.target.value})} placeholder="example.fi"/></label><label>{fi ? "Muu tärkeä tieto" : "Anything else we should know?"}<textarea value={estimateForm.message} onChange={(event) => setEstimateForm({...estimateForm,message:event.target.value})} rows={4}/></label><label className="honeypot" aria-hidden="true">Website<input tabIndex={-1} autoComplete="off" value={estimateForm.companyWebsite} onChange={(event) => setEstimateForm({...estimateForm,companyWebsite:event.target.value})}/></label><label className="consent-row"><input type="checkbox" checked={estimateForm.consent} onChange={(event) => setEstimateForm({...estimateForm,consent:event.target.checked})}/><span>{fi ? "Hyväksyn, että tietojani käytetään tähän pyyntöön vastaamiseen." : "I agree that my details may be used to answer this request."} <a href="/privacy">{fi ? "Tietosuojaseloste" : "Privacy notice"}</a>.</span></label>{turnstileSiteKey && <div ref={estimateTurnstile.container} className="turnstile-slot"/>}<button className="public-primary" onClick={submitEstimate} disabled={estimateSending || !estimateForm.consent || !estimateForm.name.trim() || !estimateForm.company.trim() || !estimateForm.email.trim()}>{estimateSending ? (fi ? "lähetetään..." : "sending...") : (fi ? "lähetä tarjouspyyntö" : "send proposal request")}</button><p className="form-status">{estimateStatus}</p>
    </aside></div></section>

    <section className="public-section" id="faq"><div className="public-section-head"><p className="eyebrow">FAQ</p><h2>{text.faqTitle}</h2></div><div className="faq-grid">{(fi ? [
      ["Kuka omistaa sivuston?","Suositus on, että asiakas omistaa verkkotunnuksen ja tuotantotilit. Lähdekoodin, materiaalien, palvelutilien ja siirron ehdot kirjataan projektisopimukseen."],
      ["Tarvitaanko aina Vercel ja Neon?","Vercel sopii modernin sivuston julkaisuun. Neon tai muu tietokanta tarvitaan vain, jos sivusto tallentaa tietoja. Tavallinen esittelysivusto ei yleensä tarvitse tietokantaa."],
      ["Voiko sivuston siirtää myöhemmin?","Kyllä. Lähdekoodi, tilien omistus ja ulkopuoliset palvelut dokumentoidaan, jotta hallittu siirto on mahdollinen."],
      ["Sisältyvätkö verkkotunnus ja muut palvelut hintaan?","Vain jos kirjallinen tarjous sanoo niin. Verkkotunnus, maksullinen sähköposti, ajanvaraus, viestit, maksaminen ja muut ulkopuoliset palvelut eritellään."],
      ["Onko hinta-arvio sitova?","Ei. Sitova tilaus syntyy vasta, kun molemmat osapuolet hyväksyvät kirjallisen tarjouksen tai projektisopimuksen."],
      ["Voiko sivuston tilata ilman teknistä osaamista?","Kyllä. Asiakkaan tehtävä on antaa oikeat yritystiedot, palvelut, kuvat ja hyväksynnät. Tekninen toteutus selitetään tavallisella kielellä."],
    ] : [
      ["Who owns the website?","The recommended arrangement is that the client owns the domain and production accounts. Source-code, content, service-account and transfer terms are written into the project agreement."],
      ["Does every site need Vercel and Neon?","Vercel is suitable for deploying a modern website. Neon or another database is used only when information must be stored. A normal information website usually does not need a database."],
      ["Can the website be moved later?","Yes. Source access, account ownership and external services are documented so a controlled transfer is possible."],
      ["Are the domain and external services included?","Only when the written proposal says so. Domains, paid email, booking, messaging, payment processing and other third-party services are itemised."],
      ["Is the calculator binding?","No. A binding order is created only when both parties accept a written proposal or project agreement."],
      ["Can I order a website without technical knowledge?","Yes. The client supplies accurate business information, services, images and approvals. Technical decisions are explained in ordinary language."],
    ]).map(([question,answer]) => <details key={question}><summary>{question}</summary><p>{answer}</p></details>)}</div></section>

    <section className="public-section contact-section" id="contact"><div className="contact-copy"><p className="eyebrow">{fi ? "UUSI PROJEKTI" : "NEW PROJECT"}</p><h2>{text.contactTitle}</h2><p>{text.contactLead}</p><div className="contact-facts"><span>{config.location}</span>{config.email && <a href={`mailto:${config.email}`}>{config.email}</a>}{config.phone && <a href={`tel:${config.phone}`}>{config.phone}</a>}<span>{fi ? "Palvelu yrityksille ja yhteisöille" : "Service for businesses and organisations"}</span></div></div><div className="contact-form stack"><div className="form-grid"><label>{fi ? "Nimi" : "Your name"}<input value={contactForm.name} onChange={(event) => setContactForm({...contactForm,name:event.target.value})} autoComplete="name"/></label><label>{fi ? "Yritys, valinnainen" : "Business, optional"}<input value={contactForm.company} onChange={(event) => setContactForm({...contactForm,company:event.target.value})} autoComplete="organization"/></label><label>{fi ? "Sähköposti" : "Email"}<input type="email" value={contactForm.email} onChange={(event) => setContactForm({...contactForm,email:event.target.value})} autoComplete="email"/></label><label>{fi ? "Puhelin, valinnainen" : "Phone, optional"}<input value={contactForm.phone} onChange={(event) => setContactForm({...contactForm,phone:event.target.value})} autoComplete="tel"/></label></div><label>{fi ? "Nykyinen sivusto, valinnainen" : "Current website, optional"}<input value={contactForm.website} onChange={(event) => setContactForm({...contactForm,website:event.target.value})} placeholder="example.fi"/></label><label>{fi ? "Kuvaile tarve" : "Describe the need"}<textarea rows={7} value={contactForm.message} onChange={(event) => setContactForm({...contactForm,message:event.target.value})} placeholder={fi ? "Tarvitsemme selkeämmän mobiilisivuston, tarjouspyyntölomakkeen ja apua verkkotunnuksen siirtoon..." : "We need a clearer mobile website, a quote form and help moving the domain..."}/></label><label className="honeypot" aria-hidden="true">Website<input tabIndex={-1} autoComplete="off" value={contactForm.companyWebsite} onChange={(event) => setContactForm({...contactForm,companyWebsite:event.target.value})}/></label><label className="consent-row"><input type="checkbox" checked={contactForm.consent} onChange={(event) => setContactForm({...contactForm,consent:event.target.checked})}/><span>{fi ? "Hyväksyn tietojeni käytön tähän viestiin vastaamiseksi." : "I agree that my details may be used to answer this message."} <a href="/privacy">{fi ? "Tietosuojaseloste" : "Privacy notice"}</a>.</span></label>{turnstileSiteKey && <div ref={contactTurnstile.container} className="turnstile-slot"/>}<button className="public-primary" onClick={submitContact} disabled={contactSending || !contactForm.consent || !contactForm.name.trim() || !contactForm.email.trim() || !contactForm.message.trim()}>{contactSending ? (fi ? "lähetetään..." : "sending...") : (fi ? "lähetä viesti" : "send project message")}</button><p className="form-status">{contactStatus}</p></div></section>

    <section className="public-section support-section" id="support"><div className="public-section-head"><p className="eyebrow">{fi ? "ASIAKASTUKI" : "CLIENT SUPPORT"}</p><h2>{text.supportTitle}</h2><p>{text.supportLead}</p></div><div className="support-layout"><div className="support-explainer"><h3>{fi ? "Mitä tällä voi lähettää?" : "What can be sent here?"}</h3><ul><li>{fi ? "teksti- tai kuvamuutos" : "text or image change"}</li><li>{fi ? "uusi sivu tai ominaisuus" : "new page or feature"}</li><li>{fi ? "vika tai sivuston toimimattomuus" : "fault or availability problem"}</li><li>{fi ? "laskutus-, omistus- tai ylläpitokysymys" : "billing, ownership or maintenance question"}</li><li>{fi ? "muistiinpano tulevaa työtä varten" : "note for future work"}</li></ul><p className="muted">{fi ? "Pyyntö tallentuu suoraan kyseisen asiakkaan projektihistoriaan. Kiireellinen valinta ei takaa välitöntä työtä, mutta nostaa pyynnön etusijalle." : "The request is stored directly in that client's project history. Choosing urgent does not guarantee immediate work, but marks the request as a priority."}</p></div><div className="contact-form stack"><div className="form-grid"><label>{fi ? "Yksityinen projektikoodi" : "Private project code"}<input value={supportForm.token} onChange={(event) => setSupportForm({...supportForm,token:event.target.value})} autoComplete="off"/></label><label>{fi ? "Nimi" : "Your name"}<input value={supportForm.name} onChange={(event) => setSupportForm({...supportForm,name:event.target.value})} autoComplete="name"/></label><label>{fi ? "Sähköposti" : "Email"}<input type="email" value={supportForm.email} onChange={(event) => setSupportForm({...supportForm,email:event.target.value})} autoComplete="email"/></label><label>{fi ? "Pyynnön tyyppi" : "Request type"}<select value={supportForm.type} onChange={(event) => setSupportForm({...supportForm,type:event.target.value})}><option value="change">{fi ? "sisältö- tai muutosspyyntö" : "content or change request"}</option><option value="fault">{fi ? "vika tai häiriö" : "fault or incident"}</option><option value="feature">{fi ? "uusi toiminto" : "new feature"}</option><option value="billing">{fi ? "laskutus tai sopimus" : "billing or agreement"}</option><option value="note">{fi ? "muistiinpano" : "note"}</option></select></label><label>{fi ? "Kiireellisyys" : "Priority"}<select value={supportForm.priority} onChange={(event) => setSupportForm({...supportForm,priority:event.target.value})}><option value="low">{fi ? "ei kiire" : "not urgent"}</option><option value="normal">{fi ? "tavallinen" : "normal"}</option><option value="high">{fi ? "tärkeä" : "important"}</option><option value="urgent">{fi ? "sivusto ei toimi" : "site is not working"}</option></select></label></div><label>{fi ? "Aihe" : "Subject"}<input value={supportForm.subject} onChange={(event) => setSupportForm({...supportForm,subject:event.target.value})}/></label><label>{fi ? "Pyyntö tai muistiinpano" : "Request or note"}<textarea rows={7} value={supportForm.message} onChange={(event) => setSupportForm({...supportForm,message:event.target.value})}/></label><label className="honeypot" aria-hidden="true">Website<input tabIndex={-1} autoComplete="off" value={supportForm.companyWebsite} onChange={(event) => setSupportForm({...supportForm,companyWebsite:event.target.value})}/></label><label className="consent-row"><input type="checkbox" checked={supportForm.consent} onChange={(event) => setSupportForm({...supportForm,consent:event.target.checked})}/><span>{fi ? "Hyväksyn tietojeni käytön tämän asiakaspyynnön käsittelyyn." : "I agree that my details may be used to handle this client request."} <a href="/privacy">{fi ? "Tietosuojaseloste" : "Privacy notice"}</a>.</span></label>{turnstileSiteKey && <div ref={supportTurnstile.container} className="turnstile-slot"/>}<button className="public-primary" onClick={submitSupport} disabled={supportSending || !supportForm.consent || !supportForm.token.trim() || !supportForm.name.trim() || !supportForm.email.trim() || !supportForm.subject.trim() || !supportForm.message.trim()}>{supportSending ? (fi ? "tallennetaan..." : "saving...") : (fi ? "lähetä tukipyyntö" : "send support request")}</button><p className="form-status">{supportStatus}</p></div></div></section>

    <footer className="public-footer"><div><strong>{config.serviceName}</strong><p>{fi ? "Yrityssivustot, julkaisu ja hallinnoitu ylläpito." : "Business websites, deployment and managed care."}</p>{config.legalName && <p className="small">{config.legalName}{config.businessId ? ` · ${fi ? "Y-tunnus" : "Business ID"} ${config.businessId}` : ""}</p>}</div><nav><a href="#services">{fi ? "palvelut" : "services"}</a><a href="#pricing">{fi ? "hinnat" : "pricing"}</a><a href="#contact">{fi ? "yhteys" : "contact"}</a><a href="/company">{fi ? "yritystiedot" : "company"}</a><a href="/privacy">{fi ? "tietosuoja" : "privacy"}</a><a href="/cookies">{fi ? "evästeet" : "cookies"}</a><a href="/terms">{fi ? "ehdot" : "terms"}</a><a href="/accessibility">{fi ? "saavutettavuus" : "accessibility"}</a></nav></footer>
  </>;
}
