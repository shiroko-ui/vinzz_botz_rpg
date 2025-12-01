// ...existing code...
process.env['NODE_TLS_REJECT_UNAUTHORIZED'] = '0'
import './config.js'
// ...existing code...

import * as baileys from '@adiwajshing/baileys'
import qrcode from 'qrcode-terminal'
import fs from 'fs'
import path from 'path'

const authFile = path.join(process.cwd(), 'session.json')
const rpgFile = path.join(process.cwd(), 'rpgdb.json')
const { state, saveState } = baileys.useSingleFileAuthState(authFile)
const store = baileys.makeInMemoryStore({})

// simple DB helpers untuk RPG
function loadRpgDB() {
  try {
    if (!fs.existsSync(rpgFile)) fs.writeFileSync(rpgFile, JSON.stringify({}), 'utf8')
    const raw = fs.readFileSync(rpgFile, 'utf8') || '{}'
    return JSON.parse(raw)
  } catch (e) {
    console.error('Error load rpg db:', e)
    return {}
  }
}
function saveRpgDB(db) {
  try {
    fs.writeFileSync(rpgFile, JSON.stringify(db, null, 2), 'utf8')
  } catch (e) {
    console.error('Error save rpg db:', e)
  }
}
function getUser(db, jid) {
  if (!db[jid]) {
    db[jid] = global.rpg?.generateStarter ? global.rpg.generateStarter() : {
      darah: 100, maxDarah: 100, besi: 0, gold: 0, emerald: 0, umpan: 0, potion: 0,
      exp: 0, level: 1, attack: 10, defense: 5, inventory: {}
    }
  }
  return db[jid]
}
function addExp(db, jid, xp) {
  const user = getUser(db, jid)
  user.exp += xp
  let leveled = false
  while (user.exp >= (global.rpg?.xpToLevel ? global.rpg.xpToLevel(user.level) : 100 * Math.pow(user.level,1.5))) {
    const need = global.rpg?.xpToLevel ? global.rpg.xpToLevel(user.level) : Math.floor(100 * Math.pow(user.level,1.5))
    user.exp -= need
    user.level += 1
    // apply growth
    if (global.rpg?.growth) {
      user.maxDarah += global.rpg.growth.darahPerLevel || 0
      user.attack += global.rpg.growth.attackPerLevel || 0
      user.defense += global.rpg.growth.defensePerLevel || 0
    }
    user.darah = Math.min(user.maxDarah, user.darah + (global.rpg?.growth?.darahPerLevel || 0))
    leveled = true
  }
  return leveled
}

function rand(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min }

// main starter
export async function startBot() {
  try {
    const { version } = await baileys.fetchLatestBaileysVersion().catch(() => ({ version: [2,2204,13] }))
    const sock = baileys.makeWASocket.default({
      version,
      printQRInTerminal: true,
      auth: state,
      browser: ['VinzzBot','Safari','1.0']
    })

    store.bind(sock.ev)
    sock.ev.on('creds.update', saveState)

    sock.ev.on('connection.update', (update) => {
      const { connection, lastDisconnect, qr } = update
      if (qr) qrcode.generate(qr, { small: true })
      if (connection === 'open') console.log('✅ Bot connected')
      if (connection === 'close') {
        console.log('⚠️ Connection closed:', lastDisconnect?.error?.output || lastDisconnect)
        setTimeout(() => startBot(), 3000)
      }
    })

    // pesan masuk
    sock.ev.on('messages.upsert', async (m) => {
      try {
        if (m.type !== 'notify') return
        const msg = m.messages[0]
        if (!msg.message) return
        if (msg.key && msg.key.fromMe) return

        const messageContent = msg.message.conversation
          || msg.message.extendedTextMessage?.text
          || msg.message.imageMessage?.caption
          || ''

        const body = (messageContent || '').trim()
        if (!body) return

        const prefixes = Array.isArray(global.prefa) ? global.prefa : ['!']
        const usedPrefix = prefixes.find(p => p && body.startsWith(p)) ?? (prefixes.includes('') ? '' : null)
        if (usedPrefix === null) return

        const args = body.slice(usedPrefix.length).trim().split(/\s+/)
        const cmd = (args.shift() || '').toLowerCase()
        const from = msg.key.remoteJid
        const isGroup = from.endsWith('@g.us')

        // load DB
        const db = loadRpgDB()
        const user = getUser(db, msg.key.participant || msg.key.remoteJid)

        // perintah RPG
        if (cmd === 'help' || cmd === 'menu') {
          const help = [
            'Perintah RPG:',
            '- profile',
            '- stats',
            '- hunt',
            '-fish',
            '- shop',
            '- buy <id>',
            '- inventory',
            '- use potion',
            '',
            'Contoh: !buy potion'
          ].join('\n')
          await sock.sendMessage(from, { text: help }, { quoted: msg })
        } else if (cmd === 'profile') {
          const nextXp = global.rpg?.xpToLevel ? global.rpg.xpToLevel(user.level) : Math.floor(100 * Math.pow(user.level,1.5))
          const txt = `Profile ${msg.pushName || 'Player'}\nLevel: ${user.level}\nExp: ${user.exp}/${nextXp}\nHP: ${user.darah}/${user.maxDarah}\nGold: ${user.gold}\nBesi: ${user.besi}\nUmpan: ${user.umpan}\nPotion: ${user.potion}`
          await sock.sendMessage(from, { text: txt }, { quoted: msg })
        } else if (cmd === 'stats') {
          const txt = `Stats:\nAttack: ${user.attack}\nDefense: ${user.defense}\nMax HP: ${user.maxDarah}`
          await sock.sendMessage(from, { text: txt }, { quoted: msg })
        } else if (cmd === 'hunt') {
          await sock.sendMessage(from, { text: global.mess.wait }, { quoted: msg })
          const r = global.rpg?.rewards?.hunt || { minExp: 8, maxExp: 20, minMoney: 20, maxMoney: 80 }
          const gainExp = rand(r.minExp, r.maxExp)
          const gainMoney = rand(r.minMoney, r.maxMoney)
          user.gold += gainMoney
          const leveled = addExp(db, msg.key.participant || msg.key.remoteJid, gainExp)
          saveRpgDB(db)
          let reply = `Hasil berburu:\n+${gainExp} EXP\n+${gainMoney} Gold`
          if (leveled) reply += `\n➡️ Kamu naik level! Sekarang level ${user.level}`
          await sock.sendMessage(from, { text: reply }, { quoted: msg })
        } else if (cmd === 'fish' || cmd === 'fishing') {
          if ((user.umpan || 0) <= 0) {
            await sock.sendMessage(from, { text: 'Kamu butuh umpan. Beli di shop.' }, { quoted: msg })
          } else {
            user.umpan -= 1
            await sock.sendMessage(from, { text: global.mess.wait }, { quoted: msg })
            const r = global.rpg?.rewards?.fish || { minExp: 5, maxExp: 15, minMoney: 10, maxMoney: 60 }
            const gainExp = rand(r.minExp, r.maxExp)
            const gainMoney = rand(r.minMoney, r.maxMoney)
            user.gold += gainMoney
            const leveled = addExp(db, msg.key.participant || msg.key.remoteJid, gainExp)
            saveRpgDB(db)
            let reply = `Hasil memancing:\n+${gainExp} EXP\n+${gainMoney} Gold\nSisa umpan: ${user.umpan}`
            if (leveled) reply += `\n➡️ Kamu naik level! Sekarang level ${user.level}`
            await sock.sendMessage(from, { text: reply }, { quoted: msg })
          }
        } else if (cmd === 'shop') {
          const shop = global.rpg?.shop || []
          const lines = ['Toko:']
          shop.forEach(it => {
            const item = (global.rpg?.items && global.rpg.items[it.id]) || {}
            lines.push(`- ${it.id} (${item.name || it.id}): ${it.price} Gold / ${it.qty}`)
          })
          await sock.sendMessage(from, { text: lines.join('\n') }, { quoted: msg })
        } else if (cmd === 'buy') {
          const id = (args[0] || '').trim()
          const qty = Math.max(1, parseInt(args[1]) || 1)
          if (!id) {
            await sock.sendMessage(from, { text: 'Contoh: !buy potion 1' }, { quoted: msg })
          } else {
            const itemDef = global.rpg?.items?.[id]
            if (!itemDef) {
              await sock.sendMessage(from, { text: 'Item tidak ditemukan.' }, { quoted: msg })
            } else {
              const total = (itemDef.price || 0) * qty
              if ((user.gold || 0) < total) {
                await sock.sendMessage(from, { text: `Gold tidak cukup. Butuh ${total} Gold.` }, { quoted: msg })
              } else {
                user.gold -= total
                // handle specific stock fields (potion, umpan) for convenience
                if (id === 'potion') user.potion = (user.potion || 0) + qty
                else if (id === 'umpan') user.umpan = (user.umpan || 0) + qty
                else user.inventory[id] = (user.inventory[id] || 0) + qty
                saveRpgDB(db)
                await sock.sendMessage(from, { text: `Berhasil membeli ${qty}x ${itemDef.name || id}. Sisa Gold: ${user.gold}` }, { quoted: msg })
              }
            }
          }
        } else if (cmd === 'inventory' || cmd === 'inv') {
          const inv = user.inventory || {}
          const lines = ['Inventory:']
          Object.keys(inv).forEach(k => lines.push(`- ${k}: ${inv[k]}`))
          lines.push(`Potion: ${user.potion || 0}\nUmpan: ${user.umpan || 0}`)
          await sock.sendMessage(from, { text: lines.join('\n') }, { quoted: msg })
        } else if (cmd === 'use' && args[0] === 'potion') {
          if ((user.potion || 0) <= 0) {
            await sock.sendMessage(from, { text: 'Kamu tidak punya potion.' }, { quoted: msg })
          } else {
            const heal = (global.rpg?.items?.potion?.heal) || 50
            user.potion -= 1
            user.darah = Math.min(user.maxDarah, (user.darah || 0) + heal)
            saveRpgDB(db)
            await sock.sendMessage(from, { text: `Menggunakan potion. HP sekarang ${user.darah}/${user.maxDarah}` }, { quoted: msg })
          }
        } else {
          // perintah lain diabaikan
        }

      } catch (err) {
        console.error('Message handler error:', err)
      }
    })

    // handle process exit to save state & rpg db
    process.on('SIGINT', async () => {
      try { saveRpgDB(loadRpgDB()) } catch(e) {}
      try { await saveState() } catch(e) {}
      process.exit(0)
    })

    return sock
  } catch (err) {
    console.error('Start bot error:', err)
    setTimeout(() => startBot(), 5000)
  }
}

// start immediately
startBot()
// ...existing code...
