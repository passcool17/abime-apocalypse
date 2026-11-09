// Constantes, sauvegarde et petits outils d'interface partagés par les scènes.
const W = 1280, H = 720;
const OR = 0xd4a640, OR_T = '#e8c46a', ROUGE = 0x8a1010, SOMBRE = 0x120808;
const FONT = 'Georgia, "Times New Roman", serif';
const SAVE_KEY = 'abime-apocalypse-v1';
const HERO_X = p => 560 - (p - 1) * 135, BASE_Y = 440;
// Sprites en pied des héros (assets/heros/<id>.webp) : hauteur d'affichage. Elior (pose accroupie, cape large) un peu plus grand.
const HERO_BODY = { enoch: 215, elior: 192, christ: 218, thoth: 215 };

// Sprites de Créa (assets/ennemis/<clé>.webp) : boîte d'affichage max [largeur, hauteur]. Sans entrée = dessin provisoire.
const SPRITES = { sauterelle: [135, 160], demon: [135, 170], cultiste: [135, 165], fauxProphete: [125, 190],
  cavalierRouge: [155, 180], abaddon: [240, 240], cavalierPale: [240, 250], bete: [240, 245] };

let SAVE = loadSave();
function loadSave() {
  try { return LOGIC.migrate(JSON.parse(localStorage.getItem(SAVE_KEY))); } catch (e) { return LOGIC.newSave(); }
}
function persist() { try { localStorage.setItem(SAVE_KEY, JSON.stringify(SAVE)); } catch (e) { /* stockage plein ou bloqué */ } }

const txt = (sc, x, y, s, size = 20, color = OR_T, o = {}) =>
  sc.add.text(x, y, s, { fontFamily: FONT, fontSize: size + 'px', color, align: o.align || 'left', wordWrap: o.wrap ? { width: o.wrap } : undefined, stroke: '#000', strokeThickness: o.stroke ?? 3, lineSpacing: o.ls || 0 });

function button(sc, x, y, w, h, label, onClick, size = 18) {
  const c = sc.add.container(x, y);
  const bg = sc.add.rectangle(0, 0, w, h, 0x2a0d0d).setStrokeStyle(2, OR).setOrigin(0);
  const t = txt(sc, w / 2, h / 2, label, size, OR_T, { align: 'center', wrap: w - 8 }).setOrigin(0.5);
  c.add([bg, t]); c.bg = bg; c.label = t; c.enabled = true; c.w = w; c.h = h;
  bg.setInteractive({ useHandCursor: true })
    .on('pointerover', () => c.enabled && bg.setFillStyle(0x4a1414))
    .on('pointerout', () => bg.setFillStyle(c.selected ? 0x6a2a10 : 0x2a0d0d))
    .on('pointerdown', () => c.enabled && c.visible && onClick());
  c.setEnabled = on => { c.enabled = on; c.setAlpha(on ? 1 : 0.4); return c; };
  c.setSelected = on => { c.selected = on; bg.setFillStyle(on ? 0x6a2a10 : 0x2a0d0d); bg.setStrokeStyle(on ? 3 : 2, on ? 0xffe08a : OR); };
  return c;
}

function backdrop(sc, tint = 0x3a0606) {
  const g = sc.add.graphics();
  g.fillStyle(0x070303).fillRect(0, 0, W, H);
  for (let i = 0; i < 6; i++) g.fillStyle(tint, 0.12).fillEllipse(W / 2, H * 0.6, 1400 - i * 200, 600 - i * 80);
  g.lineStyle(2, OR, 0.6).strokeRect(8, 8, W - 16, H - 16);
  return g;
}

// Fenêtre modale : titre, texte, boutons [{label, fn}]
function modal(sc, title, body, buttons, depth = 60) {
  const c = sc.add.container(0, 0).setDepth(depth);
  c.add(sc.add.rectangle(0, 0, W, H, 0x000000, 0.65).setOrigin(0).setInteractive());
  c.add(sc.add.rectangle(W / 2, H / 2, 760, 380, SOMBRE).setStrokeStyle(3, OR));
  c.add(txt(sc, W / 2, H / 2 - 160, title, 30).setOrigin(0.5, 0));
  c.add(txt(sc, W / 2, H / 2 - 110, body, 18, '#e8d8c8', { align: 'center', wrap: 700 }).setOrigin(0.5, 0));
  const bw = Math.min(240, 700 / buttons.length - 10);
  buttons.forEach((b, i) => c.add(button(sc, W / 2 - (buttons.length * (bw + 10) - 10) / 2 + i * (bw + 10), H / 2 + 110, bw, 56, b.label, () => { c.destroy(); b.fn(); }, 18)));
  return c;
}

// ----- Dessins procéduraux (ennemis sans sprite, curiosités) -----
function drawEnemy(g, key) {
  const b = DATA.ENEMIES[key], c = b.color || ROUGE, cx = 80;
  const eyes = (x, y, s = 4) => { g.fillStyle(0xff3020).fillCircle(x - s * 1.5, y, s).fillCircle(x + s * 1.5, y, s); };
  switch (b.shape) {
    case 'locust':
      g.fillStyle(0xb08a30, 0.35).fillTriangle(cx, 100, 10, 40, 40, 120).fillTriangle(cx, 100, 150, 40, 120, 120);
      g.fillStyle(c).fillEllipse(cx, 125, 60, 90).fillCircle(cx, 70, 22); eyes(cx, 66);
      break;
    case 'demon':
      g.fillStyle(0x200606).fillTriangle(cx, 80, 0, 30, 30, 150).fillTriangle(cx, 80, 160, 30, 130, 150);
      g.fillStyle(c).fillTriangle(cx - 40, 195, cx + 40, 195, cx, 70).fillCircle(cx, 70, 24);
      g.fillStyle(OR).fillTriangle(cx - 20, 55, cx - 10, 55, cx - 30, 20).fillTriangle(cx + 20, 55, cx + 10, 55, cx + 30, 20); eyes(cx, 70);
      break;
    case 'cultist':
      g.lineStyle(4, 0x5a4020).lineBetween(130, 195, 130, 50); g.fillStyle(0xff7020).fillCircle(130, 45, 9);
      g.fillStyle(c).fillTriangle(cx - 50, 198, cx + 50, 198, cx, 50);
      g.fillStyle(0x050202).fillCircle(cx, 78, 18); g.fillStyle(OR).fillCircle(cx - 6, 78, 3).fillCircle(cx + 6, 78, 3);
      break;
    case 'horseman':
      g.fillStyle(0x1a1010); [40, 60, 105, 125].forEach(x => g.fillRect(x, 140, 9, 58));
      g.fillStyle(c).fillEllipse(85, 135, 120, 50).fillTriangle(30, 135, 10, 70, 45, 100); g.fillEllipse(18, 72, 26, 18);
      g.fillStyle(0x3a2a2a).fillTriangle(75, 120, 105, 120, 90, 50).fillCircle(90, 45, 13);
      eyes(90, 44, 3); g.lineStyle(4, 0xc8c8c8).lineBetween(110, 30, 130, 120);
      break;
    default:
      g.fillStyle(c).fillEllipse(cx, 160, 150, 70);
      for (let i = 0; i < 7; i++) { const hx = 12 + i * 22, hy = 40 + Math.abs(i - 3) * 14; g.lineStyle(9, c).lineBetween(cx, 150, hx, hy + 10); g.fillStyle(c).fillCircle(hx, hy, 11); }
  }
}
function drawCurio(g, id) {
  const gold = OR, stone = 0x4a3a34;
  switch (id) {
    case 'coffre': g.fillStyle(0x4a2a10).fillRect(10, 50, 100, 60); g.fillStyle(0x5a3414).fillRoundedRect(10, 30, 100, 30, 12); g.lineStyle(4, gold).strokeRect(10, 30, 100, 80); g.fillStyle(gold).fillRect(52, 58, 16, 18); break;
    case 'autel': g.fillStyle(stone).fillRect(15, 60, 90, 50).fillRect(5, 50, 110, 14); g.fillStyle(0x5a0000).fillRect(30, 52, 60, 6); g.fillStyle(0x200000).fillRect(40, 64, 8, 40); g.lineStyle(3, gold).lineBetween(60, 10, 60, 48).lineBetween(48, 22, 72, 22); break;
    case 'fontaine': g.fillStyle(stone).fillEllipse(60, 95, 110, 30).fillRect(50, 40, 20, 55); g.fillStyle(0x8a0010).fillEllipse(60, 90, 90, 18).fillEllipse(60, 38, 40, 12); break;
    case 'tablette': g.fillStyle(stone).fillRoundedRect(25, 10, 70, 100, 20); g.lineStyle(2, gold); for (let i = 0; i < 6; i++) g.lineBetween(38, 30 + i * 12, 82 - (i % 3) * 8, 30 + i * 12); break;
    case 'depouille': g.fillStyle(0x3a1020).fillEllipse(60, 98, 110, 24); g.fillStyle(0x1a0a0a).fillCircle(14, 92, 12); g.fillStyle(gold).fillCircle(80, 92, 7); break;
    case 'reserve': g.fillStyle(0x5a3a1a).fillRect(10, 60, 50, 50).fillRect(60, 70, 45, 40).fillRect(30, 20, 45, 40); g.lineStyle(2, 0x2a1a0a).strokeRect(10, 60, 50, 50).strokeRect(60, 70, 45, 40).strokeRect(30, 20, 45, 40); break;
    case 'eboulement': g.fillStyle(0x3a302a); [[20, 90, 30], [55, 80, 38], [95, 92, 26], [40, 55, 24], [75, 50, 22], [58, 28, 18]].forEach(([x, y, r]) => g.fillCircle(x, y, r)); break;
    case 'piege': g.fillStyle(0x6a6a6a); for (let i = 0; i < 5; i++) g.fillTriangle(15 + i * 22, 110, 33 + i * 22, 110, 24 + i * 22, 80); g.fillStyle(0x8a1010).fillRect(10, 108, 110, 4); break;
  }
}
