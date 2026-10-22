// POST /api/login  { answer }  -> { token }
// GET  /api/login  (Authorization: Bearer <token>) -> { ok: true } si la sesión sigue vigente
const { issueToken, verifyToken, bearer, normalize, json, secret, secretError, crypto } = require("../lib/auth");

exports.handler = async (event) => {
  if (!secret()) {
    return json(500, { error: secretError() });
  }

  if (event.httpMethod === "GET") {
    return verifyToken(bearer(event)) ? json(200, { ok: true }) : json(401, { ok: false });
  }
  if (event.httpMethod !== "POST") return json(405, { error: "Método no permitido" });

  let answer = "";
  try {
    answer = JSON.parse(event.body || "{}").answer || "";
  } catch {
    return json(400, { error: "Solicitud inválida" });
  }

  // La respuesta correcta se define en la variable de entorno ACCESS_ANSWER.
  const expected = normalize(process.env.ACCESS_ANSWER || "");
  if (!expected) return json(500, { error: "Falta configurar ACCESS_ANSWER en Netlify." });

  const given = normalize(String(answer).slice(0, 100));
  const a = crypto.createHash("sha256").update(given).digest();
  const b = crypto.createHash("sha256").update(expected).digest();
  const ok = crypto.timingSafeEqual(a, b);

  // Pequeña pausa para frenar intentos repetidos
  await new Promise((r) => setTimeout(r, ok ? 150 : 900));

  if (!ok) return json(401, { error: "Esa no es. Piénsale tantito 🍳" });
  return json(200, { token: issueToken() });
};
