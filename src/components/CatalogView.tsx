import { useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import type { WorkItem } from '../types'
import { formatRub } from '../lib/estimate'
import { SOURCE_LABELS } from '../lib/prices'
import { REGIONS } from '../data/regions'
import { IconGrip } from './Icons'

type Props = {
  works: WorkItem[]
  region: string
  inEstimate: Map<string, number>
  hasCustomOrder: boolean
  onRegion: (region: string) => void
  onPick: (item: WorkItem) => void
  onCustom: () => void
  onMoveBefore: (id: string, beforeId: string | null) => void
  onResetOrder: () => void
}

const normalize = (s: string) => s.toLowerCase().replace(/ё/g, 'е')

/** Соседние позиции одного раздела собираются в одну карточку с заголовком */
function groupRuns(items: WorkItem[]): { category: string; items: WorkItem[] }[] {
  const runs: { category: string; items: WorkItem[] }[] = []
  for (const item of items) {
    const last = runs[runs.length - 1]
    if (last && last.category === item.category) last.items.push(item)
    else runs.push({ category: item.category, items: [item] })
  }
  return runs
}

export default function CatalogView({
  works,
  region,
  inEstimate,
  hasCustomOrder,
  onRegion,
  onPick,
  onCustom,
  onMoveBefore,
  onResetOrder,
}: Props) {
  const [query, setQuery] = useState('')
  const [reorder, setReorder] = useState(false)
  const [dragId, setDragId] = useState<string | null>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const edgeScroll = useRef(0)
  const scrollLoop = useRef<number>()

  const visible = useMemo(() => {
    const q = normalize(query.trim())
    return q ? works.filter((w) => normalize(w.name).includes(q)) : works
  }, [works, query])

  const runs = useMemo(() => groupRuns(visible), [visible])

  const moveUp = (id: string) => {
    const i = visible.findIndex((w) => w.id === id)
    if (i > 0) onMoveBefore(id, visible[i - 1].id)
  }

  const moveDown = (id: string) => {
    const i = visible.findIndex((w) => w.id === id)
    if (i >= 0 && i < visible.length - 1) onMoveBefore(id, visible[i + 2]?.id ?? null)
  }

  /** Куда вставить перетаскиваемую строку при данной высоте указателя */
  const dropTargetAt = (y: number, id: string): string | null | undefined => {
    const rows = listRef.current?.querySelectorAll<HTMLElement>('[data-id]') ?? []
    let prev: string | null = null
    for (const row of rows) {
      const rowId = row.dataset.id!
      if (rowId === id) continue
      const r = row.getBoundingClientRect()
      if (r.top + r.height / 2 > y) {
        return prev === id ? undefined : rowId
      }
      prev = rowId
    }
    return prev === id ? undefined : null
  }

  const stopScrollLoop = () => {
    if (scrollLoop.current) cancelAnimationFrame(scrollLoop.current)
    scrollLoop.current = undefined
    edgeScroll.current = 0
  }

  const startDrag = (e: ReactPointerEvent<HTMLElement>, id: string) => {
    e.preventDefault()
    e.currentTarget.setPointerCapture(e.pointerId)
    setDragId(id)
    const tick = () => {
      if (edgeScroll.current) window.scrollBy(0, edgeScroll.current)
      scrollLoop.current = requestAnimationFrame(tick)
    }
    scrollLoop.current = requestAnimationFrame(tick)
  }

  const onDragMove = (e: ReactPointerEvent<HTMLElement>, id: string) => {
    if (dragId !== id) return
    const y = e.clientY
    edgeScroll.current = y < 100 ? -10 : y > window.innerHeight - 100 ? 10 : 0
    const target = dropTargetAt(y, id)
    if (target !== undefined) {
      const i = visible.findIndex((w) => w.id === id)
      const current = visible[i + 1]?.id ?? null
      if (target !== current) onMoveBefore(id, target)
    }
  }

  const endDrag = () => {
    setDragId(null)
    stopScrollLoop()
  }

  return (
    <div className="no-print">
      {reorder ? (
        <div className="catalog-bar reorder-bar">
          <span className="reorder-title">Порядок расценок</span>
          <button className="btn-ghost" onClick={onResetOrder} disabled={!hasCustomOrder}>
            Сбросить
          </button>
          <button className="btn btn-primary" onClick={() => setReorder(false)}>
            Готово
          </button>
        </div>
      ) : (
        <div className="catalog-bar">
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Найти работу или материал"
            aria-label="Поиск по расценкам"
          />
          <select value={region} onChange={(e) => onRegion(e.target.value)} aria-label="Регион расценок">
            {REGIONS.map((r) => (
              <option key={r.id} value={r.id}>
                {r.label}
              </option>
            ))}
          </select>
          <button className="icon-btn" onClick={() => setReorder(true)} aria-label="Изменить порядок" title="Изменить порядок">
            <IconGrip />
          </button>
        </div>
      )}

      {reorder && (
        <p className="hint reorder-hint">
          Тяните за рукоятку или нажимайте стрелки. Порядок запоминается на этом устройстве.
        </p>
      )}

      <div className="section section-tight" ref={listRef}>
        {runs.length === 0 ? (
          <div className="card">
            <div className="empty">
              <strong>Ничего не найдено</strong>
              <p>Проверьте написание или впишите позицию со своей ценой.</p>
              <button className="btn btn-primary" onClick={onCustom}>
                Своя позиция
              </button>
            </div>
          </div>
        ) : (
          runs.map((run, runIndex) => (
            <div className="card" key={`${run.category}-${runIndex}`}>
              <div className="cat-group">{run.category}</div>
              {run.items.map((item) => {
                const count = inEstimate.get(item.id)
                const index = visible.indexOf(item)

                if (reorder) {
                  return (
                    <div
                      className={`cat-item reorder${dragId === item.id ? ' dragging' : ''}`}
                      data-id={item.id}
                      key={item.id}
                    >
                      <span
                        className="drag-handle"
                        role="button"
                        aria-label={`Перетащить: ${item.name}`}
                        onPointerDown={(e) => startDrag(e, item.id)}
                        onPointerMove={(e) => onDragMove(e, item.id)}
                        onPointerUp={endDrag}
                        onPointerCancel={endDrag}
                      >
                        <IconGrip />
                      </span>
                      <span className="name">
                        {item.name}
                        <span className="meta">{formatRub(item.price)} за {item.unit}</span>
                      </span>
                      <span className="reorder-btns">
                        <button onClick={() => moveUp(item.id)} disabled={index === 0} aria-label="Выше">
                          ▲
                        </button>
                        <button onClick={() => moveDown(item.id)} disabled={index === visible.length - 1} aria-label="Ниже">
                          ▼
                        </button>
                      </span>
                    </div>
                  )
                }

                return (
                  <button className="cat-item" data-id={item.id} key={item.id} onClick={() => onPick(item)}>
                    <span className="name">
                      {item.name}
                      <span className="meta">
                        за {item.unit}
                        {item.range && (
                          <>
                            {' · '}рынок{' '}
                            <span className="mono">
                              {item.range[0]}–{item.range[1]}
                            </span>
                          </>
                        )}
                        {item.source !== 'base' && ` · ${SOURCE_LABELS[item.source]}`}
                        {item.note && ` · ${item.note}`}
                      </span>
                    </span>
                    <span className="price">
                      {formatRub(item.price)}
                      {count && <span className="in-estimate">в смете{count > 1 ? ` ×${count}` : ''}</span>}
                    </span>
                  </button>
                )
              })}
            </div>
          ))
        )}

        {!reorder && runs.length > 0 && (
          <button className="btn btn-block btn-dashed" onClick={onCustom}>
            + Нет в списке — своя позиция с ценой
          </button>
        )}

        {!reorder && (
          <p className="hint">
            Средние рыночные ориентиры, не нормативы. Цену можно поправить при добавлении и прямо в смете.
          </p>
        )}
      </div>
    </div>
  )
}
