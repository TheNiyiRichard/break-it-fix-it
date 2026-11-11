using System.Net;
using System.Net.Http.Json;

namespace BreakItFixIt.Tests;

// Vulnerability 2: broken access control (IDOR)
// Seed data: invoices 1-2 belong to alice, invoices 3-4 belong to bob.
public class AccessControlTests : IClassFixture<TestAppFactory>
{
    private const int BobsInvoiceId = 3;
    private readonly TestAppFactory _app;

    public AccessControlTests(TestAppFactory app) => _app = app;

    [Fact]
    public async Task Vulnerable_endpoint_shows_alice_bobs_invoice()
    {
        var alice = await _app.SignedInAs("alice", "alice123");

        var response = await alice.GetAsync($"/api/vulnerable/invoices/{BobsInvoiceId}");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var invoice = await response.Content.ReadFromJsonAsync<InvoiceDto>();
        Assert.Equal("Red River Dental", invoice!.ClientName); // bob's confidential client
    }

    [Fact]
    public async Task Secure_endpoint_hides_bobs_invoice_from_alice()
    {
        var alice = await _app.SignedInAs("alice", "alice123");

        var response = await alice.GetAsync($"/api/secure/invoices/{BobsInvoiceId}");

        // 404, not 403: alice can't even tell that invoice 3 exists.
        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [Fact]
    public async Task Secure_endpoint_still_shows_alice_her_own_invoice()
    {
        var alice = await _app.SignedInAs("alice", "alice123");

        var response = await alice.GetAsync("/api/secure/invoices/1");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    [Fact]
    public async Task Invoices_require_sign_in()
    {
        var response = await _app.NewClient().GetAsync("/api/secure/invoices");

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    private record InvoiceDto(int Id, string ClientName, decimal Amount, bool Paid, string Notes, int OwnerId);
}
