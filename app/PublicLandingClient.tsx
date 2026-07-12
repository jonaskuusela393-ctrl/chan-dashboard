"use client";

import Script from "next/script";
import { useMemo, useRef, useState } from "react";
import { CARE_PLANS, FEATURE_OPTIONS, SITE_KINDS, calculateEstimate, euro, normalizeEstimateInput, type CarePlan, type EstimateInput, type SiteKind } from "@/lib/estimate";

declare global {
  interface Window {
    turnstile?: {
      render: (element: HTMLElement, options: Record<string, unknown>) => string;
      reset: (widgetId?: string) => void;
    };
  }
}

type PublicProps = {
  serviceName: string;
  serviceEmail: string;
  serviceLocation: string;
  loggedIn: boolean;
  turnstileSiteKey: string;
};

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

async function sendRequest(payload: Record<string, unknown>) {
  const response = await fetch("/api/public/request", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await response.json().catch(() => ({})) as { ok?: boolean; error?: string; requestId?: string };
  if (!response.ok || !data.ok) throw new Error(data.error || "Your request could not be sent.");
  return data;
}

export default function PublicLandingClient({ serviceName, serviceEmail, serviceLocation, loggedIn, turnstileSiteKey }: PublicProps) {
  const [estimateInput, setEstimateInput] = useState<EstimateInput>({ siteKind: "business", pages: 5, extraLanguages: 0, features: ["analytics"], carePlan: "managed", urgent: false });
  const [estimateForm, setEstimateForm] = useState<FormState>(blankForm);
  const [contactForm, setContactForm] = useState<FormState>(blankForm);
  const [estimateStatus, setEstimateStatus] = useState("Adjust the project to see a realistic starting range.");
  const [contactStatus, setContactStatus] = useState("Tell us what the business needs. No obligation.");
  const [estimateSending, setEstimateSending] = useState(false);
  const [contactSending, setContactSending] = useState(false);
  const estimateStarted = useRef(Date.now());
  const contactStarted = useRef(Date.now());
  const estimateTurnstile = useTurnstile(turnstileSiteKey);
  const contactTurnstile = useTurnstile(turnstileSiteKey);

  const estimate = useMemo(() => calculateEstimate(estimateInput), [estimateInput]);
  const selectedKind = SITE_KINDS.find((item) => item.value === estimateInput.siteKind) || SITE_KINDS[1];

  function patchEstimate<K extends keyof EstimateInput>(key: K, value: EstimateInput[K]) {
    setEstimateInput((current) => normalizeEstimateInput({ ...current, [key]: value }));
  }

  function toggleFeature(value: string) {
    const features = estimateInput.features.includes(value)
      ? estimateInput.features.filter((item) => item !== value)
      : [...estimateInput.features, value];
    patchEstimate("features", features);
  }

  async function submitEstimate() {
    if (!estimateForm.consent || estimateSending) return;
    setEstimateSending(true);
    setEstimateStatus("Saving your estimate request...");
    try {
      const result = await sendRequest({
        requestType: "estimate",
        ...estimateForm,
        estimate: estimateInput,
        startedAt: estimateStarted.current,
        sourcePath: "/#estimate",
        turnstileToken: estimateTurnstile.token,
      });
      setEstimateStatus(`Request received. Reference: ${result.requestId || "saved"}. You will receive a personal quote after the project is reviewed.`);
      setEstimateForm(blankForm);
      estimateStarted.current = Date.now();
      estimateTurnstile.reset();
    } catch (error) {
      setEstimateStatus(error instanceof Error ? error.message : "Request failed.");
    } finally {
      setEstimateSending(false);
    }
  }

  async function submitContact() {
    if (!contactForm.consent || contactSending) return;
    setContactSending(true);
    setContactStatus("Sending your message...");
    try {
      const result = await sendRequest({
        requestType: "contact",
        ...contactForm,
        startedAt: contactStarted.current,
        sourcePath: "/#contact",
        turnstileToken: contactTurnstile.token,
      });
      setContactStatus(`Message received. Reference: ${result.requestId || "saved"}.`);
      setContactForm(blankForm);
      contactStarted.current = Date.now();
      contactTurnstile.reset();
    } catch (error) {
      setContactStatus(error instanceof Error ? error.message : "Message failed.");
    } finally {
      setContactSending(false);
    }
  }

  const script = turnstileSiteKey ? (
    <Script
      src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"
      strategy="afterInteractive"
      onLoad={() => {
        window.setTimeout(() => {
          estimateTurnstile.render();
          contactTurnstile.render();
        }, 0);
      }}
    />
  ) : null;

  return (
    <>
      {script}
      <section className="public-hero" id="top">
        <div className="public-hero-copy">
          <p className="eyebrow">WEBSITES FOR SMALL AND MEDIUM BUSINESSES</p>
          <h1>A complete business website, built and launched for you.</h1>
          <p className="public-lead">{serviceName} designs the site, connects the domain, deploys it, tests it and can keep it running. You get one person responsible for the whole result instead of a pile of disconnected tools.</p>
          <div className="public-actions">
            <a className="public-primary" href="#estimate">get an instant estimate</a>
            <a className="buttonlike" href="#contact">describe your project</a>
            {loggedIn && <a className="buttonlike" href="/dashboard">open private dashboard</a>}
          </div>
          <div className="public-proof-row" aria-label="Service highlights">
            <span>mobile-first</span><span>fast hosting</span><span>clear ownership</span><span>managed support</span>
          </div>
        </div>
        <div className="public-terminal-preview" aria-label="Website delivery process preview">
          <div className="terminal-preview-head"><span /><span /><span /><strong>PROJECT STATUS</strong></div>
          <div className="terminal-preview-body">
            <p><b>01</b> requirements confirmed <em>done</em></p>
            <p><b>02</b> design and content <em>active</em></p>
            <p><b>03</b> mobile testing <em>queued</em></p>
            <p><b>04</b> domain + launch <em>queued</em></p>
            <div className="terminal-meter"><span style={{ width: "48%" }} /></div>
            <small>One accountable build. No template lock-in. No fake traffic promises.</small>
          </div>
        </div>
      </section>

      <section className="public-section" id="services">
        <div className="public-section-head"><p className="eyebrow">WHAT IS INCLUDED</p><h2>More than a page that merely exists</h2><p>A business website should make the company easier to trust, understand and contact.</p></div>
        <div className="public-card-grid">
          <article className="public-card"><span>01</span><h3>Strategy and structure</h3><p>Services, target customers, calls to action and page structure are clarified before building.</p></article>
          <article className="public-card"><span>02</span><h3>Design and development</h3><p>A responsive site is built for the company rather than forcing the company into a generic theme.</p></article>
          <article className="public-card"><span>03</span><h3>Content and local SEO</h3><p>Clear service copy, page titles, business information and search-friendly technical foundations.</p></article>
          <article className="public-card"><span>04</span><h3>Forms and integrations</h3><p>Quote requests, email delivery, analytics, bookings or database features when the project needs them.</p></article>
          <article className="public-card"><span>05</span><h3>Launch and ownership</h3><p>Domain, HTTPS, deployment and account access are configured. The business is not trapped in a private builder.</p></article>
          <article className="public-card"><span>06</span><h3>Ongoing care</h3><p>Optional monitoring, updates and content changes after launch, with a defined monthly plan.</p></article>
        </div>
      </section>

      <section className="public-section public-platform" id="how-it-works">
        <div className="public-section-head"><p className="eyebrow">HOW THE SERVICE WORKS</p><h2>Built, deployed and managed without hiding the infrastructure</h2></div>
        <div className="platform-flow">
          <div><b>1</b><h3>Plan</h3><p>We agree on scope, price, content, ownership and delivery date.</p></div>
          <i>→</i>
          <div><b>2</b><h3>Build</h3><p>The website is developed and shown through a private preview link.</p></div>
          <i>→</i>
          <div><b>3</b><h3>Launch</h3><p>The domain is connected and the production deployment is tested.</p></div>
          <i>→</i>
          <div><b>4</b><h3>Care or handoff</h3><p>You choose managed support or full handoff with your own account access.</p></div>
        </div>
        <div className="ownership-note"><strong>Important:</strong> Vercel is commonly used to host and deploy the website. Neon is useful when the site needs a real database, but an ordinary brochure site may not need Neon at all. Domains, email, paid APIs and other third-party services should normally be owned by the client or clearly listed as pass-through costs.</div>
      </section>

      <section className="public-section estimate-section" id="estimate">
        <div className="public-section-head"><p className="eyebrow">INSTANT PROJECT ESTIMATE</p><h2>See a realistic starting range</h2><p>This calculator gives a planning range. A final fixed quote comes after the actual content and functions are reviewed.</p></div>
        <div className="estimate-layout">
          <div className="estimate-controls stack">
            <label>What are we building?
              <select value={estimateInput.siteKind} onChange={(event) => patchEstimate("siteKind", event.target.value as SiteKind)}>
                {SITE_KINDS.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
              </select>
            </label>
            <p className="muted small">{selectedKind.description}</p>
            <label>Approximate number of pages
              <input type="number" min={1} max={60} value={estimateInput.pages} onChange={(event) => patchEstimate("pages", Number(event.target.value))} />
            </label>
            <label>Additional languages
              <input type="number" min={0} max={5} value={estimateInput.extraLanguages} onChange={(event) => patchEstimate("extraLanguages", Number(event.target.value))} />
            </label>
            <fieldset className="estimate-fieldset"><legend>Extra functions</legend>
              <div className="estimate-options">
                {FEATURE_OPTIONS.map((item) => <label className="check-card" key={item.value}><input type="checkbox" checked={estimateInput.features.includes(item.value)} onChange={() => toggleFeature(item.value)} /><span><b>{item.label}</b><small>+{euro(item.price)}</small></span></label>)}
              </div>
            </fieldset>
            <fieldset className="estimate-fieldset"><legend>After launch</legend>
              <div className="care-options">
                {CARE_PLANS.map((item) => <label className={`care-card ${estimateInput.carePlan === item.value ? "active" : ""}`} key={item.value}><input type="radio" name="care" checked={estimateInput.carePlan === item.value} onChange={() => patchEstimate("carePlan", item.value as CarePlan)} /><span><b>{item.label} — {euro(item.monthly)}/mo</b><small>{item.description}</small></span></label>)}
              </div>
            </fieldset>
            <label className="check-card urgency"><input type="checkbox" checked={estimateInput.urgent} onChange={(event) => patchEstimate("urgent", event.target.checked)} /><span><b>Priority delivery</b><small>Shorter schedule when capacity allows (+25%)</small></span></label>
          </div>

          <aside className="estimate-result stack">
            <p className="badge">PLANNING RANGE</p>
            <div className="estimate-price"><small>one-time build</small><strong>{euro(estimate.setupLow)}–{euro(estimate.setupHigh)}</strong></div>
            <div className="estimate-monthly"><small>selected ongoing service</small><strong>{euro(estimate.monthly)}/month</strong></div>
            <p><b>Typical delivery:</b> {estimate.deliveryWeeks}</p>
            <ul>{estimate.included.map((item) => <li key={item}>{item}</li>)}</ul>
            <details><summary>Estimate assumptions</summary>{estimate.assumptions.map((item) => <p className="small muted" key={item}>{item}</p>)}</details>
            <hr />
            <h3>Request a personal quote</h3>
            <div className="form-grid">
              <label>Your name<input value={estimateForm.name} onChange={(event) => setEstimateForm({ ...estimateForm, name: event.target.value })} autoComplete="name" /></label>
              <label>Business name<input value={estimateForm.company} onChange={(event) => setEstimateForm({ ...estimateForm, company: event.target.value })} autoComplete="organization" /></label>
              <label>Email<input type="email" value={estimateForm.email} onChange={(event) => setEstimateForm({ ...estimateForm, email: event.target.value })} autoComplete="email" /></label>
              <label>Phone, optional<input value={estimateForm.phone} onChange={(event) => setEstimateForm({ ...estimateForm, phone: event.target.value })} autoComplete="tel" /></label>
            </div>
            <label>Current website, optional<input value={estimateForm.website} onChange={(event) => setEstimateForm({ ...estimateForm, website: event.target.value })} placeholder="example.fi" /></label>
            <label>Anything important?<textarea value={estimateForm.message} onChange={(event) => setEstimateForm({ ...estimateForm, message: event.target.value })} rows={4} /></label>
            <label className="honeypot" aria-hidden="true">Company website<input tabIndex={-1} autoComplete="off" value={estimateForm.companyWebsite} onChange={(event) => setEstimateForm({ ...estimateForm, companyWebsite: event.target.value })} /></label>
            <label className="consent-row"><input type="checkbox" checked={estimateForm.consent} onChange={(event) => setEstimateForm({ ...estimateForm, consent: event.target.checked })} /><span>I agree that my details can be used to answer this request. See the <a href="/privacy">privacy notice</a>.</span></label>
            {turnstileSiteKey && <div ref={estimateTurnstile.container} className="turnstile-slot" />}
            <button className="public-primary" onClick={submitEstimate} disabled={estimateSending || !estimateForm.consent || !estimateForm.name.trim() || !estimateForm.company.trim() || !estimateForm.email.trim()}>{estimateSending ? "sending..." : "send estimate request"}</button>
            <p className="form-status">{estimateStatus}</p>
          </aside>
        </div>
      </section>

      <section className="public-section" id="faq">
        <div className="public-section-head"><p className="eyebrow">COMMON QUESTIONS</p><h2>Clear before the project begins</h2></div>
        <div className="faq-grid">
          <details><summary>Who owns the website?</summary><p>The contract should say this clearly. The recommended arrangement is that the client owns the domain and production accounts, while the developer is invited to manage them. A managed agency account is also possible, but ownership and exit terms must be written down.</p></details>
          <details><summary>Does every site need Vercel and Neon?</summary><p>No. Vercel is a strong deployment option for modern sites. Neon is only needed when the project stores dynamic information such as inquiries, customer records, accounts or application data.</p></details>
          <details><summary>Are hosting costs included?</summary><p>The monthly service price covers the work listed in the chosen care plan. Domain registration and paid third-party services are separate unless the proposal explicitly bundles them.</p></details>
          <details><summary>Can the site be moved later?</summary><p>Yes. The site should be delivered with source access and documented services. Avoiding closed template builders makes future migration much easier.</p></details>
          <details><summary>Can an old site be replaced without losing the domain?</summary><p>Usually yes. The new site can be prepared on a preview address and the existing domain can be switched after approval.</p></details>
          <details><summary>What is needed from the business?</summary><p>Accurate services, contact information, logo or preferred visual direction, photos if available, and someone who can approve text and design decisions.</p></details>
        </div>
      </section>

      <section className="public-section contact-section" id="contact">
        <div className="contact-copy">
          <p className="eyebrow">START A CONVERSATION</p>
          <h2>Tell us what is wrong with the current site—or what needs to exist.</h2>
          <p>No technical vocabulary is required. Explain the business, the customers and what people should be able to do on the site.</p>
          <div className="contact-facts"><span>{serviceLocation}</span>{serviceEmail && <a href={`mailto:${serviceEmail}`}>{serviceEmail}</a>}<span>Remote projects supported</span></div>
        </div>
        <div className="contact-form stack">
          <div className="form-grid">
            <label>Your name<input value={contactForm.name} onChange={(event) => setContactForm({ ...contactForm, name: event.target.value })} autoComplete="name" /></label>
            <label>Business, optional<input value={contactForm.company} onChange={(event) => setContactForm({ ...contactForm, company: event.target.value })} autoComplete="organization" /></label>
            <label>Email<input type="email" value={contactForm.email} onChange={(event) => setContactForm({ ...contactForm, email: event.target.value })} autoComplete="email" /></label>
            <label>Phone, optional<input value={contactForm.phone} onChange={(event) => setContactForm({ ...contactForm, phone: event.target.value })} autoComplete="tel" /></label>
          </div>
          <label>Current website, optional<input value={contactForm.website} onChange={(event) => setContactForm({ ...contactForm, website: event.target.value })} placeholder="example.fi" /></label>
          <label>Project description<textarea rows={7} value={contactForm.message} onChange={(event) => setContactForm({ ...contactForm, message: event.target.value })} placeholder="We need a clearer mobile website, quote form and help moving the domain..." /></label>
          <label className="honeypot" aria-hidden="true">Company website<input tabIndex={-1} autoComplete="off" value={contactForm.companyWebsite} onChange={(event) => setContactForm({ ...contactForm, companyWebsite: event.target.value })} /></label>
          <label className="consent-row"><input type="checkbox" checked={contactForm.consent} onChange={(event) => setContactForm({ ...contactForm, consent: event.target.checked })} /><span>I agree that my details can be used to answer this request. See the <a href="/privacy">privacy notice</a>.</span></label>
          {turnstileSiteKey && <div ref={contactTurnstile.container} className="turnstile-slot" />}
          <button className="public-primary" onClick={submitContact} disabled={contactSending || !contactForm.consent || !contactForm.name.trim() || !contactForm.email.trim() || !contactForm.message.trim()}>{contactSending ? "sending..." : "send project message"}</button>
          <p className="form-status">{contactStatus}</p>
        </div>
      </section>

      <footer className="public-footer">
        <div><strong>{serviceName}</strong><p>Business websites, deployment and managed support.</p></div>
        <nav><a href="#services">services</a><a href="#estimate">estimate</a><a href="#contact">contact</a><a href="/privacy">privacy</a><a href="/terms">terms</a><a href="/login">private login</a></nav>
      </footer>
    </>
  );
}
