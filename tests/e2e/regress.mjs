// Сквозной регресс на мобильном вьюпорте. Запуск: BASE=<url> node tests/e2e/regress.mjs
import { chromium } from 'playwright'
import { mkdirSync, readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const BASE = process.env.BASE ?? 'http://127.0.0.1:4173/price_cost_estimate/'
const OUT = resolve(dirname(fileURLToPath(import.meta.url)), '.out')
mkdirSync(OUT, { recursive: true })

const browser = await chromium.launch()
const ctx = await browser.newContext({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 2,
  isMobile: true,
  hasTouch: true,
  locale: 'ru-RU',
  acceptDownloads: true,
})
const page = await ctx.newPage()
const errors = []
page.on('pageerror', (e) => errors.push('PAGEERROR: ' + e.message))
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()) })

let fails = 0
const check = (name, ok, detail = '') => {
  if (!ok) fails++
  console.log(`${ok ? 'OK ' : 'FAIL'} ${name}${detail ? ' — ' + detail : ''}`)
}
const tab = (re) => page.locator('.tabbar button').filter({ hasText: re }).click()
const grandTotal = () => page.locator('.totals-row.grand span').last().innerText()
const wait = (ms) => page.waitForTimeout(ms)

await page.goto(BASE, { waitUntil: 'networkidle' })
await page.screenshot({ path: `${OUT}/r01-empty.png` })

// --- Каталог: шторка добавления, возврат в смету ---
await tab(/Расценки/); await wait(300)
await page.screenshot({ path: `${OUT}/r02-catalog.png` })
await page.locator('.cat-item').filter({ hasText: 'Плитка на пол, прямая' }).first().click()
await page.waitForSelector('.sheet')
await page.screenshot({ path: `${OUT}/r03-sheet.png` })
const addBtn = page.locator('.sheet button[type="submit"]')
check('кнопка «Добавить» заблокирована при qty=0', await addBtn.isDisabled())
await page.locator('.sheet input').first().fill('12,5'); await wait(100)
const sheetSum = await page.locator('.sheet-sum strong').innerText()
check('сумма в шторке 12,5 × 1400', sheetSum.replace(/\s/g, '') === '17500₽', sheetSum)
await addBtn.click(); await wait(250)
check('после добавления возвращаемся в смету', (await page.locator('.catalog-bar').count()) === 0 && (await page.locator('.line').count()) === 1)
check('вкладка «Смета» активна', (await page.locator('.tabbar button.active').innerText()).includes('Смета'))
check('новая строка подсвечена', (await page.locator('.line.is-new').count()) === 1)
const toast = await page.locator('.toast').innerText().catch(() => '')
check('тост показан', toast.startsWith('Добавлено'), toast)
check('бейдж на вкладке = 1', (await page.locator('.badge').innerText()) === '1')
await page.screenshot({ path: `${OUT}/r04-added.png` })
await tab(/Расценки/); await wait(300)
check('метка «в смете» у позиции', (await page.locator('.in-estimate').count()) === 1)

// --- Регион с реальными ценами ---
await page.locator('.catalog-bar select').selectOption('rostov'); await wait(200)
const rostovItem = page.locator('.cat-item').filter({ hasText: 'Плитка на пол, прямая' }).first()
const rostovPrice = (await rostovItem.locator('.price').innerText()).split('\n')[0]
check('Ростов: пол = 1 250 ₽ (прайсы города)', rostovPrice.replace(/\s/g, '') === '1250₽', rostovPrice)
check('подпись «прайсы города»', (await rostovItem.locator('.meta').innerText()).includes('прайсы города'))
const gkl = page.locator('.cat-item').filter({ hasText: 'Обшивка стен ГКЛ' }).first()
const gklPrice = (await gkl.locator('.price').innerText()).split('\n')[0]
check('Ростов: ГКЛ по коэффициенту 900×0.85=765', gklPrice.replace(/\s/g, '') === '765₽', gklPrice)
await page.locator('.catalog-bar select').selectOption('msk')

// --- Смета: правка, имя, удаление в два такта ---
await tab(/Смета/); await wait(300)
check('в смете 1 позиция', (await page.locator('.line').count()) === 1)
check('итого 17 500 ₽', (await grandTotal()).replace(/\s/g, '') === '17500₽', await grandTotal())
await page.locator('.line-name').first().fill('Плитка на пол, кухня'); await wait(100)
check('имя позиции редактируется', (await page.locator('.line-name').first().inputValue()) === 'Плитка на пол, кухня')
const del = page.locator('.line-del').first()
await del.click(); await wait(100)
check('первое нажатие взводит («Удалить?»)', (await del.innerText()).includes('Удалить?') && (await page.locator('.line').count()) === 1)
await del.click(); await wait(150)
check('второе нажатие удаляет', (await page.locator('.line').count()) === 0)

// --- Шаблон типового объекта → смета, автосохранение через перезагрузку ---
await tab(/Ещё/); await wait(300)
await page.locator('.cat-item').filter({ hasText: 'Санузел 3 м²' }).click(); await wait(300)
check('пресет добавил 10 позиций', (await page.locator('.line').count()) === 10)
await page.locator('.card-body input').first().fill('Санузел, Ленина 10'); await wait(200)
await page.screenshot({ path: `${OUT}/r05-estimate.png`, fullPage: true })
const totalBefore = await grandTotal()
await page.reload({ waitUntil: 'networkidle' }); await wait(300)
check('после перезагрузки смета на месте', (await page.locator('.line').count()) === 10)
check('название сохранилось', (await page.locator('.topbar h1').innerText()) === 'Санузел, Ленина 10')
check('итог совпадает', (await grandTotal()) === totalBefore, `${totalBefore}`)

// --- Материалы: обновление без дублей ---
await tab(/Материалы/); await wait(300)
await page.locator('.card-body input').first().fill('12'); await wait(200)
await page.screenshot({ path: `${OUT}/r06-materials.png`, fullPage: true })
await page.locator('.btn-primary.btn-block').click(); await wait(300)
const afterFirst = await page.locator('.line').count()
await tab(/Материалы/); await wait(200)
check('кнопка сменилась на «Обновить»', (await page.locator('.btn-primary.btn-block').innerText()).includes('Обновить'))
await page.locator('.card-body input').first().fill('20')
await page.locator('.btn-primary.btn-block').click(); await wait(300)
check('повторное добавление не дублирует', (await page.locator('.line').count()) === afterFirst, `${afterFirst} → ${await page.locator('.line').count()}`)

// --- Шаблон: inline-имя ---
await page.locator('.btn').filter({ hasText: 'В шаблоны' }).click(); await wait(150)
await page.locator('.inline-form input').fill('Мой санузел')
await page.locator('.inline-form button[type="submit"]').click(); await wait(250)
await tab(/Ещё/); await wait(300)
check('шаблон появился в «Мои шаблоны»', (await page.locator('.list-main').filter({ hasText: 'Мой санузел' }).count()) === 1)
await page.screenshot({ path: `${OUT}/r07-more.png`, fullPage: true })

// --- Несколько смет: шторка из шапки, новая, переключение, удаление ---
await tab(/Смета/); await wait(200)
check('строка «сохранено автоматически»', (await page.locator('.saved-note').innerText()).includes('Сохранено'))
await page.locator('.topbar-title').click(); await page.waitForSelector('.sheet')
check('шторка «Мои сметы» открылась', (await page.locator('#estimates-title').innerText()) === 'Мои сметы')
await page.locator('.sheet .btn-primary').filter({ hasText: 'Новая смета' }).click(); await wait(250)
check('новая смета пустая', (await page.locator('.line').count()) === 0)
check('шторка закрылась', (await page.locator('.sheet').count()) === 0)
await page.locator('.card-body input').first().fill('Вторая смета'); await wait(150)
await page.locator('.topbar-title').click(); await page.waitForSelector('.sheet')
check('в шторке две сметы', (await page.locator('.sheet .list-item').count()) === 2)
check('шапка знает про две сметы', (await page.locator('.topbar .sub').innerText()).includes('2 смет'))
await page.locator('.sheet .list-main').filter({ hasText: 'Санузел, Ленина' }).click(); await wait(300)
check('переключились на санузел', (await page.locator('.topbar h1').innerText()) === 'Санузел, Ленина 10' && (await page.locator('.line').count()) === 15)
const delBtn = page.locator('.btn-danger-outline')
await delBtn.scrollIntoViewIfNeeded(); await delBtn.click(); await wait(100)
check('первое нажатие только взводит', (await delBtn.innerText()).includes('Точно') && (await page.locator('.line').count()) === 15)
await delBtn.click(); await wait(300)
check('смета удалена, открылась вторая', (await page.locator('.topbar h1').innerText()) === 'Вторая смета')
await page.reload({ waitUntil: 'networkidle' })
check('после перезагрузки осталась одна смета', (await page.evaluate(() => JSON.parse(localStorage.getItem('pce.estimates')).length)) === 1)
await tab(/Ещё/); await wait(300)
await page.locator('.cat-item').filter({ hasText: 'Санузел 3 м²' }).click(); await wait(300)
await page.locator('.card-body input').first().fill('Санузел, Ленина 10'); await wait(150)

// --- Резервная копия: экспорт и восстановление ---
await tab(/Ещё/); await wait(300)
const [download] = await Promise.all([
  page.waitForEvent('download'),
  page.locator('.btn-primary').filter({ hasText: 'Скачать копию' }).click(),
])
const backup = JSON.parse(readFileSync(await download.path(), 'utf8'))
check('копия содержит сметы', backup.app === 'price_cost_estimate' && backup.estimates.length >= 1)
backup.estimates.push({ ...backup.estimates[0], id: 'restored-1', title: 'Из копии', updatedAt: new Date().toISOString() })
await page.locator('input[type="file"]').setInputFiles({ name: 'b.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(backup)) })
await wait(300)
check('восстановление добавило смету', (await page.locator('.list-main').filter({ hasText: 'Из копии' }).count()) === 1)
await page.locator('input[type="file"]').setInputFiles({ name: 'x.json', mimeType: 'application/json', buffer: Buffer.from('{"foo":1}') })
await wait(300)
check('битый файл отклонён с сообщением', (await page.locator('.toast').innerText()).includes('не резервная'))

// --- Порядок расценок: стрелки, перетаскивание, сброс ---
await tab(/Расценки/); await wait(300)
const firstName = () => page.locator('.cat-item .name').first().evaluate((el) => el.childNodes[0].textContent.trim())
const before = await firstName()
await page.locator('.icon-btn').click(); await wait(200)
check('режим «Порядок» включился', (await page.locator('.reorder-title').count()) === 1)
await page.locator('.reorder-btns button[aria-label="Ниже"]').first().click(); await wait(150)
check('▼ сдвинул первую позицию вниз', (await firstName()) !== before && (await page.locator('.cat-item .name').nth(1).innerText()).startsWith(before))
await page.screenshot({ path: `${OUT}/r11-reorder.png` })
const rows = page.locator('.cat-item.reorder')
const third = await rows.nth(2).locator('.name').evaluate((el) => el.childNodes[0].textContent.trim())
const hb = await rows.nth(2).locator('.drag-handle').boundingBox()
const fb = await rows.nth(0).boundingBox()
await page.mouse.move(hb.x + hb.width / 2, hb.y + hb.height / 2)
await page.mouse.down()
await page.mouse.move(hb.x + hb.width / 2, fb.y + 4, { steps: 8 }); await wait(100)
await page.mouse.up(); await wait(150)
check('перетаскивание поставило позицию первой', (await firstName()) === third, `${third} → ${await firstName()}`)
await page.reload({ waitUntil: 'networkidle' }); await tab(/Расценки/); await wait(300)
check('порядок пережил перезагрузку', (await firstName()) === third)

// --- Разделы: свернуть, переставить, перенести позицию в другой раздел ---
// textContent, а не innerText: заголовки капсом через CSS
const sectionNames = () => page.locator('.cat-name').allTextContents()
const firstCard = page.locator('.card').first()
await firstCard.locator('.cat-toggle').click(); await wait(150)
check('раздел свернулся', (await firstCard.locator('.cat-item').count()) === 0 && (await firstCard.locator('.cat-toggle').getAttribute('aria-expanded')) === 'false')
check('в заголовке счётчик позиций', /\d+ позици/.test(await firstCard.locator('.cat-count').innerText()))
await page.reload({ waitUntil: 'networkidle' }); await tab(/Расценки/); await wait(300)
check('свёрнутость пережила перезагрузку', (await page.locator('.card').first().locator('.cat-item').count()) === 0)
await page.locator('.catalog-bar input').fill('демонтаж'); await wait(200)
check('при поиске свёрнутый раздел раскрывается', (await page.locator('.card').first().locator('.cat-item').count()) > 0)
await page.locator('.catalog-bar input').fill('')
await page.locator('.card').first().locator('.cat-toggle').click(); await wait(150)
check('раздел развернулся обратно', (await page.locator('.card').first().locator('.cat-item').count()) > 0)

const baseSections = await sectionNames()
await page.locator('.icon-btn').click(); await wait(150)
await page.locator('.cat-head .reorder-btns button[aria-label^="Раздел ниже"]').first().click(); await wait(150)
const movedSections = await sectionNames()
check('раздел переместился вниз', movedSections[1] === baseSections[0] && movedSections[0] === baseSections[1], movedSections.slice(0, 2).join(' / '))
await page.screenshot({ path: `${OUT}/r14-sections.png` })

// Первую позицию второго раздела тащим в конец первого: обе точки должны быть в кадре,
// иначе pointerdown уходит в пустоту (реальный палец сначала прокрутит экран)
const cards = page.locator('.card')
const movingHandle = cards.nth(1).locator('.cat-item').first().locator('.drag-handle')
const movingId = await cards.nth(1).locator('.cat-item').first().getAttribute('data-id')
const targetCat = await cards.nth(0).locator('.cat-name').textContent()
await movingHandle.scrollIntoViewIfNeeded(); await wait(150)
const h2 = await movingHandle.boundingBox()
const lastOfFirst = await cards.nth(0).locator('.cat-item').last().boundingBox()
await page.mouse.move(h2.x + h2.width / 2, h2.y + h2.height / 2)
await page.mouse.down()
await page.mouse.move(h2.x + h2.width / 2, lastOfFirst.y + 4, { steps: 10 }); await wait(100)
check('во время перетаскивания виден индикатор', (await page.locator('.drop-before').count()) === 1)
await page.mouse.up(); await wait(200)
check('позиция перенесена в другой раздел', (await page.locator(`[data-id="${movingId}"]`).getAttribute('data-cat')) === targetCat && (await cards.nth(0).locator(`[data-id="${movingId}"]`).count()) === 1)
await page.reload({ waitUntil: 'networkidle' }); await tab(/Расценки/); await wait(300)
check('перенос в раздел пережил перезагрузку', (await page.locator(`[data-id="${movingId}"]`).getAttribute('data-cat')) === targetCat)

await page.locator('.icon-btn').click()
await page.locator('.btn-ghost').filter({ hasText: 'Сбросить' }).click(); await wait(200)
check('сброс вернул базовый порядок позиций', (await firstName()) === before)
check('сброс вернул порядок разделов', (await sectionNames()).join('|') === baseSections.join('|'))
check('сброс вернул позицию в свой раздел', (await page.locator(`[data-id="${movingId}"]`).getAttribute('data-cat')) === baseSections[0])
await page.locator('.btn').filter({ hasText: 'Готово' }).click(); await wait(150)
check('вышли из режима порядка', (await page.locator('.catalog-bar input').count()) === 1)

// --- Тёмная тема, переполнение, печать ---
await tab(/Смета/); await wait(200)
await page.emulateMedia({ colorScheme: 'dark' }); await wait(200)
const bg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor)
check('тёмная тема применяется', bg === 'rgb(18, 20, 23)', bg)
await page.screenshot({ path: `${OUT}/r08-dark.png`, fullPage: true })
await page.emulateMedia({ colorScheme: 'light' })
await page.setViewportSize({ width: 360, height: 780 }); await wait(200)
const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
check('нет горизонтального переполнения на 360px', overflow === 0, `${overflow}px`)
await page.emulateMedia({ media: 'print' })
await page.screenshot({ path: `${OUT}/r09-print.png`, fullPage: true })
const printRows = await page.locator('.print-table tbody tr').count()
check('печатная форма содержит строки', printRows > 10, `${printRows}`)
await page.emulateMedia({ media: 'screen' })

console.log('\nОшибки консоли:', errors.length ? errors : 'нет')
console.log(fails === 0 ? '\nВСЕ ПРОВЕРКИ ПРОШЛИ' : `\nПРОВАЛОВ: ${fails}`)
await browser.close()
process.exit(fails === 0 && errors.length === 0 ? 0 : 1)
