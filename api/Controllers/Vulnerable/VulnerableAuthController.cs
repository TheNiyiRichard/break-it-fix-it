using System.Security.Claims;
using BreakItFixIt.Api.Controllers.Secure;
using BreakItFixIt.Api.Data;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace BreakItFixIt.Api.Controllers.Vulnerable;

// ⚠️ INTENTIONALLY INSECURE. For local demos only. Never deploy.
[ApiController]
[Route("api/vulnerable/auth")]
public class VulnerableAuthController : ControllerBase
{
    private readonly AppDbContext _db;
    public VulnerableAuthController(AppDbContext db) => _db = db;

    // VULNERABILITY 1: SQL INJECTION
    // The username and password are pasted straight into the SQL text.
    // If someone types SQL into the username box, the database runs it.
    //
    // Try this attack in the username box (any password):
    //     ' OR 1=1 --
    // The query becomes:
    //     SELECT * FROM Users WHERE Username = '' OR 1=1 --' AND PasswordPlain = '...'
    // "OR 1=1" is always true, and "--" turns the password check into a comment,
    // so the database returns every user and we sign in as the first one (alice).
    [HttpPost("login")]
    public async Task<IActionResult> Login(LoginRequest request)
    {
        var sql = "SELECT * FROM Users WHERE Username = '" + request.Username +
                  "' AND PasswordPlain = '" + request.Password + "'";

        // ToListAsync runs the raw SQL exactly as written (no extra wrapping).
        var users = await _db.Users.FromSqlRaw(sql).ToListAsync();
        var user = users.FirstOrDefault();

        if (user is null) return Unauthorized(new { message = "Invalid username or password." });

        var claims = new List<Claim>
        {
            new(ClaimTypes.NameIdentifier, user.Id.ToString()),
            new(ClaimTypes.Name, user.Username),
        };
        var identity = new ClaimsIdentity(claims, CookieAuthenticationDefaults.AuthenticationScheme);
        await HttpContext.SignInAsync(CookieAuthenticationDefaults.AuthenticationScheme, new ClaimsPrincipal(identity));

        return Ok(new { id = user.Id, username = user.Username });
    }

    [HttpPost("logout")]
    public async Task<IActionResult> Logout()
    {
        await HttpContext.SignOutAsync(CookieAuthenticationDefaults.AuthenticationScheme);
        return NoContent();
    }

    [Authorize]
    [HttpGet("me")]
    public IActionResult Me() => Ok(new
    {
        id = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!),
        username = User.Identity!.Name,
    });
}
