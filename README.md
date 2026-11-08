# Break It, Fix It

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

The database, tables and demo data are created automatically on first run.

Demo users: `alice / alice123`, `bob / bob123`

## Vulnerabilities
| # | Vulnerability | OWASP Top 10 (2021) | Status |
|---|---|---|---|
| 1 | SQL injection | A03: Injection | ✅ |
| 2 | Broken access control (IDOR) | A01: Broken Access Control | ✅ |
| 3 | Stored XSS | A03: Injection | ✅ |
| 4 | Plain-text password storage | A02: Cryptographic Failures | ✅ |
| 5 | Security misconfiguration | A05: Security Misconfiguration | ⏳ |

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

## Coming next
- Security misconfiguration: detailed error pages vs safe errors, plus security headers including a
  Content Security Policy
- Automated tests proving each attack succeeds on the vulnerable version and fails on the secure one
- CI with GitHub Actions