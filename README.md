# Break It, Fix It

An OWASP Top 10 showcase: one small invoice portal built twice, once with classic security
vulnerabilities and once with each one fixed, plus automated tests that prove each fix works.

>⚠️ Warning: This project contains intentionally vulnerable code for learning purposes. Run it on your own computer only, and never deploy the vulnerable mode to a public server.

## Stack
- ASP.NET Core 8 Web API, Entity Framework Core, SQL Server
- React + TypeScript (Vite)
- xUnit integration tests, GitHub Actions CI

## Run locally
1. Set your SQL Server connection string in `api/appsettings.json`.
2. API: `cd api` → `dotnet run` (http://localhost:5080, Swagger at /swagger)
3. Web: `cd web` → `npm install` → `npm run dev` (http://localhost:5173)

Demo users: `alice / alice123`, `bob / bob123`

## Vulnerabilities (in progress)
| # | Vulnerability | Status |
|---|---|---|
| 1 | SQL injection | ⏳ |
| 2 | Broken access control (IDOR) | ⏳ |
| 3 | Stored XSS | ⏳ |
| 4 | Plain-text password storage | ⏳ |
| 5 | Security misconfiguration | ⏳ |
