using System.Security.Claims;
using BreakItFixIt.Api.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace BreakItFixIt.Api.Controllers.Vulnerable;

// ⚠️ INTENTIONALLY INSECURE. For local demos only. Never deploy.
[ApiController]
[Authorize]
[Route("api/vulnerable/invoices")]
public class VulnerableInvoicesController : ControllerBase
{
    private readonly AppDbContext _db;
    public VulnerableInvoicesController(AppDbContext db) => _db = db;

    private int CurrentUserId => int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

    // The list itself only shows your own invoices, so the app *looks* safe...
    [HttpGet]
    public async Task<IActionResult> GetMine()
    {
        var invoices = await _db.Invoices
            .Where(i => i.OwnerId == CurrentUserId)
            .Select(i => new { i.Id, i.ClientName, i.Amount, i.Paid, i.Notes })
            .ToListAsync();

        return Ok(invoices);
    }

    // VULNERABILITY 2: BROKEN ACCESS CONTROL (IDOR: Insecure Direct Object Reference)
    // You must be signed in, but the code never checks that the invoice is YOURS.
    // Signed in as alice, request /api/vulnerable/invoices/3 and you get bob's
    // confidential invoice, just by changing the number.
    [HttpGet("{id:int}")]
    public async Task<IActionResult> GetById(int id)
    {
        var invoice = await _db.Invoices
            .Where(i => i.Id == id) // ❌ missing: && i.OwnerId == CurrentUserId
            .Select(i => new { i.Id, i.ClientName, i.Amount, i.Paid, i.Notes, i.OwnerId })
            .SingleOrDefaultAsync();

        return invoice is null ? NotFound(new { message = "Invoice not found." }) : Ok(invoice);
    }

    // VULNERABILITY 5: SECURITY MISCONFIGURATION (leaky error messages)
    // Total of your invoices, converted to another currency.
    // There's no input validation, so an unknown currency like "XYZ" crashes the code,
    // and the error handler sends the full internal details back to the browser:
    // exception type, stack trace (with file paths), machine name and database name.
    // Attackers use this to map out your system before attacking it.
    [HttpGet("summary")]
    public async Task<IActionResult> Summary(string currency = "CAD")
    {
        try
        {
            var amounts = await _db.Invoices.Where(i => i.OwnerId == CurrentUserId).Select(i => i.Amount).ToListAsync();
            var rate = Models.DemoRates.FromCad[currency.ToUpperInvariant()]; // ❌ throws for unknown currencies
            return Ok(new { currency = currency.ToUpperInvariant(), total = Math.Round(amounts.Sum() * rate, 2), count = amounts.Count });
        }
        catch (Exception ex)
        {
            var connection = _db.Database.GetDbConnection();
            return StatusCode(500, new
            {
                error = ex.GetType().FullName,
                message = ex.Message,
                stackTrace = ex.StackTrace,
                machine = Environment.MachineName,
                database = $"{connection.DataSource} / {connection.Database}",
                runtime = $".NET {Environment.Version}",
            });
        }
    }

    // Saves whatever text it's given, HTML and all, with no limits.
    // On its own that's not the bug: the damage happens when the front end
    // renders these notes as HTML (Vulnerability 3, stored XSS).
    // Ownership IS checked here, so this endpoint only demonstrates XSS, not IDOR.
    [HttpPut("{id:int}/notes")]
    public async Task<IActionResult> UpdateNotes(int id, Secure.UpdateNotesRequest request)
    {
        var invoice = await _db.Invoices.SingleOrDefaultAsync(i => i.Id == id && i.OwnerId == CurrentUserId);
        if (invoice is null) return NotFound(new { message = "Invoice not found." });

        invoice.Notes = request.Notes ?? "";
        await _db.SaveChangesAsync();
        return Ok(new { invoice.Id, invoice.ClientName, invoice.Amount, invoice.Paid, invoice.Notes, invoice.OwnerId });
    }
}
