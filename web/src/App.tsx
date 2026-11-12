import { useEffect, useState, type FormEvent } from 'react'
import { api, type BreachRow, type CurrentUser, type Invoice, type Mode, type RawResponse } from './api'
import { InvoiceNotes } from './InvoiceNotes'
import './App.css'

function ModeSwitch({ mode, onChange }: { mode: Mode; onChange: (mode: Mode) => void }) {
  return (
    <div className="mode-switch" role="group" aria-label="App mode">
      <button className={mode === 'secure' ? 'active secure' : ''} aria-pressed={mode === 'secure'} onClick={() => onChange('secure')}>
        Secure
      </button>
      <button className={mode === 'vulnerable' ? 'active vulnerable' : ''} aria-pressed={mode === 'vulnerable'} onClick={() => onChange('vulnerable')}>
        Vulnerable
      </button>
    </div>
  )
}

function LoginForm({ mode, onLogin }: { mode: Mode; onLogin: (user: CurrentUser) => void }) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError('')
    try {
      onLogin(await api.login(mode, username, password))
    } catch (err) {
      setError((err as Error).message)
    }
  }

  return (
    <form className="card" onSubmit={handleSubmit}>
      <h2>Sign in</h2>
      <label>
        Username
        <input value={username} onChange={e => setUsername(e.target.value)} autoComplete="username" />
      </label>
      <label>
        Password
        <input type="password" value={password} onChange={e => setPassword(e.target.value)} autoComplete="current-password" />
      </label>
      {error && <p className="error" role="alert">{error}</p>}
      <button type="submit">Sign in</button>
      <p className="hint">Demo users: alice / alice123 · bob / bob123</p>
      <p className="attack">
        <strong>Try the attack (Vulnerability 1, SQL injection):</strong> type <code>' OR 1=1 --</code> as the username
        and anything as the password. It works in Vulnerable mode and fails in Secure mode.
      </p>
    </form>
  )
}

function InvoiceDetail({ mode, invoice, user, onSaved }: {
  mode: Mode
  invoice: Invoice
  user: CurrentUser
  onSaved: (invoice: Invoice) => void
}) {
  const notMine = invoice.ownerId !== undefined && invoice.ownerId !== user.id
  const [draft, setDraft] = useState(invoice.notes)
  const [saveError, setSaveError] = useState('')

  useEffect(() => setDraft(invoice.notes), [invoice])

  async function handleSave(event: FormEvent) {
    event.preventDefault()
    setSaveError('')
    try {
      onSaved(await api.updateNotes(mode, invoice.id, draft))
    } catch (err) {
      setSaveError((err as Error).message)
    }
  }

  return (
    <div className={notMine ? 'detail leaked' : 'detail'}>
      {notMine && <p className="error" role="alert">⚠️ This invoice belongs to another user. You should not be able to see it.</p>}
      <h3>Invoice #{invoice.id}</h3>
      <dl>
        <dt>Client</dt><dd>{invoice.clientName}</dd>
        <dt>Amount</dt><dd>${invoice.amount.toFixed(2)}</dd>
        <dt>Status</dt><dd>{invoice.paid ? 'Paid' : 'Unpaid'}</dd>
        <dt>Notes</dt><InvoiceNotes mode={mode} notes={invoice.notes} />
      </dl>

      {!notMine && (
        <form className="notes-form" onSubmit={handleSave}>
          <label>
            Edit notes
            <textarea rows={3} value={draft} onChange={e => setDraft(e.target.value)} />
          </label>
          {saveError && <p className="error" role="alert">{saveError}</p>}
          <button type="submit">Save notes</button>
          <p className="attack">
            <strong>Try the attack (Vulnerability 3, stored XSS):</strong> save this as the note:{' '}
            <code>{`<img src=x onerror="alert('XSS: this code ran in your browser')">`}</code>{' '}
            In Vulnerable mode a pop-up appears. In Secure mode the note is shown as harmless text.
          </p>
        </form>
      )}
    </div>
  )
}

const LEAKY_HEADERS = ['Server', 'X-Powered-By']

function SummaryPanel({ mode }: { mode: Mode }) {
  const [currency, setCurrency] = useState('USD')
  const [result, setResult] = useState<RawResponse | null>(null)

  useEffect(() => setResult(null), [mode])

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setResult(await api.summary(mode, currency))
  }

  return (
    <section className="card">
      <h2>Vulnerability 5: security misconfiguration</h2>
      <form className="lookup" onSubmit={handleSubmit}>
        <label>
          Total of my invoices in currency
          <input value={currency} onChange={e => setCurrency(e.target.value)} placeholder="CAD, USD or EUR" />
        </label>
        <button type="submit">Get total</button>
      </form>
      <p className="attack">
        <strong>Try the attack:</strong> enter an unsupported currency like <code>XYZ</code>. Vulnerable mode crashes and
        leaks internal details; Secure mode returns a short, safe message. Then compare the response headers below.
      </p>

      {result && (
        <>
          {result.ok ? (
            <p className="total">
              Total: <strong>{(result.body?.total ?? 0).toFixed(2)} {result.body?.currency}</strong> across {result.body?.count} invoices
            </p>
          ) : mode === 'vulnerable' ? (
            <div className="leak-box">
              <p className="error" role="alert">⚠️ HTTP {result.status}: the server sent its internal details to the browser.</p>
              <pre>{JSON.stringify(result.body, null, 2)}</pre>
            </div>
          ) : (
            <p className="error" role="alert">HTTP {result.status}: {result.body?.message}</p>
          )}

          <h3>Response headers</h3>
          <div className="table-scroll">
            <table className="headers">
              <thead><tr><th>Header</th><th>Value</th></tr></thead>
              <tbody>
                {Object.entries(result.headers).map(([name, value]) => {
                  const leaky = LEAKY_HEADERS.includes(name)
                  const status = value === null ? (leaky ? 'good' : 'bad') : (leaky ? 'bad' : 'good')
                  return (
                    <tr key={name}>
                      <td><code>{name}</code></td>
                      <td className={`header-${status}`}>
                        {value ?? (leaky ? 'Not sent (good: nothing revealed)' : 'Missing')}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </section>
  )
}

function BreachPanel() {
  const [rows, setRows] = useState<BreachRow[] | null>(null)
  const [error, setError] = useState('')

  async function simulate() {
    setError('')
    try {
      setRows(await api.simulateBreach())
    } catch (err) {
      setError((err as Error).message)
    }
  }

  return (
    <section className="card breach">
      <h2>Vulnerability 4: password storage</h2>
      <p>
        Imagine an attacker steals the <code>Users</code> table. What do they get? The vulnerable login
        checks passwords stored as <strong>plain text</strong>. The secure login checks <strong>salted hashes</strong>.
      </p>
      <button className="secondary" onClick={simulate}>Simulate a data breach</button>
      {error && <p className="error" role="alert">{error}</p>}
      {rows && (
        <div className="table-scroll">
          <table>
            <thead>
              <tr><th>User</th><th>Plain-text storage leaks</th><th>Hashed storage leaks</th></tr>
            </thead>
            <tbody>
              {rows.map(row => (
                <tr key={row.username}>
                  <td>{row.username}</td>
                  <td className="leak-bad">{row.plainTextLeak}</td>
                  <td className="leak-good"><code className="hash">{row.hashedLeak}</code></td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="hint">
            Plain text: the attacker can sign in right away, and try the same password on the victim's other accounts.
            Hashed: the hash can't be turned back into the password, and each one includes a random salt.
          </p>
        </div>
      )}
    </section>
  )
}

function InvoiceList({ mode, user, onLogout }: { mode: Mode; user: CurrentUser; onLogout: () => void }) {
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [error, setError] = useState('')
  const [lookupId, setLookupId] = useState('')
  const [selected, setSelected] = useState<Invoice | null>(null)
  const [lookupError, setLookupError] = useState('')

  useEffect(() => {
    setSelected(null)
    setLookupError('')
    api.myInvoices(mode).then(setInvoices).catch(err => setError(err.message))
  }, [mode])

  async function openInvoice(id: number) {
    setLookupError('')
    setSelected(null)
    try {
      setSelected(await api.invoiceById(mode, id))
    } catch (err) {
      setLookupError((err as Error).message)
    }
  }

  function handleLookup(event: FormEvent) {
    event.preventDefault()
    const id = Number(lookupId)
    if (Number.isInteger(id) && id > 0) openInvoice(id)
  }

  return (
    <div className="card">
      <div className="row">
        <h2>{user.username}'s invoices</h2>
        <button className="secondary" onClick={onLogout}>Sign out</button>
      </div>
      {error && <p className="error" role="alert">{error}</p>}
      <table>
        <thead>
          <tr><th>ID</th><th>Client</th><th className="num">Amount</th><th>Status</th><th></th></tr>
        </thead>
        <tbody>
          {invoices.map(invoice => (
            <tr key={invoice.id}>
              <td>{invoice.id}</td>
              <td>{invoice.clientName}</td>
              <td className="num">${invoice.amount.toFixed(2)}</td>
              <td>{invoice.paid ? 'Paid' : 'Unpaid'}</td>
              <td><button className="link" onClick={() => openInvoice(invoice.id)}>View</button></td>
            </tr>
          ))}
        </tbody>
      </table>

      <form className="lookup" onSubmit={handleLookup}>
        <label>
          Open invoice by ID
          <input inputMode="numeric" value={lookupId} onChange={e => setLookupId(e.target.value)} placeholder="e.g. 3" />
        </label>
        <button type="submit">Open</button>
      </form>
      <p className="attack">
        <strong>Try the attack (Vulnerability 2, broken access control):</strong> signed in as alice, open invoice <code>3</code>.
        That's bob's. Vulnerable mode shows it; Secure mode says it doesn't exist.
      </p>

      {lookupError && <p className="error" role="alert">{lookupError}</p>}
      {selected && (
        <InvoiceDetail
          mode={mode}
          invoice={selected}
          user={user}
          onSaved={updated => {
            setSelected(updated)
            setInvoices(list => list.map(i => (i.id === updated.id ? { ...i, notes: updated.notes } : i)))
          }}
        />
      )}
    </div>
  )
}

export default function App() {
  const [mode, setMode] = useState<Mode>('secure')
  const [user, setUser] = useState<CurrentUser | null>(null)
  const [checking, setChecking] = useState(true)

  // On page load, check whether a session cookie already signs us in.
  useEffect(() => {
    api.me(mode).then(setUser).catch(() => setUser(null)).finally(() => setChecking(false))
  }, [mode])

  async function handleLogout() {
    await api.logout(mode)
    setUser(null)
  }

  return (
    <main className={mode}>
      <header>
        <div>
          <h1>Break It, Fix It</h1>
          <p>An OWASP Top 10 showcase</p>
        </div>
        <ModeSwitch mode={mode} onChange={setMode} />
      </header>
      {mode === 'vulnerable' && (
        <p className="banner" role="status">⚠️ Vulnerable mode: this code is intentionally insecure. Local demo only.</p>
      )}
      {checking ? <p>Loading…</p> : user
        ? (
          <div className="stack">
            <InvoiceList mode={mode} user={user} onLogout={handleLogout} />
            <BreachPanel />
            <SummaryPanel mode={mode} />
          </div>
        )
        : <LoginForm mode={mode} onLogin={setUser} />}
      <footer>
        Built by Adeniyi Richard Adedokun ·{' '}
        <a href="https://github.com/TheNiyiRichard/break-it-fix-it" target="_blank" rel="noreferrer">Source on GitHub</a> ·{' '}
        <a href="https://owasp.org/Top10/" target="_blank" rel="noreferrer">OWASP Top 10</a>
      </footer>
    </main>
  )
}
