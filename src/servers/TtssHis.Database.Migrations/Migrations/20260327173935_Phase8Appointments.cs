using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TtssHis.Database.Migrations.Migrations
{
    /// <inheritdoc />
    public partial class Phase8Appointments : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "Appointments",
                columns: table => new
                {
                    Id = table.Column<string>(type: "text", nullable: false),
                    PatientId = table.Column<string>(type: "text", nullable: false),
                    DoctorId = table.Column<string>(type: "text", nullable: true),
                    DivisionId = table.Column<string>(type: "text", nullable: false),
                    ScheduledDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    TimeSlot = table.Column<int>(type: "integer", nullable: false, comment: "ช่วงเวลา: MORNING=1, AFTERNOON=2, EVENING=3"),
                    AppointmentType = table.Column<int>(type: "integer", nullable: false, comment: "ประเภทนัด: FOLLOW_UP=1, NEW=2, PROCEDURE=3, LAB=4, OTHER=9"),
                    Purpose = table.Column<string>(type: "text", nullable: true),
                    Notes = table.Column<string>(type: "text", nullable: true),
                    Status = table.Column<int>(type: "integer", nullable: false, comment: "SCHEDULED=1, CONFIRMED=2, ARRIVED=3, COMPLETED=4, CANCELLED=9, NO_SHOW=8"),
                    CreatedBy = table.Column<string>(type: "text", nullable: true),
                    CreatedDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    CancelledDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    CancelReason = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Appointments", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Appointments_Divisions_DivisionId",
                        column: x => x.DivisionId,
                        principalTable: "Divisions",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_Appointments_Doctors_DoctorId",
                        column: x => x.DoctorId,
                        principalTable: "Doctors",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_Appointments_Patients_PatientId",
                        column: x => x.PatientId,
                        principalTable: "Patients",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                },
                comment: "การนัดหมายผู้ป่วย");

            migrationBuilder.CreateIndex(
                name: "IX_Appointments_DivisionId_ScheduledDate_Status",
                table: "Appointments",
                columns: new[] { "DivisionId", "ScheduledDate", "Status" });

            migrationBuilder.CreateIndex(
                name: "IX_Appointments_DoctorId_ScheduledDate",
                table: "Appointments",
                columns: new[] { "DoctorId", "ScheduledDate" });

            migrationBuilder.CreateIndex(
                name: "IX_Appointments_PatientId_ScheduledDate",
                table: "Appointments",
                columns: new[] { "PatientId", "ScheduledDate" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "Appointments");
        }
    }
}
