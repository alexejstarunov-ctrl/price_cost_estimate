import { useEffect, useRef, useState, type InputHTMLAttributes } from 'react'

type Props = Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange' | 'type'> & {
  value: number
  onChange: (value: number) => void
  min?: number
  /** Максимум знаков после запятой */
  decimals?: number
}

const display = (v: number): string => (Number.isFinite(v) ? String(v).replace('.', ',') : '')

/**
 * Числовое поле, которое не залипает на нуле.
 *
 * Пока поле в фокусе, оно показывает ровно то, что набрал пользователь
 * («12,», «», «0,5»), а в модель уходит уже разобранное число. Нативный
 * type="number" для этого не годится: промежуточное «12.» он считает
 * невалидным и отдаёт пустую строку, из-за чего десятичные ввести нельзя.
 */
export default function NumField({ value, onChange, min = 0, decimals = 2, onFocus, onBlur, ...rest }: Props) {
  const [draft, setDraft] = useState(() => display(value))
  const focused = useRef(false)

  useEffect(() => {
    if (!focused.current) setDraft(display(value))
  }, [value])

  const pattern = min < 0 ? /^-?\d*[.,]?\d*$/ : /^\d*[.,]?\d*$/

  return (
    <input
      {...rest}
      type="text"
      inputMode="decimal"
      autoComplete="off"
      value={draft}
      onFocus={(e) => {
        focused.current = true
        const el = e.currentTarget
        requestAnimationFrame(() => el.select())
        onFocus?.(e)
      }}
      onChange={(e) => {
        const raw = e.target.value
        if (!pattern.test(raw)) return
        setDraft(raw)
        const parsed = parseFloat(raw.replace(',', '.'))
        if (Number.isFinite(parsed)) {
          const rounded = Math.round(parsed * 10 ** decimals) / 10 ** decimals
          onChange(Math.max(min, rounded))
        } else {
          onChange(Math.max(min, 0))
        }
      }}
      onBlur={(e) => {
        focused.current = false
        setDraft(display(value))
        onBlur?.(e)
      }}
    />
  )
}
