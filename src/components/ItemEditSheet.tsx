import { useState } from 'react'
import type { Unit, WorkItem } from '../types'
import { formatRub } from '../lib/estimate'
import NumField from './NumField'
import ConfirmButton from './ConfirmButton'
import Sheet from './Sheet'
import { UNITS } from './CustomSheet'

export type ItemValues = { name: string; category: string; unit: Unit; price: number }

type Props = {
  /** null — новая позиция в прайсе */
  item: WorkItem | null
  categories: string[]
  /** Базовая позиция скрывается, своя — удаляется насовсем */
  isBase: boolean
  /** У базовой позиции есть правки, которые можно откатить */
  edited: boolean
  onClose: () => void
  onSave: (values: ItemValues) => void
  onDelete: () => void
  onReset: () => void
}

export default function ItemEditSheet({ item, categories, isBase, edited, onClose, onSave, onDelete, onReset }: Props) {
  const [name, setName] = useState(item?.name ?? '')
  const [category, setCategory] = useState(item?.category ?? categories[0] ?? 'Укладка плитки')
  const [unit, setUnit] = useState<Unit>(item?.unit ?? 'м²')
  const [price, setPrice] = useState(item?.price ?? 0)

  const canSave = name.trim().length > 0 && price > 0
  const cats = categories.includes(category) ? categories : [...categories, category]

  return (
    <Sheet
      labelledBy="edit-title"
      onClose={onClose}
      onSubmit={(e) => {
        e.preventDefault()
        if (canSave) onSave({ name: name.trim(), category, unit, price })
      }}
    >
      <h3 id="edit-title">{item ? 'Изменить позицию' : 'Новая позиция в прайсе'}</h3>
      <div className="sheet-meta">
        {item
          ? isBase
            ? `Базовая позиция · сейчас ${formatRub(item.price)} за ${item.unit}`
            : 'Ваша позиция в прайсе'
          : 'Появится в каталоге и будет помечена как своя цена'}
      </div>

      <label className="field">
        <span>Наименование</span>
        <input autoFocus={!item} value={name} onChange={(e) => setName(e.target.value)} aria-label="Наименование" placeholder="Укладка плитки на пол" />
      </label>

      <label className="field">
        <span>Раздел</span>
        <select value={category} onChange={(e) => setCategory(e.target.value)} aria-label="Раздел">
          {cats.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
      </label>

      <div className="row">
        <label className="field">
          <span>Единица</span>
          <select value={unit} onChange={(e) => setUnit(e.target.value as Unit)} aria-label="Единица">
            {UNITS.map((u) => (
              <option key={u}>{u}</option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>Цена, ₽</span>
          <NumField value={price} onChange={setPrice} decimals={0} blankZero placeholder="0" className="input-lg" aria-label="Цена" />
        </label>
      </div>

      <div className="btn-row" style={{ marginTop: 14 }}>
        <button type="button" className="btn" onClick={onClose}>
          Отмена
        </button>
        <button type="submit" className="btn btn-primary" disabled={!canSave}>
          Сохранить
        </button>
      </div>

      {item && (
        <div className="sheet-actions">
          {isBase && edited && (
            <button type="button" className="btn-ghost" onClick={onReset}>
              Вернуть исходную
            </button>
          )}
          <ConfirmButton
            className="btn btn-block btn-danger-outline"
            armedLabel={isBase ? 'Точно скрыть из прайса?' : 'Точно удалить из прайса?'}
            onConfirm={onDelete}
          >
            {isBase ? 'Скрыть из прайса' : 'Удалить из прайса'}
          </ConfirmButton>
        </div>
      )}
    </Sheet>
  )
}
