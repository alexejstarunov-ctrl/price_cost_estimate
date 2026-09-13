import type { SVGProps } from 'react'

const base: SVGProps<SVGSVGElement> = {
  width: 22,
  height: 22,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': true,
}

export const IconEstimate = () => (
  <svg {...base}>
    <rect x="5" y="3.5" width="14" height="17" rx="2" />
    <path d="M9 3.5V2.5h6v1M8.5 9h7M8.5 12.5h7M8.5 16h4" />
  </svg>
)

export const IconCatalog = () => (
  <svg {...base}>
    <path d="M4 5.5A1.5 1.5 0 0 1 5.5 4H11l8.5 8.5-6 6L4 10V5.5Z" />
    <circle cx="8" cy="8" r="1.2" fill="currentColor" stroke="none" />
  </svg>
)

export const IconMaterials = () => (
  <svg {...base}>
    <rect x="3.5" y="3.5" width="7.5" height="7.5" rx="1" />
    <rect x="13" y="3.5" width="7.5" height="7.5" rx="1" />
    <rect x="3.5" y="13" width="7.5" height="7.5" rx="1" />
    <rect x="13" y="13" width="7.5" height="7.5" rx="1" />
  </svg>
)

export const IconMore = () => (
  <svg {...base}>
    <path d="M4 7h16M4 12h16M4 17h16" />
    <circle cx="9" cy="7" r="1.6" fill="var(--surface)" />
    <circle cx="15" cy="12" r="1.6" fill="var(--surface)" />
    <circle cx="7" cy="17" r="1.6" fill="var(--surface)" />
  </svg>
)

export const IconGrip = () => (
  <svg {...base} width={20} height={20}>
    <path d="M9 6h.01M15 6h.01M9 12h.01M15 12h.01M9 18h.01M15 18h.01" strokeWidth={3} />
  </svg>
)

export const IconChevron = () => (
  <svg {...base} width={16} height={16}>
    <path d="M6 9l6 6 6-6" />
  </svg>
)

export const IconEdit = () => (
  <svg {...base} width={18} height={18}>
    <path d="M4 20h4l10.5-10.5a2.1 2.1 0 0 0-3-3L5 17v3Z" />
    <path d="M13.5 6.5l3 3" />
  </svg>
)

export const IconClose = () => (
  <svg {...base} width={18} height={18}>
    <path d="M6 6l12 12M18 6L6 18" />
  </svg>
)
