// ...existing code...
const fs = require('fs')
const path = require('path')

const rpgFile = path.join(__dirname, '..', 'rpgdb.json')

function ensureFile(file, initial = '{}') {
  try {
    if (!fs.existsSync(file)) fs.writeFileSync(file, initial, 'utf8')
  } catch (e) { /* ignore */ }
}

function loadRpgDB() {
  try {
    ensureFile(rpgFile, '{}')
    const raw = fs.readFileSync(rpgFile, 'utf8') || '{}'
    return JSON.parse(raw)
  } catch (e) {
    console.error('loadRpgDB error:', e)
    return {}
  }
}

function saveRpgDB(db) {
  try {
    fs.writeFileSync(rpgFile, JSON.stringify(db, null, 2), 'utf8')
    return true
  } catch (e) {
    console.error('saveRpgDB error:', e)
    return false
  }
}

function rand(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function ensureUser(db, jid) {
  if (!db[jid]) {
    if (global.rpg && typeof global.rpg.generateStarter === 'function') db[jid] = global.rpg.generateStarter()
    else db[jid] = {
      darah: 100, maxDarah: 100, besi: 0, gold: 0, emerald: 0, umpan: 0, potion: 0,
      exp: 0, level: 1, attack: 10, defense: 5, inventory: {}
    }
  }
  return db[jid]
}

/**
 * addExp(db, jid, xp) -> returns { leveled: bool, newLevel: number }
 */
function addExp(db, jid, xp) {
  const user = ensureUser(db, jid)
  user.exp = (user.exp || 0) + Math.max(0, Math.floor(xp || 0))
  let leveled = false
  const xpToLevel = (lvl) => (global.rpg && typeof global.rpg.xpToLevel === 'function')
    ? global.rpg.xpToLevel(lvl) : Math.floor(100 * Math.pow(lvl, 1.5))
  while (user.exp >= xpToLevel(user.level)) {
    const need = xpToLevel(user.level)
    user.exp -= need
    user.level += 1
    // apply growth if configured
    if (global.rpg && global.rpg.growth) {
      user.maxDarah = (user.maxDarah || 0) + (global.rpg.growth.darahPerLevel || 0)
      user.attack = (user.attack || 0) + (global.rpg.growth.attackPerLevel || 0)
      user.defense = (user.defense || 0) + (global.rpg.growth.defensePerLevel || 0)
    }
    user.darah = Math.min(user.maxDarah || 0, (user.darah || 0) + (global.rpg && global.rpg.growth ? (global.rpg.growth.darahPerLevel || 0) : 0))
    leveled = true
  }
  return { leveled, newLevel: user.level }
}

function addItem(db, jid, itemId, qty = 1) {
  const user = ensureUser(db, jid)
  qty = Math.max(1, Math.floor(qty))
  // convenience fields
  if (itemId === 'potion') user.potion = (user.potion || 0) + qty
  else if (itemId === 'umpan') user.umpan = (user.umpan || 0) + qty
  else {
    user.inventory = user.inventory || {}
    user.inventory[itemId] = (user.inventory[itemId] || 0) + qty
  }
  return true
}

function removeItem(db, jid, itemId, qty = 1) {
  const user = ensureUser(db, jid)
  qty = Math.max(1, Math.floor(qty))
  if (itemId === 'potion') {
    if ((user.potion || 0) < qty) return false
    user.potion -= qty
    return true
  } else if (itemId === 'umpan') {
    if ((user.umpan || 0) < qty) return false
    user.umpan -= qty
    return true
  } else {
    user.inventory = user.inventory || {}
    if ((user.inventory[itemId] || 0) < qty) return false
    user.inventory[itemId] -= qty
    if (user.inventory[itemId] <= 0) delete user.inventory[itemId]
    return true
  }
}

function usePotion(db, jid) {
  const user = ensureUser(db, jid)
  if ((user.potion || 0) <= 0) return { ok: false, reason: 'no_potion' }
  const heal = (global.rpg && global.rpg.items && global.rpg.items.potion && global.rpg.items.potion.heal) ? global.rpg.items.potion.heal : 50
  user.potion -= 1
  user.darah = Math.min(user.maxDarah || 0, (user.darah || 0) + heal)
  return { ok: true, healed: heal, hp: user.darah, maxHp: user.maxDarah }
}

function buyItem(db, jid, itemId, qty = 1) {
  const user = ensureUser(db, jid)
  qty = Math.max(1, Math.floor(qty))
  const def = global.rpg && global.rpg.items && global.rpg.items[itemId]
  if (!def) return { ok: false, reason: 'not_found' }
  const total = (def.price || 0) * qty
  if ((user.gold || 0) < total) return { ok: false, reason: 'no_money', need: total }
  user.gold -= total
  addItem(db, jid, itemId, qty)
  return { ok: true, bought: qty, item: itemId, remainGold: user.gold }
}

function shopText() {
  const shop = (global.rpg && global.rpg.shop) ? global.rpg.shop : []
  const items = []
  shop.forEach(it => {
    const def = (global.rpg && global.rpg.items && global.rpg.items[it.id]) || {}
    items.push(`- ${it.id} (${def.name || it.id}): ${def.price || it.price || 0} Gold / ${it.qty || 1}`)
  })
  return ['Toko:', ...items].join('\n')
}

function profileText(db, jid, pushName = 'Player') {
  const user = ensureUser(db, jid)
  const nextXp = (global.rpg && typeof global.rpg.xpToLevel === 'function') ? global.rpg.xpToLevel(user.level) : Math.floor(100 * Math.pow(user.level || 1, 1.5))
  return [
    `Profile ${pushName}`,
    `Level: ${user.level}`,
    `Exp: ${user.exp || 0}/${nextXp}`,
    `HP: ${user.darah || 0}/${user.maxDarah || 0}`,
    `Gold: ${user.gold || 0}`,
    `Besi: ${user.besi || 0}`,
    `Umpan: ${user.umpan || 0}`,
    `Potion: ${user.potion || 0}`
  ].join('\n')
}

function statsText(db, jid) {
  const user = ensureUser(db, jid)
  return [
    `Stats:`,
    `Attack: ${user.attack || 0}`,
    `Defense: ${user.defense || 0}`,
    `Max HP: ${user.maxDarah || 0}`
  ].join('\n')
}

function invText(db, jid) {
  const user = ensureUser(db, jid)
  const inv = user.inventory || {}
  const lines = ['Inventory:']
  const keys = Object.keys(inv)
  if (keys.length === 0) lines.push('- (kosong)')
  else keys.forEach(k => lines.push(`- ${k}: ${inv[k]}`))
  lines.push(`Potion: ${user.potion || 0}`)
  lines.push(`Umpan: ${user.umpan || 0}`)
  return lines.join('\n')
}

module.exports = {
  rpgFile,
  loadRpgDB,
  saveRpgDB,
  ensureUser,
  addExp,
  rand,
  addItem,
  removeItem,
  usePotion,
  buyItem,
  shopText,
  profileText,
  statsText,
  invText
}
// ...existing code...