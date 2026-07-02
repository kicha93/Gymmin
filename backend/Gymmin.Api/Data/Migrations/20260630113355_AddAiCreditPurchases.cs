using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Gymmin.Api.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddAiCreditPurchases : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "AiCreditPurchases",
                columns: table => new
                {
                    Id = table.Column<string>(type: "TEXT", nullable: false),
                    UserId = table.Column<string>(type: "TEXT", nullable: false),
                    Platform = table.Column<string>(type: "TEXT", maxLength: 40, nullable: false),
                    ProductId = table.Column<string>(type: "TEXT", maxLength: 120, nullable: false),
                    Credits = table.Column<int>(type: "INTEGER", nullable: false),
                    PurchaseTokenHash = table.Column<string>(type: "TEXT", maxLength: 160, nullable: false),
                    PurchaseTokenLastChars = table.Column<string>(type: "TEXT", maxLength: 16, nullable: true),
                    GoogleOrderId = table.Column<string>(type: "TEXT", maxLength: 160, nullable: true),
                    PurchaseState = table.Column<string>(type: "TEXT", maxLength: 40, nullable: false),
                    ConsumptionState = table.Column<int>(type: "INTEGER", nullable: true),
                    AcknowledgementState = table.Column<int>(type: "INTEGER", nullable: true),
                    ProcessStatus = table.Column<string>(type: "TEXT", maxLength: 40, nullable: false),
                    RelatedTransactionId = table.Column<string>(type: "TEXT", maxLength: 80, nullable: true),
                    ErrorCode = table.Column<string>(type: "TEXT", maxLength: 120, nullable: true),
                    ErrorMessage = table.Column<string>(type: "TEXT", maxLength: 500, nullable: true),
                    RawResponseJson = table.Column<string>(type: "TEXT", nullable: true),
                    CreatedAt = table.Column<string>(type: "TEXT", nullable: false),
                    VerifiedAt = table.Column<string>(type: "TEXT", nullable: true),
                    CreditedAt = table.Column<string>(type: "TEXT", nullable: true),
                    ConsumedAt = table.Column<string>(type: "TEXT", nullable: true),
                    UpdatedAt = table.Column<string>(type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AiCreditPurchases", x => x.Id);
                    table.ForeignKey(
                        name: "FK_AiCreditPurchases_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_AiCreditTransactions_UserId_RelatedPurchaseId_Type",
                table: "AiCreditTransactions",
                columns: new[] { "UserId", "RelatedPurchaseId", "Type" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_AiCreditPurchases_GoogleOrderId",
                table: "AiCreditPurchases",
                column: "GoogleOrderId");

            migrationBuilder.CreateIndex(
                name: "IX_AiCreditPurchases_ProductId",
                table: "AiCreditPurchases",
                column: "ProductId");

            migrationBuilder.CreateIndex(
                name: "IX_AiCreditPurchases_PurchaseTokenHash",
                table: "AiCreditPurchases",
                column: "PurchaseTokenHash",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_AiCreditPurchases_UserId",
                table: "AiCreditPurchases",
                column: "UserId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "AiCreditPurchases");

            migrationBuilder.DropIndex(
                name: "IX_AiCreditTransactions_UserId_RelatedPurchaseId_Type",
                table: "AiCreditTransactions");
        }
    }
}
