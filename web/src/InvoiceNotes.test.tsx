import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render } from '@testing-library/react'
import { InvoiceNotes } from './InvoiceNotes'

// Vulnerability 3: stored XSS (front end)
// The attacker's note: an image that fails to load, so its onerror code runs.
const XSS_PAYLOAD = `<img src=x onerror="window.__xssRan = true">`

function renderNotes(mode: 'secure' | 'vulnerable', notes: string) {
  // <dd> must live inside a <dl> to be valid HTML
  const dl = document.createElement('dl')
  document.body.appendChild(dl)
  return render(<InvoiceNotes mode={mode} notes={notes} />, { container: dl })
}

afterEach(() => cleanup())

describe('InvoiceNotes', () => {
  it('vulnerable mode turns the note into a real <img> element (the attack works)', () => {
    const { container } = renderNotes('vulnerable', XSS_PAYLOAD)

    const img = container.querySelector('img')
    expect(img).not.toBeNull()
    expect(img?.getAttribute('onerror')).toContain('__xssRan')
  })

  it('secure mode shows the note as plain text, with no HTML elements created', () => {
    const { container } = renderNotes('secure', XSS_PAYLOAD)

    expect(container.querySelector('img')).toBeNull()
    expect(container.textContent).toBe(XSS_PAYLOAD)
  })

  it('secure mode still shows normal notes', () => {
    const { container } = renderNotes('secure', 'Website redesign')

    expect(container.textContent).toBe('Website redesign')
  })
})
