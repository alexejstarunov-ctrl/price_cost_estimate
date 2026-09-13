import { useState } from 'react'
import type { EstimateLine, LineKind, Unit } from '../types'
import { formatRub } from '../lib/estimate'
import NumField from './NumField'
import Sheet from './Sheet'

export const UNITS: Unit[] = ['м²', 'п.м', 'шт', 'компл', 'меш', 'кг', 'л', 'точка']

type Props = {
  onClose: () => void
  onAdd: (line: Omit<EstimateLine, 'id'>, remember: boolean) => void
}

/** Своя позиция — работа или материал с ценой — сразу в смету, минуя каталог */
export default function CustomSheet({ onClose, onAdd }: Props) {
  const [name, setName] = useState('')
  const [kind, setKind] = useState<LineKind>('material')
  const [unit, setUnit] = useState<Unit>('м²')
  const [qty, setQty] = useState(0)
  const [price, setPrice] = useState(0)
  const [remember, setRemember] = useState(false)

  const canAdd = name.trim().length > 0 && qty > 0

  return (
    <Sheet
      labelledBy="custom-title"
      onClose={onClose}
      onSubmit={(e) => {
        e.preventDefault()
        if (!canAdd) return
        onAdd({ refId: `custom-${Date.now().toString(36)}`, name: name.trim(), unit, price, qty, kind }, remember)
      }}
    >
      <h3 id="custom-title">Своя позиция</h3>
      <div className="sheet-meta">Материал или работа, которых нет в расценках</div>

      <div className="segmented" role="radiogroup" aria-label="Тип позиции">
        {(
          [
            ['material', 'Материал'],
            ['work', 'Работа'],
          ] as [LineKind, string][]
        ).map(([k, label]) => (
          <button key={k} type="button" role="radio" aria-checked={kind === k} className={kind === k ? 'active' : ''} onClick={() => setKind(k)}>
            {label}
          </button>
        ))}
      </div>

      <label className="field">
        <span>Наименование</span>
        <input
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={kind === 'material' ? 'Клей Ceresit CM 11, 25 кг' : 'Установка экрана под ванну'}
        />
      </label>

      <div className="row-3 custom-row">
        <label className="field">
          <span>Кол-во</span>
          <NumField value={qty} onChange={setQty} blankZero placeholder="0" className="input-lg" />
        </label>
        <label className="field">
          <span>Единица</span>
          <select value={unit} onChange={(e) => setUnit(e.target.value as Unit)}>
            {UNITS.map((u) => (
              <option key={u}>{u}</option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>Цена, ₽</span>
          <NumField value={price} onChange={setPrice} decimals={0} blankZero placeholder="0" className="input-lg" />
        </label>
      </div>

      <label className="check">
        <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} />
        <span>Запомнить в моих расценках</span>
      </label>

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
