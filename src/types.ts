export type Unit = 'м²' | 'п.м' | 'шт' | 'компл' | 'меш' | 'кг' | 'л' | 'точка'

export type PriceSource = 'base' | 'manual' | 'region' | 'profi' | 'avito' | 'yandex'

/** Идентификатор региона из src/data/regions.ts */
export type Region = string

export type WorkItem = {
  id: string
  name: string
  unit: Unit
  category: string
  /** Базовая цена для Москвы, ₽ за единицу */
  price: number
  /** Диапазон рынка, ₽ — нижняя и верхняя граница */
  range?: [number, number]
  source: PriceSource
  updatedAt?: string
  note?: string
}

export type LineKind = 'work' | 'material'

export type EstimateLine = {
  id: string
  refId: string
  name: string
  unit: Unit
  price: number
  qty: number
  kind: LineKind
  /** Позиция посчитана автоматически из блока материалов */
  auto?: boolean
}

export type Estimate = {
  id: string
  title: string
  client: string
  address: string
  phone: string
  createdAt: string
  updatedAt: string
  region: Region
  lines: EstimateLine[]
  /** Скидка в процентах */
  discount: number
  note: string
}

export type TemplateKind = 'bathroom' | 'kitchen' | 'balcony' | 'floor' | 'custom'

export type EstimateTemplate = {
  id: string
  name: string
  kind: TemplateKind
  lines: Omit<EstimateLine, 'id'>[]
}

/** Параметры раскладки для расчёта расхода материалов */
export type MaterialInput = {
  /** Площадь укладки, м² */
  area: number
  /** Размер плитки, мм */
  tileWidth: number
  tileHeight: number
  /** Толщина плитки, мм */
  tileThickness: number
  /** Ширина шва, мм */
  jointWidth: number
  /** Раскладка влияет на запас на подрезку */
  layout: 'straight' | 'diagonal' | 'brick' | 'herringbone'
  /** Цена плитки за м², ₽ */
  tilePrice: number
  /** Периметр помещения для плинтуса, п.м */
  perimeter: number
}
