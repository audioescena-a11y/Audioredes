// Base de conocimiento VERIFICADA (extraída de los documentos oficiales del proyecto).
// El asistente solo debe afirmar como "verificado" lo que esté aquí o en el proyecto del usuario.
module.exports = `
FUENTES DISPONIBLES (códigos):
[DA10203] Audinate, "Best Practices for Managing Dante Devices" v1.0 (2023)
[L1] Audinate, Dante Certification Level 1, 2nd Ed. (2021)
[TI317] d&b audiotechnik, TI 317 Dante audio networking 1.1 (2016)
[SQ-RG] Allen & Heath, SQ Reference Guide V1.6.0 Issue 2
[SQ-GS] Allen & Heath, "Getting started with the SQ and Dante" (artículo de soporte)
[AP13279] Allen & Heath, Fitting note M-SQ-DANT32 / M-SQ-DANT64 (V3)
[AP11431] Allen & Heath, Fitting note M-SQ-SDANTE (tarjeta V1)
[SQ-RN] Allen & Heath, SQ Dante card Release Notes V1.0.6 (solo tarjeta V1 M-SQ-SDANTE)
[M4250-DS] NETGEAR, M4250 Datasheet (DS-M4250-26Jun2026)
[M4250-AV] NETGEAR, M4250 AV UI User Manual
[NG-REF] NETGEAR, AV over IP Switch Reference Guide (Feb 2024)
[DVS-UG] Audinate, Dante Virtual Soundcard User Guide (Dante Latency) y FAQs de DVS (audinate.com)

DIRECCIONAMIENTO IP
- Dante usa DHCP si existe; si no, link-local 169.254.0.0/16 (primario) y 172.31.0.0/16 (secundario). Siguen buscando DHCP después. [DA10203][TI317]
- La mayoría de dispositivos Dante aceptan IP estática; útil donde no se mantiene DHCP/DNS, pero en listas grandes hay riesgo de error humano. [DA10203]
- Regla segura para principiantes: no terminar una IP en 0 ni en 255. Rangos privados: 192.168.x.x, 10.x.x.x, 172.16-31.x.x. [L1]
- Todos los dispositivos y Dante Controller deben tener configuración de red compatible; si no, aparecen en Dante Controller pero no se puede rutear audio. [TI317]
- Nombres de dispositivo únicos en la red y nombres de canal únicos por dispositivo; el ruteo se basa en nombres. Nombrar primero, suscribir después. [TI317][L1]
- Audio Dante NO viaja por Wi-Fi; el control de Dante Controller sí. [DA10203][L1]

RELOJ (PTP)
- Un solo líder de reloj por subred; se elige automáticamente (BMCA). Dante no requiere switches PTP-aware; en la mayoría de casos no se beneficia de boundary/transparent clock. [DA10203]
- Consola con reloj Internal se considera fuente "externa" a Dante: hay que marcar "Enable Sync To External" + "Preferred Leader/Master" en esa tarjeta. [AP13279][AP11431][TI317]
- SQ: Setup > Audio > Digital I/O > Audio Clock Source: Internal / SLink / I/O Port. Debe haber una sola fuente de reloj; las demás se sincronizan a ella. La SQ siempre procesa a 96 kHz internamente. Si no recibe reloj válido, muestra cruz roja y vuelve a Internal. Problemas de reloj = clicks y pops. [SQ-RG]
- Varios líderes de reloj en Dante Controller = red partida (firewall, cableado, VLAN). [TI317]

FRECUENCIA DE MUESTREO / CANALES
- Para conectar, la frecuencia de muestreo debe coincidir; la profundidad de bits puede variar. [L1]
- Tarjeta Dante SQ: 64x64 a 96 o 48 kHz (M-SQ-SDANTE y M-SQ-DANT64); M-SQ-DANT32 = 32x32. [SQ-RG][AP13279][AP11431]
- DVS: Core Audio hasta 64x64 (Mac); ASIO hasta 64x64 / WDM 16x16 (Windows); usa cualquier puerto cableado de 1 Gbps. [L1]
- Unicast: flujos de hasta 4 canales, ~6 Mbps por flujo. Multicast: ~1.5 Mbps por canal. Regla: ~512 canales a 48k/24 bits por enlace de 1 Gbps. [DA10203][L1]

LATENCIA
- Regla: ~0.1 ms por salto (hop) de switch Gigabit; cada dispositivo Dante con switch interno también cuenta. Tabla: hasta 3 saltos 0.25 ms; hasta 5: 0.5 ms; hasta 10: 1 ms; 11+: 5 ms; multicast mínimo 1 ms. Si Tx y Rx difieren, se usa la mayor. Verificar en histograma de latencia (rojo = paquetes perdidos). [TI317][L1]
- DVS: latencias 4, 6 y 10 ms (20 y 40 ms solo DVS Pro, para más de 64 canales). 4 ms requiere computadora con poco jitter; computadoras con mal desempeño de scheduling pueden necesitar 10 ms. Latencia muy baja = dropouts intermitentes. Un receptor que solo soporta latencias mayores impone la suya. La latencia de DVS es independiente y NO cambia la latencia del resto de la red. [DVS-UG]

SWITCH
- Gigabit recomendado; non-blocking. EEE/Green Ethernet (802.3az) debe estar DESACTIVADO en puertos Dante (causa dropouts). [DA10203][TI317][L1]
- QoS DSCP: CS7 (56) PTP alta prioridad; EF (46) audio y PTPv2 prioridad media; CS1 (8) baja; resto best effort (0). Requiere strict priority. QoS es obligatoria en redes a 100 Mbps, mixtas 1G/100M o saturadas (70%+); recomendada en redes de uso mixto. [DA10203][TI317]
- IGMP: necesario si hay video IP en el mismo segmento o mucho multicast; no requerido para redes solo-audio con poco o nada de multicast. Un querier por VLAN. [DA10203]
- Puertos Dante: unicast audio UDP 14336-14591; multicast audio 239.255.0.0/16 UDP 4321; mDNS 224.0.0.251:5353; PTP 224.0.1.129-132 UDP 319/320; control y monitoreo multicast 224.0.0.230-233 UDP 8700-8708; unicast UDP 4440, 4444, 4455, 8751, 8800. [DA10203]
- Firewall/antivirus en la computadora puede bloquear Dante Controller. [TI317]

NETGEAR GSM4210PD (M4250-9G1F-PoE+)
- 8 puertos 1G PoE+ (presupuesto 110 W), +1 puerto 1G RJ45, +1 SFP 1G; puerto OOB 1G; 20 Gbps non-blocking; sin ventilador; EEE desactivado por defecto; IGMP Plus; PTPv2 TC; perfiles AV incluyendo "Audio Dante". [M4250-DS][NG-REF]
- AV UI: acceso por HTTPS. IP de administración por defecto 169.254.100.100/255.255.0.0 (cliente DHCP activo); usuario admin, sin contraseña la primera vez; luego obliga a crear una de 8-64 caracteres con mayúscula, minúscula y número. Puerto OOB: 192.168.0.239/24 si no recibe DHCP. [M4250-AV]
- Perfil Default (VLAN 1) con querier IGMP habilitado por defecto; plantilla por defecto "Data", se puede cambiar. Plantilla "Audio Dante" habilita PTP TC por defecto. Servidor DHCP por perfil: apagado (None) por defecto. Guardar con el icono Save. Respaldar: Configure > Maintenance > Download Configuration. [M4250-AV]

ALLEN & HEATH SQ + DANTE
- Control Network Bridge (Setup > Audio > I/O Port): une puerto Network de la SQ con la tarjeta solo para control (no pasa audio). Conectar a una red con DHCP puede cambiar la IP de la tarjeta Dante: puentear solo cuando sea necesario. [AP13279][AP11431][SQ-RG]
- El puerto Network de la SQ NO lleva audio. Por defecto usa DHCP y si no hay, auto-IP (asterisco). IP estática en Setup > Network Setup. [SQ-RG]
- Patch interno SQ <-> tarjeta en la pantalla I/O (I/O Port); ruteo entre dispositivos en Dante Controller. [SQ-RG]
- Tarjeta con switch Gigabit interno y 2 etherCON (modo redundante o switched). [AP13279][AP11431]
- M-SQ-SDANTE requiere firmware SQ V1.2.2+. Tarjetas V3 requieren firmware SQ actualizado. [AP11431][AP13279]
- Known issue tarjeta V1 (fw 1.0.6): "Identify" de Dante Controller no funciona; agregar DHCP a una red Dante activa puede afectar controles de preamps DT. [SQ-RN]

NO VERIFICADO (no hay documento cargado): Art-Net/iluminación, equipos de video, QLab, licencia de DVS, switch Netgear de 16 puertos (modelo desconocido), rutas exactas de menú de Dante Controller por versión.
`;
