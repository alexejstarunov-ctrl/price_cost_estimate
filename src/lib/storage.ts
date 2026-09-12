import type { Estimate, EstimateTemplate, WorkItem } from '../types'

const KEYS = {
  estimates: 'pce.estimates',
  currentId: 'pce.currentId',
  templates: 'pce.templates',
  customPrices: 'pce.customPrices',
  company: 'pce.company',
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

export const loadCompany = () =>
  read<CompanyInfo>(KEYS.company, { name: '', phone: '', note: '' })
export const saveCompany = (v: CompanyInfo) => write(KEYS.company, v)

export function uid(): string {
  return Math.random().toString(36).slice(2, 10)
}
