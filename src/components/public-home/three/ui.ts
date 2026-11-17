import { LOGO } from "../logoGeometry";
import { VERTICALS, COMMON } from "../verticals";
type Ctx = CanvasRenderingContext2D;
export const C = { bg: "#f4f6fa", ink: "#0b0d12", blue: "#0a6cff" };
const FONT = 'NCRHomeInter, Arial, sans-serif';
function mk(w: number, h: number, scale: number) {
  const c = document.createElement("canvas"); c.width = Math.round(w * scale); c.height = Math.round(h * scale);
  const ctx = c.getContext("2d")!; ctx.scale(scale, scale); return { c, ctx };
}
function t(ctx: Ctx, text: string, x: number, y: number, size = 13, weight = 500, color = "#25344b", maxWidth?: number) {
  ctx.font = `${weight} ${size}px ${FONT}`; ctx.fillStyle = color; ctx.textBaseline = "middle"; ctx.textAlign = "left";
  if (maxWidth && ctx.measureText(text).width > maxWidth) { while (text.length && ctx.measureText(text + "…").width > maxWidth) text = text.slice(0, -1); text += "…"; }
  ctx.fillText(text, x, y);
}
function box(ctx: Ctx, x: number, y: number, w: number, h: number, color = "#fff", radius = 16, border = "#e1e7ef") {
  ctx.beginPath(); ctx.roundRect(x, y, w, h, radius); ctx.fillStyle = color; ctx.fill();
  ctx.strokeStyle = border; ctx.lineWidth = 1; ctx.stroke();
}
function line(ctx: Ctx, x: number, y: number, w: number, color = "#e4e9f0") { ctx.fillStyle = color; ctx.fillRect(x, y, w, 1); }
function chip(ctx: Ctx, text: string, x: number, y: number, accent: string, soft: string) {
  ctx.font = `600 11px ${FONT}`; const width = ctx.measureText(text).width + 20;
  box(ctx, x, y, width, 24, soft, 12, soft); t(ctx, text, x + 10, y + 12, 11, 600, accent);
}
export function drawMark(ctx: Ctx, x: number, y: number, h: number, ink: string, accent: string) {
  const { slope, barW, barH, radius, topY, midY, midX, botY, dot, cut, yMin, yMax } = LOGO;
  const k = h / (yMax - yMin);
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(k, k);
  ctx.translate(0, -yMin);
  ctx.fillStyle = ink;
  const bar = (yy: number, x0: number, notch: boolean) => {
    ctx.save();
    if (notch) {
      // l'espace libre autour du point échancre la barre centrale
      ctx.beginPath();
      ctx.rect(-50, -50, 400, 500);
      ctx.moveTo(dot.x + cut, dot.y);
      ctx.arc(dot.x, dot.y, cut, 0, Math.PI * 2);
      ctx.clip("evenodd");
    }
    ctx.transform(1, -slope, 0, 1, 0, 0);
    ctx.beginPath();
    ctx.roundRect(x0, yy, barW - x0, barH, radius);
    ctx.fill();
    ctx.restore();
  };
  bar(topY, 0, false);
  bar(midY, midX, true);
  bar(botY, 0, false);
  ctx.beginPath();
  ctx.arc(dot.x, dot.y, dot.r, 0, Math.PI * 2);
  ctx.fillStyle = accent;
  ctx.fill();
  ctx.restore();
}


function overview(ctx: Ctx, mobile: boolean) {
  const w = mobile ? 480 : 1024, h = mobile ? 600 : 640;
  ctx.fillStyle = "#f4f6fa"; ctx.fillRect(0, 0, w, h);
  const x = mobile ? 26 : 40;
  drawMark(ctx, x, 24, 35, C.ink, "#61728c");
  t(ctx, "NCR Suite", x + 37, 42, 23, 800);
  t(ctx, "UNE PLATEFORME · CINQ UNIVERS", x, 92, mobile ? 14 : 16, 700, "#52627a");
  if (!mobile) {
    box(ctx, 40, 126, 944, 113, "#fff", 20);
    t(ctx, "Le même socle. Votre environnement métier.", 65, 166, 28, 700);
    t(ctx, "Des outils, un vocabulaire et des priorités propres à chaque activité.", 65, 206, 16, 400, "#52627a");
  }
  VERTICALS.forEach((v, i) => {
    const cx = mobile ? 26 : 40 + i * 191, cy = mobile ? 122 + i * 65 : 270;
    const cw = mobile ? 428 : 180, ch = mobile ? 55 : 176;
    box(ctx, cx, cy, cw, ch, "#fff", 15, v.accent + "30");
    box(ctx, cx + 12, cy + 12, mobile ? 30 : 36, mobile ? 30 : 36, v.soft, 10, v.soft);
    t(ctx, String(i + 1).padStart(2, "0"), cx + 19, cy + (mobile ? 27 : 30), 12, 700, v.accent);
    t(ctx, v.label, cx + (mobile ? 57 : 14), cy + (mobile ? 21 : 74), mobile ? 15 : 14, 700, v.accent);
    t(ctx, v.nav[1] + " · " + v.nav[2], cx + (mobile ? 57 : 14), cy + (mobile ? 40 : 102), mobile ? 11 : 12, 500, "#52627a", mobile ? 345 : 152);
    if (!mobile) { t(ctx, v.nav[3], cx + 14, cy + 127, 12, 500, "#52627a"); line(ctx, cx + 14, cy + 155, 150, v.accent + "50"); }
  });
  const y = mobile ? 475 : 492;
  t(ctx, "LE SOCLE COMMUN", x, y, 12, 700, "#52627a");
  COMMON.forEach((label, i) => {
    const cx = mobile ? 26 + (i % 3) * 144 : 40 + i * 159, cy = mobile ? y + 20 + Math.floor(i / 3) * 32 : y + 25;
    box(ctx, cx, cy, mobile ? 136 : 148, 27, "#eaf0f7", 8, "#eaf0f7");
    t(ctx, label, cx + 10, cy + 14, mobile ? 9 : 11, 600, "#42536a", mobile ? 116 : 130);
  });
  t(ctx, "Illustration des univers NCR Suite · Fonctions selon l’offre", x, h - 20, mobile ? 10 : 12, 400, "#63738a");
}

function businessShell(ctx: Ctx, index: number, mobile: boolean) {
  const v = VERTICALS[index], w = mobile ? 480 : 1024;
  ctx.fillStyle = "#f4f6fa"; ctx.fillRect(0, 0, w, mobile ? 600 : 640);
  if (!mobile) {
    ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, 180, 640);
    drawMark(ctx, 22, 25, 33, C.ink, v.accent); t(ctx, "NCR Suite", 60, 42, 19, 800, C.ink);
    t(ctx, v.label.toUpperCase(), 22, 88, 11, 700, v.accent);
    box(ctx, 14, 117, 152, 54, v.soft, 12, v.accent + "25");
    t(ctx, "ENVIRONNEMENT", 26, 134, 9, 600, "#63738a"); t(ctx, v.label, 26, 155, 13, 700, v.accent, 132);
    v.nav.forEach((n, i) => { if (i === 0) box(ctx, 14, 207 + i * 47, 152, 37, v.soft, 9, v.accent + "35"); t(ctx, n, 30, 226 + i * 47, 13, i === 0 ? 700 : 500, i === 0 ? v.accent : "#52627a"); });
    line(ctx, 20, 526, 140); t(ctx, "NCR Suite", 25, 556, 13, 700); t(ctx, "Une marque. Votre métier.", 25, 578, 10, 400, "#63738a");
  }
  const x = mobile ? 20 : 204, width = mobile ? 440 : 796;
  if (mobile) { drawMark(ctx, 20, 15, 28, C.ink, v.accent); t(ctx, "NCR Suite", 52, 31, 18, 800); t(ctx, "ILLUSTRATION", 358, 31, 10, 600, "#63738a"); }
  box(ctx, x, mobile ? 64 : 22, width, mobile ? 94 : 130, v.soft, 18, v.accent + "25");
  t(ctx, v.label.toUpperCase(), x + 20, mobile ? 86 : 47, 11, 700, v.accent);
  t(ctx, v.dashboard, x + 20, mobile ? 116 : 81, mobile ? 23 : 28, 700, "#1c2b3d", width - 40);
  if (!mobile) { t(ctx, "Outils et priorités adaptés à votre activité", x + 20, 117, 13, 400, "#52627a"); chip(ctx, v.primary, 760, 105, v.accent, "#ffffff"); }
  const top = mobile ? 172 : 172, cols = mobile ? 2 : 4, cw = (width - (cols - 1) * 12) / cols;
  v.metrics.forEach((m, i) => { const xx = x + (i % cols) * (cw + 12), yy = top + Math.floor(i / cols) * 70;
    box(ctx, xx, yy, cw, mobile ? 60 : 84); t(ctx, m, xx + 14, yy + 20, 12, 600, "#63738a", cw - 26); t(ctx, "—", xx + 14, yy + (mobile ? 43 : 56), 24, 700, v.accent);
  });
}
function rows(ctx: Ctx, labels: readonly string[], x: number, y: number, w: number, v: typeof VERTICALS[number], step = 48) {
  labels.forEach((label, i) => { box(ctx, x, y + i * step, w, step - 8, i % 2 ? "#fff" : v.soft, 10, v.accent + "20");
    t(ctx, "›", x + 12, y + i * step + (step - 8) / 2, 19, 600, v.accent); t(ctx, label, x + 32, y + i * step + (step - 8) / 2, 12, 600, "#33445b", w - 45); });
}
function business(ctx: Ctx, index: number, mobile: boolean) {
  const v = VERTICALS[index]; businessShell(ctx, index, mobile);
  const x = mobile ? 20 : 204, y = mobile ? 320 : 278, w = mobile ? 440 : 490, h = mobile ? 221 : 324;
  box(ctx, x, y, w, h);
  if (index === 0) {
    t(ctx, "PARCOURS DE FORMATION", x + 20, y + 27, 11, 700, v.accent);
    t(ctx, "Préparer. Émarger. Documenter.", x + 20, y + 56, mobile ? 19 : 23, 700);
    rows(ctx, ["Sessions et stagiaires", "Présences et émargements", "Dossiers et preuves qualité"], x + 20, y + 85, w - 40, v, mobile ? 39 : 52);
    if (!mobile) chip(ctx, "Documents liés à la session", x + 20, y + 271, v.accent, v.soft);
  } else if (index === 1) {
    t(ctx, "VACATIONS ET TERRAIN", x + 20, y + 27, 11, 700, v.accent);
    const labels = ["Planning de vacation", "Rondes QR", "Main courante", "Rapports terrain"];
    labels.forEach((label, i) => { const yy = y + 65 + i * (mobile ? 39 : 61); ctx.fillStyle = v.accent + "35"; ctx.fillRect(x + 31, yy, 2, mobile ? 39 : 61); box(ctx, x + 23, yy - 6, 18, 18, v.soft, 9, v.accent); t(ctx, label, x + 58, yy + 3, mobile ? 14 : 17, 600); if (!mobile) t(ctx, ["Agents et sites", "Points de passage", "Événements consignés", "Documents rattachés"][i], x + 58, yy + 24, 12, 400, "#63738a"); });
  } else if (index === 2) {
    t(ctx, "INTERVENTIONS OPÉRATIONNELLES", x + 20, y + 27, 11, 700, v.accent);
    rows(ctx, ["Site · Planning et affectations", "Terrain · Pointage et consignes", "Preuves · Rapports et photos"], x + 20, y + 53, w - 40, v, mobile ? 45 : 65);
    if (!mobile) { chip(ctx, "Avant", x + 20, y + 268, v.accent, v.soft); chip(ctx, "Après", x + 91, y + 268, v.accent, v.soft); t(ctx, "Photos rattachées au site", x + 170, y + 280, 12, 500, "#63738a"); }
  } else if (index === 3) {
    t(ctx, "SALLE ET SERVICE", x + 20, y + 27, 11, 700, v.accent);
    const roomW = mobile ? 186 : 238;
    box(ctx, x + 20, y + 50, roomW, mobile ? 145 : 210, v.soft, 12, v.soft);
    for (let i = 0; i < 6; i++) { const xx = x + 37 + (i % 2) * (roomW / 2 - 8), yy = y + 71 + Math.floor(i / 2) * (mobile ? 39 : 57); box(ctx, xx, yy, mobile ? 61 : 85, mobile ? 28 : 40, "#fff", 8, v.accent + "50"); t(ctx, "Table", xx + 10, yy + (mobile ? 14 : 20), 11, 600, v.accent); }
    rows(ctx, ["Réservations", "Carte et recettes", "Écran cuisine"], x + roomW + 33, y + 50, w - roomW - 53, v, mobile ? 48 : 68);
    if (!mobile) t(ctx, "Du plan de salle à la préparation en cuisine", x + 20, y + 289, 13, 500, "#63738a");
  } else {
    t(ctx, "AGENDA DU SALON", x + 20, y + 27, 11, 700, v.accent);
    ["Rendez-vous", "Prestation", "Collaborateur"].forEach((label, i) => { const yy = y + 55 + i * (mobile ? 48 : 73); t(ctx, ["Matin", "Midi", "Après-midi"][i], x + 20, yy + 16, 10, 500, "#63738a", 65); box(ctx, x + 92, yy, w - 112, mobile ? 39 : 58, v.soft, 10, v.accent + "30"); t(ctx, label, x + 108, yy + (mobile ? 20 : 22), 14, 600, v.accent); if (!mobile) t(ctx, ["Agenda et réservation", "Services, durées et tarifs", "Équipe et disponibilités"][i], x + 108, yy + 42, 11, 400, "#63738a"); });
  }
  if (!mobile) {
    box(ctx, 712, y, 288, 324);
    t(ctx, ["SUIVI PÉDAGOGIQUE", "SUPERVISION", "QUALITÉ ET STOCKS", "EXPLOITATION", "ACCÈS RAPIDES"][index], 730, y + 27, 11, 700, v.accent);
    const extra = [["Documents de session", "Évaluations", "Attestations", "Suivi qualité"], ["Agents et sites", "Consignes", "Alertes terrain", "Portail client"], ["Contrôles qualité", "Anomalies", "Stocks et produits", "Rapports de passage"], ["Équipe et planning", "Hygiène et traçabilité", "Stocks", "Carte et allergènes"], ["Fiches clients", "Prestations", "Collaborateurs", "Fidélité"]][index];
    rows(ctx, extra, 730, y + 53, 252, v, 59);
  }
  t(ctx, "Illustration · Fonctions selon métier, offre et modules", mobile ? 20 : 204, mobile ? 577 : 624, mobile ? 11 : 12, 400, "#63738a");
}
export const VIEW_COUNT = VERTICALS.length + 1;
export const MOBILE_W = 480;
export const MOBILE_H = 600;
export function buildView(i: number, scale: number): HTMLCanvasElement { const { c, ctx } = mk(1024, 640, scale); if (i === 0) overview(ctx, false); else business(ctx, i - 1, false); return c; }
export function buildMobileView(i: number, scale: number): HTMLCanvasElement { const { c, ctx } = mk(480, 600, scale); if (i === 0) overview(ctx, true); else business(ctx, i - 1, true); return c; }
export interface FloaterTex { canvas: HTMLCanvasElement; w: number; h: number; }
// Same card geometry for every stage; only the verified métier content and accent vary.
export function buildFloaters(scale: number): Record<string, FloaterTex> {
  const result: Record<string, FloaterTex> = {};
  VERTICALS.forEach((v, i) => v.features.forEach((feature, j) => {
    const { c, ctx } = mk(360, 156, scale);
    ctx.shadowColor = v.accent + "25"; ctx.shadowBlur = 15; ctx.shadowOffsetY = 8;
    box(ctx, 20, 20, 320, 110, "#fff", 18, v.accent + "30"); ctx.shadowColor = "transparent";
    drawMark(ctx, 36, 34, 25, C.ink, v.accent); t(ctx, v.label, 66, 47, 12, 700, v.accent);
    t(ctx, feature, 36, 80, 15, 700, "#25344b", 288); t(ctx, "NCR Suite · Selon l’offre", 36, 109, 11, 500, "#63738a");
    result[`vertical-${i}-${j}`] = { canvas: c, w: 360, h: 156 };
  }));
  return result;
}
