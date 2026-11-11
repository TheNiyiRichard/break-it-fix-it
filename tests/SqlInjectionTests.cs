using System.Net;
using System.Net.Http.Json;

namespace BreakItFixIt.Tests;

// Vulnerability 1: SQL injection
public class SqlInjectionTests : IClassFixture<TestAppFactory>
{
    private const string Payload = "' OR 1=1 --";
    private readonly TestAppFactory _app;

    public SqlInjectionTests(TestAppFactory app) => _app = app;

    [Fact]
    public async Task Vulnerable_login_lets_an_attacker_in_without_a_password()
    {
        var response = await _app.NewClient().PostAsJsonAsync("/api/vulnerable/auth/login",
            new { username = Payload, password = "not-the-password" });

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var user = await response.Content.ReadFromJsonAsync<UserDto>();
        Assert.Equal("alice", user!.Username); // signed in as the first user in the table
    }

    [Fact]
    public async Task Secure_login_rejects_the_same_injection()
    {
        var response = await _app.NewClient().PostAsJsonAsync("/api/secure/auth/login",
            new { username = Payload, password = "not-the-password" });

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task Secure_login_still_works_with_the_real_password()
    {
        var response = await _app.NewClient().PostAsJsonAsync("/api/secure/auth/login",
            new { username = "alice", password = "alice123" });

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    [Fact]
    public async Task Secure_login_gives_the_same_error_for_unknown_users_and_wrong_passwords()
    {
        var unknownUser = await _app.NewClient().PostAsJsonAsync("/api/secure/auth/login",
            new { username = "nobody", password = "whatever" });
        var wrongPassword = await _app.NewClient().PostAsJsonAsync("/api/secure/auth/login",
            new { username = "alice", password = "wrong" });

        Assert.Equal(HttpStatusCode.Unauthorized, unknownUser.StatusCode);
        Assert.Equal(await unknownUser.Content.ReadAsStringAsync(), await wrongPassword.Content.ReadAsStringAsync());
    }

    private record UserDto(int Id, string Username);
}
