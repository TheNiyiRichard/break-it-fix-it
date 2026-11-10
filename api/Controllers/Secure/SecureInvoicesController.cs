using System.Security.Claims;
using BreakItFixIt.Api.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace BreakItFixIt.Api.Controllers.Secure;

[ApiController]
[Authorize] // every endpoint here requires a signed-in user
[Route("api/secure/invoices")]
public class SecureInvoicesController : ControllerBase
{
    private readonly AppDbContext _db;
    public SecureInvoicesController(AppDbContext db) => _db = db;

    private int CurrentUserId => int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

    // Only ever returns the signed-in user's own invoices.
    [HttpGet]
    public async Task<IActionResult> GetMine()
    {
        var invoices = await _db.Invoices
            .Where(i => i.OwnerId == CurrentUserId)
            .Select(i => new { i.Id, i.ClientName, i.Amount, i.Paid, i.Notes })
            .ToListAsync();

        return Ok(invoices);
    }

    // FIX FOR VULNERABILITY 2: every lookup also checks ownership.
    // If the invoice exists but belongs to someone else, we answer 404 (not 403),
    // so attackers can't even learn which invoice IDs exist.
    [HttpGet("{id:int}")]
    public async Task<IActionResult> GetById(int id)
    {
        var invoice = await _db.Invoices
            .Where(i => i.Id == id && i.OwnerId == CurrentUserId)
            .Select(i => new { i.Id, i.ClientName, i.Amount, i.Paid, i.Notes, i.OwnerId })
            .SingleOrDefaultAsync();

        return invoice is null ? NotFound(new { message = "Invoice not found." }) : Ok(invoice);
    }

    // FIX FOR VULNERABILITY 5 (error messages):
    // 1. Validate input first, and answer bad input with a clear 400, not a crash.
    // 2. Anything unexpected is caught by the global error handler in Program.cs,
    //    which logs the details on the server and sends the browser only a generic
    //    message plus a trace ID that support can look up in the logs.
    [HttpGet("summary")]
    public async Task<IActionResult> Summary(string? currency = "CAD")
    {
        var code = (currency ?? "").Trim().ToUpperInvariant();
        if (!Models.DemoRates.FromCad.TryGetValue(code, out var rate))
        {
            return BadRequest(new { message = $"Unsupported currency. Use one of: {string.Join(", ", Models.DemoRates.FromCad.Keys)}." });
        }

        var amounts = await _db.Invoices.Where(i => i.OwnerId == CurrentUserId).Select(i => i.Amount).ToListAsync();
        return Ok(new { currency = code, total = Math.Round(amounts.Sum() * rate, 2), count = amounts.Count });
    }

    // Update the notes on one of YOUR invoices.
    // The XSS fix itself lives in the front end (notes are always shown as plain text),
    // but the server still validates input as a second layer of defence.
    [HttpPut("{id:int}/notes")]
    public async Task<IActionResult> UpdateNotes(int id, UpdateNotesRequest request)
    {
        var notes = request.Notes?.Trim() ?? "";
        if (notes.Length > 500)
            return BadRequest(new { message = "Notes must be 500 characters or fewer." });

        var invoice = await _db.Invoices.SingleOrDefaultAsync(i => i.Id == id && i.OwnerId == CurrentUserId);
        if (invoice is null) return NotFound(new { message = "Invoice not found." });

        invoice.Notes = notes;
        await _db.SaveChangesAsync();
        return Ok(new { invoice.Id, invoice.ClientName, invoice.Amount, invoice.Paid, invoice.Notes, invoice.OwnerId });
    }
}

public record UpdateNotesRequest(string? Notes);
