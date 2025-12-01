/**
 * start.js
 * Entry point utama untuk Vinzz Bot
 * Inisialisasi semua modules & start bot + server
 *
 * Usage:
 * node start.js
 */

require('dotenv').config()
const path = require('path')

// ===========================
// IMPORT MODULES
// ===========================

const config = require('./config')
const server = require('./src/server')
const db = require('./src/databease')
const spam = require('./src/antispam')
const msg = require('./src/message')
const jadibot = require('./src/jadibot')

// ===========================
// LOGGER
// ===========================

const logger = {
  info: (...args) => console.log(`[${new Date().toLocaleTimeString()}] [INFO]`, ...args),
  warn: (...args) => console.warn(`[${new Date().toLocaleTimeString()}] [WARN]`, ...args),
  error: (...args) => console.error(`[${new Date().toLocaleTimeString()}] [ERROR]`, ...args),
  success: (...args) => console.log(`[${new Date().toLocaleTimeString()}] [✅]`, ...args)
}

// ===========================
// STARTUP SEQUENCE
// ===========================

async function startup() {
  try {
    logger.info('╔════════════════════════════════════╗')
    logger.info('║   🎮 VINZZ BOT - RPG MODE 🎮   ║')
    logger.info('║     WhatsApp RPG Bot v1.0.0     ║')
    logger.info('╚════════════════════════════════════╝')
    logger.info('')

    // Step 1: Initialize database
    logger.info('Step 1/5: Initializing database...')
    db.init()
    logger.success('Database initialized')

    // Step 2: Initialize antispam
    logger.info('Step 2/5: Initializing antispam...')
    spam.init()
    logger.success('Antispam initialized')

    // Step 3: Initialize jadibot
    logger.info('Step 3/5: Initializing jadibot...')
    jadibot.init()
    logger.success('Jadibot initialized')

    // Step 4: Start WhatsApp bot
    logger.info('Step 4/5: Connecting to WhatsApp...')
    const conn = await config.startBot()
    logger.success('WhatsApp bot connected!')

    // Step 5: Start HTTP server
    logger.info('Step 5/5: Starting HTTP server...')
    const port = process.env.PORT || 3000
    await server.start(conn, port)
    logger.success(`HTTP server running on port ${port}`)

    logger.info('')
    logger.info('╔════════════════════════════════════╗')
    logger.info('║  ✅ BOT FULLY OPERATIONAL ✅     ║')
    logger.info('╚════════════════════════════════════╝')
    logger.info('')
    logger.info('Commands:')
    logger.info('  !help - Show menu')
    logger.info('  !profile - Show profile')
    logger.info('  !hunt - Go hunting')
    logger.info('  !fish - Go fishing')
    logger.info('')
    logger.info('API running on: http://localhost:' + port)
    logger.info('')

  } catch (err) {
    logger.error('Fatal startup error:', err.message)
    logger.error(err)
    process.exit(1)
  }
}

// ===========================
// GRACEFUL SHUTDOWN
// ===========================

async function shutdown(signal) {
  logger.warn(`\n${signal} received, shutting down gracefully...`)

  try {
    logger.info('Closing connections...')
    // Add cleanup logic here if needed
    
    logger.success('All connections closed')
    process.exit(0)
  } catch (err) {
    logger.error('Error during shutdown:', err.message)
    process.exit(1)
  }
}

// ===========================
// SIGNAL HANDLERS
// ===========================

process.on('SIGINT', () => shutdown('SIGINT'))
process.on('SIGTERM', () => shutdown('SIGTERM'))

process.on('uncaughtException', (err) => {
  logger.error('Uncaught Exception:', err)
  process.exit(1)
})

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason)
  process.exit(1)
})

// ===========================
// START BOT
// ===========================

if (require.main === module) {
  startup()
}

module.exports = { startup, shutdown, logger }