/**
 * Сборщик рыночных цен -> public/prices.json
 *
 * Приложение работает на встроенной базе расценок и БЕЗ этого фида.
 * Сборщик лишь уточняет цены; любой сбой источника не ломает приложение —
 * непришедшие позиции просто остаются на базовых значениях.
 *
 * Запуск: node scripts/scrape.mjs
 * Включить Профи.ру: ENABLE_PROFI=1 node scripts/scrape.mjs
 */

import { writeFile, readFile, mkdir } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const OUT = resolve(ROOT, 'public/prices.json')

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36'

/** Ключевые слова -> id позиции в базе. Первое совпадение выигрывает. */
const MATCH_RULES = [
  { id: 'w-wall', any: ['на стен'], not: ['демонтаж', 'выравнив', 'штукатур'] },
  { id: 'w-floor', any: ['на пол'], not: ['демонтаж', 'тёплый', 'теплый', 'стяжк'] },
  { id: 'w-large', any: ['крупноформат', 'крупного формата', 'большого формата'] },
  { id: 'w-diagonal', any: ['диагонал'] },
  { id: 'w-herringbone', any: ['ёлочк', 'елочк'] },
  { id: 'w-brick', any: ['вразбежку', 'кабанчик'] },
  { id: 'w-mosaic-net', any: ['мозаик'] },
  { id: 'w-apron', any: ['фартук'] },
  { id: 'w-grout-epoxy', any: ['эпоксид'] },
  { id: 'w-grout', any: ['затирк'], not: ['эпоксид'] },
  { id: 'w-demo-wall', any: ['демонтаж'], all: ['стен'] },
  { id: 'w-demo-floor', any: ['демонтаж'], all: ['пол'] },
  { id: 'w-waterproof', any: ['гидроизоляц'] },
  { id: 'w-primer', any: ['грунтов'] },
  { id: 'w-screed', any: ['стяжк', 'наливной пол'] },
  { id: 'w-plinth', any: ['плинтус', 'бордюр'] },
  { id: 'w-45', any: ['запил', 'под 45', 'ус '] },
  { id: 'w-hole', any: ['отверсти'] },
  { id: 'w-stairs', any: ['ступен'] },
  { id: 'w-bath-turnkey', any: ['под ключ'] },
]

/** Цена за м² работ ниже/выше этих границ — явно мусор из разметки */
const SANE_MIN = 50
const SANE_MAX = 15000

function matchId(title) {
  const t = title.toLowerCase()
  for (const rule of MATCH_RULES) {
    if (rule.not?.some((w) => t.includes(w))) continue
    if (rule.all && !rule.all.every((w) => t.includes(w))) continue
    if (rule.any.some((w) => t.includes(w))) return rule.id
  }
  return null
}

async function fetchText(url, timeoutMs = 20000) {
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), timeoutMs)
  try {
    const res = await fetch(url, {
      signal: ctrl.signal,
      headers: {
        'User-Agent': UA,
        'Accept-Language': 'ru-RU,ru;q=0.9',
        Accept: 'text/html,application/xhtml+xml',
      },
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    return await res.text()
  } finally {
    clearTimeout(timer)
  }
}

/**
 * Профи.ру. ВНИМАНИЕ: пользовательское соглашение Профи.ру запрещает
 * автоматическое извлечение данных с сайта. Источник выключен по умолчанию
 * и включается только осознанно — переменной ENABLE_PROFI=1.
 */
async function scrapeProfi() {
  if (process.env.ENABLE_PROFI !== '1') {
    return {
      status: 'skipped',
      note: 'выключен: ToS Профи.ру запрещает автоматический сбор (ENABLE_PROFI=1 чтобы включить)',
      prices: [],
    }
  }

  const html = await fetchText('https://profi.ru/remont/plitochniki/price/')
  const prices = []
  const seen = new Set()

  // Строки вида "Укладка плитки на пол ... от 1400 ₽ за кв.м"
  const re = /([А-ЯЁA-Z][^<>{}"]{5,80}?)[^<>]{0,120}?от\s*([\d\s]{3,7})\s*(?:₽|руб)/gi
  for (const m of html.matchAll(re)) {
    const title = m[1].replace(/\s+/g, ' ').trim()
    const price = Number(m[2].replace(/\s/g, ''))
    const id = matchId(title)
    if (!id || seen.has(id)) continue
    if (!(price >= SANE_MIN && price <= SANE_MAX)) continue
    seen.add(id)
    prices.push({ id, price, source: 'profi' })
  }

  if (prices.length === 0) throw new Error('разметка не распозналась — 0 позиций')
  return { status: 'ok', note: `распознано ${prices.length} позиций`, prices }
}

/**
 * Авито блокирует дата-центровые IP на уровне ASN: из GitHub Actions
 * (диапазоны Azure) запрос не проходит. Пробуем и честно отражаем результат,
 * а не делаем вид, что источник работает.
 */
async function scrapeAvito() {
  const html = await fetchText('https://www.avito.ru/moskva/predlozheniya_uslug/remont_i_stroitelstvo')
  if (/captcha|Доступ ограничен|firewall/i.test(html)) {
    throw new Error('антибот: отдана капча вместо выдачи')
  }
  throw new Error('парсер выдачи не реализован: требуются резидентные RU-прокси')
}

async function scrapeYandex() {
  throw new Error('SPA + SmartCaptcha, /search и /api закрыты в robots.txt')
}

const SOURCES = [
  { key: 'profi', name: 'Профи.ру', run: scrapeProfi },
  { key: 'avito', name: 'Авито', run: scrapeAvito },
  { key: 'yandex', name: 'Яндекс Услуги', run: scrapeYandex },
]

async function readPrevious() {
  try {
    return JSON.parse(await readFile(OUT, 'utf8'))
  } catch {
    return null
  }
}

async function main() {
  const previous = await readPrevious()
  const sources = []
  const collected = new Map()

  for (const src of SOURCES) {
    try {
      const result = await src.run()
      sources.push({ name: src.name, status: result.status, note: result.note })
      for (const p of result.prices) {
        if (!collected.has(p.id)) collected.set(p.id, p)
      }
      console.log(`[${src.key}] ${result.status}: ${result.note}`)
    } catch (err) {
      const note = err instanceof Error ? err.message : String(err)
      sources.push({ name: src.name, status: 'blocked', note })
      console.log(`[${src.key}] blocked: ${note}`)
    }
  }

  const prices = [...collected.values()]

  // Ничего не собрали — сохраняем прошлый фид, чтобы не обнулить рабочие цены
  if (prices.length === 0 && previous?.prices?.length) {
    console.log('Свежих цен нет, оставляем предыдущий фид от', previous.updatedAt)
    const feed = { ...previous, sources, checkedAt: new Date().toISOString() }
    await writeFeed(feed)
    return
  }

  await writeFeed({
    updatedAt: new Date().toISOString(),
    sources,
    prices,
  })
  console.log(`Готово: ${prices.length} позиций обновлено`)
}

async function writeFeed(feed) {
  await mkdir(dirname(OUT), { recursive: true })
  await writeFile(OUT, JSON.stringify(feed, null, 2) + '\n', 'utf8')
}

main().catch((err) => {
  console.error('Сборщик упал:', err)
  process.exit(1)
})
