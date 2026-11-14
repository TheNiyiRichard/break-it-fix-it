import type { IconName } from './icons'

// The five vulnerabilities, in one place, so the hero map, the overview list
// and the workspace sections all use the same names, colours and icons.
export type VulnId = 'sql' | 'access' | 'xss' | 'passwords' | 'misconfig'

export interface Vulnerability {
  id: VulnId
  title: string
  owasp: string
  icon: IconName
  summary: string
}

export const VULNERABILITIES: Vulnerability[] = [
  {
    id: 'sql',
    title: 'SQL injection',
    owasp: 'A03 Injection',
    icon: 'database',
    summary: 'Type SQL into the login form and sign in without a password.',
  },
  {
    id: 'access',
    title: 'Broken access control',
    owasp: 'A01 Broken Access Control',
    icon: 'lock',
    summary: "Change an invoice number and read someone else's invoice.",
  },
  {
    id: 'xss',
    title: 'Stored XSS',
    owasp: 'A03 Injection',
    icon: 'code',
    summary: 'Save a note that runs as code for anyone who opens it.',
  },
  {
    id: 'passwords',
    title: 'Password storage',
    owasp: 'A02 Cryptographic Failures',
    icon: 'key',
    summary: 'See what a data breach leaks: real passwords, or salted hashes.',
  },
  {
    id: 'misconfig',
    title: 'Security misconfiguration',
    owasp: 'A05 Security Misconfiguration',
    icon: 'sliders',
    summary: 'Crash the API and compare leaked internals with a safe error.',
  },
]

export const vuln = (id: VulnId) => VULNERABILITIES.find(v => v.id === id)!
