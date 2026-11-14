// Small stroke icons drawn inline, so the app needs no icon library.
// All icons are decorative (aria-hidden): the text next to them carries the meaning.
import type { ReactNode } from 'react'

export type IconName = 'database' | 'lock' | 'code' | 'key' | 'sliders' | 'shieldCheck' | 'shieldAlert' | 'copy' | 'check'

const paths: Record<IconName, ReactNode> = {
  database: (
    <>
      <ellipse cx="12" cy="5" rx="8" ry="3" />
      <path d="M4 5v14c0 1.7 3.6 3 8 3s8-1.3 8-3V5" />
      <path d="M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3" />
    </>
  ),
  lock: (
    <>
      <rect x="4" y="11" width="16" height="10" rx="2.5" />
      <path d="M8 11V7a4 4 0 0 1 8 0v4" />
    </>
  ),
  code: (
    <>
      <path d="m8 8-5 4 5 4" />
      <path d="m16 8 5 4-5 4" />
      <path d="m14 4-4 16" />
    </>
  ),
  key: (
    <>
      <circle cx="8" cy="15" r="4" />
      <path d="m10.8 12.2 9.2-9.2" />
      <path d="m17 6 3 3" />
      <path d="m14.5 8.5 2 2" />
    </>
  ),
  sliders: (
    <>
      <path d="M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12" />
      <circle cx="16" cy="6" r="2" />
      <circle cx="10" cy="12" r="2" />
      <circle cx="18" cy="18" r="2" />
    </>
  ),
  shieldCheck: (
    <>
      <path d="M12 22s8-3.5 8-10V5l-8-3-8 3v7c0 6.5 8 10 8 10z" />
      <path d="m8.5 12 2.5 2.5 4.5-5" />
    </>
  ),
  shieldAlert: (
    <>
      <path d="M12 22s8-3.5 8-10V5l-8-3-8 3v7c0 6.5 8 10 8 10z" />
      <path d="M12 7.5v5.5" />
      <path d="M12 16.5h.01" />
    </>
  ),
  copy: (
    <>
      <rect x="9" y="9" width="12" height="12" rx="2" />
      <path d="M5 15H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v1" />
    </>
  ),
  check: <path d="m5 12.5 4.5 4.5L19 7.5" />,
}

export function Icon({ name, size = 24, strokeWidth = 2 }: { name: IconName; size?: number; strokeWidth?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {paths[name]}
    </svg>
  )
}
