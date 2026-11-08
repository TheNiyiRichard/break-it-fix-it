using BreakItFixIt.Api.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace BreakItFixIt.Api.Controllers;

// VULNERABILITY 4: PLAIN-TEXT PASSWORD STORAGE
//
// This is a teaching tool, not part of either app mode. It simulates a data breach:
// "if an attacker stole the Users table, what would they get?"
//
// - A system that stores passwords in plain text (what the vulnerable login checks)
//   leaks every real password. Attackers can sign in immediately, and try the same
//   password on the victim's email, bank and other sites.
// - A system that stores salted hashes (what the secure login checks) leaks only
//   hashes. A hash can't be reversed into the password, and the random salt means
//   two people with the same password still get different hashes.
//
// It only exists in the Development environment, and still requires sign-in.
[ApiController]
[Authorize]
[Route("api/demo")]
public class DemoController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly IWebHostEnvironment _env;

    public DemoController(AppDbContext db, IWebHostEnvironment env)
    {
        _db = db;
        _env = env;
    }

    [HttpGet("breach")]
    public async Task<IActionResult> SimulateBreach()
    {
        if (!_env.IsDevelopment()) return NotFound();

        var rows = await _db.Users
            .OrderBy(u => u.Id)
            .Select(u => new
            {
                u.Username,
                plainTextLeak = u.PasswordPlain,
                hashedLeak = u.PasswordHash,
            })
            .ToListAsync();

        return Ok(rows);
    }
}
