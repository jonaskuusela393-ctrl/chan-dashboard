import { NextRequest, NextResponse } from "next/server";
import JSZip from "jszip";
import { authStatus, requireAdmin } from "@/lib/auth";
import { cleanText } from "@/lib/localStore";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

function jsonError(error: string, status = 500) {
  return NextResponse.json({ ok: false, error }, { status });
}

function slug(value: string) {
  return value.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60) || "business-site";
}

function q(value: string) {
  return JSON.stringify(value);
}

function pageSource(data: { name: string; category: string; city: string; phone: string; email: string; mapsUrl: string }) {
  return `"use client";

import { FormEvent, useState } from "react";

const BUSINESS = ${JSON.stringify(data, null, 2)};

export default function Home() {
  const [status, setStatus] = useState("");
  const [sending, setSending] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    setSending(true);
    setStatus("Sending...");
    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(Object.fromEntries(new FormData(form).entries())),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || "Message failed");
      form.reset();
      setStatus("Message sent. Thank you!");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Message failed");
    } finally {
      setSending(false);
    }
  }

  return (
    <main>
      <nav>
        <strong>{BUSINESS.name}</strong>
        <div className="navlinks"><a href="#services">Services</a><a href="#work">Work</a><a href="#contact">Contact</a></div>
      </nav>
      <header className="hero">
        <p className="eyebrow">{BUSINESS.category} · {BUSINESS.city}</p>
        <h1>Reliable local service with a clear quote and easy contact.</h1>
        <p className="lead">A fast, mobile-friendly business website that explains the work clearly and helps customers contact you immediately.</p>
        <div className="actions">
          {BUSINESS.phone && <a className="button primary" href={\`tel:\${BUSINESS.phone.replace(/[^0-9+]/g, "")}\`}>Call now</a>}
          <a className="button" href="#contact">Request a quote</a>
          {BUSINESS.mapsUrl && <a className="button" href={BUSINESS.mapsUrl} target="_blank" rel="noreferrer">Open map</a>}
        </div>
      </header>
      <section id="services">
        <p className="eyebrow">SERVICES</p><h2>What we can help with</h2>
        <div className="cards"><article><h3>Main service</h3><p>Describe the most important service and the customer problem it solves.</p></article><article><h3>Small jobs</h3><p>Make it clear which smaller jobs and repairs are accepted.</p></article><article><h3>Clear quotes</h3><p>Customers can send the job details and photos through the form below.</p></article></div>
      </section>
      <section id="work">
        <p className="eyebrow">RECENT WORK</p><h2>Real work builds trust</h2>
        <div className="gallery"><div>ADD PHOTO 1</div><div>ADD PHOTO 2</div><div>ADD PHOTO 3</div></div>
      </section>
      <section className="split">
        <div><p className="eyebrow">WHY CHOOSE US</p><h2>Simple, local and easy to reach</h2><p>Add the company’s real experience, service area, guarantees and customer promises here.</p></div>
        <div className="facts"><p><strong>Fast contact</strong><br/>Phone and message options work on mobile.</p><p><strong>Local service</strong><br/>{BUSINESS.city}</p><p><strong>Clear next step</strong><br/>Ask for a quote without searching for contact details.</p></div>
      </section>
      <section id="contact">
        <p className="eyebrow">CONTACT</p><h2>Request a quote</h2>
        <div className="contact-grid">
          <form onSubmit={submit}>
            <input name="website" className="honeypot" tabIndex={-1} autoComplete="off" aria-hidden="true" />
            <input type="hidden" name="startedAt" value={Date.now()} />
            <label>Name<input name="name" required maxLength={100} autoComplete="name" /></label>
            <label>Email<input name="email" required type="email" maxLength={180} autoComplete="email" /></label>
            <label>Phone<input name="phone" maxLength={40} autoComplete="tel" /></label>
            <label>What do you need?<textarea name="message" required maxLength={3000} rows={6} /></label>
            <button className="button primary" disabled={sending}>{sending ? "Sending..." : "Send message"}</button>
            <p className="form-status" role="status">{status}</p>
          </form>
          <aside>
            <h3>{BUSINESS.name}</h3>
            <p>{BUSINESS.category}<br/>{BUSINESS.city}</p>
            {BUSINESS.phone && <p><a href={\`tel:\${BUSINESS.phone.replace(/[^0-9+]/g, "")}\`}>{BUSINESS.phone}</a></p>}
            {BUSINESS.email && <p><a href={\`mailto:\${BUSINESS.email}\`}>{BUSINESS.email}</a></p>}
            <p className="small">Replace all example content and photo boxes before publishing.</p>
          </aside>
        </div>
      </section>
      <footer><span>© {new Date().getFullYear()} {BUSINESS.name}</span><a href="#contact">Contact</a></footer>
    </main>
  );
}
`;
}

const css = `:root{--bg:#080a09;--card:#111512;--text:#f5f7f5;--muted:#a8b1aa;--line:#29312b;--accent:#8ee8a7}*{box-sizing:border-box}html{scroll-behavior:smooth}body{margin:0;background:var(--bg);color:var(--text);font-family:Arial,Helvetica,sans-serif;line-height:1.6}a{color:inherit}main{overflow:hidden}nav{position:sticky;top:0;z-index:10;display:flex;justify-content:space-between;align-items:center;gap:20px;padding:18px max(20px,calc((100vw - 1120px)/2));background:rgba(8,10,9,.93);border-bottom:1px solid var(--line);backdrop-filter:blur(12px)}nav strong{font-size:18px}.navlinks{display:flex;gap:18px}.navlinks a{text-decoration:none;color:var(--muted)}header,section,footer{max-width:1120px;margin:auto;padding:80px 20px}.hero{min-height:72vh;display:grid;align-content:center}.eyebrow{color:var(--accent);font-weight:700;letter-spacing:.15em;font-size:12px}.hero h1{font-size:clamp(42px,7vw,82px);line-height:1.02;max-width:950px;margin:10px 0 24px}.lead{max-width:720px;color:var(--muted);font-size:20px}.actions{display:flex;flex-wrap:wrap;gap:12px;margin-top:24px}.button{display:inline-flex;align-items:center;justify-content:center;min-height:48px;padding:12px 18px;border:1px solid var(--line);border-radius:10px;background:var(--card);color:var(--text);text-decoration:none;font-weight:700;cursor:pointer}.button.primary{background:var(--accent);border-color:var(--accent);color:#061008}.cards,.gallery{display:grid;grid-template-columns:repeat(3,1fr);gap:16px}.cards article,.facts,form,aside{background:var(--card);border:1px solid var(--line);border-radius:18px;padding:24px}.gallery div{min-height:260px;display:grid;place-items:center;border:1px solid var(--line);border-radius:18px;background:linear-gradient(135deg,#18201a,#0b0d0c);color:var(--muted)}.split,.contact-grid{display:grid;grid-template-columns:1fr 1fr;gap:30px;align-items:start}.facts p{padding:10px 0;border-bottom:1px solid var(--line)}.facts p:last-child{border:0}label{display:grid;gap:7px;margin-bottom:15px;font-weight:700}input,textarea{width:100%;border:1px solid var(--line);border-radius:9px;background:#090c0a;color:var(--text);font:inherit;padding:13px}textarea{resize:vertical}.honeypot{position:absolute!important;left:-9999px!important;width:1px!important;height:1px!important}.form-status,.small{color:var(--muted);font-size:14px}footer{display:flex;justify-content:space-between;border-top:1px solid var(--line);color:var(--muted)}@media(max-width:760px){.navlinks{display:none}header,section,footer{padding:55px 18px}.hero{min-height:65vh}.cards,.gallery,.split,.contact-grid{grid-template-columns:1fr}.gallery div{min-height:190px}.actions .button{flex:1 1 160px}}`;

const contactRoute = `import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function clean(value: unknown, max: number) {
  return String(value ?? "").replace(/[\\u0000-\\u001f\\u007f]/g, " ").replace(/\\s+/g, " ").trim().slice(0, max);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    if (clean(body.website, 100)) return NextResponse.json({ ok: true });
    const startedAt = Number(body.startedAt || 0);
    if (startedAt && Date.now() - startedAt < 1200) return NextResponse.json({ ok: false, error: "Please try again." }, { status: 400 });

    const name = clean(body.name, 100);
    const email = clean(body.email, 180).replace(/[\\r\\n]/g, "");
    const phone = clean(body.phone, 40);
    const message = clean(body.message, 3000);
    if (!name || !message || !/^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$/.test(email)) {
      return NextResponse.json({ ok: false, error: "Please complete the required fields." }, { status: 400 });
    }

    const failures: string[] = [];
    let delivered = false;

    const dashboardUrl = process.env.DASHBOARD_INQUIRY_WEBHOOK || "";
    const dashboardSecret = process.env.DASHBOARD_INQUIRY_SECRET || "";
    const leadId = process.env.DASHBOARD_LEAD_ID || "";
    if (dashboardUrl && dashboardSecret && leadId) {
      try {
        const response = await fetch(dashboardUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-inquiry-secret": dashboardSecret },
          body: JSON.stringify({ leadId, name, email, phone, message, sourceSite: req.headers.get("origin") || "" }),
          cache: "no-store",
        });
        if (response.ok) delivered = true;
        else failures.push("dashboard CRM delivery failed");
      } catch {
        failures.push("dashboard CRM delivery failed");
      }
    }

    const apiKey = process.env.RESEND_API_KEY || "";
    const to = process.env.CONTACT_TO_EMAIL || "";
    const from = process.env.CONTACT_FROM_EMAIL || "Website <onboarding@resend.dev>";
    if (apiKey && to) {
      try {
        const subject = ("Website enquiry from " + name).replace(/[\\r\\n]/g, " ");
        const response = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: { Authorization: "Bearer " + apiKey, "Content-Type": "application/json" },
          body: JSON.stringify({
            from,
            to: [to],
            reply_to: email,
            subject,
            text: "Name: " + name + "\\nEmail: " + email + "\\nPhone: " + (phone || "-") + "\\n\\n" + message,
          }),
        });
        if (response.ok) delivered = true;
        else failures.push("email delivery failed");
      } catch {
        failures.push("email delivery failed");
      }
    }

    if (!delivered) {
      const configured = Boolean((dashboardUrl && dashboardSecret && leadId) || (apiKey && to));
      return NextResponse.json({ ok: false, error: configured ? failures.join("; ") || "Message delivery failed." : "Contact form is not configured yet." }, { status: 503 });
    }
    return NextResponse.json({ ok: true, warnings: failures });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Message failed." }, { status: 500 });
  }
}
`;

export async function POST(req: NextRequest) {
  try {
    requireAdmin(req);
    const body = await req.json().catch(() => ({}));
    const name = cleanText(body.name || "Example Local Business", 140);
    const category = cleanText(body.category || "local service", 100);
    const city = cleanText(body.city || body.address || "Local area", 180);
    const phone = cleanText(body.phone || "", 60);
    const email = cleanText(body.email || "", 180).replace(/[\r\n]/g, "");
    const mapsUrl = cleanText(body.mapsUrl || "", 600);
    const leadId = cleanText(body.id || body.leadId || "", 300);
    const projectName = slug(name);
    const zip = new JSZip();
    zip.file("package.json", JSON.stringify({ name: projectName, version: "1.0.0", private: true, scripts: { dev: "next dev", build: "next build", start: "next start" }, dependencies: { next: "16.2.10", react: "19.2.0", "react-dom": "19.2.0" }, devDependencies: { "@types/node": "22.15.32", "@types/react": "19.2.0", "@types/react-dom": "19.2.0", typescript: "5.9.2" }, overrides: { postcss: "8.5.10" } }, null, 2));
    zip.file("app/page.tsx", pageSource({ name, category, city, phone, email, mapsUrl }));
    zip.file("app/globals.css", css);
    zip.file("app/layout.tsx", `import "./globals.css";\nexport const metadata = { title: ${q(name)}, description: ${q(`${name} — ${category} in ${city}`)} };\nexport default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="fi"><body>{children}</body></html>; }\n`);
    zip.file("app/api/contact/route.ts", contactRoute);
    zip.file("next-env.d.ts", `/// <reference types="next" />\n/// <reference types="next/image-types/global" />\n`);
    zip.file("tsconfig.json", JSON.stringify({ compilerOptions: { target: "ES2017", lib: ["dom", "dom.iterable", "esnext"], allowJs: true, skipLibCheck: true, strict: true, noEmit: true, esModuleInterop: true, module: "esnext", moduleResolution: "bundler", resolveJsonModule: true, isolatedModules: true, jsx: "react-jsx", incremental: true, plugins: [{ name: "next" }], paths: { "@/*": ["./*"] } }, include: ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"], exclude: ["node_modules"] }, null, 2));
    zip.file(".gitignore", `.next/\nnode_modules/\n.env*\n!.env.example\n`);
    zip.file(".env.example", `# Save every form submission in the private dashboard CRM\nDASHBOARD_INQUIRY_WEBHOOK=https://YOUR-DASHBOARD.vercel.app/api/business/inquiries/public\nDASHBOARD_INQUIRY_SECRET=use-the-same-long-secret-as-the-dashboard\nDASHBOARD_LEAD_ID=${leadId || "paste-the-dashboard-lead-id"}\n\n# Optional email delivery through Resend\nRESEND_API_KEY=re_xxxxxxxxx\nCONTACT_TO_EMAIL=${email || "client@example.com"}\nCONTACT_FROM_EMAIL=Website <website@your-verified-domain.fi>\n`);
    zip.file("README.md", `# ${name}\n\nProduction-ready Next.js starter generated by Private Terminal Dashboard.\n\n## Run\n\n1. Install Node.js 22.\n2. Run \`npm install\`.\n3. Copy \`.env.example\` to \`.env.local\`.\n4. Set \`DASHBOARD_INQUIRY_WEBHOOK\`, \`DASHBOARD_INQUIRY_SECRET\`, and \`DASHBOARD_LEAD_ID\` so every submission appears in the dashboard CRM.\n5. Optionally add the Resend variables for a second copy by email.\n6. Run \`npm run dev\`.\n7. Replace the example service text and photo boxes.\n8. Deploy to Vercel and add the same environment variables there.\n\nThe form posts to \`/api/contact\`, validates input, includes a spam honeypot, saves inquiries to the dashboard, and can also send with Resend. It succeeds when at least one configured delivery path succeeds.\n`);
    const buffer = await zip.generateAsync({ type: "uint8array", compression: "DEFLATE", compressionOptions: { level: 6 } });
    return new NextResponse(new Blob([buffer as BlobPart]), { status: 200, headers: { "Content-Type": "application/zip", "Content-Disposition": `attachment; filename="${projectName}.zip"`, "Cache-Control": "no-store" } });
  } catch (error: any) {
    return jsonError(error?.message || "site export failed", authStatus(error));
  }
}
