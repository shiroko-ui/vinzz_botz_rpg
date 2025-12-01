/**
 * config.js
 * Main configuration & bot startup untuk Vinzz Bot (WhatsApp RPG)
 * Menggunakan @adiwajshing/baileys untuk koneksi WhatsApp
 */

const { WAConnection, MessageType } = require('@adiwajshing/baileys')
const fs = require('fs')
const path = require('path')

// Load global settings (prefix, owner, mess, rpg config, dll)
require('./settings.js')

// Load lib helpers
const funcs = require('./lib/function')
const { handleGame } = require('./lib/game')

const sessionDir = path.join(__dirname, 'sessions')
if (!fs.existsSync(sessionDir)) fs.mkdirSync(sessionDir, { recursive: true })

const sessionFilePath = path.join(sessionDir, 'session.json')

// Logger utility
const logger = {
  info: (...a) => console.log('[INFO]', ...a),
  error: (...a) => console.error('[ERROR]', ...a),
  warn: (...a) => console.warn('[WARN]', ...a)
}

/**
 * startBot() -> Promise<WAConnection>
 * Inisialisasi koneksi WhatsApp dan setup message handlers
 */
async function startBot() {
  const conn = new WAConnection()

  // Load session jika ada
  if (fs.existsSync(sessionFilePath)) {
    try {
      const sessionData = JSON.parse(fs.readFileSync(sessionFilePath, 'utf8'))
      conn.loadAuthInfo(sessionData)
      logger.info('Session loaded from', sessionFilePath)
    } catch (e) {
      logger.error('Failed to load session:', e.message)
    }
  }

  // Simpan session saat koneksi terbuka
  conn.on('open', () => {
    try {
      const authInfo = conn.base64EncodedAuthInfo()
      fs.writeFileSync(sessionFilePath, JSON.stringify(authInfo, null, 2), 'utf8')
      logger.info('Session saved')
    } catch (e) {
      logger.error('Failed to save session:', e.message)
    }
  })

  // Handle incoming messages
  conn.on('chat-update', async (chatUpdate) => {
    try {
      if (!chatUpdate.hasNewMessage) return

      const message = chatUpdate.messages.all()[0]
      if (!message || !message.message) return

      // Ignore status@broadcast
      if (message.key && message.key.remoteJid === 'status@broadcast') return

      // Extract message body
      let body = ''
      if (message.message.conversation) {
        body = message.message.conversation
      } else if (message.message.extendedTextMessage && message.message.extendedTextMessage.text) {
        body = message.message.extendedTextMessage.text
      } else if (message.message.imageMessage && message.message.imageMessage.caption) {
        body = message.message.imageMessage.caption
      }

      body = (body || '').trim()
      if (!body) return

      // Parse prefix & command
      const prefixes = Array.isArray(global.prefa) ? global.prefa : ['!']
      const usedPrefix = prefixes.find(p => p && body.startsWith(p)) ?? (prefixes.includes('') ? '' : null)
      if (usedPrefix === null) return

      const args = body.slice(usedPrefix.length).trim().split(/\s+/)
      const cmd = (args.shift() || '').toLowerCase()

      // Extract metadata
      const jid = message.key.remoteJid
      const sender = message.key.participant || message.key.remoteJid
      const pushName = message.pushName || 'User'
      const isGroup = jid.endsWith('@g.us')
      const isOwner = global.owner && global.owner.includes(sender)

      logger.info(`[${isGroup ? 'GROUP' : 'PRIVATE'}] ${pushName}: ${usedPrefix}${cmd}`)

      // Reply helper
      const reply = async (text, opts = {}) => {
        await conn.sendMessage(jid, text, MessageType.text, { quoted: message, ...opts })
      }

      // ======================
      // Command Handlers
      // ======================

      // Help / Menu
      if (cmd === 'help' || cmd === 'menu') {
        const prefixList = prefixes.join(', ')
        const help = [
          '*🎮 Vinzz Bot - RPG Mode*',
          '',
          '*📊 Perintah RPG:*',
          `${usedPrefix}profile     - Lihat profil & status`,
          `${usedPrefix}stats       - Lihat stat (ATK/DEF/HP)`,
          `${usedPrefix}hunt        - Berburu (+ EXP & Gold)`,
          `${usedPrefix}fish        - Memancing (butuh umpan)`,
          `${usedPrefix}shop        - Lihat toko`,
          `${usedPrefix}buy <id>    - Beli item`,
          `${usedPrefix}inventory   - Lihat inventory`,
          `${usedPrefix}use potion  - Gunakan potion`,
          '',
          `Prefix: ${prefixList}`
        ].join('\n')
        await reply(help)
        return
      }

      // Delegate ke game handler (RPG commands)
      if (await handleGame(conn, message, cmd, args)) return

      // Owner-only: API Key management
      if (cmd === 'generateapikey' || cmd === 'listapikeys' || cmd === 'revokeapikey') {
        if (!isOwner) {
          await reply(global.mess.owner || '⚠️ Owner only!')
          return
        }

        if (cmd === 'generateapikey') {
          const note = args.join(' ') || 'No description'
          const { id, key } = global.generateApiKey(note)
          const text = `✅ API Key Generated!\n\nID: ${id}\nKey: ${key}\n\n⚠️ Simpan key ini, hanya ditampilkan sekali!`
          await reply(text)
        } else if (cmd === 'listapikeys') {
          const list = global.listApiKeys()
          const text = (list.length > 0)
            ? list.map(k => `• ${k.id}\n  Note: ${k.note || 'N/A'}\n  Created: ${new Date(k.createdAt).toLocaleDateString()}`).join('\n')
            : 'No API keys yet'
          await reply(`📋 API Keys:\n\n${text}`)
        } else if (cmd === 'revokeapikey') {
          const id = args[0]
          if (!id) {
            await reply('Usage: revokeapikey <id>')
            return
          }
          const ok = global.revokeApiKey(id)
          await reply(ok ? '✅ API Key revoked!' : '❌ Key not found')
        }
        return
      }

      // Unknown command (optional: add easter egg atau search)
      // await reply(`Perintah '${cmd}' tidak dikenal. Ketik ${usedPrefix}help untuk melihat daftar perintah.`)

    } catch (err) {
      logger.error('Message handler error:', err)
      try {
        await conn.sendMessage(message.key.remoteJid, global.mess.error || '❌ Terjadi kesalahan', MessageType.text, { quoted: message })
      } catch (e) { /* ignore */ }
    }
  })

  // Handle disconnection
  conn.on('close', ({ reason }) => {
    logger.warn(`Connection closed: ${reason}`)
  })

  // Connect to WhatsApp
  await conn.connect()
  logger.info('✅ WhatsApp Bot is running!')
  return conn
}

// Export untuk dipanggil dari index.js
module.exports = { startBot }

// Auto-start jika file dijalankan langsung
if (require.main === module) {
  startBot()
    .then(() => logger.info('Bot started successfully'))
    .catch(err => {
      logger.error('Failed to start bot:', err)
      process.exit(1)
    })
}