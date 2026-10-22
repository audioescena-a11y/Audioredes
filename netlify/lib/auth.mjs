// Utilidades compartidas: tokens de sesión firmados con HMAC.
// El secreto sale de SESSION_SECRET; si no existe, se genera uno solo y se guarda en Netlify Blobs.
import crypto from "node:crypto";
import { getStore } from "@netlify/blobs";

const SESSION_HOURS = 12;
let cached = null;

async function secret() {
  const env = (process.env.SESSION_SECRET || "").trim();
  if (env.length >= 16) return env;
  if (cached) return cached;
  const store = getStore({ name: "audioredes-config", consistency: "strong" });
  let s = await store.get("session-secret");
  if (!s) {
    await store.set("session-secret", crypto.randomBytes(32).toString("hex"), { onlyIfNew: true });
    s = await store.get("session-secret");
  }
  cached = s;
  return s;
}

function b64url(buf) {
  return Buffer.from(buf).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function sign(key, payload) {
  return b64url(crypto.createHmac("sha256", key).update(payload).digest());
}

export async function issueToken() {
  const exp = Date.now() + SESSION_HOURS * 3600 * 1000;
  const payload = String(exp);
  return payload + "." + sign(await secret(), payload);
}

export async function verifyToken(token) {
  if (typeof token !== "string") return false;
  const [payload, sig] = token.split(".");
  if (!payload || !sig) return false;
  const a = Buffer.from(sig);
  const b = Buffer.from(sign(await secret(), payload));
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return false;
  return Number(payload) > Date.now();
}

export function bearer(req) {
  const v = req.headers.get("authorization") || "";
  return v.startsWith("Bearer ") ? v.slice(7) : "";
}

// Normaliza la respuesta: sin mayúsculas, acentos, espacios ni signos (¡!¿?.)
export function normalize(s) {
  return String(s || "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9ñ]/g, "");
}

export function json(status, obj) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" },
  });
}

export { crypto };
