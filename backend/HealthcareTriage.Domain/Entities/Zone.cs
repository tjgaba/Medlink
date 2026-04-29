namespace HealthcareTriage.Domain.Entities;

public sealed class Zone
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;

    public ICollection<Zone> AdjacentZones { get; set; } = new List<Zone>();
    public ICollection<Zone> AdjacentToZones { get; set; } = new List<Zone>();
    public ICollection<Staff> StaffMembers { get; set; } = new List<Staff>();
    public ICollection<Case> Cases { get; set; } = new List<Case>();
}
