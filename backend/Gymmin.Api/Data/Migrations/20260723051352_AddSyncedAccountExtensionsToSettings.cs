using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Gymmin.Api.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddSyncedAccountExtensionsToSettings : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "CreatorProfilesJson",
                table: "UserSettings",
                type: "TEXT",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "SelectedCreatorProfileId",
                table: "UserSettings",
                type: "TEXT",
                maxLength: 128,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "WeeklyPlanJson",
                table: "UserSettings",
                type: "TEXT",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "CreatorProfilesJson",
                table: "UserSettings");

            migrationBuilder.DropColumn(
                name: "SelectedCreatorProfileId",
                table: "UserSettings");

            migrationBuilder.DropColumn(
                name: "WeeklyPlanJson",
                table: "UserSettings");
        }
    }
}
