// ...existing code...
/**
 * lib/tictactoe.js
 * Simple TicTacToe untuk WhatsApp bot dengan integrasi reward Gold (RPG).
 * Perintah (contoh):
 *  - ttt start @tag|628xxx [bet]   -> buat permainan melawan user
 *  - ttt join <gameId>             -> gabung ke game (jika belum ada opponent)
 *  - ttt move <gameId> <1-9>       -> lakukan move posisi 1..9
 *  - ttt board <gameId>            -> lihat papan
 *  - ttt forfeit <gameId>          -> menyerah (lawan menang)
 *
 * Menyimpan data game ke file ttt.json
 */

const fs = require('fs')
const path = require('path')
const { MessageType } = require('@adiwajshing/baileys')
const funcs = require('./function') // load/save rpg db, ensureUser, addExp, buyItem, dll.

const STORE = path.join(__dirname, '..', 'ttt.json')
function loadStore() {
  try {
    if (!fs.existsSync(STORE)) fs.writeFileSync(STORE, JSON.stringify({}), 'utf8')
    return JSON.parse(fs.readFileSync(STORE, 'utf8') || '{}')
  } catch (e) { return {} }
}
function saveStore(s) {
  try { fs.writeFileSync(STORE, JSON.stringify(s, null, 2), 'utf8'); return true } catch (e) { return false }
}

function makeId() {
  return Date.now().toString(36).slice(-6)
}

function renderBoard(board) {
  const m = board.map(c => c === null ? '⬜' : (c === 'X' ? '❌' : '⭕'))
  return [
    `${m[0]} ${m[1]} ${m[2]}    1 2 3`,
    `${m[3]} ${m[4]} ${m[5]}    4 5 6`,
    `${m[6]} ${m[7]} ${m[8]}    7 8 9`
  ].join('\n')
}

function checkWinner(b) {
  const lines = [
    [0,1,2],[3,4,5],[6,7,8],
    [0,3,6],[1,4,7],[2,5,8],
    [0,4,8],[2,4,6]
  ]
  for (const L of lines) {
    const [a,b1,c] = L
    if (b[a] && b[a] === b[b1] && b[a] === b[c]) return b[a] // 'X' or 'O'
  }
  if (b.every(x => x !== null)) return 'draw'
  return null
}

function normalizeJid(raw) {
  if (!raw) return null
  raw = String(raw)
  // if mention JID already
  if (raw.includes('@')) return raw
  // numeric -> make s.whatsapp.net
  const digits = raw.replace(/\D/g,'')
  if (!digits) return null
  return digits + '@s.whatsapp.net'
}

/**
 * handleTicTacToe(conn, message, cmd, args)
 * returns true if command handled
 */
async function handleTicTacToe(conn, message, cmd, args) {
  try {
    cmd = (cmd || '').toLowerCase()
    const jid = message.key.remoteJid
    const sender = message.key.participant || message.key.remoteJid
    const pushName = message.pushName || ''
    const store = loadStore()

    const reply = async (text) => await conn.sendMessage(jid, text, MessageType.text, { quoted: message })

    if (cmd === 'ttt' || cmd === 'tictactoe') {
      const sub = (args[0] || '').toLowerCase()
      if (!sub || sub === 'help') {
        await reply('TTT Commands:\n- ttt start @tag|number [bet]\n- ttt join <gameId>\n- ttt move <gameId> <pos 1-9>\n- ttt board <gameId>\n- ttt forfeit <gameId>')
        return true
      }

      if (sub === 'start') {
        const targetArg = args[1]
        const bet = Math.max(0, parseInt(args[2]) || 0)
        let opponent = null

        // try mentioned jid
        const ctxInfo = message.message.extendedTextMessage && message.message.extendedTextMessage.contextInfo
        const mentioned = ctxInfo && ctxInfo.mentionedJid && ctxInfo.mentionedJid[0]
        opponent = mentioned || normalizeJid(targetArg)
        if (!opponent) return await reply('Format: ttt start @tag|628xxx [bet]')

        if (opponent === sender) return await reply('Tidak bisa bermain melawan diri sendiri.')
        // check funds
        const db = funcs.loadRpgDB()
        const user = funcs.ensureUser(db, sender)
        const opp = funcs.ensureUser(db, opponent)
        if ((user.gold || 0) < bet) return await reply(`Anda butuh ${bet} Gold untuk taruhan.`)
        if ((opp.gold || 0) < bet) return await reply(`Opponent tidak punya ${bet} Gold (harus punya sebelum join).`)

        const id = makeId()
        store[id] = {
          id,
          creator: sender,
          playerX: sender,     // creator is X
          playerO: opponent,   // opponent is invited O (must join to start)
          bet,
          board: Array(9).fill(null),
          turn: 'X', // X starts
          status: 'waiting', // waiting | playing | ended
          createdAt: Date.now()
        }
        saveStore(store)
        await reply(`Game dibuat: ${id}\nCreator: ${pushName}\nOpponent: ${opponent}\nTaruhan: ${bet} Gold\nOpponent harus ketik: ttt join ${id}`)
        return true
      }

      if (sub === 'join') {
        const id = args[1]
        if (!id) return await reply('Contoh: ttt join <gameId>')
        const game = store[id]
        if (!game) return await reply('Game tidak ditemukan.')
        if (game.status !== 'waiting') return await reply('Game tidak bisa digabung (sudah berjalan).')
        const me = sender
        if (me !== game.playerO && me !== game.playerX) return await reply('Game ini tidak mengundang Anda.')
        // check funds
        const db = funcs.loadRpgDB()
        const user = funcs.ensureUser(db, game.playerX)
        const opp = funcs.ensureUser(db, game.playerO)
        const bet = game.bet || 0
        if ((user.gold || 0) < bet) return await reply('Creator tidak punya cukup Gold.')
        if ((opp.gold || 0) < bet) return await reply('Anda tidak punya cukup Gold untuk taruhan.')
        // lock bets by not deducting now; we deduct at game end (safer)
        game.status = 'playing'
        game.startedAt = Date.now()
        saveStore(store)
        await reply(`Game ${id} dimulai!\nPlayer X: ${game.playerX}\nPlayer O: ${game.playerO}\nTaruhan: ${bet} Gold\nGiliran: ${game.turn}\n\n${renderBoard(game.board)}`)
        return true
      }

      if (sub === 'board') {
        const id = args[1]
        if (!id) return await reply('Contoh: ttt board <gameId>')
        const game = store[id]
        if (!game) return await reply('Game tidak ditemukan.')
        await reply(`Game ${id} (status: ${game.status})\nGiliran: ${game.turn}\n\n${renderBoard(game.board)}`)
        return true
      }

      if (sub === 'move') {
        const id = args[1]
        const pos = parseInt(args[2])
        if (!id || !pos) return await reply('Contoh: ttt move <gameId> <1-9>')
        const game = store[id]
        if (!game) return await reply('Game tidak ditemukan.')
        if (game.status !== 'playing') return await reply('Game belum dimulai atau sudah selesai.')
        const me = sender
        const myMark = (me === game.playerX) ? 'X' : ((me === game.playerO) ? 'O' : null)
        if (!myMark) return await reply('Anda bukan pemain di game ini.')
        if (game.turn !== myMark) return await reply('Bukan giliran Anda.')
        if (pos < 1 || pos > 9) return await reply('Posisi harus 1..9.')
        if (game.board[pos-1] !== null) return await reply('Posisi sudah terisi.')
        game.board[pos-1] = myMark

        const result = checkWinner(game.board)
        if (result === 'draw') {
          game.status = 'ended'
          // no gold transfer on draw
          saveStore(store)
          await reply(`Hasil: Seri!\n\n${renderBoard(game.board)}`)
        } else if (result === 'X' || result === 'O') {
          game.status = 'ended'
          const winnerJid = result === 'X' ? game.playerX : game.playerO
          const loserJid = result === 'X' ? game.playerO : game.playerX
          // reward bet -> winner gets bet*2 (if bet >0). Ensure funds exist, fallback no transfer.
          const db = funcs.loadRpgDB()
          const winner = funcs.ensureUser(db, winnerJid)
          const loser = funcs.ensureUser(db, loserJid)
          const bet = game.bet || 0
          let sw = ''
          if (bet > 0) {
            // check losers funds
            if ((loser.gold || 0) >= bet) {
              loser.gold -= bet
              winner.gold = (winner.gold || 0) + bet
              sw = `\nTaruhan ${bet} Gold dipindahkan dari loser ke winner.`
            } else {
              sw = `\nTaruhan batal — loser tidak punya cukup Gold.`
            }
            funcs.saveRpgDB(db)
          }
          saveStore(store)
          await reply(`Pemenang: ${winnerJid}\nMark: ${result}\n\n${renderBoard(game.board)}${sw}`)
        } else {
          // continue game
          game.turn = (game.turn === 'X') ? 'O' : 'X'
          saveStore(store)
          await reply(`Move terpasang.\nGiliran: ${game.turn}\n\n${renderBoard(game.board)}`)
        }
        return true
      }

      if (sub === 'forfeit') {
        const id = args[1]
        if (!id) return await reply('Contoh: ttt forfeit <gameId>')
        const game = store[id]
        if (!game) return await reply('Game tidak ditemukan.')
        if (game.status === 'ended') return await reply('Game sudah selesai.')
        const me = sender
        if (me !== game.playerX && me !== game.playerO) return await reply('Anda bukan pemain di game ini.')
        const winnerJid = (me === game.playerX) ? game.playerO : game.playerX
        game.status = 'ended'
        // transfer bet if possible from forfeit user -> winner
        const db = funcs.loadRpgDB()
        const winner = funcs.ensureUser(db, winnerJid)
        const loser = funcs.ensureUser(db, me)
        const bet = game.bet || 0
        let sw = ''
        if (bet > 0 && (loser.gold || 0) >= bet) {
          loser.gold -= bet
          winner.gold = (winner.gold || 0) + bet
          funcs.saveRpgDB(db)
          sw = `\nTaruhan ${bet} Gold dipindahkan ke pemenang.`
        }
        saveStore(store)
        await reply(`Player ${me} menyerah.\nPemenang: ${winnerJid}${sw}`)
        return true
      }

      // unknown sub
      await reply('Subcommand tidak dikenali. Ketik: ttt help')
      return true
    }

    return false
  } catch (e) {
    try { await conn.sendMessage(message.key.remoteJid, 'Terjadi error pada modul TicTacToe.', MessageType.text, { quoted: message }) } catch {}
    console.error('tictactoe.js error:', e)
    return true
  }
}

module.exports = { handleTicTacToe }
// ...existing code...