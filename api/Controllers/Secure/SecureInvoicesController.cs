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
}
