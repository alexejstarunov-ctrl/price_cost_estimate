import { useState } from 'react'
import type { Estimate, EstimateTemplate, Unit, WorkItem } from '../types'
import { formatRub } from '../lib/estimate'
import EstimateList from './EstimateList'
import type { PriceState } from '../lib/prices'
import { uid, type CompanyInfo } from '../lib/storage'
import { CATEGORIES } from '../data/works'
import { PRESET_TEMPLATES } from '../data/templates'
import NumField from './NumField'
import ConfirmButton from './ConfirmButton'
import InstallHint from './InstallHint'
import { UNITS } from './CustomSheet'
import { IconClose } from './Icons'
import type { InstallMode } from '../App'

type Props = {
  currentId: string
  estimates: Estimate[]
  templates: EstimateTemplate[]
  custom: WorkItem[]
  company: CompanyInfo
  feed: PriceState
  installMode: InstallMode
  onInstall: () => void
  onNew: () => void
  onOpen: (id: string) => void
  onDelete: (id: string) => void
  onApplyTemplate: (tpl: EstimateTemplate) => void
  onDeleteTemplate: (id: string) => void
  onUpsertCustom: (item: WorkItem) => void
  onRemoveCustom: (id: string) => void
  onUpdateCompany: (info: CompanyInfo) => void
  onExport: () => void
  onImport: (file: File) => void
}

const STATUS_LABEL = { ok: 'собрано', blocked: 'блокировка', skipped: 'выключен' } as const

export default function MoreView({
  currentId,
  estimates,
  templates,
  custom,
  company,
  feed,
  installMode,
  onInstall,
  onNew,
  onOpen,
  onDelete,
  onApplyTemplate,
  onDeleteTemplate,
  onUpsertCustom,
  onRemoveCustom,
  onUpdateCompany,
  onExport,
  onImport,
}: Props) {
  const [form, setForm] = useState({ name: '', price: 0, unit: 'м²' as Unit, category: CATEGORIES[1] as string })

  const addCustom = () => {
    if (!form.name.trim() || !(form.price > 0)) return
    onUpsertCustom({
      id: `custom-${uid()}`,
      name: form.name.trim(),
      unit: form.unit,
      category: form.category,
      price: form.price,
      source: 'manual',
      updatedAt: new Date().toISOString(),
    })
    setForm({ name: '', price: 0, unit: form.unit, category: form.category })
  }

  return (
    <div className="section no-print">
      <InstallHint mode={installMode} onInstall={onInstall} />

      <div className="card">
        <div className="card-head">
          <h2>Мои сметы</h2>
          <button className="btn-ghost" onClick={onNew}>
            + Новая
          </button>
        </div>
        <EstimateList estimates={estimates} currentId={currentId} onOpen={onOpen} onDelete={onDelete} />
      </div>

      <div className="card">
        <div className="card-head">
          <h2>Типовые объекты</h2>
        </div>
        {PRESET_TEMPLATES.map((t) => (
          <button className="cat-item" key={t.id} onClick={() => onApplyTemplate(t)}>
            <span className="name">
              {t.name}
              <span className="meta">{t.lines.length} позиций · добавить в текущую смету</span>
            </span>
          </button>
        ))}
        <p className="hint card-hint">Объёмы усреднённые — поправьте под замер. Цены подставятся из каталога.</p>
      </div>

      <div className="card">
        <div className="card-head">
          <h2>Мои шаблоны</h2>
        </div>
        {templates.length === 0 ? (
          <p className="hint card-hint">
            Соберите смету и нажмите «Сохранить как шаблон» — свой набор работ будет добавляться одним нажатием.
          </p>
        ) : (
          templates.map((t) => (
            <div className="list-item" key={t.id}>
              <button className="list-main" onClick={() => onApplyTemplate(t)}>
                <span className="name">{t.name}</span>
                <span className="meta">{t.lines.length} поз. · добавить в текущую смету</span>
              </button>
              <ConfirmButton
                className="list-del"
                armedLabel="Удалить?"
                onConfirm={() => onDeleteTemplate(t.id)}
                aria-label={`Удалить шаблон ${t.name}`}
              >
                <IconClose />
              </ConfirmButton>
            </div>
          ))
        )}
      </div>

      <div className="card">
        <div className="card-head">
          <h2>Свои расценки</h2>
        </div>
        <form
          className="card-body"
          onSubmit={(e) => {
            e.preventDefault()
            addCustom()
          }}
        >
          <label className="field">
            <span>Наименование</span>
            <input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Укладка плитки, мой прайс"
            />
          </label>
          <div className="row">
            <label className="field">
              <span>Цена, ₽</span>
              <NumField value={form.price} onChange={(price) => setForm({ ...form, price })} decimals={0} />
            </label>
            <label className="field">
              <span>Единица</span>
              <select value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value as Unit })}>
                {UNITS.map((u) => (
                  <option key={u}>{u}</option>
                ))}
              </select>
            </label>
          </div>
          <label className="field">
            <span>Раздел</span>
            <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
              {CATEGORIES.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </label>
          <button type="submit" className="btn btn-primary btn-block" disabled={!form.name.trim() || !(form.price > 0)}>
            Добавить в каталог
          </button>
        </form>

        {custom.map((c) => (
          <div className="list-item" key={c.id}>
            <div className="list-main">
              <span className="name">{c.name}</span>
              <span className="meta">
                {formatRub(c.price)} за {c.unit} · {c.category}
              </span>
            </div>
            <ConfirmButton
              className="list-del"
              armedLabel="Удалить?"
              onConfirm={() => onRemoveCustom(c.id)}
              aria-label={`Удалить расценку ${c.name}`}
            >
              <IconClose />
            </ConfirmButton>
          </div>
        ))}
      </div>

      <div className="card">
        <div className="card-head">
          <h2>Резервная копия</h2>
        </div>
        <div className="card-body">
          <p className="hint" style={{ marginTop: 0, marginBottom: 12 }}>
            Сметы, шаблоны и свои расценки хранятся в этом браузере. Копия переживёт смену
            телефона и очистку данных сайта: скачайте файл и восстановите его на новом устройстве.
          </p>
          <div className="btn-row">
            <button className="btn btn-primary" onClick={onExport}>
              Скачать копию
            </button>
            <label className="btn">
              Восстановить из файла
              <input
                type="file"
                accept="application/json,.json"
                hidden
                onChange={(e) => {
                  const f = e.target.files?.[0]
                  if (f) onImport(f)
                  e.target.value = ''
                }}
              />
            </label>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-head">
          <h2>Мои реквизиты</h2>
        </div>
        <div className="card-body">
          <label className="field">
            <span>Имя или компания</span>
            <input
              value={company.name}
              onChange={(e) => onUpdateCompany({ ...company, name: e.target.value })}
              placeholder="ИП Иванов / Бригада"
            />
          </label>
          <label className="field">
            <span>Телефон</span>
            <input
              value={company.phone}
              onChange={(e) => onUpdateCompany({ ...company, phone: e.target.value })}
              placeholder="+7 900 000-00-00"
              inputMode="tel"
            />
          </label>
          <p className="hint">Подставляется в PDF как исполнитель.</p>
        </div>
      </div>

      <div className="card">
        <div className="card-head">
          <h2>Источники цен</h2>
        </div>
        <div className="card-body">
          {feed.feedDate ? (
            <>
              <p className="hint" style={{ marginTop: 0 }}>
                Проверено {new Date(feed.feedDate).toLocaleString('ru-RU', { dateStyle: 'short', timeStyle: 'short' })}
              </p>
              {feed.sources.map((s) => (
                <div className="totals-row" key={s.name}>
                  <span>{s.name}</span>
                  <span className={`status status-${s.status}`}>{STATUS_LABEL[s.status]}</span>
                </div>
              ))}
            </>
          ) : (
            <p className="hint" style={{ marginTop: 0 }}>
              Приложение работает на встроенной базе расценок.
            </p>
          )}
        </div>
      </div>

      <p className="hint">
        Данные хранятся только на этом устройстве. На iPhone у установленного приложения и у Safari
        хранилища разные — работайте в одном из них или переносите копией.
      </p>
    </div>
  )
}
