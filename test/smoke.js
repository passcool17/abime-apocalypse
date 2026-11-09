// Test de fumée : node test/smoke.js  (SEED=n pour changer la graine)
const assert = require('assert');
const D = require('../js/data.js');
const L = require('../js/logic.js');
const X = require('../js/explore.js');

let seed = +(process.env.SEED || 12345); // mulberry32
L.rng = () => { seed = (seed + 0x6D2B79F5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const R = L.rng, pick = a => a[Math.floor(R() * a.length)];

// ---- Données ----
for (const [id, h] of Object.entries(D.HEROES)) {
  assert(h.skills.length >= 4 && h.skills.length <= 5, id);
  assert(h.skills.some(s => s.from.includes(1)), `${id} : au moins une compétence depuis la position 1`);
  h.skills.forEach(s => assert(s.from.length && s.to.length && s.side, `${id}.${s.id}`));
  assert(h.camp.length >= 2, `${id} camp`);
}
for (const dg of D.DUNGEONS) [...dg.pool.flat(), ...dg.boss].forEach(k => assert(D.ENEMIES[k], k));
for (const c of Object.values(D.CURIOS)) Object.keys(c.items).forEach(i => assert(D.ITEMS[i], i));

// ---- Cartes : toujours connexes, boss présent ----
for (const dg of D.DUNGEONS) for (let i = 0; i < 2000; i++) {
  const m = X.genMap(dg);
  assert(X.connected(m), 'carte non connexe');
  assert.strictEqual(m.rooms.length, dg.rooms);
  assert.strictEqual(m.rooms.filter(r => r.type === 'boss').length, 1);
  assert.strictEqual(m.rooms[0].type, 'entree');
  m.edges.forEach(e => { assert.strictEqual(e.tiles.length, X.TILES); const r1 = m.rooms[e.a], r2 = m.rooms[e.b]; assert.strictEqual(Math.abs(r1.x - r2.x) + Math.abs(r1.y - r2.y), 1); });
}

// ---- Mécaniques ciblées ----
const save = L.newSave();
const mk = () => D.HERO_ORDER.map((id, i) => L.makeHero(id, save.heroes[id], i + 1));
{ // poussée / attraction / déplacement / échange
  const hs = mk(), st = L.makeCombat(hs, ['demon', 'sauterelle', 'cultiste']);
  assert(L.moveUnit(st.enemies, st.enemies[0], 2)); assert.deepStrictEqual(L.line(st.enemies).map(e => e.id), ['sauterelle', 'cultiste', 'demon']);
  L.swap(st, hs[0], hs[1]); assert.strictEqual(hs[0].pos, 2); assert.strictEqual(hs[1].pos, 1);
  assert.deepStrictEqual(L.swapTargets(st, hs[0]).map(h => h.id).sort(), ['christ', 'thoth']);
}
{ // cadavre : garde la place, se détruit
  const st = L.makeCombat(mk(), ['sauterelle', 'demon']);
  const e = st.enemies[0]; L.hurt(st, e, 999, []);
  assert(e.corpse && !e.dead && e.pos === 1, 'cadavre en position 1');
  assert(L.outcome(st) === null);
  L.hurt(st, e, 999, []); assert(e.dead); assert.strictEqual(st.enemies[1].pos, 1, "l'ennemi avance quand le cadavre disparaît");
  L.hurt(st, st.enemies[1], 999, []); assert.strictEqual(L.outcome(st), 'victoire', 'les cadavres ne comptent pas');
}
{ // seuil de la mort, avancée des héros
  const hs = mk(), st = L.makeCombat(hs, ['demon']);
  L.hurt(st, hs[0], 999, []); assert(hs[0].deathsDoor && !hs[0].dead && hs[0].hp === 0);
  let n = 0; while (!hs[0].dead && n < 200) { L.hurt(st, hs[0], 1, []); n++; } assert(hs[0].dead);
  assert.deepStrictEqual(L.line(st.heroes).map(h => h.pos), [1, 2, 3], 'les héros avancent');
}
{ // épreuve de volonté + crise cardiaque ; Christ inébranlable
  let aff = 0, vir = 0;
  for (let i = 0; i < 400; i++) { const h = mk()[0]; h.stress = 99; L.addStress(h, 5, []); if (h.affliction) aff++; if (h.virtue) vir++; assert(h.affliction || h.virtue); }
  assert(aff > 220 && vir > 50, `afflictions ${aff} vertus ${vir}`);
  const h = mk()[1]; h.stress = 195; h.affliction = 'egoiste'; L.addStress(h, 50, []); assert(h.deathsDoor && h.hp === 0 && h.stress === 150);
  const c = mk()[2]; L.addStress(c, 500, []); assert.strictEqual(c.stress, 0); assert(!c.affliction);
}
{ // migration v1
  const m = L.migrate({ version: 1, gold: 293, heroes: { elior: { hp: 3, stress: 40, lvl: 2, lost: false } }, cleared: ['puits'], permadeath: false });
  assert.strictEqual(m.version, 2); assert.strictEqual(m.heroes.elior.lvl, 2); assert.deepStrictEqual(m.cleared, ['puits']); assert(Array.isArray(m.heroes.thoth.quirks));
}

// ---- Combat simulé ----
const stats = { combats: 0, fuites: 0, defaites: 0, poussees: 0, echanges: 0, cadavres: 0, afflictions: 0, vertus: 0, seuil: 0, morts: 0, camps: 0, faim: 0, curios: 0, pieges: 0, quetes: 0, embuscades: 0, surprises: 0 };
function fight(exp, keys, opts) {
  const st = L.makeCombat(exp.heroes, keys, opts || X.encounterOpts(exp));
  if (st.surprise) stats.surprises++;
  stats.combats++;
  for (let r = 0; r < 60; r++) {
    for (const u of L.turnOrder(st)) {
      if (u.dead || u.corpse || L.outcome(st)) continue;
      const t = L.startTurn(st, u);
      if (!t.skip) {
        let res;
        if (u.side === 'hero') {
          const usable = u.skills.filter(s => L.canUse(st, u, s));
          if (!usable.length || R() < 0.08) { const o = L.swapTargets(st, u); if (o.length) { res = L.swap(st, u, pick(o)); stats.echanges++; } }
          else { const s = pick(usable); res = L.useSkill(st, u, s, pick(L.targetsOf(st, u, s))); }
        } else {
          const c = L.enemyChoice(st, u);
          if (c && c.move) res = L.enemyMove(st, u, c.move); else if (c) res = L.useSkill(st, u, c.skill, c.target);
        }
        if (res) res.log.forEach(l => { if (/repoussé|attiré/.test(l)) stats.poussees++; if (/cadavre/.test(l)) stats.cadavres++; if (/AFFLICTION/.test(l)) stats.afflictions++; if (/VERTU/.test(l)) stats.vertus++; if (/seuil de la mort !/.test(l)) stats.seuil++; });
      }
      // invariants
      for (const list of [st.heroes, st.enemies]) assert.deepStrictEqual(L.line(list).map(x => x.pos), L.line(list).map((x, i) => i + 1), 'positions contiguës');
      L.line(st.heroes).forEach(h => { assert(h.hp >= 0 && h.hp <= h.maxHp, `${h.name} PV ${h.hp}`); assert(h.stress >= 0 && h.stress <= 200); assert(h.hp > 0 || h.deathsDoor); });
      L.fighters(st.enemies).forEach(e => assert(e.hp > 0 && e.hp <= e.maxHp));
    }
    const o = L.outcome(st);
    if (o) { L.endCombat(exp.heroes); if (o === 'fuite') stats.fuites++; if (o === 'defaite') stats.defaites++; return o; }
  }
  throw new Error('combat sans fin');
}

// ---- Expéditions simulées : parcours en profondeur de la carte ----
function expedition(dgIdx) {
  const s = L.newSave(); const lv = 1 + 2 * dgIdx;
  Object.keys(s.heroes).forEach(id => { s.heroes[id].lvl = lv; s.heroes[id].hp = L.heroMaxHp(id, lv); });
  const dg = D.DUNGEONS[dgIdx];
  const exp = X.newExpedition(dgIdx, s, { ration: dg.food, torche: dg.torches, bandage: 3, cle: 1, eau: 1, pelle: 1 });
  const alive = () => X.party(exp).length > 0;
  const roomEvent = room => {
    if (!room.cleared && room.enemies) { const o = fight(exp, room.enemies); if (o === 'defaite') return false; room.cleared = true; if (room.type === 'boss') { exp.bossDead = true; X.checkQuest(exp, []); } }
    if (room.curio && !room.curioDone) { room.curioDone = true; X.curio(exp, room.curio, pick(Object.keys(D.CURIOS[room.curio].items).concat([null]))); stats.curios++; }
    if (exp.campsLeft > 0 && X.party(exp).some(h => h.hp < h.maxHp / 2)) {
      X.startCamp(exp); X.campMeal(exp); stats.camps++;
      X.party(exp).forEach(h => D.HEROES[h.id].camp.forEach(sk => X.campSkill(exp, h, sk)));
      assert(exp.camp.respite >= 0);
      if (X.endCamp(exp)) { stats.embuscades++; if (fight(exp, pick(dg.pool), { light: exp.light, surprise: 'party' }) === 'defaite') return false; }
    }
    if (exp.light < 40 && exp.items.torche) X.useItem(exp, 'torche');
    return alive();
  };
  const seen = new Set([0]);
  const walk = (edge) => {
    for (const tile of edge.tiles) {
      const st = X.stepTile(exp, tile);
      if (st.hunger) { X.hungerCheck(exp); stats.faim++; }
      if (!alive()) return false;
      if (tile.done) continue; tile.done = true;
      if (tile.type === 'combat' && fight(exp, tile.enemies) === 'defaite') return false;
      if (tile.type === 'piege') { X.trap(exp, tile); stats.pieges++; }
      if (tile.type === 'eboulement') X.obstacle(exp, R() < 0.5);
      if (tile.type === 'curio') { X.curio(exp, tile.curio, null); stats.curios++; }
      if (!alive()) return false;
    }
    return true;
  };
  const dfs = id => {
    for (const { edge, room } of X.neighbors(exp.map, id)) {
      if (seen.has(room.id)) continue;
      seen.add(room.id);
      if (!walk(edge)) return false;
      X.enterRoom(exp, room.id);
      if (!roomEvent(room)) return false;
      if (!dfs(room.id)) return false;
      if (!walk(edge)) return false; // retour
      X.enterRoom(exp, id);
    }
    return true;
  };
  dfs(0);
  if (exp.questDone) stats.quetes++;
  exp.heroes.forEach(h => { if (h.dead) stats.morts++; });
  X.finish(exp, s, exp.questDone ? 'fin' : 'retraite');
  Object.values(s.heroes).forEach(h => assert(h.hp >= 1 && h.stress >= 0 && h.stress <= 200));
  return exp.questDone;
}

const wins = {};
for (let run = 0; run < 150; run++) D.DUNGEONS.forEach((dg, i) => { wins[dg.id] = (wins[dg.id] || 0) + (expedition(i) ? 1 : 0); });
console.log('Quêtes accomplies /150 (joueur aléatoire, niveaux 1/3/5) :', wins);
console.log('Couverture :', stats);
['poussees', 'echanges', 'cadavres', 'afflictions', 'vertus', 'seuil', 'camps', 'faim', 'curios', 'pieges', 'surprises'].forEach(k => assert(stats[k] > 0, 'jamais vu : ' + k));
assert(stats.fuites < stats.combats * 0.02, 'trop de combats interminables');
console.log('OK');
