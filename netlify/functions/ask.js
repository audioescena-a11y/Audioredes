// POST /api/ask  (Authorization: Bearer <token>)
// body: { messages: [{role, content}], project: {...}, mode: "chat" | "review" }
const { verifyToken, bearer, json } = require("../lib/auth");
const KB = require("../lib/kb");

const MODEL = process.env.ANTHROPIC_MODEL || "claude-sonnet-5-5";
const API_VERSION = process.env.ANTHROPIC_VERSION || "2026-10-21";
const MAX_TOKENS = Number(process.env.ANTHROPIC_MAX_TOKENS || 1600);

const SYSTEM = `Eres el asistente técnico de AUDIOREDES (AUDIOESCENA): experto en redes IP, Audio over IP, Dante/Audinate, switches administrables y sistemas de audio profesional.
El usuario puede ser principiante en redes: explica paso a paso, en español claro, sin jerga innecesaria.

REGLAS DE VERIFICACIÓN (obligatorias):
1. Distingue siempre entre: ✅ VERIFICADO (está en la base de conocimiento, cita el código de fuente entre corchetes, p. ej. [DA10203]) y ⚠️ POR VERIFICAR (conocimiento general tuyo que no está en las fuentes cargadas; di qué manual consultar).
2. Nunca inventes valores, menús, puertos, IPs por defecto ni límites de equipos. Si no lo sabes con certeza, dilo y pregunta el dato que falta.
3. Si algo podría causar pérdida de audio en show (reloj, IPs duplicadas, EEE, DHCP en red activa, frecuencias de muestreo distintas), márcalo como 🔴 CRÍTICO.
4. Respuestas breves y ordenadas: primero la respuesta, luego pasos numerados, al final "Fuentes".

Cuando el modo sea REVISIÓN: revisa el proyecto JSON del usuario y entrega: (a) Visto bueno o no, (b) problemas críticos, (c) advertencias, (d) datos faltantes que debe conseguir, (e) siguiente paso recomendado. No apruebes nada que dependa de datos marcados como pendientes.

BASE DE CONOCIMIENTO VERIFICADA:
${KB}`;

function clean(messages) {
  if (!Array.isArray(messages)) return [];
  return messages
    .filter((m) => m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string")
    .slice(-12)
    .map((m) => ({ role: m.role, content: m.content.slice(0, 6000) }));
}

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") return json(405, { error: "Método no permitido" });
  if (!verifyToken(bearer(event))) return json(401, { error: "Sesión vencida. Vuelve a entrar." });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return json(500, { error: "Falta configurar ANTHROPIC_API_KEY en Netlify." });

  let body;
  try {
    body = JSON.parse(event.body || "{}");
  } catch {
    return json(400, { error: "Solicitud inválida" });
  }

  const messages = clean(body.messages);
  const projectText = body.project ? JSON.stringify(body.project).slice(0, 30000) : "";
  const mode = body.mode === "review" ? "REVISIÓN" : "CONSULTA";

  if (mode === "REVISIÓN") {
    messages.push({ role: "user", content: "Revisa mi proyecto y dame el visto bueno o las correcciones." });
  }
  if (!messages.length || messages[messages.length - 1].role !== "user") {
    return json(400, { error: "Falta la pregunta." });
  }
  // El contexto del proyecto va en el último mensaje del usuario
  const last = messages[messages.length - 1];
  last.content = `MODO: ${mode}\n\nPROYECTO ACTUAL (JSON):\n${projectText || "(vacío)"}\n\nMENSAJE:\n${last.content}`;

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": API_VERSION,
        "content-type": "application/json",
      },
      body: JSON.stringify({ model: MODEL, max_tokens: MAX_TOKENS, system: SYSTEM, messages }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const msg = (data && data.error && data.error.message) || `Error ${res.status}`;
      return json(502, { error: "La IA no respondió correctamente: " + msg });
    }
    const text = (data.content || [])
      .filter((b) => b.type === "text")
      .map((b) => b.text)
      .join("\n")
      .trim();
    return json(200, { text: text || "(Sin respuesta)" });
  } catch (e) {
    return json(502, { error: "No se pudo contactar a la IA: " + e.message });
  }
};
