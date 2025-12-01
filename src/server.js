/**
 * server.js
 * Express server untuk REST API & webhook
 * - API endpoints untuk game data
 * - Webhook untuk incoming messages
 * - Admin dashboard endpoints
 * - Stats & leaderboard endpoints
 *
 * Usage:
 * const server = require('./src/server')
 * server.start(conn, port)
 */

const express = require('express')
const cors = require('cors')
const bodyParser = require('body-parser')
const path = require('path')

const db = require('./databease')
const msg = require('./message')
const spam = require('./antispam')

const app = express()

// Middleware
app.use(cors())
app.use(bodyParser.json({ limit: '50mb' }))
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }))
app.use(express.static(path.join(__dirname, '..', 'public')))

// API key validation
const API_KEYS = {
  'test-key-123': { name: 'Test API', owner: '62xxx', premium: false }
}

/**
 * Middleware untuk validasi API key
 */
function validateAPIKey(req, res, next) {
  const apiKey = req.headers['x-api-key'] || req.query.apiKey

  if (!apiKey) {
    return res.status(401).json({ success: false, message: 'API key required' })
  }

  if (!API_KEYS[apiKey]) {
    return res.status(401).json({ success: false, message: 'Invalid API key' })
  }

  req.apiKeyData = API_KEYS[apiKey]
  next()
}

/**
 * GET / - Health check
 */
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Vinzz Bot RPG Server',
    version: '1.0.0',
    status: 'running',
    timestamp: new Date().toISOString()
  })
})

/**
 * GET /health - Health status
 */
app.get('/health', (req, res) => {
  res.json({
    success: true,
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    timestamp: new Date().toISOString()
  })
})

// ===========================
// USER ENDPOINTS
// ===========================

/**
 * GET /api/user/:jid - Ambil user data
 */
app.get('/api/user/:jid', validateAPIKey, (req, res) => {
  try {
    const { jid } = req.params
    const user = db.getUser(jid)

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' })
    }

    res.json({
      success: true,
      data: user
    })
  } catch (e) {
    res.status(500).json({ success: false, error: e.message })
  }
})

/**
 * GET /api/user/:jid/stats - Ambil user stats
 */
app.get('/api/user/:jid/stats', validateAPIKey, (req, res) => {
  try {
    const { jid } = req.params
    const stats = db.getUserStats(jid)

    res.json({
      success: true,
      data: stats
    })
  } catch (e) {
    res.status(500).json({ success: false, error: e.message })
  }
})

/**
 * POST /api/user/:jid/exp - Tambah exp
 * Body: { amount }
 */
app.post('/api/user/:jid/exp', validateAPIKey, (req, res) => {
  try {
    const { jid } = req.params
    const { amount } = req.body

    if (!amount || amount <= 0) {
      return res.status(400).json({ success: false, message: 'Invalid amount' })
    }

    const leveled = db.addExp(jid, amount)
    const user = db.getUser(jid)

    res.json({
      success: true,
      message: 'EXP added',
      leveled,
      newLevel: user.level,
      newExp: user.exp
    })
  } catch (e) {
    res.status(500).json({ success: false, error: e.message })
  }
})

/**
 * POST /api/user/:jid/gold - Tambah/kurangi gold
 * Body: { amount }
 */
app.post('/api/user/:jid/gold', validateAPIKey, (req, res) => {
  try {
    const { jid } = req.params
    const { amount } = req.body

    if (!amount || amount === 0) {
      return res.status(400).json({ success: false, message: 'Invalid amount' })
    }

    if (amount > 0) {
      db.addGold(jid, amount)
    } else {
      const success = db.spendGold(jid, Math.abs(amount))
      if (!success) {
        return res.status(400).json({ success: false, message: 'Insufficient gold' })
      }
    }

    const user = db.getUser(jid)

    res.json({
      success: true,
      message: 'Gold updated',
      newGold: user.gold
    })
  } catch (e) {
    res.status(500).json({ success: false, error: e.message })
  }
})

// ===========================
// INVENTORY ENDPOINTS
// ===========================

/**
 * GET /api/user/:jid/inventory - Ambil inventory
 */
app.get('/api/user/:jid/inventory', validateAPIKey, (req, res) => {
  try {
    const { jid } = req.params
    const inventory = db.getInventory(jid)

    res.json({
      success: true,
      data: inventory
    })
  } catch (e) {
    res.status(500).json({ success: false, error: e.message })
  }
})

/**
 * POST /api/user/:jid/inventory/add - Tambah item
 * Body: { itemId, quantity }
 */
app.post('/api/user/:jid/inventory/add', validateAPIKey, (req, res) => {
  try {
    const { jid } = req.params
    const { itemId, quantity = 1 } = req.body

    if (!itemId) {
      return res.status(400).json({ success: false, message: 'Item ID required' })
    }

    const success = db.addItem(jid, itemId, quantity)

    if (!success) {
      return res.status(400).json({ success: false, message: 'Failed to add item (max stack?)' })
    }

    const count = db.getItemCount(jid, itemId)

    res.json({
      success: true,
      message: 'Item added',
      itemId,
      quantity: count
    })
  } catch (e) {
    res.status(500).json({ success: false, error: e.message })
  }
})

/**
 * POST /api/user/:jid/inventory/remove - Kurangi item
 * Body: { itemId, quantity }
 */
app.post('/api/user/:jid/inventory/remove', validateAPIKey, (req, res) => {
  try {
    const { jid } = req.params
    const { itemId, quantity = 1 } = req.body

    if (!itemId) {
      return res.status(400).json({ success: false, message: 'Item ID required' })
    }

    const success = db.removeItem(jid, itemId, quantity)

    if (!success) {
      return res.status(400).json({ success: false, message: 'Not enough items' })
    }

    const count = db.getItemCount(jid, itemId)

    res.json({
      success: true,
      message: 'Item removed',
      itemId,
      remaining: count
    })
  } catch (e) {
    res.status(500).json({ success: false, error: e.message })
  }
})

// ===========================
// ITEM ENDPOINTS
// ===========================

/**
 * GET /api/items - Ambil semua items
 */
app.get('/api/items', validateAPIKey, (req, res) => {
  try {
    const items = db.getAllItems()

    res.json({
      success: true,
      total: items.length,
      data: items
    })
  } catch (e) {
    res.status(500).json({ success: false, error: e.message })
  }
})

/**
 * GET /api/items/:itemId - Ambil item spesifik
 */
app.get('/api/items/:itemId', validateAPIKey, (req, res) => {
  try {
    const { itemId } = req.params
    const item = db.getItem(itemId)

    if (!item) {
      return res.status(404).json({ success: false, message: 'Item not found' })
    }

    res.json({
      success: true,
      data: item
    })
  } catch (e) {
    res.status(500).json({ success: false, error: e.message })
  }
})

// ===========================
// LEADERBOARD ENDPOINTS
// ===========================

/**
 * GET /api/leaderboard/:type - Ambil leaderboard
 * type: level, gold, hunt, fish
 */
app.get('/api/leaderboard/:type', validateAPIKey, (req, res) => {
  try {
    const { type } = req.params
    const limit = Math.min(parseInt(req.query.limit) || 10, 100)

    const leaderboard = db.getLeaderboard(type, limit)

    res.json({
      success: true,
      type,
      total: leaderboard.length,
      data: leaderboard
    })
  } catch (e) {
    res.status(500).json({ success: false, error: e.message })
  }
})

// ===========================
// STATS ENDPOINTS
// ===========================

/**
 * GET /api/stats - Ambil bot stats
 */
app.get('/api/stats', validateAPIKey, (req, res) => {
  try {
    const users = db.getAllUsers()

    const stats = {
      totalUsers: users.length,
      avgLevel: users.length > 0 ? Math.round(users.reduce((a, u) => a + u.level, 0) / users.length) : 0,
      totalGold: users.reduce((a, u) => a + (u.gold || 0), 0),
      totalHunt: users.reduce((a, u) => a + (u.totalHunt || 0), 0),
      totalFish: users.reduce((a, u) => a + (u.totalFish || 0), 0),
      timestamp: new Date().toISOString()
    }

    res.json({
      success: true,
      data: stats
    })
  } catch (e) {
    res.status(500).json({ success: false, error: e.message })
  }
})

// ===========================
// ADMIN ENDPOINTS
// ===========================

/**
 * POST /api/admin/user/:jid/reset - Reset user data
 */
app.post('/api/admin/user/:jid/reset', validateAPIKey, (req, res) => {
  try {
    // Check if premium
    if (!req.apiKeyData.premium) {
      return res.status(403).json({ success: false, message: 'Premium only' })
    }

    const { jid } = req.params
    db.deleteUser(jid)

    res.json({
      success: true,
      message: 'User data reset'
    })
  } catch (e) {
    res.status(500).json({ success: false, error: e.message })
  }
})

/**
 * POST /api/admin/spam/check/:jid - Check spam status
 */
app.post('/api/admin/spam/check/:jid', validateAPIKey, (req, res) => {
  try {
    const { jid } = req.params
    const stats = spam.getStats(jid)

    res.json({
      success: true,
      data: stats
    })
  } catch (e) {
    res.status(500).json({ success: false, error: e.message })
  }
})

/**
 * POST /api/admin/spam/warn/:jid - Warn user
 */
app.post('/api/admin/spam/warn/:jid', validateAPIKey, (req, res) => {
  try {
    const { jid } = req.params
    const { reason } = req.body

    const result = spam.addWarning(jid, reason || 'Admin warn')

    res.json({
      success: true,
      data: result
    })
  } catch (e) {
    res.status(500).json({ success: false, error: e.message })
  }
})

/**
 * POST /api/admin/spam/unban/:jid - Unban user
 */
app.post('/api/admin/spam/unban/:jid', validateAPIKey, (req, res) => {
  try {
    const { jid } = req.params
    const success = spam.unban(jid)

    if (!success) {
      return res.status(400).json({ success: false, message: 'User not banned' })
    }

    res.json({
      success: true,
      message: 'User unbanned'
    })
  } catch (e) {
    res.status(500).json({ success: false, error: e.message })
  }
})

// ===========================
// WEBHOOK ENDPOINTS
// ===========================

/**
 * POST /webhook/message - Webhook untuk incoming messages
 */
app.post('/webhook/message', express.json(), (req, res) => {
  try {
    const { message, sender, jid } = req.body

    // Process message
    console.log(`[Webhook] Message from ${sender}: ${message}`)

    res.json({
      success: true,
      message: 'Webhook received'
    })
  } catch (e) {
    res.status(500).json({ success: false, error: e.message })
  }
})

// ===========================
// 404 HANDLER
// ===========================

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Endpoint not found',
    path: req.path
  })
})

// ===========================
// ERROR HANDLER
// ===========================

app.use((err, req, res, next) => {
  console.error('[Server] Error:', err)
  res.status(500).json({
    success: false,
    message: 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  })
})

// ===========================
// START SERVER
// ===========================

/**
 * start(conn, port = 3000)
 */
function start(conn, port = 3000) {
  return new Promise((resolve, reject) => {
    try {
      // Initialize databases
      db.init()
      spam.init()

      // Start listening
      const server = app.listen(port, () => {
        console.log(`[Server] Running on http://localhost:${port}`)
        resolve(server)
      })

      // Graceful shutdown
      process.on('SIGINT', () => {
        console.log('[Server] Shutting down...')
        server.close(() => {
          console.log('[Server] Closed')
          process.exit(0)
        })
      })
    } catch (e) {
      console.error('[Server] Startup error:', e)
      reject(e)
    }
  })
}

module.exports = {
  app,
  start
}