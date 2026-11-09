// Test de fumée : simule des combats complets avec choix aléatoires (node test/smoke.js)
const assert = require('assert');
const D = require('../js/data.js');
const L = require('../js/logic.js');

// Vérifie les données
for (const [id, h] of Object.entries(D.HEROES)) {
  assert(h.skills.length >= 3 && h.skills.length <= 4, id);
  h.skills.forEach(s => assert(s.from.length && s.to.length && s.side, `${id}.${s.id}`));
}
for (const dg of D.DUNGEONS) [...dg.pool.flat(), ...dg.boss].forEach(k => assert(D.ENEMIES[k], k));

function heroAI(st, u, rng) {
  const usable = u.skills.filter(s => L.canUse(st, u, s));
  if (!usable.length) return null;
  const sk = usable[Math.floor(rng() * usable.length)];
  const ts = L.targetsOf(st, u, sk);
  return { skill: sk, target: ts[Math.floor(rng() * ts.length)] };
}

function fight(save, keys, rng) {
  const heroes = D.HERO_ORDER.filter(id => !save.heroes[id].lost && save.heroes[id].hp > 0).map((id, i) => L.makeHero(id, save.heroes[id], i + 1));
  const st = L.makeCombat(heroes, keys);
  for (let r = 0; r < 200; r++) {
    for (const u of L.turnOrder(st, rng)) {
      if (u.dead || L.outcome(st)) continue;
      const t = L.startTurn(st, u, rng);
      if (t.skip) continue;
      const c = u.side === 'hero' ? heroAI(st, u, rng) : L.enemyChoice(st, u, rng);
      if (c) L.useSkill(st, u, c.skill, c.target, rng);
      L.alive(st.heroes).concat(L.alive(st.enemies)).forEach(x => {
        assert(x.hp > 0 && x.hp <= x.maxHp, `${x.name} hp ${x.hp}`);
        if (x.side === 'hero') assert(x.stress >= 0 && x.stress <= 100);
      });
      const pos = L.alive(st.enemies).map(e => e.pos).sort();
      pos.forEach((p, i) => assert.strictEqual(p, i + 1));
    }
    const o = L.outcome(st);
    if (o) { L.syncSave(save, heroes); return o; }
  }
  throw new Error('combat sans fin');
}

let seed = +(process.env.SEED || 12345); // mulberry32
const rng = () => { seed = (seed + 0x6D2B79F5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const stats = {};
for (let run = 0; run < 300; run++) {
  for (const dg of D.DUNGEONS) {
    const save = L.newSave(); const lv = 1 + 2 * D.DUNGEONS.indexOf(dg); for (const h of Object.keys(save.heroes)) { save.heroes[h].lvl = lv; save.heroes[h].hp = L.heroMaxHp(h, lv); }
    let res = 'victoire';
    for (const room of L.buildRooms(dg, rng)) {
      if (!room.enemies) continue;
      res = fight(save, room.enemies, rng);
      if (res === 'defaite') break;
    }
    L.returnHome(save);
    Object.values(save.heroes).forEach(h => assert(h.hp >= 1));
    stats[dg.id] = (stats[dg.id] || 0) + (res === 'victoire' ? 1 : 0);
  }
}
console.log('Victoires (joueur aléatoire, niveaux 1/3/5, sans soins entre salles) /300 :', stats);
console.log('OK');
