import type { PriceSource, WorkItem } from '../types'
import { BASE_WORKS } from '../data/works'

/** Формат public/prices.json, который обновляет сборщик из GitHub Actions */
export type PriceFeed = {
  updatedAt: string
  sources: { name: string; status: 'ok' | 'blocked' | 'skipped'; note?: string }[]
  prices: { id: string; price: number; source: PriceSource }[]
}

export type PriceState = {
  works: WorkItem[]
  feedDate: string | null
  sources: PriceFeed['sources']
}

/**
 * Собирает рабочий каталог: базовые расценки, поверх них — цены из фида
 * сборщика, поверх всего — правки мастера. Любой слой может отсутствовать.
 */
export function mergePrices(feed: PriceFeed | null, custom: WorkItem[]): PriceState {
  const byId = new Map(BASE_WORKS.map((w) => [w.id, { ...w }]))

  if (feed) {
    for (const p of feed.prices) {
      const item = byId.get(p.id)
      if (item && Number.isFinite(p.price) && p.price > 0) {
        item.price = p.price
        item.source = p.source
        item.updatedAt = feed.updatedAt
      }
    }
  }

  for (const c of custom) {
    byId.set(c.id, { ...c, source: 'manual' })
  }

  return {
    works: [...byId.values()],
    feedDate: feed?.updatedAt ?? null,
    sources: feed?.sources ?? [],
  }
}

export async function fetchPriceFeed(): Promise<PriceFeed | null> {
  try {
    const res = await fetch(`${import.meta.env.BASE_URL}prices.json`, { cache: 'no-cache' })
    if (!res.ok) return null
    return (await res.json()) as PriceFeed
  } catch {
    return null
  }
}

export const SOURCE_LABELS: Record<PriceSource, string> = {
  base: 'база',
  manual: 'своя цена',
  profi: 'Профи.ру',
  avito: 'Авито',
  yandex: 'Яндекс Услуги',
}
