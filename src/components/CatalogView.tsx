import { useMemo, useState } from 'react'
import type { WorkItem } from '../types'
import { formatRub } from '../lib/estimate'
import { SOURCE_LABELS } from '../lib/prices'
import { CATEGORIES } from '../data/works'
import { REGIONS } from '../data/regions'

type Props = {
  works: WorkItem[]
  region: string
  inEstimate: Map<string, number>
  onRegion: (region: string) => void
  onPick: (item: WorkItem) => void
}

const normalize = (s: string) => s.toLowerCase().replace(/ё/g, 'е')

export default function CatalogView({ works, region, inEstimate, onRegion, onPick }: Props) {
  const [query, setQuery] = useState('')

  const groups = useMemo(() => {
    const q = normalize(query.trim())
    const filtered = q ? works.filter((w) => normalize(w.name).includes(q)) : works

    return CATEGORIES.map((cat) => ({
      name: cat,
      items: filtered.filter((w) => w.category === cat),
    })).filter((g) => g.items.length > 0)
  }, [works, query])

  return (
    <div className="no-print">
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
      </div>

      <div className="section section-tight">
        {groups.length === 0 ? (
          <div className="card">
            <div className="empty">
              <strong>Ничего не найдено</strong>
              <p>Проверьте написание или заведите свою расценку во вкладке «Ещё».</p>
            </div>
          </div>
        ) : (
          groups.map((group) => (
            <div className="card" key={group.name}>
              <div className="cat-group">{group.name}</div>
              {group.items.map((item) => {
                const count = inEstimate.get(item.id)
                return (
                  <button className="cat-item" key={item.id} onClick={() => onPick(item)}>
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

        <p className="hint">
          Средние рыночные ориентиры, не нормативы. Цену можно поправить при добавлении и прямо в смете.
        </p>
      </div>
    </div>
  )
}
