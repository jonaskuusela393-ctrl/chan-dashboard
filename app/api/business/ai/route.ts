import { NextRequest, NextResponse } from "next/server";
import { authStatus, requireAdmin } from "@/lib/auth";
import { enhanceWithClaude } from "@/lib/claude";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

function clean(value: unknown, max = 10000) { return String(value ?? "").replace(/\u0000/g, "").trim().slice(0, max); }

function builtIn(task: string, language: string, company: string, context: string) {
  const fi = language === "fi";
  const name = company || (fi ? "yritys" : "the business");
  if (task === "outreach") return fi
    ? `Hei,\n\nTutustuin yrityksen ${name} verkkosivustoon. Sivustoa voisi selkeyttää erityisesti mobiilikäyttöä, yhteydenottoa ja palvelujen esittelyä varten. Teen yrityksille valmiita verkkosivustoja, mukaan lukien julkaisu, lomakkeet ja sovittu ylläpito.\n\nVoin lähettää maksuttoman alustavan ehdotuksen ja selkeän hinta-arvion ilman sitoumusta.\n\nYstävällisin terveisin\nRaccoon Signal`
    : `Hello,\n\nI reviewed ${name}'s website. It could be made clearer for mobile visitors, enquiries and presenting services. I build complete business websites, including deployment, forms and agreed maintenance.\n\nI can send a free initial recommendation and a clear non-binding estimate.\n\nKind regards,\nRaccoon Signal`;
  if (task === "proposal") return fi
    ? `${name}: ehdotettu toteutus\n\nTavoite: selkeä, nopea ja mobiiliystävällinen yrityssivusto.\nSisältö: etusivu, palvelut, yritystiedot, yhteydenotto ja tietosuojasivu.\nToteutus: responsiivinen sivusto, julkaisu asiakkaan omistamalle verkkotunnukselle, toimiva lomake ja perus-SEO.\nRajaus ja lopullinen hinta vahvistetaan kirjallisessa tarjouksessa.\n\nTaustatiedot:\n${context || "Ei lisätietoja."}`
    : `${name}: proposed delivery\n\nGoal: a clear, fast and mobile-friendly business website.\nContent: home, services, company information, contact and privacy page.\nDelivery: responsive website, deployment to a client-owned domain, working form and essential SEO.\nScope and final price are confirmed in a written proposal.\n\nBackground:\n${context || "No additional details."}`;
  if (task === "client-reply") return fi
    ? `Hei,\n\nKiitos viestistä. Pyyntö on vastaanotettu ja liitetty projektin työlistaan. Tarkistan vaikutuksen sisältöön, aikatauluun ja mahdolliseen lisähintaan ennen työn aloittamista. Vastaan seuraavaksi kirjallisella vahvistuksella.\n\nYstävällisin terveisin\nRaccoon Signal`
    : `Hello,\n\nThank you for your message. The request has been received and added to the project work list. I will check its effect on scope, timing and any additional cost before work begins, then confirm the next step in writing.\n\nKind regards,\nRaccoon Signal`;
  if (task === "website-copy") return fi
    ? `${name}\n\nLuotettava paikallinen palvelu\n\nAutamme asiakkaita selkeällä palvelulla, sovituilla aikatauluilla ja helpolla yhteydenotolla.\n\nPalvelut\n• Palvelu kuvataan ymmärrettävästi\n• Asiakkaalle kerrotaan mitä tapahtuu seuraavaksi\n• Yhteydenotto tehdään helpoksi\n\nOta yhteyttä ja pyydä arvio.`
    : `${name}\n\nReliable local service\n\nWe help customers through clear service, agreed schedules and an easy way to get in touch.\n\nServices\n• Services explained in plain language\n• Clear next steps for the customer\n• Simple enquiry process\n\nContact us for an estimate.`;
  return fi
    ? `Yhteenveto yrityksestä ${name}:\n${context || "Tietoja ei annettu."}\n\nSeuraavat toimet: varmista yhteystiedot, tarkista sivuston tärkeimmät ongelmat ja laadi yksilöllinen kirjallinen ehdotus.`
    : `Summary for ${name}:\n${context || "No information supplied."}\n\nNext steps: verify contact details, confirm the most important website problems and prepare a specific written recommendation.`;
}

export async function POST(req: NextRequest) {
  try {
    requireAdmin(req);
    const body = await req.json().catch(() => ({})) as Record<string, unknown>;
    const task = clean(body.task, 80) || "lead-summary";
    const language = clean(body.language, 10) === "fi" ? "fi" : "en";
    const company = clean(body.company, 300);
    const context = clean(body.context, 10000);
    const fallback = builtIn(task, language, company, context);
    const result = await enhanceWithClaude(
      "You are an assistant for a Finnish B2B website studio. Improve the supplied draft without inventing facts, legal claims, audit findings, prices or guarantees. Use plain professional language. Return only the finished text.",
      `Task: ${task}\nLanguage: ${language}\nCompany: ${company}\nVerified context:\n${context}\n\nBuilt-in draft to improve:\n${fallback}`,
      fallback,
    );
    return NextResponse.json({ ok: true, configured: Boolean(process.env.ANTHROPIC_API_KEY), ...result });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : String(error) }, { status: authStatus(error) });
  }
}
