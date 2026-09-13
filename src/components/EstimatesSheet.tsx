import type { Estimate } from '../types'
import EstimateList from './EstimateList'
import Sheet from './Sheet'

type Props = {
  estimates: Estimate[]
  currentId: string
  onClose: () => void
  onOpen: (id: string) => void
  onNew: () => void
  onDelete: (id: string) => void
}

/** Переключение между сметами прямо из шапки */
export default function EstimatesSheet({ estimates, currentId, onClose, onOpen, onNew, onDelete }: Props) {
  return (
    <Sheet labelledBy="estimates-title" onClose={onClose}>
      <div className="sheet-head">
        <h3 id="estimates-title">Мои сметы</h3>
        <button className="btn-ghost" onClick={onClose}>
          Закрыть
        </button>
      </div>
      <button className="btn btn-primary btn-block" onClick={onNew}>
        + Новая смета
      </button>
      <div className="sheet-list">
        <EstimateList estimates={estimates} currentId={currentId} onOpen={onOpen} onDelete={onDelete} />
      </div>
      <p className="hint">Смета сохраняется сама. Удаление — в два нажатия, чтобы не снести случайно.</p>
    </Sheet>
  )
}
