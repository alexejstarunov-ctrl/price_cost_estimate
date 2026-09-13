import { useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import type { WorkItem } from '../types'
import { formatRub } from '../lib/estimate'
import { SOURCE_LABELS } from '../lib/prices'
import { REGIONS } from '../data/regions'
import { IconChevron, IconEdit, IconGrip } from './Icons'

type Props = {
  works: WorkItem[]
  categories: string[]
  collapsed: string[]
  region: string
  inEstimate: Map<string, number>
  hasCustomLayout: boolean
  onRegion: (region: string) => void
  onPick: (item: WorkItem) => void
  onCustom: () => void
  onMoveItem: (id: string, beforeId: string | null, category: string) => void
  onMoveCategory: (category: string, dir: -1 | 1) => void
  onToggleCollapse: (category: string) => void
  onResetLayout: () => void
  onEdit: (item: WorkItem) => void
  onAddToPrice: () => void
  hiddenCount: number
  onUnhide: () => void
}

const normalize = (s: string) => s.toLowerCase().replace(/ё/g, 'е')

const plural = (n: number) => {
  const m10 = n % 10
  const m100 = n % 100
  if (m10 === 1 && m100 !== 11) return `${n} позиция`
  if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return `${n} позиции`
  return `${n} позиций`
}

export default function CatalogView({
  works,
  categories,
  collapsed,
  region,
  inEstimate,
  hasCustomLayout,
  onRegion,
  onPick,
  onCustom,
  onMoveItem,
  onMoveCategory,
  onToggleCollapse,
  onResetLayout,
  onEdit,
  onAddToPrice,
  hiddenCount,
  onUnhide,
}: Props) {
  const [query, setQuery] = useState('')
  const [reorder, setReorder] = useState(false)
  const [dragId, setDragId] = useState<string | null>(null)
  const [drop, setDrop] = useState<{ beforeId: string | null; category: string } | null>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const edgeScroll = useRef(0)
  const scrollLoop = useRef<number>()

  const q = normalize(query.trim())

  const sections = useMemo(() => {
    const visible = q ? works.filter((w) => normalize(w.name).includes(q)) : works
    return categories
      .map((category) => ({ category, items: visible.filter((w) => w.category === category) }))
      .filter((s) => s.items.length > 0)
  }, [works, categories, q])

  /** Куда вставить перетаскиваемую строку при данной высоте указателя */
  const dropTargetAt = (y: number, id: string) => {
    const rows = [...(listRef.current?.querySelectorAll<HTMLElement>('[data-id]') ?? [])]
    const dragged = rows.find((r) => r.dataset.id === id)
    const draggedIndex = dragged ? rows.indexOf(dragged) : -1
    const next = draggedIndex >= 0 ? rows[draggedIndex + 1] : undefined
    const draggedCat = dragged?.dataset.cat

    for (const row of rows) {
      if (row === dragged) continue
      const r = row.getBoundingClientRect()
      if (r.top + r.height / 2 > y) {
        // Над собственным соседом в том же разделе — положение не меняется
        if (row === next && row.dataset.cat === draggedCat) return null
        return { beforeId: row.dataset.id!, category: row.dataset.cat! }
      }
    }
    const last = rows[rows.length - 1]
    if (!last || last === dragged) return null
    return { beforeId: null, category: last.dataset.cat! }
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
    stopScrollLoop()
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
    setDrop((prev) =>
      prev?.beforeId === target?.beforeId && prev?.category === target?.category ? prev : target,
    )
  }

  /** Перенос применяется на отпускании: строка не перемонтируется во время drag и не теряет захват указателя */
  const endDrag = () => {
    if (dragId && drop) onMoveItem(dragId, drop.beforeId, drop.category)
    setDragId(null)
    setDrop(null)
    stopScrollLoop()
  }

  const enterReorder = () => {
    setQuery('')
    setReorder(true)
  }

  return (
    <div className="no-print">
      {reorder ? (
        <div className="catalog-bar reorder-bar">
          <span className="reorder-title">Порядок расценок</span>
          <button className="btn-ghost" onClick={onResetLayout} disabled={!hasCustomLayout}>
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
          <button className="icon-btn" onClick={enterReorder} aria-label="Изменить порядок" title="Изменить порядок">
            <IconGrip />
          </button>
        </div>
      )}

      {reorder && (
        <p className="hint reorder-hint">
          Разделы — стрелками в заголовке. Позиции — за рукоятку в любое место, в том числе в
          другой раздел, или стрелками. Свёрнутый раздел позиции не принимает — разверните его.
        </p>
      )}

      <div className="section section-tight" ref={listRef}>
        {sections.length === 0 ? (
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
          sections.map((section, si) => {
            const isCollapsed = !q && collapsed.includes(section.category)
            const nextSectionFirst = sections[si + 1]?.items[0]?.id ?? null

            return (
              <div
                className={`card${isCollapsed ? ' collapsed' : ''}${drop && drop.beforeId === null && drop.category === section.category ? ' drop-end' : ''}`}
                key={section.category}
              >
                <div className="cat-head">
                  <button
                    className="cat-toggle"
                    aria-expanded={!isCollapsed}
                    onClick={() => onToggleCollapse(section.category)}
                  >
                    <IconChevron />
                    <span className="cat-name">{section.category}</span>
                    <span className="cat-count">{plural(section.items.length)}</span>
                  </button>
                  {reorder && (
                    <span className="reorder-btns">
                      <button
                        onClick={() => onMoveCategory(section.category, -1)}
                        disabled={si === 0}
                        aria-label={`Раздел выше: ${section.category}`}
                      >
                        ▲
                      </button>
                      <button
                        onClick={() => onMoveCategory(section.category, 1)}
                        disabled={si === sections.length - 1}
                        aria-label={`Раздел ниже: ${section.category}`}
                      >
                        ▼
                      </button>
                    </span>
                  )}
                </div>

                {!isCollapsed &&
                  section.items.map((item, idx) => {
                    const count = inEstimate.get(item.id)

                    if (reorder) {
                      return (
                        <div
                          className={`cat-item reorder${dragId === item.id ? ' dragging' : ''}${drop?.beforeId === item.id ? ' drop-before' : ''}`}
                          data-id={item.id}
                          data-cat={section.category}
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
                            <button
                              onClick={() => onMoveItem(item.id, section.items[idx - 1].id, section.category)}
                              disabled={idx === 0}
                              aria-label="Выше"
                            >
                              ▲
                            </button>
                            <button
                              onClick={() =>
                                onMoveItem(item.id, section.items[idx + 2]?.id ?? nextSectionFirst, section.category)
                              }
                              disabled={idx === section.items.length - 1}
                              aria-label="Ниже"
                            >
                              ▼
                            </button>
                          </span>
                        </div>
                      )
                    }

                    return (
                      <div className="cat-item pickable" data-id={item.id} data-cat={section.category} key={item.id}>
                        <button className="cat-main" onClick={() => onPick(item)}>
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
                        <button className="cat-edit" onClick={() => onEdit(item)} aria-label={`Изменить: ${item.name}`}>
                          <IconEdit />
                        </button>
                      </div>
                    )
                  })}
              </div>
            )
          })
        )}

        {!reorder && (
          <div className="btn-row">
            <button className="btn btn-dashed" onClick={onAddToPrice}>
              + В прайс
            </button>
            <button className="btn btn-dashed" onClick={onCustom}>
              + Своя позиция в смету
            </button>
          </div>
        )}

        {!reorder && hiddenCount > 0 && (
          <p className="hint hidden-note">
            Скрыто позиций: {hiddenCount} ·
            <button className="btn-ghost" onClick={onUnhide}>
              Показать
            </button>
          </p>
        )}

        {!reorder && (
          <p className="hint">
            Средние рыночные ориентиры, не нормативы. Карандаш у позиции — изменить цену, название или
            скрыть; цену можно поправить и при добавлении, и прямо в смете.
          </p>
        )}
      </div>
    </div>
  )
}
