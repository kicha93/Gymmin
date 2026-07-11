using Gymmin.Api.Data;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Gymmin.Api.Data.Migrations
{
    [DbContext(typeof(GymminDbContext))]
    [Migration("20260711090000_AddRestTimerVisibilitySetting")]
    public partial class AddRestTimerVisibilitySetting : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "ShowRestTimer",
                table: "UserSettings",
                type: "INTEGER",
                nullable: false,
                defaultValue: true);
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "ShowRestTimer",
                table: "UserSettings");
        }
    }
}
