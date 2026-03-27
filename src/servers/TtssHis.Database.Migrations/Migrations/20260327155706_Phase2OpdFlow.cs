using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TtssHis.Database.Migrations.Migrations
{
    /// <inheritdoc />
    public partial class Phase2OpdFlow : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "DrugOrders",
                columns: table => new
                {
                    Id = table.Column<string>(type: "text", nullable: false),
                    OrderNo = table.Column<string>(type: "text", nullable: false, comment: "Running number: RXyyyyMMddNNNNN"),
                    EncounterId = table.Column<string>(type: "text", nullable: false),
                    DoctorId = table.Column<string>(type: "text", nullable: true),
                    Status = table.Column<int>(type: "integer", nullable: false, comment: "PENDING=1, VERIFIED=2, DISPENSED=3, CANCELED=9"),
                    OrderDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    VerifiedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    DispensedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    Notes = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_DrugOrders", x => x.Id);
                    table.ForeignKey(
                        name: "FK_DrugOrders_Encounters_EncounterId",
                        column: x => x.EncounterId,
                        principalTable: "Encounters",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                },
                comment: "ใบสั่งยา");

            migrationBuilder.CreateTable(
                name: "Invoices",
                columns: table => new
                {
                    Id = table.Column<string>(type: "text", nullable: false),
                    InvoiceNo = table.Column<string>(type: "text", nullable: false, comment: "Running number: INVyyyyMMddNNNNN"),
                    EncounterId = table.Column<string>(type: "text", nullable: false),
                    Status = table.Column<int>(type: "integer", nullable: false, comment: "PENDING=1, PAID=2, CANCELED=9"),
                    TotalAmount = table.Column<decimal>(type: "numeric", nullable: false),
                    IssuedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    PaidAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Invoices", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Invoices_Encounters_EncounterId",
                        column: x => x.EncounterId,
                        principalTable: "Encounters",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                },
                comment: "ใบแจ้งหนี้");

            migrationBuilder.CreateTable(
                name: "QueueItems",
                columns: table => new
                {
                    Id = table.Column<string>(type: "text", nullable: false),
                    QueueNo = table.Column<string>(type: "text", nullable: false, comment: "หมายเลขคิว เช่น A001"),
                    EncounterId = table.Column<string>(type: "text", nullable: false),
                    DivisionId = table.Column<string>(type: "text", nullable: false),
                    Status = table.Column<int>(type: "integer", nullable: false, comment: "WAITING=1, CALLED=2, SERVING=3, DONE=4, SKIPPED=5"),
                    CreatedDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    CalledAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    ServedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    DoneAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_QueueItems", x => x.Id);
                    table.ForeignKey(
                        name: "FK_QueueItems_Encounters_EncounterId",
                        column: x => x.EncounterId,
                        principalTable: "Encounters",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                },
                comment: "คิวผู้ป่วย OPD");

            migrationBuilder.CreateTable(
                name: "VitalSigns",
                columns: table => new
                {
                    Id = table.Column<string>(type: "text", nullable: false),
                    EncounterId = table.Column<string>(type: "text", nullable: false),
                    Temperature = table.Column<decimal>(type: "numeric", nullable: true, comment: "อุณหภูมิ องศาเซลเซียส"),
                    PulseRate = table.Column<int>(type: "integer", nullable: true, comment: "ชีพจร ครั้ง/นาที"),
                    RespiratoryRate = table.Column<int>(type: "integer", nullable: true, comment: "อัตราการหายใจ ครั้ง/นาที"),
                    BloodPressureSystolic = table.Column<int>(type: "integer", nullable: true, comment: "ความดันโลหิต Systolic"),
                    BloodPressureDiastolic = table.Column<int>(type: "integer", nullable: true, comment: "ความดันโลหิต Diastolic"),
                    OxygenSaturation = table.Column<int>(type: "integer", nullable: true, comment: "ความอิ่มตัวออกซิเจน %"),
                    Weight = table.Column<decimal>(type: "numeric", nullable: true, comment: "น้ำหนัก กก."),
                    Height = table.Column<decimal>(type: "numeric", nullable: true, comment: "ส่วนสูง ซม."),
                    RecordedBy = table.Column<string>(type: "text", nullable: true),
                    RecordedDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_VitalSigns", x => x.Id);
                    table.ForeignKey(
                        name: "FK_VitalSigns_Encounters_EncounterId",
                        column: x => x.EncounterId,
                        principalTable: "Encounters",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                },
                comment: "สัญญาณชีพ (บันทึกโดยพยาบาล)");

            migrationBuilder.CreateTable(
                name: "DrugOrderItems",
                columns: table => new
                {
                    Id = table.Column<string>(type: "text", nullable: false),
                    DrugOrderId = table.Column<string>(type: "text", nullable: false),
                    ProductId = table.Column<string>(type: "text", nullable: false),
                    Quantity = table.Column<int>(type: "integer", nullable: false),
                    Frequency = table.Column<string>(type: "text", nullable: false),
                    DurationDays = table.Column<int>(type: "integer", nullable: false),
                    Instruction = table.Column<string>(type: "text", nullable: true),
                    Unit = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_DrugOrderItems", x => x.Id);
                    table.ForeignKey(
                        name: "FK_DrugOrderItems_DrugOrders_DrugOrderId",
                        column: x => x.DrugOrderId,
                        principalTable: "DrugOrders",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_DrugOrderItems_Products_ProductId",
                        column: x => x.ProductId,
                        principalTable: "Products",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "InvoiceItems",
                columns: table => new
                {
                    Id = table.Column<string>(type: "text", nullable: false),
                    InvoiceId = table.Column<string>(type: "text", nullable: false),
                    ProductId = table.Column<string>(type: "text", nullable: true),
                    DrugOrderItemId = table.Column<string>(type: "text", nullable: true),
                    Description = table.Column<string>(type: "text", nullable: false),
                    Quantity = table.Column<int>(type: "integer", nullable: false),
                    UnitPrice = table.Column<decimal>(type: "numeric", nullable: false),
                    TotalPrice = table.Column<decimal>(type: "numeric", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_InvoiceItems", x => x.Id);
                    table.ForeignKey(
                        name: "FK_InvoiceItems_Invoices_InvoiceId",
                        column: x => x.InvoiceId,
                        principalTable: "Invoices",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_InvoiceItems_Products_ProductId",
                        column: x => x.ProductId,
                        principalTable: "Products",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateTable(
                name: "Receipts",
                columns: table => new
                {
                    Id = table.Column<string>(type: "text", nullable: false),
                    ReceiptNo = table.Column<string>(type: "text", nullable: false, comment: "Running number: RCyyyyMMddNNNNN"),
                    InvoiceId = table.Column<string>(type: "text", nullable: false),
                    PaymentMethod = table.Column<int>(type: "integer", nullable: false, comment: "CASH=1, CARD=2, TRANSFER=3"),
                    Amount = table.Column<decimal>(type: "numeric", nullable: false),
                    PaidAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Receipts", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Receipts_Invoices_InvoiceId",
                        column: x => x.InvoiceId,
                        principalTable: "Invoices",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                },
                comment: "ใบเสร็จรับเงิน");

            migrationBuilder.CreateIndex(
                name: "IX_DrugOrderItems_DrugOrderId",
                table: "DrugOrderItems",
                column: "DrugOrderId");

            migrationBuilder.CreateIndex(
                name: "IX_DrugOrderItems_ProductId",
                table: "DrugOrderItems",
                column: "ProductId");

            migrationBuilder.CreateIndex(
                name: "IX_DrugOrders_EncounterId_Status",
                table: "DrugOrders",
                columns: new[] { "EncounterId", "Status" });

            migrationBuilder.CreateIndex(
                name: "IX_DrugOrders_OrderNo",
                table: "DrugOrders",
                column: "OrderNo",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_InvoiceItems_InvoiceId",
                table: "InvoiceItems",
                column: "InvoiceId");

            migrationBuilder.CreateIndex(
                name: "IX_InvoiceItems_ProductId",
                table: "InvoiceItems",
                column: "ProductId");

            migrationBuilder.CreateIndex(
                name: "IX_Invoices_EncounterId",
                table: "Invoices",
                column: "EncounterId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Invoices_InvoiceNo",
                table: "Invoices",
                column: "InvoiceNo",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_QueueItems_DivisionId_Status",
                table: "QueueItems",
                columns: new[] { "DivisionId", "Status" });

            migrationBuilder.CreateIndex(
                name: "IX_QueueItems_EncounterId",
                table: "QueueItems",
                column: "EncounterId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Receipts_InvoiceId",
                table: "Receipts",
                column: "InvoiceId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Receipts_ReceiptNo",
                table: "Receipts",
                column: "ReceiptNo",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_VitalSigns_EncounterId",
                table: "VitalSigns",
                column: "EncounterId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "DrugOrderItems");

            migrationBuilder.DropTable(
                name: "InvoiceItems");

            migrationBuilder.DropTable(
                name: "QueueItems");

            migrationBuilder.DropTable(
                name: "Receipts");

            migrationBuilder.DropTable(
                name: "VitalSigns");

            migrationBuilder.DropTable(
                name: "DrugOrders");

            migrationBuilder.DropTable(
                name: "Invoices");
        }
    }
}
