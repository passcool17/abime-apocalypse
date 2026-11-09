// Données du jeu : héros, ennemis, donjons. Aucun lien avec Phaser (testable dans Node).
(function (root) {
  const HEROES = {
    elior: { name: 'Elior', title: 'Paladin-prêtre', hp: 34, spd: 4, dodge: 5, prot: 0.2, acc: 90, crit: 5, dmg: [5, 9], pos: 1,
      skills: [
        { id: 'epee', name: "Frappe d'épée", desc: 'Coup solide au corps à corps.', from: [1, 2], side: 'enemy', to: [1, 2], dmg: 1, acc: 5, crit: 5 },
        { id: 'bouclier', name: 'Bouclier de foi', desc: 'Protège un allié 2 tours : Elior encaisse les coups à sa place.', from: [1, 2], side: 'ally', to: [2, 3, 4], guard: 2 },
        { id: 'jugement', name: 'Jugement', desc: 'Frappe au bouclier : étourdit (70 %).', from: [1], side: 'enemy', to: [1], dmg: 0.5, stun: 70 },
        { id: 'balayage', name: 'Balayage sacré', desc: 'Touche les ennemis en positions 1 et 2.', from: [1, 2], side: 'enemy', to: [1, 2], aoe: true, dmg: 0.6, acc: -5 },
      ] },
    thoth: { name: 'Thoth', title: 'Scribe des dieux', hp: 24, spd: 6, dodge: 10, prot: 0.05, acc: 90, crit: 6, dmg: [3, 6], pos: 2,
      skills: [
        { id: 'plume', name: 'Plume tranchante', desc: 'Inflige un saignement (3 par tour, 3 tours).', from: [2, 3], side: 'enemy', to: [1, 2, 3], dmg: 0.7, bleed: [3, 3] },
        { id: 'malediction', name: 'Malédiction du scribe', desc: 'Précision −15 et dégâts −25 % pendant 3 tours.', from: [2, 3, 4], side: 'enemy', to: [1, 2, 3, 4], dmg: 0.2, acc: 10, curse: 3 },
        { id: 'pesee', name: 'Pesée des cœurs', desc: 'Marque la cible : +30 % de dégâts reçus (3 tours).', from: [2, 3], side: 'enemy', to: [1, 2, 3, 4], dmg: 0.5, mark: 3 },
        { id: 'encre', name: 'Encre de guérison', desc: 'Soin léger (4 à 6 PV).', from: [2, 3, 4], side: 'ally', to: [1, 2, 3, 4], heal: [4, 6] },
      ] },
    christ: { name: 'Christ', title: "Tel que révélé dans l'Apocalypse", hp: 32, spd: 5, dodge: 5, prot: 0.15, acc: 95, crit: 8, dmg: [5, 9], pos: 3, steadfast: true,
      skills: [
        { id: 'glaive', name: 'Glaive de sa bouche', desc: 'La parole tranchante atteint toute position.', from: [2, 3, 4], side: 'enemy', to: [1, 2, 3, 4], dmg: 1.1, crit: 10 },
        { id: 'guerison', name: 'Guérison', desc: 'Soin puissant (9 à 13 PV).', from: [2, 3, 4], side: 'ally', to: [1, 2, 3, 4], heal: [9, 13] },
        { id: 'paix', name: 'Paix', desc: "Stress −15 et 2 PV pour toute l'équipe.", from: [3, 4], side: 'ally', to: [1, 2, 3, 4], aoe: true, heal: [2, 2], stressHeal: 15 },
        { id: 'purification', name: 'Purification', desc: 'Retire saignement, brûlure et malédiction ; stress −25.', from: [2, 3, 4], side: 'ally', to: [1, 2, 3, 4], cleanse: true, stressHeal: 25 },
      ] },
    enoch: { name: 'Enoch', title: 'Prophète antédiluvien', hp: 22, spd: 7, dodge: 10, prot: 0, acc: 90, crit: 7, dmg: [5, 8], pos: 4,
      skills: [
        { id: 'rayon', name: 'Rayon de lumière', desc: 'Dégâts de lumière + brûlure (3 par tour, 2 tours).', from: [3, 4], side: 'enemy', to: [2, 3, 4], dmg: 1, burn: [3, 2] },
        { id: 'revelation', name: 'Révélation', desc: 'Dévoile tous les ennemis : marqués 2 tours.', from: [3, 4], side: 'enemy', to: [1, 2, 3, 4], aoe: true, dmg: 0.3, mark: 2 },
        { id: 'veilleurs', name: 'Parole des Veilleurs', desc: 'Étourdit (60 %) les ennemis en positions 1 et 2.', from: [3, 4], side: 'enemy', to: [1, 2], aoe: true, dmg: 0.25, stun: 60 },
        { id: 'vision', name: 'Vision prophétique', desc: "Équipe : stress −8 et critique +10 % (3 tours).", from: [3, 4], side: 'ally', to: [1, 2, 3, 4], aoe: true, stressHeal: 8, buff: { crit: 10, turns: 3 } },
      ] },
  };
  const HERO_ORDER = ['elior', 'thoth', 'christ', 'enoch'];

  // shape = dessin procédural ; skills ennemis : stress = stress infligé aux héros touchés
  const ENEMIES = {
    sauterelle: { name: "Sauterelle de l'abîme", shape: 'locust', hp: 10, spd: 8, dodge: 15, prot: 0, acc: 85, crit: 5, dmg: [2, 4],
      skills: [{ name: 'Dard', from: [1, 2, 3, 4], side: 'enemy', to: [1, 2], dmg: 1, bleed: [1, 3] },
               { name: 'Nuée bourdonnante', from: [2, 3, 4], side: 'enemy', to: [1, 2, 3, 4], dmg: 0.3, stress: 8 }] },
    demon: { name: 'Démon mineur', shape: 'demon', hp: 16, spd: 5, dodge: 5, prot: 0.1, acc: 85, crit: 6, dmg: [3, 6],
      skills: [{ name: 'Griffes', from: [1, 2], side: 'enemy', to: [1, 2, 3], dmg: 1 },
               { name: 'Murmure impie', from: [1, 2, 3, 4], side: 'enemy', to: [1, 2, 3, 4], dmg: 0.3, stress: 12 }] },
    cultiste: { name: 'Cultiste de la Bête', shape: 'cultist', hp: 12, spd: 6, dodge: 8, prot: 0, acc: 85, crit: 5, dmg: [3, 5],
      skills: [{ name: 'Flamme noire', from: [2, 3, 4], side: 'enemy', to: [2, 3, 4], dmg: 0.8, burn: [2, 3] },
               { name: 'Litanie', from: [3, 4], side: 'enemy', to: [1, 2, 3, 4], aoe: true, dmg: 0, stress: 6 }] },
    cavalierRouge: { name: 'Cavalier rouge', shape: 'horseman', color: 0xa01010, hp: 30, spd: 6, dodge: 5, prot: 0.2, acc: 90, crit: 8, dmg: [5, 8],
      skills: [{ name: 'Grande épée', from: [1, 2], side: 'enemy', to: [1, 2], dmg: 1, bleed: [2, 3] },
               { name: 'Guerre', from: [1, 2, 3], side: 'enemy', to: [1, 2, 3, 4], aoe: true, dmg: 0.4, stress: 5 }] },
    fauxProphete: { name: 'Faux prophète', shape: 'cultist', color: 0x5a1a6a, hp: 18, spd: 7, dodge: 10, prot: 0.1, acc: 90, crit: 6, dmg: [4, 6],
      skills: [{ name: 'Feu du ciel', from: [1, 2, 3, 4], side: 'enemy', to: [3, 4], dmg: 1, burn: [3, 2] },
               { name: 'Séduction', from: [1, 2, 3, 4], side: 'enemy', to: [1, 2, 3, 4], dmg: 0.2, stress: 15 }] },
    abaddon: { name: 'Abaddon, roi des sauterelles', shape: 'locust', boss: true, size: 1.8, hp: 55, spd: 7, dodge: 10, prot: 0.15, acc: 90, crit: 8, dmg: [5, 8],
      skills: [{ name: "Dard de l'Abîme", from: [1, 2, 3, 4], side: 'enemy', to: [1, 2, 3], dmg: 1, bleed: [3, 3] },
               { name: 'Tourment de cinq mois', from: [1, 2, 3, 4], side: 'enemy', to: [1, 2, 3, 4], aoe: true, dmg: 0.4, stress: 10 },
               { name: 'Fumée du puits', from: [1, 2, 3, 4], side: 'enemy', to: [1, 2], dmg: 0.6, stun: 40 }] },
    cavalierPale: { name: 'Le Cavalier pâle', shape: 'horseman', color: 0x9aa58a, boss: true, size: 1.8, hp: 70, spd: 6, dodge: 8, prot: 0.2, acc: 90, crit: 10, dmg: [6, 10],
      skills: [{ name: 'Faux de la Mort', from: [1, 2, 3, 4], side: 'enemy', to: [1, 2, 3, 4], dmg: 1, crit: 10 },
               { name: "L'Hadès le suit", from: [1, 2, 3, 4], side: 'enemy', to: [1, 2, 3, 4], aoe: true, dmg: 0.5, stress: 12 },
               { name: 'Peste', from: [1, 2, 3, 4], side: 'enemy', to: [1, 2, 3, 4], aoe: true, dmg: 0.2, bleed: [2, 3] }] },
    bete: { name: 'La Bête à sept têtes', shape: 'beast', boss: true, size: 2, hp: 75, spd: 5, dodge: 0, prot: 0.2, acc: 90, crit: 8, dmg: [6, 9], actions: 2,
      skills: [{ name: 'Morsure des sept têtes', from: [1, 2, 3, 4], side: 'enemy', to: [1, 2], dmg: 1, bleed: [3, 3] },
               { name: 'Blasphème', from: [1, 2, 3, 4], side: 'enemy', to: [1, 2, 3, 4], aoe: true, dmg: 0.4, stress: 12 },
               { name: 'Souffle de soufre', from: [1, 2, 3, 4], side: 'enemy', to: [2, 3, 4], aoe: true, dmg: 0.5, burn: [3, 2] }] },
  };

  const DUNGEONS = [
    { id: 'puits', name: "Le Puits de l'Abîme", desc: 'La fumée monte du puits ; des sauterelles en sortent.', rooms: 4,
      pool: [['sauterelle', 'sauterelle', 'demon'], ['sauterelle', 'sauterelle', 'sauterelle'], ['demon', 'sauterelle', 'cultiste']],
      boss: ['sauterelle', 'abaddon', 'sauterelle'], gold: 1 },
    { id: 'desert', name: 'Le Désert des Cavaliers', desc: 'Sous un ciel rouge, les cavaliers chevauchent.', rooms: 5,
      pool: [['demon', 'cultiste', 'cultiste'], ['cavalierRouge', 'demon', 'cultiste'], ['demon', 'demon', 'sauterelle', 'cultiste']],
      boss: ['demon', 'cavalierPale', 'cultiste'], gold: 1.5 },
    { id: 'babylone', name: 'Babylone déchue', desc: 'La grande cité est tombée ; la Bête monte de la mer.', rooms: 4,
      pool: [['cavalierRouge', 'fauxProphete', 'cultiste'], ['demon', 'demon', 'fauxProphete', 'cultiste'], ['cavalierRouge', 'demon', 'sauterelle', 'fauxProphete']],
      boss: ['bete', 'fauxProphete'], gold: 2 },
  ];

  const D = { HEROES, HERO_ORDER, ENEMIES, DUNGEONS };
  if (typeof module !== 'undefined') module.exports = D; else root.DATA = D;
})(this);
