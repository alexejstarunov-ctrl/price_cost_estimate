/**
 * Проверка данных расценок перед сборкой.
 *
 * Ловит типичные ошибки ручных и LLM-правок: дубли и опечатки в id,
 * нули и отрицательные цены, диапазон «наоборот», ссылки шаблонов на
 * несуществующие позиции, региональные цены к неизвестным id.
 *
 * Запуск: npm run check:prices
 */

import { BASE_WORKS, CATEGORIES } from '../src/data/works.ts'
import { REGIONS } from '../src/data/regions.ts'
import { PRESET_TEMPLATES } from '../src/data/templates.ts'

const UNITS = new Set(['м²', 'п.м', 'шт', 'компл', 'меш', 'кг', 'л', 'точка'])
const errors = []
const warnings = []

const byId = new Map()
for (const w of BASE_WORKS) {
  if (byId.has(w.id)) errors.push(`дубль id «${w.id}»`)
  byId.set(w.id, w)

  if (!/^[wm]-[a-z0-9-]+$/.test(w.id)) errors.push(`${w.id}: id должен быть вида w-xxx (работа) или m-xxx (материал)`)
  if (w.id.startsWith('m-') !== (w.category === 'Материалы'))
    errors.push(`${w.id}: префикс id не совпадает с разделом «${w.category}»`)
  if (!w.name?.trim()) errors.push(`${w.id}: пустое название`)
  if (!UNITS.has(w.unit)) errors.push(`${w.id}: неизвестная единица «${w.unit}»`)
  if (!CATEGORIES.includes(w.category)) errors.push(`${w.id}: неизвестный раздел «${w.category}»`)
  if (!Number.isInteger(w.price) || w.price <= 0) errors.push(`${w.id}: цена должна быть целым числом рублей > 0, сейчас ${w.price}`)
  if (w.source !== 'base') errors.push(`${w.id}: в базе source всегда 'base'`)

  if (w.range) {
    const [lo, hi] = w.range
    if (!(lo > 0 && hi >= lo)) errors.push(`${w.id}: диапазон ${lo}–${hi} задан неверно`)
    else if (w.price < lo || w.price > hi * 1.15)
      warnings.push(`${w.id}: цена ${w.price} вне рыночного диапазона ${lo}–${hi}`)
  }
}

const regionIds = new Set()
for (const r of REGIONS) {
  if (regionIds.has(r.id)) errors.push(`регион: дубль id «${r.id}»`)
  regionIds.add(r.id)
  if (!(r.factor > 0.2 && r.factor <= 1.5)) errors.push(`регион ${r.id}: коэффициент ${r.factor} вне разумного 0.2–1.5`)
  for (const [id, price] of Object.entries(r.prices ?? {})) {
    const base = byId.get(id)
    if (!base) {
      errors.push(`регион ${r.id}: цена для несуществующей позиции «${id}»`)
      continue
    }
    if (!Number.isInteger(price) || price <= 0) errors.push(`регион ${r.id}: ${id} = ${price}, нужна целая цена > 0`)
    else if (price > base.price * 2 || price < base.price * 0.2)
      warnings.push(`регион ${r.id}: ${id} = ${price} при московских ${base.price} — проверьте, не опечатка ли`)
  }
}
if (REGIONS[0]?.id !== 'msk' || REGIONS[0].factor !== 1) errors.push('первый регион должен быть msk с коэффициентом 1 — это база')

for (const t of PRESET_TEMPLATES) {
  for (const l of t.lines) {
    if (!byId.has(l.refId)) errors.push(`шаблон «${t.name}»: ссылка на несуществующую позицию «${l.refId}»`)
    if (!(l.qty > 0)) errors.push(`шаблон «${t.name}»: ${l.refId} с количеством ${l.qty}`)
  }
}

const works = BASE_WORKS.filter((w) => w.category !== 'Материалы').length
console.log(`Позиций: ${BASE_WORKS.length} (работ ${works}, материалов ${BASE_WORKS.length - works}) · регионов: ${REGIONS.length} · шаблонов: ${PRESET_TEMPLATES.length}`)

for (const w of warnings) console.log(`  предупреждение: ${w}`)
for (const e of errors) console.log(`  ОШИБКА: ${e}`)

if (errors.length > 0) {
  console.log(`\nНайдено ошибок: ${errors.length}. Исправьте их — иначе приложение соберётся с битыми данными.`)
  process.exit(1)
}
console.log(warnings.length ? `\nОшибок нет, предупреждений: ${warnings.length}.` : '\nДанные в порядке.')
