using BreakItFixIt.Api.Models;
using Microsoft.AspNetCore.Identity;

namespace BreakItFixIt.Api.Data;

// Fills an empty database with two demo users and some invoices,
// so there is something to attack (and protect) right away.
public static class DbSeeder
{
    public static void Seed(AppDbContext db)
    {
        if (db.Users.Any()) return; // already seeded

        var hasher = new PasswordHasher<User>();

        var alice = new User { Username = "alice", PasswordPlain = "alice123" };
        alice.PasswordHash = hasher.HashPassword(alice, "alice123");

        var bob = new User { Username = "bob", PasswordPlain = "bob123" };
        bob.PasswordHash = hasher.HashPassword(bob, "bob123");

        alice.Invoices.AddRange(new[]
        {
            new Invoice { ClientName = "Maple Bakery", Amount = 1250.00m, Paid = true,  Notes = "Website redesign" },
            new Invoice { ClientName = "Prairie Fitness", Amount = 480.50m, Paid = false, Notes = "Monthly maintenance" },
        });

        bob.Invoices.AddRange(new[]
        {
            new Invoice { ClientName = "Red River Dental", Amount = 3200.00m, Paid = false, Notes = "Confidential: booking system build" },
            new Invoice { ClientName = "Assiniboine Books", Amount = 760.25m, Paid = true, Notes = "Online store setup" },
        });

        db.Users.AddRange(alice, bob);
        db.SaveChanges();
    }
}
