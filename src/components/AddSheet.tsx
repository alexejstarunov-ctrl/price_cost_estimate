import { useState } from 'react'
import type { WorkItem } from '../types'
import { formatRub } from '../lib/estimate'
import NumField from './NumField'
import Sheet from './Sheet'

type Props = {
  item: WorkItem
  onClose: () => void
  onAdd: (qty: number, price: number, rememberPrice: boolean) => void
}

export default function AddSheet({ item, onClose, onAdd }: Props) {
  const [qty, setQty] = useState(0)
  const [price, setPrice] = useState(item.price)
  const [remember, setRemember] = useState(false)

  const canAdd = qty > 0 && price >= 0
  const priceChanged = price !== item.price

  return (
    <Sheet
      labelledBy="sheet-title"
      onClose={onClose}
      onSubmit={(e) => {
        e.preventDefault()
        if (canAdd) onAdd(qty, price, priceChanged && remember)
      }}
    >
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

      {priceChanged && (
        <label className="check">
          <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} />
          <span>Запомнить эту цену в прайсе</span>
        </label>
      )}

      <div className="sheet-sum">
        <span>Сумма</span>
        <strong>{formatRub(qty * price)}</strong>
      </div>

      <div className="btn-row">
        <button type="button" className="btn" onClick={onClose}>
          Отмена
        </button>
        <button type="submit" className="btn btn-primary" disabled={!canAdd}>
          Добавить
        </button>
      </div>
    </Sheet>
  )
}
