// ...existing code...
/**
 * lib/screaper.js
 * Util scraping ringan untuk fitur RPG:
 * - fetchHTML(url) -> cheerio instance
 * - fetchJSON(url) -> axios JSON helper
 * - scrapeOpenGraph(url) -> { title, description, image }
 * - scrapeFirstParagraph(url, selector) -> teks
 * - scrapeImages(url, limit) -> array url
 * - searchMediaWiki(keyword, apiUrl) -> array search results
 * - getMediaWikiExtract(pageId, apiUrl) -> extract ringkas (plain text)
 *
 * Catatan: scraping tergantung struktur situs target. Gunakan fungsi MediaWiki untuk wiki berbasis MediaWiki.
 */

const axios = require('axios')
const cheerio = require('cheerio')
const urlModule = require('url')

const USER_AGENT = 'Mozilla/5.0 (WhatsApp-Bot; +https://github.com)'

/* simple per-host rate limiter (minDelay ms) */
const hostLastCall = new Map()
const DEFAULT_MIN_DELAY = 700 // ms

function sleep(ms) {
  return new Promise(res => setTimeout(res, ms))
}

async function throttleForHost(url, minDelay = DEFAULT_MIN_DELAY) {
  try {
    const host = new urlModule.URL(url).host
    const last = hostLastCall.get(host) || 0
    const now = Date.now()
    const diff = now - last
    if (diff < minDelay) await sleep(minDelay - diff)
    hostLastCall.set(host, Date.now())
  } catch (e) {
    // ignore parse error
  }
}

async function fetchHTML(url, opts = {}) {
  await throttleForHost(url, opts.minDelay || DEFAULT_MIN_DELAY)
  const res = await axios.get(url, {
    headers: {
      'User-Agent': opts.userAgent || USER_AGENT,
      Accept: 'text/html,application/xhtml+xml'
    },
    timeout: opts.timeout || 15000,
    responseType: 'text'
  })
  return cheerio.load(res.data)
}

async function fetchJSON(url, opts = {}) {
  await throttleForHost(url, opts.minDelay || DEFAULT_MIN_DELAY)
  const res = await axios.get(url, {
    headers: { 'User-Agent': opts.userAgent || USER_AGENT, Accept: 'application/json' },
    timeout: opts.timeout || 15000,
    responseType: 'json'
  })
  return res.data
}

async function scrapeOpenGraph(url, opts = {}) {
  try {
    const $ = await fetchHTML(url, opts)
    const meta = (name) => (
      $(`meta[property="${name}"]`).attr('content')
      || $(`meta[name="${name}"]`).attr('content')
      || null
    )
    return {
      title: meta('og:title') || $('title').first().text().trim() || null,
      description: meta('og:description') || $('meta[name="description"]').attr('content') || null,
      image: meta('og:image') || null
    }
  } catch (e) {
    throw new Error('scrapeOpenGraph failed: ' + (e.message || e))
  }
}

async function scrapeFirstParagraph(url, selector = 'p', opts = {}) {
  try {
    const $ = await fetchHTML(url, opts)
    // ambil paragraf pertama non-empty di dalam konten utama jika tersedia
    const main = $('main').length ? $('main') : $('body')
    let text = ''
    main.find(selector).each((i, el) => {
      const t = $(el).text().trim()
      if (t && !text) text = t
    })
    if (!text) text = main.text().replace(/\s+/g, ' ').trim().slice(0, 800)
    return text || null
  } catch (e) {
    throw new Error('scrapeFirstParagraph failed: ' + (e.message || e))
  }
}

async function scrapeImages(url, limit = 5, opts = {}) {
  try {
    const $ = await fetchHTML(url, opts)
    const imgs = []
    $('img').each((i, el) => {
      if (imgs.length >= limit) return
      let src = $(el).attr('data-src') || $(el).attr('src') || ''
      if (!src) return
      try { src = new urlModule.URL(src, url).toString() } catch (e) {}
      imgs.push(src)
    })
    return imgs
  } catch (e) {
    throw new Error('scrapeImages failed: ' + (e.message || e))
  }
}

/* MediaWiki helpers (Wikipedia / wiki berbasis MediaWiki)
 * apiUrl default: https://en.wikipedia.org/w/api.php
 */
async function searchMediaWiki(keyword, apiUrl = 'https://en.wikipedia.org/w/api.php', options = {}) {
  const params = {
    action: 'query',
    list: 'search',
    srsearch: keyword,
    srlimit: options.limit || 5,
    format: 'json'
  }
  const url = apiUrl + '?' + new URLSearchParams(params).toString()
  const data = await fetchJSON(url, { timeout: options.timeout })
  if (!data || !data.query || !data.query.search) return []
  return data.query.search.map(s => ({ pageid: s.pageid, title: s.title, snippet: s.snippet }))
}

async function getMediaWikiExtract(pageIdOrTitle, apiUrl = 'https://en.wikipedia.org/w/api.php', options = {}) {
  const isId = /^\d+$/.test(String(pageIdOrTitle))
  const params = {
    action: 'query',
    prop: 'extracts|pageimages',
    exintro: 1,
    explaintext: 1,
    piprop: 'original',
    format: 'json'
  }
  if (isId) params.pageids = pageIdOrTitle
  else params.titles = pageIdOrTitle

  const url = apiUrl + '?' + new URLSearchParams(params).toString()
  const data = await fetchJSON(url, { timeout: options.timeout })
  if (!data || !data.query || !data.query.pages) return null
  const pages = data.query.pages
  const key = Object.keys(pages)[0]
  const p = pages[key]
  return {
    pageid: p.pageid,
    title: p.title,
    extract: p.extract,
    image: p.original && p.original.source ? p.original.source : null,
    fullurl: p.fullurl || null
  }
}

module.exports = {
  fetchHTML,
  fetchJSON,
  scrapeOpenGraph,
  scrapeFirstParagraph,
  scrapeImages,
  searchMediaWiki,
  getMediaWikiExtract
}
// ...existing code...