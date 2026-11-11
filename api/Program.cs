using BreakItFixIt.Api.Data;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Diagnostics;
using Microsoft.EntityFrameworkCore;

var builder = WebApplication.CreateBuilder(args);

// Don't announce the web server software in every response ("Server: Kestrel").
builder.WebHost.ConfigureKestrel(options => options.AddServerHeader = false);

// Database: SQL Server through Entity Framework Core.
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseSqlServer(builder.Configuration.GetConnectionString("DefaultConnection")));

// Sign-in with secure, HttpOnly cookies (JavaScript can't read them).
builder.Services
    .AddAuthentication(CookieAuthenticationDefaults.AuthenticationScheme)
    .AddCookie(options =>
    {
        options.Cookie.Name = "bifi.session";
        options.Cookie.HttpOnly = true;
        options.Cookie.SameSite = SameSiteMode.Strict;
        options.ExpireTimeSpan = TimeSpan.FromHours(1);

        // This is an API: answer 401/403 instead of redirecting to a login page.
        options.Events.OnRedirectToLogin = ctx => { ctx.Response.StatusCode = 401; return Task.CompletedTask; };
        options.Events.OnRedirectToAccessDenied = ctx => { ctx.Response.StatusCode = 403; return Task.CompletedTask; };
    });
builder.Services.AddAuthorization();

builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

var app = builder.Build();

// FIX FOR VULNERABILITY 5 (error messages): one safe, global error handler.
// The full error is written to the server log; the browser only gets a generic
// message and a trace ID to quote to support. No stack traces, no file paths.
app.UseExceptionHandler(errorApp => errorApp.Run(async context =>
{
    var error = context.Features.Get<IExceptionHandlerFeature>()?.Error;
    app.Logger.LogError(error, "Unhandled error. Trace ID: {TraceId}", context.TraceIdentifier);

    context.Response.StatusCode = StatusCodes.Status500InternalServerError;
    await context.Response.WriteAsJsonAsync(new
    {
        message = "Something went wrong. Please try again.",
        traceId = context.TraceIdentifier,
    });
}));

// VULNERABILITY 5 (security headers): secure vs vulnerable responses.
// OnStarting runs just before the response is sent, so the headers survive
// even when the error handler above has to rewrite the response.
app.Use(async (context, next) =>
{
    var path = context.Request.Path;
    context.Response.OnStarting(() =>
    {
        var headers = context.Response.Headers;
        if (path.StartsWithSegments("/api/vulnerable"))
        {
            // ❌ Technology banners tell attackers exactly what to look up exploits for,
            // and there are no protective headers at all.
            headers["Server"] = "Kestrel";
            headers["X-Powered-By"] = "ASP.NET Core 8";
        }
        else if (path.StartsWithSegments("/api"))
        {
            // ✅ Protective headers on every secure API response.
            headers["X-Content-Type-Options"] = "nosniff";             // don't guess file types
            headers["X-Frame-Options"] = "DENY";                       // can't be embedded in a frame (clickjacking)
            headers["Referrer-Policy"] = "no-referrer";                // don't leak URLs to other sites
            headers["Content-Security-Policy"] = "default-src 'none'; frame-ancestors 'none'"; // API responses load nothing
            headers["Cache-Control"] = "no-store";                     // don't cache private invoice data
        }
        return Task.CompletedTask;
    });
    await next();
});

// Apply database migrations and add demo data on startup.
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    // SQL Server (the real app) uses migrations. The automated tests swap in a
    // throwaway in-memory SQLite database, which is simply created from the model.
    if (db.Database.IsSqlServer()) db.Database.Migrate();
    else db.Database.EnsureCreated();
    DbSeeder.Seed(db);
}

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();

app.Run();

// Lets the integration tests (Day 5) start this app in memory.
public partial class Program { }
