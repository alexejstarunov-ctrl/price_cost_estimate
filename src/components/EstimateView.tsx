import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { Estimate, EstimateLine } from '../types'
import { type Totals, formatRub, lineSum } from '../lib/estimate'
import { REGIONS } from '../data/regions'
import NumField from './NumField'
import ConfirmButton from './ConfirmButton'
import InstallHint from './InstallHint'
import { IconClose } from './Icons'
import type { InstallMode } from '../App'

type Props = {
  estimate: Estimate
  totals: Totals
  highlightId: string | null
  installMode: InstallMode
  onInstall: () => void
  onUpdate: (patch: Partial<Estimate>) => void
  onPatchLine: (id: string, patch: Partial<EstimateLine>) => void
  onRemoveLine: (id: string) => void
  onAddClick: () => void
  onCustomClick: () => void
  onMaterialsClick: () => void
  onPdf: () => void
  onSaveTemplate: (name: string) => void
  onNew: () => void
  onDelete: () => void
  notify: (message: string) => void
}

const DISMISS_KEY = 'pce.installDismissed'

export default function EstimateView({
  estimate,
  totals,
  highlightId,
  installMode,
  onInstall,
  onUpdate,
  onPatchLine,
  onRemoveLine,
  onAddClick,
  onCustomClick,
  onMaterialsClick,
  onPdf,
  onSaveTemplate,
  onNew,
  onDelete,
  notify,
}: Props) {
  const [showClient, setShowClient] = useState(Boolean(estimate.client || estimate.address))
  const [templateName, setTemplateName] = useState<string | null>(null)
  const [installDismissed, setInstallDismissed] = useState(() => {
    try {
      return localStorage.getItem(DISMISS_KEY) === '1'
    } catch {
      return false
    }
  })

  useEffect(() => {
    if (!highlightId) return
    document
      .querySelector(`[data-line-id="${highlightId}"]`)
      ?.scrollIntoView({ block: 'center', behavior: 'smooth' })
  }, [highlightId])

  const dismissInstall = () => {
    setInstallDismissed(true)
    try {
      localStorage.setItem(DISMISS_KEY, '1')
    } catch {
      // без хранилища подсказка просто вернётся в следующий раз
    }
  }

  const handleShare = async () => {
    const text = buildShareText(estimate, totals)
    if (navigator.share) {
      try {
        await navigator.share({ title: estimate.title || 'Смета', text })
        return
      } catch {
        // пользователь закрыл системный диалог — молча продолжаем
      }
    }
    try {
      await navigator.clipboard.writeText(text)
      notify('Смета скопирована — вставьте в мессенджер')
    } catch {
      notify('Не удалось скопировать')
    }
  }

  const submitTemplate = () => {
    const name = templateName?.trim()
    if (name) {
      onSaveTemplate(name)
      setTemplateName(null)
    }
  }

  const works = estimate.lines.filter((l) => l.kind === 'work')
  const materials = estimate.lines.filter((l) => l.kind === 'material')

  return (
    <div className="section no-print">
      {!installDismissed && <InstallHint mode={installMode} onInstall={onInstall} onDismiss={dismissInstall} />}

      <div className="card">
        <div className="card-head">
          <h2>Объект</h2>
          <select
            className="chip chip-select"
            value={estimate.region}
            onChange={(e) => onUpdate({ region: e.target.value })}
            aria-label="Регион расценок"
          >
            {REGIONS.map((r) => (
              <option key={r.id} value={r.id}>
                {r.label}
              </option>
            ))}
          </select>
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

      {estimate.lines.length === 0 ? (
        <div className="card">
          <div className="empty">
            <strong>Смета пуста</strong>
            <p>Добавьте работы из расценок, посчитайте материалы по размерам плитки или впишите свою позицию.</p>
            <div className="btn-row">
              <button className="btn btn-primary" onClick={onAddClick}>
                Открыть расценки
              </button>
              <button className="btn" onClick={onMaterialsClick}>
                Посчитать материалы
              </button>
              <button className="btn" onClick={onCustomClick}>
                Своя позиция
              </button>
            </div>
          </div>
        </div>
      ) : (
        <>
          {works.length > 0 && (
            <LineGroup title="Работы" sum={totals.works} lines={works} highlightId={highlightId} onPatchLine={onPatchLine} onRemoveLine={onRemoveLine} />
          )}
          {materials.length > 0 && (
            <LineGroup title="Материалы" sum={totals.materials} lines={materials} highlightId={highlightId} onPatchLine={onPatchLine} onRemoveLine={onRemoveLine} />
          )}

          <div className="btn-row">
            <button className="btn btn-dashed" onClick={onAddClick}>
              + Из расценок
            </button>
            <button className="btn btn-dashed" onClick={onCustomClick}>
              + Своя позиция
            </button>
          </div>

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
            <div className="card-body card-body-top">
              <div className="row row-discount">
                <label className="field">
                  <span>Скидка, %</span>
                  <NumField
                    value={estimate.discount}
                    onChange={(d) => onUpdate({ discount: Math.min(100, d) })}
                    decimals={1}
                  />
                </label>
                <label className="field">
                  <span>Примечание</span>
                  <input
                    value={estimate.note}
                    onChange={(e) => onUpdate({ note: e.target.value })}
                    placeholder="Срок, условия оплаты"
                  />
                </label>
              </div>
            </div>
          </div>

          <div className="btn-row">
            <button className="btn btn-primary" onClick={onPdf}>
              Скачать PDF
            </button>
            <button className="btn" onClick={handleShare}>
              Отправить
            </button>
          </div>

          {templateName === null ? (
            <div className="btn-row">
              <button className="btn" onClick={() => setTemplateName(estimate.title || 'Мой шаблон')}>
                В шаблоны
              </button>
              <button className="btn" onClick={onNew}>
                Новая смета
              </button>
            </div>
          ) : (
            <form
              className="inline-form"
              onSubmit={(e) => {
                e.preventDefault()
                submitTemplate()
              }}
            >
              <input
                autoFocus
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
                placeholder="Название шаблона"
                aria-label="Название шаблона"
              />
              <button type="submit" className="btn btn-primary">
                Сохранить
              </button>
              <button type="button" className="btn-ghost" onClick={() => setTemplateName(null)}>
                Отмена
              </button>
            </form>
          )}

          <p className="hint">
            «Скачать PDF» открывает печать — выберите «Сохранить как PDF».
          </p>
        </>
      )}

      <p className="hint saved-note" role="status">
        ✓ Сохранено автоматически,{' '}
        {new Date(estimate.updatedAt).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
        {' · '}все сметы — в списке по нажатию на название вверху
      </p>

      <ConfirmButton
        className="btn btn-block btn-danger-outline"
        armedLabel="Точно удалить эту смету целиком?"
        onConfirm={onDelete}
      >
        Удалить смету
      </ConfirmButton>
    </div>
  )
}

function LineGroup({
  title,
  sum,
  lines,
  highlightId,
  onPatchLine,
  onRemoveLine,
}: {
  title: string
  sum: number
  lines: EstimateLine[]
  highlightId: string | null
  onPatchLine: Props['onPatchLine']
  onRemoveLine: Props['onRemoveLine']
}) {
  return (
    <div className="card">
      <div className="card-head">
        <h2>{title}</h2>
        <span className="card-head-sum">{formatRub(sum)}</span>
      </div>
      {lines.map((line) => (
        <div className={line.id === highlightId ? 'line is-new' : 'line'} data-line-id={line.id} key={line.id}>
          <div className="line-top">
            <LineName value={line.name} onChange={(name) => onPatchLine(line.id, { name })} />
            {line.auto && <span className="tag tag-auto">расчёт</span>}
            <ConfirmButton
              className="line-del"
              armedLabel="Удалить?"
              onConfirm={() => onRemoveLine(line.id)}
              aria-label={`Удалить: ${line.name}`}
            >
              <IconClose />
            </ConfirmButton>
          </div>
          <div className="line-ctl">
            <NumField
              value={line.qty}
              onChange={(qty) => onPatchLine(line.id, { qty })}
              aria-label="Количество"
            />
            <span className="unit">{line.unit}</span>
            <span className="op">×</span>
            <NumField
              value={line.price}
              onChange={(price) => onPatchLine(line.id, { price })}
              decimals={0}
              aria-label="Цена за единицу"
            />
            <span className="unit">₽</span>
            <span className="line-sum">{formatRub(lineSum(line))}</span>
          </div>
        </div>
      ))}
    </div>
  )
}

/** Название позиции: переносится по строкам, а не обрезается, и остаётся редактируемым */
function LineName({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const ref = useRef<HTMLTextAreaElement>(null)

  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    el.style.height = '0'
    el.style.height = `${el.scrollHeight}px`
  }, [value])

  return (
    <textarea
      ref={ref}
      className="line-name"
      rows={1}
      value={value}
      onChange={(e) => onChange(e.target.value.replace(/\n/g, ' '))}
      aria-label="Наименование позиции"
    />
  )
}

function buildShareText(estimate: Estimate, totals: Totals): string {
  const nonEmpty = (parts: (string | false)[]) => parts.filter((p): p is string => Boolean(p))

  const block = (title: string, lines: EstimateLine[]) =>
    lines.length > 0 &&
    `${title}:\n` +
      lines
        .map((l) => `• ${l.name} — ${l.qty} ${l.unit} × ${l.price} ₽ = ${formatRub(lineSum(l))}`)
        .join('\n')

  const header = nonEmpty([
    estimate.title || 'Смета на укладку плитки',
    Boolean(estimate.address) && `Адрес: ${estimate.address}`,
  ]).join('\n')

  const body = nonEmpty([
    block('Работы', estimate.lines.filter((l) => l.kind === 'work')),
    block('Материалы', estimate.lines.filter((l) => l.kind === 'material')),
  ]).join('\n\n')

  const summary = nonEmpty([
    `Работы: ${formatRub(totals.works)}`,
    `Материалы: ${formatRub(totals.materials)}`,
    estimate.discount > 0 && `Скидка ${estimate.discount}%: −${formatRub(totals.discountSum)}`,
    `ИТОГО: ${formatRub(totals.total)}`,
  ]).join('\n')

  return nonEmpty([header, body, summary, Boolean(estimate.note) && estimate.note]).join('\n\n')
}
