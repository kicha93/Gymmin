using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Gymmin.Api.Data.Migrations
{
    public partial class AddBugReportStorage : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "BugReports",
                columns: table => new
                {
                    Id = table.Column<string>(type: "TEXT", nullable: false),
                    IdempotencyKey = table.Column<string>(type: "TEXT", maxLength: 160, nullable: true),
                    ReporterUserId = table.Column<string>(type: "TEXT", nullable: true),
                    Title = table.Column<string>(type: "TEXT", maxLength: 250, nullable: false),
                    Description = table.Column<string>(type: "TEXT", nullable: false),
                    Device = table.Column<string>(type: "TEXT", maxLength: 1000, nullable: true),
                    Screen = table.Column<string>(type: "TEXT", maxLength: 200, nullable: true),
                    Language = table.Column<string>(type: "TEXT", maxLength: 16, nullable: true),
                    AppVersion = table.Column<string>(type: "TEXT", maxLength: 50, nullable: true),
                    DiagnosticsJson = table.Column<string>(type: "TEXT", nullable: true),
                    Status = table.Column<string>(type: "TEXT", maxLength: 32, nullable: false),
                    EmailDeliveryStatus = table.Column<string>(type: "TEXT", maxLength: 32, nullable: false),
                    EmailDeliveryError = table.Column<string>(type: "TEXT", maxLength: 500, nullable: true),
                    EmailAttemptCount = table.Column<int>(type: "INTEGER", nullable: false),
                    EmailLastAttemptAt = table.Column<string>(type: "TEXT", nullable: true),
                    EmailNextAttemptAt = table.Column<string>(type: "TEXT", nullable: true),
                    EmailSentAt = table.Column<string>(type: "TEXT", nullable: true),
                    EmailLeaseId = table.Column<string>(type: "TEXT", maxLength: 80, nullable: true),
                    EmailLeaseExpiresAt = table.Column<string>(type: "TEXT", nullable: true),
                    AdminResponse = table.Column<string>(type: "TEXT", nullable: true),
                    AdminRespondedAt = table.Column<string>(type: "TEXT", nullable: true),
                    RewardPoints = table.Column<int>(type: "INTEGER", nullable: false),
                    RewardedAt = table.Column<string>(type: "TEXT", nullable: true),
                    CreatedAt = table.Column<string>(type: "TEXT", nullable: false),
                    UpdatedAt = table.Column<string>(type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_BugReports", x => x.Id);
                    table.ForeignKey(
                        name: "FK_BugReports_Users_ReporterUserId",
                        column: x => x.ReporterUserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                });

            migrationBuilder.CreateTable(
                name: "BugReportRewardTransactions",
                columns: table => new
                {
                    Id = table.Column<string>(type: "TEXT", nullable: false),
                    BugReportId = table.Column<string>(type: "TEXT", nullable: false),
                    UserId = table.Column<string>(type: "TEXT", nullable: true),
                    Points = table.Column<int>(type: "INTEGER", nullable: false),
                    Reason = table.Column<string>(type: "TEXT", maxLength: 500, nullable: true),
                    AwardedBy = table.Column<string>(type: "TEXT", maxLength: 160, nullable: false),
                    CreatedAt = table.Column<string>(type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_BugReportRewardTransactions", x => x.Id);
                    table.ForeignKey(
                        name: "FK_BugReportRewardTransactions_BugReports_BugReportId",
                        column: x => x.BugReportId,
                        principalTable: "BugReports",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_BugReportRewardTransactions_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                });

            migrationBuilder.CreateIndex(name: "IX_BugReportRewardTransactions_BugReportId", table: "BugReportRewardTransactions", column: "BugReportId", unique: true);
            migrationBuilder.CreateIndex(name: "IX_BugReportRewardTransactions_UserId", table: "BugReportRewardTransactions", column: "UserId");
            migrationBuilder.CreateIndex(name: "IX_BugReports_CreatedAt", table: "BugReports", column: "CreatedAt");
            migrationBuilder.CreateIndex(name: "IX_BugReports_EmailDeliveryStatus_EmailNextAttemptAt", table: "BugReports", columns: new[] { "EmailDeliveryStatus", "EmailNextAttemptAt" });
            migrationBuilder.CreateIndex(name: "IX_BugReports_IdempotencyKey", table: "BugReports", column: "IdempotencyKey", unique: true);
            migrationBuilder.CreateIndex(name: "IX_BugReports_ReporterUserId", table: "BugReports", column: "ReporterUserId");
            migrationBuilder.CreateIndex(name: "IX_BugReports_Status", table: "BugReports", column: "Status");
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(name: "BugReportRewardTransactions");
            migrationBuilder.DropTable(name: "BugReports");
        }
    }
}

