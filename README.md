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
| 3 | Stored XSS | A03: Injection | ⏳ |
| 4 | Plain-text password storage | A02: Cryptographic Failures | ⏳ |
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

## Coming next
- Stored XSS and the fix (safe rendering and a Content Security Policy)
- Hashed vs plain-text passwords
- Security misconfiguration (error handling and security headers)
- Automated tests proving each attack succeeds on the vulnerable version and fails on the secure one
- CI with GitHub Actions