// Combat (mélangé dans la scène Expedition) : vues des unités, compétences, déplacements, tours.
const slotW = u => (DATA.ENEMIES[u.id] && DATA.ENEMIES[u.id].boss ? 245 : 135);
const STATUS = u => [u.deathsDoor && 'SEUIL DE LA MORT', u.affliction && DATA.AFFLICTIONS[u.affliction].name.toUpperCase(), u.virtue && DATA.VIRTUES[u.virtue].name.toUpperCase(),
  u.st.bleed.length && 'Saigne', u.st.burn.length && 'Brûle', u.st.stun && 'Étourdi', u.st.mark && 'Marqué', u.st.curse && 'Maudit', u.st.guard && 'Protégé', u.st.buff && 'Vision']
  .filter(Boolean).join(' · ');

const CombatMixin = {
  // ----- vues des unités -----
  unitX(u) {
    if (u.side === 'hero') return HERO_X(u.pos);
    let x = 665;
    for (const e of LOGIC.line(this.combat.enemies)) { if (e === u) return x + slotW(e) / 2; x += slotW(e); }
    return x + slotW(u) / 2;
  },
  unitList() { return LOGIC.line(this.exp.heroes).concat(this.combat ? LOGIC.line(this.combat.enemies) : []); },
  refreshUnits() {
    const list = this.unitList();
    for (const [uid, v] of this.views) if (!list.some(u => u.uid === uid)) { v.destroy(); this.views.delete(uid); }
    list.forEach(u => {
      const v = this.views.get(u.uid) || this.makeView(u), x = this.unitX(u);
      if (v.x !== x) this.tweens.add({ targets: v, x, duration: 300 });
      v.hpBar.width = 100 * Math.max(0, u.hp) / u.maxHp;
      v.hpT.setText(`${Math.max(0, u.hp)}/${u.maxHp}`);
      if (v.stBar) { v.stBar.width = u.steadfast ? 100 : u.stress / 2; if (!u.steadfast) v.stBar.setFillStyle(u.stress >= 100 ? 0xff3060 : 0x9a50ff); }
      v.stat.setText(STATUS(u));
      v.nameT.setText(u.name);
      if (u.side === 'hero') { if (u.deathsDoor) v.sprite.setTint(0xff7070); else v.sprite.clearTint(); }
      if (u.corpse && !v.isCorpse) { v.isCorpse = true; v.sprite.setTint(0x302828).setAlpha(0.75); this.tweens.add({ targets: v.sprite, scaleY: v.sprite.scaleY * 0.45, duration: 300 }); v.hpBar.setFillStyle(0x606060); }
      if (u.flash) { this.banner(`${u.name} : ${u.flash.text}`, u.flash.good); delete u.flash; }
    });
  },
  makeView(u) {
    const v = this.add.container(this.unitX(u), BASE_Y).setDepth(10);
    const boss = u.side === 'enemy' && u.boss;
    const ring = this.add.ellipse(0, 0, boss ? 200 : 120, 30).setStrokeStyle(3, 0xffe08a).setVisible(false);
    let sprite;
    if (u.side === 'hero') sprite = this.add.image(0, 0, 'h_' + u.id).setOrigin(0.5, 1).setScale(0.6);
    else if (SPRITES[u.id]) { const [bw, bh] = SPRITES[u.id]; sprite = this.add.image(0, 0, 's_' + u.id).setOrigin(0.5, 1); sprite.setScale(Math.min(bw / sprite.width, bh / sprite.height)); }
    else sprite = this.add.image(0, 0, 'e_' + u.id).setOrigin(0.5, 1).setScale(boss ? 1.1 : 0.85);
    const top = -sprite.displayHeight;
    const nameT = txt(this, 0, top - 8, u.name, 14, u.side === 'hero' ? OR_T : '#ff9a8a', { align: 'center', wrap: 140 }).setOrigin(0.5, 1);
    const arrow = this.add.triangle(0, top - 34 - (nameT.height - 18), -10, -14, 10, -14, 0, 0, 0xffe08a).setVisible(false);
    const hpBg = this.add.rectangle(-50, 12, 100, 14, 0x300000).setOrigin(0, 0.5);
    const hpBar = this.add.rectangle(-50, 12, 100, 14, 0xa01818).setOrigin(0, 0.5);
    const hpT = txt(this, 0, 12, '', 12, '#ffffff', { stroke: 2 }).setOrigin(0.5);
    v.add([ring, sprite, nameT, arrow, hpBg, hpBar, hpT]);
    if (u.side === 'hero') {
      v.add(this.add.rectangle(-50, 27, 100, 7, 0x1a0a2a).setOrigin(0, 0.5));
      v.stBar = this.add.rectangle(-50, 27, 0, 7, u.steadfast ? 0xffe08a : 0x9a50ff).setOrigin(0, 0.5); v.add(v.stBar);
    }
    const stat = txt(this, 0, 36, '', 12, '#ffcc66', { align: 'center', wrap: 125, stroke: 2 }).setOrigin(0.5, 0);
    v.add(stat);
    const zone = this.add.rectangle(0, top / 2, Math.max(120, sprite.displayWidth * 0.8), -top + 40, 0x000000, 0.001).setInteractive({ useHandCursor: true }).on('pointerdown', () => this.clickUnit(u));
    v.add(zone);
    Object.assign(v, { ring, sprite, arrow, hpBar, hpT, stat, nameT });
    this.views.set(u.uid, v);
    return v;
  },
  banner(text, good) {
    const t = txt(this, W / 2, 300, text, 40, good ? '#ffe08a' : '#ff4040', { stroke: 6, align: 'center' }).setOrigin(0.5).setDepth(52).setScale(0.6);
    this.tweens.add({ targets: t, scale: 1, duration: 300, ease: 'Back.Out' });
    this.tweens.add({ targets: t, alpha: 0, delay: 1800, duration: 500, onComplete: () => t.destroy() });
  },
  showFx(fx) {
    fx.forEach((f, i) => {
      const v = this.views.get(f.uid); if (!v) return;
      const style = { dmg: ['#ff5050', `-${f.amount}`], crit: ['#ffd040', `CRITIQUE -${f.amount}`], soin: ['#60ff80', `+${f.amount} PV`],
        stress: ['#c080ff', `+${f.amount} stress`], calme: ['#80c0ff', `-${f.amount} stress`], 'raté': ['#c0c0c0', 'Esquive'], bouge: ['#ffe08a', 'Déplacé !'],
        saignement: ['#ff3030', `-${f.amount} saignement`], 'brûlure': ['#ff8020', `-${f.amount} brûlure`] }[f.type];
      if (!style) return;
      const t = txt(this, v.x, BASE_Y - 200 - i * 4 + (['stress', 'calme', 'bouge'].includes(f.type) ? 26 : 0), style[1], 22, style[0], { stroke: 4 }).setOrigin(0.5).setDepth(30);
      this.tweens.add({ targets: t, y: t.y - 50, alpha: 0, duration: 1200, onComplete: () => t.destroy() });
      if (['dmg', 'crit', 'saignement', 'brûlure'].includes(f.type)) {
        v.sprite.setTintFill(f.type === 'crit' ? 0xffe08a : 0xffffff);
        this.time.delayedCall(90, () => { if (v.sprite.active) { v.sprite.clearTint(); if (v.isCorpse) v.sprite.setTint(0x302828); } });
        this.tweens.add({ targets: v.sprite, x: 8, duration: 50, yoyo: true, repeat: 2, onComplete: () => { v.sprite.x = 0; } });
      }
    });
  },
  // ----- déroulement -----
  startCombat(keys, opts, onWin) {
    this.mode = 'combat'; this.showMap(false); this.onWin = onWin;
    this.views.forEach(v => { v.sprite.y = 0; });
    this.world.list.slice(1).forEach(o => o.setVisible(false)); // décor du couloir/salle masqué pendant le combat
    this.combat = LOGIC.makeCombat(this.exp.heroes, keys, opts);
    this.queue = []; this.refreshUnits();
    const boss = this.combat.enemies.find(e => e.boss);
    const lines = [boss ? `Le gardien des lieux se dresse : ${boss.name} !` : 'Des créatures surgissent des ténèbres !'];
    if (opts.surprise === 'party') { lines.push("EMBUSCADE ! L'équipe est surprise et désorganisée."); this.banner('Embuscade !', false); }
    if (opts.surprise === 'enemies') { lines.push('Les ennemis sont pris par surprise : à vous de frapper !'); this.banner('Surprise !', true); }
    this.say(lines);
    this.buildCombatUi();
    this.time.delayedCall(1000, () => this.nextTurn());
  },
  buildCombatUi() {
    this.clearBottom();
    this.whoT = this.bot(txt(this, 20, 572, '', 20, OR_T, { wrap: 180 }));
    this.descT = this.bot(txt(this, 20, 676, '', 14, '#d8c8b8', { wrap: 1240 }));
    this.skillBtns = [0, 1, 2, 3, 4].map(i => this.bot(button(this, 205 + i * 156, 580, 150, 80, '', () => this.pickSkill(i), 15)));
    this.moveBtn = this.bot(button(this, 993, 580, 130, 80, 'Déplacer', () => this.pickMove(), 16));
    this.passBtn = this.bot(button(this, 1130, 580, 130, 80, 'Passer', () => this.heroAct(null), 17));
    this.setInput(null);
  },
  setInput(hero) {
    this.active = hero; this.skill = null; this.moving = false;
    this.views.forEach(v => { v.ring.setVisible(false); v.arrow.setVisible(false); });
    if (hero && this.views.get(hero.uid)) this.views.get(hero.uid).arrow.setVisible(true);
    this.whoT.setText(hero ? `${hero.name}\n(position ${hero.pos})` : '');
    this.descT.setText(hero ? 'Choisis une compétence puis une cible, ou Déplacer pour changer de place avec un voisin.' : '');
    this.skillBtns.forEach((b, i) => {
      const s = hero && hero.skills[i];
      b.setVisible(!!s); if (!s) return;
      b.label.setText(`${s.name}\n[${s.from.join('-')}]`); b.setSelected(false); b.setEnabled(LOGIC.canUse(this.combat, hero, s));
    });
    this.moveBtn.setVisible(!!hero).setEnabled(!!hero && LOGIC.swapTargets(this.combat, hero).length > 0); this.moveBtn.setSelected(false);
    this.passBtn.setVisible(!!hero);
  },
  ring(list) { this.views.forEach((v, uid) => v.ring.setVisible(list.some(t => t.uid === uid))); },
  pickSkill(i) {
    const h = this.active; if (!h) return;
    const s = h.skills[i]; this.skill = s; this.moving = false;
    this.skillBtns.forEach((b, j) => b.setSelected(j === i)); this.moveBtn.setSelected(false);
    const cible = s.side === 'self' ? 'soi-même' : `${s.side === 'ally' ? 'alliée' : 'ennemie'} ${s.to.join('-')}${s.aoe ? ' (toutes)' : ''}`;
    this.descT.setText(`${s.desc}  [Depuis : ${s.from.join('-')} · Cible ${cible}]`);
    this.ring(LOGIC.targetsOf(this.combat, h, s));
  },
  pickMove() {
    const h = this.active; if (!h) return;
    this.skill = null; this.moving = true;
    this.skillBtns.forEach(b => b.setSelected(false)); this.moveBtn.setSelected(true);
    this.descT.setText('Touche un allié voisin pour échanger vos places (utilise le tour).');
    this.ring(LOGIC.swapTargets(this.combat, h));
  },
  clickUnit(u) {
    const h = this.active; if (!h) return;
    if (this.moving) {
      if (!LOGIC.swapTargets(this.combat, h).includes(u)) return;
      this.setInput(null);
      const r = LOGIC.swap(this.combat, h, u); this.say(r.log); this.refreshUnits();
      this.time.delayedCall(500, () => this.nextTurn());
      return;
    }
    if (!this.skill || !LOGIC.targetsOf(this.combat, h, this.skill).includes(u)) return;
    this.heroAct({ skill: this.skill, target: u });
  },
  heroAct(choice) {
    const h = this.active; if (!h) return;
    this.setInput(null);
    if (choice) this.act(h, choice); else { this.say([`${h.name} attend.`]); this.time.delayedCall(400, () => this.nextTurn()); }
  },
  act(u, c) {
    const r = LOGIC.useSkill(this.combat, u, c.skill, c.target);
    this.say(r.log); this.showFx(r.fx); this.refreshUnits();
    const v = this.views.get(u.uid);
    if (v) this.tweens.add({ targets: v.sprite, x: u.side === 'hero' ? 20 : -20, duration: 120, yoyo: true, onComplete: () => { v.sprite.x = 0; } });
    this.time.delayedCall(1000, () => this.nextTurn());
  },
  nextTurn() {
    if (!this.combat) return;
    const o = LOGIC.outcome(this.combat);
    if (o) return this.finishCombat(o);
    if (!this.queue.length) this.queue = LOGIC.turnOrder(this.combat);
    const u = this.queue.shift();
    if (u.dead || u.corpse) return this.nextTurn();
    const t = LOGIC.startTurn(this.combat, u);
    if (t.log.length) this.say(t.log);
    this.showFx(t.fx); this.refreshUnits();
    if (t.skip) return this.time.delayedCall(t.acted ? 1100 : t.log.length ? 800 : 0, () => this.nextTurn());
    if (u.side === 'hero') return this.setInput(u);
    const v = this.views.get(u.uid); if (v) v.arrow.setVisible(true);
    this.time.delayedCall(600, () => {
      if (v) v.arrow.setVisible(false);
      const c = LOGIC.enemyChoice(this.combat, u);
      if (c && c.move) { this.say(LOGIC.enemyMove(this.combat, u, c.move).log); this.refreshUnits(); this.time.delayedCall(500, () => this.nextTurn()); }
      else if (c) this.act(u, c);
      else { this.say([`${u.name} rôde.`]); this.time.delayedCall(500, () => this.nextTurn()); }
    });
  },
  finishCombat(o) {
    this.setInput(null);
    const boss = this.combat.enemies.some(e => e.boss);
    this.combat.enemies.forEach(e => { const v = this.views.get(e.uid); if (v) v.destroy(); this.views.delete(e.uid); });
    this.combat = null;
    LOGIC.endCombat(this.exp.heroes);
    this.refreshUnits();
    if (o === 'defaite' || !EXPLORE.party(this.exp).length) return this.finishExp('defaite');
    if (o === 'fuite') this.say(["Les créatures s'enfuient dans les ténèbres."]);
    else { const g = EXPLORE.combatGold(this.exp, boss); this.exp.gold += g; this.say([`Victoire ! +${g} or (butin).`]); }
    const cb = this.onWin; this.onWin = null;
    cb && cb(o);
  },
};
