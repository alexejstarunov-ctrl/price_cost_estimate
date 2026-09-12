import { useEffect, useMemo, useRef, useState } from 'react'
import type { Estimate, EstimateLine, EstimateTemplate, WorkItem } from './types'
import { fetchPriceFeed, mergePrices, type PriceFeed, type PriceState } from './lib/prices'
import { calcTotals, formatRub } from './lib/estimate'
import { DEFAULT_REGION, getRegion } from './data/regions'
import {
  loadCompany,
  loadCurrentId,
  loadCustomPrices,
  loadEstimates,
  loadTemplates,
  saveCompany,
  saveCurrentId,
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
import AddSheet from './components/AddSheet'
import { IconCatalog, IconEstimate, IconMaterials, IconMore } from './components/Icons'

type Tab = 'estimate' | 'catalog' | 'materials' | 'more'

const TABS: { id: Tab; label: string; Icon: () => JSX.Element }[] = [
  { id: 'estimate', label: 'Смета', Icon: IconEstimate },
  { id: 'catalog', label: 'Расценки', Icon: IconCatalog },
  { id: 'materials', label: 'Материалы', Icon: IconMaterials },
  { id: 'more', label: 'Ещё', Icon: IconMore },
]

function newEstimate(region = DEFAULT_REGION): Estimate {
  const now = new Date().toISOString()
  return {
    id: uid(),
    title: '',
    client: '',
    address: '',
    phone: '',
    createdAt: now,
    updatedAt: now,
    region,
    lines: [],
    discount: 0,
    note: '',
  }
}

export default function App() {
  const [tab, setTab] = useState<Tab>('estimate')
  const [estimates, setEstimates] = useState<Estimate[]>(() => {
    const saved = loadEstimates()
    return saved.length > 0 ? saved : [newEstimate()]
  })
  const [currentId, setCurrentId] = useState<string>(() => loadCurrentId() ?? '')
  const [custom, setCustom] = useState<WorkItem[]>(loadCustomPrices)
  const [templates, setTemplates] = useState<EstimateTemplate[]>(loadTemplates)
  const [company, setCompany] = useState<CompanyInfo>(loadCompany)
  const [rawFeed, setRawFeed] = useState<PriceFeed | null>(null)
  const [pending, setPending] = useState<WorkItem | null>(null)
  const [toast, setToast] = useState('')
  const toastTimer = useRef<number>()

  const estimate = estimates.find((e) => e.id === currentId) ?? estimates[0]

  useEffect(() => {
    if (estimate.id !== currentId) setCurrentId(estimate.id)
  }, [estimate.id, currentId])

  useEffect(() => saveEstimates(estimates), [estimates])
  useEffect(() => {
    if (currentId) saveCurrentId(currentId)
  }, [currentId])

  useEffect(() => {
    fetchPriceFeed().then(setRawFeed)
  }, [])

  const notify = (message: string) => {
    setToast(message)
    window.clearTimeout(toastTimer.current)
    toastTimer.current = window.setTimeout(() => setToast(''), 2200)
  }

  const feed: PriceState = useMemo(() => mergePrices(rawFeed, custom), [rawFeed, custom])

  /** Каталог по региону: реальная цена города, если есть, иначе коэффициент; свои цены не трогаем */
  const catalog = useMemo(() => {
    const region = getRegion(estimate.region)
    return feed.works.map((w) => {
      if (w.source === 'manual') return w
      const local = region.prices?.[w.id]
      return local !== undefined
        ? { ...w, price: local, source: 'region' as const }
        : { ...w, price: Math.round(w.price * region.factor) }
    })
  }, [feed.works, estimate.region])

  const totals = useMemo(() => calcTotals(estimate), [estimate])

  const patchEstimate = (id: string, fn: (e: Estimate) => Estimate) =>
    setEstimates((list) =>
      list.map((e) => (e.id === id ? { ...fn(e), updatedAt: new Date().toISOString() } : e)),
    )

  const update = (patch: Partial<Estimate>) => patchEstimate(estimate.id, (e) => ({ ...e, ...patch }))

  const addLines = (lines: Omit<EstimateLine, 'id'>[]) =>
    patchEstimate(estimate.id, (e) => ({
      ...e,
      lines: [...e.lines, ...lines.map((l) => ({ ...l, id: uid() }))],
    }))

  const addFromCatalog = (item: WorkItem, qty: number, price: number) => {
    addLines([
      {
        refId: item.id,
        name: item.name,
        unit: item.unit,
        price,
        qty,
        kind: item.category === 'Материалы' ? 'material' : 'work',
      },
    ])
    setPending(null)
    notify(`Добавлено: ${item.name}`)
  }

  /** Расчётные материалы заменяют предыдущий расчёт, а не дублируют его */
  const addMaterialLines = (lines: Omit<EstimateLine, 'id'>[]) => {
    patchEstimate(estimate.id, (e) => ({
      ...e,
      lines: [...e.lines.filter((l) => !l.auto), ...lines.map((l) => ({ ...l, id: uid() }))],
    }))
    notify(`Материалы в смете: ${lines.length} поз.`)
    setTab('estimate')
  }

  const patchLine = (id: string, patch: Partial<EstimateLine>) =>
    patchEstimate(estimate.id, (e) => ({
      ...e,
      lines: e.lines.map((l) => (l.id === id ? { ...l, ...patch } : l)),
    }))

  const removeLine = (id: string) =>
    patchEstimate(estimate.id, (e) => ({ ...e, lines: e.lines.filter((l) => l.id !== id) }))

  const createEstimate = () => {
    const fresh = newEstimate(estimate.region)
    setEstimates((list) => [fresh, ...list])
    setCurrentId(fresh.id)
    setTab('estimate')
    notify('Новая смета')
  }

  const openEstimate = (id: string) => {
    setCurrentId(id)
    setTab('estimate')
  }

  const deleteEstimate = (id: string) => {
    setEstimates((list) => {
      const next = list.filter((e) => e.id !== id)
      if (next.length === 0) next.push(newEstimate(estimate.region))
      if (id === currentId) setCurrentId(next[0].id)
      return next
    })
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
    notify(`Шаблон сохранён: ${name}`)
  }

  /** Шаблон хранит только состав работ — цены подставляются из текущего каталога */
  const applyTemplate = (tpl: EstimateTemplate) => {
    addLines(
      tpl.lines.map((l) => ({
        ...l,
        price: l.price || catalog.find((w) => w.id === l.refId)?.price || 0,
      })),
    )
    notify(`Добавлено ${tpl.lines.length} поз. из «${tpl.name}»`)
    setTab('estimate')
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
    notify(`В каталоге: ${item.name}`)
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

  const inEstimate = useMemo(() => {
    const m = new Map<string, number>()
    for (const l of estimate.lines) m.set(l.refId, (m.get(l.refId) ?? 0) + 1)
    return m
  }, [estimate.lines])

  return (
    <>
      <header className="topbar no-print">
        <div className="topbar-title">
          <h1>{estimate.title || 'Новая смета'}</h1>
          <span className="sub">
            {estimate.lines.length > 0
              ? `${estimate.lines.length} поз.`
              : 'Добавьте работы из расценок'}
          </span>
        </div>
        <div className="topbar-total">{formatRub(totals.total)}</div>
      </header>

      {tab === 'estimate' && (
        <EstimateView
          estimate={estimate}
          totals={totals}
          onUpdate={update}
          onPatchLine={patchLine}
          onRemoveLine={removeLine}
          onAddClick={() => setTab('catalog')}
          onMaterialsClick={() => setTab('materials')}
          onSaveTemplate={saveAsTemplate}
          onNew={createEstimate}
          notify={notify}
        />
      )}

      {tab === 'catalog' && (
        <CatalogView
          works={catalog}
          region={estimate.region}
          inEstimate={inEstimate}
          onRegion={(region) => update({ region })}
          onPick={setPending}
        />
      )}

      {tab === 'materials' && (
        <MaterialsView
          works={catalog}
          hasAuto={estimate.lines.some((l) => l.auto)}
          onAddLines={addMaterialLines}
        />
      )}

      {tab === 'more' && (
        <MoreView
          currentId={estimate.id}
          estimates={estimates}
          templates={templates}
          custom={custom}
          company={company}
          feed={feed}
          onNew={createEstimate}
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

      {pending && (
        <AddSheet
          item={pending}
          onClose={() => setPending(null)}
          onAdd={(qty, price) => addFromCatalog(pending, qty, price)}
        />
      )}

      {toast && (
        <div className="toast no-print" role="status">
          {toast}
        </div>
      )}

      <nav className="tabbar no-print" aria-label="Разделы">
        {TABS.map(({ id, label, Icon }) => (
          <button
            key={id}
            className={tab === id ? 'active' : ''}
            onClick={() => setTab(id)}
            aria-current={tab === id ? 'page' : undefined}
          >
            <span className="ico">
              <Icon />
              {id === 'estimate' && estimate.lines.length > 0 && (
                <span className="badge">{estimate.lines.length}</span>
              )}
            </span>
            {label}
          </button>
        ))}
      </nav>
    </>
  )
}
