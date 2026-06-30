using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Gymmin.Api.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddAiCredits : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "IdempotencyKey",
                table: "WorkoutCreatorJobs",
                type: "TEXT",
                maxLength: 160,
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "TokenCost",
                table: "WorkoutCreatorJobs",
                type: "INTEGER",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<string>(
                name: "TokenRefundReason",
                table: "WorkoutCreatorJobs",
                type: "TEXT",
                maxLength: 250,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "TokenRefundedAt",
                table: "WorkoutCreatorJobs",
                type: "TEXT",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "TokenTransactionId",
                table: "WorkoutCreatorJobs",
                type: "TEXT",
                maxLength: 80,
                nullable: true);

            migrationBuilder.CreateTable(
                name: "AiCreditAccounts",
                columns: table => new
                {
                    UserId = table.Column<string>(type: "TEXT", nullable: false),
                    Balance = table.Column<int>(type: "INTEGER", nullable: false),
                    CreatedAt = table.Column<string>(type: "TEXT", nullable: false),
                    UpdatedAt = table.Column<string>(type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AiCreditAccounts", x => x.UserId);
                    table.ForeignKey(
                        name: "FK_AiCreditAccounts_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "AiCreditTransactions",
                columns: table => new
                {
                    Id = table.Column<string>(type: "TEXT", nullable: false),
                    UserId = table.Column<string>(type: "TEXT", nullable: false),
                    Amount = table.Column<int>(type: "INTEGER", nullable: false),
                    Type = table.Column<string>(type: "TEXT", maxLength: 40, nullable: false),
                    Reason = table.Column<string>(type: "TEXT", maxLength: 120, nullable: true),
                    RelatedJobId = table.Column<string>(type: "TEXT", maxLength: 80, nullable: true),
                    RelatedPurchaseId = table.Column<string>(type: "TEXT", maxLength: 160, nullable: true),
                    IdempotencyKey = table.Column<string>(type: "TEXT", maxLength: 160, nullable: true),
                    BalanceAfter = table.Column<int>(type: "INTEGER", nullable: false),
                    MetadataJson = table.Column<string>(type: "TEXT", nullable: true),
                    CreatedAt = table.Column<string>(type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AiCreditTransactions", x => x.Id);
                    table.ForeignKey(
                        name: "FK_AiCreditTransactions_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_WorkoutCreatorJobs_UserId_JobType_IdempotencyKey",
                table: "WorkoutCreatorJobs",
                columns: new[] { "UserId", "JobType", "IdempotencyKey" });

            migrationBuilder.CreateIndex(
                name: "IX_AiCreditTransactions_CreatedAt",
                table: "AiCreditTransactions",
                column: "CreatedAt");

            migrationBuilder.CreateIndex(
                name: "IX_AiCreditTransactions_IdempotencyKey",
                table: "AiCreditTransactions",
                column: "IdempotencyKey");

            migrationBuilder.CreateIndex(
                name: "IX_AiCreditTransactions_RelatedJobId",
                table: "AiCreditTransactions",
                column: "RelatedJobId");

            migrationBuilder.CreateIndex(
                name: "IX_AiCreditTransactions_RelatedPurchaseId",
                table: "AiCreditTransactions",
                column: "RelatedPurchaseId");

            migrationBuilder.CreateIndex(
                name: "IX_AiCreditTransactions_UserId",
                table: "AiCreditTransactions",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_AiCreditTransactions_UserId_RelatedJobId_Type",
                table: "AiCreditTransactions",
                columns: new[] { "UserId", "RelatedJobId", "Type" },
                unique: true);

        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "AiCreditAccounts");

            migrationBuilder.DropTable(
                name: "AiCreditTransactions");

            migrationBuilder.DropIndex(
                name: "IX_WorkoutCreatorJobs_UserId_JobType_IdempotencyKey",
                table: "WorkoutCreatorJobs");

            migrationBuilder.DropColumn(
                name: "IdempotencyKey",
                table: "WorkoutCreatorJobs");

            migrationBuilder.DropColumn(
                name: "TokenCost",
                table: "WorkoutCreatorJobs");

            migrationBuilder.DropColumn(
                name: "TokenRefundReason",
                table: "WorkoutCreatorJobs");

            migrationBuilder.DropColumn(
                name: "TokenRefundedAt",
                table: "WorkoutCreatorJobs");

            migrationBuilder.DropColumn(
                name: "TokenTransactionId",
                table: "WorkoutCreatorJobs");

        }
    }
}
