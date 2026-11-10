namespace BreakItFixIt.Api.Models;

// Fixed, made-up exchange rates for the demo (invoice amounts are in CAD).
// A real app would load current rates from a trusted provider.
public static class DemoRates
{
    public static readonly IReadOnlyDictionary<string, decimal> FromCad = new Dictionary<string, decimal>
    {
        ["CAD"] = 1.00m,
        ["USD"] = 0.72m,
        ["EUR"] = 0.66m,
    };
}
