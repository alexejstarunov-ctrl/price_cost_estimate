import { useEffect, useMemo, useRef, useState } from 'react'
import type { Estimate, EstimateLine, EstimateTemplate, WorkItem } from './types'
import { fetchPriceFeed, mergePrices, type PriceFeed, type PriceState } from './lib/prices'
import { calcTotals, formatRub } from './lib/estimate'
import { DEFAULT_REGION, getRegion } from './data/regions'
import {
  isIos,
  isStandalone,
  printUrl,
  readPrintPayload,
  type InstallPromptEvent,
} from './lib/platform'
import {
  loadCatalogOrder,
  loadCompany,
  loadCurrentId,
  loadCustomPrices,
  loadEstimates,
  loadTemplates,
  saveCatalogOrder,
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
import PrintRoute from './components/PrintRoute'
import AddSheet from './components/AddSheet'
import CustomSheet from './components/CustomSheet'
import EstimatesSheet from './components/EstimatesSheet'
import { IconCatalog, IconChevron, IconEstimate, IconMaterials, IconMore } from './components/Icons'

export type InstallMode = 'android' | 'ios' | 'none'

type Tab = 'estimate' | 'catalog' | 'materials' | 'more'

const TABS: { id: Tab; label: string; Icon: () => JSX.Element }[] = [
  { id: 'estimate', label: 'Смета', Icon: IconEstimate },
  { id: 'catalog', label: 'Расценки', Icon: IconCatalog },
  { id: 'materials', label: 'Материалы', Icon: IconMaterials },
  { id: 'more', label: 'Ещё', Icon: IconMore },
]

const printPayload = readPrintPayload()

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

export default function Root() {
  return printPayload ? <PrintRoute payload={printPayload} /> : <App />
}

function App() {
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
  const [customOpen, setCustomOpen] = useState(false)
  const [estimatesOpen, setEstimatesOpen] = useState(false)
  const [order, setOrder] = useState<string[]>(loadCatalogOrder)
  const [installEvent, setInstallEvent] = useState<InstallPromptEvent | null>(null)
  const [toast, setToast] = useState('')
  const [highlightId, setHighlightId] = useState<string | null>(null)
  const toastTimer = useRef<number>()
  const highlightTimer = useRef<number>()

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
    // Просим браузер не вычищать наше хранилище при нехватке места
    navigator.storage?.persist?.().catch(() => undefined)
  }, [])

  useEffect(() => {
    const onPrompt = (e: Event) => {
      e.preventDefault()
      setInstallEvent(e as InstallPromptEvent)
    }
    window.addEventListener('beforeinstallprompt', onPrompt)
    return () => window.removeEventListener('beforeinstallprompt', onPrompt)
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

  /** Порядок пользователя поверх базового; неизвестные порядку позиции идут следом в базовом порядке */
  const orderedCatalog = useMemo(() => {
    if (order.length === 0) return catalog
    const index = new Map(order.map((id, i) => [id, i]))
    const known = catalog.filter((w) => index.has(w.id)).sort((a, b) => index.get(a.id)! - index.get(b.id)!)
    const unknown = catalog.filter((w) => !index.has(w.id))
    return [...known, ...unknown]
  }, [catalog, order])

  const moveBefore = (id: string, beforeId: string | null) => {
    const seq = orderedCatalog.map((w) => w.id).filter((x) => x !== id)
    const at = beforeId ? seq.indexOf(beforeId) : seq.length
    seq.splice(at < 0 ? seq.length : at, 0, id)
    setOrder(seq)
    saveCatalogOrder(seq)
  }

  const resetOrder = () => {
    setOrder([])
    saveCatalogOrder([])
    notify('Порядок расценок сброшен')
  }

  const totals = useMemo(() => calcTotals(estimate), [estimate])

  const patchEstimate = (id: string, fn: (e: Estimate) => Estimate) =>
    setEstimates((list) =>
      list.map((e) => (e.id === id ? { ...fn(e), updatedAt: new Date().toISOString() } : e)),
    )

  const update = (patch: Partial<Estimate>) => patchEstimate(estimate.id, (e) => ({ ...e, ...patch }))

  const addLines = (lines: Omit<EstimateLine, 'id'>[]): string[] => {
    const withIds = lines.map((l) => ({ ...l, id: uid() }))
    patchEstimate(estimate.id, (e) => ({ ...e, lines: [...e.lines, ...withIds] }))
    return withIds.map((l) => l.id)
  }

  /** Возврат в смету с подсветкой только что добавленной строки */
  const showInEstimate = (lineId: string) => {
    setHighlightId(lineId)
    window.clearTimeout(highlightTimer.current)
    highlightTimer.current = window.setTimeout(() => setHighlightId(null), 1800)
    setTab('estimate')
  }

  const addFromCatalog = (item: WorkItem, qty: number, price: number) => {
    const [id] = addLines([
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
    showInEstimate(id)
  }

  const saveCustom = (next: WorkItem[]) => {
    setCustom(next)
    saveCustomPrices(next)
  }

  const addCustomLine = (line: Omit<EstimateLine, 'id'>, remember: boolean) => {
    const [id] = addLines([line])
    if (remember) {
      saveCustom([
        ...custom,
        {
          id: line.refId,
          name: line.name,
          unit: line.unit,
          category: line.kind === 'material' ? 'Материалы' : 'Дополнительные работы',
          price: line.price,
          source: 'manual',
          updatedAt: new Date().toISOString(),
        },
      ])
    }
    setCustomOpen(false)
    notify(remember ? `Добавлено и запомнено: ${line.name}` : `Добавлено: ${line.name}`)
    showInEstimate(id)
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
    setEstimatesOpen(false)
    setTab('estimate')
    notify('Новая смета')
  }

  const openEstimate = (id: string) => {
    setCurrentId(id)
    setEstimatesOpen(false)
    setTab('estimate')
  }

  const deleteEstimate = (id: string) => {
    const title = estimates.find((e) => e.id === id)?.title
    setEstimates((list) => {
      const next = list.filter((e) => e.id !== id)
      if (next.length === 0) next.push(newEstimate(estimate.region))
      if (id === currentId) setCurrentId(next[0].id)
      return next
    })
    notify(title ? `Удалена смета «${title}»` : 'Смета удалена')
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
    saveCustom([...custom.filter((c) => c.id !== item.id), item])
    notify(`В каталоге: ${item.name}`)
  }

  const removeCustom = (id: string) => saveCustom(custom.filter((c) => c.id !== id))

  const updateCompany = (info: CompanyInfo) => {
    setCompany(info)
    saveCompany(info)
  }

  const exportBackup = async () => {
    const data = {
      app: 'price_cost_estimate',
      version: 1,
      exportedAt: new Date().toISOString(),
      estimates,
      templates,
      custom,
      company,
      catalogOrder: order,
    }
    const json = JSON.stringify(data, null, 2)
    const name = `smeta-backup-${new Date().toISOString().slice(0, 10)}.json`
    const file = new File([json], name, { type: 'application/json' })

    // В установленном на iPhone приложении скачивание не работает, а «Поделиться» даёт «Сохранить в Файлы»
    if (navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({ files: [file], title: 'Резервная копия смет' })
        return
      } catch {
        // отменили системный диалог — попробуем обычное скачивание
      }
    }
    const url = URL.createObjectURL(file)
    const a = document.createElement('a')
    a.href = url
    a.download = name
    document.body.appendChild(a)
    a.click()
    a.remove()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
    notify('Копия скачана')
  }

  const importBackup = async (file: File) => {
    try {
      const data = JSON.parse(await file.text()) as Partial<{
        app: string
        estimates: Estimate[]
        templates: EstimateTemplate[]
        custom: WorkItem[]
        company: CompanyInfo
        catalogOrder: string[]
      }>
      if (data.app !== 'price_cost_estimate' || !Array.isArray(data.estimates)) throw new Error('not a backup')

      const merged = new Map(estimates.map((e) => [e.id, e]))
      let added = 0
      for (const e of data.estimates) {
        if (!e?.id || !Array.isArray(e.lines)) continue
        const existing = merged.get(e.id)
        if (!existing) added++
        if (!existing || existing.updatedAt < e.updatedAt) merged.set(e.id, e)
      }
      setEstimates([...merged.values()])

      if (Array.isArray(data.templates)) {
        const t = new Map([...templates, ...data.templates].map((x) => [x.id, x]))
        const next = [...t.values()]
        setTemplates(next)
        saveTemplates(next)
      }
      if (Array.isArray(data.custom)) {
        saveCustom([...new Map([...custom, ...data.custom].map((x) => [x.id, x])).values()])
      }
      if (data.company && !company.name) updateCompany(data.company)
      if (Array.isArray(data.catalogOrder) && order.length === 0 && data.catalogOrder.length > 0) {
        setOrder(data.catalogOrder)
        saveCatalogOrder(data.catalogOrder)
      }
      notify(added > 0 ? `Восстановлено смет: ${added}` : 'Все сметы из копии уже на месте')
    } catch {
      notify('Это не резервная копия приложения')
    }
  }

  const openPdf = () => {
    if (isIos() && isStandalone()) {
      window.open(printUrl({ estimate, company }), '_blank')
    } else {
      window.print()
    }
  }

  const install = async () => {
    if (!installEvent) return
    await installEvent.prompt()
    const { outcome } = await installEvent.userChoice
    if (outcome === 'accepted') {
      setInstallEvent(null)
      notify('Приложение установлено')
    }
  }

  const installMode: InstallMode = isStandalone()
    ? 'none'
    : installEvent
      ? 'android'
      : isIos()
        ? 'ios'
        : 'none'

  const inEstimate = useMemo(() => {
    const m = new Map<string, number>()
    for (const l of estimate.lines) m.set(l.refId, (m.get(l.refId) ?? 0) + 1)
    return m
  }, [estimate.lines])

  return (
    <>
      <header className="topbar no-print">
        <button className="topbar-title" onClick={() => setEstimatesOpen(true)} aria-label="Мои сметы">
          <span className="topbar-text">
            <h1>{estimate.title || 'Новая смета'}</h1>
            <span className="sub">
              {estimates.length > 1 ? `${estimates.length} смет · ` : ''}
              {estimate.lines.length > 0 ? `${estimate.lines.length} поз.` : 'нажмите, чтобы переключить'}
            </span>
          </span>
          <IconChevron />
        </button>
        <div className="topbar-total">{formatRub(totals.total)}</div>
      </header>

      {tab === 'estimate' && (
        <EstimateView
          estimate={estimate}
          totals={totals}
          highlightId={highlightId}
          installMode={installMode}
          onInstall={install}
          onUpdate={update}
          onPatchLine={patchLine}
          onRemoveLine={removeLine}
          onAddClick={() => setTab('catalog')}
          onCustomClick={() => setCustomOpen(true)}
          onMaterialsClick={() => setTab('materials')}
          onPdf={openPdf}
          onSaveTemplate={saveAsTemplate}
          onNew={createEstimate}
          onDelete={() => deleteEstimate(estimate.id)}
          notify={notify}
        />
      )}

      {tab === 'catalog' && (
        <CatalogView
          works={orderedCatalog}
          region={estimate.region}
          inEstimate={inEstimate}
          hasCustomOrder={order.length > 0}
          onRegion={(region) => update({ region })}
          onPick={setPending}
          onCustom={() => setCustomOpen(true)}
          onMoveBefore={moveBefore}
          onResetOrder={resetOrder}
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
          installMode={installMode}
          onInstall={install}
          onNew={createEstimate}
          onOpen={openEstimate}
          onDelete={deleteEstimate}
          onApplyTemplate={applyTemplate}
          onDeleteTemplate={deleteTemplate}
          onUpsertCustom={upsertCustom}
          onRemoveCustom={removeCustom}
          onUpdateCompany={updateCompany}
          onExport={exportBackup}
          onImport={importBackup}
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

      {customOpen && <CustomSheet onClose={() => setCustomOpen(false)} onAdd={addCustomLine} />}

      {estimatesOpen && (
        <EstimatesSheet
          estimates={estimates}
          currentId={estimate.id}
          onClose={() => setEstimatesOpen(false)}
          onOpen={openEstimate}
          onNew={createEstimate}
          onDelete={deleteEstimate}
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
