import { useEffect, useMemo } from 'react'
import type { PrintPayload } from '../lib/platform'
import { calcTotals } from '../lib/estimate'
import PrintView from './PrintView'

/** Отдельная страница печати: открывается из установленного приложения в браузере */
export default function PrintRoute({ payload }: { payload: PrintPayload }) {
  const totals = useMemo(() => calcTotals(payload.estimate), [payload.estimate])

  useEffect(() => {
    document.body.classList.add('print-mode')
    document.fonts?.ready.then(() => setTimeout(() => window.print(), 300))
    return () => document.body.classList.remove('print-mode')
  }, [])

  return (
    <>
      <div className="print-toolbar no-print">
        <button className="btn btn-primary" onClick={() => window.print()}>
          Напечатать или сохранить PDF
        </button>
        <p className="hint">
          В диалоге печати выберите «Сохранить в Файлы» или «Поделиться», чтобы отправить PDF.
        </p>
      </div>
      <PrintView estimate={payload.estimate} totals={totals} company={payload.company} />
    </>
  )
}
