// ...existing code...
/**
 * lib/pixiv.js
 * Helper untuk mengambil data ilustrasi Pixiv (search, get illust, random, download)
 *
 * NOTE:
 * - Modul ini menggunakan proxy publik https://api.imjad.cn/pixiv/v1/ untuk kemudahan.
 * - Untuk produksi sebaiknya gunakan API resmi atau service berbayar untuk menghindari rate-limit.
 * - Install dependency: npm install axios
 */

const axios = require('axios')
const fs = require('fs')
const path = require('path')

const PIXIV_PROXY = process.env.PIXIV_PROXY || 'https://api.imjad.cn/pixiv/v1/'

async function _get(url, params = {}) {
  try {
    const res = await axios.get(url, { params, timeout: 20000 })
    return res.data
  } catch (e) {
    throw new Error('Pixiv proxy request failed: ' + (e.message || e))
  }
}

/**
 * search(keyword, options)
 * - keyword: kata kunci pencarian
 * - options: { page = 1, pageSize = 30 }
 * Mengembalikan array ilustrasi (ringkasan)
 */
async function search(keyword, options = {}) {
  const page = options.page || 1
  // proxy imjad: type=search & word
  const data = await _get(PIXIV_PROXY, { type: 'search', word: keyword, page })
  if (!data || !data.response) return []
  // data.response adalah array objek illust
  return (data.response || []).map(i => ({
    id: i.id,
    title: i.title,
    author: i.user ? i.user.name : (i.author || ''),
    authorId: i.user ? i.user.id : null,
    pageCount: i.pageCount || (i.images ? Object.keys(i.images).length : 1),
    // ambil url gambar (original jika tersedia, fallback medium)
    imageUrls: (function () {
      try {
        // beberapa respons berbeda struktur; prioritaskan original_urls atau meta_single_page / meta_pages
        if (i.meta_single_page && i.meta_single_page.original_image_url) return [i.meta_single_page.original_image_url]
        if (i.meta_pages && i.meta_pages.length) return i.meta_pages.map(p => p.image_urls && (p.image_urls.original || p.image_urls.large || p.image_urls.medium)).filter(Boolean)
        if (i.image_urls && (i.image_urls.original || i.image_urls.large || i.image_urls.medium)) return [i.image_urls.original || i.image_urls.large || i.image_urls.medium]
      } catch (e) {}
      return []
    })(),
    tags: i.tags ? i.tags.map(t => t.name || t) : []
  }))
}

/**
 * getIllust(id)
 * - id: ilustrasi id
 * Mengembalikan objek lengkap hasil proxy (response[0]) atau null
 */
async function getIllust(id) {
  const data = await _get(PIXIV_PROXY, { type: 'illust', id })
  if (!data || !data.response || !data.response[0]) return null
  const i = data.response[0]
  const imageUrls = (i.meta_single_page && i.meta_single_page.original_image_url)
    ? [i.meta_single_page.original_image_url]
    : (i.meta_pages ? i.meta_pages.map(p => p.image_urls && (p.image_urls.original || p.image_urls.large || p.image_urls.medium)).filter(Boolean) : (i.image_urls ? [i.image_urls.original || i.image_urls.large || i.image_urls.medium] : []))
  return {
    id: i.id,
    title: i.title,
    description: i.description,
    author: i.user ? i.user.name : (i.author || ''),
    authorId: i.user ? i.user.id : null,
    tags: i.tags ? i.tags.map(t => t.name || t) : [],
    pageCount: i.pageCount || (imageUrls.length || 1),
    imageUrls
  }
}

/**
 * randomFromSearch(keyword, options)
 * - ambil daftar dari search lalu kembalikan satu item acak
 */
async function randomFromSearch(keyword, options = {}) {
  const list = await search(keyword, options)
  if (!list || list.length === 0) return null
  const idx = Math.floor(Math.random() * list.length)
  return list[idx]
}

/**
 * downloadImage(url, outPath)
 * - url: url gambar
 * - outPath: path file keluaran (jika folder, nama file dibuat otomatis)
 * Mengembalikan path file hasil download
 */
async function downloadImage(url, outPath) {
  if (!url) throw new Error('Invalid image url')
  const res = await axios.get(url, { responseType: 'stream', timeout: 30000 })
  let out = outPath
  let basename = `${Date.now()}.jpg`

  // jika outPath adalah folder, buat nama berdasarkan url
  try {
    // extract basename dari URL
    try {
      basename = path.basename(new URL(url).pathname) || basename
    } catch (parseErr) {
      // fallback ke default jika URL parse gagal
    }

    const stat = fs.existsSync(outPath) && fs.statSync(outPath)
    if (stat && stat.isDirectory()) {
      out = path.join(outPath, basename)
    } else if (outPath.endsWith(path.sep)) {
      // treat as dir
      if (!fs.existsSync(outPath)) fs.mkdirSync(outPath, { recursive: true })
      out = path.join(outPath, basename)
    }
  } catch (e) {
    // ignore path handling errors
  }

  await new Promise((resolve, reject) => {
    const writer = fs.createWriteStream(out)
    res.data.pipe(writer)
    writer.on('finish', resolve)
    writer.on('error', reject)
  })
  return out
}

module.exports = {
  search,
  getIllust,
  randomFromSearch,
  downloadImage,
  _proxyBase: PIXIV_PROXY
}
// ...existing code...