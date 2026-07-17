import "server-only";
import crypto from "node:crypto";
import { neon } from "@neondatabase/serverless";

const db = () => {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is not set");
  return neon(process.env.DATABASE_URL);
};

export type AccountRole = "admin" | "customer";
export type AccountRecord = {
  id: string; email: string; phone: string; name: string; company_name: string; role: AccountRole;
  status: string; email_verified: boolean; phone_verified: boolean; locale: string; tenant_id: string;
};

function normalizeEmail(value: string) { return value.trim().toLowerCase().slice(0, 254); }
function normalizePhone(value: string) { return value.replace(/[^+\d]/g, "").slice(0, 32); }
function passwordPolicy(value: string) {
  if (value.length < 12) throw new Error("Password must contain at least 12 characters.");
  if (!/[a-z]/.test(value) || !/[A-Z]/.test(value) || !/\d/.test(value)) throw new Error("Password must include upper-case, lower-case and a number.");
}
export function hashPassword(password: string) {
  passwordPolicy(password);
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return `scrypt:${salt}:${hash}`;
}
export function verifyPassword(password: string, stored: string) {
  try {
    const [kind, salt, expected] = stored.split(":");
    if (kind !== "scrypt" || !salt || !expected) return false;
    const actual = crypto.scryptSync(password, salt, 64);
    const target = Buffer.from(expected, "hex");
    return actual.length === target.length && crypto.timingSafeEqual(actual, target);
  } catch { return false; }
}
function code() { return String(crypto.randomInt(100000, 999999)); }
function token() { return crypto.randomBytes(32).toString("base64url"); }
function digest(value: string) { return crypto.createHash("sha256").update(value).digest("hex"); }

export async function findAccountByEmail(emailInput: string): Promise<(AccountRecord & { password_hash: string }) | null> {
  const sql = db();
  const rows = await sql`SELECT a.id::text, a.email, a.phone, a.name, a.company_name, a.role, a.status, a.email_verified, a.phone_verified, a.locale, a.password_hash,
    COALESCE((SELECT t.id::text FROM viewport_tenants t WHERE t.owner_account_id=a.id ORDER BY t.created_at LIMIT 1),'') tenant_id
    FROM viewport_accounts a WHERE a.email=${normalizeEmail(emailInput)} LIMIT 1`;
  return (rows[0] as any) || null;
}
export async function findAccountById(id: string): Promise<AccountRecord | null> {
  const sql = db();
  const rows = await sql`SELECT a.id::text, a.email, a.phone, a.name, a.company_name, a.role, a.status, a.email_verified, a.phone_verified, a.locale,
    COALESCE((SELECT t.id::text FROM viewport_tenants t WHERE t.owner_account_id=a.id ORDER BY t.created_at LIMIT 1),'') tenant_id
    FROM viewport_accounts a WHERE a.id::text=${id} LIMIT 1`;
  return (rows[0] as any) || null;
}
export async function createCustomer(input: { email: string; phone?: string; password: string; name: string; companyName: string; locale?: string }) {
  const sql = db();
  const email = normalizeEmail(input.email);
  if (!/^\S+@\S+\.\S+$/.test(email)) throw new Error("Enter a valid email address.");
  if (input.name.trim().length < 2 || input.companyName.trim().length < 2) throw new Error("Name and company are required.");
  const id = crypto.randomUUID();
  const tenantId = crypto.randomUUID();
  const slug = input.companyName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 50) || `company-${id.slice(0,8)}`;
  await sql`INSERT INTO viewport_accounts(id,email,phone,password_hash,name,company_name,role,status,locale)
    VALUES(${id}::uuid,${email},${normalizePhone(input.phone||"")},${hashPassword(input.password)},${input.name.trim().slice(0,120)},${input.companyName.trim().slice(0,160)},'customer','active',${input.locale==='fi'?'fi':'en'})`;
  await sql`INSERT INTO viewport_tenants(id,owner_account_id,name,slug,plan,status,settings)
    VALUES(${tenantId}::uuid,${id}::uuid,${input.companyName.trim().slice(0,160)},${slug},'trial','active','{}'::jsonb)`;
  const emailCode = await createVerification(id, "email", email);
  return { id, tenantId, email, emailCode };
}
export async function createVerification(accountId: string, channel: "email"|"phone", destination: string) {
  const sql = db(); const value = code();
  await sql`DELETE FROM viewport_verification_codes WHERE account_id=${accountId}::uuid AND channel=${channel}`;
  await sql`INSERT INTO viewport_verification_codes(account_id,channel,destination,code_hash,expires_at)
    VALUES(${accountId}::uuid,${channel},${destination},${digest(value)},NOW()+INTERVAL '15 minutes')`;
  return value;
}
export async function verifyCode(accountId: string, channel: "email"|"phone", value: string) {
  const sql = db();
  const rows = await sql`DELETE FROM viewport_verification_codes WHERE account_id=${accountId}::uuid AND channel=${channel} AND code_hash=${digest(value)} AND expires_at>NOW() RETURNING id`;
  if (!rows.length) return false;
  if (channel === "email") await sql`UPDATE viewport_accounts SET email_verified=TRUE, updated_at=NOW() WHERE id=${accountId}::uuid`;
  else await sql`UPDATE viewport_accounts SET phone_verified=TRUE, updated_at=NOW() WHERE id=${accountId}::uuid`;
  return true;
}
export async function createPasswordReset(emailInput: string) {
  const account = await findAccountByEmail(emailInput); if (!account) return null;
  const sql = db(); const raw = token();
  await sql`DELETE FROM viewport_password_resets WHERE account_id=${account.id}::uuid`;
  await sql`INSERT INTO viewport_password_resets(account_id,token_hash,expires_at) VALUES(${account.id}::uuid,${digest(raw)},NOW()+INTERVAL '45 minutes')`;
  return { token: raw, account };
}
export async function resetPassword(rawToken: string, password: string) {
  const sql = db();
  const rows = await sql`DELETE FROM viewport_password_resets WHERE token_hash=${digest(rawToken)} AND expires_at>NOW() RETURNING account_id::text`;
  if (!rows.length) return false;
  await sql`UPDATE viewport_accounts SET password_hash=${hashPassword(password)}, updated_at=NOW() WHERE id=${String((rows[0] as any).account_id)}::uuid`;
  return true;
}
export async function updateAccount(accountId: string, input: { name?: string; companyName?: string; phone?: string; locale?: string }) {
  const sql=db();
  await sql`UPDATE viewport_accounts SET name=COALESCE(${input.name?.trim().slice(0,120)||null},name), company_name=COALESCE(${input.companyName?.trim().slice(0,160)||null},company_name), phone=COALESCE(${input.phone!==undefined?normalizePhone(input.phone):null},phone), locale=COALESCE(${input.locale==='fi'||input.locale==='en'?input.locale:null},locale), updated_at=NOW() WHERE id=${accountId}::uuid`;
}
export async function encryptSecret(value: string) {
  const key = crypto.createHash("sha256").update(process.env.CREDENTIAL_ENCRYPTION_KEY || process.env.AUTH_SECRET || "").digest();
  const iv=crypto.randomBytes(12); const cipher=crypto.createCipheriv("aes-256-gcm",key,iv); const body=Buffer.concat([cipher.update(value,"utf8"),cipher.final()]);
  return `${iv.toString("base64url")}.${cipher.getAuthTag().toString("base64url")}.${body.toString("base64url")}`;
}
export async function decryptSecret(value: string) {
  const [i,t,b]=value.split("."); const key=crypto.createHash("sha256").update(process.env.CREDENTIAL_ENCRYPTION_KEY || process.env.AUTH_SECRET || "").digest();
  const decipher=crypto.createDecipheriv("aes-256-gcm",key,Buffer.from(i,"base64url")); decipher.setAuthTag(Buffer.from(t,"base64url"));
  return Buffer.concat([decipher.update(Buffer.from(b,"base64url")),decipher.final()]).toString("utf8");
}
