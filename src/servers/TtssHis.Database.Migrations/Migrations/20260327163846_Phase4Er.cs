using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TtssHis.Database.Migrations.Migrations
{
    /// <inheritdoc />
    public partial class Phase4Er : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "ErTriages",
                columns: table => new
                {
                    Id = table.Column<string>(type: "text", nullable: false),
                    EncounterId = table.Column<string>(type: "text", nullable: false),
                    Severity = table.Column<int>(type: "integer", nullable: false, comment: "ระดับความเร่งด่วน: P1=Critical=1, P2=Urgent=2, P3=SemiUrgent=3, P4=NonUrgent=4"),
                    ArrivalMode = table.Column<int>(type: "integer", nullable: false, comment: "วิธีมาถึง: WALK=1, AMBULANCE=2, REFER=3, OTHER=9"),
                    TriageNotes = table.Column<string>(type: "text", nullable: true),
                    TriageBy = table.Column<string>(type: "text", nullable: true),
                    TriageTime = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    Disposition = table.Column<int>(type: "integer", nullable: true, comment: "การส่งต่อ: DISCHARGE=1, ADMIT=2, REFER=3, DECEASED=9"),
                    DispositionTime = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ErTriages", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ErTriages_Encounters_EncounterId",
                        column: x => x.EncounterId,
                        principalTable: "Encounters",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                },
                comment: "การคัดกรองผู้ป่วยฉุกเฉิน");

            migrationBuilder.CreateIndex(
                name: "IX_ErTriages_EncounterId",
                table: "ErTriages",
                column: "EncounterId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_ErTriages_Severity_TriageTime",
                table: "ErTriages",
                columns: new[] { "Severity", "TriageTime" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "ErTriages");
        }
    }
}
