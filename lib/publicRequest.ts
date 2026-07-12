import "server-only";
import crypto from "node:crypto";
import { upsertLead } from "@/lib/localStore";
import { runBusinessAction } from "@/lib/businessSuite";
import { calculateEstimate, normalizeEstimateInput, type EstimateInput } from "@/lib/estimate";

export type PublicRequestInput = {
  requestType: "contact" | "estimate";
  name: string;
  company: string;
  email: string;
  phone: string;
  website: string;
  message: string;
  estimate?: Partial<EstimateInput>;
  sourcePath?: string;
};

function clean(value: unknown, max: number) {
  return String(value ?? "")
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);
}

function cleanLong(value: unknown, max: number) {
  return String(value ?? "").replace(/\u0000/g, "").trim().slice(0, max);
}

function validEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i.test(value) && !/[\r\n]/.test(value);
}

function validWebsite(value: string) {
  if (!value) return "";
  const candidate = /^https?:\/\//i.test(value) ? value : `https://${value}`;
  try {
    const url = new URL(candidate);
    return url.protocol === "http:" || url.protocol === "https:" ? url.toString().slice(0, 600) : "";
  } catch {
    return "";
  }
}

function labelForKind(kind: string) {
  const labels: Record<string, string> = {
    starter: "One-page website",
    business: "Complete business website",
    booking: "Booking website",
    catalog: "Catalogue website",
    commerce: "Online shop",
    custom: "Custom web application",
  };
  return labels[kind] || "Website project";
}

function notificationText(input: PublicRequestInput, leadId: string) {
  const estimateInput = input.estimate ? normalizeEstimateInput(input.estimate) : null;
  const estimate = estimateInput ? calculateEstimate(estimateInput) : null;
  const lines = [
    `New ${input.requestType === "estimate" ? "website estimate request" : "website service contact"}`,
    `Lead ID: ${leadId}`,
    `Name: ${input.name}`,
    `Company: ${input.company || "Not supplied"}`,
    `Email: ${input.email}`,
    `Phone: ${input.phone || "Not supplied"}`,
    `Current website: ${input.website || "Not supplied"}`,
  ];
  if (estimateInput && estimate) {
    lines.push(
      `Project: ${labelForKind(estimateInput.siteKind)}`,
      `Pages: ${estimateInput.pages}`,
      `Extra languages: ${estimateInput.extraLanguages}`,
      `Features: ${estimateInput.features.join(", ") || "none selected"}`,
      `Care plan: ${estimateInput.carePlan}`,
      `Urgent: ${estimateInput.urgent ? "yes" : "no"}`,
      `Estimated setup: €${estimate.setupLow}–€${estimate.setupHigh}`,
      `Estimated monthly: €${estimate.monthly}`,
    );
  }
  lines.push("", "Message:", input.message || "No additional message");
  return lines.join("\n");
}

async function sendResendNotification(subject: string, text: string, replyTo: string) {
  const key = process.env.RESEND_API_KEY || "";
  const to = process.env.PUBLIC_CONTACT_TO_EMAIL || process.env.CONTACT_TO_EMAIL || "";
  const from = process.env.PUBLIC_CONTACT_FROM_EMAIL || process.env.EMAIL_FROM || "";
  if (!key || !to || !from) return { sent: false, reason: "not configured" };

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from, to: [to], reply_to: replyTo, subject, text }),
    cache: "no-store",
  });
  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(`Resend notification failed (${response.status})${detail ? `: ${detail.slice(0, 300)}` : ""}`);
  }
  return { sent: true };
}

export async function savePublicRequest(raw: PublicRequestInput) {
  const name = clean(raw.name, 180);
  const company = clean(raw.company, 180);
  const email = clean(raw.email, 240).toLowerCase();
  const phone = clean(raw.phone, 80);
  const website = validWebsite(clean(raw.website, 600));
  const message = cleanLong(raw.message, 12000);
  const requestType = raw.requestType === "estimate" ? "estimate" : "contact";

  if (name.length < 2) throw new Error("Please enter your name.");
  if (!validEmail(email)) throw new Error("Please enter a valid email address.");
  if (!company && requestType === "estimate") throw new Error("Please enter the business name.");
  if (message.length > 12000) throw new Error("Message is too long.");

  const estimateInput = requestType === "estimate" ? normalizeEstimateInput(raw.estimate || {}) : null;
  const estimate = estimateInput ? calculateEstimate(estimateInput) : null;
  const leadId = `public-${crypto.randomUUID()}`;
  const businessName = company || `${name} — website inquiry`;
  const packageName = estimateInput ? labelForKind(estimateInput.siteKind) : "Website service inquiry";
  const offerPrice = estimate ? `€${estimate.setupLow}–€${estimate.setupHigh}` : "Needs quote";
  const details = notificationText({ ...raw, requestType, name, company, email, phone, website, message, estimate: estimateInput || undefined }, leadId);

  await upsertLead({
    id: leadId,
    name: businessName,
    category: estimateInput?.siteKind || "website prospect",
    phone,
    email,
    website,
    contactStatus: "inbound",
    siteQuality: website ? "needs review" : "no website supplied",
    score: 95,
    status: "new",
    notes: details,
    offerPrice,
    packageName,
    source: `public-${requestType}`,
  });

  await runBusinessAction("inquiry.add", {
    leadId,
    name,
    email,
    phone,
    message: details,
    sourceSite: clean(raw.sourcePath || "/", 1200),
    status: "new",
  });
  await runBusinessAction("contact.upsert", { leadId, kind: "email", value: email, label: name, sourceUrl: raw.sourcePath || "/", confidence: 100, verified: false, primary: true });
  if (phone) await runBusinessAction("contact.upsert", { leadId, kind: "phone", value: phone, label: name, sourceUrl: raw.sourcePath || "/", confidence: 90, verified: false, primary: false });
  await runBusinessAction("activity.add", { leadId, kind: "inbound", summary: `Received public ${requestType} request`, metadata: { requestType, estimate: estimateInput, estimateResult: estimate } });
  await runBusinessAction("task.save", { leadId, title: `Reply to ${name}${company ? ` from ${company}` : ""}`, dueAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), priority: "high", done: false });

  let notificationSent = false;
  try {
    const result = await sendResendNotification(`New website request: ${businessName}`, details, email);
    notificationSent = result.sent;
  } catch (error) {
    await runBusinessAction("activity.add", { leadId, kind: "notification-error", summary: error instanceof Error ? error.message : "Email notification failed", metadata: {} }).catch(() => undefined);
  }

  return { leadId, estimate, notificationSent };
}
