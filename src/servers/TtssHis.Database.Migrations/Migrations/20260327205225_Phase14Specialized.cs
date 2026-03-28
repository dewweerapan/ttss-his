using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TtssHis.Database.Migrations.Migrations
{
    /// <inheritdoc />
    public partial class Phase14Specialized : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "DialysisSessions",
                columns: table => new
                {
                    Id = table.Column<string>(type: "text", nullable: false),
                    EncounterId = table.Column<string>(type: "text", nullable: false),
                    DialysisType = table.Column<int>(type: "integer", nullable: false, comment: "HD=1, HDF=2, CRRT=3, PD=4"),
                    MachineNo = table.Column<string>(type: "text", nullable: true),
                    Status = table.Column<int>(type: "integer", nullable: false, comment: "SCHEDULED=1, IN_PROGRESS=2, COMPLETED=3, CANCELLED=9"),
                    ScheduledAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    StartedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    EndedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    PreWeight = table.Column<decimal>(type: "numeric", nullable: true),
                    PostWeight = table.Column<decimal>(type: "numeric", nullable: true),
                    UfGoal = table.Column<decimal>(type: "numeric", nullable: true),
                    UfAchieved = table.Column<decimal>(type: "numeric", nullable: true),
                    AccessType = table.Column<string>(type: "text", nullable: true),
                    Complications = table.Column<string>(type: "text", nullable: true),
                    Notes = table.Column<string>(type: "text", nullable: true),
                    NurseId = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_DialysisSessions", x => x.Id);
                    table.ForeignKey(
                        name: "FK_DialysisSessions_Encounters_EncounterId",
                        column: x => x.EncounterId,
                        principalTable: "Encounters",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                },
                comment: "บันทึกการฟอกไต");

            migrationBuilder.CreateTable(
                name: "TreatmentRecords",
                columns: table => new
                {
                    Id = table.Column<string>(type: "text", nullable: false),
                    EncounterId = table.Column<string>(type: "text", nullable: false),
                    TreatmentType = table.Column<int>(type: "integer", nullable: false, comment: "WOUND_CARE=1, IV_INFUSION=2, PHYSIOTHERAPY=3, INJECTION=4, DRESSING=5, OTHER=9"),
                    Description = table.Column<string>(type: "text", nullable: false),
                    Materials = table.Column<string>(type: "text", nullable: true),
                    PerformedBy = table.Column<string>(type: "text", nullable: true),
                    Status = table.Column<int>(type: "integer", nullable: false, comment: "PENDING=1, COMPLETED=2, CANCELLED=9"),
                    ScheduledAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    CompletedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    OutcomeNotes = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_TreatmentRecords", x => x.Id);
                    table.ForeignKey(
                        name: "FK_TreatmentRecords_Encounters_EncounterId",
                        column: x => x.EncounterId,
                        principalTable: "Encounters",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                },
                comment: "บันทึกการรักษาในห้องทำหัตถการ");

            migrationBuilder.CreateIndex(
                name: "IX_DialysisSessions_EncounterId",
                table: "DialysisSessions",
                column: "EncounterId");

            migrationBuilder.CreateIndex(
                name: "IX_TreatmentRecords_EncounterId",
                table: "TreatmentRecords",
                column: "EncounterId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "DialysisSessions");

            migrationBuilder.DropTable(
                name: "TreatmentRecords");
        }
    }
}
