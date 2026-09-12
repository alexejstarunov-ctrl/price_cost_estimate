import { useState } from 'react'
import type { Estimate, EstimateLine } from '../types'
import { type Totals, formatRub, lineSum } from '../lib/estimate'

type Props = {
  estimate: Estimate
  totals: Totals
  onUpdate: (patch: Partial<Estimate>) => void
  onPatchLine: (id: string, patch: Partial<EstimateLine>) => void
  onRemoveLine: (id: string) => void
  onSave: () => void
  onAddClick: () => void
  onSaveTemplate: (name: string) => void
  onReset: () => void
}

export default function EstimateView({
  estimate,
  totals,
  onUpdate,
  onPatchLine,
  onRemoveLine,
  onSave,
  onAddClick,
  onSaveTemplate,
  onReset,
}: Props) {
  const [showClient, setShowClient] = useState(false)
  const [flash, setFlash] = useState('')

  const notify = (msg: string) => {
    setFlash(msg)
    setTimeout(() => setFlash(''), 2000)
  }

  const handleSave = () => {
    onSave()
    notify('Смета сохранена')
  }

  const handleTemplate = () => {
    const name = prompt('Название шаблона:', estimate.title)
    if (name?.trim()) {
      onSaveTemplate(name.trim())
      notify('Шаблон сохранён')
    }
  }

  const handleShare = async () => {
    const text = buildShareText(estimate, totals)
    if (navigator.share) {
      try {
        await navigator.share({ title: estimate.title, text })
        return
      } catch {
        // пользователь закрыл системный диалог — молча продолжаем
      }
    }
    try {
      await navigator.clipboard.writeText(text)
      notify('Смета скопирована')
    } catch {
      notify('Не удалось скопировать')
    }
  }

  const handleReset = () => {
    if (estimate.lines.length === 0 || confirm('Очистить текущую смету и начать новую?')) {
      onReset()
    }
  }

  return (
    <div className="section no-print">
      {flash && <div className="banner">{flash}</div>}

      <div className="card">
        <div className="card-head">
          <h2>Объект</h2>
          <button className="btn-ghost" onClick={() => setShowClient((v) => !v)}>
            {showClient ? 'Скрыть' : 'Заказчик'}
          </button>
        </div>
        <div className="card-body">
          <label className="field">
            <span>Название сметы</span>
            <input
              value={estimate.title}
              onChange={(e) => onUpdate({ title: e.target.value })}
              placeholder="Санузел, ул. Ленина 10"
            />
          </label>

          {showClient && (
            <>
              <label className="field">
                <span>Заказчик</span>
                <input
                  value={estimate.client}
                  onChange={(e) => onUpdate({ client: e.target.value })}
                  placeholder="Иван Петрович"
                />
              </label>
              <div className="row">
                <label className="field">
                  <span>Телефон</span>
                  <input
                    value={estimate.phone}
                    onChange={(e) => onUpdate({ phone: e.target.value })}
                    placeholder="+7 900 000-00-00"
                    inputMode="tel"
                  />
                </label>
                <label className="field">
                  <span>Адрес</span>
                  <input
                    value={estimate.address}
                    onChange={(e) => onUpdate({ address: e.target.value })}
                    placeholder="Адрес объекта"
                  />
                </label>
              </div>
            </>
          )}
        </div>
      </div>

      <div className="card">
        <div className="card-head">
          <h2>Позиции</h2>
          <button className="btn-ghost" onClick={onAddClick}>
            + Добавить
          </button>
        </div>

        {estimate.lines.length === 0 ? (
          <div className="empty">
            <span className="ico">📋</span>
            Смета пуста
            <div className="hint">
              Откройте «Расценки» и добавьте работы, либо посчитайте материалы
            </div>
            <button className="btn btn-primary" style={{ marginTop: 16 }} onClick={onAddClick}>
              Открыть расценки
            </button>
          </div>
        ) : (
          estimate.lines.map((line) => (
            <div className="line" key={line.id}>
              <div className="line-name">
                {line.name}
                <span className={line.kind === 'work' ? 'tag tag-work' : 'tag tag-material'}>
                  {line.kind === 'work' ? 'работа' : 'материал'}
                </span>
                {line.auto && <span className="tag tag-auto">расчёт</span>}
              </div>
              <div className="line-sum">{formatRub(lineSum(line))}</div>
              <div className="line-ctl">
                <input
                  type="number"
                  min="0"
                  step="0.1"
                  inputMode="decimal"
                  value={line.qty}
                  onChange={(e) => onPatchLine(line.id, { qty: Number(e.target.value) || 0 })}
                  aria-label="Количество"
                />
                <span className="unit">{line.unit}</span>
                <input
                  type="number"
                  min="0"
                  step="10"
                  inputMode="numeric"
                  value={line.price}
                  onChange={(e) => onPatchLine(line.id, { price: Number(e.target.value) || 0 })}
                  aria-label="Цена за единицу"
                />
                <span className="unit">₽</span>
                <button className="btn-danger" onClick={() => onRemoveLine(line.id)}>
                  Удалить
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {estimate.lines.length > 0 && (
        <>
          <div className="card">
            <div className="totals">
              <div className="totals-row">
                <span>Работы</span>
                <span>{formatRub(totals.works)}</span>
              </div>
              <div className="totals-row">
                <span>Материалы</span>
                <span>{formatRub(totals.materials)}</span>
              </div>
              {estimate.discount > 0 && (
                <div className="totals-row">
                  <span>Скидка {estimate.discount}%</span>
                  <span>−{formatRub(totals.discountSum)}</span>
                </div>
              )}
              <div className="totals-row grand">
                <span>Итого</span>
                <span>{formatRub(totals.total)}</span>
              </div>
            </div>
            <div className="card-body" style={{ borderTop: '1px solid var(--border)' }}>
              <label className="field">
                <span>Скидка, %</span>
                <input
                  type="number"
                  min="0"
                  max="100"
                  inputMode="numeric"
                  value={estimate.discount}
                  onChange={(e) => onUpdate({ discount: Number(e.target.value) || 0 })}
                />
              </label>
              <label className="field">
                <span>Примечание для заказчика</span>
                <textarea
                  rows={2}
                  value={estimate.note}
                  onChange={(e) => onUpdate({ note: e.target.value })}
                  placeholder="Срок работ, условия оплаты"
                />
              </label>
            </div>
          </div>

          <div className="btn-row" style={{ marginTop: 12 }}>
            <button className="btn btn-primary" onClick={() => window.print()}>
              📄 Скачать PDF
            </button>
            <button className="btn" onClick={handleShare}>
              ↗ Отправить
            </button>
          </div>
          <div className="btn-row" style={{ marginTop: 8 }}>
            <button className="btn" onClick={handleSave}>
              💾 Сохранить
            </button>
            <button className="btn" onClick={handleTemplate}>
              ★ В шаблоны
            </button>
            <button className="btn" onClick={handleReset}>
              Новая смета
            </button>
          </div>
          <div className="hint" style={{ padding: '10px 2px' }}>
            «Скачать PDF» открывает печать — выберите «Сохранить как PDF».
          </div>
        </>
      )}
    </div>
  )
}

function buildShareText(estimate: Estimate, totals: Totals): string {
  const lines = estimate.lines
    .map((l) => `• ${l.name} — ${l.qty} ${l.unit} × ${l.price} ₽ = ${lineSum(l)} ₽`)
    .join('\n')

  return [
    estimate.title,
    estimate.address && `Адрес: ${estimate.address}`,
    '',
    lines,
    '',
    `Работы: ${formatRub(totals.works)}`,
    `Материалы: ${formatRub(totals.materials)}`,
    estimate.discount > 0 ? `Скидка ${estimate.discount}%: −${formatRub(totals.discountSum)}` : '',
    `ИТОГО: ${formatRub(totals.total)}`,
    estimate.note && `\n${estimate.note}`,
  ]
    .filter(Boolean)
    .join('\n')
}
