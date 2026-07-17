using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Gymmin.Api.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddWorkoutCreatorJobLeases : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "AttemptCount",
                table: "WorkoutCreatorJobs",
                type: "INTEGER",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<string>(
                name: "LeaseExpiresAt",
                table: "WorkoutCreatorJobs",
                type: "TEXT",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "LeaseId",
                table: "WorkoutCreatorJobs",
                type: "TEXT",
                maxLength: 64,
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_WorkoutCreatorJobs_LeaseExpiresAt",
                table: "WorkoutCreatorJobs",
                column: "LeaseExpiresAt");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_WorkoutCreatorJobs_LeaseExpiresAt",
                table: "WorkoutCreatorJobs");

            migrationBuilder.DropColumn(
                name: "AttemptCount",
                table: "WorkoutCreatorJobs");

            migrationBuilder.DropColumn(
                name: "LeaseExpiresAt",
                table: "WorkoutCreatorJobs");

            migrationBuilder.DropColumn(
                name: "LeaseId",
                table: "WorkoutCreatorJobs");
        }
    }
}
