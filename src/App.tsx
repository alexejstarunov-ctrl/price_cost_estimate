import { useEffect, useMemo, useRef, useState } from 'react'
import type { Estimate, EstimateLine, EstimateTemplate, Unit, WorkItem } from './types'
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
  EMPTY_LAYOUT,
  isDefaultLayout,
  loadCompany,
  loadCurrentId,
  loadCustomPrices,
  loadEstimates,
  loadLayout,
  loadCatalogEdits,
  loadTemplates,
  saveCompany,
  saveCurrentId,
  saveCustomPrices,
  saveEstimates,
  saveLayout,
  saveCatalogEdits,
  saveTemplates,
  uid,
  type CatalogLayout,
  type CatalogEdits,
  type CompanyInfo,
} from './lib/storage'
import { CATEGORIES } from './data/works'
import EstimateView from './components/EstimateView'
import CatalogView from './components/CatalogView'
import MaterialsView from './components/MaterialsView'
import MoreView from './components/MoreView'
import PrintView from './components/PrintView'
import PrintRoute from './components/PrintRoute'
import AddSheet from './components/AddSheet'
import CustomSheet from './components/CustomSheet'
import ItemEditSheet, { type ItemValues } from './components/ItemEditSheet'
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
  const [layout, setLayout] = useState<CatalogLayout>(loadLayout)
  const [catalogEdits, setCatalogEdits] = useState<CatalogEdits>(loadCatalogEdits)
  const [editing, setEditing] = useState<{ item: WorkItem | null } | null>(null)
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
  useEffect(() => saveLayout(layout), [layout])
  useEffect(() => saveCatalogEdits(catalogEdits), [catalogEdits])
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

  /** Цена базовой позиции для выбранного региона: реальная цена города, иначе коэффициент */
  const regionalPrice = (w: WorkItem): number => {
    const region = getRegion(estimate.region)
    return region.prices?.[w.id] ?? Math.round(w.price * region.factor)
  }

  /** Каталог целиком: регион → правки мастера. Свои цены регион не трогает */
  const catalogAll = useMemo(() => {
    const region = getRegion(estimate.region)
    return feed.works.map((w) => {
      if (w.source === 'manual') return w
      const local = region.prices?.[w.id]
      const priced: WorkItem =
        local !== undefined
          ? { ...w, price: local, source: 'region' }
          : { ...w, price: Math.round(w.price * region.factor) }
      const e = catalogEdits.edits[w.id]
      if (!e) return priced
      return { ...priced, ...e, source: e.price !== undefined ? 'manual' : priced.source }
    })
  }, [feed.works, estimate.region, catalogEdits.edits])

  /** То, что видно в каталоге: без скрытых мастером позиций */
  const catalog = useMemo(
    () => catalogAll.filter((w) => !catalogEdits.hidden.includes(w.id)),
    [catalogAll, catalogEdits.hidden],
  )

  /** Каталог в раскладке пользователя: перенесённые позиции — в своих разделах, порядок — его */
  const orderedCatalog = useMemo(() => {
    const withCategory = catalog.map((w) =>
      layout.overrides[w.id] ? { ...w, category: layout.overrides[w.id] } : w,
    )
    if (layout.itemOrder.length === 0) return withCategory
    const index = new Map(layout.itemOrder.map((id, i) => [id, i]))
    const known = withCategory
      .filter((w) => index.has(w.id))
      .sort((a, b) => index.get(a.id)! - index.get(b.id)!)
    const unknown = withCategory.filter((w) => !index.has(w.id))
    return [...known, ...unknown]
  }, [catalog, layout.itemOrder, layout.overrides])

  /** Разделы в порядке пользователя; новые — следом в базовом порядке */
  const categories = useMemo(() => {
    const present = new Set(orderedCatalog.map((w) => w.category))
    const base = [...CATEGORIES, ...[...present].filter((c) => !(CATEGORIES as readonly string[]).includes(c))]
    const known = layout.categoryOrder.filter((c) => present.has(c))
    const rest = base.filter((c) => present.has(c) && !known.includes(c))
    return [...known, ...rest]
  }, [orderedCatalog, layout.categoryOrder])

  const moveItem = (id: string, beforeId: string | null, category: string) => {
    const seq = orderedCatalog.map((w) => w.id).filter((x) => x !== id)
    const at = beforeId ? seq.indexOf(beforeId) : seq.length
    seq.splice(at < 0 ? seq.length : at, 0, id)
    const baseCategory = feed.works.find((w) => w.id === id)?.category
    const overrides = { ...layout.overrides }
    if (category !== baseCategory) overrides[id] = category
    else delete overrides[id]
    setLayout({ ...layout, itemOrder: seq, overrides })
  }

  const moveCategory = (category: string, dir: -1 | 1) => {
    const seq = [...categories]
    const i = seq.indexOf(category)
    const j = i + dir
    if (i < 0 || j < 0 || j >= seq.length) return
    ;[seq[i], seq[j]] = [seq[j], seq[i]]
    setLayout({ ...layout, categoryOrder: seq })
  }

  const toggleCollapsed = (category: string) =>
    setLayout({
      ...layout,
      collapsed: layout.collapsed.includes(category)
        ? layout.collapsed.filter((c) => c !== category)
        : [...layout.collapsed, category],
    })

  const resetLayout = () => {
    setLayout({ ...EMPTY_LAYOUT, collapsed: layout.collapsed })
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

  const addFromCatalog = (item: WorkItem, qty: number, price: number, rememberPrice = false) => {
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
    if (rememberPrice) saveItem(item.id, { price }, true)
    notify(rememberPrice ? `Добавлено, цена запомнена: ${item.name}` : `Добавлено: ${item.name}`)
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
        price: l.price || catalogAll.find((w) => w.id === l.refId)?.price || 0,
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

  /** Правка позиции прайса: своя меняется сама, у базовой запоминаются только отличия */
  const saveItem = (
    id: string,
    patch: { name?: string; unit?: Unit; price?: number; category?: string },
    quiet = false,
  ) => {
    const own = custom.find((c) => c.id === id)
    if (own) {
      saveCustom(custom.map((c) => (c.id === id ? { ...c, ...patch, updatedAt: new Date().toISOString() } : c)))
      if (patch.category !== undefined && layout.overrides[id]) {
        const overrides = { ...layout.overrides }
        delete overrides[id]
        setLayout({ ...layout, overrides })
      }
    } else {
      const base = feed.works.find((w) => w.id === id)
      if (!base) return
      const next = { ...(catalogEdits.edits[id] ?? {}) }
      if (patch.name !== undefined) {
        if (patch.name.trim() && patch.name.trim() !== base.name) next.name = patch.name.trim()
        else delete next.name
      }
      if (patch.unit !== undefined) {
        if (patch.unit !== base.unit) next.unit = patch.unit
        else delete next.unit
      }
      if (patch.price !== undefined) {
        if (patch.price !== regionalPrice(base)) next.price = patch.price
        else delete next.price
      }
      const edits = { ...catalogEdits.edits }
      if (Object.keys(next).length > 0) edits[id] = next
      else delete edits[id]
      setCatalogEdits({ ...catalogEdits, edits })
      if (patch.category !== undefined) {
        const overrides = { ...layout.overrides }
        if (patch.category !== base.category) overrides[id] = patch.category
        else delete overrides[id]
        setLayout({ ...layout, overrides })
      }
    }
    setEditing(null)
    if (!quiet) notify('Прайс обновлён')
  }

  const createItem = (values: ItemValues) => {
    saveCustom([
      ...custom,
      { id: `custom-${uid()}`, ...values, source: 'manual', updatedAt: new Date().toISOString() },
    ])
    setEditing(null)
    notify(`В прайсе: ${values.name}`)
  }

  /** Базовая позиция скрывается (её можно вернуть), своя удаляется насовсем */
  const deleteItem = (id: string) => {
    if (custom.some((c) => c.id === id)) {
      removeCustom(id)
      notify('Удалено из прайса')
    } else {
      setCatalogEdits({ ...catalogEdits, hidden: [...catalogEdits.hidden, id] })
      notify('Скрыто из прайса — вернуть можно внизу каталога')
    }
    setEditing(null)
  }

  const unhideAll = () => {
    setCatalogEdits({ ...catalogEdits, hidden: [] })
    notify('Скрытые позиции возвращены')
  }

  const resetItem = (id: string) => {
    const edits = { ...catalogEdits.edits }
    delete edits[id]
    setCatalogEdits({ ...catalogEdits, edits })
    if (layout.overrides[id]) {
      const overrides = { ...layout.overrides }
      delete overrides[id]
      setLayout({ ...layout, overrides })
    }
    setEditing(null)
    notify('Возвращены исходные значения')
  }

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
      catalogLayout: layout,
      catalogEdits,
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
        catalogLayout: CatalogLayout
        catalogEdits: CatalogEdits
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
      if (data.catalogEdits) {
        setCatalogEdits({
          edits: { ...catalogEdits.edits, ...(data.catalogEdits.edits ?? {}) },
          hidden: [...new Set([...catalogEdits.hidden, ...(data.catalogEdits.hidden ?? [])])],
        })
      }
      if (isDefaultLayout(layout)) {
        if (data.catalogLayout) setLayout({ ...EMPTY_LAYOUT, ...data.catalogLayout })
        else if (Array.isArray(data.catalogOrder) && data.catalogOrder.length > 0)
          setLayout({ ...EMPTY_LAYOUT, itemOrder: data.catalogOrder })
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
          categories={categories}
          collapsed={layout.collapsed}
          region={estimate.region}
          inEstimate={inEstimate}
          hasCustomLayout={!isDefaultLayout(layout)}
          onRegion={(region) => update({ region })}
          onPick={setPending}
          onCustom={() => setCustomOpen(true)}
          onMoveItem={moveItem}
          onMoveCategory={moveCategory}
          onToggleCollapse={toggleCollapsed}
          onResetLayout={resetLayout}
          onEdit={(item) => setEditing({ item })}
          onAddToPrice={() => setEditing({ item: null })}
          hiddenCount={catalogEdits.hidden.length}
          onUnhide={unhideAll}
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
          onAdd={(qty, price, remember) => addFromCatalog(pending, qty, price, remember)}
        />
      )}

      {customOpen && <CustomSheet onClose={() => setCustomOpen(false)} onAdd={addCustomLine} />}

      {editing && (
        <ItemEditSheet
          item={editing.item}
          categories={categories}
          isBase={editing.item !== null && !custom.some((c) => c.id === editing.item!.id)}
          edited={editing.item !== null && Boolean(catalogEdits.edits[editing.item.id] || layout.overrides[editing.item.id])}
          onClose={() => setEditing(null)}
          onSave={(values) => (editing.item ? saveItem(editing.item.id, values) : createItem(values))}
          onDelete={() => editing.item && deleteItem(editing.item.id)}
          onReset={() => editing.item && resetItem(editing.item.id)}
        />
      )}

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
