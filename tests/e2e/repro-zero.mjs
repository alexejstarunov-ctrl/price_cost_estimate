// Исходный баг «нельзя убрать 0 / не вводятся десятичные». Запуск: BASE=<url> node tests/e2e/repro-zero.mjs
import { chromium } from 'playwright'

const BASE = process.env.BASE ?? 'http://127.0.0.1:4173/price_cost_estimate/'
const browser = await chromium.launch()
const ctx = await browser.newContext({ viewport: { width: 360, height: 780 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, locale: 'ru-RU' })
const page = await ctx.newPage()
let fails = 0
const expect = (n, label, actual, ok) => { if (!ok) fails++; console.log(`${ok ? 'OK ' : 'FAIL'} ${n}. ${label}: ${JSON.stringify(actual)}`) }
const type = async (el, s) => { for (const ch of s) { await el.press(ch); await page.waitForTimeout(60) } }
const clear = async (el) => { await el.click(); await el.press('Control+a'); await el.press('Backspace'); await page.waitForTimeout(120) }

await page.goto(BASE, { waitUntil: 'networkidle' })
await page.getByRole('button', { name: /Расценки/ }).click(); await page.waitForTimeout(300)
await page.locator('.cat-item').first().click(); await page.waitForSelector('.sheet')
await page.locator('.sheet input').first().fill('1')
await page.locator('.sheet button[type="submit"]').click(); await page.waitForTimeout(300)

const qty = page.locator('.line-ctl input').first()
await clear(qty); expect(1, 'после стирания поле пустое', await qty.inputValue(), (await qty.inputValue()) === '')
await clear(qty); await type(qty, '12.5'); expect(2, 'ввод 12.5', await qty.inputValue(), (await qty.inputValue()) === '12.5')
await clear(qty); await type(qty, '7,5'); expect(3, 'ввод 7,5', await qty.inputValue(), (await qty.inputValue()) === '7,5')
await clear(qty); await qty.press('End'); await qty.press('5'); await page.waitForTimeout(100); expect(4, 'после стирания и ввода 5', await qty.inputValue(), (await qty.inputValue()) === '5')
await clear(qty); await type(qty, '-3'); expect(5, 'минус не проходит', await qty.inputValue(), (await qty.inputValue()) === '3')

await page.getByRole('button', { name: /Материалы/ }).click(); await page.waitForTimeout(300)
const area = page.locator('.card-body input').first()
await clear(area); expect(6, 'площадь после стирания пустая', await area.inputValue(), (await area.inputValue()) === '')
await type(area, '4.'); expect(7, 'промежуточное «4.» не сбрасывается', await area.inputValue(), (await area.inputValue()) === '4.')

console.log(fails === 0 ? '\nВСЕ ПРОВЕРКИ НУЛЯ ПРОШЛИ' : `\nПРОВАЛОВ: ${fails}`)
await browser.close()
process.exit(fails === 0 ? 0 : 1)
