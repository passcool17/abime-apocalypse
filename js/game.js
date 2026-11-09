// Abîme de l'Apocalypse — scènes Phaser (Titre, Hameau, Donjon/Combat)
const W = 1280, H = 720;
const OR = 0xd4a640, OR_T = '#e8c46a', ROUGE = 0x8a1010, SOMBRE = 0x120808;
const FONT = 'Georgia, "Times New Roman", serif';
const SAVE_KEY = 'abime-apocalypse-v1';

let SAVE = load();
function load() {
  try { const s = JSON.parse(localStorage.getItem(SAVE_KEY)); if (s && s.version === 1) return s; } catch (e) { /* sauvegarde illisible */ }
  return LOGIC.newSave();
}
function persist() { try { localStorage.setItem(SAVE_KEY, JSON.stringify(SAVE)); } catch (e) { /* stockage plein ou bloqué */ } }

const txt = (sc, x, y, s, size = 20, color = OR_T, o = {}) =>
  sc.add.text(x, y, s, { fontFamily: FONT, fontSize: size + 'px', color, align: o.align || 'left', wordWrap: o.wrap ? { width: o.wrap } : undefined, stroke: '#000', strokeThickness: o.stroke || 3 });

function button(sc, x, y, w, h, label, onClick, size = 18) {
  const c = sc.add.container(x, y);
  const bg = sc.add.rectangle(0, 0, w, h, 0x2a0d0d).setStrokeStyle(2, OR).setOrigin(0);
  const t = txt(sc, w / 2, h / 2, label, size, OR_T, { align: 'center', wrap: w - 10 }).setOrigin(0.5);
  c.add([bg, t]); c.bg = bg; c.label = t; c.enabled = true;
  bg.setInteractive({ useHandCursor: true })
    .on('pointerover', () => c.enabled && bg.setFillStyle(0x4a1414))
    .on('pointerout', () => bg.setFillStyle(c.selected ? 0x6a2a10 : 0x2a0d0d))
    .on('pointerdown', () => c.enabled && onClick());
  c.setEnabled = on => { c.enabled = on; c.setAlpha(on ? 1 : 0.4); return c; };
  c.setSelected = on => { c.selected = on; bg.setFillStyle(on ? 0x6a2a10 : 0x2a0d0d); bg.setStrokeStyle(on ? 3 : 2, on ? 0xffe08a : OR); };
  return c;
}

function backdrop(sc, tint = 0x3a0606) {
  const g = sc.add.graphics();
  g.fillStyle(0x070303).fillRect(0, 0, W, H);
  for (let i = 0; i < 6; i++) { g.fillStyle(tint, 0.12).fillEllipse(W / 2, H * 0.6, 1400 - i * 200, 600 - i * 80); }
  g.lineStyle(2, OR, 0.6).strokeRect(8, 8, W - 16, H - 16);
  return g;
}

// ---------- Dessins procéduraux des ennemis ----------
function drawEnemy(g, key) {
  const b = DATA.ENEMIES[key], c = b.color || ROUGE, cx = 80;
  const eyes = (x, y, s = 4) => { g.fillStyle(0xff3020).fillCircle(x - s * 1.5, y, s).fillCircle(x + s * 1.5, y, s); };
  const crown = (x, y) => { g.fillStyle(OR); for (let i = -2; i <= 2; i++) g.fillTriangle(x + i * 9 - 5, y, x + i * 9 + 5, y, x + i * 9, y - 14); };
  switch (b.shape) {
    case 'locust':
      g.fillStyle(0xb08a30, 0.35).fillTriangle(cx, 100, 10, 40, 40, 120).fillTriangle(cx, 100, 150, 40, 120, 120);
      g.lineStyle(3, 0x2a1a0a); [[60, 140, 40, 195], [100, 140, 120, 195], [70, 150, 60, 195], [90, 150, 100, 195]].forEach(l => g.lineBetween(...l));
      g.fillStyle(c).fillEllipse(cx, 125, 60, 90); g.fillStyle(0x3a2a10).fillEllipse(cx, 135, 40, 50);
      g.fillStyle(c).fillCircle(cx, 70, 22); g.fillStyle(0xd8c8a0).fillTriangle(cx - 10, 80, cx + 10, 80, cx, 100); // dents de lion
      g.lineStyle(2, 0x806040).strokeCircle(cx, 70, 26); eyes(cx, 66);
      if (b.boss) crown(cx, 48);
      break;
    case 'demon':
      g.fillStyle(0x200606).fillTriangle(cx, 80, 0, 30, 30, 150).fillTriangle(cx, 80, 160, 30, 130, 150);
      g.fillStyle(c).fillTriangle(cx - 40, 195, cx + 40, 195, cx, 70).fillCircle(cx, 70, 24);
      g.fillStyle(OR).fillTriangle(cx - 20, 55, cx - 10, 55, cx - 30, 20).fillTriangle(cx + 20, 55, cx + 10, 55, cx + 30, 20);
      eyes(cx, 70); g.lineStyle(3, 0xff6030).lineBetween(cx - 8, 82, cx + 8, 82);
      break;
    case 'cultist':
      g.lineStyle(4, 0x5a4020).lineBetween(130, 195, 130, 50); g.fillStyle(0xff7020).fillCircle(130, 45, 9); g.fillStyle(0xffd040).fillCircle(130, 47, 4);
      g.fillStyle(c).fillTriangle(cx - 50, 198, cx + 50, 198, cx, 50);
      g.fillStyle(0x050202).fillCircle(cx, 78, 18); g.fillStyle(OR).fillCircle(cx - 6, 78, 3).fillCircle(cx + 6, 78, 3);
      g.lineStyle(2, OR).lineBetween(cx - 30, 140, cx + 30, 140); g.lineBetween(cx, 120, cx, 160);
      break;
    case 'horseman':
      g.fillStyle(0x1a1010); [40, 60, 105, 125].forEach(x => g.fillRect(x, 140, 9, 58));
      g.fillStyle(c).fillEllipse(85, 135, 120, 50).fillTriangle(30, 135, 10, 70, 45, 100); g.fillEllipse(18, 72, 26, 18);
      g.fillStyle(0x3a2a2a).fillTriangle(75, 120, 105, 120, 90, 50).fillCircle(90, 45, 13);
      eyes(90, 44, 3); g.lineStyle(4, 0xc8c8c8).lineBetween(110, 30, 130, 120); g.lineStyle(4, OR).lineBetween(100, 70, 112, 70);
      if (b.boss) { g.lineStyle(5, 0x9a9a9a).lineBetween(120, 10, 120, 120); g.fillStyle(0xcfcfcf).fillTriangle(120, 10, 160, 25, 120, 30); }
      break;
    case 'beast':
      g.fillStyle(c).fillEllipse(cx, 160, 150, 70);
      for (let i = 0; i < 7; i++) {
        const hx = 12 + i * 22, hy = 40 + Math.abs(i - 3) * 14;
        g.lineStyle(9, c).lineBetween(cx, 150, hx, hy + 10); g.fillStyle(c).fillCircle(hx, hy, 11);
        g.fillStyle(OR).fillTriangle(hx - 8, hy - 6, hx - 2, hy - 6, hx - 9, hy - 22).fillTriangle(hx + 8, hy - 6, hx + 2, hy - 6, hx + 9, hy - 22);
        g.fillStyle(0xff3020).fillCircle(hx, hy, 3);
      }
      break;
  }
}

// ---------- Scènes ----------
class Boot extends Phaser.Scene {
  constructor() { super('boot'); }
  preload() {
    txt(this, W / 2, H / 2, 'Chargement…', 28).setOrigin(0.5);
    DATA.HERO_ORDER.forEach(id => this.load.image('h_' + id, `assets/${id}.webp`));
    this.load.image('fond', 'assets/fond-heros.webp');
  }
  create() {
    Object.keys(DATA.ENEMIES).forEach(k => { const g = this.make.graphics({ add: false }); drawEnemy(g, k); g.generateTexture('e_' + k, 160, 200); g.destroy(); });
    this.scene.start('titre');
  }
}

class Titre extends Phaser.Scene {
  constructor() { super('titre'); }
  create() {
    backdrop(this);
    this.add.image(W / 2, 230, 'fond').setDisplaySize(1024, 399).setAlpha(0.75);
    this.add.rectangle(W / 2, 470, W, 160, 0x000000, 0.55);
    txt(this, W / 2, 440, "Abîme de l'Apocalypse", 64, OR_T, { stroke: 6 }).setOrigin(0.5);
    txt(this, W / 2, 500, 'Quatre témoins descendent dans les ténèbres.', 22, '#c89a8a').setOrigin(0.5);
    button(this, W / 2 - 150, 570, 300, 60, 'Entrer au hameau', () => this.scene.start('hameau'), 24);
    button(this, W / 2 - 110, 645, 220, 44, 'Nouvelle partie', () => {
      if (window.confirm('Effacer la sauvegarde et recommencer ?')) { SAVE = LOGIC.newSave(); persist(); this.scene.start('hameau'); }
    }, 16);
  }
}

class Hameau extends Phaser.Scene {
  constructor() { super('hameau'); }
  create() { this.draw(); }
  draw() {
    this.children.removeAll(true);
    backdrop(this, 0x3a2006);
    txt(this, 40, 24, 'Le Hameau', 40);
    txt(this, 860, 34, `Or : ${SAVE.gold}`, 28, '#ffd860');
    const msg = txt(this, 40, 680, '', 18, '#c8b8a8');
    const pay = (cost, fn, label) => {
      if (SAVE.gold < cost) { msg.setText("Pas assez d'or."); return; }
      SAVE.gold -= cost; fn(); persist(); this.draw(); this.flash(label);
    };
    DATA.HERO_ORDER.forEach((id, i) => {
      const s = SAVE.heroes[id], b = DATA.HEROES[id], x = 30 + i * 200, max = LOGIC.heroMaxHp(id, s.lvl);
      this.add.rectangle(x, 90, 190, 570, SOMBRE).setOrigin(0).setStrokeStyle(2, OR, 0.7);
      const img = this.add.image(x + 95, 100, 'h_' + id).setOrigin(0.5, 0).setScale(0.8);
      if (s.lost) { img.setTint(0x444444); txt(this, x + 95, 230, 'PERDU', 34, '#ff4040').setOrigin(0.5); }
      txt(this, x + 95, 365, `${b.name}  (niv. ${s.lvl})`, 20).setOrigin(0.5);
      txt(this, x + 95, 390, b.title, 13, '#b89a7a', { align: 'center', wrap: 180 }).setOrigin(0.5, 0);
      txt(this, x + 12, 425, `PV ${s.hp}/${max}`, 17, '#ff8a7a');
      txt(this, x + 12, 447, b.steadfast ? 'Stress : Inébranlable' : `Stress ${s.stress}/100`, 17, '#c8a0ff');
      if (s.lost) return;
      const heal = max - s.hp, pray = Math.ceil(s.stress * 0.6), forge = 50 * s.lvl;
      button(this, x + 10, 480, 170, 46, heal ? `Infirmerie (${heal} or)` : 'PV au max', () => pay(heal, () => { s.hp = max; }, `${b.name} est soigné.`), 15).setEnabled(heal > 0);
      button(this, x + 10, 534, 170, 46, s.stress ? `Chapelle (${pray} or)` : 'Esprit en paix', () => pay(pray, () => { s.stress = 0; }, `${b.name} retrouve la paix.`), 15).setEnabled(s.stress > 0);
      button(this, x + 10, 588, 170, 56, s.lvl < 5 ? `Forge sacrée\nniv. ${s.lvl + 1} (${forge} or)` : 'Niveau max', () => pay(forge, () => { s.lvl++; s.hp += 3; }, `${b.name} passe au niveau ${s.lvl}.`), 15).setEnabled(s.lvl < 5);
    });
    txt(this, 860, 90, 'Expéditions', 28);
    DATA.DUNGEONS.forEach((dg, i) => {
      const open = i === 0 || SAVE.cleared.includes(DATA.DUNGEONS[i - 1].id), done = SAVE.cleared.includes(dg.id);
      const bt = button(this, 850, 135 + i * 125, 400, 110, '', () => this.start(i));
      bt.label.setText(`${dg.name}${done ? '  ✓' : ''}\n${open ? dg.desc : 'Verrouillé : vaincs le boss précédent.'}`).setFontSize(17);
      bt.setEnabled(open);
    });
    const ready = Object.values(SAVE.heroes).filter(h => !h.lost);
    if (!ready.length) txt(this, 850, 675, 'Tous les héros sont perdus : recommence via le Menu.', 14, '#ff6060');
    button(this, 850, 530, 400, 44, `Mort permanente : ${SAVE.permadeath ? 'OUI' : 'non'}`, () => { SAVE.permadeath = !SAVE.permadeath; persist(); this.draw(); }, 17);
    txt(this, 850, 580, SAVE.permadeath ? 'Un héros tombé est perdu pour de bon.' : 'Un héros tombé revient au hameau avec 1 PV.', 14, '#b89a7a');
    button(this, 1110, 620, 140, 44, 'Menu', () => this.scene.start('titre'), 17);
    this.msg = msg;
  }
  flash(s) { this.msg && this.msg.setText(s); }
  start(i) {
    if (!Object.values(SAVE.heroes).some(h => !h.lost)) return;
    this.scene.start('donjon', { dg: i });
  }
}

const HERO_X = p => 560 - (p - 1) * 130, ENEMY_X = p => 730 + (p - 1) * 130, BASE_Y = 440;
const STATUS = u => [u.st.bleed.length && 'Saigne', u.st.burn.length && 'Brûle', u.st.stun && 'Étourdi', u.st.mark && 'Marqué',
  u.st.curse && 'Maudit', u.st.guard && 'Protégé', u.st.buff && 'Vision', LOGIC.crisis(u) && 'CRISE'].filter(Boolean).join(' · ');

class Donjon extends Phaser.Scene {
  constructor() { super('donjon'); }
  init(d) {
    this.dgIdx = d.dg; this.dg = DATA.DUNGEONS[d.dg];
    this.rooms = LOGIC.buildRooms(this.dg); this.roomIdx = -1;
    this.heroes = DATA.HERO_ORDER.filter(id => !SAVE.heroes[id].lost).map((id, i) => LOGIC.makeHero(id, SAVE.heroes[id], i + 1));
    this.heroes.forEach(h => { if (SAVE.heroes[h.id].hp <= 0) h.hp = 1; });
    this.views = new Map(); this.combat = null; this.logLines = [];
  }
  create() {
    backdrop(this, [0x3a0606, 0x4a2a06, 0x2a0640][this.dgIdx]);
    txt(this, 24, 18, this.dg.name, 28);
    this.mapG = this.add.graphics(); this.mapT = this.add.container();
    this.logT = txt(this, W / 2, 100, '', 17, '#e8d8c8', { align: 'center' }).setOrigin(0.5, 0);
    this.goldT = txt(this, 1080, 22, '', 22, '#ffd860');
    this.ui = this.add.container();
    this.drawMap(); this.refreshUnits(); this.nextRoom();
  }
  say(lines) { this.logLines = this.logLines.concat(lines).slice(-3); this.logT.setText(this.logLines.join('\n')); }
  drawMap() {
    this.goldT.setText(`Or : ${SAVE.gold}`);
    const g = this.mapG.clear(), n = this.rooms.length, x0 = 520, dx = 70, y = 70;
    this.mapT.removeAll(true);
    g.lineStyle(3, OR, 0.5).lineBetween(x0, y, x0 + dx * (n - 1), y);
    this.rooms.forEach((r, i) => {
      const seen = i <= this.roomIdx || r.type === 'boss', cur = i === this.roomIdx;
      g.fillStyle(cur ? 0xffd860 : i < this.roomIdx ? 0x5a4020 : r.type === 'boss' ? ROUGE : 0x2a1010).fillCircle(x0 + i * dx, y, r.type === 'boss' ? 18 : 13);
      g.lineStyle(2, OR).strokeCircle(x0 + i * dx, y, r.type === 'boss' ? 18 : 13);
      const lab = seen ? { combat: 'Combat', tresor: 'Trésor', autel: 'Autel', boss: 'Boss' }[r.type] : '?';
      this.mapT.add(txt(this, x0 + i * dx, y - 40, lab, 13, '#c8b8a8').setOrigin(0.5));
    });
  }
  // ----- affichage des unités -----
  unitList() { return this.heroes.concat(this.combat ? this.combat.enemies : []); }
  refreshUnits() {
    const list = this.unitList();
    for (const [uid, v] of this.views) if (!list.some(u => u.uid === uid)) { v.destroy(); this.views.delete(uid); }
    list.forEach(u => {
      let v = this.views.get(u.uid);
      if (!v) v = this.makeView(u);
      const x = u.side === 'hero' ? HERO_X(u.pos) : ENEMY_X(u.pos);
      if (v.x !== x) this.tweens.add({ targets: v, x, duration: 300 });
      v.hpBar.width = 100 * Math.max(0, u.hp) / u.maxHp;
      v.hpT.setText(`${Math.max(0, u.hp)}/${u.maxHp}`);
      if (v.stBar) v.stBar.width = u.steadfast ? 100 : u.stress;
      v.stat.setText(STATUS(u));
      v.sprite.setAlpha(u.dead ? 0.25 : 1);
      v.setVisible(!u.dead);
    });
  }
  makeView(u) {
    const v = this.add.container(u.side === 'hero' ? HERO_X(u.pos) : ENEMY_X(u.pos), BASE_Y);
    const ring = this.add.ellipse(0, 0, 120, 30).setStrokeStyle(3, 0xffe08a).setVisible(false);
    let sprite;
    if (u.side === 'hero') sprite = this.add.image(0, 0, 'h_' + u.id).setOrigin(0.5, 1).setScale(0.6);
    else { const b = DATA.ENEMIES[u.id]; sprite = this.add.image(0, 0, 'e_' + u.id).setOrigin(0.5, 1).setScale(b.boss ? 1.1 : 0.85); }
    const top = -sprite.displayHeight;
    const name = txt(this, 0, top - 22, u.name, 14, u.side === 'hero' ? OR_T : '#ff9a8a', { align: 'center', wrap: 140 }).setOrigin(0.5, 1);
    const arrow = this.add.triangle(0, top - 50 - (name.height - 18), -10, -14, 10, -14, 0, 0, 0xffe08a).setVisible(false);
    const hpBg = this.add.rectangle(-50, 12, 100, 14, 0x300000).setOrigin(0, 0.5);
    const hpBar = this.add.rectangle(-50, 12, 100, 14, 0xa01818).setOrigin(0, 0.5);
    const hpT = txt(this, 0, 12, '', 12, '#ffffff', { stroke: 2 }).setOrigin(0.5);
    v.add([ring, sprite, name, arrow, hpBg, hpBar, hpT]);
    if (u.side === 'hero') {
      const sBg = this.add.rectangle(-50, 27, 100, 7, 0x1a0a2a).setOrigin(0, 0.5);
      v.stBar = this.add.rectangle(-50, 27, 0, 7, u.steadfast ? 0xffe08a : 0x9a50ff).setOrigin(0, 0.5);
      v.add([sBg, v.stBar]);
    }
    const stat = txt(this, 0, 36, '', 13, '#ffcc66', { align: 'center' }).setOrigin(0.5, 0);
    v.add(stat);
    Object.assign(v, { ring, sprite, arrow, hpBar, hpT, stat });
    const zone = this.add.rectangle(0, top / 2, 120, -top + 40, 0x000000, 0.001).setInteractive({ useHandCursor: true }).on('pointerdown', () => this.clickUnit(u));
    v.add(zone);
    this.views.set(u.uid, v);
    return v;
  }
  showFx(fx) {
    fx.forEach((f, i) => {
      const v = this.views.get(f.uid); if (!v) return;
      const style = { dmg: ['#ff5050', `-${f.amount}`], crit: ['#ffd040', `CRITIQUE -${f.amount}`], soin: ['#60ff80', `+${f.amount} PV`],
        stress: ['#c080ff', `+${f.amount} stress`], calme: ['#80c0ff', `-${f.amount} stress`], 'raté': ['#c0c0c0', 'Esquive'],
        saignement: ['#ff3030', `-${f.amount} saignement`], 'brûlure': ['#ff8020', `-${f.amount} brûlure`] }[f.type];
      if (!style) return;
      const t = txt(this, v.x, BASE_Y - 200 - i * 4 + (f.type === 'stress' || f.type === 'calme' ? 26 : 0), style[1], 22, style[0], { stroke: 4 }).setOrigin(0.5);
      this.tweens.add({ targets: t, y: t.y - 50, alpha: 0, duration: 1200, onComplete: () => t.destroy() });
      if (['dmg', 'crit', 'saignement', 'brûlure'].includes(f.type)) this.tweens.add({ targets: v.sprite, x: 8, duration: 50, yoyo: true, repeat: 2, onComplete: () => { v.sprite.x = 0; } });
    });
  }
  // ----- progression dans les salles -----
  saveHeroes() { LOGIC.syncSave(SAVE, this.heroes); persist(); }
  nextRoom() {
    this.ui.removeAll(true);
    this.roomIdx++;
    if (this.roomIdx > 0) this.heroes.forEach(h => { if (!h.dead) LOGIC.addStress(h, 3, []); });
    const r = this.rooms[this.roomIdx]; this.drawMap();
    if (r.type === 'combat' || r.type === 'boss') return this.startCombat(r);
    if (r.type === 'tresor') {
      const gold = Math.round((20 + Math.random() * 30) * this.dg.gold);
      SAVE.gold += gold; const lines = [`Un coffre ancien : +${gold} or.`];
      if (Math.random() < 0.3) { lines.push('Un piège ! Une voix murmure des blasphèmes (stress +10).'); this.heroes.forEach(h => !h.dead && LOGIC.addStress(h, 10, lines)); }
      this.say(lines);
    } else {
      this.heroes.forEach(h => { if (!h.dead) { h.hp = Math.min(h.maxHp, h.hp + Math.ceil(h.maxHp * 0.3)); LOGIC.addStress(h, -10, []); } });
      this.say(["Un autel intact : l'équipe prie et reprend des forces (+30 % PV, stress −10)."]);
    }
    this.afterRoom();
  }
  afterRoom() {
    this.saveHeroes(); this.drawMap(); this.refreshUnits(); this.ui.removeAll(true);
    this.ui.add(this.add.rectangle(0, 560, W, 160, 0x000000, 0.6).setOrigin(0));
    this.ui.add(button(this, W / 2 - 220, 600, 200, 60, 'Avancer', () => this.nextRoom(), 22));
    this.ui.add(button(this, W / 2 + 20, 600, 200, 60, 'Retraite', () => this.leave('Retraite vers le hameau.'), 22));
  }
  leave(msg, won) {
    this.saveHeroes(); LOGIC.returnHome(SAVE); persist();
    this.ui.removeAll(true);
    this.ui.add(this.add.rectangle(0, 0, W, H, 0x000000, 0.7).setOrigin(0).setInteractive());
    this.ui.add(txt(this, W / 2, 280, msg, won ? 34 : 28, won ? '#ffd860' : '#ff8a7a', { align: 'center', wrap: 1000 }).setOrigin(0.5));
    this.ui.add(button(this, W / 2 - 130, 400, 260, 60, 'Retour au hameau', () => this.scene.start('hameau'), 22));
  }
  // ----- combat -----
  startCombat(room) {
    this.combat = LOGIC.makeCombat(this.heroes, room.enemies);
    this.heroes.forEach(h => { h.st = { bleed: [], burn: [], stun: false, mark: 0, curse: 0, guard: null, buff: null }; });
    this.queue = []; this.refreshUnits();
    this.say([room.type === 'boss' ? `Le gardien des lieux se dresse : ${this.combat.enemies.find(e => e.boss).name} !` : 'Des créatures surgissent des ténèbres !']);
    this.buildCombatUi();
    this.time.delayedCall(900, () => this.nextTurn());
  }
  buildCombatUi() {
    this.ui.removeAll(true);
    this.ui.add(this.add.rectangle(0, 560, W, 160, 0x000000, 0.6).setOrigin(0));
    this.whoT = txt(this, 30, 575, '', 22); this.ui.add(this.whoT);
    this.descT = txt(this, 30, 680, '', 15, '#d8c8b8', { wrap: 1220 }); this.ui.add(this.descT);
    this.skillBtns = [0, 1, 2, 3].map(i => { const b = button(this, 250 + i * 205, 580, 195, 66, '', () => this.pickSkill(i), 16); this.ui.add(b); return b; });
    this.passBtn = button(this, 1075, 580, 170, 66, 'Passer', () => this.heroAct(null), 18); this.ui.add(this.passBtn);
    this.setInput(null);
  }
  setInput(hero) {
    this.active = hero; this.skill = null;
    this.views.forEach(v => { v.ring.setVisible(false); v.arrow.setVisible(false); });
    if (hero) this.views.get(hero.uid).arrow.setVisible(true);
    this.whoT.setText(hero ? `${hero.name}` : '');
    this.descT.setText(hero ? 'Choisis une compétence, puis une cible.' : '');
    this.skillBtns.forEach((b, i) => {
      const s = hero && hero.skills[i];
      b.setVisible(!!s); if (!s) return;
      b.label.setText(s.name); b.setSelected(false); b.setEnabled(LOGIC.canUse(this.combat, hero, s));
    });
    this.passBtn.setVisible(!!hero);
  }
  pickSkill(i) {
    const h = this.active; if (!h) return;
    const s = h.skills[i]; this.skill = s;
    this.skillBtns.forEach((b, j) => b.setSelected(j === i));
    const posTxt = a => a.join('-');
    this.descT.setText(`${s.desc}  [Depuis : ${posTxt(s.from)} · Cible ${s.side === 'ally' ? 'alliée' : 'ennemie'} : ${posTxt(s.to)}${s.aoe ? ' (toutes)' : ''}]`);
    const ts = LOGIC.targetsOf(this.combat, h, s);
    this.views.forEach((v, uid) => v.ring.setVisible(ts.some(t => t.uid === uid)));
  }
  clickUnit(u) {
    if (!this.active || !this.skill) return;
    if (!LOGIC.targetsOf(this.combat, this.active, this.skill).includes(u)) return;
    this.heroAct({ skill: this.skill, target: u });
  }
  heroAct(choice) {
    const h = this.active; if (!h) return;
    this.setInput(null);
    if (choice) this.act(h, choice); else { this.say([`${h.name} attend.`]); this.time.delayedCall(400, () => this.nextTurn()); }
  }
  act(u, c) {
    const r = LOGIC.useSkill(this.combat, u, c.skill, c.target);
    this.say(r.log); this.showFx(r.fx); this.refreshUnits();
    const v = this.views.get(u.uid);
    this.tweens.add({ targets: v.sprite, x: u.side === 'hero' ? 20 : -20, duration: 120, yoyo: true, onComplete: () => { v.sprite.x = 0; } });
    this.time.delayedCall(1000, () => this.nextTurn());
  }
  nextTurn() {
    const o = LOGIC.outcome(this.combat);
    if (o) return this.endCombat(o);
    if (!this.queue.length) this.queue = LOGIC.turnOrder(this.combat);
    const u = this.queue.shift();
    if (u.dead) return this.nextTurn();
    const t = LOGIC.startTurn(this.combat, u);
    if (t.log.length) this.say(t.log);
    this.showFx(t.fx); this.refreshUnits();
    if (t.skip) return this.time.delayedCall(t.log.length ? 800 : 0, () => this.nextTurn());
    if (u.side === 'hero') return this.setInput(u);
    this.views.get(u.uid).arrow.setVisible(true);
    this.time.delayedCall(600, () => {
      this.views.get(u.uid).arrow.setVisible(false);
      const c = LOGIC.enemyChoice(this.combat, u);
      if (c) this.act(u, c); else { this.say([`${u.name} rôde.`]); this.time.delayedCall(500, () => this.nextTurn()); }
    });
  }
  endCombat(o) {
    this.setInput(null);
    const boss = this.rooms[this.roomIdx].type === 'boss';
    this.combat.enemies.forEach(e => { const v = this.views.get(e.uid); if (v) v.destroy(); this.views.delete(e.uid); });
    this.combat = null;
    this.heroes.forEach(h => { h.st.guard = null; });
    if (o === 'defaite') return this.leave("L'équipe est tombée.\nLes survivants sont ramenés au hameau.");
    const gold = Math.round((boss ? 120 : 15 + Math.random() * 20) * this.dg.gold);
    SAVE.gold += gold;
    if (boss) {
      if (!SAVE.cleared.includes(this.dg.id)) SAVE.cleared.push(this.dg.id);
      return this.leave(`Victoire ! ${this.dg.name} est purifié.\n+${gold} or`, true);
    }
    this.say([`Victoire ! +${gold} or.`]);
    this.afterRoom();
  }
}

window.JEU = new Phaser.Game({
  type: Phaser.AUTO, parent: 'jeu', width: W, height: H, backgroundColor: '#070303',
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  scene: [Boot, Titre, Hameau, Donjon],
});
