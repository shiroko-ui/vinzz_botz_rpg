// ...existing code...
console.log("Vinzz Bot is starting...")
require('./settings.js')

const Vinzz = require('./lib/VinzzCore.js')

let vinzz = null
let restarting = false

async function start() {
  try {
    vinzz = new Vinzz()
    await vinzz.start()
    console.log('✅ Bot started')
  } catch (err) {
    console.error('Start error:', err)
    // jika gagal start, coba restart setelah delay
    if (!restarting) {
      restarting = true
      setTimeout(() => {
        restarting = false
        start()
      }, 5000)
    }
  }
}

async function stopAndExit(code = 0) {
  try {
    console.log('Shutting down...')
    if (vinzz && typeof vinzz.stop === 'function') {
      await vinzz.stop()
      console.log('Bot stopped cleanly')
    }
  } catch (e) {
    console.error('Error while stopping bot:', e)
  } finally {
    process.exit(code)
  }
}

// handle uncaught errors
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err)
  // beri sedikit waktu sebelum keluar agar log sempat tercetak
  setTimeout(() => process.exit(1), 100)
})
process.on('unhandledRejection', (reason) => {
  console.error('Unhandled Rejection:', reason)
})

// handle termination signals
process.on('SIGINT', () => stopAndExit(0))
process.on('SIGTERM', () => stopAndExit(0))

// mulai bot
start()
// ...existing code...
