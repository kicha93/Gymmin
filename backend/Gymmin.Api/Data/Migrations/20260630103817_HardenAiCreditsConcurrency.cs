using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Gymmin.Api.Data.Migrations
{
    /// <inheritdoc />
    public partial class HardenAiCreditsConcurrency : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateIndex(
                name: "IX_AiCreditTransactions_UserId_Reason_IdempotencyKey",
                table: "AiCreditTransactions",
                columns: new[] { "UserId", "Reason", "IdempotencyKey" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_AiCreditTransactions_UserId_Reason_IdempotencyKey",
                table: "AiCreditTransactions");
        }
    }
}
