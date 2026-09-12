import type { Estimate } from '../types'
import type { CompanyInfo } from './storage'

export const isStandalone = (): boolean =>
  window.matchMedia('(display-mode: standalone)').matches ||
  (navigator as Navigator & { standalone?: boolean }).standalone === true

export const isIos = (): boolean =>
  /iphone|ipad|ipod/i.test(navigator.userAgent) ||
  (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)

/** Событие Chrome/Android, дающее показать системный диалог установки по кнопке */
export type InstallPromptEvent = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export type PrintPayload = { estimate: Estimate; company: CompanyInfo }

/**
 * В установленном на iPhone приложении window.print() ненадёжен, а хранилище
 * у него отдельное от Safari. Поэтому смета для печати передаётся в адресе:
 * страница открывается в Safari, где доступны «Напечатать» и «Сохранить в Файлы».
 */
export const printUrl = (payload: PrintPayload): string =>
  `${location.origin}${import.meta.env.BASE_URL}?print=1#${encodeURIComponent(JSON.stringify(payload))}`

export function readPrintPayload(): PrintPayload | null {
  if (!new URLSearchParams(location.search).has('print')) return null
  try {
    const raw = decodeURIComponent(location.hash.slice(1))
    const parsed = JSON.parse(raw) as PrintPayload
    return parsed && Array.isArray(parsed.estimate?.lines) ? parsed : null
  } catch {
    return null
  }
}
