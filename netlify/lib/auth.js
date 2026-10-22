// Utilidades compartidas: tokens de sesión firmados con HMAC.
// La clave y el secreto viven SOLO en variables de entorno de Netlify.
const crypto = require("crypto");

const SESSION_HOURS = 12;

function secret() {
  const s = process.env.SESSION_SECRET;
  if (!s || s.length < 16) return null;
  return s;
}

function b64url(buf) {
  return Buffer.from(buf).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function sign(payload) {
  return b64url(crypto.createHmac("sha256", secret()).update(payload).digest());
}

function issueToken() {
  const exp = Date.now() + SESSION_HOURS * 3600 * 1000;
  const payload = String(exp);
  return payload + "." + sign(payload);
}

function verifyToken(token) {
  if (!secret() || typeof token !== "string") return false;
  const [payload, sig] = token.split(".");
  if (!payload || !sig) return false;
  const expected = sign(payload);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return false;
  return Number(payload) > Date.now();
}

function bearer(event) {
  const h = event.headers || {};
  const v = h.authorization || h.Authorization || "";
  return v.startsWith("Bearer ") ? v.slice(7) : "";
}

// Normaliza la respuesta: sin mayúsculas, acentos, espacios ni signos (¡!¿?.)
function normalize(s) {
  return String(s || "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9ñ]/g, "");
}

function json(statusCode, obj) {
  return {
    statusCode,
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" },
    body: JSON.stringify(obj),
  };
}

module.exports = { issueToken, verifyToken, bearer, normalize, json, secret, crypto };
