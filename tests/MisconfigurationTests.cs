using System.Net;
using System.Net.Http.Json;

namespace BreakItFixIt.Tests;

// Vulnerability 5: security misconfiguration (leaky errors and missing security headers)
public class MisconfigurationTests : IClassFixture<TestAppFactory>
{
    private readonly TestAppFactory _app;

    public MisconfigurationTests(TestAppFactory app) => _app = app;

    [Fact]
    public async Task Vulnerable_error_leaks_stack_trace_and_server_details()
    {
        var alice = await _app.SignedInAs("alice", "alice123");

        var response = await alice.GetAsync("/api/vulnerable/invoices/summary?currency=XYZ");
        var body = await response.Content.ReadAsStringAsync();

        Assert.Equal(HttpStatusCode.InternalServerError, response.StatusCode);
        Assert.Contains("stackTrace", body);
        Assert.Contains("KeyNotFoundException", body);
        Assert.Contains("machine", body);
    }

    [Fact]
    public async Task Secure_error_is_a_short_safe_message()
    {
        var alice = await _app.SignedInAs("alice", "alice123");

        var response = await alice.GetAsync("/api/secure/invoices/summary?currency=XYZ");
        var body = await response.Content.ReadAsStringAsync();

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.Contains("Unsupported currency", body);
        Assert.DoesNotContain("stackTrace", body);
        Assert.DoesNotContain("Exception", body);
    }

    [Fact]
    public async Task Secure_summary_converts_currency_correctly()
    {
        var alice = await _app.SignedInAs("alice", "alice123");

        var summary = await alice.GetFromJsonAsync<SummaryDto>("/api/secure/invoices/summary?currency=usd");

        // alice: 1250.00 + 480.50 = 1730.50 CAD; x 0.72 = 1245.96 USD
        Assert.Equal("USD", summary!.Currency);
        Assert.Equal(1245.96m, summary.Total);
        Assert.Equal(2, summary.Count);
    }

    [Theory]
    [InlineData("X-Content-Type-Options", "nosniff")]
    [InlineData("X-Frame-Options", "DENY")]
    [InlineData("Referrer-Policy", "no-referrer")]
    [InlineData("Cache-Control", "no-store")]
    public async Task Secure_responses_send_protective_headers(string header, string expected)
    {
        var alice = await _app.SignedInAs("alice", "alice123");

        var response = await alice.GetAsync("/api/secure/invoices");

        Assert.True(response.Headers.TryGetValues(header, out var values), $"Missing header {header}");
        Assert.Contains(expected, string.Join(",", values!));
    }

    [Fact]
    public async Task Secure_responses_send_a_content_security_policy()
    {
        var alice = await _app.SignedInAs("alice", "alice123");

        var response = await alice.GetAsync("/api/secure/invoices");

        Assert.True(response.Content.Headers.Contains("Content-Security-Policy")
                    || response.Headers.Contains("Content-Security-Policy"));
    }

    [Fact]
    public async Task Secure_responses_do_not_reveal_the_technology()
    {
        var alice = await _app.SignedInAs("alice", "alice123");

        var response = await alice.GetAsync("/api/secure/invoices");

        Assert.False(response.Headers.Contains("Server"));
        Assert.False(response.Headers.Contains("X-Powered-By"));
    }

    [Fact]
    public async Task Vulnerable_responses_reveal_the_technology_and_skip_protection()
    {
        var alice = await _app.SignedInAs("alice", "alice123");

        var response = await alice.GetAsync("/api/vulnerable/invoices");

        Assert.True(response.Headers.Contains("X-Powered-By"));
        Assert.False(response.Headers.Contains("X-Content-Type-Options"));
        Assert.False(response.Headers.Contains("X-Frame-Options"));
    }

    private record SummaryDto(string Currency, decimal Total, int Count);
}
