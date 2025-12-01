/**
 * settings.js
 * Global settings & configuration untuk Vinzz Bot
 * - Owner & admin configuration
 * - Bot prefix & messages
 * - RPG system configuration
 * - Game rewards & mechanics
 * - Item definitions
 * - Quest system
 *
 * Usage:
 * require('./settings.js')
 * // Semua config tersedia di global scope
 */

// ===========================
// BOT CONFIGURATION
// ===========================

global.owner = [
  '6283862601567@s.whatsapp.net',  // Owner utama
  '6283862601567@s.whatsapp.net'   // Owner secondary
]

global.admins = [
  '6283862601567@s.whatsapp.net',
  '6283862601567@s.whatsapp.net'
]

global.botName = '🎮 Vinzz Bot RPG'
global.botVersion = '1.0.0'
global.botPrefix = '!'

// ===========================
// BOT MESSAGES
// ===========================

global.mess = {
  // Error messages
  error: '❌ Terjadi kesalahan, silahkan coba lagi',
  errorAPI: '❌ API Error',
  errorDB: '❌ Database error',
  
  // Permission messages
  owner: '⚠️ Perintah ini hanya untuk owner!',
  admin: '⚠️ Perintah ini hanya untuk admin!',
  group: '⚠️ Perintah ini hanya bisa digunakan di grup!',
  private: '⚠️ Perintah ini hanya bisa digunakan di private chat!',
  
  // Status messages
  wait: '⏳ Tunggu sebentar...',
  loading: '⌛ Loading...',
  processing: '⚙️ Processing...',
  
  // Success messages
  success: '✅ Berhasil!',
  done: '✅ Selesai!',
  
  // Game messages
  levelUp: '➡️ Kamu naik level! Sekarang level',
  gameOver: '💀 Game Over!',
  youWin: '🎉 Kamu menang!',
  youLose: '😢 Kamu kalah!',
  
  // Currency messages
  insufficientGold: '❌ Gold tidak cukup!',
  insufficientDiamond: '❌ Diamond tidak cukup!',
  
  // Cooldown messages
  cooldown: '⏱️ Tunggu',
  cooldownSeconds: 's sebelum menggunakan perintah ini lagi',
  
  // Ban messages
  banned: '🚫 Kamu di-ban! Alasan:',
  banRemaining: 'Sisa waktu ban:'
}

// ===========================
// RPG SYSTEM CONFIGURATION
// ===========================

global.rpg = {
  // Level & Experience
  xpToLevel: (level) => {
    return Math.floor(100 * Math.pow(level, 1.5))
  },
  
  // Stat growth per level
  growth: {
    hpPerLevel: 10,
    attackPerLevel: 2,
    defensePerLevel: 1,
    speedPerLevel: 0.5
  },
  
  // Starting stats
  startingStats: {
    level: 1,
    exp: 0,
    maxHp: 100,
    hp: 100,
    attack: 10,
    defense: 5,
    speed: 3,
    gold: 100,
    diamond: 0
  },
  
  // Generate starter character
  generateStarter: function() {
    return {
      ...this.startingStats,
      inventory: {},
      equippedItems: {
        weapon: null,
        armor: null,
        ring: null
      },
      totalHunt: 0,
      totalFish: 0,
      totalBattle: 0,
      joinedAt: Date.now(),
      lastActive: Date.now()
    }
  },
  
  // Rewards system
  rewards: {
    hunt: {
      minExp: 8,
      maxExp: 20,
      minGold: 20,
      maxGold: 80,
      items: ['beef', 'wild_meat']
    },
    fish: {
      minExp: 5,
      maxExp: 15,
      minGold: 10,
      maxGold: 60,
      items: ['fish', 'rare_fish']
    },
    battle: {
      minExp: 15,
      maxExp: 50,
      minGold: 50,
      maxGold: 200,
      items: []
    },
    quest: {
      minExp: 100,
      minGold: 500
    }
  },
  
  // Cooldowns (ms)
  cooldowns: {
    hunt: 5000,      // 5 seconds
    fish: 5000,      // 5 seconds
    battle: 10000,   // 10 seconds
    work: 3000,      // 3 seconds
    daily: 86400000  // 24 hours
  },
  
  // Shop configuration
  shop: [
    { id: 'potion', qty: 1, price: 50 },
    { id: 'mana_potion', qty: 1, price: 40 },
    { id: 'bait', qty: 5, price: 150 },
    { id: 'iron_sword', qty: 1, price: 200 },
    { id: 'iron_armor', qty: 1, price: 150 }
  ],
  
  // Items database
  items: {
    // Consumables
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
      stackable: true,
      maxStack: 99
    },
    antidote: {
      id: 'antidote',
      name: '⚪ Antidote',
      description: 'Remove poison effect',
      type: 'consumable',
      rarity: 'common',
      price: 60,
      sellPrice: 30,
      stackable: true,
      maxStack: 50
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
    
    // Materials
    beef: {
      id: 'beef',
      name: '🥩 Beef',
      description: 'Raw meat from hunting',
      type: 'material',
      rarity: 'common',
      price: 20,
      sellPrice: 10,
      stackable: true,
      maxStack: 99
    },
    wild_meat: {
      id: 'wild_meat',
      name: '🍖 Wild Meat',
      description: 'Rare meat from hunting',
      type: 'material',
      rarity: 'uncommon',
      price: 40,
      sellPrice: 20,
      stackable: true,
      maxStack: 99
    },
    fish: {
      id: 'fish',
      name: '🐟 Fish',
      description: 'Caught from fishing',
      type: 'material',
      rarity: 'common',
      price: 25,
      sellPrice: 12,
      stackable: true,
      maxStack: 99
    },
    rare_fish: {
      id: 'rare_fish',
      name: '🐠 Rare Fish',
      description: 'Rare catch from fishing',
      type: 'material',
      rarity: 'rare',
      price: 100,
      sellPrice: 50,
      stackable: true,
      maxStack: 50
    },
    
    // Weapons
    iron_sword: {
      id: 'iron_sword',
      name: '⚔️ Iron Sword',
      description: 'Basic iron weapon',
      type: 'weapon',
      rarity: 'common',
      price: 200,
      sellPrice: 100,
      attackBonus: 15,
      stackable: false
    },
    steel_sword: {
      id: 'steel_sword',
      name: '🗡️ Steel Sword',
      description: 'Improved steel weapon',
      type: 'weapon',
      rarity: 'uncommon',
      price: 500,
      sellPrice: 250,
      attackBonus: 30,
      stackable: false
    },
    legend_sword: {
      id: 'legend_sword',
      name: '⚡ Legendary Sword',
      description: 'Ultimate legendary weapon',
      type: 'weapon',
      rarity: 'legendary',
      price: 5000,
      sellPrice: 2500,
      attackBonus: 100,
      stackable: false
    },
    
    // Armor
    iron_armor: {
      id: 'iron_armor',
      name: '🛡️ Iron Armor',
      description: 'Basic iron armor',
      type: 'armor',
      rarity: 'common',
      price: 150,
      sellPrice: 75,
      defenseBonus: 10,
      stackable: false
    },
    steel_armor: {
      id: 'steel_armor',
      name: '🔒 Steel Armor',
      description: 'Improved steel armor',
      type: 'armor',
      rarity: 'uncommon',
      price: 400,
      sellPrice: 200,
      defenseBonus: 25,
      stackable: false
    },
    legend_armor: {
      id: 'legend_armor',
      name: '👑 Legendary Armor',
      description: 'Ultimate legendary armor',
      type: 'armor',
      rarity: 'legendary',
      price: 4000,
      sellPrice: 2000,
      defenseBonus: 80,
      stackable: false
    },
    
    // Accessories
    strength_ring: {
      id: 'strength_ring',
      name: '💍 Ring of Strength',
      description: 'Boost attack power',
      type: 'ring',
      rarity: 'rare',
      price: 500,
      sellPrice: 250,
      statBonus: { attack: 10, hp: 20 },
      stackable: false
    },
    vitality_ring: {
      id: 'vitality_ring',
      name: '💎 Ring of Vitality',
      description: 'Boost HP & defense',
      type: 'ring',
      rarity: 'rare',
      price: 450,
      sellPrice: 225,
      statBonus: { hp: 30, defense: 5 },
      stackable: false
    },
    speed_ring: {
      id: 'speed_ring',
      name: '⚡ Ring of Speed',
      description: 'Increase speed',
      type: 'ring',
      rarity: 'rare',
      price: 400,
      sellPrice: 200,
      statBonus: { speed: 5 },
      stackable: false
    }
  }
}

// ===========================
// BATTLE SYSTEM
// ===========================

global.battle = {
  // Difficulty levels
  difficulty: {
    easy: { expMultiplier: 1, goldMultiplier: 1 },
    normal: { expMultiplier: 1.5, goldMultiplier: 1.5 },
    hard: { expMultiplier: 2.5, goldMultiplier: 2.5 },
    hell: { expMultiplier: 4, goldMultiplier: 4 }
  },
  
  // Enemies
  enemies: {
    slime: {
      id: 'slime',
      name: '🟢 Slime',
      level: 1,
      hp: 20,
      attack: 3,
      defense: 1,
      expReward: 5,
      goldReward: 10
    },
    goblin: {
      id: 'goblin',
      name: '👹 Goblin',
      level: 5,
      hp: 40,
      attack: 8,
      defense: 3,
      expReward: 20,
      goldReward: 50
    },
    orc: {
      id: 'orc',
      name: '🗡️ Orc',
      level: 10,
      hp: 80,
      attack: 15,
      defense: 8,
      expReward: 50,
      goldReward: 150
    },
    dragon: {
      id: 'dragon',
      name: '🐉 Dragon',
      level: 25,
      hp: 300,
      attack: 50,
      defense: 30,
      expReward: 500,
      goldReward: 1500
    }
  }
}

// ===========================
// QUEST SYSTEM
// ===========================

global.quests = {
  daily: [
    {
      id: 'daily_hunt',
      name: '🎯 Daily Hunt',
      description: 'Hunt 5 times',
      type: 'hunt',
      target: 5,
      reward: { exp: 100, gold: 200, items: [] }
    },
    {
      id: 'daily_fish',
      name: '🎣 Daily Fish',
      description: 'Fish 3 times',
      type: 'fish',
      target: 3,
      reward: { exp: 80, gold: 150, items: [] }
    }
  ],
  
  main: [
    {
      id: 'beginner_hunt',
      name: '🌍 Beginner Hunt',
      description: 'Hunt 10 times',
      type: 'hunt',
      target: 10,
      reward: { exp: 200, gold: 500, items: ['iron_sword'] }
    },
    {
      id: 'become_warrior',
      name: '⚔️ Become Warrior',
      description: 'Reach level 5',
      type: 'level',
      target: 5,
      reward: { exp: 500, gold: 1000, items: ['iron_armor'] }
    }
  ]
}

// ===========================
// LEADERBOARD CONFIG
// ===========================

global.leaderboard = {
  updateInterval: 3600000, // 1 hour
  topCount: 10,
  types: ['level', 'gold', 'hunt', 'fish', 'battle']
}

// ===========================
// PREMIUM/CURRENCY
// ===========================

global.premium = {
  diamond: {
    name: 'Diamond',
    symbol: '💎',
    sellable: false,
    transferable: true
  },
  gold: {
    name: 'Gold',
    symbol: '💰',
    sellable: true,
    transferable: false
  }
}

// ===========================
// FEATURES
// ===========================

global.features = {
  rpg: true,
  battle: true,
  quests: true,
  jadibot: true,
  antispam: true,
  leaderboard: true,
  trading: false,  // coming soon
  guild: false     // coming soon
}

// ===========================
// LOG SETTINGS
// ===========================

global.logSettings = {
  logCommands: true,
  logErrors: true,
  logLevel: 'info' // info, warn, error
}

console.log(`
╔════════════════════════════════════╗
║   ✅ Settings Loaded Successfully  ║
║   Bot: ${global.botName}
║   Version: ${global.botVersion}
╚════════════════════════════════════╝
`)