using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TtssHis.Database.Migrations.Migrations
{
    /// <inheritdoc />
    public partial class Phase3Ipd : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "DoctorOrders",
                columns: table => new
                {
                    Id = table.Column<string>(type: "text", nullable: false),
                    EncounterId = table.Column<string>(type: "text", nullable: false),
                    OrderType = table.Column<int>(type: "integer", nullable: false, comment: "MEDICATION=1, DIET=2, ACTIVITY=3, INVESTIGATION=4, PROCEDURE=5, OTHER=9"),
                    OrderContent = table.Column<string>(type: "text", nullable: false),
                    DoctorId = table.Column<string>(type: "text", nullable: true),
                    Status = table.Column<int>(type: "integer", nullable: false, comment: "ACTIVE=1, COMPLETED=2, CANCELLED=9"),
                    OrderDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    CompletedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    Notes = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_DoctorOrders", x => x.Id);
                    table.ForeignKey(
                        name: "FK_DoctorOrders_Encounters_EncounterId",
                        column: x => x.EncounterId,
                        principalTable: "Encounters",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                },
                comment: "คำสั่งแพทย์ (IPD)");

            migrationBuilder.CreateTable(
                name: "NursingNotes",
                columns: table => new
                {
                    Id = table.Column<string>(type: "text", nullable: false),
                    EncounterId = table.Column<string>(type: "text", nullable: false),
                    NoteType = table.Column<int>(type: "integer", nullable: false, comment: "ASSESSMENT=1, INTERVENTION=2, EVALUATION=3, PROGRESS=4"),
                    Content = table.Column<string>(type: "text", nullable: false),
                    RecordedBy = table.Column<string>(type: "text", nullable: true),
                    RecordedDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_NursingNotes", x => x.Id);
                    table.ForeignKey(
                        name: "FK_NursingNotes_Encounters_EncounterId",
                        column: x => x.EncounterId,
                        principalTable: "Encounters",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                },
                comment: "บันทึกการพยาบาล");

            migrationBuilder.CreateTable(
                name: "Wards",
                columns: table => new
                {
                    Id = table.Column<string>(type: "text", nullable: false),
                    Code = table.Column<string>(type: "text", nullable: false),
                    Name = table.Column<string>(type: "text", nullable: false),
                    Type = table.Column<int>(type: "integer", nullable: false, comment: "GENERAL=1, ICU=2, PEDIATRIC=3, SURGICAL=4, OB=5"),
                    TotalBeds = table.Column<int>(type: "integer", nullable: false),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false),
                    CreatedDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Wards", x => x.Id);
                },
                comment: "หอผู้ป่วย");

            migrationBuilder.CreateTable(
                name: "Beds",
                columns: table => new
                {
                    Id = table.Column<string>(type: "text", nullable: false),
                    BedNo = table.Column<string>(type: "text", nullable: false),
                    WardId = table.Column<string>(type: "text", nullable: false),
                    Status = table.Column<int>(type: "integer", nullable: false, comment: "AVAILABLE=1, OCCUPIED=2, MAINTENANCE=3"),
                    CurrentEncounterId = table.Column<string>(type: "text", nullable: true),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false),
                    CreatedDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Beds", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Beds_Encounters_CurrentEncounterId",
                        column: x => x.CurrentEncounterId,
                        principalTable: "Encounters",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_Beds_Wards_WardId",
                        column: x => x.WardId,
                        principalTable: "Wards",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                },
                comment: "เตียงผู้ป่วย");

            migrationBuilder.CreateIndex(
                name: "IX_Beds_CurrentEncounterId",
                table: "Beds",
                column: "CurrentEncounterId",
                unique: true,
                filter: "\"CurrentEncounterId\" IS NOT NULL");

            migrationBuilder.CreateIndex(
                name: "IX_Beds_WardId_BedNo",
                table: "Beds",
                columns: new[] { "WardId", "BedNo" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_DoctorOrders_EncounterId_Status",
                table: "DoctorOrders",
                columns: new[] { "EncounterId", "Status" });

            migrationBuilder.CreateIndex(
                name: "IX_NursingNotes_EncounterId_RecordedDate",
                table: "NursingNotes",
                columns: new[] { "EncounterId", "RecordedDate" });

            migrationBuilder.CreateIndex(
                name: "IX_Wards_Code",
                table: "Wards",
                column: "Code",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "Beds");

            migrationBuilder.DropTable(
                name: "DoctorOrders");

            migrationBuilder.DropTable(
                name: "NursingNotes");

            migrationBuilder.DropTable(
                name: "Wards");
        }
    }
}
