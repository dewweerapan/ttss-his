using Microsoft.EntityFrameworkCore;
using TtssHis.Shared.Constants;
using TtssHis.Shared.Entities.Billing;
using TtssHis.Shared.Entities.Core;
using TtssHis.Shared.Entities.Encounter;
using TtssHis.Shared.Entities.Insurance;
using TtssHis.Shared.Entities.Medical;
using TtssHis.Shared.Entities.Patient;
using TtssHis.Shared.Entities.Pharmacy;
using TtssHis.Shared.Entities.Product;
using TtssHis.Shared.Entities.Queue;

namespace TtssHis.Shared.DbContexts;

public sealed class HisDbContext(DbContextOptions<HisDbContext> options) : DbContext(options)
{
    // Core
    public DbSet<Role> Roles { get; set; } = null!;
    public DbSet<User> Users { get; set; } = null!;
    public DbSet<Division> Divisions { get; set; } = null!;
    public DbSet<Doctor> Doctors { get; set; } = null!;

    // Patient
    public DbSet<Patient> Patients { get; set; } = null!;
    public DbSet<PatientAddress> PatientAddresses { get; set; } = null!;
    public DbSet<PatientCoverage> PatientCoverages { get; set; } = null!;

    // Insurance
    public DbSet<Coverage> Coverages { get; set; } = null!;
    public DbSet<Payer> Payers { get; set; } = null!;

    // Encounter
    public DbSet<Encounter> Encounters { get; set; } = null!;
    public DbSet<Diagnosis> Diagnoses { get; set; } = null!;

    // Medical
    public DbSet<Icd10Category> Icd10Categories { get; set; } = null!;
    public DbSet<Icd10> Icd10s { get; set; } = null!;

    // Product
    public DbSet<Product> Products { get; set; } = null!;
    public DbSet<Pricing> Pricings { get; set; } = null!;

    // Phase 2
    public DbSet<QueueItem> QueueItems { get; set; } = null!;
    public DbSet<VitalSign> VitalSigns { get; set; } = null!;
    public DbSet<DrugOrder> DrugOrders { get; set; } = null!;
    public DbSet<DrugOrderItem> DrugOrderItems { get; set; } = null!;
    public DbSet<Invoice> Invoices { get; set; } = null!;
    public DbSet<InvoiceItem> InvoiceItems { get; set; } = null!;
    public DbSet<Receipt> Receipts { get; set; } = null!;

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // Indexes
        modelBuilder.Entity<Patient>(e =>
        {
            e.HasIndex(p => p.Hn).IsUnique();
            e.HasIndex(p => p.CitizenNo).IsUnique().HasFilter("\"CitizenNo\" IS NOT NULL AND \"DeletedDate\" IS NULL");
        });

        modelBuilder.Entity<User>(e =>
        {
            e.HasIndex(u => u.Username).IsUnique().HasFilter("\"DeletedDate\" IS NULL");
        });

        modelBuilder.Entity<Division>(e =>
        {
            e.HasIndex(d => d.Code).IsUnique().HasFilter("\"DeletedDate\" IS NULL");
        });

        modelBuilder.Entity<Encounter>(e =>
        {
            e.HasIndex(en => en.EncounterNo).IsUnique();
            e.HasIndex(en => en.PatientId);
            e.HasIndex(en => en.Status);
        });

        modelBuilder.Entity<Icd10>(e =>
        {
            e.HasIndex(i => i.Code).IsUnique();
        });

        modelBuilder.Entity<Product>(e =>
        {
            e.HasIndex(p => p.Code).IsUnique().HasFilter("\"DeletedDate\" IS NULL");
        });

        modelBuilder.Entity<QueueItem>(e =>
        {
            e.HasIndex(q => q.EncounterId).IsUnique();
            e.HasIndex(q => new { q.DivisionId, q.Status });
        });

        modelBuilder.Entity<DrugOrder>(e =>
        {
            e.HasIndex(o => o.OrderNo).IsUnique();
            e.HasIndex(o => new { o.EncounterId, o.Status });
        });

        modelBuilder.Entity<Invoice>(e =>
        {
            e.HasIndex(i => i.InvoiceNo).IsUnique();
            e.HasIndex(i => i.EncounterId).IsUnique();
        });

        modelBuilder.Entity<Receipt>(e =>
        {
            e.HasIndex(r => r.InvoiceId).IsUnique();
            e.HasIndex(r => r.ReceiptNo).IsUnique();
        });

        // Seed roles
        modelBuilder.Entity<Role>().HasData(
            new Role { Id = RoleConstants.RoleId.Doctor, Name = RoleConstants.Role.Doctor, Description = "แพทย์", CreatedDate = new DateTime(2026, 1, 1, 0, 0, 0, DateTimeKind.Utc) },
            new Role { Id = RoleConstants.RoleId.Nurse, Name = RoleConstants.Role.Nurse, Description = "พยาบาล", CreatedDate = new DateTime(2026, 1, 1, 0, 0, 0, DateTimeKind.Utc) },
            new Role { Id = RoleConstants.RoleId.Pharmacist, Name = RoleConstants.Role.Pharmacist, Description = "เภสัชกร", CreatedDate = new DateTime(2026, 1, 1, 0, 0, 0, DateTimeKind.Utc) },
            new Role { Id = RoleConstants.RoleId.Finance, Name = RoleConstants.Role.Finance, Description = "การเงิน", CreatedDate = new DateTime(2026, 1, 1, 0, 0, 0, DateTimeKind.Utc) }
        );
    }
}
