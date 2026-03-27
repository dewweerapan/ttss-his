using Microsoft.EntityFrameworkCore;
using TtssHis.Shared.Entities.Billing;
using TtssHis.Shared.Entities.Core;
using TtssHis.Shared.Entities.Ipd;
using TtssHis.Shared.Entities.Medical;
using TtssHis.Shared.Entities.Pharmacy;
using TtssHis.Shared.Entities.Queue;

namespace TtssHis.Shared.Entities.Encounter;

[Comment("Visit ผู้ป่วย (OPD/IPD)")]
public sealed class Encounter
{
    public required string Id { get; set; }

    [Comment("เลข Visit (running number)")]
    public required string EncounterNo { get; set; }

    public required string PatientId { get; set; }
    public Patient.Patient? Patient { get; set; }

    [Comment("ประเภท: OPD=1, IPD=2, ER=3, SS=4")]
    public int Type { get; set; } = 1;

    [Comment("สถานะ: OPEN=1, ADMITTED=2, DISCHARGED=3, CLOSED=4, CANCELED=9")]
    public int Status { get; set; } = 1;

    public required string DivisionId { get; set; }
    public Division? Division { get; set; }

    public string? DoctorId { get; set; }
    public Doctor? Doctor { get; set; }

    [Comment("อาการสำคัญ")]
    public string? ChiefComplaint { get; set; }

    public DateTime AdmissionDate { get; set; }
    public DateTime? DischargeDate { get; set; }

    [Comment("เตียง (สำหรับ IPD)")]
    public string? BedNumber { get; set; }

    public bool IsActive { get; set; } = true;
    public string? CreatedBy { get; set; }
    public string? UpdatedBy { get; set; }
    public DateTime CreatedDate { get; set; }
    public DateTime? LastUpdatedDate { get; set; }
    public DateTime? DeletedDate { get; set; }

    public ICollection<Diagnosis> Diagnoses { get; set; } = [];

    // Phase 2 navigation properties
    public QueueItem? QueueItem { get; set; }
    public ICollection<VitalSign> VitalSigns { get; set; } = [];
    public ICollection<DrugOrder> DrugOrders { get; set; } = [];
    public Invoice? Invoice { get; set; }

    // Phase 3 navigation properties
    public ICollection<NursingNote> NursingNotes { get; set; } = [];
    public ICollection<DoctorOrder> DoctorOrders { get; set; } = [];

    // Phase 4 navigation properties
    public Er.ErTriage? ErTriage { get; set; }

    // Phase 5 navigation properties
    public ICollection<Lab.LabOrder> LabOrders { get; set; } = [];
}
