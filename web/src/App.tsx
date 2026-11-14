import { useEffect, useState, type FormEvent, type ReactNode } from 'react'
import { api, type BreachRow, type CurrentUser, type Invoice, type Mode, type RawResponse } from './api'
import { InvoiceNotes } from './InvoiceNotes'
import { AttackMap } from './AttackMap'
import { Icon } from './icons'
import { VULNERABILITIES, vuln, type VulnId } from './vulnerabilities'
import './App.css'

const REPO_URL = 'https://github.com/TheNiyiRichard/break-it-fix-it'
const XSS_PAYLOAD = `<img src=x onerror="alert('XSS: this code ran in your browser')">`

// ---------- Small building blocks ----------

function Tile({ id, size = 'md' }: { id: VulnId; size?: 'sm' | 'md' }) {
  return (
    <span className={`tile tile-${id} tile-${size}`}>
      <Icon name={vuln(id).icon} size={size === 'sm' ? 16 : 22} />
    </span>
  )
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)

  async function copy() {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 1600)
    } catch {
      // Clipboard can be blocked (e.g. insecure context); the payload is still selectable.
    }
  }

  return (
    <button type="button" className="copy" onClick={copy} aria-label={copied ? 'Copied' : 'Copy attack text'}>
      <Icon name={copied ? 'check' : 'copy'} size={15} />
      <span>{copied ? 'Copied' : 'Copy'}</span>
    </button>
  )
}

// A "try the attack" callout, tagged with the vulnerability it belongs to.
function TryIt({ id, payload, children }: { id: VulnId; payload?: string; children: ReactNode }) {
  return (
    <div className={`try-it try-${id}`}>
      <Tile id={id} size="sm" />
      <div className="try-body">
        <p><strong>Try it: {vuln(id).title}.</strong> {children}</p>
        {payload && (
          <div className="payload">
            <code>{payload}</code>
            <CopyButton text={payload} />
          </div>
        )}
      </div>
    </div>
  )
}

function SectionHead({ ids, title, children }: { ids: VulnId[]; title: string; children?: ReactNode }) {
  return (
    <div className="section-head">
      <div className="section-tiles">{ids.map(id => <Tile key={id} id={id} />)}</div>
      <div>
        <h2>{title}</h2>
        <p className="owasp">
          {ids.map(id => <span key={id} className="chip">{vuln(id).owasp}</span>)}
        </p>
      </div>
      {children && <div className="section-actions">{children}</div>}
    </div>
  )
}

// ---------- Navigation ----------

function ModeSwitch({ mode, onChange }: { mode: Mode; onChange: (mode: Mode) => void }) {
  return (
    <div className={`mode-switch is-${mode}`} role="group" aria-label="App mode">
      <span className="mode-thumb" aria-hidden="true" />
      <button aria-pressed={mode === 'secure'} onClick={() => onChange('secure')}>Secure</button>
      <button aria-pressed={mode === 'vulnerable'} onClick={() => onChange('vulnerable')}>Vulnerable</button>
    </div>
  )
}

function Nav({ mode, onModeChange, user, onSignOut }: {
  mode: Mode
  onModeChange: (mode: Mode) => void
  user: CurrentUser | null
  onSignOut: () => void
}) {
  return (
    <nav className="nav" aria-label="Main">
      <a className="brand" href="#top">
        <span className="brand-mark"><Icon name="shieldCheck" size={18} /></span>
        Break It, Fix It
      </a>
      <div className="nav-links">
        <a href="#attacks">Attacks</a>
        <a href={`${REPO_URL}/actions`} target="_blank" rel="noreferrer">Tests</a>
        <a href={REPO_URL} target="_blank" rel="noreferrer">Source</a>
      </div>
      <div className="nav-actions">
        <ModeSwitch mode={mode} onChange={onModeChange} />
        {user
          ? <button className="btn btn-dark" onClick={onSignOut}>Sign out</button>
          : <a className="btn btn-dark" href="#sign-in">Sign in</a>}
      </div>
    </nav>
  )
}

// ---------- Hero ----------

function Hero({ mode, user }: { mode: Mode; user: CurrentUser | null }) {
  return (
    <header className={`hero${user ? ' hero-compact' : ''}`} id="top">
      <AttackMap mode={mode} compact={!!user} />
      <h1>Break it. Then fix it.</h1>
      <p className="lede">
        {user
          ? <>Signed in as <strong>{user.username}</strong>. Every panel below calls the <strong>{mode}</strong> API, so switch modes and try each attack again.</>
          : <>One invoice app, built twice. Switch to Vulnerable and try five real attacks, then switch to Secure and watch each one fail.</>}
      </p>
      {!user && <a className="btn btn-accent btn-lg" href="#sign-in">Try the attacks</a>}
    </header>
  )
}

function AttackOverview() {
  return (
    <section className="panel" id="attacks" aria-labelledby="attacks-title">
      <h2 id="attacks-title">Five attacks, five fixes</h2>
      <ol className="attack-list">
        {VULNERABILITIES.map(v => (
          <li key={v.id}>
            <Tile id={v.id} />
            <div>
              <h3>{v.title}</h3>
              <p>{v.summary}</p>
            </div>
            <span className="chip">{v.owasp}</span>
          </li>
        ))}
      </ol>
      <p className="panel-note">Each one is covered by automated tests: the attack must work in Vulnerable mode and fail in Secure mode.</p>
    </section>
  )
}

// ---------- Sign in (vulnerability 1) ----------

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
    <section className="panel sign-in" id="sign-in" aria-labelledby="sign-in-title">
      <form className="sign-in-form" onSubmit={handleSubmit}>
        <h2 id="sign-in-title">Sign in</h2>
        <p className="muted">Demo accounts: <code>alice</code> with password <code>alice123</code>, or <code>bob</code> with <code>bob123</code>.</p>
        <label>
          Username
          <input value={username} onChange={e => setUsername(e.target.value)} autoComplete="username" />
        </label>
        <label>
          Password
          <input type="password" value={password} onChange={e => setPassword(e.target.value)} autoComplete="current-password" />
        </label>
        {error && <p className="error" role="alert">{error}</p>}
        <button type="submit" className="btn btn-accent">Sign in</button>
      </form>
      <TryIt id="sql" payload="' OR 1=1 --">
        Use this as the username and anything as the password. Vulnerable mode lets you in as alice; Secure mode rejects it.
      </TryIt>
    </section>
  )
}

// ---------- Invoices (vulnerabilities 2 and 3) ----------

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
      {notMine && <p className="error" role="alert">This invoice belongs to another user. You should not be able to see it.</p>}
      <h3>Invoice #{invoice.id}</h3>
      <dl>
        <dt>Client</dt><dd>{invoice.clientName}</dd>
        <dt>Amount</dt><dd className="num">${invoice.amount.toFixed(2)}</dd>
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
          <button type="submit" className="btn btn-dark">Save notes</button>
          <TryIt id="xss" payload={XSS_PAYLOAD}>
            Save this as the note. Vulnerable mode runs it and a pop-up appears; Secure mode shows it as harmless text.
          </TryIt>
        </form>
      )}
    </div>
  )
}

function InvoiceList({ mode, user }: { mode: Mode; user: CurrentUser }) {
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
    <section className="panel" id="attacks" aria-label={`${user.username}'s invoices`}>
      <SectionHead ids={['access', 'xss']} title={`${user.username}'s invoices`} />
      {error && <p className="error" role="alert">{error}</p>}
      <div className="table-scroll">
        <table>
          <thead>
            <tr><th>ID</th><th>Client</th><th className="num">Amount</th><th>Status</th><th><span className="sr-only">Actions</span></th></tr>
          </thead>
          <tbody>
            {invoices.map(invoice => (
              <tr key={invoice.id}>
                <td className="num-id">{invoice.id}</td>
                <td>{invoice.clientName}</td>
                <td className="num">${invoice.amount.toFixed(2)}</td>
                <td><span className={`status ${invoice.paid ? 'paid' : 'unpaid'}`}>{invoice.paid ? 'Paid' : 'Unpaid'}</span></td>
                <td className="row-action"><button className="link" onClick={() => openInvoice(invoice.id)}>View</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <form className="inline-form" onSubmit={handleLookup}>
        <label>
          Open invoice by ID
          <input inputMode="numeric" value={lookupId} onChange={e => setLookupId(e.target.value)} placeholder="e.g. 3" />
        </label>
        <button type="submit" className="btn btn-dark">Open</button>
      </form>
      <TryIt id="access">
        Signed in as alice, open invoice 3. It's bob's. Vulnerable mode shows it; Secure mode says it doesn't exist.
      </TryIt>

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
    </section>
  )
}

// ---------- Vulnerability 4 ----------

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
    <section className="panel breach" aria-label="Password storage">
      <SectionHead ids={['passwords']} title="Password storage">
        <button className="btn btn-dark" onClick={simulate}>Simulate a data breach</button>
      </SectionHead>
      <p className="measure">
        Imagine an attacker steals the <code>Users</code> table. The vulnerable login checks passwords stored as
        plain text; the secure login checks salted hashes.
      </p>
      {error && <p className="error" role="alert">{error}</p>}
      {rows && (
        <div className="breach-grid">
          <div className="leak-col leak-plain">
            <h3>Plain-text storage leaks</h3>
            {rows.map(row => (
              <p key={row.username}><span className="who">{row.username}</span><span className="leak-value">{row.plainTextLeak}</span></p>
            ))}
            <p className="muted">The attacker can sign in right away, and try the same password on the victim's other accounts.</p>
          </div>
          <div className="leak-col leak-hashed">
            <h3>Hashed storage leaks</h3>
            {rows.map(row => (
              <p key={row.username}><span className="who">{row.username}</span><code className="hash">{row.hashedLeak}</code></p>
            ))}
            <p className="muted">A hash can't be turned back into the password, and each one includes a random salt.</p>
          </div>
        </div>
      )}
    </section>
  )
}

// ---------- Vulnerability 5 ----------

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
    <section className="panel" aria-label="Security misconfiguration">
      <SectionHead ids={['misconfig']} title="Security misconfiguration" />
      <form className="inline-form" onSubmit={handleSubmit}>
        <label>
          Total of my invoices in currency
          <input value={currency} onChange={e => setCurrency(e.target.value)} placeholder="CAD, USD or EUR" />
        </label>
        <button type="submit" className="btn btn-dark">Get total</button>
      </form>
      <TryIt id="misconfig" payload="XYZ">
        Ask for an unsupported currency. Vulnerable mode crashes and leaks internal details; Secure mode returns a short, safe message.
      </TryIt>

      {result && (
        <div className="result">
          {result.ok ? (
            <p className="total">
              <span className="total-figure">{(result.body?.total ?? 0).toFixed(2)} {result.body?.currency}</span>
              <span className="muted">across {result.body?.count} invoices</span>
            </p>
          ) : mode === 'vulnerable' ? (
            <div className="leak-box">
              <p className="error" role="alert">HTTP {result.status}: the server sent its internal details to the browser.</p>
              <pre>{JSON.stringify(result.body, null, 2)}</pre>
            </div>
          ) : (
            <p className="error" role="alert">HTTP {result.status}: {result.body?.message}</p>
          )}

          <h3>Response headers</h3>
          <ul className="header-list">
            {Object.entries(result.headers).map(([name, value]) => {
              const leaky = LEAKY_HEADERS.includes(name)
              const good = value === null ? leaky : !leaky
              return (
                <li key={name} className={good ? 'is-good' : 'is-bad'}>
                  <span className="dot" aria-hidden="true" />
                  <code>{name}</code>
                  <span className="header-value">
                    {value ?? (leaky ? 'Not sent (good: nothing revealed)' : 'Missing')}
                  </span>
                </li>
              )
            })}
          </ul>
        </div>
      )}
    </section>
  )
}

// ---------- App ----------

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
    <div className="app" data-mode={mode}>
      <div className="nav-wrap">
        <Nav mode={mode} onModeChange={setMode} user={user} onSignOut={handleLogout} />
        {mode === 'vulnerable' && (
          <p className="banner" role="status">
            <span className="banner-long">Vulnerable mode is on. This code is intentionally insecure, so only run it on your own computer.</span>
            <span className="banner-short">Vulnerable mode: run it on your own computer only.</span>
          </p>
        )}
      </div>

      <main>
        <Hero mode={mode} user={user} />
        {checking ? <p className="muted center">Loading…</p> : user
          ? (
            <div className="workspace">
              <InvoiceList mode={mode} user={user} />
              <BreachPanel />
              <SummaryPanel mode={mode} />
            </div>
          )
          : (
            <div className="workspace">
              <AttackOverview />
              <LoginForm mode={mode} onLogin={setUser} />
            </div>
          )}
      </main>

      <footer className="footer">
        <span>Built by Adeniyi Richard Adedokun</span>
        <a href={REPO_URL} target="_blank" rel="noreferrer">Source on GitHub</a>
        <a href="https://owasp.org/Top10/" target="_blank" rel="noreferrer">OWASP Top 10</a>
      </footer>
    </div>
  )
}
