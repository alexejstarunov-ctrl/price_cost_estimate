import { useState } from 'react'
import type { Estimate, EstimateTemplate, Region, Unit, WorkItem } from '../types'
import { REGION_LABELS, formatDate, formatRub } from '../lib/estimate'
import { SOURCE_LABELS, type PriceState } from '../lib/prices'
import { uid, type CompanyInfo } from '../lib/storage'
import { CATEGORIES } from '../data/works'
import { PRESET_TEMPLATES } from '../data/templates'

type Props = {
  estimate: Estimate
  saved: Estimate[]
  templates: EstimateTemplate[]
  custom: WorkItem[]
  company: CompanyInfo
  feed: PriceState
  onUpdate: (patch: Partial<Estimate>) => void
  onOpen: (id: string) => void
  onDelete: (id: string) => void
  onApplyTemplate: (tpl: EstimateTemplate) => void
  onDeleteTemplate: (id: string) => void
  onUpsertCustom: (item: WorkItem) => void
  onRemoveCustom: (id: string) => void
  onUpdateCompany: (info: CompanyInfo) => void
}

const UNITS: Unit[] = ['м²', 'п.м', 'шт', 'компл', 'меш', 'кг', 'л', 'точка']

export default function MoreView({
  estimate,
  saved,
  templates,
  custom,
  company,
  feed,
  onUpdate,
  onOpen,
  onDelete,
  onApplyTemplate,
  onDeleteTemplate,
  onUpsertCustom,
  onRemoveCustom,
  onUpdateCompany,
}: Props) {
  const [form, setForm] = useState({ name: '', price: '', unit: 'м²' as Unit, category: CATEGORIES[1] as string })

  const addCustom = () => {
    const price = Number(form.price)
    if (!form.name.trim() || !(price > 0)) return
    onUpsertCustom({
      id: `custom-${uid()}`,
      name: form.name.trim(),
      unit: form.unit,
      category: form.category,
      price,
      source: 'manual',
      updatedAt: new Date().toISOString(),
    })
    setForm({ name: '', price: '', unit: form.unit, category: form.category })
  }

  return (
    <div className="section no-print">
      <div className="card">
        <div className="card-head">
          <h2>Регион расценок</h2>
        </div>
        <div className="card-body">
          <select
            value={estimate.region}
            onChange={(e) => onUpdate({ region: e.target.value as Region })}
          >
            {Object.entries(REGION_LABELS).map(([k, label]) => (
              <option key={k} value={k}>
                {label}
              </option>
            ))}
          </select>
          <div className="hint">
            Коэффициент применяется к базовым расценкам. Свои цены не пересчитываются.
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-head">
          <h2>Свои расценки</h2>
        </div>
        <div className="card-body">
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
              <input
                type="number"
                min="0"
                inputMode="numeric"
                value={form.price}
                onChange={(e) => setForm({ ...form, price: e.target.value })}
              />
            </label>
            <label className="field">
              <span>Единица</span>
              <select
                value={form.unit}
                onChange={(e) => setForm({ ...form, unit: e.target.value as Unit })}
              >
                {UNITS.map((u) => (
                  <option key={u}>{u}</option>
                ))}
              </select>
            </label>
          </div>
          <label className="field">
            <span>Раздел</span>
            <select
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
            >
              {CATEGORIES.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </label>
          <button className="btn btn-primary btn-block" onClick={addCustom}>
            Добавить в каталог
          </button>
        </div>

        {custom.length > 0 &&
          custom.map((c) => (
            <div className="cat-item" key={c.id}>
              <span className="name">
                {c.name}
                <span className="meta">
                  за 1 {c.unit} · {c.category}
                </span>
              </span>
              <span className="price">{formatRub(c.price)}</span>
              <button className="btn-danger" onClick={() => onRemoveCustom(c.id)}>
                ✕
              </button>
            </div>
          ))}
      </div>

      <div className="card">
        <div className="card-head">
          <h2>Типовые объекты</h2>
        </div>
        {PRESET_TEMPLATES.map((t) => (
          <button className="cat-item" key={t.id} onClick={() => onApplyTemplate(t)}>
            <span className="name">
              {t.name}
              <span className="meta">{t.lines.length} позиций · нажмите, чтобы добавить</span>
            </span>
          </button>
        ))}
        <div className="card-body">
          <div className="hint">
            Объёмы усреднённые — поправьте под замер. Цены подставятся из каталога.
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-head">
          <h2>Мои шаблоны</h2>
        </div>
        {templates.length === 0 ? (
          <div className="card-body">
            <div className="hint">
              Соберите смету и нажмите «В шаблоны» — свой типовой набор работ можно будет
              добавлять одним нажатием.
            </div>
          </div>
        ) : (
          templates.map((t) => (
            <div className="cat-item" key={t.id}>
              <button
                className="name"
                style={{ background: 'none', border: 0, textAlign: 'left', padding: 0 }}
                onClick={() => onApplyTemplate(t)}
              >
                {t.name}
                <span className="meta">{t.lines.length} поз. · нажмите, чтобы добавить</span>
              </button>
              <button className="btn-danger" onClick={() => onDeleteTemplate(t.id)}>
                ✕
              </button>
            </div>
          ))
        )}
      </div>

      <div className="card">
        <div className="card-head">
          <h2>Мои сметы</h2>
        </div>
        {saved.length === 0 ? (
          <div className="card-body">
            <div className="hint">Сохранённые сметы появятся здесь.</div>
          </div>
        ) : (
          saved.map((s) => (
            <div className="cat-item" key={s.id}>
              <button
                className="name"
                style={{ background: 'none', border: 0, textAlign: 'left', padding: 0 }}
                onClick={() => onOpen(s.id)}
              >
                {s.title}
                <span className="meta">
                  {formatDate(s.updatedAt)} · {s.lines.length} поз.
                  {s.client && ` · ${s.client}`}
                </span>
              </button>
              <button className="btn-danger" onClick={() => onDelete(s.id)}>
                ✕
              </button>
            </div>
          ))
        )}
      </div>

      <div className="card">
        <div className="card-head">
          <h2>Мои реквизиты</h2>
        </div>
        <div className="card-body">
          <label className="field">
            <span>Имя / компания</span>
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
          <div className="hint">Подставляется в PDF как исполнитель.</div>
        </div>
      </div>

      <div className="card">
        <div className="card-head">
          <h2>Источники цен</h2>
        </div>
        <div className="card-body">
          {feed.feedDate ? (
            <>
              <div style={{ marginBottom: 8 }}>
                Обновлено: {new Date(feed.feedDate).toLocaleString('ru-RU')}
              </div>
              {feed.sources.map((s) => (
                <div className="totals-row" key={s.name}>
                  <span>{s.name}</span>
                  <span>
                    {s.status === 'ok' ? '✓ собрано' : s.status === 'blocked' ? '✕ блокировка' : '– пропущен'}
                  </span>
                </div>
              ))}
            </>
          ) : (
            <div className="hint">
              Фид цен ещё не собран — приложение работает на встроенной базе расценок
              ({Object.values(SOURCE_LABELS)[0]}).
            </div>
          )}
        </div>
      </div>

      <div className="hint" style={{ padding: '14px 4px' }}>
        Данные хранятся только на этом устройстве, в браузере. Очистка данных сайта их удалит.
      </div>
    </div>
  )
}
