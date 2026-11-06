namespace BreakItFixIt.Api.Models;

public class User
{
    public int Id { get; set; }
    public string Username { get; set; } = "";

    // VULNERABLE (demo only): the password stored as plain text.
    // We keep it so we can show why this is dangerous in Vulnerability 4.
    public string PasswordPlain { get; set; } = "";

    // SECURE: a salted hash of the password. The real password is never stored.
    public string PasswordHash { get; set; } = "";

    public List<Invoice> Invoices { get; set; } = new();
}
