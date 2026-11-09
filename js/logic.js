// Règles de combat et d'état des héros (sans Phaser) — testées par test/smoke.js.
// Hasard : L.rng (remplaçable par un générateur déterministe dans les tests).
(function (root) {
  const D = typeof module !== 'undefined' ? require('./data.js') : root.DATA;
  const L = { rng: Math.random };
  const R = () => L.rng();
  const ri = ([a, b]) => a + Math.floor(R() * (b - a + 1));
  const pick = arr => arr[Math.floor(R() * arr.length)];
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  let uid = 0;

  const freshStatus = () => ({ bleed: [], burn: [], stun: false, mark: 0, curse: 0, guard: null, buff: null });
  const heroMaxHp = (id, lvl) => D.HEROES[id].hp + 3 * ((lvl || 1) - 1);

  function newHeroSave(id) { return { hp: heroMaxHp(id, 1), stress: 0, lvl: 1, lost: false, quirks: [], diseases: [], affliction: null }; }
  function newSave() {
    const heroes = {};
    D.HERO_ORDER.forEach(id => { heroes[id] = newHeroSave(id); });
    return { version: 2, gold: 200, heroes, cleared: [], permadeath: false };
  }
  // Sauvegarde v1 -> v2 (garde or, niveaux, PV, stress, donjons vaincus)
  function migrate(s) {
    if (!s || typeof s !== 'object') return newSave();
    if (s.version === 2) return s;
    if (s.version !== 1) return newSave();
    const n = newSave();
    n.gold = Math.max(s.gold || 0, 200); n.cleared = s.cleared || []; n.permadeath = !!s.permadeath;
    D.HERO_ORDER.forEach(id => { const o = (s.heroes || {})[id]; if (o) Object.assign(n.heroes[id], { hp: o.hp, stress: clamp(o.stress || 0, 0, 99), lvl: o.lvl || 1, lost: !!o.lost }); });
    return n;
  }

  // ----- Modificateurs (bizarreries, maladies, affliction, vertu, buffs de camp) -----
  const MODKEYS = ['acc', 'crit', 'dodge', 'spd', 'dmg', 'prot', 'stressMult', 'deathblow', 'trap', 'darkStress', 'noSurprise'];
  function mods(u) {
    const m = {}; MODKEYS.forEach(k => { m[k] = 0; });
    const add = o => o && MODKEYS.forEach(k => { if (o[k]) m[k] += o[k]; });
    (u.quirks || []).forEach(q => add(D.QUIRKS[q]));
    (u.diseases || []).forEach(d => add(D.DISEASES[d]));
    if (u.affliction) add(D.AFFLICTIONS[u.affliction]);
    if (u.virtue) add(D.VIRTUES[u.virtue]);
    (u.campBuffs || []).forEach(b => add(b));
    return m;
  }

  // Lumière : bonus ennemis, stress, butin, surprises, repérage
  function lightFx(light) {
    if (light >= 76) return { label: 'Rayonnante', enemyDmg: 0, enemyCrit: 0, stress: 1, loot: 1, surpriseParty: 0.05, surpriseEnemy: 0.25, scout: 0.5 };
    if (light >= 51) return { label: 'Vive', enemyDmg: 0, enemyCrit: 0, stress: 1, loot: 1.1, surpriseParty: 0.1, surpriseEnemy: 0.15, scout: 0.3 };
    if (light >= 26) return { label: 'Pénombre', enemyDmg: 0.1, enemyCrit: 4, stress: 1.15, loot: 1.25, surpriseParty: 0.15, surpriseEnemy: 0.1, scout: 0.15 };
    if (light >= 1) return { label: 'Ténèbres', enemyDmg: 0.15, enemyCrit: 8, stress: 1.25, loot: 1.4, surpriseParty: 0.25, surpriseEnemy: 0.05, scout: 0.05 };
    return { label: 'Obscurité totale', enemyDmg: 0.25, enemyCrit: 12, stress: 1.35, loot: 1.6, surpriseParty: 0.33, surpriseEnemy: 0, scout: 0 };
  }

  function makeHero(id, s, pos) {
    const b = D.HEROES[id];
    return { uid: ++uid, id, side: 'hero', name: b.name, pos, lvl: s.lvl, maxHp: heroMaxHp(id, s.lvl), hp: clamp(s.hp, 1, heroMaxHp(id, s.lvl)),
      stress: b.steadfast ? 0 : clamp(s.stress || 0, 0, 199), spd: b.spd, dodge: b.dodge, prot: b.prot, acc: b.acc, crit: b.crit, dmg: b.dmg,
      moveRes: b.moveRes, steadfast: !!b.steadfast, skills: b.skills, quirks: (s.quirks || []).slice(), diseases: (s.diseases || []).slice(),
      affliction: b.steadfast ? null : s.affliction || null, virtue: null, campBuffs: [], deathsDoor: false, dead: false, st: freshStatus() };
  }
  function makeEnemy(key, pos) {
    const b = D.ENEMIES[key];
    return { uid: ++uid, id: key, side: 'enemy', name: b.name, pos, lvl: 1, maxHp: b.hp, hp: b.hp, spd: b.spd, dodge: b.dodge, prot: b.prot,
      acc: b.acc, crit: b.crit, dmg: b.dmg, moveRes: b.moveRes || 30, boss: !!b.boss, actions: b.actions || 1, skills: b.skills, dead: false, corpse: false, st: freshStatus() };
  }

  // surprise : 'party' (héros surpris : mélangés, ennemis d'abord) | 'enemies' (héros d'abord) | null
  function makeCombat(heroes, enemyKeys, opts = {}) {
    const st = { heroes: heroes.filter(h => !h.dead), enemies: enemyKeys.map((k, i) => makeEnemy(k, i + 1)), round: 0, light: opts.light ?? 100, surprise: opts.surprise || null };
    st.heroes.forEach(h => { h.st = freshStatus(); });
    renumber(st.heroes);
    if (st.surprise === 'party') shuffleLine(st.heroes);
    return st;
  }

  // ----- Lignes et positions -----
  const line = list => list.filter(u => !u.dead).sort((a, b) => a.pos - b.pos);
  const fighters = list => list.filter(u => !u.dead && !u.corpse);
  function renumber(list) { line(list).forEach((u, i) => { u.pos = i + 1; }); }
  function moveUnit(list, u, delta) {
    const arr = line(list), i = arr.indexOf(u), j = clamp(i + delta, 0, arr.length - 1);
    if (i < 0 || i === j) return false;
    arr.splice(i, 1); arr.splice(j, 0, u); arr.forEach((x, k) => { x.pos = k + 1; });
    return true;
  }
  function shuffleLine(list) {
    const arr = line(list);
    for (let i = arr.length - 1; i > 0; i--) { const j = Math.floor(R() * (i + 1)); [arr[i], arr[j]] = [arr[j], arr[i]]; }
    arr.forEach((x, k) => { x.pos = k + 1; });
  }
  const all = st => st.heroes.concat(st.enemies);
  const find = (st, id) => all(st).find(u => u.uid === id);

  function stat(u, k) {
    const m = mods(u);
    if (k === 'acc') return u.acc + m.acc - (u.deathsDoor ? 10 : 0);
    if (k === 'dodge') return u.corpse ? 0 : u.dodge + m.dodge;
    if (k === 'spd') return u.spd + m.spd;
    if (k === 'crit') return u.crit + m.crit + (u.st.buff ? u.st.buff.crit : 0);
    if (k === 'prot') return u.corpse ? 0 : clamp(u.prot + m.prot, 0, 0.8);
    return 0;
  }

  // ----- Stress, épreuve de volonté, crise cardiaque -----
  function addStress(u, n, log, light = 100) {
    if (u.side !== 'hero' || u.dead || u.steadfast || !n) return 0;
    if (n > 0) { const m = mods(u); n *= Math.max(0.2, 1 + m.stressMult + (light < 50 ? m.darkStress : 0)) * lightFx(light).stress; }
    const before = u.stress;
    u.stress = clamp(Math.round(u.stress + n), 0, 200);
    if (before < 100 && u.stress >= 100 && !u.affliction && !u.virtue) resolve(u, log);
    if (u.stress >= 200) {
      log.push(`${u.name} fait une crise cardiaque !`);
      u.stress = 150; u.flash = { text: 'CRISE CARDIAQUE', good: false };
      if (u.deathsDoor) kill(null, u, log); else { u.hp = 0; u.deathsDoor = true; log.push(`${u.name} est au seuil de la mort.`); }
    }
    if (u.stress <= 0 && u.affliction) { log.push(`${u.name} n'est plus ${D.AFFLICTIONS[u.affliction].name.toLowerCase()}.`); u.affliction = null; }
    return u.stress - before;
  }
  function resolve(u, log, forceVirtue) {
    log.push(`Épreuve de volonté pour ${u.name}…`);
    if (forceVirtue ?? R() < 0.25) {
      u.virtue = pick(Object.keys(D.VIRTUES)); u.stress = 45; u.hp = Math.min(u.maxHp, u.hp + Math.ceil(u.maxHp * 0.1));
      const v = D.VIRTUES[u.virtue]; log.push(`VERTU ! ${u.name} est ${v.name} !`); u.flash = { text: v.name, good: true };
    } else {
      u.affliction = pick(Object.keys(D.AFFLICTIONS));
      const a = D.AFFLICTIONS[u.affliction]; log.push(`AFFLICTION ! ${u.name} est ${a.name} !`); u.flash = { text: a.name, good: false };
    }
  }

  // ----- Dégâts, seuil de la mort, cadavres -----
  function kill(st, u, log) {
    if (u.side === 'enemy' && st && !u.corpse && !u.boss) {
      u.corpse = true; u.maxHp = u.hp = Math.max(4, Math.round(D.ENEMIES[u.id].hp * 0.4)); u.st = freshStatus();
      log.push(`${u.name} est terrassé ; son cadavre bloque la place.`);
      u.name = 'Cadavre';
    } else {
      u.hp = 0; u.dead = true; u.deathsDoor = false;
      log.push(u.side === 'hero' ? `${u.name} tombe !` : u.corpse ? 'Le cadavre est réduit en poussière.' : `${u.name} est terrassé !`);
    }
    if (st) { all(st).forEach(o => { if (o.st.guard && o.st.guard.by === u.uid) o.st.guard = null; }); renumber(st.heroes); renumber(st.enemies); }
  }
  // Inflige d bégâts ; héros : seuil de la mort puis coup fatal (résistance 67 % + bonus)
  function hurt(st, u, d, log) {
    if (u.side !== 'hero') { u.hp -= d; if (u.hp <= 0) kill(st, u, log); return; }
    if (u.deathsDoor) {
      const res = 67 + mods(u).deathblow;
      if (R() * 100 < res) log.push(`${u.name} résiste au coup fatal !`);
      else kill(st, u, log);
      return;
    }
    u.hp -= d;
    if (u.hp <= 0) { u.hp = 0; u.deathsDoor = true; log.push(`${u.name} est au seuil de la mort !`); addStress(u, 10, log, st ? st.light : 100); }
  }
  function heal(u, n, log) {
    const h = Math.max(0, Math.min(u.maxHp - u.hp, n));
    u.hp += h;
    if (u.deathsDoor && u.hp > 0) { u.deathsDoor = false; log.push(`${u.name} revient du seuil de la mort.`); }
    return h;
  }

  // ----- Ordre des tours -----
  function turnOrder(st) {
    st.round++;
    const order = [];
    line(st.heroes).concat(fighters(st.enemies)).forEach(u => { for (let i = 0; i < (u.actions || 1); i++) order.push({ u, k: stat(u, 'spd') + R() * 3 - i * 4 }); });
    order.sort((a, b) => b.k - a.k);
    if (st.round === 1 && st.surprise) { const first = st.surprise === 'party' ? 'enemy' : 'hero'; order.sort((a, b) => (b.u.side === first) - (a.u.side === first)); }
    return order.map(o => o.u);
  }

  // ----- Ciblage -----
  function targetsOf(st, actor, skill) {
    if (skill.side === 'self') return [actor];
    const mine = actor.side === 'hero' ? st.heroes : st.enemies, theirs = actor.side === 'hero' ? st.enemies : st.heroes;
    let list = (skill.side === 'ally' ? line(mine).filter(t => !t.corpse) : line(theirs)).filter(t => skill.to.includes(t.pos));
    if (skill.guard) list = list.filter(t => t !== actor);
    return list;
  }
  const canUse = (st, actor, skill) => !actor.dead && skill.from.includes(actor.pos) && targetsOf(st, actor, skill).length > 0;
  const swapTargets = (st, u) => line(st.heroes).filter(h => Math.abs(h.pos - u.pos) === 1);
  function swap(st, u, other) {
    const p = u.pos; u.pos = other.pos; other.pos = p;
    return { log: [`${u.name} change de place avec ${other.name}.`], fx: [] };
  }

  // ----- Début de tour : brûlure/saignement, durées, étourdissement, affliction, vertu -----
  function startTurn(st, u) { const r = turnStart(st, u); renumber(st.heroes); renumber(st.enemies); return r; }
  function turnStart(st, u) {
    const log = [], fx = [];
    for (const [key, label] of [['bleed', 'saignement'], ['burn', 'brûlure']]) {
      const dmg = u.st[key].reduce((s, d) => s + d.dmg, 0);
      u.st[key].forEach(d => d.turns--); u.st[key] = u.st[key].filter(d => d.turns > 0);
      if (dmg > 0 && !u.dead) { fx.push({ uid: u.uid, type: label, amount: dmg }); log.push(`${u.name} subit ${dmg} (${label}).`); hurt(st, u, dmg, log); }
    }
    if (u.dead) return { skip: true, log, fx };
    if (u.st.mark) u.st.mark--;
    if (u.st.curse) u.st.curse--;
    if (u.st.buff && --u.st.buff.turns <= 0) u.st.buff = null;
    if (u.st.guard && --u.st.guard.turns <= 0) u.st.guard = null;
    if (u.st.stun) { u.st.stun = false; log.push(`${u.name} est étourdi et perd son tour.`); return { skip: true, log, fx }; }
    if (u.side !== 'hero') return { skip: false, log, fx };
    if (u.virtue && R() < 0.35) {
      const v = D.VIRTUES[u.virtue];
      if (v.aura === 'heal') { line(st.heroes).forEach(h => { const n = heal(h, 2, log); if (n) fx.push({ uid: h.uid, type: 'soin', amount: n }); }); log.push(`${u.name} (${v.name}) raffermit l'équipe.`); }
      else { line(st.heroes).forEach(h => h !== u && addStress(h, -5, log)); log.push(`${u.name} (${v.name}) encourage l'équipe : stress −5.`); }
    }
    if (u.affliction && R() < 0.4) {
      const a = D.AFFLICTIONS[u.affliction], act = pick(a.acts);
      if (act === 'stresse') {
        log.push(`${u.name} (${a.name}) accable ses compagnons !`);
        line(st.heroes).forEach(h => { if (h !== u) { const s = addStress(h, 6 + Math.floor(R() * 5), log, st.light); if (s) fx.push({ uid: h.uid, type: 'stress', amount: s }); } });
      } else if (act === 'refuse') { log.push(`${u.name} (${a.name}) refuse d'obéir et passe son tour.`); return { skip: true, log, fx }; }
      else if (act === 'bouge') {
        if (moveUnit(st.heroes, u, R() < 0.5 ? -1 : 1)) { log.push(`${u.name} (${a.name}) change de place sans ordre.`); return { skip: true, log, fx }; }
      } else if (act === 'seul') {
        const usable = u.skills.filter(s => s.side === 'enemy' && canUse(st, u, s));
        if (usable.length) {
          const s = pick(usable), r = useSkill(st, u, s, pick(targetsOf(st, u, s)));
          return { skip: true, log: log.concat([`${u.name} (${a.name}) agit seul !`], r.log), fx: fx.concat(r.fx), acted: true };
        }
      }
    }
    return { skip: false, log, fx };
  }

  // ----- Utilisation d'une compétence -----
  function useSkill(st, actor, skill, target) {
    const log = [`${actor.name} : ${skill.name}`], fx = [];
    const targets = skill.aoe ? targetsOf(st, actor, skill) : [target];
    const allies = actor.side === 'hero' ? st.heroes : st.enemies, foes = actor.side === 'hero' ? st.enemies : st.heroes;
    const lf = lightFx(st.light), enemyBonus = actor.side === 'enemy';
    const am = mods(actor);
    for (let t of targets) {
      if (!t || t.dead) continue;
      if (skill.side === 'enemy') {
        if (!skill.aoe && t.st.guard) { const g = find(st, t.st.guard.by); if (g && !g.dead) { log.push(`${g.name} protège ${t.name}.`); t = g; } }
        const pureStress = !skill.dmg;
        const hit = clamp(stat(actor, 'acc') + (skill.acc || 0) - stat(t, 'dodge') - (actor.st.curse ? 15 : 0), 5, 95);
        if (!pureStress && R() * 100 >= hit) { log.push(`${t.name} esquive.`); fx.push({ uid: t.uid, type: 'raté' }); continue; }
        const isCrit = !pureStress && !t.corpse && R() * 100 < stat(actor, 'crit') + (skill.crit || 0) + (enemyBonus ? lf.enemyCrit : 0);
        if (!pureStress) {
          let d = ri(actor.dmg) * skill.dmg * (1 + 0.1 * (actor.lvl - 1)) * (1 + am.dmg) * (enemyBonus ? 1 + lf.enemyDmg : 1);
          if (isCrit) d *= 1.5;
          if (t.st.mark) d *= 1.3;
          if (actor.st.curse) d *= 0.75;
          d = Math.max(1, Math.round(d * (1 - stat(t, 'prot'))));
          fx.push({ uid: t.uid, type: isCrit ? 'crit' : 'dmg', amount: d });
          log.push(`${t.name} perd ${d} PV${isCrit ? ' (CRITIQUE !)' : ''}.`);
          const wasCorpse = t.corpse;
          hurt(st, t, d, log);
          if (t.dead || (t.corpse && !wasCorpse) || t.corpse) continue;
        }
        if (skill.bleed) t.st.bleed.push({ dmg: skill.bleed[0], turns: skill.bleed[1] });
        if (skill.burn) t.st.burn.push({ dmg: skill.burn[0], turns: skill.burn[1] });
        if (skill.mark) t.st.mark = Math.max(t.st.mark, skill.mark);
        if (skill.curse) t.st.curse = Math.max(t.st.curse, skill.curse);
        if (skill.stun) {
          if (R() * 100 < skill.stun - (t.boss ? 30 : 0)) { t.st.stun = true; log.push(`${t.name} est étourdi !`); } else log.push(`${t.name} résiste à l'étourdissement.`);
        }
        if (skill.push || skill.pull) {
          if (R() * 100 < t.moveRes) log.push(`${t.name} tient sa position.`);
          else if (moveUnit(foes, t, skill.push || -skill.pull)) { log.push(`${t.name} est ${skill.push ? 'repoussé' : 'attiré'} !`); fx.push({ uid: t.uid, type: 'bouge' }); }
        }
        if (skill.disease && t.side === 'hero' && R() * 100 < skill.disease[1] && !t.diseases.includes(skill.disease[0])) {
          t.diseases.push(skill.disease[0]); log.push(`${t.name} contracte : ${D.DISEASES[skill.disease[0]].name} !`);
        }
        const s = addStress(t, (skill.stress || 0) * (isCrit ? 1.5 : 1) + (isCrit && t.side === 'hero' ? 10 : 0), log, st.light);
        if (s) fx.push({ uid: t.uid, type: 'stress', amount: s });
        if (isCrit && actor.side === 'hero') line(allies).forEach(h => addStress(h, -4, log));
      } else {
        if (skill.heal) {
          const refuse = t !== actor && t.affliction && D.AFFLICTIONS[t.affliction].refuseHeal && R() < 0.5;
          if (refuse) log.push(`${t.name} (${D.AFFLICTIONS[t.affliction].name}) refuse les soins !`);
          else { const h = heal(t, ri(skill.heal), log); fx.push({ uid: t.uid, type: 'soin', amount: h }); if (!skill.aoe) log.push(`${t.name} récupère ${h} PV.`); }
        }
        if (skill.stressHeal) { const s = addStress(t, -skill.stressHeal, log); if (s) fx.push({ uid: t.uid, type: 'calme', amount: -s }); }
        if (skill.cleanse) { t.st.bleed = []; t.st.burn = []; t.st.curse = 0; log.push(`${t.name} est purifié.`); }
        if (skill.guard) { t.st.guard = { by: actor.uid, turns: skill.guard }; log.push(`${actor.name} protège ${t.name}.`); }
        if (skill.buff) t.st.buff = { crit: skill.buff.crit, turns: skill.buff.turns };
      }
    }
    if (skill.shuffle) { shuffleLine(foes); log.push("L'équipe est dispersée !"); }
    if (skill.selfMove && !actor.dead && moveUnit(allies, actor, skill.selfMove)) log.push(`${actor.name} ${skill.selfMove < 0 ? 'avance' : 'recule'}.`);
    renumber(st.heroes); renumber(st.enemies);
    return { log, fx };
  }

  // IA ennemie : compétence utilisable ; sinon se déplacer vers une position utile ; sinon frapper quand même
  function enemyChoice(st, u) {
    const usable = u.skills.filter(s => canUse(st, u, s));
    if (usable.length) {
      const skill = pick(usable), ts = targetsOf(st, u, skill);
      const marked = ts.filter(t => t.st.mark), pool = marked.length && R() < 0.6 ? marked : ts;
      return { skill, target: pick(pool) };
    }
    const wanted = u.skills.filter(s => targetsOf(st, u, s).length).flatMap(s => s.from);
    const n = line(st.enemies).length;
    const goal = wanted.filter(p => p <= n).sort((a, b) => Math.abs(a - u.pos) - Math.abs(b - u.pos))[0];
    if (goal && goal !== u.pos) return { move: Math.sign(goal - u.pos) };
    const any = u.skills.filter(s => targetsOf(st, u, s).length);
    if (!any.length) return null;
    const skill = pick(any);
    return { skill, target: pick(targetsOf(st, u, skill)) };
  }
  function enemyMove(st, u, delta) { moveUnit(st.enemies, u, delta); return { log: [`${u.name} se repositionne.`], fx: [] }; }

  function outcome(st) {
    if (!line(st.heroes).length) return 'defaite';
    if (!fighters(st.enemies).length) return 'victoire';
    if (st.round > 40) return 'fuite';
    return null;
  }

  // Fin de combat : statuts retirés, buffs de camp décomptés, seuil de la mort conservé
  function endCombat(heroes) {
    heroes.forEach(h => {
      h.st = freshStatus();
      h.campBuffs = (h.campBuffs || []).map(b => Object.assign({}, b, { fights: b.fights - 1 })).filter(b => b.fights > 0);
    });
  }

  function syncSave(save, heroes) {
    heroes.forEach(h => Object.assign(save.heroes[h.id], { hp: h.dead ? 0 : h.hp, stress: h.stress, quirks: h.quirks.slice(), diseases: h.diseases.slice(), affliction: h.affliction }));
  }
  // Retour au hameau : héros tombés -> 1 PV (ou perdus en mort permanente)
  function returnHome(save) {
    Object.values(save.heroes).forEach(s => { if (!s.lost && s.hp <= 0) { if (save.permadeath) s.lost = true; else s.hp = 1; } });
  }

  Object.assign(L, { newSave, newHeroSave, migrate, heroMaxHp, mods, lightFx, makeHero, makeEnemy, makeCombat, line, fighters, renumber, moveUnit,
    shuffleLine, stat, addStress, resolve, kill, hurt, heal, turnOrder, targetsOf, canUse, swapTargets, swap, startTurn, useSkill, enemyChoice,
    enemyMove, outcome, endCombat, syncSave, returnHome, ri, pick });
  if (typeof module !== 'undefined') module.exports = L; else root.LOGIC = L;
})(this);
