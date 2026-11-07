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
}
