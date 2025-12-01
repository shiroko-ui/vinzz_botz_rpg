/**
 * jadibot.js
 * Module untuk fitur "Jadi Bot" - user bisa membuat bot WA mereka sendiri
 * 
 * Features:
 * - Create sub-bot dari nomor user
 * - Simple command handler untuk sub-bot
 * - Manage multiple bots dari satu master bot
 * - Premium feature (butuh cost)
 *
 * Usage:
 * const jadibot = require('./src/jadibot')
 * jadibot.init()
 * await jadibot.createBot(userJid, options)
 */

const fs = require('fs')
const path = require('path')
const { WAConnection, MessageType } = require('@adiwajshing/baileys')

const BOTS_DB_PATH = path.join(__dirname, '..', 'jadibot_db.json')
const BOTS_SESSIONS_DIR = path.join(__dirname, '..', 'jadibot_sessions')

// Config
const CONFIG = {
  maxBotsPerUser: 1,              // max bot per user
  creationCost: 50000,            // cost dalam currency (gold/diamond)
  sessionTimeout: 3600000,        // 1 jam timeout session
  maxRetries: 3,
  retryDelay: 5000
}

// In-memory storage
let botsDB = {}
let activeBots = {}

/**
 * Ensure directories exist
 */
function ensureDirs() {
  if (!fs.existsSync(BOTS_SESSIONS_DIR)) {
    fs.mkdirSync(BOTS_SESSIONS_DIR, { recursive: true })
  }
}

/**
 * Load bots database
 */
function loadBotsDB() {
  try {
    ensureDirs()
    if (!fs.existsSync(BOTS_DB_PATH)) {
      fs.writeFileSync(BOTS_DB_PATH, JSON.stringify({}, null, 2), 'utf8')
      return {}
    }
    const raw = fs.readFileSync(BOTS_DB_PATH, 'utf8')
    return JSON.parse(raw || '{}')
  } catch (e) {
    console.error('[JadiBot] Load DB error:', e.message)
    return {}
  }
}

/**
 * Save bots database
 */
function saveBotsDB() {
  try {
    fs.writeFileSync(BOTS_DB_PATH, JSON.stringify(botsDB, null, 2), 'utf8')
  } catch (e) {
    console.error('[JadiBot] Save DB error:', e.message)
  }
}

/**
 * Initialize
 */
function init() {
  botsDB = loadBotsDB()
  ensureDirs()
  console.log('[JadiBot] Initialized | Active Bots:', Object.keys(botsDB).length)
}

/**
 * getUserBots(userJid) -> array
 */
function getUserBots(userJid) {
  return Object.values(botsDB).filter(b => b.owner === userJid)
}

/**
 * getBot(botId) -> bot object
 */
function getBot(botId) {
  return botsDB[botId] || null
}

/**
 * createBot(userJid, options)
 * options: { phoneNumber, botName, prefix, cost }
 * 
 * Returns: { success, botId, message }
 */
async function createBot(userJid, options = {}) {
  try {
    // Check user bots count
    const userBots = getUserBots(userJid)
    if (userBots.length >= CONFIG.maxBotsPerUser) {
      return {
        success: false,
        message: `Limit bot terpenuhi (max ${CONFIG.maxBotsPerUser} bot per user)`
      }
    }

    // Extract options
    const phoneNumber = String(options.phoneNumber || '').replace(/\D/g, '')
    const botName = options.botName || `Bot-${phoneNumber}`
    const prefix = options.prefix || '!'
    const cost = options.cost || CONFIG.creationCost

    if (!phoneNumber || phoneNumber.length < 10) {
      return {
        success: false,
        message: 'Nomor telepon tidak valid'
      }
    }

    // Generate bot ID
    const botId = `bot_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    const sessionPath = path.join(BOTS_SESSIONS_DIR, `${botId}.json`)

    // Create bot entry
    botsDB[botId] = {
      botId,
      owner: userJid,
      phoneNumber,
      botName,
      prefix,
      sessionPath,
      createdAt: Date.now(),
      lastActive: Date.now(),
      isActive: false,
      messageCount: 0,
      commands: {} // custom commands bisa ditambah user
    }

    saveBotsDB()

    return {
      success: true,
      botId,
      message: `Bot berhasil dibuat!\nID: ${botId}\nNama: ${botName}\nPrefix: ${prefix}`
    }
  } catch (e) {
    console.error('[JadiBot] Create bot error:', e)
    return {
      success: false,
      message: 'Gagal membuat bot: ' + (e.message || e)
    }
  }
}

/**
 * startBot(botId, onMessage)
 * Start sub-bot connection
 * onMessage(message) callback untuk setiap pesan masuk
 */
async function startBot(botId, onMessage) {
  try {
    const bot = getBot(botId)
    if (!bot) throw new Error('Bot not found')

    const conn = new WAConnection()
    const sessionPath = bot.sessionPath

    // Load session jika ada
    if (fs.existsSync(sessionPath)) {
      try {
        const sessionData = JSON.parse(fs.readFileSync(sessionPath, 'utf8'))
        conn.loadAuthInfo(sessionData)
        console.log(`[JadiBot] Session loaded for ${botId}`)
      } catch (e) {
        console.warn(`[JadiBot] Failed to load session: ${e.message}`)
      }
    }

    // Save session on open
    conn.on('open', () => {
      try {
        const authInfo = conn.base64EncodedAuthInfo()
        fs.writeFileSync(sessionPath, JSON.stringify(authInfo, null, 2), 'utf8')
        console.log(`[JadiBot] Session saved for ${botId}`)
      } catch (e) {
        console.error(`[JadiBot] Failed to save session: ${e.message}`)
      }
    })

    // Handle messages
    conn.on('chat-update', async (chatUpdate) => {
      try {
        if (!chatUpdate.hasNewMessage) return

        const message = chatUpdate.messages.all()[0]
        if (!message || !message.message) return

        // Update bot activity
        botsDB[botId].lastActive = Date.now()
        botsDB[botId].messageCount = (botsDB[botId].messageCount || 0) + 1

        // Call onMessage callback
        if (typeof onMessage === 'function') {
          await onMessage(message, conn)
        }
      } catch (e) {
        console.error(`[JadiBot] Message handler error: ${e.message}`)
      }
    })

    // Handle disconnect
    conn.on('close', ({ reason }) => {
      console.warn(`[JadiBot] Bot ${botId} disconnected: ${reason}`)
      botsDB[botId].isActive = false
      saveBotsDB()
    })

    // Connect
    await conn.connect()
    botsDB[botId].isActive = true
    saveBotsDB()

    // Store connection
    activeBots[botId] = conn

    console.log(`[JadiBot] Bot ${botId} is running`)
    return { success: true, connection: conn }
  } catch (e) {
    console.error(`[JadiBot] Start bot error: ${e.message}`)
    return { success: false, error: e.message }
  }
}

/**
 * stopBot(botId)
 */
async function stopBot(botId) {
  try {
    const conn = activeBots[botId]
    if (!conn) return { success: false, message: 'Bot not connected' }

    await conn.close()
    delete activeBots[botId]

    if (botsDB[botId]) {
      botsDB[botId].isActive = false
      saveBotsDB()
    }

    return { success: true, message: 'Bot stopped' }
  } catch (e) {
    console.error(`[JadiBot] Stop bot error: ${e.message}`)
    return { success: false, error: e.message }
  }
}

/**
 * deleteBot(botId, userJid)
 */
function deleteBot(botId, userJid) {
  try {
    const bot = getBot(botId)
    if (!bot) return { success: false, message: 'Bot not found' }

    if (bot.owner !== userJid) {
      return { success: false, message: 'Bukan bot kamu' }
    }

    // Delete session file
    if (fs.existsSync(bot.sessionPath)) {
      fs.unlinkSync(bot.sessionPath)
    }

    // Delete from DB
    delete botsDB[botId]
    delete activeBots[botId]
    saveBotsDB()

    return { success: true, message: 'Bot deleted' }
  } catch (e) {
    console.error(`[JadiBot] Delete bot error: ${e.message}`)
    return { success: false, error: e.message }
  }
}

/**
 * getBotInfo(botId) -> info
 */
function getBotInfo(botId) {
  const bot = getBot(botId)
  if (!bot) return null

  return {
    botId: bot.botId,
    name: bot.botName,
    owner: bot.owner,
    phone: bot.phoneNumber,
    prefix: bot.prefix,
    isActive: bot.isActive,
    createdAt: new Date(bot.createdAt).toLocaleString(),
    lastActive: new Date(bot.lastActive).toLocaleString(),
    messageCount: bot.messageCount
  }
}

/**
 * listBots(userJid) -> array of bot info
 */
function listBots(userJid) {
  const userBots = getUserBots(userJid)
  return userBots.map(bot => ({
    botId: bot.botId,
    name: bot.botName,
    prefix: bot.prefix,
    isActive: bot.isActive,
    messages: bot.messageCount
  }))
}

/**
 * addCustomCommand(botId, cmdName, response)
 */
function addCustomCommand(botId, cmdName, response) {
  const bot = getBot(botId)
  if (!bot) return false

  if (!bot.commands) bot.commands = {}
  bot.commands[cmdName.toLowerCase()] = response
  saveBotsDB()
  return true
}

/**
 * removeCustomCommand(botId, cmdName)
 */
function removeCustomCommand(botId, cmdName) {
  const bot = getBot(botId)
  if (!bot || !bot.commands) return false

  delete bot.commands[cmdName.toLowerCase()]
  saveBotsDB()
  return true
}

/**
 * getCustomCommand(botId, cmdName)
 */
function getCustomCommand(botId, cmdName) {
  const bot = getBot(botId)
  if (!bot || !bot.commands) return null
  return bot.commands[cmdName.toLowerCase()] || null
}

/**
 * handleJadiBotCommand(conn, message, cmd, args, sender)
 * Perintah jadibot untuk master bot
 */
async function handleJadiBotCommand(conn, message, cmd, args, sender) {
  const { MessageType } = require('@adiwajshing/baileys')
  const jid = message.key.remoteJid

  const reply = async (text) => {
    await conn.sendMessage(jid, text, MessageType.text, { quoted: message })
  }

  cmd = (cmd || '').toLowerCase()

  if (cmd === 'jadibot') {
    const sub = (args[0] || '').toLowerCase()

    if (sub === 'create') {
      const phone = args[1]
      const botName = args.slice(2).join(' ') || `Bot-${phone}`

      if (!phone) {
        await reply('Format: jadibot create <nomor> [nama bot]')
        return
      }

      const result = await createBot(sender, {
        phoneNumber: phone,
        botName: botName,
        prefix: '!'
      })

      if (result.success) {
        await reply(result.message)
      } else {
        await reply(`❌ ${result.message}`)
      }
    } else if (sub === 'list') {
      const bots = listBots(sender)
      if (bots.length === 0) {
        await reply('Kamu belum punya bot')
      } else {
        const text = bots.map((b, i) => {
          return `${i + 1}. ${b.name}\nID: ${b.botId}\nPrefix: ${b.prefix}\nStatus: ${b.isActive ? '✅ Active' : '❌ Offline'}\nPesan: ${b.messages}`
        }).join('\n\n')
        await reply(`📋 Bot Kamu:\n\n${text}`)
      }
    } else if (sub === 'info') {
      const botId = args[1]
      if (!botId) {
        await reply('Format: jadibot info <botId>')
        return
      }

      const info = getBotInfo(botId)
      if (!info) {
        await reply('Bot tidak ditemukan')
        return
      }

      const text = `*Info Bot*\nNama: ${info.name}\nID: ${info.botId}\nPrefix: ${info.prefix}\nStatus: ${info.isActive ? '✅ Online' : '❌ Offline'}\nTerbuat: ${info.createdAt}\nPesan: ${info.messageCount}`
      await reply(text)
    } else if (sub === 'delete') {
      const botId = args[1]
      if (!botId) {
        await reply('Format: jadibot delete <botId>')
        return
      }

      const result = deleteBot(botId, sender)
      await reply(result.success ? '✅ Bot deleted' : `❌ ${result.message}`)
    } else if (sub === 'help') {
      const help = [
        '*Jadibot Commands*',
        '',
        'jadibot create <nomor> [nama]',
        'jadibot list',
        'jadibot info <botId>',
        'jadibot delete <botId>'
      ].join('\n')
      await reply(help)
    } else {
      await reply('Subcommand tidak dikenal. Ketik: jadibot help')
    }

    return true
  }

  return false
}

module.exports = {
  init,
  createBot,
  startBot,
  stopBot,
  deleteBot,
  getBot,
  getBotInfo,
  listBots,
  getUserBots,
  addCustomCommand,
  removeCustomCommand,
  getCustomCommand,
  handleJadiBotCommand,
  activeBots,
  CONFIG
}