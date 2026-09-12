import type { Estimate } from '../types'
import { calcTotals, formatDate, formatRub } from '../lib/estimate'
import ConfirmButton from './ConfirmButton'
import { IconClose } from './Icons'

type Props = {
  estimates: Estimate[]
  currentId: string
  onOpen: (id: string) => void
  onDelete: (id: string) => void
}

/** Список смет: свежие сверху, открытая помечена */
export default function EstimateList({ estimates, currentId, onOpen, onDelete }: Props) {
  const sorted = [...estimates].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))

  return (
    <>
      {sorted.map((s) => {
        const isCurrent = s.id === currentId
        return (
          <div className={`list-item${isCurrent ? ' current' : ''}`} key={s.id}>
            <button className="list-main" onClick={() => onOpen(s.id)}>
              <span className="name">
                {s.title || 'Без названия'}
                {isCurrent && <span className="tag tag-auto">открыта</span>}
              </span>
              <span className="meta">
                {formatDate(s.updatedAt)} · {s.lines.length} поз. · {formatRub(calcTotals(s).total)}
                {s.client && ` · ${s.client}`}
              </span>
            </button>
            <ConfirmButton
              className="list-del"
              armedLabel="Удалить?"
              onConfirm={() => onDelete(s.id)}
              aria-label={`Удалить смету ${s.title || 'без названия'}`}
            >
              <IconClose />
            </ConfirmButton>
          </div>
        )
      })}
    </>
  )
}
