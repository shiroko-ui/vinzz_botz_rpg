/**
 * lib/tts.js
 * Text-to-Speech helper untuk WhatsApp bot
 * Menggunakan Google Translate TTS API (publik, tanpa auth)
 *
 * Fungsi:
 * - textToSpeech(text, lang, outPath) -> download audio .mp3
 * - sendTTS(conn, jid, text, lang, opts) -> kirim pesan audio ke WA
 *
 * Install: npm install axios
 */

const axios = require('axios')
const fs = require('fs')
const path = require('path')

const GOOGLE_TTS_BASE = 'https://translate.google.com/translate_tts'

/**
 * textToSpeech(text, lang = 'id', outPath = './tts.mp3')
 * Download audio dari Google Translate TTS.
 * Mengembalikan path file audio.
 */
async function textToSpeech(text, lang = 'id', outPath = './tts.mp3') {
  if (!text || typeof text !== 'string') throw new Error('Text must be non-empty string')
  
  // pastikan folder parent ada
  const dir = path.dirname(outPath)
  if (dir && !fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })

  try {
    const params = {
      ie: 'UTF-8',
      q: text.slice(0, 200), // google TTS has limit
      tl: lang,
      client: 'tw-ob'
    }

    const url = GOOGLE_TTS_BASE + '?' + new URLSearchParams(params).toString()
    const res = await axios.get(url, {
      responseType: 'stream',
      timeout: 30000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
      }
    })

    return new Promise((resolve, reject) => {
      const writer = fs.createWriteStream(outPath)
      res.data.pipe(writer)
      writer.on('finish', () => resolve(outPath))
      writer.on('error', reject)
    })
  } catch (e) {
    throw new Error('TTS download failed: ' + (e.message || e))
  }
}

/**
 * sendTTS(conn, jid, text, lang = 'id', options)
 * Buat TTS dari text dan kirim ke jid sebagai audio message.
 *
 * options:
 *  - quoted: message object (untuk quote)
 *  - tmpDir: folder temporer (default ./tmp)
 *  - cleanup: hapus file setelah kirim (default true)
 */
async function sendTTS(conn, jid, text, lang = 'id', options = {}) {
  const { MessageType } = require('@adiwajshing/baileys')
  
  if (!text || typeof text !== 'string') throw new Error('Text must be non-empty string')
  if (text.length === 0) throw new Error('Text cannot be empty')

  const tmpDir = options.tmpDir || path.join(process.cwd(), 'tmp')
  if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true })

  const audioFile = path.join(tmpDir, `tts-${Date.now()}.mp3`)
  let cleanup = options.cleanup !== false

  try {
    // download audio
    await textToSpeech(text, lang, audioFile)
    
    // baca file
    const buffer = fs.readFileSync(audioFile)

    // kirim audio message
    await conn.sendMessage(jid, buffer, MessageType.audio, {
      quoted: options.quoted,
      mimetype: 'audio/mpeg',
      ptt: true // play as voice note
    })

    return audioFile
  } catch (e) {
    throw new Error('Send TTS failed: ' + (e.message || e))
  } finally {
    // cleanup
    if (cleanup && fs.existsSync(audioFile)) {
      try { fs.unlinkSync(audioFile) } catch (err) {}
    }
  }
}

/**
 * handleTTS(conn, message, cmd, args)
 * Command handler untuk TTS.
 * Perintah:
 *  - tts <text>  -> buat TTS Bahasa Indonesia (default)
 *  - tts <lang> <text> -> buat TTS dengan bahasa tertentu
 *
 * Contoh:
 *  - !tts Halo dunia
 *  - !tts en Hello world
 */
async function handleTTS(conn, message, cmd, args) {
  try {
    cmd = (cmd || '').toLowerCase()
    if (cmd !== 'tts') return false

    const jid = message.key.remoteJid
    const quoted = message

    // parse args
    let text = ''
    let lang = 'id'

    if (args.length === 0) {
      await conn.sendMessage(jid, 'Contoh: !tts Hello world\n!tts en Hello world', require('@adiwajshing/baileys').MessageType.text, { quoted })
      return true
    }

    // cek apakah arg pertama adalah language code (2 chars, lowercase)
    const first = (args[0] || '').toLowerCase()
    const langCodes = ['id','en','es','fr','de','it','pt','ja','ko','zh','ar','ru','hi']
    
    if (first.length === 2 && langCodes.includes(first)) {
      lang = first
      text = args.slice(1).join(' ')
    } else {
      text = args.join(' ')
    }

    if (!text || text.trim().length === 0) {
      await conn.sendMessage(jid, 'Text tidak boleh kosong.', require('@adiwajshing/baileys').MessageType.text, { quoted })
      return true
    }

    // kirim info sedang diproses
    await conn.sendMessage(jid, global.mess.wait || 'Tunggu sebentar...', require('@adiwajshing/baileys').MessageType.text, { quoted })

    // generate dan kirim TTS
    await sendTTS(conn, jid, text, lang, { quoted, cleanup: true })
    return true
  } catch (e) {
    console.error('TTS handler error:', e)
    try {
      await conn.sendMessage(message.key.remoteJid, 'TTS error: ' + (e.message || e), require('@adiwajshing/baileys').MessageType.text, { quoted: message })
    } catch (err) {}
    return true
  }
}

module.exports = {
  textToSpeech,
  sendTTS,
  handleTTS
}