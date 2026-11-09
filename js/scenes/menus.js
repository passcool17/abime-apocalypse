// Chargement et écran-titre
class Boot extends Phaser.Scene {
  constructor() { super('boot'); }
  preload() {
    txt(this, W / 2, H / 2, 'Chargement…', 28).setOrigin(0.5);
    DATA.HERO_ORDER.forEach(id => { this.load.image('h_' + id, `assets/${id}.webp`); this.load.image('b_' + id, `assets/heros/${id}.webp`); });
    this.load.image('fond', 'assets/fond-heros.webp');
    Object.keys(SPRITES).forEach(k => this.load.image('s_' + k, `assets/ennemis/${k}.webp`));
  }
  create() {
    const tex = (key, w, h, draw) => { const g = this.make.graphics({ add: false }); draw(g); g.generateTexture(key, w, h); g.destroy(); };
    Object.keys(DATA.ENEMIES).forEach(k => tex('e_' + k, 160, 200, g => drawEnemy(g, k)));
    Object.keys(DATA.CURIOS).concat(['eboulement', 'piege']).forEach(k => tex('c_' + k, 120, 120, g => drawCurio(g, k)));
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
