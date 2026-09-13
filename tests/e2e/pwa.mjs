// PWA на iPhone, своя позиция, маршрут печати, манифест и иконки. Запуск: BASE=<url> node tests/e2e/pwa.mjs
import { chromium } from 'playwright'
import { mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const BASE = process.env.BASE ?? 'http://127.0.0.1:4173/price_cost_estimate/'
const OUT = resolve(dirname(fileURLToPath(import.meta.url)), '.out')
mkdirSync(OUT, { recursive: true })

let fails = 0
const check = (name, ok, detail = '') => {
  if (!ok) fails++
  console.log(`${ok ? 'OK ' : 'FAIL'} ${name}${detail ? ' — ' + detail : ''}`)
}

const browser = await chromium.launch()
const ios = await browser.newContext({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 3,
  isMobile: true,
  hasTouch: true,
  locale: 'ru-RU',
  userAgent:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1',
})
const page = await ios.newPage()
const errors = []
page.on('pageerror', (e) => errors.push('PAGEERROR: ' + e.message))
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()) })
const wait = (ms) => page.waitForTimeout(ms)

await page.goto(BASE, { waitUntil: 'networkidle' })
const hint = page.locator('.install')
check('на iPhone показана подсказка установки', (await hint.count()) === 1)
check('подсказка про «Поделиться → На экран Домой»', (await hint.innerText()).includes('На экран'))
await page.screenshot({ path: `${OUT}/p01-ios-hint.png` })
await hint.locator('.btn-ghost').click(); await wait(150)
check('подсказка скрывается крестиком', (await page.locator('.install').count()) === 0)
await page.reload({ waitUntil: 'networkidle' })
check('после перезагрузки не возвращается', (await page.locator('.install').count()) === 0)

// Своя позиция из пустой сметы
await page.locator('.btn').filter({ hasText: 'Своя позиция' }).click()
await page.waitForSelector('.sheet')
await page.screenshot({ path: `${OUT}/p02-custom-sheet.png` })
check('по умолчанию выбран «Материал»', (await page.locator('.segmented button.active').innerText()) === 'Материал')
const submit = page.locator('.sheet button[type="submit"]')
check('кнопка заблокирована без названия и количества', await submit.isDisabled())
await page.locator('.sheet input[placeholder*="Клей"]').fill('Клей Ceresit CM 11, 25 кг')
await page.locator('.custom-row input').first().fill('4')
await page.locator('.custom-row select').selectOption('меш')
await page.locator('.custom-row input').nth(1).fill('650')
await page.locator('.check input').check(); await wait(100)
check('сумма 4 × 650 = 2 600', (await page.locator('.sheet-sum strong').innerText()).replace(/\s/g, '') === '2600₽')
await submit.click(); await wait(300)
check('позиция в смете', (await page.locator('.line').count()) === 1)
check('она в группе «Материалы»', (await page.locator('.card-head h2').filter({ hasText: 'Материалы' }).count()) === 1)
check('итого 2 600 ₽', (await page.locator('.totals-row.grand span').last().innerText()).replace(/\s/g, '') === '2600₽')

await page.locator('.tabbar button').filter({ hasText: /Расценки/ }).click(); await wait(300)
await page.locator('.catalog-bar input').fill('ceresit'); await wait(200)
const found = page.locator('.cat-item').filter({ hasText: 'Ceresit' })
check('запомненная позиция в каталоге', (await found.count()) === 1)
check('помечена «своя цена»', (await found.locator('.meta').innerText()).includes('своя цена'))
await page.locator('.catalog-bar input').fill('')
check('в каталоге есть кнопки «в прайс» и «своя позиция»', (await page.locator('.btn-dashed').filter({ hasText: 'своя позиция' }).count()) === 1 && (await page.locator('.btn-dashed').filter({ hasText: 'В прайс' }).count()) === 1)

await page.locator('.btn-dashed').filter({ hasText: 'своя позиция' }).click()
await page.waitForSelector('.sheet')
await page.locator('.segmented button').filter({ hasText: 'Работа' }).click()
await page.locator('.sheet input[placeholder*="экрана"]').fill('Установка экрана под ванну')
await page.locator('.custom-row input').first().fill('1')
await page.locator('.custom-row select').selectOption('шт')
await page.locator('.custom-row input').nth(1).fill('1500')
await page.locator('.sheet button[type="submit"]').click(); await wait(300)
check('своя работа в группе «Работы»', (await page.locator('.card-head h2').filter({ hasText: 'Работы' }).count()) === 1)
check('в смете 2 позиции', (await page.locator('.line').count()) === 2)
await page.screenshot({ path: `${OUT}/p03-estimate-custom.png`, fullPage: true })

// Маршрут печати: смета передаётся адресом и рисуется на экране
const payload = await page.evaluate(() => {
  const list = JSON.parse(localStorage.getItem('pce.estimates') || '[]')
  const id = JSON.parse(localStorage.getItem('pce.currentId') || 'null')
  const estimate = list.find((e) => e.id === id) ?? list[0]
  return encodeURIComponent(JSON.stringify({ estimate, company: { name: 'ИП Тест', phone: '+7 900', note: '' } }))
})
const printPage = await ios.newPage()
let printCalled = false
await printPage.exposeFunction('__printSpy', () => { printCalled = true })
await printPage.addInitScript(() => { window.print = () => window.__printSpy() })
await printPage.goto(`${BASE}?print=1#${payload}`, { waitUntil: 'networkidle' })
await printPage.waitForTimeout(600)
check('страница печати в режиме print-mode', await printPage.evaluate(() => document.body.classList.contains('print-mode')))
check('таблица видна на экране', await printPage.locator('.print-table').first().isVisible())
check('строк в таблицах: 2 позиции + 2 итога', (await printPage.locator('.print-table tbody tr').count()) === 4)
check('исполнитель из payload', (await printPage.locator('.print-head').innerText()).includes('ИП Тест'))
check('window.print() вызван автоматически', printCalled)
check('навигация приложения скрыта', (await printPage.locator('.tabbar').count()) === 0)
await printPage.screenshot({ path: `${OUT}/p04-print-route.png`, fullPage: true })

const broken = await ios.newPage()
await broken.goto(`${BASE}?print=1#%7Bbroken`, { waitUntil: 'networkidle' })
check('битый payload → обычное приложение', (await broken.locator('.tabbar').count()) === 1)

// Манифест и иконки
const manifest = await (await page.request.get(new URL('manifest.webmanifest', BASE).href)).json()
const purposes = manifest.icons.map((i) => `${i.sizes}:${i.purpose}`)
check('manifest: id, lang, display', manifest.id === '/price_cost_estimate/' && manifest.lang === 'ru' && manifest.display === 'standalone')
check('manifest: отдельная maskable-иконка', purposes.includes('512x512:maskable') && manifest.icons.some((i) => i.src.includes('maskable')))
for (const f of ['apple-touch-icon.png', 'icon-maskable-512.png', 'icon-192.png', 'icon-512.png']) {
  const r = await page.request.get(new URL(f, BASE).href)
  check(`иконка ${f} отдаётся`, r.status() === 200 && r.headers()['content-type']?.includes('image/png'))
}
const html = await (await page.request.get(BASE)).text()
check('apple-touch-icon в head', html.includes('rel="apple-touch-icon"'))
check('apple-mobile-web-app-capable', html.includes('apple-mobile-web-app-capable'))
check('status-bar black-translucent', html.includes('black-translucent'))

console.log('\nОшибки консоли:', errors.length ? errors : 'нет')
console.log(fails === 0 ? '\nВСЕ PWA-ПРОВЕРКИ ПРОШЛИ' : `\nПРОВАЛОВ: ${fails}`)
await browser.close()
process.exit(fails === 0 && errors.length === 0 ? 0 : 1)
