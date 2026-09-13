import type { Estimate, EstimateTemplate, Unit, WorkItem } from '../types'

const KEYS = {
  estimates: 'pce.estimates',
  currentId: 'pce.currentId',
  templates: 'pce.templates',
  customPrices: 'pce.customPrices',
  company: 'pce.company',
  catalogOrder: 'pce.catalogOrder',
  catalogLayout: 'pce.catalogLayout',
  catalogEdits: 'pce.catalogEdits',
} as const

export type CompanyInfo = {
  name: string
  phone: string
  note: string
}

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}

function write(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // приватный режим или переполненное хранилище — расчёт продолжает работать
  }
}

export const loadEstimates = () => read<Estimate[]>(KEYS.estimates, [])
export const saveEstimates = (v: Estimate[]) => write(KEYS.estimates, v)

export const loadCurrentId = () => read<string | null>(KEYS.currentId, null)
export const saveCurrentId = (v: string) => write(KEYS.currentId, v)

export const loadTemplates = () => read<EstimateTemplate[]>(KEYS.templates, [])
export const saveTemplates = (v: EstimateTemplate[]) => write(KEYS.templates, v)

export const loadCustomPrices = () => read<WorkItem[]>(KEYS.customPrices, [])
export const saveCustomPrices = (v: WorkItem[]) => write(KEYS.customPrices, v)

/** Пользовательская раскладка каталога: порядок разделов и позиций, перенесённые позиции, свёрнутые разделы */
export type CatalogLayout = {
  itemOrder: string[]
  categoryOrder: string[]
  /** id позиции → раздел, куда её перетащили */
  overrides: Record<string, string>
  collapsed: string[]
}

export const EMPTY_LAYOUT: CatalogLayout = { itemOrder: [], categoryOrder: [], overrides: {}, collapsed: [] }

export function loadLayout(): CatalogLayout {
  const stored = read<Partial<CatalogLayout> | null>(KEYS.catalogLayout, null)
  if (stored) return { ...EMPTY_LAYOUT, ...stored }
  // Первая версия хранила только порядок позиций
  return { ...EMPTY_LAYOUT, itemOrder: read<string[]>(KEYS.catalogOrder, []) }
}

export const saveLayout = (v: CatalogLayout) => write(KEYS.catalogLayout, v)

export const isDefaultLayout = (l: CatalogLayout): boolean =>
  l.itemOrder.length === 0 && l.categoryOrder.length === 0 && Object.keys(l.overrides).length === 0

export const loadCompany = () =>
  read<CompanyInfo>(KEYS.company, { name: '', phone: '', note: '' })
export const saveCompany = (v: CompanyInfo) => write(KEYS.company, v)

export function uid(): string {
  return Math.random().toString(36).slice(2, 10)
}

/** Правки базовых позиций прайса и скрытые позиции */
export type ItemEdit = { name?: string; unit?: Unit; price?: number }
export type CatalogEdits = { edits: Record<string, ItemEdit>; hidden: string[] }
export const EMPTY_EDITS: CatalogEdits = { edits: {}, hidden: [] }
export const loadCatalogEdits = (): CatalogEdits => ({ ...EMPTY_EDITS, ...read<Partial<CatalogEdits>>(KEYS.catalogEdits, {}) })
export const saveCatalogEdits = (v: CatalogEdits) => write(KEYS.catalogEdits, v)
