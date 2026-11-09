new Phaser.Game({
  type: Phaser.AUTO, parent: 'jeu', width: W, height: H, backgroundColor: '#070303',
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  scene: [Boot, Titre, Hameau, Provisions, Expedition],
});
