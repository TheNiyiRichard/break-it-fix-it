import type { Mode } from './api'

// Shows an invoice's notes. This is where Vulnerability 3 (stored XSS) lives.
export function InvoiceNotes({ mode, notes }: { mode: Mode; notes: string }) {
  if (mode === 'vulnerable') {
    // ❌ VULNERABILITY 3: STORED XSS
    // dangerouslySetInnerHTML tells React to treat the saved notes as real HTML.
    // A note like <img src=x onerror="alert('XSS')"> becomes an <img> tag whose
    // onerror code runs in the browser of anyone who views this invoice.
    return <dd className="notes" dangerouslySetInnerHTML={{ __html: notes }} />
  }

  // ✅ FIX: render notes as plain text. React escapes it automatically,
  // so <img ...> is shown as the characters "<img ...>", never run as code.
  return <dd className="notes">{notes}</dd>
}
