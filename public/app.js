/* =====================================================================
   AUDIOREDES · lógica de la app
   ===================================================================== */
(() => {
  "use strict";

  const LS_KEY = "audioredes.proyecto.v1";
  const TK_KEY = "audioredes.token";
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  let P = cargar();
  let chat = [];
  let token = sessionStorage.getItem(TK_KEY) || "";

  // ------------------------------------------------------------ almacenamiento
  function cargar() {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (raw) {
        const p = JSON.parse(raw);
        if (p && p.version === 1) return p;
      }
    } catch (e) { /* almacenamiento no disponible */ }
    return proyectoDefault();
  }
  function guardar() {
    try { localStorage.setItem(LS_KEY, JSON.stringify(P)); } catch (e) { /* ignorar */ }
  }
  function toast(msg) {
    const t = $("#toast");
    t.textContent = msg;
    t.hidden = false;
    clearTimeout(toast._t);
    toast._t = setTimeout(() => (t.hidden = true), 2600);
  }

  // ------------------------------------------------------------ acceso
  async function api(path, opts = {}) {
    const headers = { "Content-Type": "application/json", ...(opts.headers || {}) };
    if (token) headers.Authorization = "Bearer " + token;
    const res = await fetch(path, { ...opts, headers });
    const data = await res.json().catch(() => ({}));
    if (res.status === 401 && path !== "/api/login") salir("Tu sesión venció. Vuelve a entrar.");
    return { ok: res.ok, status: res.status, data };
  }

  async function iniciar() {
    if (token) {
      try {
        const r = await api("/api/login", { method: "GET" });
        if (r.ok) return mostrarApp();
      } catch (e) { /* sin servidor */ }
      token = "";
      sessionStorage.removeItem(TK_KEY);
    }
  }

  $("#gateForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const msg = $("#gateMsg");
    msg.textContent = "Verificando…";
    try {
      const r = await api("/api/login", { method: "POST", body: JSON.stringify({ answer: $("#answer").value }) });
      if (r.ok && r.data.token) {
        token = r.data.token;
        sessionStorage.setItem(TK_KEY, token);
        msg.textContent = "";
        $("#answer").value = "";
        mostrarApp();
      } else {
        msg.textContent = r.data.error || "No se pudo verificar.";
      }
    } catch (err) {
      msg.textContent = "No hay conexión con el servidor. (¿Abriste el archivo local? Debe correr en Netlify.)";
    }
  });

  function salir(msg) {
    token = "";
    sessionStorage.removeItem(TK_KEY);
    $("#app").hidden = true;
    $("#gate").hidden = false;
    $("#gateMsg").textContent = msg || "";
  }

  function mostrarApp() {
    $("#gate").hidden = true;
    $("#app").hidden = false;
    renderTodo();
  }

  // ------------------------------------------------------------ utilidades IP
  function host(ip) {
    const m = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(String(ip || "").trim());
    if (!m) return null;
    const o = m.slice(1).map(Number);
    if (o.some((x) => x > 255)) return null;
    return { prefijo: o.slice(0, 3).join("."), h: o[3] };
  }
  function ipLibre(desde = 20, hasta = 254) {
    const usadas = new Set(P.equipos.map((e) => host(e.ip)).filter((x) => x && x.prefijo === P.red.subred).map((x) => x.h));
    for (let h = desde; h <= hasta; h++) if (!usadas.has(h)) return `${P.red.subred}.${h}`;
    return "";
  }
  function swPorId(id) { return P.switches.find((s) => s.id === id); }

  // ------------------------------------------------------------ validación
  function validar() {
    const out = [];
    const ips = {}, nombres = {}, puertos = {};
    const subOk = /^\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(P.red.subred);
    if (!subOk) out.push({ n: "bad", t: "La subred debe tener 3 números, p. ej. 192.168.1" });

    P.equipos.forEach((e) => {
      e._err = false;
      const nm = (e.nombre || "").trim();
      if (!nm) { out.push({ n: "bad", t: "Hay un equipo sin nombre." }); e._err = true; }
      else (nombres[nm.toLowerCase()] ||= []).push(e);

      const h = host(e.ip);
      if (!e.ip) { out.push({ n: "warn", t: `${nm || "Equipo"}: sin IP.` }); }
      else if (!h) { out.push({ n: "bad", t: `${nm}: IP con formato inválido (${e.ip}).` }); e._err = true; }
      else {
        if (h.prefijo !== P.red.subred) { out.push({ n: "bad", t: `${nm}: ${e.ip} está fuera de la subred ${P.red.subred}.x — no podrá comunicarse.` }); e._err = true; }
        if (h.h === 0 || h.h === 255) { out.push({ n: "bad", t: `${nm}: no uses .0 ni .255 [L1].` }); e._err = true; }
        else if (h.h < 10) out.push({ n: "warn", t: `${nm}: .${h.h} está en el bloque reservado (1–9).` });
        (ips[e.ip] ||= []).push(e);
      }
      if (e.sw && e.puerto !== "" && e.puerto != null) {
        const sw = swPorId(e.sw);
        if (!sw) { out.push({ n: "bad", t: `${nm}: switch inexistente.` }); e._err = true; }
        else if (!sw.puertos.some((p) => p.n == e.puerto)) { out.push({ n: "bad", t: `${nm}: el puerto ${e.puerto} no existe en ${sw.nombre}.` }); e._err = true; }
        else (puertos[e.sw + ":" + e.puerto] ||= []).push(e);
      }
    });

    Object.entries(ips).forEach(([ip, l]) => {
      if (l.length > 1) { out.push({ n: "bad", t: `🔴 IP duplicada ${ip}: ${l.map((x) => x.nombre).join(", ")}.` }); l.forEach((x) => (x._err = true)); }
    });
    Object.values(nombres).forEach((l) => {
      if (l.length > 1) { out.push({ n: "bad", t: `🔴 Nombre repetido "${l[0].nombre}". Dante rutea por nombre: deben ser únicos [TI317].` }); l.forEach((x) => (x._err = true)); }
    });
    P.switches.forEach((sw) => (sw.uplinks || []).forEach((u) => (puertos[sw.id + ":" + u.puerto] ||= []).push({ nombre: "enlace" })));
    Object.entries(puertos).forEach(([k, l]) => {
      if (l.length > 1) { const [s, p] = k.split(":"); out.push({ n: "bad", t: `🔴 Puerto ${p} de ${swPorId(s)?.nombre} usado por: ${l.map((x) => x.nombre).join(", ")}.` }); l.forEach((x) => (x._err = true)); }
    });

    const d = P.decisiones;
    if (!d.tarjetaSQ5 || !d.tarjetaSQ6) out.push({ n: "warn", t: "Falta confirmar el modelo de tarjeta Dante de cada SQ." });
    if (!d.fs) out.push({ n: "warn", t: "Falta definir la frecuencia de muestreo (debe ser igual en SQ y DVS) [L1]." });
    if (!d.lucesVideo) out.push({ n: "warn", t: "Falta decidir si iluminación y video comparten la red de Dante." });
    if (d.lucesVideo && d.lucesVideo !== "separada") out.push({ n: "info", t: "Con video IP en el mismo segmento, IGMP debe estar activo; un querier por VLAN [DA10203]." });
    if (!d.switch16Modelo) out.push({ n: "warn", t: "Falta el modelo exacto del switch de 16 puertos para verificar EEE, IGMP y QoS." });
    const pend = P.equipos.filter((e) => e.estado === "pendiente").length;
    if (pend) out.push({ n: "warn", t: `${pend} equipo(s) marcados como pendientes.` });
    if (!out.some((x) => x.n === "bad")) out.unshift({ n: "ok", t: "Sin conflictos de IP, nombres ni puertos." });
    return out;
  }

  // ------------------------------------------------------------ render
  function renderTodo() {
    renderBind();
    renderDecisiones();
    renderEquipos();
    renderSwitches();
    renderChecklist();
    renderAyuda();
    renderEstado();
    renderDiagrama();
  }
  function cambio() {
    guardar();
    renderEstado();
    renderEquiposEstado();
    renderSwitches();
    renderDiagrama();
  }

  function get(path) { return path.split(".").reduce((o, k) => (o ? o[k] : ""), P); }
  function set(path, v) { const ks = path.split("."); const last = ks.pop(); ks.reduce((o, k) => o[k], P)[last] = v; }

  function renderBind() {
    $$("[data-bind]").forEach((el) => {
      el.value = get(el.dataset.bind) ?? "";
      el.oninput = () => {
        let v = el.value;
        if (el.dataset.bind === "red.subred") v = v.trim();
        set(el.dataset.bind, v);
        if (el.dataset.bind === "red.subred") { $("#lblSubred").textContent = v; renderBloques(); }
        cambio();
      };
    });
  }

  const DECISIONES = [
    { k: "tarjetaSQ5", l: "Tarjeta Dante SQ5", o: ["", "M-SQ-SDANTE (V1)", "M-SQ-DANT64 (V3)", "M-SQ-DANT32 (V3)"] },
    { k: "tarjetaSQ6", l: "Tarjeta Dante SQ6", o: ["", "M-SQ-SDANTE (V1)", "M-SQ-DANT64 (V3)", "M-SQ-DANT32 (V3)"] },
    { k: "lider", l: "Consola líder de reloj", o: ["SQ5", "SQ6"] },
    { k: "fs", l: "Frecuencia de muestreo Dante", o: ["", "48 kHz", "96 kHz"] },
    { k: "latencia", l: "Latencia Dante", o: ["", "0.25 ms", "0.5 ms", "1 ms", "5 ms"] },
    { k: "lucesVideo", l: "Iluminación y video", o: [["", ""], ["separada", "Red física separada"], ["misma", "Misma red, misma VLAN"], ["vlan", "Misma red, VLANs separadas"]] },
    { k: "usarPuertoNetworkSQ", l: "¿Usarás SQ-MixPad?", o: ["", "Sí", "No"] },
    { k: "switch16Modelo", l: "Modelo switch 16 puertos", text: true },
    { k: "dvs", l: "Versión de Dante Virtual Soundcard", text: true },
  ];
  function renderDecisiones() {
    $("#decisiones").innerHTML = DECISIONES.map((d) => {
      const v = P.decisiones[d.k] || "";
      if (d.text) return `<label>${d.l}<input data-dec="${d.k}" value="${esc(v)}" placeholder="Escribe el dato"></label>`;
      const ops = d.o.map((o) => { const [val, txt] = Array.isArray(o) ? o : [o, o || "— elegir —"]; return `<option value="${esc(val)}" ${val === v ? "selected" : ""}>${esc(txt || "— elegir —")}</option>`; }).join("");
      return `<label>${d.l}<select data-dec="${d.k}">${ops}</select></label>`;
    }).join("");
    $$("[data-dec]").forEach((el) => (el.oninput = () => { P.decisiones[el.dataset.dec] = el.value; cambio(); }));
  }

  function renderBloques() {
    $("#bloques").innerHTML = BLOQUES.map((b) => `<span class="chip"><b>.${b.desde}–.${b.hasta}</b> ${esc(b.uso)}</span>`).join("");
  }

  function opcionesSw(sel) {
    return `<option value="">—</option>` + P.switches.map((s) => `<option value="${s.id}" ${s.id === sel ? "selected" : ""}>${esc(s.nombre)}</option>`).join("");
  }
  function opcionesPuerto(swId, sel) {
    const sw = swPorId(swId);
    if (!sw) return `<option value="">—</option>`;
    return `<option value="">—</option>` + sw.puertos.map((p) => `<option value="${p.n}" ${p.n == sel ? "selected" : ""}>${p.n}</option>`).join("");
  }

  function renderEquipos() {
    $("#lblSubred").textContent = P.red.subred;
    renderBloques();
    const tb = $("#tblEquipos tbody");
    tb.innerHTML = P.equipos.map((e) => `
      <tr data-id="${e.id}">
        <td><input data-f="nombre" value="${esc(e.nombre)}"></td>
        <td><select data-f="tipo">${Object.entries(TIPOS).map(([k, t]) => `<option value="${k}" ${k === e.tipo ? "selected" : ""}>${t.label}</option>`).join("")}</select></td>
        <td><input data-f="equipo" value="${esc(e.equipo)}"></td>
        <td><input data-f="interfaz" value="${esc(e.interfaz)}"></td>
        <td><input data-f="ip" class="ip" value="${esc(e.ip)}"></td>
        <td><select data-f="sw">${opcionesSw(e.sw)}</select></td>
        <td><select data-f="puerto">${opcionesPuerto(e.sw, e.puerto)}</select></td>
        <td><select data-f="estado"><option value="ok" ${e.estado === "ok" ? "selected" : ""}>Listo</option><option value="pendiente" ${e.estado === "pendiente" ? "selected" : ""}>Pendiente</option></select></td>
        <td><input data-f="notas" value="${esc(e.notas)}"></td>
        <td><button class="btn sm ghost" data-del title="Eliminar">✕</button></td>
      </tr>`).join("");
    $$("tr[data-id]", tb).forEach((tr) => {
      const e = P.equipos.find((x) => x.id === tr.dataset.id);
      $$("[data-f]", tr).forEach((el) => {
        el.oninput = () => {
          const f = el.dataset.f;
          e[f] = f === "puerto" ? (el.value === "" ? "" : Number(el.value)) : el.value;
          if (f === "sw") { e.puerto = ""; tr.querySelector('[data-f="puerto"]').innerHTML = opcionesPuerto(e.sw, ""); }
          cambio();
        };
      });
      $("[data-del]", tr).onclick = () => {
        if (!confirm(`¿Eliminar ${e.nombre || "este equipo"}?`)) return;
        P.equipos = P.equipos.filter((x) => x !== e);
        guardar(); renderEquipos(); cambio();
      };
    });
    renderEquiposEstado();
  }
  function renderEquiposEstado() {
    validar();
    $$("#tblEquipos tr[data-id]").forEach((tr) => {
      const e = P.equipos.find((x) => x.id === tr.dataset.id);
      if (!e) return;
      tr.classList.toggle("err", !!e._err);
      tr.classList.toggle("pend", e.estado === "pendiente");
    });
  }

  $("#btnAdd").onclick = () => {
    P.equipos.push({ id: uid(), nombre: "", tipo: "dante", equipo: "", interfaz: "", ip: ipLibre(20), sw: "", puerto: "", estado: "pendiente", notas: "" });
    guardar(); renderEquipos(); cambio();
    const ins = $$("#tblEquipos tbody tr:last-child input");
    if (ins[0]) ins[0].focus();
  };
  $("#btnSugerir").onclick = () => {
    const ip = ipLibre(20);
    if (!ip) return toast("No hay IPs libres en la subred.");
    navigator.clipboard?.writeText(ip).catch(() => {});
    toast(`IP libre sugerida: ${ip} (copiada)`);
  };

  function renderEstado() {
    const v = validar();
    const malos = v.filter((x) => x.n === "bad").length;
    const ck = CHECKLIST.flatMap((g) => g.pasos);
    const hechos = ck.filter((p) => P.checklist[p.id]).length;
    $("#stats").innerHTML = [
      ["Equipos", P.equipos.length],
      ["Conflictos", malos],
      ["Pendientes", P.equipos.filter((e) => e.estado === "pendiente").length],
      ["Checklist", `${hechos}/${ck.length}`],
    ].map(([l, n]) => `<div class="stat"><b>${n}</b><span>${l}</span></div>`).join("");
    $("#validacion").innerHTML = v.map((x) => `<li class="${x.n}">${esc(x.t)}</li>`).join("");
  }

  // ------------------------------------------------------------ switches
  function renderSwitches() {
    const mapa = {};
    P.equipos.forEach((e) => { if (e.sw && e.puerto !== "") (mapa[e.sw + ":" + e.puerto] ||= []).push(e); });
    $("#swList").innerHTML = P.switches.map((sw) => {
      (sw.uplinks ||= []);
      sw.uplinks.forEach((u) => (mapa[sw.id + ":" + u.puerto] ||= []).push({ nombre: "↔ " + (swPorId(u.a)?.nombre || "?"), tipo: "switch" }));
      const ports = sw.puertos.map((p) => {
        const l = mapa[sw.id + ":" + p.n] || [];
        const cls = l.length > 1 ? "conf" : l.length ? "used" : "";
        return `<div class="port ${cls}"><span class="pn">P${p.n}</span><span class="pt">${esc(p.tipo)}</span>${l.map((e) => `<span class="pd" style="color:${TIPOS[e.tipo]?.color || "#fff"}">${esc(e.nombre)}</span>`).join("")}</div>`;
      }).join("");
      const otros = P.switches.filter((s) => s.id !== sw.id);
      const ul = sw.uplinks.map((u, i) => `<div class="chip">Puerto <b>${u.puerto}</b> → ${esc(swPorId(u.a)?.nombre || "?")} puerto <b>${u.pa}</b> <button class="btn sm ghost" data-ul-del="${sw.id}:${i}">✕</button></div>`).join("");
      return `<div class="card">
        <div class="card-head"><h2>${esc(sw.nombre)}</h2><span class="hint">${sw.puertos.length} puertos</span></div>
        <div class="form">
          <label>Nombre<input data-sw="${sw.id}" data-k="nombre" value="${esc(sw.nombre)}"></label>
          <label>Modelo<input data-sw="${sw.id}" data-k="modelo" value="${esc(sw.modelo)}"></label>
        </div>
        <div class="sw-face">${ports}</div>
        <h3>Enlaces a otros switches</h3>
        <div class="chips">${ul || '<span class="hint">Sin enlaces. Si los switches no se conectan entre sí, son redes separadas.</span>'}</div>
        ${otros.length ? `<div class="form cols3" style="max-width:640px">
          <label>Mi puerto<select id="ulp-${sw.id}">${sw.puertos.map((p) => `<option>${p.n}</option>`).join("")}</select></label>
          <label>Hacia switch<select id="ula-${sw.id}">${otros.map((o) => `<option value="${o.id}">${esc(o.nombre)}</option>`).join("")}</select></label>
          <label>Su puerto<input id="ulpa-${sw.id}" type="number" min="1" value="1"></label>
        </div><button class="btn sm" data-ul-add="${sw.id}" style="margin-top:8px">+ Agregar enlace</button>` : ""}
      </div>`;
    }).join("");
    $$("[data-sw]").forEach((el) => (el.onchange = () => { swPorId(el.dataset.sw)[el.dataset.k] = el.value; guardar(); renderEquipos(); renderSwitches(); renderDiagrama(); }));
    $$("[data-ul-add]").forEach((b) => (b.onclick = () => {
      const sw = swPorId(b.dataset.ulAdd);
      const a = $("#ula-" + sw.id).value, puerto = Number($("#ulp-" + sw.id).value), pa = Number($("#ulpa-" + sw.id).value);
      const otro = swPorId(a);
      if (!otro.puertos.some((p) => p.n === pa)) return toast(`El puerto ${pa} no existe en ${otro.nombre}.`);
      sw.uplinks.push({ puerto, a, pa });
      (otro.uplinks ||= []).push({ puerto: pa, a: sw.id, pa: puerto });
      cambio();
    }));
    $$("[data-ul-del]").forEach((b) => (b.onclick = () => {
      const [id, i] = b.dataset.ulDel.split(":");
      const sw = swPorId(id), u = sw.uplinks[i], otro = swPorId(u.a);
      sw.uplinks.splice(i, 1);
      if (otro) otro.uplinks = (otro.uplinks || []).filter((x) => !(x.a === sw.id && x.puerto === u.pa));
      cambio();
    }));
  }

  // ------------------------------------------------------------ diagrama
  function svgDiagrama() {
    const colW = 170, swW = 300, topY = 40, swH = 64, devY = 190, devH = 70, gapSw = 60;
    let x = 30;
    const cajas = [], lineas = [], swPos = {};
    P.switches.forEach((sw) => {
      const devs = P.equipos.filter((e) => e.sw === sw.id && e.puerto !== "").sort((a, b) => a.puerto - b.puerto);
      const w = Math.max(swW, devs.length * colW);
      const sx = x + (w - swW) / 2;
      swPos[sw.id] = { x: sx, w: swW };
      cajas.push(`<g><rect x="${sx}" y="${topY}" width="${swW}" height="${swH}" rx="10" fill="#1d222a" stroke="#7fd18b" stroke-width="2"/>
        <text x="${sx + 14}" y="${topY + 26}" fill="#e8ebf0" font-size="15" font-weight="700">${esc(sw.nombre)}</text>
        <text x="${sx + 14}" y="${topY + 46}" fill="#9aa3af" font-size="11">${esc(sw.modelo)}</text></g>`);
      devs.forEach((e, i) => {
        const dx = x + i * colW + (w - devs.length * colW) / 2 + 10;
        const c = TIPOS[e.tipo]?.color || "#a0a7b4";
        const px = sx + 20 + ((swW - 40) / Math.max(sw.puertos.length - 1, 1)) * (sw.puertos.findIndex((p) => p.n == e.puerto));
        const pend = e.estado === "pendiente";
        lineas.push(`<path d="M${px} ${topY + swH} C ${px} ${devY - 50}, ${dx + 75} ${devY - 50}, ${dx + 75} ${devY}" stroke="${c}" stroke-width="2" fill="none" ${pend ? 'stroke-dasharray="6 5"' : ""}/>
          <text x="${px + 4}" y="${topY + swH + 14}" fill="#9aa3af" font-size="10" font-family="monospace">P${e.puerto}</text>`);
        cajas.push(`<g><rect x="${dx}" y="${devY}" width="150" height="${devH}" rx="8" fill="#161a20" stroke="${c}" stroke-width="1.5" ${pend ? 'stroke-dasharray="5 4"' : ""}/>
          <text x="${dx + 10}" y="${devY + 20}" fill="${c}" font-size="12" font-weight="700">${esc(e.nombre).slice(0, 22)}</text>
          <text x="${dx + 10}" y="${devY + 38}" fill="#e8ebf0" font-size="12" font-family="monospace">${esc(e.ip)}</text>
          <text x="${dx + 10}" y="${devY + 56}" fill="#9aa3af" font-size="10">${esc(e.interfaz).slice(0, 26)}</text></g>`);
      });
      x += w + gapSw;
    });
    const hechos = new Set();
    P.switches.forEach((sw) => (sw.uplinks || []).forEach((u) => {
      const k = [sw.id, u.a].sort().join("|");
      if (hechos.has(k) || !swPos[u.a]) return;
      hechos.add(k);
      const a = swPos[sw.id], b = swPos[u.a];
      const [l, r] = a.x < b.x ? [a, b] : [b, a];
      lineas.push(`<line x1="${l.x + l.w}" y1="${topY + swH / 2}" x2="${r.x}" y2="${topY + swH / 2}" stroke="#7fd18b" stroke-width="3"/>
        <text x="${(l.x + l.w + r.x) / 2}" y="${topY + swH / 2 - 8}" fill="#7fd18b" font-size="11" text-anchor="middle">enlace P${u.puerto}↔P${u.pa}</text>`);
    }));
    const sueltos = P.equipos.filter((e) => (!e.sw || e.puerto === "") && e.tipo !== "switch");
    const sy = devY + devH + 50;
    let extra = "";
    if (sueltos.length) {
      extra = `<text x="30" y="${sy}" fill="#9aa3af" font-size="12">Sin puerto asignado: ${sueltos.map((e) => esc(e.nombre) + " (" + esc(e.ip) + ")").join(" · ")}</text>`;
    }
    const W = Math.max(x, 760), H = sy + 30;
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" font-family="Space Grotesk, Arial, sans-serif">
      <rect width="100%" height="100%" fill="#0b0d10"/>
      <text x="30" y="24" fill="#f5a524" font-size="13" font-weight="700">${esc(P.meta.nombre)} · subred ${esc(P.red.subred)}.0/24</text>
      ${lineas.join("")}${cajas.join("")}${extra}</svg>`;
  }
  function renderDiagrama() { $("#diagram").innerHTML = svgDiagrama(); }
  $("#btnSvg").onclick = () => descargar(new Blob([svgDiagrama()], { type: "image/svg+xml" }), nombreArchivo("svg"));

  // ------------------------------------------------------------ checklist
  function fuentesTag(f) { return (f || []).map((x) => `<span class="src" title="${esc(FUENTES[x] || x)}">[${esc(x)}]</span>`).join(""); }
  function renderChecklist() {
    const ck = CHECKLIST.flatMap((g) => g.pasos);
    const hechos = ck.filter((p) => P.checklist[p.id]).length;
    $("#checklist").innerHTML = `<div class="progress"><i style="width:${(hechos / ck.length) * 100}%"></i></div>` +
      CHECKLIST.map((g) => `<div class="ck-group"><h3>${esc(g.grupo)}</h3>${g.pasos.map((p) => `
        <label class="ck ${P.checklist[p.id] ? "done" : ""}"><input type="checkbox" data-ck="${p.id}" ${P.checklist[p.id] ? "checked" : ""}>
        <span class="ck-t">${p.pendiente ? '<span class="badge warn">PENDIENTE</span> ' : ""}${esc(p.t)}${fuentesTag(p.f)}</span></label>`).join("")}</div>`).join("");
    $$("[data-ck]").forEach((c) => (c.onchange = () => { P.checklist[c.dataset.ck] = c.checked; guardar(); renderChecklist(); renderEstado(); }));
  }

  // ------------------------------------------------------------ ayuda
  function renderAyuda() {
    $("#problemas").innerHTML = PROBLEMAS.map((p) => `<details><summary>${esc(p.q)}</summary><p>${esc(p.a)}${fuentesTag(p.f)}</p></details>`).join("");
    $("#glosario").innerHTML = GLOSARIO.map(([t, d]) => `<dt>${esc(t)}</dt><dd>${esc(d)}</dd>`).join("");
    $("#fuentes").innerHTML = Object.entries(FUENTES).map(([k, v]) => `<li><b class="mono">[${esc(k)}]</b> ${esc(v)}</li>`).join("");
  }

  // ------------------------------------------------------------ IA
  function proyectoParaIA() {
    return { meta: P.meta, red: P.red, decisiones: P.decisiones, switches: P.switches.map(({ id, nombre, modelo, puertos, uplinks }) => ({ id, nombre, modelo, puertos: puertos.length, uplinks })), equipos: P.equipos.map(({ _err, id, ...e }) => e), validacion: validar().map((v) => v.t), checklist_completados: Object.keys(P.checklist).filter((k) => P.checklist[k]) };
  }
  function pintarChat() {
    $("#chatLog").innerHTML = chat.map((m) => `<div class="msg ${m.role === "user" ? "user" : m.err ? "err" : "ai"}">${esc(m.content)}</div>`).join("") || '<p class="hint">Pregunta lo que quieras sobre tu red, o presiona “Revisar mi proyecto”.</p>';
    $("#chatLog").scrollTop = 1e9;
  }
  async function preguntar(texto, mode) {
    if (texto) chat.push({ role: "user", content: texto });
    else chat.push({ role: "user", content: "🔎 Revisa mi proyecto completo." });
    chat.push({ role: "assistant", content: "Pensando…", tmp: true });
    pintarChat();
    const historial = chat.filter((m) => !m.tmp && !m.err).map(({ role, content }) => ({ role, content }));
    if (mode === "review") historial.pop();
    try {
      const r = await api("/api/ask", { method: "POST", body: JSON.stringify({ messages: historial, project: proyectoParaIA(), mode }) });
      chat = chat.filter((m) => !m.tmp);
      chat.push(r.ok ? { role: "assistant", content: r.data.text } : { role: "assistant", content: r.data.error || "Error", err: true });
    } catch (e) {
      chat = chat.filter((m) => !m.tmp);
      chat.push({ role: "assistant", content: "No se pudo conectar con el servidor.", err: true });
    }
    pintarChat();
  }
  $("#chatForm").addEventListener("submit", (e) => {
    e.preventDefault();
    const t = $("#chatIn").value.trim();
    if (!t) return;
    $("#chatIn").value = "";
    preguntar(t, "chat");
  });
  $("#chatIn").addEventListener("keydown", (e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); $("#chatForm").requestSubmit(); } });
  $("#btnReview").onclick = () => preguntar("", "review");

  // ------------------------------------------------------------ exportar
  function nombreArchivo(ext) {
    const base = (P.meta.nombre || "proyecto").normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^\w-]+/g, "_").slice(0, 40);
    return `Audioredes_${base}_${new Date().toISOString().slice(0, 10)}.${ext}`;
  }
  function descargar(blob, name) {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = name;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  }
  function filasEquipos() {
    return [...P.equipos].sort((a, b) => (host(a.ip)?.h ?? 999) - (host(b.ip)?.h ?? 999)).map((e) => ({
      Nombre: e.nombre, Tipo: TIPOS[e.tipo]?.label || e.tipo, Equipo: e.equipo, Interfaz: e.interfaz,
      IP: e.ip, Máscara: P.red.mascara, Gateway: P.red.gateway || "(ninguno)",
      Switch: swPorId(e.sw)?.nombre || "", Puerto: e.puerto, Estado: e.estado === "ok" ? "Listo" : "Pendiente", Notas: e.notas,
    }));
  }
  function filasPuertos() {
    const r = [];
    P.switches.forEach((sw) => sw.puertos.forEach((p) => {
      const d = P.equipos.filter((e) => e.sw === sw.id && e.puerto == p.n).map((e) => `${e.nombre} (${e.ip})`);
      (sw.uplinks || []).filter((u) => u.puerto === p.n).forEach((u) => d.push(`Enlace → ${swPorId(u.a)?.nombre} P${u.pa}`));
      r.push({ Switch: sw.nombre, Modelo: sw.modelo, Puerto: p.n, Tipo: p.tipo, Conectado: d.join(", ") || "libre" });
    }));
    return r;
  }
  function filasDecisiones() {
    return DECISIONES.map((d) => {
      const v = P.decisiones[d.k];
      const op = (d.o || []).find((o) => Array.isArray(o) && o[0] === v);
      return { Decisión: d.l, Valor: (op ? op[1] : v) || "PENDIENTE" };
    });
  }
  function filasChecklist() {
    return CHECKLIST.flatMap((g) => g.pasos.map((p) => ({ Etapa: g.grupo, Paso: p.t, Fuente: (p.f || []).join(", ") || (p.pendiente ? "PENDIENTE" : "—"), Hecho: P.checklist[p.id] ? "Sí" : "No" })));
  }

  $("#btnXlsx").onclick = () => {
    if (!window.XLSX) return toast("No se cargó la librería de Excel.");
    const wb = XLSX.utils.book_new();
    const hoja = (rows, nombre, widths) => { const ws = XLSX.utils.json_to_sheet(rows); ws["!cols"] = widths.map((w) => ({ wch: w })); XLSX.utils.book_append_sheet(wb, ws, nombre); };
    hoja([{ Campo: "Proyecto", Valor: P.meta.nombre }, { Campo: "Lugar", Valor: P.meta.lugar }, { Campo: "Fecha", Valor: P.meta.fecha }, { Campo: "Responsable", Valor: P.meta.responsable }, { Campo: "Subred", Valor: P.red.subred + ".0/24" }, { Campo: "Máscara", Valor: P.red.mascara }, { Campo: "Gateway", Valor: P.red.gateway || "(ninguno)" }, { Campo: "Notas", Valor: P.meta.notas }, ...filasDecisiones().map((d) => ({ Campo: d.Decisión, Valor: d.Valor }))], "Proyecto", [30, 60]);
    hoja(filasEquipos(), "IPs y equipos", [18, 13, 34, 18, 15, 15, 12, 12, 8, 10, 40]);
    hoja(filasPuertos(), "Puertos switch", [14, 36, 8, 14, 50]);
    hoja(filasChecklist(), "Paso a paso", [24, 90, 22, 8]);
    hoja(validar().map((v) => ({ Nivel: { bad: "ERROR", warn: "Advertencia", ok: "OK", info: "Info" }[v.n], Detalle: v.t })), "Validación", [12, 100]);
    hoja(Object.entries(FUENTES).map(([k, v]) => ({ Código: k, Documento: v })), "Fuentes", [12, 70]);
    XLSX.writeFile(wb, nombreArchivo("xlsx"));
  };

  function svgAPng(svg) {
    return new Promise((ok, mal) => {
      const img = new Image();
      img.onload = () => {
        const c = document.createElement("canvas");
        c.width = img.width * 2; c.height = img.height * 2;
        const g = c.getContext("2d"); g.scale(2, 2); g.drawImage(img, 0, 0);
        ok({ data: c.toDataURL("image/png"), w: img.width, h: img.height });
      };
      img.onerror = mal;
      img.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
    });
  }
  async function logoDataUrl() {
    try {
      const r = await fetch("assets/logo.png");
      if (!r.ok) return null;
      const b = await r.blob();
      return await new Promise((ok) => { const fr = new FileReader(); fr.onload = () => ok(fr.result); fr.readAsDataURL(b); });
    } catch { return null; }
  }

  $("#btnPdf").onclick = async () => {
    if (!window.jspdf) return toast("No se cargó la librería de PDF.");
    toast("Generando PDF…");
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "letter" });
    // La fuente estándar del PDF solo cubre Latin-1: se traducen flechas y se quitan emojis.
    const limpio = (s) => String(s ?? "").replace(/→/g, "->").replace(/↔/g, "<->").replace(/✓/g, "OK").replace(/[“”]/g, '"').replace(/[‘’]/g, "'").replace(/[–—]/g, "-").replace(/[^\x00-\xFF]/g, "").replace(/\s{2,}/g, " ").trim();
    const limpiarFilas = (rows) => rows && rows.map((r) => r.map(limpio));
    const tabla = (opts) => {
      const o = { ...opts, head: limpiarFilas(opts.head), body: limpiarFilas(opts.body) };
      return window.autoTable ? window.autoTable(doc, o) : doc.autoTable(o);
    };
    const texto = (s, x, y, o) => doc.text(limpio(s), x, y, o);
    const W = doc.internal.pageSize.getWidth();
    const acc = [245, 165, 36];
    const logo = await logoDataUrl();

    const encabezado = (titulo) => {
      doc.setFillColor(20, 22, 26); doc.rect(0, 0, W, 18, "F");
      if (logo) { try { doc.addImage(logo, "PNG", 10, 2, 16.7, 14, undefined, "FAST"); } catch (e) { /* logo inválido */ } }
      else { doc.setTextColor(255); doc.setFont("helvetica", "bold"); doc.setFontSize(12); texto("AUDIOESCENA", 10, 11.5); }
      doc.setTextColor(...acc); doc.setFontSize(9); texto("AUDIOREDES", logo ? 31 : 50, 11.5);
      doc.setTextColor(255); doc.setFontSize(12); texto(titulo, W - 10, 11.5, { align: "right" });
      doc.setTextColor(30);
    };
    const estilo = { styles: { fontSize: 8, cellPadding: 1.6 }, headStyles: { fillColor: acc, textColor: 20 }, margin: { top: 24, left: 10, right: 10 }, didDrawPage: () => {} };

    encabezado("Plan de red");
    doc.setFontSize(16); doc.setFont("helvetica", "bold"); texto(P.meta.nombre || "Proyecto", 10, 30);
    doc.setFontSize(9); doc.setFont("helvetica", "normal");
    texto(`Lugar: ${P.meta.lugar || "—"}   ·   Fecha: ${P.meta.fecha || "—"}   ·   Responsable: ${P.meta.responsable || "—"}   ·   Subred: ${P.red.subred}.0/24 (255.255.255.0)   ·   Gateway: ${P.red.gateway || "ninguno"}`, 10, 36);
    tabla({ ...estilo, startY: 40, head: [["Decisión", "Valor"]], body: filasDecisiones().map((d) => [d.Decisión, d.Valor]), tableWidth: 120,
      didParseCell: (c) => { if (c.section === "body" && c.cell.raw === "PENDIENTE") c.cell.styles.textColor = [200, 120, 0]; } });
    const val = validar();
    tabla({ ...estilo, startY: 40, margin: { ...estilo.margin, left: 140 }, head: [["Validación"]], body: val.map((v) => [v.t]),
      didParseCell: (c) => { if (c.section === "body") { const n = val[c.row.index].n; c.cell.styles.textColor = n === "bad" ? [200, 30, 40] : n === "warn" ? [170, 100, 0] : n === "ok" ? [20, 130, 60] : [40, 90, 150]; } } });

    doc.addPage(); encabezado("IPs y equipos");
    const fe = filasEquipos();
    tabla({ ...estilo, startY: 24, head: [Object.keys(fe[0] || { Nombre: "" })], body: fe.map((r) => Object.values(r)) });

    doc.addPage(); encabezado("Puertos de switches");
    const fp = filasPuertos();
    tabla({ ...estilo, startY: 24, head: [["Switch", "Modelo", "Puerto", "Tipo", "Conectado"]], body: fp.map((r) => Object.values(r)) });

    try {
      const png = await svgAPng(svgDiagrama());
      doc.addPage(); encabezado("Diagrama");
      const H = doc.internal.pageSize.getHeight();
      const maxW = W - 20, maxH = H - 34;
      const k = Math.min(maxW / png.w, maxH / png.h);
      doc.addImage(png.data, "PNG", 10, 24, png.w * k, png.h * k);
    } catch (e) { /* si el navegador no permite el diagrama, se omite */ }

    doc.addPage(); encabezado("Paso a paso");
    tabla({ ...estilo, startY: 24, head: [["OK", "Etapa", "Paso", "Fuente"]], columnStyles: { 0: { cellWidth: 8 }, 1: { cellWidth: 40 }, 3: { cellWidth: 32 } },
      body: filasChecklist().map((r) => [r.Hecho === "Sí" ? "X" : "", r.Etapa, r.Paso, r.Fuente]) });
    tabla({ ...estilo, head: [["Código", "Fuente"]], body: Object.entries(FUENTES) });

    const n = doc.getNumberOfPages();
    for (let i = 1; i <= n; i++) {
      doc.setPage(i); doc.setFontSize(7); doc.setTextColor(120);
      texto(`AUDIOESCENA · Audioredes · Generado ${new Date().toLocaleString("es-MX")} · Página ${i}/${n}`, 10, doc.internal.pageSize.getHeight() - 5);
    }
    doc.save(nombreArchivo("pdf"));
  };

  // ------------------------------------------------------------ menú
  $("#btnMenu").onclick = (e) => { e.stopPropagation(); $("#menu").hidden = !$("#menu").hidden; };
  document.addEventListener("click", () => ($("#menu").hidden = true));
  $("#btnSaveJson").onclick = () => descargar(new Blob([JSON.stringify(P, null, 2)], { type: "application/json" }), nombreArchivo("json"));
  $("#fileJson").onchange = async (e) => {
    const f = e.target.files[0];
    if (!f) return;
    try {
      const p = JSON.parse(await f.text());
      if (p.version !== 1 || !Array.isArray(p.equipos) || !Array.isArray(p.switches)) throw new Error("formato");
      P = p; guardar(); renderTodo(); toast("Proyecto cargado.");
    } catch { toast("Ese archivo no es un proyecto de Audioredes."); }
    e.target.value = "";
  };
  $("#btnReset").onclick = () => { if (confirm("¿Borrar el proyecto actual y restaurar el ejemplo?")) { P = proyectoDefault(); guardar(); renderTodo(); } };
  $("#btnLogout").onclick = () => salir("");

  // ------------------------------------------------------------ pestañas
  $$("#tabs button").forEach((b) => (b.onclick = () => {
    $$("#tabs button").forEach((x) => x.classList.toggle("on", x === b));
    $$(".tab").forEach((t) => t.classList.toggle("on", t.id === "tab-" + b.dataset.tab));
    if (b.dataset.tab === "ia") pintarChat();
    if (b.dataset.tab === "diagrama") renderDiagrama();
  }));

  iniciar();
})();
