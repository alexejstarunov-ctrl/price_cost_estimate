import { useEffect, useState, type ReactNode } from 'react'

type Props = {
  onConfirm: () => void
  children: ReactNode
  armedLabel?: string
  className?: string
  'aria-label'?: string
}

/** Двухтактное удаление вместо confirm(): первое нажатие взводит, второе выполняет */
export default function ConfirmButton({
  onConfirm,
  children,
  armedLabel = 'Точно?',
  className = 'btn-danger',
  ...rest
}: Props) {
  const [armed, setArmed] = useState(false)

  useEffect(() => {
    if (!armed) return
    const t = setTimeout(() => setArmed(false), 3000)
    return () => clearTimeout(t)
  }, [armed])

  return (
    <button
      type="button"
      className={`${className}${armed ? ' armed' : ''}`}
      onClick={() => {
        if (armed) {
          setArmed(false)
          onConfirm()
        } else {
          setArmed(true)
        }
      }}
      {...rest}
    >
      {armed ? armedLabel : children}
    </button>
  )
}
