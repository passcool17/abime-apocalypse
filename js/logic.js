// Règles de combat pures (sans Phaser) — testées par test/smoke.js.
(function (root) {
  const D = typeof module !== 'undefined' ? require('./data.js') : root.DATA;
  const ri = (rng, [a, b]) => a + Math.floor(rng() * (b - a + 1));
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  let uid = 0;

  const freshStatus = () => ({ bleed: [], burn: [], stun: false, mark: 0, curse: 0, guard: null, buff: null });

  function heroMaxHp(id, lvl) { return D.HEROES[id].hp + 3 * ((lvl || 1) - 1); }

  function newSave() {
    const heroes = {};
    D.HERO_ORDER.forEach(id => { heroes[id] = { hp: heroMaxHp(id, 1), stress: 0, lvl: 1, lost: false }; });
    return { gold: 60, heroes, cleared: [], permadeath: false, version: 1 };
  }

  function makeHero(id, s, pos) {
    const b = D.HEROES[id];
    return { uid: ++uid, id, side: 'hero', name: b.name, pos, lvl: s.lvl, maxHp: heroMaxHp(id, s.lvl), hp: Math.max(1, s.hp), stress: s.stress,
      spd: b.spd, dodge: b.dodge, prot: b.prot, acc: b.acc, crit: b.crit, dmg: b.dmg, steadfast: !!b.steadfast,
      skills: b.skills, dead: false, st: freshStatus() };
  }

  function makeEnemy(key, pos) {
    const b = D.ENEMIES[key];
    return { uid: ++uid, id: key, side: 'enemy', name: b.name, pos, lvl: 1, maxHp: b.hp, hp: b.hp, spd: b.spd, dodge: b.dodge, prot: b.prot,
      acc: b.acc, crit: b.crit, dmg: b.dmg, boss: !!b.boss, actions: b.actions || 1, skills: b.skills, dead: false, st: freshStatus() };
  }

  function makeCombat(heroes, enemyKeys) {
    return { heroes, enemies: enemyKeys.map((k, i) => makeEnemy(k, i + 1)), round: 0 };
  }

  const alive = list => list.filter(u => !u.dead);
  const all = st => st.heroes.concat(st.enemies);
  const find = (st, id) => all(st).find(u => u.uid === id);
  function compact(list) { alive(list).sort((a, b) => a.pos - b.pos).forEach((u, i) => { u.pos = i + 1; }); }

  function turnOrder(st, rng = Math.random) {
    st.round++;
    const order = [];
    alive(all(st)).forEach(u => { for (let i = 0; i < (u.actions || 1); i++) order.push({ u, k: u.spd + rng() * 3 - i * 4 }); });
    return order.sort((a, b) => b.k - a.k).map(o => o.u);
  }

  const crisis = u => u.side === 'hero' && u.stress >= 100;

  function targetsOf(st, actor, skill) {
    const mine = actor.side === 'hero' ? st.heroes : st.enemies;
    const theirs = actor.side === 'hero' ? st.enemies : st.heroes;
    let list = alive(skill.side === 'ally' ? mine : theirs).filter(t => skill.to.includes(t.pos));
    if (skill.guard) list = list.filter(t => t !== actor);
    return list;
  }

  // Si aucune compétence n'est utilisable depuis sa position, l'unité peut toutes les utiliser (évite les blocages).
  const fromOk = (st, u, s) => s.from.includes(u.pos) || !u.skills.some(k => k.from.includes(u.pos) && targetsOf(st, u, k).length);
  const canUse = (st, actor, skill) => !actor.dead && targetsOf(st, actor, skill).length > 0 && fromOk(st, actor, skill);

  function addStress(u, n, log) {
    if (u.side !== 'hero' || u.dead || u.steadfast || !n) return 0;
    const before = u.stress;
    u.stress = clamp(Math.round(u.stress + n), 0, 100);
    if (before < 100 && u.stress >= 100) log.push(`${u.name} entre en CRISE !`);
    return u.stress - before;
  }

  function down(st, u, log) {
    u.hp = 0; u.dead = true;
    log.push(u.side === 'hero' ? `${u.name} tombe !` : `${u.name} est terrassé.`);
    all(st).forEach(o => { if (o.st.guard && o.st.guard.by === u.uid) o.st.guard = null; });
  }

  // Début de tour : brûlure/saignement, durées, étourdissement, crise. Retourne {skip, log, fx}
  function startTurn(st, u, rng = Math.random) {
    const log = [], fx = [];
    const tick = (arr, label) => {
      const dmg = arr.reduce((s, d) => s + d.dmg, 0);
      if (dmg > 0 && !u.dead) {
        u.hp -= dmg; fx.push({ uid: u.uid, type: label, amount: dmg });
        log.push(`${u.name} subit ${dmg} (${label}).`);
        if (u.hp <= 0) down(st, u, log);
      }
      arr.forEach(d => d.turns--);
      return arr.filter(d => d.turns > 0);
    };
    u.st.bleed = tick(u.st.bleed, 'saignement');
    u.st.burn = tick(u.st.burn, 'brûlure');
    if (u.dead) { compact(st.heroes); compact(st.enemies); return { skip: true, log, fx }; }
    if (u.st.mark) u.st.mark--;
    if (u.st.curse) u.st.curse--;
    if (u.st.buff && --u.st.buff.turns <= 0) u.st.buff = null;
    if (u.st.guard && --u.st.guard.turns <= 0) u.st.guard = null;
    if (u.st.stun) { u.st.stun = false; log.push(`${u.name} est étourdi et perd son tour.`); return { skip: true, log, fx }; }
    if (crisis(u) && rng() < 0.25) {
      log.push(`${u.name}, en crise, reste figé par l'effroi.`);
      st.heroes.forEach(h => { if (h !== u) addStress(h, 4, log); });
      return { skip: true, log, fx };
    }
    return { skip: false, log, fx };
  }

  function useSkill(st, actor, skill, target, rng = Math.random) {
    const log = [`${actor.name} : ${skill.name}`], fx = [];
    const targets = skill.aoe ? targetsOf(st, actor, skill) : [target];
    const allies = actor.side === 'hero' ? st.heroes : st.enemies;
    for (let t of targets) {
      if (!t || t.dead) continue;
      if (skill.side === 'enemy') {
        if (!skill.aoe && t.st.guard) { const g = find(st, t.st.guard.by); if (g && !g.dead) { log.push(`${g.name} protège ${t.name}.`); t = g; } }
        const pureStress = !skill.dmg;
        const hit = clamp(actor.acc + (skill.acc || 0) - t.dodge - (actor.st.curse ? 15 : 0) - (crisis(actor) ? 15 : 0), 5, 95);
        if (!pureStress && rng() * 100 >= hit) { log.push(`${t.name} esquive.`); fx.push({ uid: t.uid, type: 'raté' }); continue; }
        const isCrit = !pureStress && rng() * 100 < actor.crit + (skill.crit || 0) + (actor.st.buff ? actor.st.buff.crit : 0);
        if (!pureStress) {
          let d = ri(rng, actor.dmg) * skill.dmg * (1 + 0.1 * (actor.lvl - 1));
          if (isCrit) d *= 1.5;
          if (t.st.mark) d *= 1.3;
          if (actor.st.curse) d *= 0.75;
          if (crisis(actor)) d *= 0.75;
          d = Math.max(1, Math.round(d * (1 - t.prot)));
          t.hp -= d;
          fx.push({ uid: t.uid, type: isCrit ? 'crit' : 'dmg', amount: d });
          log.push(`${t.name} perd ${d} PV${isCrit ? ' (CRITIQUE !)' : ''}.`);
        }
        if (t.hp <= 0) { down(st, t, log); continue; }
        if (skill.bleed) t.st.bleed.push({ dmg: skill.bleed[0], turns: skill.bleed[1] });
        if (skill.burn) t.st.burn.push({ dmg: skill.burn[0], turns: skill.burn[1] });
        if (skill.mark) t.st.mark = Math.max(t.st.mark, skill.mark);
        if (skill.curse) t.st.curse = Math.max(t.st.curse, skill.curse);
        if (skill.stun) {
          if (rng() * 100 < skill.stun - (t.boss ? 30 : 0)) { t.st.stun = true; log.push(`${t.name} est étourdi !`); }
          else log.push(`${t.name} résiste à l'étourdissement.`);
        }
        const s = addStress(t, (skill.stress || 0) * (isCrit ? 1.5 : 1) + (isCrit && t.side === 'hero' ? 10 : 0), log);
        if (s) fx.push({ uid: t.uid, type: 'stress', amount: s });
        if (isCrit && actor.side === 'hero') alive(allies).forEach(h => addStress(h, -4, log));
      } else {
        if (skill.heal) {
          const h = Math.min(t.maxHp - t.hp, ri(rng, skill.heal));
          t.hp += h; fx.push({ uid: t.uid, type: 'soin', amount: h });
          if (!skill.aoe) log.push(`${t.name} récupère ${h} PV.`);
        }
        if (skill.stressHeal) { const s = addStress(t, -skill.stressHeal, log); if (s) fx.push({ uid: t.uid, type: 'calme', amount: -s }); }
        if (skill.cleanse) { t.st.bleed = []; t.st.burn = []; t.st.curse = 0; log.push(`${t.name} est purifié.`); }
        if (skill.guard) { t.st.guard = { by: actor.uid, turns: skill.guard }; log.push(`${actor.name} protège ${t.name}.`); }
        if (skill.buff) t.st.buff = { crit: skill.buff.crit, turns: skill.buff.turns };
      }
    }
    compact(st.heroes); compact(st.enemies);
    return { log, fx };
  }

  function enemyChoice(st, u, rng = Math.random) {
    const usable = u.skills.filter(s => canUse(st, u, s));
    if (!usable.length) return null;
    const skill = usable[Math.floor(rng() * usable.length)];
    const ts = targetsOf(st, u, skill);
    const marked = ts.filter(t => t.st.mark);
    const pool = marked.length && rng() < 0.6 ? marked : ts;
    return { skill, target: pool[Math.floor(rng() * pool.length)] };
  }

  function outcome(st) {
    if (!alive(st.enemies).length) return 'victoire';
    if (!alive(st.heroes).length) return 'defaite';
    return null;
  }

  // Après un combat : rapporte l'état des héros dans la sauvegarde
  function syncSave(save, heroes) {
    heroes.forEach(h => { const s = save.heroes[h.id]; s.hp = h.dead ? 0 : h.hp; s.stress = h.stress; });
  }

  // Retour au hameau : héros tombés -> 1 PV (ou perdus en mort permanente)
  function returnHome(save) {
    Object.values(save.heroes).forEach(s => { if (!s.lost && s.hp <= 0) { if (save.permadeath) s.lost = true; else s.hp = 1; } });
  }

  // Salles d'un donjon : couloirs aléatoires puis boss
  function buildRooms(dg, rng = Math.random) {
    const rooms = [];
    for (let i = 0; i < dg.rooms; i++) {
      const r = rng();
      if (i === 0 || r < 0.55) rooms.push({ type: 'combat', enemies: dg.pool[Math.floor(rng() * dg.pool.length)] });
      else if (r < 0.85) rooms.push({ type: 'tresor' });
      else rooms.push({ type: 'autel' });
    }
    rooms.push({ type: 'boss', enemies: dg.boss });
    return rooms;
  }

  const L = { newSave, heroMaxHp, makeHero, makeEnemy, makeCombat, alive, compact, turnOrder, targetsOf, canUse, startTurn, useSkill,
    enemyChoice, outcome, syncSave, returnHome, buildRooms, addStress, crisis };
  if (typeof module !== 'undefined') module.exports = L; else root.LOGIC = L;
})(this);
