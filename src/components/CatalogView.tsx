import { useMemo, useState } from 'react'
import type { WorkItem } from '../types'
import { formatRub } from '../lib/estimate'
import { SOURCE_LABELS, type PriceState } from '../lib/prices'
import { CATEGORIES } from '../data/works'

type Props = {
  works: WorkItem[]
  feed: PriceState
  onAdd: (item: WorkItem, qty?: number) => void
}

export default function CatalogView({ works, feed, onAdd }: Props) {
  const [query, setQuery] = useState('')

  const groups = useMemo(() => {
    const q = query.trim().toLowerCase()
    const filtered = q ? works.filter((w) => w.name.toLowerCase().includes(q)) : works

    return CATEGORIES.map((cat) => ({
      name: cat,
      items: filtered.filter((w) => w.category === cat),
    })).filter((g) => g.items.length > 0)
  }, [works, query])

  const blocked = feed.sources.filter((s) => s.status === 'blocked')

  return (
    <div className="no-print">
      <div className="catalog-search">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Поиск работы или материала"
          aria-label="Поиск по расценкам"
        />
      </div>

      {feed.feedDate && (
        <div className="banner">
          Цены обновлены {new Date(feed.feedDate).toLocaleDateString('ru-RU')}
          {blocked.length > 0 && ` · недоступны: ${blocked.map((b) => b.name).join(', ')}`}
        </div>
      )}

      <div className="section" style={{ paddingTop: 0 }}>
        {groups.length === 0 ? (
          <div className="empty">
            <span className="ico">🔍</span>
            Ничего не найдено
            <div className="hint">Свою расценку можно завести во вкладке «Ещё»</div>
          </div>
        ) : (
          groups.map((group) => (
            <div className="card" key={group.name}>
              <div className="cat-group">{group.name}</div>
              {group.items.map((item) => (
                <button className="cat-item" key={item.id} onClick={() => onAdd(item)}>
                  <span className="name">
                    {item.name}
                    <span className="meta">
                      за 1 {item.unit}
                      {item.range && ` · рынок ${item.range[0]}–${item.range[1]} ₽`}
                      {item.source !== 'base' && ` · ${SOURCE_LABELS[item.source]}`}
                    </span>
                  </span>
                  <span className="price">{formatRub(item.price)}</span>
                </button>
              ))}
            </div>
          ))
        )}

        <div className="hint" style={{ padding: '14px 4px' }}>
          Средние рыночные ориентиры, не нормативные расценки. Цена зависит от объекта —
          её можно поправить прямо в смете.
        </div>
      </div>
    </div>
  )
}
