# Abîme de l'Apocalypse — fiche de jeu

## Concept
Jeu de rôle tactique sombre, au tour par tour, inspiré de *Darkest Dungeon*. Quatre héros mythiques
(Enoch, Elior, Christ, Thoth) explorent des donjons peuplés de démons et de créatures de l'Apocalypse :
couloirs à défilement, salles, lumière qui faiblit, faim, curiosités, stress qui brise les esprits.
Entre deux expéditions, le **hameau** soigne corps et âmes contre de l'or.
Jeu 100 % navigateur (Phaser 3 via CDN, aucun build), textes en français (Québec).

## Spécification (v3)
### Exploration
- **Carte procédurale** : salles sur une grille, reliées par des couloirs (arbre aléatoire + boucles, toujours connexe).
  Panneau *Carte* (bouton ou touche M) : on touche une salle **voisine** (contour doré) pour s'y rendre.
  Salles : entrée, combat, trésor, salle silencieuse (parfois une curiosité), antre du boss (la plus éloignée).
- **Couloirs à défilement** : 3 cases par couloir. On marche à droite/gauche (A/D, flèches ou boutons ◀ ▶).
  Cases : rencontre, curiosité, piège, éboulement (pelle ou mains nues), vide. On peut faire demi-tour.
- **Repérage** : selon la lumière, entrer dans une salle révèle les salles voisines et le contenu des couloirs
  (pièges repérés = plus faciles à désamorcer).
- **Faim** : toutes les 12 cases explorées, 1 ration par héros ; sinon PV −15 % et stress +15.
- **Quête** : Puits = explorer 90 % des salles ; Désert et Babylone = vaincre le boss. Quête accomplie =
  récompense + donjon suivant débloqué. **Retraite** possible depuis une salle (stress +20).
- **Lumière 0–100** : −6 par nouvelle case, torche +25. Voile sombre à l'écran selon la lumière.
  Plus sombre = ennemis plus forts (dégâts, critiques), plus de stress, meilleur butin, embuscades plus probables.
  Plus clair = meilleur repérage, ennemis plus souvent surpris.
- **Surprise / embuscade** : héros surpris = rangs mélangés, ennemis jouent d'abord ; ennemis surpris = héros d'abord.

### Combat
- Initiative selon la vitesse. On choisit une compétence (positions utilisables entre crochets) puis une cible.
  Chaque héros a 5 compétences ; leur disponibilité dépend de sa **position actuelle**.
- **Déplacements** : poussée (Jugement, Parole des Veilleurs, Lumière du monde), attraction (Chaîne de
  hiéroglyphes), déplacements de soi (Charge sainte, Marche avec Dieu), action **Déplacer** (échange avec un
  voisin). Les ennemis poussent/attirent aussi (Coup de corne, Charge, Croc tirant, Séduction) ;
  Abaddon disperse l'équipe. Résistance au déplacement selon l'unité.
- **Cadavres** : un ennemi vaincu laisse un cadavre qui garde sa place (on peut le détruire). Les boss n'en laissent pas.
  Un héros tombé libère sa place : les autres avancent.
- **Seuil de la mort** : à 0 PV un héros survit ; chaque nouveau coup = test de résistance au coup fatal
  (67 % + bonus). Un soin l'en sort.
- **Stress 0–200** : à 100, épreuve de volonté → **affliction** (~75 % : Égoïste, Paranoïaque, Masochiste,
  Désespéré, Abusif — refuse d'obéir, agit seul, change de place, accable les autres, refuse les soins) ou
  **vertu** (~25 % : Courageux, Puissant, Vigilant, Ferme comme le roc, Concentré — bonus et réconfort).
  À 200 : crise cardiaque → seuil de la mort (mort s'il y était déjà).
  Christ, tel que révélé dans l'Apocalypse, est **Inébranlable** : aucun stress (mais il peut être blessé, soigné, déplacé).
- Saignement, brûlure, étourdissement, marque, malédiction, protection, maladies transmises par certains ennemis.

### Provisions, camp, bizarreries
- **Fournisseur** avant chaque expédition : rations, torches, bandages, clés, eau bénite, pelles
  (quantités conseillées). Les objets servent aussi sur les curiosités (clé → coffre, eau bénite → autel/fontaine…).
- **Camp** (Désert : 1, Babylone : 2) dans une salle nettoyée : repas (1 ration par héros), puis 12 points de
  répit à dépenser en compétences de camp (soins, stress, buffs pour 2 combats). Embuscade nocturne 20 %
  sauf *Garde de nuit*.
- **Bizarreries** positives/négatives (max 3 de chaque) via curiosités et fin d'expédition ; **maladies**
  via ennemis, pièges, curiosités.
- **Hameau** : Infirmerie (PV), Abbaye (stress −50), Taverne (stress −100, risqué), Sanatorium (maladies,
  bizarreries négatives), Forge (niveaux). Mort permanente optionnelle (sinon un héros tombé revient avec 1 PV).
- **Sauvegarde** localStorage (v2 ; les anciennes sauvegardes v1 sont migrées : or, niveaux, PV, stress, donjons).

## Contrôles
- Souris ou doigt partout. Couloir : A/D ou ←/→, ou maintenir ◀ ▶. Carte : bouton *Carte* ou M.
- Combat : compétence puis cible (anneau doré) ; *Déplacer* puis un allié voisin ; *Passer*.

## Code
`js/data.js` données · `js/logic.js` règles de combat/stress · `js/explore.js` carte, couloirs, lumière, faim,
curiosités, camp · `js/ui.js` outils d'interface · `js/scenes/*` scènes Phaser · `test/smoke.js` simulation Node.

## État
- v1 : combat, hameau, 3 donjons. v2 : sprites d'ennemis de Créa.
- v3 (actuelle) : exploration complète à la Darkest Dungeon (carte, couloirs, lumière, faim, curiosités, pièges,
  surprises), positions dynamiques, cadavres, seuil de la mort, afflictions/vertus, provisions, camp,
  bizarreries, maladies, nouveaux bâtiments du hameau.
- Limites connues : quitter la page en pleine expédition fait perdre le butin non rapporté (l'état des héros
  est sauvegardé à chaque salle) ; les héros partent toujours dans l'ordre Elior-Thoth-Christ-Enoch (on
  réorganise en combat) ; ciblage automatique des compétences de camp (allié le plus blessé/stressé).

## Prochaines idées
- Choisir l'ordre de l'équipe avant le départ, recruter d'autres héros.
- Sprite du Cavalier rouge, animations d'attaque, sons et musique (Créa).
- Bibelots/reliques équipables, quêtes variées (récupérer des objets, purifier des autels).
