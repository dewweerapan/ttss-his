using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TtssHis.Database.Migrations.Migrations
{
    /// <inheritdoc />
    public partial class Phase15DentalClaims : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "DentalRecords",
                columns: table => new
                {
                    Id = table.Column<string>(type: "text", nullable: false),
                    EncounterId = table.Column<string>(type: "text", nullable: false),
                    ProcedureType = table.Column<int>(type: "integer", nullable: false, comment: "CHECKUP=1, FILLING=2, EXTRACTION=3, RCT=4, SCALING=5, DENTURE=6, ORTHODONTICS=7, SURGERY=8, OTHER=9"),
                    ToothNumbers = table.Column<string>(type: "text", nullable: true),
                    ChiefComplaint = table.Column<string>(type: "text", nullable: true),
                    Findings = table.Column<string>(type: "text", nullable: true),
                    Treatment = table.Column<string>(type: "text", nullable: true),
                    Materials = table.Column<string>(type: "text", nullable: true),
                    DentistName = table.Column<string>(type: "text", nullable: true),
                    NextAppointment = table.Column<string>(type: "text", nullable: true),
                    VisitDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_DentalRecords", x => x.Id);
                    table.ForeignKey(
                        name: "FK_DentalRecords_Encounters_EncounterId",
                        column: x => x.EncounterId,
                        principalTable: "Encounters",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                },
                comment: "บันทึกทันตกรรม");

            migrationBuilder.CreateTable(
                name: "InsuranceClaims",
                columns: table => new
                {
                    Id = table.Column<string>(type: "text", nullable: false),
                    EncounterId = table.Column<string>(type: "text", nullable: false),
                    CoverageId = table.Column<string>(type: "text", nullable: true),
                    ClaimNo = table.Column<string>(type: "text", nullable: true),
                    ClaimAmount = table.Column<decimal>(type: "numeric", nullable: false),
                    ApprovedAmount = table.Column<decimal>(type: "numeric", nullable: true),
                    Status = table.Column<int>(type: "integer", nullable: false, comment: "DRAFT=1, SUBMITTED=2, APPROVED=3, REJECTED=4, PAID=5"),
                    RejectionReason = table.Column<string>(type: "text", nullable: true),
                    ClaimDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    SubmittedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    ProcessedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    Notes = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_InsuranceClaims", x => x.Id);
                    table.ForeignKey(
                        name: "FK_InsuranceClaims_Encounters_EncounterId",
                        column: x => x.EncounterId,
                        principalTable: "Encounters",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                },
                comment: "การเรียกเก็บเงินจากประกัน/สิทธิ์");

            migrationBuilder.CreateIndex(
                name: "IX_DentalRecords_EncounterId",
                table: "DentalRecords",
                column: "EncounterId");

            migrationBuilder.CreateIndex(
                name: "IX_InsuranceClaims_EncounterId",
                table: "InsuranceClaims",
                column: "EncounterId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "DentalRecords");

            migrationBuilder.DropTable(
                name: "InsuranceClaims");
        }
    }
}
