import type { Estimate } from '../types'
import { type Totals, formatDate, formatQty, formatRub, lineSum } from '../lib/estimate'
import type { CompanyInfo } from '../lib/storage'

type Props = {
  estimate: Estimate
  totals: Totals
  company: CompanyInfo
}

export default function PrintView({ estimate, totals, company }: Props) {
  const works = estimate.lines.filter((l) => l.kind === 'work')
  const materials = estimate.lines.filter((l) => l.kind === 'material')

  return (
    <div className="print-only">
      <div className="print-head">
        <h2 style={{ fontSize: '15pt' }}>{estimate.title || 'Смета на укладку плитки'}</h2>
        <div style={{ fontSize: '10pt', marginTop: 4 }}>
          от {formatDate(estimate.createdAt)}
          {estimate.address && ` · ${estimate.address}`}
        </div>
        {estimate.client && (
          <div style={{ fontSize: '10pt' }}>
            Заказчик: {estimate.client}
            {estimate.phone && `, ${estimate.phone}`}
          </div>
        )}
        {company.name && (
          <div style={{ fontSize: '10pt', marginTop: 4 }}>
            Исполнитель: {company.name}
            {company.phone && `, ${company.phone}`}
          </div>
        )}
      </div>

      {works.length > 0 && <Table title="Работы" lines={works} />}
      {materials.length > 0 && <Table title="Материалы" lines={materials} />}

      <div className="print-total">
        {estimate.discount > 0 && (
          <div style={{ fontSize: '11pt', fontWeight: 400 }}>
            Работы: {formatRub(totals.works)} · Материалы: {formatRub(totals.materials)} ·
            Скидка {estimate.discount}%: −{formatRub(totals.discountSum)}
          </div>
        )}
        Итого: {formatRub(totals.total)}
      </div>

      {estimate.note && (
        <div style={{ marginTop: 14, fontSize: '10pt' }}>
          <strong>Примечание:</strong> {estimate.note}
        </div>
      )}

      <div className="print-foot">
        Смета носит предварительный характер. Окончательная стоимость определяется после
        осмотра объекта и замера.
        {company.note && ` ${company.note}`}
      </div>
    </div>
  )
}

function Table({ title, lines }: { title: string; lines: Estimate['lines'] }) {
  const sum = lines.reduce((acc, l) => acc + lineSum(l), 0)

  return (
    <>
      <h3 style={{ fontSize: '12pt', marginTop: 14 }}>{title}</h3>
      <table className="print-table">
        <thead>
          <tr>
            <th style={{ width: '4%' }}>№</th>
            <th>Наименование</th>
            <th className="num" style={{ width: '12%' }}>
              Кол-во
            </th>
            <th className="num" style={{ width: '14%' }}>
              Цена
            </th>
            <th className="num" style={{ width: '16%' }}>
              Сумма
            </th>
          </tr>
        </thead>
        <tbody>
          {lines.map((line, i) => (
            <tr key={line.id}>
              <td>{i + 1}</td>
              <td>{line.name}</td>
              <td className="num">
                {formatQty(line.qty)} {line.unit}
              </td>
              <td className="num">{formatRub(line.price)}</td>
              <td className="num">{formatRub(lineSum(line))}</td>
            </tr>
          ))}
          <tr>
            <td colSpan={4} style={{ textAlign: 'right', fontWeight: 700 }}>
              Итого {title.toLowerCase()}
            </td>
            <td className="num" style={{ fontWeight: 700 }}>
              {formatRub(sum)}
            </td>
          </tr>
        </tbody>
      </table>
    </>
  )
}
