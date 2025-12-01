// Utility math untuk fitur RPG (damage, xp, fight simulation, dll.)

function rand(min, max) {
  min = Math.floor(min); max = Math.floor(max)
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function clamp(v, a, b) {
  return Math.max(a, Math.min(b, v))
}

// Ambil fungsi xpToLevel dari global jika tersedia, kalau tidak gunakan fallback
function xpToLevel(level) {
  if (global.rpg && typeof global.rpg.xpToLevel === 'function') {
    return global.rpg.xpToLevel(level)
  }
  return Math.floor(100 * Math.pow(level, 1.5))
}

// Damage dasar: memperhitungkan attack vs defense, dengan variasi kecil
function calcDamage(attack, defense, opts = {}) {
  const variance = typeof opts.variance === 'number' ? clamp(opts.variance, 0, 1) : 0.12
  const minDamage = Math.max(1, opts.minDamage || 1)
  // sederhana: defense mengurangi efek attack, tapi tidak 1:1
  const base = Math.max(0, attack - Math.floor(defense / 2))
  const varAmt = Math.max(0, Math.floor(base * variance))
  const dmg = base + rand(-varAmt, varAmt)
  return Math.max(minDamage, dmg)
}

// Probabilitas serangan kena berdasarkan attack vs defense
function hitChance(attack, defense) {
  // base 75% + pengaruh selisih attack-def * 2%
  const diff = attack - defense
  let chance = 0.75 + diff * 0.02
  chance = clamp(chance, 0.1, 0.95)
  return chance
}

// Chance kritikal (default 5% + 0.5% per point attack/50)
function critChance(attack, opts = {}) {
  const base = typeof opts.base === 'number' ? opts.base : 0.05
  const scale = typeof opts.scale === 'number' ? opts.scale : 0.005
  return clamp(base + (attack * scale), 0, 0.5)
}

// Simulasikan pertarungan sederhana (turn-based). 
// attacker/defender: { attack, defense, darah, maxDarah, level, name(optional) }
// Mengembalikan objek hasil { winner, turns, attackerHp, defenderHp, exp, gold }
function simulateFight(attacker, defender, options = {}) {
  // clone agar tidak merusak objek asli
  const a = Object.assign({}, attacker)
  const d = Object.assign({}, defender)
  const maxTurns = options.maxTurns || 100
  let turns = 0

  while (turns < maxTurns && (a.darah > 0 && d.darah > 0)) {
    // attacker turn
    turns++
    if (Math.random() < hitChance(a.attack, d.defense)) {
      let dmg = calcDamage(a.attack, d.defense, options)
      if (Math.random() < critChance(a.attack, options)) dmg = Math.floor(dmg * (options.critMultiplier || 1.5))
      d.darah = Math.max(0, d.darah - dmg)
    }
    if (d.darah <= 0) break

    // defender turn
    if (Math.random() < hitChance(d.attack, a.defense)) {
      let dmg = calcDamage(d.attack, a.defense, options)
      if (Math.random() < critChance(d.attack, options)) dmg = Math.floor(dmg * (options.critMultiplier || 1.4))
      a.darah = Math.max(0, a.darah - dmg)
    }
  }

  const winner = (a.darah > 0 && d.darah <= 0) ? 'attacker' : ((d.darah > 0 && a.darah <= 0) ? 'defender' : 'draw')
  // reward sederhana berdasarkan level target
  const exp = Math.max(3, Math.floor((defender.level || 1) * (5 + Math.random() * 5)))
  const gold = Math.max(1, Math.floor((defender.level || 1) * rand(3, 10)))

  return {
    winner,
    turns,
    attackerHp: a.darah,
    defenderHp: d.darah,
    exp: winner === 'attacker' ? exp : 0,
    gold: winner === 'attacker' ? gold : 0
  }
}

module.exports = {
  rand,
  clamp,
  xpToLevel,
  calcDamage,
  hitChance,
  critChance,
  simulateFight
}