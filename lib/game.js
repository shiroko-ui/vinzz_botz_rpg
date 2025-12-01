// ...existing code...
const { MessageType } = require('@adiwajshing/baileys')
const funcs = require('./function') // helper RPG (load/save, addExp, buyItem, dll.)

/**
 * handleGame(conn, message, cmd, args)
 * - conn: WAConnection / conn dari baileys
 * - message: object pesan dari baileys
 * - cmd: perintah (string, tanpa prefix)
 * - args: array argumen
 *
 * Mengembalikan true jika perintah ditangani (agar caller bisa skip handler lain).
 */
async function handleGame(conn, message, cmd, args) {
  try {
    const jid = message.key.remoteJid
    const sender = message.key.participant || message.key.remoteJid
    const pushName = message.pushName || ''

    // load db & user
    const db = funcs.loadRpgDB()
    const user = funcs.ensureUser(db, sender)

    // helper reply
    const reply = async (text) => {
      await conn.sendMessage(jid, text, MessageType.text, { quoted: message })
    }

    switch ((cmd || '').toLowerCase()) {
      case 'help':
      case 'menu': {
        const prefixes = Array.isArray(global.prefa) ? global.prefa.join(', ') : '!'
        const lines = [
          'Perintah RPG:',
          '- profile',
          '- stats',
          '- hunt',
          '- fish',
          '- shop',
          '- buy <id> [qty]',
          '- inventory / inv',
          '- use potion',
          '',
          `Prefix: ${prefixes}`
        ]
        await reply(lines.join('\n'))
        return true
      }

      case 'profile': {
        await reply(funcs.profileText(db, sender, pushName))
        return true
      }

      case 'stats': {
        await reply(funcs.statsText(db, sender))
        return true
      }

      case 'hunt': {
        await reply(global.mess.wait)
        const r = (global.rpg && global.rpg.rewards && global.rpg.rewards.hunt) ? global.rpg.rewards.hunt : { minExp: 8, maxExp: 20, minMoney: 20, maxMoney: 80 }
        const gainExp = funcs.rand(r.minExp, r.maxExp)
        const gainMoney = funcs.rand(r.minMoney, r.maxMoney)
        user.gold = (user.gold || 0) + gainMoney
        const res = funcs.addExp(db, sender, gainExp)
        funcs.saveRpgDB(db)
        let text = `Hasil berburu:\n+${gainExp} EXP\n+${gainMoney} Gold`
        if (res.leveled) text += `\n➡️ Kamu naik level! Sekarang level ${res.newLevel}`
        await reply(text)
        return true
      }

      case 'fish':
      case 'fishing': {
        if ((user.umpan || 0) <= 0) {
          await reply('Kamu butuh umpan. Beli di shop.')
          return true
        }
        user.umpan -= 1
        await reply(global.mess.wait)
        const r = (global.rpg && global.rpg.rewards && global.rpg.rewards.fish) ? global.rpg.rewards.fish : { minExp: 5, maxExp: 15, minMoney: 10, maxMoney: 60 }
        const gainExp = funcs.rand(r.minExp, r.maxExp)
        const gainMoney = funcs.rand(r.minMoney, r.maxMoney)
        user.gold = (user.gold || 0) + gainMoney
        const res = funcs.addExp(db, sender, gainExp)
        funcs.saveRpgDB(db)
        let text = `Hasil memancing:\n+${gainExp} EXP\n+${gainMoney} Gold\nSisa umpan: ${user.umpan}`
        if (res.leveled) text += `\n➡️ Kamu naik level! Sekarang level ${res.newLevel}`
        await reply(text)
        return true
      }

      case 'shop': {
        await reply(funcs.shopText())
        return true
      }

      case 'buy': {
        const id = (args[0] || '').trim()
        const qty = Math.max(1, parseInt(args[1]) || 1)
        if (!id) {
          await reply('Contoh: !buy potion 1')
          return true
        }
        const res = funcs.buyItem(db, sender, id, qty)
        if (!res.ok) {
          if (res.reason === 'not_found') await reply('Item tidak ditemukan.')
          else if (res.reason === 'no_money') await reply(`Gold tidak cukup. Butuh ${res.need} Gold.`)
          else await reply('Gagal membeli item.')
        } else {
          funcs.saveRpgDB(db)
          const def = (global.rpg && global.rpg.items && global.rpg.items[id]) || {}
          await reply(`Berhasil membeli ${qty}x ${def.name || id}. Sisa Gold: ${res.remainGold}`)
        }
        return true
      }

      case 'inventory':
      case 'inv': {
        await reply(funcs.invText(db, sender))
        return true
      }

      case 'use': {
        const sub = (args[0] || '').toLowerCase()
        if (sub === 'potion') {
          const res = funcs.usePotion(db, sender)
          if (!res.ok) await reply('Kamu tidak punya potion.')
          else {
            funcs.saveRpgDB(db)
            await reply(`Menggunakan potion. HP sekarang ${res.hp}/${res.maxHp}`)
          }
          return true
        }
        // fallback: tidak ditangani
        return false
      }

      default:
        return false
    }
  } catch (e) {
    try { await conn.sendMessage(message.key.remoteJid, 'Terjadi error pada modul RPG.', MessageType.text, { quoted: message }) } catch {}
    console.error('game.js error:', e)
    return true
  }
}

module.exports = { handleGame }
// ...existing code...