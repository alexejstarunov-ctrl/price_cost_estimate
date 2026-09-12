import { useMemo, useState } from 'react'
import type { EstimateLine, MaterialInput, WorkItem } from '../types'
import { LAYOUT_LABELS, calcMaterials } from '../lib/materials'
import { formatQty, formatRub } from '../lib/estimate'
import NumField from './NumField'

type Props = {
  works: WorkItem[]
  onAddLines: (lines: Omit<EstimateLine, 'id'>[]) => void
}

const DEFAULTS: MaterialInput = {
  area: 10,
  tileWidth: 300,
  tileHeight: 600,
  tileThickness: 9,
  jointWidth: 2,
  layout: 'straight',
  tilePrice: 1200,
  perimeter: 0,
}

export default function MaterialsView({ works, onAddLines }: Props) {
  const [input, setInput] = useState<MaterialInput>(DEFAULTS)

  const result = useMemo(() => calcMaterials(input), [input])

  const priceOf = (id: string, fallback: number) => works.find((w) => w.id === id)?.price ?? fallback

  const gluePrice = priceOf(
    Math.max(input.tileWidth, input.tileHeight) > 600 ? 'm-glue-strong' : 'm-glue',
    600,
  )
  const groutPrice = priceOf('m-grout', 350)
  const primerPrice = priceOf('m-primer', 250)
  const svpPrice = priceOf('m-svp', 500)

  const set = (patch: Partial<MaterialInput>) => setInput((v) => ({ ...v, ...patch }))

  const materialCost =
    result.tileCost +
    result.glueBags * gluePrice +
    result.groutKg * groutPrice +
    result.primerL * primerPrice +
    result.crossPacks * svpPrice

  const addToEstimate = () => {
    const lines: Omit<EstimateLine, 'id'>[] = [
      {
        refId: 'm-tile',
        name: `Плитка ${input.tileWidth}×${input.tileHeight} (с запасом ${Math.round(result.wastePercent * 100)}%)`,
        unit: 'м²',
        price: input.tilePrice,
        qty: result.tileArea,
        kind: 'material',
        auto: true,
      },
      {
        refId: 'm-glue',
        name: `Клей плиточный (гребёнка ${result.trowelTeeth} мм)`,
        unit: 'меш',
        price: gluePrice,
        qty: result.glueBags,
        kind: 'material',
        auto: true,
      },
      {
        refId: 'm-grout',
        name: `Затирка (шов ${input.jointWidth} мм)`,
        unit: 'кг',
        price: groutPrice,
        qty: Math.ceil(result.groutKg * 10) / 10,
        kind: 'material',
        auto: true,
      },
      {
        refId: 'm-primer',
        name: 'Грунтовка (2 слоя)',
        unit: 'л',
        price: primerPrice,
        qty: Math.ceil(result.primerL * 10) / 10,
        kind: 'material',
        auto: true,
      },
      {
        refId: 'm-svp',
        name: 'Система выравнивания плитки',
        unit: 'компл',
        price: svpPrice,
        qty: result.crossPacks,
        kind: 'material',
        auto: true,
      },
      {
        refId: 'm-profile',
        name: 'Профиль / уголок по периметру',
        unit: 'п.м',
        price: priceOf('m-profile', 350),
        qty: input.perimeter,
        kind: 'material',
        auto: true,
      },
    ]
    onAddLines(lines.filter((l) => l.qty > 0))
  }

  return (
    <div className="section no-print">
      <div className="card">
        <div className="card-head">
          <h2>Параметры укладки</h2>
        </div>
        <div className="card-body">
          <div className="row">
            <label className="field">
              <span>Площадь, м²</span>
              <NumField value={input.area} onChange={(area) => set({ area })} />
            </label>
            <label className="field">
              <span>Периметр, п.м</span>
              <NumField value={input.perimeter} onChange={(perimeter) => set({ perimeter })} />
            </label>
          </div>

          <label className="field">
            <span>Размер плитки, мм</span>
            <div className="row-3">
              <NumField
                value={input.tileWidth}
                onChange={(tileWidth) => set({ tileWidth })}
                decimals={0}
                aria-label="Ширина плитки"
              />
              <NumField
                value={input.tileHeight}
                onChange={(tileHeight) => set({ tileHeight })}
                decimals={0}
                aria-label="Высота плитки"
              />
              <NumField
                value={input.tileThickness}
                onChange={(tileThickness) => set({ tileThickness })}
                decimals={1}
                aria-label="Толщина плитки"
              />
            </div>
            <div className="hint">ширина × высота × толщина</div>
          </label>

          <div className="row">
            <label className="field">
              <span>Ширина шва, мм</span>
              <NumField value={input.jointWidth} onChange={(jointWidth) => set({ jointWidth })} decimals={1} />
            </label>
            <label className="field">
              <span>Цена плитки, ₽/м²</span>
              <NumField value={input.tilePrice} onChange={(tilePrice) => set({ tilePrice })} decimals={0} />
            </label>
          </div>

          <label className="field">
            <span>Раскладка</span>
            <select
              value={input.layout}
              onChange={(e) => set({ layout: e.target.value as MaterialInput['layout'] })}
            >
              {Object.entries(LAYOUT_LABELS).map(([k, label]) => (
                <option key={k} value={k}>
                  {label}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      <div className="card">
        <div className="card-head">
          <h2>Нужно материалов</h2>
        </div>
        <div className="totals">
          <Row
            label={`Плитка (запас ${Math.round(result.wastePercent * 100)}%)`}
            value={`${formatQty(result.tileArea)} м²`}
            sum={result.tileCost}
          />
          <Row
            label={`Клей, гребёнка ${result.trowelTeeth} мм`}
            value={`${result.glueBags} меш · ${formatQty(result.glueKg)} кг`}
            sum={result.glueBags * gluePrice}
          />
          <Row
            label="Затирка"
            value={`${formatQty(result.groutKg)} кг`}
            sum={Math.round(result.groutKg * groutPrice)}
          />
          <Row
            label="Грунтовка"
            value={`${formatQty(result.primerL)} л`}
            sum={Math.round(result.primerL * primerPrice)}
          />
          <Row
            label="СВП / крестики"
            value={`${result.crossPacks} компл`}
            sum={result.crossPacks * svpPrice}
          />
          <div className="totals-row grand">
            <span>Материалы</span>
            <span>{formatRub(materialCost)}</span>
          </div>
        </div>
      </div>

      <button
        className="btn btn-primary btn-block"
        style={{ marginTop: 12 }}
        onClick={addToEstimate}
        disabled={input.area <= 0}
      >
        Добавить материалы в смету
      </button>

      <div className="hint" style={{ padding: '12px 4px' }}>
        Расход клея — по зубу гребёнки для вашего формата плитки, затирки — по формуле
        производителей с запасом 15%. Проверьте по упаковке конкретной смеси.
      </div>
    </div>
  )
}

function Row({ label, value, sum }: { label: string; value: string; sum: number }) {
  return (
    <div className="totals-row">
      <span>
        {label}
        <br />
        <small style={{ color: 'var(--text-dim)' }}>{value}</small>
      </span>
      <span>{formatRub(sum)}</span>
    </div>
  )
}
