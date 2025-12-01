/**
 * databease.js
 * Module untuk manage database RPG
 * - User data (profile, stats, inventory)
 * - Item management
 * - Quest system
 * - Leaderboard
 *
 * Usage:
 * const db = require('./src/databease')
 * db.init()
 * const user = db.getUser(jid)
 * user.gold += 100
 * db.saveUser(jid, user)
 */

const fs = require('fs')
const path = require('path')

const DB_DIR = path.join(__dirname, '..', 'database')
const USERS_DB = path.join(DB_DIR, 'users.json')
const ITEMS_DB = path.join(DB_DIR, 'items.json')
const QUESTS_DB = path.join(DB_DIR, 'quests.json')

// Ensure database directory exists
function ensureDBDir() {
  if (!fs.existsSync(DB_DIR)) {
    fs.mkdirSync(DB_DIR, { recursive: true })
  }
}

/**
 * Load all databases
 */
function loadDB(filePath, defaultData = {}) {
  try {
    ensureDBDir()
    if (!fs.existsSync(filePath)) {
      fs.writeFileSync(filePath, JSON.stringify(defaultData, null, 2), 'utf8')
      return defaultData
    }
    const raw = fs.readFileSync(filePath, 'utf8')
    return JSON.parse(raw || JSON.stringify(defaultData))
  } catch (e) {
    console.error(`[DB] Error loading ${filePath}:`, e.message)
    return defaultData
  }
}

/**
 * Save database to file
 */
function saveDB(filePath, data) {
  try {
    ensureDBDir()
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8')
    return true
  } catch (e) {
    console.error(`[DB] Error saving ${filePath}:`, e.message)
    return false
  }
}

// ===========================
// DEFAULT DATA STRUCTURES
// ===========================

const DEFAULT_USER = {
  jid: '',
  name: 'Player',
  level: 1,
  exp: 0,
  nextLevelExp: 100,
  // Stats
  maxHp: 100,
  hp: 100,
  attack: 10,
  defense: 5,
  speed: 3,
  // Resources
  gold: 0,
  diamond: 0,
  // Inventory & Items
  inventory: {},     // { itemId: quantity }
  equippedItems: {   // { slot: itemId } - weapon, armor, ring, dll
    weapon: null,
    armor: null,
    ring: null
  },
  // Progress
  totalHunt: 0,
  totalFish: 0,
  totalBattle: 0,
  joinedAt: Date.now(),
  lastActive: Date.now()
}

const DEFAULT_ITEM = {
  id: '',
  name: '',
  description: '',
  type: 'consumable', // consumable, weapon, armor, ring, quest
  rarity: 'common',   // common, uncommon, rare, epic, legendary
  price: 0,
  sellPrice: 0,
  // For consumables
  heal: 0,
  // For weapons
  attackBonus: 0,
  // For armor
  defenseBonus: 0,
  // For rings
  statBonus: {},      // { hp: 10, attack: 5 }
  stackable: true,
  maxStack: 99
}

const DEFAULT_QUEST = {
  id: '',
  name: '',
  description: '',
  type: 'kill',       // kill, collect, explore, deliver
  target: 0,          // jumlah target
  progress: 0,
  reward: { exp: 0, gold: 0, items: [] },
  completed: false,
  completedAt: null,
  active: false
}

// ===========================
// USER MANAGEMENT
// ===========================

let usersDB = {}
let itemsDB = {}
let questsDB = {}

/**
 * Initialize all databases
 */
function init() {
  usersDB = loadDB(USERS_DB, {})
  itemsDB = loadDB(ITEMS_DB, getDefaultItemsDB())
  questsDB = loadDB(QUESTS_DB, {})
  console.log('[DB] Initialized | Users:', Object.keys(usersDB).length)
}

/**
 * Get default items database
 */
function getDefaultItemsDB() {
  return {
    potion: {
      id: 'potion',
      name: '🔴 Potion',
      description: 'Restore 50 HP',
      type: 'consumable',
      rarity: 'common',
      price: 50,
      sellPrice: 25,
      heal: 50,
      stackable: true,
      maxStack: 99
    },
    mana_potion: {
      id: 'mana_potion',
      name: '🔵 Mana Potion',
      description: 'Restore 30 Mana',
      type: 'consumable',
      rarity: 'common',
      price: 40,
      sellPrice: 20,
      heal: 0,
      stackable: true,
      maxStack: 99
    },
    bait: {
      id: 'bait',
      name: '🎣 Umpan',
      description: 'Fishing bait',
      type: 'consumable',
      rarity: 'common',
      price: 30,
      sellPrice: 15,
      stackable: true,
      maxStack: 99
    },
    iron_sword: {
      id: 'iron_sword',
      name: '⚔️ Iron Sword',
      description: 'Basic weapon',
      type: 'weapon',
      rarity: 'common',
      price: 200,
      sellPrice: 100,
      attackBonus: 15,
      stackable: false
    },
    iron_armor: {
      id: 'iron_armor',
      name: '🛡️ Iron Armor',
      description: 'Basic armor',
      type: 'armor',
      rarity: 'common',
      price: 150,
      sellPrice: 75,
      defenseBonus: 10,
      stackable: false
    },
    strength_ring: {
      id: 'strength_ring',
      name: '💍 Ring of Strength',
      description: 'Boost attack',
      type: 'ring',
      rarity: 'rare',
      price: 500,
      sellPrice: 250,
      statBonus: { attack: 10, hp: 20 },
      stackable: false
    }
  }
}

/**
 * getUser(jid) -> user object
 * Auto-create user jika tidak ada
 */
function getUser(jid) {
  if (!usersDB[jid]) {
    usersDB[jid] = {
      ...DEFAULT_USER,
      jid,
      lastActive: Date.now()
    }
    saveDB(USERS_DB, usersDB)
  } else {
    usersDB[jid].lastActive = Date.now()
  }
  return usersDB[jid]
}

/**
 * saveUser(jid, userData)
 */
function saveUser(jid, userData) {
  usersDB[jid] = userData
  saveDB(USERS_DB, usersDB)
}

/**
 * getAllUsers() -> array of users
 */
function getAllUsers() {
  return Object.values(usersDB)
}

/**
 * deleteUser(jid)
 */
function deleteUser(jid) {
  if (usersDB[jid]) {
    delete usersDB[jid]
    saveDB(USERS_DB, usersDB)
    return true
  }
  return false
}

/**
 * getUserStats(jid) -> { level, exp, hp, gold, ... }
 */
function getUserStats(jid) {
  const user = getUser(jid)
  return {
    level: user.level,
    exp: user.exp,
    nextLevelExp: user.nextLevelExp,
    hp: user.hp,
    maxHp: user.maxHp,
    attack: user.attack,
    defense: user.defense,
    gold: user.gold,
    diamond: user.diamond
  }
}

// ===========================
// INVENTORY MANAGEMENT
// ===========================

/**
 * addItem(jid, itemId, quantity = 1)
 */
function addItem(jid, itemId, quantity = 1) {
  const user = getUser(jid)
  const item = itemsDB[itemId]
  
  if (!item) {
    console.warn(`[DB] Item not found: ${itemId}`)
    return false
  }
  
  if (!user.inventory[itemId]) {
    user.inventory[itemId] = 0
  }
  
  const newQty = user.inventory[itemId] + quantity
  
  // Check max stack
  if (!item.stackable || (item.maxStack && newQty > item.maxStack)) {
    return false
  }
  
  user.inventory[itemId] = newQty
  saveUser(jid, user)
  return true
}

/**
 * removeItem(jid, itemId, quantity = 1)
 */
function removeItem(jid, itemId, quantity = 1) {
  const user = getUser(jid)
  
  if (!user.inventory[itemId] || user.inventory[itemId] < quantity) {
    return false
  }
  
  user.inventory[itemId] -= quantity
  
  if (user.inventory[itemId] <= 0) {
    delete user.inventory[itemId]
  }
  
  saveUser(jid, user)
  return true
}

/**
 * getInventory(jid) -> { itemId: quantity }
 */
function getInventory(jid) {
  return getUser(jid).inventory
}

/**
 * getItemCount(jid, itemId) -> number
 */
function getItemCount(jid, itemId) {
  return getUser(jid).inventory[itemId] || 0
}

// ===========================
// ITEM MANAGEMENT
// ===========================

/**
 * getItem(itemId) -> item object
 */
function getItem(itemId) {
  return itemsDB[itemId] || null
}

/**
 * getAllItems() -> array of items
 */
function getAllItems() {
  return Object.values(itemsDB)
}

/**
 * addItemDefinition(itemId, itemData)
 */
function addItemDefinition(itemId, itemData) {
  itemsDB[itemId] = {
    id: itemId,
    ...DEFAULT_ITEM,
    ...itemData
  }
  saveDB(ITEMS_DB, itemsDB)
}

// ===========================
// QUEST MANAGEMENT
// ===========================

/**
 * startQuest(jid, questId) -> true/false
 */
function startQuest(jid, questId) {
  const user = getUser(jid)
  const quest = questsDB[questId]
  
  if (!quest) return false
  
  if (!user.quests) user.quests = {}
  
  user.quests[questId] = {
    ...quest,
    active: true,
    progress: 0,
    startedAt: Date.now()
  }
  
  saveUser(jid, user)
  return true
}

/**
 * updateQuestProgress(jid, questId, amount = 1)
 */
function updateQuestProgress(jid, questId, amount = 1) {
  const user = getUser(jid)
  
  if (!user.quests || !user.quests[questId]) return false
  
  user.quests[questId].progress += amount
  
  if (user.quests[questId].progress >= user.quests[questId].target) {
    user.quests[questId].completed = true
    user.quests[questId].completedAt = Date.now()
  }
  
  saveUser(jid, user)
  return true
}

/**
 * completeQuest(jid, questId) -> reward
 */
function completeQuest(jid, questId) {
  const user = getUser(jid)
  const quest = user.quests && user.quests[questId]
  
  if (!quest || !quest.completed) return null
  
  const reward = quest.reward || { exp: 0, gold: 0 }
  
  // Add rewards
  user.exp += reward.exp || 0
  user.gold += reward.gold || 0
  
  if (reward.items && Array.isArray(reward.items)) {
    reward.items.forEach(({ id, qty }) => addItem(jid, id, qty))
  }
  
  // Mark as claimed
  delete user.quests[questId]
  saveUser(jid, user)
  
  return reward
}

// ===========================
// LEVEL & EXPERIENCE
// ===========================

/**
 * addExp(jid, amount) -> leveled (boolean)
 */
function addExp(jid, amount) {
  const user = getUser(jid)
  user.exp += amount
  
  let leveled = false
  
  while (user.exp >= user.nextLevelExp) {
    user.exp -= user.nextLevelExp
    user.level += 1
    user.maxHp += 10
    user.hp = user.maxHp
    user.attack += 2
    user.defense += 1
    user.nextLevelExp = Math.floor(user.nextLevelExp * 1.1)
    leveled = true
  }
  
  saveUser(jid, user)
  return leveled
}

/**
 * addGold(jid, amount)
 */
function addGold(jid, amount) {
  const user = getUser(jid)
  user.gold += amount
  saveUser(jid, user)
}

/**
 * spendGold(jid, amount) -> true/false
 */
function spendGold(jid, amount) {
  const user = getUser(jid)
  
  if (user.gold < amount) return false
  
  user.gold -= amount
  saveUser(jid, user)
  return true
}

// ===========================
// LEADERBOARD
// ===========================

/**
 * getLeaderboard(type = 'level', limit = 10) -> array
 */
function getLeaderboard(type = 'level', limit = 10) {
  const users = getAllUsers()
  
  let sorted = [...users]
  
  if (type === 'level') {
    sorted.sort((a, b) => (b.level - a.level) || (b.exp - a.exp))
  } else if (type === 'gold') {
    sorted.sort((a, b) => b.gold - a.gold)
  } else if (type === 'hunt') {
    sorted.sort((a, b) => b.totalHunt - a.totalHunt)
  } else if (type === 'fish') {
    sorted.sort((a, b) => b.totalFish - a.totalFish)
  }
  
  return sorted.slice(0, limit).map((u, idx) => ({
    rank: idx + 1,
    name: u.name,
    level: u.level,
    gold: u.gold,
    hunt: u.totalHunt,
    fish: u.totalFish
  }))
}

// ===========================
// EXPORT
// ===========================

module.exports = {
  // Init
  init,
  // Users
  getUser,
  saveUser,
  getAllUsers,
  deleteUser,
  getUserStats,
  // Inventory
  addItem,
  removeItem,
  getInventory,
  getItemCount,
  // Items
  getItem,
  getAllItems,
  addItemDefinition,
  // Quests
  startQuest,
  updateQuestProgress,
  completeQuest,
  // Experience & Gold
  addExp,
  addGold,
  spendGold,
  // Leaderboard
  getLeaderboard,
  // Constants
  DEFAULT_USER,
  DEFAULT_ITEM,
  DEFAULT_QUEST
}