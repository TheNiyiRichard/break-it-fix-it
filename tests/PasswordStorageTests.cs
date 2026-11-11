using System.Net;
using System.Net.Http.Json;
using BreakItFixIt.Api.Data;
using BreakItFixIt.Api.Models;
using Microsoft.AspNetCore.Identity;
using Microsoft.Extensions.DependencyInjection;

namespace BreakItFixIt.Tests;

// Vulnerability 4: plain-text password storage
public class PasswordStorageTests : IClassFixture<TestAppFactory>
{
    private readonly TestAppFactory _app;

    public PasswordStorageTests(TestAppFactory app) => _app = app;

    private User GetUser(string username)
    {
        _app.NewClient(); // make sure the app (and its database) has started
        using var scope = _app.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        return db.Users.Single(u => u.Username == username);
    }

    [Fact]
    public void Hash_does_not_contain_the_password()
    {
        var alice = GetUser("alice");

        Assert.Equal("alice123", alice.PasswordPlain); // what a plain-text system leaks
        Assert.DoesNotContain("alice123", alice.PasswordHash);
        Assert.True(alice.PasswordHash.Length > 40);
    }

    [Fact]
    public void Hash_verifies_the_right_password_and_rejects_wrong_ones()
    {
        var alice = GetUser("alice");
        var hasher = new PasswordHasher<User>();

        Assert.NotEqual(PasswordVerificationResult.Failed, hasher.VerifyHashedPassword(alice, alice.PasswordHash, "alice123"));
        Assert.Equal(PasswordVerificationResult.Failed, hasher.VerifyHashedPassword(alice, alice.PasswordHash, "alice124"));
    }

    [Fact]
    public void Same_password_hashed_twice_gives_different_hashes_because_of_the_salt()
    {
        var hasher = new PasswordHasher<User>();
        var user = new User { Username = "test" };

        Assert.NotEqual(hasher.HashPassword(user, "same-password"), hasher.HashPassword(user, "same-password"));
    }

    [Fact]
    public async Task Breach_simulator_requires_sign_in()
    {
        var response = await _app.NewClient().GetAsync("/api/demo/breach");

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task Breach_simulator_shows_plain_text_leaks_and_hashed_leaks()
    {
        var alice = await _app.SignedInAs("alice", "alice123");

        var rows = await alice.GetFromJsonAsync<List<BreachRow>>("/api/demo/breach");

        var row = rows!.Single(r => r.Username == "alice");
        Assert.Equal("alice123", row.PlainTextLeak);
        Assert.DoesNotContain("alice123", row.HashedLeak);
    }

    private record BreachRow(string Username, string PlainTextLeak, string HashedLeak);
}
