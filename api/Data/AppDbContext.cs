using BreakItFixIt.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace BreakItFixIt.Api.Data;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

    public DbSet<User> Users => Set<User>();
    public DbSet<Invoice> Invoices => Set<Invoice>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<User>().HasIndex(u => u.Username).IsUnique();

        modelBuilder.Entity<Invoice>()
            .Property(i => i.Amount)
            .HasPrecision(18, 2); // money: exact decimals, never float

        modelBuilder.Entity<Invoice>()
            .HasOne(i => i.Owner)
            .WithMany(u => u.Invoices)
            .HasForeignKey(i => i.OwnerId);
    }
}
