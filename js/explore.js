// Exploration (sans Phaser) : carte procédurale, couloirs, lumière, faim, curiosités, pièges, camp, bizarreries, quête.
(function (root) {
  const isNode = typeof module !== 'undefined';
  const D = isNode ? require('./data.js') : root.DATA;
  const L = isNode ? require('./logic.js') : root.LOGIC;
  const R = () => L.rng();
  const pick = arr => arr[Math.floor(R() * arr.length)];
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const TILES = 3, HUNGER_EVERY = 12, LIGHT_STEP = 6, RESPITE = 12;
  const DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1]];

  // ----- Carte : arbre aléatoire sur une grille + quelques boucles -----
  function genMap(dg) {
    const [cols, rows] = dg.grid, key = (x, y) => x + ',' + y;
    const rooms = [], byKey = {}, edges = [];
    const addRoom = (x, y) => { const r = { id: rooms.length, x, y, type: 'vide', visited: false, scouted: false, cleared: false }; rooms.push(r); byKey[key(x, y)] = r; return r; };
    const free = r => DIRS.map(([dx, dy]) => [r.x + dx, r.y + dy]).filter(([x, y]) => x >= 0 && y >= 0 && x < cols && y < rows && !byKey[key(x, y)]);
    const addEdge = (a, b) => edges.push({ id: edges.length, a: a.id, b: b.id, tiles: genTiles(dg) });
    addRoom(Math.floor(R() * cols), Math.floor(R() * rows));
    while (rooms.length < Math.min(dg.rooms, cols * rows)) {
      const from = pick(rooms.filter(r => free(r).length));
      const [x, y] = pick(free(from));
      addEdge(from, addRoom(x, y));
    }
    let loops = 0;
    rooms.forEach(a => DIRS.forEach(([dx, dy]) => {
      const b = byKey[key(a.x + dx, a.y + dy)];
      if (b && a.id < b.id && loops < 2 && !edges.some(e => (e.a === a.id && e.b === b.id) || (e.a === b.id && e.b === a.id)) && R() < 0.3) { addEdge(a, b); loops++; }
    }));
    const map = { cols, rows, rooms, edges, start: 0 };
    const dist = bfs(map, 0);
    const boss = rooms.reduce((m, r) => (dist[r.id] > dist[m.id] ? r : m), rooms[0]);
    rooms.forEach(r => {
      if (r.id === 0) { r.type = 'entree'; r.visited = true; r.cleared = true; return; }
      if (r === boss) { r.type = 'boss'; r.enemies = dg.boss; return; }
      const x = R();
      if (x < 0.45) { r.type = 'combat'; r.enemies = pick(dg.pool); }
      else if (x < 0.7) { r.type = 'tresor'; r.curio = 'coffre'; r.cleared = true; }
      else { r.type = 'vide'; r.cleared = true; if (R() < 0.5) r.curio = pick(Object.keys(D.CURIOS)); }
    });
    return map;
  }
  function genTiles(dg) {
    const tiles = []; let fights = 0;
    for (let i = 0; i < TILES; i++) {
      const x = R(); let t = { type: 'vide', done: false };
      if (x < 0.22 && !fights) { t = { type: 'combat', done: false, enemies: pick(dg.pool) }; fights++; }
      else if (x < 0.42) t = { type: 'curio', done: false, curio: pick(Object.keys(D.CURIOS)) };
      else if (x < 0.54) t = { type: 'piege', done: false };
      else if (x < 0.62) t = { type: 'eboulement', done: false };
      tiles.push(t);
    }
    return tiles;
  }
  const neighbors = (map, id) => map.edges.filter(e => e.a === id || e.b === id).map(e => ({ edge: e, room: map.rooms[e.a === id ? e.b : e.a] }));
  function bfs(map, from) {
    const dist = { [from]: 0 }, q = [from];
    while (q.length) { const c = q.shift(); neighbors(map, c).forEach(({ room }) => { if (dist[room.id] === undefined) { dist[room.id] = dist[c] + 1; q.push(room.id); } }); }
    return dist;
  }
  const connected = map => Object.keys(bfs(map, map.start)).length === map.rooms.length;

  // ----- Expédition -----
  function newExpedition(dgIdx, save, items) {
    const dg = D.DUNGEONS[dgIdx];
    const heroes = D.HERO_ORDER.filter(id => !save.heroes[id].lost).map((id, i) => L.makeHero(id, save.heroes[id], i + 1));
    const exp = { dgIdx, dg, map: genMap(dg), heroes, items: Object.assign({ ration: 0, torche: 0, bandage: 0, cle: 0, eau: 0, pelle: 0 }, items),
      light: 100, gold: 0, tilesWalked: 0, campsLeft: dg.camps, room: 0, questDone: false, bossDead: false };
    scout(exp, 0);
    return exp;
  }
  const party = exp => exp.heroes.filter(h => !h.dead);
  function changeLight(exp, n) { exp.light = clamp(exp.light + n, 0, 100); }
  const lootMult = exp => L.lightFx(exp.light).loot;

  function scout(exp, roomId) {
    neighbors(exp.map, roomId).forEach(({ edge, room }) => { room.scouted = true; edge.tiles.forEach(t => { t.scouted = true; }); });
  }
  // Entrée dans une salle : visite, repérage selon la lumière
  function enterRoom(exp, roomId) {
    const r = exp.map.rooms[roomId]; exp.room = roomId; r.visited = true;
    const log = [];
    if (R() < L.lightFx(exp.light).scout) { scout(exp, roomId); neighbors(exp.map, roomId).forEach(n => neighbors(exp.map, n.room.id).forEach(m => { m.room.scouted = true; })); log.push('Repérage réussi : les environs sont révélés.'); }
    else neighbors(exp.map, roomId).forEach(({ room }) => { room.seen = true; });
    checkQuest(exp, log);
    return log;
  }
  // Premier passage sur une case de couloir : lumière, stress de l'obscurité, contrôle de faim
  function stepTile(exp, tile) {
    const log = []; if (tile.walked) return { log, hunger: false };
    tile.walked = true; exp.tilesWalked++;
    changeLight(exp, -LIGHT_STEP);
    if (exp.light < 50) party(exp).forEach(h => L.addStress(h, exp.light < 25 ? 2 : 1, log, exp.light));
    party(exp).forEach(h => {
      if (h.affliction && R() < 0.12) { log.push(`${h.name} (${D.AFFLICTIONS[h.affliction].name}) maugrée et sème le doute.`); party(exp).forEach(o => o !== h && L.addStress(o, 4, log, exp.light)); }
      if (h.virtue && R() < 0.12) { log.push(`${h.name} (${D.VIRTUES[h.virtue].name}) ranime les cœurs.`); party(exp).forEach(o => L.addStress(o, -3, log)); }
    });
    return { log, hunger: exp.tilesWalked % HUNGER_EVERY === 0 };
  }
  function hungerCheck(exp) {
    const need = party(exp).length, log = [];
    if (exp.items.ration >= need) { exp.items.ration -= need; party(exp).forEach(h => L.heal(h, 2, log)); log.push(`L'équipe mange (${need} rations). +2 PV chacun.`); }
    else {
      exp.items.ration = 0; log.push("Pas assez de nourriture ! L'équipe a faim (PV −15 %, stress +15).");
      party(exp).forEach(h => { L.hurt(null, h, Math.ceil(h.maxHp * 0.15), log); L.addStress(h, 15, log, exp.light); });
    }
    return log;
  }
  function trap(exp, tile) {
    const log = [], bonus = Math.max(0, ...party(exp).map(h => L.mods(h).trap)) + (party(exp).some(h => h.virtue === 'vigilant') ? 20 : 0);
    const chance = 25 + exp.light / 4 + (tile.scouted ? 40 : 0) + bonus;
    if (R() * 100 < chance) { log.push('Piège repéré et désamorcé !'); party(exp).forEach(h => L.addStress(h, -3, log)); return { log, ok: true }; }
    const front = L.line(party(exp))[0], x = R();
    if (x < 0.45) { const d = 4 + Math.floor(R() * 4); log.push(`Une lame jaillit ! ${front.name} perd ${d} PV.`); L.hurt(null, front, d, log); }
    else if (x < 0.8) { log.push('Des cris démoniaques résonnent ! (stress +12)'); party(exp).forEach(h => L.addStress(h, 12, log, exp.light)); }
    else { const h = pick(party(exp)); log.push(`Des spores infectes ! ${h.name} tombe malade.`); addDisease(h, log); }
    return { log, ok: false };
  }
  function obstacle(exp, usePelle) {
    const log = [];
    if (usePelle && exp.items.pelle > 0) { exp.items.pelle--; log.push("L'éboulement est dégagé à la pelle."); }
    else { log.push("L'équipe dégage l'éboulement à mains nues (stress +8, lumière −10)."); party(exp).forEach(h => L.addStress(h, 8, log, exp.light)); changeLight(exp, -10); }
    return log;
  }

  // ----- Bizarreries et maladies -----
  function addQuirk(h, good, log) {
    const pool = Object.keys(D.QUIRKS).filter(q => D.QUIRKS[q].good === good && !h.quirks.includes(q));
    if (!pool.length) return;
    const q = pick(pool), same = h.quirks.filter(x => D.QUIRKS[x].good === good);
    if (same.length >= 3) h.quirks.splice(h.quirks.indexOf(same[0]), 1);
    h.quirks.push(q); log.push(`${h.name} acquiert une bizarrerie : ${D.QUIRKS[q].name} (${D.QUIRKS[q].desc}).`);
  }
  function addDisease(h, log) {
    const pool = Object.keys(D.DISEASES).filter(d => !h.diseases.includes(d));
    if (!pool.length) return;
    const d = pick(pool); h.diseases.push(d); log.push(`${h.name} contracte : ${D.DISEASES[d].name}.`);
  }

  // ----- Curiosités -----
  function curio(exp, id, itemId) {
    const c = D.CURIOS[id], log = [], h = pick(party(exp));
    let o;
    if (itemId && c.items[itemId] && exp.items[itemId] > 0) { exp.items[itemId]--; o = c.items[itemId]; }
    else { let w = R() * c.outcomes.reduce((s, x) => s + x.w, 0); o = c.outcomes.find(x => (w -= x.w) < 0) || c.outcomes[0]; }
    log.push(o.text);
    if (o.gold) { const g = Math.round(L.ri(o.gold) * exp.dg.gold * lootMult(exp)); exp.gold += g; log.push(`+${g} or.`); }
    if (o.item) { exp.items[o.item[0]] += o.item[1]; log.push(`+${o.item[1]} ${D.ITEMS[o.item[0]].name.toLowerCase()}.`); }
    if (o.heal) party(exp).forEach(x => L.heal(x, o.heal, log));
    if (o.stress) party(exp).forEach(x => L.addStress(x, o.stress, log, exp.light));
    if (o.light) changeLight(exp, o.light);
    if (o.dmg) { log.push(`${h.name} perd ${o.dmg} PV.`); L.hurt(null, h, o.dmg, log); }
    if (o.quirk) addQuirk(h, o.quirk === 'good', log);
    if (o.disease) addDisease(h, log);
    if (o.scout) exp.map.rooms.forEach(r => { r.scouted = true; });
    return log;
  }

  // ----- Objets -----
  function useItem(exp, id) {
    const log = [];
    if (!(exp.items[id] > 0)) return log;
    const hurtMost = () => party(exp).slice().sort((a, b) => a.hp / a.maxHp - b.hp / b.maxHp)[0];
    if (id === 'torche') { if (exp.light >= 100) return ['La lumière est déjà au maximum.']; changeLight(exp, 25); log.push(`Une torche s'embrase : lumière ${exp.light}.`); }
    else if (id === 'bandage') { const h = hurtMost(); L.heal(h, 5, log); h.st.bleed = []; log.push(`${h.name} est bandé (+5 PV).`); }
    else if (id === 'ration') { const h = hurtMost(); L.heal(h, 3, log); log.push(`${h.name} mange (+3 PV).`); }
    else if (id === 'eau') { party(exp).forEach(h => L.addStress(h, -6, log)); log.push("L'eau bénite apaise l'équipe (stress −6)."); }
    else return ['Cet objet sert devant une curiosité ou un éboulement.'];
    exp.items[id]--;
    return log;
  }

  // ----- Combat (surprise selon la lumière) -----
  function encounterOpts(exp) {
    const lf = L.lightFx(exp.light), x = R();
    const guarded = party(exp).some(h => L.mods(h).noSurprise || h.virtue === 'vigilant');
    let surprise = null;
    if (!guarded && x < lf.surpriseParty) surprise = 'party'; else if (x > 1 - lf.surpriseEnemy) surprise = 'enemies';
    return { light: exp.light, surprise };
  }
  const combatGold = (exp, boss) => Math.round((boss ? 120 : 15 + R() * 20) * exp.dg.gold * lootMult(exp));

  // ----- Camp -----
  function startCamp(exp) {
    exp.campsLeft--;
    exp.camp = { respite: RESPITE, noAmbush: false, used: {} };
    return exp.camp;
  }
  function campMeal(exp) {
    const need = party(exp).length, log = [];
    if (exp.items.ration >= need) { exp.items.ration -= need; party(exp).forEach(h => { L.heal(h, Math.ceil(h.maxHp * 0.15), log); L.addStress(h, -10, log); }); log.push(`Repas au coin du feu (${need} rations) : +15 % PV, stress −10.`); }
    else { log.push('Pas de repas ce soir… (stress +10)'); party(exp).forEach(h => L.addStress(h, 10, log, exp.light)); }
    return log;
  }
  function campTargets(exp, hero, sk) {
    if (sk.target === 'self') return [hero];
    if (sk.target === 'party' || !sk.target) return party(exp);
    const p = party(exp).slice();
    if (sk.target === 'hurt') return [p.sort((a, b) => a.hp / a.maxHp - b.hp / b.maxHp)[0]];
    return [p.filter(h => !h.steadfast).sort((a, b) => b.stress - a.stress)[0] || hero];
  }
  function campSkill(exp, hero, sk) {
    const c = exp.camp, log = [];
    if (!c || c.respite < sk.cost || c.used[hero.id + sk.id] || hero.dead) return log;
    c.respite -= sk.cost; c.used[hero.id + sk.id] = true;
    if (sk.noAmbush) c.noAmbush = true;
    campTargets(exp, hero, sk).forEach(t => {
      if (sk.heal) L.heal(t, sk.heal, log);
      if (sk.healPct) L.heal(t, Math.ceil(t.maxHp * sk.healPct), log);
      if (sk.stressHeal) L.addStress(t, -sk.stressHeal, log);
      if (sk.cure && t.diseases.length) log.push(`${t.name} est guéri : ${D.DISEASES[t.diseases.shift()].name}.`);
      if (sk.buff) t.campBuffs.push(Object.assign({ fights: 2 }, sk.buff));
    });
    log.unshift(`${hero.name} : ${sk.name}.`);
    return log;
  }
  // Fin du camp : embuscade nocturne possible (20 %) sauf garde de nuit
  function endCamp(exp) { const ambush = !exp.camp.noAmbush && R() < 0.2; exp.camp = null; return ambush; }

  // ----- Quête et fin -----
  function exploredPct(exp) { return exp.map.rooms.filter(r => r.visited).length / exp.map.rooms.length; }
  function questText(exp) {
    const q = exp.dg.quest;
    return q.type === 'explore' ? `Quête : explorer ${Math.round(q.pct * 100)} % des salles (${Math.round(exploredPct(exp) * 100)} %)` : `Quête : vaincre le boss${exp.bossDead ? ' ✓' : ''}`;
  }
  function checkQuest(exp, log) {
    if (exp.questDone) return;
    const q = exp.dg.quest;
    if ((q.type === 'explore' && exploredPct(exp) >= q.pct) || (q.type === 'boss' && exp.bossDead)) { exp.questDone = true; log.push('QUÊTE ACCOMPLIE ! Tu peux rentrer au hameau quand tu veux.'); }
  }
  // Retour : or crédité, retraite = stress +20, quête = récompense + donjon suivant débloqué, bizarrerie possible
  function finish(exp, save, how) {
    const log = [];
    if (how === 'retraite') { party(exp).forEach(h => L.addStress(h, 20, log)); log.push("Retraite : la honte pèse sur l'équipe (stress +20)."); }
    if (exp.questDone) {
      const bonus = Math.round(100 * exp.dg.gold); exp.gold += bonus; log.push(`Récompense de quête : +${bonus} or.`);
      if (!save.cleared.includes(exp.dg.id)) save.cleared.push(exp.dg.id);
    }
    if (party(exp).length && R() < 0.5) addQuirk(pick(party(exp)), R() < 0.6, log);
    save.gold += exp.gold;
    L.syncSave(save, exp.heroes); L.returnHome(save);
    return log;
  }

  const X = { TILES, HUNGER_EVERY, RESPITE, genMap, genTiles, neighbors, bfs, connected, newExpedition, party, changeLight, scout, enterRoom, stepTile,
    hungerCheck, trap, obstacle, addQuirk, addDisease, curio, useItem, encounterOpts, combatGold, startCamp, campMeal, campSkill, endCamp,
    exploredPct, questText, checkQuest, finish };
  if (isNode) module.exports = X; else root.EXPLORE = X;
})(this);
