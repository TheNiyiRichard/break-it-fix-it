using System.Net.Http.Json;
using BreakItFixIt.Api.Data;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace BreakItFixIt.Tests;

// Starts the real API in memory for the tests.
// The only change: SQL Server is swapped for a throwaway in-memory SQLite database,
// so the tests run anywhere (your laptop or GitHub) with no database to install.
// Each test class gets its own fresh copy, seeded with alice, bob and their invoices.
public class TestAppFactory : WebApplicationFactory<Program>
{
    private readonly SqliteConnection _connection = new("DataSource=:memory:");

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseEnvironment("Development"); // the breach demo only exists in Development

        _connection.Open(); // an in-memory SQLite database lives as long as its connection is open

        builder.ConfigureServices(services =>
        {
            services.RemoveAll<DbContextOptions<AppDbContext>>();
            services.AddDbContext<AppDbContext>(options => options.UseSqlite(_connection));
        });
    }

    // A client that keeps cookies, like a browser, so sign-in sessions carry over between requests.
    public HttpClient NewClient() => CreateClient(new WebApplicationFactoryClientOptions { HandleCookies = true });

    public async Task<HttpClient> SignedInAs(string username, string password)
    {
        var client = NewClient();
        var response = await client.PostAsJsonAsync("/api/secure/auth/login", new { username, password });
        response.EnsureSuccessStatusCode();
        return client;
    }

    protected override void Dispose(bool disposing)
    {
        base.Dispose(disposing);
        if (disposing) _connection.Dispose();
    }
}

internal static class ServiceCollectionExtensions
{
    public static void RemoveAll<T>(this IServiceCollection services)
    {
        foreach (var descriptor in services.Where(d => d.ServiceType == typeof(T)).ToList())
            services.Remove(descriptor);
    }
}
