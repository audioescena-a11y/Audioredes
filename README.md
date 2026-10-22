# Audioredes · AUDIOESCENA (v1)

Webapp para planear redes Dante: IPs, switches, diagrama, paso a paso con fuentes, exportación a PDF/Excel y asistente IA.

## Estructura

```
public/              → lo que ve el usuario (HTML, CSS, JS, librerías locales)
  assets/logo.png    → AQUÍ va el logo de AUDIOESCENA (PNG, fondo transparente)
netlify/functions/   → código que corre en el servidor (la clave y la API key NO están en el HTML)
  login.mjs          → verifica "¿A qué sabe el Omelette?"
  ask.mjs            → asistente IA (Anthropic, vía Netlify AI Gateway)
netlify/lib/         → utilidades y base de conocimiento verificada (kb.js)
netlify.toml         → configuración de Netlify
test/dev-server.js   → servidor para probar en tu computadora
```

## Variables de entorno (Netlify → Site configuration → Environment variables)

| Variable | Valor | ¿Obligatoria? |
|---|---|---|
| `ACCESS_ANSWER` | `Ahuevo` | Sí |
| `SESSION_SECRET` | Texto aleatorio largo (mínimo 16 caracteres). Si no existe o es muy corta, la app genera uno sola y lo guarda en Netlify Blobs | No |
| `ANTHROPIC_API_KEY` | No hace falta: Netlify AI Gateway la pone sola. No crees esta variable (si la creas, se desactiva el Gateway) | No |
| `ANTHROPIC_MODEL` | Por defecto `claude-sonnet-5-5` | No |
| `ANTHROPIC_VERSION` | Por defecto `2023-06-01` | No |

La respuesta acepta mayúsculas/minúsculas, acentos, espacios y signos: "ahuevo", "¡AHUEVO!" y "Ahuevo" funcionan. La sesión dura 12 horas.

## Publicar en Netlify

**Importante:** subir la carpeta arrastrándola (Netlify Drop) NO publica las funciones del servidor, y sin ellas no funciona el acceso ni la IA. Usa una de estas dos opciones:

**Opción A · GitHub (recomendada)**
1. Sube esta carpeta a un repositorio privado de GitHub.
2. En Netlify: Add new site → Import an existing project → elige el repositorio.
3. Netlify lee `netlify.toml` solo (publish = `public`). No hay comando de build.
4. Agrega las variables de entorno de la tabla y vuelve a desplegar (Deploys → Trigger deploy).

**Opción B · Netlify CLI**
1. Instala Node.js y luego: `npm install -g netlify-cli`
2. En esta carpeta: `netlify login`, después `netlify init` (o `netlify link`).
3. Configura las variables en el panel de Netlify.
4. `netlify deploy --prod`

## Probar en tu computadora

```
ACCESS_ANSWER=Ahuevo SESSION_SECRET=prueba-secreta-1234567890 MOCK_AI=1 ANTHROPIC_API_KEY=x node test/dev-server.js
```
Abre http://localhost:8888. Con `MOCK_AI=1` la IA responde con un texto de prueba y no gasta créditos. Quita `MOCK_AI` y pon tu API key real para probar la IA de verdad.

## Datos y privacidad

- Los proyectos se guardan solo en el navegador de cada usuario (localStorage). Usa "⋯ → Guardar proyecto (.json)" para respaldar o compartir.
- La pantalla de acceso protege el uso de la IA (y de tu API key). El HTML de la app en sí es público por naturaleza de un sitio estático; no pongas información confidencial en el código.

## Qué está verificado y qué no

Cada paso técnico cita su fuente (pestaña Ayuda → Fuentes). Pendiente de documentación: Art-Net/iluminación, equipos de video, QLab, versión/licencia de DVS y el switch NETGEAR de 16 puertos (falta modelo exacto).
