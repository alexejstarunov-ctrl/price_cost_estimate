import { useEffect, useMemo, useState } from 'react'
import type { Estimate, EstimateLine, EstimateTemplate, WorkItem } from './types'
import { fetchPriceFeed, mergePrices, type PriceFeed, type PriceState } from './lib/prices'
import { REGION_FACTOR, calcTotals, formatRub } from './lib/estimate'
import {
  loadCompany,
  loadCustomPrices,
  loadEstimates,
  loadTemplates,
  saveCompany,
  saveCustomPrices,
  saveEstimates,
  saveTemplates,
  uid,
  type CompanyInfo,
} from './lib/storage'
import EstimateView from './components/EstimateView'
import CatalogView from './components/CatalogView'
import MaterialsView from './components/MaterialsView'
import MoreView from './components/MoreView'
import PrintView from './components/PrintView'

type Tab = 'estimate' | 'catalog' | 'materials' | 'more'

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: 'estimate', label: 'Смета', icon: '📋' },
  { id: 'catalog', label: 'Расценки', icon: '📖' },
  { id: 'materials', label: 'Материалы', icon: '🧱' },
  { id: 'more', label: 'Ещё', icon: '⋯' },
]

function newEstimate(): Estimate {
  const now = new Date().toISOString()
  return {
    id: uid(),
    title: 'Смета на укладку плитки',
    client: '',
    address: '',
    phone: '',
    createdAt: now,
    updatedAt: now,
    region: 'msk',
    lines: [],
    discount: 0,
    note: '',
  }
}

export default function App() {
  const [tab, setTab] = useState<Tab>('estimate')
  const [estimate, setEstimate] = useState<Estimate>(() => {
    const saved = loadEstimates()
    return saved.length > 0 ? saved[0] : newEstimate()
  })
  const [saved, setSaved] = useState<Estimate[]>(loadEstimates)
  const [custom, setCustom] = useState<WorkItem[]>(loadCustomPrices)
  const [templates, setTemplates] = useState<EstimateTemplate[]>(loadTemplates)
  const [company, setCompany] = useState<CompanyInfo>(loadCompany)
  const [rawFeed, setRawFeed] = useState<PriceFeed | null>(null)

  useEffect(() => {
    fetchPriceFeed().then(setRawFeed)
  }, [])

  const feed: PriceState = useMemo(() => mergePrices(rawFeed, custom), [rawFeed, custom])

  /** Каталог с применённым региональным коэффициентом */
  const catalog = useMemo(() => {
    const k = REGION_FACTOR[estimate.region]
    return feed.works.map((w) =>
      w.source === 'manual' ? w : { ...w, price: Math.round(w.price * k) },
    )
  }, [feed.works, estimate.region])

  const totals = useMemo(() => calcTotals(estimate), [estimate])

  const update = (patch: Partial<Estimate>) =>
    setEstimate((e) => ({ ...e, ...patch, updatedAt: new Date().toISOString() }))

  const addLine = (item: WorkItem, qty = 1) => {
    const line: EstimateLine = {
      id: uid(),
      refId: item.id,
      name: item.name,
      unit: item.unit,
      price: item.price,
      qty,
      kind: item.category === 'Материалы' ? 'material' : 'work',
    }
    setEstimate((e) => ({ ...e, lines: [...e.lines, line], updatedAt: new Date().toISOString() }))
    setTab('estimate')
  }

  const addLines = (lines: Omit<EstimateLine, 'id'>[]) => {
    setEstimate((e) => ({
      ...e,
      lines: [...e.lines, ...lines.map((l) => ({ ...l, id: uid() }))],
      updatedAt: new Date().toISOString(),
    }))
    setTab('estimate')
  }

  const patchLine = (id: string, patch: Partial<EstimateLine>) =>
    setEstimate((e) => ({
      ...e,
      lines: e.lines.map((l) => (l.id === id ? { ...l, ...patch } : l)),
      updatedAt: new Date().toISOString(),
    }))

  const removeLine = (id: string) =>
    setEstimate((e) => ({
      ...e,
      lines: e.lines.filter((l) => l.id !== id),
      updatedAt: new Date().toISOString(),
    }))

  const persist = () => {
    const next = [estimate, ...saved.filter((s) => s.id !== estimate.id)]
    setSaved(next)
    saveEstimates(next)
  }

  const openEstimate = (id: string) => {
    const found = saved.find((s) => s.id === id)
    if (found) {
      setEstimate(found)
      setTab('estimate')
    }
  }

  const deleteEstimate = (id: string) => {
    const next = saved.filter((s) => s.id !== id)
    setSaved(next)
    saveEstimates(next)
  }

  const saveAsTemplate = (name: string) => {
    const tpl: EstimateTemplate = {
      id: uid(),
      name,
      kind: 'custom',
      lines: estimate.lines.map(({ id: _id, ...rest }) => rest),
    }
    const next = [...templates, tpl]
    setTemplates(next)
    saveTemplates(next)
  }

  /** Шаблон хранит только состав работ — цены подставляются из текущего каталога */
  const applyTemplate = (tpl: EstimateTemplate) => {
    addLines(
      tpl.lines.map((l) => ({
        ...l,
        price: l.price || catalog.find((w) => w.id === l.refId)?.price || 0,
      })),
    )
  }

  const deleteTemplate = (id: string) => {
    const next = templates.filter((t) => t.id !== id)
    setTemplates(next)
    saveTemplates(next)
  }

  const upsertCustom = (item: WorkItem) => {
    const next = [...custom.filter((c) => c.id !== item.id), item]
    setCustom(next)
    saveCustomPrices(next)
  }

  const removeCustom = (id: string) => {
    const next = custom.filter((c) => c.id !== id)
    setCustom(next)
    saveCustomPrices(next)
  }

  const updateCompany = (info: CompanyInfo) => {
    setCompany(info)
    saveCompany(info)
  }

  return (
    <>
      <header className="topbar no-print">
        <h1>
          {estimate.title || 'Смета'}
          <span className="sub">
            {estimate.lines.length > 0
              ? `${estimate.lines.length} поз. · ${formatRub(totals.total)}`
              : 'Новая смета'}
          </span>
        </h1>
      </header>

      {tab === 'estimate' && (
        <EstimateView
          estimate={estimate}
          totals={totals}
          onUpdate={update}
          onPatchLine={patchLine}
          onRemoveLine={removeLine}
          onSave={persist}
          onAddClick={() => setTab('catalog')}
          onSaveTemplate={saveAsTemplate}
          onReset={() => setEstimate(newEstimate())}
        />
      )}

      {tab === 'catalog' && <CatalogView works={catalog} feed={feed} onAdd={addLine} />}

      {tab === 'materials' && <MaterialsView works={catalog} onAddLines={addLines} />}

      {tab === 'more' && (
        <MoreView
          estimate={estimate}
          saved={saved}
          templates={templates}
          custom={custom}
          company={company}
          feed={feed}
          onUpdate={update}
          onOpen={openEstimate}
          onDelete={deleteEstimate}
          onApplyTemplate={applyTemplate}
          onDeleteTemplate={deleteTemplate}
          onUpsertCustom={upsertCustom}
          onRemoveCustom={removeCustom}
          onUpdateCompany={updateCompany}
        />
      )}

      <PrintView estimate={estimate} totals={totals} company={company} />

      <nav className="tabbar no-print">
        {TABS.map((t) => (
          <button
            key={t.id}
            className={tab === t.id ? 'active' : ''}
            onClick={() => setTab(t.id)}
          >
            <span className="ico">{t.icon}</span>
            {t.label}
          </button>
        ))}
      </nav>
    </>
  )
}
