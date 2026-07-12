import "server-only";
import crypto from "node:crypto";

function config() {
  const accountSid = process.env.TWILIO_ACCOUNT_SID || "";
  const authToken = process.env.TWILIO_AUTH_TOKEN || "";
  const fromNumber = process.env.TWILIO_FROM_NUMBER || "";
  const messagingServiceSid = process.env.TWILIO_MESSAGING_SERVICE_SID || "";
  if (!accountSid || !authToken || (!fromNumber && !messagingServiceSid)) throw new Error("Twilio is not configured. Set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and a from number or messaging service SID.");
  return { accountSid, authToken, fromNumber, messagingServiceSid };
}

export function normalizePhone(value: string, defaultCountry = "+358") {
  let phone = value.trim().replace(/[()\s.-]/g, "");
  if (phone.startsWith("00")) phone = `+${phone.slice(2)}`;
  if (phone.startsWith("0") && defaultCountry) phone = `${defaultCountry}${phone.slice(1)}`;
  if (!/^\+[1-9]\d{6,14}$/.test(phone)) throw new Error("Use an international phone number such as +358401234567");
  return phone;
}

export async function sendTwilioSms(input: { to: string; body: string; statusCallback?: string }) {
  const { accountSid, authToken, fromNumber, messagingServiceSid } = config();
  const params = new URLSearchParams({ To: normalizePhone(input.to), Body: input.body.slice(0, 1600) });
  if (messagingServiceSid) params.set("MessagingServiceSid", messagingServiceSid);
  else params.set("From", normalizePhone(fromNumber, ""));
  if (input.statusCallback) params.set("StatusCallback", input.statusCallback);
  const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${encodeURIComponent(accountSid)}/Messages.json`, {
    method: "POST",
    headers: { Authorization: `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString("base64")}`, "Content-Type": "application/x-www-form-urlencoded" },
    body: params,
    cache: "no-store",
  });
  const data = await response.json().catch(() => ({})) as Record<string, unknown>;
  if (!response.ok) throw new Error(String(data.message || data.error_message || `Twilio send failed (${response.status})`));
  return { sid: String(data.sid || ""), status: String(data.status || "queued"), to: String(data.to || input.to), from: String(data.from || fromNumber || messagingServiceSid) };
}

export function validateTwilioSignature(url: string, params: Record<string, string>, signature: string) {
  const token = process.env.TWILIO_AUTH_TOKEN || "";
  if (!token || !signature) return false;
  let data = url;
  for (const key of Object.keys(params).sort()) data += key + params[key];
  const expected = crypto.createHmac("sha1", token).update(data, "utf8").digest("base64");
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}
