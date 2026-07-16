using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Gymmin.Api.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddGooglePlayVoidedPurchases : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "ClawbackCredits",
                table: "AiCreditPurchases",
                type: "INTEGER",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<string>(
                name: "ClawbackTransactionId",
                table: "AiCreditPurchases",
                type: "TEXT",
                maxLength: 80,
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "UnrecoveredCredits",
                table: "AiCreditPurchases",
                type: "INTEGER",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<string>(
                name: "VoidedAt",
                table: "AiCreditPurchases",
                type: "TEXT",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "VoidedReason",
                table: "AiCreditPurchases",
                type: "INTEGER",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "VoidedSource",
                table: "AiCreditPurchases",
                type: "INTEGER",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "GooglePlayVoidedPurchases",
                columns: table => new
                {
                    Id = table.Column<string>(type: "TEXT", maxLength: 64, nullable: false),
                    PurchaseTokenHash = table.Column<string>(type: "TEXT", maxLength: 64, nullable: false),
                    GoogleOrderId = table.Column<string>(type: "TEXT", maxLength: 160, nullable: true),
                    PurchaseId = table.Column<string>(type: "TEXT", maxLength: 160, nullable: true),
                    UserId = table.Column<string>(type: "TEXT", maxLength: 160, nullable: true),
                    VoidedReason = table.Column<int>(type: "INTEGER", nullable: false),
                    VoidedSource = table.Column<int>(type: "INTEGER", nullable: false),
                    VoidedQuantity = table.Column<int>(type: "INTEGER", nullable: false),
                    ClawbackCredits = table.Column<int>(type: "INTEGER", nullable: false),
                    UnrecoveredCredits = table.Column<int>(type: "INTEGER", nullable: false),
                    ProcessingStatus = table.Column<string>(type: "TEXT", maxLength: 40, nullable: false),
                    ClawbackTransactionId = table.Column<string>(type: "TEXT", maxLength: 80, nullable: true),
                    PurchaseTime = table.Column<string>(type: "TEXT", nullable: true),
                    VoidedTime = table.Column<string>(type: "TEXT", nullable: false),
                    ReceivedAt = table.Column<string>(type: "TEXT", nullable: false),
                    ProcessedAt = table.Column<string>(type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_GooglePlayVoidedPurchases", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "IntegrationCheckpoints",
                columns: table => new
                {
                    Id = table.Column<string>(type: "TEXT", maxLength: 100, nullable: false),
                    LastSuccessfulAt = table.Column<string>(type: "TEXT", nullable: false),
                    UpdatedAt = table.Column<string>(type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_IntegrationCheckpoints", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_GooglePlayVoidedPurchases_GoogleOrderId",
                table: "GooglePlayVoidedPurchases",
                column: "GoogleOrderId");

            migrationBuilder.CreateIndex(
                name: "IX_GooglePlayVoidedPurchases_ProcessingStatus",
                table: "GooglePlayVoidedPurchases",
                column: "ProcessingStatus");

            migrationBuilder.CreateIndex(
                name: "IX_GooglePlayVoidedPurchases_PurchaseTokenHash",
                table: "GooglePlayVoidedPurchases",
                column: "PurchaseTokenHash");

            migrationBuilder.CreateIndex(
                name: "IX_GooglePlayVoidedPurchases_ReceivedAt",
                table: "GooglePlayVoidedPurchases",
                column: "ReceivedAt");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "GooglePlayVoidedPurchases");

            migrationBuilder.DropTable(
                name: "IntegrationCheckpoints");

            migrationBuilder.DropColumn(
                name: "ClawbackCredits",
                table: "AiCreditPurchases");

            migrationBuilder.DropColumn(
                name: "ClawbackTransactionId",
                table: "AiCreditPurchases");

            migrationBuilder.DropColumn(
                name: "UnrecoveredCredits",
                table: "AiCreditPurchases");

            migrationBuilder.DropColumn(
                name: "VoidedAt",
                table: "AiCreditPurchases");

            migrationBuilder.DropColumn(
                name: "VoidedReason",
                table: "AiCreditPurchases");

            migrationBuilder.DropColumn(
                name: "VoidedSource",
                table: "AiCreditPurchases");
        }
    }
}
