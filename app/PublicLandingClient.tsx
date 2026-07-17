"use client";

import Script from "next/script";
import { useMemo, useRef, useState } from "react";
import BrandMark from "./BrandMark";
import { usePublicLanguage } from "./PublicHeaderNav";
import {
  CARE_PLANS,
  FEATURE_OPTIONS,
  SITE_KINDS,
  calculateEstimate,
  euro,
  normalizeEstimateInput,
  type CarePlan,
  type EstimateInput,
  type SiteKind,
} from "@/lib/estimate";

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
type FormState = {
  name: string;
  company: string;
  email: string;
  phone: string;
  website: string;
  message: string;
  consent: boolean;
  companyWebsite: string;
};

const blankForm: FormState = { name: "", company: "", email: "", phone: "", website: "", message: "", consent: false, companyWebsite: "" };

function useTurnstile(siteKey: string) {
  const container = useRef<HTMLDivElement | null>(null);
  const widgetId = useRef("");
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

const copy = {
  en: {
    eyebrow: "WEBSITES AND DIGITAL SERVICES FOR FINNISH BUSINESSES",
    title: "A website that helps customers find, trust and contact your business.",
    lead: "Raccoon Signal plans, builds and launches the whole website for you. Everything is explained clearly, ownership is written down, and help remains available after launch.",
    primary: "Get a price estimate",
    secondary: "Discuss a project",
    serviceTitle: "One clear service from idea to a working website",
    serviceLead: "You explain the business and the result you need. We handle the design, technology, launch and agreed ongoing care.",
    deliverTitle: "What every project includes",
    processTitle: "A simple, documented process",
    pricingTitle: "Clear starting prices",
    pricingLead: "The calculator gives a planning range. A written proposal confirms the exact work, fixed price, VAT treatment, timetable and ownership before anything begins.",
    estimateTitle: "Build your project estimate",
    estimateLead: "Choose what the business needs in everyday language. No technical knowledge is required.",
    contactTitle: "Tell us what should improve",
    contactLead: "A short description is enough. You will receive questions and a written proposal before committing to anything.",
    faqTitle: "Questions businesses usually ask",
  },
  fi: {
    eyebrow: "VERKKOSIVUT JA DIGIPALVELUT SUOMALAISILLE YRITYKSILLE",
    title: "Verkkosivusto, jonka avulla asiakkaat löytävät, luottavat ja ottavat yhteyttä.",
    lead: "Raccoon Signal suunnittelee, rakentaa ja julkaisee koko verkkosivuston puolestasi. Kaikki selitetään selkeästi, omistus kirjataan ja apua on saatavilla myös julkaisun jälkeen.",
    primary: "Laske hinta-arvio",
    secondary: "Keskustele projektista",
    serviceTitle: "Yksi selkeä palvelu ideasta toimivaan sivustoon",
    serviceLead: "Sinä kerrot yrityksestä ja halutusta lopputuloksesta. Me hoidamme ulkoasun, tekniikan, julkaisun ja sovitun ylläpidon.",
    deliverTitle: "Mitä jokaiseen projektiin kuuluu",
    processTitle: "Yksinkertainen ja dokumentoitu prosessi",
    pricingTitle: "Selkeät aloitushinnat",
    pricingLead: "Laskuri antaa suunnitteluarvion. Kirjallinen tarjous vahvistaa tarkan työn, kiinteän hinnan, verokäsittelyn, aikataulun ja omistuksen ennen työn alkua.",
    estimateTitle: "Muodosta projektin hinta-arvio",
    estimateLead: "Valitse yrityksen tarpeet tavallisella kielellä. Teknistä osaamista ei tarvita.",
    contactTitle: "Kerro, mitä pitäisi parantaa",
    contactLead: "Lyhyt kuvaus riittää. Saat tarkentavat kysymykset ja kirjallisen tarjouksen ennen sitoutumista.",
    faqTitle: "Yritysten tavallisimmat kysymykset",
  },
};

export default function PublicLandingClient({ config, loggedIn, turnstileSiteKey }: PublicProps) {
  const language = usePublicLanguage();
  const fi = language === "fi";
  const text = copy[language];
  const [estimateInput, setEstimateInput] = useState<EstimateInput>({ siteKind: "business", pages: 5, extraLanguages: 0, features: ["analytics"], carePlan: "managed", urgent: false });
  const [estimateForm, setEstimateForm] = useState<FormState>(blankForm);
  const [contactForm, setContactForm] = useState<FormState>(blankForm);
  const [estimateStatus, setEstimateStatus] = useState("");
  const [contactStatus, setContactStatus] = useState("");
  const [estimateSending, setEstimateSending] = useState(false);
  const [contactSending, setContactSending] = useState(false);
  const estimateStarted = useRef(Date.now());
  const contactStarted = useRef(Date.now());
  const estimateTurnstile = useTurnstile(turnstileSiteKey);
  const contactTurnstile = useTurnstile(turnstileSiteKey);
  const estimate = useMemo(() => calculateEstimate(estimateInput, language), [estimateInput, language]);

  function patchEstimate<K extends keyof EstimateInput>(key: K, value: EstimateInput[K]) {
    setEstimateInput((current) => normalizeEstimateInput({ ...current, [key]: value }));
  }
  function toggleFeature(value: string) {
    patchEstimate("features", estimateInput.features.includes(value) ? estimateInput.features.filter((item) => item !== value) : [...estimateInput.features, value]);
  }

  async function submitEstimate() {
    if (!estimateForm.consent || estimateSending) return;
    setEstimateSending(true);
    setEstimateStatus(fi ? "Lähetetään tarjouspyyntöä…" : "Sending your proposal request…");
    try {
      const result = await postJson("/api/public/request", {
        requestType: "estimate", language, ...estimateForm, estimate: estimateInput,
        startedAt: estimateStarted.current, sourcePath: "/#estimate", turnstileToken: estimateTurnstile.token,
      });
      setEstimateStatus(fi ? `Pyyntö vastaanotettu. Viite ${result.requestId || "tallennettu"}. Saat henkilökohtaisen vastauksen tarkistuksen jälkeen.` : `Request received. Reference ${result.requestId || "saved"}. You will receive a personal response after review.`);
      setEstimateForm(blankForm);
      estimateStarted.current = Date.now();
      estimateTurnstile.reset();
    } catch (error) {
      setEstimateStatus(error instanceof Error ? error.message : (fi ? "Lähetys epäonnistui." : "Sending failed."));
    } finally {
      setEstimateSending(false);
    }
  }

  async function submitContact() {
    if (!contactForm.consent || contactSending) return;
    setContactSending(true);
    setContactStatus(fi ? "Lähetetään viestiä…" : "Sending your message…");
    try {
      const result = await postJson("/api/public/request", {
        requestType: "contact", language, ...contactForm,
        startedAt: contactStarted.current, sourcePath: "/#contact", turnstileToken: contactTurnstile.token,
      });
      setContactStatus(fi ? `Viesti vastaanotettu. Viite ${result.requestId || "tallennettu"}.` : `Message received. Reference ${result.requestId || "saved"}.`);
      setContactForm(blankForm);
      contactStarted.current = Date.now();
      contactTurnstile.reset();
    } catch (error) {
      setContactStatus(error instanceof Error ? error.message : (fi ? "Lähetys epäonnistui." : "Sending failed."));
    } finally {
      setContactSending(false);
    }
  }

  const services = fi ? [
    ["01", "Suunnittelu", "Selvitämme tavoitteen, asiakkaat, tarvittavat sivut, sisällön ja budjetin ilman teknistä sanastoa."],
    ["02", "Ulkoasu ja sisältö", "Rakennamme yritykselle oman selkeän ilmeen ja autamme muotoilemaan palvelut asiakkaalle ymmärrettäviksi."],
    ["03", "Rakentaminen ja testaus", "Sivusto toimii puhelimella ja tietokoneella. Lomakkeet, nopeus, saavutettavuus ja hakukoneiden perusteet testataan."],
    ["04", "Julkaisu ja ylläpito", "Yhdistämme verkkotunnuksen, dokumentoimme omistuksen ja hoidamme sovitut muutokset myös julkaisun jälkeen."],
  ] : [
    ["01", "Planning", "We define the goal, customers, pages, content and budget without technical jargon."],
    ["02", "Design and content", "We create a clear visual identity and help explain the business in language customers understand."],
    ["03", "Build and testing", "The site works on phones and computers. Forms, speed, accessibility and search basics are tested."],
    ["04", "Launch and care", "We connect the domain, document ownership and handle agreed updates after launch."],
  ];

  const deliverables = fi ? [
    ["Mobiili ja tietokone", "Sama sivusto mukautuu pienelle ja suurelle näytölle."],
    ["Selkeä yhteydenotto", "Puhelin, sähköposti ja lomakkeet löytyvät ilman etsimistä."],
    ["Turvallinen julkaisu", "HTTPS, ympäristömuuttujat ja tarvittavat palvelut asetetaan oikein."],
    ["Omistus kirjallisesti", "Verkkotunnuksen, tilien, sisällön ja lähdekoodin vastuut sovitaan."],
    ["Testaus ennen julkaisua", "Linkit, lomakkeet, tärkeät selaimet ja laitteet tarkistetaan."],
    ["Luovutus tai ylläpito", "Voit ottaa sivuston haltuun tai valita jatkuvan hoidon."],
  ] : [
    ["Phone and desktop", "One website adapts cleanly to small and large screens."],
    ["Easy contact", "Phone, email and forms are visible without searching."],
    ["Secure launch", "HTTPS, environment variables and required services are configured correctly."],
    ["Ownership in writing", "Responsibilities for the domain, accounts, content and source code are agreed."],
    ["Testing before launch", "Links, forms, important browsers and devices are checked."],
    ["Handoff or ongoing care", "Take full control or choose continued management."],
  ];

  const process = fi ? [
    ["1", "Kartoitus", "Kerro yrityksestä, asiakkaista ja tavoitteesta."],
    ["2", "Kirjallinen tarjous", "Saat tarkat sisällöt, hinnan, aikataulun ja omistuksen."],
    ["3", "Rakennus ja esikatselu", "Näet yksityisen version ja annat sovitut korjaukset."],
    ["4", "Julkaisu ja tuki", "Sivusto julkaistaan ja sovittu ylläpito tai luovutus alkaa."],
  ] : [
    ["1", "Discovery", "Tell us about the business, customers and goal."],
    ["2", "Written proposal", "Receive the exact scope, price, schedule and ownership terms."],
    ["3", "Build and preview", "Review a private version and request the agreed revisions."],
    ["4", "Launch and support", "The site goes live and the agreed care or handoff begins."],
  ];

  const packages = fi ? [
    { name: "Aloitussivusto", price: "alkaen 890 €", description: "Yksi selkeä sivu yritykselle, joka tarvitsee nopeasti uskottavan verkkoläsnäolon.", items: ["palvelut ja yhteystiedot", "yhteydenottolomake", "mobiilitestaus ja julkaisu"] },
    { name: "Yrityssivusto", price: "alkaen 1 490 €", description: "Tavallisin kokonaisuus pienelle yritykselle, jolla on useita palveluita tai sisältöjä.", items: ["tyypillisesti viisi sivua", "yksilöllinen ulkoasu", "hakukoneiden perusteet ja julkaisu"], popular: true },
    { name: "Toiminnallinen sivusto", price: "alkaen 2 290 €", description: "Kun sivustolla tarvitaan ajanvarausta, tarkempia tarjouspyyntöjä tai muuta toimintoa.", items: ["määritelty lisätoiminto", "tietojen turvallinen käsittely", "laajempi testaus ja käyttöönotto"] },
  ] : [
    { name: "Launch website", price: "from €890", description: "One clear page for a business that needs a credible online presence quickly.", items: ["services and contact details", "contact form", "mobile testing and launch"] },
    { name: "Company website", price: "from €1,490", description: "The most common option for a small business with several services or content areas.", items: ["typically five pages", "custom visual design", "search basics and launch"], popular: true },
    { name: "Functional website", price: "from €2,290", description: "For booking, structured quote requests or another clearly defined function.", items: ["defined extra function", "safe handling of information", "broader testing and setup"] },
  ];

  const faq = fi ? [
    ["Kuka omistaa sivuston?", "Suositus on, että asiakas omistaa verkkotunnuksen ja tuotantotilit. Kaikki omistus- ja käyttöoikeudet kirjoitetaan tarjoukseen tai sopimukseen."],
    ["Tarvitaanko tietokantaa?", "Ei yleensä. Tavallinen yrityksen esittelysivusto toimii ilman tietokantaa. Se lisätään vain, jos sivusto tallentaa esimerkiksi varauksia, viestejä tai käyttäjätietoja."],
    ["Onko laskurin hinta lopullinen?", "Ei. Laskuri on suuntaa-antava. Lopullinen kiinteä hinta syntyy vasta kirjallisesta tarjouksesta, jonka molemmat osapuolet hyväksyvät."],
    ["Mitä minun pitää toimittaa?", "Oikeat yritystiedot, palvelut, hinnat tarvittaessa, kuvat tai lupa hankkia niitä sekä palautteet ja hyväksynnät sovitussa ajassa."],
    ["Voiko sivuston siirtää myöhemmin?", "Kyllä. Tilit, lähdekoodi ja ulkopuoliset palvelut dokumentoidaan niin, että hallittu siirto on mahdollinen."],
    ["Tarvitsenko teknistä osaamista?", "Et. Kaikki päätökset selitetään tavallisella kielellä ja saat kirjallisen yhteenvedon siitä, mitä rakennetaan ja kuka omistaa mitäkin."],
  ] : [
    ["Who owns the website?", "The recommended arrangement is that the client owns the domain and production accounts. All ownership and licence terms are written into the proposal or agreement."],
    ["Does the site need a database?", "Usually not. A normal business information website works without one. A database is added only when the site stores bookings, messages, user information or similar data."],
    ["Is the calculator price final?", "No. It is a planning range. The final fixed price comes from a written proposal accepted by both parties."],
    ["What must I provide?", "Accurate business details, services, prices when relevant, images or permission to source them, and feedback and approvals within the agreed time."],
    ["Can the site be moved later?", "Yes. Accounts, source code and external services are documented so a controlled transfer is possible."],
    ["Do I need technical knowledge?", "No. Decisions are explained in ordinary language and you receive a written summary of what is being built and who owns each part."],
  ];

  const script = turnstileSiteKey ? <Script src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit" strategy="afterInteractive" onLoad={() => window.setTimeout(() => { estimateTurnstile.render(); contactTurnstile.render(); }, 0)} /> : null;

  return <>
    {script}
    {loggedIn && !config.legalReady && <div className="admin-legal-warning"><strong>Admin notice:</strong> add the legal company name, Business ID, postal address and public email in Vercel before accepting paid work.</div>}

    <section className="public-hero" id="top">
      <div className="public-hero-copy">
        <p className="eyebrow">{text.eyebrow}</p>
        <h1>{text.title}</h1>
        <p className="public-lead">{text.lead}</p>
        <div className="public-actions">
          <a className="public-primary" href="#estimate">{text.primary}</a>
          <a className="public-secondary" href="#contact">{text.secondary}</a>
          <a className="public-tertiary" href="/support">{fi ? "Nykyisen asiakkaan tuki" : "Existing client support"}</a>
        </div>
        <div className="public-proof-row" aria-label={fi ? "Palvelulupaukset" : "Service promises"}>
          <span>{fi ? "Selkeä kirjallinen tarjous" : "Clear written proposal"}</span>
          <span>{fi ? "Toimii puhelimella" : "Built for mobile"}</span>
          <span>{fi ? "Omistus dokumentoidaan" : "Ownership documented"}</span>
          <span>{fi ? "Suomi ja englanti" : "Finnish and English"}</span>
        </div>
      </div>
      <div className="public-project-card" aria-label={fi ? "Esimerkki projektin etenemisestä" : "Example project progress"}>
        <div className="project-card-brand"><BrandMark/><div><small>RACCOON NORTH</small><strong>{fi ? "PROJEKTIN YHTEENVETO" : "PROJECT SUMMARY"}</strong></div><span className="live-pill">{fi ? "AKTIIVINEN" : "ACTIVE"}</span></div>
        <div className="project-score"><span>68%</span><div><strong>{fi ? "Rakennusvaihe" : "Build stage"}</strong><small>{fi ? "Seuraavaksi: asiakkaan tarkistus" : "Next: client review"}</small></div></div>
        <div className="project-progress"><span style={{ width: "68%" }}/></div>
        <ol>
          <li className="done"><b>01</b><span>{fi ? "Laajuus ja vastuut" : "Scope and responsibilities"}</span><em>{fi ? "valmis" : "done"}</em></li>
          <li className="done"><b>02</b><span>{fi ? "Ulkoasu ja sisältö" : "Design and content"}</span><em>{fi ? "valmis" : "done"}</em></li>
          <li className="active"><b>03</b><span>{fi ? "Rakentaminen ja testaus" : "Build and testing"}</span><em>{fi ? "käynnissä" : "active"}</em></li>
          <li><b>04</b><span>{fi ? "Hyväksyntä ja julkaisu" : "Approval and launch"}</span><em>{fi ? "seuraava" : "next"}</em></li>
        </ol>
        <p>{fi ? "Yksi näkymä hinnalle, aikataululle, omistukselle ja pyynnöille." : "One record for price, schedule, ownership and requests."}</p>
      </div>
    </section>

    <section className="trust-strip" aria-label={fi ? "Palvelun periaatteet" : "Service principles"}>
      <div><strong>{fi ? "Ei teknistä sekavuutta" : "No technical confusion"}</strong><span>{fi ? "Päätökset selitetään tavallisella kielellä." : "Decisions are explained in ordinary language."}</span></div>
      <div><strong>{fi ? "Ei piilokuluja" : "No hidden scope"}</strong><span>{fi ? "Kolmannen osapuolen maksut eritellään." : "Third-party costs are itemised."}</span></div>
      <div><strong>{fi ? "Ei asiakaslukkoa" : "No client lock-in"}</strong><span>{fi ? "Omistus ja siirto sovitaan kirjallisesti." : "Ownership and transfer are agreed in writing."}</span></div>
    </section>

    <section className="public-section" id="services">
      <div className="public-section-head"><p className="eyebrow">{fi ? "PALVELU" : "THE SERVICE"}</p><h2>{text.serviceTitle}</h2><p>{text.serviceLead}</p></div>
      <div className="service-steps">{services.map(([number, title, body]) => <article key={number}><span>{number}</span><div><h3>{title}</h3><p>{body}</p></div></article>)}</div>
    </section>

    <section className="public-section deliver-section">
      <div className="public-section-head compact"><p className="eyebrow">{fi ? "TOIMITUS" : "DELIVERY"}</p><h2>{text.deliverTitle}</h2></div>
      <div className="deliver-grid">{deliverables.map(([title, body]) => <article key={title}><span className="check-icon">✓</span><div><h3>{title}</h3><p>{body}</p></div></article>)}</div>
    </section>

    <section className="public-section process-section" id="process">
      <div className="public-section-head"><p className="eyebrow">{fi ? "TYÖVAIHEET" : "PROCESS"}</p><h2>{text.processTitle}</h2><p>{fi ? "Jokainen vaihe hyväksytään ennen seuraavaa, jotta hinta ja vastuut pysyvät selkeinä." : "Each stage is confirmed before the next so price and responsibilities remain clear."}</p></div>
      <div className="process-grid">{process.map(([number, title, body]) => <article key={number}><span>{number}</span><h3>{title}</h3><p>{body}</p></article>)}</div>
      <div className="plain-tech-note"><strong>{fi ? "Tekniikka lyhyesti" : "Technology in plain language"}</strong><p>{fi ? "Vercel pitää sivuston verkossa. Tietokanta lisätään vain, jos tietoja pitää tallentaa. Tavallinen yrityksen esittelysivusto ei yleensä tarvitse tietokantaa." : "Vercel keeps the website online. A database is added only when information must be stored. A normal business information website usually does not need one."}</p></div>
    </section>

    <section className="public-section" id="pricing">
      <div className="public-section-head"><p className="eyebrow">{fi ? "HINNAT" : "PRICING"}</p><h2>{text.pricingTitle}</h2><p>{text.pricingLead}</p></div>
      <div className="pricing-grid">{packages.map((item) => <article className={`price-card ${item.popular ? "popular" : ""}`} key={item.name}>{item.popular && <span className="popular-label">{fi ? "SUOSITUIN" : "MOST POPULAR"}</span>}<h3>{item.name}</h3><strong>{item.price}</strong><p>{item.description}</p><ul>{item.items.map((entry) => <li key={entry}>{entry}</li>)}</ul><a className={item.popular ? "public-primary" : "public-secondary"} href="#estimate">{fi ? "Muokkaa arviota" : "Build an estimate"}</a></article>)}</div>
      <p className="pricing-tax-note">{config.vatRegistered ? (fi ? `Hinnat ilman arvonlisäveroa. ALV ${config.vatRate} % lisätään.` : `Prices exclude VAT. VAT at ${config.vatRate}% is added.`) : (fi ? "Lopullinen tarjous kertoo verokäsittelyn. Verkkotunnus ja muut maksulliset ulkopuoliset palvelut eritellään." : "The final proposal states the tax treatment. The domain and paid third-party services are itemised.")}</p>
    </section>

    <section className="public-section estimate-section" id="estimate">
      <div className="public-section-head"><p className="eyebrow">{fi ? "HINTA-ARVIO" : "PROJECT ESTIMATE"}</p><h2>{text.estimateTitle}</h2><p>{text.estimateLead}</p></div>
      <div className="estimate-layout">
        <div className="estimate-controls stack">
          <div className="estimate-step-title"><span>1</span><div><h3>{fi ? "Valitse sivuston tavoite" : "Choose the website goal"}</h3><p>{fi ? "Valitse lähin vaihtoehto. Tarkennamme sen tarjouksessa." : "Choose the closest option. It will be refined in the proposal."}</p></div></div>
          <div className="site-kind-grid">{SITE_KINDS.map((item) => <label className={`site-kind-card ${estimateInput.siteKind === item.value ? "active" : ""}`} key={item.value}><input type="radio" name="site-kind" checked={estimateInput.siteKind === item.value} onChange={() => patchEstimate("siteKind", item.value as SiteKind)}/><span><b>{fi ? item.labelFi : item.label}</b><small>{fi ? item.descriptionFi : item.description}</small><em>{fi ? "alkaen" : "from"} {euro(item.price)}</em></span></label>)}</div>

          <div className="estimate-step-title"><span>2</span><div><h3>{fi ? "Arvioi koko ja kielet" : "Estimate size and languages"}</h3><p>{fi ? "Sivulla tarkoitetaan esimerkiksi etusivua, palveluita tai yhteystietoja." : "A page could be Home, Services, About or Contact."}</p></div></div>
          <div className="form-grid"><label>{fi ? "Erillisten sivujen määrä" : "Number of separate pages"}<input type="number" min={1} max={60} value={estimateInput.pages} onChange={(event) => patchEstimate("pages", Number(event.target.value))}/></label><label>{fi ? "Lisäkielet pääkielen lisäksi" : "Additional languages"}<input type="number" min={0} max={5} value={estimateInput.extraLanguages} onChange={(event) => patchEstimate("extraLanguages", Number(event.target.value))}/></label></div>

          <div className="estimate-step-title"><span>3</span><div><h3>{fi ? "Valitse tarvittavat lisät" : "Choose useful extras"}</h3><p>{fi ? "Valitse vain asiat, joista yritys oikeasti hyötyy." : "Choose only what the business will genuinely use."}</p></div></div>
          <div className="estimate-options">{FEATURE_OPTIONS.map((item) => <label className={`check-card ${estimateInput.features.includes(item.value) ? "active" : ""}`} key={item.value}><input type="checkbox" checked={estimateInput.features.includes(item.value)} onChange={() => toggleFeature(item.value)}/><span><b>{fi ? item.labelFi : item.label}</b><small>{fi ? item.descriptionFi : item.description}</small><em>+{euro(item.price)}</em></span></label>)}</div>

          <div className="estimate-step-title"><span>4</span><div><h3>{fi ? "Valitse tuki julkaisun jälkeen" : "Choose support after launch"}</h3><p>{fi ? "Voit ottaa sivuston kokonaan haltuun tai jättää ylläpidon meille." : "Take full control or leave agreed maintenance to us."}</p></div></div>
          <div className="care-options">{CARE_PLANS.map((item) => <label className={`care-card ${estimateInput.carePlan === item.value ? "active" : ""}`} key={item.value}><input type="radio" name="care" checked={estimateInput.carePlan === item.value} onChange={() => patchEstimate("carePlan", item.value as CarePlan)}/><span><b>{fi ? item.labelFi : item.label}</b><small>{fi ? item.descriptionFi : item.description}</small></span><em>{euro(item.monthly)}/{fi ? "kk" : "mo"}</em></label>)}</div>
          <label className={`check-card urgency ${estimateInput.urgent ? "active" : ""}`}><input type="checkbox" checked={estimateInput.urgent} onChange={(event) => patchEstimate("urgent", event.target.checked)}/><span><b>{fi ? "Kiireellinen toimitus" : "Priority delivery"}</b><small>{fi ? "Lyhyempi aikataulu, jos kapasiteettia on. Arvioon lisätään 25 %." : "A shorter timetable when capacity is available. Adds 25% to the estimate."}</small></span></label>
        </div>

        <aside className="estimate-result stack">
          <div className="estimate-result-head"><p className="badge">{fi ? "SUUNNITTELUARVIO" : "PLANNING ESTIMATE"}</p><span>{fi ? "ei sitova" : "non-binding"}</span></div>
          <div className="estimate-price"><small>{fi ? "kertaluonteinen rakennustyö" : "one-time website build"}</small><strong>{euro(estimate.setupLow)}–{euro(estimate.setupHigh)}</strong>{estimate.vatRegistered && <span>{fi ? `ALV ${estimate.vatRate} % kanssa ${euro(estimate.setupLowWithVat)}–${euro(estimate.setupHighWithVat)}` : `With ${estimate.vatRate}% VAT: ${euro(estimate.setupLowWithVat)}–${euro(estimate.setupHighWithVat)}`}</span>}</div>
          <div className="estimate-monthly"><small>{fi ? "valittu jatkuva palvelu" : "selected ongoing service"}</small><strong>{euro(estimate.monthly)}/{fi ? "kk" : "month"}</strong></div>
          <div className="delivery-line"><span>{fi ? "Tavallinen toimitusaika" : "Typical delivery"}</span><strong>{estimate.deliveryWeeks}</strong></div>
          <ul className="included-list">{estimate.included.map((item) => <li key={item}>{item}</li>)}</ul>
          <details className="assumption-box"><summary>{fi ? "Mihin arvio perustuu?" : "What is the estimate based on?"}</summary>{estimate.assumptions.map((item) => <p key={item}>{item}</p>)}</details>
          <hr/>
          <div><p className="eyebrow">{fi ? "HENKILÖKOHTAINEN TARJOUS" : "PERSONAL PROPOSAL"}</p><h3>{fi ? "Lähetä arvio tarkistettavaksi" : "Send the estimate for review"}</h3><p className="muted small">{fi ? "Pyyntö ei sido tilaamaan. Tarkistamme tarpeen ennen hinnan vahvistamista." : "The request creates no obligation. We review the need before confirming a price."}</p></div>
          <div className="form-grid"><label>{fi ? "Nimi" : "Your name"}<input value={estimateForm.name} onChange={(event) => setEstimateForm({ ...estimateForm, name: event.target.value })} autoComplete="name"/></label><label>{fi ? "Yrityksen nimi" : "Business name"}<input value={estimateForm.company} onChange={(event) => setEstimateForm({ ...estimateForm, company: event.target.value })} autoComplete="organization"/></label><label>{fi ? "Sähköposti" : "Email"}<input type="email" value={estimateForm.email} onChange={(event) => setEstimateForm({ ...estimateForm, email: event.target.value })} autoComplete="email"/></label><label>{fi ? "Puhelin, valinnainen" : "Phone, optional"}<input value={estimateForm.phone} onChange={(event) => setEstimateForm({ ...estimateForm, phone: event.target.value })} autoComplete="tel"/></label></div>
          <label>{fi ? "Nykyinen sivusto, valinnainen" : "Current website, optional"}<input value={estimateForm.website} onChange={(event) => setEstimateForm({ ...estimateForm, website: event.target.value })} placeholder="example.fi"/></label>
          <label>{fi ? "Muu tärkeä tieto" : "Anything else we should know?"}<textarea rows={4} value={estimateForm.message} onChange={(event) => setEstimateForm({ ...estimateForm, message: event.target.value })} placeholder={fi ? "Esimerkiksi tärkein palvelu, kohdealue tai toivottu julkaisuaika." : "For example the main service, service area or preferred launch date."}/></label>
          <label className="honeypot" aria-hidden="true">Website<input tabIndex={-1} autoComplete="off" value={estimateForm.companyWebsite} onChange={(event) => setEstimateForm({ ...estimateForm, companyWebsite: event.target.value })}/></label>
          <label className="consent-row"><input type="checkbox" checked={estimateForm.consent} onChange={(event) => setEstimateForm({ ...estimateForm, consent: event.target.checked })}/><span>{fi ? "Hyväksyn tietojeni käytön tähän pyyntöön vastaamiseen." : "I agree that my details may be used to answer this request."} <a href="/privacy">{fi ? "Tietosuojaseloste" : "Privacy notice"}</a>.</span></label>
          {turnstileSiteKey && <div ref={estimateTurnstile.container} className="turnstile-slot"/>}
          <button className="public-primary" onClick={submitEstimate} disabled={estimateSending || !estimateForm.consent || !estimateForm.name.trim() || !estimateForm.company.trim() || !estimateForm.email.trim()}>{estimateSending ? (fi ? "Lähetetään…" : "Sending…") : (fi ? "Lähetä tarjouspyyntö" : "Send proposal request")}</button>
          <p className="form-status" role="status">{estimateStatus || (fi ? "Saat henkilökohtaisen vastauksen ennen sitoutumista." : "You receive a personal response before committing.")}</p>
        </aside>
      </div>
    </section>

    <section className="public-section faq-section" id="faq">
      <div className="public-section-head"><p className="eyebrow">FAQ</p><h2>{text.faqTitle}</h2></div>
      <div className="faq-grid">{faq.map(([question, answer]) => <details key={question}><summary>{question}<span>+</span></summary><p>{answer}</p></details>)}</div>
    </section>

    <section className="public-section contact-section" id="contact">
      <div className="contact-copy"><p className="eyebrow">{fi ? "UUSI PROJEKTI" : "NEW PROJECT"}</p><h2>{text.contactTitle}</h2><p>{text.contactLead}</p><div className="contact-facts"><span><b>{fi ? "Palvelualue" : "Service area"}</b>{config.location}</span>{config.email && <a href={`mailto:${config.email}`}><b>{fi ? "Sähköposti" : "Email"}</b>{config.email}</a>}{config.phone && <a href={`tel:${config.phone}`}><b>{fi ? "Puhelin" : "Phone"}</b>{config.phone}</a>}<a href="/support"><b>{fi ? "Nykyinen asiakas" : "Existing client"}</b>{fi ? "Avaa muutospyyntö" : "Open a support request"}</a></div></div>
      <div className="contact-form stack"><div className="form-heading"><span>01</span><div><h3>{fi ? "Yhteystiedot" : "Contact details"}</h3><p>{fi ? "Käytämme tietoja vain viestiin vastaamiseen ja mahdollisen projektin valmisteluun." : "Details are used only to answer the message and prepare a possible project."}</p></div></div><div className="form-grid"><label>{fi ? "Nimi" : "Your name"}<input value={contactForm.name} onChange={(event) => setContactForm({ ...contactForm, name: event.target.value })} autoComplete="name"/></label><label>{fi ? "Yritys, valinnainen" : "Business, optional"}<input value={contactForm.company} onChange={(event) => setContactForm({ ...contactForm, company: event.target.value })} autoComplete="organization"/></label><label>{fi ? "Sähköposti" : "Email"}<input type="email" value={contactForm.email} onChange={(event) => setContactForm({ ...contactForm, email: event.target.value })} autoComplete="email"/></label><label>{fi ? "Puhelin, valinnainen" : "Phone, optional"}<input value={contactForm.phone} onChange={(event) => setContactForm({ ...contactForm, phone: event.target.value })} autoComplete="tel"/></label></div><label>{fi ? "Nykyinen sivusto, valinnainen" : "Current website, optional"}<input value={contactForm.website} onChange={(event) => setContactForm({ ...contactForm, website: event.target.value })} placeholder="example.fi"/></label><label>{fi ? "Mitä haluaisit parantaa?" : "What would you like to improve?"}<textarea rows={7} value={contactForm.message} onChange={(event) => setContactForm({ ...contactForm, message: event.target.value })} placeholder={fi ? "Kerro lyhyesti yrityksestä, nykyisestä tilanteesta ja siitä, mitä asiakkaiden pitäisi pystyä tekemään sivustolla." : "Briefly describe the business, the current situation and what customers should be able to do on the website."}/></label><label className="honeypot" aria-hidden="true">Website<input tabIndex={-1} autoComplete="off" value={contactForm.companyWebsite} onChange={(event) => setContactForm({ ...contactForm, companyWebsite: event.target.value })}/></label><label className="consent-row"><input type="checkbox" checked={contactForm.consent} onChange={(event) => setContactForm({ ...contactForm, consent: event.target.checked })}/><span>{fi ? "Hyväksyn tietojeni käytön tähän viestiin vastaamiseksi." : "I agree that my details may be used to answer this message."} <a href="/privacy">{fi ? "Tietosuojaseloste" : "Privacy notice"}</a>.</span></label>{turnstileSiteKey && <div ref={contactTurnstile.container} className="turnstile-slot"/>}<button className="public-primary" onClick={submitContact} disabled={contactSending || !contactForm.consent || !contactForm.name.trim() || !contactForm.email.trim() || !contactForm.message.trim()}>{contactSending ? (fi ? "Lähetetään…" : "Sending…") : (fi ? "Lähetä viesti" : "Send project message")}</button><p className="form-status" role="status">{contactStatus || (fi ? "Ensimmäinen viesti ei sido mihinkään." : "The first message creates no obligation.")}</p></div>
    </section>

    <footer className="public-footer">
      <div className="footer-brand"><BrandMark compact/><div><strong>{config.serviceName}</strong><p>{fi ? "Selkeät verkkosivut ja hallittu digitaalinen palvelu yrityksille." : "Clear websites and managed digital services for businesses."}</p>{config.legalName && <small>{config.legalName}{config.businessId ? ` · ${fi ? "Y-tunnus" : "Business ID"} ${config.businessId}` : ""}</small>}</div></div>
      <div className="footer-links"><div><strong>{fi ? "Palvelu" : "Service"}</strong><a href="#services">{fi ? "Palvelut" : "Services"}</a><a href="#pricing">{fi ? "Hinnat" : "Pricing"}</a><a href="#estimate">{fi ? "Hinta-arvio" : "Estimate"}</a><a href="/support">{fi ? "Asiakastuki" : "Client support"}</a></div><div><strong>{fi ? "Tiedot" : "Information"}</strong><a href="/company">{fi ? "Yritystiedot" : "Company"}</a><a href="/privacy">{fi ? "Tietosuoja" : "Privacy"}</a><a href="/cookies">{fi ? "Evästeet" : "Cookies"}</a><a href="/terms">{fi ? "Palveluehdot" : "Service terms"}</a><a href="/accessibility">{fi ? "Saavutettavuus" : "Accessibility"}</a></div></div>
    </footer>
  </>;
}
