using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Gymmin.Api.Data.Migrations;

[DbContext(typeof(GymminDbContext))]
[Migration("20260629183000_AddAuthSessionHardening")]
public partial class AddAuthSessionHardening : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.AddColumn<string>(
            name: "DeviceName",
            table: "UserSessions",
            type: "TEXT",
            maxLength: 120,
            nullable: true);

        migrationBuilder.AddColumn<string>(
            name: "LastIpAddress",
            table: "UserSessions",
            type: "TEXT",
            maxLength: 80,
            nullable: true);

        migrationBuilder.AddColumn<string>(
            name: "RevokedReason",
            table: "UserSessions",
            type: "TEXT",
            maxLength: 80,
            nullable: true);

        migrationBuilder.AddColumn<string>(
            name: "UserAgent",
            table: "UserSessions",
            type: "TEXT",
            nullable: true);

        migrationBuilder.CreateTable(
            name: "PasswordResetTokens",
            columns: table => new
            {
                Id = table.Column<string>(type: "TEXT", nullable: false),
                UserId = table.Column<string>(type: "TEXT", nullable: false),
                TokenHash = table.Column<string>(type: "TEXT", nullable: false),
                CreatedAt = table.Column<DateTimeOffset>(type: "TEXT", nullable: false),
                ExpiresAt = table.Column<DateTimeOffset>(type: "TEXT", nullable: false),
                UsedAt = table.Column<DateTimeOffset>(type: "TEXT", nullable: true),
                RequestedIpAddress = table.Column<string>(type: "TEXT", maxLength: 80, nullable: true),
                UserAgent = table.Column<string>(type: "TEXT", nullable: true)
            },
            constraints: table =>
            {
                table.PrimaryKey("PK_PasswordResetTokens", x => x.Id);
                table.ForeignKey(
                    name: "FK_PasswordResetTokens_Users_UserId",
                    column: x => x.UserId,
                    principalTable: "Users",
                    principalColumn: "Id",
                    onDelete: ReferentialAction.Cascade);
            });

        migrationBuilder.CreateIndex(
            name: "IX_PasswordResetTokens_ExpiresAt",
            table: "PasswordResetTokens",
            column: "ExpiresAt");

        migrationBuilder.CreateIndex(
            name: "IX_PasswordResetTokens_TokenHash",
            table: "PasswordResetTokens",
            column: "TokenHash",
            unique: true);

        migrationBuilder.CreateIndex(
            name: "IX_PasswordResetTokens_UserId",
            table: "PasswordResetTokens",
            column: "UserId");
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.DropTable(
            name: "PasswordResetTokens");

        migrationBuilder.DropColumn(
            name: "DeviceName",
            table: "UserSessions");

        migrationBuilder.DropColumn(
            name: "LastIpAddress",
            table: "UserSessions");

        migrationBuilder.DropColumn(
            name: "RevokedReason",
            table: "UserSessions");

        migrationBuilder.DropColumn(
            name: "UserAgent",
            table: "UserSessions");
    }
}
