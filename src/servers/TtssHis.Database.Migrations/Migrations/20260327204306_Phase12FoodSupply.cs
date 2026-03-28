using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TtssHis.Database.Migrations.Migrations
{
    /// <inheritdoc />
    public partial class Phase12FoodSupply : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "DietOrders",
                columns: table => new
                {
                    Id = table.Column<string>(type: "text", nullable: false),
                    EncounterId = table.Column<string>(type: "text", nullable: false),
                    DietType = table.Column<int>(type: "integer", nullable: false, comment: "REGULAR=1, SOFT=2, LIQUID=3, DIABETIC=4, LOW_SALT=5, OTHER=9"),
                    Meal = table.Column<int>(type: "integer", nullable: false, comment: "ALL=1, BREAKFAST=2, LUNCH=3, DINNER=4"),
                    Notes = table.Column<string>(type: "text", nullable: true),
                    Status = table.Column<int>(type: "integer", nullable: false, comment: "ACTIVE=1, CANCELLED=9"),
                    OrderDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    OrderedBy = table.Column<string>(type: "text", nullable: true),
                    CancelledAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_DietOrders", x => x.Id);
                    table.ForeignKey(
                        name: "FK_DietOrders_Encounters_EncounterId",
                        column: x => x.EncounterId,
                        principalTable: "Encounters",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                },
                comment: "คำสั่งอาหารผู้ป่วยใน");

            migrationBuilder.CreateTable(
                name: "SupplyRequests",
                columns: table => new
                {
                    Id = table.Column<string>(type: "text", nullable: false),
                    EncounterId = table.Column<string>(type: "text", nullable: false),
                    ItemName = table.Column<string>(type: "text", nullable: false),
                    ProductId = table.Column<string>(type: "text", nullable: true),
                    Quantity = table.Column<int>(type: "integer", nullable: false),
                    Notes = table.Column<string>(type: "text", nullable: true),
                    Status = table.Column<int>(type: "integer", nullable: false, comment: "REQUESTED=1, DISPENSED=2, CANCELLED=9"),
                    RequestDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    RequestedBy = table.Column<string>(type: "text", nullable: true),
                    DispensedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    DispensedBy = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_SupplyRequests", x => x.Id);
                    table.ForeignKey(
                        name: "FK_SupplyRequests_Encounters_EncounterId",
                        column: x => x.EncounterId,
                        principalTable: "Encounters",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                },
                comment: "คำขอเวชภัณฑ์/อุปกรณ์ประจำหอผู้ป่วย");

            migrationBuilder.CreateIndex(
                name: "IX_DietOrders_EncounterId",
                table: "DietOrders",
                column: "EncounterId");

            migrationBuilder.CreateIndex(
                name: "IX_SupplyRequests_EncounterId",
                table: "SupplyRequests",
                column: "EncounterId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "DietOrders");

            migrationBuilder.DropTable(
                name: "SupplyRequests");
        }
    }
}
