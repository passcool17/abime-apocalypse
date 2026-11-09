// Hameau (bâtiments : Infirmerie, Abbaye, Taverne, Sanatorium, Forge) et Fournisseur (provisions)
const BUILDINGS = ['Infirmerie', 'Abbaye', 'Taverne', 'Sanatorium', 'Forge'];
const BUILD_DESC = {
  Infirmerie: 'Soigne les PV : 1 or par PV manquant.',
  Abbaye: 'Prière : stress −50 pour 30 or. Fin de l\'affliction si le stress tombe à 0.',
  Taverne: 'Festin : stress −100 pour 55 or… mais 25 % de risque (bizarrerie Ivrogne ou 20 or perdus au jeu).',
  Sanatorium: 'Traite une maladie (40 or) ou une bizarrerie négative (60 or).',
  Forge: 'Forge sacrée : niveau +1 (PV max +3, dégâts +10 %), 50 or × niveau, max 5.',
};

class Hameau extends Phaser.Scene {
  constructor() { super('hameau'); this.tab = 'Infirmerie'; }
  create() { LOGIC.returnHome(SAVE); persist(); this.msgText = ''; this.draw(); }
  draw() {
    this.children.removeAll(true);
    backdrop(this, 0x3a2006);
    txt(this, 30, 18, 'Le Hameau', 38);
    txt(this, 860, 26, `Or : ${SAVE.gold}`, 28, '#ffd860');
    BUILDINGS.forEach((b, i) => button(this, 30 + i * 158, 72, 150, 40, b, () => { this.tab = b; this.msgText = ''; this.draw(); }, 17).setSelected(b === this.tab));
    txt(this, 30, 118, BUILD_DESC[this.tab], 15, '#c8b8a8', { wrap: 790 });
    const pay = (cost, fn) => {
      if (SAVE.gold < cost) { this.msgText = "Pas assez d'or."; this.draw(); return; }
      SAVE.gold -= cost; this.msgText = fn() || ''; persist(); this.draw();
    };
    DATA.HERO_ORDER.forEach((id, i) => this.heroCard(id, 30 + i * 200, 145, pay));
    txt(this, 860, 80, 'Expéditions', 26);
    DATA.DUNGEONS.forEach((dg, i) => {
      const open = i === 0 || SAVE.cleared.includes(DATA.DUNGEONS[i - 1].id), done = SAVE.cleared.includes(dg.id);
      const bt = button(this, 850, 120 + i * 112, 400, 100, '', () => this.scene.start('provisions', { dg: i }));
      bt.label.setText(`${dg.name}${done ? '  ✓' : ''}\n${open ? dg.desc : 'Verrouillé : accomplis la quête précédente.'}`).setFontSize(16);
      bt.setEnabled(open && Object.values(SAVE.heroes).some(h => !h.lost));
    });
    button(this, 850, 470, 400, 42, `Mort permanente : ${SAVE.permadeath ? 'OUI' : 'non'}`, () => { SAVE.permadeath = !SAVE.permadeath; persist(); this.draw(); }, 16);
    txt(this, 850, 518, SAVE.permadeath ? 'Un héros tombé est perdu pour de bon.' : 'Un héros tombé revient au hameau avec 1 PV.', 14, '#b89a7a');
    if (!Object.values(SAVE.heroes).some(h => !h.lost)) txt(this, 850, 545, 'Tous les héros sont perdus : recommence via le Menu.', 14, '#ff6060');
    txt(this, 850, 580, this.msgText, 16, '#ffd860', { wrap: 400 });
    button(this, 1110, 650, 140, 44, 'Menu', () => this.scene.start('titre'), 17);
  }
  heroCard(id, x, y, pay) {
    const s = SAVE.heroes[id], b = DATA.HEROES[id], max = LOGIC.heroMaxHp(id, s.lvl);
    this.add.rectangle(x, y, 190, 560, SOMBRE).setOrigin(0).setStrokeStyle(2, OR, 0.7);
    const img = this.add.image(x + 95, y + 6, 'h_' + id).setOrigin(0.5, 0).setScale(0.55);
    if (s.lost) { img.setTint(0x444444); txt(this, x + 95, y + 90, 'PERDU', 30, '#ff4040').setOrigin(0.5); }
    txt(this, x + 95, y + 190, `${b.name} (niv. ${s.lvl})`, 18).setOrigin(0.5, 0);
    txt(this, x + 10, y + 214, `PV ${s.hp}/${max}`, 15, '#ff8a7a');
    txt(this, x + 10, y + 232, b.steadfast ? 'Stress : Inébranlable' : `Stress ${s.stress}/200`, 15, '#c8a0ff');
    let ty = y + 252;
    const line = (t, c) => { const o = txt(this, x + 10, ty, t, 13, c, { wrap: 172, stroke: 2 }); ty += o.height + 1; };
    if (s.affliction) line(`Affliction : ${DATA.AFFLICTIONS[s.affliction].name}`, '#ff5050');
    s.quirks.forEach(q => line(`${DATA.QUIRKS[q].good ? '+' : '−'} ${DATA.QUIRKS[q].name}`, DATA.QUIRKS[q].good ? '#90e090' : '#ff9a7a'));
    s.diseases.forEach(d => line(`Maladie : ${DATA.DISEASES[d].name}`, '#d080ff'));
    if (s.lost) return;
    const by = y + 420, bt = (i, label, enabled, fn) => button(this, x + 8, by + i * 46, 174, 42, label, fn, 14).setEnabled(enabled);
    const name = b.name;
    switch (this.tab) {
      case 'Infirmerie': { const c = max - s.hp; bt(0, c ? `Soigner (${c} or)` : 'PV au max', c > 0, () => pay(c, () => { s.hp = max; return `${name} est soigné.`; })); break; }
      case 'Abbaye': bt(0, b.steadfast ? 'Inébranlable' : 'Prière (30 or)', !b.steadfast && s.stress > 0, () => pay(30, () => { s.stress = Math.max(0, s.stress - 50); if (!s.stress) s.affliction = null; return `${name} prie à l'abbaye.`; })); break;
      case 'Taverne': bt(0, b.steadfast ? 'Inébranlable' : 'Festin (55 or)', !b.steadfast && s.stress > 0, () => pay(55, () => {
        s.stress = Math.max(0, s.stress - 100); if (!s.stress) s.affliction = null;
        const r = Math.random();
        if (r < 0.12 && !s.quirks.includes('ivrogne')) { s.quirks.push('ivrogne'); return `${name} a trop bu : bizarrerie Ivrogne !`; }
        if (r < 0.25) { SAVE.gold = Math.max(0, SAVE.gold - 20); return `${name} a perdu 20 or aux dés…`; }
        return `${name} se détend à la taverne.`;
      })); break;
      case 'Sanatorium': {
        const items = s.diseases.map(d => ({ label: `Guérir ${DATA.DISEASES[d].name} (40)`, cost: 40, fn: () => { s.diseases.splice(s.diseases.indexOf(d), 1); return `${name} est guéri.`; } }))
          .concat(s.quirks.filter(q => !DATA.QUIRKS[q].good).map(q => ({ label: `Traiter ${DATA.QUIRKS[q].name} (60)`, cost: 60, fn: () => { s.quirks.splice(s.quirks.indexOf(q), 1); return `${name} : ${DATA.QUIRKS[q].name} retiré.`; } })));
        if (!items.length) bt(0, 'Rien à traiter', false, () => {});
        items.slice(0, 3).forEach((it, i) => bt(i, it.label, true, () => pay(it.cost, it.fn)));
        break;
      }
      case 'Forge': { const c = 50 * s.lvl; bt(0, s.lvl < 5 ? `Niveau ${s.lvl + 1} (${c} or)` : 'Niveau max', s.lvl < 5, () => pay(c, () => { s.lvl++; s.hp += 3; return `${name} passe au niveau ${s.lvl}.`; })); break; }
    }
  }
}

const ITEM_ORDER = ['ration', 'torche', 'bandage', 'cle', 'eau', 'pelle'];
class Provisions extends Phaser.Scene {
  constructor() { super('provisions'); }
  init(d) { this.dgIdx = d.dg; this.dg = DATA.DUNGEONS[d.dg]; this.cart = this.advice(); }
  advice() { return { ration: this.dg.food, torche: this.dg.torches, bandage: 2, cle: 1, eau: 1, pelle: 1 }; }
  total() { return ITEM_ORDER.reduce((s, k) => s + this.cart[k] * DATA.ITEMS[k].price, 0); }
  create() { this.draw(); }
  draw() {
    this.children.removeAll(true);
    backdrop(this, 0x2a2006);
    txt(this, 30, 18, `Fournisseur — ${this.dg.name}`, 32);
    txt(this, 30, 62, `${this.dg.desc}  Conseillé : ${this.dg.food} rations, ${this.dg.torches} torches. Les provisions non utilisées sont perdues au retour.`, 15, '#c8b8a8', { wrap: 1200 });
    ITEM_ORDER.forEach((k, i) => {
      const it = DATA.ITEMS[k], y = 110 + i * 70;
      this.add.rectangle(30, y, 1000, 62, SOMBRE).setOrigin(0).setStrokeStyle(1, OR, 0.5);
      txt(this, 45, y + 8, `${it.name} — ${it.price} or`, 20);
      txt(this, 45, y + 36, it.desc, 13, '#c8b8a8', { wrap: 640 });
      button(this, 720, y + 9, 60, 44, '−', () => { this.cart[k] = Math.max(0, this.cart[k] - 1); this.draw(); }, 24);
      txt(this, 815, y + 31, String(this.cart[k]), 24, '#ffffff').setOrigin(0.5);
      button(this, 850, y + 9, 60, 44, '+', () => { this.cart[k]++; this.draw(); }, 24);
      button(this, 925, y + 9, 90, 44, '+5', () => { this.cart[k] += 5; this.draw(); }, 18);
    });
    const tot = this.total(), ok = tot <= SAVE.gold;
    txt(this, 1050, 110, `Or : ${SAVE.gold}`, 24, '#ffd860');
    txt(this, 1050, 145, `Total : ${tot}`, 24, ok ? '#e8d8c8' : '#ff5050');
    button(this, 1050, 200, 200, 46, 'Conseillé', () => { this.cart = this.advice(); this.draw(); }, 17);
    button(this, 1050, 256, 200, 46, 'Tout vider', () => { ITEM_ORDER.forEach(k => { this.cart[k] = 0; }); this.draw(); }, 17);
    button(this, 1050, 540, 200, 64, ok ? 'Partir !' : "Pas assez d'or", () => {
      SAVE.gold -= tot; persist();
      this.scene.start('expedition', { dg: this.dgIdx, items: Object.assign({}, this.cart) });
    }, 22).setEnabled(ok);
    button(this, 1050, 620, 200, 46, 'Retour au hameau', () => this.scene.start('hameau'), 16);
  }
}
