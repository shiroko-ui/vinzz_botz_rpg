// ...existing code...
/**
 * converter.js
 * Helper konversi & formatting untuk fitur RPG (angka, waktu, progress bar, inventory -> teks, dll.)
 */

function formatNumber(n) {
  if (n === null || n === undefined) return '0'
  return Number(n).toLocaleString('id-ID')
}

function formatCurrency(n, symbol = 'Gold') {
  return `${formatNumber(n)} ${symbol}`
}

function secondsToHMS(sec) {
  sec = Math.max(0, Math.floor(sec || 0))
  const h = Math.floor(sec / 3600)
  const m = Math.floor((sec % 3600) / 60)
  const s = sec % 60
  if (h > 0) return `${h}j ${m}m ${s}d`
  if (m > 0) return `${m}m ${s}d`
  return `${s}d`
}

function clamp(v, a = 0, b = 1) {
  return Math.max(a, Math.min(b, v))
}

/**
 * progressBar(current, max, length = 12, chars = {filled:'█', empty:'░'})
 * Mengembalikan string bar dan persentase. Contoh: "██████░░░░ 50%"
 */
function progressBar(current, max, length = 12, chars = { filled: '█', empty: '░' }) {
  const cur = Math.max(0, Number(current || 0))
  const mx = Math.max(1, Number(max || 1))
  const ratio = clamp(cur / mx, 0, 1)
  const filledLen = Math.round(ratio * length)
  const bar = chars.filled.repeat(filledLen) + chars.empty.repeat(length - filledLen)
  const pct = Math.round(ratio * 100)
  return `${bar} ${pct}%`
}

/**
 * hpBar(user) -> string
 * Membuat bar HP menggunakan user.darah / user.maxDarah
 */
function hpBar(user, length = 12) {
  const hp = Number(user.darah || 0)
  const max = Number(user.maxDarah || 1)
  return progressBar(hp, max, length, { filled: '❤️', empty: '🖤' })
}

/**
 * itemName(id) -> nama item dari global.rpg.items atau id jika tidak ada
 */
function itemName(id) {
  if (!id) return ''
  try {
    if (global.rpg && global.rpg.items && global.rpg.items[id] && global.rpg.items[id].name) {
      return global.rpg.items[id].name
    }
  } catch (e) { /* ignore */ }
  return id
}

/**
 * parseQty(text) -> angka yang di-parse (ambil int pertama), fallback 1
 */
function parseQty(text) {
  if (!text) return 1
  const m = String(text).match(/(\d+)/)
  if (!m) return 1
  const v = parseInt(m[1], 10)
  return isNaN(v) ? 1 : Math.max(1, v)
}

/**
 * inventoryToText(db, jid) -> teks inventory user rapi
 */
function inventoryToText(db, jid) {
  const user = (db && db[jid]) || {}
  const inv = user.inventory || {}
  const lines = []
  const keys = Object.keys(inv)
  if (keys.length === 0) lines.push('- (kosong)')
  else keys.forEach(k => lines.push(`- ${itemName(k)} (${k}): ${inv[k]}`))
  lines.push(`Potion: ${user.potion || 0}`)
  lines.push(`Umpan: ${user.umpan || 0}`)
  return lines.join('\n')
}

/**
 * humanize(obj) -> string ringkas (untuk debug)
 */
function humanize(o) {
  try { return JSON.stringify(o, null, 2) } catch (e) { return String(o) }
}

module.exports = {
  formatNumber,
  formatCurrency,
  secondsToHMS,
  progressBar,
  hpBar,
  itemName,
  parseQty,
  inventoryToText,
  humanize
}
// ...existing code...