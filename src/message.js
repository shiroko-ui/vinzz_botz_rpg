/**
 * message.js
 * Module untuk helper pengiriman pesan dengan formatting
 * - Text messages dengan styling
 * - Image messages
 * - Button messages
 * - Contact cards
 * - Location sharing
 * - Document/file sharing
 * - Group management messages
 *
 * Usage:
 * const msg = require('./src/message')
 * await msg.sendText(conn, jid, 'Hello')
 * await msg.sendImage(conn, jid, buffer, caption)
 */

const { MessageType } = require('@adiwajshing/baileys')
const fs = require('fs')
const path = require('path')

/**
 * sendText(conn, jid, text, quoted = null)
 * Kirim text message
 */
async function sendText(conn, jid, text, quoted = null) {
  try {
    const opts = quoted ? { quoted } : {}
    await conn.sendMessage(jid, text, MessageType.text, opts)
    return true
  } catch (e) {
    console.error('[Message] Send text error:', e.message)
    return false
  }
}

/**
 * sendImage(conn, jid, buffer, caption = '', quoted = null)
 * Kirim image message
 * buffer: image buffer atau file path
 */
async function sendImage(conn, jid, buffer, caption = '', quoted = null) {
  try {
    let imageBuffer = buffer
    
    // Jika path string, baca file
    if (typeof buffer === 'string' && fs.existsSync(buffer)) {
      imageBuffer = fs.readFileSync(buffer)
    }
    
    const opts = {
      caption: caption,
      mimetype: 'image/jpeg',
      ...( quoted ? { quoted } : {})
    }
    
    await conn.sendMessage(jid, imageBuffer, MessageType.image, opts)
    return true
  } catch (e) {
    console.error('[Message] Send image error:', e.message)
    return false
  }
}

/**
 * sendVideo(conn, jid, buffer, caption = '', quoted = null)
 * Kirim video message
 */
async function sendVideo(conn, jid, buffer, caption = '', quoted = null) {
  try {
    let videoBuffer = buffer
    
    if (typeof buffer === 'string' && fs.existsSync(buffer)) {
      videoBuffer = fs.readFileSync(buffer)
    }
    
    const opts = {
      caption: caption,
      mimetype: 'video/mp4',
      ...( quoted ? { quoted } : {})
    }
    
    await conn.sendMessage(jid, videoBuffer, MessageType.video, opts)
    return true
  } catch (e) {
    console.error('[Message] Send video error:', e.message)
    return false
  }
}

/**
 * sendAudio(conn, jid, buffer, quoted = null, ptt = true)
 * Kirim audio/voice message
 * ptt: true = voice note, false = audio file
 */
async function sendAudio(conn, jid, buffer, quoted = null, ptt = true) {
  try {
    let audioBuffer = buffer
    
    if (typeof buffer === 'string' && fs.existsSync(buffer)) {
      audioBuffer = fs.readFileSync(buffer)
    }
    
    const opts = {
      mimetype: 'audio/mpeg',
      ptt: ptt,
      ...( quoted ? { quoted } : {})
    }
    
    await conn.sendMessage(jid, audioBuffer, MessageType.audio, opts)
    return true
  } catch (e) {
    console.error('[Message] Send audio error:', e.message)
    return false
  }
}

/**
 * sendDocument(conn, jid, buffer, fileName, quoted = null)
 * Kirim document/file
 */
async function sendDocument(conn, jid, buffer, fileName = 'file', quoted = null) {
  try {
    let docBuffer = buffer
    
    if (typeof buffer === 'string' && fs.existsSync(buffer)) {
      docBuffer = fs.readFileSync(buffer)
      fileName = path.basename(buffer)
    }
    
    const opts = {
      filename: fileName,
      mimetype: 'application/octet-stream',
      ...( quoted ? { quoted } : {})
    }
    
    await conn.sendMessage(jid, docBuffer, MessageType.document, opts)
    return true
  } catch (e) {
    console.error('[Message] Send document error:', e.message)
    return false
  }
}

/**
 * sendProfile(conn, jid, userName, userProfile, quoted = null)
 * Kirim contact card / vCard
 */
async function sendProfile(conn, jid, userName = 'User', userProfile = {}, quoted = null) {
  try {
    const vcard = `BEGIN:VCARD
VERSION:3.0
FN:${userName}
TEL:${userProfile.phone || ''}
NOTE:${userProfile.status || ''}
END:VCARD`

    const opts = {
      displayName: userName,
      vcard: vcard,
      ...( quoted ? { quoted } : {})
    }
    
    await conn.sendMessage(jid, vcard, MessageType.contact, opts)
    return true
  } catch (e) {
    console.error('[Message] Send profile error:', e.message)
    return false
  }
}

/**
 * sendLocation(conn, jid, latitude, longitude, locationName = '', quoted = null)
 * Kirim location sharing
 */
async function sendLocation(conn, jid, latitude, longitude, locationName = '', quoted = null) {
  try {
    const opts = {
      location: {
        degreesLatitude: latitude,
        degreesLongitude: longitude,
        name: locationName
      },
      ...( quoted ? { quoted } : {})
    }
    
    await conn.sendMessage(jid, undefined, MessageType.location, opts)
    return true
  } catch (e) {
    console.error('[Message] Send location error:', e.message)
    return false
  }
}

/**
 * sendSticker(conn, jid, buffer, quoted = null)
 * Kirim sticker
 */
async function sendSticker(conn, jid, buffer, quoted = null) {
  try {
    let stickerBuffer = buffer
    
    if (typeof buffer === 'string' && fs.existsSync(buffer)) {
      stickerBuffer = fs.readFileSync(buffer)
    }
    
    const opts = {
      mimetype: 'image/webp',
      ...( quoted ? { quoted } : {})
    }
    
    await conn.sendMessage(jid, stickerBuffer, MessageType.sticker, opts)
    return true
  } catch (e) {
    console.error('[Message] Send sticker error:', e.message)
    return false
  }
}

/**
 * sendRPGProfile(conn, jid, userData, quoted = null)
 * Kirim RPG profile dengan formatting menarik
 */
async function sendRPGProfile(conn, jid, userData, quoted = null) {
  try {
    const name = userData.name || 'Player'
    const level = userData.level || 1
    const exp = userData.exp || 0
    const nextExp = userData.nextLevelExp || 100
    const hp = userData.hp || 100
    const maxHp = userData.maxHp || 100
    const attack = userData.attack || 10
    const defense = userData.defense || 5
    const gold = userData.gold || 0
    const diamond = userData.diamond || 0

    const text = [
      `╭─────────────────────╮`,
      `│   🎮 RPG PROFILE 🎮   │`,
      `╰─────────────────────╯`,
      ``,
      `👤 *Nama:* ${name}`,
      `⭐ *Level:* ${level}`,
      ``,
      `📊 *Stats:*`,
      `├ ❤️  HP: ${hp}/${maxHp}`,
      `├ ⚔️  Attack: ${attack}`,
      `├ 🛡️  Defense: ${defense}`,
      `└ 💨 Speed: ${userData.speed || 3}`,
      ``,
      `💰 *Resources:*`,
      `├ 💛 Gold: ${gold}`,
      `├ 💎 Diamond: ${diamond}`,
      `└ 🎒 Inventory: ${Object.keys(userData.inventory || {}).length} items`,
      ``,
      `⬆️  *Experience:*`,
      `├ EXP: ${exp}/${nextExp}`,
      `└ Progress: ${Math.round((exp / nextExp) * 100)}%`,
      ``,
      `╭─────────────────────╮`,
      `│  Updated: ${new Date().toLocaleTimeString()}  │`,
      `╰─────────────────────╯`
    ].join('\n')

    await sendText(conn, jid, text, quoted)
    return true
  } catch (e) {
    console.error('[Message] Send RPG profile error:', e.message)
    return false
  }
}

/**
 * sendRPGInventory(conn, jid, inventory, items, quoted = null)
 * Kirim inventory dengan formatting
 */
async function sendRPGInventory(conn, jid, inventory = {}, items = {}, quoted = null) {
  try {
    let text = [
      `╭─────────────────────╮`,
      `│      🎒 INVENTORY 🎒    │`,
      `╰─────────────────────╯`,
      ``
    ]

    const invKeys = Object.keys(inventory)
    if (invKeys.length === 0) {
      text.push(`Inventory kosong`)
    } else {
      invKeys.forEach((itemId, idx) => {
        const qty = inventory[itemId]
        const itemDef = items[itemId] || { name: itemId }
        const isLast = idx === invKeys.length - 1
        const prefix = isLast ? '└' : '├'
        text.push(`${prefix} ${itemDef.name || itemId} x${qty}`)
      })
    }

    text.push(``)
    text.push(`╭─────────────────────╮`)
    text.push(`│ Items: ${invKeys.length}          │`)
    text.push(`╰─────────────────────╯`)

    await sendText(conn, jid, text.join('\n'), quoted)
    return true
  } catch (e) {
    console.error('[Message] Send inventory error:', e.message)
    return false
  }
}

/**
 * sendLeaderboard(conn, jid, leaderboardData, quoted = null)
 * Kirim leaderboard dengan ranking
 */
async function sendLeaderboard(conn, jid, leaderboardData = [], quoted = null) {
  try {
    let text = [
      `╭──────────────────────────╮`,
      `│   🏆 LEADERBOARD 🏆   │`,
      `╰──────────────────────────╯`,
      ``
    ]

    if (leaderboardData.length === 0) {
      text.push(`Belum ada data`)
    } else {
      leaderboardData.forEach((user, idx) => {
        const rank = idx + 1
        const medal = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : `${rank}.`
        text.push(`${medal} ${user.name} - Lvl ${user.level} (${user.gold || 0}💰)`)
      })
    }

    text.push(``)
    text.push(`Updated: ${new Date().toLocaleString()}`)

    await sendText(conn, jid, text.join('\n'), quoted)
    return true
  } catch (e) {
    console.error('[Message] Send leaderboard error:', e.message)
    return false
  }
}

/**
 * sendShop(conn, jid, shopItems = {}, quoted = null)
 * Kirim shop menu dengan items
 */
async function sendShop(conn, jid, shopItems = {}, quoted = null) {
  try {
    let text = [
      `╭─────────────────────╮`,
      `│     🏪 SHOP 🏪     │`,
      `╰─────────────────────╯`,
      ``
    ]

    const itemIds = Object.keys(shopItems)
    if (itemIds.length === 0) {
      text.push(`Toko kosong`)
    } else {
      itemIds.forEach((itemId, idx) => {
        const item = shopItems[itemId]
        const isLast = idx === itemIds.length - 1
        const prefix = isLast ? '└' : '├'
        text.push(`${prefix} [${itemId}] ${item.name}`)
        text.push(`   💰 ${item.price} Gold`)
        if (item.description) text.push(`   📝 ${item.description}`)
      })
    }

    text.push(``)
    text.push(`Perintah: !buy <itemId> [qty]`)

    await sendText(conn, jid, text.join('\n'), quoted)
    return true
  } catch (e) {
    console.error('[Message] Send shop error:', e.message)
    return false
  }
}

/**
 * sendError(conn, jid, errorMessage, quoted = null)
 * Kirim error message dengan formatting
 */
async function sendError(conn, jid, errorMessage, quoted = null) {
  try {
    const text = `❌ *ERROR*\n${errorMessage}`
    await sendText(conn, jid, text, quoted)
    return true
  } catch (e) {
    console.error('[Message] Send error:', e.message)
    return false
  }
}

/**
 * sendSuccess(conn, jid, successMessage, quoted = null)
 * Kirim success message
 */
async function sendSuccess(conn, jid, successMessage, quoted = null) {
  try {
    const text = `✅ *SUCCESS*\n${successMessage}`
    await sendText(conn, jid, text, quoted)
    return true
  } catch (e) {
    console.error('[Message] Send success:', e.message)
    return false
  }
}

/**
 * sendWait(conn, jid, waitMessage = 'Tunggu sebentar...', quoted = null)
 * Kirim waiting message
 */
async function sendWait(conn, jid, waitMessage = 'Tunggu sebentar...', quoted = null) {
  try {
    const text = `⏳ *WAIT*\n${waitMessage}`
    await sendText(conn, jid, text, quoted)
    return true
  } catch (e) {
    console.error('[Message] Send wait:', e.message)
    return false
  }
}

module.exports = {
  sendText,
  sendImage,
  sendVideo,
  sendAudio,
  sendDocument,
  sendProfile,
  sendLocation,
  sendSticker,
  sendRPGProfile,
  sendRPGInventory,
  sendLeaderboard,
  sendShop,
  sendError,
  sendSuccess,
  sendWait
}