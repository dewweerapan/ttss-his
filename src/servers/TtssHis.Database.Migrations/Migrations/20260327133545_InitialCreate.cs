using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

#pragma warning disable CA1814 // Prefer jagged arrays over multidimensional

namespace TtssHis.Database.Migrations.Migrations
{
    /// <inheritdoc />
    public partial class InitialCreate : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "Coverages",
                columns: table => new
                {
                    Id = table.Column<string>(type: "text", nullable: false),
                    Code = table.Column<string>(type: "text", nullable: false),
                    Name = table.Column<string>(type: "text", nullable: false),
                    NameEn = table.Column<string>(type: "text", nullable: true),
                    Type = table.Column<int>(type: "integer", nullable: false, comment: "ประเภทสิทธิ: GOVERNMENT=1, PRIVATE=2, SELF_PAY=3, EMPLOYEE=4"),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false),
                    CreatedDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    DeletedDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Coverages", x => x.Id);
                },
                comment: "สิทธิการรักษา");

            migrationBuilder.CreateTable(
                name: "Divisions",
                columns: table => new
                {
                    Id = table.Column<string>(type: "text", nullable: false, comment: "รหัสแผนก (UUID)"),
                    Code = table.Column<string>(type: "text", nullable: false, comment: "รหัสย่อแผนก เช่น OPD, LAB"),
                    Name = table.Column<string>(type: "text", nullable: false, comment: "ชื่อแผนก (ไทย)"),
                    NameEn = table.Column<string>(type: "text", nullable: true, comment: "ชื่อแผนก (อังกฤษ)"),
                    Type = table.Column<int>(type: "integer", nullable: false, comment: "ประเภท: OPD=1, IPD=2, ER=3, PHARMACY=4, LAB=5, BILLING=6, OTHER=9"),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false),
                    CreatedDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    DeletedDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Divisions", x => x.Id);
                },
                comment: "แผนก/หน่วยงาน");

            migrationBuilder.CreateTable(
                name: "Doctors",
                columns: table => new
                {
                    Id = table.Column<string>(type: "text", nullable: false, comment: "รหัสแพทย์ (UUID)"),
                    LicenseNumber = table.Column<string>(type: "text", nullable: true, comment: "รหัสใบประกอบวิชาชีพ"),
                    PreName = table.Column<string>(type: "text", nullable: true, comment: "คำนำหน้า (ไทย)"),
                    FirstName = table.Column<string>(type: "text", nullable: false, comment: "ชื่อ (ไทย)"),
                    LastName = table.Column<string>(type: "text", nullable: false, comment: "นามสกุล (ไทย)"),
                    PreNameEn = table.Column<string>(type: "text", nullable: true, comment: "คำนำหน้า (อังกฤษ)"),
                    FirstNameEn = table.Column<string>(type: "text", nullable: true, comment: "ชื่อ (อังกฤษ)"),
                    LastNameEn = table.Column<string>(type: "text", nullable: true, comment: "นามสกุล (อังกฤษ)"),
                    Gender = table.Column<int>(type: "integer", nullable: false, comment: "เพศ: M=1, F=2"),
                    Specialty = table.Column<string>(type: "text", nullable: true, comment: "ความเชี่ยวชาญ"),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false),
                    CreatedBy = table.Column<string>(type: "text", nullable: true),
                    CreatedDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    DeletedDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Doctors", x => x.Id);
                },
                comment: "แพทย์");

            migrationBuilder.CreateTable(
                name: "Icd10Categories",
                columns: table => new
                {
                    Id = table.Column<string>(type: "text", nullable: false),
                    Code = table.Column<string>(type: "text", nullable: false),
                    Name = table.Column<string>(type: "text", nullable: false),
                    NameEn = table.Column<string>(type: "text", nullable: true),
                    ParentId = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Icd10Categories", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Icd10Categories_Icd10Categories_ParentId",
                        column: x => x.ParentId,
                        principalTable: "Icd10Categories",
                        principalColumn: "Id");
                },
                comment: "หมวดหมู่ ICD-10");

            migrationBuilder.CreateTable(
                name: "Patients",
                columns: table => new
                {
                    Id = table.Column<string>(type: "text", nullable: false, comment: "รหัสผู้ป่วย (UUID)"),
                    Hn = table.Column<string>(type: "text", nullable: false, comment: "หมายเลขผู้ป่วย HN"),
                    PreName = table.Column<string>(type: "text", nullable: true, comment: "คำนำหน้า (ไทย)"),
                    FirstName = table.Column<string>(type: "text", nullable: false, comment: "ชื่อ (ไทย)"),
                    LastName = table.Column<string>(type: "text", nullable: false, comment: "นามสกุล (ไทย)"),
                    PreNameEn = table.Column<string>(type: "text", nullable: true, comment: "คำนำหน้า (อังกฤษ)"),
                    FirstNameEn = table.Column<string>(type: "text", nullable: true, comment: "ชื่อ (อังกฤษ)"),
                    LastNameEn = table.Column<string>(type: "text", nullable: true, comment: "นามสกุล (อังกฤษ)"),
                    Gender = table.Column<int>(type: "integer", nullable: false, comment: "เพศ: M=1, F=2, U=3"),
                    Birthdate = table.Column<DateOnly>(type: "date", nullable: true, comment: "วันเกิด"),
                    CitizenType = table.Column<string>(type: "text", nullable: false, comment: "ประเภทบัตร: T=ไทย, F=ต่างชาติ, A=ไม่มีสัญชาติ, N=ไม่มีบัตร"),
                    CitizenNo = table.Column<string>(type: "text", nullable: true, comment: "เลขบัตรประชาชน 13 หลัก"),
                    PassportNo = table.Column<string>(type: "text", nullable: true, comment: "เลขพาสปอร์ต"),
                    BloodGroup = table.Column<string>(type: "text", nullable: true, comment: "กรุ๊ปเลือด"),
                    NationalityCode = table.Column<string>(type: "text", nullable: false, comment: "สัญชาติ รหัส 3 หลัก (099 = ไทย)"),
                    Religion = table.Column<string>(type: "text", nullable: true, comment: "ศาสนา"),
                    Occupation = table.Column<string>(type: "text", nullable: true, comment: "อาชีพ"),
                    PhoneNumber = table.Column<string>(type: "text", nullable: true, comment: "เบอร์โทรศัพท์"),
                    IsAlive = table.Column<bool>(type: "boolean", nullable: false),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false),
                    CreatedBy = table.Column<string>(type: "text", nullable: true),
                    UpdatedBy = table.Column<string>(type: "text", nullable: true),
                    CreatedDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    LastUpdatedDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    DeletedDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Patients", x => x.Id);
                },
                comment: "ข้อมูลผู้ป่วย");

            migrationBuilder.CreateTable(
                name: "Products",
                columns: table => new
                {
                    Id = table.Column<string>(type: "text", nullable: false),
                    Code = table.Column<string>(type: "text", nullable: false),
                    Name = table.Column<string>(type: "text", nullable: false),
                    NameEn = table.Column<string>(type: "text", nullable: true),
                    Type = table.Column<int>(type: "integer", nullable: false, comment: "ประเภท: MEDICINE=1, SERVICE=2, SUPPLY=3, EQUIPMENT=4, PACKAGE=5"),
                    Unit = table.Column<string>(type: "text", nullable: true, comment: "หน่วย เช่น เม็ด, ขวด, ครั้ง"),
                    IsBillable = table.Column<bool>(type: "boolean", nullable: false),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false),
                    CreatedDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    DeletedDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Products", x => x.Id);
                },
                comment: "สินค้า/บริการ (ยา, หัตถการ, Supplies)");

            migrationBuilder.CreateTable(
                name: "Roles",
                columns: table => new
                {
                    Id = table.Column<string>(type: "text", nullable: false, comment: "รหัสบทบาท"),
                    Name = table.Column<string>(type: "text", nullable: false, comment: "ชื่อบทบาท"),
                    Description = table.Column<string>(type: "text", nullable: true, comment: "รายละเอียด"),
                    CreatedDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    DeletedDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Roles", x => x.Id);
                },
                comment: "บทบาทผู้ใช้งาน");

            migrationBuilder.CreateTable(
                name: "Payers",
                columns: table => new
                {
                    Id = table.Column<string>(type: "text", nullable: false),
                    Code = table.Column<string>(type: "text", nullable: false),
                    Name = table.Column<string>(type: "text", nullable: false),
                    CoverageId = table.Column<string>(type: "text", nullable: true),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false),
                    CreatedDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    DeletedDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Payers", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Payers_Coverages_CoverageId",
                        column: x => x.CoverageId,
                        principalTable: "Coverages",
                        principalColumn: "Id");
                },
                comment: "ผู้รับผิดชอบค่าใช้จ่าย (บริษัทประกัน / ภาครัฐ)");

            migrationBuilder.CreateTable(
                name: "Icd10s",
                columns: table => new
                {
                    Id = table.Column<string>(type: "text", nullable: false),
                    Code = table.Column<string>(type: "text", nullable: false, comment: "รหัส เช่น A00, J18.9"),
                    Name = table.Column<string>(type: "text", nullable: false, comment: "ชื่อโรค (ไทย)"),
                    NameEn = table.Column<string>(type: "text", nullable: true, comment: "ชื่อโรค (อังกฤษ)"),
                    CategoryId = table.Column<string>(type: "text", nullable: true),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Icd10s", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Icd10s_Icd10Categories_CategoryId",
                        column: x => x.CategoryId,
                        principalTable: "Icd10Categories",
                        principalColumn: "Id");
                },
                comment: "รหัส ICD-10 วินิจฉัยโรค");

            migrationBuilder.CreateTable(
                name: "Encounters",
                columns: table => new
                {
                    Id = table.Column<string>(type: "text", nullable: false),
                    EncounterNo = table.Column<string>(type: "text", nullable: false, comment: "เลข Visit (running number)"),
                    PatientId = table.Column<string>(type: "text", nullable: false),
                    Type = table.Column<int>(type: "integer", nullable: false, comment: "ประเภท: OPD=1, IPD=2, ER=3, SS=4"),
                    Status = table.Column<int>(type: "integer", nullable: false, comment: "สถานะ: OPEN=1, ADMITTED=2, DISCHARGED=3, CLOSED=4, CANCELED=9"),
                    DivisionId = table.Column<string>(type: "text", nullable: false),
                    DoctorId = table.Column<string>(type: "text", nullable: true),
                    ChiefComplaint = table.Column<string>(type: "text", nullable: true, comment: "อาการสำคัญ"),
                    AdmissionDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    DischargeDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    BedNumber = table.Column<string>(type: "text", nullable: true, comment: "เตียง (สำหรับ IPD)"),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false),
                    CreatedBy = table.Column<string>(type: "text", nullable: true),
                    UpdatedBy = table.Column<string>(type: "text", nullable: true),
                    CreatedDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    LastUpdatedDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    DeletedDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Encounters", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Encounters_Divisions_DivisionId",
                        column: x => x.DivisionId,
                        principalTable: "Divisions",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_Encounters_Doctors_DoctorId",
                        column: x => x.DoctorId,
                        principalTable: "Doctors",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_Encounters_Patients_PatientId",
                        column: x => x.PatientId,
                        principalTable: "Patients",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                },
                comment: "Visit ผู้ป่วย (OPD/IPD)");

            migrationBuilder.CreateTable(
                name: "PatientAddresses",
                columns: table => new
                {
                    Id = table.Column<string>(type: "text", nullable: false),
                    PatientId = table.Column<string>(type: "text", nullable: false),
                    AddressType = table.Column<string>(type: "text", nullable: false, comment: "ประเภทที่อยู่: HOME, WORK, CURRENT"),
                    AddressLine1 = table.Column<string>(type: "text", nullable: true),
                    AddressLine2 = table.Column<string>(type: "text", nullable: true),
                    SubDistrict = table.Column<string>(type: "text", nullable: true),
                    District = table.Column<string>(type: "text", nullable: true),
                    Province = table.Column<string>(type: "text", nullable: true),
                    PostalCode = table.Column<string>(type: "text", nullable: true),
                    PhoneNumber = table.Column<string>(type: "text", nullable: true),
                    IsPrimary = table.Column<bool>(type: "boolean", nullable: false),
                    CreatedDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    DeletedDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PatientAddresses", x => x.Id);
                    table.ForeignKey(
                        name: "FK_PatientAddresses_Patients_PatientId",
                        column: x => x.PatientId,
                        principalTable: "Patients",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                },
                comment: "ที่อยู่ผู้ป่วย");

            migrationBuilder.CreateTable(
                name: "Pricings",
                columns: table => new
                {
                    Id = table.Column<string>(type: "text", nullable: false),
                    ProductId = table.Column<string>(type: "text", nullable: false),
                    PriceNormal = table.Column<decimal>(type: "numeric", nullable: false, comment: "ราคาปกติ"),
                    PriceSpecial = table.Column<decimal>(type: "numeric", nullable: false, comment: "ราคาพิเศษ"),
                    PriceForeign = table.Column<decimal>(type: "numeric", nullable: false, comment: "ราคาต่างชาติ"),
                    CoverageId = table.Column<string>(type: "text", nullable: true, comment: "สิทธิที่ใช้ราคานี้ (null = ราคา default)"),
                    EffectiveDate = table.Column<DateOnly>(type: "date", nullable: false),
                    ExpiryDate = table.Column<DateOnly>(type: "date", nullable: true),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false),
                    CreatedDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    DeletedDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Pricings", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Pricings_Coverages_CoverageId",
                        column: x => x.CoverageId,
                        principalTable: "Coverages",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_Pricings_Products_ProductId",
                        column: x => x.ProductId,
                        principalTable: "Products",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                },
                comment: "ราคาสินค้า/บริการ");

            migrationBuilder.CreateTable(
                name: "Users",
                columns: table => new
                {
                    Id = table.Column<string>(type: "text", nullable: false, comment: "รหัสผู้ใช้งาน"),
                    Username = table.Column<string>(type: "text", nullable: false, comment: "ชื่อผู้ใช้งาน (login)"),
                    PasswordHash = table.Column<string>(type: "text", nullable: false, comment: "รหัสผ่าน (bcrypt hash)"),
                    FirstName = table.Column<string>(type: "text", nullable: false, comment: "ชื่อจริง"),
                    LastName = table.Column<string>(type: "text", nullable: false, comment: "นามสกุล"),
                    RoleId = table.Column<string>(type: "text", nullable: false, comment: "รหัสบทบาท"),
                    DoctorId = table.Column<string>(type: "text", nullable: true, comment: "รหัสแพทย์ (ถ้าเป็นหมอ)"),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false),
                    CreatedDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    DeletedDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Users", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Users_Doctors_DoctorId",
                        column: x => x.DoctorId,
                        principalTable: "Doctors",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_Users_Roles_RoleId",
                        column: x => x.RoleId,
                        principalTable: "Roles",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                },
                comment: "ผู้ใช้งานระบบ");

            migrationBuilder.CreateTable(
                name: "PatientCoverages",
                columns: table => new
                {
                    Id = table.Column<string>(type: "text", nullable: false),
                    PatientId = table.Column<string>(type: "text", nullable: false),
                    CoverageId = table.Column<string>(type: "text", nullable: false),
                    PayerId = table.Column<string>(type: "text", nullable: true),
                    EffectiveDate = table.Column<DateOnly>(type: "date", nullable: true),
                    ExpiryDate = table.Column<DateOnly>(type: "date", nullable: true),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false),
                    CreatedDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    DeletedDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PatientCoverages", x => x.Id);
                    table.ForeignKey(
                        name: "FK_PatientCoverages_Coverages_CoverageId",
                        column: x => x.CoverageId,
                        principalTable: "Coverages",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_PatientCoverages_Patients_PatientId",
                        column: x => x.PatientId,
                        principalTable: "Patients",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_PatientCoverages_Payers_PayerId",
                        column: x => x.PayerId,
                        principalTable: "Payers",
                        principalColumn: "Id");
                },
                comment: "สิทธิการรักษาของผู้ป่วย");

            migrationBuilder.CreateTable(
                name: "Diagnoses",
                columns: table => new
                {
                    Id = table.Column<string>(type: "text", nullable: false),
                    EncounterId = table.Column<string>(type: "text", nullable: false),
                    Type = table.Column<int>(type: "integer", nullable: false, comment: "ประเภท: PRINCIPAL=1, COMORBIDITY=2, COMPLICATION=3, RULE_OUT=4"),
                    Icd10Id = table.Column<string>(type: "text", nullable: true),
                    Description = table.Column<string>(type: "text", nullable: true),
                    IsConfirmed = table.Column<bool>(type: "boolean", nullable: false),
                    CreatedBy = table.Column<string>(type: "text", nullable: true),
                    CreatedDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    DeletedDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Diagnoses", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Diagnoses_Encounters_EncounterId",
                        column: x => x.EncounterId,
                        principalTable: "Encounters",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_Diagnoses_Icd10s_Icd10Id",
                        column: x => x.Icd10Id,
                        principalTable: "Icd10s",
                        principalColumn: "Id");
                },
                comment: "การวินิจฉัยโรค");

            migrationBuilder.InsertData(
                table: "Roles",
                columns: new[] { "Id", "CreatedDate", "DeletedDate", "Description", "Name" },
                values: new object[,]
                {
                    { "role-doctor", new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), null, "แพทย์", "Doctor" },
                    { "role-finance", new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), null, "การเงิน", "Finance" },
                    { "role-nurse", new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), null, "พยาบาล", "Nurse" },
                    { "role-pharmacist", new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), null, "เภสัชกร", "Pharmacist" }
                });

            migrationBuilder.CreateIndex(
                name: "IX_Diagnoses_EncounterId",
                table: "Diagnoses",
                column: "EncounterId");

            migrationBuilder.CreateIndex(
                name: "IX_Diagnoses_Icd10Id",
                table: "Diagnoses",
                column: "Icd10Id");

            migrationBuilder.CreateIndex(
                name: "IX_Divisions_Code",
                table: "Divisions",
                column: "Code",
                unique: true,
                filter: "\"DeletedDate\" IS NULL");

            migrationBuilder.CreateIndex(
                name: "IX_Encounters_DivisionId",
                table: "Encounters",
                column: "DivisionId");

            migrationBuilder.CreateIndex(
                name: "IX_Encounters_DoctorId",
                table: "Encounters",
                column: "DoctorId");

            migrationBuilder.CreateIndex(
                name: "IX_Encounters_EncounterNo",
                table: "Encounters",
                column: "EncounterNo",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Encounters_PatientId",
                table: "Encounters",
                column: "PatientId");

            migrationBuilder.CreateIndex(
                name: "IX_Encounters_Status",
                table: "Encounters",
                column: "Status");

            migrationBuilder.CreateIndex(
                name: "IX_Icd10Categories_ParentId",
                table: "Icd10Categories",
                column: "ParentId");

            migrationBuilder.CreateIndex(
                name: "IX_Icd10s_CategoryId",
                table: "Icd10s",
                column: "CategoryId");

            migrationBuilder.CreateIndex(
                name: "IX_Icd10s_Code",
                table: "Icd10s",
                column: "Code",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_PatientAddresses_PatientId",
                table: "PatientAddresses",
                column: "PatientId");

            migrationBuilder.CreateIndex(
                name: "IX_PatientCoverages_CoverageId",
                table: "PatientCoverages",
                column: "CoverageId");

            migrationBuilder.CreateIndex(
                name: "IX_PatientCoverages_PatientId",
                table: "PatientCoverages",
                column: "PatientId");

            migrationBuilder.CreateIndex(
                name: "IX_PatientCoverages_PayerId",
                table: "PatientCoverages",
                column: "PayerId");

            migrationBuilder.CreateIndex(
                name: "IX_Patients_CitizenNo",
                table: "Patients",
                column: "CitizenNo",
                unique: true,
                filter: "\"CitizenNo\" IS NOT NULL AND \"DeletedDate\" IS NULL");

            migrationBuilder.CreateIndex(
                name: "IX_Patients_Hn",
                table: "Patients",
                column: "Hn",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Payers_CoverageId",
                table: "Payers",
                column: "CoverageId");

            migrationBuilder.CreateIndex(
                name: "IX_Pricings_CoverageId",
                table: "Pricings",
                column: "CoverageId");

            migrationBuilder.CreateIndex(
                name: "IX_Pricings_ProductId",
                table: "Pricings",
                column: "ProductId");

            migrationBuilder.CreateIndex(
                name: "IX_Products_Code",
                table: "Products",
                column: "Code",
                unique: true,
                filter: "\"DeletedDate\" IS NULL");

            migrationBuilder.CreateIndex(
                name: "IX_Users_DoctorId",
                table: "Users",
                column: "DoctorId");

            migrationBuilder.CreateIndex(
                name: "IX_Users_RoleId",
                table: "Users",
                column: "RoleId");

            migrationBuilder.CreateIndex(
                name: "IX_Users_Username",
                table: "Users",
                column: "Username",
                unique: true,
                filter: "\"DeletedDate\" IS NULL");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "Diagnoses");

            migrationBuilder.DropTable(
                name: "PatientAddresses");

            migrationBuilder.DropTable(
                name: "PatientCoverages");

            migrationBuilder.DropTable(
                name: "Pricings");

            migrationBuilder.DropTable(
                name: "Users");

            migrationBuilder.DropTable(
                name: "Encounters");

            migrationBuilder.DropTable(
                name: "Icd10s");

            migrationBuilder.DropTable(
                name: "Payers");

            migrationBuilder.DropTable(
                name: "Products");

            migrationBuilder.DropTable(
                name: "Roles");

            migrationBuilder.DropTable(
                name: "Divisions");

            migrationBuilder.DropTable(
                name: "Doctors");

            migrationBuilder.DropTable(
                name: "Patients");

            migrationBuilder.DropTable(
                name: "Icd10Categories");

            migrationBuilder.DropTable(
                name: "Coverages");
        }
    }
}
