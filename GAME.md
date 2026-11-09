# Abîme de l'Apocalypse — fiche de jeu

## Concept
Jeu de rôle tactique sombre, au tour par tour, inspiré de *Darkest Dungeon*. Quatre héros mythiques
(Enoch, Elior, Christ, Thoth) descendent dans des donjons peuplés de démons et de créatures de
l'Apocalypse. Entre deux expéditions, on revient au **hameau** pour soigner l'équipe avec l'or gagné.
Jeu 100 % navigateur (Phaser 3 via CDN, aucun build), textes en français (Québec).

## Spécification v1
- **Équipe en ligne (positions 1 à 4)** : Elior (1, tank), Thoth (2, malédictions), Christ (3, soin/soutien),
  Enoch (4, mage de lumière). Chaque compétence indique depuis quelles positions on peut l'utiliser
  et quelles positions elle peut viser.
  Si un héros (ou un ennemi) n'a plus aucune compétence utilisable depuis sa position, il peut toutes les utiliser.
- **Héros** : PV, stress 0–100. À 100 : **Crise** (précision −15, dégâts −25 %, peut perdre son tour).
  Christ, tel que révélé dans l'Apocalypse, est **Inébranlable** : il ne subit pas de stress.
  - Enoch, prophète antédiluvien : Rayon de lumière (brûlure), Révélation (marque tous les ennemis),
    Parole des Veilleurs (étourdit), Vision prophétique (stress −, critique + pour l'équipe).
  - Elior, paladin-prêtre : Frappe d'épée, Bouclier de foi (protège un allié), Jugement (étourdit),
    Balayage sacré (positions 1–2 ennemies).
  - Christ : Glaive de sa bouche (attaque à toute distance), Guérison, Paix (stress − pour tous),
    Purification (retire saignement/brûlure/malédiction, stress −).
  - Thoth, scribe des dieux : Plume tranchante (saignement), Malédiction du scribe (précision et dégâts −),
    Pesée des cœurs (marque), Encre de guérison (soin léger).
- **Combat** : initiative selon la vitesse (+ un peu de hasard). On clique une compétence, puis une cible.
  Précision vs esquive, coups critiques (×1,5, stress), saignement, brûlure, étourdissement, marque (+30 % dégâts),
  protection (le gardien encaisse les coups à la place de l'allié).
- **Ennemis** : sauterelles de l'abîme, démons mineurs, cultistes de la Bête, cavalier rouge, faux prophète…
  Boss : Abaddon (roi des sauterelles), le Cavalier pâle, la Bête à sept têtes.
- **Donjons (3)** : une courte série de salles — couloirs avec rencontres aléatoires, trésors, autels,
  puis le boss final. Chaque boss vaincu débloque le donjon suivant.
- **Hameau** : Infirmerie (PV contre de l'or), Chapelle (stress contre de l'or), Forge sacrée (niveau +1 :
  PV max et dégâts), choix du donjon, vue de l'équipe.
- **Défaite / chute** : un héros tombé à 0 PV revient au hameau avec 1 PV (mode indulgent par défaut).
  Option *Mort permanente* : un héros tombé est perdu pour de bon.
- **Sauvegarde** : localStorage (or, héros, donjons vaincus, options).
- **Art** : portraits recadrés depuis l'image de Pascal ; ennemis en formes vectorielles procédurales
  rouge sombre/or, remplacées en v2 par les sprites de Créa. Écran adapté souris et tactile (Scale FIT).

## Plan
1. `js/data.js` : héros, compétences, ennemis, donjons.
2. `js/logic.js` : fonctions de combat pures (testables avec Node).
3. `js/game.js` : scènes Phaser (Titre, Hameau, Donjon, Combat).
4. `test/smoke.js` : simulation de combats en Node.
5. Publication GitHub Pages.

## Contrôles
- Souris ou doigt : touche une compétence en bas, puis une cible (anneau doré). « Passer » saute le tour.
- Dans le donjon : « Avancer » pour la salle suivante, « Retraite » pour rentrer au hameau (on garde l'or).

## État
v1 jouable : 3 donjons, hameau, combat complet, sauvegarde locale.

v2 : vrais sprites d'ennemis par Créa (sauterelle, démon mineur, cultiste, faux prophète ; boss Abaddon,
Cavalier pâle, Bête à sept têtes) en WebP optimisés (`assets/ennemis/`), boss plus grands avec plus d'espace,
éclair blanc + secousse quand une unité est touchée. Le Cavalier rouge garde son dessin provisoire.

## Prochaines idées
- Sprite du Cavalier rouge et animations d'attaque (Créa).
- Bibelots/reliques équipables, provisions et torche (lumière qui change le danger).
- Déplacements de position (compétences qui avancent/reculent), plus de héros recrutables.
- Musique et effets sonores.
