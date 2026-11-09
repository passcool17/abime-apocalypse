// Expédition : couloirs à défilement latéral, salles, carte, lumière, objets, curiosités, camp.
const TW = 420; // largeur d'une case de couloir
const ROOM_LABEL = { entree: 'Entrée', combat: 'Salle hantée', tresor: 'Salle au trésor', vide: 'Salle silencieuse', boss: 'Antre du gardien' };
const MAP_CHAR = { entree: 'E', combat: 'C', tresor: 'T', vide: '·', boss: 'B' };

class Expedition extends Phaser.Scene {
  constructor() { super('expedition'); }
  init(d) {
    this.exp = EXPLORE.newExpedition(d.dg, SAVE, d.items);
    this.views = new Map(); this.combat = null; this.mode = 'salle'; this.logLines = []; this.hold = 0; this.busy = false; this.cor = null; this.ended = false; this.near = -1;
  }
  create() {
    const X = EXPLORE, exp = this.exp;
    backdrop(this, [0x3a0606, 0x4a2a06, 0x2a0640][exp.dgIdx]);
    this.world = this.add.container(0, 0).setDepth(1);
    this.darkness = this.add.rectangle(0, 90, W, 470, 0x000000, 0).setOrigin(0).setDepth(20);
    this.add.rectangle(0, 0, W, 90, 0x000000, 0.55).setOrigin(0).setDepth(39);
    this.add.rectangle(0, 560, W, 160, 0x000000, 0.65).setOrigin(0).setDepth(39);
    txt(this, 20, 10, exp.dg.name, 24).setDepth(40);
    this.questT = txt(this, 20, 44, '', 14, '#c8b8a8').setDepth(40);
    this.campT = txt(this, 20, 64, '', 13, '#c8b8a8').setDepth(40);
    this.add.rectangle(470, 20, 300, 16, 0x201008).setOrigin(0).setStrokeStyle(1, OR).setDepth(40);
    this.lightBar = this.add.rectangle(470, 20, 300, 16, 0xffc040).setOrigin(0).setDepth(40);
    this.lightT = txt(this, 620, 40, '', 15, '#ffe0a0').setOrigin(0.5, 0).setDepth(40);
    this.goldT = txt(this, 830, 14, '', 18, '#ffd860').setDepth(40);
    this.foodT = txt(this, 830, 40, '', 14, '#c8b8a8').setDepth(40);
    this.mapBtn = button(this, 1120, 22, 140, 46, 'Carte (M)', () => this.showMap(!this.mapC.visible), 17).setDepth(40);
    this.logT = txt(this, W / 2, 96, '', 15, '#e8d8c8', { align: 'center', wrap: 1100 }).setOrigin(0.5, 0).setDepth(40);
    this.bottom = this.add.container(0, 0).setDepth(41);
    this.mapC = this.add.container(0, 0).setDepth(50).setVisible(false);
    this.keys = this.input.keyboard.addKeys('A,D,LEFT,RIGHT');
    this.input.keyboard.on('keydown-M', () => { if (this.mode !== 'combat' && !this.busy) this.showMap(!this.mapC.visible); });
    this.say([`L'équipe descend dans ${exp.dg.name}. ${X.questText(exp)}.`]);
    this.refreshUnits();
    this.arriveRoom(0);
  }

  // ----- outils -----
  say(lines) { if (!lines || !lines.length) return; this.logLines = this.logLines.concat(lines).slice(-3); this.logT.setText(this.logLines.join('\n')); }
  bot(o) { this.bottom.add(o); return o; }
  clearBottom() { this.bottom.removeAll(true); }
  refreshHeader() {
    const exp = this.exp, lf = LOGIC.lightFx(exp.light);
    this.questT.setText(EXPLORE.questText(exp) + (exp.questDone ? ' — ACCOMPLIE' : ''));
    this.campT.setText(exp.dg.camps ? `Camps restants : ${exp.campsLeft}` : 'Pas de camp dans ce donjon');
    this.lightBar.width = 3 * exp.light;
    this.lightBar.setFillStyle(exp.light >= 51 ? 0xffc040 : exp.light >= 26 ? 0xc07020 : 0x802010);
    this.lightT.setText(`Lumière ${exp.light} — ${lf.label}`);
    this.goldT.setText(`Butin : ${exp.gold} or`);
    this.foodT.setText(`Rations ${exp.items.ration} · Torches ${exp.items.torche}`);
    this.darkness.setAlpha(0.62 * (1 - exp.light / 100));
  }
  afterEvent(log) {
    this.say(log); LOGIC.renumber(this.exp.heroes); this.refreshUnits(); this.refreshHeader();
    if (!EXPLORE.party(this.exp).length) { this.finishExp('defaite'); return false; }
    return true;
  }
  update(time, delta) {
    if (this.mode !== 'couloir' || this.busy) return;
    const k = this.keys, dir = (k.D.isDown || k.RIGHT.isDown || this.hold > 0) ? 1 : (k.A.isDown || k.LEFT.isDown || this.hold < 0) ? -1 : 0;
    LOGIC.line(this.exp.heroes).forEach((h, i) => { const v = this.views.get(h.uid); if (v) v.sprite.y = dir ? -Math.abs(Math.sin(time / 130 + i)) * 7 : 0; });
    if (!dir) return;
    const cor = this.cor, len = (cor.tiles.length + 1) * TW;
    let nx = this.px + dir * 0.3 * delta;
    cor.tiles.forEach((t, i) => {
      if (t.type !== 'eboulement' || t.done) return;
      const cx = (i + 1) * TW;
      if (dir > 0 && this.px <= cx - 90 && nx > cx - 90) nx = cx - 90;
      if (dir < 0 && this.px >= cx + 90 && nx < cx + 90) nx = cx + 90;
    });
    this.px = nx; this.world.x = 600 - this.px;
    if (this.px >= len - 140) return this.arriveRoom(cor.to);
    if (this.px <= 140) return this.arriveRoom(cor.from);
    const near = cor.tiles.findIndex((t, i) => Math.abs(this.px - (i + 1) * TW) < 110);
    if (near !== this.near) { this.near = near; if (near >= 0) this.reachTile(cor.tiles[near]); else this.exploreBottom(); }
  }

  // ----- couloir -----
  travel(edge, room) {
    const from = this.exp.room;
    this.cor = { edge, from, to: room.id, tiles: from === edge.a ? edge.tiles : edge.tiles.slice().reverse() };
    this.mode = 'couloir'; this.px = 150; this.near = -1; this.hold = 0;
    this.showMap(false); this.drawCorridor(); this.exploreBottom();
    this.say(["L'équipe s'engage dans le couloir… (A/D, flèches ou boutons ◀ ▶)"]);
  }
  reachTile(t) {
    const X = EXPLORE, exp = this.exp;
    const step = X.stepTile(exp, t);
    if (!this.afterEvent(step.log)) return;
    const next = () => this.tileEvent(t);
    if (step.hunger) {
      const need = X.party(exp).length, enough = exp.items.ration >= need;
      this.busy = true;
      modal(this, 'Contrôle de faim', enough ? `L'équipe a faim. Manger ${need} rations ?` : `L'équipe a faim mais il ne reste que ${exp.items.ration} ration(s) pour ${need} héros.\nPV −15 % et stress +15 pour chacun.`,
        [{ label: enough ? 'Manger' : 'Endurer la faim', fn: () => { this.busy = false; if (this.afterEvent(X.hungerCheck(exp))) next(); } }]);
      return;
    }
    next();
  }
  tileEvent(t) {
    const X = EXPLORE, exp = this.exp;
    if (t.done) return this.exploreBottom();
    if (t.type === 'vide') { t.done = true; return this.exploreBottom(); }
    if (t.type === 'piege') { t.done = true; const r = X.trap(exp, t); if (!r.ok) this.cameras.main.shake(200, 0.01); if (this.afterEvent(r.log)) { this.drawCorridor(); this.exploreBottom(); } return; }
    if (t.type === 'combat') {
      return this.startCombat(t.enemies, X.encounterOpts(exp), () => { t.done = true; this.mode = 'couloir'; this.drawCorridor(); this.exploreBottom(); this.refreshHeader(); });
    }
    this.exploreBottom(); // curiosité / éboulement : actions proposées en bas
  }
  drawCorridor() {
    const cor = this.cor, len = (cor.tiles.length + 1) * TW, g = this.add.graphics();
    this.world.removeAll(true); this.world.add(g);
    g.fillStyle(0x1a1010).fillRect(-700, 120, len + 1400, 330);
    g.lineStyle(1, 0x2e2020);
    for (let y = 130; y < 450; y += 40) for (let x = -700 + ((y / 40) % 2) * 40; x < len + 700; x += 80) g.strokeRect(x, y, 80, 40);
    g.fillStyle(0x0c0808).fillRect(-700, 450, len + 1400, 110);
    g.lineStyle(3, 0x3a2a20).lineBetween(-700, 450, len + 700, 450);
    for (let x = -600; x < len + 700; x += 300) { g.fillStyle(0x3a2a1a).fillRect(x - 4, 230, 8, 30); if (this.exp.light > 0) { g.fillStyle(0xff8020, 0.4 + this.exp.light / 250).fillCircle(x, 222, 9); g.fillStyle(0xffe080, 0.6).fillCircle(x, 224, 4); } }
    [0, len].forEach(x => { g.fillStyle(0x050303).fillRect(x - 70, 250, 140, 200); g.fillEllipse(x, 250, 140, 90); g.lineStyle(4, OR, 0.6).strokeRect(x - 70, 250, 140, 200); });
    cor.tiles.forEach((t, i) => {
      const cx = (i + 1) * TW;
      const show = (key, label, scale = 1.1) => { this.world.add(this.add.image(cx, 452, key).setOrigin(0.5, 1).setScale(scale)); this.world.add(txt(this, cx, 452 - 120 * scale - 6, label, 15, OR_T, { align: 'center' }).setOrigin(0.5, 1)); };
      if (t.done && t.type !== 'curio') return;
      if (t.type === 'curio' && !t.done) show('c_' + t.curio, DATA.CURIOS[t.curio].name);
      if (t.type === 'eboulement') show('c_eboulement', 'Éboulement', 1.6);
      if (t.type === 'piege' && t.scouted) show('c_piege', 'Piège repéré', 0.7);
      if (t.type === 'combat' && t.scouted) this.world.add(txt(this, cx, 400, 'Ennemis repérés', 16, '#ff6050').setOrigin(0.5));
    });
    this.world.x = 600 - this.px;
    this.refreshHeader();
  }
  exploreBottom() {
    this.clearBottom();
    const exp = this.exp;
    if (this.mode === 'couloir') {
      const t = this.near >= 0 ? this.cor.tiles[this.near] : null;
      if (t && !t.done && t.type === 'curio') this.curioButtons(t.curio, (log) => { t.done = true; this.drawCorridor(); this.afterEvent(log) && this.exploreBottom(); }, () => { t.done = true; this.drawCorridor(); this.exploreBottom(); });
      else if (t && !t.done && t.type === 'eboulement') {
        this.bot(txt(this, 20, 582, 'Un éboulement bloque le passage.', 16, '#e8d8c8'));
        this.bot(button(this, 300, 568, 230, 52, `Dégager (pelle ×${exp.items.pelle})`, () => this.clearRubble(t, true), 15)).setEnabled(exp.items.pelle > 0);
        this.bot(button(this, 540, 568, 230, 52, 'À mains nues', () => this.clearRubble(t, false), 15));
      } else this.bot(txt(this, 20, 582, 'Avance vers la prochaine salle (droite) ou reviens sur tes pas (gauche).', 15, '#c8b8a8'));
      const hold = (x, label, d) => {
        const b = this.bot(button(this, x, 568, 115, 140, label, () => {}, 40));
        b.bg.on('pointerdown', () => { this.hold = d; }).on('pointerup', () => { this.hold = 0; }).on('pointerout', () => { this.hold = 0; });
      };
      hold(1020, '◀', -1); hold(1145, '▶', 1);
    } else {
      const room = exp.map.rooms[exp.room];
      let x = 20;
      const add = (label, fn, w = 200) => { const b = this.bot(button(this, x, 568, w, 52, label, fn, 15)); x += w + 10; return b; };
      if (room.curio && !room.curioDone) { this.curioButtons(room.curio, (log) => { room.curioDone = true; this.drawRoom(room); if (this.afterEvent(log)) { this.exploreBottom(); this.showMap(true); } }, null); x = 700; }
      if (exp.dg.camps && room.cleared && !room.camped) add(`Camper (${exp.campsLeft})`, () => this.camp(room), 170).setEnabled(exp.campsLeft > 0);
      if (exp.questDone) add('Rentrer au hameau', () => this.finishExp('fin'), 200);
      else add('Retraite', () => { this.busy = true; modal(this, 'Retraite ?', "Quitter le donjon sans accomplir la quête ?\nStress +20 pour chaque héros. Le butin est conservé.", [{ label: 'Retraite', fn: () => { this.busy = false; this.finishExp('retraite'); } }, { label: 'Rester', fn: () => { this.busy = false; } }]); }, 150);
      if (x < 700) this.bot(txt(this, x + 10, 582, 'Choisis une salle voisine sur la carte.', 15, '#c8b8a8'));
    }
    this.itemButtons();
  }
  clearRubble(t, pelle) { t.done = true; const log = EXPLORE.obstacle(this.exp, pelle); this.drawCorridor(); if (this.afterEvent(log)) this.exploreBottom(); }
  curioButtons(id, done, ignore) {
    const c = DATA.CURIOS[id], exp = this.exp;
    this.bot(txt(this, 20, 570, `${c.name}`, 17, OR_T));
    this.bot(txt(this, 20, 594, c.desc, 12, '#c8b8a8', { wrap: 200 }));
    let x = 230;
    const add = (label, fn, w = 150) => { this.bot(button(this, x, 568, w, 52, label, fn, 14)); x += w + 8; };
    add('Examiner', () => done(EXPLORE.curio(exp, id, null)));
    Object.keys(c.items).filter(i => exp.items[i] > 0).forEach(i => add(`Utiliser : ${DATA.ITEMS[i].name}`, () => done(EXPLORE.curio(exp, id, i)), 170));
    if (ignore) add('Ignorer', ignore, 110);
  }
  itemButtons() {
    const exp = this.exp;
    ITEM_ORDER.forEach((k, i) => {
      const b = this.bot(button(this, 20 + i * 165, 640, 158, 56, `${DATA.ITEMS[k].name} ×${exp.items[k]}`, () => {
        const log = EXPLORE.useItem(exp, k); if (this.afterEvent(log)) { if (this.mode === 'couloir') this.drawCorridor(); this.exploreBottom(); }
      }, 15));
      b.setEnabled(exp.items[k] > 0 && ['ration', 'torche', 'bandage', 'eau'].includes(k));
    });
    this.refreshHeader();
  }

  // ----- salles -----
  arriveRoom(id) {
    const X = EXPLORE, exp = this.exp;
    this.mode = 'salle'; this.cor = null; this.hold = 0;
    const room = exp.map.rooms[id];
    const log = X.enterRoom(exp, id);
    LOGIC.syncSave(SAVE, exp.heroes); persist();
    this.drawRoom(room); this.say([`${ROOM_LABEL[room.type]}.`].concat(log));
    LOGIC.line(exp.heroes).forEach(h => { const v = this.views.get(h.uid); if (v) v.sprite.y = 0; });
    if (room.enemies && !room.cleared) {
      return this.startCombat(room.enemies, room.type === 'boss' ? { light: exp.light } : X.encounterOpts(exp), () => {
        room.cleared = true;
        if (room.type === 'boss') { exp.bossDead = true; const l = []; X.checkQuest(exp, l); this.say(l); }
        this.roomIdle(room);
      });
    }
    this.roomIdle(room);
  }
  roomIdle(room) { this.mode = 'salle'; this.drawRoom(room); this.exploreBottom(); this.showMap(!(room.curio && !room.curioDone)); }
  drawRoom(room) {
    const g = this.add.graphics();
    this.world.removeAll(true); this.world.add(g); this.world.x = 0;
    g.fillStyle(0x1c1010).fillRect(0, 110, W, 340);
    for (let i = 0; i < 5; i++) { const x = 130 + i * 255; g.fillStyle(0x0c0606).fillRect(x - 50, 170, 100, 280); g.fillEllipse(x, 170, 100, 80); g.lineStyle(3, OR, 0.35).strokeRect(x - 50, 170, 100, 280); }
    g.fillStyle(0x0c0808).fillRect(0, 450, W, 110); g.lineStyle(3, 0x3a2a20).lineBetween(0, 450, W, 450);
    if (room.curio && !room.curioDone) { this.world.add(this.add.image(900, 452, 'c_' + room.curio).setOrigin(0.5, 1).setScale(1.2)); this.world.add(txt(this, 900, 300, DATA.CURIOS[room.curio].name, 16).setOrigin(0.5, 1)); }
    if (room.camped) { g.fillStyle(0xff7020, 0.8).fillTriangle(840, 450, 880, 450, 860, 400); g.fillStyle(0xffd040).fillTriangle(850, 450, 870, 450, 860, 420); }
    this.refreshHeader();
  }

  // ----- carte -----
  showMap(on) {
    if (on && this.mode === 'combat') return;
    this.mapC.removeAll(true).setVisible(on);
    if (!on) return;
    const exp = this.exp, map = exp.map, c = this.mapC;
    c.add(this.add.rectangle(690, 98, 580, 456, 0x080404, 0.94).setOrigin(0).setStrokeStyle(2, OR));
    c.add(txt(this, 705, 104, this.mode === 'salle' ? 'Carte — touche une salle voisine (contour doré)' : 'Carte', 16));
    c.add(button(this, 1215, 104, 44, 34, 'X', () => this.showMap(false), 16));
    const cell = Math.min(540 / map.cols, 360 / map.rows), ox = 700 + (560 - map.cols * cell) / 2 + cell / 2, oy = 145 + (370 - map.rows * cell) / 2 + cell / 2;
    const P = r => [ox + r.x * cell, oy + r.y * cell];
    const known = r => r.visited || r.scouted || r.seen;
    const g = this.add.graphics(); c.add(g);
    map.edges.forEach(e => {
      const a = map.rooms[e.a], b = map.rooms[e.b];
      if (!(a.visited || b.visited) && !(a.scouted && b.scouted)) return;
      const [x1, y1] = P(a), [x2, y2] = P(b);
      g.lineStyle(4, 0x5a4030).lineBetween(x1, y1, x2, y2);
      e.tiles.forEach((t, i) => {
        const f = (i + 1) / (e.tiles.length + 1), x = x1 + (x2 - x1) * f, y = y1 + (y2 - y1) * f;
        let col = t.walked ? 0x6a5a4a : 0x2a2020;
        if ((t.scouted || t.walked) && !t.done) col = { curio: 0xd4a640, piege: 0xc03030, combat: 0xff2020, eboulement: 0x8a8a8a, vide: col }[t.type];
        g.fillStyle(col).fillRect(x - 6, y - 6, 12, 12);
      });
    });
    if (this.mode === 'couloir' && this.cor) {
      const a = map.rooms[this.cor.from], b = map.rooms[this.cor.to], f = this.px / ((this.cor.tiles.length + 1) * TW);
      const [x1, y1] = P(a), [x2, y2] = P(b); g.fillStyle(0x60ff80).fillCircle(x1 + (x2 - x1) * f, y1 + (y2 - y1) * f, 8);
    }
    const adj = this.mode === 'salle' ? EXPLORE.neighbors(map, exp.room) : [];
    map.rooms.forEach(r => {
      if (!known(r)) return;
      const [x, y] = P(r), cur = r.id === exp.room && this.mode === 'salle', info = r.visited || r.scouted;
      const fill = cur ? 0xffd860 : r.visited ? 0x5a4020 : info && r.type === 'boss' ? ROUGE : 0x2a1010;
      const sq = this.add.rectangle(x, y, 38, 38, fill).setStrokeStyle(2, OR); c.add(sq);
      const ch = info ? MAP_CHAR[r.type] + (r.type === 'combat' && r.cleared ? '✓' : '') : '?';
      c.add(txt(this, x, y, ch, 17, cur ? '#200000' : '#ffffff', { stroke: cur ? 0 : 2 }).setOrigin(0.5));
      const n = adj.find(a => a.room === r);
      if (n) {
        sq.setStrokeStyle(4, 0xffe08a).setInteractive({ useHandCursor: true }).on('pointerdown', () => this.travel(n.edge, r));
        this.tweens.add({ targets: sq, alpha: 0.6, yoyo: true, repeat: -1, duration: 600 });
      }
    });
    c.add(txt(this, 705, 528, 'E entrée · C combat · T trésor · B boss · ? inconnue — cases : or curiosité, rouge piège/ennemis, gris éboulement', 11, '#c8b8a8', { wrap: 560 }));
  }

  // ----- camp -----
  camp(room) {
    const X = EXPLORE, exp = this.exp;
    X.startCamp(exp); room.camped = true; this.busy = true; this.showMap(false);
    const c = this.add.container(0, 0).setDepth(55); this.campC = c;
    const redraw = (log) => {
      c.removeAll(true);
      c.add(this.add.rectangle(0, 0, W, H, 0x050202, 0.94).setOrigin(0).setInteractive());
      const g = this.add.graphics(); c.add(g);
      g.fillStyle(0xff6010, 0.25).fillCircle(W / 2, 110, 70); g.fillStyle(0xff7020).fillTriangle(W / 2 - 30, 140, W / 2 + 30, 140, W / 2, 60); g.fillStyle(0xffd040).fillTriangle(W / 2 - 14, 140, W / 2 + 14, 140, W / 2, 95);
      c.add(txt(this, 40, 20, 'Feu de camp', 34));
      c.add(txt(this, 40, 66, `Points de répit : ${exp.camp ? exp.camp.respite : 0} / ${X.RESPITE}`, 20, '#ffd860'));
      c.add(txt(this, W / 2, 160, (log || []).slice(-4).join('\n'), 15, '#e8d8c8', { align: 'center', wrap: 1100 }).setOrigin(0.5, 0));
      if (!exp.camp.meal) {
        const need = X.party(exp).length;
        c.add(button(this, W / 2 - 260, 300, 250, 60, `Repas (${need} rations)`, () => { exp.camp.meal = true; redraw(X.campMeal(exp)); this.refreshUnits(); }, 18).setEnabled(exp.items.ration >= need));
        c.add(button(this, W / 2 + 10, 300, 250, 60, 'Pas de repas', () => { exp.camp.meal = true; redraw(X.campMeal(exp)); this.refreshUnits(); }, 18).setEnabled(exp.items.ration < need));
        return;
      }
      X.party(exp).forEach((h, i) => {
        const x = 30 + i * 310, s = h.steadfast ? 'Inébranlable' : `stress ${h.stress}`;
        c.add(this.add.image(x + 40, 330, 'h_' + h.id).setOrigin(0.5, 1).setScale(0.3));
        c.add(txt(this, x + 85, 250, `${h.name}\nPV ${h.hp}/${h.maxHp} · ${s}`, 15, OR_T));
        DATA.HEROES[h.id].camp.forEach((sk, j) => {
          const used = exp.camp.used[h.id + sk.id];
          const b = button(this, x, 345 + j * 82, 290, 46, `${sk.name} (${sk.cost})${used ? ' ✓' : ''}`, () => { redraw(X.campSkill(exp, h, sk)); this.refreshUnits(); }, 15);
          b.setEnabled(!used && exp.camp.respite >= sk.cost); c.add(b);
          c.add(txt(this, x + 4, 393 + j * 82, sk.desc, 12, '#c8b8a8', { wrap: 285, stroke: 2 }));
        });
      });
      c.add(button(this, W / 2 - 130, 640, 260, 60, 'Lever le camp', () => {
        const ambush = X.endCamp(exp); c.destroy(); this.busy = false; this.refreshUnits(); this.refreshHeader();
        if (ambush) return this.startCombat(LOGIC.pick(exp.dg.pool), { light: exp.light, surprise: 'party' }, () => this.roomIdle(room));
        this.say(["L'équipe lève le camp, reposée."]); this.roomIdle(room);
      }, 20));
    };
    redraw(['Les héros allument un feu.']);
  }

  // ----- fin -----
  finishExp(how) {
    if (this.ended) return; this.ended = true;
    const log = EXPLORE.finish(this.exp, SAVE, how); persist();
    this.busy = true; this.mode = 'fin'; this.showMap(false);
    const title = { fin: 'Retour triomphal', retraite: 'Retraite', defaite: "L'équipe est tombée" }[how];
    modal(this, title, [`Butin rapporté : ${this.exp.gold} or.`].concat(log).join('\n'), [{ label: 'Retour au hameau', fn: () => this.scene.start('hameau') }]);
  }
}
Object.assign(Expedition.prototype, CombatMixin);
