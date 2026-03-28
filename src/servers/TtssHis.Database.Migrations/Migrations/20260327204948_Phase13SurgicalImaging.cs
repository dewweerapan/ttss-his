using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TtssHis.Database.Migrations.Migrations
{
    /// <inheritdoc />
    public partial class Phase13SurgicalImaging : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "BloodRequests",
                columns: table => new
                {
                    Id = table.Column<string>(type: "text", nullable: false),
                    EncounterId = table.Column<string>(type: "text", nullable: false),
                    BloodProduct = table.Column<int>(type: "integer", nullable: false, comment: "WHOLE=1, PACKED_RBC=2, FFP=3, PLATELET=4, CRYOPRECIPITATE=5"),
                    BloodGroup = table.Column<string>(type: "text", nullable: false),
                    Units = table.Column<decimal>(type: "numeric", nullable: false),
                    CrossmatchResult = table.Column<string>(type: "text", nullable: true),
                    RequestedBy = table.Column<string>(type: "text", nullable: true),
                    Status = table.Column<int>(type: "integer", nullable: false, comment: "PENDING=1, CROSSMATCH=2, READY=3, TRANSFUSED=4, CANCELLED=9"),
                    RequestDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    TransfusedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    TransfusionNotes = table.Column<string>(type: "text", nullable: true),
                    ReactionNotes = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_BloodRequests", x => x.Id);
                    table.ForeignKey(
                        name: "FK_BloodRequests_Encounters_EncounterId",
                        column: x => x.EncounterId,
                        principalTable: "Encounters",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                },
                comment: "คำขอโลหิต");

            migrationBuilder.CreateTable(
                name: "ImagingOrders",
                columns: table => new
                {
                    Id = table.Column<string>(type: "text", nullable: false),
                    EncounterId = table.Column<string>(type: "text", nullable: false),
                    ModalityType = table.Column<int>(type: "integer", nullable: false, comment: "XRAY=1, CT=2, MRI=3, ULTRASOUND=4, NUCLEAR=5, OTHER=9"),
                    StudyName = table.Column<string>(type: "text", nullable: false),
                    ClinicalInfo = table.Column<string>(type: "text", nullable: true),
                    OrderedBy = table.Column<string>(type: "text", nullable: true),
                    Status = table.Column<int>(type: "integer", nullable: false, comment: "ORDERED=1, SCHEDULED=2, IN_PROGRESS=3, COMPLETED=4, CANCELLED=9"),
                    OrderDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    CompletedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    RadiologyReport = table.Column<string>(type: "text", nullable: true),
                    RadiologistName = table.Column<string>(type: "text", nullable: true),
                    Impression = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ImagingOrders", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ImagingOrders_Encounters_EncounterId",
                        column: x => x.EncounterId,
                        principalTable: "Encounters",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                },
                comment: "คำสั่งถ่ายภาพรังสี");

            migrationBuilder.CreateTable(
                name: "SurgeryCases",
                columns: table => new
                {
                    Id = table.Column<string>(type: "text", nullable: false),
                    EncounterId = table.Column<string>(type: "text", nullable: false),
                    ProcedureName = table.Column<string>(type: "text", nullable: false),
                    OperatingRoom = table.Column<string>(type: "text", nullable: true),
                    Status = table.Column<int>(type: "integer", nullable: false, comment: "SCHEDULED=1, IN_PROGRESS=2, COMPLETED=3, CANCELLED=9"),
                    ScheduledAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    StartedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    EndedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    SurgeonId = table.Column<string>(type: "text", nullable: true),
                    SurgeonName = table.Column<string>(type: "text", nullable: true),
                    AnesthesiaType = table.Column<string>(type: "text", nullable: true),
                    AnesthesiologistName = table.Column<string>(type: "text", nullable: true),
                    PreOpDiagnosis = table.Column<string>(type: "text", nullable: true),
                    PostOpDiagnosis = table.Column<string>(type: "text", nullable: true),
                    OperativeNotes = table.Column<string>(type: "text", nullable: true),
                    CreatedDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_SurgeryCases", x => x.Id);
                    table.ForeignKey(
                        name: "FK_SurgeryCases_Encounters_EncounterId",
                        column: x => x.EncounterId,
                        principalTable: "Encounters",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                },
                comment: "ตารางผ่าตัด");

            migrationBuilder.CreateIndex(
                name: "IX_BloodRequests_EncounterId",
                table: "BloodRequests",
                column: "EncounterId");

            migrationBuilder.CreateIndex(
                name: "IX_ImagingOrders_EncounterId",
                table: "ImagingOrders",
                column: "EncounterId");

            migrationBuilder.CreateIndex(
                name: "IX_SurgeryCases_EncounterId",
                table: "SurgeryCases",
                column: "EncounterId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "BloodRequests");

            migrationBuilder.DropTable(
                name: "ImagingOrders");

            migrationBuilder.DropTable(
                name: "SurgeryCases");
        }
    }
}
