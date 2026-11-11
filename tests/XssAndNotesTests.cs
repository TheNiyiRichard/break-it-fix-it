using System.Net;
using System.Net.Http.Json;

namespace BreakItFixIt.Tests;

// Vulnerability 3: stored XSS (server side).
// The main XSS fix is in the front end (notes shown as text). See web/src/InvoiceNotes.test.tsx.
// These tests cover the server-side rules around saving notes.
public class XssAndNotesTests : IClassFixture<TestAppFactory>
{
    private const string XssPayload = "<img src=x onerror=\"alert('XSS')\">";
    private readonly TestAppFactory _app;

    public XssAndNotesTests(TestAppFactory app) => _app = app;

    [Fact]
    public async Task Vulnerable_endpoint_stores_any_length_of_notes()
    {
        var alice = await _app.SignedInAs("alice", "alice123");

        var response = await alice.PutAsJsonAsync("/api/vulnerable/invoices/1/notes", new { notes = new string('a', 2000) });

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    [Fact]
    public async Task Secure_endpoint_rejects_notes_over_500_characters()
    {
        var alice = await _app.SignedInAs("alice", "alice123");

        var response = await alice.PutAsJsonAsync("/api/secure/invoices/1/notes", new { notes = new string('a', 501) });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task Secure_endpoint_returns_notes_as_data_for_the_front_end_to_escape()
    {
        var alice = await _app.SignedInAs("alice", "alice123");

        var response = await alice.PutAsJsonAsync("/api/secure/invoices/2/notes", new { notes = XssPayload });

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var invoice = await response.Content.ReadFromJsonAsync<NotesDto>();
        Assert.Equal(XssPayload, invoice!.Notes); // stored as plain text, never run on the server
    }

    [Fact]
    public async Task Nobody_can_edit_another_users_notes_in_either_mode()
    {
        var alice = await _app.SignedInAs("alice", "alice123");

        var vulnerable = await alice.PutAsJsonAsync("/api/vulnerable/invoices/3/notes", new { notes = XssPayload });
        var secure = await alice.PutAsJsonAsync("/api/secure/invoices/3/notes", new { notes = XssPayload });

        Assert.Equal(HttpStatusCode.NotFound, vulnerable.StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, secure.StatusCode);
    }

    private record NotesDto(int Id, string Notes);
}
