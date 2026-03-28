using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TtssHis.Database.Migrations.Migrations
{
    /// <inheritdoc />
    public partial class Phase16Pathology : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "PathologyOrders",
                columns: table => new
                {
                    Id = table.Column<string>(type: "text", nullable: false),
                    EncounterId = table.Column<string>(type: "text", nullable: false),
                    SpecimenType = table.Column<int>(type: "integer", nullable: false, comment: "BIOPSY=1, HISTOLOGY=2, CYTOLOGY=3, FROZEN_SECTION=4, AUTOPSY=5, OTHER=9"),
                    SpecimenSite = table.Column<string>(type: "text", nullable: false),
                    ClinicalInfo = table.Column<string>(type: "text", nullable: true),
                    OrderedBy = table.Column<string>(type: "text", nullable: true),
                    Status = table.Column<int>(type: "integer", nullable: false, comment: "ORDERED=1, RECEIVED=2, PROCESSING=3, REPORTED=4, CANCELLED=9"),
                    OrderDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    ReceivedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    ReportedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    MacroscopicFindings = table.Column<string>(type: "text", nullable: true),
                    MicroscopicFindings = table.Column<string>(type: "text", nullable: true),
                    Diagnosis = table.Column<string>(type: "text", nullable: true),
                    PathologistName = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PathologyOrders", x => x.Id);
                    table.ForeignKey(
                        name: "FK_PathologyOrders_Encounters_EncounterId",
                        column: x => x.EncounterId,
                        principalTable: "Encounters",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                },
                comment: "คำสั่งส่งตรวจชิ้นเนื้อ/พยาธิวิทยา");

            migrationBuilder.CreateIndex(
                name: "IX_PathologyOrders_EncounterId",
                table: "PathologyOrders",
                column: "EncounterId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "PathologyOrders");
        }
    }
}
