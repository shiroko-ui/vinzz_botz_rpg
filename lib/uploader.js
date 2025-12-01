/**
 * lib/uploader.js
 * Helper untuk upload file ke layanan cloud (imgbb, telegra.ph, catbox, dll)
 * Berguna untuk menyimpan screenshot profil RPG, sticker, gambar, dll.
 *
 * Fungsi:
 * - uploadToImgbb(filePath, apiKey) -> { url, deleteUrl }
 * - uploadToTelegraph(filePath, fileName) -> { url }
 * - uploadToTinyUrl(longUrl) -> { shortUrl }
 * - uploadImageBuffer(buffer, service, opts) -> { url, ... }
 *
 * Install: npm install axios form-data
 */

const axios = require('axios')
const FormData = require('form-data')
const fs = require('fs')
const path = require('path')

// ====================================
// ImgBB (memerlukan API key gratis)
// ====================================
/**
 * uploadToImgbb(filePath, apiKey)
 * Upload image ke imgbb.
 * Returns: { url, deleteUrl, expiresIn }
 * 
 * Dapatkan API key gratis di https://imgbb.com/api
 */
async function uploadToImgbb(filePath, apiKey) {
  if (!fs.existsSync(filePath)) throw new Error('File not found: ' + filePath)
  if (!apiKey) throw new Error('ImgBB API key required')

  const form = new FormData()
  form.append('image', fs.createReadStream(filePath))
  form.append('key', apiKey)

  try {
    const res = await axios.post('https://api.imgbb.com/1/upload', form, {
      headers: form.getHeaders(),
      timeout: 60000
    })

    if (res.data && res.data.success && res.data.data) {
      return {
        url: res.data.data.url,
        deleteUrl: res.data.data.delete_url,
        expiresIn: res.data.data.expiration
      }
    }
    throw new Error('ImgBB upload failed')
  } catch (e) {
    throw new Error('ImgBB error: ' + (e.message || e))
  }
}

// ====================================
// Telegra.ph (gratis, no auth)
// ====================================
/**
 * uploadToTelegraph(filePath, fileName)
 * Upload image ke telegra.ph (gratis, tanpa auth).
 * Returns: { url }
 */
async function uploadToTelegraph(filePath, fileName = 'image') {
  if (!fs.existsSync(filePath)) throw new Error('File not found: ' + filePath)

  const form = new FormData()
  form.append('file', fs.createReadStream(filePath), fileName)

  try {
    const res = await axios.post('https://telegra.ph/upload', form, {
      headers: form.getHeaders(),
      timeout: 60000
    })

    if (Array.isArray(res.data) && res.data[0] && res.data[0].src) {
      return {
        url: 'https://telegra.ph' + res.data[0].src
      }
    }
    throw new Error('Telegraph upload failed')
  } catch (e) {
    throw new Error('Telegraph error: ' + (e.message || e))
  }
}

// ====================================
// Catbox (gratis, no auth, 24h temp)
// ====================================
/**
 * uploadToCatbox(filePath)
 * Upload file ke catbox.moe (gratis, temporary 24h).
 * Returns: { url }
 */
async function uploadToCatbox(filePath) {
  if (!fs.existsSync(filePath)) throw new Error('File not found: ' + filePath)

  const form = new FormData()
  form.append('reqtype', 'fileupload')
  form.append('fileToUpload', fs.createReadStream(filePath))

  try {
    const res = await axios.post('https://catbox.moe/user/api.php', form, {
      headers: form.getHeaders(),
      timeout: 60000
    })

    const url = res.data.trim()
    if (!url.startsWith('http')) throw new Error('Catbox upload failed: ' + url)
    return { url }
  } catch (e) {
    throw new Error('Catbox error: ' + (e.message || e))
  }
}

// ====================================
// Pomf.loli.cloud (gratis, no auth)
// ====================================
/**
 * uploadToPomf(filePath)
 * Upload file ke pomf.loli.cloud (gratis).
 * Returns: { url }
 */
async function uploadToPomf(filePath) {
  if (!fs.existsSync(filePath)) throw new Error('File not found: ' + filePath)

  const form = new FormData()
  form.append('files[]', fs.createReadStream(filePath))

  try {
    const res = await axios.post('https://pomf.loli.cloud/upload.php', form, {
      headers: form.getHeaders(),
      timeout: 60000
    })

    if (res.data && res.data.files && res.data.files[0]) {
      return { url: res.data.files[0].url }
    }
    throw new Error('Pomf upload failed')
  } catch (e) {
    throw new Error('Pomf error: ' + (e.message || e))
  }
}

// ====================================
// TinyURL (URL shortener)
// ====================================
/**
 * uploadToTinyUrl(longUrl)
 * Shorten URL menggunakan TinyURL.
 * Returns: { shortUrl }
 */
async function uploadToTinyUrl(longUrl) {
  if (!longUrl) throw new Error('Long URL required')

  try {
    const res = await axios.get('https://tinyurl.com/api-create.php', {
      params: { url: longUrl },
      timeout: 15000
    })

    const shortUrl = res.data.trim()
    if (!shortUrl.startsWith('http')) throw new Error('TinyURL failed')
    return { shortUrl }
  } catch (e) {
    throw new Error('TinyURL error: ' + (e.message || e))
  }
}

// ====================================
// Generic uploader (buffer)
// ====================================
/**
 * uploadImageBuffer(buffer, service, opts)
 * Upload buffer/image ke service.
 * 
 * service: 'imgbb' | 'telegraph' | 'catbox' | 'pomf'
 * opts: { apiKey (for imgbb), fileName }
 * 
 * Returns: { url, ... }
 */
async function uploadImageBuffer(buffer, service = 'telegraph', opts = {}) {
  if (!Buffer.isBuffer(buffer)) throw new Error('Buffer required')

  const tmpFile = path.join(process.cwd(), 'tmp', `upload-${Date.now()}.jpg`)
  const tmpDir = path.dirname(tmpFile)
  if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true })

  try {
    // simpan buffer ke file sementara
    fs.writeFileSync(tmpFile, buffer)

    let result
    switch (service.toLowerCase()) {
      case 'imgbb':
        result = await uploadToImgbb(tmpFile, opts.apiKey)
        break
      case 'telegraph':
      case 'telegra.ph':
        result = await uploadToTelegraph(tmpFile, opts.fileName || 'image')
        break
      case 'catbox':
        result = await uploadToCatbox(tmpFile)
        break
      case 'pomf':
        result = await uploadToPomf(tmpFile)
        break
      default:
        throw new Error('Unknown service: ' + service)
    }

    return result
  } finally {
    // cleanup
    try { if (fs.existsSync(tmpFile)) fs.unlinkSync(tmpFile) } catch (e) {}
  }
}

// ====================================
// Handler command untuk upload
// ====================================
/**
 * handleUpload(conn, message, cmd, args)
 * Command handler untuk upload image/file.
 * Perintah:
 *  - upload <service>  -> upload quoted image ke service
 *
 * service: 'telegraph' (default) | 'catbox' | 'pomf' | 'imgbb'
 */
async function handleUpload(conn, message, cmd, args) {
  try {
    cmd = (cmd || '').toLowerCase()
    if (cmd !== 'upload') return false

    const { MessageType } = require('@adiwajshing/baileys')
    const jid = message.key.remoteJid
    const quoted = message.message.extendedTextMessage && message.message.extendedTextMessage.contextInfo

    if (!quoted || !quoted.quotedMessage) {
      await conn.sendMessage(jid, 'Reply image/file untuk di-upload.', MessageType.text, { quoted: message })
      return true
    }

    let service = (args[0] || 'telegraph').toLowerCase()
    if (!['telegraph','catbox','pomf','imgbb'].includes(service)) service = 'telegraph'

    await conn.sendMessage(jid, global.mess.wait || 'Uploading...', MessageType.text, { quoted: message })

    // download media dari quoted message
    const quotedMsg = quoted.quotedMessage
    let mediaBuffer = null

    if (quotedMsg.imageMessage) {
      mediaBuffer = await conn.downloadMediaMessage(quotedMsg)
    } else if (quotedMsg.videoMessage) {
      mediaBuffer = await conn.downloadMediaMessage(quotedMsg)
    } else {
      await conn.sendMessage(jid, 'Hanya image/video yang bisa di-upload.', MessageType.text, { quoted: message })
      return true
    }

    // upload
    const opts = service === 'imgbb' ? { apiKey: global.APIKeys && global.APIKeys['imgbb'] } : {}
    const result = await uploadImageBuffer(mediaBuffer, service, opts)

    // short url jika perlu
    let text = `Upload sukses! (${service})\n${result.url}`
    if (result.url && result.url.length > 50) {
      try {
        const short = await uploadToTinyUrl(result.url)
        text += `\nShort URL: ${short.shortUrl}`
      } catch (e) { /* ignore */ }
    }

    await conn.sendMessage(jid, text, MessageType.text, { quoted: message })
    return true
  } catch (e) {
    console.error('Upload handler error:', e)
    try {
      await conn.sendMessage(message.key.remoteJid, 'Upload error: ' + (e.message || e), require('@adiwajshing/baileys').MessageType.text, { quoted: message })
    } catch (err) {}
    return true
  }
}

module.exports = {
  uploadToImgbb,
  uploadToTelegraph,
  uploadToCatbox,
  uploadToPomf,
  uploadToTinyUrl,
  uploadImageBuffer,
  handleUpload
}