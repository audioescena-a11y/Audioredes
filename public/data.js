// =====================================================================
// AUDIOREDES · Datos base, checklist verificado, ayuda y fuentes
// Cada paso técnico indica su fuente. Lo que no está verificado se marca
// como "pendiente" para que nadie lo tome como dato confirmado.
// =====================================================================

const FUENTES = {
  DA10203: "Audinate · Best Practices for Managing Dante Devices v1.0 (2023)",
  L1: "Audinate · Dante Certification Level 1, 2nd Ed. (2021)",
  TI317: "d&b audiotechnik · TI 317 Dante audio networking 1.1",
  "SQ-RG": "Allen & Heath · SQ Reference Guide V1.6.0 Issue 2",
  "SQ-GS": "Allen & Heath · Getting started with the SQ and Dante",
  AP13279: "Allen & Heath · Fitting note M-SQ-DANT32/64 (V3)",
  AP11431: "Allen & Heath · Fitting note M-SQ-SDANTE (V1)",
  "SQ-RN": "Allen & Heath · SQ Dante card Release Notes V1.0.6",
  "M4250-DS": "NETGEAR · M4250 Datasheet",
  "M4250-AV": "NETGEAR · M4250 AV UI User Manual",
  "NG-REF": "NETGEAR · AV over IP Switch Reference Guide (2024)",
};

const TIPOS = {
  dante: { label: "Dante", color: "#f5a524" },
  control: { label: "Control", color: "#4ea8de" },
  pc: { label: "Computadora", color: "#9b8cff" },
  switch: { label: "Switch", color: "#7fd18b" },
  luces: { label: "Iluminación", color: "#ff7aa8" },
  video: { label: "Video", color: "#5ce1e6" },
  otro: { label: "Otro", color: "#a0a7b4" },
};

// Propuesta de bloques de IP (convención editable, no es una norma de Dante)
const BLOQUES = [
  { desde: 1, hasta: 9, uso: "Reservado (no usar)" },
  { desde: 10, hasta: 19, uso: "Switches (administración)" },
  { desde: 20, hasta: 29, uso: "Dante: tarjetas de consolas" },
  { desde: 30, hasta: 39, uso: "Control: puerto Network de consolas" },
  { desde: 50, hasta: 69, uso: "Computadoras (QLab/DVS, Dante Controller)" },
  { desde: 100, hasta: 149, uso: "Iluminación (pendiente)" },
  { desde: 150, hasta: 199, uso: "Video (pendiente)" },
];

function proyectoDefault() {
  return {
    version: 1,
    meta: {
      nombre: "Show QLab · SQ5 + SQ6",
      lugar: "",
      fecha: "",
      responsable: "",
      notas: "",
    },
    red: { subred: "192.168.1", mascara: "255.255.255.0", gateway: "" },
    decisiones: {
      tarjetaSQ5: "M-SQ-DANT64 (V3)",
      tarjetaSQ6: "M-SQ-DANT64 (V3)",
      lider: "SQ6",
      fs: "48 kHz",
      latencia: "",
      lucesVideo: "",
      switch16Modelo: "",
      usarPuertoNetworkSQ: "",
      dvs: "Última versión",
    },
    switches: [
      {
        id: "sw1",
        nombre: "SW-AV-01",
        modelo: "NETGEAR GSM4210PD (M4250-9G1F-PoE+)",
        ip: "192.168.1.10",
        puertos: [
          ...Array.from({ length: 8 }, (_, i) => ({ n: i + 1, tipo: "1G PoE+" })),
          { n: 9, tipo: "1G" },
          { n: 10, tipo: "SFP 1G" },
        ],
      },
      {
        id: "sw2",
        nombre: "SW-GEN-01",
        modelo: "NETGEAR 16 puertos (modelo pendiente)",
        ip: "192.168.1.11",
        puertos: Array.from({ length: 16 }, (_, i) => ({ n: i + 1, tipo: "por confirmar" })),
      },
    ],
    equipos: [
      { id: uid(), nombre: "SQ5-FOH", tipo: "dante", equipo: "Allen & Heath SQ5 · M-SQ-DANT64", interfaz: "Dante primario", ip: "192.168.1.21", sw: "sw1", puerto: 1, estado: "ok", notas: "Audio Clock Source = I/O Port (sigue a SQ6)" },
      { id: uid(), nombre: "SQ6-MON", tipo: "dante", equipo: "Allen & Heath SQ6 · M-SQ-DANT64", interfaz: "Dante primario", ip: "192.168.1.22", sw: "sw1", puerto: 2, estado: "ok", notas: "LÍDER de reloj: Internal + Sync To External + Preferred Leader" },
      { id: uid(), nombre: "QLAB-MAC-01", tipo: "pc", equipo: "Mac · QLab + Dante Virtual Soundcard", interfaz: "Ethernet cableado", ip: "192.168.1.51", sw: "sw1", puerto: 3, estado: "ok", notas: "DVS solo por cable, no Wi‑Fi" },
      { id: uid(), nombre: "SQ5-FOH-CTRL", tipo: "control", equipo: "SQ5 · puerto Network (MixPad)", interfaz: "Control", ip: "192.168.1.31", sw: "", puerto: "", estado: "pendiente", notas: "Solo si usarás SQ-MixPad / control remoto" },
      { id: uid(), nombre: "SQ6-MON-CTRL", tipo: "control", equipo: "SQ6 · puerto Network (MixPad)", interfaz: "Control", ip: "192.168.1.32", sw: "", puerto: "", estado: "pendiente", notas: "Solo si usarás SQ-MixPad / control remoto" },
      { id: uid(), nombre: "SW-AV-01", tipo: "switch", equipo: "NETGEAR GSM4210PD · administración", interfaz: "Administración", ip: "192.168.1.10", sw: "", puerto: "", estado: "ok", notas: "Por defecto 169.254.100.100" },
      { id: uid(), nombre: "SW-GEN-01", tipo: "switch", equipo: "NETGEAR 16p · administración", interfaz: "Administración", ip: "192.168.1.11", sw: "", puerto: "", estado: "pendiente", notas: "Falta modelo exacto y manual" },
      { id: uid(), nombre: "LUCES-NODO-01", tipo: "luces", equipo: "Consola / nodo Art-Net", interfaz: "Art-Net", ip: "192.168.1.101", sw: "sw2", puerto: 1, estado: "pendiente", notas: "Falta modelo y manual para verificar IP/Art-Net" },
      { id: uid(), nombre: "VIDEO-01", tipo: "video", equipo: "Servidor / equipo de video", interfaz: "Red", ip: "192.168.1.151", sw: "sw2", puerto: 2, estado: "pendiente", notas: "Falta modelo y manual" },
    ],
    checklist: {},
  };
}

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

// ------------------------- CHECKLIST VERIFICADO -------------------------
const CHECKLIST = [
  {
    grupo: "1 · Antes de empezar",
    pasos: [
      { id: "pre1", t: "Tarjetas confirmadas: M-SQ-DANT64 en ambas SQ (64×64, 48 o 96 kHz). Las Release Notes V1.0.6 NO aplican: son solo para la tarjeta V1.", f: ["AP13279", "SQ-RN"] },
      { id: "pre2", t: "Actualiza el firmware de ambas SQ a la versión más reciente de allen-heath.com: las tarjetas V3 lo requieren. Revisa también el firmware de la tarjeta con Dante Controller / audinate.com.", f: ["AP11431", "AP13279"] },
      { id: "pre3", t: "Dibuja la topología (estrella) y asigna nombres e IPs aquí antes de conectar nada.", f: ["TI317"] },
      { id: "pre4", t: "Usa cable CAT5e o mejor (CAT5 solo da 100 Mbps). Más de 100 m entre switches → fibra.", f: ["L1", "TI317"] },
    ],
  },
  {
    grupo: "2 · Switch NETGEAR GSM4210PD",
    pasos: [
      { id: "sw1", t: "Pon tu laptop en IP fija 169.254.100.201 / 255.255.0.0, conéctala a cualquier puerto y entra a https://169.254.100.100 (con https, no http).", f: ["M4250-AV"] },
      { id: "sw2", t: "Usuario: admin. La primera vez no pide contraseña; luego te obliga a crear una (8–64 caracteres, mayúscula, minúscula y número). Anótala en un lugar seguro.", f: ["M4250-AV"] },
      { id: "sw3", t: "Device Details → Management IP → Static: 192.168.1.10 / 255.255.255.0. Al aplicar te desconecta: cambia tu laptop a 192.168.1.x y vuelve a entrar en https://192.168.1.10.", f: ["M4250-AV"] },
      { id: "sw4", t: "Configure → Network Profiles: en el perfil Default (VLAN 1) cambia la plantilla de 'Data' a 'Audio Dante'. Así todo queda en una sola VLAN y el querier IGMP del perfil Default sigue activo (viene activo por defecto).", f: ["M4250-AV"] },
      { id: "sw5", t: "Verifica que EEE (Green Ethernet) esté desactivado. En el M4250 viene desactivado de fábrica, pero confírmalo.", f: ["M4250-DS", "DA10203"] },
      { id: "sw6", t: "No actives el servidor DHCP del switch (por defecto está en 'None'). En esta red todo es IP fija.", f: ["M4250-AV", "AP13279"] },
      { id: "sw7", t: "Guarda (icono Save) y descarga respaldo: Configure → Maintenance → Download Configuration.", f: ["M4250-AV"] },
    ],
  },
  {
    grupo: "3 · Consolas SQ5 y SQ6",
    pasos: [
      { id: "sq1", t: "Setup → Audio → I/O Port: deja Control Network Bridge en OFF salvo que realmente lo necesites (una red con DHCP puede cambiar la IP de la tarjeta Dante).", f: ["AP13279", "AP11431", "SQ-RG"] },
      { id: "sq2", t: "Consola LÍDER de reloj: Setup → Audio → Digital I/O → Audio Clock Source = Internal.", f: ["SQ-RG", "AP13279"] },
      { id: "sq3", t: "Consola SEGUIDORA: Audio Clock Source = I/O Port. Debe aparecer palomita verde; cruz roja = no recibe reloj.", f: ["SQ-RG"] },
      { id: "sq4", t: "Patch interno: en la pantalla I/O, patchea entradas/salidas hacia y desde I/O Port.", f: ["SQ-RG"] },
      { id: "sq5", t: "(Opcional) Si usarás MixPad: Setup → Network Setup → DHCP Off e IP fija (bloque .30). Ese puerto NO lleva audio.", f: ["SQ-RG"] },
    ],
  },
  {
    grupo: "4 · Dante Controller",
    pasos: [
      { id: "dc1", t: "Primero NOMBRA cada dispositivo (nombres únicos), después haz las suscripciones. Si cambias nombres después, las rutas se pierden.", f: ["L1", "TI317"] },
      { id: "dc2", t: "Asigna la IP fija de esta tabla a cada tarjeta Dante (máscara 255.255.255.0).", f: ["DA10203"] },
      { id: "dc3", t: "En la tarjeta de la consola LÍDER: marca 'Enable Sync To External' y 'Preferred Leader' (en versiones viejas se llama 'Preferred Master').", f: ["AP13279", "AP11431", "TI317"] },
      { id: "dc4", t: "Misma frecuencia de muestreo en TODOS (SQ y DVS). Si no coinciden, no se pueden conectar.", f: ["L1", "TI317"] },
      { id: "dc5", t: "Pestaña Clock Status: debe haber UN solo líder. Si ves varios, la red está partida (cable, firewall o VLAN).", f: ["TI317"] },
      { id: "dc6", t: "Latencia: ~0.1 ms por salto. Revisa el histograma del receptor; entradas rojas = paquetes perdidos → sube la latencia.", f: ["TI317", "L1"] },
    ],
  },
  {
    grupo: "5 · Mac con QLab + DVS",
    pasos: [
      { id: "mac1", t: "IP fija 192.168.1.51 / 255.255.255.0 en el puerto Ethernet cableado de 1 Gbps. Dante no transporta audio por Wi‑Fi.", f: ["L1", "DA10203"] },
      { id: "mac2", t: "Si Dante Controller no ve equipos: revisa firewall/antivirus y que esté seleccionada la tarjeta de red correcta.", f: ["TI317"] },
      { id: "mac3", t: "Configura canales de DVS (en Mac, Core Audio hasta 64×64) y la misma frecuencia que las SQ.", f: ["L1"] },
      { id: "mac4", t: "DVS: se usará la última versión. PENDIENTE verificar: número de versión exacto, licencia activada, que DVS esté en 48 kHz y cómo QLab envía audio a DVS (falta manual de QLab/DVS).", f: [], pendiente: true },
    ],
  },
  {
    grupo: "6 · Iluminación y video",
    pasos: [
      { id: "lv1", t: "PENDIENTE: decidir si iluminación/video comparten la red Dante o van separados. Necesito modelos y manuales para verificarlo.", f: [], pendiente: true },
      { id: "lv2", t: "Dato verificado útil para decidir: si hay video IP en el mismo segmento, IGMP debe estar activo; con QoS bien configurada, separar en VLANs es en gran parte innecesario.", f: ["DA10203", "TI317"] },
    ],
  },
  {
    grupo: "7 · Prueba final",
    pasos: [
      { id: "fin1", t: "Prueba de audio en todas las rutas antes de que llegue el público.", f: [] },
      { id: "fin2", t: "Exporta este proyecto a PDF y Excel, e imprime una copia para el rack.", f: [] },
    ],
  },
];

// ------------------------- AYUDA / PROBLEMAS -------------------------
const PROBLEMAS = [
  { q: "Un equipo no aparece en Dante Controller", a: "Cable dañado o desconectado (los LEDs del puerto no encienden); tarjeta de red equivocada seleccionada en Dante Controller; firewall o antivirus bloqueando el tráfico de Dante.", f: ["TI317"] },
  { q: "Aparece pero no me deja hacer ruteo", a: "Configuración de red incompatible (IP o máscara de otra red) en el equipo o en tu computadora; o frecuencias de muestreo distintas. Revisa ambos en Device View.", f: ["TI317", "L1"] },
  { q: "No hay audio, se corta o suena distorsionado", a: "Latencia demasiado baja (mira el histograma: rojo = paquetes perdidos); reloj mal distribuido; una consola con reloj Internal sin ser líder en Dante Controller; EEE/Green Ethernet activo; red saturada.", f: ["TI317"] },
  { q: "Clicks y pops", a: "Problemas de reloj. Debe haber una sola fuente de reloj y todos sincronizados a ella.", f: ["SQ-RG"] },
  { q: "Veo varios líderes de reloj", a: "La red está partida en segmentos que no se ven entre sí: firewall, filtro de puertos, cableado o VLANs mal configuradas.", f: ["TI317"] },
  { q: "La tarjeta Dante de la SQ cambió de IP sola", a: "Probablemente hay un servidor DHCP (un router) en la red y el Control Network Bridge está activo. Apágalo si no lo necesitas.", f: ["AP13279", "AP11431"] },
  { q: "Parámetros en gris en Dante Controller", a: "La función no existe en ese equipo, no se controla desde Dante Controller, o la configuración de red no es compatible.", f: ["TI317"] },
];

const GLOSARIO = [
  ["IP", "Dirección de cada equipo en la red. Ej. 192.168.1.21. No termines en .0 ni .255."],
  ["Máscara / subred", "Define qué IPs son 'vecinas'. Con 255.255.255.0, todos los 192.168.1.x se ven entre sí."],
  ["DHCP", "Servicio que reparte IPs automáticamente (normalmente un router). En este proyecto NO se usa."],
  ["Link-local", "Si no hay DHCP, Dante se pone solo una IP 169.254.x.x."],
  ["Switch administrable", "Switch que se puede configurar (QoS, IGMP, VLAN, EEE)."],
  ["EEE / Green Ethernet", "Ahorro de energía en puertos. Para Dante debe ir APAGADO."],
  ["QoS / DSCP", "Prioriza paquetes: reloj (CS7=56) primero, audio (EF=46) después."],
  ["IGMP Snooping / Querier", "Controla el multicast para que no inunde todos los puertos."],
  ["PTP / Líder de reloj", "Protocolo de reloj de Dante. Un equipo manda el tiempo a todos."],
  ["Unicast / Multicast", "Uno a uno (por defecto) / uno a muchos."],
  ["Latencia / salto (hop)", "Retardo de la red. ~0.1 ms por cada switch Gigabit."],
  ["VLAN", "Red virtual: separa tráfico dentro del mismo switch."],
  ["DVS", "Dante Virtual Soundcard: convierte la computadora en dispositivo Dante."],
];
