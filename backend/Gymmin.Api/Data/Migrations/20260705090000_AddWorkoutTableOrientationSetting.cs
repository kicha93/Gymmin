using Gymmin.Api.Data;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Gymmin.Api.Data.Migrations
{
    /// <inheritdoc />
    [DbContext(typeof(GymminDbContext))]
    [Migration("20260705090000_AddWorkoutTableOrientationSetting")]
    public partial class AddWorkoutTableOrientationSetting : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "DefaultWorkoutTableOrientation",
                table: "UserSettings",
                type: "TEXT",
                maxLength: 20,
                nullable: false,
                defaultValue: "vertical");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "DefaultWorkoutTableOrientation",
                table: "UserSettings");
        }
    }
}
