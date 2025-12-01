// ...existing code...
/**
 * exif.js
 * Util untuk membuat EXIF metadata sticker (packname, author) dan menyematkannya
 * ke file .webp (jika webpmux tersedia). Digunakan untuk membuat sticker WA dengan metadata.
 *
 * Cara pakai singkat:
 * const exif = require('./lib/exif')
 * // membuat buffer exif
 * const buf = exif.createExifBuffer('Nama Pack', 'Author')
 * // simpan sebagai file .exif jika perlu:
 * exif.writeExifFile(buf, './temp.exif')
 * // atau langsung coba embed ke webp (butuh webpmux di PATH):
 * await exif.embedExifToWebp('./input.webp', './out-with-exif.webp', 'Nama Pack', 'Author')
 */

const fs = require('fs')
const os = require('os')
const path = require('path')
const { spawnSync } = require('child_process')
const crypto = require('crypto')

/**
 * createExifBuffer(packname, author, emojis = ['🗿'])
 * Mengembalikan Buffer berisi metadata EXIF (format yang umum dipakai bot WA).
 * Buffer ini dapat disimpan lalu dipakai dengan webpmux -set exif.
 */
function createExifBuffer(packname = 'Sticker', author = 'Bot', emojis = ['🗿']) {
  const exif = {
    "sticker-pack-id": crypto.randomUUID ? crypto.randomUUID() : crypto.randomBytes(16).toString('hex'),
    "sticker-pack-name": String(packname || 'Sticker'),
    "sticker-pack-publisher": String(author || 'Bot'),
    "emojis": Array.isArray(emojis) ? emojis : [String(emojis || '🗿')]
  }

  const json = Buffer.from(JSON.stringify(exif), 'utf8')
  // header minimal (widely used pattern in many bot repos)
  const header = Buffer.from([
    0x49,0x49,0x2A,0x00, // TIFF little-endian marker
    0x08,0x00,0x00,0x00, // offset to first IFD
    0x01,0x00,           // number of directory entries (fake)
    0x00,0x00,0x00,0x00, // placeholder
    0x00,0x00,0x00,0x00  // placeholder
  ])

  // beberapa implementasi menyimpan panjang json sebelum payload
  const lenBuf = Buffer.alloc(4)
  lenBuf.writeUInt32LE(json.length, 0)

  return Buffer.concat([header, lenBuf, json])
}

/**
 * writeExifFile(buffer, outPath)
 * Simpan buffer EXIF ke file (digunakan jika ingin meng-embed via webpmux)
 */
function writeExifFile(buffer, outPath) {
  fs.writeFileSync(outPath, buffer)
  return outPath
}

/**
 * embedExifToWebp(inputWebp, outputWebp, packname, author)
 * Coba membuat EXIF dan embed ke inputWebp menjadi outputWebp menggunakan webpmux.
 * Jika webpmux tidak tersedia, fungsi akan melempar Error.
 *
 * Note: Anda harus memasang libwebp (webpmux) di sistem (Termux: pkg install libwebp).
 */
function embedExifToWebp(inputWebp, outputWebp, packname = 'Sticker', author = 'Bot', emojis = ['🗿']) {
  if (!fs.existsSync(inputWebp)) throw new Error('inputWebp not found: ' + inputWebp)

  // cek webpmux
  const which = spawnSync(process.platform === 'win32' ? 'where' : 'which', ['webpmux'])
  if (which.status !== 0) {
    throw new Error('webpmux not found in PATH. Install libwebp (webpmux) to enable embedding EXIF.')
  }

  const tmp = os.tmpdir()
  const exifPath = path.join(tmp, `exif-${Date.now()}.exif`)
  const buf = createExifBuffer(packname, author, emojis)
  writeExifFile(buf, exifPath)

  // jalankan: webpmux -set exif exifPath input.webp -o output.webp
  const res = spawnSync('webpmux', ['-set', 'exif', exifPath, inputWebp, '-o', outputWebp], { stdio: 'pipe' })

  // bersihkan tmp
  try { fs.unlinkSync(exifPath) } catch (e) {}

  if (res.status !== 0) {
    const errMsg = res.stderr ? res.stderr.toString() : 'webpmux failed'
    throw new Error('Failed to embed exif: ' + errMsg)
  }

  return outputWebp
}

module.exports = {
  createExifBuffer,
  writeExifFile,
  embedExifToWebp
}
// ...existing code...