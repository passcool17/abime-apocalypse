// Données du jeu : héros, ennemis, donjons, objets, bizarreries, curiosités. Aucun lien avec Phaser.
(function (root) {
  // Champs des compétences : from/to = positions (1 = devant), side enemy|ally|self, aoe, dmg (multiplicateur),
  // acc/crit (bonus), bleed/burn [dégâts, tours], stun (%), mark/curse (tours), heal [min,max], stressHeal,
  // guard (tours), buff, cleanse, push/pull (cases), selfMove (- = avancer, + = reculer), shuffle, disease [id, %]
  const HEROES = {
    elior: { name: 'Elior', title: 'Paladin-prêtre', hp: 34, spd: 4, dodge: 5, prot: 0.2, acc: 90, crit: 5, dmg: [5, 9], moveRes: 40,
      skills: [
        { id: 'epee', name: "Frappe d'épée", desc: 'Coup solide au corps à corps.', from: [1, 2], side: 'enemy', to: [1, 2], dmg: 1, acc: 5, crit: 5 },
        { id: 'jugement', name: 'Jugement', desc: 'Coup de bouclier : étourdit (70 %) et repousse de 1.', from: [1, 2], side: 'enemy', to: [1], dmg: 0.5, stun: 70, push: 1 },
        { id: 'charge', name: 'Charge sainte', desc: "S'élance vers l'avant (avance de 1) et frappe.", from: [2, 3, 4], side: 'enemy', to: [1, 2], dmg: 0.9, selfMove: -1 },
        { id: 'bouclier', name: 'Bouclier de foi', desc: 'Protège un allié 2 tours : Elior encaisse les coups à sa place.', from: [1, 2], side: 'ally', to: [2, 3, 4], guard: 2 },
        { id: 'balayage', name: 'Balayage sacré', desc: 'Touche les ennemis en positions 1 et 2.', from: [1, 2], side: 'enemy', to: [1, 2], aoe: true, dmg: 0.6, acc: -5 },
      ],
      camp: [
        { id: 'veillee', name: 'Garde de nuit', cost: 4, desc: "Aucune embuscade nocturne.", noAmbush: true },
        { id: 'priereSoldat', name: 'Prière du soldat', cost: 2, desc: 'Elior : stress −20, +5 PV.', target: 'self', heal: 5, stressHeal: 20 },
        { id: 'armes', name: 'Aiguiser les armes', cost: 3, desc: 'Équipe : dégâts +10 % (2 combats).', target: 'party', buff: { dmg: 0.1 } },
      ] },
    thoth: { name: 'Thoth', title: 'Scribe des dieux', hp: 24, spd: 6, dodge: 10, prot: 0.05, acc: 90, crit: 6, dmg: [3, 6], moveRes: 20,
      skills: [
        { id: 'plume', name: 'Plume tranchante', desc: 'Inflige un saignement (3 par tour, 3 tours).', from: [2, 3], side: 'enemy', to: [1, 2, 3], dmg: 0.7, bleed: [3, 3] },
        { id: 'chaine', name: 'Chaîne de hiéroglyphes', desc: "Tire la cible vers l'avant de 2.", from: [1, 2, 3], side: 'enemy', to: [2, 3, 4], dmg: 0.5, acc: 5, pull: 2 },
        { id: 'malediction', name: 'Malédiction du scribe', desc: 'Précision −15 et dégâts −25 % pendant 3 tours.', from: [2, 3, 4], side: 'enemy', to: [1, 2, 3, 4], dmg: 0.2, acc: 10, curse: 3 },
        { id: 'pesee', name: 'Pesée des cœurs', desc: 'Marque la cible : +30 % de dégâts reçus (3 tours).', from: [2, 3], side: 'enemy', to: [1, 2, 3, 4], dmg: 0.5, mark: 3 },
        { id: 'encre', name: 'Encre de guérison', desc: 'Soin léger (4 à 6 PV).', from: [2, 3, 4], side: 'ally', to: [1, 2, 3, 4], heal: [4, 6] },
      ],
      camp: [
        { id: 'etoiles', name: 'Lecture des étoiles', cost: 3, desc: 'Équipe : critique +5 % (2 combats).', target: 'party', buff: { crit: 5 } },
        { id: 'remede', name: 'Remède du scribe', cost: 3, desc: 'Allié le plus blessé : +8 PV, guérit une maladie.', target: 'hurt', heal: 8, cure: true },
        { id: 'annales', name: 'Rédiger les annales', cost: 2, desc: 'Équipe : stress −8.', target: 'party', stressHeal: 8 },
      ] },
    christ: { name: 'Christ', title: "Tel que révélé dans l'Apocalypse", hp: 32, spd: 5, dodge: 5, prot: 0.15, acc: 95, crit: 8, dmg: [5, 9], moveRes: 40, steadfast: true,
      skills: [
        { id: 'glaive', name: 'Glaive de sa bouche', desc: 'La parole tranchante atteint toute position.', from: [2, 3, 4], side: 'enemy', to: [1, 2, 3, 4], dmg: 1.1, crit: 10 },
        { id: 'lumiere', name: 'Lumière du monde', desc: 'Éblouit (repousse de 1) puis recule de 1.', from: [1, 2], side: 'enemy', to: [1, 2], dmg: 0.7, push: 1, selfMove: 1 },
        { id: 'guerison', name: 'Guérison', desc: 'Soin puissant (9 à 13 PV), relève du seuil de la mort.', from: [2, 3, 4], side: 'ally', to: [1, 2, 3, 4], heal: [9, 13] },
        { id: 'paix', name: 'Paix', desc: "Stress −15 et 2 PV pour toute l'équipe.", from: [3, 4], side: 'ally', to: [1, 2, 3, 4], aoe: true, heal: [2, 2], stressHeal: 15 },
        { id: 'purification', name: 'Purification', desc: 'Retire saignement, brûlure et malédiction ; stress −25.', from: [2, 3, 4], side: 'ally', to: [1, 2, 3, 4], cleanse: true, stressHeal: 25 },
      ],
      camp: [
        { id: 'pain', name: 'Rompre le pain', cost: 4, desc: 'Équipe : +25 % PV, stress −10.', target: 'party', healPct: 0.25, stressHeal: 10 },
        { id: 'benediction', name: 'Bénédiction', cost: 3, desc: 'Allié le plus stressé : stress −25, précision +10 (2 combats).', target: 'stressed', stressHeal: 25, buff: { acc: 10 } },
        { id: 'mains', name: 'Imposition des mains', cost: 3, desc: 'Allié le plus blessé : +50 % PV, guérit une maladie.', target: 'hurt', healPct: 0.5, cure: true },
      ] },
    enoch: { name: 'Enoch', title: 'Prophète antédiluvien', hp: 22, spd: 7, dodge: 10, prot: 0, acc: 90, crit: 7, dmg: [5, 8], moveRes: 15,
      skills: [
        { id: 'rayon', name: 'Rayon de lumière', desc: 'Dégâts de lumière + brûlure (3 par tour, 2 tours).', from: [3, 4], side: 'enemy', to: [2, 3, 4], dmg: 1, burn: [3, 2] },
        { id: 'revelation', name: 'Révélation', desc: 'Dévoile tous les ennemis : marqués 2 tours.', from: [3, 4], side: 'enemy', to: [1, 2, 3, 4], aoe: true, dmg: 0.3, mark: 2 },
        { id: 'veilleurs', name: 'Parole des Veilleurs', desc: 'Positions 1-2 : étourdit (60 %), repousse de 1.', from: [3, 4], side: 'enemy', to: [1, 2], aoe: true, dmg: 0.25, stun: 60, push: 1 },
        { id: 'marche', name: 'Marche avec Dieu', desc: 'Recule de 2, +3 PV, stress −10.', from: [1, 2], side: 'self', to: [1, 2], heal: [3, 3], stressHeal: 10, selfMove: 2 },
        { id: 'vision', name: 'Vision prophétique', desc: "Équipe : stress −8 et critique +10 % (3 tours).", from: [3, 4], side: 'ally', to: [1, 2, 3, 4], aoe: true, stressHeal: 8, buff: { crit: 10, turns: 3 } },
      ],
      camp: [
        { id: 'recit', name: 'Récit des Veilleurs', cost: 3, desc: 'Équipe : stress −12.', target: 'party', stressHeal: 12 },
        { id: 'visionNuit', name: 'Vision nocturne', cost: 2, desc: 'Équipe : esquive +10 (2 combats), pas de surprise.', target: 'party', buff: { dodge: 10, noSurprise: 1 } },
        { id: 'meditation', name: 'Méditation', cost: 2, desc: 'Enoch : +6 PV, stress −20.', target: 'self', heal: 6, stressHeal: 20 },
      ] },
  };
  const HERO_ORDER = ['elior', 'thoth', 'christ', 'enoch'];

  const ENEMIES = {
    sauterelle: { name: "Sauterelle de l'abîme", shape: 'locust', hp: 10, spd: 8, dodge: 15, prot: 0, acc: 85, crit: 5, dmg: [2, 4], moveRes: 20,
      skills: [{ name: 'Dard', from: [1, 2, 3, 4], side: 'enemy', to: [1, 2], dmg: 1, bleed: [1, 3], disease: ['fievre', 8] },
               { name: 'Croc tirant', from: [1, 2], side: 'enemy', to: [3, 4], dmg: 0.6, pull: 1 },
               { name: 'Nuée bourdonnante', from: [2, 3, 4], side: 'enemy', to: [1, 2, 3, 4], dmg: 0.3, stress: 8 }] },
    demon: { name: 'Démon mineur', shape: 'demon', hp: 16, spd: 5, dodge: 5, prot: 0.1, acc: 85, crit: 6, dmg: [3, 6], moveRes: 40,
      skills: [{ name: 'Griffes', from: [1, 2], side: 'enemy', to: [1, 2, 3], dmg: 1 },
               { name: 'Coup de corne', from: [1], side: 'enemy', to: [1, 2], dmg: 0.8, push: 1 },
               { name: 'Murmure impie', from: [1, 2, 3, 4], side: 'enemy', to: [1, 2, 3, 4], dmg: 0.3, stress: 12 }] },
    cultiste: { name: 'Cultiste de la Bête', shape: 'cultist', hp: 12, spd: 6, dodge: 8, prot: 0, acc: 85, crit: 5, dmg: [3, 5], moveRes: 20,
      skills: [{ name: 'Flamme noire', from: [2, 3, 4], side: 'enemy', to: [2, 3, 4], dmg: 0.8, burn: [2, 3] },
               { name: 'Litanie', from: [3, 4], side: 'enemy', to: [1, 2, 3, 4], aoe: true, dmg: 0, stress: 6 },
               { name: 'Souillure', from: [1, 2, 3, 4], side: 'enemy', to: [1, 2, 3], dmg: 0.6, disease: ['peste', 15] }] },
    cavalierRouge: { name: 'Cavalier rouge', shape: 'horseman', color: 0xa01010, hp: 30, spd: 6, dodge: 5, prot: 0.2, acc: 90, crit: 8, dmg: [5, 8], moveRes: 60,
      skills: [{ name: 'Grande épée', from: [1, 2], side: 'enemy', to: [1, 2], dmg: 1, bleed: [2, 3] },
               { name: 'Charge', from: [1, 2], side: 'enemy', to: [1], dmg: 0.9, push: 2 },
               { name: 'Guerre', from: [1, 2, 3], side: 'enemy', to: [1, 2, 3, 4], aoe: true, dmg: 0.4, stress: 5 }] },
    fauxProphete: { name: 'Faux prophète', shape: 'cultist', color: 0x5a1a6a, hp: 18, spd: 7, dodge: 10, prot: 0.1, acc: 90, crit: 6, dmg: [4, 6], moveRes: 30,
      skills: [{ name: 'Feu du ciel', from: [1, 2, 3, 4], side: 'enemy', to: [3, 4], dmg: 1, burn: [3, 2] },
               { name: 'Séduction', from: [1, 2, 3, 4], side: 'enemy', to: [2, 3, 4], dmg: 0.2, stress: 15, pull: 1 }] },
    abaddon: { name: 'Abaddon, roi des sauterelles', shape: 'locust', boss: true, hp: 55, spd: 7, dodge: 10, prot: 0.15, acc: 90, crit: 8, dmg: [5, 8], moveRes: 90,
      skills: [{ name: "Dard de l'Abîme", from: [1, 2, 3, 4], side: 'enemy', to: [1, 2, 3], dmg: 1, bleed: [3, 3] },
               { name: 'Tourment de cinq mois', from: [1, 2, 3, 4], side: 'enemy', to: [1, 2, 3, 4], aoe: true, dmg: 0.4, stress: 10 },
               { name: 'Tourbillon de la nuée', from: [1, 2, 3, 4], side: 'enemy', to: [1, 2, 3, 4], aoe: true, dmg: 0.3, shuffle: true },
               { name: 'Fumée du puits', from: [1, 2, 3, 4], side: 'enemy', to: [1, 2], dmg: 0.6, stun: 40 }] },
    cavalierPale: { name: 'Le Cavalier pâle', shape: 'horseman', color: 0x9aa58a, boss: true, hp: 70, spd: 6, dodge: 8, prot: 0.2, acc: 90, crit: 10, dmg: [6, 10], moveRes: 90,
      skills: [{ name: 'Faux de la Mort', from: [1, 2, 3, 4], side: 'enemy', to: [1, 2, 3, 4], dmg: 1, crit: 10 },
               { name: "L'Hadès le suit", from: [1, 2, 3, 4], side: 'enemy', to: [1, 2, 3, 4], aoe: true, dmg: 0.5, stress: 12 },
               { name: 'Peste', from: [1, 2, 3, 4], side: 'enemy', to: [1, 2, 3, 4], aoe: true, dmg: 0.2, bleed: [2, 3], disease: ['peste', 20] }] },
    bete: { name: 'La Bête à sept têtes', shape: 'beast', boss: true, hp: 75, spd: 5, dodge: 0, prot: 0.2, acc: 90, crit: 8, dmg: [6, 9], actions: 2, moveRes: 100,
      skills: [{ name: 'Morsure des sept têtes', from: [1, 2, 3, 4], side: 'enemy', to: [1, 2], dmg: 1, bleed: [3, 3] },
               { name: 'Blasphème', from: [1, 2, 3, 4], side: 'enemy', to: [1, 2, 3, 4], aoe: true, dmg: 0.4, stress: 12 },
               { name: 'Souffle de soufre', from: [1, 2, 3, 4], side: 'enemy', to: [2, 3, 4], aoe: true, dmg: 0.5, burn: [3, 2] },
               { name: 'Queue balayante', from: [1, 2, 3, 4], side: 'enemy', to: [1], dmg: 0.7, push: 2 }] },
  };

  // quest: explore (part des salles visitées) ou boss ; camps = feux de camp disponibles
  const DUNGEONS = [
    { id: 'puits', name: "Le Puits de l'Abîme", desc: 'Court. Quête : explorer 90 % des salles.', rooms: 6, grid: [4, 3], camps: 0,
      quest: { type: 'explore', pct: 0.9 }, food: 8, torches: 6,
      pool: [['sauterelle', 'sauterelle', 'demon'], ['sauterelle', 'sauterelle', 'sauterelle'], ['demon', 'sauterelle', 'cultiste']],
      boss: ['sauterelle', 'abaddon', 'sauterelle'], gold: 1 },
    { id: 'desert', name: 'Le Désert des Cavaliers', desc: 'Moyen, 1 camp. Quête : vaincre le Cavalier pâle.', rooms: 8, grid: [4, 4], camps: 1,
      quest: { type: 'boss' }, food: 12, torches: 8,
      pool: [['demon', 'cultiste', 'cultiste'], ['cavalierRouge', 'demon', 'cultiste'], ['demon', 'demon', 'sauterelle', 'cultiste']],
      boss: ['demon', 'cavalierPale', 'cultiste'], gold: 1.5 },
    { id: 'babylone', name: 'Babylone déchue', desc: 'Long, 2 camps. Quête : vaincre la Bête à sept têtes.', rooms: 10, grid: [5, 4], camps: 2,
      quest: { type: 'boss' }, food: 16, torches: 10,
      pool: [['cavalierRouge', 'fauxProphete', 'cultiste'], ['demon', 'demon', 'fauxProphete', 'cultiste'], ['cavalierRouge', 'demon', 'sauterelle', 'fauxProphete']],
      boss: ['bete', 'fauxProphete'], gold: 2 },
  ];

  const ITEMS = {
    ration: { name: 'Ration', price: 6, desc: 'Nourriture : consommée à chaque contrôle de faim (1 par héros) et au camp. Hors faim : +3 PV.' },
    torche: { name: 'Torche', price: 8, desc: 'Lumière +25.' },
    bandage: { name: 'Bandage', price: 10, desc: 'Héros le plus blessé : +5 PV, arrête le saignement.' },
    cle: { name: 'Clé ancienne', price: 18, desc: 'Ouvre les coffres scellés sans risque.' },
    eau: { name: 'Eau bénite', price: 14, desc: 'Purifie autels et fontaines. Utilisée seule : stress −6 pour tous.' },
    pelle: { name: 'Pelle', price: 12, desc: 'Dégage les éboulements sans fatigue.' },
  };

  // Bizarreries : effets = acc, crit, dodge, spd, dmg (fraction), stressMult (fraction), deathblow, trap, darkStress
  const QUIRKS = {
    oeil: { name: 'Œil de lynx', good: true, desc: 'Précision +5', acc: 5 },
    vif: { name: 'Vif', good: true, desc: 'Vitesse +1', spd: 1 },
    endurci: { name: 'Endurci', good: true, desc: 'Stress subi −15 %', stressMult: -0.15 },
    chanceux: { name: 'Chanceux', good: true, desc: 'Critique +3 %', crit: 3 },
    beni: { name: 'Béni', good: true, desc: 'Résistance au coup fatal +10', deathblow: 10 },
    eclaireur: { name: 'Éclaireur', good: true, desc: 'Repérage des pièges +20', trap: 20 },
    nyctophobe: { name: 'Peur des ténèbres', good: false, desc: 'Stress +25 % sous 50 de lumière', darkStress: 0.25 },
    maladroit: { name: 'Maladroit', good: false, desc: 'Précision −5', acc: -5 },
    lent: { name: 'Lent', good: false, desc: 'Vitesse −1', spd: -1 },
    fragile: { name: 'Fragile', good: false, desc: 'Résistance au coup fatal −10', deathblow: -10 },
    anxieux: { name: 'Anxieux', good: false, desc: 'Stress subi +15 %', stressMult: 0.15 },
    ivrogne: { name: 'Ivrogne', good: false, desc: 'Esquive −5', dodge: -5 },
  };
  const DISEASES = {
    fievre: { name: "Fièvre de l'abîme", desc: 'Vitesse −1, dégâts −10 %', spd: -1, dmg: -0.1 },
    peste: { name: 'Peste rouge', desc: 'Stress subi +20 %', stressMult: 0.2 },
    lepre: { name: 'Lèpre noire', desc: 'Précision −10', acc: -10 },
  };

  // Afflictions (épreuve de volonté ratée) et vertus. acts = comportements en combat.
  const AFFLICTIONS = {
    egoiste: { name: 'Égoïste', acts: ['seul', 'refuse'], refuseHeal: true, acc: -5 },
    paranoiaque: { name: 'Paranoïaque', acts: ['bouge', 'refuse', 'stresse'], refuseHeal: true, dodge: 5, acc: -10 },
    masochiste: { name: 'Masochiste', acts: ['seul', 'bouge'], dodge: -10 },
    desespere: { name: 'Désespéré', acts: ['refuse', 'stresse'], refuseHeal: true, dmg: -0.2 },
    abusif: { name: 'Abusif', acts: ['stresse', 'seul'], dmg: 0.1, acc: -5 },
  };
  const VIRTUES = {
    courageux: { name: 'Courageux', desc: 'Stress subi −25 %, rassure l\'équipe', stressMult: -0.25, aura: 'stress' },
    puissant: { name: 'Puissant', desc: 'Dégâts +25 %', dmg: 0.25, aura: 'stress' },
    vigilant: { name: 'Vigilant', desc: 'Esquive +15, pas de surprise', dodge: 15, aura: 'stress' },
    ferme: { name: 'Ferme comme le roc', desc: 'Résistance au coup fatal +20, protection +10 %', deathblow: 20, prot: 0.1, aura: 'heal' },
    concentre: { name: 'Concentré', desc: 'Précision +15, critique +10 %', acc: 15, crit: 10, aura: 'stress' },
  };

  // Curiosités : outcomes sans objet ; items = objet qui garantit un meilleur résultat.
  // effets : gold [min,max], item [id,n], heal n (équipe), stress n (équipe), quirk 'good'|'bad', disease, light n, scout, dmg n (un héros)
  const CURIOS = {
    coffre: { name: 'Coffre scellé', desc: 'Un coffre de fer marqué de sceaux.', outcomes: [{ w: 55, gold: [30, 60], text: "De l'or ancien !" }, { w: 30, dmg: 5, text: 'Une aiguille empoisonnée !' }, { w: 15, text: 'Vide.' }],
      items: { cle: { gold: [60, 100], item: ['torche', 1], text: 'La clé tourne : un trésor intact.' } } },
    autel: { name: 'Autel profané', desc: 'Du sang noir coule sur la pierre.', outcomes: [{ w: 40, stress: 15, text: 'Une présence impie glace les cœurs.' }, { w: 30, quirk: 'good', text: 'Une grâce ancienne demeure.' }, { w: 30, text: 'Rien ne se passe.' }],
      items: { eau: { stress: -15, quirk: 'good', text: "L'eau bénite purifie l'autel." } } },
    fontaine: { name: 'Fontaine de sang', desc: 'Une eau rouge et tiède.', outcomes: [{ w: 40, heal: 5, text: "Étrangement, l'eau revigore." }, { w: 35, disease: true, text: "L'eau était souillée…" }, { w: 25, stress: 10, text: 'Des visages hurlent dans le reflet.' }],
      items: { eau: { heal: 8, stress: -10, text: 'Purifiée, la fontaine désaltère.' } } },
    tablette: { name: 'Tablette gravée', desc: 'Des signes que seul un scribe comprendrait.', outcomes: [{ w: 45, scout: true, light: 15, text: 'La tablette révèle le plan des lieux.' }, { w: 30, stress: 10, text: 'Des mots interdits troublent les esprits.' }, { w: 25, quirk: 'good', text: 'Une sagesse oubliée.' }], items: {} },
    depouille: { name: 'Dépouille de cultiste', desc: 'Un corps encore chaud, une bourse à la ceinture.', outcomes: [{ w: 50, gold: [15, 35], text: 'Quelques pièces.' }, { w: 30, disease: true, text: 'Une maladie rôde sur ce corps.' }, { w: 20, quirk: 'bad', text: 'Une vision horrible marque un héros.' }],
      items: { bandage: { gold: [20, 40], text: 'Les mains protégées, on fouille sans risque.' } } },
    reserve: { name: 'Réserve oubliée', desc: 'Des caisses intactes.', outcomes: [{ w: 60, item: ['ration', 3], text: 'Des vivres !' }, { w: 40, item: ['torche', 2], text: 'Des torches sèches.' }], items: {} },
  };

  const D = { HEROES, HERO_ORDER, ENEMIES, DUNGEONS, ITEMS, QUIRKS, DISEASES, AFFLICTIONS, VIRTUES, CURIOS };
  if (typeof module !== 'undefined') module.exports = D; else root.DATA = D;
})(this);
