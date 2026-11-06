using System.Security.Claims;
using BreakItFixIt.Api.Data;
using BreakItFixIt.Api.Models;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace BreakItFixIt.Api.Controllers.Secure;

public record LoginRequest(string Username, string Password);

[ApiController]
[Route("api/secure/auth")]
public class SecureAuthController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly PasswordHasher<User> _hasher = new();

    public SecureAuthController(AppDbContext db) => _db = db;

    [HttpPost("login")]
    public async Task<IActionResult> Login(LoginRequest request)
    {
        // EF Core turns this into a parameterized query, so user input
        // is always treated as data, never as SQL. (Fix for Vulnerability 1.)
        var user = await _db.Users.SingleOrDefaultAsync(u => u.Username == request.Username);

        // Compare against the hash, never the plain password.
        var valid = user is not null &&
            _hasher.VerifyHashedPassword(user, user.PasswordHash, request.Password)
                != PasswordVerificationResult.Failed;

        // Same message for "no such user" and "wrong password",
        // so attackers can't discover which usernames exist.
        if (!valid) return Unauthorized(new { message = "Invalid username or password." });

        var claims = new List<Claim>
        {
            new(ClaimTypes.NameIdentifier, user!.Id.ToString()),
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
