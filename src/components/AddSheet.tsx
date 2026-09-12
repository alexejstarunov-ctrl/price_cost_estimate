import { useEffect, useState } from 'react'
import type { WorkItem } from '../types'
import { formatRub } from '../lib/estimate'
import NumField from './NumField'

type Props = {
  item: WorkItem
  onClose: () => void
  onAdd: (qty: number, price: number) => void
}

export default function AddSheet({ item, onClose, onAdd }: Props) {
  const [qty, setQty] = useState(0)
  const [price, setPrice] = useState(item.price)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const canAdd = qty > 0 && price >= 0

  const submit = () => {
    if (canAdd) onAdd(qty, price)
  }

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <form
        className="sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby="sheet-title"
        onClick={(e) => e.stopPropagation()}
        onSubmit={(e) => {
          e.preventDefault()
          submit()
        }}
      >
        <div className="sheet-grip" aria-hidden />
        <h3 id="sheet-title">{item.name}</h3>
        <div className="sheet-meta">
          {item.category}
          {item.range && (
            <>
              {' · '}рынок <span className="mono">{item.range[0]}–{item.range[1]} ₽</span>
            </>
          )}
        </div>

        <div className="row">
          <label className="field">
            <span>Количество, {item.unit}</span>
            <NumField value={qty} onChange={setQty} autoFocus blankZero placeholder="0" className="input-lg" />
          </label>
          <label className="field">
            <span>Цена за {item.unit}, ₽</span>
            <NumField value={price} onChange={setPrice} decimals={0} className="input-lg" />
          </label>
        </div>

        <div className="sheet-sum">
          <span>Сумма</span>
          <strong>{formatRub(qty * price)}</strong>
        </div>

        <div className="btn-row">
          <button type="button" className="btn" onClick={onClose}>
            Отмена
          </button>
          <button type="submit" className="btn btn-primary" disabled={!canAdd}>
            Добавить в смету
          </button>
        </div>
      </form>
    </div>
  )
}
