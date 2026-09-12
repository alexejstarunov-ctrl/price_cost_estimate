export type RegionDef = {
  id: string
  label: string
  /** Коэффициент к московским расценкам для позиций без своей цены */
  factor: number
  /** Реальные цены города по конкретным позициям, ₽ */
  prices?: Record<string, number>
}

/**
 * Москва — база. По семи городам — типичные цены из региональных страниц
 * Профи.ру и открытых прайсов местных подрядчиков, срез 2025–2026.
 * Коэффициент применяется только к позициям, для которых цены города нет.
 */
export const REGIONS: RegionDef[] = [
  { id: 'msk', label: 'Москва и МО', factor: 1 },
  {
    id: 'volgograd',
    label: 'Волгоград',
    factor: 0.6,
    prices: {
      'w-wall': 1000, 'w-floor': 1000, 'w-diagonal': 1200, 'w-mosaic-net': 1200,
      'w-grout': 150, 'w-grout-epoxy': 640, 'w-demo-wall': 175, 'w-demo-floor': 200,
      'w-waterproof': 150, 'w-45': 900,
    },
  },
  {
    id: 'krasnodar',
    label: 'Краснодар',
    factor: 0.85,
    prices: {
      'w-wall': 1400, 'w-floor': 1250, 'w-large': 1700, 'w-diagonal': 1400, 'w-mosaic-net': 2400,
      'w-grout': 200, 'w-grout-epoxy': 650, 'w-demo-wall': 300, 'w-demo-floor': 300,
      'w-waterproof': 350, 'w-45': 600,
    },
  },
  {
    id: 'nnov',
    label: 'Нижний Новгород',
    factor: 0.72,
    prices: {
      'w-wall': 1200, 'w-floor': 1050, 'w-large': 2000, 'w-diagonal': 1000, 'w-mosaic-net': 1500,
      'w-grout': 200, 'w-grout-epoxy': 600, 'w-demo-wall': 200, 'w-demo-floor': 200,
      'w-waterproof': 200, 'w-45': 500,
    },
  },
  {
    id: 'rostov',
    label: 'Ростов-на-Дону',
    factor: 0.85,
    prices: {
      'w-wall': 1500, 'w-floor': 1250, 'w-large': 1700, 'w-diagonal': 1800, 'w-mosaic-net': 2000,
      'w-grout': 100, 'w-grout-epoxy': 700, 'w-demo-wall': 200, 'w-demo-floor': 200,
      'w-waterproof': 200, 'w-45': 750,
    },
  },
  {
    id: 'samara',
    label: 'Самара',
    factor: 0.7,
    prices: {
      'w-wall': 1200, 'w-floor': 1000, 'w-large': 1400, 'w-diagonal': 1200, 'w-mosaic-net': 1500,
      'w-grout': 100, 'w-grout-epoxy': 410, 'w-demo-wall': 200, 'w-demo-floor': 200,
      'w-waterproof': 240, 'w-45': 300,
    },
  },
  { id: 'spb', label: 'Санкт-Петербург', factor: 0.78 },
  {
    id: 'saratov',
    label: 'Саратов',
    factor: 0.62,
    prices: {
      'w-wall': 1000, 'w-floor': 850, 'w-large': 1400, 'w-diagonal': 1300, 'w-mosaic-net': 1800,
      'w-grout': 200, 'w-grout-epoxy': 800, 'w-demo-wall': 150, 'w-demo-floor': 150,
      'w-waterproof': 230, 'w-45': 400,
    },
  },
  {
    id: 'tambov',
    label: 'Тамбов',
    factor: 0.5,
    prices: {
      'w-wall': 880, 'w-floor': 700, 'w-large': 1000, 'w-mosaic-net': 1100,
      'w-grout': 150, 'w-grout-epoxy': 700, 'w-demo-wall': 130, 'w-demo-floor': 130,
      'w-waterproof': 240,
    },
  },
  { id: 'million', label: 'Другой миллионник', factor: 0.68 },
  { id: 'small', label: 'Малый город', factor: 0.55 },
]

export const DEFAULT_REGION = REGIONS[0].id

export const getRegion = (id: string): RegionDef => REGIONS.find((r) => r.id === id) ?? REGIONS[0]

export const regionLabel = (id: string): string => getRegion(id).label
