import "server-only";
import crypto from "node:crypto";
import { cookies } from "next/headers";
import type { NextRequest } from "next/server";
import { findAccountByEmail, findAccountById, verifyPassword } from "./accounts";

export type Role = "admin" | "user" | "customer";
export type ModuleKey = "chat" | "youtube" | "business" | "email" | "dev" | "settings" | "portal" | "admin";
export type Session = { username:string; role:Role; exp:number; accountId?:string; tenantId?:string; email?:string };
export const SESSION_COOKIE="black_terminal_session";
export const MODULE_LABELS:Record<ModuleKey,string>={chat:"Chat",youtube:"YouTube",business:"Business operations",email:"Email",dev:"Dev workspace",settings:"Settings",portal:"Customer portal",admin:"Administration"};
export const ROLE_MODULES:Record<Role,ModuleKey[]>={admin:["chat","youtube","business","email","dev","settings","portal","admin"],user:["chat"],customer:["portal","business","settings"]};
function secret(){const value=process.env.AUTH_SECRET||"";if(value.length<32)throw new Error("AUTH_SECRET must be at least 32 characters");return value}
function b64url(input:Buffer|string){return Buffer.from(input).toString("base64url")}
function sign(payload:string){return crypto.createHmac("sha256",secret()).update(payload).digest("base64url")}
function safeEqual(a:string,b:string){if(!a||!b)return false;const l=Buffer.from(a),r=Buffer.from(b);return l.length===r.length&&crypto.timingSafeEqual(l,r)}
export function createSessionValue(username:string,role:Role,extra:Partial<Session>={}){const days=Math.max(1,Math.min(Number(process.env.SESSION_DAYS||14),365));const payload=b64url(JSON.stringify({username,role,exp:Date.now()+days*86400000,...extra}));return `${payload}.${sign(payload)}`}
export function verifySessionValue(value:string):Session|null{try{const[p,s]=value.split(".");if(!p||!s||!safeEqual(s,sign(p)))return null;const x=JSON.parse(Buffer.from(p,"base64url").toString("utf8"));if(!x||typeof x.username!=="string"||!["admin","user","customer"].includes(x.role)||typeof x.exp!=="number"||x.exp<Date.now())return null;return x}catch{return null}}
export async function getSession(){const jar=await cookies();const session=verifySessionValue(jar.get(SESSION_COOKIE)?.value||"");if(session?.accountId){const a=await findAccountById(session.accountId).catch(()=>null);if(!a||a.status!=="active")return null;return {...session,username:a.name||a.email,email:a.email,tenantId:a.tenant_id,role:a.role};}return session}
export function getSessionFromRequest(req:NextRequest){return verifySessionValue(req.cookies.get(SESSION_COOKIE)?.value||"")}
export function canAccess(s:Session|null,m:ModuleKey){return !!s&&ROLE_MODULES[s.role].includes(m)}
export function isAdmin(s:Session|null){return s?.role==="admin"}
export function requireSession(req:NextRequest){const s=getSessionFromRequest(req);if(!s)throw new Error("Not logged in");return s}
export function requireAdmin(req:NextRequest){const s=requireSession(req);if(s.role!=="admin")throw new Error("Admin only");return s}
export function requireCustomer(req:NextRequest){const s=requireSession(req);if(s.role!=="customer"||!s.accountId||!s.tenantId)throw new Error("Customer only");return s}
export function requireModule(req:NextRequest,m:ModuleKey){const s=requireSession(req);if(!canAccess(s,m))throw new Error("Forbidden");return s}
export function authStatus(e:unknown){const x=typeof e==="object"&&e&&"status" in e?Number((e as any).status):0;if(Number.isInteger(x)&&x>=400&&x<=599)return x;const m=e instanceof Error?e.message:String(e||"");if(m==="Not logged in")return 401;if(["Admin only","Forbidden","Customer only"].includes(m))return 403;return 500}
export async function verifyLogin(usernameInput:string,passwordInput:string):Promise<Session|null>{
 const username=usernameInput.trim();
 const env=[{username:process.env.ADMIN_USERNAME||"",password:process.env.ADMIN_PASSWORD||"",role:"admin" as const},{username:process.env.FRIEND_USERNAME||process.env.USER_USERNAME||"",password:process.env.FRIEND_PASSWORD||process.env.USER_PASSWORD||"",role:"user" as const}];
 for(const u of env)if(u.username&&u.password&&safeEqual(username,u.username)&&safeEqual(passwordInput,u.password))return{username:u.username,role:u.role,exp:0};
 const account=await findAccountByEmail(username).catch(()=>null);if(!account||account.status!=="active"||!verifyPassword(passwordInput,account.password_hash))return null;
 return{username:account.name||account.email,email:account.email,role:account.role,accountId:account.id,tenantId:account.tenant_id,exp:0};
}

function base32Decode(input:string){const alphabet='ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';let bits='';for(const c of input.toUpperCase().replace(/[^A-Z2-7]/g,'')){const v=alphabet.indexOf(c);if(v>=0)bits+=v.toString(2).padStart(5,'0')}const out=[];for(let i=0;i+8<=bits.length;i+=8)out.push(parseInt(bits.slice(i,i+8),2));return Buffer.from(out)}
export function verifyTotp(codeInput:string,secretInput:string){const code=codeInput.replace(/\D/g,'');if(code.length!==6||!secretInput)return false;const key=base32Decode(secretInput);const now=Math.floor(Date.now()/30000);for(let w=-1;w<=1;w++){const b=Buffer.alloc(8);b.writeBigUInt64BE(BigInt(now+w));const h=crypto.createHmac('sha1',key).update(b).digest();const o=h[h.length-1]&15;const n=((h[o]&127)<<24)|(h[o+1]<<16)|(h[o+2]<<8)|h[o+3];if(String(n%1000000).padStart(6,'0')===code)return true}return false}
