namespace BreakItFixIt.Api.Models;

public class Invoice
{
    public int Id { get; set; }
    public string ClientName { get; set; } = "";
    public decimal Amount { get; set; }
    public bool Paid { get; set; }

    // Free-text notes. Used later to demonstrate stored XSS (Vulnerability 3).
    public string Notes { get; set; } = "";

    // Who owns this invoice. Used later for broken access control (Vulnerability 2).
    public int OwnerId { get; set; }
    public User? Owner { get; set; }
}
