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
}
