# Break It, Fix It
[![CI](https://github.com/TheNiyiRichard/break-it-fix-it/actions/workflows/ci.yml/badge.svg)](https://github.com/TheNiyiRichard/break-it-fix-it/actions/workflows/ci.yml)

An OWASP Top 10 showcase: one small invoice portal built twice, once with classic security
vulnerabilities and once with each one fixed, plus automated tests that prove each fix works.

> ⚠️ **Warning:** This project contains intentionally vulnerable code for learning purposes. Run it on your own computer only, and never deploy the vulnerable mode to a public server.

## How it works
The app has a **Secure / Vulnerable** switch at the top of the page.
- **Secure mode** calls the API at `/api/secure/...`, where every vulnerability is fixed.
- **Vulnerable mode** calls `/api/vulnerable/...`, where each vulnerability is deliberately left in.

Same features, same data. The only difference is the code behind each request, so you can attack
the vulnerable version and watch the secure version block it.

## Stack
- ASP.NET Core 8 Web API, Entity Framework Core, SQL Server
- React + TypeScript (Vite)
- Cookie authentication (HttpOnly, SameSite=Strict)
- xUnit integration tests, GitHub Actions CI

## Run locally
1. Set your SQL Server connection string in `api/appsettings.json`.
2. API: `cd api` → `dotnet run` (http://localhost:5080, Swagger at /swagger)
3. Web: `cd web` → `npm install` → `npm run dev` (http://localhost:5173)

## Run the tests
- Backend (27 xUnit integration tests): `dotnet test` from the project root
- Front end (3 Vitest tests): `cd web` → `npm test`

The backend tests start the real API in memory with a throwaway SQLite database, so no SQL Server is needed.
Each vulnerability is tested both ways: the attack **succeeds** against the vulnerable version and **fails**
against the secure version.

The database, tables and demo data are created automatically on first run.

Demo users: `alice / alice123`, `bob / bob123`

## Vulnerabilities
| # | Vulnerability | OWASP Top 10 (2021) | Status |
|---|---|---|---|
| 1 | SQL injection | A03: Injection | ✅ |
| 2 | Broken access control (IDOR) | A01: Broken Access Control | ✅ |
| 3 | Stored XSS | A03: Injection | ✅ |
| 4 | Plain-text password storage | A02: Cryptographic Failures | ✅ |
| 5 | Security misconfiguration | A05: Security Misconfiguration | ✅ |

### 1. SQL injection
**The attack:** in Vulnerable mode, sign in with username `' OR 1=1 --` and any password.
You're signed in as alice without knowing her password.

**Why it works:** the vulnerable login builds SQL by joining user input into the query text:
```csharp
"SELECT * FROM Users WHERE Username = '" + username + "' AND PasswordPlain = '" + password + "'"
```
The quote closes the username, `OR 1=1` makes the condition always true, and `--` comments out
the password check.

**The fix:** the secure login uses Entity Framework Core, which sends input as a **parameter**,
separate from the SQL command, so the database always treats it as data, never as code. It also
returns the same error for a wrong username or wrong password, so attackers can't find out which
usernames exist.

Code: `api/Controllers/Vulnerable/VulnerableAuthController.cs` vs `api/Controllers/Secure/SecureAuthController.cs`

### 2. Broken access control (IDOR)
**The attack:** sign in as alice, switch to Vulnerable mode, and open invoice `3`.
You see bob's confidential invoice just by changing the ID.

**Why it works:** the vulnerable endpoint checks that you're signed in, but never checks that
the invoice belongs to you.

**The fix:** the secure endpoint also checks `OwnerId == currentUserId` on every lookup. If the
invoice belongs to someone else, it returns **404 Not Found** rather than 403 Forbidden, so
attackers can't even learn which invoice IDs exist.

Code: `api/Controllers/Vulnerable/VulnerableInvoicesController.cs` vs `api/Controllers/Secure/SecureInvoicesController.cs`

### 3. Stored XSS
**The attack:** in Vulnerable mode, open one of your invoices and save this note:
```html
<img src=x onerror="alert('XSS: this code ran in your browser')">
```
A pop-up appears: the note ran as code in the browser.

**Why it works:** the vulnerable page renders notes with React's `dangerouslySetInnerHTML`, so saved
text is treated as real HTML. The image fails to load, which triggers `onerror` and runs the attacker's
code. It's "stored" XSS because the attack is saved in the database and runs for anyone who views
that invoice.

**The fix:** notes are rendered as plain text, which React escapes automatically, so HTML is displayed,
never executed. The server also limits notes to 500 characters as a second layer of defence. The session
cookie is HttpOnly, so even if a script did run, it couldn't read the session.

Code: `InvoiceNotes` in `web/src/App.tsx`, and the notes endpoints in both invoice controllers

### 4. Plain-text password storage
**The demo:** sign in, scroll down and click **Simulate a data breach** to see what an attacker gets
if the `Users` table leaks.

**The risk:** plain-text passwords let attackers sign in immediately, and try the same password on
victims' email, banking and other accounts, since people reuse passwords.

**The fix:** the secure login checks salted PBKDF2 hashes (ASP.NET Identity `PasswordHasher`).
- A hash can't be reversed into the password.
- A random salt makes identical passwords produce different hashes.
- Slow, repeated hashing makes guessing passwords expensive.

> Note: this demo database stores both versions of each password so the two modes can be compared.
> A real system would store only the hash. The breach simulator is only available in the Development
> environment and requires sign-in.

Code: `api/Controllers/DemoController.cs`, `api/Data/DbSeeder.cs`, `api/Controllers/Secure/SecureAuthController.cs`

### 5. Security misconfiguration
**The attack:** in the "security misconfiguration" panel, ask for your invoice total in an unsupported
currency like `XYZ`.

**Why it's dangerous:**
- **Leaky errors:** the vulnerable endpoint doesn't validate input, so it crashes and sends the raw
  exception to the browser: error type, stack trace with file paths, machine name and database name.
  Attackers use this to map out a system before attacking it.
- **Leaky headers:** vulnerable responses announce `Server: Kestrel` and `X-Powered-By: ASP.NET Core 8`,
  and send no protective headers.

**The fix:**
- **Validate input:** unsupported currencies get a clear `400 Bad Request` instead of a crash.
- **Global error handler:** anything unexpected is logged on the server; the browser only gets a generic
  message and a trace ID.
- **Security headers** on every secure API response, with no technology banners:

| Header | Value | Protects against |
|---|---|---|
| `X-Content-Type-Options` | `nosniff` | Browsers guessing file types |
| `X-Frame-Options` | `DENY` | Clickjacking (the page hidden inside another site) |
| `Referrer-Policy` | `no-referrer` | Leaking URLs to other sites |
| `Content-Security-Policy` | `default-src 'none'; frame-ancestors 'none'` | Loading unexpected content |
| `Cache-Control` | `no-store` | Private data being cached |

> In production, the website's HTML should also be served with a strict Content-Security-Policy such as
> `script-src 'self'`. That would block inline scripts like the XSS payload above, a second layer of defence.

Code: `api/Program.cs`, and the `summary` endpoints in both invoice controllers

## Continuous integration
Every push and pull request runs [GitHub Actions](.github/workflows/ci.yml) with two jobs:
- **Backend:** build the .NET solution and run all 27 security tests
- **Front end:** lint, run the Vitest tests, and build

If a security fix is ever removed by accident, a test fails and the build turns red.

## Dependency management
- [Dependabot](.github/dependabot.yml) checks .NET, npm and GitHub Actions dependencies weekly.
  Patch and minor updates arrive as **one grouped pull request per ecosystem**, tested by CI before merging.
  Major version upgrades are done deliberately by hand, since they can need code changes
  (for example, EF Core 9 requires .NET 9).
- **Dependabot alerts and security updates** are enabled, so known vulnerabilities are reported and patched
  separately from the routine update schedule.
- `npm audit` reports 7 moderate issues, all in the linter (`typescript-eslint` → `minimatch`), with no
  released fix yet. They affect only the development tooling, never the running app.
- `web/.npmrc` sets `legacy-peer-deps=true` to work around a known npm bug when installing Vitest 4.