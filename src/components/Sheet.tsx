import { useEffect, useState, type FormEvent, type ReactNode } from 'react'

type Props = {
  labelledBy: string
  onClose: () => void
  onSubmit?: (e: FormEvent<HTMLFormElement>) => void
  children: ReactNode
}

/**
 * Нижняя шторка, которая остаётся над клавиатурой. На iOS клавиатура не сжимает
 * layout viewport — прибитый к низу блок уезжает под неё; visualViewport знает
 * реальную видимую область, по ней и позиционируемся.
 */
export default function Sheet({ labelledBy, onClose, onSubmit, children }: Props) {
  const [box, setBox] = useState<{ top: number; height: number } | null>(null)

  useEffect(() => {
    const vv = window.visualViewport
    if (!vv) return
    const update = () => setBox({ top: vv.offsetTop, height: vv.height })
    update()
    vv.addEventListener('resize', update)
    vv.addEventListener('scroll', update)
    return () => {
      vv.removeEventListener('resize', update)
      vv.removeEventListener('scroll', update)
    }
  }, [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const stop = (e: React.MouseEvent) => e.stopPropagation()
  const style = box ? { top: box.top, height: box.height } : undefined
  const inner = (
    <>
      <div className="sheet-grip" aria-hidden />
      {children}
    </>
  )

  return (
    <div className="sheet-backdrop" style={style} onClick={onClose}>
      {onSubmit ? (
        <form className="sheet" role="dialog" aria-modal="true" aria-labelledby={labelledBy} onClick={stop} onSubmit={onSubmit}>
          {inner}
        </form>
      ) : (
        <div className="sheet" role="dialog" aria-modal="true" aria-labelledby={labelledBy} onClick={stop}>
          {inner}
        </div>
      )}
    </div>
  )
}
