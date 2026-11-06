import { useEffect, useState, type FormEvent } from 'react'
import { api, type CurrentUser, type Invoice, type Mode } from './api'
import './App.css'

const mode: Mode = 'secure' // Day 4 turns this into a switch

function LoginForm({ onLogin }: { onLogin: (user: CurrentUser) => void }) {
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
    </form>
  )
}

function InvoiceList({ user, onLogout }: { user: CurrentUser; onLogout: () => void }) {
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [error, setError] = useState('')

  useEffect(() => {
    api.myInvoices(mode).then(setInvoices).catch(err => setError(err.message))
  }, [])

  return (
    <div className="card">
      <div className="row">
        <h2>{user.username}'s invoices</h2>
        <button className="secondary" onClick={onLogout}>Sign out</button>
      </div>
      {error && <p className="error" role="alert">{error}</p>}
      <table>
        <thead>
          <tr><th>ID</th><th>Client</th><th className="num">Amount</th><th>Status</th><th>Notes</th></tr>
        </thead>
        <tbody>
          {invoices.map(invoice => (
            <tr key={invoice.id}>
              <td>{invoice.id}</td>
              <td>{invoice.clientName}</td>
              <td className="num">${invoice.amount.toFixed(2)}</td>
              <td>{invoice.paid ? 'Paid' : 'Unpaid'}</td>
              <td>{invoice.notes}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default function App() {
  const [user, setUser] = useState<CurrentUser | null>(null)
  const [checking, setChecking] = useState(true)

  // On page load, check whether a session cookie already signs us in.
  useEffect(() => {
    api.me(mode).then(setUser).catch(() => setUser(null)).finally(() => setChecking(false))
  }, [])

  async function handleLogout() {
    await api.logout(mode)
    setUser(null)
  }

  return (
    <main>
      <header>
        <h1>Break It, Fix It</h1>
        <p>An OWASP Top 10 showcase · Mode: <strong>{mode}</strong></p>
      </header>
      {checking ? <p>Loading…</p> : user ? <InvoiceList user={user} onLogout={handleLogout} /> : <LoginForm onLogin={setUser} />}
    </main>
  )
}
