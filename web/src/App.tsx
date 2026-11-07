import { useEffect, useState, type FormEvent } from 'react'
import { api, type CurrentUser, type Invoice, type Mode } from './api'
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

function InvoiceDetail({ invoice, user }: { invoice: Invoice; user: CurrentUser }) {
  const notMine = invoice.ownerId !== undefined && invoice.ownerId !== user.id
  return (
    <div className={notMine ? 'detail leaked' : 'detail'}>
      {notMine && <p className="error" role="alert">⚠️ This invoice belongs to another user. You should not be able to see it.</p>}
      <h3>Invoice #{invoice.id}</h3>
      <dl>
        <dt>Client</dt><dd>{invoice.clientName}</dd>
        <dt>Amount</dt><dd>${invoice.amount.toFixed(2)}</dd>
        <dt>Status</dt><dd>{invoice.paid ? 'Paid' : 'Unpaid'}</dd>
        <dt>Notes</dt><dd>{invoice.notes}</dd>
      </dl>
    </div>
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
      {selected && <InvoiceDetail invoice={selected} user={user} />}
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
        ? <InvoiceList mode={mode} user={user} onLogout={handleLogout} />
        : <LoginForm mode={mode} onLogin={setUser} />}
    </main>
  )
}
