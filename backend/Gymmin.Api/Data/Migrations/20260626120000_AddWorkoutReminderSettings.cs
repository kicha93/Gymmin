using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Gymmin.Api.Data.Migrations;

[DbContext(typeof(GymminDbContext))]
[Migration("20260626120000_AddWorkoutReminderSettings")]
public partial class AddWorkoutReminderSettings : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.AddColumn<string>(
            name: "WorkoutRemindersJson",
            table: "UserSettings",
            type: "TEXT",
            nullable: false,
            defaultValue: "");
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.DropColumn(
            name: "WorkoutRemindersJson",
            table: "UserSettings");
    }
}
