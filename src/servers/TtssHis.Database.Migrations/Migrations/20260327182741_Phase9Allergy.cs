using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TtssHis.Database.Migrations.Migrations
{
    /// <inheritdoc />
    public partial class Phase9Allergy : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "Allergy",
                table: "Patients",
                type: "text",
                nullable: true,
                comment: "แพ้ยา / แพ้สาร (ชื่อยาหรือสารคั่นด้วยจุลภาค)");

            migrationBuilder.AddColumn<string>(
                name: "AllergyNote",
                table: "Patients",
                type: "text",
                nullable: true,
                comment: "รายละเอียดอาการแพ้");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Allergy",
                table: "Patients");

            migrationBuilder.DropColumn(
                name: "AllergyNote",
                table: "Patients");
        }
    }
}
