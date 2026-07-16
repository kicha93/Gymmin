using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Gymmin.Api.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddGooglePlayRtdnInbox : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "GooglePlayRtdnEvents",
                columns: table => new
                {
                    MessageId = table.Column<string>(type: "TEXT", maxLength: 200, nullable: false),
                    PackageName = table.Column<string>(type: "TEXT", maxLength: 250, nullable: false),
                    NotificationKind = table.Column<string>(type: "TEXT", maxLength: 80, nullable: false),
                    NotificationType = table.Column<int>(type: "INTEGER", nullable: true),
                    ProductId = table.Column<string>(type: "TEXT", maxLength: 120, nullable: true),
                    PurchaseTokenHash = table.Column<string>(type: "TEXT", maxLength: 64, nullable: true),
                    ProcessingStatus = table.Column<string>(type: "TEXT", maxLength: 40, nullable: false),
                    ErrorCode = table.Column<string>(type: "TEXT", maxLength: 120, nullable: true),
                    EventTime = table.Column<string>(type: "TEXT", nullable: true),
                    PublishedAt = table.Column<string>(type: "TEXT", nullable: true),
                    ReceivedAt = table.Column<string>(type: "TEXT", nullable: false),
                    ProcessedAt = table.Column<string>(type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_GooglePlayRtdnEvents", x => x.MessageId);
                });

            migrationBuilder.CreateIndex(
                name: "IX_GooglePlayRtdnEvents_ProcessingStatus",
                table: "GooglePlayRtdnEvents",
                column: "ProcessingStatus");

            migrationBuilder.CreateIndex(
                name: "IX_GooglePlayRtdnEvents_PurchaseTokenHash",
                table: "GooglePlayRtdnEvents",
                column: "PurchaseTokenHash");

            migrationBuilder.CreateIndex(
                name: "IX_GooglePlayRtdnEvents_ReceivedAt",
                table: "GooglePlayRtdnEvents",
                column: "ReceivedAt");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "GooglePlayRtdnEvents");
        }
    }
}
