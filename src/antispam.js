/**
 * antispam.js
 * Module untuk anti-spam dengan cooldown system
 * - Per user cooldown (global)
 * - Per command cooldown
 * - Warn & ban system
 *
 * Usage:
 * const spam = require('./src/antispam')
 * if (!spam.canExecute(sender, cmd)) {
 *   await reply(`Tunggu ${spam.getRemainingTime(sender, cmd)}ms`)
 *   return
 * }
 * spam.recordCommand(sender, cmd)
 */

const fs = require('fs')
const path = require('path')

const SPAM_DB_PATH = path.join(__dirname, '..', 'spamdb.json')

// Config (bisa diubah sesuai kebutuhan)
const CONFIG = {
  globalCooldown: 1000,           // 1 detik cooldown global per user
  commandCooldown: {
    hunt: 5000,                   // hunt 5 detik
    fish: 5000,                   // fish 5 detik
    fish_ing: 5000,               // fishing 5 detik
    battle: 10000,                // battle 10 detik
    tts: 2000,                    // tts 2 detik
    upload: 3000,                 // upload 3 detik
    ttt: 1000,                    // tictactoe 1 detik (move cepat)
    default: 500                  // default cooldown 500ms
  },
  maxWarnings: 3,                 // max warn sebelum banned
  banDuration: 3600000,           // ban 1 jam (ms)
  warnResetTime: 86400000         // reset warn setelah 24 jam (ms)
}

// In-memory cache (lebih cepat dari file)
let spamData = {}
let banData = {}

/**
 * Load spam data dari file
 */
function loadSpamDB() {
  try {
    if (!fs.existsSync(SPAM_DB_PATH)) {
      fs.writeFileSync(SPAM_DB_PATH, JSON.stringify({ users: {}, bans: {} }, null, 2), 'utf8')
      return { users: {}, bans: {} }
    }
    const raw = fs.readFileSync(SPAM_DB_PATH, 'utf8')
    return JSON.parse(raw || '{"users":{},"bans":{}}')
  } catch (e) {
    console.error('[AntiSpam] Load DB error:', e.message)
    return { users: {}, bans: {} }
  }
}

/**
 * Save spam data ke file
 */
function saveSpamDB() {
  try {
    fs.writeFileSync(SPAM_DB_PATH, JSON.stringify({ users: spamData, bans: banData }, null, 2), 'utf8')
  } catch (e) {
    console.error('[AntiSpam] Save DB error:', e.message)
  }
}

/**
 * Initialize (load data dari file ke memory)
 */
function init() {
  const db = loadSpamDB()
  spamData = db.users || {}
  banData = db.bans || {}
  console.log('[AntiSpam] Initialized')
}

/**
 * isBanned(jid) -> boolean
 * Cek apakah user sudah di-ban
 */
function isBanned(jid) {
  if (!banData[jid]) return false
  const ban = banData[jid]
  const now = Date.now()
  
  // check if ban sudah expired
  if (now > ban.expiresAt) {
    delete banData[jid]
    saveSpamDB()
    return false
  }
  
  return true
}

/**
 * getBanInfo(jid) -> { reason, expiresAt, remainingTime } or null
 */
function getBanInfo(jid) {
  if (!banData[jid]) return null
  const ban = banData[jid]
  const now = Date.now()
  const remaining = ban.expiresAt - now
  
  if (remaining <= 0) {
    delete banData[jid]
    saveSpamDB()
    return null
  }
  
  return {
    reason: ban.reason,
    expiresAt: ban.expiresAt,
    remainingTime: remaining
  }
}

/**
 * canExecute(jid, cmd) -> boolean
 * Cek apakah user bisa execute command (bukan spam)
 */
function canExecute(jid, cmd) {
  // cek ban
  if (isBanned(jid)) return false
  
  const now = Date.now()
  const key = `${jid}:${cmd}`
  
  if (!spamData[jid]) spamData[jid] = {}
  
  const userData = spamData[jid]
  const lastCmd = userData.lastCmd || 0
  const globalCD = now - lastCmd
  const globalCooldown = CONFIG.globalCooldown
  
  // check global cooldown
  if (globalCD < globalCooldown) return false
  
  // check command-specific cooldown
  const cmdCooldown = CONFIG.commandCooldown[cmd] || CONFIG.commandCooldown.default
  const lastCmdTime = userData[key] || 0
  const cmdCD = now - lastCmdTime
  
  return cmdCD >= cmdCooldown
}

/**
 * getRemainingTime(jid, cmd) -> number (ms)
 * Ambil sisa cooldown time
 */
function getRemainingTime(jid, cmd) {
  const now = Date.now()
  const key = `${jid}:${cmd}`
  
  if (!spamData[jid]) spamData[jid] = {}
  
  const userData = spamData[jid]
  const lastCmd = userData.lastCmd || 0
  const globalCD = now - lastCmd
  const globalCooldown = CONFIG.globalCooldown
  
  // prioritize global cooldown jika masih aktif
  if (globalCD < globalCooldown) {
    return globalCooldown - globalCD
  }
  
  // otherwise check command cooldown
  const cmdCooldown = CONFIG.commandCooldown[cmd] || CONFIG.commandCooldown.default
  const lastCmdTime = userData[key] || 0
  const cmdCD = now - lastCmdTime
  
  if (cmdCD < cmdCooldown) {
    return cmdCooldown - cmdCD
  }
  
  return 0
}

/**
 * recordCommand(jid, cmd)
 * Record bahwa user sudah execute command (update timestamp)
 */
function recordCommand(jid, cmd) {
  const now = Date.now()
  const key = `${jid}:${cmd}`
  
  if (!spamData[jid]) spamData[jid] = {}
  
  spamData[jid][key] = now
  spamData[jid].lastCmd = now
  
  // soft save (bisa batch save nanti)
  saveSpamDB()
}

/**
 * addWarning(jid, reason) -> { warnings, banned }
 * Tambah warning ke user. Return info warn & apakah di-ban
 */
function addWarning(jid, reason = 'Spam') {
  const now = Date.now()
  
  if (!spamData[jid]) spamData[jid] = {}
  
  const userData = spamData[jid]
  const warns = userData.warnings || []
  
  // reset warnings jika sudah lama
  const recentWarns = warns.filter(w => (now - w.timestamp) < CONFIG.warnResetTime)
  recentWarns.push({ reason, timestamp: now })
  
  userData.warnings = recentWarns
  
  const banned = recentWarns.length >= CONFIG.maxWarnings
  
  if (banned) {
    banData[jid] = {
      reason: 'Too many warnings: ' + reason,
      bannedAt: now,
      expiresAt: now + CONFIG.banDuration,
      warningCount: recentWarns.length
    }
  }
  
  saveSpamDB()
  
  return {
    warnings: recentWarns.length,
    maxWarnings: CONFIG.maxWarnings,
    banned: banned,
    banDurationMs: CONFIG.banDuration
  }
}

/**
 * removeWarning(jid)
 * Hapus semua warning user (admin command)
 */
function removeWarning(jid) {
  if (spamData[jid]) {
    spamData[jid].warnings = []
  }
  saveSpamDB()
}

/**
 * unban(jid)
 * Unban user (admin command)
 */
function unban(jid) {
  if (banData[jid]) {
    delete banData[jid]
    saveSpamDB()
    return true
  }
  return false
}

/**
 * getStats(jid) -> { lastCmd, warnings, banned, ... }
 * Ambil info spam stats user
 */
function getStats(jid) {
  const userData = spamData[jid] || {}
  const banInfo = getBanInfo(jid)
  
  return {
    lastCmd: userData.lastCmd || null,
    warnings: (userData.warnings || []).length,
    maxWarnings: CONFIG.maxWarnings,
    banned: banInfo ? true : false,
    banInfo: banInfo
  }
}

/**
 * reset(jid)
 * Reset spam data user (admin command)
 */
function reset(jid) {
  if (spamData[jid]) {
    delete spamData[jid]
  }
  if (banData[jid]) {
    delete banData[jid]
  }
  saveSpamDB()
}

/**
 * handleSpamCommand(conn, message, jid, cmd)
 * Middleware untuk check spam (bisa digunakan di setiap command handler)
 * 
 * Usage:
 * const spam = require('./src/antispam')
 * const canExec = spam.handleSpamCommand(conn, message, jid, cmd)
 * if (!canExec) return // sudah di-handle oleh fungsi
 */
async function handleSpamCommand(conn, message, jid, cmd) {
  const { MessageType } = require('@adiwajshing/baileys')
  
  // cek ban
  if (isBanned(jid)) {
    const banInfo = getBanInfo(jid)
    const remaining = Math.ceil(banInfo.remainingTime / 1000)
    await conn.sendMessage(jid, `🚫 Kamu di-ban! Alasan: ${banInfo.reason}\nSisa waktu: ${remaining}s`, MessageType.text, { quoted: message })
    return false
  }
  
  // cek cooldown
  if (!canExecute(jid, cmd)) {
    const remaining = getRemainingTime(jid, cmd)
    const remainingMs = Math.ceil(remaining / 100) / 10
    await conn.sendMessage(jid, `⏱️ Tunggu ${remainingMs}s sebelum menggunakan command ini lagi.`, MessageType.text, { quoted: message })
    return false
  }
  
  return true
}

module.exports = {
  init,
  isBanned,
  getBanInfo,
  canExecute,
  getRemainingTime,
  recordCommand,
  addWarning,
  removeWarning,
  unban,
  getStats,
  reset,
  handleSpamCommand,
  CONFIG
}