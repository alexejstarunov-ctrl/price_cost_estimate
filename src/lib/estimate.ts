import type { Estimate, EstimateLine, Region } from '../types'

/** Региональные коэффициенты к московским расценкам */
export const REGION_FACTOR: Record<Region, number> = {
  msk: 1,
  spb: 0.78,
  million: 0.68,
  small: 0.55,
}

export const REGION_LABELS: Record<Region, string> = {
  msk: 'Москва и МО',
  spb: 'СПб, Сочи, Крым',
  million: 'Города-миллионники',
  small: 'Райцентры и малые города',
}

export type Totals = {
  works: number
  materials: number
  subtotal: number
  discountSum: number
  total: number
}

export const lineSum = (line: EstimateLine): number => line.price * line.qty

export function calcTotals(estimate: Estimate): Totals {
  let works = 0
  let materials = 0

  for (const line of estimate.lines) {
    const sum = lineSum(line)
    if (line.kind === 'work') works += sum
    else materials += sum
  }

  const subtotal = works + materials
  const discountSum = Math.round((subtotal * estimate.discount) / 100)

  return {
    works: Math.round(works),
    materials: Math.round(materials),
    subtotal: Math.round(subtotal),
    discountSum,
    total: Math.round(subtotal - discountSum),
  }
}

const rubFormatter = new Intl.NumberFormat('ru-RU', {
  style: 'currency',
  currency: 'RUB',
  maximumFractionDigits: 0,
})

export const formatRub = (value: number): string => rubFormatter.format(value)

export const formatQty = (value: number): string =>
  new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 2 }).format(value)

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}
