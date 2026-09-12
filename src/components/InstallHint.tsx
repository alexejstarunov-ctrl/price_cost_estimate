import type { InstallMode } from '../App'

type Props = {
  mode: InstallMode
  onInstall: () => void
  onDismiss?: () => void
}

/** Подсказка установки: на Android — системный диалог, на iPhone — путь через «Поделиться» */
export default function InstallHint({ mode, onInstall, onDismiss }: Props) {
  if (mode === 'none') return null

  return (
    <div className="install" role="note">
      <div className="grow">
        {mode === 'android' ? (
          <>
            <strong>Установить как приложение</strong>
            <span>Иконка на экране, работает без интернета</span>
          </>
        ) : (
          <>
            <strong>Установить на iPhone</strong>
            <span>
              Внизу Safari нажмите «Поделиться» <span className="ios-share" aria-hidden /> →
              «На экран „Домой“»
            </span>
          </>
        )}
      </div>
      {mode === 'android' && (
        <button className="btn btn-primary" onClick={onInstall}>
          Установить
        </button>
      )}
      {onDismiss && (
        <button className="btn-ghost" onClick={onDismiss} aria-label="Скрыть подсказку">
          ✕
        </button>
      )}
    </div>
  )
}
